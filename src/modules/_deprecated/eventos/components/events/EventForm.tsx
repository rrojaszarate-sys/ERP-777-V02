import React, { useState, useEffect } from 'react';
import { Calendar, User, DollarSign, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { EventDocumentUpload } from '../documents/EventDocumentUpload';
import { EventWorkflowVisualization } from '../workflow/EventWorkflowVisualization';
import { useEventTypes } from '../../hooks/useEventTypes';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../../../core/auth/AuthProvider';
import { EventoCompleto, Cliente } from '../../types/Event';

interface EventFormProps {
  event?: EventoCompleto | null;
  clients: Cliente[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export const EventForm: React.FC<EventFormProps> = ({
  event,
  clients,
  onSave,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [eventDocuments, setEventDocuments] = useState<any[]>([]);
  const { data: eventTypes = [] } = useEventTypes();
  const { data: users = [] } = useUsers();
  const { user } = useAuth();

  const [showClientChangeWarning, setShowClientChangeWarning] = useState(false);
  const [newEventKey, setNewEventKey] = useState('');

  const [formData, setFormData] = useState({
    nombre_proyecto: event?.nombre_proyecto || '',
    descripcion: event?.descripcion || '',
    fecha_evento: event?.fecha_evento ? event.fecha_evento.split('T')[0] : '',
    fecha_fin: event?.fecha_fin ? event.fecha_fin.split('T')[0] : '',
    cliente_id: event?.cliente_id || '',
    responsable_id: event?.responsable_id || '',
    solicitante_id: event?.solicitante_id || '',
    tipo_evento_id: event?.tipo_evento_id || '',
    estado_id: event?.estado_id || 1,
    ganancia_estimada: event?.ganancia_estimada || 0,
    provision_combustible_peaje: event?.provision_combustible_peaje || 0,
    provision_materiales: event?.provision_materiales || 0,
    provision_recursos_humanos: event?.provision_recursos_humanos || 0,
    provision_solicitudes_pago: event?.provision_solicitudes_pago || 0,
    notas: event?.notas || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculated values
  const provisionesTotal = 
    (formData.provision_combustible_peaje || 0) +
    (formData.provision_materiales || 0) +
    (formData.provision_recursos_humanos || 0) +
    (formData.provision_solicitudes_pago || 0);
  const utilidadEstimada = (formData.ganancia_estimada || 0) - provisionesTotal;
  const porcentajeUtilidadEstimada = formData.ganancia_estimada > 0
    ? (utilidadEstimada / formData.ganancia_estimada) * 100
    : 0;

  const isAdmin = user?.role === 'Administrador';
  const isEditingEvent = !!event;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nombre_proyecto.trim())
      newErrors.nombre_proyecto = 'El nombre del proyecto es requerido';
    if (!formData.fecha_evento)
      newErrors.fecha_evento = 'La fecha del evento es requerida';
    if (!formData.cliente_id)
      newErrors.cliente_id = 'Debe seleccionar un cliente';
    if (!formData.tipo_evento_id)
      newErrors.tipo_evento_id = 'Debe seleccionar un tipo de evento';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      onSave({
        ...formData,
        ganancia_estimada:
          parseFloat(formData.ganancia_estimada.toString()) || 0,
        provision_combustible_peaje:
          parseFloat(formData.provision_combustible_peaje.toString()) || 0,
        provision_materiales:
          parseFloat(formData.provision_materiales.toString()) || 0,
        provision_recursos_humanos:
          parseFloat(formData.provision_recursos_humanos.toString()) || 0,
        provision_solicitudes_pago:
          parseFloat(formData.provision_solicitudes_pago.toString()) || 0,
        utilidad_estimada: utilidadEstimada,
        porcentaje_utilidad_estimada: porcentajeUtilidadEstimada,
        estado_id: formData.estado_id || 1,
      });
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generar preview de nueva clave cuando cambie el cliente
  useEffect(() => {
    if (isEditingEvent && formData.cliente_id && formData.cliente_id !== event?.cliente_id) {
      const cliente = clients.find(c => c.id === formData.cliente_id);
      if (cliente?.sufijo) {
        const year = new Date().getFullYear();
        setNewEventKey(`${cliente.sufijo}${year}-###`);
        setShowClientChangeWarning(true);
      }
    } else {
      setShowClientChangeWarning(false);
      setNewEventKey('');
    }
  }, [formData.cliente_id, event?.cliente_id, clients, isEditingEvent]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Estado del Evento */}
      {event && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            Estado Actual del Evento
          </h3>
          <EventWorkflowVisualization
            currentStateId={formData.estado_id}
            showProgress
            interactive={false}
          />
        </div>
      )}

      {/* Información del Evento */}
      <div className="bg-blue-50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-blue-900 flex items-center">
          <Calendar className="w-5 h-5 mr-2" /> Información del Evento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Proyecto *
            </label>
            <input
              type="text"
              value={formData.nombre_proyecto}
              onChange={(e) =>
                handleInputChange('nombre_proyecto', e.target.value)
              }
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.nombre_proyecto ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ej: Conferencia Anual de Tecnología 2025"
            />
            {errors.nombre_proyecto && (
              <p className="text-red-600 text-sm mt-1">
                {errors.nombre_proyecto}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Inicio *
            </label>
            <input
              type="date"
              value={formData.fecha_evento}
              onChange={(e) => handleInputChange('fecha_evento', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.fecha_evento ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.fecha_evento && (
              <p className="text-red-600 text-sm mt-1">
                {errors.fecha_evento}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Fin
            </label>
            <input
              type="date"
              value={formData.fecha_fin}
              onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Evento *
            </label>
            <select
              value={formData.tipo_evento_id}
              onChange={(e) =>
                handleInputChange('tipo_evento_id', e.target.value)
              }
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.tipo_evento_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar tipo...</option>
              {eventTypes.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
            {errors.tipo_evento_id && (
              <p className="text-red-600 text-sm mt-1">
                {errors.tipo_evento_id}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Advertencia de cambio de cliente */}
      {showClientChangeWarning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <h4 className="text-yellow-800 font-medium">⚠️ Advertencia: Cambio de Cliente</h4>
              <p className="text-yellow-700 text-sm mt-1">
                Al cambiar el cliente, se generará una <strong>nueva clave de evento</strong>:
              </p>
              <div className="mt-2 bg-yellow-100 border border-yellow-300 rounded px-3 py-2 font-mono text-yellow-900">
                Clave anterior: <strong>{event?.clave_evento}</strong> → Nueva clave: <strong>{newEventKey}</strong>
              </div>
              <p className="text-yellow-700 text-xs mt-2">
                Esta acción solo puede ser realizada por administradores y afectará la trazabilidad del evento.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cliente y Responsable */}
      <div className="bg-green-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-green-900 flex items-center">
          <User className="w-5 h-5 mr-2" /> Cliente y Asignación
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente * {isEditingEvent && !isAdmin && <Lock className="inline w-4 h-4 ml-1 text-gray-500" />}
            </label>
            <select
              value={formData.cliente_id}
              onChange={(e) =>
                handleInputChange('cliente_id', parseInt(e.target.value) || '')
              }
              disabled={isEditingEvent && !isAdmin}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.cliente_id ? 'border-red-500' : 'border-gray-300'
              } ${isEditingEvent && !isAdmin ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
              title={isEditingEvent && !isAdmin ? 'Solo los administradores pueden cambiar el cliente' : ''}
            >
              <option value="">Seleccionar cliente...</option>
              {clients.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre_comercial || cliente.razon_social}
                </option>
              ))}
            </select>
            {errors.cliente_id && (
              <p className="text-red-600 text-sm mt-1">{errors.cliente_id}</p>
            )}
            {isEditingEvent && !isAdmin && (
              <p className="text-gray-500 text-xs mt-1 flex items-center">
                <Lock className="w-3 h-3 mr-1" />
                Solo administradores pueden cambiar el cliente
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsable
            </label>
            <select
              value={formData.responsable_id}
              onChange={(e) =>
                handleInputChange('responsable_id', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Seleccionar responsable...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nombre} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Solicitante
            </label>
            <select
              value={formData.solicitante_id}
              onChange={(e) =>
                handleInputChange('solicitante_id', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Seleccionar solicitante...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nombre} ({user.email})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Gestión del Proyecto */}
      <div className="bg-purple-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-purple-900 flex items-center">
          <DollarSign className="w-5 h-5 mr-2" /> Gestión del Proyecto
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ganancia Estimada ($)
            </label>
            <input
              type="text"
              value={formData.ganancia_estimada ? formData.ganancia_estimada.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                const parsed = parseFloat(value);
                handleInputChange('ganancia_estimada', isNaN(parsed) ? 0 : parseFloat(parsed.toFixed(2)));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="0.00"
              style={{ appearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Provisiones Divididas - 4 Categorías */}
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <h4 className="text-md font-semibold text-yellow-900 mb-3 flex items-center">
            <DollarSign className="w-4 h-4 mr-2" />
            💰 Provisiones por Categoría
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ⛽ Combustible y Peaje ($)
              </label>
              <input
                type="text"
                value={formData.provision_combustible_peaje ? formData.provision_combustible_peaje.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  const parsed = parseFloat(value);
                  handleInputChange('provision_combustible_peaje', isNaN(parsed) ? 0 : parseFloat(parsed.toFixed(2)));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0.00"
                style={{ appearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🛠️ Materiales ($)
              </label>
              <input
                type="text"
                value={formData.provision_materiales ? formData.provision_materiales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  const parsed = parseFloat(value);
                  handleInputChange('provision_materiales', isNaN(parsed) ? 0 : parseFloat(parsed.toFixed(2)));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0.00"
                style={{ appearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                👥 Recursos Humanos ($)
              </label>
              <input
                type="text"
                value={formData.provision_recursos_humanos ? formData.provision_recursos_humanos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  const parsed = parseFloat(value);
                  handleInputChange('provision_recursos_humanos', isNaN(parsed) ? 0 : parseFloat(parsed.toFixed(2)));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0.00"
                style={{ appearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                💳 Solicitudes de Pago ($)
              </label>
              <input
                type="text"
                value={formData.provision_solicitudes_pago ? formData.provision_solicitudes_pago.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  const parsed = parseFloat(value);
                  handleInputChange('provision_solicitudes_pago', isNaN(parsed) ? 0 : parseFloat(parsed.toFixed(2)));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0.00"
                style={{ appearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
              />
            </div>
          </div>

          <div className="mt-3 p-3 bg-white border-2 border-yellow-400 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Provisiones:</span>
              <span className="text-lg font-bold text-yellow-900">
                ${provisionesTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Utilidad Estimada ($)
            </label>
            <div className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold ${
              porcentajeUtilidadEstimada < 35 ? 'text-red-600' : 'text-green-600'
            }`}>
              ${utilidadEstimada.toFixed(2)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              % Utilidad Estimada
            </label>
            <div className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold ${
              porcentajeUtilidadEstimada < 35 ? 'text-red-600' : 'text-green-600'
            }`}>
              {porcentajeUtilidadEstimada.toFixed(2)}%
            </div>
          </div>

          {porcentajeUtilidadEstimada < 35 && formData.ganancia_estimada > 0 && (
            <div className="md:col-span-2 bg-red-50 border-l-4 border-red-400 p-3 rounded">
              <p className="text-red-700 text-sm flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <strong>Advertencia:</strong> El porcentaje de utilidad estimada está por debajo del 35% recomendado.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Descripción y Notas */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción del Evento
        </label>
        <textarea
          value={formData.descripcion}
          onChange={(e) => handleInputChange('descripcion', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="Descripción detallada del evento..."
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas Internas
        </label>
        <textarea
          value={formData.notas}
          onChange={(e) => handleInputChange('notas', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="Notas internas, recordatorios..."
        />
      </div>

      {/* Documentos */}
      {event && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Documentos del Evento</h4>
          <EventDocumentUpload
            eventId={event.id}
            currentDocuments={eventDocuments}
            onDocumentUploaded={(doc) =>
              setEventDocuments((prev) => [...prev, doc])
            }
            onDocumentRemoved={(id) =>
              setEventDocuments((prev) =>
                prev.filter((doc) => doc.id !== id)
              )
            }
          />
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-mint-500 hover:bg-mint-600"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {event ? 'Actualizar Evento' : 'Crear Evento'}
        </Button>
      </div>
    </form>
  );
};
