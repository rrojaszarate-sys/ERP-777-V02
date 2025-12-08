import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Loader2, X, MapPin } from 'lucide-react';
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
  const [ejecutivos, setEjecutivos] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    nombre_proyecto: evento?.nombre_proyecto || '',
    descripcion: evento?.descripcion || '',
    fecha_evento: evento?.fecha_evento ? evento.fecha_evento.split('T')[0] : '',
    fecha_fin: evento?.fecha_fin ? evento.fecha_fin.split('T')[0] : '',
    lugar: evento?.lugar || '',
    cliente_id: evento?.cliente_id || '',
    tipo_evento_id: evento?.tipo_evento_id || '',
    ejecutivo_responsable_id: evento?.ejecutivo_responsable_id || '',
    ejecutivo_solicitante_id: evento?.ejecutivo_solicitante_id || '',
    ganancia_estimada: evento?.ganancia_estimada || '',
    provision_combustible_peaje: evento?.provision_combustible_peaje || '',
    provision_materiales: evento?.provision_materiales || '',
    provision_recursos_humanos: evento?.provision_recursos_humanos || '',
    provision_solicitudes_pago: evento?.provision_solicitudes_pago || '',
    notas: evento?.notas_internas || evento?.notas || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadClientes();
    loadEjecutivos();
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
        ejecutivo_responsable_id: evento.ejecutivo_responsable_id || '',
        ejecutivo_solicitante_id: evento.ejecutivo_solicitante_id || '',
        ganancia_estimada: evento.ganancia_estimada || evento.ingreso_estimado || 0,
        provision_combustible_peaje: evento.provision_combustible_peaje ?? 0,
        provision_materiales: evento.provision_materiales ?? 0,
        provision_recursos_humanos: evento.provision_recursos_humanos ?? 0,
        provision_solicitudes_pago: evento.provision_solicitudes_pago ?? 0,
        notas: evento.notas_internas || evento.notas || ''
      });
    }
  }, [evento]);

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('evt_clientes_erp')
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

  const loadEjecutivos = async () => {
    try {
      const { data, error } = await supabase
        .from('cont_ejecutivos')
        .select('id, nombre, email, departamento, cargo')
        .eq('activo', true)
        .order('nombre');

      if (error) {
        console.error('Error loading ejecutivos:', error);
        throw error;
      }

      console.log('✅ Ejecutivos cargados:', data?.length || 0, data);
      setEjecutivos(data || []);
    } catch (error) {
      console.error('❌ Error loading ejecutivos:', error);
      setEjecutivos([]);
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

    if (!formData.ejecutivo_responsable_id) {
      newErrors.ejecutivo_responsable_id = 'Debe asignar un responsable';
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
          .from('evt_eventos_erp')
          .select('clave_evento')
          .like('clave_evento', `EVT-${año}-%`)
          .order('clave_evento', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        let consecutivo = 1;
        if (ultimoEvento?.clave_evento) {
          const match = ultimoEvento.clave_evento.match(/EVT-\d{4}-(\d+)/);
          if (match) {
            consecutivo = parseInt(match[1]) + 1;
          }
        }
        
        clave_evento = `EVT-${año}-${consecutivo.toString().padStart(3, '0')}`;
      }
      
      // Clean up form data before saving - SOLO campos que existen en la tabla
      const cleanedData = {
        clave_evento,
        nombre_proyecto: formData.nombre_proyecto,
        descripcion: formData.descripcion || null,
        fecha_evento: formData.fecha_evento,
        fecha_fin: formData.fecha_fin || null,
        lugar: formData.lugar || null,
        tipo_evento_id: formData.tipo_evento_id ? parseInt(formData.tipo_evento_id.toString()) : null,
        cliente_id: formData.cliente_id ? parseInt(formData.cliente_id.toString()) : null,
        // Ejecutivos - INTEGER references a cont_ejecutivos
        ejecutivo_responsable_id: formData.ejecutivo_responsable_id ? parseInt(formData.ejecutivo_responsable_id.toString()) : null,
        ejecutivo_solicitante_id: formData.ejecutivo_solicitante_id ? parseInt(formData.ejecutivo_solicitante_id.toString()) : null,
        // Financiero
        ganancia_estimada: formData.ganancia_estimada ? parseFloat(formData.ganancia_estimada.toString()) : 0,
        provision_combustible_peaje: formData.provision_combustible_peaje ? parseFloat(formData.provision_combustible_peaje.toString()) : 0,
        provision_materiales: formData.provision_materiales ? parseFloat(formData.provision_materiales.toString()) : 0,
        provision_recursos_humanos: formData.provision_recursos_humanos ? parseFloat(formData.provision_recursos_humanos.toString()) : 0,
        provision_solicitudes_pago: formData.provision_solicitudes_pago ? parseFloat(formData.provision_solicitudes_pago.toString()) : 0,
        // Notas - el campo en la tabla es notas_internas
        notas_internas: formData.notas || null,
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

  // Calcular utilidad y margen
  const calcularFinanzas = () => {
    const ingresoTotal = parseFloat(formData.ganancia_estimada.toString()) || 0;
    const ingresoSubtotal = ingresoTotal / 1.16;
    const provisionesSubtotal = (
      (parseFloat(formData.provision_combustible_peaje.toString()) || 0) +
      (parseFloat(formData.provision_materiales.toString()) || 0) +
      (parseFloat(formData.provision_recursos_humanos.toString()) || 0) +
      (parseFloat(formData.provision_solicitudes_pago.toString()) || 0)
    );
    const utilidadBruta = ingresoSubtotal - provisionesSubtotal;
    const margenBruto = ingresoSubtotal > 0 ? ((utilidadBruta / ingresoSubtotal) * 100) : 0;
    return { ingresoSubtotal, provisionesSubtotal, utilidadBruta, margenBruto };
  };

  const finanzas = calcularFinanzas();

  return (
    <Modal isOpen={true} onClose={onClose} size="lg">
      {/* Header compacto */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gradient-to-r from-slate-700 to-slate-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">
            {evento ? 'Editar Evento' : 'Nuevo Evento'}
          </h2>
          {evento?.clave_evento && (
            <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/50 rounded text-xs font-medium text-emerald-300">
              {evento.clave_evento}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSubmit} disabled={loading} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5">
            {loading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {evento ? 'Guardar' : 'Crear'}
          </Button>
          <button onClick={onClose} className="text-gray-400 hover:text-white" disabled={loading}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-3 space-y-2 max-h-[75vh] overflow-y-auto">
        {/* Fila 1: Nombre + Fechas + Lugar */}
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-5">
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Proyecto *</label>
            <input
              type="text"
              value={formData.nombre_proyecto}
              onChange={(e) => handleInputChange('nombre_proyecto', e.target.value)}
              className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-emerald-500 ${errors.nombre_proyecto ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="Nombre del proyecto"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Fechas *</label>
            <DatePicker
              selected={formData.fecha_evento ? new Date(formData.fecha_evento) : null}
              onChange={(dates) => {
                const [start, end] = dates as [Date | null, Date | null];
                if (start) handleInputChange('fecha_evento', start.toISOString().split('T')[0]);
                if (end) handleInputChange('fecha_fin', end.toISOString().split('T')[0]);
                else if (start && !end) handleInputChange('fecha_fin', '');
              }}
              startDate={formData.fecha_evento ? new Date(formData.fecha_evento) : null}
              endDate={formData.fecha_fin ? new Date(formData.fecha_fin) : null}
              selectsRange
              dateFormat="dd/MM/yy"
              placeholderText="Rango"
              className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-emerald-500 ${errors.fecha_evento ? 'border-red-400' : 'border-gray-300'}`}
              isClearable
            />
          </div>
          <div className="col-span-4">
            <label className="block text-xs font-medium text-gray-600 mb-0.5">
              <MapPin className="w-3 h-3 inline mr-1" />Lugar
            </label>
            <input
              type="text"
              value={formData.lugar}
              onChange={(e) => handleInputChange('lugar', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
              placeholder="Ubicación"
            />
          </div>
        </div>

        {/* Fila 2: Cliente + Responsable + Solicitante */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Cliente *</label>
            <select
              value={formData.cliente_id}
              onChange={(e) => handleInputChange('cliente_id', e.target.value)}
              className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-emerald-500 ${errors.cliente_id ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Seleccionar...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_comercial || c.razon_social}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Responsable *</label>
            <select
              value={formData.ejecutivo_responsable_id}
              onChange={(e) => handleInputChange('ejecutivo_responsable_id', e.target.value)}
              className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-emerald-500 ${errors.ejecutivo_responsable_id ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Seleccionar...</option>
              {ejecutivos.map(e => <option key={e.id} value={e.id}>{e.nombre}{e.cargo ? ` - ${e.cargo}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Solicitante</label>
            <select
              value={formData.ejecutivo_solicitante_id}
              onChange={(e) => handleInputChange('ejecutivo_solicitante_id', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Seleccionar...</option>
              {ejecutivos.map(e => <option key={e.id} value={e.id}>{e.nombre}{e.cargo ? ` - ${e.cargo}` : ''}</option>)}
            </select>
          </div>
        </div>

        {/* Sección Financiera con KPI Velocímetro */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-700">Gestión Financiera</span>
          </div>

          {/* Ingreso Estimado + KPI Velocímetro */}
          <div className="grid grid-cols-12 gap-3 mb-3">
            {/* Ingreso - Campo grande */}
            <div className="col-span-8">
              <label className="block text-xs font-medium text-emerald-700 mb-1">Ingreso *</label>
              <NumericFormat
                value={formData.ganancia_estimada}
                onValueChange={(v) => handleInputChange('ganancia_estimada', v.floatValue || 0)}
                thousandSeparator="," decimalSeparator="." prefix="$ " decimalScale={2}
                fixedDecimalScale
                allowNegative={false}
                className="w-full px-3 py-2.5 text-lg font-bold border-2 border-emerald-400 rounded-lg bg-emerald-50 focus:ring-2 focus:ring-emerald-500 text-emerald-800"
                placeholder="$ 0.00"
              />
              <p className="text-[10px] text-gray-500 mt-0.5">Ingreso total del evento (con IVA)</p>
            </div>

            {/* KPI Velocímetro */}
            <div className="col-span-4 flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200 p-2">
              <GaugeChart value={finanzas.margenBruto} size="sm" showLabel={true} />
              <div className={`text-base font-bold mt-1 ${finanzas.utilidadBruta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ${finanzas.utilidadBruta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[9px] text-slate-500">Utilidad Bruta</div>
            </div>
          </div>

          {/* Provisiones - 4 campos en fila */}
          <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-800">Provisiones por Categoría</span>
              <span className="text-xs font-bold text-amber-900">
                Total: ${finanzas.provisionesSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-amber-700 mb-0.5">Combustible/Peaje</label>
                <NumericFormat
                  value={formData.provision_combustible_peaje}
                  onValueChange={(v) => handleInputChange('provision_combustible_peaje', v.floatValue || 0)}
                  thousandSeparator="," decimalSeparator="." prefix="$ " decimalScale={2}
                  allowNegative={false}
                  className="w-full px-2 py-2 text-sm font-semibold border border-amber-300 rounded bg-white focus:ring-1 focus:ring-amber-500"
                  placeholder="$ 0.00"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-amber-700 mb-0.5">Materiales</label>
                <NumericFormat
                  value={formData.provision_materiales}
                  onValueChange={(v) => handleInputChange('provision_materiales', v.floatValue || 0)}
                  thousandSeparator="," decimalSeparator="." prefix="$ " decimalScale={2}
                  allowNegative={false}
                  className="w-full px-2 py-2 text-sm font-semibold border border-amber-300 rounded bg-white focus:ring-1 focus:ring-amber-500"
                  placeholder="$ 0.00"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-amber-700 mb-0.5">Recursos Humanos</label>
                <NumericFormat
                  value={formData.provision_recursos_humanos}
                  onValueChange={(v) => handleInputChange('provision_recursos_humanos', v.floatValue || 0)}
                  thousandSeparator="," decimalSeparator="." prefix="$ " decimalScale={2}
                  allowNegative={false}
                  className="w-full px-2 py-2 text-sm font-semibold border border-amber-300 rounded bg-white focus:ring-1 focus:ring-amber-500"
                  placeholder="$ 0.00"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-amber-700 mb-0.5">Solicitudes Pago</label>
                <NumericFormat
                  value={formData.provision_solicitudes_pago}
                  onValueChange={(v) => handleInputChange('provision_solicitudes_pago', v.floatValue || 0)}
                  thousandSeparator="," decimalSeparator="." prefix="$ " decimalScale={2}
                  allowNegative={false}
                  className="w-full px-2 py-2 text-sm font-semibold border border-amber-300 rounded bg-white focus:ring-1 focus:ring-amber-500"
                  placeholder="$ 0.00"
                />
              </div>
            </div>
          </div>

          {/* Resumen de cálculo */}
          <div className="mt-2 flex items-center justify-center gap-3 text-xs bg-white/70 rounded px-3 py-1.5 border border-slate-200">
            <span className="text-slate-600">Subtotal: <b className="text-slate-800">${finanzas.ingresoSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</b></span>
            <span className="text-slate-400">−</span>
            <span className="text-slate-600">Provisiones: <b className="text-amber-700">${finanzas.provisionesSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</b></span>
            <span className="text-slate-400">=</span>
            <span className="text-slate-600">Utilidad: <b className={finanzas.utilidadBruta >= 0 ? 'text-emerald-700' : 'text-red-600'}>${finanzas.utilidadBruta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</b></span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-white text-[10px] font-bold ${
              finanzas.margenBruto >= 35 ? 'bg-emerald-500' : finanzas.margenBruto >= 25 ? 'bg-amber-500' : 'bg-red-500'
            }`}>
              {finanzas.margenBruto.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Descripción y notas compactas */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 resize-none"
              placeholder="Descripción breve..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Notas</label>
            <textarea
              value={formData.notas}
              onChange={(e) => handleInputChange('notas', e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 resize-none"
              placeholder="Notas internas..."
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};