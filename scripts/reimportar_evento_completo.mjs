import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const EXCEL_PATH = '/home/rodrichrz/ERP-777-V03/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';
const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const EVENTO_ID = 32;

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

      // Debug para las primeras 5 filas de cada hoja
      if (fila < config.filaInicio + 5) {
        console.log(`     [DEBUG] ${config.nombre} Fila ${fila}: Monto(${config.colMonto})=${monto}, Concepto(${config.colConcepto})=${concepto}`);
      }

      const proveedor = getCellValue(sheet, config.colProveedor, fila);
      const status = getCellValue(sheet, config.colStatus, fila);

      if (monto === null || monto === undefined) {
        filasSinDatos++;
        fila++;
        continue;
      }

      filasSinDatos = 0;
      const montoNum = parseFloat(monto);
      // Permitir montos negativos (devoluciones/retornos) pero excluir ceros
      if (isNaN(montoNum) || montoNum === 0) {
        fila++;
        continue;
      }

      const conceptoFinal = concepto || proveedor || 'Gasto ' + config.nombre;

      // 🚫 EXCLUIR FILAS DE TOTALES
      // Solo excluir si:
      // 1. El concepto está vacío (fila de suma automática)
      // 2. O explícitamente dice "TOTAL DE" o "SUMA DE" (no "PAGO TOTAL" que es un concepto válido)
      const conceptoUpper = String(concepto || '').toUpperCase().trim();
      const proveedorUpper = String(proveedor || '').toUpperCase().trim();

      const esFilaTotal = (
        // Fila sin concepto con valor = probablemente es una suma
        (conceptoUpper === '' && proveedorUpper === '') ||
        // Fila que explícitamente es un total de sección
        conceptoUpper.startsWith('TOTAL DE') ||
        conceptoUpper.startsWith('SUMA DE') ||
        conceptoUpper === 'TOTAL' ||
        proveedorUpper.startsWith('TOTAL DE') ||
        proveedorUpper === 'TOTAL'
      );

      if (esFilaTotal) {
        console.log(`   🔸 Saltando fila de TOTALES (${config.nombre} fila ${fila}): ${conceptoFinal} - $${montoNum}`);
        fila++;
        continue;
      }

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
      } else {
        console.log(`     [ERROR] Falló inserción fila ${fila}:`, error.message);
      }
      fila++;
    }

    console.log('   ' + config.nombre + ': ' + insertados + ' gastos = $' + sumaMonto.toLocaleString() + ' (cat: ' + config.categoriaId + ')');
  }
}

// Cache de proveedores
const proveedoresCache = new Map();

async function obtenerOCrearProveedor(nombreProveedor) {
  if (!nombreProveedor) return 47; // ID por defecto

  const nombre = String(nombreProveedor).trim().toUpperCase();
  if (proveedoresCache.has(nombre)) {
    return proveedoresCache.get(nombre);
  }

  // Buscar proveedor existente
  const { data: existente } = await supabase
    .from('cat_proveedores')
    .select('id')
    .ilike('razon_social', nombre)
    .limit(1);

  if (existente && existente[0]) {
    proveedoresCache.set(nombre, existente[0].id);
    return existente[0].id;
  }

  // Crear nuevo proveedor
  const { data: nuevo, error } = await supabase
    .from('cat_proveedores')
    .insert({
      razon_social: nombre,
      nombre_comercial: nombre,
      rfc: 'XAXX010101000',
      activo: true
    })
    .select('id');

  if (nuevo && nuevo[0]) {
    proveedoresCache.set(nombre, nuevo[0].id);
    return nuevo[0].id;
  }

  return 47; // ID por defecto si falla
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

    // 🚫 EXCLUIR FILAS DE TOTALES
    // Solo excluir si el concepto explícitamente es un TOTAL DE sección
    const conceptoUpper = String(concepto || '').toUpperCase().trim();
    const proveedorUpper = String(proveedor || '').toUpperCase().trim();

    const esFilaTotal = (
      (conceptoUpper === '' && proveedorUpper === '') ||
      conceptoUpper.startsWith('TOTAL DE') ||
      conceptoUpper === 'TOTAL DE PROVISIONES' ||
      conceptoUpper === 'TOTAL' ||
      proveedorUpper.startsWith('TOTAL DE') ||
      proveedorUpper === 'TOTAL'
    );

    if (esFilaTotal) {
      console.log(`   🔸 Saltando fila de TOTALES (Provisiones fila ${fila}): ${conceptoFinal} - $${montoNum}`);
      fila++;
      continue;
    }

    const proveedorId = await obtenerOCrearProveedor(proveedor);
    const subtotal = montoNum / 1.16;
    const iva = montoNum - subtotal;

    const { error } = await supabase
      .from('evt_provisiones_erp')
      .insert({
        company_id: COMPANY_ID,
        evento_id: EVENTO_ID,
        proveedor_id: proveedorId,
        categoria_id: 1,
        concepto: String(conceptoFinal).substring(0, 200),
        subtotal: subtotal,
        iva: iva,
        iva_porcentaje: 16,
        total: montoNum,
        activo: true,
        estado: 'pendiente',
        created_at: new Date().toISOString()
      });

    if (!error) {
      insertados++;
      sumaMonto += montoNum;
    } else {
      console.log('   Error fila ' + fila + ':', error.message);
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
  console.log('   Hojas detectadas:', workbook.SheetNames);

  await borrarDatosEvento();
  await importarGastos(workbook);
  await importarProvisiones(workbook);
  await importarIngresos();
  await verificarResultados();

  console.log('\n✅ REIMPORTACIÓN COMPLETADA');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
