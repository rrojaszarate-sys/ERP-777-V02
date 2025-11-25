import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Building2,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { supabase } from '../../../core/config/supabase';
import { Button } from '../../../shared/components/ui/Button';
import { Modal } from '../../../shared/components/ui/Modal';
import { Badge } from '../../../shared/components/ui/Badge';
import { LoadingSpinner } from '../../../shared/components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import toast from 'react-hot-toast';

interface CuentaContable {
  id: number;
  company_id?: string;
  codigo: string;
  nombre: string;
  tipo: 'activo' | 'pasivo' | 'capital' | 'ingreso' | 'gasto';
  descripcion?: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
  total_gastos?: number;
  total_transacciones?: number;
}

interface CuentaFormData {
  codigo: string;
  nombre: string;
  tipo: 'activo' | 'pasivo' | 'capital' | 'ingreso' | 'gasto';
  descripcion?: string;
  activa: boolean;
}

export const CuentasContablesAdmin: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<CuentaContable | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<CuentaContable | null>(null);
  const [showDetails, setShowDetails] = useState<CuentaContable | null>(null);
  const queryClient = useQueryClient();

  const getInitialFormData = (): CuentaFormData => ({
    codigo: '',
    nombre: '',
    tipo: 'activo',
    descripcion: '',
    activa: true
  });

  const [formData, setFormData] = useState<CuentaFormData>(getInitialFormData());

  const { data: cuentas, isLoading } = useQuery({
    queryKey: ['cuentas-contables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evt_cuentas_contables')
        .select('*')
        .order('codigo');

      if (error) throw error;

      const cuentasConStats = await Promise.all(
        data.map(async (cuenta) => {
          const { data: gastos } = await supabase
            .from('evt_gastos')
            .select('total')
            .eq('cuenta_id', cuenta.id);

          return {
            ...cuenta,
            total_transacciones: gastos?.length || 0,
            total_gastos: gastos?.reduce((sum, g) => sum + (g.total || 0), 0) || 0
          };
        })
      );

      return cuentasConStats;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CuentaFormData) => {
      if (editingCuenta) {
        const { error } = await supabase
          .from('evt_cuentas_contables')
          .update({
            codigo: data.codigo,
            nombre: data.nombre,
            tipo: data.tipo,
            descripcion: data.descripcion,
            activa: data.activa,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCuenta.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('evt_cuentas_contables')
          .insert([{
            codigo: data.codigo,
            nombre: data.nombre,
            tipo: data.tipo,
            descripcion: data.descripcion,
            activa: data.activa,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-contables'] });
      setShowModal(false);
      setEditingCuenta(null);
      setFormData(getInitialFormData());
      toast.success(editingCuenta ? 'Cuenta actualizada exitosamente' : 'Cuenta creada exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error al guardar cuenta:', error);
      toast.error(`Error: ${error.message || 'No se pudo guardar la cuenta'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('evt_cuentas_contables')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-contables'] });
      setShowDeleteConfirm(null);
      toast.success('Cuenta eliminada exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error al eliminar cuenta:', error);
      toast.error(`Error: ${error.message || 'No se pudo eliminar la cuenta'}`);
    }
  });

  const handleEdit = (cuenta: CuentaContable) => {
    setEditingCuenta(cuenta);
    setFormData({
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      descripcion: cuenta.descripcion || '',
      activa: cuenta.activa
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo.trim() || !formData.nombre.trim()) {
      toast.error('Código y nombre son obligatorios');
      return;
    }
    saveMutation.mutate(formData);
  };

  const getTipoColor = (tipo: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (tipo) {
      case 'activo': return 'success';
      case 'pasivo': return 'danger';
      case 'capital': return 'info';
      case 'ingreso': return 'success';
      case 'gasto': return 'warning';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Cargando cuentas contables..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <CreditCard className="w-7 h-7 mr-3 text-blue-600" />
            Administración de Cuentas Contables
          </h1>
          <p className="text-gray-600 mt-1">
            Gestión de cuentas bancarias y clasificación contable
          </p>
        </div>
        
        <Button
          onClick={() => {
            setEditingCuenta(null);
            setFormData(getInitialFormData());
            setShowModal(true);
          }}
          className="mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cuenta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cuentas</p>
              <p className="text-2xl font-bold text-gray-900">{cuentas?.length || 0}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cuentas Activas</p>
              <p className="text-2xl font-bold text-green-600">
                {cuentas?.filter(c => c.activa).length || 0}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Gastos</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(cuentas?.reduce((sum, c) => sum + (c.total_gastos || 0), 0) || 0)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Cuentas Contables</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transacciones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Gastos
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cuentas?.map((cuenta) => (
                <tr key={cuenta.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono font-medium text-gray-900">{cuenta.codigo}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{cuenta.nombre}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getTipoColor(cuenta.tipo)} size="sm">
                      {cuenta.tipo.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {cuenta.activa ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">Activa</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <XCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">Inactiva</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {cuenta.total_transacciones || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-red-600">
                      {formatCurrency(cuenta.total_gastos || 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDetails(cuenta)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(cuenta)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setShowDeleteConfirm(cuenta)}
                        disabled={(cuenta.total_transacciones || 0) > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {(!cuentas || cuentas.length === 0) && (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay cuentas contables registradas</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowModal(false);
            setEditingCuenta(null);
            setFormData(getInitialFormData());
          }}
          title={editingCuenta ? 'Editar Cuenta Contable' : 'Nueva Cuenta Contable'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código *
                </label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="AMEX-001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cuenta *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as CuentaFormData['tipo'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="activo">Activo</option>
                  <option value="pasivo">Pasivo</option>
                  <option value="capital">Capital</option>
                  <option value="ingreso">Ingreso</option>
                  <option value="gasto">Gasto</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="American Express Business"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descripción adicional de la cuenta..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activa"
                checked={formData.activa}
                onChange={(e) => setFormData(prev => ({ ...prev, activa: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="activa" className="text-sm font-medium text-gray-700">
                Cuenta activa
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setEditingCuenta(null);
                  setFormData(getInitialFormData());
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Guardando...
                  </>
                ) : (
                  editingCuenta ? 'Actualizar' : 'Crear'
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {showDeleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteConfirm(null)}
          title="Confirmar Eliminación"
          size="sm"
        >
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div>
                <h4 className="text-lg font-medium text-gray-900">
                  ¿Eliminar cuenta contable?
                </h4>
                <p className="text-sm text-gray-600">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-900">
                {showDeleteConfirm.codigo} - {showDeleteConfirm.nombre}
              </p>
              {(showDeleteConfirm.total_transacciones || 0) > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  ⚠️ Esta cuenta tiene {showDeleteConfirm.total_transacciones} transacciones asociadas
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate(showDeleteConfirm.id)}
                disabled={deleteMutation.isPending || (showDeleteConfirm.total_transacciones || 0) > 0}
              >
                {deleteMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showDetails && (
        <Modal
          isOpen={true}
          onClose={() => setShowDetails(null)}
          title="Detalles de Cuenta Contable"
          size="md"
        >
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Código</label>
                <p className="font-mono font-medium">{showDetails.codigo}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tipo</label>
                <p>
                  <Badge variant={getTipoColor(showDetails.tipo)} size="sm">
                    {showDetails.tipo.toUpperCase()}
                  </Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Estado</label>
                <p>
                  {showDetails.activa ? (
                    <span className="text-green-600 font-medium">✅ Activa</span>
                  ) : (
                    <span className="text-red-600 font-medium">❌ Inactiva</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Transacciones</label>
                <p className="font-medium">{showDetails.total_transacciones}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Nombre</label>
              <p className="font-medium">{showDetails.nombre}</p>
            </div>
            
            {showDetails.descripcion && (
              <div>
                <label className="text-sm font-medium text-gray-500">Descripción</label>
                <p className="text-gray-700">{showDetails.descripcion}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium text-gray-500">Creada</label>
                <p className="text-sm">{formatDate(showDetails.created_at, true)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Modificada</label>
                <p className="text-sm">{formatDate(showDetails.updated_at, true)}</p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => setShowDetails(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};