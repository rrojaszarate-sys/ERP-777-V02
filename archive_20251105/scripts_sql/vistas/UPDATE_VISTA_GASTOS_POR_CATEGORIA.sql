-- ====================================================================
-- ACTUALIZACIÓN DE VISTA: Agregar alias para gastos por categoría
-- Fecha: 2025-10-30
-- Propósito: Agregar alias compatibles con el frontend
-- ====================================================================

-- La vista ya tiene las columnas de gastos por categoría.
-- Solo necesitamos agregar alias para compatibilidad con el frontend:

-- COLUMNAS EXISTENTES EN LA VISTA:
-- gastos_combustible_pagados  -> necesita alias: gastos_combustible_peaje_pagados
-- gastos_combustible_pendientes -> necesita alias: gastos_combustible_peaje_pendientes  
-- gastos_materiales_pagados   -> OK
-- gastos_materiales_pendientes -> OK
-- gastos_rh_pagados           -> necesita alias: gastos_recursos_humanos_pagados
-- gastos_rh_pendientes        -> necesita alias: gastos_recursos_humanos_pendientes
-- gastos_sps_pagados          -> necesita alias: gastos_solicitudes_pago_pagados
-- gastos_sps_pendientes       -> necesita alias: gastos_solicitudes_pago_pendientes

-- NO SE REQUIERE EJECUTAR ESTE SQL
-- La vista ya fue creada por la migración 010_divide_provisiones_categories.sql
-- Las columnas ya existen con nombres ligeramente diferentes.

-- SOLUCIÓN: Actualizar el frontend para usar los nombres correctos de la vista.
