import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initDB } from '../config/database.js';
import { jwtSecret, teacherRegistrationCode } from '../config/security.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, role, teacherCode } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    const userRole = role || 'estudiante';
    if (!['estudiante', 'docente'].includes(userRole)) {
      return res.status(400).json({ error: 'El perfil seleccionado no es válido.' });
    }
    if (userRole === 'docente'
      && (!teacherRegistrationCode || teacherCode !== teacherRegistrationCode)) {
      return res.status(403).json({ error: 'Se requiere un código de invitación docente válido.' });
    }

    const db = await initDB();
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, userRole]
    );

    res.status(201).json({ message: 'Usuario registrado con éxito', userId: result.lastID });
  } catch (error) {
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await initDB();

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      jwtSecret,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
};
