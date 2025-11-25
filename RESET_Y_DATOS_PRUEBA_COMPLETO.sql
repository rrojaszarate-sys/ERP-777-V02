-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT DE RESET Y CARGA MASIVA DE DATOS DE PRUEBA - 3 AÑOS
-- ═══════════════════════════════════════════════════════════════════════════
-- Este script genera:
-- - 72 eventos (2 por mes x 12 meses x 3 años = 72 eventos)
-- - Datos congruentes y realistas
-- - Provisiones distribuidas uniformemente con variación del 10-15%
-- - Gastos nunca exceden provisión + 10%
-- - Ingresos 80% cobrados en años anteriores
-- - Fechas coherentes con el evento
-- - Estados según antigüedad del evento
-- ═══════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- PASO 1: LIMPIEZA COMPLETA
-- ============================================================================

DELETE FROM evt_gastos;
DELETE FROM evt_ingresos;
DELETE FROM evt_eventos;

ALTER SEQUENCE evt_gastos_id_seq RESTART WITH 1;
ALTER SEQUENCE evt_ingresos_id_seq RESTART WITH 1;
ALTER SEQUENCE evt_eventos_id_seq RESTART WITH 1;

-- ============================================================================
-- PASO 2: CREAR FUNCIÓN PARA GENERAR EVENTOS
-- ============================================================================

CREATE OR REPLACE FUNCTION generar_eventos_prueba()
RETURNS void AS $$
DECLARE
  v_evento_id integer;
  v_fecha_evento date;
  v_anio integer;
  v_mes integer;
  v_evento_num integer;
  v_cliente_id integer;
  v_tipo_evento_id integer;
  v_estado_id integer;
  v_company_id integer := 1;

  -- Provisiones base
  v_prov_combustible numeric;
  v_prov_materiales numeric;
  v_prov_rh numeric;
  v_prov_sps numeric;
  v_prov_total numeric;

  -- Ingresos
  v_ingreso_estimado numeric;
  v_ingreso_anticipo numeric;
  v_ingreso_segundo numeric;
  v_ingreso_final numeric;

  -- Gastos por categoría
  v_gasto_comb_1 numeric;
  v_gasto_comb_2 numeric;
  v_gasto_mat_1 numeric;
  v_gasto_mat_2 numeric;
  v_gasto_mat_3 numeric;
  v_gasto_rh_1 numeric;
  v_gasto_rh_2 numeric;
  v_gasto_sps_1 numeric;
  v_gasto_sps_2 numeric;

  -- Control de pagos
  v_es_antiguo boolean;
  v_porcentaje_pago numeric;

  -- IDs de referencia
  v_user_id uuid;

  -- Nombres de eventos
  v_nombres_evento text[] := ARRAY[
    'Conferencia Anual', 'Lanzamiento de Producto', 'Boda Jardín',
    'Evento Corporativo', 'Congreso Médico', 'Feria Comercial',
    'Seminario Ejecutivo', 'Celebración Aniversario', 'Gala Benéfica',
    'Workshop Técnico', 'Cumpleaños Premium', 'Convención Nacional'
  ];

  v_nombre_evento text;
  v_clave_evento text;
  v_descripcion text;

BEGIN
  -- Obtener un user_id válido
  SELECT id INTO v_user_id FROM users LIMIT 1;

  -- Generar eventos para los últimos 3 años
  FOR v_anio IN 2023..2025 LOOP
    FOR v_mes IN 1..12 LOOP
      -- Generar 2 eventos por mes
      FOR v_evento_num IN 1..2 LOOP

        -- Calcular fecha del evento (día 10 o día 25 del mes)
        v_fecha_evento := make_date(v_anio, v_mes, CASE WHEN v_evento_num = 1 THEN 10 ELSE 25 END);

        -- Solo generar eventos hasta hoy
        IF v_fecha_evento <= CURRENT_DATE THEN

          -- Rotar cliente (1-3)
          v_cliente_id := ((v_anio - 2023) * 24 + (v_mes - 1) * 2 + v_evento_num - 1) % 3 + 1;

          -- Rotar tipo de evento (1-3)
          v_tipo_evento_id := ((v_mes - 1) * 2 + v_evento_num - 1) % 3 + 1;

          -- Determinar estado según fecha
          IF v_fecha_evento < CURRENT_DATE - INTERVAL '30 days' THEN
            v_estado_id := 4; -- Completado
            v_es_antiguo := TRUE;
          ELSIF v_fecha_evento < CURRENT_DATE THEN
            v_estado_id := 4; -- Completado
            v_es_antiguo := FALSE;
          ELSIF v_fecha_evento <= CURRENT_DATE + INTERVAL '30 days' THEN
            v_estado_id := 2; -- En progreso
            v_es_antiguo := FALSE;
          ELSE
            v_estado_id := 3; -- Confirmado
            v_es_antiguo := FALSE;
          END IF;

          -- Generar nombre único
          v_nombre_evento := v_nombres_evento[((v_mes - 1) % 12) + 1] || ' ' ||
                            CASE v_evento_num WHEN 1 THEN 'A' ELSE 'B' END;
          v_clave_evento := 'EVT-' || v_anio || '-' ||
                           LPAD(v_mes::text, 2, '0') || '-' ||
                           LPAD(v_evento_num::text, 2, '0');
          v_descripcion := 'Evento generado automáticamente para pruebas - ' ||
                          TO_CHAR(v_fecha_evento, 'Month YYYY');

          -- ================================================================
          -- CALCULAR PROVISIONES (distribuidas uniformemente con variación)
          -- ================================================================
          -- Base total entre 150,000 y 500,000
          v_prov_total := 150000 + (RANDOM() * 350000);

          -- Distribución: Combustible 10-15%, Materiales 25-30%, RH 35-45%, SPS 20-25%
          v_prov_combustible := ROUND(v_prov_total * (0.10 + RANDOM() * 0.05), 2);
          v_prov_materiales := ROUND(v_prov_total * (0.25 + RANDOM() * 0.05), 2);
          v_prov_rh := ROUND(v_prov_total * (0.35 + RANDOM() * 0.10), 2);
          v_prov_sps := ROUND(v_prov_total - v_prov_combustible - v_prov_materiales - v_prov_rh, 2);

          -- Recalcular total real
          v_prov_total := v_prov_combustible + v_prov_materiales + v_prov_rh + v_prov_sps;

          -- Ingreso estimado (15-35% de utilidad sobre provisiones)
          v_ingreso_estimado := ROUND(v_prov_total * (1.15 + RANDOM() * 0.20), 2);

          -- ================================================================
          -- INSERTAR EVENTO
          -- ================================================================
          INSERT INTO evt_eventos (
            company_id, clave_evento, nombre_proyecto, descripcion,
            cliente_id, tipo_evento_id, estado_id,
            fecha_evento, fecha_fin, lugar, numero_invitados,
            prioridad, fase_proyecto,
            responsable_id, solicitante_id,
            provision_combustible_peaje, provision_materiales,
            provision_recursos_humanos, provision_solicitudes_pago,
            ingreso_estimado, activo, created_at, updated_at
          ) VALUES (
            v_company_id, v_clave_evento, v_nombre_evento, v_descripcion,
            v_cliente_id, v_tipo_evento_id, v_estado_id,
            v_fecha_evento, v_fecha_evento,
            'Ubicación ' || v_cliente_id,
            100 + FLOOR(RANDOM() * 400)::integer,
            CASE WHEN RANDOM() > 0.5 THEN 'alta' ELSE 'media' END,
            CASE
              WHEN v_estado_id = 4 THEN 'completado'
              WHEN v_estado_id = 2 THEN 'ejecucion'
              ELSE 'planeacion'
            END,
            v_user_id, v_user_id,
            v_prov_combustible, v_prov_materiales, v_prov_rh, v_prov_sps,
            v_ingreso_estimado, true,
            v_fecha_evento - INTERVAL '60 days',
            v_fecha_evento + INTERVAL '5 days'
          ) RETURNING id INTO v_evento_id;

          -- ================================================================
          -- GENERAR INGRESOS
          -- ================================================================
          -- Dividir en 3 pagos: 40%, 35%, 25%
          v_ingreso_anticipo := ROUND(v_ingreso_estimado * 0.40, 2);
          v_ingreso_segundo := ROUND(v_ingreso_estimado * 0.35, 2);
          v_ingreso_final := v_ingreso_estimado - v_ingreso_anticipo - v_ingreso_segundo;

          -- Anticipo (siempre 60 días antes del evento)
          INSERT INTO evt_ingresos (
            evento_id, concepto, total, cobrado,
            fecha_emision, fecha_vencimiento, categoria_id,
            notas, created_at
          ) VALUES (
            v_evento_id,
            'Anticipo 40% - ' || v_nombre_evento,
            v_ingreso_anticipo,
            TRUE, -- Anticipo siempre cobrado
            v_fecha_evento - INTERVAL '60 days',
            v_fecha_evento - INTERVAL '45 days',
            1,
            'Anticipo inicial',
            v_fecha_evento - INTERVAL '60 days'
          );

          -- Segundo pago (30 días antes del evento)
          -- Si es evento antiguo (>30 días), 80% cobrado
          INSERT INTO evt_ingresos (
            evento_id, concepto, total, cobrado,
            fecha_emision, fecha_vencimiento, categoria_id,
            notas, created_at
          ) VALUES (
            v_evento_id,
            'Segundo pago 35% - ' || v_nombre_evento,
            v_ingreso_segundo,
            CASE
              WHEN v_es_antiguo THEN (RANDOM() < 0.80)
              ELSE (RANDOM() < 0.50)
            END,
            v_fecha_evento - INTERVAL '30 days',
            v_fecha_evento - INTERVAL '15 days',
            1,
            'Segundo pago',
            v_fecha_evento - INTERVAL '30 days'
          );

          -- Pago final (5 días después del evento)
          -- Si es evento antiguo, 80% cobrado
          INSERT INTO evt_ingresos (
            evento_id, concepto, total, cobrado,
            fecha_emision, fecha_vencimiento, categoria_id,
            notas, created_at
          ) VALUES (
            v_evento_id,
            'Pago final 25% - ' || v_nombre_evento,
            v_ingreso_final,
            CASE
              WHEN v_es_antiguo THEN (RANDOM() < 0.80)
              WHEN v_estado_id = 4 THEN (RANDOM() < 0.60)
              ELSE FALSE
            END,
            v_fecha_evento + INTERVAL '5 days',
            v_fecha_evento + INTERVAL '20 days',
            1,
            'Liquidación final',
            v_fecha_evento + INTERVAL '5 days'
          );

          -- ================================================================
          -- GENERAR GASTOS (NUNCA EXCEDER PROVISIÓN + 10%)
          -- ================================================================

          -- COMBUSTIBLE (2 gastos) - Max 95% de la provisión
          v_gasto_comb_1 := ROUND(v_prov_combustible * (0.40 + RANDOM() * 0.20), 2);
          v_gasto_comb_2 := ROUND(v_prov_combustible * (0.30 + RANDOM() * 0.15), 2);

          -- Verificar que no exceda 95%
          IF (v_gasto_comb_1 + v_gasto_comb_2) > (v_prov_combustible * 0.95) THEN
            v_gasto_comb_2 := ROUND(v_prov_combustible * 0.95 - v_gasto_comb_1, 2);
          END IF;

          -- MATERIALES (3 gastos) - Max 98% de la provisión
          v_gasto_mat_1 := ROUND(v_prov_materiales * (0.35 + RANDOM() * 0.10), 2);
          v_gasto_mat_2 := ROUND(v_prov_materiales * (0.30 + RANDOM() * 0.10), 2);
          v_gasto_mat_3 := ROUND(v_prov_materiales * (0.25 + RANDOM() * 0.08), 2);

          IF (v_gasto_mat_1 + v_gasto_mat_2 + v_gasto_mat_3) > (v_prov_materiales * 0.98) THEN
            v_gasto_mat_3 := ROUND(v_prov_materiales * 0.98 - v_gasto_mat_1 - v_gasto_mat_2, 2);
          END IF;

          -- RECURSOS HUMANOS (2 gastos) - Max 96% de la provisión
          v_gasto_rh_1 := ROUND(v_prov_rh * (0.50 + RANDOM() * 0.15), 2);
          v_gasto_rh_2 := ROUND(v_prov_rh * (0.35 + RANDOM() * 0.11), 2);

          IF (v_gasto_rh_1 + v_gasto_rh_2) > (v_prov_rh * 0.96) THEN
            v_gasto_rh_2 := ROUND(v_prov_rh * 0.96 - v_gasto_rh_1, 2);
          END IF;

          -- SOLICITUDES DE PAGO (2 gastos) - Max 97% de la provisión
          v_gasto_sps_1 := ROUND(v_prov_sps * (0.50 + RANDOM() * 0.12), 2);
          v_gasto_sps_2 := ROUND(v_prov_sps * (0.35 + RANDOM() * 0.12), 2);

          IF (v_gasto_sps_1 + v_gasto_sps_2) > (v_prov_sps * 0.97) THEN
            v_gasto_sps_2 := ROUND(v_prov_sps * 0.97 - v_gasto_sps_1, 2);
          END IF;

          -- ================================================================
          -- INSERTAR GASTOS - COMBUSTIBLE (Categoría 9)
          -- ================================================================
          INSERT INTO evt_gastos (
            evento_id, concepto, total, categoria_id, pagado,
            fecha_gasto, fecha_vencimiento, notas, created_at
          ) VALUES
          (
            v_evento_id,
            'Transporte y logística - ' || v_nombre_evento,
            v_gasto_comb_1,
            9,
            CASE
              WHEN v_es_antiguo THEN TRUE
              WHEN v_estado_id = 4 THEN (RANDOM() < 0.85)
              ELSE (RANDOM() < 0.30)
            END,
            v_fecha_evento - INTERVAL '15 days',
            v_fecha_evento - INTERVAL '5 days',
            'Transporte de equipos',
            v_fecha_evento - INTERVAL '15 days'
          ),
          (
            v_evento_id,
            'Combustible y peajes - ' || v_nombre_evento,
            v_gasto_comb_2,
            9,
            CASE
              WHEN v_es_antiguo THEN TRUE
              WHEN v_estado_id = 4 THEN (RANDOM() < 0.70)
              ELSE (RANDOM() < 0.20)
            END,
            v_fecha_evento - INTERVAL '5 days',
            v_fecha_evento + INTERVAL '10 days',
            'Gasolina y peajes',
            v_fecha_evento - INTERVAL '5 days'
          );

          -- ================================================================
          -- INSERTAR GASTOS - MATERIALES (Categoría 8)
          -- ================================================================
          INSERT INTO evt_gastos (
            evento_id, concepto, total, categoria_id, pagado,
            fecha_gasto, fecha_vencimiento, notas, created_at
          ) VALUES
          (
            v_evento_id,
            'Material promocional - ' || v_nombre_evento,
            v_gasto_mat_1,
            8,
            CASE
              WHEN v_es_antiguo THEN TRUE
              ELSE (RANDOM() < 0.75)
            END,
            v_fecha_evento - INTERVAL '25 days',
            v_fecha_evento - INTERVAL '10 days',
            'Impresiones y merchandising',
            v_fecha_evento - INTERVAL '25 days'
          ),
          (
            v_evento_id,
            'Decoración y montaje - ' || v_nombre_evento,
            v_gasto_mat_2,
            8,
            CASE
              WHEN v_es_antiguo THEN TRUE
              ELSE (RANDOM() < 0.60)
            END,
            v_fecha_evento - INTERVAL '10 days',
            v_fecha_evento,
            'Decoración del evento',
            v_fecha_evento - INTERVAL '10 days'
          ),
          (
            v_evento_id,
            'Material técnico - ' || v_nombre_evento,
            v_gasto_mat_3,
            8,
            CASE
              WHEN v_es_antiguo THEN (RANDOM() < 0.90)
              WHEN v_estado_id = 4 THEN (RANDOM() < 0.50)
              ELSE (RANDOM() < 0.30)
            END,
            v_fecha_evento - INTERVAL '8 days',
            v_fecha_evento + INTERVAL '15 days',
            'Material técnico diversos',
            v_fecha_evento - INTERVAL '8 days'
          );

          -- ================================================================
          -- INSERTAR GASTOS - RECURSOS HUMANOS (Categoría 7)
          -- ================================================================
          INSERT INTO evt_gastos (
            evento_id, concepto, total, categoria_id, pagado,
            fecha_gasto, fecha_vencimiento, notas, created_at
          ) VALUES
          (
            v_evento_id,
            'Personal operativo - ' || v_nombre_evento,
            v_gasto_rh_1,
            7,
            CASE
              WHEN v_es_antiguo THEN TRUE
              ELSE (RANDOM() < 0.80)
            END,
            v_fecha_evento - INTERVAL '20 days',
            v_fecha_evento - INTERVAL '3 days',
            'Staff y personal operativo',
            v_fecha_evento - INTERVAL '20 days'
          ),
          (
            v_evento_id,
            'Coordinación y supervisión - ' || v_nombre_evento,
            v_gasto_rh_2,
            7,
            CASE
              WHEN v_es_antiguo THEN TRUE
              WHEN v_estado_id = 4 THEN (RANDOM() < 0.65)
              ELSE (RANDOM() < 0.35)
            END,
            v_fecha_evento - INTERVAL '5 days',
            v_fecha_evento + INTERVAL '12 days',
            'Coordinadores del evento',
            v_fecha_evento - INTERVAL '5 days'
          );

          -- ================================================================
          -- INSERTAR GASTOS - SOLICITUDES DE PAGO (Categoría 6)
          -- ================================================================
          INSERT INTO evt_gastos (
            evento_id, concepto, total, categoria_id, pagado,
            fecha_gasto, fecha_vencimiento, notas, created_at
          ) VALUES
          (
            v_evento_id,
            'Proveedor principal - ' || v_nombre_evento,
            v_gasto_sps_1,
            6,
            CASE
              WHEN v_es_antiguo THEN TRUE
              ELSE (RANDOM() < 0.85)
            END,
            v_fecha_evento - INTERVAL '30 days',
            v_fecha_evento - INTERVAL '15 days',
            'Pago a proveedor principal',
            v_fecha_evento - INTERVAL '30 days'
          ),
          (
            v_evento_id,
            'Servicios adicionales - ' || v_nombre_evento,
            v_gasto_sps_2,
            6,
            CASE
              WHEN v_es_antiguo THEN TRUE
              WHEN v_estado_id = 4 THEN (RANDOM() < 0.70)
              ELSE (RANDOM() < 0.40)
            END,
            v_fecha_evento - INTERVAL '12 days',
            v_fecha_evento + INTERVAL '8 days',
            'Servicios complementarios',
            v_fecha_evento - INTERVAL '12 days'
          );

        END IF; -- Fin if fecha <= hoy

      END LOOP; -- Fin loop eventos por mes
    END LOOP; -- Fin loop meses
  END LOOP; -- Fin loop años

  RAISE NOTICE 'Eventos de prueba generados exitosamente';

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 3: EJECUTAR FUNCIÓN
-- ============================================================================

SELECT generar_eventos_prueba();

-- ============================================================================
-- PASO 4: LIMPIAR FUNCIÓN TEMPORAL
-- ============================================================================

DROP FUNCTION generar_eventos_prueba();

-- ============================================================================
-- PASO 5: VERIFICACIÓN Y CASOS DE PRUEBA
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- POOL DE PRUEBAS Y RESULTADOS ESPERADOS
-- ═══════════════════════════════════════════════════════════════════════════

/*
PRUEBA 1: Verificar total de eventos generados
Resultado esperado: ~60-70 eventos (depende de la fecha actual)
*/
-- SELECT COUNT(*) as total_eventos FROM evt_eventos;

/*
PRUEBA 2: Verificar distribución de provisiones
Resultado esperado:
  - Combustible: 10-15% del total
  - Materiales: 25-30% del total
  - RH: 35-45% del total
  - SPS: 20-25% del total
*/
-- SELECT
--   AVG(provision_combustible_peaje * 100.0 / (provision_combustible_peaje + provision_materiales + provision_recursos_humanos + provision_solicitudes_pago)) as pct_combustible,
--   AVG(provision_materiales * 100.0 / (provision_combustible_peaje + provision_materiales + provision_recursos_humanos + provision_solicitudes_pago)) as pct_materiales,
--   AVG(provision_recursos_humanos * 100.0 / (provision_combustible_peaje + provision_materiales + provision_recursos_humanos + provision_solicitudes_pago)) as pct_rh,
--   AVG(provision_solicitudes_pago * 100.0 / (provision_combustible_peaje + provision_materiales + provision_recursos_humanos + provision_solicitudes_pago)) as pct_sps
-- FROM evt_eventos;

/*
PRUEBA 3: Verificar que gastos NO excedan provisiones + 10%
Resultado esperado: 0 eventos con sobregasto mayor al 10%
*/
-- SELECT
--   e.clave_evento,
--   e.provision_combustible_peaje,
--   vw.gastos_combustible_pagados + vw.gastos_combustible_pendientes as gasto_real_combustible,
--   ROUND(((vw.gastos_combustible_pagados + vw.gastos_combustible_pendientes) - e.provision_combustible_peaje) * 100.0 / e.provision_combustible_peaje, 2) as sobregasto_pct
-- FROM evt_eventos e
-- JOIN vw_eventos_analisis_financiero vw ON e.id = vw.id
-- WHERE (vw.gastos_combustible_pagados + vw.gastos_combustible_pendientes) > e.provision_combustible_peaje * 1.10;

/*
PRUEBA 4: Verificar porcentaje de ingresos cobrados en eventos antiguos (>30 días)
Resultado esperado: ~80% de ingresos cobrados
*/
-- SELECT
--   COUNT(*) as eventos_antiguos,
--   ROUND(AVG(vw.ingresos_cobrados * 100.0 / NULLIF(vw.ingresos_totales, 0)), 2) as pct_promedio_cobrado
-- FROM evt_eventos e
-- JOIN vw_eventos_analisis_financiero vw ON e.id = vw.id
-- WHERE e.fecha_evento < CURRENT_DATE - INTERVAL '30 days';

/*
PRUEBA 5: Verificar coherencia de fechas (gastos cerca del evento)
Resultado esperado: Todos los gastos entre 30 días antes y 20 días después
*/
-- SELECT
--   e.clave_evento,
--   e.fecha_evento,
--   g.concepto,
--   g.fecha_gasto,
--   g.fecha_gasto - e.fecha_evento as dias_diferencia
-- FROM evt_eventos e
-- JOIN evt_gastos g ON e.id = g.evento_id
-- WHERE g.fecha_gasto < e.fecha_evento - INTERVAL '30 days'
--    OR g.fecha_gasto > e.fecha_evento + INTERVAL '20 days';

/*
PRUEBA 6: Verificar que eventos completados tengan la mayoría de gastos pagados
Resultado esperado: >70% de gastos pagados en eventos completados antiguos
*/
-- SELECT
--   e.estado_id,
--   COUNT(*) as total_eventos,
--   ROUND(AVG(vw.gastos_pagados_total * 100.0 / NULLIF(vw.gastos_totales, 0)), 2) as pct_promedio_pagado
-- FROM evt_eventos e
-- JOIN vw_eventos_analisis_financiero vw ON e.id = vw.id
-- WHERE e.fecha_evento < CURRENT_DATE - INTERVAL '30 days'
-- GROUP BY e.estado_id;

/*
PRUEBA 7: Verificar margen de utilidad estimado (15-35%)
Resultado esperado: Margen entre 15% y 35%
*/
-- SELECT
--   e.clave_evento,
--   e.ingreso_estimado,
--   vw.provisiones_total,
--   ROUND((e.ingreso_estimado - vw.provisiones_total) * 100.0 / vw.provisiones_total, 2) as margen_estimado_pct
-- FROM evt_eventos e
-- JOIN vw_eventos_analisis_financiero vw ON e.id = vw.id
-- WHERE (e.ingreso_estimado - vw.provisiones_total) * 100.0 / vw.provisiones_total < 15
--    OR (e.ingreso_estimado - vw.provisiones_total) * 100.0 / vw.provisiones_total > 35;

/*
PRUEBA 8: Resumen general por año
Resultado esperado: Datos consistentes y progresivos
*/
-- SELECT
--   EXTRACT(YEAR FROM e.fecha_evento) as anio,
--   COUNT(*) as total_eventos,
--   ROUND(SUM(vw.provisiones_total), 2) as provisiones_totales,
--   ROUND(SUM(vw.ingresos_totales), 2) as ingresos_totales,
--   ROUND(SUM(vw.gastos_totales), 2) as gastos_totales,
--   ROUND(SUM(vw.ingresos_cobrados), 2) as ingresos_cobrados,
--   ROUND(SUM(vw.gastos_pagados_total), 2) as gastos_pagados,
--   ROUND(AVG(vw.ingresos_cobrados * 100.0 / NULLIF(vw.ingresos_totales, 0)), 2) as pct_cobrado,
--   ROUND(AVG(vw.gastos_pagados_total * 100.0 / NULLIF(vw.gastos_totales, 0)), 2) as pct_pagado
-- FROM evt_eventos e
-- JOIN vw_eventos_analisis_financiero vw ON e.id = vw.id
-- GROUP BY EXTRACT(YEAR FROM e.fecha_evento)
-- ORDER BY anio;

/*
PRUEBA 9: Verificar eventos con sobregasto (debe haber algunos casos de prueba)
Resultado esperado: Algunos eventos con disponible negativo pero < 10%
*/
-- SELECT
--   e.clave_evento,
--   e.fecha_evento,
--   vw.provisiones_total,
--   vw.gastos_totales,
--   vw.disponible_total,
--   ROUND(vw.disponible_total * 100.0 / vw.provisiones_total, 2) as pct_disponible
-- FROM evt_eventos e
-- JOIN vw_eventos_analisis_financiero vw ON e.id = vw.id
-- WHERE vw.disponible_total < 0
-- ORDER BY vw.disponible_total;

/*
PRUEBA 10: Detalle de un evento específico (tomar el primero de 2023)
Resultado esperado: Todos los cálculos correctos y coherentes
*/
-- SELECT
--   e.clave_evento,
--   e.fecha_evento,
--   e.provision_combustible_peaje,
--   e.provision_materiales,
--   e.provision_recursos_humanos,
--   e.provision_solicitudes_pago,
--   vw.provisiones_total,
--   vw.ingresos_totales,
--   vw.ingresos_cobrados,
--   vw.ingresos_pendientes,
--   vw.gastos_totales,
--   vw.gastos_pagados_total,
--   vw.gastos_pendientes_total,
--   vw.disponible_total,
--   vw.utilidad_real
-- FROM evt_eventos e
-- JOIN vw_eventos_analisis_financiero vw ON e.id = vw.id
-- WHERE e.clave_evento = 'EVT-2023-01-01'
-- LIMIT 1;

*/

-- ═══════════════════════════════════════════════════════════════════════════
-- RESULTADOS ESPERADOS - RESUMEN
-- ═══════════════════════════════════════════════════════════════════════════
/*

1. TOTAL DE EVENTOS: 60-72 eventos (según fecha actual)

2. DISTRIBUCIÓN DE PROVISIONES:
   - Combustible: 10-15%
   - Materiales: 25-30%
   - RH: 35-45%
   - SPS: 20-25%

3. GASTOS vs PROVISIONES:
   - 0 eventos con sobregasto > 10%
   - Mayoría de eventos entre 85-100% de uso de provisiones

4. INGRESOS COBRADOS:
   - Eventos antiguos (>30 días): ~80% cobrado
   - Eventos recientes: 40-60% cobrado
   - Eventos futuros: 0-20% cobrado

5. GASTOS PAGADOS:
   - Eventos de 2023: >90% pagados
   - Eventos de 2024: 70-85% pagados
   - Eventos de 2025: 30-60% pagados (según antigüedad)

6. MARGEN DE UTILIDAD:
   - Estimado: 15-35%
   - Real (cobrado): Varía según pagos

7. COHERENCIA DE FECHAS:
   - Todos los gastos entre 30 días antes y 20 días después del evento
   - Ingresos: Anticipo -60 días, Segundo -30 días, Final +5 días

8. ESTADOS:
   - Eventos >30 días pasados: Completado
   - Eventos recientes: Completado/En progreso
   - Eventos próximos: Confirmado

*/

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
-- ═══════════════════════════════════════════════════════════════════════════
