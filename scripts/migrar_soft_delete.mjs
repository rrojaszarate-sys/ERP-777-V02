/**
 * Script para ejecutar migración de Soft Delete usando REST API de Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Faltan variables de entorno');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarYAgregarColumnas() {
    console.log('🚀 Verificando y agregando columnas de Soft Delete...\n');

    // ============================================
    // Verificar columnas existentes en evt_gastos_erp
    // ============================================
    console.log('📦 Verificando evt_gastos_erp...');

    const { data: gastoTest, error: gastoError } = await supabase
        .from('evt_gastos_erp')
        .select('id')
        .limit(1);

    if (gastoError) {
        console.log('   ❌ Error accediendo a evt_gastos_erp:', gastoError.message);
    } else {
        console.log('   ✅ Tabla evt_gastos_erp accesible');

        // Intentar seleccionar las nuevas columnas
        const { data: colTest, error: colError } = await supabase
            .from('evt_gastos_erp')
            .select('activo')
            .limit(1);

        if (colError && colError.message.includes('activo')) {
            console.log('   ⚠️ Columna "activo" NO existe aún');
        } else {
            console.log('   ✅ Columna "activo" existe');
        }
    }

    // ============================================
    // Verificar evt_ingresos_erp
    // ============================================
    console.log('\n📦 Verificando evt_ingresos_erp...');

    const { error: ingresoError } = await supabase
        .from('evt_ingresos_erp')
        .select('id')
        .limit(1);

    if (ingresoError) {
        console.log('   ❌ Error accediendo a evt_ingresos_erp:', ingresoError.message);
    } else {
        console.log('   ✅ Tabla evt_ingresos_erp accesible');

        const { error: colError } = await supabase
            .from('evt_ingresos_erp')
            .select('activo')
            .limit(1);

        if (colError && colError.message.includes('activo')) {
            console.log('   ⚠️ Columna "activo" NO existe aún');
        } else {
            console.log('   ✅ Columna "activo" existe');
        }
    }

    // ============================================
    // Verificar evt_provisiones_erp
    // ============================================
    console.log('\n📦 Verificando evt_provisiones_erp...');

    const { error: provError } = await supabase
        .from('evt_provisiones_erp')
        .select('id')
        .limit(1);

    if (provError) {
        console.log('   ❌ Error accediendo a evt_provisiones_erp:', provError.message);
    } else {
        console.log('   ✅ Tabla evt_provisiones_erp accesible');

        const { error: colError } = await supabase
            .from('evt_provisiones_erp')
            .select('activo')
            .limit(1);

        if (colError && colError.message.includes('activo')) {
            console.log('   ⚠️ Columna "activo" NO existe aún');
        } else {
            console.log('   ✅ Columna "activo" existe');
        }
    }

    // ============================================
    // Verificar tabla de auditoría
    // ============================================
    console.log('\n📦 Verificando audit_eliminaciones_financieras...');

    const { error: auditError } = await supabase
        .from('audit_eliminaciones_financieras')
        .select('id')
        .limit(1);

    if (auditError) {
        if (auditError.message.includes('does not exist') || auditError.code === '42P01') {
            console.log('   ⚠️ Tabla NO existe aún');
        } else {
            console.log('   ⚠️ Estado:', auditError.message);
        }
    } else {
        console.log('   ✅ Tabla audit_eliminaciones_financieras existe');
    }

    // ============================================
    // Generar SQL para ejecutar manualmente
    // ============================================
    console.log('\n' + '='.repeat(70));
    console.log('📋 SQL PARA EJECUTAR EN SUPABASE DASHBOARD');
    console.log('='.repeat(70));

    const sql = `
-- ============================================
-- SOFT DELETE CON AUDITORÍA - MIGRACIÓN COMPLETA
-- Ejecutar en: SQL Editor de Supabase Dashboard
-- ============================================

-- PASO 1: Columnas para evt_gastos_erp
ALTER TABLE evt_gastos_erp 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID,
ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_from_ip TEXT,
ADD COLUMN IF NOT EXISTS deleted_user_agent TEXT;

-- PASO 2: Columnas para evt_ingresos_erp
ALTER TABLE evt_ingresos_erp 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID,
ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_from_ip TEXT,
ADD COLUMN IF NOT EXISTS deleted_user_agent TEXT;

-- PASO 3: Columnas para evt_provisiones_erp
ALTER TABLE evt_provisiones_erp 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID,
ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_from_ip TEXT,
ADD COLUMN IF NOT EXISTS deleted_user_agent TEXT;

-- PASO 4: Tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_eliminaciones_financieras (
    id SERIAL PRIMARY KEY,
    tabla_origen TEXT NOT NULL,
    registro_id INTEGER NOT NULL,
    evento_id INTEGER,
    company_id UUID,
    registro_snapshot JSONB,
    concepto TEXT,
    subtotal NUMERIC(12,2),
    iva NUMERIC(12,2),
    total NUMERIC(12,2),
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_by UUID,
    deleted_by_email TEXT,
    deleted_by_nombre TEXT,
    deleted_reason TEXT,
    deleted_from_ip TEXT,
    deleted_user_agent TEXT,
    deleted_device_type TEXT,
    deleted_browser TEXT,
    deleted_os TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 5: Índices de optimización
CREATE INDEX IF NOT EXISTS idx_gastos_activo ON evt_gastos_erp(activo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_ingresos_activo ON evt_ingresos_erp(activo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_provisiones_activo ON evt_provisiones_erp(activo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_deleted_at ON audit_eliminaciones_financieras(deleted_at);

-- Verificación
SELECT 'Migración completada exitosamente' as resultado;
`;

    console.log(sql);

    console.log('='.repeat(70));
    console.log('\n🔗 ABRE ESTE LINK Y EJECUTA EL SQL:');
    console.log(`   ${supabaseUrl}/project/_/sql\n`);
    console.log('   O ve a: https://supabase.com/dashboard → Tu proyecto → SQL Editor\n');
    console.log('='.repeat(70));
}

verificarYAgregarColumnas().catch(console.error);
