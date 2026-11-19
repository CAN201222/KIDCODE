 import { randomUUID } from 'node:crypto';
 import { mkdir } from 'node:fs/promises';
 import { tmpdir } from 'node:os';
 import { dirname, join, resolve } from 'node:path';
 import { fileURLToPath } from 'node:url';
 import { config as loadEnv } from 'dotenv';
 import sqlite3 from 'sqlite3';
 import { open } from 'sqlite';
 import { defaultLearningSections } from './learningContent.js';

 const configDirectory = dirname(fileURLToPath(import.meta.url));
 loadEnv({ path: resolve(configDirectory, '../../.env') });
 const databasePath = process.env.NODE_ENV === 'test'
   ? join(tmpdir(), `kidcode-neiva-test-${process.pid}-${randomUUID()}.db`)
   : resolve(process.env.KIDCODE_DB_PATH || join(configDirectory, '../../kidcode.db'));

 export { databasePath };

 export async function initDB() {
   await mkdir(dirname(databasePath), { recursive: true });
   const db = await open({
     filename: databasePath,
     driver: sqlite3.Database
   });
  await db.exec('PRAGMA foreign_keys = ON');

  // Tabla de Usuarios (Estudiantes y Docentes)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('estudiante', 'docente')) NOT NULL DEFAULT 'estudiante',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Latest level score plus cumulative retry metrics for student and teacher reports.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_name TEXT NOT NULL,
      score REAL NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      level INTEGER NOT NULL DEFAULT 1 CHECK(level BETWEEN 1 AND 7),
      mistakes INTEGER NOT NULL DEFAULT 0,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      best_score REAL NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 1 CHECK(completed IN (0, 1)),
      attempts INTEGER NOT NULL DEFAULT 1,
      mistake_types TEXT NOT NULL DEFAULT '{}',
      multiplier REAL NOT NULL DEFAULT 1,
      instruction_count INTEGER NOT NULL DEFAULT 0,
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      reward_points INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS game_controls (
      game_name TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1))
    );
    CREATE TABLE IF NOT EXISTS student_preferences (
      user_id INTEGER PRIMARY KEY,
      difficulty TEXT NOT NULL DEFAULT 'medio' CHECK(difficulty IN ('facil', 'medio', 'dificil')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    INSERT OR IGNORE INTO game_controls (game_name, enabled) VALUES
      ('logic-game', 1),
      ('sequence-game', 1),
      ('patch-cable', 1),
      ('stack-balancer', 1),
      ('bug-game', 1);
    CREATE TABLE IF NOT EXISTS student_profiles (
      user_id INTEGER PRIMARY KEY,
      nickname TEXT NOT NULL DEFAULT '',
      pet TEXT NOT NULL DEFAULT 'fox',
      points INTEGER NOT NULL DEFAULT 0,
      owned_items TEXT NOT NULL DEFAULT '[]',
      equipped_items TEXT NOT NULL DEFAULT '{}',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS game_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_name TEXT NOT NULL,
      stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
      tag TEXT NOT NULL,
      comment TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, game_name),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS learning_sections (
      section_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      age_range TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS learning_progress (
      user_id INTEGER NOT NULL,
      section_id TEXT NOT NULL,
      completed_lessons TEXT NOT NULL DEFAULT '[]',
      passed INTEGER NOT NULL DEFAULT 0 CHECK(passed IN (0, 1)),
      last_score REAL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id, section_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(section_id) REFERENCES learning_sections(section_id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS learning_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      section_id TEXT NOT NULL,
      score REAL NOT NULL,
      passed INTEGER NOT NULL CHECK(passed IN (0, 1)),
      correct_answers INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(section_id) REFERENCES learning_sections(section_id) ON DELETE CASCADE
    );
  `);

  // Migrate databases created before progress was tracked by game level.
  const progressColumns = await db.all('PRAGMA table_info(progress)');
  if (!progressColumns.some((column) => column.name === 'level')) {
    await db.exec('ALTER TABLE progress ADD COLUMN level INTEGER NOT NULL DEFAULT 1 CHECK(level BETWEEN 1 AND 7)');
  }
  if (!progressColumns.some((column) => column.name === 'mistakes')) {
    await db.exec('ALTER TABLE progress ADD COLUMN mistakes INTEGER NOT NULL DEFAULT 0');
  }
  if (!progressColumns.some((column) => column.name === 'duration_seconds')) {
    await db.exec('ALTER TABLE progress ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 0');
  }
  if (!progressColumns.some((column) => column.name === 'best_score')) {
    await db.exec('ALTER TABLE progress ADD COLUMN best_score INTEGER NOT NULL DEFAULT 0');
    await db.exec('UPDATE progress SET best_score = score');
  }
  if (!progressColumns.some((column) => column.name === 'completed')) {
    await db.exec('ALTER TABLE progress ADD COLUMN completed INTEGER NOT NULL DEFAULT 1 CHECK(completed IN (0, 1))');
  }
  if (!progressColumns.some((column) => column.name === 'attempts')) {
    await db.exec('ALTER TABLE progress ADD COLUMN attempts INTEGER NOT NULL DEFAULT 1');
  }
  if (!progressColumns.some((column) => column.name === 'mistake_types')) {
    await db.exec("ALTER TABLE progress ADD COLUMN mistake_types TEXT NOT NULL DEFAULT '{}'");
  }
  if (!progressColumns.some((column) => column.name === 'multiplier')) {
    await db.exec('ALTER TABLE progress ADD COLUMN multiplier REAL NOT NULL DEFAULT 1');
  }
  if (!progressColumns.some((column) => column.name === 'instruction_count')) {
    await db.exec('ALTER TABLE progress ADD COLUMN instruction_count INTEGER NOT NULL DEFAULT 0');
  }
  if (!progressColumns.some((column) => column.name === 'consecutive_failures')) {
    await db.exec('ALTER TABLE progress ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0');
  }
  if (!progressColumns.some((column) => column.name === 'reward_points')) {
    await db.exec('ALTER TABLE progress ADD COLUMN reward_points INTEGER NOT NULL DEFAULT 0');
  }

  const progressSchema = await db.get("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'progress'");
  if (/level\s+between\s+1\s+and\s+3/i.test(progressSchema?.sql || '') || /score\s+integer/i.test(progressSchema?.sql || '')) {
    await db.exec('BEGIN TRANSACTION');
    try {
      await db.exec(`
        CREATE TABLE progress_next (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          game_name TEXT NOT NULL,
          score REAL NOT NULL,
          completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          level INTEGER NOT NULL DEFAULT 1 CHECK(level BETWEEN 1 AND 7),
          mistakes INTEGER NOT NULL DEFAULT 0,
          duration_seconds INTEGER NOT NULL DEFAULT 0,
          best_score REAL NOT NULL DEFAULT 0,
          completed INTEGER NOT NULL DEFAULT 1 CHECK(completed IN (0, 1)),
          attempts INTEGER NOT NULL DEFAULT 1,
          mistake_types TEXT NOT NULL DEFAULT '{}',
          multiplier REAL NOT NULL DEFAULT 1,
          instruction_count INTEGER NOT NULL DEFAULT 0,
          consecutive_failures INTEGER NOT NULL DEFAULT 0,
          reward_points INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY(user_id) REFERENCES users(id)
        );
        INSERT INTO progress_next (id, user_id, game_name, score, completed_at, level, mistakes, duration_seconds, best_score, completed, attempts, mistake_types, multiplier, instruction_count, consecutive_failures, reward_points)
        SELECT id, user_id, game_name, score, completed_at, level, mistakes, duration_seconds, best_score, completed, attempts, mistake_types, multiplier, instruction_count, consecutive_failures, reward_points FROM progress;
        DROP TABLE progress;
        ALTER TABLE progress_next RENAME TO progress;
      `);
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  await db.exec(`
    DELETE FROM progress
    WHERE id NOT IN (
      SELECT MAX(id) FROM progress GROUP BY user_id, game_name, level
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_student_game_level
    ON progress (user_id, game_name, level);
  `);

  for (const section of defaultLearningSections) {
    await db.run(
      `INSERT OR IGNORE INTO learning_sections (section_id, title, age_range, description, content)
       VALUES (?, ?, ?, ?, ?)`,
      [section.id, section.title, section.ageRange, section.description, JSON.stringify({
        lessons: section.lessons,
        questions: section.questions,
      })]
    );
  }

  return db;
}
