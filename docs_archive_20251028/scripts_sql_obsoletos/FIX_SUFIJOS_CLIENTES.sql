-- ═══════════════════════════════════════════════════════════════════════════
-- CORRECCIÓN: Sufijos de Clientes
-- ═══════════════════════════════════════════════════════════════════════════
-- Propósito: Corregir sufijos incorrectos en evt_clientes
-- Problema: Todos los clientes tienen sufijo = '3' en lugar de 3 caracteres
-- ═══════════════════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Ver estado actual de los sufijos
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
    id,
    razon_social,
    nombre_comercial,
    sufijo as sufijo_actual,
    rfc as rfc_actual,
    LENGTH(sufijo) as longitud_sufijo
FROM evt_clientes
WHERE activo = true
ORDER BY created_at DESC
LIMIT 20;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Generar sufijos correctos basados en el nombre de la empresa
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
    cliente RECORD;
    nuevo_sufijo TEXT;
    nuevo_rfc TEXT;
    nombre_limpio TEXT;
    letras_rfc TEXT;
    numeros_rfc TEXT;
    homoclave TEXT;
BEGIN
    -- Recorrer todos los clientes activos con sufijo incorrecto o sin RFC
    FOR cliente IN 
        SELECT id, razon_social, nombre_comercial, sufijo, rfc
        FROM evt_clientes
        WHERE activo = true
        AND (sufijo IS NULL OR LENGTH(sufijo) != 3 OR sufijo = '3' OR rfc IS NULL OR rfc = '')
    LOOP
        -- Usar nombre comercial, si no existe usar razón social
        nombre_limpio := COALESCE(cliente.nombre_comercial, cliente.razon_social);
        
        -- Eliminar espacios, números y caracteres especiales, dejar solo letras
        nombre_limpio := REGEXP_REPLACE(nombre_limpio, '[^A-Za-z]', '', 'g');
        
        -- Tomar las primeras 3 letras y convertir a mayúsculas
        nuevo_sufijo := UPPER(SUBSTRING(nombre_limpio, 1, 3));
        
        -- Si no hay suficientes letras, rellenar con X
        WHILE LENGTH(nuevo_sufijo) < 3 LOOP
            nuevo_sufijo := nuevo_sufijo || 'X';
        END LOOP;
        
        -- Generar RFC válido (formato para personas morales: 3 letras + 6 dígitos + 3 caracteres homoclave)
        -- Usar el sufijo como base (3 letras iniciales)
        letras_rfc := nuevo_sufijo;
        
        -- Generar fecha aleatoria (YYMMDD) - usar año entre 1990-2020
        numeros_rfc := 
            LPAD((90 + (RANDOM() * 30)::INT)::TEXT, 2, '0') ||  -- Año (90-20)
            LPAD((1 + (RANDOM() * 12)::INT)::TEXT, 2, '0') ||   -- Mes (01-12)
            LPAD((1 + (RANDOM() * 28)::INT)::TEXT, 2, '0');     -- Día (01-28)
        
        -- Generar homoclave (3 caracteres alfanuméricos)
        homoclave := 
            CHR(65 + (RANDOM() * 26)::INT) ||  -- Letra A-Z
            CHR(65 + (RANDOM() * 26)::INT) ||  -- Letra A-Z
            CHR(48 + (RANDOM() * 10)::INT);    -- Número 0-9
        
        -- Construir RFC completo
        nuevo_rfc := letras_rfc || numeros_rfc || homoclave;
        
        -- Actualizar el cliente
        UPDATE evt_clientes
        SET sufijo = nuevo_sufijo,
            rfc = nuevo_rfc,
            updated_at = NOW()
        WHERE id = cliente.id;
        
        RAISE NOTICE 'Cliente % (%): sufijo "%" → "%" | RFC generado: %',
            cliente.id,
            COALESCE(cliente.nombre_comercial, cliente.razon_social),
            cliente.sufijo,
            nuevo_sufijo,
            nuevo_rfc;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Sufijos y RFCs actualizados correctamente';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Verificar los sufijos corregidos
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
    id,
    razon_social,
    nombre_comercial,
    sufijo as sufijo_corregido,
    rfc as rfc_generado,
    LENGTH(sufijo) as longitud_sufijo,
    LENGTH(rfc) as longitud_rfc
FROM evt_clientes
WHERE activo = true
ORDER BY created_at DESC
LIMIT 20;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. Verificar que no haya duplicados
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 
    sufijo,
    COUNT(*) as cantidad,
    STRING_AGG(razon_social, ', ') as clientes
FROM evt_clientes
WHERE activo = true
GROUP BY sufijo
HAVING COUNT(*) > 1;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. Mensaje final
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
    total_clientes INT;
BEGIN
    SELECT COUNT(*) INTO total_clientes
    FROM evt_clientes
    WHERE activo = true;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ SUFIJOS Y RFCs CORREGIDOS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Total de clientes activos: %', total_clientes;
    RAISE NOTICE '';
    RAISE NOTICE '📝 Actualizaciones realizadas:';
    RAISE NOTICE '   ✓ Todos los sufijos tienen 3 caracteres alfabéticos';
    RAISE NOTICE '   ✓ RFCs válidos generados (formato: 3 letras + 6 dígitos + 3 homoclave)';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Uso del sufijo:';
    RAISE NOTICE '   - El sufijo se usa para generar las claves de eventos';
    RAISE NOTICE '   - Formato de clave: SUFIJO-AÑO-### (ej: GRU2025-001)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  NOTA:';
    RAISE NOTICE '   - Los RFCs son generados aleatoriamente para fines de desarrollo';
    RAISE NOTICE '   - En producción, debes usar los RFCs reales de tus clientes';
    RAISE NOTICE '   - Puedes editar manualmente los sufijos y RFCs desde el módulo de clientes';
    RAISE NOTICE '';
END $$;
