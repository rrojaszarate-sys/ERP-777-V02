#!/usr/bin/env node

/**
 * ============================================================================
 * 🧪 SCRIPT DE PRUEBAS COMPLETAS - EVENTOS E INVENTARIO
 * ============================================================================
 * 
 * Ejecutar: node scripts/test-completo-modulos.mjs
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
const envPath = join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY requeridas');
  console.log('   Verificar archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Contadores
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const errors = [];
const warnings = [];

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(70));
  log(colors.cyan, `  ${title}`);
  console.log('═'.repeat(70));
}

function logTest(passed, name, detail = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    log(colors.green, `  ✅ ${name}${detail ? ` - ${detail}` : ''}`);
  } else {
    failedTests++;
    log(colors.red, `  ❌ ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

function logWarning(message) {
  warnings.push(message);
  log(colors.yellow, `  ⚠️  ${message}`);
}

function logError(message) {
  errors.push(message);
  log(colors.red, `  ❌ ERROR: ${message}`);
}

// ============================================================================
// PRUEBAS MÓDULO EVENTOS
// ============================================================================

async function testEventosModule() {
  logSection('🎯 MÓDULO DE EVENTOS - PRUEBAS');

  // 1. Cargar eventos desde vista completa
  try {
    const { data: eventos, error } = await supabase
      .from('vw_eventos_completos_erp')
      .select('*')
      .eq('activo', true)
      .limit(50);

    if (error) throw error;
    logTest(true, 'Cargar eventos (vw_eventos_completos_erp)', `${eventos?.length || 0} eventos activos`);

    // Verificar campos críticos
    if (eventos && eventos.length > 0) {
      const evento = eventos[0];
      const camposRequeridos = ['id', 'nombre', 'cliente_id', 'clave_evento'];
      const camposFaltantes = camposRequeridos.filter(c => evento[c] === undefined || evento[c] === null);
      
      if (camposFaltantes.length > 0) {
        logWarning(`Evento ${evento.id} sin campos: ${camposFaltantes.join(', ')}`);
      }
    }
  } catch (e) {
    logTest(false, 'Cargar eventos (vw_eventos_completos_erp)', e.message);
  }

  // 2. Cargar clientes
  try {
    const { data: clientes, error } = await supabase
      .from('evt_clientes_erp')
      .select('*')
      .eq('activo', true);

    if (error) throw error;
    logTest(true, 'Cargar clientes', `${clientes?.length || 0} clientes activos`);

    // Verificar RFC válidos
    if (clientes && clientes.length > 0) {
      const rfcInvalidos = clientes.filter(c => !c.rfc || c.rfc.length < 12);
      if (rfcInvalidos.length > 0) {
        logWarning(`${rfcInvalidos.length} cliente(s) con RFC inválido o faltante`);
      }
    }
  } catch (e) {
    logTest(false, 'Cargar clientes', e.message);
  }

  // 3. Cargar categorías de gastos
  try {
    const { data: categorias, error } = await supabase
      .from('evt_categorias_gastos_erp')
      .select('*');

    if (error) throw error;
    
    const esperadas = 4; // SPs, RH, Materiales, Combustible
    const ok = categorias?.length >= esperadas;
    logTest(ok, 'Categorías de gastos', `${categorias?.length || 0} categorías (esperadas: ${esperadas})`);
    
    if (!ok) {
      logWarning('Faltan categorías de gastos');
    }
  } catch (e) {
    logTest(false, 'Cargar categorías de gastos', e.message);
  }

  // 4. Verificar gastos sin categoría (CRÍTICO)
  try {
    const { data: gastosSinCat, error } = await supabase
      .from('evt_gastos_erp')
      .select('id, concepto, total')
      .is('categoria_id', null)
      .is('deleted_at', null);

    if (error) throw error;
    
    const ok = (gastosSinCat?.length || 0) === 0;
    logTest(ok, 'Gastos sin categoría', ok ? 'Todos los gastos tienen categoría' : `${gastosSinCat.length} gastos sin categoría`);
    
    if (!ok) {
      logError(`CRÍTICO: ${gastosSinCat.length} gastos sin categoría asignada`);
      gastosSinCat.slice(0, 3).forEach(g => {
        console.log(`     - ID: ${g.id}, Concepto: ${g.concepto?.substring(0, 40)}, Total: $${g.total}`);
      });
    }
  } catch (e) {
    logTest(false, 'Verificar gastos sin categoría', e.message);
  }

  // 5. Validar cuadre fiscal de gastos
  try {
    const { data: gastos, error } = await supabase
      .from('evt_gastos_erp')
      .select('id, concepto, subtotal, iva, total')
      .is('deleted_at', null)
      .not('subtotal', 'is', null)
      .not('iva', 'is', null)
      .not('total', 'is', null);

    if (error) throw error;
    
    const descuadrados = gastos?.filter(g => {
      const calculado = (parseFloat(g.subtotal) || 0) + (parseFloat(g.iva) || 0);
      const diferencia = Math.abs((parseFloat(g.total) || 0) - calculado);
      return diferencia > 0.01;
    }) || [];
    
    const ok = descuadrados.length === 0;
    logTest(ok, 'Cuadre fiscal de gastos (subtotal + IVA = total)', 
      ok ? 'Todos los gastos cuadran' : `${descuadrados.length} gastos descuadrados`);
    
    if (!ok) {
      logWarning('Gastos con descuadre fiscal:');
      descuadrados.slice(0, 3).forEach(g => {
        const calculado = parseFloat(g.subtotal) + parseFloat(g.iva);
        console.log(`     - ID: ${g.id}, Total: ${g.total}, Calculado: ${calculado.toFixed(2)}`);
      });
    }
  } catch (e) {
    logTest(false, 'Validar cuadre fiscal de gastos', e.message);
  }

  // 6. Validar cuadre fiscal de ingresos
  try {
    const { data: ingresos, error } = await supabase
      .from('evt_ingresos_erp')
      .select('id, concepto, subtotal, iva, total')
      .not('subtotal', 'is', null)
      .not('iva', 'is', null)
      .not('total', 'is', null);

    if (error) throw error;
    
    const descuadrados = ingresos?.filter(i => {
      const calculado = (parseFloat(i.subtotal) || 0) + (parseFloat(i.iva) || 0);
      const diferencia = Math.abs((parseFloat(i.total) || 0) - calculado);
      return diferencia > 0.01;
    }) || [];
    
    const ok = descuadrados.length === 0;
    logTest(ok, 'Cuadre fiscal de ingresos', 
      ok ? 'Todos los ingresos cuadran' : `${descuadrados.length} ingresos descuadrados`);
  } catch (e) {
    logTest(false, 'Validar cuadre fiscal de ingresos', e.message);
  }

  // 7. Vista de análisis financiero
  try {
    const { data: analisis, error } = await supabase
      .from('vw_eventos_analisis_financiero_erp')
      .select('*')
      .limit(10);

    if (error) throw error;
    logTest(true, 'Vista análisis financiero', `${analisis?.length || 0} registros`);

    // Verificar cálculos
    if (analisis && analisis.length > 0) {
      const evento = analisis[0];
      if (evento.total_ingresos !== undefined && evento.total_gastos !== undefined) {
        const utilidadCalculada = parseFloat(evento.total_ingresos) - parseFloat(evento.total_gastos);
        const utilidadReportada = parseFloat(evento.utilidad_bruta || 0);
        const diferencia = Math.abs(utilidadCalculada - utilidadReportada);
        
        if (diferencia > 1) {
          logWarning(`Diferencia en cálculo de utilidad: calculada=${utilidadCalculada.toFixed(2)}, reportada=${utilidadReportada.toFixed(2)}`);
        }
      }
    }
  } catch (e) {
    logTest(false, 'Vista análisis financiero', e.message);
  }

  // 8. Ingresos sin cliente
  try {
    const { data: ingresosSinCliente, error } = await supabase
      .from('evt_ingresos_erp')
      .select('id, concepto, total')
      .is('cliente_id', null);

    if (error) throw error;
    
    const count = ingresosSinCliente?.length || 0;
    logTest(count === 0, 'Ingresos sin cliente asignado', 
      count === 0 ? 'Todos los ingresos tienen cliente' : `${count} ingresos sin cliente`);
  } catch (e) {
    logTest(false, 'Verificar ingresos sin cliente', e.message);
  }

  // 9. Eventos sin cliente
  try {
    const { data: eventosSinCliente, error } = await supabase
      .from('evt_eventos_erp')
      .select('id, nombre, clave_evento')
      .is('cliente_id', null)
      .eq('activo', true);

    if (error) throw error;
    
    const count = eventosSinCliente?.length || 0;
    logTest(count === 0, 'Eventos sin cliente asignado', 
      count === 0 ? 'Todos los eventos tienen cliente' : `${count} eventos sin cliente`);
  } catch (e) {
    logTest(false, 'Verificar eventos sin cliente', e.message);
  }

  // 10. Estados de evento
  try {
    const { data: estados, error } = await supabase
      .from('evt_estados_erp')
      .select('*');

    if (error) throw error;
    logTest(true, 'Cargar estados de evento', `${estados?.length || 0} estados definidos`);
  } catch (e) {
    logTest(false, 'Cargar estados de evento', e.message);
  }
}

// ============================================================================
// PRUEBAS MÓDULO INVENTARIO
// ============================================================================

async function testInventarioModule() {
  logSection('📦 MÓDULO DE INVENTARIO - PRUEBAS');

  // 1. Cargar productos
  try {
    const { data: productos, error } = await supabase
      .from('productos_erp')
      .select('*')
      .limit(100);

    if (error) throw error;
    logTest(true, 'Cargar productos', `${productos?.length || 0} productos`);

    // Verificar productos sin clave
    if (productos && productos.length > 0) {
      const sinClave = productos.filter(p => !p.clave || p.clave === '');
      if (sinClave.length > 0) {
        logWarning(`${sinClave.length} producto(s) sin clave asignada`);
      }
    }
  } catch (e) {
    logTest(false, 'Cargar productos', e.message);
  }

  // 2. Cargar almacenes
  try {
    const { data: almacenes, error } = await supabase
      .from('almacenes_erp')
      .select('*');

    if (error) throw error;
    logTest(true, 'Cargar almacenes', `${almacenes?.length || 0} almacenes`);

    // Verificar tipos válidos
    if (almacenes && almacenes.length > 0) {
      const tiposValidos = ['principal', 'sucursal', 'consignacion', 'transito'];
      const tiposInvalidos = almacenes.filter(a => a.tipo && !tiposValidos.includes(a.tipo));
      if (tiposInvalidos.length > 0) {
        logWarning(`${tiposInvalidos.length} almacén(es) con tipo inválido`);
      }
    }
  } catch (e) {
    logTest(false, 'Cargar almacenes', e.message);
  }

  // 3. Verificar existencias
  try {
    const { data: existencias, error } = await supabase
      .from('inv_existencias')
      .select('*')
      .limit(100);

    if (error) throw error;
    logTest(true, 'Cargar existencias', `${existencias?.length || 0} registros`);

    // Verificar existencias negativas (ERROR CRÍTICO)
    if (existencias && existencias.length > 0) {
      const negativas = existencias.filter(e => parseFloat(e.cantidad) < 0);
      if (negativas.length > 0) {
        logError(`CRÍTICO: ${negativas.length} existencia(s) con cantidad negativa`);
        negativas.slice(0, 3).forEach(e => {
          console.log(`     - Producto: ${e.producto_id}, Almacén: ${e.almacen_id}, Cantidad: ${e.cantidad}`);
        });
      }
    }
  } catch (e) {
    // Puede que la tabla no exista
    logWarning('Tabla inv_existencias no disponible: ' + e.message);
  }

  // 4. Cargar movimientos
  try {
    const { data: movimientos, error } = await supabase
      .from('movimientos_inventario_erp')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    logTest(true, 'Cargar movimientos', `${movimientos?.length || 0} movimientos recientes`);
  } catch (e) {
    logTest(false, 'Cargar movimientos', e.message);
  }

  // 5. Documentos de inventario
  try {
    const { data: documentos, error } = await supabase
      .from('inv_documentos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    logTest(true, 'Cargar documentos inventario', `${documentos?.length || 0} documentos`);

    // Verificar documentos en borrador antiguos
    if (documentos && documentos.length > 0) {
      const ahora = new Date();
      const borradores = documentos.filter(d => {
        if (d.estado !== 'borrador') return false;
        const creado = new Date(d.created_at);
        const diasAntiguedad = (ahora - creado) / (1000 * 60 * 60 * 24);
        return diasAntiguedad > 7;
      });
      
      if (borradores.length > 0) {
        logWarning(`${borradores.length} documento(s) en borrador con más de 7 días`);
      }
    }
  } catch (e) {
    logWarning('Tabla inv_documentos no disponible: ' + e.message);
  }

  // 6. Ubicaciones
  try {
    const { data: ubicaciones, error } = await supabase
      .from('inv_ubicaciones')
      .select('*')
      .limit(50);

    if (error) throw error;
    logTest(true, 'Cargar ubicaciones', `${ubicaciones?.length || 0} ubicaciones`);
  } catch (e) {
    logWarning('Tabla inv_ubicaciones no disponible: ' + e.message);
  }

  // 7. Lotes
  try {
    const { data: lotes, error } = await supabase
      .from('inv_lotes')
      .select('*')
      .limit(50);

    if (error) throw error;
    logTest(true, 'Cargar lotes', `${lotes?.length || 0} lotes`);

    // Verificar lotes vencidos
    if (lotes && lotes.length > 0) {
      const hoy = new Date().toISOString().split('T')[0];
      const vencidos = lotes.filter(l => l.fecha_caducidad && l.fecha_caducidad < hoy);
      if (vencidos.length > 0) {
        logWarning(`${vencidos.length} lote(s) con fecha de caducidad vencida`);
      }
    }
  } catch (e) {
    logWarning('Tabla inv_lotes no disponible: ' + e.message);
  }

  // 8. Verificar consistencia stock vs movimientos
  try {
    // Esta es una verificación simplificada
    const { data: productos, error: pErr } = await supabase
      .from('productos_erp')
      .select('id, nombre')
      .limit(10);

    if (pErr) throw pErr;

    if (productos && productos.length > 0) {
      const productoId = productos[0].id;
      
      // Obtener existencia registrada
      const { data: existencia } = await supabase
        .from('inv_existencias')
        .select('cantidad')
        .eq('producto_id', productoId)
        .maybeSingle();

      // Obtener suma de movimientos
      const { data: movimientos } = await supabase
        .from('movimientos_inventario_erp')
        .select('tipo, cantidad')
        .eq('producto_id', productoId);

      if (existencia && movimientos) {
        const stockCalculado = movimientos.reduce((sum, m) => {
          return sum + (m.tipo === 'entrada' ? parseFloat(m.cantidad) : -parseFloat(m.cantidad));
        }, 0);
        
        const stockRegistrado = parseFloat(existencia.cantidad) || 0;
        const diferencia = Math.abs(stockCalculado - stockRegistrado);
        
        if (diferencia > 0.01) {
          logWarning(`Discrepancia de stock para producto ${productoId}: registrado=${stockRegistrado}, calculado=${stockCalculado}`);
        } else {
          logTest(true, 'Consistencia stock vs movimientos (muestra)', 'Sin discrepancias');
        }
      } else {
        logTest(true, 'Consistencia stock vs movimientos', 'Sin datos para comparar');
      }
    }
  } catch (e) {
    logWarning('Verificación de consistencia no disponible: ' + e.message);
  }
}

// ============================================================================
// PRUEBAS DE INTEGRIDAD GENERAL
// ============================================================================

async function testIntegridad() {
  logSection('🔗 PRUEBAS DE INTEGRIDAD GENERAL');

  // 1. Verificar conexión a Supabase
  try {
    const { data, error } = await supabase
      .from('evt_eventos_erp')
      .select('count')
      .limit(1);

    logTest(!error, 'Conexión a Supabase', error ? error.message : 'OK');
  } catch (e) {
    logTest(false, 'Conexión a Supabase', e.message);
  }

  // 2. Verificar tablas principales existen
  const tablasEventos = [
    'evt_eventos_erp',
    'evt_clientes_erp',
    'evt_gastos_erp',
    'evt_ingresos_erp',
    'evt_categorias_gastos_erp'
  ];

  for (const tabla of tablasEventos) {
    try {
      const { error } = await supabase.from(tabla).select('id').limit(1);
      logTest(!error, `Tabla ${tabla}`, error ? 'No existe' : 'Existe');
    } catch (e) {
      logTest(false, `Tabla ${tabla}`, e.message);
    }
  }

  const tablasInventario = [
    'productos_erp',
    'almacenes_erp',
    'movimientos_inventario_erp'
  ];

  for (const tabla of tablasInventario) {
    try {
      const { error } = await supabase.from(tabla).select('id').limit(1);
      logTest(!error, `Tabla ${tabla}`, error ? 'No existe' : 'Existe');
    } catch (e) {
      logTest(false, `Tabla ${tabla}`, e.message);
    }
  }

  // 3. Verificar vistas
  const vistas = [
    'vw_eventos_completos_erp',
    'vw_eventos_analisis_financiero_erp'
  ];

  for (const vista of vistas) {
    try {
      const { error } = await supabase.from(vista).select('*').limit(1);
      logTest(!error, `Vista ${vista}`, error ? 'No existe o error' : 'Existe');
    } catch (e) {
      logTest(false, `Vista ${vista}`, e.message);
    }
  }
}

// ============================================================================
// PRUEBAS CRUD (Crear, Leer, Actualizar, Eliminar)
// ============================================================================

async function testCRUD() {
  logSection('🔄 PRUEBAS CRUD');

  // Test CRUD de Cliente
  let clienteTestId = null;
  const timestamp = Date.now();
  
  try {
    // Crear
    const nuevoCliente = {
      razon_social: `TEST_CLIENTE_${timestamp}`,
      rfc: `TEST${timestamp.toString().slice(-9)}A`,
      nombre_comercial: 'Cliente de Prueba',
      activo: true
    };

    const { data: created, error: createError } = await supabase
      .from('evt_clientes_erp')
      .insert([nuevoCliente])
      .select()
      .single();

    if (createError) throw createError;
    clienteTestId = created.id;
    logTest(true, 'CRUD Cliente - Crear', `ID: ${clienteTestId}`);

    // Leer
    const { data: read, error: readError } = await supabase
      .from('evt_clientes_erp')
      .select('*')
      .eq('id', clienteTestId)
      .single();

    if (readError) throw readError;
    logTest(read.razon_social === nuevoCliente.razon_social, 'CRUD Cliente - Leer', 'Datos correctos');

    // Actualizar
    const { error: updateError } = await supabase
      .from('evt_clientes_erp')
      .update({ nombre_comercial: 'Cliente Actualizado' })
      .eq('id', clienteTestId);

    if (updateError) throw updateError;
    logTest(true, 'CRUD Cliente - Actualizar', 'OK');

    // Eliminar
    const { error: deleteError } = await supabase
      .from('evt_clientes_erp')
      .delete()
      .eq('id', clienteTestId);

    if (deleteError) throw deleteError;
    logTest(true, 'CRUD Cliente - Eliminar', 'OK');
    clienteTestId = null;

  } catch (e) {
    logTest(false, 'CRUD Cliente', e.message);
    
    // Limpiar si quedó creado
    if (clienteTestId) {
      await supabase.from('evt_clientes_erp').delete().eq('id', clienteTestId);
    }
  }

  // Test CRUD de Producto
  let productoTestId = null;
  
  try {
    const nuevoProducto = {
      nombre: `TEST_PRODUCTO_${timestamp}`,
      clave: `TPROD${timestamp.toString().slice(-6)}`,
      unidad: 'pieza',
      precio_venta: 100,
      costo: 50
    };

    const { data: created, error: createError } = await supabase
      .from('productos_erp')
      .insert([nuevoProducto])
      .select()
      .single();

    if (createError) throw createError;
    productoTestId = created.id;
    logTest(true, 'CRUD Producto - Crear', `ID: ${productoTestId}`);

    // Actualizar
    const { error: updateError } = await supabase
      .from('productos_erp')
      .update({ precio_venta: 150 })
      .eq('id', productoTestId);

    if (updateError) throw updateError;
    logTest(true, 'CRUD Producto - Actualizar', 'OK');

    // Eliminar
    const { error: deleteError } = await supabase
      .from('productos_erp')
      .delete()
      .eq('id', productoTestId);

    if (deleteError) throw deleteError;
    logTest(true, 'CRUD Producto - Eliminar', 'OK');
    productoTestId = null;

  } catch (e) {
    logTest(false, 'CRUD Producto', e.message);
    
    if (productoTestId) {
      await supabase.from('productos_erp').delete().eq('id', productoTestId);
    }
  }
}

// ============================================================================
// RESUMEN FINAL
// ============================================================================

function printSummary() {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(20) + '📊 RESUMEN DE PRUEBAS' + ' '.repeat(27) + '║');
  console.log('╠' + '═'.repeat(68) + '╣');
  
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`║  Total de pruebas:    ${totalTests.toString().padStart(5)}` + ' '.repeat(40) + '║');
  console.log(`║  ${colors.green}Exitosas:${colors.reset}             ${passedTests.toString().padStart(5)}` + ' '.repeat(40) + '║');
  console.log(`║  ${colors.red}Fallidas:${colors.reset}             ${failedTests.toString().padStart(5)}` + ' '.repeat(40) + '║');
  console.log(`║  Tasa de éxito:       ${passRate}%` + ' '.repeat(42 - passRate.length) + '║');
  
  console.log('╠' + '═'.repeat(68) + '╣');
  
  if (errors.length > 0) {
    console.log(`║  ${colors.red}ERRORES CRÍTICOS: ${errors.length}${colors.reset}` + ' '.repeat(47 - errors.length.toString().length) + '║');
    errors.forEach((e, i) => {
      const msg = e.substring(0, 60);
      console.log(`║    ${i + 1}. ${msg}` + ' '.repeat(62 - msg.length - i.toString().length) + '║');
    });
  }
  
  if (warnings.length > 0) {
    console.log(`║  ${colors.yellow}ADVERTENCIAS: ${warnings.length}${colors.reset}` + ' '.repeat(51 - warnings.length.toString().length) + '║');
  }
  
  console.log('╚' + '═'.repeat(68) + '╝');
  
  // Estado final
  if (failedTests === 0 && errors.length === 0) {
    log(colors.green, '\n✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE\n');
  } else if (errors.length > 0) {
    log(colors.red, '\n❌ HAY ERRORES CRÍTICOS QUE REQUIEREN ATENCIÓN\n');
  } else {
    log(colors.yellow, '\n⚠️ HAY ADVERTENCIAS QUE DEBERÍAN REVISARSE\n');
  }
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(10) + '🧪 PRUEBAS COMPLETAS - ERP 777 V2' + ' '.repeat(24) + '║');
  console.log('║' + ' '.repeat(10) + 'Módulos: EVENTOS e INVENTARIO' + ' '.repeat(28) + '║');
  console.log('║' + ' '.repeat(10) + `Fecha: ${new Date().toLocaleString('es-MX')}` + ' '.repeat(30) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');

  try {
    await testIntegridad();
    await testEventosModule();
    await testInventarioModule();
    await testCRUD();
    
    printSummary();
    
    process.exit(failedTests > 0 || errors.length > 0 ? 1 : 0);
  } catch (e) {
    console.error('\n❌ ERROR FATAL:', e.message);
    process.exit(1);
  }
}

main();
