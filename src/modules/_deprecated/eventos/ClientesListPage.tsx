import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Pencil, Eye, Trash2, Building2, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { supabase } from '../../core/config/supabase';
import { usePermissions } from '../../core/permissions/usePermissions';
import { useClients } from './hooks/useClients';
import { DataTable } from '../../shared/components/tables/DataTable';
import { Button } from '../../shared/components/ui/Button';
import { Badge } from '../../shared/components/ui/Badge';
import { PageSkeleton } from '../../shared/components/ui/LoadingSpinner';
import { ClienteModal } from './components/ClienteModal';
import { Cliente } from './types/Event';
import { ClientDetailModal } from './components/clients/ClientDetailModal';

export const ClientesPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [viewingCliente, setViewingCliente] = useState<Cliente | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { canCreate, canUpdate, canDelete } = usePermissions();
  
  // Use the useClients hook for all client operations
  const {
    clients: clientes,
    isLoading,
    createClient,
    updateClient,
    deleteClient,
    isCreating,
    isUpdating,
    isDeleting
  } = useClients();

  // Query para obtener clientes

  // Query para obtener conteo de eventos por cliente
  const { data: eventCounts } = useQuery({
    queryKey: ['client-event-counts'],
    queryFn: async () => {
      if (!clientes || clientes.length === 0) return {};
      
      try {
        const counts: Record<string, number> = {};
        
        for (const cliente of clientes) {
          const { count } = await supabase
            .from('evt_eventos')
            .select('*', { count: 'exact', head: true })
            .eq('cliente_id', cliente.id)
            .eq('activo', true);
          
          counts[cliente.id] = count || 0;
        }
        
        return counts;
      } catch (error) {
        console.error('Error fetching event counts:', error);
        return {};
      }
    },
    enabled: !!clientes && clientes.length > 0
  });

  const handleEditCliente = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setShowModal(true);
  };

  const handleViewCliente = (cliente: Cliente) => {
    setViewingCliente(cliente);
    setShowDetailModal(true);
  };

  const handleDeleteCliente = async (cliente: Cliente) => {
    if (confirm(`¿Está seguro de que desea eliminar el cliente "${cliente.razon_social}"?`)) {
      try {
        setError(null);
        deleteClient(cliente.id);
      } catch (error) {
        console.error('Error al eliminar cliente:', error);
        setError(`Error al eliminar el cliente: ${error?.message || 'Error desconocido'}`);
      }
    }
  };

  const handleSaveCliente = (clienteData: Partial<Cliente>) => {
    if (editingCliente) {
      try {
        setError(null);
        updateClient({ id: editingCliente.id, data: clienteData });
        setShowModal(false);
        setEditingCliente(null);
      } catch (error: any) {
        console.error('Error updating client:', error);
        setError(error.message || 'Error al actualizar el cliente');
      }
    } else {
      try {
        setError(null);
        createClient(clienteData);
        setShowModal(false);
        setEditingCliente(null);
      } catch (error: any) {
        console.error('Error creating client:', error);
        setError(error.message || 'Error al crear el cliente');
      }
    }
  };

  // Combine clients with event counts
  const clientesWithCounts = React.useMemo(() => {
    if (!clientes) return [];
    
    return clientes.map(cliente => ({
      ...cliente,
      eventos_count: eventCounts?.[cliente.id] || 0
    }));
  }, [clientes, eventCounts]);
  const columns = [
    {
      key: 'razon_social',
      label: 'Cliente',
      filterType: 'text' as const,
      render: (value: string, row: Cliente & { eventos_count: number }) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          {row.nombre_comercial && row.nombre_comercial !== value && (
            <div className="text-sm text-gray-500">{row.nombre_comercial}</div>
          )}
          <div className="text-xs text-gray-400 flex items-center mt-1">
            <Building2 className="w-3 h-3 mr-1" />
            {row.rfc}
          </div>
        </div>
      )
    },
    {
      key: 'contacto_principal',
      label: 'Contacto',
      filterType: 'text' as const,
      render: (value: string, row: Cliente) => (
        <div>
          <div className="text-gray-900">{value || 'Sin contacto'}</div>
          {row.email && (
            <div className="text-sm text-gray-500 flex items-center">
              <Mail className="w-3 h-3 mr-1" />
              {row.email}
            </div>
          )}
          {row.telefono && (
            <div className="text-sm text-gray-500 flex items-center">
              <Phone className="w-3 h-3 mr-1" />
              {row.telefono}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'regimen_fiscal',
      label: 'Régimen Fiscal',
      filterType: 'select' as const,
      filterOptions: [
        { value: '601', label: '601 - Personas Morales' },
        { value: '612', label: '612 - Actividades Empresariales' },
        { value: '621', label: '621 - Actividades Profesionales' }
      ],
      render: (value: string) => (
        <div>
          <Badge variant="info" size="sm">
            {value || 'No especificado'}
          </Badge>
        </div>
      )
    },
    {
      key: 'uso_cfdi',
      label: 'Uso CFDI',
      filterType: 'select' as const,
      filterOptions: [
        { value: 'G01', label: 'G01 - Mercancías' },
        { value: 'G02', label: 'G02 - Devoluciones' },
        { value: 'G03', label: 'G03 - Gastos generales' }
      ],
      render: (value: string) => (
        <Badge variant="default" size="sm">
          {value || 'G03'}
        </Badge>
      )
    },
    {
      key: 'eventos_count',
      label: 'Eventos',
      align: 'center' as const,
      render: (value: number, row: Cliente & { eventos_count: number }) => (
        <div className="text-center">
          <span className="text-lg font-medium text-gray-900">
            {row.eventos_count || 0}
          </span>
          <div className="text-xs text-gray-500">eventos</div>
        </div>
      )
    },
    {
      key: 'direccion_fiscal',
      label: 'Ubicación',
      filterType: 'text' as const,
      render: (value: string) => (
        value ? (
          <div className="flex items-center text-sm text-gray-600 max-w-xs">
            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
            <span title={value} className="truncate">{value}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Sin dirección</span>
        )
      )
    }
  ];

  const actions = [
    {
      label: 'Ver Detalle',
      icon: Eye,
      onClick: handleViewCliente,
      tooltip: 'Ver detalles del cliente'
    },
    {
      label: 'Editar',
      icon: Edit,
      onClick: handleEditCliente,
      show: () => canUpdate('clientes'),
      tooltip: canUpdate('clientes') ? 'Editar cliente' : 'Sin permisos para editar'
    },
    {
      label: 'Eliminar',
      icon: Trash2,
      onClick: handleDeleteCliente,
      show: () => canDelete('clientes'),
      className: 'text-red-600 hover:text-red-700',
      tooltip: canDelete('clientes') ? 'Eliminar cliente' : 'Sin permisos para eliminar'
    }
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Mensaje de error global */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4"
          role="alert"
        >
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-xs underline hover:no-underline"
              >
                Cerrar
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
          <p className="text-gray-600 mt-1">
            Administra la información fiscal y comercial de tus clientes
          </p>
        </div>
        
        {canCreate('clientes') && (
          <Button
            onClick={() => {
              setEditingCliente(null);
              setShowModal(true);
            }}
            className="bg-mint-500 hover:bg-mint-600 mt-4 sm:mt-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{clientesWithCounts?.length || 0}</p>
              <p className="text-sm text-gray-600">Clientes Registrados</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {clientesWithCounts?.filter(c => c.email).length || 0}
              </p>
              <p className="text-sm text-gray-600">Con Email Registrado</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-mint-100 rounded-lg">
              <Phone className="w-5 h-5 text-mint-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {clientesWithCounts?.filter(c => c.telefono).length || 0}
              </p>
              <p className="text-sm text-gray-600">Con Teléfono Registrado</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(eventCounts || {}).reduce((sum, count) => sum + count, 0)}
              </p>
              <p className="text-sm text-gray-600">Eventos Totales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de clientes */}
      <DataTable
        data={clientesWithCounts || []}
        columns={columns}
        actions={actions}
        exportable={true}
        selectable={true}
        filterable={true}
        onRowClick={handleViewCliente}
      />

      {/* Modal de cliente */}
      {showModal && (
        <ClienteModal
          cliente={editingCliente}
          isLoading={isCreating || isUpdating || isDeleting}
          onClose={() => {
            setShowModal(false);
            setEditingCliente(null);
            setError(null);
          }}
          onSave={handleSaveCliente}
        />
      )}

      {/* Modal de detalle de cliente */}
      {showDetailModal && viewingCliente && (
        <ClientDetailModal
          client={viewingCliente}
          onClose={() => {
            setShowDetailModal(false);
            setViewingCliente(null);
          }}
          onEdit={(cliente) => {
            setShowDetailModal(false);
            setViewingCliente(null);
            setEditingCliente(cliente);
            setShowModal(true);
          }}
          onDelete={(cliente) => {
            setShowDetailModal(false);
            setViewingCliente(null);
            handleDeleteCliente(cliente);
          }}
        />
      )}
    </motion.div>
  );
};