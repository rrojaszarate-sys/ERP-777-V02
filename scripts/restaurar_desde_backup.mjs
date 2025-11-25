/**
 * Script para Restaurar Usuarios y Companies desde Backup
 *
 * Restaura desde: backups/latest/backup_data.sql
 * - core_companies
 * - core_users
 *
 * Ejecutar: node scripts/restaurar_desde_backup.mjs
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔄 Restaurando Usuarios y Companies desde Backup...\n');

async function restaurarDesdeBackup() {
  try {
    // Leer archivo de backup
    const backupPath = path.join(__dirname, '../backups/latest/backup_data.sql');

    if (!fs.existsSync(backupPath)) {
      throw new Error(`No se encontró el archivo de backup: ${backupPath}`);
    }

    console.log(`📁 Leyendo backup: ${backupPath}`);
    const backupSQL = fs.readFileSync(backupPath, 'utf8');

    // Extraer inserts de core_companies
    const companyInserts = backupSQL.match(/INSERT INTO core_companies[^;]+;/g) || [];
    console.log(`\n📦 Inserts de core_companies encontrados: ${companyInserts.length}`);

    // Extraer inserts de core_users
    const userInserts = backupSQL.match(/INSERT INTO core_users[^;]+;/g) || [];
    console.log(`👤 Inserts de core_users encontrados: ${userInserts.length}`);

    if (companyInserts.length === 0 || userInserts.length === 0) {
      throw new Error('No se encontraron datos de companies o users en el backup');
    }

    // ========================================================================
    // PASO 1: Restaurar core_companies
    // ========================================================================
    console.log('\n📦 [1/2] Restaurando core_companies...');

    // Parsear INSERT de company
    const companyMatch = companyInserts[0].match(/VALUES\s*\(([^)]+)\)/);
    if (!companyMatch) {
      throw new Error('No se pudo parsear INSERT de core_companies');
    }

    const companyValues = companyMatch[1].split(',').map(v => v.trim().replace(/^'|'$/g, ''));

    const company = {
      id: companyValues[0].replace(/'/g, ''),
      name: companyValues[1].replace(/'/g, ''),
      rfc: companyValues[2].replace(/'/g, ''),
      email: companyValues[3].replace(/'/g, ''),
      phone: companyValues[4] === 'NULL' ? null : companyValues[4].replace(/'/g, ''),
      address: companyValues[5] === 'NULL' ? null : companyValues[5].replace(/'/g, ''),
      is_active: companyValues[6] === 'true',
      settings: companyValues[7] === 'NULL' ? null : JSON.parse(companyValues[7].replace(/'::jsonb/g, '').replace(/'/g, '"')),
      created_at: companyValues[8].replace(/'/g, ''),
      updated_at: companyValues[9].replace(/'/g, '')
    };

    // Verificar si ya existe
    const { data: existingCompany } = await supabase
      .from('core_companies')
      .select('id')
      .eq('id', company.id)
      .single();

    if (existingCompany) {
      console.log(`  ✅ Company ya existe: ${company.name} (${company.id})`);
    } else {
      const { error: companyError } = await supabase
        .from('core_companies')
        .insert(company);

      if (companyError) {
        throw new Error(`Error insertando company: ${companyError.message}`);
      }

      console.log(`  ✅ Company restaurada: ${company.name} (${company.id})`);
    }

    // ========================================================================
    // PASO 2: Restaurar core_users
    // ========================================================================
    console.log('\n👤 [2/2] Restaurando core_users...');

    let usersRestored = 0;
    let usersSkipped = 0;

    for (const insert of userInserts) {
      // Parsear cada INSERT
      const match = insert.match(/VALUES\s*\(([^)]+)\)/);
      if (!match) continue;

      const values = match[1].split(',').map(v => v.trim());

      // Parsear valores con cuidado
      const parseValue = (val) => {
        if (val === 'NULL') return null;
        // Remover comillas simples
        return val.replace(/^'|'$/g, '');
      };

      const user = {
        id: parseValue(values[0]),
        company_id: parseValue(values[1]),
        email: parseValue(values[2]),
        nombre: parseValue(values[3]),
        apellidos: parseValue(values[4]),
        telefono: parseValue(values[5]),
        puesto: parseValue(values[6]),
        avatar_url: parseValue(values[7]),
        activo: values[8] === 'true',
        ultimo_login: parseValue(values[9]),
        created_at: parseValue(values[10]),
        updated_at: parseValue(values[11])
      };

      // Verificar si ya existe
      const { data: existingUser } = await supabase
        .from('core_users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingUser) {
        console.log(`  ⏭️  Usuario ya existe: ${user.email}`);
        usersSkipped++;
      } else {
        const { error: userError } = await supabase
          .from('core_users')
          .insert(user);

        if (userError) {
          console.error(`  ❌ Error insertando ${user.email}:`, userError.message);
        } else {
          console.log(`  ✅ Usuario restaurado: ${user.email} (${user.nombre} ${user.apellidos})`);
          usersRestored++;
        }
      }
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║         ✅ RESTAURACIÓN COMPLETADA EXITOSAMENTE              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Resumen:');
    console.log(`   - Company: ${company.name}`);
    console.log(`   - Usuarios restaurados: ${usersRestored}`);
    console.log(`   - Usuarios existentes: ${usersSkipped}`);
    console.log('');
    console.log('🎯 Siguiente paso: Cargar datos de eventos');
    console.log('   npm run cargar:datos');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

restaurarDesdeBackup();
