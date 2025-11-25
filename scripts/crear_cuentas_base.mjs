#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🏦 Creando cuentas contables base...\n');

const cuentasBase = [
  { id: 1, codigo: '1001', nombre: 'Caja General', tipo: 'activo', descripcion: 'Efectivo en caja chica y principal' },
  { id: 18, codigo: '5005', nombre: 'Provisiones y Catering', tipo: 'gasto', descripcion: 'Gastos en provisiones y catering' },
  { id: 19, codigo: '5006', nombre: 'Gastos de Administración', tipo: 'gasto', descripcion: 'Gastos administrativos generales' },
  { id: 20, codigo: 'AMEX-001', nombre: 'American Express', tipo: 'activo', descripcion: 'Cuenta bancaria American Express' },
  { id: 21, codigo: 'KUSP-001', nombre: 'Kuspit', tipo: 'activo', descripcion: 'Cuenta bancaria Kuspit' },
  { id: 22, codigo: 'SANT-001', nombre: 'Santander', tipo: 'activo', descripcion: 'Cuenta bancaria Santander' },
  { id: 23, codigo: 'BANO-001', nombre: 'Banorte', tipo: 'activo', descripcion: 'Cuenta bancaria Banorte' },
  { id: 24, codigo: '4001', nombre: 'Ingresos por Eventos', tipo: 'ingreso', descripcion: 'Ingresos generados por la prestación de servicios de eventos' },
  { id: 25, codigo: '4002', nombre: 'Ingresos por Servicios Adicionales', tipo: 'ingreso', descripcion: 'Ingresos por servicios complementarios' },
];

async function crearCuentas() {
  for (const cuenta of cuentasBase) {
    // Verificar si ya existe
    const { data: existe } = await supabase
      .from('evt_cuentas_contables')
      .select('id')
      .eq('id', cuenta.id)
      .single();

    if (existe) {
      console.log(`  ⏭️  Cuenta ${cuenta.id} (${cuenta.codigo}) ya existe, saltando...`);
      continue;
    }

    // Crear cuenta
    const { data, error } = await supabase
      .from('evt_cuentas_contables')
      .insert({
        id: cuenta.id,
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        descripcion: cuenta.descripcion,
        activa: true
      })
      .select();

    if (error) {
      console.error(`  ❌ Error creando cuenta ${cuenta.codigo}:`, error.message);
    } else {
      console.log(`  ✅ Cuenta ${cuenta.id} creada: ${cuenta.codigo} - ${cuenta.nombre}`);
    }
  }

  console.log('\n✨ Cuentas contables base creadas exitosamente\n');
}

crearCuentas().catch(console.error);
