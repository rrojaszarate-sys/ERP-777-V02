/**
 * PÁGINA: GASTOS NO IMPACTADOS (GNI) - VERSIÓN MEJORADA
 * Dashboard con KPIs animados, gráficas y CRUD completo
 * Paleta MADE: Menta/Mint
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Download,
  Upload,
  FileText,
  Filter,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Settings,
  Users,
  Building,
  Tag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Edit,
  Trash2,
  PieChart,
  BarChart3,
  Wallet,
  CreditCard,
  Save,
  FileSpreadsheet,
  Receipt,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Banknote,
  Calendar,
  TrendingUp as TrendUp,
  HelpCircle,
  Eye,
  EyeOff,
  LayoutGrid,
  LayoutList,
  Columns,
  Table2
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthProvider';
import {
  fetchGastosNoImpactados,
  fetchClavesGasto,
  fetchFormasPago,
  fetchProveedores,
  fetchEjecutivos,
  getPeriodoActual,
  getPeriodosDisponibles,
  createClaveGasto,
  updateClaveGasto,
  createProveedor,
  updateProveedor,
  createEjecutivo,
  createFormaPago,
  fetchResumenAnual
} from '../services/gastosNoImpactadosService';
import * as XLSX from 'xlsx';
import type {
  GastoNoImpactadoView,
  ClaveGasto,
  FormaPago,
  Proveedor,
  Ejecutivo,
  GNIFiltros
} from '../types/gastosNoImpactados';
import { GastoFormModal } from '../components/GastoFormModal';
import { ImportExcelModal } from '../components/ImportExcelModal';
import { ExportPDFModal } from '../components/ExportPDFModal';
import { supabase } from '../../../core/config/supabase';
import toast from 'react-hot-toast';

// Colores paleta MADE Mint - Tonos monocromáticos para gráficas minimalistas
const MINT_COLORS = ['#0D9488', '#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4', '#CCFBF1'];

// Colores por tipo de cuenta - Tonos de Teal/Mint (minimalista)
const CUENTA_COLORS: Record<string, string> = {
  'GASTOS FIJOS': '#0F766E',      // Teal 700
  'MATERIALES': '#0D9488',         // Teal 600
  'MANTENIMIENTO': '#14B8A6',      // Teal 500 (principal)
  'ACTIVOS FIJOS': '#2DD4BF',      // Teal 400
  'LOGÍSTICA': '#5EEAD4',          // Teal 300
  'DISEÑOS': '#99F6E4',            // Teal 200
  'TOKA': '#115E59',               // Teal 800
  'GASTOS VARIOS': '#134E4A',      // Teal 900
  'EVENTOS INTERNOS': '#CCFBF1',   // Teal 100
  'CAJA CHICA': '#2DD4BF',         // Teal 400
  'DEFAULT': '#5EEAD4'             // Teal 300 (para cuentas no mapeadas)
};

// Función para obtener color de cuenta
const getCuentaColor = (cuenta: string): string => {
  const upperCuenta = (cuenta || '').toUpperCase();
  for (const [key, color] of Object.entries(CUENTA_COLORS)) {
    if (upperCuenta.includes(key) || key.includes(upperCuenta)) {
      return color;
    }
  }
  return CUENTA_COLORS.DEFAULT;
};

// Colores de formas de pago - Tonos Teal (minimalista, coherente con paleta principal)
const BANK_COLORS: Record<string, string> = {
  // Todos los bancos y métodos de pago usan tonos de teal para mantener coherencia visual
  'SANTANDER': '#0F766E',
  'BBVA': '#115E59',
  'BANORTE': '#134E4A',
  'HSBC': '#0D9488',
  'BANAMEX': '#14B8A6',
  'CITIBANAMEX': '#14B8A6',
  'SCOTIABANK': '#2DD4BF',
  'BANREGIO': '#5EEAD4',
  'INBURSA': '#99F6E4',
  'BAJIO': '#0F766E',
  'AFIRME': '#0D9488',
  'MULTIVA': '#115E59',
  // Fintechs y métodos
  'KUSPIT': '#2DD4BF',
  'ALBO': '#5EEAD4',
  'NUBANK': '#14B8A6',
  'MERCADOPAGO': '#0D9488',
  'PAYPAL': '#115E59',
  'CLIP': '#2DD4BF',
  'STRIPE': '#0F766E',
  'TRANSFERENCIA': '#14B8A6',
  'TARJETA': '#0D9488',
  'EFECTIVO': '#2DD4BF',
  'CHEQUE': '#5EEAD4',
  'CREDITO': '#99F6E4',
  'DEFAULT': '#5EEAD4',
};

// Función para obtener color de forma de pago
const getFormaPagoColor = (formaPago: string): string => {
  const fp = formaPago.toUpperCase();
  // Buscar coincidencia exacta o parcial con nombres de bancos
  for (const [key, color] of Object.entries(BANK_COLORS)) {
    if (fp.includes(key)) return color;
  }
  return BANK_COLORS.DEFAULT;
};

export const GastosNoImpactadosPage = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const [gastos, setGastos] = useState<GastoNoImpactadoView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Catálogos
  const [claves, setClaves] = useState<ClaveGasto[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);

  // Filtros
  const [filtros, setFiltros] = useState<GNIFiltros>({
    periodo: getPeriodoActual()
  });
  const [showFilters, setShowFilters] = useState(false);

  // Modales
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportPDFModal, setShowExportPDFModal] = useState(false);
  const [gastoEditar, setGastoEditar] = useState<GastoNoImpactadoView | null>(null);

  // Administración de catálogos
  const [showCatalogosDropdown, setShowCatalogosDropdown] = useState(false);
  const [catalogoActivo, setCatalogoActivo] = useState<'claves' | 'ejecutivos' | 'proveedores' | 'formasPago' | null>(null);

  // Dashboard y paginación
  const [showDashboard, setShowDashboard] = useState(false); // Oculto por default
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Ordenamiento
  type SortField = 'fecha_gasto' | 'proveedor' | 'concepto' | 'clave' | 'cuenta' | 'subcuenta' | 'forma_pago' | 'subtotal' | 'iva' | 'total' | 'validacion' | 'status_pago' | 'ejecutivo' | 'folio_factura';
  const [sortField, setSortField] = useState<SortField>('fecha_gasto');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Resumen anual para gráficas
  const [resumenAnual, setResumenAnual] = useState<any[]>([]);

  // Guía de ayuda
  const [showHelp, setShowHelp] = useState(false);

  // Configuración de columnas visibles
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    fecha_gasto: true,
    proveedor: true,
    concepto: true,
    clave: true,
    cuenta: true,
    subcuenta: true,
    forma_pago: true,
    subtotal: true,
    iva: true,
    total: true,
    validacion: true,
    status_pago: true,
    ejecutivo: false,
    folio_factura: false,
  });

  // Modal de reporte por período
  const [showReportModal, setShowReportModal] = useState(false);

  // Filtros por columna
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Periodos disponibles
  const periodos = useMemo(() => getPeriodosDisponibles(2025), []);

  // Cargar datos
  useEffect(() => {
    if (companyId) {
      loadCatalogos();
      loadGastos();
      loadResumenAnual();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      loadGastos();
    }
  }, [filtros]);

  const loadResumenAnual = async () => {
    if (!companyId) return;
    try {
      const data = await fetchResumenAnual(companyId, 2025);
      setResumenAnual(data);
    } catch (error) {
      console.error('Error cargando resumen anual:', error);
    }
  };

  const loadCatalogos = async () => {
    if (!companyId) return;
    try {
      const [clavesData, formasData, provData, ejData] = await Promise.all([
        fetchClavesGasto(companyId),
        fetchFormasPago(companyId),
        fetchProveedores(companyId),
        fetchEjecutivos(companyId)
      ]);
      setClaves(clavesData);
      setFormasPago(formasData);
      setProveedores(provData);
      setEjecutivos(ejData);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const loadGastos = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await fetchGastosNoImpactados(companyId, filtros);
      setGastos(data);
    } catch (error) {
      console.error('Error cargando gastos:', error);
      toast.error('Error al cargar gastos');
    } finally {
      setLoading(false);
    }
  };

  // Función de ordenamiento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Filtrar y ordenar
  const gastosFiltrados = useMemo(() => {
    let filtered = gastos;

    // Filtro por búsqueda global
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(g =>
        g.proveedor?.toLowerCase().includes(term) ||
        g.concepto?.toLowerCase().includes(term) ||
        g.clave?.toLowerCase().includes(term) ||
        g.cuenta?.toLowerCase().includes(term) ||
        g.subcuenta?.toLowerCase().includes(term) ||
        g.forma_pago?.toLowerCase().includes(term)
      );
    }

    // Filtros por columna
    Object.entries(columnFilters).forEach(([colKey, filterVal]) => {
      if (filterVal) {
        const term = filterVal.toLowerCase();
        filtered = filtered.filter(g => {
          const val = String((g as any)[colKey] ?? '').toLowerCase();
          return val.includes(term);
        });
      }
    });

    // Ordenamiento
    filtered = [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Manejo de nulls
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      // Comparación numérica para campos de montos
      if (['subtotal', 'iva', 'total'].includes(sortField)) {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [gastos, searchTerm, sortField, sortDirection, columnFilters]);

  // Totales
  const totales = useMemo(() => {
    return gastosFiltrados.reduce((acc, g) => ({
      subtotal: acc.subtotal + (g.subtotal || 0),
      iva: acc.iva + (g.iva || 0),
      total: acc.total + (g.total || 0),
      cantidad: acc.cantidad + 1
    }), { subtotal: 0, iva: 0, total: 0, cantidad: 0 });
  }, [gastosFiltrados]);

  // Dashboard data completo
  const dashboardData = useMemo(() => {
    const porValidacion = {
      correctos: gastosFiltrados.filter(g => g.validacion === 'correcto'),
      pendientes: gastosFiltrados.filter(g => g.validacion === 'pendiente'),
      revisar: gastosFiltrados.filter(g => g.validacion === 'revisar')
    };
    const porPago = {
      pagados: gastosFiltrados.filter(g => g.status_pago === 'pagado'),
      pendientes: gastosFiltrados.filter(g => g.status_pago === 'pendiente')
    };
    // Por cuenta
    const porCuenta: Record<string, { total: number; count: number }> = {};
    gastosFiltrados.forEach(g => {
      const cuenta = g.cuenta || 'Sin clasificar';
      if (!porCuenta[cuenta]) porCuenta[cuenta] = { total: 0, count: 0 };
      porCuenta[cuenta].total += g.total || 0;
      porCuenta[cuenta].count++;
    });
    // Por forma de pago
    const porFormaPago: Record<string, { total: number; count: number }> = {};
    gastosFiltrados.forEach(g => {
      const fp = g.forma_pago || 'Sin forma de pago';
      if (!porFormaPago[fp]) porFormaPago[fp] = { total: 0, count: 0 };
      porFormaPago[fp].total += g.total || 0;
      porFormaPago[fp].count++;
    });
    // Top proveedores
    const porProveedor: Record<string, number> = {};
    gastosFiltrados.forEach(g => {
      const prov = g.proveedor || 'Sin proveedor';
      porProveedor[prov] = (porProveedor[prov] || 0) + (g.total || 0);
    });
    const topProveedores = Object.entries(porProveedor).sort((a, b) => b[1] - a[1]).slice(0, 5);
    // Por mes (usando todos los gastos, no solo filtrados)
    const porMes: Record<string, number> = {};
    gastos.forEach(g => {
      const mes = g.fecha_gasto?.substring(0, 7) || 'Sin fecha';
      porMes[mes] = (porMes[mes] || 0) + (g.total || 0);
    });

    return {
      porValidacion,
      porPago,
      porCuenta,
      porFormaPago,
      porMes,
      topProveedores,
      totalCorrectosAmount: porValidacion.correctos.reduce((s, g) => s + (g.total || 0), 0),
      totalPendientesAmount: porValidacion.pendientes.reduce((s, g) => s + (g.total || 0), 0),
      totalPagadosAmount: porPago.pagados.reduce((s, g) => s + (g.total || 0), 0),
      totalPorPagarAmount: porPago.pendientes.reduce((s, g) => s + (g.total || 0), 0)
    };
  }, [gastosFiltrados, gastos]);

  // Paginación
  const totalPages = Math.ceil(gastosFiltrados.length / itemsPerPage);
  const gastosPaginados = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return gastosFiltrados.slice(start, start + itemsPerPage);
  }, [gastosFiltrados, currentPage, itemsPerPage]);

  // Contadores por estado (legacy)
  const contadores = useMemo(() => {
    return {
      correctos: dashboardData.porValidacion.correctos.length,
      pendientes: dashboardData.porValidacion.pendientes.length,
      pagados: dashboardData.porPago.pagados.length
    };
  }, [dashboardData]);

  const handleEditGasto = (gasto: GastoNoImpactadoView) => {
    setGastoEditar(gasto);
    setShowGastoModal(true);
  };

  const handleCloseModal = () => {
    setShowGastoModal(false);
    setGastoEditar(null);
  };

  const handleGastoSaved = () => {
    handleCloseModal();
    loadGastos();
    loadCatalogos(); // Recargar por si se crearon nuevos proveedores/ejecutivos
    toast.success(gastoEditar ? 'Gasto actualizado' : 'Gasto creado');
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    loadGastos();
    loadCatalogos();
    toast.success('Importación completada');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPeriodoLabel = (periodo: string) => {
    const [anio, mes] = periodo.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${meses[parseInt(mes) - 1]} ${anio}`;
  };

  // Exportar a Excel
  const handleExportExcel = () => {
    const dataToExport = gastosFiltrados.map(g => ({
      'Fecha': g.fecha_gasto ? new Date(g.fecha_gasto).toLocaleDateString('es-MX') : '',
      'Proveedor': g.proveedor || '',
      'Concepto': g.concepto || '',
      'Clave': g.clave || '',
      'Cuenta': g.cuenta || '',
      'Subcuenta': g.subcuenta || '',
      'Forma de Pago': g.forma_pago || '',
      'Subtotal': g.subtotal || 0,
      'IVA': g.iva || 0,
      'Total': g.total || 0,
      'Validación': g.validacion || '',
      'Status Pago': g.status_pago || '',
      'Ejecutivo': g.ejecutivo || '',
      'Folio Factura': g.folio_factura || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');

    // Ajustar anchos de columna
    const colWidths = [
      { wch: 12 }, // Fecha
      { wch: 30 }, // Proveedor
      { wch: 40 }, // Concepto
      { wch: 15 }, // Clave
      { wch: 20 }, // Cuenta
      { wch: 25 }, // Subcuenta
      { wch: 20 }, // Forma de Pago
      { wch: 12 }, // Subtotal
      { wch: 10 }, // IVA
      { wch: 12 }, // Total
      { wch: 12 }, // Validación
      { wch: 12 }, // Status Pago
      { wch: 20 }, // Ejecutivo
      { wch: 15 }, // Folio
    ];
    ws['!cols'] = colWidths;

    const periodo = filtros.periodo || getPeriodoActual();
    XLSX.writeFile(wb, `GNI_${periodo}.xlsx`);
    toast.success('Excel generado correctamente');
  };

  // Definición de columnas con sus propiedades
  const columnDefinitions: { key: string; label: string; align: 'left' | 'right' | 'center'; width?: string }[] = [
    { key: 'fecha_gasto', label: 'Fecha', align: 'left' },
    { key: 'proveedor', label: 'Proveedor', align: 'left' },
    { key: 'concepto', label: 'Concepto', align: 'left' },
    { key: 'clave', label: 'Clave', align: 'left' },
    { key: 'cuenta', label: 'Cuenta', align: 'left' },
    { key: 'subcuenta', label: 'Subcuenta', align: 'left' },
    { key: 'forma_pago', label: 'F. Pago', align: 'left' },
    { key: 'subtotal', label: 'Subtotal', align: 'right' },
    { key: 'iva', label: 'IVA', align: 'right' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'validacion', label: 'Val.', align: 'center' },
    { key: 'status_pago', label: 'Pago', align: 'center' },
    { key: 'ejecutivo', label: 'Ejecutivo', align: 'left' },
    { key: 'folio_factura', label: 'Folio', align: 'left' },
  ];

  // Generar reporte estilo Excel por período
  const handleExportReportePeriodo = () => {
    // Obtener el año del período seleccionado o actual
    const periodoBase = filtros.periodo || getPeriodoActual();
    const anio = periodoBase.split('-')[0];
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

    // Agrupar gastos por clave y cuenta
    const gastosAgrupados: Record<string, {
      clave: string;
      concepto: string;
      subclave: string;
      subconcepto: string;
      presupuesto: number;
      meses: number[];
      totalAcumulado: number;
    }> = {};

    // Primero creamos las claves principales desde el catálogo
    claves.forEach(c => {
      const key = c.clave;
      if (!gastosAgrupados[key]) {
        gastosAgrupados[key] = {
          clave: c.clave,
          concepto: c.cuenta,
          subclave: c.clave,
          subconcepto: c.subcuenta,
          presupuesto: c.presupuesto_anual || 0,
          meses: Array(12).fill(0),
          totalAcumulado: 0
        };
      }
    });

    // Ahora sumamos los gastos por mes
    gastos.forEach(g => {
      const clave = g.clave || 'SIN-CLAVE';
      if (!gastosAgrupados[clave]) {
        gastosAgrupados[clave] = {
          clave: clave,
          concepto: g.cuenta || 'Sin cuenta',
          subclave: clave,
          subconcepto: g.subcuenta || 'Sin subcuenta',
          presupuesto: 0,
          meses: Array(12).fill(0),
          totalAcumulado: 0
        };
      }

      const mesGasto = g.fecha_gasto ? parseInt(g.fecha_gasto.split('-')[1]) - 1 : 0;
      gastosAgrupados[clave].meses[mesGasto] += g.total || 0;
      gastosAgrupados[clave].totalAcumulado += g.total || 0;
    });

    // Crear datos para Excel
    const dataExcel: any[] = [];

    // Header
    dataExcel.push({
      'CLAVE': 'CLAVE',
      'CONCEPTO': 'CONCEPTO',
      'SUBCLAVE': 'SUBCLAVE',
      'CONCEPTO_DET': 'CONCEPTO',
      'PRESUPUESTO': 'PRESUPUESTO',
      ...meses.reduce((acc, m) => ({ ...acc, [m]: m }), {}),
      'TOTAL ACUMULADO': 'TOTAL ACUMULADO',
      'VARIACIÓN PRESUPUESTARIA': 'VARIACIÓN PRESUPUESTARIA'
    });

    // Datos agrupados
    Object.values(gastosAgrupados)
      .sort((a, b) => a.clave.localeCompare(b.clave))
      .forEach(item => {
        const row: any = {
          'CLAVE': item.clave,
          'CONCEPTO': item.concepto,
          'SUBCLAVE': item.subclave,
          'CONCEPTO_DET': item.subconcepto,
          'PRESUPUESTO': item.presupuesto,
        };
        meses.forEach((m, i) => {
          row[m] = item.meses[i];
        });
        row['TOTAL ACUMULADO'] = item.totalAcumulado;
        row['VARIACIÓN PRESUPUESTARIA'] = item.presupuesto - item.totalAcumulado;
        dataExcel.push(row);
      });

    // Crear Excel
    const ws = XLSX.utils.json_to_sheet(dataExcel, { skipHeader: true });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte GNI');

    // Anchos de columna
    ws['!cols'] = [
      { wch: 15 }, // CLAVE
      { wch: 20 }, // CONCEPTO
      { wch: 15 }, // SUBCLAVE
      { wch: 30 }, // CONCEPTO_DET
      { wch: 15 }, // PRESUPUESTO
      ...Array(12).fill({ wch: 12 }), // Meses
      { wch: 18 }, // TOTAL ACUMULADO
      { wch: 22 }, // VARIACIÓN
    ];

    XLSX.writeFile(wb, `GNI_Reporte_${anio}.xlsx`);
    toast.success('Reporte por período generado');
    setShowReportModal(false);
  };

  // Toggle columna visible
  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Contar columnas visibles
  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;

  // Componente para header de columna ordenable
  const SortableHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`px-3 py-3 text-xs font-semibold text-teal-800 uppercase cursor-pointer hover:bg-teal-100 transition-colors select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </div>
    </th>
  );

  return (
    <div className="p-6 bg-gradient-to-br from-teal-50/30 to-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-7 h-7 text-teal-600" />
              Gastos No Impactados
            </h1>
            <p className="text-gray-500 mt-1">
              Gestión de gastos operativos • {getPeriodoLabel(filtros.periodo || getPeriodoActual())}
            </p>
          </div>
          {/* Botón de Ayuda */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors"
            title="Guía de uso"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2">
          {/* Toggle Dashboard */}
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
              showDashboard
                ? 'bg-teal-100 text-teal-700 border border-teal-300'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </button>

          {/* Dropdown de Catálogos */}
          <div className="relative">
            <button
              onClick={() => setShowCatalogosDropdown(!showCatalogosDropdown)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Catálogos
              <ChevronDown className={`w-4 h-4 transition-transform ${showCatalogosDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showCatalogosDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-50"
              >
                <button
                  onClick={() => { setCatalogoActivo('claves'); setShowCatalogosDropdown(false); }}
                  className="w-full px-4 py-3 text-left hover:bg-teal-50 flex items-center gap-3 rounded-t-lg"
                >
                  <Tag className="w-5 h-5 text-teal-600" />
                  <div>
                    <div className="font-medium text-gray-900">Claves de Gasto</div>
                    <div className="text-xs text-gray-500">{claves.length} registros</div>
                  </div>
                </button>
                <button
                  onClick={() => { setCatalogoActivo('ejecutivos'); setShowCatalogosDropdown(false); }}
                  className="w-full px-4 py-3 text-left hover:bg-teal-50 flex items-center gap-3 border-t"
                >
                  <Users className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="font-medium text-gray-900">Ejecutivos</div>
                    <div className="text-xs text-gray-500">{ejecutivos.length} registros</div>
                  </div>
                </button>
                <button
                  onClick={() => { setCatalogoActivo('proveedores'); setShowCatalogosDropdown(false); }}
                  className="w-full px-4 py-3 text-left hover:bg-teal-50 flex items-center gap-3 border-t"
                >
                  <Building className="w-5 h-5 text-violet-600" />
                  <div>
                    <div className="font-medium text-gray-900">Proveedores</div>
                    <div className="text-xs text-gray-500">{proveedores.length} registros</div>
                  </div>
                </button>
                <button
                  onClick={() => { setCatalogoActivo('formasPago'); setShowCatalogosDropdown(false); }}
                  className="w-full px-4 py-3 text-left hover:bg-teal-50 flex items-center gap-3 rounded-b-lg border-t"
                >
                  <Banknote className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">Formas de Pago</div>
                    <div className="text-xs text-gray-500">{formasPago.length} registros</div>
                  </div>
                </button>
              </motion.div>
            )}
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>
          <button
            onClick={() => setShowExportPDFModal(true)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-100 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="px-4 py-2 bg-blue-50 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-2"
            title="Reporte consolidado por período"
          >
            <Table2 className="w-4 h-4" />
            Reporte
          </button>
          {/* Configuración de Columnas */}
          <div className="relative">
            <button
              onClick={() => setShowColumnConfig(!showColumnConfig)}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                showColumnConfig
                  ? 'bg-violet-100 text-violet-700 border border-violet-300'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title="Configurar columnas visibles"
            >
              <Columns className="w-4 h-4" />
            </button>
            {showColumnConfig && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-50 p-3"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b">
                  <span className="text-sm font-semibold text-gray-700">Columnas visibles</span>
                  <span className="text-xs text-gray-500">{visibleColumnCount} de {columnDefinitions.length}</span>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {columnDefinitions.map(col => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.key]}
                        onChange={() => toggleColumn(col.key)}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">{col.label}</span>
                      {visibleColumns[col.key] ? (
                        <Eye className="w-3 h-3 text-teal-500 ml-auto" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-gray-300 ml-auto" />
                      )}
                    </label>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t flex gap-2">
                  <button
                    onClick={() => setVisibleColumns(Object.fromEntries(columnDefinitions.map(c => [c.key, true])))}
                    className="text-xs text-teal-600 hover:text-teal-700"
                  >
                    Mostrar todas
                  </button>
                  <button
                    onClick={() => setVisibleColumns(Object.fromEntries(columnDefinitions.map(c => [c.key, ['fecha_gasto', 'proveedor', 'concepto', 'total', 'validacion'].includes(c.key)])))}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Mínimas
                  </button>
                </div>
              </motion.div>
            )}
          </div>
          <button
            onClick={() => setShowGastoModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 flex items-center gap-2 shadow-lg shadow-teal-200"
          >
            <Plus className="w-4 h-4" />
            Nuevo Gasto
          </button>
        </div>
      </div>

      {/* Dashboard Animado */}
      <AnimatePresence>
        {showDashboard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            {/* KPIs - Layout mejorado */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Total Período - Ficha principal mejorada */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-teal-500 to-teal-600 p-4 rounded-xl shadow-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-teal-100 text-xs font-semibold uppercase tracking-wider">Total Período</p>
                    <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totales.total)}</p>
                  </div>
                  <div className="p-2 bg-white/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/20">
                  <div>
                    <p className="text-teal-200 text-[10px] font-medium">Subtotal</p>
                    <p className="text-white text-sm font-semibold">{formatCurrency(totales.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-teal-200 text-[10px] font-medium">IVA</p>
                    <p className="text-white text-sm font-semibold">{formatCurrency(totales.iva)}</p>
                  </div>
                  <div>
                    <p className="text-teal-200 text-[10px] font-medium">Registros</p>
                    <p className="text-white text-sm font-semibold">{totales.cantidad}</p>
                  </div>
                </div>
              </motion.div>

              {/* Validados */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Validados</p>
                    <p className="text-xl font-bold text-emerald-700">{contadores.correctos}</p>
                  </div>
                </div>
                <p className="text-sm text-emerald-600 font-medium">{formatCurrency(dashboardData.totalCorrectosAmount)}</p>
              </motion.div>

              {/* Pendientes */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-4 rounded-xl shadow-sm border border-amber-100"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Pendientes</p>
                    <p className="text-xl font-bold text-amber-700">{contadores.pendientes}</p>
                  </div>
                </div>
                <p className="text-sm text-amber-600 font-medium">{formatCurrency(dashboardData.totalPendientesAmount)}</p>
              </motion.div>

              {/* Pagados / Por Pagar */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="bg-white p-4 rounded-xl shadow-sm border"
              >
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-blue-500" />
                      <p className="text-xs text-gray-500 font-medium">Pagados</p>
                    </div>
                    <p className="text-lg font-bold text-blue-700">{contadores.pagados}</p>
                    <p className="text-xs text-blue-600">{formatCurrency(dashboardData.totalPagadosAmount)}</p>
                  </div>
                  <div className="w-px bg-gray-200"></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="w-4 h-4 text-rose-500" />
                      <p className="text-xs text-gray-500 font-medium">Por Pagar</p>
                    </div>
                    <p className="text-lg font-bold text-rose-700">{dashboardData.porPago.pendientes.length}</p>
                    <p className="text-xs text-rose-600">{formatCurrency(dashboardData.totalPorPagarAmount)}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Gráficas mejoradas - Layout: Cuenta(1) + Mes(2) + Forma(1) = 4 cols */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Distribución por Cuenta */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white p-4 rounded-xl shadow-sm border"
              >
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-teal-600" />
                  Por Cuenta
                </h3>
                <div className="space-y-2.5">
                  {Object.entries(dashboardData.porCuenta)
                    .sort((a, b) => b[1].total - a[1].total)
                    .slice(0, 6)
                    .map(([cuenta, data], index) => {
                      const maxTotal = Math.max(...Object.values(dashboardData.porCuenta).map(d => d.total));
                      const percentage = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
                      const cuentaColor = getCuentaColor(cuenta);
                      return (
                        <div key={cuenta}>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cuentaColor }} />
                              <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{cuenta}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-900">{formatCurrency(data.total)}</span>
                          </div>
                          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ delay: 0.4 + index * 0.05, duration: 0.6 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: cuentaColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </motion.div>

              {/* Gráfica por Mes - Barras apiladas por cuenta */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white p-4 rounded-xl shadow-sm border lg:col-span-2"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-violet-600" />
                    Gastos por Mes (por Cuenta)
                  </h3>
                  {/* Leyenda compacta */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(CUENTA_COLORS)
                      .filter(([key]) => key !== 'DEFAULT')
                      .slice(0, 6)
                      .map(([cuenta, color]) => (
                        <div key={cuenta} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-[10px] text-gray-500">{cuenta.split(' ')[0]}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {(() => {
                    // Calcular datos por mes y cuenta
                    const datosPorMesCuenta: Record<string, Record<string, number>> = {};
                    gastos.forEach(g => {
                      const mes = g.fecha_gasto?.substring(0, 7) || 'Sin fecha';
                      const cuenta = g.cuenta || 'Sin clasificar';
                      if (!datosPorMesCuenta[mes]) datosPorMesCuenta[mes] = {};
                      datosPorMesCuenta[mes][cuenta] = (datosPorMesCuenta[mes][cuenta] || 0) + (g.total || 0);
                    });

                    const mesesOrdenados = Object.entries(datosPorMesCuenta)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .slice(-12);

                    // Total máximo para escala
                    const maxMes = Math.max(...mesesOrdenados.map(([, cuentas]) =>
                      Object.values(cuentas).reduce((s, v) => s + v, 0)
                    ), 1);

                    // Obtener todas las cuentas únicas
                    const todasLasCuentas = [...new Set(gastos.map(g => g.cuenta || 'Sin clasificar'))];

                    const mesesLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

                    return mesesOrdenados.map(([mes, cuentas], index) => {
                      const [anio, mesNum] = mes.split('-');
                      const mesLabel = mesesLabels[parseInt(mesNum) - 1] || mes;
                      const totalMes = Object.values(cuentas).reduce((s, v) => s + v, 0);

                      // Ordenar cuentas por monto descendente
                      const cuentasOrdenadas = Object.entries(cuentas).sort((a, b) => b[1] - a[1]);

                      return (
                        <div key={mes} className="group">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-gray-700 w-14">{mesLabel} {anio.slice(-2)}</span>
                            <span className="text-xs font-bold text-gray-900">{formatCurrency(totalMes)}</span>
                          </div>
                          <div className="relative h-6 bg-gray-100 rounded-md overflow-hidden flex" title={`Total: ${formatCurrency(totalMes)}`}>
                            {cuentasOrdenadas.map(([cuenta, monto], i) => {
                              const widthPct = (monto / maxMes) * 100;
                              const color = getCuentaColor(cuenta);
                              return (
                                <motion.div
                                  key={cuenta}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${widthPct}%` }}
                                  transition={{ delay: 0.5 + index * 0.03 + i * 0.02, duration: 0.5 }}
                                  className="h-full relative group/segment"
                                  style={{ backgroundColor: color }}
                                  title={`${cuenta}: ${formatCurrency(monto)}`}
                                >
                                  {widthPct > 8 && (
                                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white opacity-0 group-hover/segment:opacity-100 transition-opacity truncate px-1">
                                      {cuenta.split(' ')[0]}
                                    </span>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                          {/* Tooltip con desglose al hover */}
                          <div className="hidden group-hover:block absolute z-10 bg-gray-900 text-white text-[10px] rounded-lg p-2 shadow-lg mt-1 min-w-48">
                            {cuentasOrdenadas.map(([cuenta, monto]) => (
                              <div key={cuenta} className="flex justify-between gap-3">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCuentaColor(cuenta) }} />
                                  {cuenta}
                                </span>
                                <span className="font-medium">{formatCurrency(monto)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.div>

              {/* Por Forma de Pago - Mejorado */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white p-4 rounded-xl shadow-sm border"
              >
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-blue-600" />
                  Por Forma de Pago
                </h3>
                <div className="space-y-2.5">
                  {Object.entries(dashboardData.porFormaPago)
                    .sort((a, b) => b[1].total - a[1].total)
                    .slice(0, 5)
                    .map(([fp, data], index) => {
                      const maxTotal = Math.max(...Object.values(dashboardData.porFormaPago).map(d => d.total));
                      const percentage = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
                      const bankColor = getFormaPagoColor(fp);
                      return (
                        <div key={fp}>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bankColor }} />
                              <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{fp}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-900">{formatCurrency(data.total)}</span>
                          </div>
                          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ delay: 0.6 + index * 0.05, duration: 0.6 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: bankColor, opacity: 0.8 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por proveedor, concepto, clave, ejecutivo..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Selector de período */}
          <select
            value={filtros.periodo || ''}
            onChange={(e) => setFiltros({ ...filtros, periodo: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="">Todos los períodos</option>
            {periodos.map(p => (
              <option key={p} value={p}>{getPeriodoLabel(p)}</option>
            ))}
          </select>

          {/* Toggle filtros avanzados */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
              showFilters ? 'bg-teal-50 border-teal-300 text-teal-700' : 'hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>

          {/* Items per page */}
          <select
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 bg-white text-sm"
          >
            <option value={10}>10 por pág</option>
            <option value={25}>25 por pág</option>
            <option value={50}>50 por pág</option>
            <option value={100}>100 por pág</option>
          </select>

          {/* Refrescar */}
          <button
            onClick={loadGastos}
            className="p-2 border rounded-lg hover:bg-teal-50 hover:border-teal-300 transition-colors"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 text-teal-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filtros avanzados */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label>
              <select
                value={filtros.cuenta || ''}
                onChange={(e) => setFiltros({ ...filtros, cuenta: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Todas</option>
                {[...new Set(claves.map(c => c.cuenta))].map(cuenta => (
                  <option key={cuenta} value={cuenta}>{cuenta}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago</label>
              <select
                value={filtros.forma_pago_id || ''}
                onChange={(e) => setFiltros({ ...filtros, forma_pago_id: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Todas</option>
                {formasPago.map(fp => (
                  <option key={fp.id} value={fp.id}>{fp.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Validación</label>
              <select
                value={filtros.validacion || ''}
                onChange={(e) => setFiltros({ ...filtros, validacion: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Todas</option>
                <option value="correcto">Correcto</option>
                <option value="pendiente">Pendiente</option>
                <option value="revisar">Revisar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filtros.status_pago || ''}
                onChange={(e) => setFiltros({ ...filtros, status_pago: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Todos</option>
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ejecutivo</label>
              <select
                value={filtros.ejecutivo_id || ''}
                onChange={(e) => setFiltros({ ...filtros, ejecutivo_id: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Todos</option>
                {ejecutivos.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de gastos */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-teal-50 to-teal-100/50">
              {/* Fila de headers */}
              <tr className="border-b">
                {visibleColumns.fecha_gasto && <SortableHeader field="fecha_gasto" label="Fecha" className="text-left" />}
                {visibleColumns.proveedor && <SortableHeader field="proveedor" label="Proveedor" className="text-left" />}
                {visibleColumns.concepto && <SortableHeader field="concepto" label="Concepto" className="text-left" />}
                {visibleColumns.clave && <SortableHeader field="clave" label="Clave" className="text-left" />}
                {visibleColumns.cuenta && <SortableHeader field="cuenta" label="Cuenta" className="text-left" />}
                {visibleColumns.subcuenta && <SortableHeader field="subcuenta" label="Subcuenta" className="text-left" />}
                {visibleColumns.forma_pago && <SortableHeader field="forma_pago" label="F. Pago" className="text-left" />}
                {visibleColumns.subtotal && <SortableHeader field="subtotal" label="Subtotal" className="text-right" />}
                {visibleColumns.iva && <SortableHeader field="iva" label="IVA" className="text-right" />}
                {visibleColumns.total && <SortableHeader field="total" label="Total" className="text-right" />}
                {visibleColumns.validacion && <SortableHeader field="validacion" label="Val." className="text-center" />}
                {visibleColumns.status_pago && <SortableHeader field="status_pago" label="Pago" className="text-center" />}
                {visibleColumns.ejecutivo && <SortableHeader field="ejecutivo" label="Ejecutivo" className="text-left" />}
                {visibleColumns.folio_factura && <SortableHeader field="folio_factura" label="Folio" className="text-left" />}
              </tr>
              {/* Fila de filtros por columna */}
              <tr className="border-b bg-gray-50/50">
                {visibleColumns.fecha_gasto && (
                  <th className="px-2 py-1.5">
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={columnFilters.fecha_gasto || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, fecha_gasto: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </th>
                )}
                {visibleColumns.proveedor && (
                  <th className="px-2 py-1.5">
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={columnFilters.proveedor || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, proveedor: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </th>
                )}
                {visibleColumns.concepto && (
                  <th className="px-2 py-1.5">
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={columnFilters.concepto || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, concepto: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </th>
                )}
                {visibleColumns.clave && (
                  <th className="px-2 py-1.5">
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={columnFilters.clave || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, clave: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </th>
                )}
                {visibleColumns.cuenta && (
                  <th className="px-2 py-1.5">
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={columnFilters.cuenta || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, cuenta: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </th>
                )}
                {visibleColumns.subcuenta && (
                  <th className="px-2 py-1.5">
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={columnFilters.subcuenta || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, subcuenta: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </th>
                )}
                {visibleColumns.forma_pago && (
                  <th className="px-2 py-1.5">
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={columnFilters.forma_pago || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, forma_pago: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </th>
                )}
                {visibleColumns.subtotal && <th className="px-2 py-1.5"></th>}
                {visibleColumns.iva && <th className="px-2 py-1.5"></th>}
                {visibleColumns.total && <th className="px-2 py-1.5"></th>}
                {visibleColumns.validacion && (
                  <th className="px-2 py-1.5">
                    <select
                      value={columnFilters.validacion || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, validacion: e.target.value})}
                      className="w-full px-1 py-1 text-[10px] border rounded focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">Todos</option>
                      <option value="correcto">OK</option>
                      <option value="pendiente">Pend</option>
                      <option value="revisar">Rev</option>
                    </select>
                  </th>
                )}
                {visibleColumns.status_pago && (
                  <th className="px-2 py-1.5">
                    <select
                      value={columnFilters.status_pago || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, status_pago: e.target.value})}
                      className="w-full px-1 py-1 text-[10px] border rounded focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">Todos</option>
                      <option value="pagado">Pag</option>
                      <option value="pendiente">Pend</option>
                    </select>
                  </th>
                )}
                {visibleColumns.ejecutivo && (
                  <th className="px-2 py-1.5">
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={columnFilters.ejecutivo || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, ejecutivo: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </th>
                )}
                {visibleColumns.folio_factura && (
                  <th className="px-2 py-1.5">
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={columnFilters.folio_factura || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, folio_factura: e.target.value})}
                      className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="px-4 py-12 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-500" />
                    <p className="text-gray-500">Cargando gastos...</p>
                  </td>
                </tr>
              ) : gastosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="px-4 py-12 text-center">
                    <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay gastos para mostrar</p>
                    <button
                      onClick={() => setShowGastoModal(true)}
                      className="mt-3 text-teal-600 hover:text-teal-700 text-sm font-medium"
                    >
                      + Agregar primer gasto
                    </button>
                  </td>
                </tr>
              ) : (
                gastosPaginados.map((gasto, index) => (
                  <motion.tr
                    key={gasto.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-teal-50/50 cursor-pointer transition-colors"
                    onClick={() => handleEditGasto(gasto)}
                  >
                    {visibleColumns.fecha_gasto && (
                      <td className="px-3 py-2.5 text-sm text-gray-900 whitespace-nowrap">
                        {formatDate(gasto.fecha_gasto)}
                      </td>
                    )}
                    {visibleColumns.proveedor && (
                      <td className="px-3 py-2.5 text-sm text-gray-900 max-w-36 truncate font-medium">
                        {gasto.proveedor || '-'}
                      </td>
                    )}
                    {visibleColumns.concepto && (
                      <td className="px-3 py-2.5 text-sm text-gray-600 max-w-40 truncate">
                        {gasto.concepto}
                      </td>
                    )}
                    {visibleColumns.clave && (
                      <td className="px-3 py-2.5">
                        {gasto.clave && (
                          <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 text-[11px] font-mono rounded">
                            {gasto.clave}
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.cuenta && (
                      <td className="px-3 py-2.5 text-xs text-gray-600 max-w-28 truncate">
                        {gasto.cuenta || '-'}
                      </td>
                    )}
                    {visibleColumns.subcuenta && (
                      <td className="px-3 py-2.5 text-xs text-gray-500 max-w-32 truncate">
                        {gasto.subcuenta || '-'}
                      </td>
                    )}
                    {visibleColumns.forma_pago && (
                      <td className="px-3 py-2.5">
                        {gasto.forma_pago && (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getFormaPagoColor(gasto.forma_pago) }}
                            />
                            <span className="text-xs text-gray-700 truncate max-w-24">
                              {gasto.forma_pago}
                            </span>
                          </div>
                        )}
                      </td>
                    )}
                    {visibleColumns.subtotal && (
                      <td className="px-3 py-2.5 text-sm text-right text-gray-900 font-mono">
                        {formatCurrency(gasto.subtotal || 0)}
                      </td>
                    )}
                    {visibleColumns.iva && (
                      <td className="px-3 py-2.5 text-sm text-right text-gray-500 font-mono">
                        {formatCurrency(gasto.iva || 0)}
                      </td>
                    )}
                    {visibleColumns.total && (
                      <td className="px-3 py-2.5 text-sm text-right font-bold text-gray-900 font-mono">
                        {formatCurrency(gasto.total || 0)}
                      </td>
                    )}
                    {visibleColumns.validacion && (
                      <td className="px-3 py-2.5 text-center">
                        {gasto.validacion === 'correcto' ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100" title="Correcto">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          </span>
                        ) : gasto.validacion === 'revisar' ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100" title="Revisar">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100" title="Pendiente">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.status_pago && (
                      <td className="px-3 py-2.5 text-center">
                        {gasto.status_pago === 'pagado' ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100" title="Pagado">
                            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100" title="Pendiente">
                            <Wallet className="w-3.5 h-3.5 text-gray-400" />
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.ejecutivo && (
                      <td className="px-3 py-2.5 text-sm text-gray-600 max-w-28 truncate">
                        {gasto.ejecutivo || '-'}
                      </td>
                    )}
                    {visibleColumns.folio_factura && (
                      <td className="px-3 py-2.5 text-sm text-gray-600 max-w-24 truncate">
                        {gasto.folio_factura || '-'}
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </tbody>
            {gastosFiltrados.length > 0 && (
              <tfoot className="bg-gradient-to-r from-teal-50 to-teal-100/50 border-t-2 border-teal-200">
                <tr>
                  <td
                    colSpan={[visibleColumns.fecha_gasto, visibleColumns.proveedor, visibleColumns.concepto, visibleColumns.clave, visibleColumns.cuenta, visibleColumns.subcuenta, visibleColumns.forma_pago].filter(Boolean).length}
                    className="px-4 py-3 text-sm font-semibold text-teal-800"
                  >
                    Total ({totales.cantidad} registros)
                  </td>
                  {visibleColumns.subtotal && (
                    <td className="px-4 py-3 text-sm text-right font-bold text-teal-900 font-mono">
                      {formatCurrency(totales.subtotal)}
                    </td>
                  )}
                  {visibleColumns.iva && (
                    <td className="px-4 py-3 text-sm text-right font-semibold text-teal-700 font-mono">
                      {formatCurrency(totales.iva)}
                    </td>
                  )}
                  {visibleColumns.total && (
                    <td className="px-4 py-3 text-sm text-right font-bold text-teal-900 font-mono text-lg">
                      {formatCurrency(totales.total)}
                    </td>
                  )}
                  <td colSpan={[visibleColumns.validacion, visibleColumns.status_pago, visibleColumns.ejecutivo, visibleColumns.folio_factura].filter(Boolean).length}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <div className="text-sm text-gray-500">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, gastosFiltrados.length)} de {gastosFiltrados.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-teal-500 text-white'
                          : 'hover:bg-teal-50 text-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {showGastoModal && (
        <GastoFormModal
          gasto={gastoEditar}
          claves={claves}
          formasPago={formasPago}
          proveedores={proveedores}
          ejecutivos={ejecutivos}
          periodo={filtros.periodo || getPeriodoActual()}
          onClose={handleCloseModal}
          onSave={handleGastoSaved}
        />
      )}

      {showImportModal && (
        <ImportExcelModal
          periodo={filtros.periodo || getPeriodoActual()}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {showExportPDFModal && (
        <ExportPDFModal
          gastos={gastosFiltrados}
          periodo={filtros.periodo || getPeriodoActual()}
          totales={totales}
          onClose={() => setShowExportPDFModal(false)}
        />
      )}

      {/* Modal de Ayuda */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Guía de Uso - Gastos No Impactados
                </h2>
                <button onClick={() => setShowHelp(false)} className="text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-teal-600" />
                    Crear Nuevo Gasto
                  </h3>
                  <p className="text-sm text-gray-600">
                    Click en el botón <span className="font-medium text-teal-600">"Nuevo Gasto"</span> para registrar un gasto operativo.
                    Complete: proveedor, concepto, clave de gasto, montos y estado.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-teal-600" />
                    Importar desde Excel
                  </h3>
                  <p className="text-sm text-gray-600">
                    Use <span className="font-medium">"Importar"</span> para cargar gastos masivamente desde Excel.
                    El archivo debe contener columnas: PROVEEDOR, CONCEPTO, CLAVE, SUBTOTAL, IVA, TOTAL, etc.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-teal-600" />
                    Administrar Catálogos
                  </h3>
                  <p className="text-sm text-gray-600">
                    En <span className="font-medium">"Catálogos"</span> puede gestionar: Claves de Gasto, Ejecutivos, Proveedores y Formas de Pago.
                    Cada catálogo tiene vista de listado y vista de tarjetas.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Columns className="w-4 h-4 text-teal-600" />
                    Configurar Columnas
                  </h3>
                  <p className="text-sm text-gray-600">
                    Click en el icono de columnas para mostrar/ocultar columnas del listado según sus necesidades.
                    Puede elegir vista mínima o mostrar todas las columnas.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Table2 className="w-4 h-4 text-teal-600" />
                    Generar Reporte
                  </h3>
                  <p className="text-sm text-gray-600">
                    El botón <span className="font-medium text-blue-600">"Reporte"</span> genera un Excel consolidado por período
                    con totales mensuales, presupuesto y variación presupuestaria por clave de gasto.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-teal-600" />
                    Filtros y Búsqueda
                  </h3>
                  <p className="text-sm text-gray-600">
                    Use la barra de búsqueda para encontrar gastos por proveedor, concepto o clave.
                    Active "Filtros" para filtrar por cuenta, forma de pago, validación, status y ejecutivo.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-teal-600" />
                    Dashboard
                  </h3>
                  <p className="text-sm text-gray-600">
                    Toggle <span className="font-medium">"Dashboard"</span> para ver KPIs, gráficas de distribución por cuenta,
                    top proveedores, gastos por forma de pago y tendencia mensual.
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    <strong>Tip:</strong> Haga click en cualquier fila del listado para editar el gasto.
                    Las columnas son ordenables haciendo click en el encabezado.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Reporte por Período */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowReportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between rounded-t-xl">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Table2 className="w-5 h-5" />
                  Generar Reporte Consolidado
                </h2>
                <button onClick={() => setShowReportModal(false)} className="text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Este reporte genera un Excel con el consolidado anual de gastos agrupados por clave,
                  mostrando totales por mes, presupuesto y variación presupuestaria.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Año seleccionado:</strong> {(filtros.periodo || getPeriodoActual()).split('-')[0]}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Se incluirán todos los gastos del año con las claves del catálogo.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExportReportePeriodo}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Generar Excel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal CRUD de Catálogos */}
      <AnimatePresence>
        {catalogoActivo && (
          <CatalogoCRUDModal
            tipo={catalogoActivo}
            claves={claves}
            ejecutivos={ejecutivos}
            proveedores={proveedores}
            formasPago={formasPago}
            companyId={companyId || ''}
            onClose={() => setCatalogoActivo(null)}
            onRefresh={loadCatalogos}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// COMPONENTE: MODAL CRUD CATÁLOGOS
// ============================================================================
interface CatalogoCRUDModalProps {
  tipo: 'claves' | 'ejecutivos' | 'proveedores' | 'formasPago';
  claves: ClaveGasto[];
  ejecutivos: Ejecutivo[];
  proveedores: Proveedor[];
  formasPago: FormaPago[];
  companyId: string;
  onClose: () => void;
  onRefresh: () => void;
}

const CatalogoCRUDModal: React.FC<CatalogoCRUDModalProps> = ({
  tipo,
  claves,
  ejecutivos,
  proveedores,
  formasPago,
  companyId,
  onClose,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list'); // Vista listado por default

  const resetForm = () => {
    setFormData({});
    setEditItem(null);
    setShowForm(false);
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tipo === 'claves') {
        if (editItem) {
          await updateClaveGasto(editItem.id, formData);
        } else {
          await createClaveGasto(formData, companyId);
        }
      } else if (tipo === 'ejecutivos') {
        if (editItem) {
          await supabase.from('cont_ejecutivos').update({
            nombre: formData.nombre,
            departamento: formData.departamento
          }).eq('id', editItem.id);
        } else {
          await createEjecutivo(formData.nombre, companyId);
        }
      } else if (tipo === 'proveedores') {
        if (editItem) {
          await updateProveedor(editItem.id, formData);
        } else {
          await createProveedor(formData, companyId);
        }
      } else if (tipo === 'formasPago') {
        if (editItem) {
          await supabase.from('cont_formas_pago').update({
            nombre: formData.nombre,
            tipo: formData.tipo,
            banco: formData.banco,
            descripcion: formData.descripcion
          }).eq('id', editItem.id);
        } else {
          await createFormaPago(formData.nombre, formData.tipo || 'transferencia', companyId);
        }
      }
      toast.success(editItem ? 'Actualizado correctamente' : 'Creado correctamente');
      onRefresh();
      resetForm();
    } catch (error) {
      console.error('Error guardando:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (tipo === 'claves') {
      return claves.filter(c =>
        c.clave.toLowerCase().includes(term) ||
        c.cuenta.toLowerCase().includes(term) ||
        c.subcuenta.toLowerCase().includes(term)
      );
    } else if (tipo === 'ejecutivos') {
      return ejecutivos.filter(e => e.nombre.toLowerCase().includes(term));
    } else if (tipo === 'formasPago') {
      return formasPago.filter(f =>
        f.nombre.toLowerCase().includes(term) ||
        f.tipo?.toLowerCase().includes(term) ||
        f.banco?.toLowerCase().includes(term)
      );
    } else {
      return proveedores.filter(p =>
        p.razon_social.toLowerCase().includes(term) ||
        p.rfc?.toLowerCase().includes(term) ||
        p.nombre_comercial?.toLowerCase().includes(term)
      );
    }
  }, [tipo, claves, ejecutivos, proveedores, formasPago, searchTerm]);

  const titulo = tipo === 'claves' ? 'Claves de Gasto' : tipo === 'ejecutivos' ? 'Ejecutivos' : tipo === 'formasPago' ? 'Formas de Pago' : 'Proveedores';
  const IconComponent = tipo === 'claves' ? Tag : tipo === 'ejecutivos' ? Users : tipo === 'formasPago' ? Banknote : Building;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-teal-50 to-teal-100/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-xl">
              <IconComponent className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{titulo}</h2>
              <p className="text-sm text-gray-500">{filteredItems.length} registros</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle Vista */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Vista listado"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white shadow text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Vista tarjetas"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Nuevo
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Buscar ${titulo.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {showForm ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold mb-4">
                {editItem ? 'Editar' : 'Nuevo'} {titulo.slice(0, -1)}
              </h3>

              {tipo === 'claves' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clave *</label>
                    <input
                      type="text"
                      value={formData.clave || ''}
                      onChange={(e) => setFormData({ ...formData, clave: e.target.value })}
                      placeholder="MDE2025-001A"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta *</label>
                    <input
                      type="text"
                      value={formData.cuenta || ''}
                      onChange={(e) => setFormData({ ...formData, cuenta: e.target.value })}
                      placeholder="GASTOS FIJOS"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subcuenta *</label>
                    <input
                      type="text"
                      value={formData.subcuenta || ''}
                      onChange={(e) => setFormData({ ...formData, subcuenta: e.target.value })}
                      placeholder="Descripción de subcuenta"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto Anual</label>
                    <input
                      type="number"
                      value={formData.presupuesto_anual || 0}
                      onChange={(e) => setFormData({ ...formData, presupuesto_anual: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}

              {tipo === 'ejecutivos' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={formData.nombre || ''}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Nombre completo"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                    <input
                      type="text"
                      value={formData.departamento || ''}
                      onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                      placeholder="Departamento"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}

              {tipo === 'proveedores' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
                    <input
                      type="text"
                      value={formData.rfc || ''}
                      onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                      placeholder="ABC123456XYZ"
                      maxLength={13}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social *</label>
                    <input
                      type="text"
                      value={formData.razon_social || ''}
                      onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                      placeholder="Razón social completa"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
                    <input
                      type="text"
                      value={formData.nombre_comercial || ''}
                      onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      value={formData.telefono || ''}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="55 1234 5678"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contacto@proveedor.com"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
                    <input
                      type="text"
                      value={formData.contacto_nombre || ''}
                      onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value })}
                      placeholder="Nombre del contacto"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                    <input
                      type="text"
                      value={formData.direccion || ''}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      placeholder="Dirección completa"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}

              {tipo === 'formasPago' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={formData.nombre || ''}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="KUSPIT SP's, SANTANDER NÓMINA..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={formData.tipo || 'transferencia'}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                    <select
                      value={formData.banco || ''}
                      onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Seleccionar banco</option>
                      <option value="SANTANDER">Santander</option>
                      <option value="BBVA">BBVA</option>
                      <option value="BANORTE">Banorte</option>
                      <option value="HSBC">HSBC</option>
                      <option value="BANAMEX">Banamex</option>
                      <option value="SCOTIABANK">Scotiabank</option>
                      <option value="KUSPIT">Kuspit</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <input
                      type="text"
                      value={formData.descripcion || ''}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Descripción o alias de la cuenta"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* ========== VISTA LISTADO (TABLA) ========== */}
              {viewMode === 'list' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {tipo === 'claves' && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Clave</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cuenta</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Subcuenta</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Presupuesto</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                          </>
                        )}
                        {tipo === 'ejecutivos' && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Departamento</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Estado</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                          </>
                        )}
                        {tipo === 'proveedores' && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">RFC</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Razón Social</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre Comercial</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Teléfono</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                          </>
                        )}
                        {tipo === 'formasPago' && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Banco</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Descripción</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tipo === 'claves' && filteredItems.map((clave: ClaveGasto) => (
                        <tr key={clave.id} className="hover:bg-teal-50/50 cursor-pointer" onClick={() => handleEdit(clave)}>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-teal-100 text-teal-700 font-mono text-xs rounded">{clave.clave}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{clave.cuenta}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{clave.subcuenta}</td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-gray-700">
                            {clave.presupuesto_anual > 0 ? `$${clave.presupuesto_anual.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="p-1 hover:bg-teal-100 rounded"><Edit className="w-4 h-4 text-teal-600" /></button>
                          </td>
                        </tr>
                      ))}
                      {tipo === 'ejecutivos' && filteredItems.map((ej: Ejecutivo) => (
                        <tr key={ej.id} className="hover:bg-emerald-50/50 cursor-pointer" onClick={() => handleEdit(ej)}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{ej.nombre}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{ej.departamento || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 text-xs rounded-full ${ej.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                              {ej.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="p-1 hover:bg-emerald-100 rounded"><Edit className="w-4 h-4 text-emerald-600" /></button>
                          </td>
                        </tr>
                      ))}
                      {tipo === 'proveedores' && filteredItems.map((prov: Proveedor) => (
                        <tr key={prov.id} className="hover:bg-violet-50/50 cursor-pointer" onClick={() => handleEdit(prov)}>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-gray-600">{prov.rfc || '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{prov.razon_social}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prov.nombre_comercial || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prov.telefono || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prov.email || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <button className="p-1 hover:bg-violet-100 rounded"><Edit className="w-4 h-4 text-violet-600" /></button>
                          </td>
                        </tr>
                      ))}
                      {tipo === 'formasPago' && filteredItems.map((fp: FormaPago) => (
                        <tr key={fp.id} className="hover:bg-blue-50/50 cursor-pointer" onClick={() => handleEdit(fp)}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{fp.nombre}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                              fp.tipo === 'transferencia' ? 'bg-blue-100 text-blue-700' :
                              fp.tipo === 'tarjeta' ? 'bg-purple-100 text-purple-700' :
                              fp.tipo === 'efectivo' ? 'bg-green-100 text-green-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {fp.tipo || 'Transferencia'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{fp.banco || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{fp.descripcion || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <button className="p-1 hover:bg-blue-100 rounded"><Edit className="w-4 h-4 text-blue-600" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No se encontraron registros</div>
                  )}
                </div>
              )}

              {/* ========== VISTA TARJETAS ========== */}
              {viewMode === 'cards' && tipo === 'claves' && (
                <div className="space-y-2">
                  {filteredItems.map((clave: ClaveGasto) => (
                    <motion.div
                      key={clave.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-teal-50 transition-colors group cursor-pointer"
                      onClick={() => handleEdit(clave)}
                    >
                      <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-teal-100 text-teal-700 font-mono text-sm rounded-lg font-semibold">
                          {clave.clave}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{clave.subcuenta}</p>
                          <p className="text-sm text-gray-500">{clave.cuenta}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {clave.presupuesto_anual > 0 && (
                          <span className="text-sm text-gray-500">
                            Ppto: ${clave.presupuesto_anual.toLocaleString()}
                          </span>
                        )}
                        <Edit className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {viewMode === 'cards' && tipo === 'ejecutivos' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredItems.map((ej: Ejecutivo) => (
                    <motion.div
                      key={ej.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors group cursor-pointer"
                      onClick={() => handleEdit(ej)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">
                            {ej.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{ej.nombre}</p>
                          {ej.departamento && (
                            <p className="text-xs text-gray-500">{ej.departamento}</p>
                          )}
                        </div>
                        <Edit className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {viewMode === 'cards' && tipo === 'proveedores' && (
                <div className="space-y-2">
                  {filteredItems.slice(0, 50).map((prov: Proveedor) => (
                    <motion.div
                      key={prov.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-violet-50 transition-colors group cursor-pointer"
                      onClick={() => handleEdit(prov)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{prov.razon_social}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            {prov.rfc && (
                              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                                {prov.rfc}
                              </span>
                            )}
                            {prov.telefono && <span>{prov.telefono}</span>}
                          </div>
                        </div>
                      </div>
                      <Edit className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                  {filteredItems.length > 50 && (
                    <p className="text-center text-sm text-gray-500 py-2">
                      Mostrando 50 de {filteredItems.length} registros
                    </p>
                  )}
                </div>
              )}

              {viewMode === 'cards' && tipo === 'formasPago' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredItems.map((fp: FormaPago) => {
                    const tipoColors: Record<string, string> = {
                      transferencia: 'from-blue-400 to-blue-600',
                      tarjeta: 'from-purple-400 to-purple-600',
                      efectivo: 'from-green-400 to-green-600',
                      cheque: 'from-orange-400 to-orange-600'
                    };
                    return (
                      <motion.div
                        key={fp.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors group cursor-pointer"
                        onClick={() => handleEdit(fp)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 bg-gradient-to-br ${tipoColors[fp.tipo || 'transferencia']} rounded-lg flex items-center justify-center`}>
                            <Banknote className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{fp.nombre}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="capitalize">{fp.tipo || 'Transferencia'}</span>
                              {fp.banco && <span>• {fp.banco}</span>}
                            </div>
                          </div>
                          <Edit className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GastosNoImpactadosPage;
