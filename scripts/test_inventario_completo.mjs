/**
 * PRUEBAS AUTOMATIZADAS - SISTEMA DE INVENTARIO ERP
 * ==================================================
 * 
 * Este archivo contiene pruebas automatizadas para:
 * 1. Alta de productos (CRUD completo)
 * 2. Entrada de múltiples productos en una sola operación
 * 3. Salida de múltiples productos en una sola operación
 * 4. Verificación de stock y movimientos
 * 
 * Ejecutar: node scripts/test_inventario_completo.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const TEST_PREFIX = 'TEST_AUTO_';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`),
};

// ============================================================================
// UTILIDADES
// ============================================================================

async function limpiarDatosPrueba() {
  log.info('Limpiando datos de pruebas anteriores...');
  
  // Obtener productos de prueba
  const { data: productos } = await supabase
    .from('productos_erp')
    .select('id')
    .like('clave', `${TEST_PREFIX}%`);
  
  if (productos && productos.length > 0) {
    const productIds = productos.map(p => p.id);
    
    // Eliminar movimientos de estos productos
    await supabase
      .from('movimientos_inventario_erp')
      .delete()
      .in('producto_id', productIds);
    
    // Eliminar productos de prueba
    await supabase
      .from('productos_erp')
      .delete()
      .like('clave', `${TEST_PREFIX}%`);
  }
  
  log.success('Datos de prueba anteriores eliminados');
}

async function obtenerAlmacenPrincipal() {
  const { data, error } = await supabase
    .from('almacenes_erp')
    .select('*')
    .eq('activo', true)
    .limit(1)
    .single();
  
  if (error || !data) {
    throw new Error('No se encontró almacén activo');
  }
  return data;
}

async function obtenerStockProducto(productoId, almacenId) {
  const { data: entradas } = await supabase
    .from('movimientos_inventario_erp')
    .select('cantidad')
    .eq('producto_id', productoId)
    .eq('almacen_id', almacenId)
    .eq('tipo', 'entrada');
  
  const { data: salidas } = await supabase
    .from('movimientos_inventario_erp')
    .select('cantidad')
    .eq('producto_id', productoId)
    .eq('almacen_id', almacenId)
    .eq('tipo', 'salida');
  
  const totalEntradas = (entradas || []).reduce((sum, m) => sum + m.cantidad, 0);
  const totalSalidas = (salidas || []).reduce((sum, m) => sum + m.cantidad, 0);
  
  return totalEntradas - totalSalidas;
}

// ============================================================================
// TEST 1: ALTA DE PRODUCTOS (CRUD)
// ============================================================================

async function testAltaProductos() {
  log.section('TEST 1: ALTA DE PRODUCTOS');
  
  const productosTest = [
    {
      clave: `${TEST_PREFIX}PROD_001`,
      nombre: 'Producto de Prueba 1 - Tornillo 1/4',
      descripcion: 'Tornillo hexagonal de 1/4 pulgada',
      categoria: 'Ferretería',
      unidad: 'PZA',
      precio_base: 5.50,
      precio_venta: 8.00,
      costo: 3.50,
      codigo_qr: `${TEST_PREFIX}QR001`,
    },
    {
      clave: `${TEST_PREFIX}PROD_002`,
      nombre: 'Producto de Prueba 2 - Cable Eléctrico',
      descripcion: 'Cable eléctrico calibre 12',
      categoria: 'Electricidad',
      unidad: 'MTO',
      precio_base: 25.00,
      precio_venta: 35.00,
      costo: 18.00,
      codigo_qr: `${TEST_PREFIX}QR002`,
    },
    {
      clave: `${TEST_PREFIX}PROD_003`,
      nombre: 'Producto de Prueba 3 - Pintura Vinílica',
      descripcion: 'Pintura vinílica blanca 4L',
      categoria: 'Pinturas',
      unidad: 'CUBO',
      precio_base: 180.00,
      precio_venta: 250.00,
      costo: 120.00,
      codigo_qr: `${TEST_PREFIX}QR003`,
    },
    {
      clave: `${TEST_PREFIX}PROD_004`,
      nombre: 'Producto de Prueba 4 - Tubo PVC',
      descripcion: 'Tubo PVC hidráulico 2 pulgadas',
      categoria: 'Plomería',
      unidad: 'PZA',
      precio_base: 45.00,
      precio_venta: 65.00,
      costo: 30.00,
      codigo_qr: `${TEST_PREFIX}QR004`,
    },
    {
      clave: `${TEST_PREFIX}PROD_005`,
      nombre: 'Producto de Prueba 5 - Cemento Gris',
      descripcion: 'Cemento portland gris 50kg',
      categoria: 'Construcción',
      unidad: 'SACO',
      precio_base: 150.00,
      precio_venta: 180.00,
      costo: 110.00,
      codigo_qr: `${TEST_PREFIX}QR005`,
    },
  ];
  
  const productosCreados = [];
  
  for (const producto of productosTest) {
    log.info(`Creando producto: ${producto.nombre}`);
    
    const { data, error } = await supabase
      .from('productos_erp')
      .insert({
        ...producto,
        company_id: COMPANY_ID,
        activo: true,
        iva: true,
        margen: 30,
        tipo: 'producto',
      })
      .select()
      .single();
    
    if (error) {
      log.error(`Error creando producto ${producto.clave}: ${error.message}`);
      throw error;
    }
    
    productosCreados.push(data);
    log.success(`Producto creado: ${data.clave} (ID: ${data.id})`);
  }
  
  // Verificar que todos se crearon
  const { data: verificacion, error: errVerif } = await supabase
    .from('productos_erp')
    .select('id, clave, nombre')
    .like('clave', `${TEST_PREFIX}%`);
  
  if (verificacion?.length !== productosTest.length) {
    throw new Error(`Se esperaban ${productosTest.length} productos, pero se encontraron ${verificacion?.length}`);
  }
  
  log.success(`✓ Alta de productos completada: ${productosCreados.length} productos creados`);
  
  return productosCreados;
}

// ============================================================================
// TEST 2: ENTRADA DE MÚLTIPLES PRODUCTOS (Una sola operación)
// ============================================================================

async function testEntradaMultiple(productos, almacen) {
  log.section('TEST 2: ENTRADA MÚLTIPLE DE PRODUCTOS');
  
  const entradasData = [
    { productoId: productos[0].id, cantidad: 100, costoUnitario: 3.50 },
    { productoId: productos[1].id, cantidad: 500, costoUnitario: 18.00 },
    { productoId: productos[2].id, cantidad: 50, costoUnitario: 120.00 },
    { productoId: productos[3].id, cantidad: 200, costoUnitario: 30.00 },
    { productoId: productos[4].id, cantidad: 80, costoUnitario: 110.00 },
  ];
  
  const referenciaLote = `ENT_LOTE_${Date.now()}`;
  
  log.info(`Registrando entrada masiva con referencia: ${referenciaLote}`);
  
  // Crear todos los movimientos de entrada en una sola operación
  const movimientos = entradasData.map(entrada => ({
    almacen_id: almacen.id,
    producto_id: entrada.productoId,
    tipo: 'entrada',
    cantidad: entrada.cantidad,
    costo_unitario: entrada.costoUnitario,
    referencia: referenciaLote,
    concepto: `Entrada inicial de inventario - Lote de prueba automatizada`,
  }));
  
  const { data: movimientosCreados, error } = await supabase
    .from('movimientos_inventario_erp')
    .insert(movimientos)
    .select();
  
  if (error) {
    log.error(`Error en entrada múltiple: ${error.message}`);
    throw error;
  }
  
  log.success(`✓ Entrada múltiple completada: ${movimientosCreados.length} movimientos registrados`);
  
  // Verificar stock de cada producto
  log.info('Verificando stock después de entradas...');
  
  for (let i = 0; i < productos.length; i++) {
    const stockActual = await obtenerStockProducto(productos[i].id, almacen.id);
    const stockEsperado = entradasData[i].cantidad;
    
    if (stockActual !== stockEsperado) {
      throw new Error(`Stock incorrecto para ${productos[i].clave}: esperado ${stockEsperado}, actual ${stockActual}`);
    }
    
    log.success(`  ${productos[i].clave}: Stock = ${stockActual} ✓`);
  }
  
  return { movimientos: movimientosCreados, cantidades: entradasData };
}

// ============================================================================
// TEST 3: SALIDA DE MÚLTIPLES PRODUCTOS (Una sola operación)
// ============================================================================

async function testSalidaMultiple(productos, almacen, cantidadesEntrada) {
  log.section('TEST 3: SALIDA MÚLTIPLE DE PRODUCTOS');
  
  // Definir salidas (menos que las entradas para no quedar en negativo)
  const salidasData = [
    { productoId: productos[0].id, cantidad: 25 },  // 100 - 25 = 75
    { productoId: productos[1].id, cantidad: 150 }, // 500 - 150 = 350
    { productoId: productos[2].id, cantidad: 10 },  // 50 - 10 = 40
    { productoId: productos[3].id, cantidad: 75 },  // 200 - 75 = 125
    { productoId: productos[4].id, cantidad: 30 },  // 80 - 30 = 50
  ];
  
  const referenciaLote = `SAL_LOTE_${Date.now()}`;
  
  log.info(`Registrando salida masiva con referencia: ${referenciaLote}`);
  
  // Crear todos los movimientos de salida en una sola operación
  const movimientos = salidasData.map(salida => ({
    almacen_id: almacen.id,
    producto_id: salida.productoId,
    tipo: 'salida',
    cantidad: salida.cantidad,
    referencia: referenciaLote,
    concepto: `Salida por venta/consumo - Lote de prueba automatizada`,
  }));
  
  const { data: movimientosCreados, error } = await supabase
    .from('movimientos_inventario_erp')
    .insert(movimientos)
    .select();
  
  if (error) {
    log.error(`Error en salida múltiple: ${error.message}`);
    throw error;
  }
  
  log.success(`✓ Salida múltiple completada: ${movimientosCreados.length} movimientos registrados`);
  
  // Verificar stock final de cada producto
  log.info('Verificando stock después de salidas...');
  
  for (let i = 0; i < productos.length; i++) {
    const stockActual = await obtenerStockProducto(productos[i].id, almacen.id);
    const stockEsperado = cantidadesEntrada[i].cantidad - salidasData[i].cantidad;
    
    if (stockActual !== stockEsperado) {
      throw new Error(`Stock incorrecto para ${productos[i].clave}: esperado ${stockEsperado}, actual ${stockActual}`);
    }
    
    log.success(`  ${productos[i].clave}: Stock = ${stockActual} (entrada: ${cantidadesEntrada[i].cantidad}, salida: ${salidasData[i].cantidad}) ✓`);
  }
  
  return { movimientos: movimientosCreados, cantidades: salidasData };
}

// ============================================================================
// TEST 4: SEGUNDA ENTRADA MÚLTIPLE (Verificar acumulación)
// ============================================================================

async function testSegundaEntrada(productos, almacen) {
  log.section('TEST 4: SEGUNDA ENTRADA MÚLTIPLE');
  
  const entradasData = [
    { productoId: productos[0].id, cantidad: 50, costoUnitario: 3.75 },
    { productoId: productos[1].id, cantidad: 200, costoUnitario: 19.00 },
    { productoId: productos[2].id, cantidad: 25, costoUnitario: 125.00 },
  ];
  
  const referenciaLote = `ENT_LOTE2_${Date.now()}`;
  
  log.info(`Registrando segunda entrada con referencia: ${referenciaLote}`);
  
  // Obtener stock antes
  const stockAntes = [];
  for (const entrada of entradasData) {
    const producto = productos.find(p => p.id === entrada.productoId);
    const stock = await obtenerStockProducto(entrada.productoId, almacen.id);
    stockAntes.push({ producto, stock });
  }
  
  // Crear movimientos
  const movimientos = entradasData.map(entrada => ({
    almacen_id: almacen.id,
    producto_id: entrada.productoId,
    tipo: 'entrada',
    cantidad: entrada.cantidad,
    costo_unitario: entrada.costoUnitario,
    referencia: referenciaLote,
    concepto: `Reposición de inventario - Segunda entrada de prueba`,
  }));
  
  const { data: movimientosCreados, error } = await supabase
    .from('movimientos_inventario_erp')
    .insert(movimientos)
    .select();
  
  if (error) {
    log.error(`Error en segunda entrada: ${error.message}`);
    throw error;
  }
  
  log.success(`✓ Segunda entrada completada: ${movimientosCreados.length} movimientos`);
  
  // Verificar acumulación
  log.info('Verificando acumulación de stock...');
  
  for (let i = 0; i < entradasData.length; i++) {
    const stockActual = await obtenerStockProducto(entradasData[i].productoId, almacen.id);
    const stockEsperado = stockAntes[i].stock + entradasData[i].cantidad;
    
    if (stockActual !== stockEsperado) {
      throw new Error(`Stock no acumuló correctamente para ${stockAntes[i].producto.clave}`);
    }
    
    log.success(`  ${stockAntes[i].producto.clave}: ${stockAntes[i].stock} + ${entradasData[i].cantidad} = ${stockActual} ✓`);
  }
  
  return movimientosCreados;
}

// ============================================================================
// TEST 5: CONSULTA DE MOVIMIENTOS
// ============================================================================

async function testConsultaMovimientos(productos, almacen) {
  log.section('TEST 5: CONSULTA DE MOVIMIENTOS');
  
  const productoTest = productos[0];
  
  log.info(`Consultando movimientos del producto: ${productoTest.clave}`);
  
  const { data: movimientos, error } = await supabase
    .from('movimientos_inventario_erp')
    .select('*')
    .eq('producto_id', productoTest.id)
    .eq('almacen_id', almacen.id)
    .order('fecha_creacion', { ascending: true });
  
  if (error) {
    log.error(`Error consultando movimientos: ${error.message}`);
    throw error;
  }
  
  log.success(`Se encontraron ${movimientos.length} movimientos para ${productoTest.clave}`);
  
  // Mostrar resumen
  const entradas = movimientos.filter(m => m.tipo === 'entrada');
  const salidas = movimientos.filter(m => m.tipo === 'salida');
  
  console.log(`\n  📊 Resumen de movimientos para ${productoTest.clave}:`);
  console.log(`     Entradas: ${entradas.length} movimientos, Total: ${entradas.reduce((s, m) => s + m.cantidad, 0)} unidades`);
  console.log(`     Salidas:  ${salidas.length} movimientos, Total: ${salidas.reduce((s, m) => s + m.cantidad, 0)} unidades`);
  
  // Calcular stock final
  const stockFinal = await obtenerStockProducto(productoTest.id, almacen.id);
  console.log(`     Stock actual: ${stockFinal} unidades\n`);
  
  log.success('✓ Consulta de movimientos completada');
  
  return movimientos;
}

// ============================================================================
// TEST 6: RESUMEN FINAL DE INVENTARIO
// ============================================================================

async function testResumenInventario(productos, almacen) {
  log.section('TEST 6: RESUMEN FINAL DE INVENTARIO');
  
  console.log('\n┌──────────────────────────────────────────────────────────────────────┐');
  console.log('│                      RESUMEN DE INVENTARIO                          │');
  console.log('├────────────────────┬──────────┬───────────┬───────────┬─────────────┤');
  console.log('│ Producto           │ Entradas │ Salidas   │ Stock     │ Valor ($)   │');
  console.log('├────────────────────┼──────────┼───────────┼───────────┼─────────────┤');
  
  let valorTotalInventario = 0;
  
  for (const producto of productos) {
    const { data: movs } = await supabase
      .from('movimientos_inventario_erp')
      .select('tipo, cantidad, costo_unitario')
      .eq('producto_id', producto.id)
      .eq('almacen_id', almacen.id);
    
    const entradas = (movs || []).filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.cantidad, 0);
    const salidas = (movs || []).filter(m => m.tipo === 'salida').reduce((s, m) => s + m.cantidad, 0);
    const stock = entradas - salidas;
    const valorStock = stock * producto.costo;
    valorTotalInventario += valorStock;
    
    const nombreCorto = producto.nombre.substring(0, 18).padEnd(18);
    console.log(`│ ${nombreCorto} │ ${String(entradas).padStart(8)} │ ${String(salidas).padStart(9)} │ ${String(stock).padStart(9)} │ ${valorStock.toFixed(2).padStart(11)} │`);
  }
  
  console.log('├────────────────────┴──────────┴───────────┴───────────┼─────────────┤');
  console.log(`│                                      VALOR TOTAL      │ ${valorTotalInventario.toFixed(2).padStart(11)} │`);
  console.log('└───────────────────────────────────────────────────────┴─────────────┘\n');
  
  log.success(`✓ Valor total del inventario de prueba: $${valorTotalInventario.toFixed(2)}`);
}

// ============================================================================
// EJECUTAR TODAS LAS PRUEBAS
// ============================================================================

async function ejecutarPruebas() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║          PRUEBAS AUTOMATIZADAS - SISTEMA DE INVENTARIO ERP          ║');
  console.log('║                     Fecha: ' + new Date().toLocaleString('es-MX').padEnd(23) + '          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  
  const resultados = {
    total: 6,
    exitosos: 0,
    fallidos: 0,
    errores: [],
  };
  
  try {
    // Preparación
    await limpiarDatosPrueba();
    const almacen = await obtenerAlmacenPrincipal();
    log.success(`Usando almacén: ${almacen.nombre} (ID: ${almacen.id})`);
    
    // Test 1: Alta de productos
    const productos = await testAltaProductos();
    resultados.exitosos++;
    
    // Test 2: Entrada múltiple
    const { cantidades } = await testEntradaMultiple(productos, almacen);
    resultados.exitosos++;
    
    // Test 3: Salida múltiple
    await testSalidaMultiple(productos, almacen, cantidades);
    resultados.exitosos++;
    
    // Test 4: Segunda entrada
    await testSegundaEntrada(productos, almacen);
    resultados.exitosos++;
    
    // Test 5: Consulta de movimientos
    await testConsultaMovimientos(productos, almacen);
    resultados.exitosos++;
    
    // Test 6: Resumen final
    await testResumenInventario(productos, almacen);
    resultados.exitosos++;
    
  } catch (error) {
    resultados.fallidos++;
    resultados.errores.push(error.message);
    log.error(`Error en pruebas: ${error.message}`);
  }
  
  // Resumen final
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                         RESUMEN DE PRUEBAS                          ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total de pruebas:  ${String(resultados.total).padStart(3)}                                            ║`);
  console.log(`║  Exitosas:          ${colors.green}${String(resultados.exitosos).padStart(3)}${colors.reset}                                            ║`);
  console.log(`║  Fallidas:          ${resultados.fallidos > 0 ? colors.red : ''}${String(resultados.fallidos).padStart(3)}${colors.reset}                                            ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  
  if (resultados.errores.length > 0) {
    console.log('\nErrores encontrados:');
    resultados.errores.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }
  
  // Limpiar datos de prueba al finalizar
  console.log('\n');
  log.info('¿Desea mantener los datos de prueba? (Los datos se limpiarán en la próxima ejecución)');
  
  process.exit(resultados.fallidos > 0 ? 1 : 0);
}

// Ejecutar
ejecutarPruebas();
