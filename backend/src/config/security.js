import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const configDirectory = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(configDirectory, '../../.env') });

export const isProduction = process.env.NODE_ENV === 'production';
const configuredJwtSecret = process.env.JWT_SECRET;

if (isProduction && (!configuredJwtSecret || configuredJwtSecret.length < 32)) {
  throw new Error('JWT_SECRET must contain at least 32 characters in production.');
}

export const jwtSecret = configuredJwtSecret || 'local-development-only-insecure-secret';
export const teacherRegistrationCode = process.env.TEACHER_REGISTRATION_CODE
  || (process.env.NODE_ENV === 'test' ? 'kidcode-test-teacher-code' : '');
export const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);
