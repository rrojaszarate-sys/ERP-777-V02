-- ============================================
-- SCRIPT DE VERIFICACIÓN PRE-MIGRACIÓN
-- ============================================
-- Ejecuta este script en Supabase Dashboard > SQL Editor
-- ANTES de aplicar la migración 20251024_ingresos_gastos_improvements.sql
-- Esto te dirá qué campos ya existen y cuáles faltan

\echo '============================================'
\echo 'VERIFICANDO ESTRUCTURA DE evt_ingresos'
\echo '============================================'

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'evt_ingresos'
  AND column_name IN (
    'cliente_id',
    'responsable_id',
    'estado_id',
    'dias_facturacion',
    'fecha_limite_facturacion',
    'fecha_compromiso_pago',
    'orden_compra_url',
    'orden_compra_nombre',
    'alertas_enviadas'
  )
ORDER BY column_name;

\echo ''
\echo '============================================'
\echo 'VERIFICANDO ESTRUCTURA DE evt_gastos'
\echo '============================================'

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'evt_gastos'
  AND column_name IN (
    'cuenta_id',
    'comprobante_pago_url',
    'comprobante_pago_nombre',
    'fecha_pago',
    'responsable_pago_id',
    'pagado',
    'comprobado',
    'autorizado'
  )
ORDER BY column_name;

\echo ''
\echo '============================================'
\echo 'VERIFICANDO SI EXISTE evt_proveedores'
\echo '============================================'

SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'evt_proveedores'
) AS existe_tabla_proveedores;

\echo ''
\echo '============================================'
\echo 'VERIFICANDO SI EXISTE evt_estados_ingreso'
\echo '============================================'

SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'evt_estados_ingreso'
) AS existe_tabla_estados_ingreso;

\echo ''
\echo '============================================'
\echo 'VERIFICANDO SI EXISTE evt_cuentas_contables'
\echo '============================================'

SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'evt_cuentas_contables'
) AS existe_tabla_cuentas_contables;

\echo ''
\echo '============================================'
\echo 'CAMPOS ACTUALES DE evt_gastos (TODOS)'
\echo '============================================'

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'evt_gastos'
ORDER BY ordinal_position;

\echo ''
\echo '============================================'
\echo 'CAMPOS ACTUALES DE evt_ingresos (TODOS)'
\echo '============================================'

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'evt_ingresos'
ORDER BY ordinal_position;
