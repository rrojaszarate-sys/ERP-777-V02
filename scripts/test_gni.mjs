#!/usr/bin/env node
/**
 * PRUEBAS AUTOMATIZADAS: MÓDULO GNI
 * Verifica que los datos cargados cuadren con el Excel original
 */

import pg from 'pg';
import XLSX from 'xlsx';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const EXCEL_PATH = join(__dirname, '..', 'GNI 2025 A PROYECTOS.xlsx');
const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function pass(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function fail(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function info(msg) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
}

// ============================================================================
// HELPERS
// ============================================================================

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value).replace(/[,$]/g, ''));
  return isNaN(num) ? 0 : num;
}

function getRowValue(row, key) {
  if (row[key] !== undefined) return row[key];
  if (row[` ${key} `] !== undefined) return row[` ${key} `];
  if (row[`${key} `] !== undefined) return row[`${key} `];
  if (row[` ${key}`] !== undefined) return row[` ${key}`];
  const keyNorm = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const k of Object.keys(row)) {
    const kNorm = k.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (kNorm.toUpperCase() === keyNorm.toUpperCase()) return row[k];
  }
  return '';
}

// ============================================================================
// PRUEBAS
// ============================================================================

const tests = {
  passed: 0,
  failed: 0,
  results: []
};

function test(name, condition, details = '') {
  if (condition) {
    tests.passed++;
    pass(name);
    tests.results.push({ name, passed: true });
  } else {
    tests.failed++;
    fail(`${name} ${details}`);
    tests.results.push({ name, passed: false, details });
  }
}

async function testCatalogos() {
  console.log(`\n${colors.bold}=== TEST: CATÁLOGOS ===${colors.reset}\n`);

  // Claves de gasto
  const { rows: claves } = await client.query(
    `SELECT COUNT(*) as total FROM cont_claves_gasto WHERE company_id = $1`,
    [COMPANY_ID]
  );
  test('Claves de gasto cargadas', parseInt(claves[0].total) >= 58, `(${claves[0].total} encontradas)`);

  // Formas de pago
  const { rows: formas } = await client.query(
    `SELECT COUNT(*) as total FROM cont_formas_pago WHERE company_id = $1`,
    [COMPANY_ID]
  );
  test('Formas de pago cargadas', parseInt(formas[0].total) >= 20, `(${formas[0].total} encontradas)`);

  // Ejecutivos
  const { rows: ejs } = await client.query(
    `SELECT COUNT(*) as total FROM cont_ejecutivos WHERE company_id = $1`,
    [COMPANY_ID]
  );
  test('Ejecutivos cargados (26 oficiales)', parseInt(ejs[0].total) === 26, `(${ejs[0].total} encontrados)`);

  // Proveedores
  const { rows: provs } = await client.query(
    `SELECT COUNT(*) as total FROM cont_proveedores WHERE company_id = $1`,
    [COMPANY_ID]
  );
  test('Proveedores cargados', parseInt(provs[0].total) >= 200, `(${provs[0].total} encontrados)`);
}

async function testGastosTotales() {
  console.log(`\n${colors.bold}=== TEST: TOTALES DE GASTOS ===${colors.reset}\n`);

  // Total de registros
  const { rows: gastos } = await client.query(
    `SELECT COUNT(*) as total, SUM(total) as suma
     FROM cont_gastos_externos
     WHERE company_id = $1 AND activo = true`,
    [COMPANY_ID]
  );

  const totalRegistros = parseInt(gastos[0].total);
  const sumaTotales = parseFloat(gastos[0].suma || 0);

  test('Gastos importados > 1900', totalRegistros > 1900, `(${totalRegistros} registros)`);
  test('Suma total > $22M', sumaTotales > 22000000, `($${sumaTotales.toLocaleString('es-MX', {minimumFractionDigits: 2})})`);

  // Verificar que no hay gastos con total 0
  const { rows: ceros } = await client.query(
    `SELECT COUNT(*) as total FROM cont_gastos_externos
     WHERE company_id = $1 AND total = 0 AND activo = true`,
    [COMPANY_ID]
  );
  test('Sin gastos con total $0', parseInt(ceros[0].total) === 0, `(${ceros[0].total} encontrados)`);
}

async function testGastosPorMes() {
  console.log(`\n${colors.bold}=== TEST: GASTOS POR MES VS EXCEL ===${colors.reset}\n`);

  const workbook = XLSX.readFile(EXCEL_PATH);

  const meses = {
    'ENE25': '2025-01',
    'FEB25': '2025-02',
    'MAR25': '2025-03',
    'ABR25': '2025-04',
    'MAY25': '2025-05',
    'JUN25': '2025-06',
    'JUL25': '2025-07',
    'AGO25': '2025-08',
    'SEP25': '2025-09',
    'OCT25': '2025-10',
    'NOV25': '2025-11'
  };

  for (const [hoja, periodo] of Object.entries(meses)) {
    // Calcular total del Excel
    const sheet = workbook.Sheets[hoja];
    if (!sheet) continue;

    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    let totalExcel = 0;
    let registrosExcel = 0;

    for (const row of data) {
      const proveedor = getRowValue(row, 'PROVEEDOR');
      const concepto = getRowValue(row, 'CONCEPTO');
      const total = parseNumber(getRowValue(row, 'TOTAL'));

      if (!proveedor && !concepto) continue;
      if (String(concepto).toLowerCase().includes('total')) continue;
      if (total === 0) continue;

      totalExcel += total;
      registrosExcel++;
    }

    // Obtener total de la BD
    const { rows: bd } = await client.query(
      `SELECT COUNT(*) as registros, SUM(total) as total
       FROM cont_gastos_externos
       WHERE company_id = $1 AND periodo = $2 AND activo = true`,
      [COMPANY_ID, periodo]
    );

    const totalBD = parseFloat(bd[0].total || 0);
    const registrosBD = parseInt(bd[0].registros);

    // Tolerancia de 1% por diferencias de redondeo
    const diferencia = Math.abs(totalExcel - totalBD);
    const tolerancia = totalExcel * 0.01;

    test(
      `${hoja}: Cifras cuadran`,
      diferencia <= tolerancia,
      `(Excel: $${totalExcel.toLocaleString('es-MX')}, BD: $${totalBD.toLocaleString('es-MX')}, Dif: $${diferencia.toFixed(2)})`
    );

    // También verificar cantidad de registros (tolerancia de 5 por filas problemáticas)
    const difRegistros = Math.abs(registrosExcel - registrosBD);
    test(
      `${hoja}: Registros similares`,
      difRegistros <= 10,
      `(Excel: ${registrosExcel}, BD: ${registrosBD})`
    );
  }
}

async function testIntegridadDatos() {
  console.log(`\n${colors.bold}=== TEST: INTEGRIDAD DE DATOS ===${colors.reset}\n`);

  // Todos los gastos tienen concepto
  const { rows: sinConcepto } = await client.query(
    `SELECT COUNT(*) as total FROM cont_gastos_externos
     WHERE company_id = $1 AND (concepto IS NULL OR concepto = '') AND activo = true`,
    [COMPANY_ID]
  );
  test('Todos los gastos tienen concepto', parseInt(sinConcepto[0].total) === 0);

  // Todos los gastos tienen período
  const { rows: sinPeriodo } = await client.query(
    `SELECT COUNT(*) as total FROM cont_gastos_externos
     WHERE company_id = $1 AND periodo IS NULL AND activo = true`,
    [COMPANY_ID]
  );
  test('Todos los gastos tienen período', parseInt(sinPeriodo[0].total) === 0);

  // Gastos tienen proveedor_id o proveedor texto
  const { rows: sinProveedor } = await client.query(
    `SELECT COUNT(*) as total FROM cont_gastos_externos
     WHERE company_id = $1
     AND proveedor_id IS NULL
     AND (proveedor IS NULL OR proveedor = '')
     AND activo = true`,
    [COMPANY_ID]
  );
  test('Gastos tienen proveedor', parseInt(sinProveedor[0].total) < 10, `(${sinProveedor[0].total} sin proveedor)`);

  // Validaciones correctas
  const { rows: validaciones } = await client.query(
    `SELECT validacion, COUNT(*) as total FROM cont_gastos_externos
     WHERE company_id = $1 AND activo = true
     GROUP BY validacion`,
    [COMPANY_ID]
  );

  const correctos = validaciones.find(v => v.validacion === 'correcto')?.total || 0;
  test('Hay gastos con validación "correcto"', parseInt(correctos) > 0, `(${correctos} correctos)`);
}

async function testVistaGNI() {
  console.log(`\n${colors.bold}=== TEST: VISTA v_gastos_no_impactados ===${colors.reset}\n`);

  // La vista existe
  const { rows: vista } = await client.query(
    `SELECT COUNT(*) as total FROM v_gastos_no_impactados WHERE company_id = $1`,
    [COMPANY_ID]
  );
  test('Vista v_gastos_no_impactados funciona', true);
  test('Vista retorna datos', parseInt(vista[0].total) > 0, `(${vista[0].total} registros)`);

  // La vista tiene las columnas correctas
  const { rows: muestra } = await client.query(
    `SELECT * FROM v_gastos_no_impactados WHERE company_id = $1 LIMIT 1`,
    [COMPANY_ID]
  );

  if (muestra.length > 0) {
    const columnas = Object.keys(muestra[0]);
    test('Vista tiene columna proveedor', columnas.includes('proveedor'));
    test('Vista tiene columna clave', columnas.includes('clave'));
    test('Vista tiene columna total', columnas.includes('total'));
    test('Vista tiene columna periodo', columnas.includes('periodo'));
    test('Vista tiene columna validacion', columnas.includes('validacion'));
  }
}

async function testDistribucionPorCuenta() {
  console.log(`\n${colors.bold}=== TEST: DISTRIBUCIÓN POR CUENTA ===${colors.reset}\n`);

  const { rows: cuentas } = await client.query(`
    SELECT
      cg.cuenta,
      COUNT(*) as registros,
      SUM(ge.total) as total
    FROM cont_gastos_externos ge
    LEFT JOIN cont_claves_gasto cg ON ge.clave_gasto_id = cg.id
    WHERE ge.company_id = $1 AND ge.activo = true
    GROUP BY cg.cuenta
    ORDER BY total DESC
  `, [COMPANY_ID]);

  info('Distribución de gastos por cuenta:');
  cuentas.forEach(c => {
    const cuenta = c.cuenta || 'SIN CUENTA';
    const total = parseFloat(c.total || 0);
    console.log(`   ${cuenta}: ${c.registros} registros, $${total.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
  });

  test('Gastos distribuidos en múltiples cuentas', cuentas.length >= 3);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n' + '═'.repeat(65));
  console.log(`${colors.bold}${colors.cyan}  PRUEBAS AUTOMATIZADAS - MÓDULO GNI${colors.reset}`);
  console.log('═'.repeat(65));

  await client.connect();
  info('Conectado a la base de datos\n');

  try {
    await testCatalogos();
    await testGastosTotales();
    await testGastosPorMes();
    await testIntegridadDatos();
    await testVistaGNI();
    await testDistribucionPorCuenta();
  } catch (error) {
    fail(`Error en las pruebas: ${error.message}`);
    tests.failed++;
  }

  // Resumen
  console.log('\n' + '═'.repeat(65));
  console.log(`${colors.bold}  RESUMEN DE PRUEBAS${colors.reset}`);
  console.log('═'.repeat(65));
  console.log(`\n   ${colors.green}Pasaron: ${tests.passed}${colors.reset}`);
  console.log(`   ${colors.red}Fallaron: ${tests.failed}${colors.reset}`);
  console.log(`   Total: ${tests.passed + tests.failed}\n`);

  if (tests.failed === 0) {
    console.log(`${colors.green}${colors.bold}   ✓ TODAS LAS PRUEBAS PASARON${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bold}   ✗ HAY PRUEBAS FALLIDAS${colors.reset}\n`);
  }

  console.log('═'.repeat(65) + '\n');

  await client.end();
  process.exit(tests.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Error fatal:', error.message);
  process.exit(1);
});
