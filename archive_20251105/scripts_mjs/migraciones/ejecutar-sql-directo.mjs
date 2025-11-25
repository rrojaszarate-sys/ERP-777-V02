import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Extraer el project ref de la URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

console.log('🚀 Ejecutando migración SQL en Supabase...\n');
console.log(`📡 Project: ${projectRef}`);
console.log(`🔗 URL: ${supabaseUrl}\n`);

const sql = readFileSync('./ejecutar-migracion-simple.sql', 'utf8');

// Usar la API de PostgREST para ejecutar SQL
// Nota: Esto solo funciona si hay una función RPC disponible
async function ejecutarSQL() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error de API:', error);
      console.log('\n💡 SOLUCIÓN:');
      console.log('   La API REST no permite ejecutar SQL arbitrario por seguridad.');
      console.log('   Debes ejecutar manualmente en Supabase Dashboard:\n');
      console.log('   1. Ir a: https://supabase.com/dashboard/project/' + projectRef + '/sql');
      console.log('   2. Abrir el archivo: ejecutar-migracion-simple.sql');
      console.log('   3. Copiar TODO el contenido');
      console.log('   4. Pegarlo en el SQL Editor');
      console.log('   5. Click en "Run" (▶️)\n');
      return false;
    }

    const result = await response.json();
    console.log('✅ Migración ejecutada exitosamente:', result);
    return true;

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 INSTRUCCIONES PARA EJECUTAR MANUALMENTE:\n');
    console.log('=' . repeat(70));
    console.log('Copia el siguiente enlace en tu navegador:');
    console.log(`https://supabase.com/dashboard/project/${projectRef}/sql`);
    console.log('=' . repeat(70));
    console.log('\nLuego:');
    console.log('1. Click en "New Query"');
    console.log('2. Abrir: ejecutar-migracion-simple.sql');
    console.log('3. Copiar TODO y pegar en el editor');
    console.log('4. Click en "Run" (▶️)');
    console.log('5. Verificar que dice "Success"\n');
    return false;
  }
}

ejecutarSQL();
