#!/usr/bin/env node
/**
 * SCRIPT: CARGAR GASTOS GNI DESDE EXCEL
 * Importa todos los gastos de las hojas mensuales del archivo Excel GNI 2025
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

// Mapeo de meses a períodos
const MESES_PERIODO = {
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
  'NOV25': '2025-11',
  'DIC25': '2025-12'
};

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function parseExcelDate(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    // Excel serial date
    const excelEpoch = new Date(1899, 11, 30);
    const fecha = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return fecha.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    const fecha = new Date(value);
    if (!isNaN(fecha.getTime())) {
      return fecha.toISOString().split('T')[0];
    }
  }
  return null;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value).replace(/[,$]/g, ''));
  return isNaN(num) ? 0 : num;
}

function normalizeValidacion(value) {
  if (!value) return 'pendiente';
  const v = String(value).toLowerCase().trim();
  if (v.includes('correct') || v === 'ok' || v === 'si') return 'correcto';
  if (v.includes('revis')) return 'revisar';
  return 'pendiente';
}

function normalizeStatus(value) {
  if (!value) return 'pendiente';
  const v = String(value).toLowerCase().trim();
  if (v.includes('pag') || v === 'si') return 'pagado';
  return 'pendiente';
}

// ============================================================================
// CARGAR CATÁLOGOS
// ============================================================================

async function cargarCatalogos() {
  const catalogos = {
    claves: new Map(),
    formasPago: new Map(),
    proveedores: new Map(),
    ejecutivos: new Map()
  };

  // Claves de gasto
  const { rows: claves } = await client.query(
    `SELECT id, clave FROM cont_claves_gasto WHERE company_id = $1`,
    [COMPANY_ID]
  );
  claves.forEach(c => catalogos.claves.set(c.clave, c.id));

  // Formas de pago
  const { rows: formas } = await client.query(
    `SELECT id, nombre FROM cont_formas_pago WHERE company_id = $1`,
    [COMPANY_ID]
  );
  formas.forEach(f => catalogos.formasPago.set(f.nombre.toUpperCase(), f.id));

  // Proveedores
  const { rows: provs } = await client.query(
    `SELECT id, razon_social FROM cont_proveedores WHERE company_id = $1`,
    [COMPANY_ID]
  );
  provs.forEach(p => catalogos.proveedores.set(p.razon_social.toUpperCase(), p.id));

  // Ejecutivos
  const { rows: ejs } = await client.query(
    `SELECT id, nombre FROM cont_ejecutivos WHERE company_id = $1`,
    [COMPANY_ID]
  );
  ejs.forEach(e => catalogos.ejecutivos.set(e.nombre.toUpperCase(), e.id));

  return catalogos;
}

// ============================================================================
// BUSCAR O CREAR PROVEEDOR/EJECUTIVO
// ============================================================================

async function findOrCreateProveedor(nombre, catalogos) {
  if (!nombre) return null;
  const key = nombre.toUpperCase();

  if (catalogos.proveedores.has(key)) {
    return catalogos.proveedores.get(key);
  }

  // Buscar similar
  for (const [existente, id] of catalogos.proveedores) {
    if (existente.includes(key) || key.includes(existente)) {
      return id;
    }
  }

  // Crear nuevo
  const { rows } = await client.query(
    `INSERT INTO cont_proveedores (company_id, razon_social, modulo_origen, activo)
     VALUES ($1, $2, 'contabilidad', true) RETURNING id`,
    [COMPANY_ID, nombre]
  );

  catalogos.proveedores.set(key, rows[0].id);
  return rows[0].id;
}

function findEjecutivo(nombre, catalogos) {
  if (!nombre) return null;
  const key = nombre.toUpperCase().trim();

  // Buscar exacto
  if (catalogos.ejecutivos.has(key)) {
    return catalogos.ejecutivos.get(key);
  }

  // Buscar por nombre parcial
  for (const [existente, id] of catalogos.ejecutivos) {
    const nombreCorto = key.split(' ')[0];
    if (existente.includes(nombreCorto) || nombreCorto.length > 3 && existente.startsWith(nombreCorto)) {
      return id;
    }
  }

  return null;
}

// ============================================================================
// PROCESAR HOJA MENSUAL
// ============================================================================

function getRowValue(row, key) {
  // Buscar la clave con y sin espacios
  if (row[key] !== undefined) return row[key];
  if (row[` ${key} `] !== undefined) return row[` ${key} `];
  if (row[`${key} `] !== undefined) return row[`${key} `];
  if (row[` ${key}`] !== undefined) return row[` ${key}`];
  // Buscar con acento
  const keyNorm = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const k of Object.keys(row)) {
    const kNorm = k.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (kNorm.toUpperCase() === keyNorm.toUpperCase()) return row[k];
  }
  return '';
}

async function procesarHoja(workbook, hoja, periodo, catalogos, stats) {
  const sheet = workbook.Sheets[hoja];
  if (!sheet) return;

  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`\n📅 Procesando ${hoja} (${periodo}): ${data.length} filas`);

  let importados = 0;
  let errores = 0;
  let totalPeriodo = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // Extraer valores con la función helper
    const proveedor = getRowValue(row, 'PROVEEDOR');
    const concepto = getRowValue(row, 'CONCEPTO');
    const total = parseNumber(getRowValue(row, 'TOTAL'));

    // Saltar filas vacías o totales
    if (!proveedor && !concepto) continue;
    if (String(concepto || '').toLowerCase().includes('total')) continue;
    if (total === 0) continue;

    try {
      // Extraer todos los valores
      const clave = getRowValue(row, 'CLAVE');
      const formaPago = getRowValue(row, 'FORMA DE PAGO');
      const ejecutivo = getRowValue(row, 'EJECUTIVO');
      const subtotal = parseNumber(getRowValue(row, 'SUBTOTAL'));
      const iva = parseNumber(getRowValue(row, 'IVA'));
      const validacion = getRowValue(row, 'VALIDACION');
      const status = getRowValue(row, 'STATUS');
      const fecha = getRowValue(row, 'FECHA');
      const factura = getRowValue(row, 'FACTURA');

      // Buscar referencias
      const proveedorId = await findOrCreateProveedor(proveedor, catalogos);
      const claveId = clave ? catalogos.claves.get(clave) || null : null;
      const formaPagoId = formaPago
        ? catalogos.formasPago.get(String(formaPago).toUpperCase()) || null
        : null;
      const ejecutivoId = findEjecutivo(ejecutivo, catalogos);

      // Fecha
      const fechaGasto = parseExcelDate(fecha) || `${periodo}-15`;

      // Insertar
      await client.query(`
        INSERT INTO cont_gastos_externos (
          company_id, tipo, concepto, subtotal, iva, total,
          clave_gasto_id, proveedor_id, forma_pago_id, ejecutivo_id,
          periodo, fecha_gasto, validacion, status_pago, pagado,
          folio_factura, proveedor, cuenta_id, activo, importado_de
        ) VALUES (
          $1, 'gasto_operativo', $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, 1, true, 'excel_gni'
        )
      `, [
        COMPANY_ID,
        concepto || 'Sin concepto',
        subtotal,
        iva,
        total,
        claveId,
        proveedorId,
        formaPagoId,
        ejecutivoId,
        periodo,
        fechaGasto,
        normalizeValidacion(validacion),
        normalizeStatus(status),
        normalizeStatus(status) === 'pagado',
        factura || null,
        proveedor || null
      ]);

      importados++;
      totalPeriodo += total;
    } catch (error) {
      errores++;
      if (errores <= 3) {
        console.error(`   ❌ Fila ${i + 2}: ${error.message}`);
      }
    }
  }

  stats.importados += importados;
  stats.errores += errores;
  stats.totalGeneral += totalPeriodo;
  stats.porMes.push({ mes: hoja, periodo, registros: importados, total: totalPeriodo });

  console.log(`   ✅ Importados: ${importados}, Errores: ${errores}, Total: $${totalPeriodo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('      CARGA DE GASTOS GNI DESDE EXCEL');
  console.log('═══════════════════════════════════════════════════════════════\n');

  await client.connect();
  console.log('✅ Conectado a la base de datos\n');

  // Verificar si ya hay gastos
  const { rows: existentes } = await client.query(
    `SELECT COUNT(*) as total FROM cont_gastos_externos WHERE company_id = $1`,
    [COMPANY_ID]
  );

  if (parseInt(existentes[0].total) > 0) {
    console.log(`⚠️  Ya existen ${existentes[0].total} gastos en la BD`);
    console.log('   Para reimportar, primero elimine los existentes:');
    console.log('   DELETE FROM cont_gastos_externos WHERE importado_de = \'excel_gni\'\n');

    // Preguntar si continuar (esto solo funciona en modo interactivo)
    // Por ahora, limpiar automáticamente
    console.log('   Limpiando gastos anteriores importados de Excel...');
    await client.query(
      `DELETE FROM cont_gastos_externos WHERE company_id = $1 AND importado_de = 'excel_gni'`,
      [COMPANY_ID]
    );
    console.log('   ✅ Limpiado\n');
  }

  // Leer Excel
  console.log(`📁 Leyendo archivo: ${EXCEL_PATH}`);
  const workbook = XLSX.readFile(EXCEL_PATH);
  console.log(`   Hojas: ${workbook.SheetNames.join(', ')}\n`);

  // Cargar catálogos
  console.log('📋 Cargando catálogos...');
  const catalogos = await cargarCatalogos();
  console.log(`   Claves: ${catalogos.claves.size}`);
  console.log(`   Formas de pago: ${catalogos.formasPago.size}`);
  console.log(`   Proveedores: ${catalogos.proveedores.size}`);
  console.log(`   Ejecutivos: ${catalogos.ejecutivos.size}`);

  // Estadísticas
  const stats = {
    importados: 0,
    errores: 0,
    totalGeneral: 0,
    porMes: []
  };

  // Procesar cada mes
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    IMPORTANDO GASTOS');
  console.log('═══════════════════════════════════════════════════════════════');

  for (const [hoja, periodo] of Object.entries(MESES_PERIODO)) {
    if (workbook.SheetNames.includes(hoja)) {
      await procesarHoja(workbook, hoja, periodo, catalogos, stats);
    }
  }

  // Resumen
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    RESUMEN DE IMPORTACIÓN');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📊 Por mes:');
  stats.porMes.forEach(m => {
    console.log(`   ${m.mes}: ${m.registros} registros, $${m.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
  });

  console.log(`\n📈 TOTALES:`);
  console.log(`   Registros importados: ${stats.importados}`);
  console.log(`   Errores: ${stats.errores}`);
  console.log(`   Total general: $${stats.totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);

  // Verificar contra BD
  const { rows: verificacion } = await client.query(`
    SELECT
      periodo,
      COUNT(*) as registros,
      SUM(total) as total
    FROM cont_gastos_externos
    WHERE company_id = $1 AND importado_de = 'excel_gni'
    GROUP BY periodo
    ORDER BY periodo
  `, [COMPANY_ID]);

  console.log('\n📋 Verificación en BD:');
  let totalBD = 0;
  verificacion.forEach(v => {
    const total = parseFloat(v.total);
    totalBD += total;
    console.log(`   ${v.periodo}: ${v.registros} registros, $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
  });
  console.log(`   TOTAL BD: $${totalBD.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ Proceso completado');
  console.log('═══════════════════════════════════════════════════════════════\n');

  await client.end();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
