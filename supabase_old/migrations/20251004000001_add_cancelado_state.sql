-- Add 'Cancelado' state to evt_estados if it doesn't exist
INSERT INTO evt_estados (nombre, descripcion, color, orden, workflow_step)
SELECT 'Cancelado', 'Evento cancelado', '#EF4444', 0, 0
WHERE NOT EXISTS (
  SELECT 1 FROM evt_estados WHERE nombre = 'Cancelado'
);
