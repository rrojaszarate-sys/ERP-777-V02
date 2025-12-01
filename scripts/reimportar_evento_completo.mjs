import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const EXCEL_PATH = '/home/rodri/proyectos/ERP-777-V02-pc/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';
const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const EVENTO_ID = 1;

// Mapeo de pestañas a categorías de gastos (evt_categorias_gastos_erp)
const PESTANAS_GASTOS = [
  { nombre: "SP´S", categoriaId: 6, filaInicio: 7, colMonto: 'H', colConcepto: 'E', colProveedor: 'D', colStatus: 'A' },
  { nombre: "COMBUSTIBLE  PEAJE", categoriaId: 9, filaInicio: 7, colMonto: 'H', colConcepto: 'E', colProveedor: 'D', colStatus: 'A' },
  { nombre: "RH", categoriaId: 7, filaInicio: 7, colMonto: 'H', colConcepto: 'E', colProveedor: 'D', colStatus: 'A' },
  { nombre: "MATERIALES", categoriaId: 8, filaInicio: 7, colMonto: 'J', colConcepto: 'E', colProveedor: 'D', colStatus: 'A' }
];

async function borrarDatosEvento() {
  console.log('\n🗑️  BORRANDO DATOS DEL EVENTO 1...\n');

  const { error: e1 } = await supabase.from('evt_gastos_erp').delete().eq('evento_id', EVENTO_ID);
  console.log('   Gastos:', e1 ? 'Error: ' + e1.message : '✅ Eliminados');

  const { error: e2 } = await supabase.from('evt_ingresos_erp').delete().eq('evento_id', EVENTO_ID);
  console.log('   Ingresos:', e2 ? 'Error: ' + e2.message : '✅ Eliminados');

  const { error: e3 } = await supabase.from('evt_provisiones_erp').delete().eq('evento_id', EVENTO_ID);
  console.log('   Provisiones:', e3 ? 'Error: ' + e3.message : '✅ Eliminados');
}

function getCellValue(sheet, col, row) {
  const cell = sheet[col + row];
  return cell ? cell.v : null;
}

async function importarGastos(workbook) {
  console.log('\n💰 IMPORTANDO GASTOS POR CATEGORÍA...\n');

  for (const config of PESTANAS_GASTOS) {
    const sheet = workbook.Sheets[config.nombre];
    if (!sheet) {
      console.log('   ⚠️  Pestaña "' + config.nombre + '" no encontrada');
      continue;
    }

    let insertados = 0;
    let sumaMonto = 0;
    let fila = config.filaInicio;
    let filasSinDatos = 0;

    while (fila < 1200 && filasSinDatos < 10) {
      const monto = getCellValue(sheet, config.colMonto, fila);
      const concepto = getCellValue(sheet, config.colConcepto, fila);
      const proveedor = getCellValue(sheet, config.colProveedor, fila);
      const status = getCellValue(sheet, config.colStatus, fila);

      if (monto === null || monto === undefined) {
        filasSinDatos++;
        fila++;
        continue;
      }

      filasSinDatos = 0;
      const montoNum = parseFloat(monto);
      if (isNaN(montoNum) || montoNum <= 0) {
        fila++;
        continue;
      }

      const conceptoFinal = concepto || proveedor || 'Gasto ' + config.nombre;
      const pagado = status && String(status).toUpperCase().includes('PAGADO');

      const { error } = await supabase
        .from('evt_gastos_erp')
        .insert({
          company_id: COMPANY_ID,
          evento_id: EVENTO_ID,
          categoria_id: config.categoriaId,
          concepto: String(conceptoFinal).substring(0, 200),
          subtotal: montoNum / 1.16,
          iva: montoNum - (montoNum / 1.16),
          total: montoNum,
          pagado: pagado,
          fecha_gasto: new Date().toISOString().split('T')[0],
          fecha_creacion: new Date().toISOString()
        });

      if (!error) {
        insertados++;
        sumaMonto += montoNum;
      }
      fila++;
    }

    console.log('   ' + config.nombre + ': ' + insertados + ' gastos = $' + sumaMonto.toLocaleString() + ' (cat: ' + config.categoriaId + ')');
  }
}

async function importarProvisiones(workbook) {
  console.log('\n📦 IMPORTANDO PROVISIONES...\n');

  const sheet = workbook.Sheets['PROVISIONES'];
  if (!sheet) {
    console.log('   ⚠️  Pestaña "PROVISIONES" no encontrada');
    return;
  }

  let insertados = 0;
  let sumaMonto = 0;
  let fila = 9;
  let filasSinDatos = 0;

  while (fila < 1100 && filasSinDatos < 10) {
    const monto = getCellValue(sheet, 'E', fila);
    const concepto = getCellValue(sheet, 'B', fila);
    const proveedor = getCellValue(sheet, 'A', fila);

    if (monto === null || monto === undefined) {
      filasSinDatos++;
      fila++;
      continue;
    }

    filasSinDatos = 0;
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      fila++;
      continue;
    }

    const conceptoFinal = concepto || proveedor || 'Provisión';

    const { error } = await supabase
      .from('evt_provisiones_erp')
      .insert({
        company_id: COMPANY_ID,
        evento_id: EVENTO_ID,
        categoria_id: 1,
        concepto: String(conceptoFinal).substring(0, 200),
        subtotal: montoNum / 1.16,
        iva: montoNum - (montoNum / 1.16),
        total: montoNum,
        activo: true,
        estado: 'pendiente',
        created_at: new Date().toISOString()
      });

    if (!error) {
      insertados++;
      sumaMonto += montoNum;
    }
    fila++;
  }

  console.log('   Provisiones: ' + insertados + ' = $' + sumaMonto.toLocaleString());
}

async function importarIngresos() {
  console.log('\n💵 IMPORTANDO INGRESOS...\n');

  const ingresos = [
    { concepto: 'CONVENCIÓN DOTERRA 2025 ANTICIPO', total: 1939105.30 },
    { concepto: 'CONVENCIÓN DOTERRA 2025 FINIQUITO', total: 2052301.58 },
    { concepto: 'CONVENCIÓN DOTERRA 2025 FEE', total: 399149.69 }
  ];

  for (const ing of ingresos) {
    const { error } = await supabase
      .from('evt_ingresos_erp')
      .insert({
        company_id: COMPANY_ID,
        evento_id: EVENTO_ID,
        concepto: ing.concepto,
        subtotal: ing.total / 1.16,
        iva: ing.total - (ing.total / 1.16),
        total: ing.total,
        facturado: true,
        cobrado: true,
        fecha_ingreso: new Date().toISOString().split('T')[0],
        fecha_creacion: new Date().toISOString()
      });

    if (!error) {
      console.log('   + ' + ing.concepto + ': $' + ing.total.toLocaleString());
    }
  }
}

async function verificarResultados() {
  console.log('\n📊 VERIFICACIÓN FINAL...\n');

  console.log('   GASTOS POR CATEGORÍA:');
  for (const config of PESTANAS_GASTOS) {
    const { data } = await supabase
      .from('evt_gastos_erp')
      .select('total')
      .eq('evento_id', EVENTO_ID)
      .eq('categoria_id', config.categoriaId);

    const suma = data ? data.reduce((s, g) => s + (g.total || 0), 0) : 0;
    console.log('     ' + config.nombre + ' (' + config.categoriaId + '): ' + (data ? data.length : 0) + ' = $' + suma.toLocaleString());
  }

  const { data: gastos } = await supabase.from('evt_gastos_erp').select('total').eq('evento_id', EVENTO_ID);
  const { data: ingresos } = await supabase.from('evt_ingresos_erp').select('total').eq('evento_id', EVENTO_ID);
  const { data: provisiones } = await supabase.from('evt_provisiones_erp').select('total').eq('evento_id', EVENTO_ID).eq('activo', true);

  const sumaGastos = gastos ? gastos.reduce((s, g) => s + (g.total || 0), 0) : 0;
  const sumaIngresos = ingresos ? ingresos.reduce((s, i) => s + (i.total || 0), 0) : 0;
  const sumaProvisiones = provisiones ? provisiones.reduce((s, p) => s + (p.total || 0), 0) : 0;

  console.log('\n   RESUMEN FINANCIERO:');
  console.log('     Ingresos: $' + sumaIngresos.toLocaleString());
  console.log('     Gastos: $' + sumaGastos.toLocaleString());
  console.log('     Provisiones: $' + sumaProvisiones.toLocaleString());
  console.log('     Utilidad (I-G-P): $' + (sumaIngresos - sumaGastos - sumaProvisiones).toLocaleString());
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('     REIMPORTACIÓN COMPLETA DEL EVENTO DOTERRA 2025');
  console.log('═══════════════════════════════════════════════════════════');

  const workbook = XLSX.readFile(EXCEL_PATH);
  console.log('\n📂 Excel cargado');

  await borrarDatosEvento();
  await importarGastos(workbook);
  await importarProvisiones(workbook);
  await importarIngresos();
  await verificarResultados();

  console.log('\n✅ REIMPORTACIÓN COMPLETADA');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
