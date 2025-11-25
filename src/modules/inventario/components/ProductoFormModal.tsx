import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { useProductos } from '../hooks';
import type { Producto } from '../types';

interface ProductoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  producto?: Producto;
}

export const ProductoFormModal: React.FC<ProductoFormModalProps> = ({
  isOpen,
  onClose,
  producto,
}) => {
  const { create, update, isCreating, isUpdating } = useProductos();
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria_id: '',
    costo_actual: 0,
    precio_venta: 0,
    margen_utilidad: 0,
    tasa_iva: 16,
    es_servicio: false,
    es_compra: true,
    es_venta: true,
    maneja_lote: false,
    maneja_serie: false,
    existencia_minima: 0,
    existencia_maxima: 0,
    aplica_iva: true,
    activo: true,
  });

  useEffect(() => {
    if (producto) {
      setFormData({
        codigo: producto.codigo,
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        categoria_id: producto.categoria_id || '',
        costo_actual: producto.costo_actual || 0,
        precio_venta: producto.precio_venta || 0,
        margen_utilidad: producto.margen_utilidad || 0,
        tasa_iva: producto.tasa_iva || 16,
        es_servicio: producto.es_servicio,
        es_compra: producto.es_compra,
        es_venta: producto.es_venta,
        maneja_lote: producto.maneja_lote,
        maneja_serie: producto.maneja_serie,
        existencia_minima: producto.existencia_minima || 0,
        existencia_maxima: producto.existencia_maxima || 0,
        aplica_iva: producto.aplica_iva,
        activo: producto.activo,
      });
    }
  }, [producto]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (producto) {
      update({ id: producto.id, ...formData });
    } else {
      create(formData);
    }

    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const calcularMargen = () => {
    if (formData.costo_actual > 0) {
      const margen = ((formData.precio_venta - formData.costo_actual) / formData.costo_actual) * 100;
      setFormData(prev => ({ ...prev, margen_utilidad: Math.round(margen * 100) / 100 }));
    }
  };

  useEffect(() => {
    calcularMargen();
  }, [formData.costo_actual, formData.precio_venta]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={producto ? 'Editar Producto' : 'Nuevo Producto'}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Precios */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Precios y Costos</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Costo Actual
              </label>
              <input
                type="number"
                name="costo_actual"
                value={formData.costo_actual}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Venta <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="precio_venta"
                value={formData.precio_venta}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margen (%)
              </label>
              <input
                type="number"
                name="margen_utilidad"
                value={formData.margen_utilidad}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IVA (%)
              </label>
              <input
                type="number"
                name="tasa_iva"
                value={formData.tasa_iva}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="aplica_iva"
                  checked={formData.aplica_iva}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">Aplica IVA</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tipo de Producto */}
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Tipo de Producto</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="es_servicio"
                checked={formData.es_servicio}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Es servicio (no requiere inventario)</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="es_compra"
                checked={formData.es_compra}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Se puede comprar</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="es_venta"
                checked={formData.es_venta}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Se puede vender</span>
            </label>
          </div>
        </div>

        {/* Inventario */}
        {!formData.es_servicio && (
          <div className="border-t pt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Control de Inventario</h4>

            <div className="space-y-3 mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="maneja_lote"
                  checked={formData.maneja_lote}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">Maneja lotes</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="maneja_serie"
                  checked={formData.maneja_serie}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">Maneja números de serie</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Existencia Mínima
                </label>
                <input
                  type="number"
                  name="existencia_minima"
                  value={formData.existencia_minima}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Existencia Máxima
                </label>
                <input
                  type="number"
                  name="existencia_maxima"
                  value={formData.existencia_maxima}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Producto activo</span>
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
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {isCreating || isUpdating ? 'Guardando...' : producto ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
