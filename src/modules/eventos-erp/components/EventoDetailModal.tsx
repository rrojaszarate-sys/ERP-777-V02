import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Plus, Pencil, Trash2, Eye, X, Settings as SettingsIcon, XCircle, CheckCircle, Loader2, Wallet, FileText } from 'lucide-react';
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
import { useTheme } from '../../../shared/components/theme';

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

  // Estado para mostrar/ocultar IVA
  const [showIVA, setShowIVA] = useState(() => {
    const saved = localStorage.getItem('eventos_erp_show_iva');
    return saved ? JSON.parse(saved) : false;
  });
  
  const { canUpdate } = usePermissions();
  const { data: estados } = useEventStates();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { paletteConfig } = useTheme();

  // Colores dinámicos del tema
  const themeColors = {
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    accent: paletteConfig.accent,
    shades: paletteConfig.shades
  };

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

      // Cargar lista de usuarios activos para asignar si no hay responsable/solicitante
      const { data: usersActivos } = await supabase
        .from('users_erp')
        .select('id, nombre, apellidos, email')
        .eq('activo', true)
        .limit(10);

      if (eventoBase.responsable_id) {
        console.log('🔍 Buscando responsable con ID:', eventoBase.responsable_id);
        const { data, error } = await supabase
          .from('users_erp')
          .select('id, nombre, apellidos, email')
          .eq('id', eventoBase.responsable_id)
          .single();

        if (!error && data) {
          responsableData = data;
          console.log('✅ Responsable cargado:', data);
        } else {
          console.error('❌ Error cargando responsable:', error);
        }
      } else if (usersActivos && usersActivos.length > 0) {
        // Asignar un usuario al azar como responsable si no hay ninguno
        const randomIndex = Math.floor(Math.random() * usersActivos.length);
        responsableData = usersActivos[randomIndex];
        console.log('🎲 Responsable asignado al azar:', responsableData);
      }

      if (eventoBase.solicitante_id) {
        console.log('🔍 Buscando solicitante con ID:', eventoBase.solicitante_id);
        const { data, error } = await supabase
          .from('users_erp')
          .select('id, nombre, apellidos, email')
          .eq('id', eventoBase.solicitante_id)
          .single();

        if (!error && data) {
          solicitanteData = data;
          console.log('✅ Solicitante cargado:', data);
        } else {
          console.error('❌ Error cargando solicitante:', error);
        }
      } else if (usersActivos && usersActivos.length > 0) {
        // Asignar un usuario al azar como solicitante si no hay ninguno
        const randomIndex = Math.floor(Math.random() * usersActivos.length);
        solicitanteData = usersActivos[randomIndex];
        console.log('🎲 Solicitante asignado al azar:', solicitanteData);
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

  // Toggle IVA y guardar preferencia
  const toggleIVA = () => {
    const newValue = !showIVA;
    setShowIVA(newValue);
    localStorage.setItem('eventos_erp_show_iva', JSON.stringify(newValue));
  };

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

  // ============================================================================
  // CÁLCULOS FINANCIEROS - FÓRMULA DEL CLIENTE
  // ============================================================================
  // UTILIDAD = INGRESOS - GASTOS - PROVISIONES_DISPONIBLES
  // PROVISIONES_DISPONIBLES = MAX(0, PROVISIONES - GASTOS)

  // Provisiones totales
  const provisionesTotal = (evento.provision_combustible_peaje || 0) +
                           (evento.provision_materiales || 0) +
                           (evento.provision_recursos_humanos || 0) +
                           (evento.provision_solicitudes_pago || 0);

  // Ingresos totales (cobrados + pendientes)
  const ingresosTotales = evento.ingresos_totales ||
                          ((evento.ingresos_cobrados || 0) + (evento.ingresos_pendientes || 0));

  // Gastos totales (pagados + pendientes)
  const gastosTotales = (evento.gastos_pagados_total || 0) + (evento.gastos_pendientes_total || 0);

  // FÓRMULA DEL CLIENTE: Provisiones disponibles nunca negativas
  const provisionesDisponibles = Math.max(0, provisionesTotal - gastosTotales);

  // FÓRMULA DEL CLIENTE: Utilidad = Ingresos - Gastos - Provisiones Disponibles
  const utilidadReal = ingresosTotales - gastosTotales - provisionesDisponibles;

  // Margen de utilidad
  const margenUtilidad = ingresosTotales > 0 ? (utilidadReal / ingresosTotales) * 100 : 0;

  // Cálculos de IVA (16%)
  const IVA_RATE = 0.16;
  const ivaIngresos = ingresosTotales * IVA_RATE;
  const ivaGastos = gastosTotales * IVA_RATE;
  const ivaPorEjercer = provisionesDisponibles * IVA_RATE;

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: Eye },
    { id: 'ingresos', label: 'Ingresos', icon: TrendingUp },
    { id: 'gastos', label: 'Gastos', icon: TrendingDown },
    { id: 'provisiones', label: 'Provisionado', icon: Wallet },
    { id: 'workflow', label: 'Workflow', icon: SettingsIcon }
  ];

  return (
    <>
    <Modal
      isOpen={true}
      onClose={onClose}
      size="80"
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-green-600 uppercase">
                  💰 Resumen Financiero
                </h3>
                {/* Toggle IVA */}
                <button
                  onClick={toggleIVA}
                  className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                    showIVA
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-500 border border-gray-300 hover:bg-gray-200'
                  }`}
                  title={showIVA ? 'Ocultar IVA' : 'Mostrar IVA'}
                >
                  <span>{showIVA ? '✓' : '○'}</span>
                  <span>IVA 16%</span>
                </button>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ingresos:</span>
                  <div className="text-right">
                    <span className="font-bold text-green-700">{formatCurrency(ingresosTotales)}</span>
                    {showIVA && <span className="text-gray-400 text-[10px] ml-1">(+IVA {formatCurrency(ivaIngresos)})</span>}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gastos:</span>
                  <div className="text-right">
                    <span className="font-bold text-red-700">{formatCurrency(gastosTotales)}</span>
                    {showIVA && <span className="text-gray-400 text-[10px] ml-1">(+IVA {formatCurrency(ivaGastos)})</span>}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Provisión:</span>
                  <div className="text-right">
                    <span className={`font-bold ${provisionesDisponibles > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {formatCurrency(provisionesDisponibles)}
                    </span>
                    {showIVA && provisionesDisponibles > 0 && <span className="text-gray-400 text-[10px] ml-1">(+IVA {formatCurrency(ivaPorEjercer)})</span>}
                  </div>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-300">
                  <span className="text-gray-900 font-semibold">Utilidad ({margenUtilidad.toFixed(1)}%):</span>
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
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                  activeTab === tab.id
                    ? ''
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={activeTab === tab.id ? {
                  borderBottomColor: themeColors.primary,
                  color: themeColors.secondary
                } : undefined}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
                {tab.id === 'archivos' && eventDocuments.length > 0 && (
                  <span
                    className="ml-2 text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${themeColors.primary}20`,
                      color: themeColors.secondary
                    }}
                  >
                    {eventDocuments.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Altura fija para contenido de tabs - evita que el modal cambie de tamaño */}
        <div className="flex-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <OverviewTab evento={evento} showIVA={showIVA} />
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

const OverviewTab: React.FC<{ evento: any; showIVA?: boolean }> = ({ evento, showIVA = false }) => {
  // ============================================================================
  // CÁLCULOS FINANCIEROS - FÓRMULA DEL CLIENTE
  // ============================================================================
  // UTILIDAD = INGRESOS - GASTOS - PROVISIONES_DISPONIBLES
  // PROVISIONES_DISPONIBLES = MAX(0, PROVISIONES - GASTOS)

  // Provisiones totales
  const provisionesTotal = (evento.provision_combustible_peaje || 0) +
                           (evento.provision_materiales || 0) +
                           (evento.provision_recursos_humanos || 0) +
                           (evento.provision_solicitudes_pago || 0);

  // Estimados (para comparativas)
  const ingresoEstimado = evento.ganancia_estimada || evento.ingreso_estimado || 0;

  // Ingresos reales (totales = cobrados + pendientes)
  const ingresosTotales = evento.ingresos_totales ||
                          ((evento.ingresos_cobrados || 0) + (evento.ingresos_pendientes || 0));

  // Gastos reales (totales = pagados + pendientes)
  const gastosTotales = (evento.gastos_pagados_total || 0) + (evento.gastos_pendientes_total || 0);

  // FÓRMULA DEL CLIENTE: Provisiones disponibles = MAX(0, Provisiones - Gastos)
  const provisionesDisponibles = Math.max(0, provisionesTotal - gastosTotales);

  // FÓRMULA DEL CLIENTE: Utilidad = Ingresos - Gastos - Provisiones Disponibles
  const utilidadReal = ingresosTotales - gastosTotales - provisionesDisponibles;

  // Margen de utilidad
  const margenRealPct = ingresosTotales > 0 ? (utilidadReal / ingresosTotales) * 100 : 0;

  // Cálculos de IVA (16%)
  const IVA_RATE = 0.16;
  const ivaIngresos = ingresosTotales * IVA_RATE;
  const ivaGastos = gastosTotales * IVA_RATE;

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

        {/* GRÁFICA COMPARATIVA - CONCEPTOS DEL CLIENTE */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">📊 Presupuesto vs Ejercido</h4>
          <div className="space-y-4">
            {/* Ingresos Bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-green-700">💰 INGRESOS</span>
                <div className="flex gap-4 text-xs">
                  <span className="text-gray-500">Presupuesto: {formatCurrency(ingresoEstimado)}</span>
                  <span className="text-green-700 font-bold">Facturado: {formatCurrency(ingresosTotales)}</span>
                </div>
              </div>
              <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                {/* Fondo: Presupuesto */}
                <div className="absolute inset-0 flex items-center justify-end px-3">
                  <span className="text-xs font-medium text-gray-400">
                    Ppto: {formatCurrency(ingresoEstimado)}
                  </span>
                </div>
                {/* Barra: Facturado - SIEMPRE AZUL */}
                <div
                  className="absolute h-full bg-blue-600 transition-all duration-500 flex items-center"
                  style={{ width: `${Math.min((ingresosTotales / Math.max(ingresoEstimado, ingresosTotales, 1)) * 100, 100)}%` }}
                >
                  <span className="text-xs font-bold text-white px-3 whitespace-nowrap">
                    Facturado: {formatCurrency(ingresosTotales)}
                  </span>
                </div>
                {/* Porcentaje centrado */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {ingresoEstimado > 0 ? ((ingresosTotales / ingresoEstimado) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Gastos Bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-red-700">📉 GASTOS</span>
                <div className="flex gap-4 text-xs">
                  <span className="text-gray-500">Provisionado: {formatCurrency(provisionesTotal)}</span>
                  <span className="text-red-700 font-bold">Ejercido: {formatCurrency(gastosTotales)}</span>
                </div>
              </div>
              <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                {/* Fondo: Provisionado */}
                <div className="absolute inset-0 flex items-center justify-end px-3">
                  <span className="text-xs font-medium text-gray-400">
                    Prov: {formatCurrency(provisionesTotal)}
                  </span>
                </div>
                {/* Barra: Ejercido - SIEMPRE AZUL */}
                <div
                  className="absolute h-full bg-blue-600 transition-all duration-500 flex items-center"
                  style={{ width: `${Math.min((gastosTotales / Math.max(provisionesTotal, gastosTotales, 1)) * 100, 100)}%` }}
                >
                  <span className="text-xs font-bold text-white px-3 whitespace-nowrap">
                    Ejercido: {formatCurrency(gastosTotales)}
                  </span>
                </div>
                {/* Porcentaje e indicador */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {provisionesTotal > 0 ? ((gastosTotales / provisionesTotal) * 100).toFixed(0) : 0}%
                    {gastosTotales > provisionesTotal && ' ⚠️'}
                  </span>
                </div>
              </div>
            </div>

            {/* Provisión Bar - INVERTIDA: Provisión izquierda (verde billete), Gastado derecha */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-emerald-700">💼 PROVISIÓN vs GASTADO</span>
                <div className="flex gap-4 text-xs">
                  <span className="text-emerald-600 font-bold">Provisión: {formatCurrency(provisionesDisponibles)}</span>
                  <span className="text-slate-600">Gastado: {formatCurrency(gastosTotales)}</span>
                </div>
              </div>
              <div className="relative h-10 bg-slate-200 rounded-lg overflow-hidden flex">
                {/* Barra izquierda: Provisión restante - COLOR BILLETE (verde esmeralda oscuro) */}
                <div
                  className="h-full bg-emerald-600 transition-all duration-500 flex items-center justify-start"
                  style={{ width: `${provisionesTotal > 0 ? Math.min((provisionesDisponibles / provisionesTotal) * 100, 100) : 0}%` }}
                >
                  {provisionesDisponibles > 0 && (
                    <span className="text-xs font-bold text-white px-2 whitespace-nowrap">
                      {formatCurrency(provisionesDisponibles)}
                    </span>
                  )}
                </div>
                {/* Barra derecha: Gastado - COLOR GRIS/SLATE */}
                <div
                  className="h-full bg-slate-500 transition-all duration-500 flex items-center justify-end"
                  style={{ width: `${provisionesTotal > 0 ? Math.min((gastosTotales / provisionesTotal) * 100, 100) : 0}%` }}
                >
                  {gastosTotales > 0 && (
                    <span className="text-xs font-bold text-white px-2 whitespace-nowrap">
                      {formatCurrency(gastosTotales)}
                    </span>
                  )}
                </div>
                {/* Porcentaje centrado */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold text-white drop-shadow-md bg-black/30 px-2 py-0.5 rounded">
                    {provisionesTotal > 0 ? ((provisionesDisponibles / provisionesTotal) * 100).toFixed(0) : 0}% disponible
                  </span>
                </div>
              </div>
            </div>

            {/* Utilidad Bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-blue-900">🎯 UTILIDAD</span>
                <div className="flex gap-4 text-xs">
                  <span className="text-gray-500">Margen: {margenRealPct.toFixed(1)}%</span>
                  <span className={`font-bold ${utilidadReal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(utilidadReal)}
                  </span>
                </div>
              </div>
              <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                {/* Barra: Utilidad - COLOR SEGÚN MARGEN */}
                <div
                  className={`absolute h-full transition-all duration-500 flex items-center ${
                    margenRealPct >= 35 ? 'bg-green-600' :
                    margenRealPct >= 25 ? 'bg-amber-500' :
                    margenRealPct > 0 ? 'bg-red-500' : 'bg-gray-400'
                  }`}
                  style={{ width: `${Math.min(Math.max(margenRealPct, 0), 100)}%` }}
                >
                  <span className="text-xs font-bold text-white px-3 whitespace-nowrap">
                    {formatCurrency(utilidadReal)}
                  </span>
                </div>
                {/* Indicadores de semáforo */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {margenRealPct >= 35 ? '🟢' : margenRealPct >= 25 ? '🟡' : margenRealPct > 0 ? '🔴' : '⚫'} {margenRealPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Leyenda simplificada */}
            <div className="flex justify-center gap-6 pt-2 text-xs border-t mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-600" />
                <span>Ejercido/Real</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-600" />
                <span>Provisión</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-600" />
                <span>≥35% Excelente</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span>25-34% Regular</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>&lt;25% Bajo</span>
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
              {showIVA && (
                <div className="text-[10px] text-gray-400 mb-1">
                  +IVA: {formatCurrency(ivaIngresos)}
                </div>
              )}
              <div className="text-xs text-gray-500 border-t pt-2 space-y-1">
                <div className="text-blue-600">Cobr: {formatCurrency(evento.ingresos_cobrados || 0)}</div>
                <div className="text-slate-600">Pend: {formatCurrency(evento.ingresos_pendientes || 0)}</div>
                <div className="text-gray-400">Ppto: {formatCurrency(ingresoEstimado)}</div>
              </div>
            </div>

            {/* GASTOS - Replicando formato del listado */}
            <div className="border-r pr-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Gastos</h4>
              <div className="font-bold text-red-900 text-2xl mb-2">
                {formatCurrency(gastosTotales)}
              </div>
              {showIVA && (
                <div className="text-[10px] text-gray-400 mb-1">
                  +IVA: {formatCurrency(ivaGastos)}
                </div>
              )}
              <div className="text-xs text-gray-500 border-t pt-2 space-y-1">
                <div>⛽ {formatCurrency((evento.gastos_combustible_pagados || 0) + (evento.gastos_combustible_pendientes || 0))}</div>
                <div>🛠️ {formatCurrency((evento.gastos_materiales_pagados || 0) + (evento.gastos_materiales_pendientes || 0))}</div>
                <div>👥 {formatCurrency((evento.gastos_rh_pagados || 0) + (evento.gastos_rh_pendientes || 0))}</div>
                <div>💳 {formatCurrency((evento.gastos_sps_pagados || 0) + (evento.gastos_sps_pendientes || 0))}</div>
              </div>
            </div>

            {/* PROVISIÓN - Fórmula del cliente: MAX(0, Provisionado - Gastos) */}
            <div className="border-r pr-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Provisión</h4>
              <div className={`font-bold text-2xl mb-2 ${provisionesDisponibles > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                {formatCurrency(provisionesDisponibles)}
              </div>
              <div className="text-xs text-gray-500 border-t pt-2 space-y-1">
                <div className={(evento.provision_combustible_peaje || 0) - ((evento.gastos_combustible_pagados || 0) + (evento.gastos_combustible_pendientes || 0)) > 0 ? 'text-amber-600' : 'text-gray-400'}>
                  ⛽ {formatCurrency(Math.max(0, (evento.provision_combustible_peaje || 0) - ((evento.gastos_combustible_pagados || 0) + (evento.gastos_combustible_pendientes || 0))))}
                </div>
                <div className={(evento.provision_materiales || 0) - ((evento.gastos_materiales_pagados || 0) + (evento.gastos_materiales_pendientes || 0)) > 0 ? 'text-amber-600' : 'text-gray-400'}>
                  🛠️ {formatCurrency(Math.max(0, (evento.provision_materiales || 0) - ((evento.gastos_materiales_pagados || 0) + (evento.gastos_materiales_pendientes || 0))))}
                </div>
                <div className={(evento.provision_recursos_humanos || 0) - ((evento.gastos_rh_pagados || 0) + (evento.gastos_rh_pendientes || 0)) > 0 ? 'text-amber-600' : 'text-gray-400'}>
                  👥 {formatCurrency(Math.max(0, (evento.provision_recursos_humanos || 0) - ((evento.gastos_rh_pagados || 0) + (evento.gastos_rh_pendientes || 0))))}
                </div>
                <div className={(evento.provision_solicitudes_pago || 0) - ((evento.gastos_sps_pagados || 0) + (evento.gastos_sps_pendientes || 0)) > 0 ? 'text-amber-600' : 'text-gray-400'}>
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
            <div key={ingreso.id} className="bg-white border rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                  <div className="col-span-2 md:col-span-1">
                    <h4 className="font-medium text-gray-900 text-base truncate">{ingreso.concepto}</h4>
                  </div>
                  <div>
                    <span className="text-base font-bold text-green-600">{formatCurrency(ingreso.total)}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(ingreso.created_at)}
                  </div>
                  <div className="col-span-2 md:col-span-4 text-sm text-gray-400 truncate">
                    {ingreso.descripcion && <span className="mr-3">📝 {ingreso.descripcion}</span>}
                    {ingreso.referencia && <span>🏷️ {ingreso.referencia}</span>}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {canUpdate('ingresos') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditIngreso(ingreso); }}
                      className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors border border-blue-200"
                      title="Editar ingreso"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete('ingresos') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(ingreso); }}
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-colors border border-red-200"
                      title="Eliminar ingreso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
      {/* RESUMEN DE GASTOS - 3 FICHAS + BOTÓN AGREGAR */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {/* FICHA 1: Provisionado - Clickeable completa */}
        <button
          onClick={() => setIsDesgloseExpanded(!isDesgloseExpanded)}
          className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3 border border-emerald-300 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wide">Provisionado</div>
            <div className="text-[10px] text-emerald-600 font-semibold">100%</div>
          </div>
          <div className="text-xl font-bold text-emerald-800">{formatCurrency(totalProvisionado)}</div>
          {isDesgloseExpanded && (
            <div className="text-[10px] text-emerald-600 mt-1.5 space-y-0.5">
              <div>⛽ {formatCurrency(evento.provision_combustible_peaje || 0)}</div>
              <div>🛠️ {formatCurrency(evento.provision_materiales || 0)}</div>
              <div>👥 {formatCurrency(evento.provision_recursos_humanos || 0)}</div>
              <div>💳 {formatCurrency(evento.provision_solicitudes_pago || 0)}</div>
            </div>
          )}
        </button>

        {/* FICHA 2: Gastado + Pagados + Por Pagar - Todo junto con líneas verticales */}
        <button
          onClick={() => setIsDesgloseExpanded(!isDesgloseExpanded)}
          className="col-span-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all text-left flex"
        >
          {/* Gastado - Lado izquierdo */}
          <div className="flex-1 pr-3">
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <div className="text-[10px] text-slate-700 font-semibold uppercase tracking-wide">Gastado</div>
              <div className="text-[10px] text-slate-600 font-semibold">
                {totalProvisionado > 0 ? ((totalGastos / totalProvisionado) * 100).toFixed(0) : 0}%
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900">{formatCurrency(totalGastos)}</div>
            {isDesgloseExpanded && (
              <div className="text-[9px] text-slate-600 mt-1 space-y-0.5">
                <div>⛽ {formatCurrency(gastosCombustible)}</div>
                <div>🛠️ {formatCurrency(gastosMateriales)}</div>
                <div>👥 {formatCurrency(gastosRH)}</div>
                <div>💳 {formatCurrency(gastosSPS)}</div>
              </div>
            )}
          </div>

          {/* Divisor vertical */}
          <div className="w-px bg-slate-300 my-1"></div>

          {/* Pagados - Centro */}
          <div className="flex-1 px-3">
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
          <div className="flex-1 pl-3">
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <div className="text-[10px] text-orange-700 font-semibold uppercase tracking-wide">Por Pagar</div>
              <div className="text-[10px] text-orange-600 font-semibold">
                {totalGastos > 0 ? ((totalPendiente / totalGastos) * 100).toFixed(0) : 0}%
              </div>
            </div>
            <div className="text-lg font-bold text-orange-900">{formatCurrency(totalPendiente)}</div>
            {isDesgloseExpanded && (
              <div className="text-[9px] text-orange-600 mt-1 space-y-0.5">
                <div>⛽ {formatCurrency(evento.gastos_combustible_pendientes || 0)}</div>
                <div>🛠️ {formatCurrency(evento.gastos_materiales_pendientes || 0)}</div>
                <div>👥 {formatCurrency(evento.gastos_rh_pendientes || 0)}</div>
                <div>💳 {formatCurrency(evento.gastos_sps_pendientes || 0)}</div>
              </div>
            )}
          </div>
        </button>

        {/* FICHA 4: Provisión (antes Por Ejercer) - Clickeable completa */}
        <button
          onClick={() => setIsDesgloseExpanded(!isDesgloseExpanded)}
          className={`rounded-lg p-3 border text-left hover:shadow-md transition-all ${
            totalDisponible >= 0
              ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300'
              : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className={`text-[10px] font-semibold uppercase tracking-wide ${totalDisponible >= 0 ? 'text-amber-700' : 'text-red-700'}`}>
              Provisión
            </div>
            <div className={`text-[10px] font-semibold ${totalDisponible >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
              {totalProvisionado > 0 ? ((totalDisponible / totalProvisionado) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className={`text-xl font-bold ${totalDisponible >= 0 ? 'text-amber-900' : 'text-red-900'}`}>
            {formatCurrency(Math.max(0, totalDisponible))}
          </div>
          {isDesgloseExpanded && (
            <div className={`text-[10px] mt-1.5 space-y-0.5 ${totalDisponible >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
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
            <div key={gasto.id} className="bg-white border rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-5 gap-x-3 gap-y-1 items-center">
                  <div className="col-span-2 md:col-span-1 flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 text-base truncate">{gasto.concepto}</h4>
                  </div>
                  <div>
                    <span className="text-base font-bold text-red-600">{formatCurrency(gasto.total)}</span>
                  </div>
                  <div>
                    {gasto.categoria && (
                      <Badge
                        variant="default"
                        className="text-xs py-0.5"
                        style={{ backgroundColor: gasto.categoria.color + '20', color: gasto.categoria.color }}
                      >
                        {gasto.categoria.nombre}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(gasto.fecha_gasto)}
                  </div>
                  <div className="col-span-2 md:col-span-5 text-sm text-gray-400 truncate">
                    {gasto.proveedor && <span className="mr-3">🏢 {gasto.proveedor}</span>}
                    {gasto.descripcion && <span className="mr-3">📝 {gasto.descripcion}</span>}
                    {gasto.referencia && <span>🏷️ {gasto.referencia}</span>}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {canUpdate('gastos') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditGasto(gasto); }}
                      className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors border border-blue-200"
                      title="Editar gasto"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete('gastos') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(gasto); }}
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-colors border border-red-200"
                      title="Eliminar gasto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

        {/* PROVISIÓN - Clickeable completa */}
        <button
          onClick={() => setExpandedKPI(!expandedKPI)}
          className={`bg-gradient-to-br rounded-lg p-3 border hover:shadow-md transition-all text-left ${
            totalDisponible >= 0 ? 'from-amber-50 to-amber-100 border-amber-300' : 'from-red-50 to-red-100 border-red-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className={`text-[10px] font-semibold uppercase tracking-wide ${
              totalDisponible >= 0 ? 'text-amber-700' : 'text-red-700'
            }`}>Provisión</div>
            <div className={`text-[10px] font-semibold ${totalDisponible >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
              {totalProvision > 0 ? ((totalDisponible / totalProvision) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className={`text-xl font-bold ${totalDisponible >= 0 ? 'text-amber-900' : 'text-red-900'}`}>
            {formatCurrency(Math.max(0, totalDisponible))}
          </div>
          {expandedKPI && (
            <div className="space-y-0.5 mt-1.5">
              {provisiones.map(p => {
                const porEjercer = p.provision - p.gastado;
                return (
                  <div key={p.tipo} className={`flex items-center gap-1.5 text-[10px] ${porEjercer >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                    <span>{p.icono}</span>
                    <span className="font-semibold">{formatCurrency(Math.max(0, porEjercer))}</span>
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
          const porEjercer = prov.provision - prov.gastado;
          const porcentajeGastado = prov.provision > 0 ? (prov.gastado / prov.provision) * 100 : 0;
          const porcentajeDisponible = 100 - porcentajeGastado;
          const isEditing = editingProvision === prov.tipo;

          return (
            <div key={prov.tipo} className="bg-white border-2 border-gray-200 rounded-xl p-4">
              {/* Header: Ícono + Nombre + Provisionado editable a la derecha */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${prov.color} flex items-center justify-center text-xl flex-shrink-0`}>
                    {prov.icono}
                  </div>
                  <h4 className="font-bold text-gray-900 text-base">{prov.label}</h4>
                </div>
                {/* Provisionado editable en esquina superior derecha - VACÍO (se muestra abajo) */}
              </div>

              {/* Barra de progreso - Verde para provisión disponible, Gris para gastado */}
              <div className="relative h-8 bg-emerald-100 rounded-lg overflow-hidden mb-3">
                {/* Barra: Gastado (gris) - de izquierda a derecha */}
                <div
                  className="absolute h-full bg-slate-400 transition-all duration-500 flex items-center justify-start"
                  style={{ width: `${Math.min(porcentajeGastado, 100)}%` }}
                >
                  <span className="text-xs font-bold text-white px-2 whitespace-nowrap">
                    Gastado: {formatCurrency(prov.gastado)}
                  </span>
                </div>
                {/* Etiqueta Provisión disponible (verde) - en la parte derecha */}
                <div
                  className="absolute h-full flex items-center justify-end right-0"
                  style={{ width: `${Math.max(0, porcentajeDisponible)}%` }}
                >
                  {porcentajeDisponible > 15 && (
                    <span className="text-xs font-bold text-emerald-700 px-2 whitespace-nowrap">
                      {formatCurrency(Math.max(0, porEjercer))}
                    </span>
                  )}
                </div>
                {/* Porcentaje centrado */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold drop-shadow-sm ${porcentajeGastado > 50 ? 'text-white' : 'text-emerald-800'}`}>
                    {porcentajeGastado.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Valores en grid 2 columnas: Provisionado editable (izq) y Provisión restante (der) */}
              <div className="flex justify-between items-end">
                {/* PROVISIONADO - Esquina inferior izquierda con lápiz */}
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] text-gray-500 uppercase font-medium">Provisionado</span>
                    <button
                      onClick={() => startEditing(prov.tipo, prov.provision)}
                      className="p-0.5 rounded hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition-colors"
                      title="Editar provisión"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                      className="w-32 text-base font-bold text-blue-900 border border-blue-500 rounded px-2 py-1 focus:ring-1 focus:ring-blue-400"
                      autoFocus
                    />
                  ) : (
                    <div className="font-bold text-blue-900 text-lg">
                      {formatCurrency(prov.provision)}
                    </div>
                  )}
                </div>

                {/* PROVISIÓN - Esquina inferior derecha */}
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase font-medium mb-0.5">Provisión</div>
                  <div className={`font-bold text-lg ${porEjercer >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.max(0, porEjercer))}
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
