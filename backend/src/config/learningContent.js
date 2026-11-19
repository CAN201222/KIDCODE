export const defaultLearningSections = [
  {
    id: 'algorithms',
    title: '¿Qué es un algoritmo?',
    ageRange: '5–13 años',
    description: 'Convierte una meta en instrucciones claras, ordenadas y comprobables.',
    lessons: [
      {
        title: 'Una receta para Kiko',
        reading: 'Un algoritmo es una lista ordenada de pasos para resolver algo. Si cambias el orden de los pasos de una receta, el resultado también puede cambiar.',
        example: '1. Toma una taza. 2. Agrega agua. 3. Mezcla. Kiko sigue las instrucciones exactamente en ese orden.',
      },
      {
        title: 'Pasos claros y finitos',
        reading: 'Una instrucción debe ser fácil de entender y el algoritmo debe terminar. “Camina un poco” es ambiguo; “avanza dos casillas” se puede comprobar.',
        example: 'Para llegar al tesoro: avanza, gira a la derecha y avanza dos veces. Luego verifica si llegaste.',
      },
    ],
    questions: [
      { prompt: '¿Cuál es un algoritmo?', options: ['Una secuencia ordenada de pasos', 'Un color del tablero', 'Una contraseña secreta'], answer: 0, explanation: '¡Eso es! Un algoritmo ordena instrucciones para alcanzar una meta.' },
      { prompt: '¿Qué instrucción es más fácil de comprobar?', options: ['Muévete bastante', 'Avanza tres casillas', 'Hazlo rápido'], answer: 1, explanation: '“Avanza tres casillas” es precisa y se puede verificar.' },
      { prompt: '¿Qué conviene hacer al terminar los pasos?', options: ['Comprobar el resultado', 'Borrar la meta', 'Repetir para siempre'], answer: 0, explanation: 'Comprobar permite saber si el algoritmo logró su objetivo.' },
    ],
  },
  {
    id: 'loops',
    title: 'Bucles y repeticiones',
    ageRange: '5–13 años',
    description: 'Usa repeticiones para hacer más con menos instrucciones.',
    lessons: [
      {
        title: 'Repite sin copiar pasos',
        reading: 'Cuando una acción se repite, un bucle permite escribir la instrucción una vez y decir cuántas veces debe ejecutarse.',
        example: 'En vez de “salta, salta, salta”, usa “repite 3 veces: salta”.',
      },
      {
        title: 'Una condición para parar',
        reading: 'Un bucle necesita una forma segura de terminar. La condición debe acercarse a ser falsa en cada vuelta.',
        example: 'Mientras queden paquetes: procesa uno y retíralo de la cola.',
      },
    ],
    questions: [
      { prompt: '¿Qué problema resuelve un bucle?', options: ['Evita repetir instrucciones iguales muchas veces', 'Cambia el color de la pantalla', 'Guarda una contraseña'], answer: 0, explanation: 'Los bucles simplifican tareas repetitivas.' },
      { prompt: '¿Cuál es una repetición de 4 acciones?', options: ['Repite 4 veces: avanzar', 'Avanza una vez', 'Termina antes de iniciar'], answer: 0, explanation: 'El bucle ejecuta avanzar cuatro veces.' },
      { prompt: '¿Qué evita un bucle infinito?', options: ['Una condición de parada que pueda cumplirse', 'Agregar más vueltas', 'Quitar el objetivo'], answer: 0, explanation: 'Una condición de salida permite que el bucle termine.' },
    ],
  },
  {
    id: 'conditions',
    title: 'Condiciones: si pasa esto…',
    ageRange: '5–13 años',
    description: 'Enseña a un programa a tomar decisiones según lo que ocurre.',
    lessons: [
      {
        title: 'Elige según una regla',
        reading: 'Una condición permite que un programa elija qué hacer. Primero comprueba una situación y después ejecuta una acción.',
        example: 'Si el camino está libre, avanza. Si hay una roca, busca otra ruta.',
      },
      {
        title: 'Compara con cuidado',
        reading: 'Las comparaciones como “igual a”, “mayor que” o “hay espacio” producen una respuesta verdadera o falsa.',
        example: 'Si paquetes > 0, procesa uno. Si no, muestra “cola vacía”.',
      },
    ],
    questions: [
      { prompt: '¿Qué hace una condición?', options: ['Elige una acción según una regla', 'Repite siempre lo mismo', 'Borra todos los datos'], answer: 0, explanation: 'Una condición permite tomar decisiones.' },
      { prompt: 'Si hay una roca, ¿qué decisión es segura?', options: ['Buscar otra ruta', 'Avanzar sobre la roca', 'Ignorar el mapa'], answer: 0, explanation: 'La condición debe cambiar el plan cuando hay un obstáculo.' },
      { prompt: '¿Qué respuestas puede dar una comparación?', options: ['Verdadera o falsa', 'Grande o pequeña', 'Azul o verde'], answer: 0, explanation: 'Una comparación se evalúa como verdadera o falsa.' },
    ],
  },
  {
    id: 'bugs',
    title: '¿Qué es un bug?',
    ageRange: '5–13 años',
    description: 'Investiga errores con curiosidad, evidencia y pruebas.',
    lessons: [
      {
        title: 'Un error es una pista',
        reading: 'Un bug es un comportamiento distinto al esperado. No es un fracaso: es una pista para investigar qué instrucción necesita mejorar.',
        example: 'Kiko debía avanzar 3 casillas, pero avanzó 4. Revisa el límite del bucle.',
      },
      {
        title: 'Prueba una hipótesis',
        reading: 'Para depurar, observa el resultado, busca una causa posible, cambia una cosa y vuelve a probar.',
        example: 'Hipótesis: el bucle incluye una vuelta extra. Cambia el límite y ejecuta la prueba otra vez.',
      },
    ],
    questions: [
      { prompt: '¿Qué es un bug?', options: ['Un error que cambia el resultado esperado', 'Un premio del juego', 'Una instrucción de inicio'], answer: 0, explanation: 'Un bug hace que el programa se comporte de forma inesperada.' },
      { prompt: '¿Qué ayuda a depurar?', options: ['Probar una hipótesis y observar el resultado', 'Cambiar muchas cosas al azar', 'Ocultar el mensaje de error'], answer: 0, explanation: 'Cambiar una cosa y probar ayuda a encontrar la causa.' },
      { prompt: '¿Qué hacer cuando aparece un error?', options: ['Leer la pista y revisar el código', 'Cerrar el programa sin mirar', 'Repetir lo mismo sin cambios'], answer: 0, explanation: 'Los mensajes y resultados orientan la investigación.' },
    ],
  },
];
