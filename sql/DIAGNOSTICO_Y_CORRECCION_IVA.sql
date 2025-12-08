-- ============================================
-- VERIFICACIÓN Y CORRECCIÓN DE IVA EN TODOS LOS REGISTROS
-- ============================================
-- El script de importación asumió que TODOS los montos
-- tenían IVA incluido y dividió por 1.16.
-- 
-- PROBLEMA: Si algunos registros NO tenían IVA en el Excel,
-- entonces los subtotales están mal calculados.
-- 
-- ESTE SCRIPT:
-- 1. Verifica el estado actual de cada tabla
-- 2. Permite corregir según el caso correcto
-- ============================================
-- ═══════════════════════════════════════════════════════════════════
-- 1. DIAGNÓSTICO: VER ESTADO ACTUAL DE TODOS LOS DATOS
-- ═══════════════════════════════════════════════════════════════════
-- INGRESOS
SELECT 'INGRESOS' as tabla,
    COUNT(*) as registros,
    SUM(total) as suma_total,
    SUM(subtotal) as suma_subtotal,
    SUM(iva) as suma_iva,
    ROUND(SUM(subtotal) / NULLIF(SUM(total), 0) * 100, 2) as pct_subtotal,
    ROUND(SUM(iva) / NULLIF(SUM(total), 0) * 100, 2) as pct_iva
FROM evt_ingresos_erp
WHERE evento_id = 32;
-- GASTOS  
SELECT 'GASTOS' as tabla,
    COUNT(*) as registros,
    SUM(total) as suma_total,
    SUM(subtotal) as suma_subtotal,
    SUM(iva) as suma_iva,
    ROUND(SUM(subtotal) / NULLIF(SUM(total), 0) * 100, 2) as pct_subtotal,
    ROUND(SUM(iva) / NULLIF(SUM(total), 0) * 100, 2) as pct_iva
FROM evt_gastos_erp
WHERE evento_id = 32;
-- PROVISIONES
SELECT 'PROVISIONES' as tabla,
    COUNT(*) as registros,
    SUM(total) as suma_total,
    SUM(subtotal) as suma_subtotal,
    SUM(iva) as suma_iva,
    ROUND(SUM(subtotal) / NULLIF(SUM(total), 0) * 100, 2) as pct_subtotal,
    ROUND(SUM(iva) / NULLIF(SUM(total), 0) * 100, 2) as pct_iva
FROM evt_provisiones_erp
WHERE evento_id = 32
    AND activo = true;
-- ═══════════════════════════════════════════════════════════════════
-- 2. OPCIÓN A: SI LOS MONTOS EN EXCEL YA TENÍAN IVA (16%)
--    → La importación fue CORRECTA, no hacer nada
-- ═══════════════════════════════════════════════════════════════════
-- (Sin cambios necesarios)
-- ═══════════════════════════════════════════════════════════════════
-- 3. OPCIÓN B: SI LOS MONTOS EN EXCEL NO TENÍAN IVA
--    → Corregir: subtotal = total, iva = 0
-- ═══════════════════════════════════════════════════════════════════
-- DESCOMENTA EL BLOQUE QUE CORRESPONDA:
-- === CORREGIR SOLO PROVISIONES (más probable) ===
-- Las provisiones son estimaciones, no tienen IVA
/*
 UPDATE evt_provisiones_erp
 SET 
 subtotal = total,
 iva = 0,
 iva_porcentaje = 0,
 updated_at = NOW()
 WHERE activo = true;
 */
-- === CORREGIR TODO (si ningún registro tenía IVA en el Excel) ===
/*
 -- Corregir Gastos
 UPDATE evt_gastos_erp
 SET 
 subtotal = total,
 iva = 0,
 updated_at = NOW()
 WHERE evento_id = 32;
 
 -- Corregir Ingresos  
 UPDATE evt_ingresos_erp
 SET 
 subtotal = total,
 iva = 0,
 updated_at = NOW()
 WHERE evento_id = 32;
 
 -- Corregir Provisiones
 UPDATE evt_provisiones_erp
 SET 
 subtotal = total,
 iva = 0,
 iva_porcentaje = 0,
 updated_at = NOW()
 WHERE evento_id = 32 AND activo = true;
 */
-- ═══════════════════════════════════════════════════════════════════
-- 4. OPCIÓN C: SI LOS MONTOS EN EXCEL ERAN SUBTOTALES (sin IVA)
--    Y QUEREMOS CALCULAR EL IVA CORRECTO
--    → total = subtotal_actual * 1.16, iva = total - subtotal
--    (Esto es lo OPUESTO a lo que hizo la importación)
-- ═══════════════════════════════════════════════════════════════════
/*
 -- Corregir Gastos: el "total" actual es realmente el subtotal
 UPDATE evt_gastos_erp
 SET 
 subtotal = total,              -- El total guardado era el subtotal
 iva = total * 0.16,            -- Calcular IVA del subtotal
 total = total * 1.16,          -- Nuevo total con IVA
 updated_at = NOW()
 WHERE evento_id = 32;
 
 -- Corregir Ingresos
 UPDATE evt_ingresos_erp
 SET 
 subtotal = total,
 iva = total * 0.16,
 total = total * 1.16,
 updated_at = NOW()
 WHERE evento_id = 32;
 */
-- ═══════════════════════════════════════════════════════════════════
-- 5. VERIFICACIÓN POST-CORRECCIÓN
-- ═══════════════════════════════════════════════════════════════════
-- Ver resumen de la vista
SELECT clave_evento,
    ingresos_totales as "Ing Total",
    ingresos_subtotal as "Ing Subtotal",
    gastos_totales as "Gas Total",
    gastos_subtotal as "Gas Subtotal",
    provisiones_total as "Prov Total",
    provisiones_subtotal as "Prov Subtotal",
    utilidad_real as "Utilidad c/IVA",
    utilidad_bruta as "Utilidad s/IVA"
FROM vw_eventos_analisis_financiero_erp
WHERE clave_evento = 'DOT2025-003';
-- ═══════════════════════════════════════════════════════════════════
-- RECOMENDACIÓN PARA TU CASO ESPECÍFICO:
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Si el Excel tenía montos FINALES (con IVA ya incluido):
--   → La importación fue correcta para Ingresos y Gastos
--   → Solo corregir Provisiones (que son estimaciones sin IVA)
--
-- Ejecuta el UPDATE de PROVISIONES comentado arriba (Opción B, primer bloque)
-- 
-- ═══════════════════════════════════════════════════════════════════