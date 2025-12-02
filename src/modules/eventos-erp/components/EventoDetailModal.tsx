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
import { SimpleExpenseForm } from './finances/SimpleExpenseForm';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'ingresos' | 'gastos' | 'provisiones' | 'workflow'>('overview');
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [provisiones, setProvisiones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventDocuments, setEventDocuments] = useState<any[]>([]);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  // Estados para el modal de gastos
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState<any | null>(null);
  const [defaultGastoCategory, setDefaultGastoCategory] = useState<string | undefined>(undefined);

  // Estados para el modal de ingresos
  const [showIngresoModal, setShowIngresoModal] = useState(false);
  const [editingIngreso, setEditingIngreso] = useState<any | null>(null);

  // Estados para el modal de provisiones
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [editingProvision, setEditingProvision] = useState<any | null>(null);

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
      // IMPORTANTE: Cargar desde eventos_erp para tener TODOS los campos
      const { data: eventoBase, error: eventoError } = await supabase
        .from('evt_eventos_erp')
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
          .from('evt_clientes_erp')
          .select('id, razon_social, nombre_comercial')
          .eq('id', eventoBase.cliente_id)
          .single();
        clienteData = data;
      }

      // Cargar lista de usuarios activos para asignar si no hay responsable/solicitante
      const { data: usersActivos } = await supabase
        .from('core_users')
        .select('id, nombre, apellidos, email')
        .eq('activo', true)
        .limit(10);

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
      } else if (usersActivos && usersActivos.length > 0) {
        // Asignar un usuario al azar como responsable si no hay ninguno
        const randomIndex = Math.floor(Math.random() * usersActivos.length);
        responsableData = usersActivos[randomIndex];
        console.log('🎲 Responsable asignado al azar:', responsableData);
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
      } else if (usersActivos && usersActivos.length > 0) {
        // Asignar un usuario al azar como solicitante si no hay ninguno
        const randomIndex = Math.floor(Math.random() * usersActivos.length);
        solicitanteData = usersActivos[randomIndex];
        console.log('🎲 Solicitante asignado al azar:', solicitanteData);
      }

      // Cargar datos financieros desde la vista (IGUAL QUE EN EL LISTADO)
      console.log('🔍 Cargando datos financieros para evento:', eventoId);
      const { data: eventoFinanciero, error: financieroError } = await supabase
        .from('vw_eventos_analisis_financiero_erp')
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
        .from('evt_ingresos_erp')
        .select('*')
        .eq('evento_id', evento.id)
        .order('fecha_creacion', { ascending: false });

      if (ingresosError) throw ingresosError;
      setIngresos(ingresosData || []);

      const { data: gastosData, error: gastosError } = await supabase
        .from('evt_gastos_erp')
        .select(`
          *,
          categoria:evt_categorias_gastos_erp(nombre, color)
        `)
        .eq('evento_id', evento.id)
        .is('deleted_at', null)
        .order('fecha_creacion', { ascending: false });

      if (gastosError) throw gastosError;
      setGastos(gastosData || []);

      // Cargar provisiones desde evt_provisiones
      const { data: provisionesData, error: provisionesError } = await supabase
        .from('evt_provisiones_erp')
        .select(`
          *,
          categoria:cat_categorias_gasto(id, nombre, clave, color),
          proveedor:cat_proveedores(id, razon_social, rfc),
          forma_pago:cat_formas_pago(id, nombre)
        `)
        .eq('evento_id', evento.id)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (provisionesError) {
        console.warn('Error loading provisiones (tabla puede no existir):', provisionesError);
        setProvisiones([]);
      } else {
        setProvisiones(provisionesData || []);
      }
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
  // CÁLCULOS FINANCIEROS - FÓRMULA CORRECTA
  // ============================================================================
  // PROVISIONES = Gastos pendientes de pago (compromisos futuros)
  // TOTAL EGRESOS = Gastos + Provisiones
  // UTILIDAD = Ingresos - Total Egresos
  // MARGEN = (Utilidad / Ingresos) × 100

  // Usar campos directamente de la vista vw_eventos_analisis_financiero_erp
  const provisionesTotal = evento.provisiones_total || 0;
  const ingresosTotales = evento.ingresos_totales || 0;
  const gastosTotales = evento.gastos_totales || 0;

  // Subtotales (sin IVA ni retenciones) - para utilidad bruta
  const ingresosSubtotal = evento.ingresos_subtotal || (ingresosTotales / 1.16);
  const gastosSubtotal = evento.gastos_subtotal || (gastosTotales / 1.16);
  const provisionesSubtotal = evento.provisiones_subtotal || (provisionesTotal / 1.16);

  // Total Egresos = Gastos + Provisiones (provisiones son gastos antes de pagarse)
  const totalEgresos = gastosTotales + provisionesTotal;

  // Utilidad Real = Ingresos - Total Egresos (con IVA)
  const utilidadReal = evento.utilidad_real ?? (ingresosTotales - totalEgresos);

  // Utilidad Bruta = Subtotales (sin IVA ni retenciones) - para análisis financiero
  const utilidadBruta = evento.utilidad_bruta ?? (ingresosSubtotal - gastosSubtotal - provisionesSubtotal);

  // Margen de utilidad (con IVA)
  const margenUtilidad = evento.margen_real_pct ?? (ingresosTotales > 0 ? (utilidadReal / ingresosTotales) * 100 : 0);

  // Margen bruto (sin IVA - para análisis financiero)
  const margenBruto = evento.margen_bruto_pct ?? (ingresosSubtotal > 0 ? (utilidadBruta / ingresosSubtotal) * 100 : 0);

  // Cálculos de IVA (16%)
  const IVA_RATE = 0.16;
  const ivaIngresos = evento.ingresos_iva || (ingresosTotales - ingresosSubtotal);
  const ivaGastos = evento.gastos_iva || (gastosTotales - gastosSubtotal);
  const ivaProvisiones = evento.provisiones_iva || (provisionesTotal - provisionesSubtotal);

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
                  <span className="text-gray-600">Provisiones:</span>
                  <div className="text-right">
                    <span className={`font-bold ${provisionesTotal > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {formatCurrency(provisionesTotal)}
                    </span>
                    {showIVA && provisionesTotal > 0 && <span className="text-gray-400 text-[10px] ml-1">(+IVA {formatCurrency(ivaProvisiones)})</span>}
                  </div>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-300">
                  <span className="text-gray-900 font-semibold">Utilidad Bruta ({margenBruto.toFixed(1)}%):</span>
                  <span className={`font-bold ${utilidadBruta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(utilidadBruta)}
                  </span>
                </div>
                {showIVA && (
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Util. con IVA ({margenUtilidad.toFixed(1)}%):</span>
                    <span>{formatCurrency(utilidadReal)}</span>
                  </div>
                )}
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
              <ProvisionesTab
                provisiones={provisiones}
                evento={evento}
                onRefresh={loadFinancialData}
                onCreateProvision={() => {
                  setEditingProvision(null);
                  setShowProvisionModal(true);
                }}
                onEditProvision={(provision) => {
                  setEditingProvision(provision);
                  setShowProvisionModal(true);
                }}
              />
            )}

            {activeTab === 'workflow' && (
              <WorkflowTab evento={evento} onStateChanged={handleActionInWorkflow} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
    
    {/* Modal de Gasto - Formulario Simplificado */}
    {showGastoModal && (
      <SimpleExpenseForm
        mode="gasto"
        eventoId={eventoId}
        item={editingGasto}
        onSave={() => {
          loadFinancialData();
          setShowGastoModal(false);
          setEditingGasto(null);
        }}
        onClose={() => {
          setShowGastoModal(false);
          setEditingGasto(null);
        }}
      />
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
                    .from('evt_ingresos_erp')
                    .update(cleanData)
                    .eq('id', editingIngreso.id);
                  
                  if (error) throw error;
                  toast.success('Ingreso actualizado correctamente');
                } else {
                  // Crear nuevo ingreso
                  const { error } = await supabase
                    .from('evt_ingresos_erp')
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

    {/* Modal de Provisión - Formulario Simplificado (mismo que gastos) */}
    {showProvisionModal && (
      <SimpleExpenseForm
        mode="provision"
        eventoId={eventoId}
        item={editingProvision}
        onSave={() => {
          loadFinancialData();
          setShowProvisionModal(false);
          setEditingProvision(null);
        }}
        onClose={() => {
          setShowProvisionModal(false);
          setEditingProvision(null);
        }}
      />
    )}
    </>
  );
};

const OverviewTab: React.FC<{ evento: any; showIVA?: boolean }> = ({ evento, showIVA = false }) => {
  const { paletteConfig } = useTheme();

  // Colores dinámicos de la paleta
  const colors = {
    primary: paletteConfig.primary,
    primaryLight: paletteConfig.shades[100],
    primaryDark: paletteConfig.shades[700],
    secondary: paletteConfig.secondary,
  };
  // ============================================================================
  // CÁLCULOS FINANCIEROS - FÓRMULA CORRECTA
  // ============================================================================
  // PROVISIONES = Gastos pendientes de pago (compromisos futuros)
  // TOTAL EGRESOS = Gastos + Provisiones
  // UTILIDAD BRUTA = Ingresos Subtotal - Gastos Subtotal - Provisiones Subtotal
  // MARGEN BRUTO = (Utilidad Bruta / Ingresos Subtotal) × 100

  // Usar campos directamente de la vista vw_eventos_analisis_financiero_erp
  const provisionesTotal = evento.provisiones_total || 0;
  const ingresoEstimado = evento.ingreso_estimado || 0;
  const ingresosTotales = evento.ingresos_totales || 0;
  const gastosTotales = evento.gastos_totales || 0;

  // Subtotales (sin IVA ni retenciones) - para utilidad bruta
  const ingresosSubtotal = evento.ingresos_subtotal || (ingresosTotales / 1.16);
  const gastosSubtotal = evento.gastos_subtotal || (gastosTotales / 1.16);
  const provisionesSubtotal = evento.provisiones_subtotal || (provisionesTotal / 1.16);

  // Total Egresos = Gastos + Provisiones (provisiones son gastos antes de pagarse)
  const totalEgresos = gastosTotales + provisionesTotal;

  // Utilidad Real (con IVA) - para compatibilidad
  const utilidadReal = evento.utilidad_real ?? (ingresosTotales - totalEgresos);
  const margenRealPct = evento.margen_real_pct ?? (ingresosTotales > 0 ? (utilidadReal / ingresosTotales) * 100 : 0);

  // Utilidad Bruta (sin IVA ni retenciones) - para análisis financiero
  const utilidadBruta = evento.utilidad_bruta ?? (ingresosSubtotal - gastosSubtotal - provisionesSubtotal);
  const margenBrutoPct = evento.margen_bruto_pct ?? (ingresosSubtotal > 0 ? (utilidadBruta / ingresosSubtotal) * 100 : 0);

  // Cálculos de IVA (16%)
  const IVA_RATE = 0.16;
  const ivaIngresos = evento.ingresos_iva || (ingresosTotales - ingresosSubtotal);
  const ivaGastos = evento.gastos_iva || (gastosTotales - gastosSubtotal);

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
                <span className="text-xs font-medium" style={{ color: colors.primaryDark }}>💰 INGRESOS</span>
                <div className="flex gap-4 text-xs">
                  <span className="text-gray-500">Presupuesto: {formatCurrency(ingresoEstimado)}</span>
                  <span className="font-bold" style={{ color: colors.primary }}>Facturado: {formatCurrency(ingresosTotales)}</span>
                </div>
              </div>
              <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                {/* Fondo: Presupuesto */}
                <div className="absolute inset-0 flex items-center justify-end px-3">
                  <span className="text-xs font-medium text-gray-400">
                    Ppto: {formatCurrency(ingresoEstimado)}
                  </span>
                </div>
                {/* Barra: Facturado - COLOR PRIMARIO */}
                <div
                  className="absolute h-full transition-all duration-500 flex items-center"
                  style={{
                    width: `${Math.min((ingresosTotales / Math.max(ingresoEstimado, ingresosTotales, 1)) * 100, 100)}%`,
                    backgroundColor: colors.primary
                  }}
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
                <span className="text-xs font-medium" style={{ color: colors.secondary }}>📉 GASTOS</span>
                <div className="flex gap-4 text-xs">
                  <span className="text-gray-500">Provisionado: {formatCurrency(provisionesTotal)}</span>
                  <span className="font-bold" style={{ color: colors.secondary }}>Ejercido: {formatCurrency(gastosTotales)}</span>
                </div>
              </div>
              <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                {/* Fondo: Provisionado */}
                <div className="absolute inset-0 flex items-center justify-end px-3">
                  <span className="text-xs font-medium text-gray-400">
                    Prov: {formatCurrency(provisionesTotal)}
                  </span>
                </div>
                {/* Barra: Ejercido - COLOR SECUNDARIO */}
                <div
                  className="absolute h-full transition-all duration-500 flex items-center"
                  style={{
                    width: `${Math.min((gastosTotales / Math.max(provisionesTotal, gastosTotales, 1)) * 100, 100)}%`,
                    backgroundColor: colors.secondary
                  }}
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

            {/* Provisiones Bar - Gastos pendientes de pago */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium" style={{ color: colors.primaryDark }}>💼 PROVISIONES (Gastos por pagar)</span>
                <div className="flex gap-4 text-xs">
                  <span className="font-bold" style={{ color: colors.primary }}>Total: {formatCurrency(provisionesTotal)}</span>
                  <span style={{ color: colors.secondary }}>% del Total Egresos: {totalEgresos > 0 ? ((provisionesTotal / totalEgresos) * 100).toFixed(0) : 0}%</span>
                </div>
              </div>
              <div className="relative h-10 bg-slate-200 rounded-lg overflow-hidden flex">
                {/* Barra: Provisiones - COLOR AMBER */}
                <div
                  className="h-full transition-all duration-500 flex items-center justify-center bg-amber-500"
                  style={{
                    width: `${totalEgresos > 0 ? Math.min((provisionesTotal / totalEgresos) * 100, 100) : 0}%`
                  }}
                >
                  {provisionesTotal > 0 && (
                    <span className="text-xs font-bold text-white px-2 whitespace-nowrap">
                      {formatCurrency(provisionesTotal)}
                    </span>
                  )}
                </div>
                {/* Barra: Gastos ya registrados - COLOR SECONDARY */}
                <div
                  className="h-full transition-all duration-500 flex items-center justify-center"
                  style={{
                    width: `${totalEgresos > 0 ? Math.min((gastosTotales / totalEgresos) * 100, 100) : 0}%`,
                    backgroundColor: colors.secondary
                  }}
                >
                  {gastosTotales > 0 && (
                    <span className="text-xs font-bold text-white px-2 whitespace-nowrap">
                      {formatCurrency(gastosTotales)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-center mt-1" style={{ color: colors.primaryDark }}>
                Total Egresos: {formatCurrency(totalEgresos)}
              </div>
            </div>

            {/* Utilidad Bruta Bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-blue-900">🎯 UTILIDAD BRUTA (sin IVA)</span>
                <div className="flex gap-4 text-xs">
                  <span className="text-gray-500">Margen: {margenBrutoPct.toFixed(1)}%</span>
                  <span className={`font-bold ${utilidadBruta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(utilidadBruta)}
                  </span>
                </div>
              </div>
              <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                {/* Barra: Utilidad Bruta - COLOR SEGÚN MARGEN */}
                <div
                  className={`absolute h-full transition-all duration-500 flex items-center ${
                    margenBrutoPct >= 35 ? 'bg-green-600' :
                    margenBrutoPct >= 25 ? 'bg-amber-500' :
                    margenBrutoPct > 0 ? 'bg-red-500' : 'bg-gray-400'
                  }`}
                  style={{ width: `${Math.min(Math.max(margenBrutoPct, 0), 100)}%` }}
                >
                  <span className="text-xs font-bold text-white px-3 whitespace-nowrap">
                    {formatCurrency(utilidadBruta)}
                  </span>
                </div>
                {/* Indicadores de semáforo */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {margenBrutoPct >= 35 ? '🟢' : margenBrutoPct >= 25 ? '🟡' : margenBrutoPct > 0 ? '🔴' : '⚫'} {margenBrutoPct.toFixed(1)}%
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
                <div className="text-blue-600 flex items-center gap-1">
                  <span className="text-green-500">✓</span> Facturado: {formatCurrency(ingresosTotales)}
                </div>
                <div className="text-gray-400">Ppto: {formatCurrency(ingresoEstimado)}</div>
              </div>
            </div>

            {/* GASTOS - Desglose por categoría igual que listado */}
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
                <div className="flex justify-between">
                  <span>🚗⛽</span>
                  <span className="font-medium">{formatCurrency((evento.gastos_combustible_pagados || 0) + (evento.gastos_combustible_pendientes || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>🛠️</span>
                  <span className="font-medium">{formatCurrency((evento.gastos_materiales_pagados || 0) + (evento.gastos_materiales_pendientes || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>👥</span>
                  <span className="font-medium">{formatCurrency((evento.gastos_rh_pagados || 0) + (evento.gastos_rh_pendientes || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>💳</span>
                  <span className="font-medium">{formatCurrency((evento.gastos_sps_pagados || 0) + (evento.gastos_sps_pendientes || 0))}</span>
                </div>
              </div>
            </div>

            {/* PROVISIONES - Desglose por categoría igual que listado */}
            <div className="border-r pr-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Provisiones</h4>
              <div className={`font-bold text-2xl mb-2 ${provisionesTotal > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                {formatCurrency(provisionesTotal)}
              </div>
              <div className="text-xs text-gray-500 border-t pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>🚗⛽</span>
                  <span className="font-medium">{formatCurrency(evento.provision_combustible || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>🛠️</span>
                  <span className="font-medium">{formatCurrency(evento.provision_materiales || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>👥</span>
                  <span className="font-medium">{formatCurrency(evento.provision_rh || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>💳</span>
                  <span className="font-medium">{formatCurrency(evento.provision_sps || 0)}</span>
                </div>
              </div>
            </div>

            {/* UTILIDAD BRUTA - Con velocímetro replicando formato del listado */}
            <div className="flex flex-col items-center">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Utilidad Bruta</h4>
              <div className={`font-bold text-2xl mb-2 ${utilidadBruta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(utilidadBruta)}
              </div>
              {/* Gauge Chart - Replicando el del listado */}
              <GaugeChart
                value={margenBrutoPct}
                size="sm"
                showLabel={true}
              />
              <div className="text-[10px] text-gray-400 mt-1">
                Sin IVA ni retenciones
              </div>
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
  const { paletteConfig } = useTheme();

  // Colores dinámicos de la paleta
  const colors = {
    primary: paletteConfig.primary,
    primaryLight: paletteConfig.shades[100],
    primaryDark: paletteConfig.shades[700],
    secondary: paletteConfig.secondary,
  };

  const handleDelete = async (ingreso: any) => {
    if (confirm(`¿Está seguro de que desea eliminar este ingreso de ${formatCurrency(ingreso.total)}?`)) {
      try {
        const { error } = await supabase
          .from('evt_ingresos_erp')
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
  const numFacturasCobradas = ingresos.filter(i => i.cobrado).length;
  const numFacturasPendientes = ingresos.filter(i => !i.cobrado).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6"
    >
      {/* RESUMEN DE INGRESOS - CON ESTADOS COBRADOS/PENDIENTES */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {/* FICHA 1: Total Ingresos - COLOR PRIMARIO */}
        <div
          className="rounded-lg p-3 border"
          style={{
            background: `linear-gradient(135deg, ${colors.primaryLight} 0%, ${colors.primary}20 100%)`,
            borderColor: `${colors.primary}40`
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.primaryDark }}>Total Ingresos</div>
            <div className="text-[10px] font-semibold" style={{ color: colors.primary }}>{ingresos.length} facturas</div>
          </div>
          <div className="text-xl font-bold" style={{ color: colors.primaryDark }}>{formatCurrency(totalIngresos)}</div>
        </div>

        {/* FICHA 2: Cobrados - COLOR PRIMARIO */}
        <div
          className="rounded-lg p-3 border"
          style={{
            background: `linear-gradient(135deg, ${colors.primaryLight} 0%, ${colors.primary}30 100%)`,
            borderColor: `${colors.primary}50`
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.primaryDark }}>Cobrados</div>
            <div className="text-[10px] font-semibold" style={{ color: colors.primary }}>{porcentajeCobrado.toFixed(0)}%</div>
          </div>
          <div className="text-xl font-bold" style={{ color: colors.primaryDark }}>{formatCurrency(totalCobrados)}</div>
          <div className="text-[10px] mt-1" style={{ color: colors.primary }}>{numFacturasCobradas} facturas cobradas</div>
        </div>

        {/* FICHA 3: Pendientes - COLOR SECUNDARIO */}
        <div
          className="rounded-lg p-3 border"
          style={{
            background: `linear-gradient(135deg, ${colors.secondary}15 0%, ${colors.secondary}25 100%)`,
            borderColor: `${colors.secondary}40`
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.secondary }}>Pendientes</div>
            <div className="text-[10px] font-semibold" style={{ color: colors.secondary }}>{(100 - porcentajeCobrado).toFixed(0)}%</div>
          </div>
          <div className="text-xl font-bold" style={{ color: colors.secondary }}>{formatCurrency(totalPendientes)}</div>
          <div className="text-[10px] mt-1" style={{ color: colors.secondary }}>{numFacturasPendientes} facturas pendientes</div>
        </div>

        {/* BOTÓN AGREGAR INGRESO - COLOR PRIMARIO */}
        {canCreate('ingresos') && (
          <button
            onClick={onCreateIngreso}
            className="rounded-lg p-3 transition-all flex flex-col items-center justify-center gap-1.5 group shadow-sm hover:shadow-md"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
              borderColor: colors.primary
            }}
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
                    <h4 className="font-medium text-gray-900 text-base">{ingreso.concepto}</h4>
                  </div>
                  <div>
                    <span className="text-base font-bold" style={{ color: colors.primary }}>{formatCurrency(ingreso.total)}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(ingreso.fecha_creacion)}
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
                      className="p-2 rounded-lg transition-colors border"
                      style={{
                        backgroundColor: `${colors.primary}15`,
                        borderColor: `${colors.primary}30`,
                        color: colors.primary
                      }}
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
  const { paletteConfig } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<'todos' | 'combustible' | 'materiales' | 'rh' | 'sps'>('todos');

  // Colores dinámicos de la paleta
  const colors = {
    primary: paletteConfig.primary,
    primaryLight: paletteConfig.shades[100],
    primaryDark: paletteConfig.shades[700],
    secondary: paletteConfig.secondary,
  };

  const handleDelete = async (gasto: any) => {
    if (confirm(`¿Está seguro de que desea eliminar este gasto de ${formatCurrency(gasto.total)}?`)) {
      try {
        const { error } = await supabase
          .from('evt_gastos_erp')
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

  // Calcular totales desde la vista vw_eventos_analisis_financiero_erp
  const totalGastos = evento.gastos_totales || 0;

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

  // Calcular totales por categoría
  const gastosCombustible = gastos.filter(g => g.categoria?.nombre === 'Combustible/Peaje');
  const gastosMateriales = gastos.filter(g => g.categoria?.nombre === 'Materiales');
  const gastosRH = gastos.filter(g => g.categoria?.nombre === 'Recursos Humanos');
  const gastosSPs = gastos.filter(g => g.categoria?.nombre === 'Solicitudes de Pago');

  const totalCombustible = gastosCombustible.reduce((sum, g) => sum + (g.total || 0), 0);
  const totalMateriales = gastosMateriales.reduce((sum, g) => sum + (g.total || 0), 0);
  const totalRH = gastosRH.reduce((sum, g) => sum + (g.total || 0), 0);
  const totalSPs = gastosSPs.reduce((sum, g) => sum + (g.total || 0), 0);

  // IVA 16%
  const IVA_RATE = 0.16;
  const getSubtotalIVA = (total: number) => ({
    subtotal: total / (1 + IVA_RATE),
    iva: total - (total / (1 + IVA_RATE))
  });

  // Obtener total de la categoría activa
  const getCategoryTotal = () => {
    switch (activeSubTab) {
      case 'combustible': return totalCombustible;
      case 'materiales': return totalMateriales;
      case 'rh': return totalRH;
      case 'sps': return totalSPs;
      default: return totalGastos;
    }
  };

  const categoryTotal = getCategoryTotal();
  const { subtotal: catSubtotal, iva: catIVA } = getSubtotalIVA(categoryTotal);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6"
    >
      {/* LISTADO DETALLADO DE GASTOS */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6 overflow-hidden p-4">
        {/* SUBTABS CON COLOR PRIMARIO */}
        <div className="flex border-b mb-4">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderBottomColor: activeSubTab === tab.id ? colors.primary : 'transparent',
                color: activeSubTab === tab.id ? colors.primaryDark : '#6B7280'
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* FICHAS DE TOTALES POR CATEGORÍA - SIEMPRE VISIBLES */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {/* Ficha Combustible */}
          <div
            className={`rounded-lg p-3 border cursor-pointer transition-all ${activeSubTab === 'combustible' ? 'ring-2' : ''}`}
            style={{
              backgroundColor: activeSubTab === 'combustible' ? `${colors.secondary}15` : '#FEF3C7',
              borderColor: activeSubTab === 'combustible' ? colors.secondary : '#F59E0B',
              ringColor: colors.secondary
            }}
            onClick={() => setActiveSubTab('combustible')}
          >
            <div className="text-center">
              <span className="text-lg">🚗⛽</span>
              <div className="text-[10px] text-gray-500 mt-1">Combustible</div>
              <div className="text-base font-bold text-amber-700 mt-1">{formatCurrency(totalCombustible)}</div>
              <div className="text-[9px] text-gray-400 mt-0.5">
                <div>Sub: {formatCurrency(getSubtotalIVA(totalCombustible).subtotal)}</div>
                <div>IVA: {formatCurrency(getSubtotalIVA(totalCombustible).iva)}</div>
              </div>
              <div className="text-[9px] text-gray-400 mt-1">({gastosCombustible.length})</div>
            </div>
          </div>

          {/* Ficha Materiales */}
          <div
            className={`rounded-lg p-3 border cursor-pointer transition-all ${activeSubTab === 'materiales' ? 'ring-2' : ''}`}
            style={{
              backgroundColor: activeSubTab === 'materiales' ? `${colors.secondary}15` : '#DBEAFE',
              borderColor: activeSubTab === 'materiales' ? colors.secondary : '#3B82F6',
              ringColor: colors.secondary
            }}
            onClick={() => setActiveSubTab('materiales')}
          >
            <div className="text-center">
              <span className="text-lg">🛠️</span>
              <div className="text-[10px] text-gray-500 mt-1">Materiales</div>
              <div className="text-base font-bold text-blue-700 mt-1">{formatCurrency(totalMateriales)}</div>
              <div className="text-[9px] text-gray-400 mt-0.5">
                <div>Sub: {formatCurrency(getSubtotalIVA(totalMateriales).subtotal)}</div>
                <div>IVA: {formatCurrency(getSubtotalIVA(totalMateriales).iva)}</div>
              </div>
              <div className="text-[9px] text-gray-400 mt-1">({gastosMateriales.length})</div>
            </div>
          </div>

          {/* Ficha RH */}
          <div
            className={`rounded-lg p-3 border cursor-pointer transition-all ${activeSubTab === 'rh' ? 'ring-2' : ''}`}
            style={{
              backgroundColor: activeSubTab === 'rh' ? `${colors.secondary}15` : '#D1FAE5',
              borderColor: activeSubTab === 'rh' ? colors.secondary : '#10B981',
              ringColor: colors.secondary
            }}
            onClick={() => setActiveSubTab('rh')}
          >
            <div className="text-center">
              <span className="text-lg">👥</span>
              <div className="text-[10px] text-gray-500 mt-1">RH</div>
              <div className="text-base font-bold text-emerald-700 mt-1">{formatCurrency(totalRH)}</div>
              <div className="text-[9px] text-gray-400 mt-0.5">
                <div>Sub: {formatCurrency(getSubtotalIVA(totalRH).subtotal)}</div>
                <div>IVA: {formatCurrency(getSubtotalIVA(totalRH).iva)}</div>
              </div>
              <div className="text-[9px] text-gray-400 mt-1">({gastosRH.length})</div>
            </div>
          </div>

          {/* Ficha SPs */}
          <div
            className={`rounded-lg p-3 border cursor-pointer transition-all ${activeSubTab === 'sps' ? 'ring-2' : ''}`}
            style={{
              backgroundColor: activeSubTab === 'sps' ? `${colors.secondary}15` : '#EDE9FE',
              borderColor: activeSubTab === 'sps' ? colors.secondary : '#8B5CF6',
              ringColor: colors.secondary
            }}
            onClick={() => setActiveSubTab('sps')}
          >
            <div className="text-center">
              <span className="text-lg">💳</span>
              <div className="text-[10px] text-gray-500 mt-1">SPs</div>
              <div className="text-base font-bold text-violet-700 mt-1">{formatCurrency(totalSPs)}</div>
              <div className="text-[9px] text-gray-400 mt-0.5">
                <div>Sub: {formatCurrency(getSubtotalIVA(totalSPs).subtotal)}</div>
                <div>IVA: {formatCurrency(getSubtotalIVA(totalSPs).iva)}</div>
              </div>
              <div className="text-[9px] text-gray-400 mt-1">({gastosSPs.length})</div>
            </div>
          </div>
        </div>

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
                      <h4 className="font-medium text-gray-900 text-base">{gasto.concepto}</h4>
                    </div>
                    <div>
                      <span className="text-base font-bold" style={{ color: colors.secondary }}>{formatCurrency(gasto.total)}</span>
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
                        className="p-2 rounded-lg transition-colors border"
                        style={{
                          backgroundColor: `${colors.primary}15`,
                          borderColor: `${colors.primary}30`,
                          color: colors.primary
                        }}
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

        {/* BOTÓN AGREGAR GASTO AL FINAL */}
        {canCreate('gastos') && (
          <div className="pt-4 border-t mt-4">
            <button
              onClick={onCreateGasto}
              className="w-full rounded-lg p-3 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`
              }}
            >
              <Plus className="w-5 h-5 text-white" />
              <span className="text-sm font-semibold text-white">Agregar Gasto</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ProvisionesTab: React.FC<{
  provisiones: any[];
  evento: any;
  onRefresh: () => void;
  onCreateProvision: () => void;
  onEditProvision: (provision: any) => void;
}> = ({ provisiones, evento, onRefresh, onCreateProvision, onEditProvision }) => {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { paletteConfig } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<'todos' | 'combustible' | 'materiales' | 'rh' | 'sps'>('todos');

  // Colores dinámicos de la paleta
  const colors = {
    primary: paletteConfig.primary,
    primaryLight: paletteConfig.shades[100],
    primaryDark: paletteConfig.shades[700],
    secondary: paletteConfig.secondary,
  };

  const handleDelete = async (provision: any) => {
    if (confirm(`¿Está seguro de que desea eliminar esta provisión de ${formatCurrency(provision.total)}?`)) {
      try {
        const { error } = await supabase
          .from('evt_provisiones_erp')
          .update({
            deleted_at: new Date().toISOString(),
            activo: false
          })
          .eq('id', provision.id);

        if (error) throw error;
        toast.success('Provisión eliminada');
        onRefresh();
      } catch (error) {
        console.error('Error deleting provision:', error);
        toast.error('Error al eliminar provisión');
      }
    }
  };

  // Calcular totales
  const totalProvisiones = provisiones.reduce((sum, p) => sum + (p.total || 0), 0);

  // SubTabs por categoría (igual que Gastos)
  const subTabs = [
    { id: 'todos', label: 'Todos', count: provisiones.length },
    { id: 'combustible', label: '⛽ Combustible/Peaje', count: provisiones.filter(p => p.categoria?.nombre === 'Combustible/Peaje' || p.categoria?.clave === 'combustible').length },
    { id: 'materiales', label: '🛠️ Materiales', count: provisiones.filter(p => p.categoria?.nombre === 'Materiales' || p.categoria?.clave === 'materiales').length },
    { id: 'rh', label: '👥 Recursos Humanos', count: provisiones.filter(p => p.categoria?.nombre === 'Recursos Humanos' || p.categoria?.clave === 'rh').length },
    { id: 'sps', label: '💳 Solicitudes de Pago', count: provisiones.filter(p => p.categoria?.nombre === 'Solicitudes de Pago' || p.categoria?.clave === 'sps').length }
  ];

  // Filtrar provisiones por subtab activo
  const provisionesFiltered = activeSubTab === 'todos'
    ? provisiones
    : provisiones.filter(p => {
        const categoryMap: Record<string, string[]> = {
          'combustible': ['Combustible/Peaje', 'combustible'],
          'materiales': ['Materiales', 'materiales'],
          'rh': ['Recursos Humanos', 'rh'],
          'sps': ['Solicitudes de Pago', 'sps']
        };
        const validNames = categoryMap[activeSubTab] || [];
        return validNames.includes(p.categoria?.nombre) || validNames.includes(p.categoria?.clave);
      });

  // Calcular totales por categoría
  const provCombustible = provisiones.filter(p => p.categoria?.nombre === 'Combustible/Peaje' || p.categoria?.clave === 'combustible');
  const provMateriales = provisiones.filter(p => p.categoria?.nombre === 'Materiales' || p.categoria?.clave === 'materiales');
  const provRH = provisiones.filter(p => p.categoria?.nombre === 'Recursos Humanos' || p.categoria?.clave === 'rh');
  const provSPs = provisiones.filter(p => p.categoria?.nombre === 'Solicitudes de Pago' || p.categoria?.clave === 'sps');

  const totalProvCombustible = provCombustible.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalProvMateriales = provMateriales.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalProvRH = provRH.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalProvSPs = provSPs.reduce((sum, p) => sum + (p.total || 0), 0);

  // IVA 16%
  const IVA_RATE = 0.16;
  const getSubtotalIVA = (total: number) => ({
    subtotal: total / (1 + IVA_RATE),
    iva: total - (total / (1 + IVA_RATE))
  });

  // Obtener total de la categoría activa
  const getCategoryTotal = () => {
    switch (activeSubTab) {
      case 'combustible': return totalProvCombustible;
      case 'materiales': return totalProvMateriales;
      case 'rh': return totalProvRH;
      case 'sps': return totalProvSPs;
      default: return totalProvisiones;
    }
  };

  const categoryTotal = getCategoryTotal();
  const { subtotal: catSubtotal, iva: catIVA } = getSubtotalIVA(categoryTotal);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6"
    >
      {/* LISTADO DE PROVISIONES CON SUBTABS */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6 overflow-hidden p-4">
        {/* SUBTABS CON COLOR PRIMARIO */}
        <div className="flex border-b mb-4">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderBottomColor: activeSubTab === tab.id ? colors.primary : 'transparent',
                color: activeSubTab === tab.id ? colors.primaryDark : '#6B7280'
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* FICHAS DE TOTALES POR CATEGORÍA - SIEMPRE VISIBLES */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {/* Ficha Combustible */}
          <div
            className={`rounded-lg p-3 border cursor-pointer transition-all ${activeSubTab === 'combustible' ? 'ring-2' : ''}`}
            style={{
              backgroundColor: activeSubTab === 'combustible' ? `${colors.primary}15` : '#FEF3C7',
              borderColor: activeSubTab === 'combustible' ? colors.primary : '#F59E0B',
              ringColor: colors.primary
            }}
            onClick={() => setActiveSubTab('combustible')}
          >
            <div className="text-center">
              <span className="text-lg">🚗⛽</span>
              <div className="text-[10px] text-gray-500 mt-1">Combustible</div>
              <div className="text-base font-bold text-amber-700 mt-1">{formatCurrency(totalProvCombustible)}</div>
              <div className="text-[9px] text-gray-400 mt-0.5">
                <div>Sub: {formatCurrency(getSubtotalIVA(totalProvCombustible).subtotal)}</div>
                <div>IVA: {formatCurrency(getSubtotalIVA(totalProvCombustible).iva)}</div>
              </div>
              <div className="text-[9px] text-gray-400 mt-1">({provCombustible.length})</div>
            </div>
          </div>

          {/* Ficha Materiales */}
          <div
            className={`rounded-lg p-3 border cursor-pointer transition-all ${activeSubTab === 'materiales' ? 'ring-2' : ''}`}
            style={{
              backgroundColor: activeSubTab === 'materiales' ? `${colors.primary}15` : '#DBEAFE',
              borderColor: activeSubTab === 'materiales' ? colors.primary : '#3B82F6',
              ringColor: colors.primary
            }}
            onClick={() => setActiveSubTab('materiales')}
          >
            <div className="text-center">
              <span className="text-lg">🛠️</span>
              <div className="text-[10px] text-gray-500 mt-1">Materiales</div>
              <div className="text-base font-bold text-blue-700 mt-1">{formatCurrency(totalProvMateriales)}</div>
              <div className="text-[9px] text-gray-400 mt-0.5">
                <div>Sub: {formatCurrency(getSubtotalIVA(totalProvMateriales).subtotal)}</div>
                <div>IVA: {formatCurrency(getSubtotalIVA(totalProvMateriales).iva)}</div>
              </div>
              <div className="text-[9px] text-gray-400 mt-1">({provMateriales.length})</div>
            </div>
          </div>

          {/* Ficha RH */}
          <div
            className={`rounded-lg p-3 border cursor-pointer transition-all ${activeSubTab === 'rh' ? 'ring-2' : ''}`}
            style={{
              backgroundColor: activeSubTab === 'rh' ? `${colors.primary}15` : '#D1FAE5',
              borderColor: activeSubTab === 'rh' ? colors.primary : '#10B981',
              ringColor: colors.primary
            }}
            onClick={() => setActiveSubTab('rh')}
          >
            <div className="text-center">
              <span className="text-lg">👥</span>
              <div className="text-[10px] text-gray-500 mt-1">RH</div>
              <div className="text-base font-bold text-emerald-700 mt-1">{formatCurrency(totalProvRH)}</div>
              <div className="text-[9px] text-gray-400 mt-0.5">
                <div>Sub: {formatCurrency(getSubtotalIVA(totalProvRH).subtotal)}</div>
                <div>IVA: {formatCurrency(getSubtotalIVA(totalProvRH).iva)}</div>
              </div>
              <div className="text-[9px] text-gray-400 mt-1">({provRH.length})</div>
            </div>
          </div>

          {/* Ficha SPs */}
          <div
            className={`rounded-lg p-3 border cursor-pointer transition-all ${activeSubTab === 'sps' ? 'ring-2' : ''}`}
            style={{
              backgroundColor: activeSubTab === 'sps' ? `${colors.primary}15` : '#EDE9FE',
              borderColor: activeSubTab === 'sps' ? colors.primary : '#8B5CF6',
              ringColor: colors.primary
            }}
            onClick={() => setActiveSubTab('sps')}
          >
            <div className="text-center">
              <span className="text-lg">💳</span>
              <div className="text-[10px] text-gray-500 mt-1">SPs</div>
              <div className="text-base font-bold text-violet-700 mt-1">{formatCurrency(totalProvSPs)}</div>
              <div className="text-[9px] text-gray-400 mt-0.5">
                <div>Sub: {formatCurrency(getSubtotalIVA(totalProvSPs).subtotal)}</div>
                <div>IVA: {formatCurrency(getSubtotalIVA(totalProvSPs).iva)}</div>
              </div>
              <div className="text-[9px] text-gray-400 mt-1">({provSPs.length})</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {provisionesFiltered.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay provisiones {activeSubTab !== 'todos' ? 'en esta categoría' : 'registradas'}</p>
              <p className="text-sm text-gray-400 mt-1">Las provisiones son gastos estimados que aún no se han pagado</p>
            </div>
          ) : (
            provisionesFiltered.map(provision => (
              <div key={provision.id} className="bg-white border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-5 gap-x-3 gap-y-1 items-center">
                    <div className="col-span-2 md:col-span-1 flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 text-base">{provision.concepto}</h4>
                    </div>
                    <div>
                      <span className="text-base font-bold" style={{ color: colors.primary }}>{formatCurrency(provision.total)}</span>
                    </div>
                    <div>
                      {provision.categoria && (
                        <Badge
                          variant="default"
                          className="text-xs py-0.5"
                          style={{ backgroundColor: (provision.categoria.color || '#6B7280') + '20', color: provision.categoria.color || '#6B7280' }}
                        >
                          {provision.categoria.nombre}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {provision.fecha_estimada ? formatDate(provision.fecha_estimada) : 'Sin fecha'}
                    </div>
                    <div className="col-span-2 md:col-span-5 text-sm text-gray-400">
                      {provision.proveedor && <span className="mr-3">🏢 {provision.proveedor.razon_social}</span>}
                      {provision.descripcion && <span className="mr-3">📝 {provision.descripcion}</span>}
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        provision.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                        provision.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                        provision.estado === 'pagado' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {provision.estado}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {canUpdate('gastos') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditProvision(provision); }}
                        className="p-2 rounded-lg transition-colors border"
                        style={{
                          backgroundColor: `${colors.primary}15`,
                          borderColor: `${colors.primary}30`,
                          color: colors.primary
                        }}
                        title="Editar provisión"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete('gastos') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(provision); }}
                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-colors border border-red-200"
                        title="Eliminar provisión"
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

        {/* BOTÓN AGREGAR PROVISIÓN AL FINAL */}
        {canCreate('gastos') && (
          <div className="pt-4 border-t mt-4">
            <button
              onClick={onCreateProvision}
              className="w-full rounded-lg p-3 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`
              }}
            >
              <Plus className="w-5 h-5 text-white" />
              <span className="text-sm font-semibold text-white">Agregar Provisión</span>
            </button>
          </div>
        )}
      </div>
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
