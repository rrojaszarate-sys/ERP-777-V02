import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Calendar, DollarSign, User, Tag, CheckSquare, Plus,
  Trash2, Users, Link as LinkIcon, Target, Clock, Palette
} from 'lucide-react';
import type { Tarea, EtapaTarea, Proyecto, Usuario, Hito, ChecklistItem } from '../types';

interface TareaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tarea: Partial<Tarea>) => Promise<void>;
  tarea?: Tarea | null;
  proyectos: Proyecto[];
  etapas: EtapaTarea[];
  usuarios: Usuario[];
  milestones: Hito[];
  tareasDisponibles: Tarea[]; // Para dependencias
}

export const TareaModal: React.FC<TareaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  tarea,
  proyectos,
  etapas,
  usuarios,
  milestones,
  tareasDisponibles
}) => {
  const [formData, setFormData] = useState<Partial<Tarea>>({
    nombre: '',
    descripcion: '',
    proyecto_id: 0,
    tarea_padre_id: null,
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    horas_estimadas: 0,
    horas_facturables: 0,
    asignado_a: null,
    watchers: [],
    etapa_id: null,
    prioridad: 'media',
    checklist: [],
    milestone_id: null,
    dependencias: [],
    facturable: true,
    costo_estimado: 0,
    color: null,
    etiquetas: [],
    progreso: 0,
    status: 'pendiente',
    horas_reales: 0,
    facturado: false,
    costo_real: 0,
    secuencia: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newEtiqueta, setNewEtiqueta] = useState('');

  useEffect(() => {
    if (tarea) {
      setFormData({
        ...tarea,
        fecha_inicio: tarea.fecha_inicio.split('T')[0],
        fecha_fin: tarea.fecha_fin.split('T')[0]
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        proyecto_id: proyectos.length > 0 ? proyectos[0].id : 0,
        tarea_padre_id: null,
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: '',
        horas_estimadas: 0,
        horas_facturables: 0,
        asignado_a: null,
        watchers: [],
        etapa_id: etapas.length > 0 ? etapas[0].id : null,
        prioridad: 'media',
        checklist: [],
        milestone_id: null,
        dependencias: [],
        facturable: true,
        costo_estimado: 0,
        color: null,
        etiquetas: [],
        progreso: 0,
        status: 'pendiente',
        horas_reales: 0,
        facturado: false,
        costo_real: 0,
        secuencia: 0
      });
    }
    setErrors({});
    setNewChecklistItem('');
    setNewEtiqueta('');
  }, [tarea, isOpen, proyectos, etapas]);

  const coloresDisponibles = [
    { value: '#3B82F6', label: 'Azul' },
    { value: '#10B981', label: 'Verde' },
    { value: '#F59E0B', label: 'Amarillo' },
    { value: '#EF4444', label: 'Rojo' },
    { value: '#8B5CF6', label: 'Morado' },
    { value: '#EC4899', label: 'Rosa' }
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

    if (!formData.proyecto_id) {
      newErrors.proyecto_id = 'Debe seleccionar un proyecto';
    }

    if (!formData.fecha_inicio) {
      newErrors.fecha_inicio = 'La fecha de inicio es requerida';
    }

    if (!formData.fecha_fin) {
      newErrors.fecha_fin = 'La fecha de fin es requerida';
    }

    if (formData.fecha_inicio && formData.fecha_fin) {
      if (new Date(formData.fecha_fin) < new Date(formData.fecha_inicio)) {
        newErrors.fecha_fin = 'La fecha de fin debe ser posterior a la fecha de inicio';
      }
    }

    if (formData.horas_estimadas !== undefined && formData.horas_estimadas < 0) {
      newErrors.horas_estimadas = 'Las horas estimadas no pueden ser negativas';
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
      console.error('Error al guardar tarea:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof Tarea, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Checklist functions
  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;

    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      texto: newChecklistItem,
      completado: false,
      asignado_a: null
    };

    setFormData(prev => ({
      ...prev,
      checklist: [...(prev.checklist || []), newItem]
    }));
    setNewChecklistItem('');
  };

  const toggleChecklistItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist?.map(item =>
        item.id === id ? { ...item, completado: !item.completado } : item
      )
    }));
  };

  const removeChecklistItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist?.filter(item => item.id !== id)
    }));
  };

  // Etiquetas functions
  const addEtiqueta = () => {
    if (!newEtiqueta.trim()) return;
    if (formData.etiquetas?.includes(newEtiqueta.trim())) return;

    setFormData(prev => ({
      ...prev,
      etiquetas: [...(prev.etiquetas || []), newEtiqueta.trim()]
    }));
    setNewEtiqueta('');
  };

  const removeEtiqueta = (etiqueta: string) => {
    setFormData(prev => ({
      ...prev,
      etiquetas: prev.etiquetas?.filter(e => e !== etiqueta)
    }));
  };

  // Watchers functions
  const toggleWatcher = (usuarioId: string) => {
    const watchers = formData.watchers || [];
    if (watchers.includes(usuarioId)) {
      setFormData(prev => ({
        ...prev,
        watchers: watchers.filter(id => id !== usuarioId)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        watchers: [...watchers, usuarioId]
      }));
    }
  };

  // Dependencias functions
  const toggleDependencia = (tareaId: number) => {
    const dependencias = formData.dependencias || [];
    if (dependencias.includes(tareaId)) {
      setFormData(prev => ({
        ...prev,
        dependencias: dependencias.filter(id => id !== tareaId)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        dependencias: [...dependencias, tareaId]
      }));
    }
  };

  if (!isOpen) return null;

  // Calcular progreso del checklist
  const checklistProgress = formData.checklist && formData.checklist.length > 0
    ? (formData.checklist.filter(item => item.completado).length / formData.checklist.length) * 100
    : 0;

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
            className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {tarea ? 'Editar Tarea' : 'Nueva Tarea'}
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
                        Nombre de la Tarea <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => handleInputChange('nombre', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.nombre ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Ej: Implementar autenticación de usuarios"
                      />
                      {errors.nombre && (
                        <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>
                      )}
                    </div>

                    {/* Proyecto */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Proyecto <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.proyecto_id}
                        onChange={(e) => handleInputChange('proyecto_id', Number(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.proyecto_id ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Seleccionar proyecto</option>
                        {proyectos.map(proyecto => (
                          <option key={proyecto.id} value={proyecto.id}>
                            {proyecto.nombre}
                          </option>
                        ))}
                      </select>
                      {errors.proyecto_id && (
                        <p className="text-red-500 text-sm mt-1">{errors.proyecto_id}</p>
                      )}
                    </div>

                    {/* Tarea Padre (para subtareas) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tarea Padre (Subtarea de)
                      </label>
                      <select
                        value={formData.tarea_padre_id || ''}
                        onChange={(e) => handleInputChange('tarea_padre_id', e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Ninguna (tarea principal)</option>
                        {tareasDisponibles.filter(t => t.id !== tarea?.id).map(t => (
                          <option key={t.id} value={t.id}>
                            {t.nombre}
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
                        placeholder="Descripción detallada de la tarea..."
                      />
                    </div>
                  </div>
                </div>

                {/* Sección: Fechas y Tiempo */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Fechas y Tiempo
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Fecha Inicio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha Inicio <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_inicio}
                        onChange={(e) => handleInputChange('fecha_inicio', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.fecha_inicio ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>

                    {/* Fecha Fin */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha Fin <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_fin}
                        onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.fecha_fin ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>

                    {/* Horas Estimadas */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Horas Estimadas
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.horas_estimadas}
                        onChange={(e) => handleInputChange('horas_estimadas', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Horas Facturables */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hrs. Facturables
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.horas_facturables}
                        onChange={(e) => handleInputChange('horas_facturables', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Sección: Asignación */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Asignación y Seguimiento
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Asignado a */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Asignado a
                      </label>
                      <select
                        value={formData.asignado_a || ''}
                        onChange={(e) => handleInputChange('asignado_a', e.target.value || null)}
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

                    {/* Milestone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        Milestone
                      </label>
                      <select
                        value={formData.milestone_id || ''}
                        onChange={(e) => handleInputChange('milestone_id', e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Sin milestone</option>
                        {milestones.map(milestone => (
                          <option key={milestone.id} value={milestone.id}>
                            {milestone.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Watchers/Seguidores */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Seguidores (Watchers)
                      </label>
                      <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50 min-h-[60px]">
                        {usuarios.map(usuario => (
                          <button
                            key={usuario.id}
                            type="button"
                            onClick={() => toggleWatcher(usuario.id)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                              formData.watchers?.includes(usuario.id)
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {usuario.nombre}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Los seguidores recibirán notificaciones de cambios en esta tarea
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sección: Configuración */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Etapa */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Etapa (Kanban)
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
                            className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
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

                    {/* Costo Estimado */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        Costo Estimado
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.costo_estimado}
                        onChange={(e) => handleInputChange('costo_estimado', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Facturable */}
                    <div className="flex items-center gap-4 pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.facturable}
                          onChange={(e) => handleInputChange('facturable', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Facturable</span>
                      </label>
                    </div>

                    {/* Color */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <Palette className="w-4 h-4" />
                        Color (opcional)
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleInputChange('color', null)}
                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                            formData.color === null
                              ? 'border-gray-900'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <X className="w-5 h-5 text-gray-400" />
                        </button>
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
                  </div>
                </div>

                {/* Sección: Checklist */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    Checklist
                    {formData.checklist && formData.checklist.length > 0 && (
                      <span className="text-sm text-gray-500">
                        ({formData.checklist.filter(i => i.completado).length}/{formData.checklist.length})
                      </span>
                    )}
                  </h3>

                  {/* Barra de progreso del checklist */}
                  {formData.checklist && formData.checklist.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Progreso del Checklist</span>
                        <span className="font-semibold text-blue-600">{Math.round(checklistProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${checklistProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Lista de items */}
                  <div className="space-y-2 mb-3">
                    {formData.checklist?.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={item.completado}
                          onChange={() => toggleChecklistItem(item.id)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className={`flex-1 text-sm ${item.completado ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {item.texto}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeChecklistItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Agregar nuevo item */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                      placeholder="Agregar item al checklist..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={addChecklistItem}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar
                    </button>
                  </div>
                </div>

                {/* Sección: Etiquetas */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Etiquetas</h3>

                  <div className="flex flex-wrap gap-2 mb-3 min-h-[40px] p-2 border border-gray-300 rounded-lg bg-gray-50">
                    {formData.etiquetas?.map(etiqueta => (
                      <span
                        key={etiqueta}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {etiqueta}
                        <button
                          type="button"
                          onClick={() => removeEtiqueta(etiqueta)}
                          className="hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {(!formData.etiquetas || formData.etiquetas.length === 0) && (
                      <span className="text-sm text-gray-400">Sin etiquetas</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newEtiqueta}
                      onChange={(e) => setNewEtiqueta(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEtiqueta())}
                      placeholder="Agregar etiqueta..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={addEtiqueta}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <Tag className="w-4 h-4" />
                      Agregar
                    </button>
                  </div>
                </div>

                {/* Sección: Dependencias */}
                {tareasDisponibles.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <LinkIcon className="w-5 h-5" />
                      Dependencias
                    </h3>

                    <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 max-h-60 overflow-y-auto">
                      {tareasDisponibles.filter(t => t.id !== tarea?.id).map(t => (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.dependencias?.includes(t.id)}
                            onChange={() => toggleDependencia(t.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-900">{t.nombre}</span>
                        </label>
                      ))}
                      {tareasDisponibles.filter(t => t.id !== tarea?.id).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">
                          No hay tareas disponibles para dependencias
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Esta tarea se bloqueará hasta que se completen sus dependencias
                    </p>
                  </div>
                )}
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
                    {isSubmitting ? 'Guardando...' : tarea ? 'Actualizar Tarea' : 'Crear Tarea'}
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
