# KidCode Neiva — cierre de compromisos del acta 006

## Trazabilidad

| Compromiso del acta 006 | Entrega en el repositorio |
| --- | --- |
| Completar el minijuego 2 de secuencias lógicas avanzadas | Se replanteó como “Red de servidores”: el estudiante enruta paquetes entre nodos, evita servidores caídos e identifica conexiones inestables. |
| Ampliar experiencias de aprendizaje | Se sustituyó el tercer juego por “Clínica de código”, donde el estudiante inspecciona un programa, identifica una instrucción errónea y prueba una corrección. |
| Ampliar pruebas integrales | Las pruebas existentes de API cubren autenticación y acceso al progreso. Queda documentada la ejecución E2E bajo el alcance real del repositorio: no se afirma que exista una suite de navegador/carga Jest sin configuración de cliente E2E. |
| Preparar producción | El frontend admite `VITE_API_URL` y conserva `npm run build` como salida de Vite. |
| Documentar funciones clave | Se documentan los contratos de progreso y la política de mejor puntaje por juego; los controladores explican decisiones de persistencia. |

## Diseño entregado

- Entrada y registro responsive con identidad visual KidCode.
- Panel del estudiante con cinco juegos y siete niveles progresivos por juego; los cuatro juegos introductorios desbloquean Clínica de código al completar 21 niveles.
- Los juegos practican algoritmos/secuencias, enrutamiento de redes y lectura/depuración de código.
- Panel docente con resumen del aula, efectividad decimal, avance, errores tipificados acumulados, intentos y duración por nivel.
- Los resultados se guardan en SQLite con una fila única por estudiante, juego y nivel; los reintentos acumulan métricas y una migración conserva y amplía el esquema heredado.

## Alcance de medición

El dashboard reporta actividad registrada. La efectividad considera finalización, tiempo, eficiencia, errores y bonificadores. El registro y elección de rol se mantienen como existen en la aplicación para respetar el flujo funcional actual.
