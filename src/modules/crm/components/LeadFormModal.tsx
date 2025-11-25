import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { useLeads } from '../hooks';
import type { Lead, OrigenLead, EstatusLead, CalificacionLead } from '../types';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  lead,
}) => {
  const { createLead, updateLead, isCreating, isUpdating } = useLeads();
  const [formData, setFormData] = useState({
    nombre: '',
    empresa: '',
    cargo: '',
    email: '',
    telefono: '',
    celular: '',
    origen: 'WEB' as OrigenLead,
    estatus: 'NUEVO' as EstatusLead,
    calificacion: undefined as CalificacionLead | undefined,
    puntuacion: 0,
    industria: '',
    num_empleados: 0,
    ingreso_anual_estimado: 0,
    sitio_web: '',
    calle: '',
    colonia: '',
    ciudad: '',
    estado: '',
    codigo_postal: '',
    pais: 'México',
    descripcion: '',
    necesidades: '',
    presupuesto_estimado: 0,
    asignado_a: '',
    campania_id: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        nombre: lead.nombre,
        empresa: lead.empresa || '',
        cargo: lead.cargo || '',
        email: lead.email || '',
        telefono: lead.telefono || '',
        celular: lead.celular || '',
        origen: lead.origen,
        estatus: lead.estatus,
        calificacion: lead.calificacion,
        puntuacion: lead.puntuacion || 0,
        industria: lead.industria || '',
        num_empleados: lead.num_empleados || 0,
        ingreso_anual_estimado: lead.ingreso_anual_estimado || 0,
        sitio_web: lead.sitio_web || '',
        calle: lead.calle || '',
        colonia: lead.colonia || '',
        ciudad: lead.ciudad || '',
        estado: lead.estado || '',
        codigo_postal: lead.codigo_postal || '',
        pais: lead.pais || 'México',
        descripcion: lead.descripcion || '',
        necesidades: lead.necesidades || '',
        presupuesto_estimado: lead.presupuesto_estimado || 0,
        asignado_a: lead.asignado_a || '',
        campania_id: lead.campania_id || '',
      });
    }
  }, [lead]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (lead) {
      updateLead({ id: lead.id, data: formData });
    } else {
      createLead(formData);
    }

    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (name === 'calificacion' && value === '') {
      setFormData(prev => ({ ...prev, [name]: undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lead ? 'Editar Lead' : 'Nuevo Lead'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Información de Contacto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empresa
              </label>
              <input
                type="text"
                name="empresa"
                value={formData.empresa}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cargo
              </label>
              <input
                type="text"
                name="cargo"
                value={formData.cargo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Celular
              </label>
              <input
                type="tel"
                name="celular"
                value={formData.celular}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Estado del Lead */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Estado del Lead</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Origen <span className="text-red-500">*</span>
              </label>
              <select
                name="origen"
                value={formData.origen}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="WEB">Web</option>
                <option value="TELEFONO">Teléfono</option>
                <option value="EMAIL">Email</option>
                <option value="REFERIDO">Referido</option>
                <option value="REDES_SOCIALES">Redes Sociales</option>
                <option value="EVENTO">Evento</option>
                <option value="PUBLICIDAD">Publicidad</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estatus <span className="text-red-500">*</span>
              </label>
              <select
                name="estatus"
                value={formData.estatus}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="NUEVO">Nuevo</option>
                <option value="CONTACTADO">Contactado</option>
                <option value="CALIFICADO">Calificado</option>
                <option value="NO_CALIFICADO">No Calificado</option>
                <option value="CONVERTIDO">Convertido</option>
                <option value="PERDIDO">Perdido</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calificación
              </label>
              <select
                name="calificacion"
                value={formData.calificacion || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sin calificar</option>
                <option value="FRIO">❄️ Frío</option>
                <option value="TIBIO">🌡️ Tibio</option>
                <option value="CALIENTE">🔥 Caliente</option>
              </select>
            </div>
          </div>
        </div>

        {/* Información de la Empresa */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Información de la Empresa</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industria
              </label>
              <input
                type="text"
                name="industria"
                value={formData.industria}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Empleados
              </label>
              <input
                type="number"
                name="num_empleados"
                value={formData.num_empleados}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ingreso Anual Estimado
              </label>
              <input
                type="number"
                name="ingreso_anual_estimado"
                value={formData.ingreso_anual_estimado}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sitio Web
              </label>
              <input
                type="url"
                name="sitio_web"
                value={formData.sitio_web}
                onChange={handleChange}
                placeholder="https://"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Dirección</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calle
              </label>
              <input
                type="text"
                name="calle"
                value={formData.calle}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Colonia
              </label>
              <input
                type="text"
                name="colonia"
                value={formData.colonia}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciudad
              </label>
              <input
                type="text"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <input
                type="text"
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código Postal
              </label>
              <input
                type="text"
                name="codigo_postal"
                value={formData.codigo_postal}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Información de Ventas */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Información de Ventas</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Necesidades
              </label>
              <textarea
                name="necesidades"
                value={formData.necesidades}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presupuesto Estimado
              </label>
              <input
                type="number"
                name="presupuesto_estimado"
                value={formData.presupuesto_estimado}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isCreating || isUpdating ? 'Guardando...' : lead ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
