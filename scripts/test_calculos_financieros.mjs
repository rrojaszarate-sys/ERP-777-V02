/**
 * TEST AUTOMATIZADO DE CÁLCULOS FINANCIEROS
 *
 * Este script crea un evento de prueba con datos controlados similares a DoTerra
 * y verifica que todos los cálculos sean correctos en cada paso.
 *
 * DATOS BASE (variación ~5-10% de DoTerra):
 * - Ingreso Estimado: $4,600,000
 * - Ingresos Reales: $4,500,000 (cobrado: $4,200,000, pendiente: $300,000)
 * - Provisiones: $1,600,000
 * - Gastos: $2,100,000 (pagados: $1,500,000, pendientes: $600,000)
 *
 * FÓRMULAS ESPERADAS:
 * - Provisiones Disponibles = MAX(0, Provisiones - Gastos) = MAX(0, 1,600,000 - 2,100,000) = 0
 * - Utilidad = Ingresos - Gastos - Prov.Disponibles = 4,500,000 - 2,100,000 - 0 = 2,400,000
 * - Margen = (Utilidad / Ingresos) * 100 = (2,400,000 / 4,500,000) * 100 = 53.33%
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`)
};

// Datos de prueba controlados
const TEST_DATA = {
  evento: {
    clave_evento: 'TEST-CALC-001',
    nombre_proyecto: 'EVENTO PRUEBA CÁLCULOS FINANCIEROS',
    descripcion: 'Evento de prueba para validar cálculos financieros',
    fecha_evento: '2025-03-15',
    fecha_fin: '2025-03-17',
    lugar: 'Centro de Pruebas',
    numero_invitados: 500,
    ingreso_estimado: 4600000, // ~5% más que DoTerra
  },
  ingresos: [
    { concepto: 'Patrocinio Principal', total: 2500000, cobrado: true },
    { concepto: 'Entradas VIP', total: 1200000, cobrado: true },
    { concepto: 'Stands Expositores', total: 500000, cobrado: true },
    { concepto: 'Publicidad Evento', total: 300000, cobrado: false }, // Pendiente
  ],
  provisiones: [
    { concepto: 'Combustible y Peajes', total: 400000, categoria_clave: 'COMB' },
    { concepto: 'Materiales Evento', total: 500000, categoria_clave: 'MAT' },
    { concepto: 'Personal y RH', total: 450000, categoria_clave: 'RH' },
    { concepto: 'Solicitudes de Pago', total: 250000, categoria_clave: 'SP' },
  ],
  gastos: [
    // Combustible (pagados y pendientes)
    { concepto: 'Gasolina Vehículos', total: 180000, pagado: true, categoria: 'Combustible/Peaje' },
    { concepto: 'Peajes Carreteras', total: 80000, pagado: true, categoria: 'Combustible/Peaje' },
    { concepto: 'Combustible Pendiente', total: 140000, pagado: false, categoria: 'Combustible/Peaje' },
    // Materiales
    { concepto: 'Escenografía', total: 350000, pagado: true, categoria: 'Materiales' },
    { concepto: 'Materiales Decoración', total: 200000, pagado: true, categoria: 'Materiales' },
    { concepto: 'Equipo Audio/Video', total: 150000, pagado: false, categoria: 'Materiales' },
    // RH
    { concepto: 'Honorarios Staff', total: 400000, pagado: true, categoria: 'Recursos Humanos' },
    { concepto: 'Bonos Personal', total: 150000, pagado: false, categoria: 'Recursos Humanos' },
    // Solicitudes de Pago
    { concepto: 'Catering', total: 290000, pagado: true, categoria: 'Solicitudes de Pago' },
    { concepto: 'Seguridad', total: 160000, pagado: false, categoria: 'Solicitudes de Pago' },
  ]
};

// Valores esperados (calculados manualmente)
// FÓRMULA: Utilidad = Ingresos - Gastos - Provisiones
const EXPECTED = {
  // Ingresos
  ingresos_cobrados: 2500000 + 1200000 + 500000, // 4,200,000
  ingresos_pendientes: 300000,
  ingresos_totales: 4500000,

  // Provisiones (compromisos de gasto futuro)
  provisiones_total: 400000 + 500000 + 450000 + 250000, // 1,600,000

  // Gastos
  gastos_pagados: 180000 + 80000 + 350000 + 200000 + 400000 + 290000, // 1,500,000
  gastos_pendientes: 140000 + 150000 + 150000 + 160000, // 600,000
  gastos_totales: 2100000,

  // Cálculos derivados
  // Utilidad = Ingresos - Gastos - Provisiones = 4,500,000 - 2,100,000 - 1,600,000 = 800,000
  utilidad_real: 4500000 - 2100000 - 1600000, // 800,000
  margen_real_pct: (800000 / 4500000) * 100, // 17.78%
};

let testEventoId = null;
let companyId = null;
let proveedorId = null;
let testResults = { passed: 0, failed: 0, errors: [] };

function assertEqual(actual, expected, description, tolerance = 0.01) {
  const diff = Math.abs(actual - expected);
  const percentDiff = expected !== 0 ? (diff / expected) * 100 : diff;

  if (percentDiff <= tolerance * 100) {
    log.success(`${description}: ${actual.toLocaleString()} ✓`);
    testResults.passed++;
    return true;
  } else {
    log.error(`${description}: Esperado ${expected.toLocaleString()}, Obtenido ${actual.toLocaleString()} (diff: ${diff.toLocaleString()})`);
    testResults.failed++;
    testResults.errors.push({ description, expected, actual, diff });
    return false;
  }
}

async function cleanup() {
  log.header('LIMPIEZA INICIAL');

  // Buscar y eliminar evento de prueba anterior
  const { data: existingEvento } = await supabase
    .from('evt_eventos_erp')
    .select('id')
    .eq('clave_evento', TEST_DATA.evento.clave_evento)
    .single();

  if (existingEvento) {
    log.info(`Encontrado evento de prueba anterior (ID: ${existingEvento.id}), eliminando...`);

    // Eliminar gastos
    await supabase.from('evt_gastos_erp').delete().eq('evento_id', existingEvento.id);
    // Eliminar provisiones
    await supabase.from('evt_provisiones_erp').delete().eq('evento_id', existingEvento.id);
    // Eliminar ingresos
    await supabase.from('evt_ingresos_erp').delete().eq('evento_id', existingEvento.id);
    // Eliminar evento
    await supabase.from('evt_eventos_erp').delete().eq('id', existingEvento.id);

    log.success('Evento de prueba anterior eliminado');
  } else {
    log.info('No hay evento de prueba anterior');
  }
}

async function getReferences() {
  // Obtener company_id de un evento existente
  const { data: eventoExistente } = await supabase
    .from('evt_eventos_erp')
    .select('company_id')
    .limit(1)
    .single();

  companyId = eventoExistente?.company_id || '00000000-0000-0000-0000-000000000001';

  // Obtener un proveedor
  const { data: proveedor } = await supabase
    .from('cat_proveedores')
    .select('id')
    .limit(1)
    .single();

  proveedorId = proveedor?.id || 45;

  log.info(`Company ID: ${companyId}`);
  log.info(`Proveedor ID: ${proveedorId}`);
}

async function createTestEvento() {
  log.header('PASO 1: CREAR EVENTO DE PRUEBA');

  // Obtener IDs necesarios
  const { data: cliente } = await supabase
    .from('evt_clientes_erp')
    .select('id')
    .limit(1)
    .single();

  const { data: estado } = await supabase
    .from('evt_estados_erp')
    .select('id')
    .eq('nombre', 'Activo')
    .single();

  const { data: tipoEvento } = await supabase
    .from('evt_tipos_evento_erp')
    .select('id')
    .limit(1)
    .single();

  const eventoData = {
    ...TEST_DATA.evento,
    cliente_id: cliente?.id || 191,
    estado_id: estado?.id || 1,
    tipo_evento_id: tipoEvento?.id || 1,
    company_id: companyId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: evento, error } = await supabase
    .from('evt_eventos_erp')
    .insert([eventoData])
    .select()
    .single();

  if (error) {
    log.error(`Error creando evento: ${error.message}`);
    throw error;
  }

  testEventoId = evento.id;
  log.success(`Evento creado con ID: ${testEventoId}`);
  log.info(`Clave: ${evento.clave_evento}`);
  log.info(`Ingreso Estimado: $${evento.ingreso_estimado.toLocaleString()}`);

  return evento;
}

async function createTestIngresos() {
  log.header('PASO 2: CREAR INGRESOS DE PRUEBA');

  let totalCobrado = 0;
  let totalPendiente = 0;

  for (const ingreso of TEST_DATA.ingresos) {
    const subtotal = ingreso.total / 1.16; // Calcular subtotal sin IVA
    const iva = ingreso.total - subtotal;

    const ingresoData = {
      evento_id: testEventoId,
      company_id: companyId,
      concepto: ingreso.concepto,
      subtotal: subtotal,
      iva: iva,
      total: ingreso.total,
      cobrado: ingreso.cobrado,
      status_cobro: ingreso.cobrado ? 'cobrado' : 'pendiente',
      fecha_cobro: ingreso.cobrado ? new Date().toISOString() : null,
      fecha_ingreso: new Date().toISOString(),
      fecha_creacion: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('evt_ingresos_erp')
      .insert([ingresoData]);

    if (error) {
      log.error(`Error creando ingreso "${ingreso.concepto}": ${error.message}`);
    } else {
      const status = ingreso.cobrado ? '💰 Cobrado' : '⏳ Pendiente';
      log.info(`${status}: ${ingreso.concepto} = $${ingreso.total.toLocaleString()}`);

      if (ingreso.cobrado) {
        totalCobrado += ingreso.total;
      } else {
        totalPendiente += ingreso.total;
      }
    }
  }

  console.log('');
  log.info(`Total Cobrado: $${totalCobrado.toLocaleString()}`);
  log.info(`Total Pendiente: $${totalPendiente.toLocaleString()}`);
  log.info(`Total Ingresos: $${(totalCobrado + totalPendiente).toLocaleString()}`);

  // Verificar
  assertEqual(totalCobrado, EXPECTED.ingresos_cobrados, 'Ingresos Cobrados');
  assertEqual(totalPendiente, EXPECTED.ingresos_pendientes, 'Ingresos Pendientes');
  assertEqual(totalCobrado + totalPendiente, EXPECTED.ingresos_totales, 'Ingresos Totales');
}

async function createTestProvisiones() {
  log.header('PASO 3: CREAR PROVISIONES DE PRUEBA');

  // Obtener categorías
  const { data: categorias } = await supabase
    .from('cat_categorias_gasto')
    .select('id, clave, nombre');

  let totalProvisiones = 0;

  for (const provision of TEST_DATA.provisiones) {
    const categoria = categorias?.find(c => c.clave === provision.categoria_clave);
    const subtotal = provision.total / 1.16;
    const iva = provision.total - subtotal;

    const provisionData = {
      evento_id: testEventoId,
      company_id: companyId,
      proveedor_id: proveedorId,
      concepto: provision.concepto,
      cantidad: 1,
      precio_unitario: subtotal,
      subtotal: subtotal,
      iva_porcentaje: 16,
      iva: iva,
      total: provision.total,
      categoria_id: categoria?.id,
      activo: true,
      estado: 'aprobado',
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('evt_provisiones_erp')
      .insert([provisionData]);

    if (error) {
      log.error(`Error creando provisión "${provision.concepto}": ${error.message}`);
    } else {
      log.info(`📋 ${provision.concepto} (${provision.categoria_clave}): $${provision.total.toLocaleString()}`);
      totalProvisiones += provision.total;
    }
  }

  console.log('');
  log.info(`Total Provisiones: $${totalProvisiones.toLocaleString()}`);

  // Verificar
  assertEqual(totalProvisiones, EXPECTED.provisiones_total, 'Total Provisiones');
}

async function createTestGastos() {
  log.header('PASO 4: CREAR GASTOS DE PRUEBA');

  // Obtener categorías de gastos
  const { data: categorias } = await supabase
    .from('evt_categorias_gastos_erp')
    .select('id, nombre');

  let totalPagados = 0;
  let totalPendientes = 0;

  for (const gasto of TEST_DATA.gastos) {
    const categoria = categorias?.find(c => c.nombre === gasto.categoria);
    const subtotal = gasto.total / 1.16;
    const iva = gasto.total - subtotal;

    const gastoData = {
      evento_id: testEventoId,
      company_id: companyId,
      // proveedor_id es opcional en gastos
      concepto: gasto.concepto,
      subtotal: subtotal,
      iva: iva,
      total: gasto.total,
      pagado: gasto.pagado,
      status: gasto.pagado ? 'pagado' : 'pendiente',
      categoria_id: categoria?.id,
      fecha_gasto: new Date().toISOString(),
      fecha_creacion: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('evt_gastos_erp')
      .insert([gastoData]);

    if (error) {
      log.error(`Error creando gasto "${gasto.concepto}": ${error.message}`);
    } else {
      const status = gasto.pagado ? '✅ Pagado' : '⏳ Pendiente';
      log.info(`${status}: ${gasto.concepto} = $${gasto.total.toLocaleString()}`);

      if (gasto.pagado) {
        totalPagados += gasto.total;
      } else {
        totalPendientes += gasto.total;
      }
    }
  }

  console.log('');
  log.info(`Gastos Pagados: $${totalPagados.toLocaleString()}`);
  log.info(`Gastos Pendientes: $${totalPendientes.toLocaleString()}`);
  log.info(`Total Gastos: $${(totalPagados + totalPendientes).toLocaleString()}`);

  // Verificar
  assertEqual(totalPagados, EXPECTED.gastos_pagados, 'Gastos Pagados');
  assertEqual(totalPendientes, EXPECTED.gastos_pendientes, 'Gastos Pendientes');
  assertEqual(totalPagados + totalPendientes, EXPECTED.gastos_totales, 'Gastos Totales');
}

async function verifyVistaFinanciera() {
  log.header('PASO 5: VERIFICAR VISTA vw_eventos_analisis_financiero_erp');

  // Esperar un momento para que la vista se actualice
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { data: eventoVista, error } = await supabase
    .from('vw_eventos_analisis_financiero_erp')
    .select('*')
    .eq('id', testEventoId)
    .single();

  if (error) {
    log.error(`Error consultando vista: ${error.message}`);
    return null;
  }

  console.log('\n📊 DATOS DE LA VISTA:');
  console.log('─'.repeat(50));

  // Verificar ingresos
  console.log('\n💰 INGRESOS:');
  assertEqual(eventoVista.ingresos_cobrados || 0, EXPECTED.ingresos_cobrados, '  ingresos_cobrados');
  assertEqual(eventoVista.ingresos_pendientes || 0, EXPECTED.ingresos_pendientes, '  ingresos_pendientes');
  assertEqual(eventoVista.ingresos_totales || 0, EXPECTED.ingresos_totales, '  ingresos_totales');

  // Verificar provisiones
  console.log('\n📋 PROVISIONES:');
  assertEqual(eventoVista.provisiones_total || 0, EXPECTED.provisiones_total, '  provisiones_total');

  // Verificar gastos
  console.log('\n💸 GASTOS:');
  assertEqual(eventoVista.gastos_pagados_total || 0, EXPECTED.gastos_pagados, '  gastos_pagados_total');
  assertEqual(eventoVista.gastos_pendientes_total || 0, EXPECTED.gastos_pendientes, '  gastos_pendientes_total');
  assertEqual(eventoVista.gastos_totales || 0, EXPECTED.gastos_totales, '  gastos_totales');

  // Verificar cálculos derivados
  console.log('\n📈 CÁLCULOS DERIVADOS (Utilidad = Ingresos - Gastos - Provisiones):');

  // Utilidad = Ingresos - Gastos - Provisiones
  assertEqual(eventoVista.utilidad_real || 0, EXPECTED.utilidad_real, '  utilidad_real');

  // Margen
  assertEqual(eventoVista.margen_real_pct || 0, EXPECTED.margen_real_pct, '  margen_real_pct');

  return eventoVista;
}

async function verifyCalculosManual(eventoVista) {
  log.header('PASO 6: VERIFICACIÓN MANUAL DE FÓRMULAS');

  const ingresos = eventoVista.ingresos_totales || 0;
  const gastos = eventoVista.gastos_totales || 0;
  const provisiones = eventoVista.provisiones_total || 0;

  console.log('\n🧮 APLICANDO FÓRMULAS:');
  console.log('─'.repeat(50));

  // Fórmula: Utilidad = Ingresos - Gastos - Provisiones
  console.log('\n1️⃣ UTILIDAD = Ingresos - Gastos - Provisiones');
  console.log(`   = ${ingresos.toLocaleString()} - ${gastos.toLocaleString()} - ${provisiones.toLocaleString()}`);
  const utilidadCalculada = ingresos - gastos - provisiones;
  console.log(`   = ${utilidadCalculada.toLocaleString()}`);
  assertEqual(utilidadCalculada, EXPECTED.utilidad_real, '   Verificación Utilidad');

  // Fórmula: Margen = (Utilidad / Ingresos) × 100
  console.log('\n2️⃣ MARGEN = (Utilidad / Ingresos) × 100');
  console.log(`   = (${utilidadCalculada.toLocaleString()} / ${ingresos.toLocaleString()}) × 100`);
  const margenCalculado = ingresos > 0 ? (utilidadCalculada / ingresos) * 100 : 0;
  console.log(`   = ${margenCalculado.toFixed(2)}%`);
  assertEqual(margenCalculado, EXPECTED.margen_real_pct, '   Verificación Margen');
}

async function printSummary() {
  log.header('RESUMEN DE PRUEBAS');

  const total = testResults.passed + testResults.failed;
  const percentage = ((testResults.passed / total) * 100).toFixed(1);

  console.log(`\n📊 RESULTADOS:`);
  console.log(`   ✅ Pasadas: ${testResults.passed}`);
  console.log(`   ❌ Fallidas: ${testResults.failed}`);
  console.log(`   📈 Porcentaje: ${percentage}%`);

  if (testResults.errors.length > 0) {
    console.log('\n❌ ERRORES ENCONTRADOS:');
    testResults.errors.forEach((err, i) => {
      console.log(`\n   ${i + 1}. ${err.description}`);
      console.log(`      Esperado: ${err.expected.toLocaleString()}`);
      console.log(`      Obtenido: ${err.actual.toLocaleString()}`);
      console.log(`      Diferencia: ${err.diff.toLocaleString()}`);
    });
  }

  if (testResults.failed === 0) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON! Los cálculos son correctos.');
  } else {
    console.log('\n⚠️ Hay errores en los cálculos. Revisar la vista o las fórmulas.');
  }

  console.log(`\n📝 Evento de prueba ID: ${testEventoId}`);
  console.log(`   Clave: ${TEST_DATA.evento.clave_evento}`);
  console.log('   (Puedes ver este evento en la aplicación para verificar visualmente)');
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║     TEST AUTOMATIZADO DE CÁLCULOS FINANCIEROS - ERP EVENTOS      ║
╠══════════════════════════════════════════════════════════════════╣
║  Este script verifica que todos los cálculos financieros         ║
║  de la vista vw_eventos_analisis_financiero_erp sean correctos   ║
╚══════════════════════════════════════════════════════════════════╝
`);

  console.log('📋 VALORES ESPERADOS (calculados manualmente):');
  console.log('─'.repeat(50));
  console.log(`   Ingresos Cobrados:      $${EXPECTED.ingresos_cobrados.toLocaleString()}`);
  console.log(`   Ingresos Pendientes:    $${EXPECTED.ingresos_pendientes.toLocaleString()}`);
  console.log(`   Ingresos Totales:       $${EXPECTED.ingresos_totales.toLocaleString()}`);
  console.log(`   Provisiones Total:      $${EXPECTED.provisiones_total.toLocaleString()}`);
  console.log(`   Gastos Pagados:         $${EXPECTED.gastos_pagados.toLocaleString()}`);
  console.log(`   Gastos Pendientes:      $${EXPECTED.gastos_pendientes.toLocaleString()}`);
  console.log(`   Gastos Totales:         $${EXPECTED.gastos_totales.toLocaleString()}`);
  console.log(`   Prov. Disponibles:      $${EXPECTED.provisiones_disponibles.toLocaleString()}`);
  console.log(`   Utilidad Real:          $${EXPECTED.utilidad_real.toLocaleString()}`);
  console.log(`   Margen Real:            ${EXPECTED.margen_real_pct.toFixed(2)}%`);

  try {
    await cleanup();
    await getReferences();
    await createTestEvento();
    await createTestIngresos();
    await createTestProvisiones();
    await createTestGastos();
    const eventoVista = await verifyVistaFinanciera();
    if (eventoVista) {
      await verifyCalculosManual(eventoVista);
    }
    await printSummary();
  } catch (error) {
    log.error(`Error fatal: ${error.message}`);
    console.error(error);
  }
}

main();
