#!/usr/bin/env node
/**
 * SCRIPT: CARGAR CATÁLOGO MAESTRO ITIANA
 *
 * Funcionalidad:
 * 1. Proveedores: Se cargan ligados a categorías de gastos no impactados
 * 2. Productos: Se cargan como CATÁLOGO MAESTRO (sin cantidades)
 * 3. Stock: Se carga SOLO al almacén "Materia Prima - Oficinas Centrales MADE"
 *
 * Archivo: ITIANA_CATALOGO_MAESTRO_COMPLETO.xlsx
 */

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configuración
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_ROLE_KEY requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ruta al archivo Excel
const EXCEL_PATH = join(__dirname, '..', 'ITIANA_CATALOGO_MAESTRO_COMPLETO.xlsx');

// Company ID (se obtiene automáticamente)
let COMPANY_ID = null;

// Nombre del almacén específico para stock
const ALMACEN_NOMBRE = 'Materia Prima - Oficinas Centrales MADE';

// ============================================================================
// OBTENER COMPANY ID
// ============================================================================

async function obtenerCompanyId() {
  // Primero intentar companies_erp (tabla usada por FK en proveedores/productos)
  const { data, error } = await supabase
    .from('companies_erp')
    .select('id')
    .limit(1)
    .single();

  if (error || !data) {
    console.error('⚠️  No se encontró empresa en companies_erp, usando ID por defecto');
    return '00000000-0000-0000-0000-000000000001';
  }
  return data.id;
}

// ============================================================================
// EXTRAER PROVEEDORES
// ============================================================================

function extraerProveedores(workbook) {
  const sheet = workbook.Sheets['PROVEEDORES'];
  if (!sheet) {
    console.warn('⚠️  Hoja PROVEEDORES no encontrada');
    return [];
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const proveedores = [];

  // Headers: ID Proveedor, Nombre Proveedor, Banco, Cuenta, CLABE, Estado
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[1]) continue;

    const idProveedor = row[0]?.toString().trim() || '';
    const nombre = row[1]?.toString().trim() || '';
    const banco = row[2]?.toString().trim() || '';
    const cuenta = row[3]?.toString().trim() || '';
    const clabe = row[4]?.toString().trim() || '';
    const estado = row[5]?.toString().trim().toUpperCase() || 'ACTIVO';

    proveedores.push({
      codigo_itiana: idProveedor,
      razon_social: nombre,
      nombre_comercial: nombre.length > 50 ? nombre.substring(0, 50) : null,
      banco: banco,
      cuenta_bancaria: cuenta,
      clabe_interbancaria: clabe,
      categoria: 'Gastos No Impactados', // Categoría para ligar a GNI
      activo: estado === 'ACTIVO',
      dias_credito: 30,
      limite_credito: 0,
      company_id: COMPANY_ID
    });
  }

  return proveedores;
}

// ============================================================================
// EXTRAER PRODUCTOS (CATÁLOGO MAESTRO - SIN CANTIDADES)
// ============================================================================

function extraerProductos(workbook) {
  const sheet = workbook.Sheets['PRODUCTOS'];
  if (!sheet) {
    console.warn('⚠️  Hoja PRODUCTOS no encontrada');
    return [];
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const productos = [];

  // Headers: ID Producto, Código Original, Descripción, Categoría, Subcategoría,
  //          UNSPSC, Unidad de Medida, Costo Unitario ($), Inventario Actual,
  //          Valor Total ($), Clase ABC, Ubicación, Estado
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue;

    const idProducto = row[0]?.toString().trim() || '';
    const codigoOriginal = row[1]?.toString().trim() || '';
    const descripcion = row[2]?.toString().trim() || '';
    const categoria = row[3]?.toString().trim() || 'Otros';
    const subcategoria = row[4]?.toString().trim() || '';
    const unspsc = row[5]?.toString().trim() || '';
    const unidadMedida = row[6]?.toString().trim() || 'PZA';
    const costoUnitario = parseFloat(row[7]) || 0;
    const inventarioActual = parseInt(row[8]) || 0;
    const claseABC = row[10]?.toString().trim() || 'C';
    const ubicacion = row[11]?.toString().trim() || '';
    const estado = row[12]?.toString().trim().toUpperCase() || 'ACTIVO';

    productos.push({
      clave: idProducto || `ITI-${String(codigoOriginal).padStart(4, '0')}`,
      codigo_original: codigoOriginal,
      nombre: descripcion.substring(0, 200),
      descripcion: subcategoria ? `${categoria} - ${subcategoria}. UNSPSC: ${unspsc}` : `${categoria}. UNSPSC: ${unspsc}`,
      categoria: categoria,
      unidad: unidadMedida.toUpperCase(),
      costo: costoUnitario,
      precio_base: costoUnitario,
      precio_venta: costoUnitario * 1.3, // Margen 30%
      margen: 30,
      iva: true,
      tipo: 'producto',
      activo: estado === 'ACTIVO',
      company_id: COMPANY_ID,
      // Datos adicionales para el movimiento de inventario
      _stock_inicial: inventarioActual,
      _clase_abc: claseABC,
      _ubicacion: ubicacion
    });
  }

  return productos;
}

// ============================================================================
// CARGAR PROVEEDORES A LA BASE DE DATOS
// ============================================================================

async function cargarProveedores(proveedores) {
  console.log(`\n📦 Cargando ${proveedores.length} proveedores...`);

  let insertados = 0;
  let errores = 0;
  let actualizados = 0;

  const batchSize = 50;
  for (let i = 0; i < proveedores.length; i += batchSize) {
    const batch = proveedores.slice(i, i + batchSize);

    for (const prov of batch) {
      try {
        // Verificar si ya existe
        const { data: existente } = await supabase
          .from('proveedores_erp')
          .select('id')
          .eq('razon_social', prov.razon_social)
          .eq('company_id', COMPANY_ID)
          .maybeSingle();

        if (existente) {
          // Actualizar
          const { error } = await supabase
            .from('proveedores_erp')
            .update({
              banco: prov.banco,
              cuenta_bancaria: prov.cuenta_bancaria,
              clabe_interbancaria: prov.clabe_interbancaria,
              codigo_itiana: prov.codigo_itiana,
              categoria: prov.categoria,
              fecha_actualizacion: new Date().toISOString()
            })
            .eq('id', existente.id);

          if (error) throw error;
          actualizados++;
        } else {
          // Insertar
          // Generar RFC genérico a partir del nombre (primeras letras + XAXX)
          const rfcGenerico = `XAXX${prov.codigo_itiana?.replace('PROV_', '').padStart(6, '0') || '000000'}XXX`;

          const { error } = await supabase
            .from('proveedores_erp')
            .insert([{
              company_id: prov.company_id,
              razon_social: prov.razon_social,
              nombre_comercial: prov.nombre_comercial,
              rfc: rfcGenerico, // RFC genérico para cumplir restricción NOT NULL
              banco: prov.banco,
              cuenta_bancaria: prov.cuenta_bancaria,
              clabe_interbancaria: prov.clabe_interbancaria,
              codigo_itiana: prov.codigo_itiana,
              categoria: prov.categoria,
              dias_credito: prov.dias_credito,
              limite_credito: prov.limite_credito,
              activo: prov.activo,
              fecha_creacion: new Date().toISOString(),
              fecha_actualizacion: new Date().toISOString()
            }]);

          if (error) throw error;
          insertados++;
        }
      } catch (err) {
        errores++;
        if (errores <= 5) {
          console.error(`   ❌ Error con proveedor "${prov.razon_social}":`, err.message);
        }
      }
    }

    process.stdout.write(`   Procesados: ${Math.min(i + batchSize, proveedores.length)}/${proveedores.length}\r`);
  }

  console.log(`\n   ✅ Insertados: ${insertados}, Actualizados: ${actualizados}, Errores: ${errores}`);
  return { insertados, actualizados, errores };
}

// ============================================================================
// CARGAR PRODUCTOS A LA BASE DE DATOS (CATÁLOGO MAESTRO SIN STOCK)
// ============================================================================

async function cargarProductos(productos) {
  console.log(`\n📦 Cargando ${productos.length} productos al CATÁLOGO MAESTRO...`);
  console.log('   (Sin cantidades - el stock se carga por separado al almacén MADE)');

  let insertados = 0;
  let errores = 0;
  let actualizados = 0;
  const productosConStock = [];

  const batchSize = 50;
  for (let i = 0; i < productos.length; i += batchSize) {
    const batch = productos.slice(i, i + batchSize);

    for (const prod of batch) {
      try {
        // Verificar si ya existe por clave
        const { data: existente } = await supabase
          .from('productos_erp')
          .select('id')
          .eq('clave', prod.clave)
          .eq('company_id', COMPANY_ID)
          .maybeSingle();

        const productoData = {
          clave: prod.clave,
          nombre: prod.nombre,
          descripcion: prod.descripcion,
          categoria: prod.categoria,
          unidad: prod.unidad,
          costo: prod.costo,
          precio_base: prod.precio_base,
          precio_venta: prod.precio_venta,
          margen: prod.margen,
          iva: prod.iva,
          tipo: prod.tipo,
          activo: prod.activo,
          company_id: COMPANY_ID
        };

        let productoId;

        if (existente) {
          // Actualizar
          const { error } = await supabase
            .from('productos_erp')
            .update({
              ...productoData,
              fecha_actualizacion: new Date().toISOString()
            })
            .eq('id', existente.id);

          if (error) throw error;
          productoId = existente.id;
          actualizados++;
        } else {
          // Insertar
          const { data: nuevo, error } = await supabase
            .from('productos_erp')
            .insert([{
              ...productoData,
              fecha_creacion: new Date().toISOString(),
              fecha_actualizacion: new Date().toISOString()
            }])
            .select('id')
            .single();

          if (error) throw error;
          productoId = nuevo.id;
          insertados++;
        }

        // Guardar para movimiento de stock si tiene inventario
        if (prod._stock_inicial > 0) {
          productosConStock.push({
            producto_id: productoId,
            cantidad: prod._stock_inicial,
            costo: prod.costo,
            clave: prod.clave,
            ubicacion: prod._ubicacion
          });
        }

      } catch (err) {
        errores++;
        if (errores <= 5) {
          console.error(`   ❌ Error con producto "${prod.clave}":`, err.message);
        }
      }
    }

    process.stdout.write(`   Procesados: ${Math.min(i + batchSize, productos.length)}/${productos.length}\r`);
  }

  console.log(`\n   ✅ Insertados: ${insertados}, Actualizados: ${actualizados}, Errores: ${errores}`);
  return { insertados, actualizados, errores, productosConStock };
}

// ============================================================================
// CREAR/OBTENER ALMACÉN MADE
// ============================================================================

async function obtenerOCrearAlmacenMADE() {
  console.log(`\n🏭 Configurando almacén: "${ALMACEN_NOMBRE}"...`);

  // Buscar si ya existe
  let { data: almacen } = await supabase
    .from('almacenes_erp')
    .select('id, nombre')
    .eq('company_id', COMPANY_ID)
    .eq('nombre', ALMACEN_NOMBRE)
    .maybeSingle();

  if (almacen) {
    console.log(`   ✅ Almacén existente encontrado (ID: ${almacen.id})`);
    return almacen;
  }

  // Crear el almacén
  const { data: nuevoAlmacen, error } = await supabase
    .from('almacenes_erp')
    .insert([{
      company_id: COMPANY_ID,
      nombre: ALMACEN_NOMBRE,
      descripcion: 'Almacén de materia prima en oficinas centrales MADE. Stock inicial cargado desde catálogo ITIANA.',
      ubicacion: 'Oficinas Centrales MADE',
      activo: true,
      fecha_creacion: new Date().toISOString()
    }])
    .select('id, nombre')
    .single();

  if (error) {
    console.error('   ❌ Error creando almacén:', error.message);
    throw error;
  }

  console.log(`   ✅ Almacén creado exitosamente (ID: ${nuevoAlmacen.id})`);
  return nuevoAlmacen;
}

// ============================================================================
// CARGAR STOCK INICIAL AL ALMACÉN MADE
// ============================================================================

async function cargarStockInicial(productosConStock, almacen) {
  console.log(`\n📦 Cargando stock inicial al almacén "${almacen.nombre}"...`);
  console.log(`   Productos con stock: ${productosConStock.length}`);

  let insertados = 0;
  let errores = 0;
  let omitidos = 0;

  for (const item of productosConStock) {
    try {
      // Verificar si ya existe un movimiento de carga inicial para este producto
      const { data: existente } = await supabase
        .from('movimientos_inventario_erp')
        .select('id')
        .eq('producto_id', item.producto_id)
        .eq('almacen_id', almacen.id)
        .eq('referencia', 'CARGA_ITIANA_2025')
        .maybeSingle();

      if (existente) {
        omitidos++;
        continue;
      }

      // Crear movimiento de entrada
      const { error } = await supabase
        .from('movimientos_inventario_erp')
        .insert([{
          almacen_id: almacen.id,
          producto_id: item.producto_id,
          tipo: 'entrada',
          cantidad: item.cantidad,
          costo_unitario: item.costo,
          referencia: 'CARGA_ITIANA_2025',
          concepto: `Carga inicial catálogo ITIANA. Producto: ${item.clave}. Ubicación original: ${item.ubicacion || 'N/A'}`,
          fecha_creacion: new Date().toISOString()
        }]);

      if (error) throw error;
      insertados++;

    } catch (err) {
      errores++;
      if (errores <= 3) {
        console.error(`   ❌ Error cargando stock para producto ${item.producto_id}:`, err.message);
      }
    }
  }

  console.log(`   ✅ Movimientos creados: ${insertados}, Omitidos (ya existían): ${omitidos}, Errores: ${errores}`);
  return { insertados, omitidos, errores };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('   CARGA CATÁLOGO MAESTRO ITIANA');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('   📋 CONFIGURACIÓN:');
  console.log('   • Proveedores: Se ligan a categoría "Gastos No Impactados"');
  console.log('   • Productos: Se cargan como CATÁLOGO MAESTRO (sin stock)');
  console.log(`   • Stock: Se carga SOLO al almacén "${ALMACEN_NOMBRE}"`);
  console.log('');

  try {
    // Obtener company_id
    COMPANY_ID = await obtenerCompanyId();
    console.log(`🏢 Company ID: ${COMPANY_ID}`);

    // Leer Excel
    console.log('\n📖 Leyendo archivo Excel...');
    const workbook = XLSX.readFile(EXCEL_PATH);
    console.log('   Hojas encontradas:', workbook.SheetNames.join(', '));

    // Extraer datos
    const proveedores = extraerProveedores(workbook);
    console.log(`   ✅ Proveedores extraídos: ${proveedores.length}`);

    const productos = extraerProductos(workbook);
    const productosConStock = productos.filter(p => p._stock_inicial > 0);
    console.log(`   ✅ Productos extraídos: ${productos.length}`);
    console.log(`   ✅ Productos con stock inicial: ${productosConStock.length}`);

    // Cargar a la base de datos
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('   CARGANDO A BASE DE DATOS');
    console.log('═══════════════════════════════════════════════════════════════════════');

    // 1. Proveedores (ligados a GNI)
    const resProv = await cargarProveedores(proveedores);

    // 2. Productos (catálogo maestro sin stock)
    const resProd = await cargarProductos(productos);

    // 3. Almacén MADE
    const almacen = await obtenerOCrearAlmacenMADE();

    // 4. Stock inicial al almacén MADE
    const resStock = await cargarStockInicial(resProd.productosConStock, almacen);

    // Resumen final
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('   RESUMEN DE CARGA');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`   📋 Proveedores: ${resProv.insertados} nuevos, ${resProv.actualizados} actualizados`);
    console.log(`   📦 Productos (catálogo): ${resProd.insertados} nuevos, ${resProd.actualizados} actualizados`);
    console.log(`   📊 Movimientos stock: ${resStock.insertados} creados en almacén MADE`);
    console.log('');
    console.log('   ✅ CARGA COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    process.exit(1);
  }
}

main();
