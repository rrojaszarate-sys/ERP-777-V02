-- Verificar categorías insertadas
SELECT 'CATEGORIAS GASTOS:' AS tipo, COUNT(*) AS total FROM evt_categorias_gastos
UNION ALL
SELECT 'CATEGORIAS INGRESOS:', COUNT(*) FROM evt_categorias_ingresos
UNION ALL  
SELECT 'CUENTAS BANCARIAS:', COUNT(*) FROM evt_cuentas_bancarias
UNION ALL
SELECT 'ROLES:', COUNT(*) FROM evt_roles;

-- Detalle de categorías gastos
SELECT 'DETALLE GASTOS:' AS tipo, nombre FROM evt_categorias_gastos ORDER BY id;

-- Detalle de categorías ingresos
SELECT 'DETALLE INGRESOS:' AS tipo, nombre FROM evt_categorias_ingresos ORDER BY id;
