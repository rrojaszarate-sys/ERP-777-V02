#!/usr/bin/env node
/**
 * SCRIPT: Corregir relaciones de proveedores y ejecutivos en GNI
 * V2 - Primero corrige FKs, luego mapea datos
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
  console.log('   CORRECCIÓN DE RELACIONES GNI v2');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // 1. Diagnóstico inicial
    console.log('📊 1. DIAGNÓSTICO INICIAL\n');

    const diagnostico = await client.query(`
      SELECT
        COUNT(*) as total_gni,
        COUNT(proveedor_id) as con_proveedor_id,
        COUNT(ejecutivo_id) as con_ejecutivo_id
      FROM cont_gastos_externos
      WHERE activo = true
    `);

    const d = diagnostico.rows[0];
    console.log(`   Total GNI activos: ${d.total_gni}`);
    console.log(`   Con proveedor_id: ${d.con_proveedor_id}`);
    console.log(`   Con ejecutivo_id: ${d.con_ejecutivo_id}`);

    // 2. Eliminar FKs viejos que apuntan a tablas _old
    console.log('\n🔧 2. CORRIGIENDO FOREIGN KEYS\n');

    // Listar todos los FKs de cont_gastos_externos
    const fks = await client.query(`
      SELECT
        tc.constraint_name,
        ccu.table_name as foreign_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'cont_gastos_externos'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);

    console.log('   FKs encontrados:');
    for (const fk of fks.rows) {
      console.log(`   - ${fk.constraint_name} -> ${fk.foreign_table}`);

      // Eliminar FKs que apuntan a tablas _old
      if (fk.foreign_table.includes('_old')) {
        await client.query(`ALTER TABLE cont_gastos_externos DROP CONSTRAINT IF EXISTS ${fk.constraint_name}`);
        console.log(`     ✅ Eliminado (apuntaba a tabla _old)`);
      }
    }

    // 3. Crear tabla de mapeo proveedor viejo -> nuevo
    console.log('\n🗺️  3. CREANDO MAPEO DE PROVEEDORES\n');

    // Mapear por razon_social o nombre
    const mapeoProveedores = await client.query(`
      SELECT
        p_old.id as old_id,
        p_new.id as new_id,
        p_old.razon_social
      FROM cont_proveedores_old p_old
      JOIN cont_proveedores p_new ON (
        LOWER(TRIM(COALESCE(p_new.nombre, ''))) = LOWER(TRIM(COALESCE(p_old.razon_social, '')))
        OR LOWER(TRIM(COALESCE(p_new.razon_social, ''))) = LOWER(TRIM(COALESCE(p_old.razon_social, '')))
        OR LOWER(TRIM(COALESCE(p_new.nombre, ''))) = LOWER(TRIM(COALESCE(p_old.nombre_comercial, '')))
      )
      WHERE p_old.id IS NOT NULL AND p_new.id IS NOT NULL
    `);

    console.log(`   Mapeos encontrados: ${mapeoProveedores.rows.length}`);

    // Crear mapa
    const proveedorMap = {};
    mapeoProveedores.rows.forEach(m => {
      proveedorMap[m.old_id] = m.new_id;
    });

    // 4. Actualizar proveedor_id en GNI
    console.log('\n🔄 4. ACTUALIZANDO PROVEEDORES EN GNI\n');

    let proveedoresActualizados = 0;
    for (const [oldId, newId] of Object.entries(proveedorMap)) {
      const result = await client.query(`
        UPDATE cont_gastos_externos
        SET proveedor_id = $1
        WHERE proveedor_id = $2 AND activo = true
      `, [newId, oldId]);
      proveedoresActualizados += result.rowCount;
    }

    console.log(`   ✅ Proveedores actualizados: ${proveedoresActualizados}`);

    // 5. Mapear ejecutivos
    console.log('\n🗺️  5. MAPEANDO EJECUTIVOS\n');

    const mapeoEjecutivos = await client.query(`
      SELECT
        e_old.id as old_id,
        e_new.id as new_id,
        e_old.nombre
      FROM cont_ejecutivos_old e_old
      JOIN cont_ejecutivos e_new ON LOWER(TRIM(e_new.nombre)) = LOWER(TRIM(e_old.nombre))
      WHERE e_old.id IS NOT NULL AND e_new.id IS NOT NULL
    `);

    console.log(`   Mapeos encontrados: ${mapeoEjecutivos.rows.length}`);

    const ejecutivoMap = {};
    mapeoEjecutivos.rows.forEach(m => {
      ejecutivoMap[m.old_id] = m.new_id;
    });

    // 6. Actualizar ejecutivo_id en GNI
    console.log('\n🔄 6. ACTUALIZANDO EJECUTIVOS EN GNI\n');

    let ejecutivosActualizados = 0;
    for (const [oldId, newId] of Object.entries(ejecutivoMap)) {
      const result = await client.query(`
        UPDATE cont_gastos_externos
        SET ejecutivo_id = $1
        WHERE ejecutivo_id = $2 AND activo = true
      `, [newId, oldId]);
      ejecutivosActualizados += result.rowCount;
    }

    console.log(`   ✅ Ejecutivos actualizados: ${ejecutivosActualizados}`);

    // 7. Agregar nuevos FKs (si no existen)
    console.log('\n🔗 7. AGREGANDO NUEVOS FOREIGN KEYS\n');

    try {
      await client.query(`
        ALTER TABLE cont_gastos_externos
        DROP CONSTRAINT IF EXISTS fk_gni_proveedor_new,
        ADD CONSTRAINT fk_gni_proveedor_new
          FOREIGN KEY (proveedor_id) REFERENCES cont_proveedores(id)
      `);
      console.log('   ✅ FK proveedor_id -> cont_proveedores agregado');
    } catch (e) {
      console.log(`   ⚠️ FK proveedor: ${e.message.substring(0, 60)}`);
    }

    try {
      await client.query(`
        ALTER TABLE cont_gastos_externos
        DROP CONSTRAINT IF EXISTS fk_gni_ejecutivo_new,
        ADD CONSTRAINT fk_gni_ejecutivo_new
          FOREIGN KEY (ejecutivo_id) REFERENCES cont_ejecutivos(id)
      `);
      console.log('   ✅ FK ejecutivo_id -> cont_ejecutivos agregado');
    } catch (e) {
      console.log(`   ⚠️ FK ejecutivo: ${e.message.substring(0, 60)}`);
    }

    // 8. Diagnóstico final
    console.log('\n📊 8. DIAGNÓSTICO FINAL\n');

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

    // 9. Muestra de datos
    console.log('\n📌 9. MUESTRA DE DATOS (primeros 5)\n');

    const muestra = await client.query(`
      SELECT
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
      console.log(`   ${r.concepto?.substring(0, 40)}...`);
      console.log(`      Proveedor: ${r.proveedor || 'SIN ASIGNAR'}`);
      console.log(`      Ejecutivo: ${r.ejecutivo || 'SIN ASIGNAR'}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════');
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
