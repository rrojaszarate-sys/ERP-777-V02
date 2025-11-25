import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Calendar, DollarSign, User, Tag, Lock, Star, Palette } from 'lucide-react';
import type { Proyecto, EtapaProyecto, Cliente, Usuario } from '../types';

interface ProyectoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (proyecto: Partial<Proyecto>) => Promise<void>;
  proyecto?: Proyecto | null;
  etapas: EtapaProyecto[];
  clientes: Cliente[];
  usuarios: Usuario[];
}

export const ProyectoModal: React.FC<ProyectoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  proyecto,
  etapas,
  clientes,
  usuarios
}) => {
  const [formData, setFormData] = useState<Partial<Proyecto>>({
    nombre: '',
    codigo: '',
    descripcion: '',
    cliente_id: null,
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin_estimada: '',
    presupuesto: 0,
    ingreso_estimado: 0,
    responsable_id: null,
    tipo_facturacion: 'precio_fijo',
    etapa_id: null,
    prioridad: 'media',
    privado: false,
    favorito: false,
    color: '#3B82F6',
    status: 'planificacion',
    progreso: 0,
    costo_real: 0,
    ingreso_real: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (proyecto) {
      setFormData({
        ...proyecto,
        fecha_inicio: proyecto.fecha_inicio.split('T')[0],
        fecha_fin_estimada: proyecto.fecha_fin_estimada.split('T')[0]
      });
    } else {
      // Reset form
      setFormData({
        nombre: '',
        codigo: '',
        descripcion: '',
        cliente_id: null,
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin_estimada: '',
        presupuesto: 0,
        ingreso_estimado: 0,
        responsable_id: null,
        tipo_facturacion: 'precio_fijo',
        etapa_id: etapas.length > 0 ? etapas[0].id : null,
        prioridad: 'media',
        privado: false,
        favorito: false,
        color: '#3B82F6',
        status: 'planificacion',
        progreso: 0,
        costo_real: 0,
        ingreso_real: 0
      });
    }
    setErrors({});
  }, [proyecto, isOpen, etapas]);

  const coloresDisponibles = [
    { value: '#3B82F6', label: 'Azul' },
    { value: '#10B981', label: 'Verde' },
    { value: '#F59E0B', label: 'Amarillo' },
    { value: '#EF4444', label: 'Rojo' },
    { value: '#8B5CF6', label: 'Morado' },
    { value: '#EC4899', label: 'Rosa' },
    { value: '#6B7280', label: 'Gris' },
    { value: '#06B6D4', label: 'Cyan' }
  ];

  const tiposFacturacion = [
    { value: 'precio_fijo', label: 'Precio Fijo', icon: '💰' },
    { value: 'tiempo_material', label: 'Tiempo y Material', icon: '⏱️' },
    { value: 'milestones', label: 'Por Milestones', icon: '🎯' },
    { value: 'no_facturable', label: 'No Facturable', icon: '🚫' }
  ];

  const prioridades = [
    { value: 'baja', label: 'Baja', color: 'bg-gray-100 text-gray-800' },
    { value: 'media', label: 'Media', color: 'bg-blue-100 text-blue-800' },
    { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-800' }
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre?.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!formData.fecha_inicio) {
      newErrors.fecha_inicio = 'La fecha de inicio es requerida';
    }

    if (!formData.fecha_fin_estimada) {
      newErrors.fecha_fin_estimada = 'La fecha de fin estimada es requerida';
    }

    if (formData.fecha_inicio && formData.fecha_fin_estimada) {
      if (new Date(formData.fecha_fin_estimada) < new Date(formData.fecha_inicio)) {
        newErrors.fecha_fin_estimada = 'La fecha de fin debe ser posterior a la fecha de inicio';
      }
    }

    if (formData.presupuesto !== undefined && formData.presupuesto < 0) {
      newErrors.presupuesto = 'El presupuesto no puede ser negativo';
    }

    if (formData.ingreso_estimado !== undefined && formData.ingreso_estimado < 0) {
      newErrors.ingreso_estimado = 'El ingreso estimado no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error al guardar proyecto:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof Proyecto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="flex min-h-screen items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {proyecto ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body - Scrollable */}
            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="px-6 py-6 space-y-6">
                {/* Sección: Información Básica */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Información Básica
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nombre */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del Proyecto <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => handleInputChange('nombre', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.nombre ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Ej: Sistema de Gestión de Inventario"
                      />
                      {errors.nombre && (
                        <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>
                      )}
                    </div>

                    {/* Código */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Código del Proyecto
                      </label>
                      <input
                        type="text"
                        value={formData.codigo || ''}
                        onChange={(e) => handleInputChange('codigo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: PROJ-2025-001"
                      />
                    </div>

                    {/* Cliente */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cliente
                      </label>
                      <select
                        value={formData.cliente_id || ''}
                        onChange={(e) => handleInputChange('cliente_id', e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Sin cliente</option>
                        {clientes.map(cliente => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.razon_social}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Descripción */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <textarea
                        value={formData.descripcion || ''}
                        onChange={(e) => handleInputChange('descripcion', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Descripción detallada del proyecto..."
                      />
                    </div>
                  </div>
                </div>

                {/* Sección: Fechas y Responsable */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Fechas y Responsable
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Fecha Inicio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Inicio <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_inicio}
                        onChange={(e) => handleInputChange('fecha_inicio', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.fecha_inicio ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.fecha_inicio && (
                        <p className="text-red-500 text-sm mt-1">{errors.fecha_inicio}</p>
                      )}
                    </div>

                    {/* Fecha Fin Estimada */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Fin Estimada <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_fin_estimada}
                        onChange={(e) => handleInputChange('fecha_fin_estimada', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.fecha_fin_estimada ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.fecha_fin_estimada && (
                        <p className="text-red-500 text-sm mt-1">{errors.fecha_fin_estimada}</p>
                      )}
                    </div>

                    {/* Responsable */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Responsable
                      </label>
                      <select
                        value={formData.responsable_id || ''}
                        onChange={(e) => handleInputChange('responsable_id', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Sin asignar</option>
                        {usuarios.map(usuario => (
                          <option key={usuario.id} value={usuario.id}>
                            {usuario.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Sección: Financiero */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Información Financiera
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Presupuesto */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Presupuesto
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.presupuesto}
                          onChange={(e) => handleInputChange('presupuesto', parseFloat(e.target.value) || 0)}
                          className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.presupuesto ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.presupuesto && (
                        <p className="text-red-500 text-sm mt-1">{errors.presupuesto}</p>
                      )}
                    </div>

                    {/* Ingreso Estimado */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ingreso Estimado
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.ingreso_estimado}
                          onChange={(e) => handleInputChange('ingreso_estimado', parseFloat(e.target.value) || 0)}
                          className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.ingreso_estimado ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.ingreso_estimado && (
                        <p className="text-red-500 text-sm mt-1">{errors.ingreso_estimado}</p>
                      )}
                    </div>

                    {/* Tipo de Facturación */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Facturación
                      </label>
                      <select
                        value={formData.tipo_facturacion}
                        onChange={(e) => handleInputChange('tipo_facturacion', e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {tiposFacturacion.map(tipo => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.icon} {tipo.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Margen Estimado (calculado) */}
                  {formData.ingreso_estimado !== undefined && formData.presupuesto !== undefined && formData.ingreso_estimado > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">Margen Estimado:</span>
                        <span className="font-semibold text-blue-700">
                          {(((formData.ingreso_estimado - formData.presupuesto) / formData.ingreso_estimado) * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-700">Ganancia Estimada:</span>
                        <span className="font-semibold text-green-700">
                          ${(formData.ingreso_estimado - formData.presupuesto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sección: Configuración */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Etapa */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Etapa
                      </label>
                      <select
                        value={formData.etapa_id || ''}
                        onChange={(e) => handleInputChange('etapa_id', e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Sin etapa</option>
                        {etapas.map(etapa => (
                          <option key={etapa.id} value={etapa.id}>
                            {etapa.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Prioridad */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prioridad
                      </label>
                      <div className="flex gap-2">
                        {prioridades.map(prioridad => (
                          <button
                            key={prioridad.value}
                            type="button"
                            onClick={() => handleInputChange('prioridad', prioridad.value)}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              formData.prioridad === prioridad.value
                                ? prioridad.color + ' ring-2 ring-offset-2 ring-blue-500'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {prioridad.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Palette className="w-4 h-4" />
                        Color del Proyecto
                      </label>
                      <div className="flex gap-2">
                        {coloresDisponibles.map(color => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => handleInputChange('color', color.value)}
                            className={`w-10 h-10 rounded-full border-2 transition-all ${
                              formData.color === color.value
                                ? 'border-gray-900 scale-110'
                                : 'border-gray-300 hover:scale-105'
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Opciones adicionales */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.privado}
                          onChange={(e) => handleInputChange('privado', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <Lock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Proyecto Privado</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.favorito}
                          onChange={(e) => handleInputChange('favorito', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <Star className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Marcar como Favorito</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Sticky */}
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSubmitting ? 'Guardando...' : proyecto ? 'Actualizar Proyecto' : 'Crear Proyecto'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
