#!/usr/bin/env node

/**
 * VALIDACIÓN AUTOMÁTICA PARA PRODUCCIÓN
 * Fecha: 2025-10-27
 * Objetivo: Verificar integridad completa del sistema antes de producción
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables de entorno no encontradas');
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
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`),
};

// Contadores de pruebas
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const errors = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    log.success(`${testName}`);
    if (details) console.log(`   ${colors.cyan}${details}${colors.reset}`);
    return true;
  } else {
    failedTests++;
    log.error(`${testName}`);
    if (details) console.log(`   ${colors.red}${details}${colors.reset}`);
    errors.push({ test: testName, details });
    return false;
  }
}

async function ejecutarValidacion() {
  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║    VALIDACIÓN AUTOMÁTICA PARA PRODUCCIÓN                  ║
║    ERP Sistema de Eventos                                 ║
║    Fecha: ${new Date().toLocaleDateString('es-MX')}                               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

  try {
    // =====================================================
    // 1. VERIFICAR CONEXIÓN A BASE DE DATOS
    // =====================================================
    log.section('1️⃣  VERIFICACIÓN DE CONEXIÓN');
    
    const { data: healthCheck, error: healthError } = await supabase
      .from('evt_eventos')
      .select('count')
      .limit(1);
    
    assert(!healthError, 'Conexión a Supabase establecida', healthError?.message || 'Conectado correctamente');

    // =====================================================
    // 2. VERIFICAR CUENTAS BANCARIAS
    // =====================================================
    log.section('2️⃣  VERIFICACIÓN DE CUENTAS BANCARIAS');
    
    const { data: cuentas, error: cuentasError } = await supabase
      .from('evt_cuentas_contables')
      .select('*');
    
    assert(!cuentasError, 'Consulta de cuentas bancarias', cuentasError?.message);
    assert(cuentas && cuentas.length > 0, 'Existen cuentas bancarias disponibles', `Encontradas: ${cuentas?.length || 0}`);
    
    if (cuentas) {
      console.log(`\n   Cuentas bancarias activas:`);
      cuentas.forEach(c => {
        console.log(`   - ${c.nombre_cuenta} (${c.banco}) - Saldo: $${c.saldo_actual?.toFixed(2) || 0}`);
      });
    }

    // =====================================================
    // 3. VERIFICAR GASTOS
    // =====================================================
    log.section('3️⃣  VERIFICACIÓN DE GASTOS (evt_gastos)');
    
    const { data: gastosStats, error: gastosStatsError } = await supabase
      .from('evt_gastos')
      .select('*');
    
    assert(!gastosStatsError, 'Consulta de gastos', gastosStatsError?.message);
    
    if (gastosStats) {
      const totalGastos = gastosStats.length;
      const gastosPagados = gastosStats.filter(g => g.status_pago === 'pagado').length;
      const gastosConCuenta = gastosStats.filter(g => g.cuenta_bancaria_id !== null).length;
      const sumaGastos = gastosStats.reduce((sum, g) => sum + (g.total || 0), 0);
      
      assert(totalGastos > 0, 'Existen registros de gastos', `Total: ${totalGastos}`);
      
      // Estas validaciones son informativas, no críticas antes de ejecutar el script
      if (gastosPagados === totalGastos) {
        log.success(`Todos los gastos están pagados (${gastosPagados}/${totalGastos})`);
        passedTests++;
        totalTests++;
      } else {
        log.warning(`Gastos pendientes de marcar como pagados: ${totalGastos - gastosPagados}/${totalGastos}`);
      }
      
      if (gastosConCuenta === totalGastos) {
        log.success(`Todos los gastos tienen cuenta bancaria (${gastosConCuenta}/${totalGastos})`);
        passedTests++;
        totalTests++;
      } else {
        log.warning(`Gastos sin cuenta bancaria: ${totalGastos - gastosConCuenta}/${totalGastos}`);
      }
      
      log.info(`Total de gastos: ${totalGastos}`);
      log.info(`Suma total: $${sumaGastos.toFixed(2)}`);
      
      // Distribución por cuenta
      console.log(`\n   Distribución por cuenta bancaria:`);
      const distribucionGastos = {};
      gastosStats.forEach(g => {
        const cuentaId = g.cuenta_bancaria_id;
        if (!distribucionGastos[cuentaId]) {
          distribucionGastos[cuentaId] = { count: 0, total: 0 };
        }
        distribucionGastos[cuentaId].count++;
        distribucionGastos[cuentaId].total += g.total || 0;
      });
      
      Object.entries(distribucionGastos).forEach(([cuentaId, data]) => {
        const cuenta = cuentas?.find(c => c.id === parseInt(cuentaId));
        console.log(`   - ${cuenta?.nombre_cuenta || `ID ${cuentaId}`}: ${data.count} gastos, $${data.total.toFixed(2)}`);
      });
    }

    // =====================================================
    // 4. VERIFICAR INGRESOS
    // =====================================================
    log.section('4️⃣  VERIFICACIÓN DE INGRESOS (evt_ingresos)');
    
    const { data: ingresosStats, error: ingresosStatsError } = await supabase
      .from('evt_ingresos')
      .select('*');
    
    assert(!ingresosStatsError, 'Consulta de ingresos', ingresosStatsError?.message);
    
    if (ingresosStats) {
      const totalIngresos = ingresosStats.length;
      const ingresosPagados = ingresosStats.filter(i => i.status_pago === 'pagado').length;
      const ingresosConCuenta = ingresosStats.filter(i => i.cuenta_bancaria_id !== null).length;
      const sumaIngresos = ingresosStats.reduce((sum, i) => sum + (i.total || 0), 0);
      
      assert(totalIngresos > 0, 'Existen registros de ingresos', `Total: ${totalIngresos}`);
      
      // Validaciones informativas
      if (ingresosPagados === totalIngresos) {
        log.success(`Todos los ingresos están pagados (${ingresosPagados}/${totalIngresos})`);
        passedTests++;
        totalTests++;
      } else {
        log.warning(`Ingresos pendientes de marcar como pagados: ${totalIngresos - ingresosPagados}/${totalIngresos}`);
      }
      
      if (ingresosConCuenta === totalIngresos) {
        log.success(`Todos los ingresos tienen cuenta bancaria (${ingresosConCuenta}/${totalIngresos})`);
        passedTests++;
        totalTests++;
      } else {
        log.warning(`Ingresos sin cuenta bancaria: ${totalIngresos - ingresosConCuenta}/${totalIngresos}`);
      }
      
      log.info(`Total de ingresos: ${totalIngresos}`);
      log.info(`Suma total: $${sumaIngresos.toFixed(2)}`);
      
      // Distribución por cuenta
      console.log(`\n   Distribución por cuenta bancaria:`);
      const distribucionIngresos = {};
      ingresosStats.forEach(i => {
        const cuentaId = i.cuenta_bancaria_id;
        if (!distribucionIngresos[cuentaId]) {
          distribucionIngresos[cuentaId] = { count: 0, total: 0 };
        }
        distribucionIngresos[cuentaId].count++;
        distribucionIngresos[cuentaId].total += i.total || 0;
      });
      
      Object.entries(distribucionIngresos).forEach(([cuentaId, data]) => {
        const cuenta = cuentas?.find(c => c.id === parseInt(cuentaId));
        console.log(`   - ${cuenta?.nombre_cuenta || `ID ${cuentaId}`}: ${data.count} ingresos, $${data.total.toFixed(2)}`);
      });
    }

    // =====================================================
    // 5. VERIFICAR VISTAS
    // =====================================================
    log.section('5️⃣  VERIFICACIÓN DE VISTAS DE BASE DE DATOS');
    
    const { data: eventosCompletos, error: eventosError } = await supabase
      .from('vw_eventos_completos')
      .select('id, nombre_proyecto, total, total_gastos, utilidad, margen_utilidad')
      .limit(5);
    
    assert(!eventosError, 'Vista vw_eventos_completos funciona correctamente', eventosError?.message);
    
    if (eventosCompletos && eventosCompletos.length > 0) {
      console.log(`\n   Eventos de muestra (primeros 5):`);
      eventosCompletos.forEach(e => {
        console.log(`   - ${e.nombre_proyecto}`);
        console.log(`     Ingresos: $${e.total?.toFixed(2) || 0} | Gastos: $${e.total_gastos?.toFixed(2) || 0} | Utilidad: $${e.utilidad?.toFixed(2) || 0} (${e.margen_utilidad?.toFixed(2) || 0}%)`);
      });
    }
    
    const { data: masterFacturacion, error: masterError } = await supabase
      .from('vw_master_facturacion')
      .select('evento_id, evento_nombre, total, total_gastos, utilidad, margen_utilidad')
      .limit(5);
    
    assert(!masterError, 'Vista vw_master_facturacion funciona correctamente', masterError?.message);

    // =====================================================
    // 6. VALIDAR CONSISTENCIA DE CÁLCULOS
    // =====================================================
    log.section('6️⃣  VALIDACIÓN DE CONSISTENCIA DE CÁLCULOS');
    
    if (gastosStats && ingresosStats) {
      const sumaGastos = gastosStats.reduce((sum, g) => sum + (g.total || 0), 0);
      const sumaIngresos = ingresosStats.reduce((sum, i) => sum + (i.total || 0), 0);
      const utilidadCalculada = sumaIngresos - sumaGastos;
      
      log.info(`Suma de ingresos (evt_ingresos): $${sumaIngresos.toFixed(2)}`);
      log.info(`Suma de gastos (evt_gastos): $${sumaGastos.toFixed(2)}`);
      log.info(`Utilidad total: $${utilidadCalculada.toFixed(2)}`);
      
      // Verificar con las vistas
      const { data: totalesVista } = await supabase
        .from('vw_eventos_completos')
        .select('total, total_gastos, utilidad');
      
      if (totalesVista) {
        const ingresosPorVista = totalesVista.reduce((sum, e) => sum + (e.total || 0), 0);
        const gastosPorVista = totalesVista.reduce((sum, e) => sum + (e.total_gastos || 0), 0);
        const utilidadPorVista = totalesVista.reduce((sum, e) => sum + (e.utilidad || 0), 0);
        
        const diffIngresos = Math.abs(sumaIngresos - ingresosPorVista);
        const diffGastos = Math.abs(sumaGastos - gastosPorVista);
        const diffUtilidad = Math.abs(utilidadCalculada - utilidadPorVista);
        
        assert(diffIngresos < 0.01, 'Ingresos coinciden entre evt_ingresos y vw_eventos_completos', 
          `Diferencia: $${diffIngresos.toFixed(2)}`);
        assert(diffGastos < 0.01, 'Gastos coinciden entre evt_gastos y vw_eventos_completos', 
          `Diferencia: $${diffGastos.toFixed(2)}`);
        assert(diffUtilidad < 0.01, 'Utilidad coincide en ambas fuentes', 
          `Diferencia: $${diffUtilidad.toFixed(2)}`);
      }
    }

    // =====================================================
    // 7. VERIFICAR SALDOS BANCARIOS
    // =====================================================
    log.section('7️⃣  VERIFICACIÓN DE SALDOS BANCARIOS');
    
    if (cuentas && gastosStats && ingresosStats) {
      console.log(`\n   Validando saldos por cuenta:`);
      
      for (const cuenta of cuentas) {
        const ingresosCuenta = ingresosStats.filter(i => i.cuenta_bancaria_id === cuenta.id);
        const gastosCuenta = gastosStats.filter(g => g.cuenta_bancaria_id === cuenta.id);
        
        const totalIngresosCuenta = ingresosCuenta.reduce((sum, i) => sum + (i.total || 0), 0);
        const totalGastosCuenta = gastosCuenta.reduce((sum, g) => sum + (g.total || 0), 0);
        const saldoCalculado = totalIngresosCuenta - totalGastosCuenta;
        const saldoRegistrado = cuenta.saldo_actual || 0;
        const diferencia = Math.abs(saldoCalculado - saldoRegistrado);
        
        console.log(`\n   ${cuenta.nombre_cuenta} (${cuenta.banco}):`);
        console.log(`   - Ingresos: $${totalIngresosCuenta.toFixed(2)}`);
        console.log(`   - Gastos: $${totalGastosCuenta.toFixed(2)}`);
        console.log(`   - Saldo calculado: $${saldoCalculado.toFixed(2)}`);
        console.log(`   - Saldo registrado: $${saldoRegistrado.toFixed(2)}`);
        console.log(`   - Diferencia: $${diferencia.toFixed(2)}`);
        
        assert(diferencia < 0.01, `Saldo correcto en ${cuenta.nombre_cuenta}`, 
          diferencia < 0.01 ? 'OK' : `Diferencia: $${diferencia.toFixed(2)}`);
      }
    }

    // =====================================================
    // 8. VERIFICAR FECHAS DE PAGO
    // =====================================================
    log.section('8️⃣  VERIFICACIÓN DE FECHAS DE PAGO');
    
    const hoy = new Date().toISOString().split('T')[0];
    
    if (gastosStats) {
      const gastosHoy = gastosStats.filter(g => g.fecha_pago?.startsWith(hoy)).length;
      log.info(`Gastos con fecha de pago HOY (${hoy}): ${gastosHoy}/${gastosStats.length}`);
    }
    
    if (ingresosStats) {
      const ingresosHoy = ingresosStats.filter(i => i.fecha_pago?.startsWith(hoy)).length;
      log.info(`Ingresos con fecha de pago HOY (${hoy}): ${ingresosHoy}/${ingresosStats.length}`);
    }

    // =====================================================
    // RESUMEN FINAL
    // =====================================================
    log.section('📊 RESUMEN DE VALIDACIÓN');
    
    console.log(`\n   Total de pruebas ejecutadas: ${totalTests}`);
    console.log(`   ${colors.green}✅ Pruebas exitosas: ${passedTests}${colors.reset}`);
    console.log(`   ${colors.red}❌ Pruebas fallidas: ${failedTests}${colors.reset}`);
    
    const porcentajeExito = ((passedTests / totalTests) * 100).toFixed(2);
    console.log(`\n   Porcentaje de éxito: ${porcentajeExito}%`);
    
    if (failedTests > 0) {
      log.section('❌ ERRORES DETECTADOS');
      errors.forEach((err, index) => {
        console.log(`\n   ${index + 1}. ${err.test}`);
        if (err.details) {
          console.log(`      ${colors.red}${err.details}${colors.reset}`);
        }
      });
      
      console.log(`\n${colors.red}${colors.bright}⛔ SISTEMA NO LISTO PARA PRODUCCIÓN${colors.reset}`);
      console.log(`${colors.yellow}   Se encontraron ${failedTests} problemas que deben corregirse.${colors.reset}\n`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}${colors.bright}✅ ¡SISTEMA VALIDADO Y LISTO PARA PRODUCCIÓN!${colors.reset}`);
      console.log(`${colors.cyan}   Todas las validaciones pasaron exitosamente.${colors.reset}\n`);
      
      // Generar reporte
      const reporte = {
        fecha: new Date().toISOString(),
        totalPruebas: totalTests,
        exitosas: passedTests,
        fallidas: failedTests,
        porcentajeExito,
        estadisticas: {
          cuentasBancarias: cuentas?.length || 0,
          gastos: gastosStats?.length || 0,
          ingresos: ingresosStats?.length || 0,
          eventos: eventosCompletos?.length || 0,
        }
      };
      
      console.log(`\n${colors.cyan}Reporte de validación:${colors.reset}`);
      console.log(JSON.stringify(reporte, null, 2));
    }

  } catch (error) {
    log.error(`Error inesperado: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar validación
ejecutarValidacion();
