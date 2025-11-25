-- Actualizar nombres de estados para coincidir con el flujo de negocio
-- Basado en el reporte técnico del sistema

-- Actualizar estados existentes manteniendo los IDs
UPDATE evt_estados SET
  nombre = 'Borrador',
  descripcion = 'Evento en borrador inicial',
  color = '#6B7280',
  orden = 1,
  workflow_step = 1
WHERE orden = 1;

UPDATE evt_estados SET
  nombre = 'Acuerdo',
  descripcion = 'Acuerdo firmado con el cliente',
  color = '#3B82F6',
  orden = 2,
  workflow_step = 2
WHERE orden = 2;

UPDATE evt_estados SET
  nombre = 'Orden de Compra',
  descripcion = 'Orden de compra generada',
  color = '#10B981',
  orden = 3,
  workflow_step = 3
WHERE orden = 3;

UPDATE evt_estados SET
  nombre = 'En Ejecución',
  descripcion = 'Evento en ejecución',
  color = '#F59E0B',
  orden = 4,
  workflow_step = 4
WHERE orden = 4;

UPDATE evt_estados SET
  nombre = 'Finalizado',
  descripcion = 'Evento finalizado exitosamente',
  color = '#059669',
  orden = 5,
  workflow_step = 5
WHERE orden = 5;

UPDATE evt_estados SET
  nombre = 'Facturado',
  descripcion = 'Todos los ingresos han sido facturados',
  color = '#7C3AED',
  orden = 6,
  workflow_step = 6
WHERE orden = 6;

UPDATE evt_estados SET
  nombre = 'Pagado',
  descripcion = 'Todos los ingresos han sido pagados',
  color = '#059669',
  orden = 7,
  workflow_step = 7
WHERE orden = 7;

-- El estado Cancelado ya fue agregado en la migración anterior
-- Si no existe, lo agregamos aquí
INSERT INTO evt_estados (nombre, descripcion, color, orden, workflow_step)
SELECT 'Cancelado', 'Evento cancelado', '#EF4444', 0, 0
WHERE NOT EXISTS (
  SELECT 1 FROM evt_estados WHERE nombre = 'Cancelado'
);
