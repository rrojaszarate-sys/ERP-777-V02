/**
 * Ejecuta el SQL para corregir la vista vw_eventos_analisis_financiero_erp
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function ejecutarSQL() {
  console.log('📋 Ejecutando corrección de vista...\n');

  // Leer el archivo SQL
  const sqlPath = path.join(__dirname, '../sql/FIX_VISTA_UTILIDAD_REAL.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Dividir en statements individuales
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 ${statements.length} statements a ejecutar\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ') + '...';

    console.log(`[${i + 1}/${statements.length}] ${preview}`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

      if (error) {
        // Intentar ejecutar directamente si la función RPC no existe
        console.log('   ⚠️ RPC no disponible, este SQL debe ejecutarse manualmente en Supabase');
      } else {
        console.log('   ✅ OK');
        if (data) {
          console.log('   Resultado:', data);
        }
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }

  console.log('\n✅ Proceso completado');
  console.log('\n📌 IMPORTANTE: Ejecuta el SQL manualmente en Supabase SQL Editor:');
  console.log(`   Archivo: ${sqlPath}`);
}

ejecutarSQL();
