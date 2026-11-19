import request from 'supertest';
import app from '../app.js';

describe('Pruebas Unitarias - Módulo de Autenticación (HU-01)', () => {
  it('Debe registrar un nuevo usuario estudiante correctamente', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Prueba Estudiante',
        email: `test_${Date.now()}@fet.edu.co`,
        password: 'password123',
        role: 'estudiante'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('userId');
  });

  it('Debe rechazar el registro con campos incompletos', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'incompleto@fet.edu.co'
      });

    expect(res.statusCode).toEqual(400);
  });

  it('Debe rechazar la creación de cuentas docentes sin código de invitación', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Docente sin invitación',
        email: `docente_${Date.now()}@fet.edu.co`,
        password: 'password123',
        role: 'docente',
      });

    expect(res.statusCode).toBe(403);
  });

  it('Debe rechazar roles de registro que no estén admitidos', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Usuario con rol inválido',
        email: `rol_${Date.now()}@fet.edu.co`,
        password: 'password123',
        role: 'administrador',
      });

    expect(res.statusCode).toBe(400);
  });
});
