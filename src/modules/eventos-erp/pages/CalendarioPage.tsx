/**
 * Página de Calendario de Eventos - FASE 2.1
 */
import { useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Select,
  SelectItem,
  Button,
  Divider
} from '@nextui-org/react';
import { EventosCalendar } from '../components/calendar/EventosCalendar';
import { useClients } from '../hooks/useClients';
import { Event as EventoType } from '../types/Event';
import { CalendarDays, Filter, Plus, RefreshCw } from 'lucide-react';

const ESTADOS = [
  { id: 0, nombre: 'Todos los estados' },
  { id: 1, nombre: 'Borrador' },
  { id: 2, nombre: 'Cotizado' },
  { id: 3, nombre: 'Aprobado' },
  { id: 4, nombre: 'En Proceso' },
  { id: 5, nombre: 'Completado' },
  { id: 6, nombre: 'Facturado' },
  { id: 7, nombre: 'Cobrado' },
];

interface CalendarioPageProps {
  onEventSelect?: (evento: EventoType) => void;
  onCreateEvent?: (fecha?: Date) => void;
}

export function CalendarioPage({ onEventSelect, onCreateEvent }: CalendarioPageProps) {
  const [filtroClienteId, setFiltroClienteId] = useState<number | undefined>();
  const [filtroEstadoId, setFiltroEstadoId] = useState<number | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const { clients } = useClients();

  const handleEventClick = (evento: EventoType) => {
    console.log('Evento seleccionado:', evento);
    if (onEventSelect) {
      onEventSelect(evento);
    }
  };

  const handleDateClick = (date: Date) => {
    console.log('Fecha seleccionada:', date);
    if (onCreateEvent) {
      onCreateEvent(date);
    }
  };

  const clearFilters = () => {
    setFiltroClienteId(undefined);
    setFiltroEstadoId(undefined);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Calendario de Eventos</h1>
              <p className="text-sm text-gray-500">
                Vista de calendario con todos los eventos programados
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="flat"
              startContent={<Filter className="w-4 h-4" />}
              onPress={() => setShowFilters(!showFilters)}
            >
              Filtros
            </Button>
            {onCreateEvent && (
              <Button
                color="primary"
                startContent={<Plus className="w-4 h-4" />}
                onPress={() => onCreateEvent()}
              >
                Nuevo Evento
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Panel de filtros colapsable */}
        {showFilters && (
          <>
            <Divider />
            <CardBody>
              <div className="flex flex-wrap gap-4 items-end">
                <Select
                  label="Cliente"
                  placeholder="Todos los clientes"
                  className="max-w-xs"
                  selectedKeys={filtroClienteId ? [filtroClienteId.toString()] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    setFiltroClienteId(value ? parseInt(value) : undefined);
                  }}
                >
                  {(clients || []).map((cliente) => (
                    <SelectItem key={cliente.id.toString()} value={cliente.id.toString()}>
                      {cliente.razon_social || cliente.nombre_comercial}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="Estado"
                  placeholder="Todos los estados"
                  className="max-w-xs"
                  selectedKeys={filtroEstadoId ? [filtroEstadoId.toString()] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    const id = parseInt(value);
                    setFiltroEstadoId(id === 0 ? undefined : id);
                  }}
                >
                  {ESTADOS.map((estado) => (
                    <SelectItem key={estado.id.toString()} value={estado.id.toString()}>
                      {estado.nombre}
                    </SelectItem>
                  ))}
                </Select>

                <Button
                  variant="flat"
                  color="default"
                  startContent={<RefreshCw className="w-4 h-4" />}
                  onPress={clearFilters}
                >
                  Limpiar filtros
                </Button>
              </div>
            </CardBody>
          </>
        )}
      </Card>

      {/* Calendario */}
      <EventosCalendar
        onEventClick={handleEventClick}
        onDateClick={handleDateClick}
        filtroClienteId={filtroClienteId}
        filtroEstadoId={filtroEstadoId}
      />
    </div>
  );
}

export default CalendarioPage;
