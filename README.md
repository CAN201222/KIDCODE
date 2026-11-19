# KidCode Neiva

Plataforma educativa en español para practicar programación mediante juegos, lecciones y evaluaciones. Incluye perfiles de estudiante y docente, seguimiento de progreso, tienda de avatares y el módulo Aprende Código.

## Tecnologías

- Frontend: React y Vite (`frontend/`).
- Backend: Node.js y Express (`backend/`).
- Datos: SQLite, inicializada y migrada al arrancar el backend.

## Requisitos

- Node.js 22 LTS recomendado.
- npm incluido con Node.js.

## Ejecución local

Terminal 1, backend:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
npm run dev
```

Terminal 2, frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Vite muestra la dirección local en la terminal, normalmente `http://localhost:5173`. El backend escucha en `http://localhost:5000`; su comprobación de salud es `http://localhost:5000/api/health`.

La aplicación crea `backend/kidcode.db` automáticamente. No se debe compartir ni subir esta base de datos.

## Configuración

Los ejemplos de variables están en `backend/.env.example` y `frontend/.env.example`.

- `PORT`: puerto del backend; por defecto `5000`.
- `KIDCODE_DB_PATH`: ruta opcional de la base SQLite.
- `JWT_SECRET`: en producción es obligatorio y debe tener al menos 32 caracteres aleatorios.
- `CORS_ORIGINS`: orígenes frontend permitidos, separados por comas.
- `TEACHER_REGISTRATION_CODE`: código privado requerido para registrar cuentas docentes.
- `VITE_API_URL`: dirección base de la API. En desarrollo usa `http://localhost:5000/api`; en el build puede configurarse para el backend alojado.

No uses los valores de ejemplo como secretos reales ni publiques archivos `.env`.

## Pruebas y compilación

Backend:

```powershell
cd backend
npm test -- --runInBand
```

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

## Despliegue

Con `NODE_ENV=production`, el backend sirve también los archivos de `frontend/dist`; compila el frontend antes de iniciar el servidor. La API y la interfaz quedan bajo el mismo origen. `VITE_API_URL` puede establecerse durante el build si el frontend se aloja por separado.

Antes de habilitar una URL pública, configura secretos propios, el código de invitación docente y los orígenes CORS permitidos. No se incluye una URL desplegada en este repositorio.

El backend usa SQLite. Una demo alojada en un servicio gratuito con disco efímero puede perder cuentas y progreso al reiniciarse o dormir. Para conservarlos, configura `KIDCODE_DB_PATH` en un volumen persistente o migra a una base de datos administrada.
