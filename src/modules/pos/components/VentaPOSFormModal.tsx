import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { useVentasPOS } from '../hooks';
import type { VentaPOS, TipoVenta, TipoPago } from '../types';

interface VentaPOSFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  venta?: VentaPOS;
  turnoId?: string;
}

export const VentaPOSFormModal: React.FC<VentaPOSFormModalProps> = ({
  isOpen,
  onClose,
  venta,
  turnoId,
}) => {
  const { createVenta, isCreating } = useVentasPOS();
  const [formData, setFormData] = useState({
    turno_caja_id: turnoId || '',
    cliente_nombre: '',
    tipo_venta: 'MOSTRADOR' as TipoVenta,
    tipo_pago: 'EFECTIVO' as TipoPago,
    monto_pagado: 0,
    requiere_factura: false,
    observaciones: '',
    // Totales (normalmente calculados del carrito)
    subtotal: 0,
    descuento: 0,
    iva: 0,
    total: 0,
  });

  useEffect(() => {
    if (turnoId) {
      setFormData(prev => ({ ...prev, turno_caja_id: turnoId }));
    }
  }, [turnoId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // No se puede editar una venta existente en POS
    // Solo se pueden crear nuevas ventas
    if (venta) {
      alert('Las ventas de POS no pueden ser editadas. Solo pueden ser canceladas.');
      return;
    }

    // Para crear una venta necesitamos al menos un producto en detalles
    // En una implementación real, esto vendría de un carrito de compras
    const ventaData = {
      turno_caja_id: formData.turno_caja_id,
      cliente_nombre: formData.cliente_nombre || undefined,
      tipo_venta: formData.tipo_venta,
      tipo_pago: formData.tipo_pago,
      monto_pagado: formData.monto_pagado,
      requiere_factura: formData.requiere_factura,
      observaciones: formData.observaciones || undefined,
      detalles: [] as Array<{
        producto_id: string;
        cantidad: number;
        precio_unitario: number;
        descuento?: number;
      }>,
    };

    // NOTA: En una implementación real, los detalles vendrían del carrito
    // Por ahora, validamos que exista un turno_caja_id
    if (!ventaData.turno_caja_id) {
      alert('Se requiere un turno de caja activo para registrar ventas');
      return;
    }

    createVenta(ventaData);
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

  // Calcular totales automáticamente
  useEffect(() => {
    const subtotal = formData.subtotal - formData.descuento;
    const iva = subtotal * 0.16; // IVA 16%
    const total = subtotal + iva;

    setFormData(prev => ({
      ...prev,
      iva: Math.round(iva * 100) / 100,
      total: Math.round(total * 100) / 100,
    }));
  }, [formData.subtotal, formData.descuento]);

  const calcularCambio = () => {
    return Math.max(0, formData.monto_pagado - formData.total);
  };

  // Modo de solo lectura para ventas existentes
  const isReadOnly = !!venta;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={venta ? `Venta ${venta.folio}` : 'Nueva Venta POS'}
      size="lg"
    >
      {venta ? (
        // Modo de visualización para ventas existentes
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              Las ventas de POS no pueden ser editadas. Esta venta solo puede ser consultada o cancelada.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Folio</label>
              <p className="mt-1 text-sm text-gray-900">{venta.folio}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha</label>
              <p className="mt-1 text-sm text-gray-900">{venta.fecha} {venta.hora}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cliente</label>
              <p className="mt-1 text-sm text-gray-900">{venta.cliente_nombre || 'Cliente General'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de Venta</label>
              <p className="mt-1 text-sm text-gray-900">{venta.tipo_venta}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Subtotal</label>
              <p className="mt-1 text-sm text-gray-900">${venta.subtotal.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">IVA</label>
              <p className="mt-1 text-sm text-gray-900">${venta.iva.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total</label>
              <p className="mt-1 text-lg font-bold text-gray-900">${venta.total.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de Pago</label>
              <p className="mt-1 text-sm text-gray-900">{venta.tipo_pago}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Monto Pagado</label>
              <p className="mt-1 text-sm text-gray-900">${venta.monto_pagado.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cambio</label>
              <p className="mt-1 text-sm text-gray-900">${venta.cambio.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Estatus</label>
              <p className="mt-1">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  venta.estatus === 'COMPLETADA' ? 'bg-green-100 text-green-800' :
                  venta.estatus === 'CANCELADA' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {venta.estatus}
                </span>
              </p>
            </div>
          </div>

          {venta.observaciones && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Observaciones</label>
              <p className="mt-1 text-sm text-gray-900">{venta.observaciones}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        // Modo de creación para nuevas ventas
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Cliente */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Información del Cliente</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  name="cliente_nombre"
                  value={formData.cliente_nombre}
                  onChange={handleChange}
                  placeholder="Cliente General"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Venta <span className="text-red-500">*</span>
                </label>
                <select
                  name="tipo_venta"
                  value={formData.tipo_venta}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="MOSTRADOR">Mostrador</option>
                  <option value="DOMICILIO">Domicilio</option>
                  <option value="TELEFONO">Teléfono</option>
                  <option value="WEB">Web</option>
                </select>
              </div>
            </div>
          </div>

          {/* Totales */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Totales de la Venta</h4>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800">
                NOTA: En una implementación completa, estos totales se calcularían automáticamente
                desde un carrito de compras con productos. Este formulario es una versión simplificada.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtotal <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="subtotal"
                  value={formData.subtotal}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Suma de productos antes de IVA</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descuento
                </label>
                <input
                  type="number"
                  name="descuento"
                  value={formData.descuento}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IVA (16%)
                </label>
                <input
                  type="number"
                  name="iva"
                  value={formData.iva}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total
                </label>
                <input
                  type="number"
                  name="total"
                  value={formData.total}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-bold text-lg"
                />
              </div>
            </div>
          </div>

          {/* Pago */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Forma de Pago</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Pago <span className="text-red-500">*</span>
                </label>
                <select
                  name="tipo_pago"
                  value={formData.tipo_pago}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA_DEBITO">Tarjeta de Débito</option>
                  <option value="TARJETA_CREDITO">Tarjeta de Crédito</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="MIXTO">Mixto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Pagado <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="monto_pagado"
                  value={formData.monto_pagado}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {formData.tipo_pago === 'EFECTIVO' && (
                <div className="md:col-span-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">Cambio:</span>
                      <span className="text-xl font-bold text-blue-900">
                        ${calcularCambio().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Facturación */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Facturación</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="requiere_factura"
                  checked={formData.requiere_factura}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="ml-2 text-sm text-gray-700">Requiere factura</span>
              </label>

              {formData.requiere_factura && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    Se requerirán datos fiscales del cliente para generar la factura.
                  </p>
                </div>
              )}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
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
              disabled={isCreating}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Guardando...' : 'Registrar Venta'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
