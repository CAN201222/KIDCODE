import { useState } from 'react';
import { loginUser } from '../../services/api';
import AuthLayout from './AuthLayout';

export default function Login({ onLoginSuccess, switchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault(); setError(''); setLoading(true);
    try { const data = await loginUser({ email, password }); if (data.token) onLoginSuccess(data.user, data.token); else setError(data.error || 'Revisa tu correo y contraseña.'); }
    catch { setError('No fue posible conectar con el servidor. Intenta de nuevo.'); }
    finally { setLoading(false); }
  };

  return <AuthLayout><h2>Inicia sesión</h2><p className="muted">Ingresa a tu espacio de aprendizaje.</p>{error && <div className="alert error" role="alert">{error}</div>}<form onSubmit={handleSubmit}>
    <div className="field"><label htmlFor="login-email">Correo electrónico</label><input id="login-email" type="email" autoComplete="email" placeholder="tu@colegio.edu.co" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
    <div className="field"><label htmlFor="login-password">Contraseña</label><input id="login-password" type="password" autoComplete="current-password" placeholder="Tu contraseña" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
    <button className="primary-btn full" disabled={loading}>{loading ? 'Ingresando…' : 'Entrar a KidCode →'}</button>
  </form><div className="auth-switch">¿Aún no tienes una cuenta? <button onClick={switchToRegister}>Crear cuenta</button></div></AuthLayout>;
}
