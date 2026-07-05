const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@libsql/client');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '.')));

// LOGS DE DEPURACIÓN - Ver exactamente qué URL está llegando
console.log('=== VARIABLES DE ENTORNO ===');
console.log('TURSO_DATABASE_URL:', JSON.stringify(process.env.TURSO_DATABASE_URL));
console.log('TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? 'Presente (' + process.env.TURSO_AUTH_TOKEN.length + ' chars)' : 'AUSENTE');
console.log('============================');

// Limpiar la URL de espacios y caracteres invisibles
const dbUrl = process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.trim() : '';

if (!dbUrl) {
  console.error('❌ ERROR: TURSO_DATABASE_URL no está definida');
  process.exit(1);
}

// Conexión a Turso
const db = createClient({
  url: dbUrl,
  authToken: process.env.TURSO_AUTH_TOKEN ? process.env.TURSO_AUTH_TOKEN.trim() : undefined,
});

// Inicializar la tabla
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
    console.log('✅ Base de datos Turso inicializada correctamente');
  } catch (err) {
    console.error('❌ Error al inicializar la BD:', err);
    console.error('URL recibida:', dbUrl);
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
