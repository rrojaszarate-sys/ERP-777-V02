#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// CONFIGURACIÓN DE PRUEBAS
// ============================================================================
const TESTS = {
  eventos: {
    esperado: 72,
    años: 3,
    primerEvento: '2023-01-15',
    ultimoEvento: '2025-12-15'
  },
  provisiones: {
    combustible: { min: 0.10, max: 0.15 }, // 10-15% del total
    materiales: { min: 0.25, max: 0.30 },  // 25-30% del total
    rh: { min: 0.35, max: 0.45 },          // 35-45% del total
    sps: { min: 0.20, max: 0.25 }          // 20-25% del total
  },
  gastos: {
    total: 648, // 9 por evento
    margenMaximo: 1.10 // No debe exceder provisión + 10%
  },
  fechas: {
    rangoMaximo: 35 // ±35 días del evento (tolerancia)
  }
};

// ============================================================================
// UTILIDADES
// ============================================================================
let testResults = [];
let testsPassed = 0;
let testsFailed = 0;

function logTest(nombre, passed, detalles = {}) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${nombre}`);

  if (!passed && detalles.error) {
    console.log(`   Error: ${detalles.error}`);
  }

  if (detalles.valores) {
    console.log(`   Valores: ${JSON.stringify(detalles.valores, null, 2)}`);
  }

  testResults.push({
    nombre,
    passed,
    timestamp: new Date().toISOString(),
    detalles
  });

  if (passed) {
    testsPassed++;
  } else {
    testsFailed++;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(value);
}

// ============================================================================
// PRUEBA 1: Verificar Cantidad de Eventos
// ============================================================================
async function test1_CantidadEventos() {
  console.log('\n🧪 Prueba 1: Verificar Cantidad de Eventos');

  try {
    const { data, error } = await supabase
      .from('evt_eventos')
      .select('id, fecha_evento')
      .eq('activo', true);

    if (error) throw error;

    const totalEventos = data.length;
    const años = new Set(data.map(e => new Date(e.fecha_evento).getFullYear())).size;
    const fechas = data.map(e => e.fecha_evento).sort();
    const primerEvento = fechas[0];
    const ultimoEvento = fechas[fechas.length - 1];

    const passed = totalEventos === TESTS.eventos.esperado && años === TESTS.eventos.años;

    logTest('Cantidad de Eventos', passed, {
      valores: {
        total_eventos: totalEventos,
        esperado: TESTS.eventos.esperado,
        años_cubiertos: años,
        primer_evento: primerEvento,
        ultimo_evento: ultimoEvento
      },
      error: !passed ? `Esperado ${TESTS.eventos.esperado} eventos, encontrado ${totalEventos}` : null
    });

    return passed;
  } catch (error) {
    logTest('Cantidad de Eventos', false, { error: error.message });
    return false;
  }
}

// ============================================================================
// PRUEBA 2: Distribución de Provisiones
// ============================================================================
async function test2_DistribucionProvisiones() {
  console.log('\n🧪 Prueba 2: Distribución de Provisiones por Categoría');

  try {
    const { data, error } = await supabase
      .from('evt_eventos')
      .select(`
        provision_combustible_peaje,
        provision_materiales,
        provision_recursos_humanos,
        provision_solicitudes_pago
      `)
      .eq('activo', true);

    if (error) throw error;

    // Calcular promedios
    const totales = data.reduce((acc, e) => {
      const total = (e.provision_combustible_peaje || 0) +
                   (e.provision_materiales || 0) +
                   (e.provision_recursos_humanos || 0) +
                   (e.provision_solicitudes_pago || 0);

      acc.combustible += e.provision_combustible_peaje || 0;
      acc.materiales += e.provision_materiales || 0;
      acc.rh += e.provision_recursos_humanos || 0;
      acc.sps += e.provision_solicitudes_pago || 0;
      acc.total += total;
      return acc;
    }, { combustible: 0, materiales: 0, rh: 0, sps: 0, total: 0 });

    const numEventos = data.length;
    const promedios = {
      combustible: totales.combustible / numEventos,
      materiales: totales.materiales / numEventos,
      rh: totales.rh / numEventos,
      sps: totales.sps / numEventos,
      total: totales.total / numEventos
    };

    // Calcular porcentajes
    const porcentajes = {
      combustible: promedios.combustible / promedios.total,
      materiales: promedios.materiales / promedios.total,
      rh: promedios.rh / promedios.total,
      sps: promedios.sps / promedios.total
    };

    // Verificar rangos
    const checks = {
      combustible: porcentajes.combustible >= TESTS.provisiones.combustible.min &&
                   porcentajes.combustible <= TESTS.provisiones.combustible.max,
      materiales: porcentajes.materiales >= TESTS.provisiones.materiales.min &&
                  porcentajes.materiales <= TESTS.provisiones.materiales.max,
      rh: porcentajes.rh >= TESTS.provisiones.rh.min &&
          porcentajes.rh <= TESTS.provisiones.rh.max,
      sps: porcentajes.sps >= TESTS.provisiones.sps.min &&
           porcentajes.sps <= TESTS.provisiones.sps.max
    };

    const passed = Object.values(checks).every(v => v);

    logTest('Distribución de Provisiones', passed, {
      valores: {
        promedios: {
          combustible: formatCurrency(promedios.combustible),
          materiales: formatCurrency(promedios.materiales),
          rh: formatCurrency(promedios.rh),
          sps: formatCurrency(promedios.sps),
          total: formatCurrency(promedios.total)
        },
        porcentajes: {
          combustible: `${(porcentajes.combustible * 100).toFixed(1)}%`,
          materiales: `${(porcentajes.materiales * 100).toFixed(1)}%`,
          rh: `${(porcentajes.rh * 100).toFixed(1)}%`,
          sps: `${(porcentajes.sps * 100).toFixed(1)}%`
        },
        checks
      },
      error: !passed ? 'Alguna provisión está fuera del rango esperado' : null
    });

    return passed;
  } catch (error) {
    logTest('Distribución de Provisiones', false, { error: error.message });
    return false;
  }
}

// ============================================================================
// PRUEBA 3: Gastos por Categoría
// ============================================================================
async function test3_GastosPorCategoria() {
  console.log('\n🧪 Prueba 3: Verificar Gastos por Categoría');

  try {
    const { data, error } = await supabase
      .from('evt_gastos')
      .select(`
        id,
        total,
        categoria:evt_categorias_gastos(nombre)
      `);

    if (error) throw error;

    const totalGastos = data.length;
    const passed = totalGastos === TESTS.gastos.total;

    // Agrupar por categoría
    const porCategoria = data.reduce((acc, g) => {
      const categoria = g.categoria?.nombre || 'Sin categoría';
      if (!acc[categoria]) {
        acc[categoria] = { cantidad: 0, total: 0 };
      }
      acc[categoria].cantidad++;
      acc[categoria].total += g.total || 0;
      return acc;
    }, {});

    logTest('Gastos por Categoría', passed, {
      valores: {
        total_gastos: totalGastos,
        esperado: TESTS.gastos.total,
        por_categoria: Object.entries(porCategoria).map(([nombre, datos]) => ({
          categoria: nombre,
          cantidad: datos.cantidad,
          total: formatCurrency(datos.total),
          promedio: formatCurrency(datos.total / datos.cantidad)
        }))
      },
      error: !passed ? `Esperado ${TESTS.gastos.total} gastos, encontrado ${totalGastos}` : null
    });

    return passed;
  } catch (error) {
    logTest('Gastos por Categoría', false, { error: error.message });
    return false;
  }
}

// ============================================================================
// PRUEBA 4: Gastos NO exceden Provisión + 10%
// ============================================================================
async function test4_GastosNoExcedenProvision() {
  console.log('\n🧪 Prueba 4: Gastos NO exceden Provisión + 10%');

  try {
    const { data: eventos, error } = await supabase
      .from('evt_eventos')
      .select(`
        id,
        clave_evento,
        provision_combustible_peaje,
        provision_materiales,
        provision_recursos_humanos,
        provision_solicitudes_pago
      `)
      .eq('activo', true);

    if (error) throw error;

    const { data: gastos, error: errorGastos } = await supabase
      .from('evt_gastos')
      .select(`
        evento_id,
        total,
        categoria:evt_categorias_gastos(nombre)
      `);

    if (errorGastos) throw errorGastos;

    const violaciones = [];

    for (const evento of eventos) {
      const gastosEvento = gastos.filter(g => g.evento_id === evento.id);

      const categorias = {
        'Combustible/Peaje': evento.provision_combustible_peaje || 0,
        'Materiales': evento.provision_materiales || 0,
        'Recursos Humanos': evento.provision_recursos_humanos || 0,
        'Solicitudes de Pago': evento.provision_solicitudes_pago || 0
      };

      for (const [categoria, provision] of Object.entries(categorias)) {
        const gastosCategoria = gastosEvento
          .filter(g => g.categoria?.nombre === categoria)
          .reduce((sum, g) => sum + (g.total || 0), 0);

        const maxPermitido = provision * TESTS.gastos.margenMaximo;

        if (gastosCategoria > maxPermitido) {
          violaciones.push({
            evento: evento.clave_evento,
            categoria,
            provision: formatCurrency(provision),
            gastado: formatCurrency(gastosCategoria),
            porcentaje: `${((gastosCategoria / provision) * 100).toFixed(1)}%`,
            exceso: formatCurrency(gastosCategoria - maxPermitido)
          });
        }
      }
    }

    const passed = violaciones.length === 0;

    logTest('Gastos NO exceden Provisión + 10%', passed, {
      valores: {
        eventos_verificados: eventos.length,
        violaciones_encontradas: violaciones.length,
        violaciones: violaciones.slice(0, 5) // Mostrar primeras 5
      },
      error: !passed ? `${violaciones.length} violaciones encontradas` : null
    });

    return passed;
  } catch (error) {
    logTest('Gastos NO exceden Provisión + 10%', false, { error: error.message });
    return false;
  }
}

// ============================================================================
// PRUEBA 5: Coherencia de Fechas
// ============================================================================
async function test5_CoherenciaFechas() {
  console.log('\n🧪 Prueba 5: Verificar Coherencia de Fechas');

  try {
    const { data: eventos, error } = await supabase
      .from('evt_eventos')
      .select('id, clave_evento, fecha_evento')
      .eq('activo', true);

    if (error) throw error;

    const { data: gastos, error: errorGastos } = await supabase
      .from('evt_gastos')
      .select('evento_id, fecha_gasto');

    if (errorGastos) throw errorGastos;

    const fueraRango = [];

    for (const evento of eventos) {
      const gastosEvento = gastos.filter(g => g.evento_id === evento.id);

      if (gastosEvento.length === 0) continue;

      const fechaEvento = new Date(evento.fecha_evento);

      for (const gasto of gastosEvento) {
        const fechaGasto = new Date(gasto.fecha_gasto);
        const difDias = Math.abs((fechaEvento - fechaGasto) / (1000 * 60 * 60 * 24));

        if (difDias > TESTS.fechas.rangoMaximo) {
          fueraRango.push({
            evento: evento.clave_evento,
            fecha_evento: evento.fecha_evento,
            fecha_gasto: gasto.fecha_gasto,
            diferencia_dias: Math.round(difDias)
          });
        }
      }
    }

    const passed = fueraRango.length < 3; // Tolerancia de 2 eventos

    logTest('Coherencia de Fechas', passed, {
      valores: {
        eventos_verificados: eventos.length,
        gastos_verificados: gastos.length,
        fuera_rango: fueraRango.length,
        ejemplos: fueraRango.slice(0, 3)
      },
      error: !passed ? `${fueraRango.length} gastos fuera del rango de ±${TESTS.fechas.rangoMaximo} días` : null
    });

    return passed;
  } catch (error) {
    logTest('Coherencia de Fechas', false, { error: error.message });
    return false;
  }
}

// ============================================================================
// PRUEBA 6: Vista Financiera Funciona
// ============================================================================
async function test6_VistaFinanciera() {
  console.log('\n🧪 Prueba 6: Validar Vista Financiera');

  try {
    const { data, error } = await supabase
      .from('vw_eventos_analisis_financiero')
      .select('*')
      .limit(5);

    if (error) throw error;

    const passed = data && data.length > 0;

    const validaciones = data.map(evento => ({
      clave: evento.clave_evento,
      provision_total: evento.provisiones_total || 0,
      gastos_totales: (evento.gastos_pagados_total || 0) + (evento.gastos_pendientes_total || 0),
      margen: evento.margen_utilidad_estimado,
      dentro_limite: ((evento.gastos_pagados_total || 0) + (evento.gastos_pendientes_total || 0)) <= (evento.provisiones_total || 0) * 1.10
    }));

    const todosValidos = validaciones.every(v => v.dentro_limite);

    logTest('Vista Financiera Funciona', passed && todosValidos, {
      valores: {
        registros_consultados: data.length,
        eventos_validados: validaciones
      },
      error: !passed ? 'Vista no devuelve datos' : (!todosValidos ? 'Algunos eventos exceden límite' : null)
    });

    return passed && todosValidos;
  } catch (error) {
    logTest('Vista Financiera Funciona', false, { error: error.message });
    return false;
  }
}

// ============================================================================
// PRUEBA 7: Distribución Pagado/Pendiente
// ============================================================================
async function test7_DistribucionPagado() {
  console.log('\n🧪 Prueba 7: Distribución de Estados Pagado/Pendiente');

  try {
    const { data, error } = await supabase
      .from('evt_gastos')
      .select('pagado, total');

    if (error) throw error;

    const pagados = data.filter(g => g.pagado).length;
    const pendientes = data.filter(g => !g.pagado).length;
    const total = data.length;
    const porcentajePagado = (pagados / total) * 100;

    // Esperamos entre 75-85% pagados
    const passed = porcentajePagado >= 75 && porcentajePagado <= 85;

    logTest('Distribución Pagado/Pendiente', passed, {
      valores: {
        total_gastos: total,
        pagados,
        pendientes,
        porcentaje_pagado: `${porcentajePagado.toFixed(2)}%`,
        rango_esperado: '75-85%'
      },
      error: !passed ? `Porcentaje fuera de rango: ${porcentajePagado.toFixed(2)}%` : null
    });

    return passed;
  } catch (error) {
    logTest('Distribución Pagado/Pendiente', false, { error: error.message });
    return false;
  }
}

// ============================================================================
// PRUEBA 8: Tipos de Comprobante
// ============================================================================
async function test8_TiposComprobante() {
  console.log('\n🧪 Prueba 8: Verificar Tipos de Comprobante');

  try {
    const { data, error } = await supabase
      .from('evt_gastos')
      .select('tipo_comprobante, total');

    if (error) throw error;

    const tiposValidos = ['E', 'T', 'N', 'P'];
    const porTipo = data.reduce((acc, g) => {
      const tipo = g.tipo_comprobante || 'NULL';
      if (!acc[tipo]) {
        acc[tipo] = { cantidad: 0, monto: 0 };
      }
      acc[tipo].cantidad++;
      acc[tipo].monto += g.total || 0;
      return acc;
    }, {});

    const tiposInvalidos = Object.keys(porTipo).filter(t => !tiposValidos.includes(t));
    const passed = tiposInvalidos.length === 0;

    logTest('Tipos de Comprobante', passed, {
      valores: {
        distribucion: Object.entries(porTipo).map(([tipo, datos]) => ({
          tipo,
          cantidad: datos.cantidad,
          monto_total: formatCurrency(datos.monto)
        })),
        tipos_invalidos: tiposInvalidos
      },
      error: !passed ? `Tipos inválidos encontrados: ${tiposInvalidos.join(', ')}` : null
    });

    return passed;
  } catch (error) {
    logTest('Tipos de Comprobante', false, { error: error.message });
    return false;
  }
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================
async function ejecutarTodasLasPruebas() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     🧪 POOL DE PRUEBAS AUTOMATIZADAS - ERP EVENTOS          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\n📅 Fecha: ${new Date().toLocaleString('es-MX')}`);
  console.log(`🔗 Base de Datos: ${SUPABASE_URL}\n`);

  const tests = [
    test1_CantidadEventos,
    test2_DistribucionProvisiones,
    test3_GastosPorCategoria,
    test4_GastosNoExcedenProvision,
    test5_CoherenciaFechas,
    test6_VistaFinanciera,
    test7_DistribucionPagado,
    test8_TiposComprobante
  ];

  for (const test of tests) {
    await test();
  }

  // Resumen final
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    📊 RESUMEN DE PRUEBAS                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Pruebas Aprobadas: ${testsPassed}/${tests.length}`);
  console.log(`❌ Pruebas Fallidas:  ${testsFailed}/${tests.length}`);
  console.log(`📈 Porcentaje Éxito:  ${((testsPassed / tests.length) * 100).toFixed(1)}%`);

  // Generar reporte
  const reporte = {
    fecha: new Date().toISOString(),
    database: SUPABASE_URL,
    total_pruebas: tests.length,
    aprobadas: testsPassed,
    fallidas: testsFailed,
    porcentaje_exito: ((testsPassed / tests.length) * 100).toFixed(1),
    resultados: testResults
  };

  const nombreReporte = `reporte_pruebas_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
  writeFileSync(nombreReporte, JSON.stringify(reporte, null, 2));

  console.log(`\n📄 Reporte generado: ${nombreReporte}`);

  // Generar reporte en texto
  const reporteTexto = generarReporteTexto(reporte);
  const nombreReporteTexto = `reporte_pruebas_${new Date().toISOString().split('T')[0]}_${Date.now()}.txt`;
  writeFileSync(nombreReporteTexto, reporteTexto);

  console.log(`📄 Reporte texto: ${nombreReporteTexto}\n`);

  process.exit(testsFailed > 0 ? 1 : 0);
}

function generarReporteTexto(reporte) {
  let texto = '';
  texto += '═══════════════════════════════════════════════════════════════\n';
  texto += '     🧪 REPORTE DE PRUEBAS AUTOMATIZADAS - ERP EVENTOS\n';
  texto += '═══════════════════════════════════════════════════════════════\n\n';
  texto += `Fecha: ${new Date(reporte.fecha).toLocaleString('es-MX')}\n`;
  texto += `Base de Datos: ${reporte.database}\n\n`;
  texto += `Total Pruebas:     ${reporte.total_pruebas}\n`;
  texto += `Pruebas Aprobadas: ${reporte.aprobadas}\n`;
  texto += `Pruebas Fallidas:  ${reporte.fallidas}\n`;
  texto += `Porcentaje Éxito:  ${reporte.porcentaje_exito}%\n\n`;
  texto += '═══════════════════════════════════════════════════════════════\n';
  texto += '                    DETALLE DE PRUEBAS\n';
  texto += '═══════════════════════════════════════════════════════════════\n\n';

  reporte.resultados.forEach((resultado, index) => {
    texto += `${index + 1}. ${resultado.nombre}\n`;
    texto += `   Estado: ${resultado.passed ? '✅ PASS' : '❌ FAIL'}\n`;

    if (resultado.detalles.error) {
      texto += `   Error: ${resultado.detalles.error}\n`;
    }

    if (resultado.detalles.valores) {
      texto += `   Valores:\n`;
      texto += `   ${JSON.stringify(resultado.detalles.valores, null, 4).replace(/^/gm, '   ')}\n`;
    }

    texto += '\n';
  });

  return texto;
}

// Ejecutar
ejecutarTodasLasPruebas().catch(error => {
  console.error('\n❌ Error fatal ejecutando pruebas:', error.message);
  process.exit(1);
});
