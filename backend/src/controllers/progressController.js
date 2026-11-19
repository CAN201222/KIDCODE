import { initDB } from '../config/database.js';

const introGames = ['logic-game', 'sequence-game', 'patch-cable', 'stack-balancer'];
const allowedGames = new Set([...introGames, 'bug-game']);
const allowedMistakeTypes = new Set(['collision', 'wrong_route', 'wrong_pipeline', 'wrong_fix', 'network_outage', 'timeout']);

function isValidMistakeTypes(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.entries(value).every(([type, count]) => allowedMistakeTypes.has(type) && Number.isInteger(count) && count >= 0);
}

function parseMistakeTypes(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    if (!isValidMistakeTypes(parsed)) {
      console.error('Tipos de error de progreso con formato inválido en la base de datos.');
      return {};
    }
    return parsed;
  } catch (error) {
    console.error('No se pudieron leer los tipos de error de progreso guardados:', error);
    return {};
  }
}

function mergeMistakeTypes(previous, current) {
  return Object.fromEntries([...new Set([...Object.keys(previous), ...Object.keys(current)])]
    .map((type) => [type, (previous[type] || 0) + (current[type] || 0)]));
}

function presentProgress(row) {
  return { ...row, mistake_types: parseMistakeTypes(row.mistake_types) };
}

function levelReward(score, difficulty) {
  const normalizedScore = Math.max(0, Math.min(100, Number(score) || 0));
  if (difficulty === 'facil') return Math.round(30 + normalizedScore * 0.2);
  if (difficulty === 'dificil') return Math.round(150 + normalizedScore * 0.5);
  return Math.round(70 + normalizedScore * 0.2);
}

export const saveProgress = async (req, res) => {
  let db;
  try {
    const {
      game_name,
      level = 1,
      score,
      mistakes = 0,
      duration_seconds = 0,
      completed = true,
      attempts = 1,
      mistake_types = {},
      multiplier = 1,
      instruction_count = 0,
    } = req.body;
    const validScore = Number.isFinite(score) && score >= 0 && score <= 100 && Math.abs(score * 10 - Math.round(score * 10)) < 1e-8;
    if (!allowedGames.has(game_name)
      || !Number.isInteger(level) || level < 1 || level > 7
      || !validScore
      || !Number.isInteger(mistakes) || mistakes < 0
      || !Number.isInteger(duration_seconds) || duration_seconds < 0
      || !Number.isInteger(attempts) || attempts < 0
      || !Number.isInteger(instruction_count) || instruction_count < 0
      || ![1, 2].includes(multiplier)
      || !isValidMistakeTypes(mistake_types)
      || typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'Revisa el juego, el nivel, el puntaje y las métricas de la partida.' });
    }

    db = await initDB();
    const gameControl = await db.get('SELECT enabled FROM game_controls WHERE game_name = ?', [game_name]);
    if (gameControl?.enabled === 0) {
      return res.status(403).json({ error: 'Este juego no está disponible para la sesión actual.' });
    }
    if (game_name === 'bug-game') {
      const { completedIntroLevels } = await db.get(`
        SELECT COUNT(*) AS completedIntroLevels
        FROM progress
        WHERE user_id = ? AND game_name IN (?, ?, ?, ?) AND completed = 1
      `, [req.user.id, ...introGames]);
      if (completedIntroLevels < 21) {
        return res.status(403).json({ error: 'Completa 21 niveles de los juegos introductorios para desbloquear Clínica de código.' });
      }
    }
    await db.exec('BEGIN IMMEDIATE');
    const existing = await db.get(
      'SELECT id, score, best_score, completed, mistakes, duration_seconds, attempts, mistake_types, consecutive_failures, reward_points FROM progress WHERE user_id = ? AND game_name = ? AND level = ?',
      [req.user.id, game_name, level]
    );
    const cumulativeMistakeTypes = mergeMistakeTypes(parseMistakeTypes(existing?.mistake_types), mistake_types);
    const cumulativeMistakes = (existing?.mistakes || 0) + mistakes;
    const cumulativeDuration = (existing?.duration_seconds || 0) + duration_seconds;
    const cumulativeAttempts = (existing?.attempts || 0) + Math.max(attempts, 1);
    const completedLevel = Boolean(existing?.completed || completed);
    const consecutiveFailures = completedLevel ? 0 : (existing?.consecutive_failures || 0) + Math.max(attempts, 1);
    const preference = await db.get('SELECT difficulty FROM student_preferences WHERE user_id = ?', [req.user.id]);
    const rewardPoints = completedLevel && !existing?.completed
      ? levelReward(score, preference?.difficulty || 'medio')
      : (existing?.reward_points || 0);

    const result = await db.run(`
      INSERT INTO progress (
        user_id, game_name, level, score, best_score, mistakes, duration_seconds,
        completed, attempts, mistake_types, multiplier, instruction_count, consecutive_failures, reward_points
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, game_name, level) DO UPDATE SET
        score = excluded.score,
        best_score = MAX(progress.best_score, excluded.best_score),
        mistakes = excluded.mistakes,
        duration_seconds = excluded.duration_seconds,
        completed = excluded.completed,
        attempts = excluded.attempts,
        mistake_types = excluded.mistake_types,
        multiplier = excluded.multiplier,
        instruction_count = excluded.instruction_count,
        consecutive_failures = excluded.consecutive_failures,
        reward_points = excluded.reward_points,
        completed_at = CURRENT_TIMESTAMP
    `, [
      req.user.id, game_name, level, score, Math.max(existing?.best_score || 0, score),
      cumulativeMistakes, cumulativeDuration, completedLevel ? 1 : 0, cumulativeAttempts,
      JSON.stringify(cumulativeMistakeTypes), multiplier, instruction_count, consecutiveFailures, rewardPoints,
    ]);
    const newlyEarnedPoints = completedLevel && !existing?.completed ? rewardPoints : 0;
    if (newlyEarnedPoints > 0) {
      await db.run('INSERT OR IGNORE INTO student_profiles (user_id) VALUES (?)', [req.user.id]);
      await db.run('UPDATE student_profiles SET points = points + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [newlyEarnedPoints, req.user.id]);
    }
    const profile = await db.get('SELECT points FROM student_profiles WHERE user_id = ?', [req.user.id]);
    await db.exec('COMMIT');

    return res.status(existing ? 200 : 201).json({
      message: 'Progreso guardado correctamente.',
      progressId: existing?.id || result.lastID,
      userId: req.user.id,
      game_name,
      level,
      score,
      attempts: cumulativeAttempts,
      mistakes: cumulativeMistakes,
      duration_seconds: cumulativeDuration,
      mistake_types: cumulativeMistakeTypes,
      consecutive_failures: consecutiveFailures,
      completed: completedLevel,
      reward_points: newlyEarnedPoints,
      points: profile?.points || 0,
    });
  } catch (error) {
    if (db) await db.exec('ROLLBACK').catch((rollbackError) => console.error('Error revirtiendo progreso:', rollbackError));
    console.error('Error guardando progreso:', error);
    return res.status(500).json({ error: 'Error interno al guardar el progreso.' });
  }
};

export const getStudentProgress = async (req, res) => {
  try {
    const db = await initDB();
    const progress = await db.all(
      'SELECT game_name, level, score, best_score, mistakes, duration_seconds, completed, completed_at, attempts, mistake_types, multiplier, instruction_count, consecutive_failures, reward_points FROM progress WHERE user_id = ? ORDER BY completed_at DESC',
      [req.user.id]
    );
    return res.status(200).json({ progress: progress.map(presentProgress) });
  } catch (error) {
    console.error('Error consultando progreso del estudiante:', error);
    return res.status(500).json({ error: 'Error interno al consultar el progreso.' });
  }
};

export const getTeacherProgress = async (req, res) => {
  try {
    const db = await initDB();
    const students = await db.all(`
      SELECT u.id, u.name, u.email, u.role,
        COUNT(DISTINCT CASE WHEN p.completed = 1 THEN p.game_name END) AS gamesPlayed,
        SUM(CASE WHEN p.completed = 1 THEN 1 ELSE 0 END) AS levelsCompleted,
        ROUND(COALESCE(AVG(p.score), 0), 2) AS averageScore,
        MAX(p.best_score) AS bestScore,
        MAX(p.completed_at) AS lastCompletedAt
      FROM users u LEFT JOIN progress p ON p.user_id = u.id
      WHERE u.role = 'estudiante'
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY u.name ASC
    `);
    const detailedStudents = await Promise.all(students.map(async (student) => {
      const progress = await db.all(
        'SELECT game_name, level, score, best_score, mistakes, duration_seconds, completed, completed_at, attempts, mistake_types, multiplier, instruction_count, consecutive_failures, reward_points FROM progress WHERE user_id = ? ORDER BY completed_at DESC',
        [student.id]
      );
      const parsedProgress = progress.map(presentProgress);
      const commonMistakes = {};
      parsedProgress.forEach((item) => {
        Object.entries(item.mistake_types).forEach(([type, count]) => {
          commonMistakes[type] = (commonMistakes[type] || 0) + count;
        });
      });
      return {
        ...student,
        progress: parsedProgress,
        commonMistakes,
        totalScore: parsedProgress.reduce((sum, item) => sum + item.score, 0),
        lastCompletedAt: student.lastCompletedAt || null,
      };
    }));

    return res.status(200).json({
      totalStudents: detailedStudents.length,
      averageScore: detailedStudents.length ? Number((detailedStudents.reduce((sum, student) => sum + Number(student.averageScore || 0), 0) / detailedStudents.length).toFixed(2)) : 0,
      students: detailedStudents,
    });
  } catch (error) {
    console.error('Error consultando progreso del docente:', error);
    return res.status(500).json({ error: 'Error interno al consultar el progreso docente.' });
  }
};
