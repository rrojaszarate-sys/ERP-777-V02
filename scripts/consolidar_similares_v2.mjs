#!/usr/bin/env node
/**
 * SCRIPT: Consolidar proveedores similares
 * Basado en el análisis de similitud, consolida automáticamente
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

// Pares a consolidar (basado en análisis de similitud >= 90%)
const paresConsolidar = [
  // Errores tipográficos claros
  { mantener: 'OPERADORA CONCESIONARIA MEXIQUENSE SA DE CV', eliminar: 'OPERADORA CONCESINARIA MEXIQUENSE SA DE CV' },
  { mantener: 'CONTINENTAL MOBILITY SA DE CV', eliminar: 'CONTINENTAL MOBOLITY SA DE CV' },
  { mantener: 'YAIR CRESCENCIO PEREZ MONTES DE OCA', eliminar: 'YAIR CRESENCIO PEREZ MONTES DE OCA' },
  { mantener: 'FERRETERIA LA CARREDANA', eliminar: 'FERRETERIA LA CERREDANA' },
  { mantener: 'FARMACIA GUADALAJARA', eliminar: 'FARMACIAS GUADALAJARA' },
  { mantener: 'GASOLINERA RENOVACION', eliminar: 'GASOLINERA REOVACION' },
  { mantener: 'GASOLINERA RENOVACION', eliminar: 'GASOLINERIA RENOVACION' },
  { mantener: 'PROPIMEX S DE RL DE CV', eliminar: 'PROMIMEX S DE RL DE CV' },
  { mantener: 'SERVICIO PORTOMARIN', eliminar: 'SERVICIO POTOMARIN' },
  { mantener: 'EDGAR OSORIO VELA', eliminar: 'EDGAR OSORIO VERA' },
  { mantener: 'GUILLERMO MENDOZA', eliminar: 'GUILLERMO MEDOZA' },
  { mantener: 'OPERADORA CONCESIONARIA MEXIQUENSE', eliminar: 'OPERADORA CONSECIONARIA MEXIQUENSE' },
  { mantener: 'PAULA OLIVIA MOLINA HERNANDEZ', eliminar: 'PAULINA OLIVIA MOLINA HERNANDEZ' },
  { mantener: 'MULTI HERRAJES', eliminar: 'MILTI HERRAJES' },
  { mantener: 'MULTI HERRAJES', eliminar: 'MULTIHERRAJES' },
  { mantener: 'PESA TECNOLOGIA', eliminar: 'PESA TECNOLOGIC' },
  { mantener: 'QUALITAS COMPANIA DE SEGUROS SA DE CV', eliminar: 'QUALITAS COMPANIA DE SEGUROS S.A. DE C.V' },
  { mantener: 'AUTOMOTRIZ HF', eliminar: 'AUROMOTRIZ HF' },
  { mantener: 'SISTEMA DE CORTE CNC METAL SA DE CV', eliminar: 'SISTEMA DE CORTE CNC METAL. S.A DE C.V' },
  { mantener: 'TOMAS SANABRIA ESCUTIA', eliminar: 'THOMAS SANABRIA ECUTIA' },
  { mantener: 'UNALANA PAY', eliminar: 'UNALANAPAY' },
  { mantener: 'GOBIERNO DEL ESTADO DE MEXICO', eliminar: 'GOBIERNO DEL EDO DE MEXICO' },
  { mantener: 'ELECTRICA SANTA ANA', eliminar: 'ELECTRICA SANTANA' },
  { mantener: 'TELEFONOS DE MEXICO', eliminar: 'TEELFONOS DE MEXICO' },
  { mantener: 'WALMART', eliminar: 'WAL MART' },
  { mantener: 'SERVICIO MIRUSA', eliminar: 'SERVICIO MIRUSA II' },
  { mantener: 'PROVISIONES', eliminar: 'PROVISION' },
  { mantener: 'DISTRIBUIDORA DE TORNILLOS BIRLOS Y HERRAMIENTAS', eliminar: 'DIST DE TORNILLOS BIRLOS Y HERRAMIENTAS' },
  { mantener: 'DISTRIBUIDORA SAGARO SA DE CV', eliminar: 'DISTRIBUIDORA SAGARO DE MEXICO' },
  { mantener: 'MULTISERVICIOS DUAL', eliminar: 'MULTISERVS DUAL' },
  { mantener: 'OPERADORA CONCESIONARIA MEXIQUENSE SA DE CV', eliminar: 'OPERADORA CONCESIONARIA MEXIQUENSE' },
  { mantener: 'DISTRIBUIDOR PAPELERO DE TOLUCA SA DE CV', eliminar: 'DISTRIBUIDOR PAPELERO DE TOLUCA' },
  { mantener: 'CONSORCIO C T A AUTOMOTRIZ SA DE CV', eliminar: 'CONSORCIO C T A AUTOMOTRIZ' },
  { mantener: 'SERVICIOS GASOLINEROS DE METEPEC', eliminar: 'SERVICIOS GAOLINEROS METEPEC' },
  { mantener: 'EDGAR OCTAVIO MEJIA ALVARADO', eliminar: 'EDGAR OCTAVIO ALVARADO' },
  { mantener: 'EDGAR JOSE ARGUELLES DURAN', eliminar: 'EDGAR JOSE ARGUELLES' },
];

async function main() {
  const client = await pool.connect();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   CONSOLIDACIÓN DE PROVEEDORES SIMILARES v2');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    let totalRedirigidos = 0;
    let proveedoresDesactivados = 0;

    for (const par of paresConsolidar) {
      // Buscar el proveedor a mantener
      const mantenerResult = await client.query(`
        SELECT id FROM cont_proveedores WHERE nombre = $1 AND activo = true LIMIT 1
      `, [par.mantener]);

      // Buscar el proveedor a eliminar
      const eliminarResult = await client.query(`
        SELECT id FROM cont_proveedores WHERE nombre = $1 AND activo = true LIMIT 1
      `, [par.eliminar]);

      if (!mantenerResult.rows[0] || !eliminarResult.rows[0]) {
        // Intentar buscar con LIKE si no encontramos exacto
        const mantenerLike = await client.query(`
          SELECT id, nombre FROM cont_proveedores WHERE nombre ILIKE $1 AND activo = true LIMIT 1
        `, [`%${par.mantener.substring(0, 20)}%`]);

        const eliminarLike = await client.query(`
          SELECT id, nombre FROM cont_proveedores WHERE nombre ILIKE $1 AND activo = true LIMIT 1
        `, [`%${par.eliminar.substring(0, 20)}%`]);

        if (!mantenerLike.rows[0] || !eliminarLike.rows[0]) {
          continue; // No encontrado o ya consolidado
        }

        // Usar los encontrados con LIKE
        const mantenerId = mantenerLike.rows[0].id;
        const eliminarId = eliminarLike.rows[0].id;

        if (mantenerId === eliminarId) continue;

        // Redirigir referencias
        const redir = await client.query(`
          UPDATE cont_gastos_externos SET proveedor_id = $1 WHERE proveedor_id = $2
        `, [mantenerId, eliminarId]);

        if (redir.rowCount > 0) {
          console.log(`✅ "${eliminarLike.rows[0].nombre}" -> "${mantenerLike.rows[0].nombre}" (${redir.rowCount} GNIs)`);
          totalRedirigidos += redir.rowCount;
        }

        // Desactivar
        await client.query(`
          UPDATE cont_proveedores SET activo = false, notas = COALESCE(notas, '') || ' [DUPLICADO->' || $1 || ']' WHERE id = $2
        `, [mantenerId, eliminarId]);
        proveedoresDesactivados++;

        continue;
      }

      const mantenerId = mantenerResult.rows[0].id;
      const eliminarId = eliminarResult.rows[0].id;

      if (mantenerId === eliminarId) continue;

      // Redirigir referencias en cont_gastos_externos
      const redir = await client.query(`
        UPDATE cont_gastos_externos SET proveedor_id = $1 WHERE proveedor_id = $2
      `, [mantenerId, eliminarId]);

      if (redir.rowCount > 0) {
        console.log(`✅ "${par.eliminar}" -> "${par.mantener}" (${redir.rowCount} GNIs)`);
        totalRedirigidos += redir.rowCount;
      }

      // Desactivar proveedor duplicado
      await client.query(`
        UPDATE cont_proveedores SET activo = false, notas = COALESCE(notas, '') || ' [DUPLICADO->' || $1 || ']' WHERE id = $2
      `, [mantenerId, eliminarId]);
      proveedoresDesactivados++;
    }

    console.log('\n───────────────────────────────────────────────────────────────');
    console.log(`📊 RESUMEN:`);
    console.log(`   GNIs redirigidos: ${totalRedirigidos}`);
    console.log(`   Proveedores desactivados: ${proveedoresDesactivados}`);

    // Estadísticas finales
    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM cont_proveedores WHERE activo = true) as proveedores_activos,
        (SELECT COUNT(*) FROM cont_gastos_externos WHERE activo = true) as gni_activos,
        (SELECT COUNT(DISTINCT proveedor_id) FROM cont_gastos_externos WHERE activo = true AND proveedor_id IS NOT NULL) as proveedores_usados
    `);

    const s = stats.rows[0];
    console.log(`\n📋 ESTADÍSTICAS FINALES:`);
    console.log(`   Proveedores activos: ${s.proveedores_activos}`);
    console.log(`   GNI activos: ${s.gni_activos}`);
    console.log(`   Proveedores únicos usados: ${s.proveedores_usados}`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   CONSOLIDACIÓN COMPLETADA');
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
