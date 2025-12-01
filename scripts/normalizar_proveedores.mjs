#!/usr/bin/env node
/**
 * SCRIPT: Normalizar nombres de proveedores
 * - Quitar acentos
 * - Quitar caracteres raros
 * - Quitar dobles espacios
 * - Trim (espacios al inicio/final)
 * - Mayúsculas para consistencia
 * - Consolidar proveedores duplicados
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

// Función para normalizar texto
function normalizar(texto) {
  if (!texto) return '';

  return texto
    // Convertir a mayúsculas
    .toUpperCase()
    // Quitar acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Reemplazar ñ por N
    .replace(/Ñ/g, 'N')
    // Quitar caracteres especiales excepto espacios, letras, números, puntos, comas
    .replace(/[^A-Z0-9\s.,&\-]/g, '')
    // Quitar dobles espacios
    .replace(/\s+/g, ' ')
    // Trim
    .trim();
}

async function main() {
  const client = await pool.connect();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   NORMALIZACIÓN DE PROVEEDORES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // 1. Obtener todos los proveedores
    console.log('📋 1. OBTENIENDO PROVEEDORES\n');

    const proveedores = await client.query(`
      SELECT id, nombre, razon_social
      FROM cont_proveedores
      WHERE activo = true
      ORDER BY nombre
    `);

    console.log(`   Total proveedores activos: ${proveedores.rows.length}`);

    // 2. Normalizar nombres
    console.log('\n🔄 2. NORMALIZANDO NOMBRES\n');

    let actualizados = 0;
    const nombresNormalizados = new Map(); // nombre_normalizado -> primer_id

    for (const prov of proveedores.rows) {
      const nombreOriginal = prov.nombre || '';
      const razonOriginal = prov.razon_social || '';

      const nombreNorm = normalizar(nombreOriginal);
      const razonNorm = normalizar(razonOriginal);

      // Solo actualizar si cambió
      if (nombreNorm !== nombreOriginal || razonNorm !== razonOriginal) {
        await client.query(`
          UPDATE cont_proveedores
          SET
            nombre = $1,
            razon_social = $2,
            updated_at = NOW()
          WHERE id = $3
        `, [nombreNorm || nombreOriginal, razonNorm || razonOriginal, prov.id]);
        actualizados++;
      }

      // Registrar para detectar duplicados
      const key = nombreNorm || razonNorm;
      if (key) {
        if (!nombresNormalizados.has(key)) {
          nombresNormalizados.set(key, prov.id);
        }
      }
    }

    console.log(`   ✅ Proveedores normalizados: ${actualizados}`);

    // 3. Detectar duplicados
    console.log('\n🔍 3. DETECTANDO DUPLICADOS\n');

    const duplicados = await client.query(`
      SELECT nombre, COUNT(*) as cantidad, array_agg(id) as ids
      FROM cont_proveedores
      WHERE activo = true AND nombre IS NOT NULL AND nombre != ''
      GROUP BY nombre
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `);

    if (duplicados.rows.length > 0) {
      console.log(`   Encontrados ${duplicados.rows.length} nombres duplicados:\n`);
      for (const dup of duplicados.rows) {
        console.log(`   - "${dup.nombre}" (${dup.cantidad} veces, IDs: ${dup.ids.slice(0, 5).join(', ')}${dup.ids.length > 5 ? '...' : ''})`);
      }

      // 4. Consolidar duplicados (mantener el ID más bajo, actualizar referencias)
      console.log('\n🔗 4. CONSOLIDANDO DUPLICADOS\n');

      let consolidados = 0;
      for (const dup of duplicados.rows) {
        const ids = dup.ids.sort((a, b) => a - b);
        const idPrincipal = ids[0];
        const idsSecundarios = ids.slice(1);

        // Actualizar referencias en cont_gastos_externos
        for (const idSec of idsSecundarios) {
          const result = await client.query(`
            UPDATE cont_gastos_externos
            SET proveedor_id = $1
            WHERE proveedor_id = $2
          `, [idPrincipal, idSec]);

          if (result.rowCount > 0) {
            console.log(`   Redirigido proveedor ${idSec} -> ${idPrincipal} (${result.rowCount} GNIs)`);
            consolidados += result.rowCount;
          }

          // Marcar proveedor secundario como inactivo
          await client.query(`
            UPDATE cont_proveedores
            SET activo = false, notas = 'DUPLICADO - Consolidado en ID ' || $1
            WHERE id = $2
          `, [idPrincipal, idSec]);
        }
      }

      console.log(`   ✅ Referencias consolidadas: ${consolidados}`);
    } else {
      console.log('   ✅ No hay duplicados');
    }

    // 5. Ahora normalizar ejecutivos también
    console.log('\n🔄 5. NORMALIZANDO EJECUTIVOS\n');

    const ejecutivos = await client.query(`
      SELECT id, nombre FROM cont_ejecutivos WHERE activo = true
    `);

    let ejecutivosActualizados = 0;
    for (const ejec of ejecutivos.rows) {
      const nombreOriginal = ejec.nombre || '';
      const nombreNorm = normalizar(nombreOriginal);

      if (nombreNorm !== nombreOriginal) {
        await client.query(`
          UPDATE cont_ejecutivos SET nombre = $1, updated_at = NOW() WHERE id = $2
        `, [nombreNorm, ejec.id]);
        ejecutivosActualizados++;
      }
    }

    console.log(`   ✅ Ejecutivos normalizados: ${ejecutivosActualizados}`);

    // 6. Estadísticas finales
    console.log('\n📊 6. ESTADÍSTICAS FINALES\n');

    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM cont_proveedores WHERE activo = true) as proveedores_activos,
        (SELECT COUNT(*) FROM cont_ejecutivos WHERE activo = true) as ejecutivos_activos,
        (SELECT COUNT(*) FROM cont_gastos_externos WHERE activo = true) as gni_activos
    `);

    const s = stats.rows[0];
    console.log(`   Proveedores activos: ${s.proveedores_activos}`);
    console.log(`   Ejecutivos activos: ${s.ejecutivos_activos}`);
    console.log(`   GNI activos: ${s.gni_activos}`);

    // 7. Muestra de proveedores normalizados
    console.log('\n📌 7. MUESTRA DE PROVEEDORES (primeros 10)\n');

    const muestra = await client.query(`
      SELECT nombre, rfc
      FROM cont_proveedores
      WHERE activo = true
      ORDER BY nombre
      LIMIT 10
    `);

    muestra.rows.forEach(p => {
      console.log(`   - ${p.nombre} ${p.rfc ? `(${p.rfc})` : ''}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   NORMALIZACIÓN COMPLETADA');
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
