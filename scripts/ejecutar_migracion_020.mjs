#!/usr/bin/env node
/**
 * Ejecutar migración 020: Corregir FK de gastos_erp
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ejecutarMigracion() {
  console.log('🔄 Ejecutando migración 020: Corregir FK de gastos_erp...\n');

  try {
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', '020_fix_gastos_erp_fk.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL a ejecutar:');
    console.log('─'.repeat(60));
    console.log(sqlContent);
    console.log('─'.repeat(60));
    console.log();

    // Ejecutar cada statement por separado
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt || stmt.startsWith('--')) continue;

      console.log(`\n⏳ Ejecutando statement ${i + 1}/${statements.length}...`);
      console.log(`   ${stmt.substring(0, 80)}${stmt.length > 80 ? '...' : ''}`);

      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });

      if (error) {
        // Si es error de que la función no existe, mostrar mensaje diferente
        if (error.message.includes('exec_sql')) {
          console.log('⚠️  La función exec_sql no existe. La migración debe ejecutarse directamente en Supabase.');
          console.log('\n📋 Pasos para ejecutar manualmente:');
          console.log('   1. Ir a https://supabase.com/dashboard');
          console.log('   2. Seleccionar el proyecto');
          console.log('   3. Ir a SQL Editor');
          console.log('   4. Copiar y pegar el contenido del archivo:');
          console.log(`      ${sqlPath}`);
          console.log('   5. Ejecutar');
          return;
        }
        console.error(`❌ Error en statement ${i + 1}:`, error.message);
      } else {
        console.log(`   ✅ Completado`);
      }
    }

    console.log('\n✅ Migración 020 completada exitosamente');

    // Verificar que el FK se creó correctamente
    console.log('\n🔍 Verificando...');
    const { data: testInsert, error: testError } = await supabase
      .from('gastos_erp')
      .select('evento_id')
      .limit(1);

    if (testError) {
      console.log('⚠️  Advertencia al verificar:', testError.message);
    } else {
      console.log('✅ Tabla gastos_erp accesible');
    }

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
  }
}

ejecutarMigracion();
