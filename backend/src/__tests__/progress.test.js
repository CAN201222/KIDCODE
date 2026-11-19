import request from 'supertest';
import { basename } from 'node:path';
import app from '../app.js';
import { databasePath, initDB } from '../config/database.js';
import { defaultLearningSections } from '../config/learningContent.js';

const createUser = async ({ name, email, password, role = 'estudiante' }) => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      name,
      email,
      password,
      role,
      ...(role === 'docente' ? { teacherCode: 'kidcode-test-teacher-code' } : {}),
    });

  return response;
};

const loginUser = async ({ email, password }) => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  return response;
};

describe('Pruebas de progreso y reporte docente', () => {
  beforeEach(async () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Las pruebas requieren NODE_ENV=test para no modificar la base persistente.');
    }
    if (!/^kidcode-neiva-test-\d+-[0-9a-f-]{36}\.db$/.test(basename(databasePath))) {
      throw new Error('Las pruebas deben usar una base temporal aislada.');
    }
    const db = await initDB();
    await db.exec('DELETE FROM progress');
    await db.exec('DELETE FROM student_preferences');
    await db.exec('DELETE FROM users');
    await db.exec(`UPDATE game_controls SET enabled = 1`);
    for (const section of defaultLearningSections) {
      await db.run(
        `INSERT INTO learning_sections (section_id, title, age_range, description, content)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(section_id) DO UPDATE SET
           title = excluded.title, age_range = excluded.age_range,
           description = excluded.description, content = excluded.content`,
        [section.id, section.title, section.ageRange, section.description, JSON.stringify({
          lessons: section.lessons,
          questions: section.questions,
        })]
      );
    }
  });

  it('Debe registrar progreso de un estudiante autenticado', async () => {
    const registerRes = await createUser({
      name: 'Estudiante Progreso',
      email: 'progreso@kidcode.com',
      password: '123456',
      role: 'estudiante'
    });

    expect(registerRes.statusCode).toBe(201);

    const loginRes = await loginUser({
      email: 'progreso@kidcode.com',
      password: '123456'
    });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body).toHaveProperty('token');

    const res = await request(app)
      .post('/api/progress')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .send({ game_name: 'logic-game', score: 100 });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('progressId');
    expect(res.body.score).toBe(100);

    const repeated = await request(app)
      .post('/api/progress')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .send({ game_name: 'logic-game', score: 60, mistakes: 2, duration_seconds: 34, completed: true });
    expect(repeated.statusCode).toBe(200);

    const db = await initDB();
    const rows = await db.all('SELECT score, best_score, mistakes, duration_seconds FROM progress WHERE user_id = (SELECT id FROM users WHERE email = ?)', ['progreso@kidcode.com']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ score: 60, best_score: 100, mistakes: 2, duration_seconds: 34 });

    const studentProgress = await request(app)
      .get('/api/progress/student')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(studentProgress.statusCode).toBe(200);
    expect(studentProgress.body.progress).toHaveLength(1);
    expect(studentProgress.body.progress[0]).toMatchObject({ score: 60, best_score: 100, mistakes: 2, duration_seconds: 34, completed: 1 });
  });

  it('Debe registrar una partida perdida sin desbloquear el nivel', async () => {
    await createUser({ name: 'Estudiante Intento', email: 'intento@kidcode.com', password: '123456' });
    const login = await loginUser({ email: 'intento@kidcode.com', password: '123456' });
    const response = await request(app)
      .post('/api/progress')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ game_name: 'logic-game', level: 1, score: 40, mistakes: 5, duration_seconds: 100, completed: false });
    expect(response.statusCode).toBe(201);
    const report = await request(app)
      .get('/api/progress/teacher')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(report.statusCode).toBe(403);
    const ownProgress = await request(app)
      .get('/api/progress/student')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(ownProgress.body.progress[0]).toMatchObject({ score: 40, mistakes: 5, completed: 0 });
  });

  it('Debe rechazar puntajes fuera del rango permitido', async () => {
    await createUser({ name: 'Estudiante Validación', email: 'validacion@kidcode.com', password: '123456' });
    const login = await loginUser({ email: 'validacion@kidcode.com', password: '123456' });
    const response = await request(app)
      .post('/api/progress')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ game_name: 'bug-game', score: 500 });
    expect(response.statusCode).toBe(400);
  });

  it('Debe aceptar el nivel 7 y rechazar niveles superiores', async () => {
    await createUser({ name: 'Estudiante Nivel Siete', email: 'nivel-siete@kidcode.com', password: '123456' });
    const login = await loginUser({ email: 'nivel-siete@kidcode.com', password: '123456' });
    const finalLevel = await request(app)
      .post('/api/progress')
      .set('Authorization', 'Bearer ' + login.body.token)
      .send({ game_name: 'sequence-game', level: 7, score: 95 });
    expect(finalLevel.statusCode).toBe(201);
    expect(finalLevel.body.level).toBe(7);

    const invalidLevel = await request(app)
      .post('/api/progress')
      .set('Authorization', 'Bearer ' + login.body.token)
      .send({ game_name: 'bug-game', level: 8, score: 95 });
    expect(invalidLevel.statusCode).toBe(400);
  });

  it('Debe conservar porcentajes decimales y acumular intentos, tiempo y errores tipificados', async () => {
    await createUser({ name: 'Estudiante Métricas', email: 'metricas@kidcode.com', password: '123456' });
    const login = await loginUser({ email: 'metricas@kidcode.com', password: '123456' });
    const headers = { Authorization: 'Bearer ' + login.body.token };

    const first = await request(app)
      .post('/api/progress')
      .set(headers)
      .send({
        game_name: 'sequence-game',
        level: 4,
        score: 77.4,
        mistakes: 1,
        mistake_types: { wrong_route: 1 },
        duration_seconds: 12,
        attempts: 2,
        instruction_count: 7,
        completed: false,
      });
    expect(first.statusCode).toBe(201);
    expect(first.body.score).toBe(77.4);

    const second = await request(app)
      .post('/api/progress')
      .set(headers)
      .send({
        game_name: 'sequence-game',
        level: 4,
        score: 83.7,
        mistakes: 2,
        mistake_types: { wrong_fix: 2 },
        duration_seconds: 23,
        attempts: 2,
        multiplier: 2,
        instruction_count: 6,
        completed: true,
      });
    expect(second.statusCode).toBe(200);
    expect(second.body).toMatchObject({
      score: 83.7,
      attempts: 4,
      mistakes: 3,
      duration_seconds: 35,
      mistake_types: { wrong_route: 1, wrong_fix: 2 },
      completed: true,
    });

    const report = await request(app).get('/api/progress/teacher').set(headers);
    expect(report.statusCode).toBe(403);
    const teacherEmail = 'metricas-docente@kidcode.com';
    await createUser({ name: 'Docente Métricas', email: teacherEmail, password: '123456', role: 'docente' });
    const teacher = await loginUser({ email: teacherEmail, password: '123456' });
    const reportForTeacher = await request(app).get('/api/progress/teacher')
      .set({ Authorization: `Bearer ${teacher.body.token}` });
    expect(reportForTeacher.statusCode).toBe(200);
    expect(reportForTeacher.body.students[0]).toMatchObject({
      bestScore: 83.7,
      commonMistakes: { wrong_route: 1, wrong_fix: 2 },
    });
    expect(reportForTeacher.body.students[0].progress[0]).toMatchObject({
      score: 83.7,
      attempts: 4,
      duration_seconds: 35,
      mistake_types: { wrong_route: 1, wrong_fix: 2 },
      instruction_count: 6,
    });
  });

  it('Debe aceptar progreso de Patch Cable y Stack Balancer', async () => {
    await createUser({ name: 'Estudiante Nuevos Juegos', email: 'juegos@kidcode.com', password: '123456' });
    const login = await loginUser({ email: 'juegos@kidcode.com', password: '123456' });
    const headers = { Authorization: 'Bearer ' + login.body.token };

    for (const game_name of ['patch-cable', 'stack-balancer']) {
      const response = await request(app)
        .post('/api/progress')
        .set(headers)
        .send({ game_name, level: 1, score: 86.4, completed: true });
      expect(response.statusCode).toBe(201);
      expect(response.body.game_name).toBe(game_name);
    }
  });

  it('Debe bloquear Clínica de código hasta completar 21 niveles introductorios', async () => {
    await createUser({ name: 'Estudiante Graduación', email: 'graduacion@kidcode.com', password: '123456' });
    const login = await loginUser({ email: 'graduacion@kidcode.com', password: '123456' });
    const headers = { Authorization: 'Bearer ' + login.body.token };
    const locked = await request(app)
      .post('/api/progress')
      .set(headers)
      .send({ game_name: 'bug-game', level: 1, score: 80, completed: true });
    expect(locked.statusCode).toBe(403);

    const db = await initDB();
    const student = await db.get('SELECT id FROM users WHERE email = ?', ['graduacion@kidcode.com']);
    const games = ['logic-game', 'sequence-game', 'patch-cable', 'stack-balancer'];
    let remaining = 21;
    for (const game_name of games) {
      for (let level = 1; level <= 7 && remaining > 0; level += 1) {
        await db.run(
          'INSERT INTO progress (user_id, game_name, level, score, best_score, completed) VALUES (?, ?, ?, 80, 80, 1)',
          [student.id, game_name, level]
        );
        remaining -= 1;
      }
    }
    const unlocked = await request(app)
      .post('/api/progress')
      .set(headers)
      .send({ game_name: 'bug-game', level: 1, score: 80, completed: true });
    expect(unlocked.statusCode).toBe(201);
  });

  it('Debe guardar puntajes de niveles distintos por separado', async () => {
    await createUser({ name: 'Estudiante Niveles', email: 'niveles@kidcode.com', password: '123456' });
    const login = await loginUser({ email: 'niveles@kidcode.com', password: '123456' });
    for (const level of [1, 2]) {
      const response = await request(app)
        .post('/api/progress')
        .set('Authorization', `Bearer ${login.body.token}`)
        .send({ game_name: 'sequence-game', level, score: 80 + level });
      expect(response.statusCode).toBe(201);
    }
    const result = await request(app)
      .get('/api/progress/student')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(result.body.progress.map((item) => item.level).sort()).toEqual([1, 2]);
  });

  it('Debe devolver el listado de progreso para docentes', async () => {
    const teacher = await createUser({
      name: 'Docente Uno',
      email: 'docente@kidcode.com',
      password: '123456',
      role: 'docente'
    });

    const student = await createUser({
      name: 'Estudiante Uno',
      email: 'estudiante@kidcode.com',
      password: '123456',
      role: 'estudiante'
    });

    expect(teacher.statusCode).toBe(201);
    expect(student.statusCode).toBe(201);

    const loginDoc = await loginUser({ email: 'docente@kidcode.com', password: '123456' });
    expect(loginDoc.statusCode).toBe(200);

    const loginStudent = await loginUser({ email: 'estudiante@kidcode.com', password: '123456' });
    expect(loginStudent.statusCode).toBe(200);

    await request(app)
      .post('/api/progress')
      .set('Authorization', `Bearer ${loginStudent.body.token}`)
      .send({ game_name: 'logic-game', score: 90 });

    const res = await request(app)
      .get('/api/progress/teacher')
      .set('Authorization', `Bearer ${loginDoc.body.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('students');
    expect(Array.isArray(res.body.students)).toBe(true);
    expect(res.body.students.length).toBeGreaterThanOrEqual(1);
  });

  it('Protege los controles docentes y aplica disponibilidad y dificultad a estudiantes', async () => {
    await createUser({ name: 'Docente Control', email: 'control-docente@kidcode.com', password: '123456', role: 'docente' });
    await createUser({ name: 'Estudiante Control', email: 'control-estudiante@kidcode.com', password: '123456' });
    const teacher = await loginUser({ email: 'control-docente@kidcode.com', password: '123456' });
    const student = await loginUser({ email: 'control-estudiante@kidcode.com', password: '123456' });
    const teacherHeaders = { Authorization: `Bearer ${teacher.body.token}` };
    const studentHeaders = { Authorization: `Bearer ${student.body.token}` };

    const denied = await request(app).get('/api/progress/classroom/controls').set(studentHeaders);
    expect(denied.statusCode).toBe(403);

    const initialSettings = await request(app).get('/api/progress/settings').set(studentHeaders);
    expect(initialSettings.body).toMatchObject({ difficulty: 'medio', games: { 'logic-game': true } });

    const gameOff = await request(app).put('/api/progress/classroom/games/logic-game').set(teacherHeaders).send({ enabled: false });
    expect(gameOff.statusCode).toBe(200);
    const difficulty = await request(app)
      .put(`/api/progress/classroom/students/${student.body.user.id}/difficulty`)
      .set(teacherHeaders)
      .send({ difficulty: 'dificil' });
    expect(difficulty.statusCode).toBe(200);

    const updatedSettings = await request(app).get('/api/progress/settings').set(studentHeaders);
    expect(updatedSettings.body).toMatchObject({ difficulty: 'dificil', games: { 'logic-game': false } });
    const blockedRun = await request(app).post('/api/progress').set(studentHeaders).send({ game_name: 'logic-game', score: 80 });
    expect(blockedRun.statusCode).toBe(403);
  });

  it('Acumula fallos consecutivos para activar alertas de apoyo', async () => {
    await createUser({ name: 'Estudiante Alerta', email: 'alerta@kidcode.com', password: '123456' });
    const login = await loginUser({ email: 'alerta@kidcode.com', password: '123456' });
    const headers = { Authorization: `Bearer ${login.body.token}` };

    await request(app).post('/api/progress').set(headers).send({
      game_name: 'sequence-game', level: 2, score: 42, completed: false, attempts: 2,
    });
    const failed = await request(app).post('/api/progress').set(headers).send({
      game_name: 'sequence-game', level: 2, score: 38, completed: false,
    });
    expect(failed.statusCode).toBe(200);
    expect(failed.body.consecutive_failures).toBe(3);

    const teacherEmail = 'alerta-docente@kidcode.com';
    await createUser({ name: 'Docente Alerta', email: teacherEmail, password: '123456', role: 'docente' });
    const teacher = await loginUser({ email: teacherEmail, password: '123456' });
    const report = await request(app).get('/api/progress/teacher')
      .set({ Authorization: `Bearer ${teacher.body.token}` });
    expect(report.body.students[0].progress[0].consecutive_failures).toBe(3);
  });

  it('guarda puntos de dificultad una sola vez y permite comprar y equipar accesorios', async () => {
    const email = `avatar-${Date.now()}@kidcode.com`;
    await createUser({ name: 'Estudiante Avatar', email, password: '123456' });
    const login = await loginUser({ email, password: '123456' });
    const headers = { Authorization: `Bearer ${login.body.token}` };

    const completed = await request(app).post('/api/progress').set(headers).send({
      game_name: 'logic-game',
      level: 1,
      score: 100,
      completed: true,
    });
    expect(completed.statusCode).toBe(201);
    expect(completed.body).toMatchObject({ reward_points: 90, points: 90 });

    const repeated = await request(app).post('/api/progress').set(headers).send({
      game_name: 'logic-game',
      level: 1,
      score: 75,
      completed: true,
    });
    expect(repeated.statusCode).toBe(200);
    expect(repeated.body).toMatchObject({ reward_points: 0, points: 90 });

    const purchase = await request(app).post('/api/progress/profile/purchase').set(headers).send({ itemId: 'cap' });
    expect(purchase.statusCode).toBe(200);
    expect(purchase.body).toMatchObject({ points: 20, ownedItems: ['cap'] });
    await request(app).put('/api/progress/profile').set(headers).send({
      nickname: 'Byte',
      pet: 'fox',
      equippedItems: { Cabeza: 'cap' },
    }).expect(200);
    const profile = await request(app).get('/api/progress/profile').set(headers);
    expect(profile.body).toMatchObject({
      nickname: 'Byte',
      pet: 'fox',
      points: 20,
      ownedItems: ['cap'],
      equippedItems: { Cabeza: 'cap' },
    });
  });

  it('permite desbloquear mascotas con puntos y bloquea la selección de personajes no comprados', async () => {
    const email = `mascota-${Date.now()}@kidcode.com`;
    await createUser({ name: 'Estudiante Mascota', email, password: '123456' });
    const login = await loginUser({ email, password: '123456' });
    const headers = { Authorization: `Bearer ${login.body.token}` };
    const initialProfile = await request(app).get('/api/progress/profile').set(headers).expect(200);
    expect(initialProfile.body.pets.find((pet) => pet.id === 'panda')).toMatchObject({
      price: 120,
      unlocked: false,
      itemId: 'pet-panda',
    });
    expect(initialProfile.body.pets.map(({ id, price }) => [id, price])).toEqual([
      ['fox', 0],
      ['panda', 120],
      ['penguin', 250],
      ['cat', 400],
    ]);
    expect(initialProfile.body.catalog.filter((item) => item.category !== 'Personaje').map(({ id, price }) => [id, price])).toEqual([
      ['cap', 70],
      ['goggles', 50],
      ['hoodie', 140],
      ['laptop', 120],
      ['medal', 250],
    ]);

    await request(app).put('/api/progress/profile').set(headers).send({ pet: 'panda' }).expect(400);

    const db = await initDB();
    await db.run(
      'UPDATE student_profiles SET points = 200 WHERE user_id = (SELECT id FROM users WHERE email = ?)',
      [email]
    );
    const purchase = await request(app)
      .post('/api/progress/profile/purchase')
      .set(headers)
      .send({ itemId: 'pet-panda' })
      .expect(200);
    expect(purchase.body).toMatchObject({ points: 80, ownedItems: ['pet-panda'] });
    const unaffordablePurchase = await request(app)
      .post('/api/progress/profile/purchase')
      .set(headers)
      .send({ itemId: 'pet-cat' })
      .expect(400);
    expect(unaffordablePurchase.body.error).toMatch(/suficientes puntos/i);

    await request(app).put('/api/progress/profile').set(headers).send({ pet: 'panda' }).expect(200);
    const updatedProfile = await request(app).get('/api/progress/profile').set(headers).expect(200);
    expect(updatedProfile.body).toMatchObject({
      pet: 'panda',
      ownedItems: ['pet-panda'],
    });
    expect(updatedProfile.body.pets.find((pet) => pet.id === 'panda').unlocked).toBe(true);
  });

  it('registra valoraciones, parciales y el CMS docente con autorización', async () => {
    const suffix = Date.now();
    const studentEmail = `estudiante-${suffix}@kidcode.com`;
    const teacherEmail = `docente-${suffix}@kidcode.com`;
    await createUser({ name: 'Estudiante Academia', email: studentEmail, password: '123456' });
    await createUser({ name: 'Docente Academia', email: teacherEmail, password: '123456', role: 'docente' });
    const student = await loginUser({ email: studentEmail, password: '123456' });
    const teacher = await loginUser({ email: teacherEmail, password: '123456' });
    const studentHeaders = { Authorization: `Bearer ${student.body.token}` };
    const teacherHeaders = { Authorization: `Bearer ${teacher.body.token}` };

    await request(app).post('/api/progress/reviews').set(studentHeaders).send({
      game_name: 'patch-cable',
      stars: 5,
      tag: 'Aprendí mucho',
      comment: 'Me gustó conectar los servidores.',
    }).expect(200);
    const feedback = await request(app).get('/api/progress/reviews/teacher').set(teacherHeaders).expect(200);
    expect(feedback.body.reviews[0]).toMatchObject({ game_name: 'patch-cable', stars: 5, student_name: 'Estudiante Academia' });
    await request(app).get('/api/progress/reviews/teacher').set(studentHeaders).expect(403);

    const sectionsResponse = await request(app).get('/api/progress/learning/sections').set(studentHeaders).expect(200);
    const section = sectionsResponse.body.sections.find(({ id }) => id === 'algorithms');
    expect(section.lessons).toHaveLength(2);
    expect(section.questions[0]).not.toHaveProperty('answer');
    await request(app).put('/api/progress/learning/sections/algorithms/progress').set(studentHeaders)
      .send({ completedLessons: [0, 1] }).expect(200);
    const exam = await request(app).post('/api/progress/learning/sections/algorithms/exam').set(studentHeaders)
      .send({ answers: [0, 1, 0] }).expect(201);
    expect(exam.body).toMatchObject({ score: 100, passed: true, correctAnswers: 3 });

    const results = await request(app).get('/api/progress/learning/results/teacher').set(teacherHeaders).expect(200);
    expect(results.body.results[0]).toMatchObject({
      sectionId: 'algorithms',
      score: 100,
      passed: 1,
      studentName: 'Estudiante Academia',
    });

    const teacherSections = await request(app).get('/api/progress/learning/sections').set(teacherHeaders).expect(200);
    const editableSection = teacherSections.body.sections.find(({ id }) => id === 'algorithms');
    const edit = await request(app).put('/api/progress/learning/sections/algorithms').set(teacherHeaders).send({
      title: 'Algoritmos para todos',
      ageRange: '5–13 años',
      description: 'Lecturas nuevas para aprender secuencias.',
      lessons: editableSection.lessons,
      questions: editableSection.questions,
    }).expect(200);
    expect(edit.body.message).toMatch(/guardada/);
    await request(app).put('/api/progress/learning/sections/algorithms').set(studentHeaders).send({
      title: 'No autorizado',
    }).expect(403);

    const db = await initDB();
    await db.run('DELETE FROM users WHERE email IN (?, ?)', [studentEmail, teacherEmail]);
    for (const defaultSection of defaultLearningSections) {
      await db.run(
        `UPDATE learning_sections SET title = ?, age_range = ?, description = ?, content = ?
         WHERE section_id = ?`,
        [defaultSection.title, defaultSection.ageRange, defaultSection.description, JSON.stringify({
          lessons: defaultSection.lessons,
          questions: defaultSection.questions,
        }), defaultSection.id]
      );
    }
  });
});
