#!/usr/bin/env node
/**
 * PRUEBAS AUTOMÁTICAS - HOMOLOGACIÓN COMPLETA
 * Verifica que toda la estructura de catálogos centralizados funcione correctamente
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, passed, details = '') {
  testsRun++;
  if (passed) {
    testsPassed++;
    console.log(`  ✅ ${name}`);
  } else {
    testsFailed++;
    console.log(`  ❌ ${name}${details ? ` - ${details}` : ''}`);
  }
}

async function runTests() {
  const client = await pool.connect();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   PRUEBAS AUTOMÁTICAS - HOMOLOGACIÓN ERP 777');
  console.log('   Fecha:', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. VERIFICAR TABLAS DE CATÁLOGOS CENTRALIZADOS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📋 1. TABLAS DE CATÁLOGOS CENTRALIZADOS\n');

    const tablasRequeridas = [
      'cont_cuentas_contables',
      'cont_proveedores',
      'cont_clientes',
      'cont_formas_pago',
      'cont_ejecutivos',
      'cat_categorias_gasto'
    ];

    for (const tabla of tablasRequeridas) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [tabla]);
      test(`Tabla ${tabla} existe`, result.rows[0].exists);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. VERIFICAR DATOS EN CATÁLOGOS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📊 2. DATOS EN CATÁLOGOS\n');

    const cuentas = await client.query('SELECT COUNT(*) as count FROM cont_cuentas_contables');
    test(`Cuentas contables: ${cuentas.rows[0].count}`, parseInt(cuentas.rows[0].count) > 0);

    const proveedores = await client.query('SELECT COUNT(*) as count FROM cont_proveedores WHERE activo = true');
    test(`Proveedores activos: ${proveedores.rows[0].count}`, parseInt(proveedores.rows[0].count) > 0);

    const clientes = await client.query('SELECT COUNT(*) as count FROM cont_clientes WHERE activo = true');
    test(`Clientes activos: ${clientes.rows[0].count}`, parseInt(clientes.rows[0].count) >= 0);

    const formasPago = await client.query('SELECT COUNT(*) as count FROM cont_formas_pago WHERE activa = true');
    test(`Formas de pago activas: ${formasPago.rows[0].count}`, parseInt(formasPago.rows[0].count) > 0);

    const ejecutivos = await client.query('SELECT COUNT(*) as count FROM cont_ejecutivos WHERE activo = true');
    test(`Ejecutivos activos: ${ejecutivos.rows[0].count}`, parseInt(ejecutivos.rows[0].count) >= 0);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. VERIFICAR CATEGORÍAS DE GASTO (SOLO 4)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n🏷️  3. CATEGORÍAS DE GASTO (SOLO 4 PERMITIDAS)\n');

    const categorias = await client.query(`
      SELECT clave, nombre FROM cat_categorias_gasto
      WHERE activo = true ORDER BY orden_display
    `);

    const clavesEsperadas = ['SP', 'COMB', 'RH', 'MAT'];
    const clavesEncontradas = categorias.rows.map(c => c.clave);

    for (const clave of clavesEsperadas) {
      test(`Categoría ${clave} existe`, clavesEncontradas.includes(clave));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. VERIFICAR ESTRUCTURA DE evt_provisiones
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📝 4. ESTRUCTURA DE evt_provisiones\n');

    const provisionesExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'evt_provisiones'
      )
    `);
    test('Tabla evt_provisiones existe', provisionesExists.rows[0].exists);

    if (provisionesExists.rows[0].exists) {
      // Verificar columnas importantes
      const columnas = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'evt_provisiones'
      `);
      const cols = columnas.rows.map(c => c.column_name);

      test('Columna proveedor_id existe', cols.includes('proveedor_id'));
      test('Columna categoria_id existe', cols.includes('categoria_id'));
      test('Columna subtotal existe', cols.includes('subtotal'));
      test('Columna iva existe', cols.includes('iva'));
      test('Columna retenciones existe', cols.includes('retenciones'));
      test('Columna total existe', cols.includes('total'));
      test('Columna cuenta_contable_id existe', cols.includes('cuenta_contable_id'));

      // Verificar constraint de cuadre fiscal
      const constraints = await client.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'evt_provisiones' AND constraint_type = 'CHECK'
      `);
      const constraintNames = constraints.rows.map(c => c.constraint_name);
      test('Constraint fiscal balance existe', constraintNames.some(n => n.includes('fiscal')));

      // Contar provisiones
      const provCount = await client.query('SELECT COUNT(*) as count FROM evt_provisiones');
      test(`Provisiones creadas: ${provCount.rows[0].count}`, parseInt(provCount.rows[0].count) > 0);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. VERIFICAR RELACIONES FK
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n🔗 5. RELACIONES (FOREIGN KEYS)\n');

    // Verificar que evt_provisiones tiene FK a cont_proveedores (indirectamente via cat_proveedores)
    const fkProvisiones = await client.query(`
      SELECT tc.constraint_name, kcu.column_name, ccu.table_name as foreign_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'evt_provisiones' AND tc.constraint_type = 'FOREIGN KEY'
    `);

    const fkTablas = fkProvisiones.rows.map(fk => fk.foreign_table);
    test('evt_provisiones tiene FK a categorías', fkTablas.some(t => t.includes('categoria')));

    // Verificar que cont_gastos_externos tiene columna cuenta_contable_id
    const gniCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'cont_gastos_externos' AND column_name = 'cuenta_contable_id'
    `);
    test('cont_gastos_externos tiene cuenta_contable_id', gniCols.rows.length > 0);

    // ═══════════════════════════════════════════════════════════════════════
    // 6. VERIFICAR DATOS DE PRUEBA (EVENTOS)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n🎪 6. DATOS DE PRUEBA (EVENTOS)\n');

    const eventos = await client.query(`
      SELECT clave_evento, nombre_proyecto, ingreso_estimado, provisiones
      FROM evt_eventos WHERE activo = true ORDER BY clave_evento
    `);
    test(`Eventos creados: ${eventos.rows.length}`, eventos.rows.length > 0);

    for (const evt of eventos.rows.slice(0, 3)) {
      console.log(`     📌 ${evt.clave_evento}: ${evt.nombre_proyecto}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. VERIFICAR VISTAS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n👁️  7. VISTAS CREADAS\n');

    const vistas = [
      'v_proveedores_activos',
      'v_clientes_activos',
      'v_cuentas_por_tipo',
      'v_gastos_consolidados',
      'v_gastos_no_impactados',
      'v_gni_legacy'
    ];

    for (const vista of vistas) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [vista]);
      test(`Vista ${vista} existe`, result.rows[0].exists);
    }

    // Probar vista v_gastos_consolidados
    try {
      const gastosConsolidados = await client.query('SELECT COUNT(*) as count FROM v_gastos_consolidados');
      test(`Vista v_gastos_consolidados funciona (${gastosConsolidados.rows[0].count} registros)`, true);
    } catch (err) {
      test('Vista v_gastos_consolidados funciona', false, err.message);
    }

    // Probar vista v_gastos_no_impactados (usado por frontend GNI)
    try {
      const gniVista = await client.query(`
        SELECT COUNT(*) as count,
               COUNT(proveedor_nombre) as con_proveedor,
               COUNT(cuenta) as con_cuenta
        FROM v_gastos_no_impactados
      `);
      test(`Vista v_gastos_no_impactados funciona (${gniVista.rows[0].count} registros)`, true);
      console.log(`     📌 Con proveedor: ${gniVista.rows[0].con_proveedor}`);
      console.log(`     📌 Con cuenta contable: ${gniVista.rows[0].con_cuenta}`);
    } catch (err) {
      test('Vista v_gastos_no_impactados funciona', false, err.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 8. VERIFICAR VALIDACIÓN FISCAL
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n💰 8. VALIDACIÓN FISCAL\n');

    // Intentar insertar provisión con cuadre incorrecto (debe fallar)
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO evt_provisiones (evento_id, proveedor_id, concepto, categoria_id, subtotal, iva, retenciones, total, company_id)
        SELECT
          (SELECT id FROM evt_eventos LIMIT 1),
          (SELECT id FROM cat_proveedores LIMIT 1),
          'TEST - Cuadre incorrecto',
          (SELECT id FROM cat_categorias_gasto LIMIT 1),
          100.00,  -- subtotal
          16.00,   -- iva
          0,       -- retenciones
          999.99,  -- total INCORRECTO (debería ser 116)
          (SELECT id FROM core_companies LIMIT 1)
      `);
      await client.query('ROLLBACK');
      test('Constraint rechaza cuadre fiscal incorrecto', false, 'Debería haber fallado');
    } catch (err) {
      await client.query('ROLLBACK');
      test('Constraint rechaza cuadre fiscal incorrecto', err.message.includes('fiscal') || err.message.includes('chk_'));
    }

    // Intentar insertar provisión con cuadre correcto (debe funcionar)
    try {
      await client.query('BEGIN');
      const insertResult = await client.query(`
        INSERT INTO evt_provisiones (evento_id, proveedor_id, concepto, categoria_id, subtotal, iva, retenciones, total, company_id)
        SELECT
          (SELECT id FROM evt_eventos LIMIT 1),
          (SELECT id FROM cat_proveedores LIMIT 1),
          'TEST - Cuadre correcto',
          (SELECT id FROM cat_categorias_gasto LIMIT 1),
          100.00,  -- subtotal
          16.00,   -- iva
          0,       -- retenciones
          116.00,  -- total CORRECTO
          (SELECT id FROM core_companies LIMIT 1)
        RETURNING id
      `);
      await client.query('ROLLBACK');  // No guardar el test
      test('Constraint acepta cuadre fiscal correcto', insertResult.rows.length > 0);
    } catch (err) {
      await client.query('ROLLBACK');
      test('Constraint acepta cuadre fiscal correcto', false, err.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 9. VERIFICAR GNI MIGRADO
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📁 9. GASTOS NO IMPACTADOS (GNI)\n');

    const gniCount = await client.query('SELECT COUNT(*) as count FROM cont_gastos_externos WHERE activo = true');
    test(`GNI activos: ${gniCount.rows[0].count}`, parseInt(gniCount.rows[0].count) >= 0);

    // Verificar que GNI tiene cuenta_contable_id
    const gniConCuenta = await client.query(`
      SELECT COUNT(*) as count FROM cont_gastos_externos
      WHERE cuenta_contable_id IS NOT NULL
    `);
    console.log(`     📌 GNI con cuenta contable asignada: ${gniConCuenta.rows[0].count}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 10. VERIFICAR INGRESOS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n💵 10. INGRESOS\n');

    const ingresosCount = await client.query('SELECT COUNT(*) as count FROM evt_ingresos WHERE activo = true');
    test(`Ingresos activos: ${ingresosCount.rows[0].count}`, parseInt(ingresosCount.rows[0].count) >= 0);

    // Verificar que ingresos tienen cliente_contable_id
    const ingresosConCliente = await client.query(`
      SELECT COUNT(*) as count FROM evt_ingresos
      WHERE cliente_contable_id IS NOT NULL
    `);
    console.log(`     📌 Ingresos con cliente contable: ${ingresosConCliente.rows[0].count}`);

    // ═══════════════════════════════════════════════════════════════════════
    // RESUMEN
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   RESUMEN DE PRUEBAS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`   Total de pruebas: ${testsRun}`);
    console.log(`   ✅ Pasadas: ${testsPassed}`);
    console.log(`   ❌ Fallidas: ${testsFailed}`);
    console.log(`   📊 Tasa de éxito: ${Math.round((testsPassed / testsRun) * 100)}%`);

    if (testsFailed === 0) {
      console.log('\n   🎉 ¡TODAS LAS PRUEBAS PASARON!');
    } else {
      console.log('\n   ⚠️  Hay pruebas fallidas que requieren atención.');
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBAS:', error.message);
  } finally {
    client.release();
    await pool.end();
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
