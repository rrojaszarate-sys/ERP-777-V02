#!/usr/bin/env node

/**
 * GENERADOR DE DATOS DE PRUEBA INTEGRAL - VERSIÓN SIMPLIFICADA
 * Genera: 5 clientes, eventos, gastos e ingresos (mezcla pagado/pendiente)
 */

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

const log = {
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  info: (msg) => console.log(`ℹ️  ${msg}`),
};

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

console.log('\\n🔄 GENERADOR DE DATOS DE PRUEBA INTEGRAL\\n');

async function main() {
  // Obtener datos necesarios
  const { data: cuentas } = await supabase.from('evt_cuentas_contables').select('id').limit(9);
  const { data: tipos } = await supabase.from('evt_tipos_evento').select('id').limit(5);
  const { data: estados } = await supabase.from('evt_estados').select('id').limit(5);
  
  if (!cuentas || !tipos || !estados) {
    log.error('Faltan datos necesarios en la BD');
    return;
  }

  log.info(`Cuentas: ${cuentas.length}, Tipos: ${tipos.length}, Estados: ${estados.length}`);

  const clientes = [];
  const eventos = [];
  let gastosCreados = 0, gastosPagados = 0;
  let ingresosCreados = 0, ingresosPagados = 0;
  let totalGastos = 0, totalIngresos = 0;

  // 1. CREAR CLIENTES
  console.log('\\n📋 Creando clientes...');
  const empresas = [
    { razon_social: 'ACME Corp SA de CV', nombre_comercial: 'ACME', rfc: `ACM${Date.now().toString().substr(-9)}`, email: 'test1@test.mx', telefono: '5512345671' },
    { razon_social: 'Global Ventures SA de CV', nombre_comercial: 'Global', rfc: `GLV${Date.now().toString().substr(-9)}`, email: 'test2@test.mx', telefono: '5512345672' },
    { razon_social: 'Innovatech SA de CV', nombre_comercial: 'Innovatech', rfc: `INN${Date.now().toString().substr(-9)}`, email: 'test3@test.mx', telefono: '5512345673' },
    { razon_social: 'MegaCorp SA de CV', nombre_comercial: 'MegaCorp', rfc: `MEG${Date.now().toString().substr(-9)}`, email: 'test4@test.mx', telefono: '5512345674' },
    { razon_social: 'Prime Services SA de CV', nombre_comercial: 'Prime', rfc: `PRI${Date.now().toString().substr(-9)}`, email: 'test5@test.mx', telefono: '5512345675' },
  ];

  for (const emp of empresas) {
    const { data, error } = await supabase.from('evt_clientes').insert(emp).select().single();
    if (error) {
      log.error(`Error creando ${emp.nombre_comercial}: ${error.message}`);
      continue;
    }
    clientes.push(data);
    log.success(`Cliente: ${emp.nombre_comercial}`);
  }

  // 2. CREAR EVENTOS
  console.log('\\n📅 Creando eventos...');
  for (const cliente of clientes) {
    const numEventos = randomBetween(2, 3);
    for (let i = 0; i < numEventos; i++) {
      const evento = {
        clave_evento: `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        nombre_proyecto: `Proyecto ${cliente.nombre_comercial} #${i+1}`,
        cliente_id: cliente.id,
        tipo_evento_id: tipos[randomBetween(0, tipos.length-1)].id,
        estado_id: estados[randomBetween(0, estados.length-1)].id,
        fecha_evento: '2024-06-15',
        lugar: 'Centro de Convenciones',
        numero_invitados: randomBetween(50, 200)
      };

      const { data, error } = await supabase.from('evt_eventos').insert(evento).select().single();
      if (error) {
        log.error(`Error creando evento: ${error.message}`);
        continue;
      }
      eventos.push(data);
      log.success(`Evento: ${data.nombre_proyecto}`);
    }
  }

  // 3. CREAR GASTOS (70% pagados, 30% pendientes)
  console.log('\\n💸 Creando gastos...');
  for (const evento of eventos) {
    const numGastos = randomBetween(4, 6);
    for (let i = 0; i < numGastos; i++) {
      const esPagado = Math.random() < 0.7;
      const monto = randomFloat(5000, 15000);
      
      const gasto = {
        evento_id: evento.id,
        concepto: `Gasto de prueba ${i+1}`,
        total: monto,
        pagado: esPagado,
        comprobado: esPagado,
        cuenta_id: cuentas[randomBetween(0, cuentas.length-1)].id,
        fecha_gasto: '2024-06-10',
        fecha_pago: esPagado ? '2024-06-15' : null,
        tipo_comprobante: 'T'  // T = Ticket
      };

      const { error } = await supabase.from('evt_gastos').insert(gasto);
      if (error) {
        log.error(`Error creando gasto: ${error.message}`);
        continue;
      }

      gastosCreados++;
      totalGastos += monto;
      if (esPagado) gastosPagados++;
    }
  }
  log.success(`${gastosCreados} gastos creados (${gastosPagados} pagados, ${gastosCreados - gastosPagados} pendientes)`);

  // 4. CREAR INGRESOS (60% cobrados, 40% pendientes, margen 30-40%)
  console.log('\\n💰 Creando ingresos...');
  for (const evento of eventos) {
    // Calcular gastos del evento
    const { data: gastosEvento } = await supabase
      .from('evt_gastos')
      .select('total')
      .eq('evento_id', evento.id)
      .eq('pagado', true);

    const totalGastosEvento = gastosEvento?.reduce((sum, g) => sum + (g.total || 0), 0) || 50000;
    const margen = randomFloat(0.30, 0.40);
    const totalIngresosObjetivo = totalGastosEvento / (1 - margen);

    const numIngresos = randomBetween(2, 4);
    const ingresoPorItem = totalIngresosObjetivo / numIngresos;

    for (let i = 0; i < numIngresos; i++) {
      const esCobrado = Math.random() < 0.6;
      const monto = ingresoPorItem * randomFloat(0.8, 1.2);

      const ingreso = {
        evento_id: evento.id,
        concepto: `Ingreso de prueba ${i+1}`,
        total: monto,
        cobrado: esCobrado,
        facturado: esCobrado,
        fecha_ingreso: '2024-06-20',
        fecha_cobro: esCobrado ? '2024-06-25' : null
      };

      const { error } = await supabase.from('evt_ingresos').insert(ingreso);
      if (error) {
        log.error(`Error creando ingreso: ${error.message}`);
        continue;
      }

      ingresosCreados++;
      totalIngresos += monto;
      if (esCobrado) ingresosPagados++;
    }
  }
  log.success(`${ingresosCreados} ingresos creados (${ingresosPagados} cobrados, ${ingresosCreados - ingresosPagados} pendientes)`);

  // RESUMEN
  console.log(`\\n${'='.repeat(60)}`);
  console.log('📊 RESUMEN FINAL');
  console.log('='.repeat(60));
  console.log(`Clientes: ${clientes.length}`);
  console.log(`Eventos: ${eventos.length}`);
  console.log(`Gastos: ${gastosCreados} (${gastosPagados} pagados)`);
  console.log(`Ingresos: ${ingresosCreados} (${ingresosPagados} pagados)`);
  console.log(`Total gastos: $${totalGastos.toFixed(2)}`);
  console.log(`Total ingresos: $${totalIngresos.toFixed(2)}`);
  console.log(`Utilidad: $${(totalIngresos - totalGastos).toFixed(2)}`);
  console.log(`Margen: ${((totalIngresos - totalGastos) / totalIngresos * 100).toFixed(2)}%`);
  console.log('='.repeat(60));
  console.log('\\n✅ GENERACIÓN COMPLETADA\\n');
  console.log('⚠️  Los registros PENDIENTES NO deben contarse en los cálculos\\n');
  console.log('Siguiente paso: node pruebas-integrales.mjs\\n');
}

main().catch(console.error);
