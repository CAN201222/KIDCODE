import { useEffect, useState } from 'react';

const gameGuides = {
  'logic-game': [
    { target: 'explorer-board', title: 'Este es tu tablero', text: 'Kiko empieza en la esquina. Las rocas bloquean el paso y la bandera marca la meta.' },
    { target: 'planned-route', title: 'Traza tu ruta', text: 'Toca una casilla vecina para planear el siguiente paso. Los giros se agregan automáticamente.' },
    { target: 'run-program', title: 'Ejecuta y aprende', text: 'Pulsa Ejecutar para ver cada instrucción. Una ruta eficiente, el primer intento o los diamantes pueden activar x2.' },
  ],
  'sequence-game': [
    { target: 'network-board', title: 'Lee el mapa de la red', text: 'El origen envía un paquete al destino. Evita servidores caídos y vigila los nodos inestables.' },
    { target: 'network-route', title: 'Diseña la ruta', text: 'Toca nodos vecinos, uno por uno. Cada salto queda marcado antes de ejecutar.' },
    { target: 'run-network', title: 'Envía el paquete', text: 'Pulsa Enviar para probar tu ruta. La eficiencia, el primer intento y los paquetes extra ayudan a obtener x2.' },
  ],
  'bug-game': [
    { target: 'debug-code', title: 'Inspecciona el código', text: 'La línea roja contiene el error. Toca cualquier línea para ver qué ocurre en ese paso.' },
    { target: 'debug-hypotheses', title: 'Compara hipótesis', text: 'Elige una corrección y revisa el cambio antes de probarlo. Puede haber varias soluciones válidas.' },
    { target: 'debug-run', title: 'Prueba tu solución', text: 'Ejecuta paso a paso y confirma la corrección. Resolver con eficiencia y sin errores puede activar x2.' },
  ],
  'patch-cable': [
    { target: 'patch-board', title: 'Sigue la conexión', text: 'El request viaja desde el cliente hasta la base de datos. El firewall corta el flujo.' },
    { target: 'patch-wire', title: 'Alinea los conectores', text: 'Toca cada cable para girarlo; los puertos vecinos deben coincidir.' },
    { target: 'patch-run', title: 'Abre el flujo', text: 'Pulsa Abrir flujo para probar la conexión. La ruta eficiente y la gema pueden activar x2.' },
  ],
  'stack-balancer': [
    { target: 'stack-objective', title: 'Mira el orden de entrega', text: 'Este es el orden que necesita el robot. La pila invierte el orden; la cola lo conserva.' },
    { target: 'stack-packets', title: 'Clasifica los paquetes', text: 'Arrastra cada paquete a una estructura, o tócalo y luego elige dónde colocarlo.' },
    { target: 'stack-run', title: 'Simula el despacho', text: 'Cuando todos estén ubicados, pulsa Simular. Una solución eficiente y sin fallos puede activar x2.' },
  ],
};

const storageKey = (userId, gameId) => `kidcode-game-guide:${userId}:${gameId}`;

export default function GameGuide({ userId, gameId, level = 1 }) {
  const steps = gameGuides[gameId] || gameGuides['logic-game'];
  const [stepIndex, setStepIndex] = useState(0);
  const [open, setOpen] = useState(() => {
    if (Number(level) !== 1 || !userId) return false;
    try {
      return window.localStorage.getItem(storageKey(userId, gameId)) !== 'seen';
    } catch (error) {
      console.warn('No se pudo leer el estado del tutorial:', error);
      return true;
    }
  });
  const [targetRect, setTargetRect] = useState(null);
  const step = steps[stepIndex];

  useEffect(() => {
    if (!open || !step) return undefined;
    const target = document.querySelector(`[data-tutorial="${step.target}"]`);
    if (!target) return undefined;
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    const updateRect = () => {
      const rect = target.getBoundingClientRect();
      setTargetRect({
        top: rect.top - 7,
        left: rect.left - 7,
        width: rect.width + 14,
        height: rect.height + 14,
      });
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [open, step]);

  const stepName = step?.title || 'Ayuda del juego';
  const markSeen = () => {
    try {
      window.localStorage.setItem(storageKey(userId, gameId), 'seen');
    } catch (error) {
      console.warn('No se pudo guardar el estado del tutorial:', error);
    }
    setOpen(false);
    setStepIndex(0);
    setTargetRect(null);
  };
  const startGuide = () => {
    setStepIndex(0);
    setTargetRect(null);
    setOpen(true);
  };

  return <>
    <button type="button" className="game-help-button" onClick={startGuide} aria-label="¿Cómo jugar?">ⓘ ¿Cómo jugar?</button>
    {open && <div className="game-guide-overlay" role="dialog" aria-modal="true" aria-labelledby="game-guide-title">
      {targetRect && <div className="game-guide-spotlight" style={targetRect} aria-hidden="true" />}
      <section className="game-guide-card">
        <div className="game-guide-progress">TUTORIAL · PASO {stepIndex + 1} DE {steps.length}</div>
        <h2 id="game-guide-title">{stepName}</h2>
        <p>{step?.text}</p>
        {!targetRect && <small className="game-guide-target-note">Explora el área indicada en pantalla para encontrar este control.</small>}
        <div className="game-guide-actions">
          <button type="button" className="secondary-btn" onClick={markSeen}>Omitir guía</button>
          {stepIndex > 0 && <button type="button" className="secondary-btn" onClick={() => setStepIndex((current) => current - 1)}>← Atrás</button>}
          {stepIndex < steps.length - 1
            ? <button type="button" className="primary-btn" onClick={() => setStepIndex((current) => current + 1)}>Siguiente →</button>
            : <button type="button" className="primary-btn" onClick={markSeen}>¡Entendido!</button>}
        </div>
      </section>
    </div>}
  </>;
}
