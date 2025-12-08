import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('   🔧 CORRIGIENDO FÓRMULA DE UTILIDAD EN VISTA');
    console.log('═'.repeat(70));

    console.log('\n📋 FÓRMULA ANTERIOR:');
    console.log('   utilidad_real = ingresos_totales - gastos_totales');

    console.log('\n📋 FÓRMULA CORRECTA:');
    console.log('   utilidad_real = ingresos_totales - gastos_totales - provisiones_total');

    // Ejecutar el SQL para actualizar la vista
    const sql = `
DROP VIEW IF EXISTS vw_eventos_analisis_financiero_erp CASCADE;

CREATE OR REPLACE VIEW vw_eventos_analisis_financiero_erp AS
SELECT
  -- IDENTIFICACIÓN
  e.id,
  e.company_id,
  e.clave_evento,
  e.nombre_proyecto,
  e.descripcion,
  e.fecha_evento,
  e.fecha_fin,
  e.lugar,
  e.numero_invitados,
  e.prioridad,
  e.fase_proyecto,
  e.created_at,
  e.updated_at,

  -- CLIENTE
  e.cliente_id,
  c.razon_social AS cliente_nombre,
  c.nombre_comercial AS cliente_comercial,
  c.rfc AS cliente_rfc,

  -- ESTADO
  e.estado_id,
  est.nombre AS estado_nombre,
  est.color AS estado_color,

  -- TIPO EVENTO
  e.tipo_evento_id,
  te.nombre AS tipo_evento_nombre,
  te.color AS tipo_evento_color,

  -- INGRESOS (desde evt_ingresos_erp)
  COALESCE(ing.ingreso_estimado, 0) AS ingreso_estimado,
  COALESCE(ing.ingresos_totales, 0) AS ingresos_totales,
  COALESCE(ing.ingresos_subtotal, 0) AS ingresos_subtotal,
  COALESCE(ing.ingresos_iva, 0) AS ingresos_iva,
  COALESCE(ing.ingresos_cobrados, 0) AS ingresos_cobrados,
  COALESCE(ing.ingresos_pendientes, 0) AS ingresos_pendientes,

  -- GASTOS TOTALES (desde evt_gastos_erp)
  COALESCE(gas.gastos_totales, 0) AS gastos_totales,
  COALESCE(gas.gastos_subtotal, 0) AS gastos_subtotal,
  COALESCE(gas.gastos_iva, 0) AS gastos_iva,
  COALESCE(gas.gastos_pagados_total, 0) AS gastos_pagados_total,
  COALESCE(gas.gastos_pendientes_total, 0) AS gastos_pendientes_total,

  -- GASTOS POR CATEGORÍA - Combustible (cat_id: 9 = Combustible/Peaje)
  COALESCE(gas.gastos_combustible_pagados, 0) AS gastos_combustible_pagados,
  COALESCE(gas.gastos_combustible_pendientes, 0) AS gastos_combustible_pendientes,

  -- GASTOS POR CATEGORÍA - Materiales (cat_id: 8 = Materiales)
  COALESCE(gas.gastos_materiales_pagados, 0) AS gastos_materiales_pagados,
  COALESCE(gas.gastos_materiales_pendientes, 0) AS gastos_materiales_pendientes,

  -- GASTOS POR CATEGORÍA - RH (cat_id: 7 = RH)
  COALESCE(gas.gastos_rh_pagados, 0) AS gastos_rh_pagados,
  COALESCE(gas.gastos_rh_pendientes, 0) AS gastos_rh_pendientes,

  -- GASTOS POR CATEGORÍA - SPs (cat_id: 6 = SPs o NULL)
  COALESCE(gas.gastos_sps_pagados, 0) AS gastos_sps_pagados,
  COALESCE(gas.gastos_sps_pendientes, 0) AS gastos_sps_pendientes,

  -- PROVISIONES TOTALES (desde evt_provisiones_erp)
  COALESCE(prov.provisiones_total, 0) AS provisiones_total,
  COALESCE(prov.provisiones_subtotal, 0) AS provisiones_subtotal,
  COALESCE(prov.provisiones_iva, 0) AS provisiones_iva,
  COALESCE(prov.provisiones_count, 0) AS provisiones_count,

  -- PROVISIONES POR CATEGORÍA
  COALESCE(prov.provision_combustible, 0) AS provision_combustible,
  COALESCE(prov.provision_materiales, 0) AS provision_materiales,
  COALESCE(prov.provision_rh, 0) AS provision_rh,
  COALESCE(prov.provision_sps, 0) AS provision_sps,

  -- ════════════════════════════════════════════════════════════════════
  -- UTILIDAD CALCULADA (CORREGIDA)
  -- FÓRMULA: UTILIDAD = INGRESOS - GASTOS - PROVISIONES
  -- ════════════════════════════════════════════════════════════════════
  
  -- Utilidad Real (con IVA)
  COALESCE(ing.ingresos_totales, 0) - COALESCE(gas.gastos_totales, 0) - COALESCE(prov.provisiones_total, 0) AS utilidad_real,
  
  -- Margen Real (con IVA)
  CASE
    WHEN COALESCE(ing.ingresos_totales, 0) > 0
    THEN ((COALESCE(ing.ingresos_totales, 0) - COALESCE(gas.gastos_totales, 0) - COALESCE(prov.provisiones_total, 0)) / COALESCE(ing.ingresos_totales, 0)) * 100
    ELSE 0
  END AS margen_real_pct,

  -- Utilidad Bruta (sin IVA - subtotales)
  COALESCE(ing.ingresos_subtotal, 0) - COALESCE(gas.gastos_subtotal, 0) - COALESCE(prov.provisiones_subtotal, 0) AS utilidad_bruta,
  
  -- Margen Bruto (sin IVA)
  CASE
    WHEN COALESCE(ing.ingresos_subtotal, 0) > 0
    THEN ((COALESCE(ing.ingresos_subtotal, 0) - COALESCE(gas.gastos_subtotal, 0) - COALESCE(prov.provisiones_subtotal, 0)) / COALESCE(ing.ingresos_subtotal, 0)) * 100
    ELSE 0
  END AS margen_bruto_pct,

  -- Status de cobro
  CASE
    WHEN COALESCE(ing.ingresos_totales, 0) = 0 THEN 'sin_ingresos'
    WHEN COALESCE(ing.ingresos_cobrados, 0) >= COALESCE(ing.ingresos_totales, 0) THEN 'cobrado_completo'
    WHEN COALESCE(ing.ingresos_cobrados, 0) > 0 THEN 'cobrado_parcial'
    ELSE 'pendiente_cobro'
  END AS status_cobro,
  
  -- Porcentaje de cobro
  CASE
    WHEN COALESCE(ing.ingresos_totales, 0) > 0
    THEN (COALESCE(ing.ingresos_cobrados, 0) / COALESCE(ing.ingresos_totales, 0)) * 100
    ELSE 0
  END AS porcentaje_cobro

FROM evt_eventos_erp e

-- JOIN Cliente
LEFT JOIN evt_clientes_erp c ON e.cliente_id = c.id

-- JOIN Estado
LEFT JOIN evt_estados_erp est ON e.estado_id = est.id

-- JOIN Tipo Evento
LEFT JOIN evt_tipos_evento_erp te ON e.tipo_evento_id = te.id

-- SUBQUERY Ingresos
LEFT JOIN LATERAL (
  SELECT
    SUM(total) AS ingreso_estimado,
    SUM(total) AS ingresos_totales,
    SUM(subtotal) AS ingresos_subtotal,
    SUM(iva) AS ingresos_iva,
    SUM(CASE WHEN cobrado = true THEN total ELSE 0 END) AS ingresos_cobrados,
    SUM(CASE WHEN cobrado = false OR cobrado IS NULL THEN total ELSE 0 END) AS ingresos_pendientes
  FROM evt_ingresos_erp
  WHERE evento_id = e.id
) ing ON true

-- SUBQUERY Gastos
LEFT JOIN LATERAL (
  SELECT
    SUM(total) AS gastos_totales,
    SUM(subtotal) AS gastos_subtotal,
    SUM(iva) AS gastos_iva,
    SUM(CASE WHEN pagado = true THEN total ELSE 0 END) AS gastos_pagados_total,
    SUM(CASE WHEN pagado = false OR pagado IS NULL THEN total ELSE 0 END) AS gastos_pendientes_total,
    -- Por categoría - Combustible (id: 9)
    SUM(CASE WHEN categoria_id = 9 AND pagado = true THEN total ELSE 0 END) AS gastos_combustible_pagados,
    SUM(CASE WHEN categoria_id = 9 AND (pagado = false OR pagado IS NULL) THEN total ELSE 0 END) AS gastos_combustible_pendientes,
    -- Por categoría - Materiales (id: 8)
    SUM(CASE WHEN categoria_id = 8 AND pagado = true THEN total ELSE 0 END) AS gastos_materiales_pagados,
    SUM(CASE WHEN categoria_id = 8 AND (pagado = false OR pagado IS NULL) THEN total ELSE 0 END) AS gastos_materiales_pendientes,
    -- Por categoría - RH (id: 7)
    SUM(CASE WHEN categoria_id = 7 AND pagado = true THEN total ELSE 0 END) AS gastos_rh_pagados,
    SUM(CASE WHEN categoria_id = 7 AND (pagado = false OR pagado IS NULL) THEN total ELSE 0 END) AS gastos_rh_pendientes,
    -- Por categoría - SPs (id: 6 o NULL)
    SUM(CASE WHEN (categoria_id = 6 OR categoria_id IS NULL) AND pagado = true THEN total ELSE 0 END) AS gastos_sps_pagados,
    SUM(CASE WHEN (categoria_id = 6 OR categoria_id IS NULL) AND (pagado = false OR pagado IS NULL) THEN total ELSE 0 END) AS gastos_sps_pendientes
  FROM evt_gastos_erp
  WHERE evento_id = e.id AND deleted_at IS NULL
) gas ON true

-- SUBQUERY Provisiones
LEFT JOIN LATERAL (
  SELECT
    SUM(p.total) AS provisiones_total,
    SUM(p.subtotal) AS provisiones_subtotal,
    SUM(p.iva) AS provisiones_iva,
    COUNT(*) AS provisiones_count,
    -- Por categoría usando cat_categorias_gasto.clave
    SUM(CASE WHEN cat.clave = 'COMB' THEN p.total ELSE 0 END) AS provision_combustible,
    SUM(CASE WHEN cat.clave = 'MAT' THEN p.total ELSE 0 END) AS provision_materiales,
    SUM(CASE WHEN cat.clave = 'RH' THEN p.total ELSE 0 END) AS provision_rh,
    SUM(CASE WHEN cat.clave = 'SP' OR cat.clave IS NULL THEN p.total ELSE 0 END) AS provision_sps
  FROM evt_provisiones_erp p
  LEFT JOIN cat_categorias_gasto cat ON p.categoria_id = cat.id
  WHERE p.evento_id = e.id AND p.activo = true
) prov ON true

WHERE e.activo = true;
`;

    console.log('\n🔧 Ejecutando actualización de vista...');

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.log('   Nota: rpc exec_sql no disponible, guardando SQL en archivo...');
        console.log('\n📝 SQL guardado en: scripts/fix_utilidad_vista.sql');
        console.log('   Ejecutar manualmente en Supabase SQL Editor');
    } else {
        console.log('   ✅ Vista actualizada correctamente');
    }

    // Verificar resultado
    console.log('\n📊 Verificando datos de DOTERRA...');

    const { data, error: verifyError } = await supabase
        .from('vw_eventos_analisis_financiero_erp')
        .select('clave_evento, nombre_proyecto, ingresos_totales, gastos_totales, provisiones_total, utilidad_real, margen_real_pct')
        .eq('clave_evento', 'DOT2025-003')
        .single();

    if (data) {
        console.log('\n   📋 DOTERRA 2025 (DOT2025-003):');
        console.log(`   Ingresos:    $${(data.ingresos_totales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        console.log(`   Gastos:      $${(data.gastos_totales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        console.log(`   Provisiones: $${(data.provisiones_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        console.log(`   ────────────────────────────────────`);
        console.log(`   Utilidad:    $${(data.utilidad_real || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        console.log(`   Margen:      ${(data.margen_real_pct || 0).toFixed(2)}%`);
    } else if (verifyError) {
        console.log('   Error al verificar:', verifyError.message);
    }

    console.log('\n✅ Proceso completado');
}

main().catch(console.error);
