# Informe de traspaso técnico y funcional — KidCode Neiva

**Objetivo:** dar a una persona desarrolladora o a otra IA el contexto necesario para modificar el proyecto sin romper sus flujos, reglas de negocio ni persistencia.

**Estado de validación de esta iteración:** frontend `npm run lint` y `npm run build` aprobados; backend `npm test -- --runInBand` aprobó 2 suites y 16 pruebas usando una SQLite temporal aislada.

## 1. Resumen del producto

KidCode Neiva es una plataforma educativa en español para practicar programación mediante juegos. Tiene dos roles principales:

- **Estudiante:** juega, revisa su progreso, personaliza un avatar, envía opiniones y completa lecciones y parciales.
- **Docente:** revisa avances, intentos y errores, controla la disponibilidad de juegos, asigna dificultad, edita contenido educativo y consulta feedback y resultados.

La aplicación tiene cinco juegos, siete niveles por juego (35 niveles totales). Cuatro juegos son introductorios. Clínica de código se desbloquea al completar 21 niveles introductorios; la API también verifica el requisito, no solo el frontend.

## 2. Arquitectura y estructura

```text
KidCode_Neiva/
├── frontend/                 React 19 + Vite 8, CSS y lucide-react
│   └── src/
│       ├── App.jsx            Estado de navegación y sesión de juego
│       ├── ThemeContext.jsx   Estado global de apariencia
│       ├── KidCodeDesign.css  Tokens y estilos globales, incluida paleta oscura
│       ├── components/
│       │   ├── Auth/          Login, registro y layout de autenticación
│       │   ├── Dashboard/     Panel docente y CMS educativo
│       │   ├── Game/          Juegos, guía, puntuación y recuperación de errores
│       │   ├── StudentHome.jsx
│       │   └── StudentFeatures.jsx Perfil, tienda, academia y opiniones
│       └── services/api.js    Cliente HTTP hacia el backend
├── backend/                  Express + SQLite
│   └── src/
│       ├── app.js             Middleware y montaje de rutas
│       ├── server.js          Inicialización DB y servidor
│       ├── config/            Esquema SQLite y contenido inicial de academia
│       ├── controllers/       Auth, progreso, aula y funcionalidades extra
│       ├── middleware/        JWT y autorización por rol
│       ├── routes/            Endpoints de auth y progreso
│       └── __tests__/         Pruebas Jest/Supertest
├── docs/                     Contrato API, progresión e informe de traspaso
└── PROYECTO KIDCODE/          Actas y documentos de referencia del proyecto
```

### Flujo del frontend

- `main.jsx` importa `index.css`, monta `App.jsx` y carga `KidCodeDesign.css` al final para que los tokens y overrides globales tengan prioridad.
- `App.jsx` resuelve login, registro, panel estudiante, panel docente y sesión de juego con estado React (`view`); no hay un router SPA dedicado.
- El modo de color está en `ThemeContext.jsx` y se distribuye con `ThemeProvider`. El control reutilizable es `components/ThemeToggle.jsx`. La preferencia se guarda en `localStorage` bajo `kidcode-color-mode`; si no hay valor, se usa tema claro.
- Las pantallas principales consultan APIs con `services/api.js`. El token bearer vive en el estado de sesión de `App`, no en una capa de autenticación persistente.

### Flujo del backend

- `app.js` monta CORS, JSON, endpoint `/api/health`, `/api/auth` y `/api/progress`.
- `server.js` ejecuta `initDB()` y luego escucha `PORT` o el puerto 5000.
- `config/security.js` carga la configuración del backend: `JWT_SECRET`, `CORS_ORIGINS` y `TEACHER_REGISTRATION_CODE`. Producción exige un secreto JWT de al menos 32 caracteres; el código de invitación evita que el registro público otorgue el rol docente libremente.
- SQLite inicializa/migra el esquema desde `config/database.js`. Por defecto, la base se resuelve desde la ubicación del módulo (`backend/kidcode.db`), sin depender del directorio desde el que se inicia Node. `KIDCODE_DB_PATH` permite elegir una ruta absoluta en almacenamiento duradero; si el host usa disco efímero, se necesita montar un volumen persistente para conservar datos entre despliegues.
- Con `NODE_ENV=test`, la base usa un archivo temporal aislado por proceso. Las pruebas que limpian tablas verifican que no estén apuntando a la base persistente.
- Las rutas protegidas usan `authMiddleware.js`; `requireRole.js` aplica controles de rol donde está declarado.

## 3. Funcionalidades actuales

### Juegos y progreso

| Juego | ID API | Mecánica |
|---|---|---|
| Algoritmos del explorador | `logic-game` | Programar movimientos; rocas bloquean el paso y se pueden recoger diamantes. |
| Red de servidores | `sequence-game` | Enrutar paquetes evitando nodos caídos o inestables. |
| Patch Cable | `patch-cable` | Girar conectores para conectar cliente y base de datos. |
| Stack Balancer | `stack-balancer` | Clasificar paquetes con semántica LIFO/FIFO y capacidad variable. |
| Clínica de código | `bug-game` | Inspeccionar código, localizar un bug y probar una corrección. |

`LogicGame.jsx` implementa explorador, red y clínica; `InteractiveMiniGame.jsx` implementa Patch Cable y Stack Balancer. `scoring.js` contiene el cálculo compartido. `GameGuide.jsx` aporta guía/tutorial y `GameErrorBoundary.jsx` evita que un error del juego derribe toda la aplicación.

En Algoritmos del explorador y Red de servidores, los errores de cada intento tienen un límite según la dificultad que asigna el docente: 5 en Fácil, 3 en Media y 2 en Difícil. Superarlo registra una partida no completada y permite reintentar. En Red de servidores, la ruta planificada y su último nodo tienen estados visuales y etiquetas accesibles. El tutorial conserva contraste de texto sobre su tarjeta blanca en modo oscuro.

El backend guarda el resultado más reciente, mejor puntaje, finalización, intentos, tiempo, errores y puntos de recompensa por combinación estudiante/juego/nivel. Se conserva una restricción única por estudiante, juego y nivel. El docente ve los datos acumulados mediante el panel, que consulta periódicamente mientras está visible.

### Perfil, avatar y tienda

- Zorro gratis; panda cuesta 120 puntos, pingüino 250 y gato 400.
- Mascotas y accesorios usan saldo de puntos; el backend valida propiedad, costo y saldo al comprar.
- El estudiante puede elegir la mascota y equipar accesorios desbloqueados.
- Los accesorios se dibujan como capas SVG dentro de `AnimalAvatar` en `StudentFeatures.jsx`, compartido por perfil, cabecera y sidebar.
- Las recompensas de nivel se conceden una sola vez cuando el nivel se completa por primera vez; repetirlo no vuelve a entregar la recompensa.

### Academia, evaluación y opiniones

- Las secciones iniciales son algoritmos, bucles, condiciones y bugs (`backend/src/config/learningContent.js`).
- Se guardan lecciones completadas y resultados de parciales. El servidor calcula la nota y el aprobado requiere 70%.
- La descarga del certificado utiliza el diálogo de impresión del navegador para guardar como PDF; no es una generación PDF server-side.
- Cada estudiante puede enviar/actualizar una opinión por juego; el docente ve las opiniones recientes.
- `TeacherEducation.jsx` incluye CMS de secciones, opiniones y tabla de resultados.

### Controles docentes

- El docente puede habilitar/deshabilitar juegos y asignar dificultad individual (`facil`, `medio`, `dificil`).
- Los ajustes se leen periódicamente por estudiante; los juegos pausados se rechazan también en el backend.
- Las señales de dificultad (efectividad baja o varios fallos consecutivos) se muestran en el panel para apoyar una decisión docente.

## 4. Reglas de negocio que se deben preservar

1. Los IDs de juego son contratos compartidos entre frontend, backend, base de datos y reportes. No renombrarlos sin actualizar todos los consumidores y datos persistidos.
2. Los niveles válidos son del 1 al 7. El contenido en el frontend y backend debe mantener los mismos siete niveles por juego.
3. Clínica exige 21 niveles introductorios completados; conservar comprobación del servidor.
4. Los puntajes son porcentajes; el guardado conserva decimales y registra intentos/errores.
5. El saldo de la tienda es independiente de la nota. La recompensa se concede una sola vez por completar por primera vez; las compras deben seguir validadas por servidor.
6. El examen se califica en backend; no exponer respuestas correctas al estudiante desde el endpoint público.
7. El aprobado del examen es 70%. Mantener role checks para CMS, feedback y resultados de docentes.
8. No introducir datos simulados como sustituto de datos reales en dashboards o tablas.
9. Los nombres de campos y rutas descritos en `docs/api-contract.md` son acuerdos internos; modificar frontend y backend conjuntamente si el contrato cambia.

### Economía y dificultad

| Dificultad asignada | Recompensa por nivel completado |
|---|---|
| Fácil | `30 + score × 0.2`, entre 30 y 50 puntos |
| Media | `70 + score × 0.2`, entre 70 y 90 puntos |
| Difícil | `150 + score × 0.5`, entre 150 y 200 puntos |

El resultado se redondea al entero más cercano. La fuente de verdad es el backend y su implementación de progreso; no crear una segunda fórmula divergente en UI.

## 5. Dirección visual actual

### Identidad

La intención visual es EdTech/SaaS premium: limpia, tecnológica, acogedora y legible, evitando neones, decoración infantil recargada, emojis como iconos de interfaz y sombras pesadas. Se conservan mascotas y contenido de juego cuando son parte de la experiencia.

### Tokens y temas

La hoja principal de diseño es `frontend/src/KidCodeDesign.css`:

- **Tema claro predeterminado:** lienzo claro cálido, superficies blancas, tinta marino, índigo como primario; teal para progreso/éxito y ámbar para recompensas.
- **Tema oscuro:** lienzo marino profundo y superficies elevadas azul-gris, con índigo, teal y ámbar atenuados para acentos.
- Variables principales: `--kid-ink`, `--kid-muted`, `--kid-canvas`, `--kid-surface`, `--kid-border`, `--kid-primary`, `--kid-teal`, `--kid-amber`, `--kid-coral`, radios, espaciado, sombras y duración.
- Tipografías: DM Sans para texto y Space Grotesk para títulos; código usa pila monospace del sistema. `App.css` carga las familias web de Google.
- Hay foco visible, áreas táctiles mínimas y `prefers-reduced-motion`.
- Toggle accesible con nombre dinámico, icono Lucide, persistencia local y sincronización entre pestañas.

### Capas CSS a conocer

1. `index.css`: reset y base de la plantilla.
2. `App.css`: hoja histórica de base/layout y muchos estilos originales.
3. Hojas por área: `GameExperience.css`, `StudentFeatures.css`, `Dashboard/TeacherDashboard.css` y `Dashboard/TeacherEducation.css`.
4. `KidCodeDesign.css`: tokens, consistencia global y overrides visuales cargados al final.

Antes de añadir un override, busca si ya hay una regla para el componente. Las hojas antiguas aún contienen valores fijos y reglas que se pisan; una refactorización futura puede migrarlas por área a tokens, comprobando cada pantalla para evitar regresiones. No reemplazar selectores existentes sin buscar sus usos JSX.

## 6. Endpoints y documentación

La base local es `http://localhost:5000/api`. El frontend permite cambiarla mediante `VITE_API_URL` y, si no se define, usa la URL local.

- Autenticación: `POST /auth/register`, `POST /auth/login`.
- Progreso: `POST /progress`, `GET /progress/student`, `GET /progress/teacher`.
- Aula: `GET /progress/settings`, `GET /progress/classroom/controls`, `PUT /progress/classroom/games/:gameName`, `PUT /progress/classroom/students/:studentId/difficulty`.
- Perfil/tienda: `GET|PUT /progress/profile`, `POST /progress/profile/purchase`.
- Feedback: `POST /progress/reviews`, `GET /progress/reviews/teacher`.
- Academia: `GET /progress/learning/sections`, `PUT /progress/learning/sections/:sectionId`, `PUT /progress/learning/sections/:sectionId/progress`, `POST /progress/learning/sections/:sectionId/exam`, `GET /progress/learning/results/teacher`.
- Estado: `GET /health`.

Ver `docs/api-contract.md` para campos/validación y `docs/progresion-y-minijuegos.md` para niveles, rangos, dificultad y economía.

## 7. Desarrollo y validación

Desde PowerShell, en terminales separadas:

```powershell
Set-Location 'C:\Users\felipe\KidCode_Neiva\backend'
npm install
npm run dev
```

```powershell
Set-Location 'C:\Users\felipe\KidCode_Neiva\frontend'
npm install
npm run dev
```

Comandos de validación:

```powershell
Set-Location 'C:\Users\felipe\KidCode_Neiva\frontend'
npm run lint
npm run build
```

```powershell
Set-Location 'C:\Users\felipe\KidCode_Neiva\backend'
npm test -- --runInBand
```

El backend usa Jest con VM Modules y SQLite. `npm test -- --runInBand` ejecuta la suite sobre una base temporal de prueba; no necesita iniciarse desde una carpeta específica ni compartir la base persistente.

## 8. Prioridades y riesgos al continuar

### Revisar antes de una salida pública

Se aplicaron controles básicos para una primera publicación:

- El secreto JWT se lee desde `JWT_SECRET` y es obligatorio en producción.
- El rol docente requiere un código privado definido en `TEACHER_REGISTRATION_CODE`.
- CORS usa `CORS_ORIGINS` y permite el mismo origen HTTPS para despliegues de frontend/backend juntos.
- Los reportes y acciones de progreso docentes/estudiantiles aplican control de rol.
- El `.gitignore` raíz excluye archivos `.env`, bases locales, dependencias, compilados y documentos PDF/DOCX del espacio de trabajo.

Esto no equivale a una auditoría de seguridad completa. Antes de publicar, configurar secretos propios y verificar permisos del proveedor de alojamiento. El almacenamiento SQLite solo sobrevive a reinicios si el host ofrece y tiene montado almacenamiento persistente.

### Calidad visual y cobertura

- La última validación automatizada confirma lint, build y pruebas backend; no es equivalente a probar todos los flujos manualmente.
- Hacer una revisión visual de dashboards autenticados, todos los juegos, tienda, CMS, certificado impreso y tema oscuro a móvil/tableta/escritorio.
- Comprobar contraste real de estados y componentes dentro de cada vista, especialmente tablas densas, consola de errores, modales y chips de juego.
- Revisar que el botón de tema sea visible y no compita con los controles en anchos estrechos.
- La raíz `C:\Users\felipe` es reconocida por Git y el proyecto aparece como carpeta no rastreada (`?? KidCode_Neiva/`) en el estado consultado. Antes de commit, confirmar si se desea inicializar/usar un repositorio dentro del proyecto o continuar desde la raíz padre. No asumir que un diff vacío significa que no hay trabajo.
- `frontend/README.md` conserva contenido genérico de la plantilla React/Vite; conviene reemplazarlo por instrucciones de KidCode cuando se solicite documentación de onboarding.

## 9. Instrucciones de trabajo para la siguiente IA

1. Empezar por leer este archivo, `docs/api-contract.md`, `docs/progresion-y-minijuegos.md` y los componentes de la pantalla concreta.
2. Confirmar el estado de Git y no revertir ni sobrescribir cambios previos del usuario.
3. Para una petición visual, no modificar lógica, APIs, roles, puntajes o progresión salvo instrucción explícita.
4. Buscar el patrón existente antes de añadir clases, componentes, helpers o paquetes. No añadir dependencia si React/CSS/Lucide bastan.
5. Aplicar cambios coherentes en las capas CSS que afectan la pantalla; comprobar ambos temas si el cambio toca colores, controles o superficies.
6. Conservar copy funcional, accesibilidad, estados de error/carga/vacío, navegación móvil y `prefers-reduced-motion`.
7. Tras cambios de frontend, ejecutar lint y build; tras cambios de reglas o persistencia, ejecutar pruebas backend en serie y validar ambos lados del contrato.
8. Reportar qué se cambió, qué comandos pasaron y qué flujos no se pudieron verificar. No afirmar pruebas de navegador o de backend que no se hayan ejecutado.

## 10. Mensaje breve reutilizable para iniciar la siguiente sesión

> Trabaja en `C:\Users\felipe\KidCode_Neiva`. Lee primero `docs/INFORME_TRASPASO_KIDCODE_NEIVA.md`, `docs/api-contract.md` y `docs/progresion-y-minijuegos.md`. La app es React/Vite + Express/SQLite, tiene dos roles, cinco juegos de siete niveles, perfil/tienda, opiniones, academia con CMS y parciales, y tema claro/oscuro. Conserva IDs de juegos, rutas y reglas de negocio. Usa el diseño/token CSS existente y valida ambos temas en móvil y escritorio. Para frontend ejecuta `npm run lint` y `npm run build`; para backend `npm test -- --runInBand`. En producción configura `JWT_SECRET`, `TEACHER_REGISTRATION_CODE`, `CORS_ORIGINS` y una ruta SQLite persistente; no versionar secretos ni datos locales. Describe también lo que no puedas verificar.
