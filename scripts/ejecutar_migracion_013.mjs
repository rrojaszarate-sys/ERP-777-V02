#!/usr/bin/env node
/**
 * SCRIPT: EJECUTAR MIGRACIÓN 013 - Vista Eventos-ERP Utilidad Cliente
 * Ejecuta la migración usando conexión directa a PostgreSQL
 */

import pkg from 'pg';
const { Client } = pkg;
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Configuración
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Variable DATABASE_URL no encontrada en .env');
  process.exit(1);
}

async function ejecutarMigracion() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  MIGRACIÓN 013: Vista Eventos-ERP con Utilidad del Cliente');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Conectando a PostgreSQL...');
    await client.connect();
    console.log('✅ Conexión establecida\n');

    // Verificar si la vista ya existe
    console.log('🔍 Verificando si la vista ya existe...');
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'vw_eventos_erp_analisis'
      ) as existe;
    `);

    if (checkResult.rows[0].existe) {
      console.log('⚠️  La vista vw_eventos_erp_analisis ya existe.');
      console.log('   Se recreará con la nueva definición...\n');
    }

    // Leer y ejecutar la migración
    const migrationPath = join(__dirname, '..', 'migrations', '013_vista_eventos_erp_utilidad_cliente.sql');

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Archivo de migración no encontrado:', migrationPath);
      process.exit(1);
    }

    console.log('📋 Ejecutando migración...');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar el SQL
    await client.query(sql);

    console.log('\n✅ Migración ejecutada exitosamente\n');

    // Verificar resultado
    console.log('📊 Verificando vista creada...');
    const countResult = await client.query(`
      SELECT COUNT(*) as total FROM vw_eventos_erp_analisis;
    `);
    console.log(`   Total de eventos en vista: ${countResult.rows[0].total}`);

    // Mostrar ejemplo de datos
    console.log('\n📈 Muestra de datos con nueva fórmula de utilidad:');
    const sampleResult = await client.query(`
      SELECT
        clave_evento,
        nombre_proyecto,
        ingresos_totales,
        gastos_totales,
        provisiones_disponibles,
        utilidad,
        ROUND(margen_utilidad::numeric, 2) as margen,
        semaforo_utilidad,
        etiqueta_semaforo
      FROM vw_eventos_erp_analisis
      WHERE ingresos_totales > 0
      ORDER BY utilidad DESC
      LIMIT 5;
    `);

    if (sampleResult.rows.length > 0) {
      console.log('   ┌────────────┬─────────────────────┬────────────────┬────────────┬───────────┬─────────┐');
      console.log('   │ Evento     │ Proyecto            │ Ingresos       │ Utilidad   │ Margen    │ Semáforo│');
      console.log('   ├────────────┼─────────────────────┼────────────────┼────────────┼───────────┼─────────┤');

      for (const row of sampleResult.rows) {
        const evento = (row.clave_evento || '').substring(0, 10).padEnd(10);
        const proyecto = (row.nombre_proyecto || '').substring(0, 19).padEnd(19);
        const ingresos = `$${Number(row.ingresos_totales).toLocaleString()}`.padStart(14);
        const utilidad = `$${Number(row.utilidad).toLocaleString()}`.padStart(10);
        const margen = `${row.margen}%`.padStart(9);
        const semaforo = (row.etiqueta_semaforo || '').padEnd(9);

        console.log(`   │ ${evento}│ ${proyecto}│ ${ingresos}│ ${utilidad}│ ${margen}│ ${semaforo}│`);
      }
      console.log('   └────────────┴─────────────────────┴────────────────┴────────────┴───────────┴─────────┘');
    }

    // Verificar función helper
    console.log('\n🔧 Verificando función calcular_utilidad_evento...');
    const funcResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'calcular_utilidad_evento'
      ) as existe;
    `);

    if (funcResult.rows[0].existe) {
      console.log('   ✅ Función helper creada correctamente');
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ MIGRACIÓN 013 COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n📊 Fórmula implementada:');
    console.log('   UTILIDAD = INGRESOS - GASTOS - PROVISIONES_DISPONIBLES');
    console.log('   PROVISIONES_DISPONIBLES = MAX(0, PROVISIONES - GASTOS)');
    console.log('\n🚦 Semáforo de utilidad:');
    console.log('   Verde   ≥ 35% - Excelente');
    console.log('   Amarillo 25-34% - Regular');
    console.log('   Rojo    1-24% - Bajo');
    console.log('   Gris    ≤ 0% - Ninguno\n');

  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error.message);
    if (error.detail) console.error('   Detalle:', error.detail);
    if (error.hint) console.error('   Sugerencia:', error.hint);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

ejecutarMigracion();
