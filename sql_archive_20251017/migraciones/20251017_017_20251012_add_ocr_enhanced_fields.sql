-- ============================================
-- Migración: Campos Mejorados para OCR
-- Fecha: 2025-10-12
-- Descripción: Agrega campos faltantes para
--              captura completa de datos OCR
-- ============================================

-- 1. Agregar campos nuevos a evt_gastos
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS detalle_compra TEXT,
  ADD COLUMN IF NOT EXISTS telefono_proveedor VARCHAR(20),
  ADD COLUMN IF NOT EXISTS folio_ticket VARCHAR(50),
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS tipo_comprobante VARCHAR(20) DEFAULT 'ticket',
  ADD COLUMN IF NOT EXISTS descuento NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS propina NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metodo_pago_detalle VARCHAR(50),
  ADD COLUMN IF NOT EXISTS num_productos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hora_compra TIME;

-- 2. Agregar índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_evt_gastos_folio_ticket
  ON evt_gastos(folio_ticket);

CREATE INDEX IF NOT EXISTS idx_evt_gastos_telefono_proveedor
  ON evt_gastos(telefono_proveedor);

CREATE INDEX IF NOT EXISTS idx_evt_gastos_tipo_comprobante
  ON evt_gastos(tipo_comprobante);

-- 3. Agregar comentarios descriptivos
COMMENT ON COLUMN evt_gastos.detalle_compra IS
  'Resumen estructurado de productos extraídos del ticket/factura';

COMMENT ON COLUMN evt_gastos.telefono_proveedor IS
  'Teléfono del establecimiento extraído del ticket';

COMMENT ON COLUMN evt_gastos.folio_ticket IS
  'Número de folio/ticket del comprobante';

COMMENT ON COLUMN evt_gastos.tipo_comprobante IS
  'Tipo de comprobante: ticket, factura, nota, otro';

COMMENT ON COLUMN evt_gastos.metodo_pago_detalle IS
  'Detalles del método de pago (últimos dígitos de tarjeta, banco, etc)';

COMMENT ON COLUMN evt_gastos.num_productos IS
  'Número de productos/items en el comprobante';

COMMENT ON COLUMN evt_gastos.hora_compra IS
  'Hora de la compra extraída del ticket';

COMMENT ON COLUMN evt_gastos.descuento IS
  'Descuento aplicado en la compra';

COMMENT ON COLUMN evt_gastos.propina IS
  'Propina incluida en el total';

-- 4. Agregar constraint para tipo_comprobante
ALTER TABLE evt_gastos
  DROP CONSTRAINT IF EXISTS check_tipo_comprobante;

ALTER TABLE evt_gastos
  ADD CONSTRAINT check_tipo_comprobante
  CHECK (tipo_comprobante IN ('ticket', 'factura', 'nota', 'otro'));

-- 5. Ampliar opciones de forma_pago
COMMENT ON COLUMN evt_gastos.forma_pago IS
  'Forma de pago: efectivo, transferencia, cheque, tarjeta, debito, credito, vales';

-- 6. Función trigger para auto-calcular num_productos desde detalle_compra
CREATE OR REPLACE FUNCTION calcular_num_productos()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.detalle_compra IS NOT NULL AND NEW.detalle_compra != '' THEN
    -- Contar líneas que empiezan con número seguido de punto (formato: "1. PRODUCTO")
    NEW.num_productos := (
      SELECT COUNT(*)
      FROM regexp_split_to_table(NEW.detalle_compra, E'\n') AS line
      WHERE line ~ '^\s*\d+\.\s+'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calcular_num_productos ON evt_gastos;

CREATE TRIGGER trigger_calcular_num_productos
  BEFORE INSERT OR UPDATE ON evt_gastos
  FOR EACH ROW
  EXECUTE FUNCTION calcular_num_productos();

-- 7. Vista para análisis de gastos con OCR
CREATE OR REPLACE VIEW vw_gastos_ocr_analytics AS
SELECT
  g.id,
  g.evento_id,
  g.concepto,
  g.proveedor,
  g.rfc_proveedor,
  g.total,
  g.num_productos,
  g.ocr_confianza,
  g.ocr_validado,
  g.tipo_comprobante,
  g.forma_pago,
  g.folio_ticket,
  g.telefono_proveedor,
  g.created_at,
  CASE
    WHEN g.ocr_confianza >= 90 THEN 'alta'
    WHEN g.ocr_confianza >= 70 THEN 'media'
    WHEN g.ocr_confianza >= 50 THEN 'baja'
    ELSE 'muy_baja'
  END AS calidad_ocr,
  CASE
    WHEN g.detalle_compra IS NOT NULL AND g.detalle_compra != '' THEN TRUE
    ELSE FALSE
  END AS tiene_detalle_productos,
  e.clave_evento,
  e.nombre_proyecto,
  c.nombre AS categoria_nombre
FROM evt_gastos g
LEFT JOIN evt_eventos e ON g.evento_id = e.id
LEFT JOIN evt_categorias_gastos c ON g.categoria_id = c.id
WHERE g.ocr_confianza IS NOT NULL
  AND g.activo = TRUE;

COMMENT ON VIEW vw_gastos_ocr_analytics IS
  'Vista analítica de gastos procesados con OCR para dashboards y reportes';

-- 8. Función para obtener estadísticas de OCR
CREATE OR REPLACE FUNCTION get_ocr_stats()
RETURNS TABLE (
  total_gastos_ocr BIGINT,
  promedio_confianza NUMERIC,
  con_productos BIGINT,
  sin_productos BIGINT,
  validados BIGINT,
  pendientes_validar BIGINT,
  por_tipo_comprobante JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_gastos_ocr,
    ROUND(AVG(ocr_confianza), 2) AS promedio_confianza,
    COUNT(CASE WHEN detalle_compra IS NOT NULL AND detalle_compra != '' THEN 1 END)::BIGINT AS con_productos,
    COUNT(CASE WHEN detalle_compra IS NULL OR detalle_compra = '' THEN 1 END)::BIGINT AS sin_productos,
    COUNT(CASE WHEN ocr_validado = TRUE THEN 1 END)::BIGINT AS validados,
    COUNT(CASE WHEN ocr_validado = FALSE THEN 1 END)::BIGINT AS pendientes_validar,
    (
      SELECT json_object_agg(tipo_comprobante, count)
      FROM (
        SELECT tipo_comprobante, COUNT(*)::INT AS count
        FROM evt_gastos
        WHERE ocr_confianza IS NOT NULL AND activo = TRUE
        GROUP BY tipo_comprobante
      ) tipo_counts
    ) AS por_tipo_comprobante
  FROM evt_gastos
  WHERE ocr_confianza IS NOT NULL
    AND activo = TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_ocr_stats() IS
  'Retorna estadísticas generales del uso de OCR en gastos';

-- 9. Validar datos existentes
DO $$
DECLARE
  gastos_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO gastos_count FROM evt_gastos;
  RAISE NOTICE 'Total de gastos en la tabla: %', gastos_count;

  -- Verificar si hay gastos con OCR
  SELECT COUNT(*) INTO gastos_count
  FROM evt_gastos
  WHERE ocr_confianza IS NOT NULL;

  RAISE NOTICE 'Gastos procesados con OCR: %', gastos_count;
END $$;

-- 10. Información de la migración
DO $$
BEGIN
  RAISE NOTICE '✅ Migración 20251012_add_ocr_enhanced_fields completada exitosamente';
  RAISE NOTICE '📊 Nuevos campos agregados: 10';
  RAISE NOTICE '🔍 Índices creados: 3';
  RAISE NOTICE '📈 Vista creada: vw_gastos_ocr_analytics';
  RAISE NOTICE '⚙️ Funciones creadas: calcular_num_productos(), get_ocr_stats()';
END $$;
