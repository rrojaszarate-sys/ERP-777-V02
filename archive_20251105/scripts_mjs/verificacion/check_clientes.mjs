import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkClientes() {
  console.log('🔍 Verificando clientes en la base de datos...\n');
  
  // Ver todos los clientes (activos e inactivos)
  const { data: todosClientes, error: errorTodos } = await supabase
    .from('evt_clientes')
    .select('id, razon_social, nombre_comercial, sufijo, activo, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (errorTodos) {
    console.error('❌ Error:', errorTodos.message);
    return;
  }
  
  console.log(`📊 Total clientes encontrados: ${todosClientes?.length || 0}\n`);
  
  if (todosClientes && todosClientes.length > 0) {
    console.log('Clientes:');
    console.log('━'.repeat(80));
    todosClientes.forEach(c => {
      const estado = c.activo ? '✅ ACTIVO' : '❌ INACTIVO';
      console.log(`ID: ${c.id} | ${estado}`);
      console.log(`  Razón Social: ${c.razon_social}`);
      console.log(`  Nombre Comercial: ${c.nombre_comercial || 'N/A'}`);
      console.log(`  Sufijo: ${c.sufijo || '⚠️ SIN SUFIJO'}`);
      console.log(`  Creado: ${c.created_at}`);
      console.log('━'.repeat(80));
    });
  } else {
    console.log('⚠️  No se encontraron clientes en la base de datos');
  }
  
  // Ver estructura de la tabla
  console.log('\n📋 Estructura de la tabla evt_clientes:');
  const { data: estructura } = await supabase
    .from('evt_clientes')
    .select('*')
    .limit(1);
  
  if (estructura && estructura.length > 0) {
    console.log('Columnas disponibles:', Object.keys(estructura[0]).join(', '));
  }
}

checkClientes();
