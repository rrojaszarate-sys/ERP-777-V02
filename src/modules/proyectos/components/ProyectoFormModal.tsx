import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { useProyectos } from '../hooks';
import type { Proyecto, TipoProyecto, PrioridadProyecto, EstatusProyecto } from '../types';

interface ProyectoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  proyecto?: Proyecto;
}

export const ProyectoFormModal: React.FC<ProyectoFormModalProps> = ({
  isOpen,
  onClose,
  proyecto,
}) => {
  const { createProyecto, updateProyecto, isCreating, isUpdating } = useProyectos();
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'CLIENTE' as TipoProyecto,
    cliente_id: '',
    contacto_nombre: '',
    contacto_email: '',
    fecha_inicio: '',
    fecha_fin_estimada: '',
    presupuesto: 0,
    estatus: 'PLANEACION' as EstatusProyecto,
    prioridad: 'MEDIA' as PrioridadProyecto,
    progreso: 0,
    responsable_id: '',
    observaciones: '',
  });

  useEffect(() => {
    if (proyecto) {
      setFormData({
        nombre: proyecto.nombre,
        descripcion: proyecto.descripcion || '',
        tipo: proyecto.tipo,
        cliente_id: proyecto.cliente_id || '',
        contacto_nombre: proyecto.contacto_nombre || '',
        contacto_email: proyecto.contacto_email || '',
        fecha_inicio: proyecto.fecha_inicio,
        fecha_fin_estimada: proyecto.fecha_fin_estimada,
        presupuesto: proyecto.presupuesto,
        estatus: proyecto.estatus,
        prioridad: proyecto.prioridad,
        progreso: proyecto.progreso,
        responsable_id: proyecto.responsable_id || '',
        observaciones: proyecto.observaciones || '',
      });
    }
  }, [proyecto]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (proyecto) {
      updateProyecto({ id: proyecto.id, data: formData });
    } else {
      createProyecto(formData);
    }

    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={proyecto ? 'Editar Proyecto' : 'Nuevo Proyecto'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Información del Proyecto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Proyecto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Proyecto <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="INTERNO">Interno</option>
                <option value="CLIENTE">Cliente</option>
                <option value="DESARROLLO">Desarrollo</option>
                <option value="CONSULTORIA">Consultoría</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad <span className="text-red-500">*</span>
              </label>
              <select
                name="prioridad"
                value={formData.prioridad}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
          </div>
        </div>

        {/* Información del Cliente */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Información del Cliente</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Contacto
              </label>
              <input
                type="text"
                name="contacto_nombre"
                value={formData.contacto_nombre}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email del Contacto
              </label>
              <input
                type="email"
                name="contacto_email"
                value={formData.contacto_email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Fechas y Presupuesto */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Fechas y Presupuesto</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="fecha_inicio"
                value={formData.fecha_inicio}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin Estimada <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="fecha_fin_estimada"
                value={formData.fecha_fin_estimada}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presupuesto <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="presupuesto"
                value={formData.presupuesto}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Control del Proyecto */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Control del Proyecto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estatus <span className="text-red-500">*</span>
              </label>
              <select
                name="estatus"
                value={formData.estatus}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="PLANEACION">Planeación</option>
                <option value="ACTIVO">Activo</option>
                <option value="EN_PAUSA">En Pausa</option>
                <option value="COMPLETADO">Completado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progreso (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="progreso"
                value={formData.progreso}
                onChange={handleChange}
                min="0"
                max="100"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${formData.progreso}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones
          </label>
          <textarea
            name="observaciones"
            value={formData.observaciones}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {/* Resumen del Proyecto */}
        {proyecto && (
          <div className="border-t pt-4 bg-amber-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-amber-900 mb-3">Resumen del Proyecto</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-amber-700">Presupuesto:</span>
                <span className="ml-2 font-medium text-amber-900">
                  ${formData.presupuesto.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-amber-700">Costo Real:</span>
                <span className="ml-2 font-medium text-amber-900">
                  ${proyecto.costo_real.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-amber-700">Disponible:</span>
                <span className={`ml-2 font-medium ${
                  (formData.presupuesto - proyecto.costo_real) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${(formData.presupuesto - proyecto.costo_real).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-amber-700">Uso Presupuesto:</span>
                <span className="ml-2 font-medium text-amber-900">
                  {formData.presupuesto > 0
                    ? Math.round((proyecto.costo_real / formData.presupuesto) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isCreating || isUpdating}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {isCreating || isUpdating ? 'Guardando...' : proyecto ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
