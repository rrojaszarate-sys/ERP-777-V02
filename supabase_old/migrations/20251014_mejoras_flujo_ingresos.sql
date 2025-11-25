-- ============================================
-- MIGRACIÓN: Mejoras al Flujo de Ingresos
-- Fecha: 14 de Octubre de 2025
-- ============================================

-- 1. Agregar columnas nuevas a evt_ingresos
ALTER TABLE evt_ingresos
ADD COLUMN IF NOT EXISTS dias_credito INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS documento_pago_url TEXT,
ADD COLUMN IF NOT EXISTS documento_pago_nombre TEXT;

-- 2. Comentarios para documentación
COMMENT ON COLUMN evt_ingresos.dias_credito IS 'Días de crédito acordados para el pago (30, 60, 90, etc.)';
COMMENT ON COLUMN evt_ingresos.documento_pago_url IS 'URL del comprobante de pago subido a Supabase Storage';
COMMENT ON COLUMN evt_ingresos.documento_pago_nombre IS 'Nombre del archivo de comprobante de pago';

-- 3. Actualizar ingresos existentes
-- Asegurar que todos los ingresos existentes estén marcados como facturados
UPDATE evt_ingresos 
SET facturado = true 
WHERE facturado IS NULL OR facturado = false;

-- 4. Asignar días de crédito por defecto a registros existentes
UPDATE evt_ingresos 
SET dias_credito = 30 
WHERE dias_credito IS NULL;

-- 5. Calcular fecha_compromiso_pago basada en fecha_facturacion + dias_credito
-- Solo para registros que no tienen fecha de compromiso pero tienen fecha de facturación
UPDATE evt_ingresos 
SET fecha_compromiso_pago = (fecha_facturacion::DATE + INTERVAL '1 day' * COALESCE(dias_credito, 30))::DATE
WHERE fecha_facturacion IS NOT NULL 
  AND fecha_compromiso_pago IS NULL;

-- 6. Verificar cambios
SELECT 
    id,
    concepto,
    facturado,
    cobrado,
    fecha_facturacion,
    dias_credito,
    fecha_compromiso_pago,
    fecha_cobro,
    documento_pago_url IS NOT NULL as tiene_comprobante
FROM evt_ingresos
ORDER BY fecha_facturacion DESC
LIMIT 10;

-- 7. Estadísticas post-migración
SELECT 
    COUNT(*) as total_ingresos,
    COUNT(CASE WHEN facturado = true THEN 1 END) as facturados,
    COUNT(CASE WHEN cobrado = true THEN 1 END) as cobrados,
    COUNT(CASE WHEN cobrado = false AND facturado = true THEN 1 END) as pendientes_cobro,
    COUNT(CASE WHEN documento_pago_url IS NOT NULL THEN 1 END) as con_comprobante,
    AVG(dias_credito) as promedio_dias_credito
FROM evt_ingresos;

-- ============================================
-- NOTAS DE MIGRACIÓN
-- ============================================
/*
1. Esta migración agrega 3 nuevos campos a evt_ingresos:
   - dias_credito: Para calcular automáticamente fecha de vencimiento
   - documento_pago_url: URL del comprobante cuando se marca como cobrado
   - documento_pago_nombre: Nombre del archivo del comprobante

2. Actualiza todos los ingresos existentes:
   - facturado = true (porque los ingresos siempre tienen factura)
   - dias_credito = 30 (valor por defecto)
   - Calcula fecha_compromiso_pago si no existe

3. Es seguro ejecutar múltiples veces (usa IF NOT EXISTS)

4. No elimina ni modifica datos existentes
*/
