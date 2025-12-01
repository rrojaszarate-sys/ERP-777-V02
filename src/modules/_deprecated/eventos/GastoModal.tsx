import React, { useState, useEffect } from 'react';
import { Modal } from '../../shared/components/ui/Modal';
import { Button } from '../../shared/components/ui/Button';
import { supabase } from '../../core/config/supabase';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface GastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  eventoId: string;
  gasto?: any;
}

export const GastoModal: React.FC<GastoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  eventoId,
  gasto
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    concepto: gasto?.concepto || '',
    total: gasto?.total || 0,
    fecha_gasto: gasto?.fecha_gasto || new Date().toISOString().split('T')[0],
    categoria_id: gasto?.categoria_id || '',
    descripcion: gasto?.descripcion || '',
    proveedor: gasto?.proveedor || '',
    referencia: gasto?.referencia || '',
    status_aprobacion: gasto?.status_aprobacion || 'pendiente', // Usar status_aprobacion en lugar de estado_pago
  });

  // Cargar categorías de gastos
  const { data: categorias, isLoading: loadingCategorias } = useQuery({
    queryKey: ['evt_categorias_gastos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evt_categorias_gastos')
        .select('*')
        .order('nombre');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Resetear form cuando cambia el gasto
  useEffect(() => {
    if (gasto) {
      setFormData({
        concepto: gasto.concepto || '',
        total: gasto.total || 0,
        fecha_gasto: gasto.fecha_gasto || new Date().toISOString().split('T')[0],
        categoria_id: gasto.categoria_id || '',
        descripcion: gasto.descripcion || '',
        proveedor: gasto.proveedor || '',
        referencia: gasto.referencia || '',
        status_aprobacion: gasto.status_aprobacion || 'pendiente', // Usar status_aprobacion
      });
    }
  }, [gasto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (gasto?.id) {
        // Actualizar gasto existente
        const { error } = await supabase
          .from('evt_gastos')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', gasto.id);

        if (error) throw error;
      } else {
        // Crear nuevo gasto
        const { error } = await supabase
          .from('evt_gastos')
          .insert([{
            ...formData,
            evento_id: eventoId,
            created_at: new Date().toISOString(),
          }]);

        if (error) throw error;
      }

      await onSave();
      onClose();
    } catch (error) {
      console.error('Error al guardar gasto:', error);
      alert('Error al guardar el gasto. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={gasto ? 'Editar Gasto' : 'Agregar Gasto'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Concepto */}
          <div className="space-y-2">
            <label htmlFor="concepto" className="block text-sm font-medium text-gray-700">
              Concepto *
            </label>
            <input
              id="concepto"
              type="text"
              required
              placeholder="Ej: Gasolina para transporte"
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
            />
          </div>

          {/* Total y Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="total" className="block text-sm font-medium text-gray-700">
                Total *
              </label>
              <input
                id="total"
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.total}
                onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="fecha_gasto" className="block text-sm font-medium text-gray-700">
                Fecha del Gasto *
              </label>
              <input
                id="fecha_gasto"
                type="date"
                required
                value={formData.fecha_gasto}
                onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Categoría y Estado de Pago */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="categoria_id" className="block text-sm font-medium text-gray-700">
                Categoría *
              </label>
              {loadingCategorias ? (
                <div className="flex items-center gap-2 p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-500">Cargando categorías...</span>
                </div>
              ) : (
                <select
                  id="categoria_id"
                  required
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
                >
                  <option value="">Seleccionar categoría</option>
                  {categorias?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="status_aprobacion" className="block text-sm font-medium text-gray-700">
                Estado de Pago
              </label>
              <select
                id="status_aprobacion"
                value={formData.status_aprobacion}
                onChange={(e) => setFormData({ ...formData, status_aprobacion: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
              >
                <option value="pendiente">⏳ Pendiente</option>
                <option value="aprobado">✅ Aprobado</option>
                <option value="rechazado">❌ Rechazado</option>
              </select>
            </div>
          </div>

          {/* Proveedor y Referencia */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="proveedor" className="block text-sm font-medium text-gray-700">
                Proveedor
              </label>
              <input
                id="proveedor"
                type="text"
                placeholder="Nombre del proveedor"
                value={formData.proveedor}
                onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="referencia" className="block text-sm font-medium text-gray-700">
                Referencia/Folio
              </label>
              <input
                id="referencia"
                type="text"
                placeholder="Folio o referencia"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              id="descripcion"
              placeholder="Detalles adicionales del gasto..."
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.concepto || !formData.total || !formData.categoria_id}
              className="bg-red-500 hover:bg-red-600"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {gasto ? 'Actualizar' : 'Crear'} Gasto
            </Button>
          </div>
        </form>
    </Modal>
  );
};
