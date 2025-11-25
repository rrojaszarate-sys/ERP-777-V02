import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gomnouwackzvthpwyric.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 DESCUBRIENDO ESTRUCTURA REAL DE TODAS LAS TABLAS');

async function descubrirTodasLasTablas() {
  try {
    console.log('\n1️⃣ TABLA evt_eventos:');
    const { data: eventos, error: errorEventos } = await supabase
      .from('evt_eventos')
      .select('*')
      .limit(1);
    
    if (errorEventos) {
      console.log('   ❌ Error:', errorEventos.message);
    } else if (eventos && eventos.length > 0) {
      console.log('   ✅ Columnas:', Object.keys(eventos[0]).join(', '));
      console.log('   📋 Datos de muestra:');
      Object.entries(eventos[0]).forEach(([k, v]) => {
        console.log(`      ${k}: ${v}`);
      });
    } else {
      console.log('   ⚠️  Tabla vacía, intentando insertar registro de prueba...');
      
      // Intentar insertar un registro mínimo para ver qué campos requiere
      const { data: testEvento, error: testError } = await supabase
        .from('evt_eventos')
        .insert({
          nombre: 'TEST',
          cliente_id: 4
        })
        .select()
        .single();
        
      if (testError) {
        console.log('   ❌ Error en inserción de prueba:', testError.message);
        console.log('   💡 Esto puede revelar campos requeridos');
      } else {
        console.log('   ✅ Registro de prueba creado:', Object.keys(testEvento).join(', '));
        
        // Eliminar el registro de prueba
        await supabase.from('evt_eventos').delete().eq('id', testEvento.id);
        console.log('   🗑️  Registro de prueba eliminado');
      }
    }

    console.log('\n2️⃣ TABLA evt_ingresos:');
    const { data: ingresos, error: errorIngresos } = await supabase
      .from('evt_ingresos')
      .select('*')
      .limit(1);
    
    if (errorIngresos) {
      console.log('   ❌ Error:', errorIngresos.message);
    } else if (ingresos && ingresos.length > 0) {
      console.log('   ✅ Columnas:', Object.keys(ingresos[0]).join(', '));
    } else {
      console.log('   ⚠️  Tabla vacía');
    }

    console.log('\n3️⃣ TABLA evt_gastos:');
    const { data: gastos, error: errorGastos } = await supabase
      .from('evt_gastos')
      .select('*')
      .limit(1);
    
    if (errorGastos) {
      console.log('   ❌ Error:', errorGastos.message);
    } else if (gastos && gastos.length > 0) {
      console.log('   ✅ Columnas:', Object.keys(gastos[0]).join(', '));
    } else {
      console.log('   ⚠️  Tabla vacía');
    }

  } catch (error) {
    console.error('❌ Error crítico:', error);
  }
}

descubrirTodasLasTablas();