-- =====================================================================
-- 🚨 FIX COMPLETO: Módulo de Ingresos
-- =====================================================================
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- =====================================================================
-- Problemas a resolver:
-- 1. Trigger calcula mal (usa cantidad * precio_unitario)
-- 2. Debe usar el TOTAL del XML como fuente de verdad
-- 3. Agregar campo responsable_id para notificaciones
-- 4. Fecha de facturación desde XML
-- 5. Fecha de pago desde comprobante
-- =====================================================================

-- =====================================================================
-- PASO 1: Ver el trigger actual de ingresos (INCORRECTO)
-- =====================================================================

SELECT 
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'calculate_income_totals';

-- Verás algo como:
-- NEW.subtotal = NEW.cantidad * NEW.precio_unitario;  ❌ INCORRECTO
-- NEW.iva = NEW.subtotal * (NEW.iva_porcentaje / 100); ❌ INCORRECTO
-- NEW.total = NEW.subtotal + NEW.iva;                  ❌ INCORRECTO

-- =====================================================================
-- PASO 2: ELIMINAR trigger y función de ingresos actuales
-- =====================================================================

DROP TRIGGER IF EXISTS calculate_income_totals_trigger ON evt_ingresos;
DROP TRIGGER IF EXISTS trg_calculate_income_totals ON evt_ingresos;
DROP FUNCTION IF EXISTS calculate_income_totals();

-- =====================================================================
-- PASO 3: AGREGAR campo responsable_id a evt_ingresos
-- =====================================================================
-- Este campo permite asignar un trabajador responsable del ingreso
-- Se usará para enviar notificaciones

DO $$ 
BEGIN
    -- Verificar si la columna ya existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'evt_ingresos' 
        AND column_name = 'responsable_id'
    ) THEN
        -- Agregar columna responsable_id
        ALTER TABLE evt_ingresos 
        ADD COLUMN responsable_id UUID REFERENCES core_users(id);
        
        -- Agregar índice para búsquedas rápidas
        CREATE INDEX IF NOT EXISTS idx_evt_ingresos_responsable 
        ON evt_ingresos(responsable_id);
        
        RAISE NOTICE '✅ Campo responsable_id agregado a evt_ingresos';
    ELSE
        RAISE NOTICE '⚠️ Campo responsable_id ya existe';
    END IF;
END $$;

-- =====================================================================
-- PASO 4: CREAR NUEVA FUNCIÓN CORRECTA para ingresos
-- =====================================================================
-- Esta función respeta el TOTAL que viene del frontend/XML

CREATE OR REPLACE FUNCTION calculate_income_totals()
RETURNS TRIGGER AS $$
DECLARE
    iva_factor NUMERIC;
BEGIN
    -- 💰 SI HAY TOTAL: Calcular subtotal e IVA desde el total (CORRECTO)
    -- Este es el caso cuando suben XML CFDI de factura emitida
    IF NEW.total IS NOT NULL AND NEW.total > 0 THEN
        iva_factor := 1.0 + (COALESCE(NEW.iva_porcentaje, 16) / 100.0);
        NEW.subtotal := ROUND((NEW.total / iva_factor)::numeric, 2);
        NEW.iva := ROUND((NEW.total - NEW.subtotal)::numeric, 2);
        
    -- 📦 SI HAY SUBTOTAL: Calcular desde subtotal (caso legacy)
    ELSIF NEW.subtotal IS NOT NULL AND NEW.subtotal > 0 THEN
        NEW.iva := ROUND((NEW.subtotal * COALESCE(NEW.iva_porcentaje, 16) / 100.0)::numeric, 2);
        NEW.total := ROUND((NEW.subtotal + NEW.iva)::numeric, 2);
        
    -- 🚫 SI NO HAY NADA: Inicializar en 0
    ELSE
        NEW.subtotal := 0;
        NEW.iva := 0;
        NEW.total := 0;
    END IF;
    
    -- 📅 Si NO hay fecha_facturacion pero SÍ hay fecha_ingreso, copiarla
    -- (La fecha del XML debe venir en fecha_facturacion desde el frontend)
    IF NEW.fecha_facturacion IS NULL AND NEW.fecha_ingreso IS NOT NULL THEN
        NEW.fecha_facturacion := NEW.fecha_ingreso;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- PASO 5: RECREAR EL TRIGGER para ingresos
-- =====================================================================

CREATE TRIGGER calculate_income_totals_trigger
    BEFORE INSERT OR UPDATE ON evt_ingresos
    FOR EACH ROW
    EXECUTE FUNCTION calculate_income_totals();

-- =====================================================================
-- PASO 6: VERIFICAR QUE SE APLICÓ CORRECTAMENTE
-- =====================================================================

-- Ver la nueva función
SELECT 
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'calculate_income_totals';

-- Deberías ver:
-- NEW.subtotal := ROUND((NEW.total / iva_factor)::numeric, 2);  ✅ CORRECTO

-- Ver que el trigger existe
SELECT 
    trigger_name, 
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'evt_ingresos'
AND trigger_name LIKE '%income%';

-- Ver que el campo responsable_id existe
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'evt_ingresos'
AND column_name IN ('responsable_id', 'fecha_facturacion', 'documento_pago_url');

-- =====================================================================
-- PASO 7: CONSULTAR trabajadores disponibles para asignar
-- =====================================================================

-- Ver trabajadores activos disponibles para asignar como responsables
SELECT 
    id,
    nombre,
    email
FROM core_users
WHERE activo = true
ORDER BY nombre;

-- =====================================================================
-- RESULTADO ESPERADO:
-- =====================================================================
-- ✅ Trigger de ingresos corregido (usa total del XML)
-- ✅ Campo responsable_id agregado para notificaciones
-- ✅ Fecha de facturación se llena automáticamente
-- ✅ Sistema listo para manejar comprobantes de pago

-- =====================================================================
-- NOTAS IMPORTANTES:
-- =====================================================================
/*
📋 CAMPOS EN evt_ingresos (después del fix):

OBLIGATORIOS (del XML):
- total                  → Del XML CFDI (FUENTE DE VERDAD)
- subtotal              → Calculado: total / 1.16
- iva                   → Calculado: total - subtotal
- fecha_facturacion     → Del XML (fecha de emisión)
- cliente               → Receptor del CFDI
- rfc_cliente          → RFC del receptor
- uuid_cfdi            → UUID del timbre fiscal

OPCIONALES:
- responsable_id        → Usuario a notificar (NUEVO)
- documento_pago_url    → Comprobante cuando se marca cobrado
- documento_pago_nombre → Nombre del archivo
- fecha_compromiso_pago → Auto-calculada (fecha_facturacion + dias_credito)
- dias_credito         → Días de crédito (default 30)

AUTOMÁTICOS:
- facturado            → Siempre true (inicio del flujo)
- cobrado              → false hasta que se suba comprobante
- fecha_pago           → Se llena cuando se marca cobrado
*/

-- ✅ FIN DEL SCRIPT
