-- =====================================================
-- ANÁLISIS EXHAUSTIVO DE ESTRUCTURA DE BASE DE DATOS
-- =====================================================

\echo '1. TABLAS CON GASTOS E INGRESOS:'
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE '%gasto%' OR tablename LIKE '%ingreso%') ORDER BY tablename;

\echo '\n2. ESTRUCTURA evt_gastos:'
\d evt_gastos

\echo '\n3. ESTRUCTURA evt_ingresos:'
\d evt_ingresos

\echo '\n4. VISTAS RELACIONADAS:'
SELECT viewname FROM pg_views WHERE schemaname = 'public' AND (viewname LIKE '%gasto%' OR viewname LIKE '%ingreso%' OR viewname LIKE '%factura%' OR viewname LIKE '%contab%') ORDER BY viewname;

\echo '\n5. CONTEO DE REGISTROS:'
SELECT 'evt_gastos' as tabla, COUNT(*) as total FROM evt_gastos
UNION ALL
SELECT 'evt_ingresos' as tabla, COUNT(*) as total FROM evt_ingresos;
