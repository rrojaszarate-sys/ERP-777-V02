/**
 * Script para ejecutar migración SQL directamente en PostgreSQL
 * Agrega campos unificados a tablas de gastos
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Usar pooler transaccional (puerto 6543 - no bloqueado)
const DATABASE_URL = process.env.DATABASE_POOLER_TX_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL no encontrada en .env');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const SQL_MIGRATION = `
-- ============================================================================
-- MIGRACIÓN: Agregar campos unificados a tablas de gastos
-- Fecha: 2025-12-05
-- ============================================================================

-- 1. Agregar campos a evt_gastos_erp
ALTER TABLE evt_gastos_erp ADD COLUMN IF NOT EXISTS comprobante_pago_url TEXT;
ALTER TABLE evt_gastos_erp ADD COLUMN IF NOT EXISTS factura_pdf_url TEXT;
ALTER TABLE evt_gastos_erp ADD COLUMN IF NOT EXISTS factura_xml_url TEXT;
ALTER TABLE evt_gastos_erp ADD COLUMN IF NOT EXISTS ticket_url TEXT;
ALTER TABLE evt_gastos_erp ADD COLUMN IF NOT EXISTS responsable_id UUID;
ALTER TABLE evt_gastos_erp ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'pendiente';

-- 2. Agregar campos a cont_gastos_externos (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cont_gastos_externos') THEN
    ALTER TABLE cont_gastos_externos ADD COLUMN IF NOT EXISTS comprobante_pago_url TEXT;
    ALTER TABLE cont_gastos_externos ADD COLUMN IF NOT EXISTS factura_pdf_url TEXT;
    ALTER TABLE cont_gastos_externos ADD COLUMN IF NOT EXISTS factura_xml_url TEXT;
    ALTER TABLE cont_gastos_externos ADD COLUMN IF NOT EXISTS ticket_url TEXT;
    ALTER TABLE cont_gastos_externos ADD COLUMN IF NOT EXISTS responsable_id UUID;
    ALTER TABLE cont_gastos_externos ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'pendiente';
  END IF;
END $$;
`;

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  EJECUTANDO MIGRACIÓN: Campos unificados de gastos');
    console.log('═══════════════════════════════════════════════════════════\n');

    const client = await pool.connect();

    try {
        console.log('📋 Ejecutando ALTER TABLE...\n');

        await client.query(SQL_MIGRATION);

        console.log('✅ Migración ejecutada exitosamente\n');

        // Verificar columnas en evt_gastos_erp
        const { rows: evtCols } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'evt_gastos_erp' 
        AND column_name IN ('comprobante_pago_url', 'factura_pdf_url', 'factura_xml_url', 'ticket_url', 'responsable_id', 'estado')
      ORDER BY column_name
    `);

        console.log('📊 Columnas en evt_gastos_erp:');
        evtCols.forEach(col => {
            console.log(`   ✓ ${col.column_name} (${col.data_type})`);
        });

        // Verificar columnas en cont_gastos_externos
        const { rows: gniCols } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cont_gastos_externos' 
        AND column_name IN ('comprobante_pago_url', 'factura_pdf_url', 'factura_xml_url', 'ticket_url', 'responsable_id', 'estado')
      ORDER BY column_name
    `);

        if (gniCols.length > 0) {
            console.log('\n📊 Columnas en cont_gastos_externos:');
            gniCols.forEach(col => {
                console.log(`   ✓ ${col.column_name} (${col.data_type})`);
            });
        }

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  ✅ MIGRACIÓN COMPLETADA');
        console.log('═══════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(console.error);
