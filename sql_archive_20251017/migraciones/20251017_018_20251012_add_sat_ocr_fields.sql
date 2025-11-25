-- ============================================
-- Migración: Campos OCR Compatible con SAT
-- Fecha: 2025-10-12
-- Descripción: Agrega campos necesarios para
--              soportar CFDI 4.0 y tickets
-- ============================================

-- ==========================================
-- FASE 1: CAMPOS DE FACTURA CFDI (ALTA PRIORIDAD)
-- ==========================================

-- 1.1 Campos obligatorios del SAT para facturas
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS uuid_cfdi VARCHAR(36),
  ADD COLUMN IF NOT EXISTS folio_fiscal VARCHAR(50),
  ADD COLUMN IF NOT EXISTS serie VARCHAR(25),
  ADD COLUMN IF NOT EXISTS tipo_comprobante VARCHAR(1) DEFAULT 'I';

-- 1.2 Formas y métodos de pago SAT
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS forma_pago_sat VARCHAR(2),
  ADD COLUMN IF NOT EXISTS metodo_pago_sat VARCHAR(3) DEFAULT 'PUE';

-- ==========================================
-- FASE 2: DETALLE DE PRODUCTOS (JSON)
-- ==========================================

-- 2.1 Campo JSON para productos estructurados
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS detalle_productos JSONB;

-- ==========================================
-- FASE 3: DATOS COMPLEMENTARIOS
-- ==========================================

-- 3.1 Información adicional del comprobante
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS lugar_expedicion VARCHAR(5),
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS tipo_cambio NUMERIC(10,6);

-- 3.2 Descuentos
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS descuento NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivo_descuento TEXT;

-- ==========================================
-- FASE 4: DATOS ADICIONALES DE TICKET
-- ==========================================

-- 4.1 Información no fiscal
ALTER TABLE evt_gastos
  ADD COLUMN IF NOT EXISTS folio_interno VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hora_emision TIME,
  ADD COLUMN IF NOT EXISTS telefono_proveedor VARCHAR(20);

-- ==========================================
-- FASE 5: CONSTRAINTS Y VALIDACIONES
-- ==========================================

-- 5.1 Validar tipo de comprobante SAT
ALTER TABLE evt_gastos
  DROP CONSTRAINT IF EXISTS check_tipo_comprobante;

ALTER TABLE evt_gastos
  ADD CONSTRAINT check_tipo_comprobante
  CHECK (tipo_comprobante IN ('I', 'E', 'T', 'N', 'P'));

-- 5.2 Validar forma de pago SAT (principales)
ALTER TABLE evt_gastos
  DROP CONSTRAINT IF EXISTS check_forma_pago_sat;

ALTER TABLE evt_gastos
  ADD CONSTRAINT check_forma_pago_sat
  CHECK (
    forma_pago_sat IS NULL OR
    forma_pago_sat IN ('01', '02', '03', '04', '05', '28', '99')
  );

-- 5.3 Validar método de pago SAT
ALTER TABLE evt_gastos
  DROP CONSTRAINT IF EXISTS check_metodo_pago_sat;

ALTER TABLE evt_gastos
  ADD CONSTRAINT check_metodo_pago_sat
  CHECK (metodo_pago_sat IN ('PUE', 'PPD'));

-- 5.4 Validar moneda (catálogo c_Moneda)
ALTER TABLE evt_gastos
  DROP CONSTRAINT IF EXISTS check_moneda;

ALTER TABLE evt_gastos
  ADD CONSTRAINT check_moneda
  CHECK (moneda IS NULL OR moneda IN ('MXN', 'USD', 'EUR', 'CAD', 'GBP'));

-- ==========================================
-- FASE 6: ÍNDICES PARA BÚSQUEDAS
-- ==========================================

-- 6.1 Índices en campos SAT
CREATE INDEX IF NOT EXISTS idx_evt_gastos_uuid_cfdi
  ON evt_gastos(uuid_cfdi)
  WHERE uuid_cfdi IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evt_gastos_folio_fiscal
  ON evt_gastos(folio_fiscal)
  WHERE folio_fiscal IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evt_gastos_tipo_comprobante
  ON evt_gastos(tipo_comprobante);

CREATE INDEX IF NOT EXISTS idx_evt_gastos_forma_pago_sat
  ON evt_gastos(forma_pago_sat)
  WHERE forma_pago_sat IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evt_gastos_moneda
  ON evt_gastos(moneda);

-- 6.2 Índice GIN para búsquedas en JSON
CREATE INDEX IF NOT EXISTS idx_evt_gastos_detalle_productos
  ON evt_gastos USING gin(detalle_productos)
  WHERE detalle_productos IS NOT NULL;

-- 6.3 Índice para folio interno (tickets)
CREATE INDEX IF NOT EXISTS idx_evt_gastos_folio_interno
  ON evt_gastos(folio_interno)
  WHERE folio_interno IS NOT NULL;

-- ==========================================
-- FASE 7: COMENTARIOS DESCRIPTIVOS
-- ==========================================

-- 7.1 Campos de factura CFDI
COMMENT ON COLUMN evt_gastos.uuid_cfdi IS
  'UUID del comprobante fiscal digital (CFDI 4.0) - Solo facturas';

COMMENT ON COLUMN evt_gastos.folio_fiscal IS
  'Folio fiscal asignado por el SAT al CFDI - Solo facturas';

COMMENT ON COLUMN evt_gastos.serie IS
  'Serie de la factura - Opcional';

COMMENT ON COLUMN evt_gastos.tipo_comprobante IS
  'Tipo de comprobante SAT: I=Ingreso, E=Egreso, T=Traslado, N=Nómina, P=Pago';

-- 7.2 Formas de pago
COMMENT ON COLUMN evt_gastos.forma_pago_sat IS
  'Código SAT c_FormaPago: 01=Efectivo, 02=Cheque, 03=Transferencia, 04=Tarjeta crédito, 05=Monedero, 28=Tarjeta débito, 99=Por definir';

COMMENT ON COLUMN evt_gastos.metodo_pago_sat IS
  'Método de pago SAT: PUE=Pago en una exhibición, PPD=Pago en parcialidades';

-- 7.3 Detalle de productos
COMMENT ON COLUMN evt_gastos.detalle_productos IS
  'JSON estructurado con array de productos extraídos del ticket/factura. Formato: {productos: [{numero, codigo, descripcion, cantidad, unidad, precio_unitario, importe, descuento}], total_productos, subtotal_productos}';

-- 7.4 Datos complementarios
COMMENT ON COLUMN evt_gastos.lugar_expedicion IS
  'Código postal donde se expide el comprobante fiscal';

COMMENT ON COLUMN evt_gastos.moneda IS
  'Código de moneda según catálogo SAT c_Moneda: MXN, USD, EUR, etc';

COMMENT ON COLUMN evt_gastos.tipo_cambio IS
  'Tipo de cambio aplicado cuando la moneda es diferente a MXN';

COMMENT ON COLUMN evt_gastos.descuento IS
  'Monto total de descuento aplicado en el comprobante';

COMMENT ON COLUMN evt_gastos.motivo_descuento IS
  'Razón o justificación del descuento aplicado';

-- 7.5 Datos de ticket
COMMENT ON COLUMN evt_gastos.folio_interno IS
  'Folio del ticket o nota de venta (no fiscal) - Diferente al folio fiscal';

COMMENT ON COLUMN evt_gastos.hora_emision IS
  'Hora de emisión del comprobante extraída del ticket';

COMMENT ON COLUMN evt_gastos.telefono_proveedor IS
  'Teléfono del establecimiento extraído del ticket';

-- ==========================================
-- FASE 8: FUNCIONES AUXILIARES
-- ==========================================

-- 8.1 Función para obtener número de productos desde JSON
CREATE OR REPLACE FUNCTION get_num_productos(detalle JSONB)
RETURNS INTEGER AS $$
BEGIN
  IF detalle IS NULL THEN
    RETURN 0;
  END IF;

  RETURN COALESCE(
    jsonb_array_length(detalle->'productos'),
    0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_num_productos(JSONB) IS
  'Retorna el número de productos en el campo detalle_productos';

-- 8.2 Función para obtener subtotal de productos desde JSON
CREATE OR REPLACE FUNCTION get_subtotal_productos(detalle JSONB)
RETURNS NUMERIC AS $$
BEGIN
  IF detalle IS NULL THEN
    RETURN 0;
  END IF;

  RETURN COALESCE(
    (detalle->>'subtotal_productos')::NUMERIC,
    0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_subtotal_productos(JSONB) IS
  'Retorna el subtotal de productos en el campo detalle_productos';

-- 8.3 Función para convertir forma de pago texto a código SAT
CREATE OR REPLACE FUNCTION convertir_forma_pago_a_sat(forma_pago_texto VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  RETURN CASE LOWER(forma_pago_texto)
    WHEN 'efectivo' THEN '01'
    WHEN 'cheque' THEN '02'
    WHEN 'transferencia' THEN '03'
    WHEN 'tarjeta' THEN '04'
    WHEN 'credito' THEN '04'
    WHEN 'debito' THEN '28'
    WHEN 'vales' THEN '05'
    ELSE '99' -- Por definir
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION convertir_forma_pago_a_sat(VARCHAR) IS
  'Convierte forma de pago en texto plano a código SAT c_FormaPago';

-- ==========================================
-- FASE 9: VISTAS MEJORADAS
-- ==========================================

-- 9.1 Vista completa de gastos con campos SAT
CREATE OR REPLACE VIEW vw_gastos_ocr_completo AS
SELECT
  -- Identificadores
  g.id,
  g.evento_id,
  e.clave_evento,
  e.nombre_proyecto,

  -- Datos básicos
  g.concepto,
  g.descripcion,
  g.proveedor,
  g.rfc_proveedor,
  g.telefono_proveedor,

  -- Montos
  g.cantidad,
  g.precio_unitario,
  g.subtotal,
  g.iva_porcentaje,
  g.iva,
  g.descuento,
  g.total,
  g.moneda,
  g.tipo_cambio,

  -- Fecha y hora
  g.fecha_gasto,
  g.hora_emision,

  -- Clasificación
  g.categoria_id,
  c.nombre AS categoria_nombre,

  -- Campos SAT (facturas)
  g.uuid_cfdi,
  g.folio_fiscal,
  g.serie,
  g.tipo_comprobante,
  g.forma_pago_sat,
  g.metodo_pago_sat,
  g.lugar_expedicion,

  -- Campos de ticket
  g.folio_interno,
  g.forma_pago AS forma_pago_texto,

  -- Productos
  g.detalle_productos,
  get_num_productos(g.detalle_productos) AS num_productos,
  get_subtotal_productos(g.detalle_productos) AS subtotal_productos,

  -- Tipo de documento
  CASE
    WHEN g.uuid_cfdi IS NOT NULL THEN 'factura_cfdi'
    WHEN g.folio_fiscal IS NOT NULL THEN 'ticket_fiscal'
    WHEN g.folio_interno IS NOT NULL THEN 'ticket'
    ELSE 'sin_comprobante'
  END AS tipo_documento,

  -- OCR metadata
  g.ocr_confianza,
  g.ocr_validado,
  g.ocr_datos_originales,

  CASE
    WHEN g.ocr_confianza >= 90 THEN 'alta'
    WHEN g.ocr_confianza >= 70 THEN 'media'
    WHEN g.ocr_confianza >= 50 THEN 'baja'
    ELSE 'muy_baja'
  END AS calidad_ocr,

  -- Control
  g.status_aprobacion,
  g.activo,
  g.created_at,
  g.updated_at

FROM evt_gastos g
LEFT JOIN evt_eventos e ON g.evento_id = e.id
LEFT JOIN evt_categorias_gastos c ON g.categoria_id = c.id
WHERE g.activo = TRUE;

COMMENT ON VIEW vw_gastos_ocr_completo IS
  'Vista completa de gastos con campos SAT, productos y clasificación de tipo de documento';

-- 9.2 Vista de estadísticas por tipo de documento
CREATE OR REPLACE VIEW vw_gastos_por_tipo_documento AS
SELECT
  CASE
    WHEN uuid_cfdi IS NOT NULL THEN 'factura_cfdi'
    WHEN folio_fiscal IS NOT NULL THEN 'ticket_fiscal'
    WHEN folio_interno IS NOT NULL THEN 'ticket'
    ELSE 'sin_comprobante'
  END AS tipo_documento,
  COUNT(*) AS total_gastos,
  SUM(total) AS monto_total,
  AVG(ocr_confianza) AS confianza_promedio,
  COUNT(CASE WHEN ocr_validado = true THEN 1 END) AS validados,
  COUNT(CASE WHEN ocr_validado = false OR ocr_validado IS NULL THEN 1 END) AS pendientes
FROM evt_gastos
WHERE activo = TRUE
GROUP BY tipo_documento;

COMMENT ON VIEW vw_gastos_por_tipo_documento IS
  'Estadísticas de gastos agrupadas por tipo de documento fiscal';

-- ==========================================
-- FASE 10: FUNCIÓN DE ESTADÍSTICAS ACTUALIZADA
-- ==========================================

CREATE OR REPLACE FUNCTION get_ocr_stats_completo()
RETURNS TABLE (
  total_gastos_ocr BIGINT,
  promedio_confianza NUMERIC,
  con_productos BIGINT,
  sin_productos BIGINT,
  validados BIGINT,
  pendientes_validar BIGINT,
  facturas_cfdi BIGINT,
  tickets_fiscales BIGINT,
  tickets_simples BIGINT,
  sin_comprobante BIGINT,
  por_forma_pago JSON,
  por_tipo_comprobante JSON,
  monto_total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_gastos_ocr,
    ROUND(AVG(g.ocr_confianza), 2) AS promedio_confianza,
    COUNT(CASE WHEN g.detalle_productos IS NOT NULL THEN 1 END)::BIGINT AS con_productos,
    COUNT(CASE WHEN g.detalle_productos IS NULL THEN 1 END)::BIGINT AS sin_productos,
    COUNT(CASE WHEN g.ocr_validado = TRUE THEN 1 END)::BIGINT AS validados,
    COUNT(CASE WHEN g.ocr_validado = FALSE OR g.ocr_validado IS NULL THEN 1 END)::BIGINT AS pendientes_validar,
    COUNT(CASE WHEN g.uuid_cfdi IS NOT NULL THEN 1 END)::BIGINT AS facturas_cfdi,
    COUNT(CASE WHEN g.uuid_cfdi IS NULL AND g.folio_fiscal IS NOT NULL THEN 1 END)::BIGINT AS tickets_fiscales,
    COUNT(CASE WHEN g.uuid_cfdi IS NULL AND g.folio_fiscal IS NULL AND g.folio_interno IS NOT NULL THEN 1 END)::BIGINT AS tickets_simples,
    COUNT(CASE WHEN g.uuid_cfdi IS NULL AND g.folio_fiscal IS NULL AND g.folio_interno IS NULL THEN 1 END)::BIGINT AS sin_comprobante,
    (
      SELECT json_object_agg(forma_pago_sat, count)
      FROM (
        SELECT forma_pago_sat, COUNT(*)::INT AS count
        FROM evt_gastos
        WHERE ocr_confianza IS NOT NULL AND activo = TRUE AND forma_pago_sat IS NOT NULL
        GROUP BY forma_pago_sat
      ) fp
    ) AS por_forma_pago,
    (
      SELECT json_object_agg(tipo_comprobante, count)
      FROM (
        SELECT tipo_comprobante, COUNT(*)::INT AS count
        FROM evt_gastos
        WHERE ocr_confianza IS NOT NULL AND activo = TRUE
        GROUP BY tipo_comprobante
      ) tc
    ) AS por_tipo_comprobante,
    SUM(g.total) AS monto_total
  FROM evt_gastos g
  WHERE g.ocr_confianza IS NOT NULL
    AND g.activo = TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_ocr_stats_completo() IS
  'Retorna estadísticas completas de gastos procesados con OCR, incluyendo clasificación por tipo de documento fiscal';

-- ==========================================
-- FASE 11: MIGRAR DATOS EXISTENTES (OPCIONAL)
-- ==========================================

-- 11.1 Convertir formas de pago existentes a código SAT
UPDATE evt_gastos
SET forma_pago_sat = convertir_forma_pago_a_sat(forma_pago)
WHERE forma_pago IS NOT NULL
  AND forma_pago_sat IS NULL;

-- ==========================================
-- FASE 12: VALIDACIÓN Y REPORTE
-- ==========================================

DO $$
DECLARE
  total_gastos INTEGER;
  gastos_con_ocr INTEGER;
  gastos_con_productos INTEGER;
BEGIN
  -- Contar gastos
  SELECT COUNT(*) INTO total_gastos FROM evt_gastos;
  SELECT COUNT(*) INTO gastos_con_ocr FROM evt_gastos WHERE ocr_confianza IS NOT NULL;
  SELECT COUNT(*) INTO gastos_con_productos FROM evt_gastos WHERE detalle_productos IS NOT NULL;

  -- Reporte
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 RESUMEN:';
  RAISE NOTICE '   • Total de gastos: %', total_gastos;
  RAISE NOTICE '   • Gastos con OCR: %', gastos_con_ocr;
  RAISE NOTICE '   • Gastos con productos: %', gastos_con_productos;
  RAISE NOTICE '';
  RAISE NOTICE '📦 CAMPOS AGREGADOS: 15';
  RAISE NOTICE '   Prioridad ALTA (6): uuid_cfdi, folio_fiscal, serie, tipo_comprobante, forma_pago_sat, metodo_pago_sat';
  RAISE NOTICE '   Prioridad MEDIA (5): lugar_expedicion, moneda, tipo_cambio, descuento, motivo_descuento';
  RAISE NOTICE '   Prioridad BAJA (3): folio_interno, hora_emision, telefono_proveedor';
  RAISE NOTICE '   Estructurado (1): detalle_productos (JSONB)';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 ÍNDICES CREADOS: 7';
  RAISE NOTICE '⚙️ FUNCIONES CREADAS: 4';
  RAISE NOTICE '   • get_num_productos()';
  RAISE NOTICE '   • get_subtotal_productos()';
  RAISE NOTICE '   • convertir_forma_pago_a_sat()';
  RAISE NOTICE '   • get_ocr_stats_completo()';
  RAISE NOTICE '';
  RAISE NOTICE '📈 VISTAS CREADAS: 2';
  RAISE NOTICE '   • vw_gastos_ocr_completo';
  RAISE NOTICE '   • vw_gastos_por_tipo_documento';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Base de datos lista para soportar CFDI 4.0 y tickets';
  RAISE NOTICE '';
END $$;
