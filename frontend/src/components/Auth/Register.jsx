import { useState } from 'react';
import { registerUser } from '../../services/api';
import AuthLayout from './AuthLayout';

export default function Register({ switchToLogin }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [role, setRole] = useState('estudiante'); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const handleSubmit = async (event) => {
    event.preventDefault(); setError(''); setMessage(''); setLoading(true);
    try { const data = await registerUser({ name, email, password, role, ...(role === 'docente' ? { teacherCode } : {}) }); if (data.userId) setMessage('¡Cuenta creada! Ya puedes iniciar sesión.'); else setError(data.error || 'No fue posible crear la cuenta.'); }
    catch { setError('No fue posible conectar con el servidor. Intenta de nuevo.'); } finally { setLoading(false); }
  };
  return <AuthLayout register><h2>Crea tu cuenta</h2><p className="muted">Un nombre y un correo para comenzar.</p>{message && <div className="alert success" role="status">{message}</div>}{error && <div className="alert error" role="alert">{error}</div>}<form onSubmit={handleSubmit}>
    <div className="field"><label htmlFor="register-name">Nombre completo</label><input id="register-name" autoComplete="name" required placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} /></div>
    <div className="field"><label htmlFor="register-email">Correo electrónico</label><input id="register-email" type="email" autoComplete="email" required placeholder="tu@colegio.edu.co" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
    <div className="field"><label htmlFor="register-password">Contraseña</label><input id="register-password" type="password" autoComplete="new-password" minLength="6" required placeholder="Al menos 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
    <div className="field"><label htmlFor="register-role">Mi perfil</label><select id="register-role" value={role} onChange={(e) => setRole(e.target.value)}><option value="estudiante">Estudiante</option><option value="docente">Docente</option></select></div>
    {role === 'docente' && <div className="field"><label htmlFor="register-teacher-code">Código de invitación docente</label><input id="register-teacher-code" type="password" autoComplete="off" required value={teacherCode} onChange={(e) => setTeacherCode(e.target.value)} /></div>}
    <button className="primary-btn full" disabled={loading}>{loading ? 'Creando cuenta…' : 'Crear mi cuenta →'}</button>
  </form><div className="auth-switch">¿Ya tienes una cuenta? <button onClick={switchToLogin}>Iniciar sesión</button></div></AuthLayout>;
}
