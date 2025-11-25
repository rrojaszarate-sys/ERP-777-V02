#!/usr/bin/env node

/**
 * Script para obtener la lista real de tablas en Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Crear cliente de Supabase con service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔍 Consultando tablas en el esquema public...\n');

// Consultar usando la tabla de información del sistema PostgreSQL
const { data, error } = await supabase
  .rpc('exec_sql', {
    query: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  });

if (error) {
  console.log('⚠️  La función exec_sql no está disponible.');
  console.log('Voy a intentar listar tablas conocidas del schema...\n');

  // Intentar obtener usando PostgREST schema cache
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });

  if (response.ok) {
    const schema = await response.json();
    console.log('📋 Definiciones de OpenAPI disponibles:');
    console.log(JSON.stringify(schema, null, 2));
  } else {
    console.log('❌ No se pudo obtener el esquema');
  }
} else {
  console.log('✓ Tablas encontradas:\n');
  data.forEach(table => {
    console.log(`  • ${table.table_name}`);
  });
}
