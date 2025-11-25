import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Plus, CreditCard as Edit, Trash2, Eye, X, Settings as SettingsIcon, XCircle, CheckCircle, Loader2, Wallet, FileText, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { supabase } from '../../../core/config/supabase';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { usePermissions } from '../../../core/permissions/usePermissions';
import { StateAdvancementManager } from './workflow/StateAdvancementManager';
import { useEventStates } from '../hooks/useEventStates';
import { workflowService } from '../services/workflowService';
import { useAuth } from '../../../core/auth/AuthProvider';
import toast from 'react-hot-toast';
import { DualOCRExpenseForm } from './finances/DualOCRExpenseForm';
import { IncomeForm } from './finances/IncomeForm';
import { GaugeChart } from './GaugeChart';

interface EventoDetailModalProps {
  eventoId: number;
  onClose: () => void;
  onEdit: (evento: any) => void;
  onRefresh: () => void;
}

export const EventoDetailModal: React.FC<EventoDetailModalProps> = ({
  eventoId, 
  onClose,
  onEdit,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'ingresos' | 'gastos' | 'workflow'>('overview');
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventDocuments, setEventDocuments] = useState<any[]>([]);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  // Estados para el modal de gastos
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState<any | null>(null);
  
  // Estados para el modal de ingresos
  const [showIngresoModal, setShowIngresoModal] = useState(false);
  const [editingIngreso, setEditingIngreso] = useState<any | null>(null);
  
  const { canUpdate, canDelete } = usePermissions();
  const { data: estados } = useEventStates();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: evento, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['evento', eventoId],
    queryFn: async () => {
      // IMPORTANTE: Cargar desde evt_eventos (NO desde la vista) para tener TODOS los campos
      const { data: eventoBase, error: eventoError } = await supabase
        .from('evt_eventos')
        .select('*')
        .eq('id', eventoId)
        .single();

      if (eventoError) throw eventoError;

      // Cargar datos relacionados por separado
      let clienteData = null;
      let responsableData = null;
      let solicitanteData = null;

      if (eventoBase.cliente_id) {
        const { data } = await supabase
          .from('evt_clientes')
          .select('id, razon_social, nombre_comercial')
          .eq('id', eventoBase.cliente_id)
          .single();
        clienteData = data;
      }

      if (eventoBase.responsable_id) {
        console.log('🔍 Buscando responsable con ID:', eventoBase.responsable_id);
        const { data, error } = await supabase
          .from('core_users')
          .select('id, nombre, apellidos, email')
          .eq('id', eventoBase.responsable_id)
          .single();

        if (!error && data) {
          responsableData = data;
          console.log('✅ Responsable cargado:', data);
        } else {
          console.error('❌ Error cargando responsable:', error);
        }
      }

      if (eventoBase.solicitante_id) {
        console.log('🔍 Buscando solicitante con ID:', eventoBase.solicitante_id);
        const { data, error } = await supabase
          .from('core_users')
          .select('id, nombre, apellidos, email')
          .eq('id', eventoBase.solicitante_id)
          .single();

        if (!error && data) {
          solicitanteData = data;
          console.log('✅ Solicitante cargado:', data);
        } else {
          console.error('❌ Error cargando solicitante:', error);
        }
      }

      // Cargar datos financieros desde la vista (IGUAL QUE EN EL LISTADO)
      console.log('🔍 Cargando datos financieros para evento:', eventoId);
      const { data: eventoFinanciero, error: financieroError } = await supabase
        .from('vw_eventos_analisis_financiero')
        .select('*')
        .eq('id', eventoId)
        .single();

      if (financieroError) {
        console.error('❌ Error cargando datos financieros:', financieroError);
      } else {
        console.log('✅ Datos financieros cargados:', eventoFinanciero);
      }

      // Combinar todos los datos
      return {
        ...eventoBase,
        cliente: clienteData,
        responsable: responsableData,
        solicitante: solicitanteData,
        // Spread de TODOS los campos financieros de la vista
        ...(eventoFinanciero || {}),
      };
    },
    enabled: !!eventoId,
  });

  useEffect(() => {
    if (evento) {
      loadFinancialData();
    }
  }, [evento]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const { data: ingresosData, error: ingresosError } = await supabase
        .from('evt_ingresos')
        .select('*')
        .eq('evento_id', evento.id)
        .order('created_at', { ascending: false });

      if (ingresosError) throw ingresosError;
      setIngresos(ingresosData || []);

      const { data: gastosData, error: gastosError } = await supabase
        .from('evt_gastos')
        .select(`
          *,
          categoria:evt_categorias_gastos(nombre, color)
        `)
        .eq('evento_id', evento.id)
        .order('created_at', { ascending: false });

      if (gastosError) throw gastosError;
      setGastos(gastosData || []);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActionInWorkflow = (newStateName?: string) => {
    const message = newStateName
      ? `🎉 Estado avanzado a: ${newStateName}`
      : 'Acción completada. Refrescando estado del evento...';
    toast.success(message);
    // Invalida la query para este evento específico para obtener datos frescos
    queryClient.invalidateQueries({ queryKey: ['evento', eventoId] });
    onRefresh(); // Also refresh the main list
  };

  const handleCancelEvent = async () => {
    if (!user) return;
    if (window.confirm('¿Estás seguro de que deseas cancelar este evento? Esta acción no se puede deshacer.')) {
      setIsCanceling(true);
      try {
        const reason = prompt('Por favor, introduce un motivo para la cancelación:');
        if (reason) {
          await workflowService.cancelEvent(evento.id, user.id, reason);
          toast.success('Evento cancelado correctamente.');
          onRefresh();
          onClose();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al cancelar el evento.');
        // Aquí podrías mostrar una notificación de error al usuario
      } finally {
        setIsCanceling(false);
      }
    }
  };

  const handleFinalizeEvent = async () => {
    if (!user) return;

    // VALIDACIÓN CRÍTICA: Verificar que todos los ingresos tengan factura
    const ingresosTotal = ingresos.length;
    const ingresosConFactura = ingresos.filter(i => i.numero_factura && i.numero_factura.trim() !== '').length;

    if (ingresosTotal === 0) {
      toast.error('No se puede finalizar el evento: No hay ingresos registrados.');
      return;
    }

    if (ingresosConFactura < ingresosTotal) {
      const faltantes = ingresosTotal - ingresosConFactura;
      toast.error(
        <div>
          <strong>No se puede finalizar el evento:</strong>
          <ul className="mt-2 ml-4 list-disc">
            <li>{faltantes} ingreso(s) sin factura</li>
            <li>Todos los ingresos deben tener factura para finalizar</li>
          </ul>
        </div>,
        { duration: 5000 }
      );
      return;
    }

    if (window.confirm('¿Estás seguro de que deseas finalizar este evento?')) {
      setIsFinalizing(true);
      try {
        await workflowService.finalizeEvent(evento.id, user.id, 'Evento finalizado desde el modal de detalles.');
        toast.success('Evento finalizado correctamente.');
        onRefresh();
      } catch (error) {
        console.error('Error al finalizar el evento:', error);
        toast.error('Error al finalizar el evento');
      } finally {
        setIsFinalizing(false);
      }
    }
  };

  if (isLoadingEvent || !evento) {
    return <div className="p-6 text-center">Cargando detalles del evento...</div>;
  }

  const getCurrentState = () => {
    return estados?.find(estado => estado.id === evento.estado_id);
  };

  // ============================================================================
  // CÁLCULOS FINANCIEROS CENTRALIZADOS - ÚNICA FUENTE DE VERDAD
  // ============================================================================
  // Usamos SIEMPRE los datos de vw_eventos_analisis_financiero para consistencia

  // Provisiones
  const provisionesTotal = (evento.provision_combustible_peaje || 0) +
                           (evento.provision_materiales || 0) +
                           (evento.provision_recursos_humanos || 0) +
                           (evento.provision_solicitudes_pago || 0);

  // Ingresos (desde la vista)
  const ingresosTotales = evento.ingresos_totales || 0;
  const ingresosCobrados = evento.ingresos_cobrados || 0;
  const ingresosPendientes = evento.ingresos_pendientes || 0;

  // Gastos (desde la vista)
  const gastosTotales = evento.gastos_totales || 0;
  const gastosPagados = evento.gastos_pagados_total || 0;
  const gastosPendientes = evento.gastos_pendientes_total || 0;

  // Disponible y Utilidad
  const disponibleTotal = provisionesTotal - gastosTotales;
  const utilidadReal = ingresosTotales - gastosTotales;

  const getStatusBadge = (status: string, type: 'evento' | 'pago') => {
    if (type === 'evento') {
      const variants = {
        'planificacion': 'warning',
        'confirmado': 'info',
        'en_progreso': 'info',
        'completado': 'success',
        'cancelado': 'danger'
      };
      
      const labels = {
        'planificacion': 'Planificación',
        'confirmado': 'Confirmado',
        'en_progreso': 'En Progreso',
        'completado': 'Completado',
        'cancelado': 'Cancelado'
      };
      
      return (
        <Badge variant={variants[status as keyof typeof variants] as any}>
          {labels[status as keyof typeof labels]}
        </Badge>
      );
    } else {
      const variants = {
        'pendiente_facturar': 'warning',
        'facturado': 'info',
        'pago_pendiente': 'warning',
        'pagado': 'success'
      };
      
      const labels = {
        'pendiente_facturar': 'Pendiente Facturar',
        'facturado': 'Facturado',
        'pago_pendiente': 'Pago Pendiente',
        'pagado': 'Pagado'
      };
      
      return (
        <Badge variant={variants[status as keyof typeof variants] as any}>
          {labels[status as keyof typeof labels]}
        </Badge>
      );
    }
  };

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: Eye },
    { id: 'ingresos', label: 'Ingresos', icon: TrendingUp },
    { id: 'gastos', label: 'Gastos', icon: TrendingDown },
    { id: 'provisiones', label: 'Provisiones', icon: Wallet },
    { id: 'workflow', label: 'Workflow', icon: SettingsIcon }
  ];

  return (
    <>
    <Modal
      isOpen={true}
      onClose={onClose}
      size="full"
    >
      <div className="flex flex-col h-full">
        {/* HEADER SIMPLIFICADO Y COMPRIMIDO */}
        <div className="px-4 py-3 border-b bg-gray-50">
          {/* Título compacto y botones de acción */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              {evento.clave_evento || `EVT-${evento.id}`}
              {(evento.nombre_proyecto || evento.proyecto || evento.nombre) && ` - ${evento.nombre_proyecto || evento.proyecto || evento.nombre}`}
            </h2>
            <div className="flex items-center gap-2">
              {/* Botones de acción de evento */}
              <button
                onClick={handleCancelEvent}
                disabled={isCanceling}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Cancelar evento"
              >
                {isCanceling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Cancelar
              </button>
              {evento.estado?.nombre !== 'Finalizado' && evento.estado?.nombre !== 'Cancelado' && (
                <button
                  onClick={handleFinalizeEvent}
                  disabled={isFinalizing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Finalizar evento"
                >
                  {isFinalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Finalizar
                </button>
              )}
              {/* Separador visual */}
              <div className="w-px h-6 bg-gray-300"></div>
              {/* Botón de editar */}
              {canUpdate('eventos') && (
                <button
                  onClick={() => onEdit(evento)}
                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Editar evento"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {/* Botón de cerrar */}
              <button
                onClick={onClose}
                className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid de 2 columnas: 50% Detalle del Marco / 50% Resumen Financiero */}
          <div className="grid grid-cols-2 gap-4">
            {/* COLUMNA IZQUIERDA (50%): INFORMACIÓN BÁSICA */}
            <div className="space-y-1 text-xs">
                <div className="grid grid-cols-[80px_1fr]">
                  <span className="text-gray-600">📅 Fecha:</span>
                  <span className="text-gray-900">
                    {formatDate(evento.fecha_evento)}
                    {evento.fecha_fin && ` - ${formatDate(evento.fecha_fin)}`}
                  </span>
                </div>
                <div className="grid grid-cols-[80px_1fr]">
                  <span className="text-gray-600">📍 Lugar:</span>
                  <span className="text-gray-900">{evento.lugar || evento.ubicacion || 'No especificado'}</span>
                </div>
                <div className="grid grid-cols-[80px_1fr]">
                  <span className="text-gray-600">👤 Cliente:</span>
                  <span className="text-gray-900">
                    {evento.cliente?.razon_social || evento.cliente?.nombre_comercial || 'No especificado'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">👥</span>
                  <span className="text-gray-500 text-xs">Responsable:</span>
                  <span className="text-gray-900 font-medium">
                    {evento.responsable ? `${evento.responsable.nombre} ${evento.responsable.apellidos || ''}`.trim() : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">👤</span>
                  <span className="text-gray-500 text-xs">Solicitante:</span>
                  <span className="text-gray-900 font-medium">
                    {evento.solicitante ? `${evento.solicitante.nombre} ${evento.solicitante.apellidos || ''}`.trim() : '—'}
                  </span>
                </div>
            </div>            {/* COLUMNA DERECHA (50%): RESUMEN FINANCIERO - COMPACTO */}
            <div>
              <h3 className="text-xs font-semibold text-green-600 uppercase mb-2">
                💰 Resumen Financiero
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ingresos:</span>
                  <span className="font-bold text-green-700">{formatCurrency(ingresosTotales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gastos:</span>
                  <span className="font-bold text-red-700">{formatCurrency(gastosTotales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Provisiones:</span>
                  <span className={`font-bold ${disponibleTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(Math.max(0, disponibleTotal))}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-300">
                  <span className="text-gray-900 font-semibold">Utilidad:</span>
                  <span className={`font-bold ${utilidadReal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(utilidadReal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-mint-500 text-mint-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
                {tab.id === 'archivos' && eventDocuments.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    {eventDocuments.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <OverviewTab evento={evento} />
            )}
            
            {activeTab === 'ingresos' && (
              <IngresosTab 
                ingresos={ingresos} 
                evento={evento} 
                onRefresh={loadFinancialData}
                onCreateIngreso={() => {
                  setEditingIngreso(null);
                  setShowIngresoModal(true);
                }}
                onEditIngreso={(ingreso) => {
                  setEditingIngreso(ingreso);
                  setShowIngresoModal(true);
                }}
              />
            )}
            
            {activeTab === 'gastos' && (
              <GastosTab
                gastos={gastos}
                evento={evento}
                onRefresh={loadFinancialData}
                onCreateGasto={() => {
                  setEditingGasto(null);
                  setShowGastoModal(true);
                }}
                onEditGasto={(gasto) => {
                  setEditingGasto(gasto);
                  setShowGastoModal(true);
                }}
              />
            )}

            {activeTab === 'provisiones' && (
              <ProvisionesTab evento={evento} eventoId={eventoId} onRefresh={loadFinancialData} />
            )}

            {activeTab === 'workflow' && (
              <WorkflowTab evento={evento} onStateChanged={handleActionInWorkflow} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
    
    {/* Modal de Gasto con OCR */}
    {showGastoModal && (
      <Modal 
        isOpen={showGastoModal} 
        size="xxl"
        closeOnBackdrop={false}
        onClose={() => {
          setShowGastoModal(false);
          setEditingGasto(null);
        }}
      >
        <div className="p-6">
          <DualOCRExpenseForm
            expense={editingGasto}
            eventId={eventoId.toString()}
            onSave={async (data) => {
              try {
                console.log('💾 [EventoDetailModal] Guardando gasto con datos:', data);

                // Preparar datos para guardar
                const gastoData = {
                  ...data,
                  evento_id: eventoId,
                };

                if (editingGasto) {
                  // Actualizar gasto existente
                  console.log('📝 Actualizando gasto ID:', editingGasto.id);
                  const { error } = await supabase
                    .from('evt_gastos')
                    .update(gastoData)
                    .eq('id', editingGasto.id);

                  if (error) throw error;
                  toast.success('Gasto actualizado correctamente');
                } else {
                  // Crear nuevo gasto
                  console.log('➕ Creando nuevo gasto');
                  const { error } = await supabase
                    .from('evt_gastos')
                    .insert(gastoData);

                  if (error) throw error;
                  toast.success('Gasto creado correctamente');
                }

                await loadFinancialData();
                setShowGastoModal(false);
                setEditingGasto(null);
              } catch (error) {
                console.error('❌ Error guardando gasto:', error);
                toast.error(`Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
              }
            }}
            onCancel={() => {
              setShowGastoModal(false);
              setEditingGasto(null);
            }}
          />
        </div>
      </Modal>
    )}
    
    {/* Modal de Ingreso */}
    {showIngresoModal && (
      <Modal 
        isOpen={showIngresoModal}
        size="xxl"
        closeOnBackdrop={false}
        onClose={() => {
          setShowIngresoModal(false);
          setEditingIngreso(null);
        }}
      >
        <div className="p-6">
          <IncomeForm
            income={editingIngreso}
            eventId={eventoId.toString()}
            onSave={async (data) => {
              try {
                // Limpiar campos vacíos para evitar error de postgres con integers
                const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
                  // Convertir strings vacíos a null para campos numéricos
                  if (value === '' || value === undefined) {
                    acc[key] = null;
                  } else {
                    acc[key] = value;
                  }
                  return acc;
                }, {} as any);

                if (editingIngreso?.id) {
                  // Actualizar ingreso existente
                  const { error } = await supabase
                    .from('evt_ingresos')
                    .update(cleanData)
                    .eq('id', editingIngreso.id);
                  
                  if (error) throw error;
                  toast.success('Ingreso actualizado correctamente');
                } else {
                  // Crear nuevo ingreso
                  const { error } = await supabase
                    .from('evt_ingresos')
                    .insert([cleanData]);
                  
                  if (error) throw error;
                  toast.success('Ingreso creado correctamente');
                }
                
                await loadFinancialData();
                setShowIngresoModal(false);
                setEditingIngreso(null);
              } catch (error) {
                console.error('Error guardando ingreso:', error);
                toast.error('Error al guardar el ingreso');
              }
            }}
            onCancel={() => {
              setShowIngresoModal(false);
              setEditingIngreso(null);
            }}
          />
        </div>
      </Modal>
    )}
    </>
  );
};

const OverviewTab: React.FC<{ evento: any }> = ({ evento }) => {
  // Calcular valores
  const provisionesTotal = (evento.provision_combustible_peaje || 0) + 
                           (evento.provision_materiales || 0) + 
                           (evento.provision_recursos_humanos || 0) + 
                           (evento.provision_solicitudes_pago || 0);
  
  const ingresoEstimado = evento.ganancia_estimada || evento.ingreso_estimado || 0;
  const utilidadEstimada = ingresoEstimado - provisionesTotal;
  const margenEstimadoPct = ingresoEstimado > 0 ? (utilidadEstimada / ingresoEstimado) * 100 : 0;

  const ingresosTotales = (evento.ingresos_cobrados || 0) + (evento.ingresos_pendientes || 0);
  const gastosTotales = (evento.gastos_pagados_total || 0) + (evento.gastos_pendientes_total || 0);
  const disponibleTotal = provisionesTotal - (evento.gastos_pagados_total || 0);
  const utilidadReal = (evento.ingresos_cobrados || 0) - (evento.gastos_pagados_total || 0);
  const margenRealPct = (evento.ingresos_cobrados || 0) > 0 ? (utilidadReal / (evento.ingresos_cobrados || 0)) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      {/* ANÁLISIS FINANCIERO COMPARATIVO - PRIMERO */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2" />
          Análisis Financiero del Evento
        </h3>

        {/* GRÁFICA COMPARATIVA */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">📊 Comparativa Planeado vs Real</h4>
          <div className="space-y-4">
            {/* Ingresos Bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-600">INGRESOS</span>
                <div className="flex gap-4 text-xs">
                  <span className="text-gray-500">Est: {formatCurrency(ingresoEstimado)}</span>
                  <span className="text-gray-900 font-bold">Real: {formatCurrency(ingresosTotales)}</span>
                </div>
              </div>
              <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-gray-300 transition-all duration-500"
                  style={{ width: `${Math.min((ingresoEstimado / Math.max(ingresoEstimado, ingresosTotales)) * 100, 100)}%` }}
                />
                <div
                  className="absolute h-full transition-all duration-500"
                  style={{
                    width: `${Math.min((ingresosTotales / Math.max(ingresoEstimado, ingresosTotales)) * 100, 100)}%`,
                    backgroundColor: '#1e3a8a' // blue-900 (azul marino)
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {ingresosTotales >= ingresoEstimado ? '✓' : '⚠️'} {((ingresosTotales / ingresoEstimado) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Gastos Bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-600">GASTOS</span>
                <div className="flex gap-4 text-xs">
                  <span className="text-gray-500">Prov: {formatCurrency(provisionesTotal)}</span>
                  <span className="text-gray-900 font-bold">Real: {formatCurrency(gastosTotales)}</span>
                </div>
              </div>
              <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="absolute h-full bg-gray-300 transition-all duration-500"
                  style={{ width: `${Math.min((provisionesTotal / Math.max(provisionesTotal, gastosTotales)) * 100, 100)}%` }}
                />
                <div
                  className={`absolute h-full transition-all duration-500 ${gastosTotales <= provisionesTotal ? 'bg-blue-600' : 'bg-red-600'}`}
                  style={{ width: `${Math.min((gastosTotales / Math.max(provisionesTotal, gastosTotales)) * 100, 100)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {gastosTotales <= provisionesTotal ? '✓' : '⚠️'} {((gastosTotales / provisionesTotal) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Utilidad Bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-600">UTILIDAD</span>
                <div className="flex gap-4 text-xs">
                  <span className="text-gray-500">Plan: {formatCurrency(utilidadEstimada)}</span>
                  <span className={`font-bold ${utilidadReal >= 0 ? 'text-gray-900' : 'text-rose-900'}`}>
                    Real: {formatCurrency(utilidadReal)}
                  </span>
                </div>
              </div>
              <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-gray-300 transition-all duration-500"
                  style={{ width: `${Math.min((Math.abs(utilidadEstimada) / Math.max(Math.abs(utilidadEstimada), Math.abs(utilidadReal))) * 100, 100)}%` }}
                />
                <div
                  className={`absolute h-full transition-all duration-500 ${utilidadReal >= utilidadEstimada ? 'bg-blue-600' : 'bg-slate-600'}`}
                  style={{ width: `${Math.min((Math.abs(utilidadReal) / Math.max(Math.abs(utilidadEstimada), Math.abs(utilidadReal))) * 100, 100)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {margenRealPct.toFixed(1)}% margen
                  </span>
                </div>
              </div>
            </div>

            {/* Leyenda */}
            <div className="flex justify-center gap-6 pt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-300" />
                <span>Estimado/Planeado</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#1e3a8a' }} />
                <span>Real</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-600" />
                <span>Dentro de presupuesto</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-600" />
                <span>Fuera de presupuesto</span>
              </div>
            </div>
          </div>
        </div>

        {/* DATOS DEL RESUMEN DEL EVENTO - Replicando formato del renglón del listado */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-lg border-2 border-blue-200">
          <div className="grid grid-cols-4 gap-6">
            {/* INGRESOS - Replicando formato del listado */}
            <div className="border-r pr-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Ingresos</h4>
              <div className="font-bold text-blue-900 text-2xl mb-2">
                {formatCurrency(ingresosTotales)}
              </div>
              <div className="text-xs text-gray-500 border-t pt-2 space-y-1">
                <div className="text-blue-600">Cobr: {formatCurrency(evento.ingresos_cobrados || 0)}</div>
                <div className="text-slate-600">Pend: {formatCurrency(evento.ingresos_pendientes || 0)}</div>
                <div className="text-gray-400">Est: {formatCurrency(ingresoEstimado)}</div>
              </div>
            </div>

            {/* GASTOS - Replicando formato del listado */}
            <div className="border-r pr-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Gastos</h4>
              <div className="font-bold text-red-900 text-2xl mb-2">
                {formatCurrency(gastosTotales)}
              </div>
              <div className="text-xs text-gray-500 border-t pt-2 space-y-1">
                <div>⛽ {formatCurrency((evento.gastos_combustible_pagados || 0) + (evento.gastos_combustible_pendientes || 0))}</div>
                <div>🛠️ {formatCurrency((evento.gastos_materiales_pagados || 0) + (evento.gastos_materiales_pendientes || 0))}</div>
                <div>👥 {formatCurrency((evento.gastos_rh_pagados || 0) + (evento.gastos_rh_pendientes || 0))}</div>
                <div>💳 {formatCurrency((evento.gastos_sps_pagados || 0) + (evento.gastos_sps_pendientes || 0))}</div>
              </div>
            </div>

            {/* PROVISIONES - Replicando formato del listado */}
            <div className="border-r pr-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Provisiones</h4>
              <div className={`font-bold text-2xl mb-2 ${disponibleTotal > 0 ? 'text-green-700' : disponibleTotal < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                {formatCurrency(Math.max(0, disponibleTotal))}
              </div>
              <div className="text-xs text-gray-500 border-t pt-2 space-y-1">
                <div className={(evento.provision_combustible_peaje || 0) - ((evento.gastos_combustible_pagados || 0) + (evento.gastos_combustible_pendientes || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ⛽ {formatCurrency(Math.max(0, (evento.provision_combustible_peaje || 0) - ((evento.gastos_combustible_pagados || 0) + (evento.gastos_combustible_pendientes || 0))))}
                </div>
                <div className={(evento.provision_materiales || 0) - ((evento.gastos_materiales_pagados || 0) + (evento.gastos_materiales_pendientes || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  🛠️ {formatCurrency(Math.max(0, (evento.provision_materiales || 0) - ((evento.gastos_materiales_pagados || 0) + (evento.gastos_materiales_pendientes || 0))))}
                </div>
                <div className={(evento.provision_recursos_humanos || 0) - ((evento.gastos_rh_pagados || 0) + (evento.gastos_rh_pendientes || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  👥 {formatCurrency(Math.max(0, (evento.provision_recursos_humanos || 0) - ((evento.gastos_rh_pagados || 0) + (evento.gastos_rh_pendientes || 0))))}
                </div>
                <div className={(evento.provision_solicitudes_pago || 0) - ((evento.gastos_sps_pagados || 0) + (evento.gastos_sps_pendientes || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  💳 {formatCurrency(Math.max(0, (evento.provision_solicitudes_pago || 0) - ((evento.gastos_sps_pagados || 0) + (evento.gastos_sps_pendientes || 0))))}
                </div>
              </div>
            </div>

            {/* UTILIDAD - Con velocímetro replicando formato del listado */}
            <div className="flex flex-col items-center">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Utilidad</h4>
              <div className={`font-bold text-2xl mb-2 ${utilidadReal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(utilidadReal)}
              </div>
              {/* Gauge Chart - Replicando el del listado */}
              <GaugeChart
                value={margenRealPct}
                size="sm"
                showLabel={true}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Notas - Solo si existen */}
      {evento.notas && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Notas
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">
            {evento.notas}
          </p>
        </div>
      )}
    </motion.div>
  );
};

const IngresosTab: React.FC<{
  ingresos: any[];
  evento: any;
  onRefresh: () => void;
  onCreateIngreso: () => void;
  onEditIngreso: (ingreso: any) => void;
}> = ({ ingresos, evento, onRefresh, onCreateIngreso, onEditIngreso }) => {
  const { canCreate, canUpdate, canDelete } = usePermissions();

  const handleDelete = async (ingreso: any) => {
    if (confirm(`¿Está seguro de que desea eliminar este ingreso de ${formatCurrency(ingreso.total)}?`)) {
      try {
        const { error } = await supabase
          .from('evt_ingresos')
          .delete()
          .eq('id', ingreso.id);
        
        if (error) throw error;
        onRefresh();
      } catch (error) {
        console.error('Error deleting ingreso:', error);
      }
    }
  };

  // Calcular totales desde la vista (siempre usar vw_eventos_analisis_financiero)
  const totalIngresos = evento.ingresos_totales || 0;
  const totalCobrados = evento.ingresos_cobrados || 0;
  const totalPendientes = evento.ingresos_pendientes || 0;
  const porcentajeCobrado = totalIngresos > 0 ? (totalCobrados / totalIngresos) * 100 : 0;

  // Contar facturas de los arrays locales
  const numFacturasCobradas = ingresos.filter(i => i.cobrado).length;
  const numFacturasPendientes = ingresos.filter(i => !i.cobrado).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6"
    >
      {/* RESUMEN DE INGRESOS - 3 FICHAS + BOTÓN AGREGAR */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="text-[10px] text-blue-700 font-semibold uppercase tracking-wide">Total Ingresos</div>
            <div className="text-[10px] text-blue-600 font-semibold">{porcentajeCobrado.toFixed(0)}%</div>
          </div>
          <div className="text-xl font-bold text-blue-900">{formatCurrency(totalIngresos)}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="text-[10px] text-blue-700 font-semibold uppercase tracking-wide">Cobrados</div>
            <div className="text-[10px] text-blue-600 font-semibold">{numFacturasCobradas} fact</div>
          </div>
          <div className="text-xl font-bold text-blue-900">{formatCurrency(totalCobrados)}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="text-[10px] text-slate-700 font-semibold uppercase tracking-wide">Pendientes</div>
            <div className="text-[10px] text-slate-600 font-semibold">{numFacturasPendientes} fact</div>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(totalPendientes)}</div>
        </div>

        {/* BOTÓN AGREGAR INGRESO */}
        {canCreate('ingresos') && (
          <button
            onClick={onCreateIngreso}
            className="bg-gradient-to-br from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 border border-slate-400 rounded-lg p-3 transition-all flex flex-col items-center justify-center gap-1.5 group shadow-sm"
          >
            <Plus className="w-6 h-6 text-white" />
            <span className="text-[10px] font-semibold text-white uppercase tracking-wide text-center">Agregar<br/>Ingreso</span>
          </button>
        )}
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-4">Ingresos del Evento</h3>

      <div className="space-y-4">
        {ingresos.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay ingresos registrados</p>
          </div>
        ) : (
          ingresos.map(ingreso => (
            <div key={ingreso.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">{ingreso.concepto}</h4>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(ingreso.total)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Fecha: {formatDate(ingreso.created_at)}</p>
                    {ingreso.descripcion && <p>Descripción: {ingreso.descripcion}</p>}
                    {ingreso.referencia && <p>Referencia: {ingreso.referencia}</p>}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {canUpdate('ingresos') && (
                    <Button
                      onClick={() => onEditIngreso(ingreso)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete('ingresos') && (
                    <Button
                      onClick={() => handleDelete(ingreso)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

const GastosTab: React.FC<{
  gastos: any[];
  evento: any;
  onRefresh: () => void;
  onCreateGasto: () => void;
  onEditGasto: (gasto: any) => void;
}> = ({ gastos, evento, onRefresh, onCreateGasto, onEditGasto }) => {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [activeSubTab, setActiveSubTab] = useState<'todos' | 'combustible' | 'materiales' | 'rh' | 'sps'>('todos');
  const [isDesgloseExpanded, setIsDesgloseExpanded] = useState(false); // Oculto por defecto - desglose de categorías

  const handleDelete = async (gasto: any) => {
    if (confirm(`¿Está seguro de que desea eliminar este gasto de ${formatCurrency(gasto.total)}?`)) {
      try {
        const { error } = await supabase
          .from('evt_gastos')
          .update({ 
            deleted_at: new Date().toISOString(),
            activo: false 
          })
          .eq('id', gasto.id);
        
        if (error) throw error;
        onRefresh();
      } catch (error) {
        console.error('Error deleting gasto:', error);
      }
    }
  };

  // Calcular totales desde la vista (siempre usar vw_eventos_analisis_financiero)
  const totalGastado = evento.gastos_pagados_total || 0;
  const totalPendiente = evento.gastos_pendientes_total || 0;
  const totalGastos = evento.gastos_totales || 0; // Desde la vista

  // Provisiones
  const totalProvisionado = (evento.provision_combustible_peaje || 0) +
                           (evento.provision_materiales || 0) +
                           (evento.provision_recursos_humanos || 0) +
                           (evento.provision_solicitudes_pago || 0);

  // Calcular por categoría (pagados + pendientes)
  const gastosCombustible = (evento.gastos_combustible_pagados || 0) + (evento.gastos_combustible_pendientes || 0);
  const gastosMateriales = (evento.gastos_materiales_pagados || 0) + (evento.gastos_materiales_pendientes || 0);
  const gastosRH = (evento.gastos_rh_pagados || 0) + (evento.gastos_rh_pendientes || 0);
  const gastosSPS = (evento.gastos_sps_pagados || 0) + (evento.gastos_sps_pendientes || 0);

  // Calcular disponible por categoría (Provisión - Gastos Totales)
  const dispCombustible = (evento.provision_combustible_peaje || 0) - gastosCombustible;
  const dispMateriales = (evento.provision_materiales || 0) - gastosMateriales;
  const dispRH = (evento.provision_recursos_humanos || 0) - gastosRH;
  const dispSPS = (evento.provision_solicitudes_pago || 0) - gastosSPS;
  const totalDisponible = totalProvisionado - totalGastos;

  const subTabs = [
    { id: 'todos', label: 'Todos', count: gastos.length },
    { id: 'combustible', label: '⛽ Combustible/Peaje', count: gastos.filter(g => g.categoria?.nombre === 'Combustible/Peaje').length },
    { id: 'materiales', label: '🛠️ Materiales', count: gastos.filter(g => g.categoria?.nombre === 'Materiales').length },
    { id: 'rh', label: '👥 Recursos Humanos', count: gastos.filter(g => g.categoria?.nombre === 'Recursos Humanos').length },
    { id: 'sps', label: '💳 Solicitudes de Pago', count: gastos.filter(g => g.categoria?.nombre === 'Solicitudes de Pago').length }
  ];

  const gastosFilter = activeSubTab === 'todos' 
    ? gastos 
    : gastos.filter(g => {
        const categoryMap: Record<string, string> = {
          'combustible': 'Combustible/Peaje',
          'materiales': 'Materiales',
          'rh': 'Recursos Humanos',
          'sps': 'Solicitudes de Pago'
        };
        return g.categoria?.nombre === categoryMap[activeSubTab];
      });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6"
    >
      {/* RESUMEN DE GASTOS - 4 FICHAS + BOTÓN AGREGAR */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {/* FICHA 1: Provisionado - Clickeable completa */}
        <button
          onClick={() => setIsDesgloseExpanded(!isDesgloseExpanded)}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="text-[10px] text-blue-700 font-semibold uppercase tracking-wide">Provisionado</div>
            <div className="text-[10px] text-blue-600 font-semibold">100%</div>
          </div>
          <div className="text-xl font-bold text-blue-900">{formatCurrency(totalProvisionado)}</div>
          {isDesgloseExpanded && (
            <div className="text-[10px] text-blue-600 mt-1.5 space-y-0.5">
              <div>⛽ {formatCurrency(evento.provision_combustible_peaje || 0)}</div>
              <div>🛠️ {formatCurrency(evento.provision_materiales || 0)}</div>
              <div>👥 {formatCurrency(evento.provision_recursos_humanos || 0)}</div>
              <div>💳 {formatCurrency(evento.provision_solicitudes_pago || 0)}</div>
            </div>
          )}
        </button>

        {/* FICHA 2: Gastado - Clickeable completa */}
        <button
          onClick={() => setIsDesgloseExpanded(!isDesgloseExpanded)}
          className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="text-[10px] text-slate-700 font-semibold uppercase tracking-wide">Gastado</div>
            <div className="text-[10px] text-slate-600 font-semibold">
              {totalProvisionado > 0 ? ((totalGastos / totalProvisionado) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(totalGastos)}</div>
          {isDesgloseExpanded && (
            <div className="text-[10px] text-slate-600 mt-1.5 space-y-0.5">
              <div>⛽ {formatCurrency(gastosCombustible)}</div>
              <div>🛠️ {formatCurrency(gastosMateriales)}</div>
              <div>👥 {formatCurrency(gastosRH)}</div>
              <div>💳 {formatCurrency(gastosSPS)}</div>
            </div>
          )}
        </button>

        {/* FICHA 3: Pagados y Por Pagar - Siempre visible, agrupados en una sola ficha dividida verticalmente */}
        <button
          onClick={() => setIsDesgloseExpanded(!isDesgloseExpanded)}
          className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all text-left flex gap-0"
        >
          {/* Pagados - Lado izquierdo */}
          <div className="flex-1 pr-2">
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <div className="text-[10px] text-blue-700 font-semibold uppercase tracking-wide">Pagados</div>
              <div className="text-[10px] text-blue-600 font-semibold">
                {totalGastos > 0 ? ((totalGastado / totalGastos) * 100).toFixed(0) : 0}%
              </div>
            </div>
            <div className="text-lg font-bold text-blue-900">{formatCurrency(totalGastado)}</div>
            {isDesgloseExpanded && (
              <div className="text-[9px] text-blue-600 mt-1 space-y-0.5">
                <div>⛽ {formatCurrency(evento.gastos_combustible_pagados || 0)}</div>
                <div>🛠️ {formatCurrency(evento.gastos_materiales_pagados || 0)}</div>
                <div>👥 {formatCurrency(evento.gastos_rh_pagados || 0)}</div>
                <div>💳 {formatCurrency(evento.gastos_sps_pagados || 0)}</div>
              </div>
            )}
          </div>

          {/* Divisor vertical */}
          <div className="w-px bg-slate-300 my-1"></div>

          {/* Por Pagar - Lado derecho */}
          <div className="flex-1 pl-2">
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <div className="text-[10px] text-slate-700 font-semibold uppercase tracking-wide">Por Pagar</div>
              <div className="text-[10px] text-slate-600 font-semibold">
                {totalGastos > 0 ? ((totalPendiente / totalGastos) * 100).toFixed(0) : 0}%
              </div>
            </div>
            <div className="text-lg font-bold text-slate-900">{formatCurrency(totalPendiente)}</div>
            {isDesgloseExpanded && (
              <div className="text-[9px] text-slate-600 mt-1 space-y-0.5">
                <div>⛽ {formatCurrency(evento.gastos_combustible_pendientes || 0)}</div>
                <div>🛠️ {formatCurrency(evento.gastos_materiales_pendientes || 0)}</div>
                <div>👥 {formatCurrency(evento.gastos_rh_pendientes || 0)}</div>
                <div>💳 {formatCurrency(evento.gastos_sps_pendientes || 0)}</div>
              </div>
            )}
          </div>
        </button>

        {/* FICHA 4: Disponible - Clickeable completa */}
        <button
          onClick={() => setIsDesgloseExpanded(!isDesgloseExpanded)}
          className={`rounded-lg p-3 border text-left hover:shadow-md transition-all ${
            totalDisponible >= 0
              ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
              : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className={`text-[10px] font-semibold uppercase tracking-wide ${totalDisponible >= 0 ? 'text-gray-700' : 'text-red-700'}`}>
              Disponible
            </div>
            <div className={`text-[10px] font-semibold ${totalDisponible >= 0 ? 'text-gray-600' : 'text-red-600'}`}>
              {totalProvisionado > 0 ? ((totalDisponible / totalProvisionado) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className={`text-xl font-bold ${totalDisponible >= 0 ? 'text-gray-900' : 'text-red-900'}`}>
            {formatCurrency(Math.max(0, totalDisponible))}
          </div>
          {isDesgloseExpanded && (
            <div className={`text-[10px] mt-1.5 space-y-0.5 ${totalDisponible >= 0 ? 'text-gray-600' : 'text-red-600'}`}>
              <div>⛽ {formatCurrency(Math.max(0, dispCombustible))}</div>
              <div>🛠️ {formatCurrency(Math.max(0, dispMateriales))}</div>
              <div>👥 {formatCurrency(Math.max(0, dispRH))}</div>
              <div>💳 {formatCurrency(Math.max(0, dispSPS))}</div>
            </div>
          )}
        </button>

        {/* BOTÓN AGREGAR GASTO */}
        {canCreate('gastos') && (
          <button
            onClick={onCreateGasto}
            className="bg-gradient-to-br from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 border border-slate-400 rounded-lg p-3 transition-all flex flex-col items-center justify-center gap-1.5 group shadow-sm"
          >
            <Plus className="w-6 h-6 text-white" />
            <span className="text-[10px] font-semibold text-white uppercase tracking-wide text-center">Agregar<br/>Gasto</span>
          </button>
        )}
      </div>


      {/* LISTADO DETALLADO DE GASTOS */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6 overflow-hidden p-4">
        {/* SUBTABS */}
        <div className="flex border-b mb-4">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {activeSubTab === 'todos' ? 'Todos los Gastos' : subTabs.find(t => t.id === activeSubTab)?.label}
        </h3>

        <div className="space-y-4">
        {gastosFilter.length === 0 ? (
          <div className="text-center py-12">
            <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay gastos registrados</p>
          </div>
        ) : (
          gastosFilter.map(gasto => (
            <div key={gasto.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">{gasto.concepto}</h4>
                    <span className="text-lg font-bold text-red-600">
                      {formatCurrency(gasto.total)}
                    </span>
                    {gasto.categoria && (
                      <Badge 
                        variant="default" 
                        style={{ backgroundColor: gasto.categoria.color + '20', color: gasto.categoria.color }}
                      >
                        {gasto.categoria.nombre}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Fecha: {formatDate(gasto.fecha_gasto)}</p>
                    {gasto.descripcion && <p>Descripción: {gasto.descripcion}</p>}
                    {gasto.proveedor && <p>Proveedor: {gasto.proveedor}</p>}
                    {gasto.referencia && <p>Referencia: {gasto.referencia}</p>}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {canUpdate('gastos') && (
                    <Button
                      onClick={() => onEditGasto(gasto)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete('gastos') && (
                    <Button
                      onClick={() => handleDelete(gasto)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      </div>
    </motion.div>
  );
};

const ProvisionesTab: React.FC<{
  evento: any;
  eventoId: number;
  onRefresh: () => void;
}> = ({ evento, eventoId, onRefresh }) => {
  const queryClient = useQueryClient();
  const [editingProvision, setEditingProvision] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [margenPorcentaje, setMargenPorcentaje] = useState(10);
  const [expandedKPI, setExpandedKPI] = useState<boolean>(false); // Oculto por defecto

  // Formatear número con separador de miles
  const formatInputValue = (value: number): string => {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Parsear valor con separadores de miles
  const parseInputValue = (value: string): number => {
    return parseFloat(value.replace(/,/g, '')) || 0;
  };

  const provisiones = [
    {
      tipo: 'combustible_peaje',
      label: 'Combustible y Peaje',
      icono: '⛽',
      color: 'from-amber-500 to-orange-600',
      provision: evento.provision_combustible_peaje || 0,
      gastado: (evento.gastos_combustible_pagados || 0) + (evento.gastos_combustible_pendientes || 0),
    },
    {
      tipo: 'materiales',
      label: 'Materiales',
      icono: '🛠️',
      color: 'from-blue-500 to-indigo-600',
      provision: evento.provision_materiales || 0,
      gastado: (evento.gastos_materiales_pagados || 0) + (evento.gastos_materiales_pendientes || 0),
    },
    {
      tipo: 'recursos_humanos',
      label: 'Recursos Humanos',
      icono: '👥',
      color: 'from-purple-500 to-pink-600',
      provision: evento.provision_recursos_humanos || 0,
      gastado: (evento.gastos_rh_pagados || 0) + (evento.gastos_rh_pendientes || 0),
    },
    {
      tipo: 'solicitudes_pago',
      label: 'Solicitudes de Pago',
      icono: '💳',
      color: 'from-teal-500 to-cyan-600',
      provision: evento.provision_solicitudes_pago || 0,
      gastado: (evento.gastos_sps_pagados || 0) + (evento.gastos_sps_pendientes || 0),
    },
  ];

  const handleEditProvision = async (tipo: string, nuevoValor: number) => {
    try {
      const { error } = await supabase
        .from('evt_eventos')
        .update({ [`provision_${tipo}`]: nuevoValor })
        .eq('id', evento.id);

      if (error) throw error;

      toast.success('Provisión actualizada correctamente');
      setEditingProvision(null);
      setEditValue('');
      // Invalidar query para actualizar fichas inmediatamente
      queryClient.invalidateQueries({ queryKey: ['evento', eventoId] });
      onRefresh();
    } catch (error: any) {
      toast.error(`Error al actualizar provisión: ${error.message}`);
    }
  };

  const startEditing = (tipo: string, currentValue: number) => {
    setEditingProvision(tipo);
    setEditValue(currentValue.toString());
  };

  const cancelEditing = () => {
    setEditingProvision(null);
    setEditValue('');
  };

  const saveEditing = (tipo: string) => {
    const numValue = parseFloat(editValue) || 0;
    handleEditProvision(tipo, numValue);
  };

  const handleAjusteAutomatico = async () => {
    try {
      const updates: Record<string, number> = {};

      provisiones.forEach((prov) => {
        const nuevoValor = prov.gastado * (1 + margenPorcentaje / 100);
        updates[`provision_${prov.tipo}`] = nuevoValor;
      });

      const { error } = await supabase
        .from('evt_eventos')
        .update(updates)
        .eq('id', evento.id);

      if (error) throw error;

      toast.success(`Provisiones ajustadas con margen del ${margenPorcentaje}%`);
      setShowAjusteModal(false);
      // Invalidar query para actualizar fichas inmediatamente
      queryClient.invalidateQueries({ queryKey: ['evento', eventoId] });
      onRefresh();
    } catch (error: any) {
      toast.error(`Error al ajustar provisiones: ${error.message}`);
    }
  };

  const handleAjustarEnCero = async () => {
    try {
      const updates: Record<string, number> = {};
      provisiones.forEach((prov) => {
        updates[`provision_${prov.tipo}`] = prov.gastado;
      });

      const { error } = await supabase
        .from('evt_eventos')
        .update(updates)
        .eq('id', evento.id);

      if (error) throw error;

      toast.success('Provisiones ajustadas a gastos reales (margen 0%)');
      setShowAjusteModal(false);
      // Invalidar query para actualizar fichas inmediatamente
      queryClient.invalidateQueries({ queryKey: ['evento', eventoId] });
      onRefresh();
    } catch (error: any) {
      toast.error(`Error al ajustar provisiones: ${error.message}`);
    }
  };

  const totalProvision = provisiones.reduce((sum, p) => sum + p.provision, 0);
  const totalGastado = provisiones.reduce((sum, p) => sum + p.gastado, 0);
  const totalDisponible = totalProvision - totalGastado;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6"
    >
      {/* RESUMEN FINANCIERO COMPACTO - 3 FICHAS CLICKEABLES + BOTÓN AJUSTE */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {/* PROVISIONADO - Clickeable completa */}
        <button
          onClick={() => setExpandedKPI(!expandedKPI)}
          className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Provisionado</div>
            <div className="text-[10px] text-blue-600 font-semibold">100%</div>
          </div>
          <div className="text-xl font-bold text-blue-900">{formatCurrency(totalProvision)}</div>
          {expandedKPI && (
            <div className="space-y-0.5 mt-1.5">
              {provisiones.map(p => (
                <div key={p.tipo} className="flex items-center gap-1.5 text-[10px] text-blue-600">
                  <span>{p.icono}</span>
                  <span className="font-semibold">{formatCurrency(p.provision)}</span>
                </div>
              ))}
            </div>
          )}
        </button>

        {/* GASTADO - Clickeable completa */}
        <button
          onClick={() => setExpandedKPI(!expandedKPI)}
          className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-300 rounded-lg p-3 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide">Gastado</div>
            <div className="text-[10px] text-slate-600 font-semibold">
              {totalProvision > 0 ? ((totalGastado / totalProvision) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(totalGastado)}</div>
          {expandedKPI && (
            <div className="space-y-0.5 mt-1.5">
              {provisiones.map(p => (
                <div key={p.tipo} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                  <span>{p.icono}</span>
                  <span className="font-semibold">{formatCurrency(p.gastado)}</span>
                </div>
              ))}
            </div>
          )}
        </button>

        {/* DISPONIBLE - Clickeable completa */}
        <button
          onClick={() => setExpandedKPI(!expandedKPI)}
          className={`bg-gradient-to-br rounded-lg p-3 border hover:shadow-md transition-all text-left ${
            totalDisponible >= 0 ? 'from-gray-50 to-gray-100 border-gray-300' : 'from-red-50 to-red-100 border-red-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className={`text-[10px] font-semibold uppercase tracking-wide ${
              totalDisponible >= 0 ? 'text-gray-700' : 'text-red-700'
            }`}>Disponible</div>
            <div className={`text-[10px] font-semibold ${totalDisponible >= 0 ? 'text-gray-600' : 'text-red-600'}`}>
              {totalProvision > 0 ? ((totalDisponible / totalProvision) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className={`text-xl font-bold ${totalDisponible >= 0 ? 'text-gray-900' : 'text-red-900'}`}>
            {formatCurrency(Math.max(0, totalDisponible))}
          </div>
          {expandedKPI && (
            <div className="space-y-0.5 mt-1.5">
              {provisiones.map(p => {
                const disponible = p.provision - p.gastado;
                return (
                  <div key={p.tipo} className={`flex items-center gap-1.5 text-[10px] ${disponible >= 0 ? 'text-gray-600' : 'text-red-600'}`}>
                    <span>{p.icono}</span>
                    <span className="font-semibold">{formatCurrency(Math.max(0, disponible))}</span>
                  </div>
                );
              })}
            </div>
          )}
        </button>

        {/* BOTÓN AJUSTE AUTOMÁTICO */}
        <button
          onClick={() => setShowAjusteModal(true)}
          className="bg-gradient-to-br from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 border border-slate-400 rounded-lg p-3 transition-all flex flex-col items-center justify-center gap-1.5 group shadow-sm"
        >
          <SettingsIcon className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[10px] font-semibold text-white uppercase tracking-wide text-center">Ajuste<br/>Automático</span>
        </button>
      </div>

      {/* GRID DE 2 COLUMNAS - FICHAS DE CATEGORÍAS */}
      <div className="grid grid-cols-2 gap-4">
        {provisiones.map((prov) => {
          const disponible = prov.provision - prov.gastado;
          const porcentajeGastado = prov.provision > 0 ? (prov.gastado / prov.provision) * 100 : 0;
          const isEditing = editingProvision === prov.tipo;

          return (
            <div key={prov.tipo} className="bg-white border-2 border-gray-200 rounded-xl p-4">
              {/* Header: Ícono + Nombre + Barra de progreso en el mismo renglón */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${prov.color} flex items-center justify-center text-xl flex-shrink-0`}>
                  {prov.icono}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-sm mb-1">{prov.label}</h4>
                  {/* Barra de progreso */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        porcentajeGastado > 100 ? 'bg-red-500' : porcentajeGastado > 80 ? 'bg-slate-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(porcentajeGastado, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500 flex-shrink-0">
                  {porcentajeGastado.toFixed(0)}%
                </div>
              </div>

              {/* Valores en grid 3 columnas */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase mb-1">Provisionado</div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))}
                      onBlur={() => saveEditing(prov.tipo)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditing(prov.tipo);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      className="w-full text-sm font-bold text-blue-900 border border-blue-500 rounded px-2 py-1 focus:ring-1 focus:ring-blue-400"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => startEditing(prov.tipo, prov.provision)}
                      className="group flex items-center gap-1 w-full"
                    >
                      <span className="font-bold text-gray-900 group-hover:text-blue-600 text-sm">
                        {formatCurrency(prov.provision)}
                      </span>
                      <Pencil className="w-3 h-3 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                    </button>
                  )}
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 uppercase mb-1">Gastado</div>
                  <div className="font-bold text-slate-700 text-sm">{formatCurrency(prov.gastado)}</div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 uppercase mb-1">Disponible</div>
                  <div className={`font-bold text-sm ${disponible >= 0 ? 'text-gray-700' : 'text-red-700'}`}>
                    {formatCurrency(Math.max(0, disponible))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Ajuste Automático - Compacto */}
      {showAjusteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full">
            {/* Header con botones de acción */}
            <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 px-4 py-3 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Ajustar Provisiones</h3>
                <div className="flex items-center gap-2">
                  {/* Botón Ajustar en Cero */}
                  <button
                    onClick={handleAjustarEnCero}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                    title="Ajustar en cero (0%)"
                  >
                    <span className="text-sm">🎯</span>
                    Cero
                  </button>
                  {/* Botón Aplicar Margen */}
                  <button
                    onClick={handleAjusteAutomatico}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                    title={`Aplicar margen ${margenPorcentaje}%`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Aplicar {margenPorcentaje}%
                  </button>
                  {/* Separador */}
                  <div className="w-px h-6 bg-gray-300"></div>
                  {/* Botón Cerrar */}
                  <button
                    onClick={() => setShowAjusteModal(false)}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5">
              {/* Grid de 2 columnas: Selector de margen y Vista previa */}
              <div className="grid grid-cols-2 gap-5">
                {/* COLUMNA 1: Selector de margen */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Margen de seguridad
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[5, 10, 15, 20].map((margin) => (
                      <button
                        key={margin}
                        onClick={() => setMargenPorcentaje(margin)}
                        className={`py-2.5 px-4 rounded-lg font-bold text-base transition-all ${
                          margenPorcentaje === margin
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {margin}%
                      </button>
                    ))}
                  </div>
                  <div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={margenPorcentaje}
                      onChange={(e) => setMargenPorcentaje(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Personalizado: <span className="font-bold text-blue-600 text-base">{margenPorcentaje}%</span>
                    </div>
                  </div>
                </div>

                {/* COLUMNA 2: Vista previa */}
                <div>
                  <label className="block text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">Vista Previa</label>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {provisiones.map((prov) => {
                      const nuevoValor = prov.gastado * (1 + margenPorcentaje / 100);
                      const cambio = nuevoValor - prov.provision;

                      return (
                        <div key={prov.tipo} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-2.5">
                          <span className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                            <span className="text-base">{prov.icono}</span>
                            <span className="text-xs">{prov.label}</span>
                          </span>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900 dark:text-white text-xs">
                              {formatCurrency(prov.provision)} → <span className="text-blue-600">{formatCurrency(nuevoValor)}</span>
                            </div>
                            <div className={`text-[10px] ${cambio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {cambio >= 0 ? '+' : ''}{formatCurrency(cambio)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const WorkflowTab: React.FC<{
  evento: any;
  onStateChanged: (newStateName?: string) => void;
}> = ({ evento, onStateChanged }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 md:p-6"
    >
      <StateAdvancementManager
        event={evento} // StateAdvancementManager ahora usa DocumentosEvento internamente
        onStateChanged={onStateChanged}
      />
    </motion.div>
  );
};
