#!/usr/bin/env node
/**
 * SCRIPT: Corregir relaciones de proveedores y ejecutivos en GNI
 * Los proveedor_id apuntan a la tabla vieja, hay que mapearlos a la nueva
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

async function main() {
  const client = await pool.connect();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   DIAGNÓSTICO Y CORRECCIÓN DE RELACIONES GNI');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // 1. Diagnóstico inicial
    console.log('📊 1. DIAGNÓSTICO INICIAL\n');

    const diagnostico = await client.query(`
      SELECT
        COUNT(*) as total_gni,
        COUNT(g.proveedor_id) as con_proveedor_id,
        COUNT(p.id) as con_proveedor_valido,
        COUNT(g.ejecutivo_id) as con_ejecutivo_id,
        COUNT(e.id) as con_ejecutivo_valido
      FROM cont_gastos_externos g
      LEFT JOIN cont_proveedores p ON g.proveedor_id = p.id
      LEFT JOIN cont_ejecutivos e ON g.ejecutivo_id = e.id
      WHERE g.activo = true
    `);

    const d = diagnostico.rows[0];
    console.log(`   Total GNI activos: ${d.total_gni}`);
    console.log(`   Con proveedor_id: ${d.con_proveedor_id}`);
    console.log(`   Con proveedor válido: ${d.con_proveedor_valido}`);
    console.log(`   Con ejecutivo_id: ${d.con_ejecutivo_id}`);
    console.log(`   Con ejecutivo válido: ${d.con_ejecutivo_valido}`);

    // 2. Verificar si existe tabla vieja de proveedores
    console.log('\n📋 2. VERIFICAR TABLAS VIEJAS\n');

    const tablasViejas = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name IN ('cont_proveedores_old', 'cont_ejecutivos_old')
      ORDER BY table_name
    `);

    console.log('   Tablas _old encontradas:', tablasViejas.rows.map(t => t.table_name).join(', ') || 'ninguna');

    // 3. Si hay tabla vieja, mapear proveedores
    if (tablasViejas.rows.some(t => t.table_name === 'cont_proveedores_old')) {
      console.log('\n🔄 3. MAPEANDO PROVEEDORES DESDE TABLA VIEJA\n');

      // Mapear por razon_social o nombre
      const mapeoResult = await client.query(`
        UPDATE cont_gastos_externos g
        SET proveedor_id = p_new.id
        FROM cont_proveedores_old p_old
        JOIN cont_proveedores p_new ON (
          LOWER(TRIM(p_new.nombre)) = LOWER(TRIM(p_old.razon_social))
          OR LOWER(TRIM(p_new.razon_social)) = LOWER(TRIM(p_old.razon_social))
        )
        WHERE g.proveedor_id = p_old.id
        AND g.activo = true
      `);

      console.log(`   ✅ Proveedores mapeados: ${mapeoResult.rowCount}`);
    }

    // 4. Si hay tabla vieja de ejecutivos, mapear
    if (tablasViejas.rows.some(t => t.table_name === 'cont_ejecutivos_old')) {
      console.log('\n🔄 4. MAPEANDO EJECUTIVOS DESDE TABLA VIEJA\n');

      const mapeoEjec = await client.query(`
        UPDATE cont_gastos_externos g
        SET ejecutivo_id = e_new.id
        FROM cont_ejecutivos_old e_old
        JOIN cont_ejecutivos e_new ON LOWER(TRIM(e_new.nombre)) = LOWER(TRIM(e_old.nombre))
        WHERE g.ejecutivo_id = e_old.id
        AND g.activo = true
      `);

      console.log(`   ✅ Ejecutivos mapeados: ${mapeoEjec.rowCount}`);
    }

    // 5. Diagnóstico final
    console.log('\n📊 5. DIAGNÓSTICO FINAL\n');

    const diagnosticoFinal = await client.query(`
      SELECT
        COUNT(*) as total_gni,
        COUNT(g.proveedor_id) as con_proveedor_id,
        COUNT(p.id) as con_proveedor_valido,
        COUNT(g.ejecutivo_id) as con_ejecutivo_id,
        COUNT(e.id) as con_ejecutivo_valido
      FROM cont_gastos_externos g
      LEFT JOIN cont_proveedores p ON g.proveedor_id = p.id
      LEFT JOIN cont_ejecutivos e ON g.ejecutivo_id = e.id
      WHERE g.activo = true
    `);

    const df = diagnosticoFinal.rows[0];
    console.log(`   Total GNI activos: ${df.total_gni}`);
    console.log(`   Con proveedor válido: ${df.con_proveedor_valido} (${Math.round(df.con_proveedor_valido/df.total_gni*100)}%)`);
    console.log(`   Con ejecutivo válido: ${df.con_ejecutivo_valido} (${Math.round(df.con_ejecutivo_valido/df.total_gni*100)}%)`);

    // 6. Muestra de datos
    console.log('\n📌 6. MUESTRA DE DATOS (primeros 5)\n');

    const muestra = await client.query(`
      SELECT
        g.id,
        g.concepto,
        p.nombre as proveedor,
        e.nombre as ejecutivo
      FROM cont_gastos_externos g
      LEFT JOIN cont_proveedores p ON g.proveedor_id = p.id
      LEFT JOIN cont_ejecutivos e ON g.ejecutivo_id = e.id
      WHERE g.activo = true
      ORDER BY g.created_at DESC
      LIMIT 5
    `);

    muestra.rows.forEach(r => {
      console.log(`   ${r.id}: ${r.concepto?.substring(0, 30)}...`);
      console.log(`      Proveedor: ${r.proveedor || 'SIN ASIGNAR'}`);
      console.log(`      Ejecutivo: ${r.ejecutivo || 'SIN ASIGNAR'}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   CORRECCIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.detail) console.error('   Detalle:', error.detail);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
