import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FolderOpen, Users, Tag, ListTree, Plus, Edit2, Trash2, 
  Search, Check, X, AlertCircle, ExternalLink 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../core/config/supabase';
import { Button } from '../../shared/components/ui/Button';
import toast from 'react-hot-toast';

type CatalogoTipo = 'clientes' | 'tipos_evento' | 'tipos_gasto';

interface CatalogoItem {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  // Campos específicos para clientes
  razon_social?: string;
  rfc?: string;
  email?: string;
  telefono?: string;
  // Contador de uso
  uso_count?: number;
}

export const CatalogosPage: React.FC = () => {
  const [catalogoActivo, setCatalogoActivo] = useState<CatalogoTipo>('clientes');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const catalogos = [
    { id: 'clientes' as CatalogoTipo, nombre: 'Clientes', icon: Users, color: 'blue' },
    { id: 'tipos_evento' as CatalogoTipo, nombre: 'Tipos de Evento', icon: Tag, color: 'green' },
    { id: 'tipos_gasto' as CatalogoTipo, nombre: 'Categorías de Gastos', icon: ListTree, color: 'purple' }
  ];

  // Obtener nombre de tabla según catálogo
  const getTableName = (catalogo: CatalogoTipo) => {
    const tables = {
      clientes: 'evt_clientes_erp',
      tipos_evento: 'evt_tipos_evento_erp',
      tipos_gasto: 'evt_categorias_gastos_erp'
    };
    return tables[catalogo];
  };

  // Query para obtener datos del catálogo activo
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['catalogo', catalogoActivo],
    queryFn: async () => {
      const tableName = getTableName(catalogoActivo);
      
      // Para clientes, obtener datos completos con contador de eventos
      if (catalogoActivo === 'clientes') {
        const { data, error } = await supabase
          .from(tableName)
          .select(`
            *,
            eventos_count:evt_eventos(count)
          `)
          .order('razon_social');

        if (error) throw error;
        return (data || []).map((item: any) => ({
          ...item,
          nombre: item.razon_social,
          uso_count: item.eventos_count?.[0]?.count || 0
        }));
      }
      
      // Para tipos de evento, contar eventos
      if (catalogoActivo === 'tipos_evento') {
        const { data, error } = await supabase
          .from(tableName)
          .select(`
            *,
            eventos_count:evt_eventos(count)
          `)
          .order('nombre');

        if (error) throw error;
        return (data || []).map((item: any) => ({
          ...item,
          uso_count: item.eventos_count?.[0]?.count || 0
        }));
      }
      
      // Para categorías de gastos, contar gastos
      if (catalogoActivo === 'tipos_gasto') {
        const { data, error } = await supabase
          .from(tableName)
          .select(`
            *,
            gastos_count:evt_gastos(count)
          `)
          .order('nombre');

        if (error) throw error;
        return (data || []).map((item: any) => ({
          ...item,
          uso_count: item.gastos_count?.[0]?.count || 0
        }));
      }

      return [];
    }
  });

  // Mutation para crear/actualizar
  const saveMutation = useMutation({
    mutationFn: async (item: any) => {
      const tableName = getTableName(catalogoActivo);
      
      if (editingItem?.id) {
        const { error } = await supabase
          .from(tableName)
          .update(item)
          .eq('id', editingItem.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert([item]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo', catalogoActivo] });
      toast.success(editingItem ? 'Actualizado correctamente' : 'Creado correctamente');
      setShowModal(false);
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const tableName = getTableName(catalogoActivo);
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo', catalogoActivo] });
      toast.success('Eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(`Error al eliminar: ${error.message}`);
    }
  });

  // Mutation para alternar activo
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const tableName = getTableName(catalogoActivo);
      const { error } = await supabase
        .from(tableName)
        .update({ activo: !activo })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo', catalogoActivo] });
      toast.success('Estado actualizado');
    }
  });

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleDelete = (id: string, item: any) => {
    const usoCount = item.uso_count || 0;
    
    if (usoCount > 0) {
      const mensaje = catalogoActivo === 'clientes' 
        ? `Este cliente tiene ${usoCount} evento(s) asociado(s). No se puede eliminar.`
        : catalogoActivo === 'tipos_evento'
        ? `Este tipo de evento tiene ${usoCount} evento(s) asociado(s). No se puede eliminar.`
        : `Esta categoría tiene ${usoCount} gasto(s) asociado(s). No se puede eliminar.`;
      
      toast.error(mensaje);
      return;
    }
    
    if (window.confirm('¿Estás seguro de eliminar este registro?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredItems = items.filter((item: any) => {
    const searchLower = searchTerm.toLowerCase();
    
    if (catalogoActivo === 'clientes') {
      return (
        item.razon_social?.toLowerCase().includes(searchLower) ||
        item.nombre_comercial?.toLowerCase().includes(searchLower) ||
        item.rfc?.toLowerCase().includes(searchLower) ||
        item.email?.toLowerCase().includes(searchLower)
      );
    }
    
    return item.nombre?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <FolderOpen className="w-8 h-8 mr-3 text-blue-600" />
          Administración de Catálogos
        </h1>
        <p className="text-gray-600 mt-1">
          Gestión centralizada de clientes y tipos de eventos y gastos
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          {catalogos.map((catalogo) => {
            const Icon = catalogo.icon;
            const isActive = catalogoActivo === catalogo.id;
            return (
              <button
                key={catalogo.id}
                onClick={() => setCatalogoActivo(catalogo.id)}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
                  isActive
                    ? `text-${catalogo.color}-600 bg-${catalogo.color}-50`
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Icon className="w-5 h-5" />
                  <span>{catalogo.nombre}</span>
                </div>
                {isActive && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${catalogo.color}-600`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex space-x-3 ml-4">
            {catalogoActivo === 'clientes' && (
              <Button 
                onClick={() => navigate('/eventos/clientes')} 
                variant="outline"
                className="flex items-center"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Gestión Completa
              </Button>
            )}
            <Button onClick={handleNew} className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay registros
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? 'No se encontraron resultados para tu búsqueda'
                : 'Comienza creando un nuevo registro'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {catalogoActivo === 'clientes' ? 'Razón Social' : 'Nombre'}
                  </th>
                  {catalogoActivo === 'clientes' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        RFC
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Teléfono
                      </th>
                    </>
                  )}
                  {(catalogoActivo === 'tipos_evento' || catalogoActivo === 'tipos_gasto') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                  )}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uso
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.nombre}</div>
                      {catalogoActivo === 'clientes' && item.nombre_comercial && (
                        <div className="text-xs text-gray-500">{item.nombre_comercial}</div>
                      )}
                    </td>
                    {catalogoActivo === 'clientes' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.rfc || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.telefono || '-'}
                        </td>
                      </>
                    )}
                    {(catalogoActivo === 'tipos_evento' || catalogoActivo === 'tipos_gasto') && (
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.descripcion || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.uso_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: item.id, activo: item.activo })}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          item.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.activo ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Activo
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3 mr-1" />
                            Inactivo
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item)}
                        className={`${item.uso_count > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                        title={item.uso_count > 0 ? `No se puede eliminar (en uso: ${item.uso_count})` : 'Eliminar'}
                        disabled={item.uso_count > 0}
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CatalogoFormModal
          catalogoTipo={catalogoActivo}
          item={editingItem}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSave={(data) => saveMutation.mutate(data)}
        />
      )}
    </div>
  );
};

// Modal Component
const CatalogoFormModal: React.FC<{
  catalogoTipo: CatalogoTipo;
  item: any;
  onClose: () => void;
  onSave: (data: any) => void;
}> = ({ catalogoTipo, item, onClose, onSave }) => {
  const [formData, setFormData] = useState(
    item || {
      nombre: '',
      descripcion: '',
      contacto_nombre: '',
      contacto_email: '',
      contacto_telefono: '',
      activo: true
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {item ? 'Editar' : 'Nuevo'} {
            catalogoTipo === 'clientes' ? 'Cliente' :
            catalogoTipo === 'tipos_evento' ? 'Tipo de Evento' : 'Tipo de Gasto'
          }
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {catalogoTipo === 'clientes' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contacto
                </label>
                <input
                  type="text"
                  value={formData.contacto_nombre}
                  onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.contacto_email}
                  onChange={(e) => setFormData({ ...formData, contacto_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.contacto_telefono}
                  onChange={(e) => setFormData({ ...formData, contacto_telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {(catalogoTipo === 'tipos_evento' || catalogoTipo === 'tipos_gasto') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.activo}
              onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700">
              Activo
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {item ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
