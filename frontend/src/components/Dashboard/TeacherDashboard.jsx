import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Bot,
  Bug,
  Cable,
  Gamepad2,
  Activity,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  Network,
  Package,
  RefreshCw,
  Users,
  Trophy,
} from 'lucide-react';
import {
  getTeacherControls,
  getTeacherProgress,
  setGameAvailability,
  setStudentDifficulty,
} from '../../services/api';
import TeacherEducation from './TeacherEducation';
import ThemeToggle from '../ThemeToggle';
import './TeacherDashboard.css';

const menu = [
  ['overview', LayoutDashboard, 'Resumen'],
  ['students', Users, 'Estudiantes'],
  ['games', Gamepad2, 'Actividad de juegos'],
  ['academy', BookOpen, 'Aprende Código'],
  ['feedback', MessageSquare, 'Opiniones'],
];
const gameNames = { 'logic-game':'Algoritmos del explorador', 'sequence-game':'Red de servidores', 'patch-cable':'Patch Cable', 'stack-balancer':'Stack Balancer', 'bug-game':'Clínica de código' };
const games = Object.entries(gameNames);
const dashboardGames = [
  [Bot, gameNames['logic-game'], 'Secuencias e instrucciones', 'logic-game'],
  [Network, gameNames['sequence-game'], 'Rutas y tolerancia a fallos', 'sequence-game'],
  [Cable, gameNames['patch-cable'], 'Conexiones y protocolos', 'patch-cable'],
  [Package, gameNames['stack-balancer'], 'Pilas, colas y memoria', 'stack-balancer'],
  [Bug, gameNames['bug-game'], 'Graduación · requiere Cazador de Bugs', 'bug-game'],
];
const difficultyLabels = { facil: 'Fácil', medio: 'Media', dificil: 'Difícil' };
const mistakeLabels = { collision: 'Colisiones', wrong_route: 'Ruta incorrecta', wrong_pipeline: 'Secuencia inválida', wrong_fix: 'Corrección fallida', network_outage: 'Nodo caído o inestable', timeout: 'Tiempo agotado' };

function TeacherNav({ section, setSection, onLogout, open, name, closeMenu }) {
  return <aside id="teacher-sidebar" className={`sidebar ${open ? 'mobile-open' : ''}`}><div className="brand"><span className="brand-mark">{'</>'}</span> KidCode <span className="brand-location">Neiva</span></div><div><div className="nav-label">Aula</div><nav className="nav-list">{menu.map(([key,Icon,label])=><button key={key} className={`nav-item ${section===key?'active':''}`} onClick={()=>{setSection(key);closeMenu();}}><span className="nav-icon"><Icon aria-hidden="true" /></span>{label}</button>)}</nav></div><div className="sidebar-bottom"><div className="profile-mini"><div className="avatar">{name?.charAt(0)?.toUpperCase() || 'D'}</div><div><strong>{name || 'Docente'}</strong><span>Panel de seguimiento</span></div></div><button className="nav-item" onClick={()=>{closeMenu();onLogout();}}><span className="nav-icon"><LogOut aria-hidden="true" /></span>Cerrar sesión</button></div></aside>;
}

function attemptTime(seconds = 0) {
  return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}

function AttemptDetails({ progress, all = false }) {
  if (!progress?.length) return <span className="muted">Sin intentos</span>;
  const records = all ? progress : progress.slice(0,1);
  return <div className="attempt-list">{records.map((item) => <div className={`attempt-chip ${item.completed ? 'attempt-success' : 'attempt-failed'}`} key={`${item.game_name}-${item.level}`}>
    <strong>{gameNames[item.game_name] || item.game_name} · N{item.level}</strong>
    <span>{Number(item.score).toFixed(1)}% de efectividad · {item.attempts || 1} intentos · {attemptTime(item.duration_seconds)} · {item.completed ? 'Completado' : 'Sin completar'}</span>
    <small>{item.mistakes || 0} errores acumulados{item.multiplier > 1 ? ` · bonificador x${item.multiplier}` : ''}</small>
    {item.mistake_types && Object.keys(item.mistake_types).length > 0 && <small>{Object.entries(item.mistake_types).map(([type, count]) => `${mistakeLabels[type] || type}: ${count}`).join(' · ')}</small>}
    {all && Number(item.best_score) > Number(item.score) && <small>Mejor efectividad: {Number(item.best_score).toFixed(1)}%</small>}
  </div>)}</div>;
}

function CommonMistakes({ mistakes = {} }) {
  const entries = Object.entries(mistakes).filter(([, count]) => count > 0).sort((left, right) => right[1] - left[1]).slice(0, 3);
  return entries.length ? <span className="common-mistakes">{entries.map(([type, count]) => `${mistakeLabels[type] || type} ${count}`).join(' · ')}</span> : <span className="muted">Sin errores</span>;
}

export default function TeacherDashboard({ user, token, onLogout }) {
  const [students,setStudents]=useState([]); const [summary,setSummary]=useState({totalStudents:0,averageScore:0});
  const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [section,setSection]=useState('overview');
  const [query,setQuery]=useState(''); const [gameFilter,setGameFilter]=useState('all'); const [mobileOpen,setMobileOpen]=useState(false);
  const [classroom,setClassroom]=useState({ games: {}, students: [] });
  const [savingControl,setSavingControl]=useState('');
  const requestId = useRef(0);
  const loadProgress = useCallback(async ({ silent = false } = {}) => {
    const currentRequest = ++requestId.current;
    if (!silent) setLoading(true);
    setError('');
    try {
      const data=await getTeacherProgress(token);
      if (currentRequest !== requestId.current) return;
      if(data?.students){setStudents(data.students);setSummary({totalStudents:data.totalStudents||0,averageScore:Number(data.averageScore)||0});}
      else setError(data?.error||'No fue posible cargar los reportes.');
    } catch { if (currentRequest === requestId.current) setError('No se pudieron cargar los reportes de progreso. Verifica que el servidor esté activo.'); }
    finally { if (currentRequest === requestId.current && !silent) setLoading(false); }
  },[token]);
  const loadClassroom = useCallback(async () => {
    const data = await getTeacherControls(token);
    if (data.error) throw new Error(data.error);
    setClassroom({
      games: data.games || {},
      students: data.students || [],
    });
  },[token]);
  const changeGameAvailability = async (gameName, enabled) => {
    const key = `game:${gameName}`;
    setSavingControl(key);
    try {
      const response = await setGameAvailability(token, gameName, enabled);
      if (response.error) throw new Error(response.error);
      setClassroom((current) => ({ ...current, games: { ...current.games, [gameName]: enabled } }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cambiar la disponibilidad del juego.');
    } finally {
      setSavingControl('');
    }
  };
  const changeStudentDifficulty = async (studentId, difficulty) => {
    const key = `student:${studentId}`;
    setSavingControl(key);
    try {
      const response = await setStudentDifficulty(token, studentId, difficulty);
      if (response.error) throw new Error(response.error);
      setClassroom((current) => ({
        ...current,
        students: current.students.map((student) => student.id === studentId ? { ...student, difficulty } : student),
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo actualizar la dificultad.');
    } finally {
      setSavingControl('');
    }
  };
  useEffect(()=>{
    const initialRequest=window.setTimeout(()=>{
      loadProgress();
      loadClassroom().catch((loadError) => setError(loadError.message || 'No se pudieron cargar los controles del aula.'));
    },0);
    const interval=window.setInterval(()=>{
      if(document.visibilityState==='visible') {
        loadProgress({silent:true});
        loadClassroom().catch((loadError) => setError(loadError.message || 'No se pudieron actualizar los controles del aula.'));
      }
    },5000);
    const refreshOnFocus=()=>{
      loadProgress({silent:true});
      loadClassroom().catch((loadError) => setError(loadError.message || 'No se pudieron actualizar los controles del aula.'));
    };
    window.addEventListener('focus',refreshOnFocus);
    return()=>{window.clearTimeout(initialRequest);window.clearInterval(interval);window.removeEventListener('focus',refreshOnFocus);};
  },[loadProgress,loadClassroom]);
  const completed=students.reduce((sum,student)=>sum+(Number(student.levelsCompleted)||0),0);
  const filtered=useMemo(()=>students.filter((student)=>
    (`${student.name} ${student.email}`.toLowerCase().includes(query.toLowerCase())) &&
    (gameFilter==='all'||student.progress?.some((item)=>item.game_name===gameFilter))
  ),[students,query,gameFilter]);
  const chart=Array.from({length:7},(_,index)=>index+1).map((level)=>({label:`Nivel ${level}`,value:students.reduce((sum,student)=>sum+(student.progress||[]).filter((item)=>Number(item.level)===level&&item.completed).length,0)}));
  const pageTitle={overview:'Resumen del aula',students:'Mis estudiantes',games:'Actividad de juegos',academy:'Aprende Código',feedback:'Opiniones de estudiantes'}[section];
  const studentSettings = new Map(classroom.students.map((student) => [student.id, student]));
  const getLearningAlert = (student) => {
    const failingLevel = student.progress?.find((item) => Number(item.consecutive_failures) >= 3);
    if (failingLevel) return `Dificultades en ${gameNames[failingLevel.game_name] || failingLevel.game_name}, nivel ${failingLevel.level} (${failingLevel.consecutive_failures} fallos seguidos).`;
    if (Number(student.levelsCompleted) > 0 && Number(student.averageScore) < 50) return 'Efectividad media menor a 50%.';
    return '';
  };

  return <div className="app-layout teacher-dashboard"><TeacherNav section={section} setSection={setSection} onLogout={onLogout} open={mobileOpen} name={user.name} closeMenu={()=>setMobileOpen(false)}/>{mobileOpen && <button className="sidebar-backdrop" type="button" aria-label="Cerrar menú de navegación" onClick={() => setMobileOpen(false)} />}<section className="content-area">
    <header className="topbar"><button className="mobile-menu" aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileOpen} aria-controls="teacher-sidebar" onClick={()=>setMobileOpen(!mobileOpen)}><MenuIcon aria-hidden="true" /></button><div className="topbar-path">KidCode <span className="breadcrumb-separator">/</span> Panel docente</div><div className="topbar-actions"><span className="teacher-greeting">Docente: {user.name?.split(' ')[0]}</span><ThemeToggle /><div className="avatar">{user.name?.charAt(0)?.toUpperCase()}</div></div></header>
    <main className="main-content">{['academy','feedback'].includes(section) ? <TeacherEducation token={token} section={section} /> : <><div className="page-heading"><div><div className="eyebrow">CENTRO DE APRENDIZAJE · NEIVA</div><h1>{pageTitle}</h1><p>Consulta los puntajes recientes, errores y tiempos de cada intento.</p></div><button className="secondary-btn" disabled={loading} onClick={loadProgress}><RefreshCw aria-hidden="true" /> Actualizar datos</button></div>
      {error&&<div className="alert error" role="alert">{error}</div>}
      <div className="stats-grid"><div className="stat-card"><div className="stat-top">Estudiantes registrados <span className="stat-icon"><Users aria-hidden="true" /></span></div><div className="stat-value">{loading?'…':summary.totalStudents}</div><div className="stat-note">Perfiles de estudiante</div></div><div className="stat-card"><div className="stat-top">Efectividad media del curso <span className="stat-icon"><Activity aria-hidden="true" /></span></div><div className="stat-value">{loading?'…':`${Number(summary.averageScore).toFixed(1)}%`}</div><div className="stat-note">Incluye errores, tiempo y eficiencia</div></div><div className="stat-card"><div className="stat-top">Niveles completados <span className="stat-icon"><Trophy aria-hidden="true" /></span></div><div className="stat-value">{loading?'…':completed}</div><div className="stat-note">De 35 niveles disponibles por estudiante</div></div><div className="stat-card"><div className="stat-top">Juegos de programación <span className="stat-icon"><Gamepad2 aria-hidden="true" /></span></div><div className="stat-value">5</div><div className="stat-note">7 niveles progresivos en cada juego</div></div></div>
      {section==='overview'&&<div className="desktop-grid"><div className="panel"><div className="panel-head"><div><h2>Avance por nivel</h2><span className="stat-note">Niveles aprobados en todo el grupo</span></div><span className="badge">35 niveles disponibles por estudiante</span></div><div className="chart-bars">{chart.map((item)=>{const max=Math.max(...chart.map((point)=>point.value),1);const height=Math.max(item.value/max*100,item.value?9:3);return <div key={item.label} className="chart-column"><small>{item.value}</small><div className="chart-bar" style={{height:`${height}%`}}/><span>{item.label}</span></div>;})}</div></div><div className="panel"><div className="panel-head"><h2>Juegos de programación</h2></div><div className="alert-list">{dashboardGames.map(([Icon,title,subtitle,id])=><div className="alert-item" key={title}><span className="dashboard-game-icon"><Icon aria-hidden="true" /></span><div className="dashboard-game-copy"><strong>{title}</strong><span>{subtitle} · 7 niveles</span></div><span className="badge">{classroom.games[id] === false ? 'Inactivo' : 'Activo'}</span></div>)}</div></div></div>}
      {section==='games'&&<div className="panel game-controls-panel"><div className="panel-head"><div><h2>Disponibilidad de juegos</h2><span className="stat-note">Al desactivarlo, el juego se pausa para todo el grupo.</span></div></div><div className="game-toggle-grid">{games.map(([gameId,title])=><label className="game-toggle-card" key={gameId}><span><strong>{title}</strong><small>7 niveles · visible para estudiantes</small></span><input type="checkbox" role="switch" checked={classroom.games[gameId] !== false} disabled={savingControl === `game:${gameId}`} onChange={(event)=>changeGameAvailability(gameId,event.target.checked)} aria-label={`${classroom.games[gameId] === false ? 'Activar' : 'Desactivar'} ${title}`}/><b>{classroom.games[gameId] === false ? 'Inactivo' : 'Activo'}</b></label>)}</div></div>}
      <div className="panel"><div className="panel-head"><div><h2>{section==='games'?'Historial de intentos por nivel':'Seguimiento reciente de estudiantes'}</h2><span className="stat-note">{section==='games'?'Consulta también el mejor puntaje histórico de cada nivel.':'El intento reciente muestra los errores y el puntaje con penalizaciones.'}</span></div><span className="badge">{filtered.length} estudiantes</span></div>
        <div className="filters-row"><input aria-label="Buscar estudiantes" placeholder="Buscar estudiante o correo…" value={query} onChange={(event)=>setQuery(event.target.value)}/><select aria-label="Filtrar por juego" value={gameFilter} onChange={(event)=>setGameFilter(event.target.value)}><option value="all">Todos los juegos</option><option value="logic-game">Algoritmos del explorador</option><option value="sequence-game">Red de servidores</option><option value="patch-cable">Patch Cable</option><option value="stack-balancer">Stack Balancer</option><option value="bug-game">Clínica de código</option></select></div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Estudiante</th><th>Niveles y avance</th><th>Efectividad media</th><th>Errores comunes</th><th>Mejor efectividad</th><th>Última actividad</th><th>Intento reciente</th><th>Gestión adaptativa</th>{section==='games'&&<th>Detalle por nivel</th>}</tr></thead><tbody>
          {loading?<tr><td colSpan={section==='games'?9:8} className="empty-state">Cargando avances del grupo…</td></tr>:filtered.length===0?<tr><td colSpan={section==='games'?9:8} className="empty-state"><span>🔎</span>{students.length?'No hay resultados con estos filtros.':'Aún no hay estudiantes registrados.'}</td></tr>:filtered.map((student)=><tr key={student.id}>
            <td><div className="student-table-person"><div className="avatar student-table-avatar">{student.name?.charAt(0)?.toUpperCase()}</div><div><strong>{student.name}</strong><div className="student-table-email">{student.email}</div></div></div></td>
            <td>{student.levelsCompleted||0}/35 <span className="stat-note">· {Math.round((Number(student.levelsCompleted)||0)/35*100)}%</span></td><td>{Number(student.averageScore||0).toFixed(1)}%</td><td><CommonMistakes mistakes={student.commonMistakes}/></td><td>{student.bestScore===null?'—':`${Number(student.bestScore).toFixed(1)}%`}</td>
            <td>{student.lastCompletedAt?new Date(student.lastCompletedAt).toLocaleDateString('es-CO'):'Sin actividad'}</td>
            <td><AttemptDetails progress={student.progress?.filter((item)=>gameFilter==='all'||item.game_name===gameFilter)}/></td>
            <td><div className="student-adaptation"><select aria-label={`Dificultad de ${student.name}`} value={studentSettings.get(student.id)?.difficulty || 'medio'} disabled={savingControl === `student:${student.id}`} onChange={(event)=>changeStudentDifficulty(student.id,event.target.value)}>{Object.entries(difficultyLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>{getLearningAlert(student)&&<div className="learning-alert" role="status"><strong>⚠ Alerta de aprendizaje</strong><span>{getLearningAlert(student)} Recomendación: cambiar a Fácil para reforzar los conceptos.</span><button type="button" disabled={savingControl === `student:${student.id}` || studentSettings.get(student.id)?.difficulty === 'facil'} onClick={()=>changeStudentDifficulty(student.id,'facil')}>{studentSettings.get(student.id)?.difficulty === 'facil' ? 'Ya está en Fácil' : 'Cambiar a Fácil'}</button></div>}</div></td>
            {section==='games'&&<td><AttemptDetails all progress={student.progress?.filter((item)=>gameFilter==='all'||item.game_name===gameFilter)}/></td>}
          </tr>)}
        </tbody></table></div>
      </div>
      <div className="muted report-footnote">El puntaje reciente incluye errores y tiempo. El mejor puntaje histórico se conserva por separado.</div>
    </>}</main></section></div>;
}
