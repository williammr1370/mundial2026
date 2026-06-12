const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@libsql/client');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Permitir JSON grande para el estado
app.use(express.static(path.join(__dirname, '.'))); // Sirve tu index.html y Fixture.xlsx

// Conexión a Turso (SQLite en la nube)
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Inicializar la tabla al arrancar
async function initDB() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS quiniela_state (
        id TEXT PRIMARY KEY,
        data TEXT
      )
    `);
    await db.execute(`
      INSERT OR IGNORE INTO quiniela_state (id, data) VALUES ('main', '{}')
    `);
    console.log('✅ Base de datos SQLite (Turso) inicializada');
  } catch (err) {
    console.error('❌ Error al inicializar la BD:', err);
  }
}
initDB();

// API: Guardar estado
app.post('/api/save', async (req, res) => {
  try {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO quiniela_state (id, data) VALUES (?, ?)',
      args: ['main', JSON.stringify(req.body)]
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar' });
  }
});

// API: Cargar estado
app.get('/api/load', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT data FROM quiniela_state WHERE id = ?',
      args: ['main']
    });
    const row = result.rows[0];
    res.json(row ? JSON.parse(row.data) : {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar' });
  }
});

// Ruta comodín para que el frontend funcione
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
