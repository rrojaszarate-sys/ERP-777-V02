-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 004: SISTEMA DE DOCUMENTOS Y TRAZABILIDAD
-- ═══════════════════════════════════════════════════════════════════════════
-- Fecha: 2025-10-27
-- Propósito: Tablas para almacenar documentos y auditoría de modificaciones
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- TABLA: cont_documentos
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cont_documentos (
  id SERIAL PRIMARY KEY,
  
  -- Referencia a la transacción
  referencia_tabla VARCHAR(50) NOT NULL CHECK (
    referencia_tabla IN (
      'evt_ingresos',
      'evt_gastos',
      'cont_ingresos_externos',
      'cont_gastos_externos',
      'cont_movimientos_bancarios'
    )
  ),
  referencia_id INTEGER NOT NULL,
  
  -- Información del archivo
  nombre_original TEXT NOT NULL,
  nombre_storage TEXT NOT NULL UNIQUE,
  ruta_storage TEXT NOT NULL UNIQUE,
  url_storage TEXT,
  
  -- Metadata
  tipo_documento VARCHAR(30) CHECK (
    tipo_documento IN ('factura', 'recibo', 'comprobante', 'xml', 'contrato', 'otro')
  ),
  mime_type VARCHAR(100),
  tamaño_bytes BIGINT CHECK (tamaño_bytes > 0),
  hash_sha256 TEXT,
  
  -- Fechas
  fecha_documento DATE,
  fecha_subida TIMESTAMPTZ DEFAULT now(),
  
  -- Auditoría
  subido_por UUID REFERENCES core_users(id),
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint: combinación única por referencia
  UNIQUE(referencia_tabla, referencia_id, nombre_storage)
);

-- Índices
CREATE INDEX idx_cont_documentos_referencia ON cont_documentos(referencia_tabla, referencia_id);
CREATE INDEX idx_cont_documentos_fecha ON cont_documentos(fecha_documento);
CREATE INDEX idx_cont_documentos_hash ON cont_documentos(hash_sha256);
CREATE INDEX idx_cont_documentos_subido_por ON cont_documentos(subido_por);
CREATE INDEX idx_cont_documentos_activo ON cont_documentos(activo);

COMMENT ON TABLE cont_documentos IS 
  'Almacena metadata de documentos (PDF, XML, imágenes) asociados a transacciones';

-- ─────────────────────────────────────────────────────────────────────────
-- TABLA: cont_auditoria_modificaciones
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cont_auditoria_modificaciones (
  id SERIAL PRIMARY KEY,
  
  -- Registro modificado
  tabla VARCHAR(50) NOT NULL,
  registro_id INTEGER NOT NULL,
  
  -- Cambio realizado
  campo_modificado VARCHAR(100) NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  
  -- Tipo de operación
  operacion VARCHAR(20) NOT NULL CHECK (
    operacion IN ('INSERT', 'UPDATE', 'DELETE', 'CORRECCION')
  ),
  
  -- Justificación
  razon TEXT NOT NULL,
  categoria_cambio VARCHAR(50) CHECK (
    categoria_cambio IN (
      'error_captura',
      'ajuste_contable',
      'correccion_fiscal',
      'cambio_solicitado',
      'otro'
    )
  ),
  
  -- Usuario y fecha
  usuario_id UUID REFERENCES core_users(id),
  usuario_nombre TEXT,
  usuario_rol TEXT,
  fecha_modificacion TIMESTAMPTZ DEFAULT now(),
  
  -- Metadata adicional
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_auditoria_tabla_registro ON cont_auditoria_modificaciones(tabla, registro_id);
CREATE INDEX idx_auditoria_usuario ON cont_auditoria_modificaciones(usuario_id);
CREATE INDEX idx_auditoria_fecha ON cont_auditoria_modificaciones(fecha_modificacion);
CREATE INDEX idx_auditoria_operacion ON cont_auditoria_modificaciones(operacion);
CREATE INDEX idx_auditoria_tabla ON cont_auditoria_modificaciones(tabla);

COMMENT ON TABLE cont_auditoria_modificaciones IS 
  'Registro completo de todas las modificaciones a registros financieros con justificación';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (en caso de necesitar revertir)
-- ═══════════════════════════════════════════════════════════════════════════
-- BEGIN;
-- DROP TABLE IF EXISTS cont_auditoria_modificaciones CASCADE;
-- DROP TABLE IF EXISTS cont_documentos CASCADE;
-- COMMIT;
