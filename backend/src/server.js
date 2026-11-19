import app from './app.js';
import { databasePath, initDB } from './config/database.js';

const PORT = process.env.PORT || 5000;

initDB().then(() => {
  console.log(`Base de datos SQLite cargada y lista: ${databasePath}`);
  app.listen(PORT, () => {
    console.log(`Servidor de KidCode corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error al inicializar la base de datos:', err);
});
