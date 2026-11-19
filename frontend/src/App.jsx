import { useEffect, useState } from 'react';
import './App.css';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import LogicGame from './components/Game/LogicGame';
import InteractiveMiniGame from './components/Game/InteractiveMiniGame';
import TeacherDashboard from './components/Dashboard/TeacherDashboard';
import StudentHome from './components/StudentHome';
import GameErrorBoundary from './components/Game/GameErrorBoundary';
import { getStudentSettings } from './services/api';
import { ThemeProvider } from './ThemeContext';

function ActiveGameSession({ user, token, game, level, fallbackDifficulty, onBack, onNextLevel, onLogout }) {
  const [settings, setSettings] = useState(null);
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    let active = true;
    const refreshSettings = async () => {
      try {
        const data = await getStudentSettings(token);
        if (!active) return;
        if (data.error) throw new Error(data.error);
        setSettings({
          difficulty: ['facil', 'medio', 'dificil'].includes(data.difficulty) ? data.difficulty : fallbackDifficulty,
          games: data.games || {},
        });
        setSettingsError('');
      } catch (error) {
        if (!active) return;
        console.error('No se pudo actualizar la configuración del juego:', error);
        setSettingsError('No se pudo actualizar la configuración del aula. Se conserva la última configuración recibida.');
        setSettings((current) => current || { difficulty: fallbackDifficulty, games: {} });
      }
    };
    refreshSettings();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshSettings();
    }, 5000);
    window.addEventListener('focus', refreshSettings);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshSettings);
    };
  }, [token, fallbackDifficulty]);

  if (!settings) return <main className="game-recovery-screen" aria-live="polite"><p>Cargando la configuración de tu misión…</p></main>;
  if (settings.games[game] === false) {
    return <main className="game-recovery-screen" role="status"><div className="game-recovery-card"><span>⏸️</span><h1>Juego pausado por tu docente</h1><p>Tu progreso guardado está a salvo. Vuelve a tus misiones para elegir otro juego.</p><button className="primary-btn" onClick={onBack}>Volver a mis juegos</button></div></main>;
  }

  return <GameErrorBoundary key={`${game}:${level}:${settings.difficulty}`} onBack={onBack}>
    {settingsError && <div className="alert error" role="alert">{settingsError}</div>}
    {game === 'patch-cable' || game === 'stack-balancer'
      ? <InteractiveMiniGame user={user} token={token} game={game} level={level} difficulty={settings.difficulty} onBack={onBack} onNextLevel={onNextLevel} />
      : <LogicGame user={user} token={token} game={game} level={level} difficulty={settings.difficulty} onBack={onBack} onNextLevel={onNextLevel} onLogout={onLogout} />}
  </GameErrorBoundary>;
}

export default function App() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medio');

  const handleLoginSuccess = (loggedUser, authToken) => {
    setUser(loggedUser);
    setToken(authToken);
    setView(loggedUser.role === 'docente' ? 'teacher' : 'student');
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    setSelectedGame('');
    setView('login');
  };

  const startGame = (game, level, difficulty) => {
    setSelectedGame(game);
    setSelectedLevel(level);
    if (difficulty) setSelectedDifficulty(difficulty);
    setView('game');
  };

  const backToGames = () => {
    setSelectedGame('');
    setView('student');
  };

  return (
    <ThemeProvider>
      <div className="app-shell">
        {view === 'login' && <Login onLoginSuccess={handleLoginSuccess} switchToRegister={() => setView('register')} />}
        {view === 'register' && <Register switchToLogin={() => setView('login')} />}
        {view === 'student' && user && <StudentHome user={user} token={token} onLogout={handleLogout} onPlay={startGame} />}
        {view === 'game' && user && <ActiveGameSession user={user} token={token} game={selectedGame} level={selectedLevel} fallbackDifficulty={selectedDifficulty} onBack={backToGames} onNextLevel={startGame} onLogout={handleLogout} />}
        {view === 'teacher' && user && <TeacherDashboard user={user} token={token} onLogout={handleLogout} />}
      </div>
    </ThemeProvider>
  );
}
