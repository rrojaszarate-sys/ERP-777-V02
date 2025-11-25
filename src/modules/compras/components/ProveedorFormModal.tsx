import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { useProveedores } from '../hooks';
import type { Proveedor } from '../types';

interface ProveedorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  proveedor?: Proveedor;
}

export const ProveedorFormModal: React.FC<ProveedorFormModalProps> = ({
  isOpen,
  onClose,
  proveedor,
}) => {
  const { create, update, isCreating, isUpdating } = useProveedores();
  const [formData, setFormData] = useState({
    codigo: '',
    razon_social: '',
    nombre_comercial: '',
    rfc: '',
    email: '',
    telefono: '',
    sitio_web: '',
    calle: '',
    numero_exterior: '',
    numero_interior: '',
    colonia: '',
    codigo_postal: '',
    ciudad: '',
    estado: '',
    pais: 'México',
    dias_credito: 0,
    limite_credito: 0,
    descuento_por_defecto: 0,
    banco: '',
    cuenta_bancaria: '',
    clabe: '',
    tipo_proveedor: '',
    calificacion: 5,
    activo: true,
  });

  useEffect(() => {
    if (proveedor) {
      setFormData({
        codigo: proveedor.codigo,
        razon_social: proveedor.razon_social,
        nombre_comercial: proveedor.nombre_comercial || '',
        rfc: proveedor.rfc || '',
        email: proveedor.email || '',
        telefono: proveedor.telefono || '',
        sitio_web: proveedor.sitio_web || '',
        calle: proveedor.calle || '',
        numero_exterior: proveedor.numero_exterior || '',
        numero_interior: proveedor.numero_interior || '',
        colonia: proveedor.colonia || '',
        codigo_postal: proveedor.codigo_postal || '',
        ciudad: proveedor.ciudad || '',
        estado: proveedor.estado || '',
        pais: proveedor.pais || 'México',
        dias_credito: proveedor.dias_credito,
        limite_credito: proveedor.limite_credito || 0,
        descuento_por_defecto: proveedor.descuento_por_defecto,
        banco: proveedor.banco || '',
        cuenta_bancaria: proveedor.cuenta_bancaria || '',
        clabe: proveedor.clabe || '',
        tipo_proveedor: proveedor.tipo_proveedor || '',
        calificacion: proveedor.calificacion || 5,
        activo: proveedor.activo,
      });
    }
  }, [proveedor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (proveedor) {
      update({ id: proveedor.id, ...formData });
    } else {
      create(formData);
    }

    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="codigo"
              value={formData.codigo}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Razón Social <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="razon_social"
              value={formData.razon_social}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Comercial
            </label>
            <input
              type="text"
              name="nombre_comercial"
              value={formData.nombre_comercial}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RFC
            </label>
            <input
              type="text"
              name="rfc"
              value={formData.rfc}
              onChange={handleChange}
              maxLength={13}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Contacto */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Información de Contacto</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Condiciones comerciales */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Condiciones Comerciales</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días de Crédito
              </label>
              <input
                type="number"
                name="dias_credito"
                value={formData.dias_credito}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Límite de Crédito
              </label>
              <input
                type="number"
                name="limite_credito"
                value={formData.limite_credito}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descuento (%)
              </label>
              <input
                type="number"
                name="descuento_por_defecto"
                value={formData.descuento_por_defecto}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Proveedor
              </label>
              <input
                type="text"
                name="tipo_proveedor"
                value={formData.tipo_proveedor}
                onChange={handleChange}
                placeholder="Ej: Materia Prima, Servicios, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calificación (1-5)
              </label>
              <select
                name="calificacion"
                value={formData.calificacion}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={5}>⭐⭐⭐⭐⭐ Excelente</option>
                <option value={4}>⭐⭐⭐⭐ Muy bueno</option>
                <option value={3}>⭐⭐⭐ Bueno</option>
                <option value={2}>⭐⭐ Regular</option>
                <option value={1}>⭐ Malo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Dirección</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calle
                </label>
                <input
                  type="text"
                  name="calle"
                  value={formData.calle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. Exterior
                </label>
                <input
                  type="text"
                  name="numero_exterior"
                  value={formData.numero_exterior}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. Interior
                </label>
                <input
                  type="text"
                  name="numero_interior"
                  value={formData.numero_interior}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colonia
                </label>
                <input
                  type="text"
                  name="colonia"
                  value={formData.colonia}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                  maxLength={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  name="ciudad"
                  value={formData.ciudad}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  País
                </label>
                <input
                  type="text"
                  name="pais"
                  value={formData.pais}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Datos bancarios */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Datos Bancarios</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco
              </label>
              <input
                type="text"
                name="banco"
                value={formData.banco}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cuenta Bancaria
              </label>
              <input
                type="text"
                name="cuenta_bancaria"
                value={formData.cuenta_bancaria}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CLABE
              </label>
              <input
                type="text"
                name="clabe"
                value={formData.clabe}
                onChange={handleChange}
                maxLength={18}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="ml-2 text-sm text-gray-700">Proveedor activo</span>
          </label>
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
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {isCreating || isUpdating ? 'Guardando...' : proveedor ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
