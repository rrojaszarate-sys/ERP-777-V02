import React, { useState, useEffect } from 'react';
import { Calendar, User, FileText, DollarSign, Loader2, X } from 'lucide-react';
import { NumericFormat } from 'react-number-format';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { supabase } from '../../../core/config/supabase';
import { GaugeChart } from './GaugeChart';

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CAMPOS DE LA TABLA evt_eventos - REFERENCIA
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * ✅ CAMPOS ACTIVOS (se guardan en tabla):
 * - ganancia_estimada: INGRESO ESTIMADO del evento (NO es ganancia, es ingreso total esperado)
 * - provision_combustible_peaje: Provisión para combustible y peajes
 * - provision_materiales: Provisión para materiales
 * - provision_recursos_humanos: Provisión para RRHH
 * - provision_solicitudes_pago: Provisión para SPs
 * 
 * ❌ CAMPOS OBSOLETOS (calculados en vista vw_eventos_analisis_financiero):
 * - provisiones: Se calcula como suma de las 4 provisiones
 * - utilidad_estimada: Se calcula como ganancia_estimada - provisiones_total
 * - porcentaje_utilidad_estimada: Se calcula como (utilidad_estimada / ganancia_estimada) * 100
 * - total_gastos: Se calcula desde evt_gastos (pagados)
 * - utilidad: Se calcula como ingresos_cobrados - gastos_pagados
 * - margen_utilidad: Se calcula como (utilidad_real / ingresos_cobrados) * 100
 * 
 * 📊 LA VISTA vw_eventos_analisis_financiero EXPONE:
 * - ingreso_estimado (alias de ganancia_estimada)
 * - ingresos_cobrados (desde evt_ingresos WHERE cobrado = true)
 * - ingresos_pendientes (desde evt_ingresos WHERE cobrado = false)
 * - gastos_*_pagados y gastos_*_pendientes por cada categoría
 * - provisiones_total (suma de las 4 provisiones)
 * - utilidad_estimada (ingreso_estimado - provisiones_total)
 * - utilidad_real (ingresos_cobrados - gastos_pagados)
 * - margen_estimado_pct y margen_real_pct
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

interface EventoModalProps {
  evento?: any;
  onClose: () => void;
  onSave: (data?: any) => void;
}

export const EventoModal: React.FC<EventoModalProps> = ({ evento, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    nombre_proyecto: evento?.nombre_proyecto || '',
    descripcion: evento?.descripcion || '',
    fecha_evento: evento?.fecha_evento ? evento.fecha_evento.split('T')[0] : '',
    fecha_fin: evento?.fecha_fin ? evento.fecha_fin.split('T')[0] : '',
    lugar: evento?.lugar || '',
    cliente_id: evento?.cliente_id || '',
    tipo_evento_id: evento?.tipo_evento_id || '',
    responsable_id: evento?.responsable_id || '',
    solicitante_id: evento?.solicitante_id || '',
    ganancia_estimada: evento?.ganancia_estimada || '',
    provision_combustible_peaje: evento?.provision_combustible_peaje || '',
    provision_materiales: evento?.provision_materiales || '',
    provision_recursos_humanos: evento?.provision_recursos_humanos || '',
    provision_solicitudes_pago: evento?.provision_solicitudes_pago || '',
    notas: evento?.notas || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadClientes();
    loadUsuarios();
  }, []);

  // Actualizar formData cuando cambia el evento (para modo edición)
  useEffect(() => {
    if (evento) {
      setFormData({
        nombre_proyecto: evento.nombre_proyecto || '',
        descripcion: evento.descripcion || '',
        fecha_evento: evento.fecha_evento ? evento.fecha_evento.split('T')[0] : '',
        fecha_fin: evento.fecha_fin ? evento.fecha_fin.split('T')[0] : '',
        lugar: evento.lugar || '',
        cliente_id: evento.cliente_id || '',
        tipo_evento_id: evento.tipo_evento_id || '',
        responsable_id: evento.responsable_id || '',
        solicitante_id: evento.solicitante_id || '',
        ganancia_estimada: evento.ganancia_estimada || evento.ingreso_estimado || '',
        provision_combustible_peaje: evento.provision_combustible_peaje || '',
        provision_materiales: evento.provision_materiales || '',
        provision_recursos_humanos: evento.provision_recursos_humanos || '',
        provision_solicitudes_pago: evento.provision_solicitudes_pago || '',
        notas: evento.notas || ''
      });
    }
  }, [evento]);

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('evt_clientes')
        .select('id, razon_social, nombre_comercial, sufijo')
        .eq('activo', true)
        .order('razon_social');

      if (error) {
        console.error('Error loading clientes:', error);
        setClientes([]);
        return;
      }

      setClientes(data || []);
    } catch (error) {
      console.error('Error loading clientes:', error);
      setClientes([]);
    }
  };

  const loadUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('core_users')
        .select('id, nombre, apellidos, email')
        .eq('activo', true)
        .order('nombre');

      if (error) {
        console.error('Error loading usuarios:', error);
        throw error;
      }

      console.log('✅ Usuarios cargados:', data?.length || 0, data);
      setUsuarios(data || []);
    } catch (error) {
      console.error('❌ Error loading usuarios:', error);
      setUsuarios([]);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre_proyecto.trim()) {
      newErrors.nombre_proyecto = 'El nombre del proyecto es requerido';
    }

    if (!formData.fecha_evento) {
      newErrors.fecha_evento = 'La fecha del evento es requerida';
    }

    if (!formData.cliente_id) {
      newErrors.cliente_id = 'Debe seleccionar un cliente';
    }

    if (!formData.responsable_id) {
      newErrors.responsable_id = 'Debe seleccionar un responsable';
    }

    if (!formData.responsable_id) {
      newErrors.responsable_id = 'Debe asignar un responsable';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      let clave_evento = evento?.clave_evento;
      
      // Generar clave_evento si es un evento nuevo (formato: EVT-2025-001)
      if (!clave_evento) {
        const año = new Date().getFullYear();
        
        // Obtener el último consecutivo del año
        const { data: ultimoEvento } = await supabase
          .from('evt_eventos')
          .select('clave_evento')
          .like('clave_evento', `EVT-${año}-%`)
          .order('clave_evento', { ascending: false })
          .limit(1)
          .single();
        
        let consecutivo = 1;
        if (ultimoEvento?.clave_evento) {
          const match = ultimoEvento.clave_evento.match(/EVT-\d{4}-(\d+)/);
          if (match) {
            consecutivo = parseInt(match[1]) + 1;
          }
        }
        
        clave_evento = `EVT-${año}-${consecutivo.toString().padStart(3, '0')}`;
      }
      
      // Clean up form data before saving
      const cleanedData = {
        ...formData,
        clave_evento,
        tipo_evento_id: formData.tipo_evento_id ? parseInt(formData.tipo_evento_id.toString()) : null,
        cliente_id: formData.cliente_id ? parseInt(formData.cliente_id.toString()) : null,
        // UUID fields - keep as string or null, NOT parseInt
        responsable_id: formData.responsable_id || null,
        solicitante_id: formData.solicitante_id || null,
        fecha_fin: formData.fecha_fin || null,
        ganancia_estimada: formData.ganancia_estimada ? parseFloat(formData.ganancia_estimada.toString()) : null,
        provision_combustible_peaje: formData.provision_combustible_peaje ? parseFloat(formData.provision_combustible_peaje.toString()) : 0,
        provision_materiales: formData.provision_materiales ? parseFloat(formData.provision_materiales.toString()) : 0,
        provision_recursos_humanos: formData.provision_recursos_humanos ? parseFloat(formData.provision_recursos_humanos.toString()) : 0,
        provision_solicitudes_pago: formData.provision_solicitudes_pago ? parseFloat(formData.provision_solicitudes_pago.toString()) : 0,
      };
      
      console.log('📤 Guardando evento:', cleanedData);
      onSave(cleanedData);
    } catch (error) {
      console.error('❌ Error al guardar evento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="xl"
    >
      {/* Header personalizado con clave y botón guardar */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">
            {evento ? 'Editar Evento' : 'Nuevo Evento'}
          </h2>
          {evento && evento.clave_evento && (
            <span className="px-3 py-1 bg-blue-100 border border-blue-300 rounded-lg text-sm font-semibold text-blue-800">
              {evento.clave_evento}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-mint-500 hover:bg-mint-600"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {evento ? 'Guardar' : 'Crear'}
          </Button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {/* Información básica */}
        <div className="bg-blue-50 rounded-lg p-3">
          <h3 className="text-base font-medium text-blue-900 mb-2 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Información del Evento
          </h3>

          {/* Info sobre clave de evento si es nuevo */}
          {!evento && formData.cliente_id && (
            <div className="mb-2 p-2 bg-mint-50 border border-mint-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-mint-600" />
                <span className="text-xs text-mint-800">
                  <strong>Clave:</strong> {clientes.find(c => c.id === formData.cliente_id)?.sufijo || '???'}{new Date().getFullYear()}-###
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {/* Fila 1: Nombre (70%) + Fechas (30%) */}
            <div className="grid grid-cols-1 md:grid-cols-10 gap-3">
              <div className="md:col-span-7">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  value={formData.nombre_proyecto}
                  onChange={(e) => handleInputChange('nombre_proyecto', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
                    errors.nombre_proyecto ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Conferencia Anual de Tecnología"
                />
                {errors.nombre_proyecto && (
                  <p className="text-red-600 text-sm mt-1">{errors.nombre_proyecto}</p>
                )}
              </div>

              {/* Selector de Rango de Fechas */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fechas del Evento *
                </label>
                <DatePicker
                  selected={formData.fecha_evento ? new Date(formData.fecha_evento) : null}
                  onChange={(dates) => {
                    const [start, end] = dates as [Date | null, Date | null];
                    if (start) {
                      handleInputChange('fecha_evento', start.toISOString().split('T')[0]);
                    }
                    if (end) {
                      handleInputChange('fecha_fin', end.toISOString().split('T')[0]);
                    } else if (start && !end) {
                      handleInputChange('fecha_fin', '');
                    }
                  }}
                  startDate={formData.fecha_evento ? new Date(formData.fecha_evento) : null}
                  endDate={formData.fecha_fin ? new Date(formData.fecha_fin) : null}
                  selectsRange
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Seleccionar rango"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
                    errors.fecha_evento ? 'border-red-500' : 'border-gray-300'
                  }`}
                  isClearable
                />
                {errors.fecha_evento && (
                  <p className="text-red-600 text-sm mt-1">{errors.fecha_evento}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">Selecciona 1 día o rango</p>
              </div>
            </div>

            {/* Fila 2: Ubicación (ancho completo) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ubicación / Lugar
              </label>
              <input
                type="text"
                value={formData.lugar}
                onChange={(e) => handleInputChange('lugar', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
                placeholder="Centro de Convenciones, Hotel, etc."
              />
            </div>
          </div>
        </div>

        {/* Asignación y Cliente */}
        <div className="bg-green-50 rounded-lg p-3">
          <h3 className="text-base font-medium text-green-900 mb-2 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Cliente y Asignación
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente *
              </label>
              <select
                value={formData.cliente_id}
                onChange={(e) => handleInputChange('cliente_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
                  errors.cliente_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre_comercial || cliente.razon_social}
                  </option>
                ))}
              </select>
              {errors.cliente_id && (
                <p className="text-red-600 text-sm mt-1">{errors.cliente_id}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsable *
              </label>
              <select
                value={formData.responsable_id}
                onChange={(e) => handleInputChange('responsable_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
                  errors.responsable_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar responsable...</option>
                {usuarios.map(usuario => (
                  <option key={usuario.id} value={usuario.id}>
                    {`${usuario.nombre} ${usuario.apellidos || ''}`.trim()}
                  </option>
                ))}
              </select>
              {errors.responsable_id && (
                <p className="text-red-600 text-sm mt-1">{errors.responsable_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Solicitante
              </label>
              <select
                value={formData.solicitante_id}
                onChange={(e) => handleInputChange('solicitante_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
              >
                <option value="">Seleccionar solicitante...</option>
                {usuarios.map(usuario => (
                  <option key={usuario.id} value={usuario.id}>
                    {`${usuario.nombre} ${usuario.apellidos || ''}`.trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Gestión Financiera */}
        <div className="bg-purple-50 rounded-lg p-3">
          <h3 className="text-base font-medium text-purple-900 mb-3 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            💵 Gestión Financiera
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            {/* INGRESO ESTIMADO - Campo principal que se guarda en ganancia_estimada */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ingreso Estimado ($) *
              </label>
              <NumericFormat
                value={formData.ganancia_estimada}
                onValueChange={(values) => {
                  handleInputChange('ganancia_estimada', values.floatValue || 0);
                }}
                thousandSeparator=","
                decimalSeparator="."
                prefix="$ "
                decimalScale={2}
                fixedDecimalScale={true}
                allowNegative={false}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent text-lg font-semibold"
                placeholder="$ 0.00"
              />
              <p className="text-gray-500 text-xs mt-1">Ingreso total esperado del evento</p>
            </div>

            {/* UTILIDAD ESTIMADA - Velocímetro */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utilidad Estimada <span className="text-gray-500 text-xs">[CALCULADO]</span>
              </label>
              <div className="w-full flex flex-col items-center justify-center">
                {(() => {
                  const ingreso = parseFloat(formData.ganancia_estimada.toString()) || 0;
                  const provisiones = (
                    (parseFloat(formData.provision_combustible_peaje.toString()) || 0) +
                    (parseFloat(formData.provision_materiales.toString()) || 0) +
                    (parseFloat(formData.provision_recursos_humanos.toString()) || 0) +
                    (parseFloat(formData.provision_solicitudes_pago.toString()) || 0)
                  );
                  const utilidad = ingreso - provisiones;
                  const porcentaje = ingreso > 0 ? ((utilidad / ingreso) * 100) : 0;

                  return (
                    <>
                      <GaugeChart value={porcentaje} size="md" showLabel={true} />
                      <div className="text-gray-800 font-bold text-base mt-1">
                        ${utilidad.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {evento && evento.estado_evento && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Estado:</strong> {evento.estado_evento}
              </p>
            </div>
          )}

          {/* Provisiones Divididas - 4 Categorías */}
          <div className="mt-3 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              💰 Provisiones por Categoría
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Combustible y Peaje */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ⛽ Combustible y Peaje
                </label>
                <NumericFormat
                  value={formData.provision_combustible_peaje}
                  onValueChange={(values) => {
                    handleInputChange('provision_combustible_peaje', values.floatValue || 0);
                  }}
                  thousandSeparator=","
                  decimalSeparator="."
                  prefix="$ "
                  decimalScale={2}
                  fixedDecimalScale={true}
                  allowNegative={false}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-semibold"
                  placeholder="$ 0.00"
                />
              </div>

              {/* Materiales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🛠️ Materiales
                </label>
                <NumericFormat
                  value={formData.provision_materiales}
                  onValueChange={(values) => {
                    handleInputChange('provision_materiales', values.floatValue || 0);
                  }}
                  thousandSeparator=","
                  decimalSeparator="."
                  prefix="$ "
                  decimalScale={2}
                  fixedDecimalScale={true}
                  allowNegative={false}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-semibold"
                  placeholder="$ 0.00"
                />
              </div>

              {/* Recursos Humanos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  👥 Recursos Humanos
                </label>
                <NumericFormat
                  value={formData.provision_recursos_humanos}
                  onValueChange={(values) => {
                    handleInputChange('provision_recursos_humanos', values.floatValue || 0);
                  }}
                  thousandSeparator=","
                  decimalSeparator="."
                  prefix="$ "
                  decimalScale={2}
                  fixedDecimalScale={true}
                  allowNegative={false}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-semibold"
                  placeholder="$ 0.00"
                />
              </div>

              {/* Solicitudes de Pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  💳 Solicitudes de Pago
                </label>
                <NumericFormat
                  value={formData.provision_solicitudes_pago}
                  onValueChange={(values) => {
                    handleInputChange('provision_solicitudes_pago', values.floatValue || 0);
                  }}
                  thousandSeparator=","
                  decimalSeparator="."
                  prefix="$ "
                  decimalScale={2}
                  fixedDecimalScale={true}
                  allowNegative={false}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-semibold"
                  placeholder="$ 0.00"
                />
              </div>
            </div>

            {/* Total de Provisiones */}
            <div className="mt-2 p-2 bg-white border-2 border-yellow-400 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700">Total Provisiones:</span>
                <span className="text-base font-bold text-yellow-900">
                  ${((parseFloat(formData.provision_combustible_peaje.toString()) || 0) +
                     (parseFloat(formData.provision_materiales.toString()) || 0) +
                     (parseFloat(formData.provision_recursos_humanos.toString()) || 0) +
                     (parseFloat(formData.provision_solicitudes_pago.toString()) || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Descripción y notas - Grid para ahorrar espacio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent resize-none"
              placeholder="Descripción del evento..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas Internas
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => handleInputChange('notas', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent resize-none"
              placeholder="Notas internas..."
            />
          </div>
        </div>

      </form>
    </Modal>
  );
};