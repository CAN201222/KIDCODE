import { useEffect, useState } from 'react';
import {
  BookOpen,
  Bot,
  Bug,
  Cable,
  ChartNoAxesColumn,
  Clock3,
  Compass,
  Gamepad2,
  LockKeyhole,
  LogOut,
  Menu,
  MessageSquare,
  Network,
  Package,
  Pause,
  ShoppingBag,
  Star,
  Trophy,
  Zap,
  ChevronRight,
  Sprout,
  Brain,
  Crown,
} from 'lucide-react';
import { getStudentProgress, getStudentProfile, getStudentSettings } from '../services/api';
import { AnimalAvatar, AvatarStore, LearningAcademy, StudentProfileModal, StudentReviews } from './StudentFeatures';
import ThemeToggle from './ThemeToggle';
import './Game/GameExperience.css';

const games = [
  { id: 'logic-game', title: 'Algoritmos del explorador', icon: Bot, skill: 'Algoritmos y secuencias', cover: 'blue', time: '7 misiones', description: 'Programa a Kiko para encontrar tesoros sin chocar con rocas.', howToPlay: 'Ordena bloques de movimiento, gira para cambiar de dirección y ejecuta la ruta. Cada roca bloquea el paso; recoge diamantes para ganar puntos extra.', helpsWith: 'Secuencias, orientación espacial, planificación de algoritmos y eficiencia del código.' },
  { id: 'sequence-game', title: 'Red de servidores', icon: Network, skill: 'Rutas, redes y tolerancia a fallos', cover: 'purple', time: '7 misiones', description: 'Enruta paquetes entre servidores evitando nodos caídos.', howToPlay: 'Diseña una ruta con movimientos norte, sur, este y oeste. Evita servidores caídos y nodos inestables, respeta el límite de movimientos y recoge paquetes extra.', helpsWith: 'Coordenadas, búsqueda de rutas, redes, tolerancia a fallos y toma de decisiones bajo presión.' },
  { id: 'patch-cable', title: 'Patch Cable', icon: Cable, skill: 'Arquitectura cliente-servidor', cover: 'blue', time: '7 circuitos', description: 'Gira conectores para llevar una petición hasta la base de datos.', howToPlay: 'Toca las piezas del circuito para rotarlas. Cuando cada conexión apunte al siguiente nodo, inicia el flujo y evita los cortafuegos.', helpsWith: 'Puertos, protocolos, conectividad y lectura de topologías de red.' },
  { id: 'stack-balancer', title: 'Stack Balancer', icon: Package, skill: 'Pilas, colas y memoria', cover: 'purple', time: '7 despachos', description: 'Clasifica paquetes para que el robot los entregue en el orden esperado.', howToPlay: 'Arrastra cada paquete a una pila (LIFO) o una cola (FIFO), o selecciónalo y toca un contenedor. Simula el despacho antes de que se agote el tiempo.', helpsWith: 'Estructuras de datos, orden de procesamiento y límites de memoria.' },
  { id: 'bug-game', title: 'Clínica de código', icon: Bug, skill: 'Lectura y depuración', cover: 'green', time: '7 misiones', graduation: true, description: 'Investiga errores reales y repara programas línea por línea.', howToPlay: 'Inspecciona variables y líneas, avanza paso a paso, compara hipótesis y ejecuta la prueba para comprobar tu diagnóstico.', helpsWith: 'Lectura de código, depuración, razonamiento causal y buenas prácticas de software.' },
];

const progressKey = (game, level) => `${game}:${level}`;
const levelNames = ['Primeros pasos', 'Primer giro', 'Más patrones', 'Reglas nuevas', 'Reto avanzado', 'Modo experto', 'Misión final'];
const availableLevels = 7;
const introGameIds = ['logic-game', 'sequence-game', 'patch-cable', 'stack-balancer'];
const titleRanks = [
  { title: 'Explorador Novato', icon: <Sprout aria-hidden="true" />, threshold: 0, reward: 0 },
  { title: 'Operador de Redes', icon: <Network aria-hidden="true" />, threshold: 4, reward: 50 },
  { title: 'Arquitecto Lógico', icon: <Brain aria-hidden="true" />, threshold: 14, reward: 100 },
  { title: 'Cazador de Bugs', icon: <Bug aria-hidden="true" />, threshold: 21, reward: 200 },
  { title: 'Maestro del Código', icon: <Crown aria-hidden="true" />, threshold: 35, reward: 500 },
];

function getRank(progress) {
  const completedEntries = Object.entries(progress).filter(([, item]) => item.completed);
  const completedIntro = completedEntries.filter(([key]) => introGameIds.includes(key.split(':')[0])).length;
  const rankIndex = titleRanks.reduce((current, rank, index) => {
    const progressCount = index === titleRanks.length - 1 ? completedEntries.length : completedIntro;
    return progressCount >= rank.threshold ? index : current;
  }, 0);
  return { rank: titleRanks[rankIndex], rankIndex, completedIntro, completedTotal: completedEntries.length };
}

function SideNav({ section, setSection, onLogout, open, name, profile, closeMenu }) {
  const menu = [
    ['games', Gamepad2, 'Mis juegos'],
    ['progress', ChartNoAxesColumn, 'Mi progreso'],
    ['academy', BookOpen, 'Aprende Código'],
    ['feedback', MessageSquare, 'Opiniones'],
    ['avatar', ShoppingBag, 'Avatar y tienda'],
  ];
  return <aside id="student-sidebar" className={`sidebar ${open ? 'mobile-open' : ''}`}><div className="brand"><span className="brand-mark">{'</>'}</span> KidCode <span className="brand-location">Neiva</span></div>
    <div><div className="nav-label">Mi espacio</div><nav className="nav-list">{menu.map(([key, Icon, label]) => <button key={key} className={`nav-item ${section === key ? 'active' : ''}`} onClick={() => { setSection(key); closeMenu(); }}><span className="nav-icon"><Icon aria-hidden="true" /></span>{label}</button>)}</nav></div>
    <div className="sidebar-bottom"><div className="profile-mini"><div className="avatar animal-sidebar-avatar"><AnimalAvatar pet={profile.pet} equippedItems={profile.equippedItems} catalog={profile.catalog} /></div><div><strong>{profile.nickname || name || 'Estudiante'}</strong><span>Explorador KidCode</span></div></div><button className="nav-item" onClick={() => { closeMenu(); onLogout(); }}><span className="nav-icon"><LogOut aria-hidden="true" /></span>Cerrar sesión</button></div></aside>;
}

export default function StudentHome({ user, token, onLogout, onPlay }) {
  const [section, setSection] = useState('games');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [progress, setProgress] = useState({});
  const [progressError, setProgressError] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [titleCelebration, setTitleCelebration] = useState(null);
  const [settings, setSettings] = useState({ difficulty: 'medio', games: {} });
  const [profile, setProfile] = useState({ pet: 'fox', nickname: '', points: 0, ownedItems: [], equippedItems: {}, catalog: [], pets: [], completedLevels: 0, activeDays: 0 });
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    getStudentProgress(token).then((data) => {
      if (Array.isArray(data.progress)) {
        const next = {};
        data.progress.forEach((item) => {
          const key = progressKey(item.game_name, item.level || 1);
          next[key] = { ...item, completed: item.completed !== 0 && item.completed !== false };
        });
        setProgress(next);
        const { rank, rankIndex } = getRank(next);
        try {
          const storageKey = `kidcode-title-rank:${user.id}`;
          const previousRank = window.localStorage.getItem(storageKey);
          if (previousRank === null) {
            window.localStorage.setItem(storageKey, String(rankIndex));
          } else {
            const previousIndex = Number(previousRank);
            if (Number.isInteger(previousIndex) && rankIndex > previousIndex) {
              setTitleCelebration({ rank, rankIndex });
            }
            window.localStorage.setItem(storageKey, String(Math.max(Number.isInteger(previousIndex) ? previousIndex : 0, rankIndex)));
          }
        } catch (error) {
          console.warn('No se pudo guardar el último rango mostrado:', error);
        }
      } else if (data.error) {
        setProgressError(data.error);
      }
    }).catch(() => setProgressError('No pudimos cargar tu progreso. Verifica tu conexión e inténtalo de nuevo.'));
  }, [token, user.id]);

  useEffect(() => {
    let active = true;
    getStudentProfile(token).then((data) => {
      if (!active) return;
      if (data.error) throw new Error(data.error);
      setProfile({ ...data, token });
    }).catch((error) => {
      console.error('No se pudo cargar el perfil y los puntos del estudiante:', error);
      if (active) setProgressError(error.message || 'No pudimos cargar tu avatar y tus puntos.');
    });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const loadSettings = () => {
      getStudentSettings(token).then((data) => {
        if (!active) return;
        if (data.error) {
          setProgressError(data.error);
          return;
        }
        setSettings({
          difficulty: ['facil', 'medio', 'dificil'].includes(data.difficulty) ? data.difficulty : 'medio',
          games: data.games || {},
        });
      }).catch(() => {
        if (active) setProgressError('No pudimos cargar la configuración de tu aula.');
      });
    };
    loadSettings();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadSettings();
    }, 5000);
    return () => { active = false; window.clearInterval(interval); };
  }, [token]);

  useEffect(() => {
    if (!selectedGame) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelectedGame(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedGame]);

  const completed = Object.values(progress).filter((item) => item.completed).length;
  const completedScores = Object.values(progress).filter((item) => item.completed).map((item) => Number(item.score) || 0);
  const { rank, rankIndex, completedIntro } = getRank(progress);
  const nextRank = titleRanks[rankIndex + 1];
  const rankRequirement = nextRank?.threshold ?? 35;
  const rankProgress = rankIndex === titleRanks.length - 1
    ? 100
    : Math.min(100, (rankIndex === 3 ? completed : completedIntro) / rankRequirement * 100);
  const points = Number(profile.points) || 0;
  const clinicUnlocked = rankIndex >= 3;
  const hasCompleted = (gameId, level) => Boolean(progress[progressKey(gameId, level)]?.completed);
  const getUnlockedLevel = (gameId) => {
    let level = 1;
    while (level < availableLevels && hasCompleted(gameId, level)) level += 1;
    return level;
  };
  const levelRows = games.flatMap((game) => Array.from({ length: availableLevels }, (_, index) => ({ game, level: index + 1 })));
  const SelectedGameIcon = selectedGame?.icon;

  const openGameDetails = (game) => {
    setSelectedGame(game);
    setSelectedLevel(getUnlockedLevel(game.id));
  };

  return <div className="app-layout"><SideNav section={section} setSection={setSection} onLogout={onLogout} open={mobileOpen} name={user.name} profile={profile} closeMenu={() => setMobileOpen(false)} />{mobileOpen && <button className="sidebar-backdrop" type="button" aria-label="Cerrar menú de navegación" onClick={() => setMobileOpen(false)} />}
    <section className="content-area"><header className="topbar"><button className="mobile-menu" aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileOpen} aria-controls="student-sidebar" onClick={() => setMobileOpen(!mobileOpen)}><Menu aria-hidden="true" /></button><div className="topbar-path">KidCode <span className="breadcrumb-separator">/</span> Estudiante</div><div className="topbar-actions"><span className="student-rank-pill">{rank.icon} {rank.title}</span><span className="student-points"><Star aria-hidden="true" /> {Math.round(points)} pts</span><ThemeToggle /><button type="button" className="student-avatar-button" aria-label="Abrir mi perfil" onClick={() => setProfileOpen(true)}><AnimalAvatar pet={profile.pet} equippedItems={profile.equippedItems} catalog={profile.catalog} /></button></div></header>
      <main className="main-content">{section === 'games' ? <>
        <div className="student-hero"><div><div className="eyebrow">TU PRÓXIMA MISIÓN TE ESPERA</div><h1>Hola, {user.name?.split(' ')[0]}</h1><p>Aprende programación creando, probando y mejorando tus programas.</p></div><div className="hero-mascot"><AnimalAvatar pet={profile.pet} equippedItems={profile.equippedItems} catalog={profile.catalog} /></div></div>
        {progressError && <div className="alert error" role="alert">{progressError}</div>}
        <div className="student-rank-banner"><span className="student-rank-emblem">{rank.icon}</span><div><strong>{rank.title}</strong><span>{nextRank ? `Siguiente rango: ${nextRank.title} · ${rankIndex === 3 ? completed : completedIntro}/${rankRequirement} niveles` : `${completed}/35 niveles completados`} · {Math.round(points)} XP</span></div><div className="rank-track"><i style={{ width: `${rankProgress}%` }} /></div></div>
        <section className="rank-requirements panel" aria-label="Rangos y requisitos">
          <div className="panel-head"><div><h2>Rangos y progresión</h2><span className="stat-note">Cada reto completado te acerca a nuevos desafíos.</span></div><span className="badge">Dificultad del aula: {settings.difficulty === 'facil' ? 'Fácil' : settings.difficulty === 'dificil' ? 'Difícil' : 'Media'}</span></div>
          <div className="rank-requirement-list">{titleRanks.map((item, index) => {
            const reached = index <= rankIndex;
            const requirementText = index === 0 ? 'Rango inicial' : index === 4 ? 'Completa los 35 niveles' : `Completa ${item.threshold} niveles introductorios`;
            return <div key={item.title} className={`rank-requirement ${reached ? 'reached' : ''}`} aria-current={index === rankIndex ? 'step' : undefined}>
              <span>{reached ? item.icon : <LockKeyhole aria-hidden="true" />}</span><div><strong>{item.title}</strong><small>{requirementText}{item.title === 'Cazador de Bugs' ? ' · desbloquea Clínica de código' : ''}</small></div>
            </div>;
          })}</div>
        </section>
        <div className="stats-grid"><div className="stat-card"><div className="stat-top">Niveles completados <span className="stat-icon"><Trophy aria-hidden="true" /></span></div><div className="stat-value">{completed}</div><div className="stat-note">de {availableLevels * games.length} niveles disponibles</div></div><div className="stat-card"><div className="stat-top">Efectividad media <span className="stat-icon"><Zap aria-hidden="true" /></span></div><div className="stat-value">{completedScores.length ? `${(completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length).toFixed(1)}%` : '—'}</div><div className="stat-note">Resultado de niveles completados</div></div><div className="stat-card"><div className="stat-top">Puntos para personalizar <span className="stat-icon"><Star aria-hidden="true" /></span></div><div className="stat-value">{points}</div><div className="stat-note">Ganados al superar niveles</div></div><div className="stat-card"><div className="stat-top">Progreso total <span className="stat-icon"><Compass aria-hidden="true" /></span></div><div className="stat-value">{Math.round(completed / (availableLevels * games.length) * 100)}%</div><div className="stat-note">Completa las {availableLevels * games.length} misiones</div></div></div>
        <h2 className="section-title">Elige tu próxima misión</h2><div className="games-grid">{games.map((game) => {
          const GameIcon = game.icon;
          const done = Array.from({ length: availableLevels }, (_, index) => index + 1).filter((level) => hasCompleted(game.id, level)).length;
          const locked = game.graduation && !clinicUnlocked;
          const unavailable = settings.games[game.id] === false;
          return <article key={game.id} className={`game-card ${locked || unavailable ? 'game-card-locked' : ''}`}><button className="game-card-trigger" onClick={() => openGameDetails(game)} aria-label={`Ver detalles de ${game.title}${locked ? ', bloqueado' : unavailable ? ', no disponible' : ''}`}>
            <div className={`game-cover ${game.cover}`}><span className="game-cover-icon"><GameIcon aria-hidden="true" /></span><span className="game-level">{unavailable ? <><Pause aria-hidden="true" /> No disponible</> : locked ? <><LockKeyhole aria-hidden="true" /> Bloqueado</> : `${done}/7 niveles`}</span></div><div className="game-details"><h3>{game.title}{locked && <span className="locked-title"> · Graduación</span>}</h3><p>{unavailable ? 'El docente desactivó este juego para la sesión.' : locked ? 'Desbloquea este desafío al alcanzar el rango Cazador de Bugs.' : game.description}</p><div className="game-meta"><span>{game.skill}</span><span><Clock3 aria-hidden="true" /> {game.time}</span></div><span className="game-card-cta">{unavailable ? 'Sesión no disponible' : locked ? 'Ver requisito de rango' : 'Ver misión y niveles'} <b><ChevronRight aria-hidden="true" /></b></span></div>
          </button></article>;
        })}</div>
      </> : section === 'progress' ? <><div className="page-heading"><div><div className="eyebrow">MI ESPACIO</div><h1>Mi progreso</h1><p>Tu recorrido por los juegos y niveles de programación.</p></div></div><div className="stats-grid"><div className="stat-card"><div className="stat-top">Niveles completados</div><div className="stat-value">{completed}/{availableLevels * games.length}</div></div><div className="stat-card"><div className="stat-top">Efectividad media</div><div className="stat-value">{completedScores.length ? `${(completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length).toFixed(1)}%` : '—'}</div></div><div className="stat-card"><div className="stat-top">Rango actual</div><div className="stat-value">{rank.icon} {rank.title}</div></div><div className="stat-card"><div className="stat-top">Puntos disponibles</div><div className="stat-value"><Star aria-hidden="true" /> {points}</div></div></div>{progressError && <div className="alert error" role="alert">{progressError}</div>}<div className="panel"><div className="panel-head"><h2>Progreso por juego y nivel</h2><span className="badge">{completed} completados</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Juego</th><th>Habilidad</th><th>Nivel</th><th>Efectividad</th><th>Errores</th><th>Tiempo total</th><th>Intentos</th><th>Estado</th></tr></thead><tbody>{levelRows.map(({ game, level }) => { const GameIcon = game.icon; const record = progress[progressKey(game.id, level)]; return <tr key={progressKey(game.id, level)}><td><GameIcon aria-hidden="true" /> {game.title}</td><td>{game.skill}</td><td>{level}</td><td>{record ? `${Number(record.score).toFixed(1)}%` : '—'}</td><td>{record?.mistakes ?? '—'}</td><td>{record ? `${Math.floor(record.duration_seconds / 60)}:${String(record.duration_seconds % 60).padStart(2, '0')}` : '—'}</td><td>{record?.attempts ?? '—'}</td><td><span className="badge">{record?.completed ? 'Completado' : record ? 'Intento sin completar' : 'Pendiente'}</span></td></tr>; })}</tbody></table></div></div></> : section === 'academy' ? <LearningAcademy token={token} user={user} profile={profile} /> : section === 'feedback' ? <StudentReviews token={token} /> : <AvatarStore token={token} profile={profile} onProfileChange={setProfile} />}</main></section>
    {selectedGame && <div className="game-details-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedGame(null); }}><section className="game-details-modal" role="dialog" aria-modal="true" aria-labelledby="game-details-title">
      <button className="game-modal-close" aria-label="Cerrar detalles" onClick={() => setSelectedGame(null)}>×</button>
      <div className={`game-modal-banner ${selectedGame.cover}`}><span className="game-modal-icon"><SelectedGameIcon aria-hidden="true" /></span><div><span className="game-modal-kicker">KIDCODE ORIGINAL · 7 NIVELES</span><h2 id="game-details-title">{selectedGame.title}</h2><span>{selectedGame.skill}</span></div></div>
      <div className="game-modal-content"><div className="game-modal-description"><div><h3>🎮 ¿Cómo se juega?</h3><p>{selectedGame.howToPlay}</p></div><div><h3>🧠 ¿En qué te ayuda?</h3><p>{selectedGame.helpsWith}</p></div></div>
        {selectedGame.graduation && !clinicUnlocked && <div className="graduation-lock-message" role="status"><span>🔒</span><div><strong>Desafío de graduación bloqueado</strong><small>Alcanza Cazador de Bugs: completa 21 niveles introductorios. Llevas {completedIntro}/21.</small></div></div>}
        {settings.games[selectedGame.id] === false && <div className="graduation-lock-message" role="status"><span>⏸️</span><div><strong>No disponible para esta sesión</strong><small>Tu docente pausó este juego. Podrás retomarlo cuando vuelva a activarlo.</small></div></div>}
        <div className="modal-level-heading"><h3>Elige tu nivel</h3><span>{selectedGame.graduation ? 'Requiere el rango Cazador de Bugs' : 'Completa un nivel para desbloquear el siguiente'}</span></div>
        <div className="modal-level-grid">{Array.from({ length: availableLevels }, (_, index) => {
          const level = index + 1;
          const complete = hasCompleted(selectedGame.id, level);
          const locked = settings.games[selectedGame.id] === false || (selectedGame.graduation && !clinicUnlocked) || level > getUnlockedLevel(selectedGame.id);
          const record = progress[progressKey(selectedGame.id, level)];
          return <button key={level} className={`modal-level-choice ${selectedLevel === level ? 'selected' : ''} ${complete ? 'complete' : ''}`} disabled={locked} onClick={() => setSelectedLevel(level)}><span className="modal-level-number">{complete ? '✓' : locked ? '🔒' : level}</span><span><strong>Nivel {level}</strong><small>{complete ? `${record?.score ?? 0} pts · completado` : record ? `${levelNames[index]} · ${record.score} pts` : levelNames[index]}</small></span></button>;
        })}</div>
        <button className="primary-btn game-play-button" disabled={settings.games[selectedGame.id] === false || (selectedGame.graduation && !clinicUnlocked)} onClick={() => { const gameId = selectedGame.id; setSelectedGame(null); onPlay(gameId, selectedLevel, settings.difficulty); }}>{settings.games[selectedGame.id] === false ? '⏸ Juego pausado por tu docente' : selectedGame.graduation && !clinicUnlocked ? '🔒 Desbloquea Cazador de Bugs para jugar' : `▶ Jugar nivel ${selectedLevel}`}</button>
      </div>
    </section></div>}
    {profileOpen && <StudentProfileModal user={user} token={token} profile={profile} rank={rank} nextRank={nextRank} progressValue={{ current: rankIndex === 3 ? completed : completedIntro, required: rankRequirement, percent: rankProgress }} onClose={() => setProfileOpen(false)} onSaved={(updatedProfile) => { setProfile(updatedProfile); setProfileOpen(false); }} />}
    {titleCelebration && <div className="title-celebration-overlay" role="dialog" aria-modal="true" aria-labelledby="title-celebration-heading"><div className="title-celebration-card"><div className="celebration-sparkles">✦ ✧ ✦</div><div className="title-celebration-emblem">{titleCelebration.rank.icon}</div><span className="eyebrow">NUEVO RANGO DESBLOQUEADO</span><h2 id="title-celebration-heading">{titleCelebration.rank.title}</h2><p>¡Tu constancia y tus soluciones te trajeron hasta aquí!</p>{titleCelebration.rankIndex >= 3 && <div className="graduation-unlocked">🛠️ Clínica de código desbloqueada</div>}<button className="primary-btn" onClick={() => setTitleCelebration(null)}>¡Seguir explorando!</button></div></div>}
  </div>;
}
