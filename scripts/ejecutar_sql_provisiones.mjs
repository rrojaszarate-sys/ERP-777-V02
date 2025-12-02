/**
 * Ejecuta el SQL para actualizar la vista vw_eventos_analisis_financiero_erp
 * con el nuevo concepto: Provisiones = Gastos pendientes de pago
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function ejecutarSQL() {
  console.log('🔧 Ejecutando actualización de vista...\n');
  console.log('📋 Concepto: Provisiones = Gastos pendientes de pago');
  console.log('📋 Fórmula: Utilidad = Ingresos - (Gastos + Provisiones)\n');

  // SQL para recrear la vista
  const sqlVista = `
DROP VIEW IF EXISTS vw_eventos_analisis_financiero_erp;

CREATE OR REPLACE VIEW vw_eventos_analisis_financiero_erp AS
SELECT
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
  e.cliente_id,
  c.razon_social AS cliente_nombre,
  c.nombre_comercial AS cliente_comercial,
  c.rfc AS cliente_rfc,
  e.estado_id,
  est.nombre AS estado_nombre,
  est.color AS estado_color,
  e.tipo_evento_id,
  te.nombre AS tipo_evento_nombre,
  te.color AS tipo_evento_color,
  COALESCE(e.ingreso_estimado, 0) AS ingreso_estimado,
  COALESCE(ing.ingresos_totales, 0) AS ingresos_totales,
  COALESCE(ing.ingresos_cobrados, 0) AS ingresos_cobrados,
  COALESCE(ing.ingresos_pendientes, 0) AS ingresos_pendientes,
  COALESCE(gas.gastos_totales, 0) AS gastos_totales,
  COALESCE(gas.gastos_pagados_total, 0) AS gastos_pagados_total,
  COALESCE(gas.gastos_pendientes_total, 0) AS gastos_pendientes_total,
  COALESCE(gas.gastos_combustible_pagados, 0) AS gastos_combustible_pagados,
  COALESCE(gas.gastos_combustible_pendientes, 0) AS gastos_combustible_pendientes,
  COALESCE(gas.gastos_materiales_pagados, 0) AS gastos_materiales_pagados,
  COALESCE(gas.gastos_materiales_pendientes, 0) AS gastos_materiales_pendientes,
  COALESCE(gas.gastos_rh_pagados, 0) AS gastos_rh_pagados,
  COALESCE(gas.gastos_rh_pendientes, 0) AS gastos_rh_pendientes,
  COALESCE(gas.gastos_sps_pagados, 0) AS gastos_sps_pagados,
  COALESCE(gas.gastos_sps_pendientes, 0) AS gastos_sps_pendientes,
  COALESCE(prov.provisiones_total, 0) AS provisiones_total,
  COALESCE(prov.provisiones_count, 0) AS provisiones_count,
  COALESCE(prov.provision_combustible, 0) AS provision_combustible,
  COALESCE(prov.provision_materiales, 0) AS provision_materiales,
  COALESCE(prov.provision_rh, 0) AS provision_rh,
  COALESCE(prov.provision_sps, 0) AS provision_sps,
  (COALESCE(gas.gastos_totales, 0) + COALESCE(prov.provisiones_total, 0)) AS total_egresos,
  (COALESCE(ing.ingresos_totales, 0) - COALESCE(gas.gastos_totales, 0) - COALESCE(prov.provisiones_total, 0)) AS utilidad_real,
  CASE
    WHEN COALESCE(ing.ingresos_totales, 0) > 0
    THEN ((COALESCE(ing.ingresos_totales, 0) - COALESCE(gas.gastos_totales, 0) - COALESCE(prov.provisiones_total, 0)) / COALESCE(ing.ingresos_totales, 0)) * 100
    ELSE 0
  END AS margen_real_pct
FROM evt_eventos_erp e
LEFT JOIN evt_clientes_erp c ON e.cliente_id = c.id
LEFT JOIN evt_estados_erp est ON e.estado_id = est.id
LEFT JOIN evt_tipos_evento_erp te ON e.tipo_evento_id = te.id
LEFT JOIN LATERAL (
  SELECT
    SUM(total) AS ingresos_totales,
    SUM(CASE WHEN cobrado = true THEN total ELSE 0 END) AS ingresos_cobrados,
    SUM(CASE WHEN cobrado = false OR cobrado IS NULL THEN total ELSE 0 END) AS ingresos_pendientes
  FROM evt_ingresos_erp
  WHERE evento_id = e.id AND deleted_at IS NULL
) ing ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(total) AS gastos_totales,
    SUM(CASE WHEN pagado = true THEN total ELSE 0 END) AS gastos_pagados_total,
    SUM(CASE WHEN pagado = false OR pagado IS NULL THEN total ELSE 0 END) AS gastos_pendientes_total,
    SUM(CASE WHEN categoria_id = 9 AND pagado = true THEN total ELSE 0 END) AS gastos_combustible_pagados,
    SUM(CASE WHEN categoria_id = 9 AND (pagado = false OR pagado IS NULL) THEN total ELSE 0 END) AS gastos_combustible_pendientes,
    SUM(CASE WHEN categoria_id = 8 AND pagado = true THEN total ELSE 0 END) AS gastos_materiales_pagados,
    SUM(CASE WHEN categoria_id = 8 AND (pagado = false OR pagado IS NULL) THEN total ELSE 0 END) AS gastos_materiales_pendientes,
    SUM(CASE WHEN categoria_id = 7 AND pagado = true THEN total ELSE 0 END) AS gastos_rh_pagados,
    SUM(CASE WHEN categoria_id = 7 AND (pagado = false OR pagado IS NULL) THEN total ELSE 0 END) AS gastos_rh_pendientes,
    SUM(CASE WHEN (categoria_id = 6 OR categoria_id IS NULL) AND pagado = true THEN total ELSE 0 END) AS gastos_sps_pagados,
    SUM(CASE WHEN (categoria_id = 6 OR categoria_id IS NULL) AND (pagado = false OR pagado IS NULL) THEN total ELSE 0 END) AS gastos_sps_pendientes
  FROM evt_gastos_erp
  WHERE evento_id = e.id AND deleted_at IS NULL
) gas ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(p.total) AS provisiones_total,
    COUNT(*) AS provisiones_count,
    SUM(CASE WHEN cat.clave = 'COMB' THEN p.total ELSE 0 END) AS provision_combustible,
    SUM(CASE WHEN cat.clave = 'MAT' THEN p.total ELSE 0 END) AS provision_materiales,
    SUM(CASE WHEN cat.clave = 'RH' THEN p.total ELSE 0 END) AS provision_rh,
    SUM(CASE WHEN cat.clave = 'SP' OR cat.clave IS NULL THEN p.total ELSE 0 END) AS provision_sps
  FROM evt_provisiones_erp p
  LEFT JOIN cat_categorias_gasto cat ON p.categoria_id = cat.id
  WHERE p.evento_id = e.id AND p.activo = true
) prov ON true;
  `;

  try {
    // Ejecutar el SQL usando la función RPC exec_sql si existe
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlVista });

    if (error) {
      console.log('⚠️ La función RPC exec_sql no está disponible.');
      console.log('   Error:', error.message);
      console.log('\n📌 Ejecutando directamente via REST API...\n');

      // Intentar ejecutar directamente a través de la API REST de Supabase
      // Esto requiere permisos de service_role
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sql_query: sqlVista })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      console.log('✅ Vista actualizada correctamente via REST API');
    } else {
      console.log('✅ Vista actualizada correctamente via RPC');
      if (data) console.log('   Resultado:', data);
    }

    // Verificar que la vista funciona
    console.log('\n🔍 Verificando la vista actualizada...\n');

    const { data: eventos, error: errVerif } = await supabase
      .from('vw_eventos_analisis_financiero_erp')
      .select('id, clave_evento, nombre_proyecto, ingresos_totales, gastos_totales, provisiones_total, total_egresos, utilidad_real, margen_real_pct')
      .limit(5);

    if (errVerif) {
      console.log('⚠️ Error al verificar vista:', errVerif.message);
      console.log('\n📋 El SQL debe ejecutarse manualmente en Supabase SQL Editor.');
      console.log('   Archivo: sql/FIX_PROVISIONES_COMO_GASTOS.sql\n');
    } else {
      console.log('✅ Vista verificada correctamente\n');
      console.log('📊 Muestra de datos:');
      console.log('─'.repeat(100));

      if (eventos && eventos.length > 0) {
        eventos.forEach(e => {
          console.log(`${e.clave_evento || 'N/A'} | ${(e.nombre_proyecto || '').substring(0, 30).padEnd(30)} | Ing: $${(e.ingresos_totales || 0).toLocaleString().padStart(12)} | Gas: $${(e.gastos_totales || 0).toLocaleString().padStart(12)} | Prov: $${(e.provisiones_total || 0).toLocaleString().padStart(12)} | Egr: $${(e.total_egresos || 0).toLocaleString().padStart(12)} | Util: $${(e.utilidad_real || 0).toLocaleString().padStart(12)} | Mrg: ${(e.margen_real_pct || 0).toFixed(1)}%`);
        });
      } else {
        console.log('   (No hay eventos para mostrar)');
      }
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 El SQL debe ejecutarse manualmente en Supabase SQL Editor.');
    console.log('   Archivo: sql/FIX_PROVISIONES_COMO_GASTOS.sql\n');
  }
}

ejecutarSQL();
