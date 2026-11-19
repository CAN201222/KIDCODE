import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { getStudentProgress, saveProgress } from '../../services/api';
import { calculateScore } from './scoring';
import GameGuide from './GameGuide';
import ThemeToggle from '../ThemeToggle';
import './GameExperience.css';

const gameInfo = {
  'logic-game': { title: 'Algoritmos del explorador', icon: '🤖', skill: 'Algoritmos y secuencias' },
  'sequence-game': { title: 'Red de servidores', icon: '🌐', skill: 'Rutas, redes y tolerancia a fallos' },
  'bug-game': { title: 'Clínica de código', icon: '🛠️', skill: 'Lectura y depuración' },
};

const algorithmLevels = [
  { name: 'Ruinas en línea recta', time: 100, solution: ['AVANZAR', 'AVANZAR'], target: [0, 2], walls: [[1, 1], [2, 2]], diamonds: [[0, 1]], hint: 'Avanza dos casillas. Las rocas bloquean el camino.' },
  { name: 'Pasillo de piedra', time: 95, solution: ['AVANZAR', 'GIRAR_DER', 'AVANZAR', 'AVANZAR'], target: [2, 1], walls: [[1, 2], [3, 0]], diamonds: [[1, 1]], hint: 'Avanza una casilla, gira a la derecha y baja por el pasillo para recoger el diamante.' },
  { name: 'El puente colgante', time: 90, solution: ['AVANZAR', 'AVANZAR', 'GIRAR_DER', 'AVANZAR', 'AVANZAR'], target: [2, 2], walls: [[1, 0], [3, 3]], diamonds: [[0, 2], [1, 2]], hint: 'Combina dos tramos rectos y un giro. ¡Hay dos diamantes en la ruta!' },
  { name: 'Cámara de los ecos', time: 85, solution: ['AVANZAR', 'AVANZAR', 'GIRAR_DER', 'AVANZAR', 'AVANZAR', 'AVANZAR', 'GIRAR_IZQ', 'AVANZAR', 'AVANZAR'], target: [3, 4], walls: [[1, 0], [2, 3], [4, 1]], diamonds: [[0, 1], [2, 2]], hint: 'Planifica dos giros y tres tramos.' },
  { name: 'Ruta del geólogo', time: 80, solution: ['AVANZAR', 'AVANZAR', 'AVANZAR', 'GIRAR_DER', 'AVANZAR', 'AVANZAR', 'GIRAR_DER', 'AVANZAR'], target: [2, 2], walls: [[1, 1], [3, 2], [4, 4]], diamonds: [[0, 2], [1, 3]], hint: 'Rodea el muro con dos giros. Una ruta más corta conserva tu bonificación.' },
  { name: 'Laberinto de señales', time: 75, solution: ['AVANZAR', 'AVANZAR', 'GIRAR_DER', 'AVANZAR', 'GIRAR_DER', 'AVANZAR', 'AVANZAR'], target: [1, 0], walls: [[0, 3], [2, 1], [3, 4]], diamonds: [[0, 1], [1, 1]], hint: 'El robot puede mirar en cuatro direcciones. Revisa cada flecha.' },
  { name: 'El tesoro del explorador', time: 70, solution: ['AVANZAR', 'AVANZAR', 'GIRAR_DER', 'AVANZAR', 'AVANZAR', 'GIRAR_IZQ', 'AVANZAR', 'GIRAR_DER', 'AVANZAR'], target: [3, 3], walls: [[0, 4], [1, 0], [3, 1], [4, 2]], diamonds: [[0, 1], [1, 2], [2, 3]], hint: 'Reto final: programa una ruta segura, reúne los diamantes y busca el x2.' },
];

const networkDirections = { NORTE: [-1, 0], ESTE: [0, 1], SUR: [1, 0], OESTE: [0, -1] };
const networkDirectionLabels = { NORTE: 'Norte', ESTE: 'Este', SUR: 'Sur', OESTE: 'Oeste' };
const networkLevels = [
  { start: [4, 0], target: [4, 4], solution: ['ESTE', 'ESTE', 'ESTE', 'ESTE'], blocked: [[3, 1], [2, 2]], hazards: [], packets: [[4, 2]], time: 100, maxBlocks: 4, hint: 'Enruta el paquete al nodo de destino. Las cruces son servidores caídos.' },
  { start: [4, 0], target: [0, 4], solution: ['ESTE', 'ESTE', 'ESTE', 'ESTE', 'NORTE', 'NORTE', 'NORTE', 'NORTE'], blocked: [[3, 2], [2, 2], [1, 2], [0, 1]], hazards: [], packets: [[4, 3], [1, 4]], time: 90, maxBlocks: 8, hint: 'Cruza primero al servidor del borde y luego sube: el enlace central está caído.' },
  { start: [4, 0], target: [0, 4], solution: ['NORTE', 'NORTE', 'NORTE', 'NORTE', 'ESTE', 'ESTE', 'ESTE', 'ESTE'], blocked: [[3, 1], [2, 1], [1, 3], [1, 4]], hazards: [], packets: [[2, 0], [0, 2]], time: 85, maxBlocks: 8, hint: 'El centro de la red falla. Sube por el borde oeste y gira hacia el destino.' },
  { start: [4, 0], target: [0, 4], solution: ['NORTE', 'NORTE', 'NORTE', 'NORTE', 'ESTE', 'ESTE', 'ESTE', 'ESTE'], blocked: [[3, 2], [2, 3], [1, 2], [1, 3]], hazards: [[2, 1]], packets: [[0, 2]], time: 80, maxBlocks: 8, hint: 'El nodo ámbar sigue activo pero es inestable. Evítalo para conservar la bonificación.' },
  { start: [4, 0], target: [0, 4], solution: ['ESTE', 'ESTE', 'NORTE', 'NORTE', 'NORTE', 'NORTE', 'ESTE', 'ESTE'], blocked: [[3, 1], [2, 1], [1, 3], [3, 3], [0, 1]], hazards: [[3, 4]], packets: [[4, 1], [0, 3]], time: 75, maxBlocks: 8, hint: 'El firewall bloquea el atajo. Enruta por el nodo este y evita el servidor inestable.' },
  { start: [4, 0], target: [0, 4], solution: ['ESTE', 'ESTE', 'ESTE', 'NORTE', 'NORTE', 'NORTE', 'NORTE', 'ESTE'], blocked: [[3, 1], [2, 1], [1, 1], [0, 2], [2, 4]], hazards: [[1, 2], [1, 4]], packets: [[4, 2], [0, 3]], time: 70, maxBlocks: 8, hint: 'Dos servidores están saturados. La ruta corta funciona solo si calculas cada giro.' },
  { start: [4, 0], target: [0, 4], solution: ['ESTE', 'ESTE', 'NORTE', 'NORTE', 'NORTE', 'NORTE', 'ESTE', 'ESTE'], blocked: [[3, 1], [2, 1], [1, 1], [0, 1], [4, 4]], hazards: [[3, 3], [1, 3]], packets: [[4, 2], [0, 3]], time: 65, maxBlocks: 8, hint: 'Reto final: los nodos del oeste y los enlaces ámbar son trampas. Sube por el canal central y recoge paquetes.' },
];

const debugLevels = [
  { time: 100, maxBlocks: 4, code: ['let paquetes = 0', 'while (paquetes < 4)', '  enviarSiguiente()', '  paquetes = paquetes + 1', 'confirmarEntrega()'], bug: 3, options: [{ id: 'increment-one', label: 'paquetes = paquetes + 1', correct: true, efficient: true, explanation: 'El contador avanza una unidad por paquete.' }, { id: 'increment-two', label: 'paquetes += 2', correct: false }, { id: 'post-increment', label: 'paquetes++', correct: true, efficient: false, explanation: 'La forma abreviada también corrige el conteo, aunque es menos explícita.' }, { id: 'increment-string', label: 'paquetes = paquetes + "1"', correct: false }], error: 'El contador no avanza de forma numérica y el envío puede quedarse en un ciclo infinito.', explanation: 'El servidor ahora procesa los cuatro paquetes y termina.' },
  { time: 95, maxBlocks: 4, code: ['let energia = 4', 'while (energia > 0)', '  avanzar()', '  energia = energia + 1', 'llegarMeta()'], bug: 3, options: [{ id: 'decrease-one', label: 'energia = energia - 1', correct: true, efficient: true, explanation: 'La energía disminuye en cada paso y el bucle termina.' }, { id: 'decrease-two', label: 'energia -= 2', correct: false }, { id: 'post-decrement', label: 'energia--', correct: true, efficient: false, explanation: 'El decremento funciona, aunque usar menos energía por paso conserva la lógica original.' }, { id: 'less-than', label: 'energia = energia + -0', correct: false }, { id: 'string-zero', label: 'energia = "0"', correct: false }], error: 'La condición de parada nunca se alcanza porque la energía aumenta en cada iteración.', explanation: 'La energía disminuye y el bucle de reintentos termina.' },
  { time: 90, maxBlocks: 5, code: ['const paquetes = recibir()', 'for (let i = 0;', '    i <= paquetes.length;', '    i++) {', '  enrutar(paquetes[i])', '}'], bug: 2, options: [{ id: 'strict-length', label: 'i < paquetes.length;', correct: true, efficient: true, explanation: 'El último índice válido es length - 1.' }, { id: 'minus-two', label: 'i < paquetes.length - 1;', correct: false }, { id: 'length-default', label: 'i <= paquetes.length - 1;', correct: true, efficient: false, explanation: 'También evita acceder a la posición inexistente, aunque la comparación estricta es más clara.' }, { id: 'undefined-limit', label: 'i < paquete.length;', correct: false }, { id: 'string-limit', label: 'i < Number(paquetes);', correct: false }], error: 'El límite inclusivo intenta leer un elemento después del final de la cola (off-by-one).', explanation: 'El bucle recorre todos los paquetes existentes sin leer un índice extra.' },
  { time: 85, maxBlocks: 5, code: ['const usuario = buscarUsuario(id)', 'if (usuario.activo)', '  desplegar(usuario)', 'else', '  registrarError("inactivo")'], bug: 1, options: [{ id: 'strict-active', label: 'if (usuario && usuario.activo)', correct: true, efficient: true, explanation: 'La condición comprueba que exista el usuario antes de leer activo.' }, { id: 'null-only', label: 'if (usuario !== null)', correct: false }, { id: 'optional-active', label: 'if (usuario?.activo === true)', correct: true, efficient: false, explanation: 'La comparación estricta también protege contra usuario indefinido y solo acepta true.' }, { id: 'active-string', label: 'if (usuario.activo === "true")', correct: false }, { id: 'or-active', label: 'if (usuario || usuario.activo)', correct: false }], error: 'buscarUsuario puede devolver null; leer activo directamente provoca una excepción.', explanation: 'El servidor ahora verifica la existencia y el estado del usuario.' },
  { time: 80, maxBlocks: 5, code: ['async function enviar(paquete)', '  const resultado = await api.send(paquete)', '  if (resultado.ok)', '    return "enviado"', '  return "pendiente"'], bug: 2, options: [{ id: 'status-boolean', label: 'if (resultado && resultado.ok === true)', correct: true, efficient: true, explanation: 'La respuesta existe y solo un valor booleano true marca éxito.' }, { id: 'status-truthy', label: 'if (resultado.ok != null)', correct: false }, { id: 'status-code', label: 'if (resultado.status < 400)', correct: true, efficient: false, explanation: 'Un estado HTTP menor a 400 también indica que la solicitud no falló.' }, { id: 'status-string', label: 'if (resultado.ok === "true")', correct: false }, { id: 'missing-await', label: 'if (api.send(paquete).ok)', correct: false }], error: 'La API devuelve respuestas vacías y estados HTTP; no basta con confiar en una propiedad truthy.', explanation: 'La condición ahora distingue respuestas válidas y errores del servidor.' },
  { time: 75, maxBlocks: 6, code: ['let cola = cargarPaquetes()', 'while (cola.length > 0)', '  const paquete = cola[0]', '  await enviar(paquete)', '  cola.push(paquete)', 'cerrarConexion()'], bug: 4, options: [{ id: 'shift-queue', label: 'cola.shift()', correct: true, efficient: true, explanation: 'Retira el paquete procesado del frente de la cola.' }, { id: 'pop-queue', label: 'cola.pop()', correct: true, efficient: false, explanation: 'También reduce la cola y termina el bucle, aunque retira el elemento por el extremo opuesto.' }, { id: 'push-queue', label: 'cola.push(paquete)', correct: false }, { id: 'reset-queue', label: 'cola = []', correct: false }, { id: 'slice-queue', label: 'cola.slice(1)', correct: false }], error: 'El paquete procesado vuelve a añadirse: la cola crece y nunca se vacía.', explanation: 'Cada paquete procesado se retira, por lo que la cola termina.' },
  { time: 65, maxBlocks: 6, code: ['const estado = await consultarNodo()', 'if (estado.caido)', '  reintentar()', 'if (estado.latencia < 200)', '  enviarPaquete()', 'confirmarRuta()'], bug: 3, options: [{ id: 'guard-failed', label: 'if (!estado.caido && estado.latencia < 200)', correct: true, efficient: true, explanation: 'Solo enruta si el nodo está disponible y cumple el límite de latencia.' }, { id: 'or-condition', label: 'if (!estado.caido || estado.latencia < 200)', correct: false }, { id: 'latency-number', label: 'if (!estado.caido && Number(estado.latencia) < 200)', correct: true, efficient: false, explanation: 'La conversión evita comparar texto con un número y también descarta nodos caídos.' }, { id: 'latency-string', label: 'if (estado.latencia < "200ms")', correct: false }, { id: 'undeclared-status', label: 'if (latencia < 200)', correct: false }, { id: 'inclusive-boundary', label: 'if (!estado.caido && estado.latencia <= 200)', correct: false }], error: 'El nodo puede caer entre la consulta y el envío, o responder después del límite.', explanation: 'La ruta exige un nodo activo y una latencia menor al límite.' },
];

const commandLabels = { AVANZAR: 'avanzar()', GIRAR_DER: 'girarDerecha()', GIRAR_IZQ: 'girarIzquierda()' };
const directions = ['→', '↓', '←', '↑'];
const algorithmDeltas = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const difficultyNames = { facil: 'Fácil', medio: 'Media', dificil: 'Difícil' };

function getAlgorithmPositions(commands) {
  let row = 0;
  let column = 0;
  let facing = 0;
  const positions = [[row, column]];
  (Array.isArray(commands) ? commands : []).forEach((command) => {
    if (command === 'GIRAR_DER') facing = (facing + 1) % 4;
    else if (command === 'GIRAR_IZQ') facing = (facing + 3) % 4;
    else if (command === 'AVANZAR') {
      row += algorithmDeltas[facing][0];
      column += algorithmDeltas[facing][1];
      positions.push([row, column]);
    }
  });
  return { row, column, facing, positions };
}

function getNetworkPositions(commands, start) {
  let row = start[0];
  let column = start[1];
  const positions = [[row, column]];
  (Array.isArray(commands) ? commands : []).forEach((command) => {
    const delta = networkDirections[command];
    if (!delta) return;
    const [rowDelta, columnDelta] = delta;
    row += rowDelta;
    column += columnDelta;
    positions.push([row, column]);
  });
  return { row, column, positions };
}

function getAdjustedChallenge(gameId, levelIndex, difficulty) {
  const raw = gameId === 'logic-game' ? algorithmLevels[levelIndex]
    : gameId === 'sequence-game' ? networkLevels[levelIndex] : debugLevels[levelIndex];
  if (difficulty === 'medio') {
    if (gameId === 'logic-game') {
      const route = getAlgorithmPositions(raw.solution).positions;
      const extraDiamond = route.slice(1).find(([row, column]) => (
        !raw.diamonds.some(([diamondRow, diamondColumn]) => diamondRow === row && diamondColumn === column)
      ));
      return { ...raw, diamonds: extraDiamond ? [...raw.diamonds, extraDiamond] : raw.diamonds };
    }
    if (gameId !== 'sequence-game') return raw;
    const route = getNetworkPositions(raw.solution, raw.start).positions;
    const additions = route.filter(([row, column]) => (
      !(row === raw.start[0] && column === raw.start[1])
      && !(row === raw.target[0] && column === raw.target[1])
      && !raw.packets.some(([packetRow, packetColumn]) => packetRow === row && packetColumn === column)
      && !raw.blocked.some(([blockedRow, blockedColumn]) => blockedRow === row && blockedColumn === column)
      && !raw.hazards.some(([hazardRow, hazardColumn]) => hazardRow === row && hazardColumn === column)
    )).slice(0, 1);
    return { ...raw, packets: [...raw.packets, ...additions] };
  }
  const challenge = { ...raw, time: difficulty === 'facil' ? Math.round(raw.time * 1.5) : Math.max(35, Math.round(raw.time * 0.7)) };
  if (difficulty === 'facil') {
    challenge.maxBlocks = (raw.maxBlocks || raw.solution?.length || 0) + 3;
    if (gameId === 'logic-game') challenge.walls = raw.walls.filter((_, index) => index % 2 === 0);
    if (gameId === 'sequence-game') {
      challenge.blocked = raw.blocked.filter((_, index) => index % 2 === 0);
      challenge.hazards = [];
    }
    return challenge;
  }
  if (gameId === 'logic-game') {
    challenge.maxBlocks = raw.solution.length;
    const safeCells = new Set(getAlgorithmPositions(raw.solution).positions.map(([row, column]) => `${row}:${column}`));
    const extraWalls = [[4, 4], [4, 0], [0, 4], [2, 4], [4, 3]]
      .filter(([row, column]) => !safeCells.has(`${row}:${column}`)
        && !raw.walls.some(([wallRow, wallColumn]) => wallRow === row && wallColumn === column)
        && !(raw.target[0] === row && raw.target[1] === column))
      .slice(0, 2);
    challenge.walls = [...raw.walls, ...extraWalls];
  }
  if (gameId === 'sequence-game') {
    challenge.maxBlocks = raw.maxBlocks;
    const safeCells = new Set(getNetworkPositions(raw.solution, raw.start).positions.map(([row, column]) => `${row}:${column}`));
    const extraBlocked = [[0, 0], [0, 4], [1, 0], [4, 4], [3, 4]]
      .filter(([row, column]) => !safeCells.has(`${row}:${column}`)
        && !raw.blocked.some(([blockedRow, blockedColumn]) => blockedRow === row && blockedColumn === column)
        && !(raw.target[0] === row && raw.target[1] === column))
      .slice(0, 2);
    challenge.blocked = [...raw.blocked, ...extraBlocked];
  }
  return challenge;
}
const debugInsights = [
  'paquetes vale 0 al inicio. Si no aumenta después de cada envío, paquetes < 4 seguirá siendo verdadero y el ciclo no termina.',
  'energia empieza en 4. Al sumarle 1 en cada vuelta, se aleja de la condición energia > 0 en vez de acercarse a cero.',
  'paquetes.length = 5; los índices válidos son 0, 1, 2, 3 y 4. Cuando i llega a 5, paquetes[i] queda fuera de rango.',
  'buscarUsuario(id) puede devolver null. En ese caso, leer usuario.activo provoca un error antes de entrar al else.',
  'resultado es la respuesta de la API. Comprueba que exista y que ok sea booleano true antes de confirmar el envío.',
  'La cola aún contiene el paquete que acabas de procesar. Volver a insertarlo impide que la condición cola.length > 0 termine.',
  'estado.latencia = 240 ms supera el límite de 200; además, un nodo caído nunca debe recibir el paquete.',
];
const progressDescriptions = {
  'logic-game': 'Programa a Kiko con bloques de movimiento; las rocas son muros intransitables.',
  'sequence-game': 'Enruta paquetes por la red usando direcciones. Evita servidores caídos y nodos inestables.',
  'bug-game': 'Analiza el diagnóstico, compara correcciones posibles y prueba tu hipótesis.',
};

export default function LogicGame({ user, token, game, level = 1, difficulty = 'medio', onBack, onNextLevel }) {
  const gameId = gameInfo[game] ? game : 'logic-game';
  const info = gameInfo[gameId];
  const requestedLevel = Number(level);
  const levelIndex = Number.isFinite(requestedLevel) ? Math.min(7, Math.max(1, Math.trunc(requestedLevel))) - 1 : 0;
  const challenge = getAdjustedChallenge(gameId, levelIndex, difficulty);
  const start = gameId === 'sequence-game' ? challenge.start : [0, 0];
  const [commands, setCommands] = useState([]);
  const [position, setPosition] = useState(start);
  const [direction, setDirection] = useState(0);
  const [remaining, setRemaining] = useState(challenge.time);
  const [mistakes, setMistakes] = useState(0);
  const [runMistakes, setRunMistakes] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(gameId === 'bug-game' ? challenge.bug : null);
  const [replacement, setReplacement] = useState('');
  const [result, setResult] = useState(null);
  const [activeCommand, setActiveCommand] = useState(-1);
  const [debugStepIndex, setDebugStepIndex] = useState(-1);
  const [stepRunning, setStepRunning] = useState(false);
  const [collectedItems, setCollectedItems] = useState([]);
  const [saveError, setSaveError] = useState('');
  const ended = useRef(false);
  const remainingRef = useRef(challenge.time);
  const commandsRef = useRef([]);
  const collectedItemsRef = useRef([]);
  const elapsedRef = useRef(0);
  const pendingDurationRef = useRef(0);
  const mistakesRef = useRef(0);
  const runMistakesRef = useRef(0);
  const pendingMistakeTypesRef = useRef({});
  const pendingAttemptsRef = useRef(0);
  const [mobileHazardIndex, setMobileHazardIndex] = useState(0);
  const mobileHazardRef = useRef(null);
  const mobileHazardCells = useMemo(() => {
    if (difficulty !== 'medio' || (gameId !== 'sequence-game' && gameId !== 'logic-game')) return [];
    const levelChallenge = gameId === 'sequence-game' ? networkLevels[levelIndex] : algorithmLevels[levelIndex];
    const routeCells = new Set((gameId === 'sequence-game'
      ? getNetworkPositions(levelChallenge.solution, levelChallenge.start).positions
      : getAlgorithmPositions(levelChallenge.solution).positions).map(([row, column]) => `${row}:${column}`));
    const reserved = gameId === 'sequence-game'
      ? [...levelChallenge.blocked, ...levelChallenge.hazards, ...levelChallenge.packets, levelChallenge.start, levelChallenge.target]
      : [...levelChallenge.walls, ...levelChallenge.diamonds, levelChallenge.target];
    const reservedCells = reserved.map(([row, column]) => `${row}:${column}`);
    return Array.from({ length: 25 }, (_, index) => [Math.floor(index / 5), index % 5])
      .filter(([row, column]) => !routeCells.has(`${row}:${column}`)
        && !reservedCells.includes(`${row}:${column}`))
      .slice(0, 4);
  }, [gameId, difficulty, levelIndex]);

  useEffect(() => {
    if (!mobileHazardCells.length) {
      mobileHazardRef.current = null;
      return undefined;
    }
    mobileHazardRef.current = mobileHazardCells[0];
    const interval = window.setInterval(() => {
      setMobileHazardIndex((current) => {
        const next = (current + 1) % mobileHazardCells.length;
        mobileHazardRef.current = mobileHazardCells[next];
        return next;
      });
    }, 2500);
    return () => window.clearInterval(interval);
  }, [mobileHazardCells]);
  const mobileHazard = mobileHazardCells[mobileHazardIndex % Math.max(mobileHazardCells.length, 1)];
  const errorLimit = gameId === 'bug-game' ? null : difficulty === 'facil' ? 5 : difficulty === 'dificil' ? 2 : 3;
  const remainingErrors = errorLimit === null ? null : Math.max(0, errorLimit - runMistakes);
  const isNetworkHazard = (row, column) => challenge.hazards.some(([hazardRow, hazardColumn]) => hazardRow === row && hazardColumn === column)
    || (mobileHazardRef.current?.[0] === row && mobileHazardRef.current?.[1] === column);
  const isMovingRock = (row, column) => gameId === 'logic-game'
    && mobileHazardRef.current?.[0] === row && mobileHazardRef.current?.[1] === column;

  const updateCommands = (update) => {
    const next = typeof update === 'function' ? update(commandsRef.current) : update;
    commandsRef.current = next;
    setCommands(next);
  };
  const updateCollectedItems = (items) => {
    collectedItemsRef.current = items;
    setCollectedItems(items);
  };
  const addAlgorithmRouteStep = (row, column) => {
    if (running || saving || result) return;
    const planned = getAlgorithmPositions(commandsRef.current);
    const rowDelta = row - planned.row;
    const columnDelta = column - planned.column;
    if (Math.abs(rowDelta) + Math.abs(columnDelta) !== 1) {
      setFeedback('Traza la ruta tocando una casilla vecina a la última que planeaste.');
      return;
    }
    if (row < 0 || row > 4 || column < 0 || column > 4
      || challenge.walls.some(([wallRow, wallColumn]) => wallRow === row && wallColumn === column)
      || isMovingRock(row, column)) {
      setFeedback('Esa casilla está bloqueada. Las rocas y los bordes son muros reales.');
      return;
    }
    const desiredFacing = rowDelta === 0 ? (columnDelta > 0 ? 0 : 2) : (rowDelta > 0 ? 1 : 3);
    const turn = (desiredFacing - planned.facing + 4) % 4;
    const turns = turn === 1 ? ['GIRAR_DER'] : turn === 2 ? ['GIRAR_DER', 'GIRAR_DER'] : turn === 3 ? ['GIRAR_IZQ'] : [];
    if (commandsRef.current.length + turns.length + 1 > maxBlocks) {
      setFeedback(`Límite de ${maxBlocks} bloques. Optimiza la ruta o elimina un paso.`);
      return;
    }
    updateCommands([...commandsRef.current, ...turns, 'AVANZAR']);
    setFeedback(`Ruta añadida: Kiko girará ${turn ? `${turn} cuarto(s)` : 'no necesita girar'} y avanzará una casilla.`);
  };
  const addNetworkRouteStep = (row, column) => {
    if (running || saving || result) return;
    const planned = getNetworkPositions(commandsRef.current, challenge.start);
    const rowDelta = row - planned.row;
    const columnDelta = column - planned.column;
    if (Math.abs(rowDelta) + Math.abs(columnDelta) !== 1) {
      setFeedback('Toca un nodo vecino al final de tu ruta para añadir el siguiente salto.');
      return;
    }
    if (row < 0 || row > 4 || column < 0 || column > 4
      || challenge.blocked.some(([blockedRow, blockedColumn]) => blockedRow === row && blockedColumn === column)) {
      setFeedback('Ese servidor no está disponible. Busca un nodo vecino conectado.');
      return;
    }
    if (commandsRef.current.length >= maxBlocks) {
      setFeedback(`La ruta llegó al límite de ${maxBlocks} movimientos.`);
      return;
    }
    const command = rowDelta < 0 ? 'NORTE' : rowDelta > 0 ? 'SUR' : columnDelta < 0 ? 'OESTE' : 'ESTE';
    updateCommands([...commandsRef.current, command]);
    setFeedback(`Salto agregado hacia ${networkDirectionLabels[command]}.`);
  };

  useEffect(() => {
    if (!stepRunning) return undefined;
    const timer = window.setTimeout(() => {
      if (debugStepIndex >= challenge.code.length - 1) {
        setStepRunning(false);
        setFeedback('Ejecución finalizada. La línea marcada muestra dónde se desvía el programa.');
        return;
      }
      setDebugStepIndex((current) => current + 1);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [stepRunning, debugStepIndex, challenge.code]);

  useEffect(() => {
    let active = true;
    getStudentProgress(token).then((data) => {
      if (!active || !Array.isArray(data.progress)) return;
      const previous = data.progress.find((item) => item.game_name === gameId && Number(item.level) === levelIndex + 1);
      if (!previous) return;
      mistakesRef.current = Number(previous.mistakes) || 0;
      elapsedRef.current = Number(previous.duration_seconds) || 0;
      setMistakes(mistakesRef.current);
    }).catch((error) => {
      console.error('No se pudieron cargar las métricas previas del nivel:', error);
    });
    return () => { active = false; };
  }, [gameId, levelIndex, token]);

  const finish = async (status, achievement = {}) => {
    if (ended.current) return;
    ended.current = true;
    const reason = status === 'lost' ? achievement.reason || 'timeout' : null;
    if (status === 'lost' && reason === 'timeout') {
      mistakesRef.current += 1;
      pendingMistakeTypesRef.current.timeout = (pendingMistakeTypesRef.current.timeout || 0) + 1;
      setMistakes(mistakesRef.current);
    }
    const instructionCount = achievement.instructionCount ?? commandsRef.current.length;
    const scoring = calculateScore({
      completed: status === 'won',
      timeLimit: difficulty === 'facil' ? 1000000000 : challenge.time,
      elapsedSeconds: elapsedRef.current,
      instructionCount,
      optimalInstructions: achievement.optimalInstructions ?? challenge.solution?.length ?? 1,
      mistakes: mistakesRef.current,
      efficient: Boolean(achievement.efficient),
      firstTry: difficulty !== 'dificil' && mistakesRef.current === 0,
      collectible: difficulty !== 'dificil' && Boolean(achievement.collectible),
    });
    setScore(scoring.score);
    const items = achievement.items ?? collectedItemsRef.current.length;
    const elapsedSeconds = elapsedRef.current;
    setResult({ status, reason, score: scoring.score, saved: false, items, multiplier: scoring.multiplier, elapsedSeconds });
    setSaveError('');
    setSaving(true);
    const currentMistakeTypes = { ...pendingMistakeTypesRef.current };
    const currentMistakes = Object.values(currentMistakeTypes).reduce((sum, count) => sum + count, 0);
    const currentDuration = pendingDurationRef.current;
    const currentAttempts = pendingAttemptsRef.current;
    try {
      const response = await saveProgress(token, {
        game_name: gameId,
        level: levelIndex + 1,
        score: scoring.score,
        mistakes: currentMistakes,
        mistake_types: currentMistakeTypes,
        duration_seconds: currentDuration,
        attempts: currentAttempts,
        multiplier: scoring.multiplier,
        instruction_count: instructionCount,
        completed: status === 'won',
      });
      if (response.error) throw new Error(response.error);
      pendingMistakeTypesRef.current = {};
      pendingDurationRef.current = 0;
      pendingAttemptsRef.current = 0;
      setResult({
        status,
        reason,
        score: scoring.score,
        saved: true,
        items,
        multiplier: scoring.multiplier,
        elapsedSeconds,
        rewardPoints: response.reward_points || 0,
      });
      if (status === 'won') confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No pudimos registrar este intento en el servidor.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (result) return undefined;
    const timer = window.setInterval(() => {
      elapsedRef.current += 1;
      pendingDurationRef.current += 1;
      if (difficulty !== 'facil') {
        remainingRef.current = Math.max(0, remainingRef.current - 1);
        setRemaining(remainingRef.current);
      }
      if (difficulty !== 'facil' && remainingRef.current === 0) {
        window.clearInterval(timer);
        finish('lost');
      }
    }, 1000);
    return () => window.clearInterval(timer);
  // The timer belongs to one mounted level; result stops it when the game ends.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, difficulty]);

  const penalize = (type, message) => {
    if (ended.current) return;
    mistakesRef.current += 1;
    runMistakesRef.current += 1;
    pendingMistakeTypesRef.current[type] = (pendingMistakeTypesRef.current[type] || 0) + 1;
    setMistakes(mistakesRef.current);
    setRunMistakes(runMistakesRef.current);
    if (difficulty !== 'facil') {
      remainingRef.current = Math.max(1, remainingRef.current - 4);
      setRemaining(remainingRef.current);
    }
    const exhausted = errorLimit !== null && runMistakesRef.current >= errorLimit;
    if (exhausted) {
      setFeedback(`${message} Alcanzaste el límite de ${errorLimit} errores de este intento.`);
      setRunning(false);
      setActiveCommand(-1);
      finish('lost', { reason: 'errors' });
      return;
    }
    const retryHint = remainingErrors !== null
      ? ` Te quedan ${Math.max(0, errorLimit - runMistakesRef.current)} errores antes de terminar el intento.`
      : '';
    setFeedback(`${message}${difficulty === 'facil' ? ' Penalización leve.' : ' −4 segundos.'}${retryHint} Revisa tu estrategia e inténtalo de nuevo.`);
  };

  const resetCode = () => {
    setStepRunning(false);
    setDebugStepIndex(-1);
    updateCommands([]);
    setFeedback('');
    setPosition(start);
    setDirection(0);
    setSelectedBlock(null);
    setReplacement('');
    setActiveCommand(-1);
    updateCollectedItems([]);
  };

  const runAlgorithm = () => {
    const program = Array.isArray(commandsRef.current) ? [...commandsRef.current] : [];
    if (!program.length || running || ended.current) return;
    pendingAttemptsRef.current += 1;
    setRunning(true);
    setFeedback('Ejecutando tu algoritmo línea a línea…');
    let row = 0;
    let column = 0;
    let facing = 0;
    let diamonds = 0;
    const collected = new Set();
    const execute = (index) => {
      if (ended.current) {
        setRunning(false);
        return;
      }
      if (index >= program.length) {
        setRunning(false);
        setActiveCommand(-1);
        if (row === challenge.target[0] && column === challenge.target[1]) {
          const efficient = program.length <= challenge.solution.length;
          finish('won', { instructionCount: program.length, optimalInstructions: challenge.solution.length, efficient, collectible: diamonds > 0, items: diamonds });
        } else {
          penalize('wrong_route', 'El algoritmo terminó en otra casilla. Revisa la posición y orientación del robot.');
        }
        return;
      }
      setActiveCommand(index);
      const command = program[index];
      if (command === 'GIRAR_DER') facing = (facing + 1) % 4;
      else if (command === 'GIRAR_IZQ') facing = (facing + 3) % 4;
      else if (command === 'AVANZAR') {
        const delta = algorithmDeltas[facing];
        if (!delta || !Number.isInteger(row) || !Number.isInteger(column)) {
          console.error('Estado de movimiento inválido al ejecutar Algoritmos del explorador.');
          setRunning(false);
          setActiveCommand(-1);
          setFeedback('No pudimos ejecutar ese movimiento. Reinicia la ruta e inténtalo de nuevo.');
          return;
        }
        const nextRow = row + delta[0];
        const nextColumn = column + delta[1];
        if (!Number.isInteger(nextRow) || !Number.isInteger(nextColumn)
          || nextRow < 0 || nextRow > 4 || nextColumn < 0 || nextColumn > 4
          || !Array.isArray(challenge.walls)
          || challenge.walls.some(([wallRow, wallColumn]) => wallRow === nextRow && wallColumn === nextColumn)
          || isMovingRock(nextRow, nextColumn)) {
          setRunning(false);
          setActiveCommand(-1);
          penalize('collision', '¡Choque! Las rocas y los bordes son muros intransitables.');
          return;
        }
        row = nextRow;
        column = nextColumn;
        const key = `${row}-${column}`;
        if (challenge.diamonds.some(([diamondRow, diamondColumn]) => diamondRow === row && diamondColumn === column) && !collected.has(key)) {
          collected.add(key);
          diamonds += 1;
          updateCollectedItems([...collected]);
          confetti({ particleCount: 14, spread: 48, startVelocity: 18, scalar: 0.65, origin: { x: 0.5, y: 0.65 }, colors: ['#46a7e8', '#efbd47', '#7f6ce0'] });
        }
        setPosition([row, column]);
      } else {
        console.error('Instrucción inválida al ejecutar Algoritmos del explorador:', command);
        setRunning(false);
        setActiveCommand(-1);
        setFeedback('La ruta contiene una instrucción desconocida. Elimínala y vuelve a intentarlo.');
        return;
      }
      setDirection(facing);
      window.setTimeout(() => execute(index + 1), 360);
    };
    execute(0);
  };

  const runNetworkRoute = () => {
    if (!commands.length || running || ended.current) return;
    pendingAttemptsRef.current += 1;
    setRunning(true);
    setFeedback('Enrutando paquetes por la red…');
    let row = challenge.start[0];
    let column = challenge.start[1];
    let itemCount = 0;
    const collected = new Set();
    const execute = (index) => {
      if (ended.current) {
        setRunning(false);
        return;
      }
      if (index >= commands.length) {
        setRunning(false);
        setActiveCommand(-1);
        if (row === challenge.target[0] && column === challenge.target[1]) {
          const efficient = commands.length <= challenge.solution.length;
          finish('won', { instructionCount: commands.length, optimalInstructions: challenge.solution.length, efficient, collectible: itemCount > 0, items: itemCount });
        } else {
          penalize('wrong_route', 'El paquete terminó en otro servidor. Comprueba las coordenadas del destino.');
        }
        return;
      }
      setActiveCommand(index);
      const movement = networkDirections[commandsRef.current[index]];
      if (!movement || !Number.isInteger(row) || !Number.isInteger(column)) {
        console.error('Movimiento o coordenadas inválidas al ejecutar Red de servidores.');
        setRunning(false);
        setActiveCommand(-1);
        setFeedback('La ruta contiene un movimiento inválido. Corrígela antes de enviarla.');
        return;
      }
      const [rowDelta, columnDelta] = movement;
      const nextRow = row + rowDelta;
      const nextColumn = column + columnDelta;
      const blocked = challenge.blocked.some(([blockedRow, blockedColumn]) => blockedRow === nextRow && blockedColumn === nextColumn);
      if (nextRow < 0 || nextRow > 4 || nextColumn < 0 || nextColumn > 4 || blocked) {
        setRunning(false);
        setActiveCommand(-1);
        penalize(blocked ? 'network_outage' : 'wrong_route', blocked ? 'Servidor caído: ese nodo no puede transportar el paquete.' : 'La ruta sale del mapa de la red.');
        return;
      }
      row = nextRow;
      column = nextColumn;
      const key = `${row}-${column}`;
      if (isNetworkHazard(row, column) && !collected.has(`hazard-${key}`)) {
        collected.add(`hazard-${key}`);
        penalize('network_outage', 'Nodo inestable: el paquete sufrió latencia adicional.');
        if (ended.current) {
          setRunning(false);
          setActiveCommand(-1);
          return;
        }
      }
      if (challenge.packets.some(([packetRow, packetColumn]) => packetRow === row && packetColumn === column) && !collected.has(`packet-${key}`)) {
        collected.add(`packet-${key}`);
        itemCount += 1;
        updateCollectedItems([...collected].filter((item) => item.startsWith('packet-')));
        confetti({ particleCount: 12, spread: 44, startVelocity: 16, scalar: 0.6, origin: { x: 0.5, y: 0.65 }, colors: ['#46a7e8', '#efbd47'] });
      }
      setPosition([row, column]);
      window.setTimeout(() => execute(index + 1), 320);
    };
    execute(0);
  };

  const tryRepair = () => {
    if (selectedBlock === null || !replacement || ended.current) return;
    pendingAttemptsRef.current += 1;
    const option = challenge.options.find((item) => item.id === replacement);
    if (selectedBlock === challenge.bug && option?.correct) {
      setFeedback(`¡Prueba superada! ${option.explanation || challenge.explanation}`);
      finish('won', { instructionCount: selectedBlock + 1, optimalInstructions: selectedBlock + 1, efficient: Boolean(option.efficient) });
    } else {
      penalize('wrong_fix', 'La prueba sigue fallando. Revisa las condiciones y el tipo de dato.');
    }
  };

  const retry = () => {
    ended.current = false;
    runMistakesRef.current = 0;
    setRunMistakes(0);
    setResult(null);
    setSaveError('');
    remainingRef.current = challenge.time;
    setRemaining(challenge.time);
    setRunning(false);
    resetCode();
  };
  const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const maxBlocks = challenge.maxBlocks || challenge.solution?.length + Math.max(1, 4 - levelIndex);
  const plannedAlgorithmRoute = getAlgorithmPositions(commands).positions;
  const plannedNetworkRoute = getNetworkPositions(commands, challenge.start || [0, 0]).positions;
  const robotPosition = Array.isArray(position) && position.length === 2 && position.every(Number.isInteger)
    ? position
    : start;
  const missionText = gameId === 'logic-game'
    ? `Guía a Kiko hasta la meta${difficulty === 'dificil' ? ` con máximo ${maxBlocks} instrucciones` : ''}, evitando las rocas.`
    : gameId === 'sequence-game'
      ? `Lleva el paquete al servidor destino con máximo ${maxBlocks} saltos; evita los nodos caídos.`
      : 'Encuentra la línea defectuosa y prueba una corrección que haga pasar el programa.';
  const programmingConcept = gameId === 'logic-game'
    ? 'Concepto: secuencia de instrucciones y condición de ruta segura; si hay una roca, elige otro camino.'
    : 'Concepto: algoritmos de enrutamiento y tolerancia a fallos; evita nodos caídos y controla el presupuesto de saltos.';
  const lossDescription = result?.reason === 'errors'
    ? `Llegaste al límite de ${errorLimit} errores permitidos en este intento.`
    : `Revisa tu estrategia y vuelve a intentarlo en el nivel ${levelIndex + 1}.`;

  return <div className="main-content game-screen"><div className="game-toolbar"><button className="back-button" onClick={onBack}>← Volver a mis juegos</button><GameGuide userId={user.id} gameId={gameId} level={levelIndex + 1} /><ThemeToggle /><span className={`timer-pill ${difficulty !== 'facil' && remaining <= 20 ? 'timer-urgent' : ''}`}>{difficulty === 'facil' ? '∞ Sin límite' : `◷ ${formatTime(remaining)}`}</span></div><section className="game-panel">
    <div className="game-title-row"><span style={{ fontSize: 32 }}>{info.icon}</span><div><h1>{info.title}</h1><span className="stat-note">{info.skill} · Nivel {levelIndex + 1} de 7</span><span className={`difficulty-badge difficulty-${difficulty}`}>Dificultad asignada por el docente · {difficultyNames[difficulty] || 'Media'}</span></div><div className="game-live-stats"><span>⭐ {score ? `${score.toFixed(1)}%` : '—'}</span><span>⚠ {mistakes} errores</span>{errorLimit !== null && <span className="error-budget" aria-live="polite">{remainingErrors}/{errorLimit} errores disponibles</span>}<span className={`diamond-counter ${collectedItems.length ? 'active' : ''}`}>{gameId === 'sequence-game' ? '📦' : '💎'} {collectedItems.length}</span></div></div>
    <div className="mission-banner"><strong>🎯 Misión</strong><span>{missionText}</span></div>
    <p className="game-subtitle">{user.name?.split(' ')[0]}, {progressDescriptions[gameId]}</p>
    <div className="progress-track"><div className="progress-fill" style={{ width: `${(levelIndex + 1) / 7 * 100}%` }} /></div>

    {gameId === 'logic-game' && <>
      <div className="notice"><strong>{challenge.name} · NIVEL {levelIndex + 1} · {commands.length}/{maxBlocks} BLOQUES · MODO {difficultyNames[difficulty] || 'Media'}</strong><br />{difficulty === 'dificil' ? 'Modo difícil: mapa parcialmente oculto, movimientos limitados y rutas de exploración.' : difficulty === 'medio' ? `${challenge.hint} 💎 Hay un diamante extra y una roca móvil: revisa el mapa antes de ejecutar.` : challenge.hint}<span className="control-legend"><b>Toca una casilla vecina</b> para trazar el camino; el sistema añade los giros y avances automáticamente.</span><span className="control-legend"><b>Presupuesto de código:</b> {maxBlocks} bloques y {errorLimit} errores permitidos. {programmingConcept}</span></div>
      <div className="board" data-tutorial="explorer-board"><div className="mini-label">MAPA · las rocas bloquean el paso; la flecha muestra la orientación</div><div className="logic-grid">{Array.from({ length: 25 }, (_, index) => {
        const row = Math.floor(index / 5);
        const column = index % 5;
        const isWall = challenge.walls.some(([wallRow, wallColumn]) => wallRow === row && wallColumn === column)
          || (mobileHazard?.[0] === row && mobileHazard?.[1] === column);
        const isRobot = robotPosition[0] === row && robotPosition[1] === column;
        const isGoal = challenge.target[0] === row && challenge.target[1] === column;
        const key = `${row}-${column}`;
        const isDiamond = challenge.diamonds.some(([diamondRow, diamondColumn]) => diamondRow === row && diamondColumn === column) && !collectedItems.includes(key);
        const plannedIndex = plannedAlgorithmRoute.findIndex(([plannedRow, plannedColumn]) => plannedRow === row && plannedColumn === column);
        const planHead = plannedAlgorithmRoute[plannedAlgorithmRoute.length - 1] || robotPosition;
        const fogged = difficulty === 'dificil' && !isRobot && !isGoal && Math.abs(planHead[0] - row) + Math.abs(planHead[1] - column) > 1;
        return <button type="button" className={`logic-tile ${isWall ? 'tile-wall' : ''} ${isRobot ? 'tile-robot' : ''} ${isGoal ? 'tile-goal' : ''} ${plannedIndex > 0 ? 'tile-route-planned' : ''} ${fogged ? 'tile-fogged' : ''} ${collectedItems.includes(key) ? 'tile-diamond-collected' : ''}`} key={index} disabled={running || saving || fogged || isWall} onClick={() => addAlgorithmRouteStep(row, column)} aria-label={fogged ? 'Casilla oculta: explora para descubrirla' : isWall ? 'Roca: bloquea el paso' : isRobot ? `Kiko mirando ${directions[direction]}` : isGoal ? 'Meta, toca si es vecina para trazar' : isDiamond ? 'Diamante, toca si es vecino para trazar' : 'Casilla libre, toca si es vecina para trazar'} title={fogged ? 'Explora el mapa' : 'Toca para trazar la ruta'}>{isRobot ? <span className="robot-marker">🤖<b>{directions[direction]}</b></span> : fogged ? '❔' : isWall ? '🪨' : isGoal ? '🏁' : isDiamond ? '💎' : plannedIndex > 0 ? <small>{plannedIndex}</small> : ''}</button>;
      })}</div></div>
      <div className="mini-label">RUTA PROGRAMADA · cada casilla tocada genera los comandos necesarios</div>
      <div className="sequence-display" data-tutorial="planned-route">{commands.length ? commands.map((command, index) => <button className={`sequence-item code-line ${activeCommand === index ? 'active-code-line' : ''}`} key={`${command}-${index}`} disabled={running} onClick={() => updateCommands((items) => items.filter((_, itemIndex) => itemIndex !== index))}>{index + 1}. {commandLabels[command]} ×</button>) : <span className="muted">Toca casillas vecinas para construir una ruta como secuencia de instrucciones.</span>}</div>
      <div className="game-controls" data-tutorial="run-program"><button className="primary-btn" disabled={!commands.length || running || saving} onClick={runAlgorithm}>{running ? 'Ejecutando línea a línea…' : '▶ Ejecutar programa'}</button><button className="secondary-btn" disabled={running || saving} onClick={resetCode}>Reiniciar</button></div>
    </>}

    {gameId === 'sequence-game' && <>
      <div className="notice"><strong>Red de servidores · NIVEL {levelIndex + 1} · {commands.length}/{maxBlocks} SALTOS · MODO {difficultyNames[difficulty] || 'Media'}</strong><br />{difficulty === 'dificil' ? 'Modo difícil: servidores ocultos hasta acercarte y movimientos limitados.' : challenge.hint}<span className="control-legend"><b>Toca un nodo vecino</b> para enrutar el siguiente salto; las conexiones se agregan en orden.</span><span className="control-legend"><b>Presupuesto de ruta:</b> {maxBlocks} saltos y {errorLimit} errores permitidos. {programmingConcept}</span></div>
      <div className="board network-board" data-tutorial="network-board"><div className="mini-label">RED DE NODOS · 🛑 servidor caído · ⚡ conexión inestable · 📦 paquete extra</div><div className="network-grid">{Array.from({ length: 25 }, (_, index) => {
        const row = Math.floor(index / 5);
        const column = index % 5;
        const blocked = challenge.blocked.some(([blockedRow, blockedColumn]) => blockedRow === row && blockedColumn === column);
        const hazard = challenge.hazards.some(([hazardRow, hazardColumn]) => hazardRow === row && hazardColumn === column)
          || (mobileHazard?.[0] === row && mobileHazard?.[1] === column);
        const startNode = challenge.start[0] === row && challenge.start[1] === column;
        const targetNode = challenge.target[0] === row && challenge.target[1] === column;
        const currentNode = robotPosition[0] === row && robotPosition[1] === column;
        const key = `${row}-${column}`;
        const packet = challenge.packets.some(([packetRow, packetColumn]) => packetRow === row && packetColumn === column) && !collectedItems.includes(`packet-${key}`);
        const plannedIndex = plannedNetworkRoute.reduce((lastIndex, [plannedRow, plannedColumn], routeIndex) => (
          plannedRow === row && plannedColumn === column ? routeIndex : lastIndex
        ), -1);
        const routeHead = plannedIndex > 0 && plannedIndex === plannedNetworkRoute.length - 1;
        const planHead = plannedNetworkRoute[plannedNetworkRoute.length - 1] || robotPosition;
        const fogged = difficulty === 'dificil' && !currentNode && !targetNode && Math.abs(planHead[0] - row) + Math.abs(planHead[1] - column) > 1;
        const nodeDescription = fogged ? 'Nodo oculto' : blocked ? 'Servidor caído' : hazard ? 'Nodo inestable' : currentNode ? 'Paquete actual' : targetNode ? 'Servidor destino' : startNode ? 'Servidor de origen' : packet ? 'Paquete extra' : 'Nodo disponible';
        const routeDescription = plannedIndex > 0 ? `Paso ${plannedIndex} de la ruta${routeHead ? ', último nodo planificado' : ''}` : '';
        return <button type="button" key={index} disabled={running || saving || blocked || fogged} onClick={() => addNetworkRouteStep(row, column)} title={fogged ? 'Explora la red para revelar el nodo' : plannedIndex > 0 ? `Paso ${plannedIndex}${routeHead ? ' · final de la ruta' : ''}` : 'Toca para trazar un salto'} aria-label={`${nodeDescription}, fila ${row + 1}, columna ${column + 1}${routeDescription ? `, ${routeDescription}` : ''}`} aria-current={routeHead ? 'step' : undefined} className={`network-tile ${blocked ? 'network-down' : ''} ${hazard ? 'network-hazard' : ''} ${targetNode ? 'network-target' : ''} ${currentNode ? 'network-current' : ''} ${plannedIndex > 0 ? 'network-route-planned' : ''} ${routeHead ? 'network-route-current' : ''} ${fogged ? 'network-fogged' : ''}`}>{currentNode ? <span className="network-cursor">📡{hazard ? '⚡' : ''}</span> : fogged ? '❔' : blocked ? '🛑' : hazard ? '⚡' : packet ? '📦' : startNode ? '🖥️' : targetNode ? '🎯' : plannedIndex > 0 ? plannedIndex : '·'}</button>;
      })}</div><div className="network-status" aria-live="polite"><strong>{commands.length ? `Ruta seleccionada: ${commands.length} saltos · último nodo ${plannedNetworkRoute[plannedNetworkRoute.length - 1][0] + 1}.${plannedNetworkRoute[plannedNetworkRoute.length - 1][1] + 1}` : 'Aún no hay saltos planificados'}</strong><span>Origen: nodo {challenge.start[0] + 1}.{challenge.start[1] + 1} · Destino: nodo {challenge.target[0] + 1}.{challenge.target[1] + 1}</span></div></div>
      <div className="mini-label">RUTA DE DATOS · Toca nodos vecinos para planificar</div>
      <div className="sequence-display" data-tutorial="network-route">{commands.length ? commands.map((command, index) => <button className={`sequence-item code-line ${activeCommand === index ? 'active-code-line' : ''}`} key={`${command}-${index}`} disabled={running} onClick={() => updateCommands((items) => items.filter((_, itemIndex) => itemIndex !== index))}>{index + 1}. {networkDirectionLabels[command]} ×</button>) : <span className="muted">Toca nodos vecinos para planear la ruta del paquete.</span>}</div>
      <div className="game-controls" data-tutorial="run-network"><button className="primary-btn" disabled={!commands.length || running || saving} onClick={runNetworkRoute}>{running ? 'Enrutando paquete…' : '▶ Enviar paquete'}</button><button className="secondary-btn" disabled={running || saving} onClick={resetCode}>Reiniciar ruta</button></div>
    </>}

    {gameId === 'bug-game' && <>
      <div className="notice"><strong>Clínica de código · NIVEL {levelIndex + 1} · {challenge.options.length} HIPÓTESIS</strong><br />Lee el diagnóstico, selecciona la línea marcada y compara las correcciones. Hay más de una solución válida; algunas son más eficientes.</div>
      <div className="debug-workbench" data-tutorial="debug-code"><div className="board code-editor"><div className="editor-top"><span /><span /><span /><small>network-router.js</small></div>{challenge.code.map((line, index) => <button key={index} className={`editor-line ${index === challenge.bug ? 'line-bug' : ''} ${selectedBlock === index ? 'line-selected' : ''} ${debugStepIndex === index ? 'debug-step-active' : ''}`} onClick={() => { setSelectedBlock(index); setReplacement(''); setFeedback(''); setStepRunning(false); setDebugStepIndex(index); }} aria-label={`Inspeccionar línea ${index + 1}: ${line}`}><span className="line-number">{String(index + 1).padStart(2, '0')}</span><code>{line}</code>{index === challenge.bug && <span className="bug-marker">BUG</span>}{selectedBlock === index && <span className="line-cursor">▌</span>}</button>)}</div>
        <aside className="debug-inspector" aria-live="polite"><div className="debug-inspector-heading">🔎 Lupa de variables</div>{selectedBlock === null ? <p>Toca una línea para inspeccionar qué está pasando en ese punto.</p> : <><strong>Línea {selectedBlock + 1}{selectedBlock === challenge.bug ? ' · posible error' : ''}</strong><p>{selectedBlock === challenge.bug ? debugInsights[levelIndex] : `Esta instrucción forma parte del flujo. Compara su efecto con la línea marcada y con el mensaje de prueba.`}</p><small>Diagnóstico: {challenge.error}</small></>}</aside></div>
      <div className="console-panel"><div className="console-heading"><span>●</span> Diagnóstico de la prueba</div><p><strong>¿Qué falla?</strong> {challenge.error}</p><small>Inspecciona una línea, ejecuta el programa paso a paso y elige una corrección razonada.</small></div>
      {selectedBlock === challenge.bug && <><div className="mini-label">ELIGE UNA HIPÓTESIS PARA LA LÍNEA {selectedBlock + 1}</div><div className="hypothesis-grid" data-tutorial="debug-hypotheses">{challenge.options.map((option, index) => <button type="button" className={`hypothesis-card ${replacement === option.id ? 'selected' : ''}`} key={option.id} onClick={() => setReplacement(option.id)} aria-pressed={replacement === option.id}><span className="hypothesis-label">OPCIÓN {String.fromCharCode(65 + index)}</span><span className="hypothesis-diff"><small>ANTES</small><code>{challenge.code[challenge.bug].trim()}</code><small>DESPUÉS</small><code>{option.label}</code></span><span className="hypothesis-explanation">{option.explanation || 'Comprueba si esta modificación elimina el error sin cambiar el comportamiento esperado.'}</span></button>)}</div></>}
      <div className="game-controls" data-tutorial="debug-run"><button className="secondary-btn step-run-button" disabled={stepRunning || saving} onClick={() => { setDebugStepIndex(-1); setStepRunning(true); setFeedback('Ejecutando el programa línea por línea…'); }}>⏵ Paso a paso</button><button className="primary-btn" disabled={selectedBlock === null || !replacement || saving} onClick={tryRepair}>{saving ? 'Guardando…' : '▶ Probar corrección'}</button><button className="secondary-btn" disabled={saving} onClick={resetCode}>Reiniciar depuración</button></div>
    </>}

    {feedback && <div className={`feedback ${result?.status === 'won' ? 'alert success' : ''}`} role="status">{feedback}</div>}
  </section>
  {result && <div className={`result-overlay ${result.status}`} role="dialog" aria-modal="true" aria-labelledby="result-title"><div className="result-card"><div className="result-emblem">{result.status === 'won' ? '🏆' : result.reason === 'errors' ? '⛔' : '⏰'}</div><div className="eyebrow">{result.status === 'won' ? 'MISIÓN COMPLETADA' : result.reason === 'errors' ? 'LÍMITE DE ERRORES' : 'TIEMPO AGOTADO'}</div><h2 id="result-title">{result.status === 'won' ? '¡Lo lograste!' : '¡Esta vez no alcanzó!'}</h2><p>{result.status === 'won' ? 'Resolviste el reto de programación.' : lossDescription}</p><div className="result-score"><span>Efectividad</span><strong>{result.score.toFixed(1)}%</strong><small>de 100% · {mistakes} errores · {result.elapsedSeconds}s</small>{result.items > 0 && <small className="result-diamonds">📦 {result.items} ítems recogidos · x{result.multiplier}</small>}{result.multiplier === 2 && <small className="result-diamonds">⚡ Multiplicador x2 activado</small>}</div>{saveError && <div className="alert error" role="alert">{saveError}</div>}{saving && <div className="muted">Guardando tu resultado…</div>}{result.saved && <div className="alert success" role="status">Resultado guardado. {result.rewardPoints > 0 ? `Ganaste ${result.rewardPoints} puntos para tu avatar. ` : ''}El panel docente recibirá los errores y el tiempo acumulados.</div>}<div className="result-actions">{result.status === 'won' && levelIndex < 6 && <button className="primary-btn next-level-button" disabled={saving || !result.saved} onClick={() => onNextLevel(gameId, levelIndex + 2)}>Siguiente nivel →</button>}<button className={result.status === 'won' && levelIndex < 6 ? 'secondary-btn' : 'primary-btn'} disabled={saving} onClick={retry}>↻ {result.status === 'won' ? 'Jugar de nuevo' : 'Intentar de nuevo'}</button><button className="secondary-btn" disabled={saving} onClick={onBack}>{result.status === 'won' && levelIndex === 6 ? 'Volver al mapa' : 'Volver a mis juegos'}</button></div></div></div>}
  </div>;
}
