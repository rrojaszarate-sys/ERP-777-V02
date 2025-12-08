import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Plus, Pencil, Trash2, Eye, X, Settings as SettingsIcon, XCircle, CheckCircle, Loader2, Wallet, FileText, ArrowDownLeft, ArrowUpRight, Package, ChevronUp, ChevronDown, LayoutList, Table2, Check, ExternalLink, File, Undo2 } from 'lucide-react';
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
import { UnifiedExpenseForm } from '../../../shared/components/gastos/UnifiedExpenseForm';
import type { GastoFormData } from '../../../shared/components/gastos/types';
import { IncomeForm } from './finances/IncomeForm';
import { RetornoMaterialForm } from './finances/RetornoMaterialForm';
import { MaterialAlmacenForm } from './finances/MaterialAlmacenForm';
import { GastosAnalysisModal } from './analisis/GastosAnalysisModal';
import { ResumenFinancieroEvento } from './analisis/ResumenFinancieroEvento';
import { MaterialConsolidadoCard } from './finances/MaterialConsolidadoCard';
import { RefundModal } from './finances/RefundModal';
import { GaugeChart } from './GaugeChart';
import { useTheme } from '../../../shared/components/theme';
import { useExpenseCategories } from '../hooks/useFinances';
import { useUsers } from '../hooks/useUsers';
import { fetchFormasPago, fetchEjecutivos } from '../../contabilidad-erp/services/gastosNoImpactadosService';
import type { Ejecutivo } from '../../contabilidad-erp/types/gastosNoImpactados';

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

  // Estados para el modal de retornos de material
  const [showRetornoModal, setShowRetornoModal] = useState(false);
  const [editingRetorno, setEditingRetorno] = useState<any | null>(null);

  // Estados para el modal de Material Almacén (Ingreso/Retorno con catálogo)
  const [showMaterialAlmacenModal, setShowMaterialAlmacenModal] = useState(false);
  const [materialAlmacenTipo, setMaterialAlmacenTipo] = useState<'gasto' | 'retorno'>('gasto');
  const [editingMaterialAlmacen, setEditingMaterialAlmacen] = useState<any | null>(null);

  // Estados para el modal de ingresos
  const [showIngresoModal, setShowIngresoModal] = useState(false);
  const [editingIngreso, setEditingIngreso] = useState<any | null>(null);

  // Estados para el modal de provisiones
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [editingProvision, setEditingProvision] = useState<any | null>(null);
  const [convertingProvision, setConvertingProvision] = useState<any | null>(null);

  // Estados para Modal de Análisis
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);  // Para convertir provisión a gasto

  // Estado para Modal de Devolución
  const [refundingGasto, setRefundingGasto] = useState<any | null>(null);

  // Estado para COLAPSAR HEADER SUPERIOR (marcado en rojo por el usuario)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(() => {
    const saved = localStorage.getItem('eventos_erp_header_collapsed');
    return saved !== null ? JSON.parse(saved) : false; // Default: expandido
  });

  // Estado para VISTA COMPACTA tipo Excel (por defecto activa)
  const [isCompactView, setIsCompactView] = useState(() => {
    const saved = localStorage.getItem('eventos_erp_compact_view');
    return saved !== null ? JSON.parse(saved) : true; // Default: vista compacta
  });

  // Estado para mostrar Totales (con IVA) o Subtotales (sin IVA)
  // Por defecto FALSE para mostrar Utilidad Bruta (como en Excel doTERRA)
  const [showIVA, setShowIVA] = useState(() => {
    const saved = localStorage.getItem('eventos_erp_show_iva');
    return saved !== null ? JSON.parse(saved) : false; // Default: Subtotales (sin IVA)
  });

  // Estado para mostrar cifras compactas (K/M sin centavos)
  const [isCompactNumbers, setIsCompactNumbers] = useState(() => {
    const saved = localStorage.getItem('eventos_erp_compact_numbers');
    return saved !== null ? JSON.parse(saved) : false; // Default: cifras completas
  });

  const { canUpdate } = usePermissions();
  const { data: estados } = useEventStates();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { paletteConfig } = useTheme();

  // Catálogos para UnifiedExpenseForm
  const { data: categorias = [] } = useExpenseCategories();
  const { data: usuarios = [] } = useUsers();

  // Catálogos de Gastos No Impactados (para forma de pago y ejecutivo)
  const [formasPago, setFormasPago] = useState<{ id: number; nombre: string }[]>([]);
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);

  // Cargar catálogos de formas de pago y ejecutivos al inicio
  useEffect(() => {
    const loadCatalogosGasto = async () => {
      if (!user?.company_id) return;
      try {
        const [formasPagoData, ejecutivosData] = await Promise.all([
          fetchFormasPago(user.company_id),
          fetchEjecutivos(user.company_id)
        ]);
        setFormasPago(formasPagoData);
        setEjecutivos(ejecutivosData);
      } catch (error) {
        console.error('Error cargando catálogos de gasto:', error);
      }
    };
    loadCatalogosGasto();
  }, [user?.company_id]);

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

  // Toggle HEADER COLAPSABLE y guardar preferencia
  const toggleHeader = () => {
    const newValue = !isHeaderCollapsed;
    setIsHeaderCollapsed(newValue);
    localStorage.setItem('eventos_erp_header_collapsed', JSON.stringify(newValue));
  };

  // Toggle VISTA COMPACTA (tipo Excel) y guardar preferencia
  const toggleCompactView = () => {
    const newValue = !isCompactView;
    setIsCompactView(newValue);
    localStorage.setItem('eventos_erp_compact_view', JSON.stringify(newValue));
  };

  // Toggle CIFRAS COMPACTAS (K/M sin centavos) y guardar preferencia
  const toggleCompactNumbers = () => {
    const newValue = !isCompactNumbers;
    setIsCompactNumbers(newValue);
    localStorage.setItem('eventos_erp_compact_numbers', JSON.stringify(newValue));
  };

  // Función para formatear números en formato compacto (K/M) o completo
  const formatAmount = (amount: number): string => {
    if (isCompactNumbers) {
      const absAmount = Math.abs(amount);
      if (absAmount >= 1000000) {
        return `$${(amount / 1000000).toFixed(1)}M`;
      } else if (absAmount >= 1000) {
        return `$${(amount / 1000).toFixed(1)}K`;
      } else {
        return `$${amount.toFixed(0)}`;
      }
    }
    return formatCurrency(amount);
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

  // ============================================================================
  // GUARDAR GASTO/PROVISIÓN - Para UnifiedExpenseForm
  // ============================================================================
  const handleSaveGasto = async (data: GastoFormData, modo: 'gasto' | 'provision' = 'gasto') => {
    const table = modo === 'gasto' ? 'evt_gastos_erp' : 'evt_provisiones_erp';
    const fechaField = modo === 'gasto' ? 'fecha_gasto' : 'fecha_estimada';

    const dataToSave: any = {
      evento_id: eventoId,
      company_id: user?.company_id || '00000000-0000-0000-0000-000000000001',
      concepto: data.concepto,
      [fechaField]: data.fecha_gasto,
      categoria_id: data.categoria_id || null,
      subtotal: data.subtotal,
      iva: data.iva,
      total: data.total,
      notas: data.notas,
    };

    // Campos específicos según modo
    if (modo === 'gasto') {
      dataToSave.fecha_actualizacion = new Date().toISOString();
      dataToSave.status = data.estado || 'pendiente';
      dataToSave.pagado = data.pagado || false;
      dataToSave.comprobante_url = data.comprobante_pago_url;
      dataToSave.factura_pdf_url = data.factura_pdf_url;
      dataToSave.factura_xml_url = data.factura_xml_url;
      dataToSave.ticket_url = data.ticket_url;
      dataToSave.uuid_factura = data.folio_fiscal || null;
      dataToSave.responsable_id = data.responsable_id;
      // Proveedor en descripción si viene nombre
      if (data.proveedor_nombre) {
        dataToSave.descripcion = `Proveedor: ${data.proveedor_nombre}${data.rfc_proveedor ? ` (${data.rfc_proveedor})` : ''}`;
      }
    } else {
      dataToSave.updated_at = new Date().toISOString();
      dataToSave.proveedor = data.proveedor_nombre;
      dataToSave.rfc_proveedor = data.rfc_proveedor;
      dataToSave.estado = data.estado || 'pendiente';
      dataToSave.comprobante_pago_url = data.comprobante_pago_url;
    }

    if (data.id) {
      // Actualizar
      const { error } = await supabase
        .from(table)
        .update(dataToSave)
        .eq('id', data.id);

      if (error) throw error;
      toast.success(`${modo === 'gasto' ? 'Gasto' : 'Provisión'} actualizado`);
    } else {
      // Crear
      if (modo === 'gasto') {
        dataToSave.fecha_creacion = new Date().toISOString();
        dataToSave.creado_por = user?.id;
      } else {
        dataToSave.created_at = new Date().toISOString();
        dataToSave.created_by = user?.id;
        dataToSave.activo = true;
      }

      const { error } = await supabase
        .from(table)
        .insert(dataToSave);

      if (error) throw error;
      toast.success(`${modo === 'gasto' ? 'Gasto' : 'Provisión'} creado`);
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
        size="95"
      >
        <div className="flex flex-col h-full">
          {/* HEADER OPTIMIZADO */}
          <div className="px-4 py-2 border-b bg-gray-50">
            {/* FILA 1: Título + Botones de acción + Botón colapsar (SIEMPRE VISIBLE) */}
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">
                {evento.clave_evento || `EVT-${evento.id}`}
                {(evento.nombre_proyecto || evento.proyecto || evento.nombre) && ` - ${evento.nombre_proyecto || evento.proyecto || evento.nombre}`}
              </h2>
              <div className="flex items-center gap-2">
                {/* Toggle Subtotales/Totales */}
                <button
                  onClick={toggleIVA}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors border ${showIVA
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                    }`}
                  title={showIVA ? 'Mostrando Totales con IVA' : 'Mostrando Subtotales sin IVA'}
                >
                  <span>{showIVA ? '💰 Totales' : '📊 Subtotales'}</span>
                </button>
                {/* Toggle CIFRAS COMPACTAS (K/M) */}
                <button
                  onClick={toggleCompactNumbers}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors border ${isCompactNumbers
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                    }`}
                  title={isCompactNumbers ? 'Cifras en K/M' : 'Cifras completas'}
                >
                  <span>{isCompactNumbers ? '📈 K/M' : '💵 $$$'}</span>
                </button>
                <div className="w-px h-5 bg-gray-300"></div>
                {/* Botones de acción */}
                <button
                  onClick={handleCancelEvent}
                  disabled={isCanceling}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors disabled:opacity-50"
                  title="Cancelar evento"
                >
                  {isCanceling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                  Cancelar
                </button>
                {evento.estado?.nombre !== 'Finalizado' && evento.estado?.nombre !== 'Cancelado' && (
                  <button
                    onClick={handleFinalizeEvent}
                    disabled={isFinalizing}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded transition-colors disabled:opacity-50"
                    title="Finalizar evento"
                  >
                    {isFinalizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    Finalizar
                  </button>
                )}
                <div className="w-px h-5 bg-gray-300"></div>
                {canUpdate('eventos') && (
                  <button
                    onClick={() => onEdit(evento)}
                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Editar evento"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Cerrar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* BOTÓN COLAPSAR/EXPANDIR - SIEMPRE VISIBLE */}
            <button
              onClick={toggleHeader}
              className="w-full flex items-center justify-center gap-1 py-0.5 text-[9px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title={isHeaderCollapsed ? 'Expandir detalles' : 'Colapsar detalles'}
            >
              {isHeaderCollapsed ? (
                <><ChevronDown className="w-3 h-3" /> Mostrar detalles del evento</>
              ) : (
                <><ChevronUp className="w-3 h-3" /> Ocultar detalles</>
              )}
            </button>

            {/* TODO EL CONTENIDO COLAPSABLE */}
            <AnimatePresence>
              {!isHeaderCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {/* LAYOUT COMPACTO - Info + 4 fichas financieras + Resumen */}
                  <div className="flex gap-3 items-stretch mt-2 pt-2 border-t">

                    {/* INFORMACIÓN - DOBLE de ancho */}
                    <div className="rounded-lg p-3 border w-[400px]" style={{ backgroundColor: `${themeColors.primary}08` }}>
                      <div className="text-xs font-bold mb-2" style={{ color: themeColors.primary }}>📋 INFORMACIÓN</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2"><span>📅</span><span className="font-bold text-gray-800">{formatDate(evento.fecha_evento)}</span></div>
                        <div className="flex items-center gap-2 truncate"><span>🏢</span><span className="text-gray-700 truncate">{evento.cliente?.razon_social || evento.cliente?.nombre_comercial || '—'}</span></div>
                        <div className="flex items-center gap-2 truncate"><span>👤</span><span className="text-gray-600 truncate">{evento.solicitante ? `${evento.solicitante.nombre}` : '—'}</span></div>
                        <div className="flex items-center gap-2 truncate"><span>👥</span><span className="text-gray-600 truncate">{evento.responsable ? `${evento.responsable.nombre}` : '—'}</span></div>
                      </div>
                    </div>

                    {/* INGRESOS - Vertical como imagen */}
                    <div className="rounded-lg border flex-1 p-3" style={{ backgroundColor: `${themeColors.primary}08`, borderColor: `${themeColors.primary}30` }}>
                      <div className="text-xs font-bold uppercase mb-1" style={{ color: themeColors.primary }}>INGRESOS</div>
                      <div className="text-xl font-bold mb-2" style={{ color: themeColors.primary }}>{formatAmount(showIVA ? ingresosTotales : ingresosSubtotal)}</div>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex justify-between"><span style={{ color: themeColors.primary }}>✓</span><span className="text-gray-600">{formatAmount(evento.ingresos_cobrados || 0)}</span></div>
                        <div className="flex justify-between"><span className="text-amber-600">◐</span><span className="text-gray-600">{formatAmount((showIVA ? ingresosTotales : ingresosSubtotal) - (evento.ingresos_cobrados || 0))}</span></div>
                        <div className="flex justify-between"><span className="text-blue-600">◉</span><span className="text-gray-600">{formatAmount(evento.ingreso_estimado || 0)}</span></div>
                      </div>
                    </div>

                    {/* GASTOS - Vertical como imagen */}
                    <div className="rounded-lg border flex-1 p-3" style={{ backgroundColor: `${themeColors.secondary}08`, borderColor: `${themeColors.secondary}30` }}>
                      <div className="text-xs font-bold uppercase mb-1" style={{ color: themeColors.secondary }}>GASTOS</div>
                      <div className="text-xl font-bold mb-2" style={{ color: themeColors.secondary }}>{formatAmount(showIVA ? gastosTotales : gastosSubtotal)}</div>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex justify-between"><span>🚗</span><span className="text-gray-600">{formatAmount((evento.gastos_combustible_pagados || 0) + (evento.gastos_combustible_pendientes || 0))}</span></div>
                        <div className="flex justify-between"><span>🔧</span><span className="text-gray-600">{formatAmount((evento.gastos_materiales_pagados || 0) + (evento.gastos_materiales_pendientes || 0))}</span></div>
                        <div className="flex justify-between"><span>👥</span><span className="text-gray-600">{formatAmount((evento.gastos_rh_pagados || 0) + (evento.gastos_rh_pendientes || 0))}</span></div>
                        <div className="flex justify-between"><span>💳</span><span className="text-gray-600">{formatAmount(evento.gastos_sp || 0)}</span></div>
                      </div>
                    </div>

                    {/* PROVISIONES - Vertical como imagen */}
                    <div className="rounded-lg border flex-1 p-3 bg-cyan-50" style={{ borderColor: '#06B6D430' }}>
                      <div className="text-xs font-bold uppercase mb-1 text-cyan-700">PROVISIONES</div>
                      <div className="text-xl font-bold mb-2 text-cyan-600">{formatAmount(showIVA ? provisionesTotal : provisionesSubtotal)}</div>
                      <div className="space-y-0.5 text-xs text-cyan-700">
                        <div className="flex justify-between"><span>🚗</span><span>{formatAmount(evento.provision_combustible || 0)}</span></div>
                        <div className="flex justify-between"><span>🔧</span><span>{formatAmount(evento.provision_materiales || 0)}</span></div>
                        <div className="flex justify-between"><span>👥</span><span>{formatAmount(evento.provision_rh || 0)}</span></div>
                        <div className="flex justify-between"><span>💳</span><span>{formatAmount(evento.provision_sp || 0)}</span></div>
                      </div>
                    </div>

                    {/* UTILIDAD con GaugeChart exacto como imagen */}
                    <div className={`rounded-lg border flex-1 p-3 ${(showIVA ? utilidadReal : utilidadBruta) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className={`text-xs font-bold uppercase mb-1 ${(showIVA ? utilidadReal : utilidadBruta) >= 0 ? 'text-green-700' : 'text-red-700'}`}>UTILIDAD</div>
                      <div className={`text-xl font-bold mb-2 ${(showIVA ? utilidadReal : utilidadBruta) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatAmount(showIVA ? utilidadReal : utilidadBruta)}
                      </div>
                      <div className="flex justify-center">
                        <GaugeChart
                          value={Math.max(0, Math.min(100, showIVA ? margenUtilidad : margenBruto))}
                          size="sm"
                          showLabel={true}
                        />
                      </div>
                    </div>

                    {/* RESUMEN FINANCIERO */}
                    <div className="rounded-lg border p-2 w-[220px]" style={{ backgroundColor: `${themeColors.secondary}05`, borderColor: `${themeColors.secondary}20` }}>
                      <div className="text-[10px] font-bold mb-1 flex items-center gap-1" style={{ color: themeColors.secondary }}>
                        🔥 RESUMEN {showIVA ? '(+IVA)' : ''}
                      </div>
                      <div className="space-y-0.5 text-[10px]">
                        <div className="flex justify-between">
                          <span>Ingresos:</span>
                          <span className="font-bold" style={{ color: themeColors.primary }}>{formatAmount(showIVA ? ingresosTotales : ingresosSubtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gastos:</span>
                          <span className="font-bold" style={{ color: themeColors.secondary }}>{formatAmount(showIVA ? gastosTotales : gastosSubtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Provisiones:</span>
                          <span className="font-bold text-cyan-600">{formatAmount(showIVA ? provisionesTotal : provisionesSubtotal)}</span>
                        </div>
                        <div className="border-t pt-0.5 mt-0.5">
                          <div className="flex justify-between">
                            <span>IVA Trasl:</span>
                            <span className="text-green-600">+{formatAmount(ivaIngresos)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>IVA Acred:</span>
                            <span className="text-red-500">-{formatAmount(ivaGastos + ivaProvisiones)}</span>
                          </div>
                        </div>
                        <div className="border-t pt-0.5 mt-0.5">
                          <div className="flex justify-between font-bold">
                            <span>Utilidad:</span>
                            <span className={`${(showIVA ? utilidadReal : utilidadBruta) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatAmount(showIVA ? utilidadReal : utilidadBruta)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${activeTab === tab.id
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

          {/* Altura dinámica para contenido de tabs - se ajusta según estado del header */}
          <div
            className="flex-1 overflow-auto"
            style={{ maxHeight: isHeaderCollapsed ? 'calc(100vh - 140px)' : 'calc(100vh - 340px)' }}
          >
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <OverviewTab evento={evento} showIVA={showIVA} gastos={gastos} ingresos={ingresos} provisiones={provisiones} />
              )}

              {activeTab === 'ingresos' && (
                <IngresosTab
                  ingresos={ingresos}
                  evento={evento}
                  showIVA={showIVA}
                  isCompactView={isCompactView}
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
                  showIVA={showIVA}
                  isCompactView={isCompactView}
                  onRefresh={loadFinancialData}
                  onCreateGasto={() => {
                    setEditingGasto(null);
                    setShowGastoModal(true);
                  }}
                  onEditGasto={(gasto) => {
                    setEditingGasto(gasto);
                    setShowGastoModal(true);
                  }}
                  onShowAnalysis={() => setShowAnalysisModal(true)}
                  onCreateRetorno={() => {
                    setEditingRetorno(null);
                    setShowRetornoModal(true);
                  }}
                  onEditRetorno={(retorno) => {
                    setEditingRetorno(retorno);
                    setShowRetornoModal(true);
                  }}
                  onCreateIngresoMaterial={() => {
                    setEditingMaterialAlmacen(null);
                    setMaterialAlmacenTipo('gasto');
                    setShowMaterialAlmacenModal(true);
                  }}
                  onCreateRetornoMaterial={() => {
                    setEditingMaterialAlmacen(null);
                    setMaterialAlmacenTipo('retorno');
                    setShowMaterialAlmacenModal(true);
                  }}
                  onEditMaterialAlmacen={(item) => {
                    setEditingMaterialAlmacen(item);
                    setMaterialAlmacenTipo(item.tipo_movimiento || 'gasto');
                    setShowMaterialAlmacenModal(true);
                  }}
                  onCreateRefund={(gasto) => setRefundingGasto(gasto)}
                />
              )}

              {activeTab === 'provisiones' && (
                <ProvisionesTab
                  provisiones={provisiones}
                  evento={evento}
                  showIVA={showIVA}
                  isCompactView={isCompactView}
                  onRefresh={loadFinancialData}
                  onCreateProvision={() => {
                    setEditingProvision(null);
                    setShowProvisionModal(true);
                  }}
                  onEditProvision={(provision) => {
                    setEditingProvision(provision);
                    setShowProvisionModal(true);
                  }}
                  onConvertToGasto={(provision) => {
                    // Guardar la provisión que se está convirtiendo
                    setConvertingProvision(provision);
                    // Pre-cargar datos en el formulario de gasto
                    setEditingGasto({
                      concepto: provision.concepto,
                      subtotal: provision.subtotal,
                      iva: provision.iva,
                      iva_porcentaje: 16,
                      total: provision.total,
                      fecha_gasto: provision.fecha_estimada,
                      categoria_id: provision.categoria_id,
                      proveedor_nombre: provision.proveedor,
                      rfc_proveedor: provision.rfc_proveedor,
                      notas: provision.notas,
                      forma_pago_id: provision.forma_pago_id,
                      ejecutivo_id: provision.ejecutivo_id,
                      estado: 'pendiente',
                      pagado: false,
                    });
                    setShowGastoModal(true);
                  }}
                />
              )}

              {activeTab === 'workflow' && (
                <WorkflowTab evento={evento} onStateChanged={handleActionInWorkflow} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </Modal >

      {/* Modal de Gasto - UnifiedExpenseForm */}
      {
        showGastoModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden">
              <UnifiedExpenseForm
                gasto={editingGasto ? {
                  id: editingGasto.id,
                  concepto: editingGasto.concepto,
                  subtotal: editingGasto.subtotal,
                  iva: editingGasto.iva,
                  iva_porcentaje: 16,
                  total: editingGasto.total,
                  fecha_gasto: editingGasto.fecha_gasto,
                  estado: editingGasto.status || editingGasto.estado || 'pendiente',
                  pagado: editingGasto.pagado || false,
                  categoria_id: editingGasto.categoria_id,
                  responsable_id: editingGasto.responsable_id,
                  proveedor_nombre: editingGasto.proveedor || editingGasto.descripcion?.replace('Proveedor: ', ''),
                  comprobante_pago_url: editingGasto.comprobante_url,
                  factura_pdf_url: editingGasto.factura_pdf_url,
                  factura_xml_url: editingGasto.factura_xml_url,
                  ticket_url: editingGasto.ticket_url,
                  folio_fiscal: editingGasto.uuid_factura,
                  notas: editingGasto.notas,
                } : null}
                eventoId={eventoId}
                claveEvento={evento?.clave_evento || `EVT-${eventoId}`}
                categorias={categorias?.map(c => ({ id: c.id, nombre: c.nombre, color: c.color })) || []}
                usuarios={usuarios?.map(u => ({ id: u.id, nombre: `${u.nombre} ${u.apellidos || ''}`.trim(), email: u.email })) || []}
                formasPago={formasPago}
                ejecutivos={ejecutivos.map(e => ({ id: e.id, nombre: e.nombre }))}
                modo="evento"
                onSave={async (data) => {
                  await handleSaveGasto(data, 'gasto');

                  // Si estamos convirtiendo una provisión a gasto, eliminarla
                  if (convertingProvision?.id) {
                    try {
                      const { error } = await supabase
                        .from('evt_provisiones_erp')
                        .delete()
                        .eq('id', convertingProvision.id);

                      if (error) {
                        console.error('Error eliminando provisión:', error);
                        toast.error('Gasto guardado, pero error al eliminar provisión');
                      } else {
                        toast.success('✅ Provisión convertida a gasto exitosamente');
                      }
                    } catch (err) {
                      console.error('Error:', err);
                    }
                    setConvertingProvision(null);
                  }

                  await loadFinancialData();
                  setShowGastoModal(false);
                  setEditingGasto(null);
                }}
                onCancel={() => {
                  setShowGastoModal(false);
                  setEditingGasto(null);
                  setConvertingProvision(null);
                }}
              />
            </div>
          </div>
        )
      }

      {/* Modal de Retorno de Material - Con catálogo de productos */}
      {
        showRetornoModal && (
          <RetornoMaterialForm
            eventoId={eventoId}
            item={editingRetorno}
            onSave={() => {
              loadFinancialData();
              setShowRetornoModal(false);
              setEditingRetorno(null);
            }}
            onClose={() => {
              setShowRetornoModal(false);
              setEditingRetorno(null);
            }}
          />
        )
      }

      {/* Modal de Material Almacén - Ingreso/Retorno con catálogo de productos */}
      {
        showMaterialAlmacenModal && (
          <MaterialAlmacenForm
            eventoId={eventoId}
            tipoInicial={materialAlmacenTipo}
            item={editingMaterialAlmacen}
            onSave={() => {
              loadFinancialData();
              setShowMaterialAlmacenModal(false);
              setEditingMaterialAlmacen(null);
            }}
            onClose={() => {
              setShowMaterialAlmacenModal(false);
              setEditingMaterialAlmacen(null);
            }}
          />
        )
      }

      {/* Modal de Ingreso */}
      {
        showIngresoModal && (
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
        )
      }

      {/* Modal de Provisión - UnifiedExpenseForm */}
      {
        showProvisionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden">
              <UnifiedExpenseForm
                gasto={editingProvision ? {
                  id: editingProvision.id,
                  concepto: editingProvision.concepto,
                  subtotal: editingProvision.subtotal,
                  iva: editingProvision.iva,
                  iva_porcentaje: 16,
                  total: editingProvision.total,
                  fecha_gasto: editingProvision.fecha_estimada,
                  estado: 'provision',
                  pagado: false,
                  categoria_id: editingProvision.categoria_id,
                  proveedor_nombre: editingProvision.proveedor,
                  rfc_proveedor: editingProvision.rfc_proveedor,
                  notas: editingProvision.notas,
                  forma_pago_id: editingProvision.forma_pago_id,
                  ejecutivo_id: editingProvision.ejecutivo_id,
                } : null}
                eventoId={eventoId}
                claveEvento={evento?.clave_evento || `EVT-${eventoId}`}
                categorias={categorias?.map(c => ({ id: c.id, nombre: c.nombre, color: c.color })) || []}
                usuarios={usuarios?.map(u => ({ id: u.id, nombre: `${u.nombre} ${u.apellidos || ''}`.trim(), email: u.email })) || []}
                formasPago={formasPago}
                ejecutivos={ejecutivos.map(e => ({ id: e.id, nombre: e.nombre }))}
                modo="provision"
                onSave={async (data) => {
                  await handleSaveGasto(data, 'provision');
                  await loadFinancialData();
                  setShowProvisionModal(false);
                  setEditingProvision(null);
                }}
                onCancel={() => {
                  setShowProvisionModal(false);
                  setEditingProvision(null);
                }}
              />
            </div>
          </div>
        )
      }

      {/* MODAL DE DEVOLUCIÓN */}
      {refundingGasto && (
        <RefundModal
          gastoOriginal={refundingGasto}
          eventoId={eventoId.toString()}
          onSave={() => {
            setRefundingGasto(null);
            loadFinancialData();
            toast.success('Devolución registrada correctamente');
          }}
          onClose={() => setRefundingGasto(null)}
        />
      )}

      {/* MODAL DE ANÁLISIS INTELIGENTE */}
      <GastosAnalysisModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        gastos={gastos}
        evento={evento}
        eventoNombre={evento?.nombre_evento || 'Evento'}
      />
    </>
  );
};

const OverviewTab: React.FC<{ evento: any; showIVA?: boolean; gastos?: any[]; ingresos?: any[]; provisiones?: any[] }> = ({ evento, showIVA = false, gastos = [], ingresos = [], provisiones = [] }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 space-y-4"
    >
      {/* RESUMEN FINANCIERO CON GRÁFICAS DINÁMICAS - COMPACTO */}
      <ResumenFinancieroEvento
        evento={evento}
        gastos={gastos}
        ingresos={ingresos}
        provisiones={provisiones}
        showIVA={showIVA}
      />

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
  showIVA?: boolean;
  isCompactView?: boolean;
  onRefresh: () => void;
  onCreateIngreso: () => void;
  onEditIngreso: (ingreso: any) => void;
}> = ({ ingresos, evento, showIVA = false, isCompactView = false, onRefresh, onCreateIngreso, onEditIngreso }) => {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { paletteConfig, isDark } = useTheme();

  // Estado para ordenamiento de columnas
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  // Estado para mostrar/ocultar menú de columnas
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Columnas visibles
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('ingresos_visible_columns');
    return saved ? JSON.parse(saved) : {
      status: true,
      concepto: true,
      subtotal: true,
      iva: true,
      total: true,
      fecha: true,
      acciones: true
    };
  });

  const toggleColumn = (column: string) => {
    const newColumns = { ...visibleColumns, [column]: !visibleColumns[column] };
    setVisibleColumns(newColumns);
    localStorage.setItem('ingresos_visible_columns', JSON.stringify(newColumns));
  };

  const handleSort = (column: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.column === column && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ column, direction });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.column !== column) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  // Colores dinámicos de la paleta con soporte para modo oscuro
  const colors = {
    primary: paletteConfig.primary,
    primaryLight: paletteConfig.shades[100],
    primaryDark: paletteConfig.shades[700],
    secondary: paletteConfig.secondary,
    // Colores sobrios para filas alternadas (blanco/gris muy tenue + hover menta)
    rowEven: isDark ? '#1E293B' : '#FFFFFF',
    rowOdd: isDark ? '#263244' : '#F8FAFC',
    rowHover: isDark ? '#334155' : '#E0F2F1',
    // Textos según modo
    textPrimary: isDark ? '#F8FAFC' : '#1E293B',
    textSecondary: isDark ? '#CBD5E1' : '#64748B',
    textMuted: isDark ? '#94A3B8' : '#9CA3AF',
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
  const totalIngresosConIVA = evento.ingresos_totales || 0;
  const totalCobradosConIVA = evento.ingresos_cobrados || 0;
  const totalPendientesConIVA = evento.ingresos_pendientes || 0;

  // Subtotales sin IVA
  const subtotalIngresos = evento.ingresos_subtotal || (totalIngresosConIVA / 1.16);
  const subtotalCobrados = totalCobradosConIVA / 1.16;
  const subtotalPendientes = totalPendientesConIVA / 1.16;

  // Usar valores según toggle
  const totalIngresos = showIVA ? totalIngresosConIVA : subtotalIngresos;
  const totalCobrados = showIVA ? totalCobradosConIVA : subtotalCobrados;
  const totalPendientes = showIVA ? totalPendientesConIVA : subtotalPendientes;

  const porcentajeCobrado = totalIngresos > 0 ? (totalCobrados / totalIngresos) * 100 : 0;
  const numFacturasCobradas = ingresos.filter(i => i.cobrado).length;
  const numFacturasPendientes = ingresos.filter(i => !i.cobrado).length;

  // IVA calculado
  const ivaIngresos = totalIngresosConIVA - subtotalIngresos;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4"
    >
      {/* FICHAS DE RESUMEN - Diseño compacto tipo pills como Gastos */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {/* FICHA: Total Ingresos */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-sm bg-slate-700 text-white border-slate-700 shadow-sm">
          <span className="text-base">💰</span>
          <span className="font-medium">Total {showIVA ? '(+IVA)' : '(Neto)'}</span>
          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-white/20">{ingresos.length}</span>
          <span className="font-bold text-white">{formatCurrency(totalIngresos)}</span>
        </div>

        {/* FICHA: Cobrados */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-sm bg-slate-600 text-white border-slate-600 shadow-sm">
          <span className="text-base">✅</span>
          <span className="font-medium">Cobrados</span>
          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-white/20">{numFacturasCobradas}</span>
          <span className="font-bold text-white">{formatCurrency(totalCobrados)}</span>
          <span className="text-xs opacity-80">({porcentajeCobrado.toFixed(0)}%)</span>
        </div>

        {/* FICHA: Pendientes */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-sm bg-white text-slate-600 border-slate-200">
          <span className="text-base">⏳</span>
          <span className="font-medium">Pendientes</span>
          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500">{numFacturasPendientes}</span>
          <span className="font-bold text-slate-800">{formatCurrency(totalPendientes)}</span>
          <span className="text-xs opacity-80">({(100 - porcentajeCobrado).toFixed(0)}%)</span>
        </div>

        {/* SEPARADOR */}
        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        {/* BOTÓN AGREGAR INGRESO */}
        {canCreate('ingresos') && (
          <button
            onClick={onCreateIngreso}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border-2 border-dashed text-xs font-medium transition-all hover:shadow-sm"
            style={{ borderColor: colors.secondary, color: colors.secondary, backgroundColor: `${colors.secondary}08` }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ingreso</span>
          </button>
        )}
      </div>

      {/* VISTA COMPACTA - TIPO EXCEL */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold text-white">Status</th>
              <th className="px-2 py-1.5 text-left font-semibold text-white">No. Factura</th>
              <th className="px-2 py-1.5 text-left font-semibold text-white">Proveedor / Razón Social</th>
              <th className="px-2 py-1.5 text-left font-semibold text-white">Concepto</th>
              <th className="px-2 py-1.5 text-right font-semibold text-white">Sub-Total</th>
              <th className="px-2 py-1.5 text-right font-semibold text-white">I.V.A</th>
              <th className="px-2 py-1.5 text-right font-semibold text-white">Total</th>
              <th className="px-2 py-1.5 text-center font-semibold text-white">Fecha</th>
              <th className="px-2 py-1.5 text-center font-semibold text-white">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ingresos.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  No hay ingresos registrados
                </td>
              </tr>
            ) : (
              ingresos.map((ingreso, idx) => {
                const ingresoTotal = ingreso.total || 0;
                const ingresoSubtotal = ingreso.subtotal || (ingresoTotal / 1.16);
                const ingresoIVA = ingreso.iva || (ingresoTotal - ingresoSubtotal);
                const isPagado = ingreso.cobrado;

                // Colores de fila: blanco/gris alternado + hover menta suave (homologado)
                const rowBgColor = idx % 2 === 0 ? colors.rowEven : colors.rowOdd;
                const rowHoverColor = colors.rowHover;

                return (
                  <tr
                    key={ingreso.id}
                    className="transition-colors cursor-pointer"
                    style={{ backgroundColor: rowBgColor }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = rowHoverColor}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = rowBgColor}
                  >
                    <td className="px-2 py-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-bold ${isPagado
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-200'
                          }`}
                      >
                        {isPagado ? 'COBRADO' : 'PENDIENTE'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`${ingreso.numero_factura ? 'underline cursor-pointer font-medium text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}
                      >
                        {ingreso.numero_factura || 'N/A'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 max-w-[180px] truncate text-slate-600 dark:text-slate-300">
                      {ingreso.razon_social || ingreso.proveedor_nombre || 'Sin proveedor'}
                    </td>
                    <td className="px-2 py-1.5 max-w-[200px] truncate font-medium text-slate-800 dark:text-slate-100">
                      {ingreso.concepto}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-sm text-slate-700 dark:text-slate-200">
                      {formatCurrency(ingresoSubtotal)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-sm text-slate-500 dark:text-slate-400">
                      {formatCurrency(ingresoIVA)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-sm text-slate-800 dark:text-slate-100">
                      {formatCurrency(ingresoTotal)}
                    </td>
                    <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400">
                      {formatDate(ingreso.fecha_creacion)}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <div className="flex gap-1 justify-center">
                        {/* Icono para ver documentos (PDF/XML) */}
                        {(ingreso.pdf_url || ingreso.xml_url || ingreso.archivo_adjunto) && (
                          <div className="relative group">
                            <button
                              className="p-1 hover:bg-purple-100 rounded text-purple-600"
                              title="Ver documentos"
                            >
                              <File className="w-3 h-3" />
                            </button>
                            {/* Dropdown de documentos */}
                            <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 bg-white border shadow-lg rounded py-1 min-w-[120px]">
                              {(ingreso.pdf_url || ingreso.archivo_adjunto) && (
                                <a
                                  href={ingreso.pdf_url || ingreso.archivo_adjunto}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-700"
                                >
                                  <FileText className="w-3.5 h-3.5 text-red-500" />
                                  PDF
                                  <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
                                </a>
                              )}
                              {ingreso.xml_url && (
                                <a
                                  href={ingreso.xml_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-700"
                                >
                                  <File className="w-3.5 h-3.5 text-green-600" />
                                  XML
                                  <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                        {canUpdate('ingresos') && (
                          <button
                            onClick={() => onEditIngreso(ingreso)}
                            className="p-1 hover:bg-blue-100 rounded text-blue-600"
                            title="Editar"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        {canDelete('ingresos') && (
                          <button
                            onClick={() => handleDelete(ingreso)}
                            className="p-1 hover:bg-red-100 rounded text-red-500"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {/* TOTAL EN FOOTER - estilo Excel */}
          {ingresos.length > 0 && (
            <tfoot className="text-white font-bold" style={{ backgroundColor: colors.primaryDark }}>
              <tr>
                <td colSpan={4} className="px-2 py-2 text-right">TOTAL INGRESOS</td>
                <td className="px-2 py-2 text-right font-mono">{formatCurrency(subtotalIngresos)}</td>
                <td className="px-2 py-2 text-right font-mono">{formatCurrency(ivaIngresos)}</td>
                <td className="px-2 py-2 text-right font-mono">{formatCurrency(totalIngresosConIVA)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </motion.div>
  );
};

const GastosTab: React.FC<{
  gastos: any[];
  evento: any;
  showIVA?: boolean;
  isCompactView?: boolean;
  onRefresh: () => void;
  onCreateGasto: () => void;
  onEditGasto: (gasto: any) => void;
  onShowAnalysis?: () => void;
  onCreateRetorno?: () => void;
  onEditRetorno?: (retorno: any) => void;
  onCreateIngresoMaterial?: () => void;
  onCreateRetornoMaterial?: () => void;
  onEditMaterialAlmacen?: (item: any) => void;
  onCreateRefund?: (gasto: any) => void;
}> = ({ gastos, evento, showIVA = false, isCompactView = false, onRefresh, onCreateGasto, onEditGasto, onShowAnalysis, onCreateRetorno, onEditRetorno, onCreateIngresoMaterial, onCreateRetornoMaterial, onEditMaterialAlmacen, onCreateRefund }) => {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { paletteConfig, isDark } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<'todos' | 'combustible' | 'materiales' | 'rh' | 'sps'>('todos');

  // Estado para ordenamiento de columnas
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  // Estado para filas expandidas de materiales consolidados
  const [expandedMaterialRows, setExpandedMaterialRows] = useState<Set<number>>(new Set());

  // Estado para ordenamiento de sub-tabla de materiales
  const [materialSortConfig, setMaterialSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  // Función para ordenar sub-tabla de materiales
  const handleMaterialSort = (column: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (materialSortConfig?.column === column && materialSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setMaterialSortConfig({ column, direction });
  };

  // Icono de ordenamiento para sub-tabla
  const MaterialSortIcon = ({ column }: { column: string }) => {
    if (materialSortConfig?.column !== column) return <span className="ml-1 text-blue-300">↕</span>;
    return <span className="ml-1">{materialSortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  // Estado para mostrar/ocultar menú de columnas
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Columnas disponibles con su configuración
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('gastos_visible_columns');
    return saved ? JSON.parse(saved) : {
      status: true,
      categoria: true,
      proveedor: true,
      concepto: true,
      subtotal: true,
      iva: true,
      total: true,
      fecha: true,
      acciones: true
    };
  });

  // Guardar columnas visibles en localStorage
  const toggleColumn = (column: string) => {
    const newColumns = { ...visibleColumns, [column]: !visibleColumns[column] };
    setVisibleColumns(newColumns);
    localStorage.setItem('gastos_visible_columns', JSON.stringify(newColumns));
  };

  // Función para ordenar
  const handleSort = (column: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.column === column && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ column, direction });
  };

  // Icono de ordenamiento
  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.column !== column) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  // Colores dinámicos de la paleta con soporte para modo oscuro
  const colors = {
    primary: paletteConfig.primary,
    primaryLight: paletteConfig.shades[100],
    primaryDark: paletteConfig.shades[700],
    secondary: paletteConfig.secondary,
    // Colores sobrios para filas alternadas (blanco/gris muy tenue + hover menta)
    rowEven: isDark ? '#1E293B' : '#FFFFFF',
    rowOdd: isDark ? '#263244' : '#F8FAFC',
    rowHover: isDark ? '#334155' : '#E0F2F1',
    // Textos según modo
    textPrimary: isDark ? '#F8FAFC' : '#1E293B',
    textSecondary: isDark ? '#CBD5E1' : '#64748B',
    textMuted: isDark ? '#94A3B8' : '#9CA3AF',
  };

  const handleDelete = async (gasto: any) => {
    const motivo = prompt(`¿Por qué desea eliminar este gasto de ${formatCurrency(gasto.total)}?\n\n(Escriba el motivo o deje vacío para cancelar)`);

    if (motivo === null) return; // Usuario canceló
    if (motivo.trim() === '') {
      toast.error('Debe proporcionar un motivo para eliminar');
      return;
    }

    try {
      // Obtener información del dispositivo
      const userAgent = navigator.userAgent;
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const userEmail = (await supabase.auth.getUser()).data.user?.email;

      // Soft delete - marcar como inactivo
      const { error: updateError } = await supabase
        .from('evt_gastos_erp')
        .update({
          activo: false,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          deleted_reason: motivo,
          deleted_user_agent: userAgent
        })
        .eq('id', gasto.id);

      if (updateError) throw updateError;

      // Registrar en tabla de auditoría
      await supabase
        .from('audit_eliminaciones_financieras')
        .insert({
          tabla_origen: 'evt_gastos_erp',
          registro_id: gasto.id,
          evento_id: gasto.evento_id,
          company_id: gasto.company_id,
          registro_snapshot: gasto,
          concepto: gasto.concepto,
          subtotal: gasto.subtotal,
          iva: gasto.iva,
          total: gasto.total,
          deleted_by: userId,
          deleted_by_email: userEmail,
          deleted_reason: motivo,
          deleted_user_agent: userAgent
        });

      toast.success('Gasto eliminado correctamente');
      onRefresh();
    } catch (error) {
      console.error('Error deleting gasto:', error);
      toast.error('Error al eliminar el gasto');
    }
  };

  // Toggle de fila expandida para materiales
  const toggleMaterialRow = (gastoId: number) => {
    const newSet = new Set(expandedMaterialRows);
    if (newSet.has(gastoId)) {
      newSet.delete(gastoId);
    } else {
      newSet.add(gastoId);
    }
    setExpandedMaterialRows(newSet);
  };

  // Parsear líneas de material desde detalle_retorno
  const parseMaterialLines = (detalle: any): { producto_nombre: string; cantidad: number; unidad: string; costo_unitario: number; subtotal: number }[] => {
    if (!detalle) return [];
    try {
      if (typeof detalle === 'string') {
        return JSON.parse(detalle);
      }
      return detalle;
    } catch {
      return [];
    }
  };

  // Calcular totales desde la vista vw_eventos_analisis_financiero_erp
  const totalGastosConIVA = evento.gastos_totales || 0;
  const subtotalGastos = evento.gastos_subtotal || (totalGastosConIVA / 1.16);
  const ivaGastos = totalGastosConIVA - subtotalGastos;
  const totalGastos = showIVA ? totalGastosConIVA : subtotalGastos;

  // Funciones helper para filtrar por categoría (incluye variantes de nombre)
  const esCombustible = (g: any) => g.categoria?.nombre === 'Combustible/Peaje';
  const esMateriales = (g: any) => g.categoria?.nombre === 'Materiales';
  const esRH = (g: any) => g.categoria?.nombre === 'RH (Recursos Humanos)' || g.categoria?.nombre === 'Recursos Humanos';
  const esSPs = (g: any) => g.categoria?.nombre === 'SPs (Solicitudes de Pago)' || g.categoria?.nombre === 'Solicitudes de Pago';

  const subTabs = [
    { id: 'todos', label: 'Todos', count: gastos.length },
    { id: 'combustible', label: '⛽ Combustible/Peaje', count: gastos.filter(esCombustible).length },
    { id: 'materiales', label: '🛠️ Materiales', count: gastos.filter(esMateriales).length },
    { id: 'rh', label: '👥 Recursos Humanos', count: gastos.filter(esRH).length },
    { id: 'sps', label: '💳 Solicitudes de Pago', count: gastos.filter(esSPs).length }
  ];

  // Filtrar gastos por categoría
  const gastosFilteredByCategory = activeSubTab === 'todos'
    ? gastos
    : gastos.filter(g => {
      switch (activeSubTab) {
        case 'combustible': return esCombustible(g);
        case 'materiales': return esMateriales(g);
        case 'rh': return esRH(g);
        case 'sps': return esSPs(g);
        default: return true;
      }
    });

  // Aplicar ordenamiento
  const gastosFilter = [...gastosFilteredByCategory].sort((a, b) => {
    if (!sortConfig) return 0;

    let aValue: any, bValue: any;
    switch (sortConfig.column) {
      case 'status':
        aValue = a.pagado ? 1 : 0;
        bValue = b.pagado ? 1 : 0;
        break;
      case 'categoria':
        aValue = a.categoria?.nombre || '';
        bValue = b.categoria?.nombre || '';
        break;
      case 'proveedor':
        aValue = a.proveedor?.razon_social || a.proveedor_nombre || '';
        bValue = b.proveedor?.razon_social || b.proveedor_nombre || '';
        break;
      case 'concepto':
        aValue = a.concepto || '';
        bValue = b.concepto || '';
        break;
      case 'subtotal':
      case 'iva':
      case 'total':
        aValue = a.total || 0;
        bValue = b.total || 0;
        break;
      case 'fecha':
        aValue = new Date(a.fecha_gasto || 0).getTime();
        bValue = new Date(b.fecha_gasto || 0).getTime();
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
  });

  // Calcular totales por categoría
  const gastosCombustible = gastos.filter(esCombustible);
  const gastosMateriales = gastos.filter(esMateriales);
  const gastosRH = gastos.filter(esRH);
  const gastosSPs = gastos.filter(esSPs);

  // Totales con IVA por categoría
  const totalCombustibleConIVA = gastosCombustible.reduce((sum, g) => sum + (g.total || 0), 0);
  const totalMaterialesConIVA = gastosMateriales.reduce((sum, g) => sum + (g.total || 0), 0);
  const totalRHConIVA = gastosRH.reduce((sum, g) => sum + (g.total || 0), 0);
  const totalSPsConIVA = gastosSPs.reduce((sum, g) => sum + (g.total || 0), 0);

  // Totales según showIVA
  const totalCombustible = showIVA ? totalCombustibleConIVA : (totalCombustibleConIVA / 1.16);
  const totalMateriales = showIVA ? totalMaterialesConIVA : (totalMaterialesConIVA / 1.16);
  const totalRH = showIVA ? totalRHConIVA : (totalRHConIVA / 1.16);
  const totalSPs = showIVA ? totalSPsConIVA : (totalSPsConIVA / 1.16);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4"
    >
      {/* FICHAS DE CATEGORÍAS - Diseño compacto y sobrio */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {/* FICHAS DE CATEGORÍA - ESTILO PILL SOBRIO */}
        {[
          { id: 'todos' as const, icon: '📊', label: 'Todos', count: gastos.length, total: totalGastos },
          { id: 'combustible' as const, icon: '⛽', label: 'Combustible', count: gastosCombustible.length, total: totalCombustible },
          { id: 'materiales' as const, icon: '🛠️', label: 'Materiales', count: gastosMateriales.length, total: totalMateriales },
          { id: 'rh' as const, icon: '👷', label: 'Personal', count: gastosRH.length, total: totalRH },
          { id: 'sps' as const, icon: '💳', label: 'Solicitudes', count: gastosSPs.length, total: totalSPs }
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveSubTab(cat.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-sm transition-all ${activeSubTab === cat.id
              ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
          >
            <span className="text-base">{cat.icon}</span>
            <span className="font-medium">{cat.label}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${activeSubTab === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{cat.count}</span>
            <span className={`font-bold ${activeSubTab === cat.id ? 'text-white' : 'text-slate-800'}`}>
              {formatCurrency(cat.total)}
            </span>
          </button>
        ))}

        {/* SEPARADOR */}
        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        {/* BOTONES DE ACCIÓN - AL LADO */}
        {onShowAnalysis && (
          <button
            onClick={onShowAnalysis}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all shadow-sm"
            style={{
              borderColor: `${colors.secondary}40`,
              backgroundColor: `${colors.secondary}10`,
              color: colors.secondary
            }}
          >
            <span>✨</span>
            <span>Intelligent Analysis</span>
          </button>
        )}

        {canCreate && (
          <button
            onClick={onCreateGasto}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border-2 border-dashed text-xs font-medium transition-all hover:shadow-sm"
            style={{ borderColor: colors.primary, color: colors.primary, backgroundColor: `${colors.primary}08` }}
          >
            <span>➕</span>
            <span>Gasto</span>
          </button>
        )}

        {/* Botones Material - Solo si estamos en materiales */}
        {activeSubTab === 'materiales' && onCreateIngresoMaterial && (
          <button
            onClick={onCreateIngresoMaterial}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#059669' }}
          >
            <span>📥</span>
            <span>Ingreso</span>
          </button>
        )}
        {activeSubTab === 'materiales' && onCreateRetornoMaterial && (
          <button
            onClick={onCreateRetornoMaterial}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#6366f1' }}
          >
            <span>📤</span>
            <span>Retorno</span>
          </button>
        )}
      </div>

      {/* CONTENEDOR DEL LISTADO */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

        {/* VISTA COMPACTA - TIPO EXCEL PARA GASTOS */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                {visibleColumns.status && (
                  <th onClick={() => handleSort('status')} className="px-2 py-1.5 text-left font-semibold cursor-pointer hover:opacity-80 select-none">
                    Status <SortIcon column="status" />
                  </th>
                )}
                {visibleColumns.categoria && (
                  <th onClick={() => handleSort('categoria')} className="px-2 py-1.5 text-left font-semibold cursor-pointer hover:opacity-80 select-none">
                    Categoría <SortIcon column="categoria" />
                  </th>
                )}
                {visibleColumns.proveedor && (
                  <th onClick={() => handleSort('proveedor')} className="px-2 py-1.5 text-left font-semibold cursor-pointer hover:opacity-80 select-none">
                    Proveedor <SortIcon column="proveedor" />
                  </th>
                )}
                {visibleColumns.concepto && (
                  <th onClick={() => handleSort('concepto')} className="px-2 py-1.5 text-left font-semibold cursor-pointer hover:opacity-80 select-none">
                    Concepto <SortIcon column="concepto" />
                  </th>
                )}
                {visibleColumns.subtotal && (
                  <th onClick={() => handleSort('subtotal')} className="px-2 py-1.5 text-right font-semibold cursor-pointer hover:opacity-80 select-none">
                    Sub-Total <SortIcon column="subtotal" />
                  </th>
                )}
                {visibleColumns.iva && (
                  <th onClick={() => handleSort('iva')} className="px-2 py-1.5 text-right font-semibold cursor-pointer hover:opacity-80 select-none">
                    I.V.A <SortIcon column="iva" />
                  </th>
                )}
                {visibleColumns.total && (
                  <th onClick={() => handleSort('total')} className="px-2 py-1.5 text-right font-semibold cursor-pointer hover:opacity-80 select-none">
                    Total <SortIcon column="total" />
                  </th>
                )}
                {visibleColumns.fecha && (
                  <th onClick={() => handleSort('fecha')} className="px-2 py-1.5 text-center font-semibold cursor-pointer hover:opacity-80 select-none">
                    Fecha <SortIcon column="fecha" />
                  </th>
                )}
                {visibleColumns.acciones && (
                  <th className="px-2 py-1.5 text-center font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <span>Acción</span>
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowColumnMenu(!showColumnMenu); }}
                          className="p-0.5 hover:opacity-80 rounded"
                          title="Configurar columnas"
                        >
                          ⚙️
                        </button>
                        {showColumnMenu && (
                          <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[150px] p-2 text-gray-800">
                            <div className="text-[10px] font-bold text-gray-600 mb-1 pb-1 border-b">Columnas</div>
                            {[
                              { key: 'status', label: 'Status' },
                              { key: 'categoria', label: 'Categoría' },
                              { key: 'proveedor', label: 'Proveedor' },
                              { key: 'concepto', label: 'Concepto' },
                              { key: 'subtotal', label: 'Sub-Total' },
                              { key: 'iva', label: 'I.V.A' },
                              { key: 'total', label: 'Total' },
                              { key: 'fecha', label: 'Fecha' },
                            ].map(col => (
                              <label key={col.key} className="flex items-center gap-1 py-0.5 px-1 hover:bg-gray-100 rounded cursor-pointer text-[10px]">
                                <input
                                  type="checkbox"
                                  checked={visibleColumns[col.key]}
                                  onChange={() => toggleColumn(col.key)}
                                  className="w-2.5 h-2.5"
                                />
                                {col.label}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gastosFilter.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No hay gastos registrados
                  </td>
                </tr>
              ) : (
                gastosFilter.map((gasto, idx) => {
                  const gastoTotal = gasto.total || 0;
                  const gastoSubtotal = gasto.subtotal || (gastoTotal / 1.16);
                  const gastoIVA = gasto.iva || (gastoTotal - gastoSubtotal);
                  const isPagado = gasto.pagado;
                  const isRetorno = gasto.tipo_movimiento === 'retorno';

                  // Detectar si es material consolidado
                  const esMaterialConsolidado = esMateriales(gasto) && gasto.detalle_retorno;
                  const materialLines = esMaterialConsolidado ? parseMaterialLines(gasto.detalle_retorno) : [];
                  const isExpanded = expandedMaterialRows.has(gasto.id);

                  // Colores de fila: blanco/gris alternado + hover menta suave (homologado)
                  const rowBgColor = idx % 2 === 0 ? colors.rowEven : colors.rowOdd;
                  const rowHoverColor = colors.rowHover;

                  // Color de categoría
                  const catColor = gasto.categoria?.color || '#6B7280';
                  const catName = gasto.categoria?.nombre || 'Sin categoría';

                  return (
                    <React.Fragment key={gasto.id}>
                      <tr
                        className="transition-colors cursor-pointer"
                        style={{ backgroundColor: rowBgColor }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = rowHoverColor}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = rowBgColor}
                        onClick={() => {
                          if (esMaterialConsolidado) {
                            toggleMaterialRow(gasto.id);
                          } else {
                            onEditGasto(gasto);
                          }
                        }}
                      >
                        {visibleColumns.status && (
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1">
                              {esMaterialConsolidado && (
                                <span className="text-slate-400">{isExpanded ? '▼' : '▶'}</span>
                              )}
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs font-bold ${isRetorno
                                  ? 'bg-slate-600 text-white'
                                  : isPagado
                                    ? 'bg-slate-700 text-white'
                                    : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-200'
                                  }`}
                              >
                                {isRetorno ? 'RETORNO' : isPagado ? 'PAGADO' : 'PENDIENTE'}
                              </span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.categoria && (
                          <td className="px-2 py-1.5">
                            <span
                              className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-200"
                            >
                              {catName}
                            </span>
                          </td>
                        )}
                        {visibleColumns.proveedor && (
                          <td className="px-2 py-1.5 max-w-[150px] truncate text-slate-600 dark:text-slate-300">
                            {gasto.proveedor?.razon_social || gasto.proveedor_nombre || 'Sin proveedor'}
                          </td>
                        )}
                        {visibleColumns.concepto && (
                          <td className="px-2 py-1.5 max-w-[180px] truncate font-medium text-slate-800 dark:text-slate-100">
                            {esMaterialConsolidado ? (
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3 text-slate-500" />
                                {gasto.concepto} <span className="text-xs text-slate-400">({materialLines.length} items)</span>
                              </span>
                            ) : gasto.concepto}
                          </td>
                        )}
                        {visibleColumns.subtotal && (
                          <td className="px-2 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200">
                            {formatCurrency(gastoSubtotal)}
                          </td>
                        )}
                        {visibleColumns.iva && (
                          <td className="px-2 py-1.5 text-right font-mono text-slate-500 dark:text-slate-400">
                            {formatCurrency(gastoIVA)}
                          </td>
                        )}
                        {visibleColumns.total && (
                          <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                            {formatCurrency(gastoTotal)}
                          </td>
                        )}
                        {visibleColumns.fecha && (
                          <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400">
                            {formatDate(gasto.fecha_gasto)}
                          </td>
                        )}
                        {visibleColumns.acciones && (
                          <td className="px-2 py-1 text-center">
                            <div className="flex gap-1 justify-center">
                              {/* Icono para ver documentos (PDF/XML) */}
                              {(gasto.factura_pdf_url || gasto.factura_xml_url) && (
                                <div className="relative group">
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 hover:bg-purple-100 rounded text-purple-600"
                                    title="Ver documentos"
                                  >
                                    <File className="w-3 h-3" />
                                  </button>
                                  {/* Dropdown de documentos */}
                                  <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 bg-white border shadow-lg rounded py-1 min-w-[120px]">
                                    {gasto.factura_pdf_url && (
                                      <a
                                        href={gasto.factura_pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-700"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <FileText className="w-3.5 h-3.5 text-red-500" />
                                        PDF
                                        <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
                                      </a>
                                    )}
                                    {gasto.factura_xml_url && (
                                      <a
                                        href={gasto.factura_xml_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-700"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <File className="w-3.5 h-3.5 text-green-600" />
                                        XML
                                        <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                              {/* Botón Devolución - solo para gastos positivos */}
                              {canUpdate('gastos') && !isRetorno && (gasto.total || 0) > 0 && onCreateRefund && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCreateRefund(gasto);
                                  }}
                                  className="p-1 hover:bg-orange-100 rounded text-orange-600"
                                  title="Registrar devolución de este gasto"
                                >
                                  <Undo2 className="w-3 h-3" />
                                </button>
                              )}
                              {canDelete('gastos') && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(gasto); }}
                                  className="p-1 hover:bg-red-100 rounded text-red-500"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>

                      {/* Sub-tabla de materiales expandida */}
                      {
                        esMaterialConsolidado && isExpanded && materialLines.length > 0 && (() => {
                          // Ordenar líneas de material
                          const sortedLines = [...materialLines].sort((a, b) => {
                            if (!materialSortConfig) return 0;
                            const { column, direction } = materialSortConfig;
                            let aValue: any, bValue: any;
                            switch (column) {
                              case 'producto': aValue = a.producto_nombre; bValue = b.producto_nombre; break;
                              case 'cantidad': aValue = a.cantidad; bValue = b.cantidad; break;
                              case 'unidad': aValue = a.unidad; bValue = b.unidad; break;
                              case 'costo': aValue = a.costo_unitario; bValue = b.costo_unitario; break;
                              case 'subtotal': aValue = a.subtotal; bValue = b.subtotal; break;
                              default: return 0;
                            }
                            if (typeof aValue === 'string') {
                              return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                            }
                            return direction === 'asc' ? aValue - bValue : bValue - aValue;
                          });

                          return (
                            <tr>
                              <td colSpan={9} className="p-0">
                                <div className="bg-blue-50 border-l-4 border-blue-400 ml-4 mr-2 my-1 rounded overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead className="bg-blue-100">
                                      <tr>
                                        <th className="px-2 py-1 text-left font-semibold text-blue-800 cursor-pointer hover:bg-blue-200" onClick={() => handleMaterialSort('producto')}>
                                          Producto <MaterialSortIcon column="producto" />
                                        </th>
                                        <th className="px-2 py-1 text-center font-semibold text-blue-800 w-16 cursor-pointer hover:bg-blue-200" onClick={() => handleMaterialSort('cantidad')}>
                                          Cant. <MaterialSortIcon column="cantidad" />
                                        </th>
                                        <th className="px-2 py-1 text-center font-semibold text-blue-800 w-16 cursor-pointer hover:bg-blue-200" onClick={() => handleMaterialSort('unidad')}>
                                          Unidad <MaterialSortIcon column="unidad" />
                                        </th>
                                        <th className="px-2 py-1 text-right font-semibold text-blue-800 w-20 cursor-pointer hover:bg-blue-200" onClick={() => handleMaterialSort('costo')}>
                                          C. Unit. <MaterialSortIcon column="costo" />
                                        </th>
                                        <th className="px-2 py-1 text-right font-semibold text-blue-800 w-24 cursor-pointer hover:bg-blue-200" onClick={() => handleMaterialSort('subtotal')}>
                                          Subtotal <MaterialSortIcon column="subtotal" />
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sortedLines.map((linea, lineIdx) => (
                                        <tr key={lineIdx} className="border-t border-blue-200 hover:bg-blue-100/50">
                                          <td className="px-2 py-1 flex items-center gap-1">
                                            <Package className="w-3 h-3 text-blue-400" />
                                            <span className="font-medium text-gray-800">{linea.producto_nombre}</span>
                                          </td>
                                          <td className="px-2 py-1 text-center font-semibold text-blue-700">{linea.cantidad}</td>
                                          <td className="px-2 py-1 text-center text-gray-500">{linea.unidad}</td>
                                          <td className="px-2 py-1 text-right text-gray-600">{formatCurrency(linea.costo_unitario)}</td>
                                          <td className="px-2 py-1 text-right font-semibold text-blue-700">{formatCurrency(linea.subtotal)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot style={{ backgroundColor: `${colors.primary}20` }}>
                                      <tr>
                                        <td colSpan={4} className="px-2 py-1 text-right font-bold" style={{ color: colors.primaryDark }}>TOTAL:</td>
                                        <td className="px-2 py-1 text-right font-bold" style={{ color: colors.primaryDark }}>{formatCurrency(gastoTotal)}</td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          );
                        })()
                      }
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {/* TOTAL EN FOOTER */}
            {gastosFilter.length > 0 && (
              <tfoot style={{ backgroundColor: colors.primaryDark }} className="text-white font-bold">
                <tr>
                  <td colSpan={4} className="px-2 py-2 text-right">TOTAL GASTOS</td>
                  <td className="px-2 py-2 text-right font-mono">{formatCurrency(subtotalGastos)}</td>
                  <td className="px-2 py-2 text-right font-mono">{formatCurrency(totalGastosConIVA - subtotalGastos)}</td>
                  <td className="px-2 py-2 text-right font-mono">{formatCurrency(totalGastosConIVA)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </motion.div >
  );
};

const ProvisionesTab: React.FC<{
  provisiones: any[];
  evento: any;
  showIVA?: boolean;
  isCompactView?: boolean;
  onRefresh: () => void;
  onCreateProvision: () => void;
  onEditProvision: (provision: any) => void;
  onConvertToGasto: (provision: any) => void;  // Nueva prop para convertir a gasto
}> = ({ provisiones, evento, showIVA = false, isCompactView = false, onRefresh, onCreateProvision, onEditProvision, onConvertToGasto }) => {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { paletteConfig, isDark } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<'todos' | 'combustible' | 'materiales' | 'rh' | 'sps'>('todos');

  // Estado para ordenamiento de columnas
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  // Estado para mostrar/ocultar menú de columnas
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Columnas disponibles con su configuración
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('provisiones_visible_columns');
    return saved ? JSON.parse(saved) : {
      status: true,
      categoria: true,
      proveedor: true,
      concepto: true,
      subtotal: true,
      iva: true,
      total: true,
      fecha: true,
      acciones: true
    };
  });

  // Guardar columnas visibles en localStorage
  const toggleColumn = (column: string) => {
    const newColumns = { ...visibleColumns, [column]: !visibleColumns[column] };
    setVisibleColumns(newColumns);
    localStorage.setItem('provisiones_visible_columns', JSON.stringify(newColumns));
  };

  // Función para ordenar
  const handleSort = (column: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.column === column && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ column, direction });
  };

  // Icono de ordenamiento
  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.column !== column) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  // Colores dinámicos de la paleta con soporte para modo oscuro
  const colors = {
    primary: paletteConfig.primary,
    primaryLight: paletteConfig.shades[100],
    primaryDark: paletteConfig.shades[700],
    secondary: paletteConfig.secondary,
    // Colores sobrios para filas alternadas (blanco/gris muy tenue + hover menta)
    rowEven: isDark ? '#1E293B' : '#FFFFFF',
    rowOdd: isDark ? '#263244' : '#F8FAFC',
    rowHover: isDark ? '#334155' : '#E0F2F1',
    // Textos según modo
    textPrimary: isDark ? '#F8FAFC' : '#1E293B',
    textSecondary: isDark ? '#CBD5E1' : '#64748B',
    textMuted: isDark ? '#94A3B8' : '#9CA3AF',
  };

  const handleDelete = async (provision: any) => {
    const motivo = prompt(`¿Por qué desea eliminar esta provisión de ${formatCurrency(provision.total)}?\n\n(Escriba el motivo o deje vacío para cancelar)`);

    if (motivo === null) return;
    if (motivo.trim() === '') {
      toast.error('Debe proporcionar un motivo para eliminar');
      return;
    }

    try {
      const userAgent = navigator.userAgent;
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const userEmail = (await supabase.auth.getUser()).data.user?.email;

      // Soft delete
      const { error: updateError } = await supabase
        .from('evt_provisiones_erp')
        .update({
          activo: false,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          deleted_reason: motivo,
          deleted_user_agent: userAgent
        })
        .eq('id', provision.id);

      if (updateError) throw updateError;

      // Registrar en auditoría
      await supabase
        .from('audit_eliminaciones_financieras')
        .insert({
          tabla_origen: 'evt_provisiones_erp',
          registro_id: provision.id,
          evento_id: provision.evento_id,
          company_id: provision.company_id,
          registro_snapshot: provision,
          concepto: provision.concepto,
          subtotal: provision.subtotal,
          iva: provision.iva,
          total: provision.total,
          deleted_by: userId,
          deleted_by_email: userEmail,
          deleted_reason: motivo,
          deleted_user_agent: userAgent
        });

      toast.success('Provisión eliminada');
      onRefresh();
    } catch (error) {
      console.error('Error deleting provision:', error);
      toast.error('Error al eliminar provisión');
    }
  };

  // Calcular totales
  const totalProvisionesConIVA = provisiones.reduce((sum, p) => sum + (p.total || 0), 0);
  const subtotalProvisiones = evento.provisiones_subtotal || (totalProvisionesConIVA / 1.16);
  const ivaProvisiones = totalProvisionesConIVA - subtotalProvisiones;
  const totalProvisiones = showIVA ? totalProvisionesConIVA : subtotalProvisiones;

  // SubTabs por categoría (igual que Gastos)
  const subTabs = [
    { id: 'todos', label: 'Todos', count: provisiones.length },
    { id: 'combustible', label: '⛽ Combustible/Peaje', count: provisiones.filter(p => p.categoria?.nombre === 'Combustible/Peaje' || p.categoria?.clave === 'combustible').length },
    { id: 'materiales', label: '🛠️ Materiales', count: provisiones.filter(p => p.categoria?.nombre === 'Materiales' || p.categoria?.clave === 'materiales').length },
    { id: 'rh', label: '👥 Recursos Humanos', count: provisiones.filter(p => p.categoria?.nombre === 'Recursos Humanos' || p.categoria?.clave === 'rh').length },
    { id: 'sps', label: '💳 Solicitudes de Pago', count: provisiones.filter(p => p.categoria?.nombre === 'Solicitudes de Pago' || p.categoria?.clave === 'sps').length }
  ];

  // Filtrar provisiones por subtab activo
  const provisionesFilteredBase = activeSubTab === 'todos'
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

  // Aplicar ordenamiento a provisiones
  const provisionesFiltered = sortConfig
    ? [...provisionesFilteredBase].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortConfig.column) {
        case 'status':
          aValue = a.estado || 'pendiente';
          bValue = b.estado || 'pendiente';
          break;
        case 'categoria':
          aValue = a.categoria?.nombre || '';
          bValue = b.categoria?.nombre || '';
          break;
        case 'proveedor':
          aValue = a.proveedor?.razon_social || '';
          bValue = b.proveedor?.razon_social || '';
          break;
        case 'concepto':
          aValue = a.concepto || '';
          bValue = b.concepto || '';
          break;
        case 'subtotal':
          aValue = (a.total || 0) / 1.16;
          bValue = (b.total || 0) / 1.16;
          break;
        case 'iva':
          aValue = (a.total || 0) - ((a.total || 0) / 1.16);
          bValue = (b.total || 0) - ((b.total || 0) / 1.16);
          break;
        case 'total':
          aValue = a.total || 0;
          bValue = b.total || 0;
          break;
        case 'fecha':
          aValue = a.fecha_estimada || '';
          bValue = b.fecha_estimada || '';
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return sortConfig.direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    })
    : provisionesFilteredBase;

  // Calcular totales por categoría
  const provCombustible = provisiones.filter(p => p.categoria?.nombre === 'Combustible/Peaje' || p.categoria?.clave === 'combustible');
  const provMateriales = provisiones.filter(p => p.categoria?.nombre === 'Materiales' || p.categoria?.clave === 'materiales');
  const provRH = provisiones.filter(p => p.categoria?.nombre === 'Recursos Humanos' || p.categoria?.clave === 'rh');
  const provSPs = provisiones.filter(p => p.categoria?.nombre === 'Solicitudes de Pago' || p.categoria?.clave === 'sps');

  // Totales con IVA por categoría
  const totalProvCombustibleConIVA = provCombustible.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalProvMaterialesConIVA = provMateriales.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalProvRHConIVA = provRH.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalProvSPsConIVA = provSPs.reduce((sum, p) => sum + (p.total || 0), 0);

  // Totales según showIVA
  const totalProvCombustible = showIVA ? totalProvCombustibleConIVA : (totalProvCombustibleConIVA / 1.16);
  const totalProvMateriales = showIVA ? totalProvMaterialesConIVA : (totalProvMaterialesConIVA / 1.16);
  const totalProvRH = showIVA ? totalProvRHConIVA : (totalProvRHConIVA / 1.16);
  const totalProvSPs = showIVA ? totalProvSPsConIVA : (totalProvSPsConIVA / 1.16);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4"
    >
      {/* FICHAS DE CATEGORÍAS - Diseño compacto y sobrio (igual que GastosTab) */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {/* FICHAS DE CATEGORÍA - ESTILO PILL SOBRIO */}
        {[
          { id: 'todos' as const, icon: '📦', label: 'Todas', count: provisiones.length, total: totalProvisiones },
          { id: 'combustible' as const, icon: '⛽', label: 'Combustible', count: provCombustible.length, total: totalProvCombustible },
          { id: 'materiales' as const, icon: '🛠️', label: 'Materiales', count: provMateriales.length, total: totalProvMateriales },
          { id: 'rh' as const, icon: '👷', label: 'Personal', count: provRH.length, total: totalProvRH },
          { id: 'sps' as const, icon: '💳', label: 'Solicitudes', count: provSPs.length, total: totalProvSPs }
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveSubTab(cat.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-sm transition-all ${activeSubTab === cat.id
              ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
          >
            <span className="text-base">{cat.icon}</span>
            <span className="font-medium">{cat.label}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${activeSubTab === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{cat.count}</span>
            <span className={`font-bold ${activeSubTab === cat.id ? 'text-white' : 'text-slate-800'}`}>
              {formatCurrency(cat.total)}
            </span>
          </button>
        ))}

        {/* SEPARADOR */}
        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        {/* BOTÓN NUEVA PROVISIÓN - AL LADO */}
        {canCreate('provisiones') && (
          <button
            onClick={onCreateProvision}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border-2 border-dashed text-xs font-medium transition-all hover:shadow-sm"
            style={{ borderColor: colors.secondary, color: colors.secondary, backgroundColor: `${colors.secondary}08` }}
          >
            <span>➕</span>
            <span>Provisión</span>
          </button>
        )}
      </div>

      {/* CONTENEDOR DEL LISTADO */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

        {/* VISTA COMPACTA - TIPO EXCEL PARA PROVISIONES */}
        {isCompactView ? (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-800 text-white">
                <tr>
                  {visibleColumns.status && (
                    <th onClick={() => handleSort('status')} className="px-2 py-1.5 text-left font-semibold cursor-pointer hover:bg-gray-700 select-none">
                      Estado <SortIcon column="status" />
                    </th>
                  )}
                  {visibleColumns.categoria && (
                    <th onClick={() => handleSort('categoria')} className="px-2 py-1.5 text-left font-semibold cursor-pointer hover:bg-gray-700 select-none">
                      Categoría <SortIcon column="categoria" />
                    </th>
                  )}
                  {visibleColumns.proveedor && (
                    <th onClick={() => handleSort('proveedor')} className="px-2 py-1.5 text-left font-semibold cursor-pointer hover:bg-gray-700 select-none">
                      Proveedor <SortIcon column="proveedor" />
                    </th>
                  )}
                  {visibleColumns.concepto && (
                    <th onClick={() => handleSort('concepto')} className="px-2 py-1.5 text-left font-semibold cursor-pointer hover:bg-gray-700 select-none">
                      Concepto <SortIcon column="concepto" />
                    </th>
                  )}
                  {visibleColumns.subtotal && (
                    <th onClick={() => handleSort('subtotal')} className="px-2 py-1.5 text-right font-semibold cursor-pointer hover:bg-gray-700 select-none">
                      Sub-Total <SortIcon column="subtotal" />
                    </th>
                  )}
                  {visibleColumns.iva && (
                    <th onClick={() => handleSort('iva')} className="px-2 py-1.5 text-right font-semibold cursor-pointer hover:bg-gray-700 select-none">
                      I.V.A <SortIcon column="iva" />
                    </th>
                  )}
                  {visibleColumns.total && (
                    <th onClick={() => handleSort('total')} className="px-2 py-1.5 text-right font-semibold cursor-pointer hover:bg-gray-700 select-none">
                      Total <SortIcon column="total" />
                    </th>
                  )}
                  {visibleColumns.fecha && (
                    <th onClick={() => handleSort('fecha')} className="px-2 py-1.5 text-center font-semibold cursor-pointer hover:bg-gray-700 select-none">
                      Fecha Est. <SortIcon column="fecha" />
                    </th>
                  )}
                  {visibleColumns.acciones && (
                    <th className="px-2 py-1.5 text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <span>Acción</span>
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowColumnMenu(!showColumnMenu); }}
                            className="p-0.5 hover:bg-gray-600 rounded"
                            title="Configurar columnas"
                          >
                            ⚙️
                          </button>
                          {showColumnMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[150px] p-2 text-gray-800">
                              <div className="text-[10px] font-bold text-gray-600 mb-1 pb-1 border-b">Columnas</div>
                              {[
                                { key: 'status', label: 'Estado' },
                                { key: 'categoria', label: 'Categoría' },
                                { key: 'proveedor', label: 'Proveedor' },
                                { key: 'concepto', label: 'Concepto' },
                                { key: 'subtotal', label: 'Sub-Total' },
                                { key: 'iva', label: 'I.V.A' },
                                { key: 'total', label: 'Total' },
                                { key: 'fecha', label: 'Fecha Est.' },
                              ].map(col => (
                                <label key={col.key} className="flex items-center gap-1 py-0.5 px-1 hover:bg-gray-100 rounded cursor-pointer text-[10px]">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns[col.key]}
                                    onChange={() => toggleColumn(col.key)}
                                    className="w-2.5 h-2.5"
                                  />
                                  {col.label}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {provisionesFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No hay provisiones {activeSubTab !== 'todos' ? 'en esta categoría' : 'registradas'}
                    </td>
                  </tr>
                ) : (
                  provisionesFiltered.map((provision, idx) => {
                    const provTotal = provision.total || 0;
                    const provSubtotal = provision.subtotal || (provTotal / 1.16);
                    const provIVA = provision.iva || (provTotal - provSubtotal);

                    // Colores de fila: blanco/gris alternado + hover menta suave (homologado)
                    const rowBgColor = idx % 2 === 0 ? colors.rowEven : colors.rowOdd;
                    const rowHoverColor = colors.rowHover;

                    // Color de categoría
                    const catColor = provision.categoria?.color || '#6B7280';
                    const catName = provision.categoria?.nombre || 'Sin categoría';

                    return (
                      <tr
                        key={provision.id}
                        className="transition-colors cursor-pointer"
                        style={{ backgroundColor: rowBgColor }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = rowHoverColor}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = rowBgColor}
                        onClick={() => onEditProvision(provision)}
                      >
                        {visibleColumns.status && (
                          <td className="px-2 py-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-bold ${provision.estado === 'pagado'
                                ? 'bg-slate-700 text-white'
                                : provision.estado === 'aprobado'
                                  ? 'bg-slate-600 text-white'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-200'
                                }`}
                            >
                              {(provision.estado || 'pendiente').toUpperCase()}
                            </span>
                          </td>
                        )}
                        {visibleColumns.categoria && (
                          <td className="px-2 py-1.5">
                            <span
                              className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-200"
                            >
                              {catName}
                            </span>
                          </td>
                        )}
                        {visibleColumns.proveedor && (
                          <td className="px-2 py-1.5 max-w-[150px] truncate text-slate-600 dark:text-slate-300">
                            {provision.proveedor?.razon_social || 'Sin proveedor'}
                          </td>
                        )}
                        {visibleColumns.concepto && (
                          <td className="px-2 py-1.5 max-w-[180px] truncate font-medium text-slate-800 dark:text-slate-100">
                            {provision.concepto}
                          </td>
                        )}
                        {visibleColumns.subtotal && (
                          <td className="px-2 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200">
                            {formatCurrency(provSubtotal)}
                          </td>
                        )}
                        {visibleColumns.iva && (
                          <td className="px-2 py-1.5 text-right font-mono text-slate-500 dark:text-slate-400">
                            {formatCurrency(provIVA)}
                          </td>
                        )}
                        {visibleColumns.total && (
                          <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                            {formatCurrency(provTotal)}
                          </td>
                        )}
                        {visibleColumns.fecha && (
                          <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400">
                            {provision.fecha_estimada ? formatDate(provision.fecha_estimada) : '—'}
                          </td>
                        )}
                        {visibleColumns.acciones && (
                          <td className="px-2 py-1 text-center">
                            <div className="flex gap-1 justify-center">
                              {/* Botón Convertir a Gasto */}
                              {canUpdate('gastos') && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onConvertToGasto(provision); }}
                                  className="p-1 hover:bg-emerald-100 rounded text-emerald-600"
                                  title="Convertir a Gasto"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                              {canDelete('gastos') && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(provision); }}
                                  className="p-1 hover:bg-red-100 rounded text-red-500"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* TOTAL EN FOOTER */}
              {provisionesFiltered.length > 0 && (
                <tfoot style={{ backgroundColor: colors.primaryDark }} className="text-white font-bold">
                  <tr>
                    <td colSpan={4} className="px-2 py-2 text-right">TOTAL PROVISIONES</td>
                    <td className="px-2 py-2 text-right font-mono">{formatCurrency(subtotalProvisiones)}</td>
                    <td className="px-2 py-2 text-right font-mono">{formatCurrency(ivaProvisiones)}</td>
                    <td className="px-2 py-2 text-right font-mono">{formatCurrency(totalProvisionesConIVA)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          /* VISTA VISUAL - TARJETAS (ACTUAL) */
          <div className="space-y-3">
            {provisionesFiltered.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay provisiones {activeSubTab !== 'todos' ? 'en esta categoría' : 'registradas'}</p>
                <p className="text-sm text-gray-400 mt-1">Las provisiones son gastos estimados que aún no se han pagado</p>
              </div>
            ) : (
              provisionesFiltered.map(provision => (
                <div key={provision.id} className="bg-white border rounded-lg p-2 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-5 gap-x-3 gap-y-0.5 items-center">
                      <div className="col-span-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${provision.estado === 'pagado' ? 'bg-blue-100 text-blue-700' :
                          provision.estado === 'aprobado' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                          {(provision.estado || 'pendiente').toUpperCase()}
                        </span>
                      </div>
                      <div className="col-span-1">
                        <h4 className="font-medium text-gray-900 text-sm truncate">{provision.concepto}</h4>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-700">{formatCurrency(provision.total)}</span>
                      </div>
                      <div>
                        {provision.categoria && (
                          <Badge
                            variant="default"
                            className="text-[9px] py-0.5"
                            style={{ backgroundColor: (provision.categoria.color || '#6B7280') + '20', color: provision.categoria.color || '#6B7280' }}
                          >
                            {provision.categoria.nombre}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {provision.fecha_estimada ? formatDate(provision.fecha_estimada) : 'Sin fecha'}
                      </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      {/* Botón Convertir a Gasto */}
                      {canUpdate('gastos') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onConvertToGasto(provision); }}
                          className="p-1.5 rounded-lg transition-colors border bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 border-emerald-200"
                          title="Convertir a Gasto"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canUpdate('gastos') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditProvision(provision); }}
                          className="p-1.5 rounded-lg transition-colors border"
                          style={{
                            backgroundColor: `${colors.primary}15`,
                            borderColor: `${colors.primary}30`,
                            color: colors.primary
                          }}
                          title="Editar provisión"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete('gastos') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(provision); }}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-colors border border-red-200"
                          title="Eliminar provisión"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
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
