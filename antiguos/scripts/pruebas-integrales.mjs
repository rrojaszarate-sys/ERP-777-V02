#!/usr/bin/env node

/**
 * PRUEBAS INTEGRALES DEL SISTEMA
 * Fecha: 2025-10-27
 * Objetivo: Validar funcionamiento completo y detectar fallos
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de Supabase
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

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}${colors.reset}\n`),
  critical: (msg) => console.log(`${colors.red}${colors.bright}🔥 CRÍTICO: ${msg}${colors.reset}`),
};

// Contadores
let totalPruebas = 0;
let pruebasExitosas = 0;
let pruebasFallidas = 0;
const fallos = [];

function registrarFallo(categoria, prueba, descripcion, severidad = 'MEDIA') {
  fallos.push({
    categoria,
    prueba,
    descripcion,
    severidad,
    timestamp: new Date().toISOString()
  });
}

function assert(condicion, nombrePrueba, detalles = '', severidad = 'MEDIA') {
  totalPruebas++;
  if (condicion) {
    pruebasExitosas++;
    log.success(nombrePrueba);
    if (detalles) console.log(`   ${colors.cyan}${detalles}${colors.reset}`);
    return true;
  } else {
    pruebasFallidas++;
    if (severidad === 'CRÍTICA') {
      log.critical(nombrePrueba);
    } else {
      log.error(nombrePrueba);
    }
    if (detalles) console.log(`   ${colors.red}${detalles}${colors.reset}`);
    registrarFallo('General', nombrePrueba, detalles, severidad);
    return false;
  }
}

function formatMoney(amount) {
  return `$${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
}

async function ejecutarPruebas() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║              PRUEBAS INTEGRALES DEL SISTEMA                      ║
║              Sistema ERP - Módulo de Eventos                     ║
║              Fecha: ${new Date().toLocaleDateString('es-MX')}                                     ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

  try {
    // =====================================================
    // 1. VALIDAR QUE NO SE CONSIDEREN REGISTROS NO PAGADOS
    // =====================================================
    log.section('1️⃣  VALIDACIÓN: REGISTROS NO PAGADOS NO DEBEN CONTARSE');

    // Obtener gastos pagados y pendientes
    const { data: gastos } = await supabase
      .from('evt_gastos')
      .select('id, total, status_pago, evento_id');

    const gastosPagados = gastos.filter(g => g.status_pago === 'pagado');
    const gastosPendientes = gastos.filter(g => g.status_pago !== 'pagado');
    
    log.info(`Gastos totales: ${gastos.length}`);
    log.info(`Gastos pagados: ${gastosPagados.length}`);
    log.info(`Gastos pendientes: ${gastosPendientes.length}`);

    // Obtener ingresos pagados y pendientes
    const { data: ingresos } = await supabase
      .from('evt_ingresos')
      .select('id, total, status_pago, evento_id');

    const ingresosPagados = ingresos.filter(i => i.status_pago === 'pagado');
    const ingresosPendientes = ingresos.filter(i => i.status_pago !== 'pagado');
    
    log.info(`Ingresos totales: ${ingresos.length}`);
    log.info(`Ingresos pagados: ${ingresosPagados.length}`);
    log.info(`Ingresos pendientes: ${ingresosPendientes.length}`);

    // Calcular totales reales (solo pagados)
    const totalGastosPagados = gastosPagados.reduce((sum, g) => sum + (g.total || 0), 0);
    const totalIngresosPagados = ingresosPagados.reduce((sum, i) => sum + (i.total || 0), 0);

    // =====================================================
    // 2. VALIDAR VISTA vw_eventos_completos
    // =====================================================
    log.section('2️⃣  VALIDACIÓN: VISTA vw_eventos_completos');

    const { data: eventosVista } = await supabase
      .from('vw_eventos_completos')
      .select('id, nombre_proyecto, total, total_gastos, utilidad, margen_utilidad');

    assert(eventosVista && eventosVista.length > 0, 
      'Vista vw_eventos_completos devuelve datos', 
      `Eventos encontrados: ${eventosVista?.length || 0}`);

    // Verificar que los totales en la vista coincidan con SOLO datos pagados
    const totalIngresosVista = eventosVista.reduce((sum, e) => sum + (e.total || 0), 0);
    const totalGastosVista = eventosVista.reduce((sum, e) => sum + (e.total_gastos || 0), 0);

    log.info(`Total ingresos en vista: ${formatMoney(totalIngresosVista)}`);
    log.info(`Total gastos en vista: ${formatMoney(totalGastosVista)}`);
    log.info(`Total ingresos pagados (real): ${formatMoney(totalIngresosPagados)}`);
    log.info(`Total gastos pagados (real): ${formatMoney(totalGastosPagados)}`);

    const diffIngresos = Math.abs(totalIngresosVista - totalIngresosPagados);
    const diffGastos = Math.abs(totalGastosVista - totalGastosPagados);

    assert(diffIngresos < 0.01, 
      'Vista NO incluye ingresos pendientes', 
      diffIngresos < 0.01 ? 'OK' : `Diferencia: ${formatMoney(diffIngresos)} - La vista podría estar incluyendo pendientes`,
      'CRÍTICA');

    assert(diffGastos < 0.01, 
      'Vista NO incluye gastos pendientes', 
      diffGastos < 0.01 ? 'OK' : `Diferencia: ${formatMoney(diffGastos)} - La vista podría estar incluyendo pendientes`,
      'CRÍTICA');

    // =====================================================
    // 3. VALIDAR VISTA vw_master_facturacion
    // =====================================================
    log.section('3️⃣  VALIDACIÓN: VISTA vw_master_facturacion');

    const { data: masterFacturacion } = await supabase
      .from('vw_master_facturacion')
      .select('evento_id, evento_nombre, total, total_gastos, utilidad, margen_utilidad');

    assert(masterFacturacion && masterFacturacion.length > 0,
      'Vista vw_master_facturacion devuelve datos',
      `Eventos encontrados: ${masterFacturacion?.length || 0}`);

    const totalIngresosMaster = masterFacturacion.reduce((sum, e) => sum + (e.total || 0), 0);
    const totalGastosMaster = masterFacturacion.reduce((sum, e) => sum + (e.total_gastos || 0), 0);

    log.info(`Total ingresos en master: ${formatMoney(totalIngresosMaster)}`);
    log.info(`Total gastos en master: ${formatMoney(totalGastosMaster)}`);

    const diffIngresosMaster = Math.abs(totalIngresosMaster - totalIngresosPagados);
    const diffGastosMaster = Math.abs(totalGastosMaster - totalGastosPagados);

    assert(diffIngresosMaster < 0.01,
      'Master facturación NO incluye ingresos pendientes',
      diffIngresosMaster < 0.01 ? 'OK' : `Diferencia: ${formatMoney(diffIngresosMaster)}`,
      'CRÍTICA');

    assert(diffGastosMaster < 0.01,
      'Master facturación NO incluye gastos pendientes',
      diffGastosMaster < 0.01 ? 'OK' : `Diferencia: ${formatMoney(diffGastosMaster)}`,
      'CRÍTICA');

    // =====================================================
    // 4. VALIDAR CONGRUENCIA ENTRE MÓDULOS
    // =====================================================
    log.section('4️⃣  VALIDACIÓN: CONGRUENCIA ENTRE VISTAS');

    const diffIngresosEntreVistas = Math.abs(totalIngresosVista - totalIngresosMaster);
    const diffGastosEntreVistas = Math.abs(totalGastosVista - totalGastosMaster);

    assert(diffIngresosEntreVistas < 0.01,
      'Ingresos consistentes entre vw_eventos_completos y vw_master_facturacion',
      diffIngresosEntreVistas < 0.01 ? 'OK' : `Diferencia: ${formatMoney(diffIngresosEntreVistas)}`,
      'CRÍTICA');

    assert(diffGastosEntreVistas < 0.01,
      'Gastos consistentes entre vw_eventos_completos y vw_master_facturacion',
      diffGastosEntreVistas < 0.01 ? 'OK' : `Diferencia: ${formatMoney(diffGastosEntreVistas)}`,
      'CRÍTICA');

    // =====================================================
    // 5. VALIDAR CÁLCULOS POR EVENTO
    // =====================================================
    log.section('5️⃣  VALIDACIÓN: CÁLCULOS POR EVENTO');

    let eventosConErrores = 0;

    for (const evento of eventosVista) {
      // Obtener gastos PAGADOS del evento
      const gastosEventoPagados = gastos.filter(g => 
        g.evento_id === evento.id && g.status_pago === 'pagado'
      );
      const totalGastosReal = gastosEventoPagados.reduce((sum, g) => sum + (g.total || 0), 0);

      // Obtener ingresos PAGADOS del evento
      const ingresosEventoPagados = ingresos.filter(i => 
        i.evento_id === evento.id && i.status_pago === 'pagado'
      );
      const totalIngresosReal = ingresosEventoPagados.reduce((sum, i) => sum + (i.total || 0), 0);

      const diffIngresosEvento = Math.abs(evento.total - totalIngresosReal);
      const diffGastosEvento = Math.abs(evento.total_gastos - totalGastosReal);

      if (diffIngresosEvento > 0.01 || diffGastosEvento > 0.01) {
        eventosConErrores++;
        log.error(`Evento ${evento.nombre_proyecto} tiene inconsistencias:`);
        if (diffIngresosEvento > 0.01) {
          console.log(`   Ingresos vista: ${formatMoney(evento.total)} vs Real: ${formatMoney(totalIngresosReal)} (diff: ${formatMoney(diffIngresosEvento)})`);
          registrarFallo('Cálculos por Evento', `Ingresos - ${evento.nombre_proyecto}`, 
            `Diferencia de ${formatMoney(diffIngresosEvento)}`, 'ALTA');
        }
        if (diffGastosEvento > 0.01) {
          console.log(`   Gastos vista: ${formatMoney(evento.total_gastos)} vs Real: ${formatMoney(totalGastosReal)} (diff: ${formatMoney(diffGastosEvento)})`);
          registrarFallo('Cálculos por Evento', `Gastos - ${evento.nombre_proyecto}`, 
            `Diferencia de ${formatMoney(diffGastosEvento)}`, 'ALTA');
        }
      }
    }

    assert(eventosConErrores === 0,
      'Todos los eventos tienen cálculos correctos',
      eventosConErrores === 0 ? 'OK' : `${eventosConErrores} eventos con errores`,
      'CRÍTICA');

    // =====================================================
    // 6. VALIDAR MÁRGENES DE UTILIDAD
    // =====================================================
    log.section('6️⃣  VALIDACIÓN: MÁRGENES DE UTILIDAD (30-40%)');

    let eventosMargenIncorrecto = 0;

    for (const evento of eventosVista) {
      if (evento.total > 0) {
        const margenCalculado = ((evento.total - evento.total_gastos) / evento.total) * 100;
        const diffMargen = Math.abs(evento.margen_utilidad - margenCalculado);

        if (diffMargen > 0.1) {
          eventosMargenIncorrecto++;
          log.error(`Margen incorrecto en ${evento.nombre_proyecto}:`);
          console.log(`   Vista: ${evento.margen_utilidad?.toFixed(2)}% vs Calculado: ${margenCalculado.toFixed(2)}%`);
          registrarFallo('Márgenes', evento.nombre_proyecto, 
            `Margen vista: ${evento.margen_utilidad?.toFixed(2)}%, Calculado: ${margenCalculado.toFixed(2)}%`, 'MEDIA');
        }

        // Validar que el margen esté entre 30-40%
        if (margenCalculado < 25 || margenCalculado > 45) {
          log.warning(`Margen fuera de rango objetivo (30-40%) en ${evento.nombre_proyecto}: ${margenCalculado.toFixed(2)}%`);
        }
      }
    }

    assert(eventosMargenIncorrecto === 0,
      'Cálculos de margen correctos en todos los eventos',
      eventosMargenIncorrecto === 0 ? 'OK' : `${eventosMargenIncorrecto} eventos con margen incorrecto`,
      'MEDIA');

    // =====================================================
    // 7. VALIDAR SALDOS DE CUENTAS BANCARIAS
    // =====================================================
    log.section('7️⃣  VALIDACIÓN: SALDOS DE CUENTAS BANCARIAS');

    const { data: cuentas } = await supabase
      .from('evt_cuentas_contables')
      .select('*');

    let cuentasConErrores = 0;

    for (const cuenta of cuentas) {
      // Calcular ingresos PAGADOS de esta cuenta
      const ingresosCuenta = ingresos.filter(i => 
        i.cuenta_bancaria_id === cuenta.id && i.status_pago === 'pagado'
      );
      const totalIngresosCuenta = ingresosCuenta.reduce((sum, i) => sum + (i.total || 0), 0);

      // Calcular gastos PAGADOS de esta cuenta
      const gastosCuenta = gastos.filter(g => 
        g.cuenta_bancaria_id === cuenta.id && g.status_pago === 'pagado'
      );
      const totalGastosCuenta = gastosCuenta.reduce((sum, g) => sum + (g.total || 0), 0);

      const saldoCalculado = totalIngresosCuenta - totalGastosCuenta;
      const saldoRegistrado = cuenta.saldo_actual || 0;
      const diffSaldo = Math.abs(saldoCalculado - saldoRegistrado);

      if (diffSaldo > 0.01) {
        cuentasConErrores++;
        log.error(`Saldo incorrecto en ${cuenta.nombre_cuenta}:`);
        console.log(`   Calculado: ${formatMoney(saldoCalculado)} vs Registrado: ${formatMoney(saldoRegistrado)}`);
        console.log(`   Ingresos: ${formatMoney(totalIngresosCuenta)}, Gastos: ${formatMoney(totalGastosCuenta)}`);
        registrarFallo('Saldos Bancarios', cuenta.nombre_cuenta, 
          `Diferencia: ${formatMoney(diffSaldo)}`, 'ALTA');
      }
    }

    assert(cuentasConErrores === 0,
      'Saldos bancarios correctos en todas las cuentas',
      cuentasConErrores === 0 ? 'OK' : `${cuentasConErrores} cuentas con saldo incorrecto`,
      'ALTA');

    // =====================================================
    // 8. VALIDAR QUE EXISTEN DATOS ESTIMADOS
    // =====================================================
    log.section('8️⃣  VALIDACIÓN: DATOS ESTIMADOS VS REALES');

    const { data: eventos } = await supabase
      .from('evt_eventos')
      .select('id, nombre_proyecto, presupuesto_estimado');

    let eventosConEstimados = eventos.filter(e => e.presupuesto_estimado && e.presupuesto_estimado > 0).length;

    assert(eventosConEstimados > 0,
      'Existen eventos con presupuestos estimados',
      `${eventosConEstimados} eventos con presupuesto estimado`,
      'MEDIA');

    log.info(`El sistema debe mostrar tanto datos estimados como reales para comparación`);

    // =====================================================
    // 9. VALIDAR INTEGRIDAD DE REFERENCIAS
    // =====================================================
    log.section('9️⃣  VALIDACIÓN: INTEGRIDAD DE REFERENCIAS');

    // Verificar que todos los gastos tienen evento válido
    let gastosHuerfanos = 0;
    for (const gasto of gastos) {
      const eventoExiste = eventos.find(e => e.id === gasto.evento_id);
      if (!eventoExiste) {
        gastosHuerfanos++;
        registrarFallo('Integridad', 'Gasto huérfano', `Gasto ID ${gasto.id} sin evento válido`, 'CRÍTICA');
      }
    }

    assert(gastosHuerfanos === 0,
      'Todos los gastos tienen evento válido',
      gastosHuerfanos === 0 ? 'OK' : `${gastosHuerfanos} gastos huérfanos`,
      'CRÍTICA');

    // Verificar que todos los ingresos tienen evento válido
    let ingresosHuerfanos = 0;
    for (const ingreso of ingresos) {
      const eventoExiste = eventos.find(e => e.id === ingreso.evento_id);
      if (!eventoExiste) {
        ingresosHuerfanos++;
        registrarFallo('Integridad', 'Ingreso huérfano', `Ingreso ID ${ingreso.id} sin evento válido`, 'CRÍTICA');
      }
    }

    assert(ingresosHuerfanos === 0,
      'Todos los ingresos tienen evento válido',
      ingresosHuerfanos === 0 ? 'OK' : `${ingresosHuerfanos} ingresos huérfanos`,
      'CRÍTICA');

    // =====================================================
    // RESUMEN FINAL
    // =====================================================
    log.section('📊 RESUMEN DE PRUEBAS');

    console.log(`
${colors.bright}RESULTADOS:${colors.reset}
  Total de pruebas: ${totalPruebas}
  ${colors.green}✅ Exitosas: ${pruebasExitosas}${colors.reset}
  ${colors.red}❌ Fallidas: ${pruebasFallidas}${colors.reset}
  Porcentaje de éxito: ${((pruebasExitosas / totalPruebas) * 100).toFixed(2)}%

${colors.bright}FALLOS POR SEVERIDAD:${colors.reset}
  ${colors.red}🔥 Críticos: ${fallos.filter(f => f.severidad === 'CRÍTICA').length}${colors.reset}
  ${colors.yellow}⚠️  Altos: ${fallos.filter(f => f.severidad === 'ALTA').length}${colors.reset}
  ${colors.blue}ℹ️  Medios: ${fallos.filter(f => f.severidad === 'MEDIA').length}${colors.reset}
    `);

    // Generar reporte de fallos
    if (fallos.length > 0) {
      log.section('🔍 REPORTE DETALLADO DE FALLOS');

      const fallosPorCategoria = {};
      fallos.forEach(fallo => {
        if (!fallosPorCategoria[fallo.categoria]) {
          fallosPorCategoria[fallo.categoria] = [];
        }
        fallosPorCategoria[fallo.categoria].push(fallo);
      });

      Object.entries(fallosPorCategoria).forEach(([categoria, fallosCategoria]) => {
        console.log(`\n${colors.bright}${colors.magenta}${categoria}:${colors.reset}`);
        fallosCategoria.forEach((fallo, index) => {
          const emoji = fallo.severidad === 'CRÍTICA' ? '🔥' : 
                       fallo.severidad === 'ALTA' ? '⚠️' : 'ℹ️';
          console.log(`  ${index + 1}. ${emoji} [${fallo.severidad}] ${fallo.prueba}`);
          console.log(`     ${fallo.descripcion}`);
        });
      });

      // Guardar reporte en archivo
      const reporte = {
        fecha: new Date().toISOString(),
        totalPruebas,
        pruebasExitosas,
        pruebasFallidas,
        porcentajeExito: ((pruebasExitosas / totalPruebas) * 100).toFixed(2),
        fallos: fallos.map(f => ({
          categoria: f.categoria,
          prueba: f.prueba,
          descripcion: f.descripcion,
          severidad: f.severidad
        }))
      };

      const reportePath = join(__dirname, 'REPORTE_PRUEBAS_INTEGRALES.json');
      writeFileSync(reportePath, JSON.stringify(reporte, null, 2));
      log.success(`Reporte guardado en: REPORTE_PRUEBAS_INTEGRALES.json`);
    }

    // Resultado final
    if (pruebasFallidas === 0) {
      console.log(`\n${colors.green}${colors.bright}✅ ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!${colors.reset}\n`);
      console.log(`${colors.cyan}El sistema está funcionando correctamente.${colors.reset}\n`);
      process.exit(0);
    } else {
      console.log(`\n${colors.red}${colors.bright}❌ SE ENCONTRARON ${pruebasFallidas} FALLOS${colors.reset}\n`);
      console.log(`${colors.yellow}Revisa el reporte detallado arriba para corregir los problemas.${colors.reset}\n`);
      process.exit(1);
    }

  } catch (error) {
    log.error(`Error inesperado: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar pruebas
ejecutarPruebas();
