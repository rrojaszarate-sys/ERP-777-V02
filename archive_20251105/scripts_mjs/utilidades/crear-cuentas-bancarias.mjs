#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env');
let SUPABASE_URL, SUPABASE_SERVICE_KEY;

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      SUPABASE_URL = line.split('=')[1].trim().replace(/["']/g, '');
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      SUPABASE_SERVICE_KEY = line.split('=')[1].trim().replace(/["']/g, '');
    }
  }
} catch (error) {
  console.error('❌ Error al leer archivo .env:', error.message);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function crearCuentasBancarias() {
  console.log('🏦 Verificando cuentas bancarias...\n');

  const { data: cuentasExistentes } = await supabase
    .from('evt_cuentas_contables')
    .select('id, codigo, nombre');

  console.log(`📊 Cuentas existentes: ${cuentasExistentes?.length || 0}\n`);

  if (cuentasExistentes && cuentasExistentes.length > 0) {
    console.log('✅ Ya existen cuentas bancarias:');
    cuentasExistentes.forEach(c => console.log(`   - ${c.nombre} (ID: ${c.id}, Código: ${c.codigo})`));
    return;
  }

  console.log('➕ Creando cuentas bancarias...\n');

  const cuentas = [
    {
      codigo: 'BNK001',
      nombre: 'BBVA Empresarial',
      tipo: 'banco',
      descripcion: 'Cuenta empresarial BBVA - 0115678901234567'
    },
    {
      codigo: 'BNK002',
      nombre: 'Santander Negocios',
      tipo: 'banco',
      descripcion: 'Cuenta de negocios Santander - 0145678901234567'
    },
    {
      codigo: 'BNK003',
      nombre: 'Banorte Ahorro',
      tipo: 'banco',
      descripcion: 'Cuenta de ahorro Banorte - 0725678901234567'
    },
    {
      codigo: 'BNK004',
      nombre: 'HSBC Inversión',
      tipo: 'banco',
      descripcion: 'Cuenta de inversión HSBC - 0215678901234567'
    },
    {
      codigo: 'BNK005',
      nombre: 'ScotiaBank Principal',
      tipo: 'banco',
      descripcion: 'Cuenta principal ScotiaBank - 0445678901234567'
    }
  ];

  for (const cuenta of cuentas) {
    const { data, error } = await supabase
      .from('evt_cuentas_contables')
      .insert(cuenta)
      .select();

    if (error) {
      console.error(`❌ Error creando ${cuenta.nombre}:`, error.message);
    } else {
      console.log(`✅ Creada: ${cuenta.nombre} (ID: ${data[0].id}, Código: ${data[0].codigo})`);
    }
  }

  console.log('\n✅ Cuentas bancarias creadas exitosamente!');
}

crearCuentasBancarias();
