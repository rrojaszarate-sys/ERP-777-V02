/**
 * PRUEBA AUTOMATIZADA COMPLETA - EVENTO DOTERRA 2025
 *
 * Flujo de prueba:
 * 1. Crear evento
 * 2. Cargar gastos desde Excel (SP's, Combustible, RH, Materiales)
 * 3. Cargar provisiones desde Excel
 * 4. Convertir provisiones a gastos (simular aprobación)
 * 5. Verificar integridad de datos
 */
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const EXCEL_PATH = '/home/rodri/proyectos/ERP-777-V02-pc/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

// Mapeo de categorías (nota: Excel usa apóstrofe especial ´ no ')
const CATEGORIA_MAP = {
  "SP´S": 'SP',           // Solicitudes de Pago
  "SP'S": 'SP',           // Por si acaso
  'COMBUSTIBLE  PEAJE': 'COMB',  // Combustible/Peaje
  'RH': 'RH',             // Recursos Humanos
  'MATERIALES': 'MAT'     // Materiales
};

let errores = [];
let advertencias = [];

function log(emoji, mensaje) {
  console.log(emoji + ' ' + mensaje);
}

function logError(mensaje) {
  errores.push(mensaje);
  console.log('❌ ERROR: ' + mensaje);
}

function logWarning(mensaje) {
  advertencias.push(mensaje);
  console.log('⚠️  ' + mensaje);
}

async function cargarCategorias() {
  const { data, error } = await supabase
    .from('cat_categorias_gasto')
    .select('id, clave, nombre')
    .eq('activo', true);

  if (error) {
    logError('No se pudieron cargar categorías: ' + error.message);
    return [];
  }
  return data || [];
}

async function obtenerOCrearProveedor(nombreProveedor) {
  // Buscar proveedor existente
  const { data: existing } = await supabase
    .from('cat_proveedores')
    .select('id')
    .ilike('razon_social', nombreProveedor)
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Crear nuevo proveedor
  const { data: created, error } = await supabase
    .from('cat_proveedores')
    .insert({
      razon_social: nombreProveedor,
      nombre_comercial: nombreProveedor,
      datos_fiscales_completos: false,
      requiere_actualizacion: true,
      modulo_origen: 'EXCEL_IMPORT',
      activo: true
    })
    .select()
    .single();

  if (error) {
    logWarning('Error creando proveedor ' + nombreProveedor + ': ' + error.message);
    return null;
  }
  return created.id;
}

async function obtenerCategoriaId(categorias, nombreHoja) {
  const nombreCategoria = CATEGORIA_MAP[nombreHoja] || 'Otros';
  const cat = categorias.find(c =>
    c.nombre.toLowerCase().includes(nombreCategoria.toLowerCase()) ||
    nombreCategoria.toLowerCase().includes(c.nombre.toLowerCase())
  );
  return cat?.id || categorias.find(c => c.nombre.toLowerCase().includes('otro'))?.id;
}

function excelDateToISO(excelDate) {
  if (!excelDate) return new Date().toISOString().split('T')[0];
  if (typeof excelDate === 'string') return excelDate;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

// ============================================================================
// PASO 1: CREAR EVENTO
// ============================================================================
async function paso1_CrearEvento() {
  log('📅', '═'.repeat(58));
  log('📅', 'PASO 1: Creando evento DOTERRA 2025');
  log('📅', '═'.repeat(58));

  const eventoData = {
    company_id: COMPANY_ID,
    clave_evento: 'DOT2025-003',
    nombre_proyecto: 'CONVENCIÓN DOTERRA 2025',
    descripcion: 'Convención DOTERRA 2025 - Prueba automatizada',
    fecha_evento: '2025-07-01',
    fecha_fin: '2025-12-31',
    estado_id: 2, // en_proceso
    subtotal: 0,
    iva: 0,
    total: 0,
    total_ingresos: 0,
    total_gastos: 0,
    utilidad: 0,
    margen_utilidad: 0,
    status_facturacion: 'pendiente_facturar',
    prioridad: 'alta',
    fase_proyecto: 'en_proceso',
    activo: true
  };

  const { data, error } = await supabase
    .from('eventos_erp')
    .insert(eventoData)
    .select()
    .single();

  if (error) {
    logError('Error creando evento: ' + error.message);
    throw error;
  }

  log('✅', 'Evento creado exitosamente');
  log('  ', '  ID: ' + data.id);
  log('  ', '  Nombre: ' + data.nombre_proyecto);
  log('  ', '  Clave: ' + data.clave_evento);

  return data;
}

// ============================================================================
// PASO 2: CARGAR GASTOS
// ============================================================================
async function paso2_CargarGastos(eventoId) {
  log('💰', '═'.repeat(58));
  log('💰', 'PASO 2: Cargando gastos desde Excel');
  log('💰', '═'.repeat(58));

  const workbook = XLSX.readFile(EXCEL_PATH);
  const categorias = await cargarCategorias();

  if (categorias.length === 0) {
    logError('No hay categorías disponibles');
    return { totalGastos: 0, montoTotal: 0 };
  }

  const hojasGastos = ["SP'S", 'COMBUSTIBLE  PEAJE', 'RH', 'MATERIALES'];
  let totalGastos = 0;
  let montoTotal = 0;

  for (const nombreHoja of hojasGastos) {
    if (!workbook.SheetNames.includes(nombreHoja)) {
      logWarning('Hoja no encontrada: ' + nombreHoja);
      continue;
    }

    log('📋', '\nProcesando: ' + nombreHoja);

    const sheet = workbook.Sheets[nombreHoja];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Encontrar encabezados
    let headerRow = -1;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row && row.includes('Status') && row.includes('Concepto')) {
        headerRow = i;
        break;
      }
    }

    if (headerRow === -1) {
      logWarning('No se encontró encabezado en: ' + nombreHoja);
      continue;
    }

    const headers = data[headerRow];
    const categoriaId = await obtenerCategoriaId(categorias, nombreHoja);

    let gastosHoja = 0;
    let montoHoja = 0;

    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0] || row[0] === '') continue;

      const statusIdx = headers.indexOf('Status');
      const proveedorIdx = headers.indexOf('Proveedor / Razón Social');
      const conceptoIdx = headers.indexOf('Concepto');
      const subtotalIdx = headers.indexOf('Sub-Total');
      const ivaIdx = headers.indexOf('I.V.A');
      const totalIdx = headers.indexOf('Monto a Pagar');
      const fechaIdx = headers.indexOf('Fecha de Pago');
      const metodoPagoIdx = headers.indexOf('Método de Pago');

      const subtotal = parseFloat(row[subtotalIdx]) || 0;
      const iva = parseFloat(row[ivaIdx]) || 0;
      const total = parseFloat(row[totalIdx]) || subtotal + iva;

      if (total <= 0) continue;

      // Construir concepto incluyendo proveedor
      const proveedorNombre = row[proveedorIdx] || 'No especificado';
      const conceptoTexto = row[conceptoIdx] || 'Sin concepto';
      const gastoData = {
        company_id: COMPANY_ID,
        evento_id: eventoId,
        concepto: `${conceptoTexto} - ${proveedorNombre}`,
        subtotal: subtotal,
        iva: iva,
        total: total,
        fecha_gasto: excelDateToISO(row[fechaIdx])
      };

      const { error } = await supabase.from('gastos_erp').insert(gastoData);

      if (error) {
        logWarning('Gasto fallido: ' + (row[conceptoIdx] || '').substring(0, 30) + ' - ' + error.message);
      } else {
        gastosHoja++;
        montoHoja += total;
      }
    }

    log('✅', '  Gastos: ' + gastosHoja + ' | Monto: $' + montoHoja.toLocaleString('es-MX', { minimumFractionDigits: 2 }));
    totalGastos += gastosHoja;
    montoTotal += montoHoja;
  }

  log('📊', '\nRESUMEN GASTOS: ' + totalGastos + ' registros | $' + montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 }));

  return { totalGastos, montoTotal };
}

// ============================================================================
// PASO 3: CARGAR PROVISIONES
// ============================================================================
async function paso3_CargarProvisiones(eventoId) {
  log('📋', '═'.repeat(58));
  log('📋', 'PASO 3: Cargando provisiones desde Excel');
  log('📋', '═'.repeat(58));

  const workbook = XLSX.readFile(EXCEL_PATH);

  if (!workbook.SheetNames.includes('PROVISIONES')) {
    logWarning('Hoja PROVISIONES no encontrada');
    return { totalProvisiones: 0, montoTotal: 0, provisionesIds: [] };
  }

  const sheet = workbook.Sheets['PROVISIONES'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let headerRow = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row.includes('Proveedor / Razón Social') && row.includes('Concepto')) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    logWarning('No se encontró encabezado en PROVISIONES');
    return { totalProvisiones: 0, montoTotal: 0, provisionesIds: [] };
  }

  const headers = data[headerRow];
  const categorias = await cargarCategorias();
  // Usar primera categoría disponible (SP - Solicitudes de Pago)
  const categoriaDefault = categorias.find(c => c.clave === 'SP')?.id || categorias[0]?.id;

  let totalProvisiones = 0;
  let montoTotal = 0;
  const provisionesIds = [];

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0] || row[0] === '') continue;

    const proveedorIdx = headers.indexOf('Proveedor / Razón Social');
    const conceptoIdx = headers.indexOf('Concepto');
    const subtotalIdx = headers.indexOf('Sub-Total');
    const ivaIdx = headers.indexOf('I.V.A');
    const totalIdx = headers.indexOf('Monto a Pagar');

    const subtotal = parseFloat(row[subtotalIdx]) || 0;
    const iva = parseFloat(row[ivaIdx]) || 0;
    const total = parseFloat(row[totalIdx]) || subtotal + iva;

    if (total <= 0) continue;

    // Obtener o crear proveedor
    const nombreProveedor = row[proveedorIdx] || 'Proveedor por definir';
    const proveedorId = await obtenerOCrearProveedor(nombreProveedor);

    if (!proveedorId) {
      logWarning('No se pudo obtener proveedor para: ' + (row[conceptoIdx] || '').substring(0, 30));
      continue;
    }

    const provisionData = {
      evento_id: eventoId,
      proveedor_id: proveedorId,
      categoria_id: categoriaDefault,
      concepto: row[conceptoIdx] || 'Sin concepto',
      descripcion: 'Provisión: ' + (row[conceptoIdx] || ''),
      subtotal: subtotal,
      iva_porcentaje: subtotal > 0 ? Math.round((iva / subtotal) * 100) : 0,
      iva: iva,
      total: total,
      fecha_estimada: new Date().toISOString().split('T')[0],
      estado: 'pendiente'
    };

    const { data: inserted, error } = await supabase
      .from('evt_provisiones')
      .insert(provisionData)
      .select()
      .single();

    if (error) {
      logWarning('Provisión fallida: ' + (row[conceptoIdx] || '').substring(0, 30) + ' - ' + error.message);
    } else {
      totalProvisiones++;
      montoTotal += total;
      provisionesIds.push(inserted.id);
      log('✅', '  ' + (row[conceptoIdx] || '').substring(0, 45) + ' | $' + total.toLocaleString());
    }
  }

  log('📊', '\nRESUMEN PROVISIONES: ' + totalProvisiones + ' registros | $' + montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 }));

  return { totalProvisiones, montoTotal, provisionesIds };
}

// ============================================================================
// PASO 4: CONVERTIR PROVISIONES A GASTOS
// ============================================================================
async function paso4_ConvertirProvisionesAGastos(eventoId, provisionesIds) {
  log('🔄', '═'.repeat(58));
  log('🔄', 'PASO 4: Convirtiendo provisiones a gastos');
  log('🔄', '═'.repeat(58));

  if (provisionesIds.length === 0) {
    logWarning('No hay provisiones para convertir');
    return { convertidas: 0 };
  }

  // Obtener las provisiones
  const { data: provisiones, error: fetchError } = await supabase
    .from('evt_provisiones')
    .select('*')
    .in('id', provisionesIds);

  if (fetchError) {
    logError('Error obteniendo provisiones: ' + fetchError.message);
    return { convertidas: 0 };
  }

  let convertidas = 0;

  for (const provision of provisiones) {
    // Crear gasto desde provisión
    // Obtener nombre del proveedor desde proveedor_id
    let nombreProveedor = 'Proveedor no especificado';
    if (provision.proveedor_id) {
      const { data: prov } = await supabase
        .from('cat_proveedores')
        .select('razon_social')
        .eq('id', provision.proveedor_id)
        .single();
      if (prov) nombreProveedor = prov.razon_social;
    }

    const gastoData = {
      company_id: COMPANY_ID,
      evento_id: provision.evento_id,
      concepto: `${provision.concepto} - ${nombreProveedor} [Convertido de provisión]`,
      subtotal: provision.subtotal,
      iva: provision.iva,
      total: provision.total,
      fecha_gasto: new Date().toISOString().split('T')[0]
    };

    const { error: insertError } = await supabase
      .from('gastos_erp')
      .insert(gastoData);

    if (insertError) {
      logWarning('Error convirtiendo provisión: ' + provision.concepto.substring(0, 30) + ' - ' + insertError.message);
      continue;
    }

    // Actualizar estado de la provisión
    const { error: updateError } = await supabase
      .from('evt_provisiones')
      .update({
        estado: 'convertida',
        fecha_conversion: new Date().toISOString()
      })
      .eq('id', provision.id);

    if (updateError) {
      logWarning('Error actualizando provisión: ' + updateError.message);
    } else {
      convertidas++;
      log('✅', '  Convertida: ' + provision.concepto.substring(0, 45));
    }
  }

  log('📊', '\nPROVISIONES CONVERTIDAS: ' + convertidas + ' de ' + provisionesIds.length);

  return { convertidas };
}

// ============================================================================
// PASO 5: VERIFICAR INTEGRIDAD
// ============================================================================
async function paso5_VerificarIntegridad(eventoId) {
  log('🔍', '═'.repeat(58));
  log('🔍', 'PASO 5: Verificando integridad de datos');
  log('🔍', '═'.repeat(58));

  // Verificar evento
  const { data: evento, error: evtError } = await supabase
    .from('eventos_erp')
    .select('*')
    .eq('id', eventoId)
    .single();

  if (evtError || !evento) {
    logError('Evento no encontrado');
    return false;
  }
  log('✅', 'Evento verificado: ' + evento.nombre_proyecto);

  // Contar gastos
  const { count: gastosCount, error: gastosError } = await supabase
    .from('gastos_erp')
    .select('*', { count: 'exact', head: true })
    .eq('evento_id', eventoId);

  if (gastosError) {
    logError('Error verificando gastos: ' + gastosError.message);
  } else {
    log('✅', 'Gastos en BD: ' + gastosCount);
  }

  // Sumar montos gastos
  const { data: gastosSum } = await supabase
    .from('gastos_erp')
    .select('total')
    .eq('evento_id', eventoId);

  const totalGastos = (gastosSum || []).reduce((sum, g) => sum + (g.total || 0), 0);
  log('💰', 'Total gastos: $' + totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2 }));

  // Contar provisiones
  const { count: provCount } = await supabase
    .from('evt_provisiones')
    .select('*', { count: 'exact', head: true })
    .eq('evento_id', eventoId);

  log('📋', 'Provisiones en BD: ' + (provCount || 0));

  // Provisiones convertidas
  const { count: convertidas } = await supabase
    .from('evt_provisiones')
    .select('*', { count: 'exact', head: true })
    .eq('evento_id', eventoId)
    .eq('estado', 'convertida');

  log('🔄', 'Provisiones convertidas: ' + (convertidas || 0));

  return true;
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('  PRUEBA AUTOMATIZADA COMPLETA - DOTERRA 2025');
  console.log('🚀'.repeat(30) + '\n');

  const inicio = Date.now();

  try {
    // Paso 1
    const evento = await paso1_CrearEvento();

    // Paso 2
    const gastos = await paso2_CargarGastos(evento.id);

    // Paso 3
    const provisiones = await paso3_CargarProvisiones(evento.id);

    // Paso 4
    const conversion = await paso4_ConvertirProvisionesAGastos(evento.id, provisiones.provisionesIds);

    // Paso 5
    await paso5_VerificarIntegridad(evento.id);

    // Resumen final
    const duracion = ((Date.now() - inicio) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(60));
    console.log('✅ PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('═'.repeat(60));
    console.log('\n📊 RESUMEN FINAL:');
    console.log('   Evento ID: ' + evento.id);
    console.log('   Evento: ' + evento.nombre_proyecto);
    console.log('   Gastos cargados: ' + gastos.totalGastos);
    console.log('   Provisiones cargadas: ' + provisiones.totalProvisiones);
    console.log('   Provisiones convertidas: ' + conversion.convertidas);
    console.log('   Monto gastos: $' + gastos.montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 }));
    console.log('   Monto provisiones: $' + provisiones.montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 }));
    console.log('   Duración: ' + duracion + 's');

    if (errores.length > 0) {
      console.log('\n⚠️  ERRORES (' + errores.length + '):');
      errores.forEach(e => console.log('   - ' + e));
    }

    if (advertencias.length > 0) {
      console.log('\n📝 ADVERTENCIAS (' + advertencias.length + '):');
      advertencias.slice(0, 5).forEach(a => console.log('   - ' + a));
      if (advertencias.length > 5) console.log('   ... y ' + (advertencias.length - 5) + ' más');
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error.message);
    process.exit(1);
  }
}

main();
