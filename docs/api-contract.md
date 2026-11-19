# KidCode Neiva — contrato de API

Base local: `http://localhost:5000/api`. Configure `VITE_API_URL` en el frontend para otro entorno.

## Autenticación

- `POST /auth/register` — recibe `{ name, email, password, role, teacherCode? }`. El perfil debe ser `estudiante` o `docente`; crear un perfil docente requiere que `teacherCode` coincida con `TEACHER_REGISTRATION_CODE` configurado en el servidor.
- `POST /auth/login` — recibe `{ email, password }`; devuelve `{ token, user: { id, name, email, role } }`.
- Los endpoints protegidos requieren `Authorization: Bearer <JWT>`. En producción el servidor exige `JWT_SECRET` de al menos 32 caracteres; CORS permite los orígenes listados en `CORS_ORIGINS` y el mismo origen HTTPS.

## Progreso

- `POST /progress` — estudiante autenticado registra o actualiza el resultado del nivel. Recibe `{ game_name, level, score, mistakes, mistake_types, duration_seconds, attempts, multiplier, instruction_count, completed }`. Los juegos permitidos son `logic-game`, `sequence-game` (Red de servidores), `patch-cable`, `stack-balancer` y `bug-game`; `level` acepta enteros de 1 a 7 y `score` admite de 0 a 100 con un decimal. Los errores se envían en `mistake_types` como conteos de `collision`, `wrong_route`, `wrong_pipeline`, `wrong_fix`, `network_outage` o `timeout`. La API suma intentos, errores tipificados y duración entre envíos del mismo nivel; conserva el último resultado, el mejor porcentaje y el estado de finalización. `multiplier` es 1 o 2. Devuelve `201` al crear un resultado y `200` al actualizarlo. Devuelve `403` si el juego está pausado o si `bug-game` no tiene aún 21 niveles introductorios completados.
- `GET /progress/student` — solo estudiante; devuelve sus resultados por nivel, con `score`, `best_score`, `mistakes`, `mistake_types`, `duration_seconds`, `attempts`, `multiplier`, `instruction_count` y estado de finalización.
- `GET /progress/teacher` — solo docente; devuelve `totalStudents`, `averageScore` y `students` con efectividad, avance, mejores resultados, categorías de errores agregadas por estudiante y métricas tipificadas por juego/nivel.
- `GET /progress/settings` — solo estudiante; devuelve la dificultad asignada y el estado de disponibilidad de cada juego.
- `GET /progress/classroom/controls` — solo docente; devuelve interruptores de juegos y las dificultades asignadas a estudiantes.
- `PUT /progress/classroom/games/:gameName` — solo docente; recibe `{ enabled: boolean }`. Los intentos de juegos desactivados también son rechazados por `POST /progress`.
- `PUT /progress/classroom/students/:studentId/difficulty` — solo docente; recibe `{ difficulty: "facil" | "medio" | "dificil" }`.
- `GET /progress/profile` — solo estudiante; devuelve mascota, apodo, saldo de puntos, inventario, accesorios equipados, catálogo y estadísticas. Cada mascota incluye `itemId`, `price` y `unlocked`; el zorro inicial es gratis.
- `PUT /progress/profile` — solo estudiante; actualiza `{ nickname?, pet?, equippedItems? }`. Solo permite seleccionar mascotas desbloqueadas y equipar accesorios comprados en su categoría.
- `POST /progress/profile/purchase` — solo estudiante; recibe `{ itemId }`, valida el catálogo (mascotas `pet-*` y accesorios) y descuenta el saldo dentro de una transacción.
- `POST /progress/reviews` — solo estudiante; recibe `{ game_name, stars, tag, comment }`. Actualiza la opinión existente del estudiante para ese juego.
- `GET /progress/reviews/teacher` — solo docente; devuelve opiniones recientes con nombre del estudiante y fecha.
- `GET /progress/learning/sections` — devuelve lecturas, ejemplos, preguntas y avance de las secciones educativas.
- `PUT /progress/learning/sections/:sectionId` — solo docente; crea/actualiza el título, descripción, lecturas, ejemplos y parcial de una sección.
- `PUT /progress/learning/sections/:sectionId/progress` — solo estudiante; recibe `{ completedLessons: number[] }`; guarda las lecciones vistas.
- `POST /progress/learning/sections/:sectionId/exam` — solo estudiante; recibe `{ answers: number[] }`. El servidor calcula el porcentaje, registra el intento y marca aprobado desde 70%.
- `GET /progress/learning/results/teacher` — solo docente; devuelve intentos de parciales, nota, aprobación y fecha para el reporte del aula.

La restricción única `(user_id, game_name, level)` y un `UPSERT` dentro de `BEGIN IMMEDIATE` evitan registros duplicados y escrituras concurrentes incompletas. La migración transforma la tabla heredada de tres a siete niveles y de puntaje entero a decimal, conservando resultados existentes; agrega métricas acumulables y elimina duplicados previos antes de crear el índice. Las partidas perdidas también quedan guardadas, pero no desbloquean el nivel siguiente. El panel docente revalida cada cinco segundos mientras está visible y al recuperar el foco.

La efectividad se calcula con 45 puntos por nivel completado, hasta 20 por tiempo restante, hasta 15 por eficiencia de instrucciones y hasta 12 por precisión; los bonificadores x2 se aplican a puntos de eficiencia, primer intento e ítems opcionales. Se limita a 100 y se guarda con un decimal. Los títulos se derivan de los niveles completados: Operador de Redes (4), Arquitecto Lógico (14 introductorios), Cazador de Bugs (21 introductorios, desbloquea Clínica) y Maestro del Código (35 totales).

Los puntos de la tienda se asignan una sola vez cuando un nivel queda completado por primera vez: Fácil `30 + score × 0.2` (30–50), Medio `70 + score × 0.2` (70–90) y Difícil `150 + score × 0.5` (150–200), redondeados al entero más cercano. El docente asigna la dificultad en `student_preferences`; repetir un nivel no vuelve a entregar su recompensa. Los accesorios y saldos se validan en backend.

La academia crea cuatro secciones iniciales: algoritmos, bucles, condiciones y bugs. Los parciales se califican en el servidor (70% para aprobar); la descarga del certificado usa la impresión del navegador para guardar como PDF. Los resultados docentes se consultan cada diez segundos mientras el módulo está abierto.
