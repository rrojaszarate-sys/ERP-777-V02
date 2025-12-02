/**
 * Script para importar gastos del Excel DOTERRA a evt_gastos_erp
 *
 * IMPORTANTE: Solo importa items individuales, NO totales
 * Guarda subtotal e IVA por separado
 */

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Mapeo de categorías del Excel a IDs en la BD
const CATEGORIA_MAP = {
  "SP'S": 6,           // Solicitudes de Pago
  "COMBUSTIBLE": 9,    // Combustible
  "RH": 7,             // Recursos Humanos
  "MATERIALES": 8      // Materiales
};

async function getEventoId() {
  const { data, error } = await supabase
    .from('evt_eventos_erp')
    .select('id, company_id')
    .ilike('clave_evento', '%DOT2025-003%')
    .single();

  if (error) throw new Error('Evento DOTERRA no encontrado: ' + error.message);
  return data;
}

async function getProveedorGenerico(companyId) {
  // Buscar proveedor genérico existente
  const { data: existing } = await supabase
    .from('proveedores_erp')
    .select('id')
    .ilike('razon_social', '%VARIOS%')
    .single();

  if (existing) return existing.id;

  // Si no existe, retornar null (proveedor_id es opcional)
  return null;
}

function parseExcelDate(excelDate) {
  if (!excelDate) return new Date().toISOString();
  if (typeof excelDate === 'number') {
    // Excel date serial number
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date.toISOString();
  }
  return new Date().toISOString();
}

function isValidRow(row, categoria) {
  // Validar que sea una fila de dato, no encabezado ni total
  const status = row[0]?.toString()?.toUpperCase() || '';
  const concepto = row[4] || row[3] || '';

  // Ignorar filas de total
  if (concepto.toString().toUpperCase().includes('TOTAL')) return false;

  // Debe tener status PAGADO o PENDIENTE
  if (!['PAGADO', 'PENDIENTE', 'PENDIENTE DE PAGO'].includes(status)) return false;

  // Debe tener un monto
  const subtotal = parseFloat(row[5]) || 0;
  const total = parseFloat(row[7]) || 0;
  if (subtotal === 0 && total === 0) return false;

  return true;
}

async function importarHoja(workbook, sheetName, categoriaId, eventoId, companyId, proveedorId) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  console.log(`\n📋 Procesando hoja: ${sheetName}`);

  const gastos = [];
  let skipped = 0;

  // Encontrar la fila de encabezado
  let headerRow = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row[0]?.toString()?.toLowerCase() === 'status') {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    console.log(`  ⚠️ No se encontró encabezado en ${sheetName}`);
    return [];
  }

  // Procesar filas de datos
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];

    // Validar fila
    const status = row[0]?.toString()?.toUpperCase() || '';
    if (!['PAGADO', 'PENDIENTE', 'PENDIENTE DE PAGO'].includes(status)) {
      skipped++;
      continue;
    }

    // Extraer datos según la estructura de cada hoja
    let subtotal, iva, total, concepto, proveedor, fechaPago, pagado;

    if (sheetName === "SP´S") {
      // Columnas: Status | Método | No.Factura | Proveedor | Concepto | Sub-Total | IVA | Monto a Pagar | Fecha
      proveedor = row[3] || 'Sin especificar';
      concepto = row[4] || 'Gasto SP';
      subtotal = parseFloat(row[5]) || 0;
      iva = parseFloat(row[6]) || 0;
      total = parseFloat(row[7]) || 0;
      fechaPago = row[8];
      pagado = status === 'PAGADO';
    } else if (sheetName === "COMBUSTIBLE  PEAJE") {
      // Columnas: Status | Método | No.Factura | Proveedor | Concepto | Sub-Total | IVA | Monto a Pagar | Fecha
      proveedor = row[3] || 'Sin especificar';
      concepto = row[4] || 'Combustible/Peaje';
      subtotal = parseFloat(row[5]) || 0;
      iva = parseFloat(row[6]) || 0;
      total = parseFloat(row[7]) || 0;
      fechaPago = row[8];
      pagado = status === 'PAGADO';
    } else if (sheetName === "RH") {
      // Columnas: Status | Método | No.Factura | Proveedor | Concepto | Sub-Total | IVA | Monto a Pagar | Fecha
      proveedor = row[3] || 'KAWIR';
      concepto = row[4] || 'Nómina';
      subtotal = parseFloat(row[5]) || 0;
      iva = parseFloat(row[6]) || 0;
      total = parseFloat(row[7]) || subtotal; // RH generalmente no tiene IVA
      fechaPago = row[8];
      pagado = status === 'PAGADO';
    } else if (sheetName === "MATERIALES") {
      // Columnas: Status | Método | No.Factura | Proveedor | Concepto | CostoUnit | Piezas | Sub-Total | IVA | Monto a Pagar | Fecha
      proveedor = row[3] || 'Proveedor Materiales';
      concepto = row[4] || 'Material';
      subtotal = parseFloat(row[7]) || 0;
      iva = parseFloat(row[8]) || 0;
      total = parseFloat(row[9]) || 0;
      fechaPago = row[10];
      pagado = status === 'PAGADO';
    }

    // Validar montos
    if (subtotal === 0 && total === 0) {
      skipped++;
      continue;
    }

    // Si no hay subtotal pero hay total, calcular
    if (subtotal === 0 && total > 0) {
      if (iva > 0) {
        subtotal = total - iva;
      } else {
        subtotal = total / 1.16;
        iva = total - subtotal;
      }
    }

    // Si no hay total, calcularlo
    if (total === 0) {
      total = subtotal + iva;
    }

    // Ignorar conceptos que dicen TOTAL o son líneas vacías
    if (concepto.toString().toUpperCase().includes('TOTAL')) {
      skipped++;
      continue;
    }

    gastos.push({
      evento_id: eventoId,
      company_id: companyId,
      proveedor_id: proveedorId,
      concepto: `${concepto} - ${proveedor}`.substring(0, 500),
      subtotal: Math.round(subtotal * 100) / 100,
      iva: Math.round(iva * 100) / 100,
      total: Math.round(total * 100) / 100,
      pagado: pagado,
      status: pagado ? 'pagado' : 'pendiente',
      categoria_id: categoriaId,
      fecha_gasto: parseExcelDate(fechaPago),
      notas: `Importado desde Excel DOTERRA - Hoja: ${sheetName}`
    });
  }

  console.log(`  ✅ ${gastos.length} gastos válidos encontrados`);
  console.log(`  ⏭️ ${skipped} filas ignoradas (totales, vacías o inválidas)`);

  // Calcular totales para verificación
  const totalSubtotal = gastos.reduce((sum, g) => sum + g.subtotal, 0);
  const totalIva = gastos.reduce((sum, g) => sum + g.iva, 0);
  const totalTotal = gastos.reduce((sum, g) => sum + g.total, 0);
  console.log(`  📊 Subtotal: $${totalSubtotal.toLocaleString('es-MX')}`);
  console.log(`  📊 IVA: $${totalIva.toLocaleString('es-MX')}`);
  console.log(`  📊 Total: $${totalTotal.toLocaleString('es-MX')}`);

  return gastos;
}

async function main() {
  console.log('🚀 Iniciando importación de gastos DOTERRA desde Excel\n');

  // Leer Excel
  const excelPath = 'DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';
  const workbook = XLSX.readFile(excelPath);

  console.log('📂 Hojas disponibles:', workbook.SheetNames);

  // Obtener evento y company
  const { id: eventoId, company_id: companyId } = await getEventoId();
  console.log(`\n🎯 Evento ID: ${eventoId}, Company ID: ${companyId}`);

  // Obtener proveedor genérico
  const proveedorId = await getProveedorGenerico(companyId);
  console.log(`👤 Proveedor genérico ID: ${proveedorId}`);

  // Verificar si ya hay gastos para este evento
  const { data: existingGastos } = await supabase
    .from('evt_gastos_erp')
    .select('id')
    .eq('evento_id', eventoId)
    .is('deleted_at', null);

  if (existingGastos && existingGastos.length > 0) {
    console.log(`\n⚠️ Ya existen ${existingGastos.length} gastos para este evento.`);
    console.log('¿Desea continuar? Los gastos existentes NO serán modificados.');
    // En producción, aquí habría una confirmación
  }

  // Importar cada hoja
  const hojas = [
    { nombre: "SP´S", categoriaId: CATEGORIA_MAP["SP'S"] },
    { nombre: "COMBUSTIBLE  PEAJE", categoriaId: CATEGORIA_MAP["COMBUSTIBLE"] },
    { nombre: "RH", categoriaId: CATEGORIA_MAP["RH"] },
    { nombre: "MATERIALES", categoriaId: CATEGORIA_MAP["MATERIALES"] }
  ];

  let todosLosGastos = [];

  for (const hoja of hojas) {
    const gastos = await importarHoja(
      workbook,
      hoja.nombre,
      hoja.categoriaId,
      eventoId,
      companyId,
      proveedorId
    );
    todosLosGastos = todosLosGastos.concat(gastos);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN TOTAL:');
  console.log('='.repeat(60));
  console.log(`Total gastos a importar: ${todosLosGastos.length}`);

  const grandTotalSubtotal = todosLosGastos.reduce((sum, g) => sum + g.subtotal, 0);
  const grandTotalIva = todosLosGastos.reduce((sum, g) => sum + g.iva, 0);
  const grandTotalTotal = todosLosGastos.reduce((sum, g) => sum + g.total, 0);

  console.log(`\nSistema (calculado):`);
  console.log(`  Subtotal: $${grandTotalSubtotal.toLocaleString('es-MX')}`);
  console.log(`  IVA: $${grandTotalIva.toLocaleString('es-MX')}`);
  console.log(`  Total: $${grandTotalTotal.toLocaleString('es-MX')}`);

  console.log(`\nExcel (esperado):`);
  console.log(`  Subtotal: $1,305,000.32`);
  console.log(`  IVA: $103,460.88`);
  console.log(`  Total: $1,408,461.20`);

  // Insertar en la base de datos
  console.log('\n💾 Insertando gastos en la base de datos...');

  // Insertar en lotes de 50
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < todosLosGastos.length; i += batchSize) {
    const batch = todosLosGastos.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('evt_gastos_erp')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`  ❌ Error en lote ${Math.floor(i/batchSize) + 1}:`, error.message);
      errors += batch.length;
    } else {
      inserted += data.length;
      process.stdout.write(`  ✅ Insertados: ${inserted}/${todosLosGastos.length}\r`);
    }
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log('✅ IMPORTACIÓN COMPLETADA');
  console.log('='.repeat(60));
  console.log(`  Gastos insertados: ${inserted}`);
  console.log(`  Errores: ${errors}`);

  // Verificar totales en la vista
  console.log('\n🔍 Verificando totales en la vista...');
  const { data: eventoActualizado } = await supabase
    .from('vw_eventos_analisis_financiero_erp')
    .select('gastos_totales, gastos_subtotal, gastos_iva')
    .eq('id', eventoId)
    .single();

  if (eventoActualizado) {
    console.log(`  Gastos Subtotal: $${eventoActualizado.gastos_subtotal?.toLocaleString('es-MX')}`);
    console.log(`  Gastos IVA: $${eventoActualizado.gastos_iva?.toLocaleString('es-MX')}`);
    console.log(`  Gastos Total: $${eventoActualizado.gastos_totales?.toLocaleString('es-MX')}`);
  }
}

main().catch(console.error);
