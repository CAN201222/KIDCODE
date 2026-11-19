import { initDB } from '../config/database.js';

const gameIds = ['logic-game', 'sequence-game', 'patch-cable', 'stack-balancer', 'bug-game'];
const difficulties = new Set(['facil', 'medio', 'dificil']);

export async function getStudentSettings(req, res) {
  try {
    const db = await initDB();
    const preference = await db.get('SELECT difficulty FROM student_preferences WHERE user_id = ?', [req.user.id]);
    const rows = await db.all('SELECT game_name, enabled FROM game_controls');
    const games = Object.fromEntries(gameIds.map((id) => [id, true]));
    rows.forEach(({ game_name, enabled }) => { games[game_name] = Boolean(enabled); });
    return res.status(200).json({ difficulty: preference?.difficulty || 'medio', games });
  } catch (error) {
    console.error('Error consultando configuración del estudiante:', error);
    return res.status(500).json({ error: 'No se pudo consultar la configuración de aprendizaje.' });
  }
}

export async function getTeacherControls(req, res) {
  try {
    const db = await initDB();
    const gameRows = await db.all('SELECT game_name, enabled FROM game_controls ORDER BY game_name');
    const games = Object.fromEntries(gameIds.map((id) => [id, true]));
    gameRows.forEach(({ game_name, enabled }) => { games[game_name] = Boolean(enabled); });
    const students = await db.all(`
      SELECT u.id, u.name, COALESCE(p.difficulty, 'medio') AS difficulty
      FROM users u
      LEFT JOIN student_preferences p ON p.user_id = u.id
      WHERE u.role = 'estudiante'
      ORDER BY u.name
    `);
    return res.status(200).json({ games, students });
  } catch (error) {
    console.error('Error consultando controles docentes:', error);
    return res.status(500).json({ error: 'No se pudieron consultar los controles docentes.' });
  }
}

export async function setGameAvailability(req, res) {
  const { gameName } = req.params;
  const { enabled } = req.body || {};
  if (!gameIds.includes(gameName) || typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'Indica un juego válido y su estado activo/inactivo.' });
  }

  try {
    const db = await initDB();
    await db.run(
      'INSERT INTO game_controls (game_name, enabled) VALUES (?, ?) ON CONFLICT(game_name) DO UPDATE SET enabled = excluded.enabled',
      [gameName, enabled ? 1 : 0]
    );
    return res.status(200).json({ game_name: gameName, enabled });
  } catch (error) {
    console.error('Error actualizando disponibilidad del juego:', error);
    return res.status(500).json({ error: 'No se pudo actualizar la disponibilidad del juego.' });
  }
}

export async function setStudentDifficulty(req, res) {
  const studentId = Number(req.params.studentId);
  const { difficulty } = req.body || {};
  if (!Number.isInteger(studentId) || studentId < 1 || !difficulties.has(difficulty)) {
    return res.status(400).json({ error: 'Indica un estudiante y una dificultad válidos.' });
  }

  try {
    const db = await initDB();
    const student = await db.get("SELECT id FROM users WHERE id = ? AND role = 'estudiante'", [studentId]);
    if (!student) return res.status(404).json({ error: 'No se encontró el estudiante solicitado.' });
    await db.run(
      `INSERT INTO student_preferences (user_id, difficulty) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET difficulty = excluded.difficulty`,
      [studentId, difficulty]
    );
    return res.status(200).json({ studentId, difficulty });
  } catch (error) {
    console.error('Error actualizando dificultad del estudiante:', error);
    return res.status(500).json({ error: 'No se pudo actualizar la dificultad del estudiante.' });
  }
}
