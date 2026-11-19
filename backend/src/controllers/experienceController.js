import { initDB } from '../config/database.js';

const gameIds = new Set(['logic-game', 'sequence-game', 'patch-cable', 'stack-balancer', 'bug-game']);
const pets = new Set(['fox', 'panda', 'penguin', 'cat']);
const petCatalog = [
  { id: 'fox', name: 'Zorro astuto', icon: '🦊', price: 0 },
  { id: 'panda', name: 'Oso panda', icon: '🐼', price: 120 },
  { id: 'penguin', name: 'Pingüino explorer', icon: '🐧', price: 250 },
  { id: 'cat', name: 'Gato tech', icon: '🐱', price: 400 },
];
const wardrobe = [
  ...petCatalog.filter(({ id }) => id !== 'fox').map((pet) => ({
    id: `pet-${pet.id}`,
    name: pet.name,
    category: 'Personaje',
    icon: pet.icon,
    price: pet.price,
    pet: pet.id,
  })),
  { id: 'cap', name: 'Gorra pixel', category: 'Cabeza', icon: '🧢', price: 70 },
  { id: 'goggles', name: 'Gafas coder', category: 'Gafas', icon: '🥽', price: 50 },
  { id: 'hoodie', name: 'Buzo espacial', category: 'Ropa', icon: '🧥', price: 140 },
  { id: 'laptop', name: 'Mini laptop', category: 'Accesorios', icon: '💻', price: 120 },
  { id: 'medal', name: 'Medalla debug', category: 'Accesorios', icon: '🏅', price: 250 },
];

function parseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch (error) {
    console.error('No se pudo interpretar un valor JSON guardado:', error);
    return fallback;
  }
}

function validSection(section) {
  return section
    && typeof section.title === 'string'
    && section.title.trim().length > 0
    && typeof section.description === 'string'
    && Array.isArray(section.lessons)
    && section.lessons.length > 0
    && section.lessons.length <= 12
    && section.lessons.every((lesson) => typeof lesson.title === 'string'
      && typeof lesson.reading === 'string'
      && typeof lesson.example === 'string')
    && Array.isArray(section.questions)
    && section.questions.length >= 1
    && section.questions.length <= 20
    && section.questions.every((question) => typeof question.prompt === 'string'
      && Array.isArray(question.options)
      && question.options.length >= 2
      && question.options.length <= 5
      && question.options.every((option) => typeof option === 'string')
      && Number.isInteger(question.answer)
      && question.answer >= 0
      && question.answer < question.options.length
      && typeof question.explanation === 'string');
}

export async function getStudentProfile(req, res) {
  try {
    const db = await initDB();
    await db.run('INSERT OR IGNORE INTO student_profiles (user_id) VALUES (?)', [req.user.id]);
    const profile = await db.get('SELECT nickname, pet, points, owned_items, equipped_items FROM student_profiles WHERE user_id = ?', [req.user.id]);
    const ownedItems = parseJson(profile.owned_items, []);
    const stats = await db.get('SELECT COUNT(*) AS completedLevels FROM progress WHERE user_id = ? AND completed = 1', [req.user.id]);
    const activeDates = await db.all('SELECT DISTINCT date(completed_at) AS activeDate FROM progress WHERE user_id = ? AND completed = 1 ORDER BY activeDate DESC', [req.user.id]);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const latestActivity = activeDates[0]?.activeDate ? new Date(`${activeDates[0].activeDate}T00:00:00Z`) : null;
    const daysSinceActivity = latestActivity ? Math.round((today.getTime() - latestActivity.getTime()) / 86400000) : Infinity;
    let activeDays = 0;
    if (daysSinceActivity <= 1) {
      let expectedDate = new Date(today.getTime() - daysSinceActivity * 86400000);
      for (const { activeDate } of activeDates) {
        const activityDate = new Date(`${activeDate}T00:00:00Z`);
        if (activityDate.getTime() !== expectedDate.getTime()) break;
        activeDays += 1;
        expectedDate = new Date(expectedDate.getTime() - 86400000);
      }
    }
    return res.status(200).json({
      nickname: profile.nickname,
      pet: profile.pet,
      points: profile.points,
      ownedItems,
      equippedItems: parseJson(profile.equipped_items, {}),
      completedLevels: stats.completedLevels,
      activeDays: stats.activeDays,
      catalog: wardrobe,
      pets: petCatalog.map((pet) => ({
        ...pet,
        itemId: pet.id === 'fox' ? null : `pet-${pet.id}`,
        unlocked: pet.id === 'fox' || pet.id === profile.pet || ownedItems.includes(`pet-${pet.id}`),
      })),
    });
  } catch (error) {
    console.error('Error consultando perfil y avatar del estudiante:', error);
    return res.status(500).json({ error: 'No se pudo cargar el perfil del estudiante.' });
  }
}

export async function updateStudentProfile(req, res) {
  const { nickname, pet, equippedItems } = req.body || {};
  if ((nickname !== undefined && (typeof nickname !== 'string' || nickname.trim().length > 24))
    || (pet !== undefined && !pets.has(pet))
    || (equippedItems !== undefined && (!equippedItems || typeof equippedItems !== 'object' || Array.isArray(equippedItems)))) {
    return res.status(400).json({ error: 'Revisa el apodo, la mascota y los accesorios seleccionados.' });
  }

  try {
    const db = await initDB();
    await db.run('INSERT OR IGNORE INTO student_profiles (user_id) VALUES (?)', [req.user.id]);
    const current = await db.get('SELECT pet, owned_items, equipped_items FROM student_profiles WHERE user_id = ?', [req.user.id]);
    const owned = new Set(parseJson(current.owned_items, []));
    const nextEquipped = equippedItems ?? parseJson(current.equipped_items, {});
    if (pet !== undefined && pet !== current.pet && pet !== 'fox' && !owned.has(`pet-${pet}`)) {
      return res.status(400).json({ error: 'Desbloquea este personaje en el vestidor antes de seleccionarlo.' });
    }
    if (Object.entries(nextEquipped).some(([category, itemId]) => itemId && (
      !owned.has(itemId)
      || !wardrobe.some((item) => item.id === itemId && item.category === category && item.category !== 'Personaje')
    ))) {
      return res.status(400).json({ error: 'Solo puedes equipar accesorios que ya compraste.' });
    }
    await db.run(`
      UPDATE student_profiles
      SET nickname = COALESCE(?, nickname), pet = COALESCE(?, pet), equipped_items = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [nickname?.trim(), pet, JSON.stringify(nextEquipped), req.user.id]);
    return res.status(200).json({ message: 'Perfil actualizado.' });
  } catch (error) {
    console.error('Error actualizando el perfil del estudiante:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
  }
}

export async function purchaseAvatarItem(req, res) {
  const item = wardrobe.find(({ id }) => id === req.body?.itemId);
  if (!item) return res.status(400).json({ error: 'El accesorio seleccionado no existe.' });

  let db;
  try {
    db = await initDB();
    await db.exec('BEGIN IMMEDIATE');
    await db.run('INSERT OR IGNORE INTO student_profiles (user_id) VALUES (?)', [req.user.id]);
    const profile = await db.get('SELECT points, owned_items FROM student_profiles WHERE user_id = ?', [req.user.id]);
    const owned = parseJson(profile.owned_items, []);
    if (owned.includes(item.id)) {
      await db.exec('ROLLBACK');
      return res.status(409).json({ error: 'Ya tienes este accesorio.' });
    }
    if (profile.points < item.price) {
      await db.exec('ROLLBACK');
      return res.status(400).json({ error: 'Aún no tienes suficientes puntos para este accesorio.' });
    }
    const nextOwned = [...owned, item.id];
    await db.run(
      'UPDATE student_profiles SET points = points - ?, owned_items = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [item.price, JSON.stringify(nextOwned), req.user.id]
    );
    await db.exec('COMMIT');
    return res.status(200).json({ item: item.id, points: profile.points - item.price, ownedItems: nextOwned });
  } catch (error) {
    if (db) await db.exec('ROLLBACK').catch((rollbackError) => console.error('Error revirtiendo compra de avatar:', rollbackError));
    console.error('Error comprando accesorio de avatar:', error);
    return res.status(500).json({ error: 'No se pudo completar la compra.' });
  }
}

export async function saveGameReview(req, res) {
  const { game_name: gameName, stars, tag, comment = '' } = req.body || {};
  if (!gameIds.has(gameName)
    || !Number.isInteger(stars) || stars < 1 || stars > 5
    || typeof tag !== 'string' || tag.trim().length < 2 || tag.trim().length > 48
    || typeof comment !== 'string' || comment.trim().length > 500) {
    return res.status(400).json({ error: 'Revisa el juego, la calificación, la etiqueta y el comentario.' });
  }

  try {
    const db = await initDB();
    const result = await db.run(`
      INSERT INTO game_reviews (user_id, game_name, stars, tag, comment)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, game_name) DO UPDATE SET
        stars = excluded.stars, tag = excluded.tag, comment = excluded.comment, created_at = CURRENT_TIMESTAMP
    `, [req.user.id, gameName, stars, tag.trim(), comment.trim()]);
    return res.status(200).json({ message: '¡Gracias por compartir tu opinión!', reviewId: result.lastID });
  } catch (error) {
    console.error('Error guardando la valoración del juego:', error);
    return res.status(500).json({ error: 'No se pudo guardar tu opinión.' });
  }
}

export async function getTeacherReviews(req, res) {
  try {
    const db = await initDB();
    const reviews = await db.all(`
      SELECT r.id, r.game_name, r.stars, r.tag, r.comment, r.created_at, u.name AS student_name
      FROM game_reviews r JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC LIMIT 300
    `);
    return res.status(200).json({ reviews });
  } catch (error) {
    console.error('Error consultando opiniones de estudiantes:', error);
    return res.status(500).json({ error: 'No se pudieron consultar las opiniones.' });
  }
}

export async function getLearningSections(req, res) {
  try {
    const db = await initDB();
    const sections = await db.all('SELECT section_id, title, age_range, description, content, updated_at FROM learning_sections ORDER BY rowid');
    const progress = await db.all(
      'SELECT section_id, completed_lessons, passed, last_score FROM learning_progress WHERE user_id = ?',
      [req.user.id]
    );
    return res.status(200).json({
      sections: sections.map((section) => {
        const content = parseJson(section.content, { lessons: [], questions: [] });
        return {
          id: section.section_id,
          title: section.title,
          ageRange: section.age_range,
          description: section.description,
          lessons: content.lessons,
          questions: req.user.role === 'docente'
            ? content.questions
            : content.questions.map(({ answer, explanation, ...question }) => question),
          updatedAt: section.updated_at,
        };
      }),
      progress: progress.map((item) => ({
        sectionId: item.section_id,
        completedLessons: parseJson(item.completed_lessons, []),
        passed: Boolean(item.passed),
        lastScore: item.last_score,
      })),
    });
  } catch (error) {
    console.error('Error consultando la academia de programación:', error);
    return res.status(500).json({ error: 'No se pudo cargar Aprende Código.' });
  }
}

export async function updateLearningSection(req, res) {
  const { sectionId } = req.params;
  const { title, ageRange = '5–13 años', description, lessons, questions } = req.body || {};
  if (!/^[a-z0-9-]{2,40}$/.test(sectionId) || !validSection({ title, description, lessons, questions })
    || typeof ageRange !== 'string' || ageRange.length > 30) {
    return res.status(400).json({ error: 'La sección debe incluir título, lectura, ejemplos y preguntas válidas.' });
  }
  try {
    const db = await initDB();
    await db.run(`
      INSERT INTO learning_sections (section_id, title, age_range, description, content, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(section_id) DO UPDATE SET
        title = excluded.title,
        age_range = excluded.age_range,
        description = excluded.description,
        content = excluded.content,
        updated_at = CURRENT_TIMESTAMP
    `, [sectionId, title.trim(), ageRange, description.trim(), JSON.stringify({ lessons, questions })]);
    return res.status(200).json({ message: 'Sección educativa guardada.' });
  } catch (error) {
    console.error('Error guardando la sección educativa:', error);
    return res.status(500).json({ error: 'No se pudo guardar la sección educativa.' });
  }
}

export async function saveLessonProgress(req, res) {
  const { sectionId } = req.params;
  const { completedLessons } = req.body || {};
  if (!Array.isArray(completedLessons) || !completedLessons.every((index) => Number.isInteger(index) && index >= 0)) {
    return res.status(400).json({ error: 'La lista de lecciones completadas no es válida.' });
  }
  try {
    const db = await initDB();
    const section = await db.get('SELECT content FROM learning_sections WHERE section_id = ?', [sectionId]);
    if (!section) return res.status(404).json({ error: 'No se encontró la sección solicitada.' });
    const content = parseJson(section.content, { lessons: [] });
    if (completedLessons.some((index) => index >= content.lessons.length)) {
      return res.status(400).json({ error: 'Una de las lecciones no existe en esta sección.' });
    }
    const existing = await db.get(
      'SELECT completed_lessons FROM learning_progress WHERE user_id = ? AND section_id = ?',
      [req.user.id, sectionId]
    );
    const mergedLessons = [...new Set([...parseJson(existing?.completed_lessons || '[]', []), ...completedLessons])].sort((a, b) => a - b);
    await db.run(`
      INSERT INTO learning_progress (user_id, section_id, completed_lessons)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, section_id) DO UPDATE SET completed_lessons = excluded.completed_lessons, updated_at = CURRENT_TIMESTAMP
    `, [req.user.id, sectionId, JSON.stringify(mergedLessons)]);
    return res.status(200).json({ sectionId, completedLessons: mergedLessons });
  } catch (error) {
    console.error('Error guardando el avance de una lección:', error);
    return res.status(500).json({ error: 'No se pudo guardar el avance de la lección.' });
  }
}

export async function submitLearningExam(req, res) {
  const { sectionId } = req.params;
  const { answers } = req.body || {};
  if (!Array.isArray(answers) || !answers.every((answer) => Number.isInteger(answer) && answer >= 0)) {
    return res.status(400).json({ error: 'Envía una respuesta válida por cada pregunta.' });
  }
  let db;
  try {
    db = await initDB();
    const section = await db.get('SELECT content FROM learning_sections WHERE section_id = ?', [sectionId]);
    if (!section) return res.status(404).json({ error: 'No se encontró la sección solicitada.' });
    const content = parseJson(section.content, { lessons: [], questions: [] });
    const completion = await db.get(
      'SELECT completed_lessons FROM learning_progress WHERE user_id = ? AND section_id = ?',
      [req.user.id, sectionId]
    );
    const completedLessons = parseJson(completion?.completed_lessons || '[]', []);
    if (completedLessons.length < content.lessons.length) {
      return res.status(403).json({ error: 'Completa todas las lecciones de esta sección antes de presentar el parcial.' });
    }
    if (answers.length !== content.questions.length || answers.some((answer, index) => answer >= content.questions[index].options.length)) {
      return res.status(400).json({ error: 'Responde todas las preguntas con una opción disponible.' });
    }
    const correctAnswers = answers.reduce((count, answer, index) => count + (answer === content.questions[index].answer ? 1 : 0), 0);
    const score = Math.round((correctAnswers / content.questions.length) * 1000) / 10;
    const passed = score >= 70;
    await db.exec('BEGIN IMMEDIATE');
    const result = await db.run(
      'INSERT INTO learning_results (user_id, section_id, score, passed, correct_answers, total_questions) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, sectionId, score, passed ? 1 : 0, correctAnswers, content.questions.length]
    );
    await db.run(`
      INSERT INTO learning_progress (user_id, section_id, completed_lessons, passed, last_score)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, section_id) DO UPDATE SET
        passed = MAX(learning_progress.passed, excluded.passed),
        last_score = excluded.last_score,
        updated_at = CURRENT_TIMESTAMP
    `, [req.user.id, sectionId, JSON.stringify(completedLessons), passed ? 1 : 0, score]);
    await db.exec('COMMIT');
    return res.status(201).json({
      resultId: result.lastID,
      sectionId,
      score,
      passed,
      correctAnswers,
      totalQuestions: content.questions.length,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (db) await db.exec('ROLLBACK').catch((rollbackError) => console.error('Error revirtiendo el resultado educativo:', rollbackError));
    console.error('Error guardando el resultado de Aprende Código:', error);
    return res.status(500).json({ error: 'No se pudo registrar el resultado del parcial.' });
  }
}

export async function getTeacherLearningResults(req, res) {
  try {
    const db = await initDB();
    const results = await db.all(`
      SELECT r.id, r.section_id AS sectionId, s.title AS sectionTitle, r.score, r.passed,
        r.correct_answers AS correctAnswers, r.total_questions AS totalQuestions,
        r.completed_at AS completedAt, u.id AS studentId, u.name AS studentName
      FROM learning_results r
      JOIN users u ON u.id = r.user_id
      JOIN learning_sections s ON s.section_id = r.section_id
      ORDER BY r.completed_at DESC LIMIT 500
    `);
    return res.status(200).json({ results });
  } catch (error) {
    console.error('Error consultando resultados de Aprende Código:', error);
    return res.status(500).json({ error: 'No se pudieron consultar los resultados educativos.' });
  }
}
