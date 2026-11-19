# Progresión y nuevos minijuegos — KidCode Neiva

## Catálogo

La plataforma tiene cinco experiencias de siete niveles cada una (35 retos):

| Juego | Habilidad | Interacción |
| --- | --- | --- |
| Algoritmos del explorador | Secuencias y orientación | Construir y ejecutar un programa de bloques |
| Red de servidores | Rutas y tolerancia a fallos | Trazar una ruta con límites y nodos de riesgo |
| Patch Cable | Cliente-servidor, puertos y protocolos | Tocar conectores para rotarlos y abrir el flujo |
| Stack Balancer | Pilas, colas y memoria | Arrastrar paquetes o seleccionarlos y ubicarlos en contenedores |
| Clínica de código | Depuración y lectura | Inspeccionar código, avanzar paso a paso y comparar hipótesis |

## Rangos y acceso

Los rangos se derivan de resultados completados y se muestran junto al avatar. Los cuatro juegos introductorios suman 28 niveles; Clínica aporta los 7 restantes.

| Rango | Criterio | Acceso |
| --- | --- | --- |
| Explorador Novato | Rango inicial | Juegos introductorios |
| Operador de Redes | 4 niveles introductorios | Juegos introductorios |
| Arquitecto Lógico | 14 niveles introductorios (50%) | Juegos introductorios |
| Cazador de Bugs | 21 niveles introductorios | Desbloquea Clínica de código |
| Maestro del Código | 35 niveles completados | Todos los retos |

Los puntos de tienda se guardan en el perfil y se asignan en backend una sola vez al completar un nivel: Fácil entrega de 30 a 50, Medio de 70 a 90 y Difícil de 150 a 200, según el porcentaje final. El saldo se usa para comprar accesorios y no se deriva de la calificación porcentual. El backend comprueba que el estudiante complete 21 niveles introductorios antes de guardar resultados de Clínica; el bloqueo no depende únicamente de ocultar controles.

## Perfil, avatares y valoraciones

El botón de avatar en la cabecera abre el perfil del estudiante con apodo, mascota, rango, progreso hacia el siguiente título, saldo, niveles completados y racha activa. El vestidor separa personajes y accesorios: el zorro inicial es gratis; panda (120 puntos), pingüino (250) y gato (400) se desbloquean con puntos. Los accesorios cuestan entre 50 y 250 puntos según su nivel. Sombreros, gafas, ropa y accesorios se dibujan como capas SVG sobre el personaje; equiparlos actualiza el perfil compartido de inmediato. Las compras y los requisitos de desbloqueo se validan en una transacción del backend. Si faltan puntos, la tienda muestra la cantidad pendiente y desactiva la compra. Cada estudiante puede actualizar una valoración de estrellas, etiqueta y comentario por juego; el panel docente muestra las opiniones recientes.

## Aprende Código y certificación

La academia trae cuatro secciones editables (algoritmos, bucles, condiciones y bugs), cada una con lecturas, ejemplos y preguntas tipo parcial. El progreso de lecciones se guarda por estudiante y habilita el parcial al completar la sección. El servidor calcula las respuestas y registra cada intento; aprobar requiere 70%. El diploma incluye nombre/apodo, mascota, sección, resultado y fecha. **Descargar / imprimir PDF** abre el diálogo de impresión del navegador, donde puede guardarse el certificado en PDF. El CMS docente edita contenido y preguntas, y consulta los resultados del grupo.

## Sistema visual

La interfaz usa fondos cielo claros, superficies blancas elevadas, bordes redondeados, sombras táctiles y acentos azul, amarillo, verde y violeta. Los tokens y el rediseño global viven en `frontend/src/KidCodeDesign.css`; los componentes de academia, tienda y perfil usan `frontend/src/components/StudentFeatures.css` y el panel CMS `frontend/src/components/Dashboard/TeacherEducation.css`.

## Patch Cable — progresión

El tablero es una topología de 4 × 4. El cliente y la base de datos son terminales; las piezas intermedias solo se rotan con clic/tap. Un cortafuegos corta la ruta, y abrir el flujo anima el circuito y comprueba la continuidad de cada puerto.

1. Conectar un tramo recto y un codo.
2. Desviar el request alrededor del primer cortafuegos.
3. Identificar puertos de entrada y salida en una ruta de varios giros.
4. Leer continuidad en una topología con bloqueos múltiples.
5. Resolver una ruta larga con tres cambios de dirección.
6. Evitar puertos mal alineados en un protocolo compuesto.
7. Completar la topología final sin interrupciones.

## Stack Balancer — progresión

Los paquetes entrantes tienen identificadores y un orden de entrega objetivo. Se pueden arrastrar a una pila o cola; en pantallas táctiles también se seleccionan y se toca el contenedor. Al simular, la pila entrega LIFO y la cola FIFO, en ese orden. Las capacidades cambian por nivel para introducir desbordamiento de memoria.

| Nivel | Paquetes | Pila objetivo | Cola objetivo | Concepto nuevo |
| ---: | ---: | ---: | ---: | --- |
| 1 | 3 | 1 | 2 | Distinguir orden de entrada y salida |
| 2 | 4 | 2 | 2 | Combinar LIFO y FIFO |
| 3 | 5 | 2 | 3 | Respetar capacidades diferentes |
| 4 | 6 | 3 | 3 | Equilibrar dos estructuras |
| 5 | 7 | 4 | 3 | Anticipar salida inversa de una pila |
| 6 | 8 | 3 | 5 | Gestionar una cola más grande |
| 7 | 9 | 5 | 4 | Planificar el despacho final y evitar overflow |

## Clínica de código — depuración guiada

La línea sospechosa sigue resaltada, pero cada línea ahora se puede inspeccionar en una tarjeta de lupa. El botón **Paso a paso** anima el recorrido línea por línea. Las hipótesis muestran el cambio antes/después, explicación y distractores sutiles; **Probar corrección** conserva el registro de intentos y errores.

## Persistencia

Los nuevos juegos usan los mismos registros de progreso por estudiante, juego y nivel. Puntaje decimal, tiempo, intentos, errores tipificados y mejor resultado aparecen en los reportes existentes del estudiante y del docente. Tras completar un nivel, la pantalla de victoria ofrece **Siguiente nivel** sin volver al menú.

## Controles del aula y dificultad adaptativa

El docente puede pausar globalmente cada juego y asignar una dificultad individual. La API guarda esos controles en `game_controls` y `student_preferences`; el estudiante recibe los valores al cargar su inicio y los actualiza periódicamente. El backend rechaza guardar resultados de juegos pausados.

| Modo | Cambios principales |
| --- | --- |
| Fácil | Sin cuenta regresiva, pistas visibles, menos obstáculos en el explorador/red, menor penalización y más capacidad para pilas/colas. |
| Medio | Obstáculo de red que cambia de nodo, un paquete extra en la ruta y los límites de instrucciones de cada misión. |
| Difícil | Cuenta regresiva reducida, pistas ocultas, mapas que revelan nodos al explorar, límites estrictos; Patch Cable limita giros y Stack Balancer añade un paquete. El x2 requiere eficiencia de instrucciones. |

El panel docente recomienda cambiar a Fácil si la media del estudiante cae por debajo del 50% o si un nivel registra tres fallos consecutivos; el cambio rápido guarda la preferencia del estudiante.
