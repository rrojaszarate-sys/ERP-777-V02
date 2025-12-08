import React, { useState, useEffect } from 'react';
import { Calendar, User, DollarSign, Loader2, AlertTriangle, Lock, Save, X } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { useTheme } from '../../../../shared/components/theme';
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
  const { data: eventTypes = [] } = useEventTypes();
  const { data: users = [] } = useUsers();
  const { user } = useAuth();
  const { colors } = useTheme();

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
      newErrors.nombre_proyecto = 'Requerido';
    if (!formData.fecha_evento)
      newErrors.fecha_evento = 'Requerida';
    if (!formData.cliente_id)
      newErrors.cliente_id = 'Requerido';
    if (!formData.tipo_evento_id)
      newErrors.tipo_evento_id = 'Requerido';
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
        ganancia_estimada: parseFloat(formData.ganancia_estimada.toString()) || 0,
        provision_combustible_peaje: parseFloat(formData.provision_combustible_peaje.toString()) || 0,
        provision_materiales: parseFloat(formData.provision_materiales.toString()) || 0,
        provision_recursos_humanos: parseFloat(formData.provision_recursos_humanos.toString()) || 0,
        provision_solicitudes_pago: parseFloat(formData.provision_solicitudes_pago.toString()) || 0,
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

  // Estilos base compactos
  const inputStyle = "w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:outline-none transition-colors";
  const labelStyle = "block text-xs font-medium text-gray-600 mb-0.5";
  const sectionStyle = "rounded-lg p-3 border";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Header compacto */}
      <div
        className="flex items-center justify-between px-4 py-2 rounded-lg"
        style={{ backgroundColor: colors.primary + '15', borderLeft: `3px solid ${colors.primary}` }}
      >
        <h2 className="text-lg font-semibold" style={{ color: colors.primary }}>
          {event ? `Editar: ${event.clave_evento || 'Evento'}` : 'Nuevo Evento'}
        </h2>
        {event && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/80" style={{ color: colors.secondary }}>
            Estado: {formData.estado_id}
          </span>
        )}
      </div>

      {/* Grid principal - 2 columnas */}
      <div className="grid grid-cols-2 gap-3">

        {/* COLUMNA IZQUIERDA */}
        <div className="space-y-3">

          {/* Información del Evento */}
          <div className={sectionStyle} style={{ backgroundColor: colors.primary + '08', borderColor: colors.primary + '30' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-sm font-medium" style={{ color: colors.primary }}>Evento</span>
            </div>

            <div className="space-y-2">
              <div>
                <label className={labelStyle}>Nombre del Proyecto *</label>
                <input
                  type="text"
                  value={formData.nombre_proyecto}
                  onChange={(e) => handleInputChange('nombre_proyecto', e.target.value)}
                  className={`${inputStyle} ${errors.nombre_proyecto ? 'border-red-400' : 'border-gray-200'}`}
                  style={{
                    borderColor: errors.nombre_proyecto ? undefined : colors.primary + '40',
                    outlineColor: colors.primary
                  }}
                  placeholder="Nombre del proyecto"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelStyle}>Fecha Inicio *</label>
                  <input
                    type="date"
                    value={formData.fecha_evento}
                    onChange={(e) => handleInputChange('fecha_evento', e.target.value)}
                    className={`${inputStyle} ${errors.fecha_evento ? 'border-red-400' : 'border-gray-200'}`}
                    style={{ borderColor: errors.fecha_evento ? undefined : colors.primary + '40' }}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Fecha Fin</label>
                  <input
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
                    className={inputStyle}
                    style={{ borderColor: colors.primary + '40' }}
                  />
                </div>
              </div>

              <div>
                <label className={labelStyle}>Tipo de Evento *</label>
                <select
                  value={formData.tipo_evento_id}
                  onChange={(e) => handleInputChange('tipo_evento_id', e.target.value)}
                  className={`${inputStyle} ${errors.tipo_evento_id ? 'border-red-400' : 'border-gray-200'}`}
                  style={{ borderColor: errors.tipo_evento_id ? undefined : colors.primary + '40' }}
                >
                  <option value="">Seleccionar...</option>
                  {eventTypes.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cliente y Asignación */}
          <div className={sectionStyle} style={{ backgroundColor: colors.secondary + '08', borderColor: colors.secondary + '30' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <User className="w-4 h-4" style={{ color: colors.secondary }} />
              <span className="text-sm font-medium" style={{ color: colors.secondary }}>Cliente y Asignación</span>
            </div>

            <div className="space-y-2">
              <div>
                <label className={labelStyle}>
                  Cliente * {isEditingEvent && !isAdmin && <Lock className="inline w-3 h-3 ml-1 text-gray-400" />}
                </label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => handleInputChange('cliente_id', parseInt(e.target.value) || '')}
                  disabled={isEditingEvent && !isAdmin}
                  className={`${inputStyle} ${errors.cliente_id ? 'border-red-400' : ''} ${isEditingEvent && !isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  style={{ borderColor: errors.cliente_id ? undefined : colors.secondary + '40' }}
                >
                  <option value="">Seleccionar...</option>
                  {clients.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre_comercial || cliente.razon_social}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelStyle}>Responsable</label>
                  <select
                    value={formData.responsable_id}
                    onChange={(e) => handleInputChange('responsable_id', e.target.value)}
                    className={inputStyle}
                    style={{ borderColor: colors.secondary + '40' }}
                  >
                    <option value="">Seleccionar...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Solicitante</label>
                  <select
                    value={formData.solicitante_id}
                    onChange={(e) => handleInputChange('solicitante_id', e.target.value)}
                    className={inputStyle}
                    style={{ borderColor: colors.secondary + '40' }}
                  >
                    <option value="">Seleccionar...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Advertencia cambio cliente */}
          {showClientChangeWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Cambio de cliente</p>
                  <p className="text-amber-700">
                    {event?.clave_evento} → {newEventKey}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-3">

          {/* Gestión Financiera */}
          <div className={sectionStyle} style={{ backgroundColor: colors.accent + '08', borderColor: colors.accent + '30' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <DollarSign className="w-4 h-4" style={{ color: colors.accent }} />
              <span className="text-sm font-medium" style={{ color: colors.accent }}>Gestión Financiera</span>
            </div>

            <div className="space-y-2">
              <div>
                <label className={labelStyle}>Ganancia Estimada</label>
                <input
                  type="text"
                  value={formData.ganancia_estimada ? formData.ganancia_estimada.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    handleInputChange('ganancia_estimada', parseFloat(value) || 0);
                  }}
                  className={inputStyle}
                  style={{ borderColor: colors.accent + '40' }}
                  placeholder="$0.00"
                />
              </div>

              {/* Provisiones - Grid 2x2 */}
              <div className="bg-white/50 rounded p-2 border" style={{ borderColor: colors.accent + '20' }}>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Provisiones</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[10px] text-gray-500">Combustible/Peaje</label>
                    <input
                      type="text"
                      value={formData.provision_combustible_peaje ? formData.provision_combustible_peaje.toLocaleString('es-MX') : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        handleInputChange('provision_combustible_peaje', parseFloat(value) || 0);
                      }}
                      className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded"
                      placeholder="$0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Materiales</label>
                    <input
                      type="text"
                      value={formData.provision_materiales ? formData.provision_materiales.toLocaleString('es-MX') : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        handleInputChange('provision_materiales', parseFloat(value) || 0);
                      }}
                      className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded"
                      placeholder="$0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Recursos Humanos</label>
                    <input
                      type="text"
                      value={formData.provision_recursos_humanos ? formData.provision_recursos_humanos.toLocaleString('es-MX') : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        handleInputChange('provision_recursos_humanos', parseFloat(value) || 0);
                      }}
                      className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded"
                      placeholder="$0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Solicitudes Pago</label>
                    <input
                      type="text"
                      value={formData.provision_solicitudes_pago ? formData.provision_solicitudes_pago.toLocaleString('es-MX') : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        handleInputChange('provision_solicitudes_pago', parseFloat(value) || 0);
                      }}
                      className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded"
                      placeholder="$0"
                    />
                  </div>
                </div>
              </div>

              {/* Resumen financiero */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <div className="bg-gray-50 rounded p-1.5 text-center">
                  <p className="text-[10px] text-gray-500">Provisiones</p>
                  <p className="text-xs font-semibold text-gray-700">
                    ${provisionesTotal.toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 text-center">
                  <p className="text-[10px] text-gray-500">Utilidad Est.</p>
                  <p className={`text-xs font-semibold ${porcentajeUtilidadEstimada < 35 ? 'text-red-600' : 'text-green-600'}`}>
                    ${utilidadEstimada.toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 text-center">
                  <p className="text-[10px] text-gray-500">% Utilidad</p>
                  <p className={`text-xs font-semibold ${porcentajeUtilidadEstimada < 35 ? 'text-red-600' : 'text-green-600'}`}>
                    {porcentajeUtilidadEstimada.toFixed(1)}%
                  </p>
                </div>
              </div>

              {porcentajeUtilidadEstimada < 35 && formData.ganancia_estimada > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Utilidad por debajo del 35%</span>
                </div>
              )}
            </div>
          </div>

          {/* Notas */}
          <div className={sectionStyle} style={{ backgroundColor: '#f8f9fa', borderColor: '#e9ecef' }}>
            <label className={labelStyle}>Notas (opcional)</label>
            <textarea
              value={formData.notas}
              onChange={(e) => handleInputChange('notas', e.target.value)}
              rows={2}
              className={`${inputStyle} resize-none`}
              style={{ borderColor: '#dee2e6' }}
              placeholder="Notas internas del evento..."
            />
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-1.5 text-sm"
        >
          <X className="w-4 h-4 mr-1" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="px-4 py-1.5 text-sm text-white"
          style={{ backgroundColor: colors.primary }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          {event ? 'Actualizar' : 'Crear Evento'}
        </Button>
      </div>
    </form>
  );
};
