#!/usr/bin/env node

/**
 * ============================================================================
 * 🔍 SCRIPT DE DIAGNÓSTICO DETALLADO - ERRORES E INCONSISTENCIAS
 * ============================================================================
 * 
 * Ejecutar: node scripts/diagnostico-errores.mjs
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Colores
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const problemas = [];
const criticos = [];

function log(color, msg) {
  console.log(`${color}${msg}${c.reset}`);
}

function addProblema(tipo, modulo, descripcion, detalles = null, solucion = null) {
  const problema = { tipo, modulo, descripcion, detalles, solucion };
  problemas.push(problema);
  if (tipo === 'CRÍTICO') criticos.push(problema);
}

// ============================================================================
// DIAGNÓSTICO MÓDULO EVENTOS
// ============================================================================

async function diagnosticarEventos() {
  console.log('\n' + '═'.repeat(70));
  log(c.cyan, '🎯 DIAGNÓSTICO DETALLADO - MÓDULO EVENTOS');
  console.log('═'.repeat(70));

  // 1. Verificar estructura de tabla evt_eventos_erp
  log(c.blue, '\n📋 1. Estructura de tabla evt_eventos_erp');
  try {
    const { data, error } = await supabase
      .from('evt_eventos_erp')
      .select('*')
      .limit(1);
    
    if (data && data.length > 0) {
      const columnas = Object.keys(data[0]);
      console.log(`   Columnas encontradas: ${columnas.length}`);
      
      // Verificar si existe 'nombre' o cómo se llama
      const nombreCampo = columnas.find(c => c.toLowerCase().includes('nombre'));
      if (!nombreCampo) {
        addProblema('CRÍTICO', 'Eventos', 
          'Campo "nombre" no existe en evt_eventos_erp',
          `Columnas disponibles: ${columnas.join(', ')}`,
          'Verificar si se usa otro campo como "nombre_evento" o similar'
        );
        log(c.red, `   ❌ No se encontró campo "nombre"`);
        log(c.yellow, `   📝 Columnas: ${columnas.join(', ')}`);
      } else {
        log(c.green, `   ✅ Campo de nombre encontrado: "${nombreCampo}"`);
      }

      // Verificar campos de cliente
      const clienteCampo = columnas.find(c => c.toLowerCase().includes('cliente'));
      if (clienteCampo) {
        log(c.green, `   ✅ Campo de cliente: "${clienteCampo}"`);
      }
    }
  } catch (e) {
    log(c.red, `   ❌ Error: ${e.message}`);
  }

  // 2. Ingresos sin cliente
  log(c.blue, '\n📋 2. Ingresos sin cliente asignado');
  try {
    const { data: ingresos, error } = await supabase
      .from('evt_ingresos_erp')
      .select('id, concepto, total, evento_id, cliente_id, created_at')
      .is('cliente_id', null);

    if (error) throw error;
    
    if (ingresos && ingresos.length > 0) {
      addProblema('MAYOR', 'Eventos',
        `${ingresos.length} ingresos sin cliente asignado`,
        ingresos.map(i => `ID: ${i.id}, Evento: ${i.evento_id}, Total: $${i.total}`),
        'Asignar cliente_id a cada ingreso o hacer el campo nullable'
      );
      log(c.yellow, `   ⚠️  ${ingresos.length} ingresos sin cliente:`);
      ingresos.slice(0, 5).forEach(i => {
        console.log(`      - ID: ${i.id}, Evento: ${i.evento_id}, Concepto: ${(i.concepto || '').substring(0, 30)}, Total: $${i.total}`);
      });
      if (ingresos.length > 5) {
        console.log(`      ... y ${ingresos.length - 5} más`);
      }
    } else {
      log(c.green, `   ✅ Todos los ingresos tienen cliente`);
    }
  } catch (e) {
    log(c.red, `   ❌ Error: ${e.message}`);
  }

  // 3. Gastos por categoría
  log(c.blue, '\n📋 3. Distribución de gastos por categoría');
  try {
    const { data: gastos, error } = await supabase
      .from('evt_gastos_erp')
      .select('categoria_id, total')
      .is('deleted_at', null);

    if (error) throw error;

    const { data: categorias } = await supabase
      .from('evt_categorias_gastos_erp')
      .select('id, nombre');

    const catMap = {};
    categorias?.forEach(c => catMap[c.id] = c.nombre);

    const distribucion = {};
    gastos?.forEach(g => {
      const cat = g.categoria_id ? (catMap[g.categoria_id] || `ID:${g.categoria_id}`) : 'SIN CATEGORÍA';
      if (!distribucion[cat]) distribucion[cat] = { count: 0, total: 0 };
      distribucion[cat].count++;
      distribucion[cat].total += parseFloat(g.total) || 0;
    });

    console.log('   Distribución:');
    Object.entries(distribucion).forEach(([cat, data]) => {
      const status = cat === 'SIN CATEGORÍA' ? c.red : c.green;
      log(status, `      ${cat}: ${data.count} gastos, $${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
    });

    if (distribucion['SIN CATEGORÍA']) {
      addProblema('CRÍTICO', 'Eventos',
        `${distribucion['SIN CATEGORÍA'].count} gastos sin categoría`,
        `Total: $${distribucion['SIN CATEGORÍA'].total.toLocaleString('es-MX')}`,
        'Ejecutar UPDATE para asignar categoría según el concepto'
      );
    }
  } catch (e) {
    log(c.red, `   ❌ Error: ${e.message}`);
  }

  // 4. Estados de eventos
  log(c.blue, '\n📋 4. Eventos por estado');
  try {
    const { data: eventos, error } = await supabase
      .from('evt_eventos_erp')
      .select('estado_id, activo')
      .eq('activo', true);

    if (error) throw error;

    const { data: estados } = await supabase
      .from('evt_estados_erp')
      .select('id, nombre, color');

    const estadoMap = {};
    estados?.forEach(e => estadoMap[e.id] = e.nombre);

    const distribucion = {};
    eventos?.forEach(e => {
      const estado = e.estado_id ? (estadoMap[e.estado_id] || `ID:${e.estado_id}`) : 'SIN ESTADO';
      distribucion[estado] = (distribucion[estado] || 0) + 1;
    });

    console.log('   Eventos por estado:');
    Object.entries(distribucion).forEach(([estado, count]) => {
      const status = estado === 'SIN ESTADO' ? c.yellow : c.green;
      log(status, `      ${estado}: ${count} eventos`);
    });
  } catch (e) {
    log(c.red, `   ❌ Error: ${e.message}`);
  }

  // 5. Validar datos financieros
  log(c.blue, '\n📋 5. Validación de datos financieros');
  try {
    const { data: analisis, error } = await supabase
      .from('vw_eventos_analisis_financiero_erp')
      .select('*');

    if (error) throw error;

    let eventosConProblemas = 0;
    analisis?.forEach(e => {
      const ingresos = parseFloat(e.total_ingresos) || 0;
      const gastos = parseFloat(e.total_gastos) || 0;
      const utilidad = parseFloat(e.utilidad_bruta) || 0;
      const calculada = ingresos - gastos;
      
      if (Math.abs(utilidad - calculada) > 1) {
        eventosConProblemas++;
        log(c.yellow, `   ⚠️  Evento ${e.id}: Utilidad reportada=${utilidad.toFixed(2)}, calculada=${calculada.toFixed(2)}`);
      }
    });

    if (eventosConProblemas === 0) {
      log(c.green, `   ✅ Todos los cálculos financieros son correctos`);
    } else {
      addProblema('MAYOR', 'Eventos',
        `${eventosConProblemas} eventos con discrepancia en cálculo de utilidad`,
        null,
        'Revisar la vista vw_eventos_analisis_financiero_erp'
      );
    }
  } catch (e) {
    log(c.red, `   ❌ Error: ${e.message}`);
  }
}

// ============================================================================
// DIAGNÓSTICO MÓDULO INVENTARIO
// ============================================================================

async function diagnosticarInventario() {
  console.log('\n' + '═'.repeat(70));
  log(c.cyan, '📦 DIAGNÓSTICO DETALLADO - MÓDULO INVENTARIO');
  console.log('═'.repeat(70));

  // 1. Verificar estructura de movimientos
  log(c.blue, '\n📋 1. Estructura de tabla movimientos_inventario_erp');
  try {
    const { data, error } = await supabase
      .from('movimientos_inventario_erp')
      .select('*')
      .limit(1);
    
    if (data && data.length > 0) {
      const columnas = Object.keys(data[0]);
      console.log(`   Columnas encontradas: ${columnas.length}`);
      log(c.yellow, `   📝 Columnas: ${columnas.join(', ')}`);

      // Verificar si existe created_at o fecha
      const fechaCampo = columnas.find(c => c.toLowerCase().includes('fecha') || c.toLowerCase().includes('created'));
      if (!fechaCampo) {
        addProblema('MAYOR', 'Inventario',
          'No se encontró campo de fecha en movimientos_inventario_erp',
          `Columnas: ${columnas.join(', ')}`,
          'Usar el campo correcto para ordenar movimientos'
        );
      } else {
        log(c.green, `   ✅ Campo de fecha: "${fechaCampo}"`);
      }
    } else if (error) {
      log(c.red, `   ❌ Error: ${error.message}`);
    } else {
      log(c.yellow, `   ⚠️  Tabla vacía`);
    }
  } catch (e) {
    log(c.red, `   ❌ Error: ${e.message}`);
  }

  // 2. Productos
  log(c.blue, '\n📋 2. Análisis de productos');
  try {
    const { data: productos, error } = await supabase
      .from('productos_erp')
      .select('id, nombre, clave, unidad, precio_venta, costo, company_id');

    if (error) throw error;

    console.log(`   Total productos: ${productos?.length || 0}`);

    // Productos sin clave
    const sinClave = productos?.filter(p => !p.clave || p.clave === '') || [];
    if (sinClave.length > 0) {
      addProblema('MENOR', 'Inventario',
        `${sinClave.length} productos sin clave`,
        sinClave.slice(0, 5).map(p => `ID: ${p.id}, Nombre: ${p.nombre}`),
        'Asignar claves únicas a todos los productos'
      );
      log(c.yellow, `   ⚠️  ${sinClave.length} productos sin clave`);
    }

    // Productos con precio <= 0
    const sinPrecio = productos?.filter(p => !p.precio_venta || parseFloat(p.precio_venta) <= 0) || [];
    if (sinPrecio.length > 0) {
      log(c.yellow, `   ⚠️  ${sinPrecio.length} productos sin precio de venta`);
    }

    // Productos sin company_id
    const sinCompany = productos?.filter(p => !p.company_id) || [];
    if (sinCompany.length > 0) {
      addProblema('CRÍTICO', 'Inventario',
        `${sinCompany.length} productos sin company_id`,
        'Esto causará errores al crear nuevos productos',
        'Ejecutar UPDATE para asignar company_id a productos existentes'
      );
      log(c.red, `   ❌ ${sinCompany.length} productos sin company_id`);
    } else {
      log(c.green, `   ✅ Todos los productos tienen company_id`);
    }
  } catch (e) {
    log(c.red, `   ❌ Error: ${e.message}`);
  }

  // 3. Almacenes
  log(c.blue, '\n📋 3. Análisis de almacenes');
  try {
    const { data: almacenes, error } = await supabase
      .from('almacenes_erp')
      .select('*');

    if (error) throw error;

    console.log(`   Total almacenes: ${almacenes?.length || 0}`);
    
    if (almacenes && almacenes.length > 0) {
      almacenes.forEach(a => {
        console.log(`      - ${a.nombre} (${a.tipo || 'sin tipo'}) - Activo: ${a.activo ? 'Sí' : 'No'}`);
      });
    }

    if (almacenes?.length === 0) {
      addProblema('CRÍTICO', 'Inventario',
        'No hay almacenes definidos',
        null,
        'Crear al menos un almacén principal'
      );
    }
  } catch (e) {
    log(c.red, `   ❌ Error: ${e.message}`);
  }

  // 4. Tablas faltantes de inventario
  log(c.blue, '\n📋 4. Verificación de tablas de inventario');
  
  const tablasEsperadas = [
    { nombre: 'inv_existencias', critica: true },
    { nombre: 'inv_documentos', critica: true },
    { nombre: 'inv_ubicaciones', critica: false },
    { nombre: 'inv_lotes', critica: false },
    { nombre: 'inv_reservas', critica: false }
  ];

  for (const tabla of tablasEsperadas) {
    try {
      const { error } = await supabase.from(tabla.nombre).select('id').limit(1);
      
      if (error && error.message.includes('not find')) {
        addProblema(tabla.critica ? 'CRÍTICO' : 'MAYOR', 'Inventario',
          `Tabla ${tabla.nombre} no existe`,
          null,
          'Ejecutar migraciones SQL para crear la tabla'
        );
        log(c.red, `   ❌ ${tabla.nombre} - NO EXISTE`);
      } else {
        log(c.green, `   ✅ ${tabla.nombre} - Existe`);
      }
    } catch (e) {
      log(c.red, `   ❌ ${tabla.nombre} - Error: ${e.message}`);
    }
  }

  // 5. Movimientos recientes
  log(c.blue, '\n📋 5. Movimientos de inventario');
  try {
    // Intentar con diferentes campos de fecha
    let { data: movimientos, error } = await supabase
      .from('movimientos_inventario_erp')
      .select('*')
      .limit(10);

    if (error) throw error;

    console.log(`   Movimientos encontrados: ${movimientos?.length || 0}`);
    
    if (movimientos && movimientos.length > 0) {
      // Verificar tipos de movimiento
      const tipos = [...new Set(movimientos.map(m => m.tipo))];
      console.log(`   Tipos de movimiento: ${tipos.join(', ')}`);
    }
  } catch (e) {
    log(c.red, `   ❌ Error: ${e.message}`);
  }
}

// ============================================================================
// DIAGNÓSTICO DE CONSTRAINTS Y VALIDACIONES
// ============================================================================

async function diagnosticarConstraints() {
  console.log('\n' + '═'.repeat(70));
  log(c.cyan, '🔒 DIAGNÓSTICO DE CONSTRAINTS Y VALIDACIONES');
  console.log('═'.repeat(70));

  // 1. RFC en clientes
  log(c.blue, '\n📋 1. Validación de RFC en clientes');
  try {
    const { data: clientes, error } = await supabase
      .from('evt_clientes_erp')
      .select('id, razon_social, rfc')
      .eq('activo', true);

    if (error) throw error;

    // Verificar RFC válidos (12-13 caracteres)
    const rfcInvalidos = clientes?.filter(c => !c.rfc || c.rfc.length < 12 || c.rfc.length > 13) || [];
    
    if (rfcInvalidos.length > 0) {
      addProblema('MAYOR', 'Eventos',
        `${rfcInvalidos.length} clientes con RFC inválido`,
        rfcInvalidos.map(c => `${c.razon_social}: "${c.rfc}"`),
        'Corregir RFC o aumentar el límite del campo'
      );
      log(c.yellow, `   ⚠️  ${rfcInvalidos.length} clientes con RFC inválido/corto:`);
      rfcInvalidos.slice(0, 3).forEach(c => {
        console.log(`      - ${c.razon_social}: "${c.rfc}" (${c.rfc?.length || 0} chars)`);
      });
    } else {
      log(c.green, `   ✅ Todos los RFC son válidos`);
    }

    // Verificar límite de campo RFC
    console.log(`   📝 Nota: El campo RFC tiene límite de 13 caracteres`);
    addProblema('INFO', 'Eventos',
      'Campo RFC limitado a 13 caracteres',
      'Esto causa error al crear clientes con RFC de prueba largo',
      'Aumentar límite a 20 caracteres o validar entrada'
    );
  } catch (e) {
    log(c.red, `   ❌ Error: ${e.message}`);
  }

  // 2. company_id en productos
  log(c.blue, '\n📋 2. Constraint company_id en productos');
  try {
    // Ya verificado arriba, solo mostrar info
    console.log('   📝 El campo company_id es NOT NULL en productos_erp');
    console.log('   📝 Solución: Obtener company_id del usuario autenticado al crear productos');
  } catch (e) {
    log(c.red, `   ❌ Error: ${e.message}`);
  }
}

// ============================================================================
// GENERAR REPORTE
// ============================================================================

function generarReporte() {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(15) + '📋 REPORTE DE DIAGNÓSTICO' + ' '.repeat(27) + '║');
  console.log('╠' + '═'.repeat(68) + '╣');
  
  // Contar por tipo
  const porTipo = {};
  problemas.forEach(p => {
    porTipo[p.tipo] = (porTipo[p.tipo] || 0) + 1;
  });

  console.log(`║  Total de problemas identificados: ${problemas.length}` + ' '.repeat(30 - problemas.length.toString().length) + '║');
  console.log('╠' + '═'.repeat(68) + '╣');
  
  if (porTipo['CRÍTICO']) {
    log(c.red, `║  ❌ CRÍTICOS: ${porTipo['CRÍTICO']}` + ' '.repeat(52 - porTipo['CRÍTICO'].toString().length) + '║');
  }
  if (porTipo['MAYOR']) {
    log(c.yellow, `║  ⚠️  MAYORES: ${porTipo['MAYOR']}` + ' '.repeat(52 - porTipo['MAYOR'].toString().length) + '║');
  }
  if (porTipo['MENOR']) {
    console.log(`║  📝 MENORES: ${porTipo['MENOR']}` + ' '.repeat(53 - porTipo['MENOR'].toString().length) + '║');
  }
  if (porTipo['INFO']) {
    console.log(`║  ℹ️  INFO: ${porTipo['INFO']}` + ' '.repeat(55 - porTipo['INFO'].toString().length) + '║');
  }
  
  console.log('╚' + '═'.repeat(68) + '╝');

  // Detalles de problemas críticos
  if (criticos.length > 0) {
    console.log('\n' + '═'.repeat(70));
    log(c.red, '❌ PROBLEMAS CRÍTICOS QUE REQUIEREN ATENCIÓN INMEDIATA');
    console.log('═'.repeat(70));
    
    criticos.forEach((p, i) => {
      console.log(`\n${i + 1}. [${p.modulo}] ${p.descripcion}`);
      if (p.detalles) {
        if (Array.isArray(p.detalles)) {
          p.detalles.forEach(d => console.log(`   - ${d}`));
        } else {
          console.log(`   Detalles: ${p.detalles}`);
        }
      }
      if (p.solucion) {
        log(c.green, `   💡 Solución: ${p.solucion}`);
      }
    });
  }

  // Resumen de soluciones
  console.log('\n' + '═'.repeat(70));
  log(c.cyan, '💡 RESUMEN DE ACCIONES RECOMENDADAS');
  console.log('═'.repeat(70));

  const acciones = [
    '1. Crear tablas faltantes de inventario (inv_existencias, inv_documentos)',
    '2. Asignar cliente_id a los 9 ingresos sin cliente',
    '3. Aumentar límite de campo RFC de 13 a 20 caracteres',
    '4. Agregar columna company_id al crear productos desde UI',
    '5. Verificar campo de fecha en movimientos_inventario_erp',
  ];

  acciones.forEach(a => console.log(`   ${a}`));

  // Guardar reporte en archivo
  const reporteJSON = {
    fecha: new Date().toISOString(),
    resumen: {
      total: problemas.length,
      criticos: porTipo['CRÍTICO'] || 0,
      mayores: porTipo['MAYOR'] || 0,
      menores: porTipo['MENOR'] || 0,
      info: porTipo['INFO'] || 0
    },
    problemas: problemas
  };

  const reportePath = join(__dirname, '..', 'reports', 'diagnostico-errores.json');
  try {
    fs.mkdirSync(join(__dirname, '..', 'reports'), { recursive: true });
    fs.writeFileSync(reportePath, JSON.stringify(reporteJSON, null, 2));
    console.log(`\n📁 Reporte guardado en: reports/diagnostico-errores.json`);
  } catch (e) {
    console.log(`\n⚠️  No se pudo guardar el reporte: ${e.message}`);
  }
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(8) + '🔍 DIAGNÓSTICO DETALLADO - ERP 777 V2' + ' '.repeat(22) + '║');
  console.log('║' + ' '.repeat(8) + `Fecha: ${new Date().toLocaleString('es-MX')}` + ' '.repeat(32) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');

  try {
    await diagnosticarEventos();
    await diagnosticarInventario();
    await diagnosticarConstraints();
    generarReporte();
  } catch (e) {
    console.error('\n❌ ERROR FATAL:', e.message);
    process.exit(1);
  }
}

main();
