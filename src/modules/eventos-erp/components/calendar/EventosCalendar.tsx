/**
 * Calendario de Eventos - FASE 2.1
 * Vista de calendario interactivo con FullCalendar
 */
import { useState, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
  Select,
  SelectItem,
  Card,
  CardBody
} from '@nextui-org/react';
import { useEvents } from '../../hooks/useEvents';
import { useClients } from '../../hooks/useClients';
import { Event as EventoType } from '../../types/Event';
import { formatCurrency } from '../../../../shared/utils/formatters';

// Colores por estado del evento
const ESTADO_COLORS: Record<number, string> = {
  1: '#6b7280', // Borrador - gris
  2: '#f59e0b', // Cotizado - amarillo
  3: '#3b82f6', // Aprobado - azul
  4: '#8b5cf6', // En proceso - morado
  5: '#10b981', // Completado - verde
  6: '#06b6d4', // Facturado - cyan
  7: '#22c55e', // Cobrado - verde brillante
};

const ESTADO_NOMBRES: Record<number, string> = {
  1: 'Borrador',
  2: 'Cotizado',
  3: 'Aprobado',
  4: 'En Proceso',
  5: 'Completado',
  6: 'Facturado',
  7: 'Cobrado',
};

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    evento: EventoType;
    clienteNombre?: string;
  };
}

interface EventosCalendarProps {
  onEventClick?: (evento: EventoType) => void;
  onDateClick?: (date: Date) => void;
  filtroClienteId?: number;
  filtroEstadoId?: number;
}

export function EventosCalendar({
  onEventClick,
  onDateClick,
  filtroClienteId,
  filtroEstadoId
}: EventosCalendarProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear] = useState(currentYear);
  const [selectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedEvent, setSelectedEvent] = useState<EventoType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { events, isLoading } = useEvents(selectedYear, selectedMonth);
  const { clients } = useClients();

  // Crear mapa de clientes para búsqueda rápida
  const clientesMap = useMemo(() => {
    const map = new Map<number, string>();
    clients?.forEach(c => map.set(c.id, c.razon_social || c.nombre_comercial || 'Sin nombre'));
    return map;
  }, [clients]);

  // Convertir eventos a formato FullCalendar
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    if (!events) return [];

    return events
      .filter(evento => {
        // Aplicar filtros
        if (filtroClienteId && evento.cliente_id !== filtroClienteId) return false;
        if (filtroEstadoId && evento.estado_id !== filtroEstadoId) return false;
        return true;
      })
      .map(evento => {
        const estadoColor = ESTADO_COLORS[evento.estado_id || 1] || '#6b7280';
        const clienteNombre = evento.cliente_id ? clientesMap.get(evento.cliente_id) : undefined;

        return {
          id: evento.id.toString(),
          title: `${evento.clave_evento} - ${evento.nombre_proyecto}`,
          start: evento.fecha_inicio,
          end: evento.fecha_fin || evento.fecha_inicio,
          backgroundColor: estadoColor,
          borderColor: estadoColor,
          textColor: '#ffffff',
          extendedProps: {
            evento,
            clienteNombre,
          },
        };
      });
  }, [events, filtroClienteId, filtroEstadoId, clientesMap]);

  // Handler para click en evento
  const handleEventClick = useCallback((info: any) => {
    const evento = info.event.extendedProps.evento as EventoType;
    setSelectedEvent(evento);
    setIsModalOpen(true);

    if (onEventClick) {
      onEventClick(evento);
    }
  }, [onEventClick]);

  // Handler para click en fecha (crear nuevo evento)
  const handleDateClick = useCallback((info: any) => {
    if (onDateClick) {
      onDateClick(new Date(info.dateStr));
    }
  }, [onDateClick]);

  // Handler para drag & drop (cambiar fecha)
  const handleEventDrop = useCallback((info: any) => {
    const evento = info.event.extendedProps.evento as EventoType;
    const newStart = info.event.startStr;
    const newEnd = info.event.endStr;

    console.log('Evento movido:', {
      id: evento.id,
      oldStart: evento.fecha_inicio,
      newStart,
      newEnd
    });

    // TODO: Implementar actualización de fechas
    // updateEvent(evento.id, { fecha_inicio: newStart, fecha_fin: newEnd });
  }, []);

  // Render contenido del evento en el calendario
  const renderEventContent = (eventInfo: any) => {
    const { evento, clienteNombre } = eventInfo.event.extendedProps;

    return (
      <div className="p-1 overflow-hidden">
        <div className="font-semibold text-xs truncate">
          {eventInfo.event.title}
        </div>
        {clienteNombre && (
          <div className="text-xs opacity-80 truncate">
            {clienteNombre}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="eventos-calendar">
      {/* Leyenda de estados */}
      <Card className="mb-4">
        <CardBody className="py-2">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium mr-2">Estados:</span>
            {Object.entries(ESTADO_NOMBRES).map(([id, nombre]) => (
              <Chip
                key={id}
                size="sm"
                style={{ backgroundColor: ESTADO_COLORS[parseInt(id)] }}
                className="text-white"
              >
                {nombre}
              </Chip>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Calendario */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          locale="es"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
          }}
          buttonText={{
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            list: 'Lista'
          }}
          events={calendarEvents}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventDrop={handleEventDrop}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={3}
          weekends={true}
          eventContent={renderEventContent}
          height="auto"
          aspectRatio={1.8}
          eventDisplay="block"
          displayEventTime={false}
        />
      </div>

      {/* Modal de detalle rápido */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <ModalContent>
          {selectedEvent && (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Chip
                    size="sm"
                    style={{ backgroundColor: ESTADO_COLORS[selectedEvent.estado_id || 1] }}
                    className="text-white"
                  >
                    {ESTADO_NOMBRES[selectedEvent.estado_id || 1]}
                  </Chip>
                  <span>{selectedEvent.clave_evento}</span>
                </div>
                <span className="text-lg font-bold">{selectedEvent.nombre_proyecto}</span>
              </ModalHeader>

              <ModalBody>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Cliente</label>
                    <p className="font-medium">
                      {selectedEvent.cliente_id
                        ? clientesMap.get(selectedEvent.cliente_id)
                        : 'Sin cliente'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Fecha</label>
                    <p className="font-medium">
                      {new Date(selectedEvent.fecha_inicio).toLocaleDateString('es-MX', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Ganancia Estimada</label>
                    <p className="font-medium text-green-600">
                      {formatCurrency(selectedEvent.ganancia_estimada || 0)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Lugar</label>
                    <p className="font-medium">
                      {selectedEvent.lugar || 'No especificado'}
                    </p>
                  </div>

                  {selectedEvent.notas && (
                    <div className="col-span-2">
                      <label className="text-sm text-gray-500">Notas</label>
                      <p className="text-sm">{selectedEvent.notas}</p>
                    </div>
                  )}
                </div>
              </ModalBody>

              <ModalFooter>
                <Button
                  color="default"
                  variant="light"
                  onPress={() => setIsModalOpen(false)}
                >
                  Cerrar
                </Button>
                <Button
                  color="primary"
                  onPress={() => {
                    setIsModalOpen(false);
                    if (onEventClick) {
                      onEventClick(selectedEvent);
                    }
                  }}
                >
                  Ver Detalle Completo
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Estilos personalizados */}
      <style>{`
        .eventos-calendar .fc {
          font-family: inherit;
        }
        .eventos-calendar .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 600;
        }
        .eventos-calendar .fc-button {
          background-color: #3b82f6 !important;
          border-color: #3b82f6 !important;
        }
        .eventos-calendar .fc-button:hover {
          background-color: #2563eb !important;
          border-color: #2563eb !important;
        }
        .eventos-calendar .fc-button-active {
          background-color: #1d4ed8 !important;
          border-color: #1d4ed8 !important;
        }
        .eventos-calendar .fc-daygrid-event {
          border-radius: 4px;
          cursor: pointer;
        }
        .eventos-calendar .fc-daygrid-event:hover {
          opacity: 0.9;
        }
        .dark .eventos-calendar .fc-theme-standard td,
        .dark .eventos-calendar .fc-theme-standard th {
          border-color: #374151;
        }
        .dark .eventos-calendar .fc-col-header-cell {
          background-color: #1f2937;
        }
      `}</style>
    </div>
  );
}

export default EventosCalendar;
