const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '.')));

console.log('=== INICIANDO SERVIDOR CON SUPABASE ===');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌ AUSENTE');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? `✅ (${process.env.SUPABASE_KEY.length} chars)` : '❌ AUSENTE');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function initDB() {
  try {
    const { data, error } = await supabase
      .from('quiniela_state')
      .select('updated_at')
      .eq('id', 'main')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error conectando a Supabase:', error.message);
      return;
    }
    
    console.log('✅ Supabase conectado. Última actualización:', data?.updated_at || 'Nunca');
  } catch (err) {
    console.error('❌ Error inicializando:', err.message);
  }
}
initDB();

app.post('/api/save', async (req, res) => {
  try {
    const dataSize = JSON.stringify(req.body).length;
    console.log(`💾 Guardando datos (${dataSize} bytes)`);
    
    const { error } = await supabase
      .from('quiniela_state')
      .upsert({ 
        id: 'main', 
        data: req.body,
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    console.log('✅ Datos guardados en Supabase');
    res.json({ success: true, size: dataSize });
  } catch (err) {
    console.error('❌ ERROR al guardar:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/load', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quiniela_state')
      .select('data, updated_at')
      .eq('id', 'main')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) {
      console.log('⚠️ No hay datos en Supabase');
      return res.json({});
    }
    
    console.log(`✅ Datos cargados (actualizado: ${data.updated_at})`);
    console.log('📊 Resumen:', {
      matches: data.data?.matches?.length || 0,
      predictions: Object.keys(data.data?.predictions || {}).length,
      realResults: Object.keys(data.data?.realResults || {}).length
    });
    
    res.json(data.data);
  } catch (err) {
    console.error('❌ ERROR al cargar:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quiniela_state')
      .select('updated_at')
      .eq('id', 'main')
      .single();
    
    if (error) throw error;
    
    res.json({ 
      status: 'ok', 
      db: 'supabase',
      lastUpdate: data?.updated_at
    });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
