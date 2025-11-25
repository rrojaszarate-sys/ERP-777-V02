#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const { Pool } = pg;

const config = {
  host: process.env.DB_POOLER_TX_HOST,
  port: parseInt(process.env.DB_POOLER_TX_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_POOLER_TX_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
};

const pool = new Pool(config);

async function consultarDatos() {
  const client = await pool.connect();

  try {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  📊 CONSULTA DE DATOS DEL ERP                             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // 1. Resumen de Eventos
    console.log('═══════════════════════════════════════════════════════════');
    console.log('1️⃣  EVENTOS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const eventos = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE activo = true) as activos,
        COUNT(*) FILTER (WHERE activo = false) as inactivos,
        SUM(total) as total_ingresos,
        SUM(total_gastos) as total_gastos_eventos,
        SUM(utilidad) as utilidad_total
      FROM evt_eventos
    `);

    const evt = eventos.rows[0];
    console.log(`   Total de eventos: ${evt.total}`);
    console.log(`   Activos: ${evt.activos} | Inactivos: ${evt.inactivos}`);
    console.log(`   Total ingresos: $${parseFloat(evt.total_ingresos || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   Total gastos: $${parseFloat(evt.total_gastos_eventos || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   Utilidad total: $${parseFloat(evt.utilidad_total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}\n`);

    // Eventos por estado
    const eventosPorEstado = await client.query(`
      SELECT
        e.nombre as estado,
        COUNT(ev.id) as cantidad,
        SUM(ev.total) as total_ventas
      FROM evt_eventos ev
      JOIN evt_estados e ON ev.estado_id = e.id
      GROUP BY e.nombre
      ORDER BY cantidad DESC
    `);

    console.log('   Eventos por estado:');
    eventosPorEstado.rows.forEach(row => {
      console.log(`   - ${row.estado}: ${row.cantidad} eventos ($${parseFloat(row.total_ventas || 0).toLocaleString('es-MX')})`);
    });

    // 2. Gastos
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('2️⃣  GASTOS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const gastos = await client.query(`
      SELECT
        COUNT(*) as total,
        SUM(subtotal) as subtotal_total,
        SUM(iva) as iva_total,
        SUM(total) as total_gastos,
        COUNT(*) FILTER (WHERE status_pago = 'pagado') as pagados,
        COUNT(*) FILTER (WHERE status_pago = 'pendiente') as pendientes
      FROM evt_gastos
    `);

    const g = gastos.rows[0];
    console.log(`   Total de gastos: ${g.total}`);
    console.log(`   Pagados: ${g.pagados} | Pendientes: ${g.pendientes}`);
    console.log(`   Subtotal: $${parseFloat(g.subtotal_total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   IVA: $${parseFloat(g.iva_total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   Total: $${parseFloat(g.total_gastos || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}\n`);

    // Gastos por categoría
    const gastosPorCategoria = await client.query(`
      SELECT
        c.nombre as categoria,
        COUNT(g.id) as cantidad,
        SUM(g.total) as total
      FROM evt_gastos g
      LEFT JOIN evt_categorias_gastos c ON g.categoria_id = c.id
      GROUP BY c.nombre
      ORDER BY total DESC NULLS LAST
      LIMIT 10
    `);

    console.log('   Top 10 categorías de gastos:');
    gastosPorCategoria.rows.forEach(row => {
      console.log(`   - ${row.categoria || 'Sin categoría'}: ${row.cantidad} gastos ($${parseFloat(row.total || 0).toLocaleString('es-MX')})`);
    });

    // 3. Ingresos
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('3️⃣  INGRESOS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const ingresos = await client.query(`
      SELECT
        COUNT(*) as total,
        SUM(subtotal) as subtotal_total,
        SUM(iva) as iva_total,
        SUM(total) as total_ingresos,
        COUNT(*) FILTER (WHERE status_pago = 'cobrado') as cobrados,
        COUNT(*) FILTER (WHERE status_pago = 'pendiente') as pendientes
      FROM evt_ingresos
    `);

    const i = ingresos.rows[0];
    console.log(`   Total de ingresos: ${i.total}`);
    console.log(`   Cobrados: ${i.cobrados} | Pendientes: ${i.pendientes}`);
    console.log(`   Subtotal: $${parseFloat(i.subtotal_total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   IVA: $${parseFloat(i.iva_total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   Total: $${parseFloat(i.total_ingresos || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}\n`);

    // 4. Clientes
    console.log('═══════════════════════════════════════════════════════════');
    console.log('4️⃣  CLIENTES');
    console.log('═══════════════════════════════════════════════════════════\n');

    const clientes = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE activo = true) as activos,
        COUNT(*) FILTER (WHERE tipo_cliente = 'corporativo') as corporativos,
        COUNT(*) FILTER (WHERE tipo_cliente = 'individual') as individuales
      FROM evt_clientes
    `);

    const c = clientes.rows[0];
    console.log(`   Total de clientes: ${c.total}`);
    console.log(`   Activos: ${c.activos}`);
    console.log(`   Corporativos: ${c.corporativos || 0} | Individuales: ${c.individuales || 0}\n`);

    // Top 5 clientes
    const topClientes = await client.query(`
      SELECT
        c.razon_social,
        COUNT(e.id) as eventos,
        SUM(e.total) as total_ventas
      FROM evt_clientes c
      LEFT JOIN evt_eventos e ON c.id = e.cliente_id
      GROUP BY c.id, c.razon_social
      HAVING COUNT(e.id) > 0
      ORDER BY total_ventas DESC
      LIMIT 5
    `);

    console.log('   Top 5 clientes por ventas:');
    topClientes.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.razon_social}: ${row.eventos} eventos ($${parseFloat(row.total_ventas || 0).toLocaleString('es-MX')})`);
    });

    // 5. Cuentas Contables
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('5️⃣  CUENTAS CONTABLES Y BANCARIAS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const cuentasContables = await client.query(`
      SELECT
        tipo,
        COUNT(*) as cantidad,
        COUNT(*) FILTER (WHERE activa = true) as activas
      FROM evt_cuentas_contables
      GROUP BY tipo
      ORDER BY tipo
    `);

    console.log('   Cuentas contables por tipo:');
    cuentasContables.rows.forEach(row => {
      console.log(`   - ${row.tipo}: ${row.cantidad} (${row.activas} activas)`);
    });

    const cuentasBancarias = await client.query(`
      SELECT COUNT(*) as total, SUM(saldo_actual) as saldo_total
      FROM evt_cuentas_bancarias
      WHERE activa = true
    `);

    console.log(`\n   Cuentas bancarias activas: ${cuentasBancarias.rows[0].total}`);
    console.log(`   Saldo total: $${parseFloat(cuentasBancarias.rows[0].saldo_total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`);

    // 6. Documentos OCR
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('6️⃣  DOCUMENTOS OCR');
    console.log('═══════════════════════════════════════════════════════════\n');

    const documentosOCR = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'procesado') as procesados,
        COUNT(*) FILTER (WHERE status = 'pendiente') as pendientes,
        COUNT(*) FILTER (WHERE status = 'error') as errores
      FROM evt_documentos_ocr
    `);

    const ocr = documentosOCR.rows[0];
    console.log(`   Total de documentos: ${ocr.total}`);
    console.log(`   Procesados: ${ocr.procesados} | Pendientes: ${ocr.pendientes} | Errores: ${ocr.errores}\n`);

    // 7. Resumen financiero
    console.log('═══════════════════════════════════════════════════════════');
    console.log('7️⃣  RESUMEN FINANCIERO CONSOLIDADO');
    console.log('═══════════════════════════════════════════════════════════\n');

    const resumenFinanciero = await client.query(`
      SELECT
        (SELECT COALESCE(SUM(total), 0) FROM evt_ingresos) as total_ingresos,
        (SELECT COALESCE(SUM(total), 0) FROM evt_gastos) as total_gastos,
        (SELECT COALESCE(SUM(total), 0) FROM evt_ingresos) -
        (SELECT COALESCE(SUM(total), 0) FROM evt_gastos) as utilidad_neta
    `);

    const rf = resumenFinanciero.rows[0];
    console.log(`   Total Ingresos: $${parseFloat(rf.total_ingresos).toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   Total Gastos:   $${parseFloat(rf.total_gastos).toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
    console.log(`   Utilidad Neta:  $${parseFloat(rf.utilidad_neta).toLocaleString('es-MX', {minimumFractionDigits: 2})}\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ CONSULTA COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error durante la consulta:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

consultarDatos().catch(console.error);
