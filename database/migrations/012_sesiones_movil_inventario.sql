-- ============================================================================
-- MIGRACIÓN: Tabla para Sesiones de Escaneo Móvil
-- ============================================================================
-- Esta tabla permite sincronizar sesiones de escaneo entre dispositivos móviles
-- y computadoras de escritorio para completar movimientos de inventario.
-- ============================================================================

-- Crear tabla de sesiones móviles
CREATE TABLE IF NOT EXISTS sesiones_movil_inventario (
    id VARCHAR(100) PRIMARY KEY,  -- Identificador único de la sesión (generado en el móvil)
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida')),
    almacen_id INTEGER NOT NULL REFERENCES almacenes_erp(id),
    productos JSONB NOT NULL DEFAULT '[]',  -- Array de productos escaneados
    estado VARCHAR(20) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'pendiente', 'completada', 'cancelada')),
    creado_por VARCHAR(255),
    notas TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_completado TIMESTAMP WITH TIME ZONE,
    movimientos_ids INTEGER[]  -- IDs de los movimientos creados al completar
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_sesiones_movil_estado ON sesiones_movil_inventario(estado);
CREATE INDEX IF NOT EXISTS idx_sesiones_movil_almacen ON sesiones_movil_inventario(almacen_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_movil_fecha ON sesiones_movil_inventario(fecha_creacion DESC);

-- Trigger para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION update_sesion_movil_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    IF NEW.estado = 'completada' AND OLD.estado != 'completada' THEN
        NEW.fecha_completado = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sesion_movil_timestamp ON sesiones_movil_inventario;
CREATE TRIGGER trigger_update_sesion_movil_timestamp
    BEFORE UPDATE ON sesiones_movil_inventario
    FOR EACH ROW
    EXECUTE FUNCTION update_sesion_movil_timestamp();

-- Políticas RLS
ALTER TABLE sesiones_movil_inventario ENABLE ROW LEVEL SECURITY;

-- Política para lectura (todos los usuarios autenticados pueden ver)
CREATE POLICY "Usuarios pueden ver sesiones" ON sesiones_movil_inventario
    FOR SELECT USING (true);

-- Política para inserción
CREATE POLICY "Usuarios pueden crear sesiones" ON sesiones_movil_inventario
    FOR INSERT WITH CHECK (true);

-- Política para actualización
CREATE POLICY "Usuarios pueden actualizar sesiones" ON sesiones_movil_inventario
    FOR UPDATE USING (true);

-- Comentarios
COMMENT ON TABLE sesiones_movil_inventario IS 'Sesiones de escaneo desde dispositivos móviles para completar en desktop';
COMMENT ON COLUMN sesiones_movil_inventario.id IS 'ID único generado en formato MOV_timestamp_random';
COMMENT ON COLUMN sesiones_movil_inventario.productos IS 'Array JSON con productos escaneados: [{id, clave, nombre, unidad, cantidad, costo_unitario}]';
COMMENT ON COLUMN sesiones_movil_inventario.estado IS 'activa: en proceso de escaneo, pendiente: lista para completar en PC, completada: movimientos registrados, cancelada: descartada';

-- Función para limpiar sesiones antiguas (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION limpiar_sesiones_movil_antiguas()
RETURNS INTEGER AS $$
DECLARE
    filas_eliminadas INTEGER;
BEGIN
    -- Eliminar sesiones completadas de más de 30 días
    DELETE FROM sesiones_movil_inventario 
    WHERE estado = 'completada' 
    AND fecha_completado < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS filas_eliminadas = ROW_COUNT;
    
    -- Eliminar sesiones canceladas de más de 7 días
    DELETE FROM sesiones_movil_inventario 
    WHERE estado = 'cancelada' 
    AND fecha_actualizacion < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS filas_eliminadas = filas_eliminadas + ROW_COUNT;
    
    -- Cancelar sesiones activas/pendientes de más de 48 horas (abandonadas)
    UPDATE sesiones_movil_inventario 
    SET estado = 'cancelada'
    WHERE estado IN ('activa', 'pendiente')
    AND fecha_actualizacion < NOW() - INTERVAL '48 hours';
    
    RETURN filas_eliminadas;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION limpiar_sesiones_movil_antiguas IS 'Limpia sesiones antiguas y marca como canceladas las abandonadas';

-- ============================================================================
-- EJEMPLO DE USO
-- ============================================================================
/*
-- Insertar una sesión desde el móvil:
INSERT INTO sesiones_movil_inventario (id, tipo, almacen_id, productos, estado, creado_por)
VALUES (
    'MOV_1701432123456_abc123',
    'salida',
    1,
    '[
        {"id": 100, "clave": "PROD001", "nombre": "Tornillo 1/4", "unidad": "PZA", "cantidad": 50},
        {"id": 101, "clave": "PROD002", "nombre": "Tuerca 1/4", "unidad": "PZA", "cantidad": 50}
    ]',
    'pendiente',
    'usuario_movil'
);

-- Buscar sesiones pendientes:
SELECT * FROM sesiones_movil_inventario 
WHERE estado = 'pendiente' 
ORDER BY fecha_creacion DESC;

-- Marcar como completada:
UPDATE sesiones_movil_inventario 
SET estado = 'completada', movimientos_ids = ARRAY[1001, 1002]
WHERE id = 'MOV_1701432123456_abc123';
*/
