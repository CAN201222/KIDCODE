import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { saveProgress } from '../../services/api';
import { calculateScore } from './scoring';
import GameGuide from './GameGuide';
import ThemeToggle from '../ThemeToggle';
import './GameExperience.css';

const patchLevels = [
  { route: [[3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3]], firewalls: [[3, 4], [1, 2]], time: 100, hint: 'Conecta el cliente con la base de datos. Toca cada cable para girarlo.' },
  { route: [[3, 0], [2, 0], [2, 1], [2, 2], [1, 2], [1, 3], [0, 3]], firewalls: [[3, 1], [1, 1], [0, 2]], time: 95, hint: 'El cortafuegos bloquea la ruta directa. Busca los codos que desvían el flujo.' },
  { route: [[3, 0], [3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [0, 3]], firewalls: [[3, 2], [2, 3], [0, 1]], time: 90, hint: 'Una petición segura necesita varios cambios de dirección. Sigue los puertos.' },
  { route: [[3, 0], [3, 1], [3, 2], [2, 2], [1, 2], [1, 3], [0, 3]], firewalls: [[2, 0], [2, 1], [0, 2]], time: 85, hint: 'Evita las compuertas rojas y mantén una conexión continua en cada salto.' },
  { route: [[3, 0], [2, 0], [1, 0], [1, 1], [1, 2], [2, 2], [2, 3], [1, 3], [0, 3]], firewalls: [[3, 1], [2, 1], [0, 1]], time: 80, hint: 'El protocolo cambia de dirección tres veces. Rota también las piezas intermedias.' },
  { route: [[3, 0], [3, 1], [2, 1], [2, 2], [1, 2], [1, 3], [0, 3]], firewalls: [[3, 2], [1, 1], [0, 2]], time: 75, hint: 'Los puertos no alineados cortan el flujo aunque el camino parezca correcto.' },
  { route: [[3, 0], [3, 1], [2, 1], [1, 1], [1, 2], [2, 2], [2, 3], [1, 3], [0, 3]], firewalls: [[3, 2], [2, 0], [0, 1], [0, 2]], time: 70, hint: 'Reto final: cada codo importa. Revisa toda la topología antes de abrir el flujo.' },
];

const stackLevels = [
  { count: 3, stackCount: 1, time: 100, stackCapacity: 2, queueCapacity: 3 },
  { count: 4, stackCount: 2, time: 95, stackCapacity: 3, queueCapacity: 3 },
  { count: 5, stackCount: 2, time: 90, stackCapacity: 3, queueCapacity: 4 },
  { count: 6, stackCount: 3, time: 85, stackCapacity: 4, queueCapacity: 4 },
  { count: 7, stackCount: 4, time: 80, stackCapacity: 5, queueCapacity: 4 },
  { count: 8, stackCount: 3, time: 75, stackCapacity: 4, queueCapacity: 6 },
  { count: 9, stackCount: 5, time: 70, stackCapacity: 6, queueCapacity: 5 },
];

const ports = ['N', 'E', 'S', 'W'];
const opposite = { N: 'S', E: 'W', S: 'N', W: 'E' };
const keyForCell = ([row, column]) => `${row}:${column}`;
const emptyRoute = Object.freeze([]);
const glyphForPorts = (connections) => {
  const key = [...connections].sort().join('');
  return ({ N: '↑', E: '→', S: '↓', W: '←', NS: '│', EW: '─', EN: '└', ES: '┌', SW: '┐', NW: '┘' })[key] || '•';
};
const rotatePorts = (connections, turns) => connections.map((port) => ports[(ports.indexOf(port) + turns) % 4]);
const directionBetween = ([row, column], [nextRow, nextColumn]) => {
  if (nextRow < row) return 'N';
  if (nextRow > row) return 'S';
  if (nextColumn > column) return 'E';
  return 'W';
};

function getRequiredPorts(route, index) {
  const required = [];
  if (index > 0) required.push(directionBetween(route[index], route[index - 1]));
  if (index < route.length - 1) required.push(directionBetween(route[index], route[index + 1]));
  return required;
}

function getInitialRotation(index, levelIndex, required) {
  const straight = required.length === 2 && opposite[required[0]] === required[1];
  return straight ? 1 : ((index + levelIndex) % 3) + 1;
}

function routeIsConnected(route, rotations) {
  return route.every((cell, index) => {
    const actual = rotatePorts(getRequiredPorts(route, index), rotations[index]);
    const next = route[index + 1];
    if (!next) return true;
    const outgoing = directionBetween(cell, next);
    const nextPorts = rotatePorts(getRequiredPorts(route, index + 1), rotations[index + 1]);
    return actual.includes(outgoing) && nextPorts.includes(opposite[outgoing]);
  });
}

function MiniGameResult({ result, saving, saveError, mistakes, onRetry, onNextLevel, onBack, hasNext }) {
  return (
    <div className={`result-overlay ${result.status}`} role="dialog" aria-modal="true" aria-labelledby="interactive-result-title">
      <div className="result-card">
        <div className="result-emblem">{result.status === 'won' ? '🏆' : '⏰'}</div>
        <div className="eyebrow">{result.status === 'won' ? 'MISIÓN COMPLETADA' : 'TIEMPO AGOTADO'}</div>
        <h2 id="interactive-result-title">{result.status === 'won' ? '¡Conexión establecida!' : '¡El tiempo se agotó!'}</h2>
        <p>{result.status === 'won' ? 'Tu lógica puso los datos en el destino correcto.' : 'Ajusta tu estrategia y vuelve a intentarlo.'}</p>
        <div className="result-score">
          <span>Efectividad</span>
          <strong>{result.score.toFixed(1)}%</strong>
          <small>de 100% · {mistakes} errores · {result.elapsedSeconds}s</small>
          {result.items > 0 && <small className="result-diamonds">💎 {result.items} paquetes extra · x{result.multiplier}</small>}
          {result.multiplier === 2 && <small className="result-diamonds">⚡ Multiplicador x2 activado</small>}
        </div>
        {saveError && <div className="alert error" role="alert">{saveError}</div>}
        {saving && <div className="muted">Guardando tu resultado…</div>}
        {result.saved && (
          <div className="alert success" role="status">
            Resultado guardado en tu progreso.
            {result.rewardPoints > 0 && ` Ganaste ${result.rewardPoints} puntos para tu avatar.`}
          </div>
        )}
        <div className="result-actions">
          {result.status === 'won' && hasNext && (
            <button className="primary-btn next-level-button" disabled={saving || !result.saved} onClick={onNextLevel}>
              Siguiente nivel →
            </button>
          )}
          <button className={result.status === 'won' && hasNext ? 'secondary-btn' : 'primary-btn'} disabled={saving} onClick={onRetry}>
            ↻ {result.status === 'won' ? 'Repetir nivel' : 'Intentar de nuevo'}
          </button>
          <button className="secondary-btn" disabled={saving} onClick={onBack}>
            {result.status === 'won' && !hasNext ? 'Volver al mapa' : 'Volver a mis juegos'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InteractiveMiniGame({ user, token, game, level = 1, difficulty = 'medio', onBack, onNextLevel }) {
  const parsedLevel = Number(level);
  const levelIndex = Number.isFinite(parsedLevel) ? Math.min(7, Math.max(1, Math.trunc(parsedLevel))) - 1 : 0;
  const isPatch = game === 'patch-cable';
  const info = isPatch
    ? { title: 'Patch Cable', icon: '🔌', skill: 'Arquitectura cliente-servidor' }
    : { title: 'Stack Balancer', icon: '📦', skill: 'Pilas, colas y memoria' };
  const rawChallenge = isPatch ? patchLevels[levelIndex] : stackLevels[levelIndex];
  const challenge = {
    ...rawChallenge,
    time: difficulty === 'facil' ? rawChallenge.time : difficulty === 'dificil' ? Math.max(35, Math.round(rawChallenge.time * 0.7)) : rawChallenge.time,
    ...(difficulty === 'facil' && !isPatch ? {
      stackCapacity: rawChallenge.stackCapacity + 1,
      queueCapacity: rawChallenge.queueCapacity + 1,
    } : {}),
    ...(difficulty === 'dificil' && !isPatch ? {
      count: rawChallenge.count + 1,
      stackCount: rawChallenge.stackCount + 1,
      stackCapacity: rawChallenge.stackCapacity + 1,
    } : {}),
  };
  const route = isPatch ? challenge.route : emptyRoute;
  const pathIndexes = useMemo(() => new Map(route.map((cell, index) => [keyForCell(cell), index])), [route]);
  const initialRotations = useMemo(() => route.map((_, index) => getInitialRotation(index, levelIndex, getRequiredPorts(route, index))), [route, levelIndex]);
  const [rotations, setRotations] = useState(initialRotations);
  const [rotationMoves, setRotationMoves] = useState(0);
  const [patchGemCollected, setPatchGemCollected] = useState(false);
  const [assignments, setAssignments] = useState({});
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [flowing, setFlowing] = useState(false);
  const [remaining, setRemaining] = useState(challenge.time);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [dispatch, setDispatch] = useState(null);
  const elapsedRef = useRef(0);
  const remainingRef = useRef(challenge.time);
  const mistakesRef = useRef(0);
  const attemptsRef = useRef(0);
  const mistakeTypesRef = useRef({});
  const endedRef = useRef(false);
  const finishRef = useRef(null);
  const stackPackages = useMemo(() => Array.from({ length: challenge.count }, (_, index) => ({ id: `P${index + 1}`, label: `Paquete ${String.fromCharCode(65 + index)}` })), [challenge.count]);
  const targetOrder = useMemo(() => {
    const ids = stackPackages.map((packet) => packet.id);
    return [...ids.slice(0, challenge.stackCount).reverse(), ...ids.slice(challenge.stackCount)];
  }, [stackPackages, challenge.stackCount]);
  const maxPatchMoves = useMemo(
    () => initialRotations.reduce((sum, turns) => sum + (4 - turns) % 4, 0),
    [initialRotations]
  );

  const finish = useCallback(async (status, achievement = {}) => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (status === 'lost') {
      mistakesRef.current += 1;
      mistakeTypesRef.current.timeout = (mistakeTypesRef.current.timeout || 0) + 1;
      setMistakes(mistakesRef.current);
    }
    const scoreResult = calculateScore({
      completed: status === 'won',
      timeLimit: difficulty === 'facil' ? 1000000000 : challenge.time,
      elapsedSeconds: elapsedRef.current,
      instructionCount: achievement.instructionCount ?? 0,
      optimalInstructions: achievement.optimalInstructions ?? 1,
      mistakes: mistakesRef.current,
      efficient: Boolean(achievement.efficient),
      firstTry: difficulty !== 'dificil' && mistakesRef.current === 0,
      collectible: difficulty !== 'dificil' && Boolean(achievement.collectible),
    });
    const time = elapsedRef.current;
    setResult({ status, score: scoreResult.score, multiplier: scoreResult.multiplier, items: achievement.items || 0, elapsedSeconds: time, saved: false });
    setSaveError('');
    setSaving(true);
    try {
      const response = await saveProgress(token, {
        game_name: game,
        level: levelIndex + 1,
        score: scoreResult.score,
        mistakes: mistakesRef.current,
        mistake_types: mistakeTypesRef.current,
        duration_seconds: time,
        attempts: attemptsRef.current,
        multiplier: scoreResult.multiplier,
        instruction_count: achievement.instructionCount ?? 0,
        completed: status === 'won',
      });
      if (response.error) throw new Error(response.error);
      setResult({
        status,
        score: scoreResult.score,
        multiplier: scoreResult.multiplier,
        items: achievement.items || 0,
        elapsedSeconds: time,
        saved: true,
        rewardPoints: response.reward_points || 0,
      });
      if (status === 'won') confetti({ particleCount: 150, spread: 78, origin: { y: 0.6 } });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No pudimos registrar este intento.');
    } finally {
      setSaving(false);
    }
  }, [challenge.time, difficulty, game, levelIndex, token]);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  useEffect(() => {
    if (result) return undefined;
    const timer = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsedSeconds(elapsedRef.current);
      if (difficulty !== 'facil') remainingRef.current = Math.max(0, remainingRef.current - 1);
      setRemaining(remainingRef.current);
      if (difficulty !== 'facil' && remainingRef.current === 0) finishRef.current?.('lost');
    }, 1000);
    return () => window.clearInterval(timer);
  }, [result, difficulty]);

  const penalize = (message, type = 'wrong_route') => {
    if (endedRef.current) return;
    mistakesRef.current += 1;
    mistakeTypesRef.current[type] = (mistakeTypesRef.current[type] || 0) + 1;
    setMistakes(mistakesRef.current);
    if (difficulty !== 'facil') remainingRef.current = Math.max(1, remainingRef.current - 5);
    setRemaining(remainingRef.current);
    setFeedback(`${message}${difficulty === 'facil' ? ' Revisa la estrategia sin presión de tiempo.' : ' −5 segundos. Ajusta tu estrategia.'}`);
  };

  const rotateNode = (index) => {
    if (flowing || result || saving) return;
    if (difficulty === 'dificil' && rotationMoves >= maxPatchMoves) {
      setFeedback(`Límite de ${maxPatchMoves} giros alcanzado. Ejecuta el flujo o reinicia el circuito.`);
      return;
    }
    setRotations((current) => current.map((turns, nodeIndex) => nodeIndex === index ? (turns + 1) % 4 : turns));
    setRotationMoves((current) => current + 1);
    setFeedback('Conector rotado. Sigue el cable hacia el siguiente puerto.');
  };

  const openFlow = () => {
    if (flowing || result || saving) return;
    attemptsRef.current += 1;
    setFlowing(true);
    setFeedback('Abriendo el flujo de datos…');
    window.setTimeout(() => {
      setFlowing(false);
      if (endedRef.current) return;
      if (routeIsConnected(route, rotations)) {
        const optimalRotations = Math.max(1, initialRotations.reduce((sum, turns) => sum + (4 - turns) % 4, 0));
        finish('won', { instructionCount: rotationMoves, optimalInstructions: optimalRotations, efficient: rotationMoves <= optimalRotations, collectible: patchGemCollected, items: patchGemCollected ? 1 : 0 });
      } else {
        penalize('El flujo se detuvo: revisa que los puertos vecinos coincidan.');
      }
    }, 1100);
  };

  const assignPacket = (packetId, destination) => {
    if (result || saving || endedRef.current) return;
    const next = { ...assignments };
    const previousDestination = next[packetId];
    const countInDestination = Object.values(next).filter((value) => value === destination).length;
    const capacity = destination === 'stack' ? challenge.stackCapacity : challenge.queueCapacity;
    if (previousDestination !== destination && countInDestination >= capacity) {
      penalize(`¡Desbordamiento! La ${destination === 'stack' ? 'pila' : 'cola'} admite ${capacity} paquetes.`, 'wrong_pipeline');
      return;
    }
    next[packetId] = destination;
    setAssignments(next);
    setSelectedPacket(null);
    setFeedback(`${packetId} colocado en ${destination === 'stack' ? 'Pila · LIFO' : 'Cola · FIFO'}.`);
  };

  const dispatchPackets = () => {
    if (result || saving || endedRef.current || Object.keys(assignments).length !== stackPackages.length) return;
    attemptsRef.current += 1;
    const stackOrder = stackPackages.filter((packet) => assignments[packet.id] === 'stack').map((packet) => packet.id).reverse();
    const queueOrder = stackPackages.filter((packet) => assignments[packet.id] === 'queue').map((packet) => packet.id);
    const actual = [...stackOrder, ...queueOrder];
    setDispatch(actual);
    if (actual.length === targetOrder.length && actual.every((id, index) => id === targetOrder[index])) {
      const optimalMoves = stackPackages.length;
      finish('won', { instructionCount: optimalMoves, optimalInstructions: optimalMoves, efficient: mistakesRef.current === 0, collectible: mistakesRef.current === 0, items: mistakesRef.current === 0 ? 1 : 0 });
    } else {
      penalize('El robot recibió los paquetes en otro orden. Pila = LIFO; cola = FIFO.', 'wrong_pipeline');
    }
  };

  const resetPuzzle = () => {
    if (result || saving || endedRef.current) return;
    setFeedback('');
    setFlowing(false);
    setRotations(initialRotations);
    setRotationMoves(0);
    setPatchGemCollected(false);
    setAssignments({});
    setSelectedPacket(null);
    setDispatch(null);
  };

  const retry = () => {
    endedRef.current = false;
    setResult(null);
    setSaveError('');
    remainingRef.current = challenge.time;
    setRemaining(challenge.time);
    elapsedRef.current = 0;
    mistakesRef.current = 0;
    attemptsRef.current = 0;
    mistakeTypesRef.current = {};
    setElapsedSeconds(0);
    setMistakes(0);
    setFeedback('');
    setFlowing(false);
    setRotations(initialRotations);
    setRotationMoves(0);
    setPatchGemCollected(false);
    setAssignments({});
    setSelectedPacket(null);
    setDispatch(null);
  };

  const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const stackContents = stackPackages.filter((packet) => assignments[packet.id] === 'stack');
  const queueContents = stackPackages.filter((packet) => assignments[packet.id] === 'queue');
  const missionText = isPatch
    ? 'Conecta el cliente con la base de datos rotando los cables y evitando el firewall.'
    : `Despacha ${stackPackages.length} paquetes en el orden indicado sin desbordar la memoria.`;

  return <div className="main-content game-screen"><div className="game-toolbar"><button className="back-button" onClick={onBack}>← Volver a mis juegos</button><GameGuide userId={user.id} gameId={game} level={levelIndex + 1} /><ThemeToggle /><span className={`timer-pill ${difficulty !== 'facil' && remaining <= 20 ? 'timer-urgent' : ''}`}>{difficulty === 'facil' ? '∞ Sin límite' : `◷ ${formatTime(remaining)}`}</span></div><section className="game-panel">
    <div className="game-title-row"><span style={{ fontSize: 32 }}>{info.icon}</span><div><h1>{info.title}</h1><span className="stat-note">{info.skill} · Nivel {levelIndex + 1} de 7 · Dificultad {difficulty === 'facil' ? 'Fácil' : difficulty === 'dificil' ? 'Difícil' : 'Media'}</span></div><div className="game-live-stats"><span>⏱ {elapsedSeconds}s</span><span>⚠ {mistakes} errores</span><span>◇ {isPatch ? rotationMoves : Object.keys(assignments).length} acciones</span></div></div>
    <div className="mission-banner"><strong>🎯 Misión</strong><span>{missionText}</span></div>
    <p className="game-subtitle">{user.name?.split(' ')[0]}, {isPatch ? 'rota los conectores y deja viajar la petición.' : 'equilibra memoria y orden de despacho.'}</p>
    <div className="progress-track"><div className="progress-fill" style={{ width: `${(levelIndex + 1) / 7 * 100}%` }} /></div>

    {isPatch ? <>    <div className="notice"><strong>PATCH CABLE · CIRCUITO {levelIndex + 1} · {rotationMoves} GIROS · MODO {difficulty === 'facil' ? 'FÁCIL' : difficulty === 'dificil' ? 'DIFÍCIL' : 'MEDIO'}</strong><br />{difficulty === 'dificil' ? `Máximo ${maxPatchMoves} giros: analiza las conexiones antes de rotar.` : challenge.hint}<span className="control-legend"><b>🖥️ Cliente</b> → rota los conectores → <b>🗄️ Base de datos</b>. Los cortafuegos no se pueden atravesar.</span></div>
      <div className="board patch-board" data-tutorial="patch-board"><div className="mini-label">TOCA UN NODO PARA GIRAR SU CONECTOR · LOS PUERTOS DEBEN ENLAZAR</div><div className="patch-grid">{Array.from({ length: 16 }, (_, index) => {
        const row = Math.floor(index / 4);
        const column = index % 4;
        const nodeIndex = pathIndexes.get(`${row}:${column}`);
        const firewall = challenge.firewalls.some(([fireRow, fireColumn]) => fireRow === row && fireColumn === column);
        const isSource = nodeIndex === 0;
        const isTarget = nodeIndex === route.length - 1;
        if (nodeIndex === undefined) return <div key={index} className={`patch-cell ${firewall ? 'patch-firewall' : ''}`}>{firewall ? '🧱' : '·'}</div>;
        const required = getRequiredPorts(route, nodeIndex);
        return <div key={index} className={`patch-cell patch-node ${flowing ? 'patch-flowing' : ''} ${isSource ? 'patch-source' : ''} ${isTarget ? 'patch-target' : ''}`}>
          <span className="patch-terminal">{isSource ? '🖥️' : isTarget ? '🗄️' : ''}</span><button type="button" data-tutorial={nodeIndex === 1 ? 'patch-wire' : undefined} className="patch-wire-button" disabled={flowing || saving || result || (difficulty === 'dificil' && rotationMoves >= maxPatchMoves)} onClick={() => rotateNode(nodeIndex)} aria-label={`Rotar conector ${nodeIndex + 1}, ${rotations[nodeIndex]} giros`}><span className="patch-wire" style={{ transform: `rotate(${rotations[nodeIndex] * 90}deg)` }}>{glyphForPorts(required)}</span></button>
          {nodeIndex === Math.floor(route.length / 2) && <button type="button" className={`patch-gem ${patchGemCollected ? 'patch-gem-collected' : ''}`} disabled={flowing || saving || patchGemCollected} onClick={() => { setPatchGemCollected(true); confetti({ particleCount: 18, spread: 42, origin: { x: 0.5, y: 0.6 }, colors: ['#48a6e8', '#edbe44'] }); }} aria-label={patchGemCollected ? 'Gema recogida' : 'Recoger gema opcional'}>{patchGemCollected ? '✨' : '💎'}</button>}
        </div>;
      })}</div><div className="patch-legend"><span>🖥️ Cliente / request</span><span>🧱 Firewall</span><span>🗄️ Base de datos / destino</span></div></div>
      <div className="game-controls patch-controls" data-tutorial="patch-run"><button className="primary-btn action-card-button" disabled={flowing || saving} onClick={openFlow}>{flowing ? '✨ Fluyendo…' : '▶ Abrir flujo de datos'}</button><button className="secondary-btn" disabled={flowing || saving || Boolean(result)} onClick={resetPuzzle}>↻ Reiniciar circuito</button></div>
    </> : <><div className="notice"><strong>STACK BALANCER · DESPACHO {levelIndex + 1} · {Object.keys(assignments).length}/{stackPackages.length} PAQUETES · MODO {difficulty === 'facil' ? 'FÁCIL' : difficulty === 'dificil' ? 'DIFÍCIL' : 'MEDIO'}</strong><br />{difficulty === 'dificil' ? 'Memoria ampliada con un paquete extra: planifica la salida antes de empezar.' : 'Arrastra o toca cada paquete y colócalo en la memoria. Pila despacha LIFO (último en entrar, primero en salir); cola despacha FIFO (primero en entrar, primero en salir).'}</div>
      <div className="stack-objective" data-tutorial="stack-objective"><strong>ORDEN DE ENTREGA DEL ROBOT</strong><span>{targetOrder.map((id) => <b key={id}>{id}</b>)}</span><small>La pila se vacía primero; después se atiende la cola.</small></div>
      <div className="stack-packets" data-tutorial="stack-packets" aria-label="Paquetes pendientes">{stackPackages.filter((packet) => !assignments[packet.id]).map((packet) => <button key={packet.id} type="button" className={`data-packet ${selectedPacket === packet.id ? 'packet-selected' : ''}`} draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', packet.id); setSelectedPacket(packet.id); }} onClick={() => setSelectedPacket(selectedPacket === packet.id ? null : packet.id)} aria-pressed={selectedPacket === packet.id}><span>📦</span><strong>{packet.id}</strong><small>Entrada {stackPackages.indexOf(packet) + 1}</small></button>)}</div>
      <div className="memory-lanes"><div className="memory-bin memory-stack" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const packetId = event.dataTransfer.getData('text/plain'); if (packetId) assignPacket(packetId, 'stack'); }}><div className="memory-bin-heading"><span>🗼</span><div><strong>PILA · LIFO</strong><small>Capacidad {challenge.stackCapacity} · sale el último primero</small></div><b>{stackContents.length}/{challenge.stackCapacity}</b></div><div className="memory-bin-content">{stackContents.map((packet, index) => <button type="button" key={packet.id} className="memory-packet" onClick={() => assignPacket(packet.id, 'queue')} title="Toca para mover a la cola">{packet.id}<small>{index === stackContents.length - 1 ? 'tope' : ''}</small></button>)}{stackContents.length === 0 && <span className="memory-empty">Suelta aquí los paquetes de la pila</span>}</div><button type="button" className="bin-tap-target" disabled={!selectedPacket} onClick={() => selectedPacket && assignPacket(selectedPacket, 'stack')}>{selectedPacket ? `Colocar ${selectedPacket} en la pila` : 'Selecciona un paquete'}</button></div>
      <div className="memory-bin memory-queue" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const packetId = event.dataTransfer.getData('text/plain'); if (packetId) assignPacket(packetId, 'queue'); }}><div className="memory-bin-heading"><span>🚉</span><div><strong>COLA · FIFO</strong><small>Capacidad {challenge.queueCapacity} · sale el primero primero</small></div><b>{queueContents.length}/{challenge.queueCapacity}</b></div><div className="memory-bin-content">{queueContents.map((packet, index) => <button type="button" key={packet.id} className="memory-packet" onClick={() => assignPacket(packet.id, 'stack')} title="Toca para mover a la pila">{packet.id}<small>{index === 0 ? 'frente' : ''}</small></button>)}{queueContents.length === 0 && <span className="memory-empty">Suelta aquí los paquetes de la cola</span>}</div><button type="button" className="bin-tap-target" disabled={!selectedPacket} onClick={() => selectedPacket && assignPacket(selectedPacket, 'queue')}>{selectedPacket ? `Colocar ${selectedPacket} en la cola` : 'Selecciona un paquete'}</button></div></div>
      {dispatch && <div className="dispatch-preview"><strong>Orden resultante:</strong> {dispatch.map((id) => <b key={id}>{id}</b>)}</div>}
      <div className="game-controls" data-tutorial="stack-run"><button className="primary-btn action-card-button" disabled={Object.keys(assignments).length !== stackPackages.length || saving} onClick={dispatchPackets}>🤖 Simular despacho</button><button className="secondary-btn" disabled={saving || Boolean(result)} onClick={resetPuzzle}>↻ Reorganizar</button></div>
    </>}
    {feedback && <div className={`feedback ${result?.status === 'won' ? 'alert success' : ''}`} role="status">{feedback}</div>}
  </section>
  {result && <MiniGameResult result={result} saving={saving} saveError={saveError} mistakes={mistakes} onRetry={retry} onBack={onBack} onNextLevel={() => onNextLevel(game, levelIndex + 2)} hasNext={levelIndex < 6} />}
  </div>;
}
