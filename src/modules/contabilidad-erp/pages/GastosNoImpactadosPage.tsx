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
  Receipt
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
  createEjecutivo
} from '../services/gastosNoImpactadosService';
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

// Colores paleta MADE Mint
const MINT_COLORS = ['#14B8A6', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981'];

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
  const [catalogoActivo, setCatalogoActivo] = useState<'claves' | 'ejecutivos' | 'proveedores' | null>(null);

  // Dashboard y paginación
  const [showDashboard, setShowDashboard] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Periodos disponibles
  const periodos = useMemo(() => getPeriodosDisponibles(2025), []);

  // Cargar datos
  useEffect(() => {
    if (companyId) {
      loadCatalogos();
      loadGastos();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      loadGastos();
    }
  }, [filtros]);

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

  // Filtrar por búsqueda
  const gastosFiltrados = useMemo(() => {
    if (!searchTerm) return gastos;
    const term = searchTerm.toLowerCase();
    return gastos.filter(g =>
      g.proveedor?.toLowerCase().includes(term) ||
      g.concepto?.toLowerCase().includes(term) ||
      g.clave?.toLowerCase().includes(term) ||
      g.cuenta?.toLowerCase().includes(term)
    );
  }, [gastos, searchTerm]);

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
    // Top proveedores
    const porProveedor: Record<string, number> = {};
    gastosFiltrados.forEach(g => {
      const prov = g.proveedor || 'Sin proveedor';
      porProveedor[prov] = (porProveedor[prov] || 0) + (g.total || 0);
    });
    const topProveedores = Object.entries(porProveedor).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      porValidacion,
      porPago,
      porCuenta,
      topProveedores,
      totalCorrectosAmount: porValidacion.correctos.reduce((s, g) => s + (g.total || 0), 0),
      totalPendientesAmount: porValidacion.pendientes.reduce((s, g) => s + (g.total || 0), 0),
      totalPagadosAmount: porPago.pagados.reduce((s, g) => s + (g.total || 0), 0),
      totalPorPagarAmount: porPago.pendientes.reduce((s, g) => s + (g.total || 0), 0)
    };
  }, [gastosFiltrados]);

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

  return (
    <div className="p-6 bg-gradient-to-br from-teal-50/30 to-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-teal-600" />
            Gastos No Impactados
          </h1>
          <p className="text-gray-500 mt-1">
            Gestión de gastos operativos • {getPeriodoLabel(filtros.periodo || getPeriodoActual())}
          </p>
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
                  className="w-full px-4 py-3 text-left hover:bg-teal-50 flex items-center gap-3 rounded-b-lg border-t"
                >
                  <Building className="w-5 h-5 text-violet-600" />
                  <div>
                    <div className="font-medium text-gray-900">Proveedores</div>
                    <div className="text-xs text-gray-500">{proveedores.length} registros</div>
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
            {/* KPIs Principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              {/* Total Período */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="col-span-2 bg-gradient-to-br from-teal-500 to-teal-600 p-5 rounded-xl shadow-lg shadow-teal-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-teal-100 text-sm font-medium">Total Período</p>
                    <p className="text-3xl font-bold text-white mt-1">{formatCurrency(totales.total)}</p>
                    <p className="text-teal-200 text-xs mt-1">
                      {totales.cantidad} registros • IVA: {formatCurrency(totales.iva)}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                </div>
              </motion.div>

              {/* Validados */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-medium">Validados</p>
                    <p className="text-xl font-bold text-emerald-700">{contadores.correctos}</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(contadores.correctos / Math.max(totales.cantidad, 1)) * 100}%` }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
                <p className="text-[10px] text-emerald-600 mt-1">{formatCurrency(dashboardData.totalCorrectosAmount)}</p>
              </motion.div>

              {/* Pendientes */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-medium">Pendientes</p>
                    <p className="text-xl font-bold text-amber-700">{contadores.pendientes}</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(contadores.pendientes / Math.max(totales.cantidad, 1)) * 100}%` }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
                <p className="text-[10px] text-amber-600 mt-1">{formatCurrency(dashboardData.totalPendientesAmount)}</p>
              </motion.div>

              {/* Pagados */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-medium">Pagados</p>
                    <p className="text-xl font-bold text-blue-700">{contadores.pagados}</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(contadores.pagados / Math.max(totales.cantidad, 1)) * 100}%` }}
                    transition={{ delay: 0.7, duration: 0.8 }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
                <p className="text-[10px] text-blue-600 mt-1">{formatCurrency(dashboardData.totalPagadosAmount)}</p>
              </motion.div>

              {/* Por Pagar */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="bg-white p-4 rounded-xl shadow-sm border border-rose-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-100 rounded-lg">
                    <Wallet className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-medium">Por Pagar</p>
                    <p className="text-xl font-bold text-rose-700">{dashboardData.porPago.pendientes.length}</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-rose-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(dashboardData.porPago.pendientes.length / Math.max(totales.cantidad, 1)) * 100}%` }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    className="h-full bg-rose-500 rounded-full"
                  />
                </div>
                <p className="text-[10px] text-rose-600 mt-1">{formatCurrency(dashboardData.totalPorPagarAmount)}</p>
              </motion.div>
            </div>

            {/* Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Distribución por Cuenta */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white p-5 rounded-xl shadow-sm border lg:col-span-2"
              >
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-teal-600" />
                  Distribución por Cuenta
                </h3>
                <div className="space-y-3">
                  {Object.entries(dashboardData.porCuenta)
                    .sort((a, b) => b[1].total - a[1].total)
                    .slice(0, 6)
                    .map(([cuenta, data], index) => {
                      const maxTotal = Math.max(...Object.values(dashboardData.porCuenta).map(d => d.total));
                      const percentage = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
                      return (
                        <div key={cuenta}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-gray-700 truncate max-w-[200px]">{cuenta}</span>
                            <span className="text-xs font-bold text-gray-900">{formatCurrency(data.total)}</span>
                          </div>
                          <div className="relative h-6 bg-gray-100 rounded-lg overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                              className="h-full rounded-lg flex items-center justify-end pr-2"
                              style={{ backgroundColor: MINT_COLORS[index % MINT_COLORS.length] }}
                            >
                              {percentage > 20 && (
                                <span className="text-[10px] font-bold text-white">{data.count} reg</span>
                              )}
                            </motion.div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </motion.div>

              {/* Top Proveedores */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white p-5 rounded-xl shadow-sm border"
              >
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Building className="w-4 h-4 text-violet-600" />
                  Top 5 Proveedores
                </h3>
                <div className="space-y-3">
                  {dashboardData.topProveedores.map(([prov, total], index) => (
                    <motion.div
                      key={prov}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-teal-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{prov}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(total)}</p>
                      </div>
                    </motion.div>
                  ))}
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
          <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <thead className="bg-gradient-to-r from-teal-50 to-teal-100/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-teal-800 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-teal-800 uppercase">Proveedor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-teal-800 uppercase">Concepto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-teal-800 uppercase">Clave</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-teal-800 uppercase">Cuenta</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-teal-800 uppercase">Subtotal</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-teal-800 uppercase">IVA</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-teal-800 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-teal-800 uppercase">Valid.</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-teal-800 uppercase">Pago</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-teal-800 uppercase">Ejecutivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-500" />
                    <p className="text-gray-500">Cargando gastos...</p>
                  </td>
                </tr>
              ) : gastosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
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
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {formatDate(gasto.fecha_gasto)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-40 truncate font-medium">
                      {gasto.proveedor || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-52 truncate">
                      {gasto.concepto}
                    </td>
                    <td className="px-4 py-3">
                      {gasto.clave && (
                        <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-mono rounded">
                          {gasto.clave}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-32 truncate">
                      {gasto.cuenta || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 font-mono">
                      {formatCurrency(gasto.subtotal || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500 font-mono">
                      {formatCurrency(gasto.iva || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 font-mono">
                      {formatCurrency(gasto.total || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {gasto.validacion === 'correcto' ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100" title="Correcto">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </span>
                      ) : gasto.validacion === 'revisar' ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100" title="Revisar">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100" title="Pendiente">
                          <Clock className="w-4 h-4 text-amber-600" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {gasto.status_pago === 'pagado' ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100" title="Pagado">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100" title="Pendiente">
                          <Wallet className="w-4 h-4 text-gray-400" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-28 truncate">
                      {gasto.ejecutivo || '-'}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
            {gastosFiltrados.length > 0 && (
              <tfoot className="bg-gradient-to-r from-teal-50 to-teal-100/50 border-t-2 border-teal-200">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-teal-800">
                    Total ({totales.cantidad} registros)
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-teal-900 font-mono">
                    {formatCurrency(totales.subtotal)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-teal-700 font-mono">
                    {formatCurrency(totales.iva)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-teal-900 font-mono text-lg">
                    {formatCurrency(totales.total)}
                  </td>
                  <td colSpan={3}></td>
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

      {/* Modal CRUD de Catálogos */}
      <AnimatePresence>
        {catalogoActivo && (
          <CatalogoCRUDModal
            tipo={catalogoActivo}
            claves={claves}
            ejecutivos={ejecutivos}
            proveedores={proveedores}
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
  tipo: 'claves' | 'ejecutivos' | 'proveedores';
  claves: ClaveGasto[];
  ejecutivos: Ejecutivo[];
  proveedores: Proveedor[];
  companyId: string;
  onClose: () => void;
  onRefresh: () => void;
}

const CatalogoCRUDModal: React.FC<CatalogoCRUDModalProps> = ({
  tipo,
  claves,
  ejecutivos,
  proveedores,
  companyId,
  onClose,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});

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
    } else {
      return proveedores.filter(p =>
        p.razon_social.toLowerCase().includes(term) ||
        p.rfc?.toLowerCase().includes(term) ||
        p.nombre_comercial?.toLowerCase().includes(term)
      );
    }
  }, [tipo, claves, ejecutivos, proveedores, searchTerm]);

  const titulo = tipo === 'claves' ? 'Claves de Gasto' : tipo === 'ejecutivos' ? 'Ejecutivos' : 'Proveedores';
  const IconComponent = tipo === 'claves' ? Tag : tipo === 'ejecutivos' ? Users : Building;

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
              {tipo === 'claves' && (
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

              {tipo === 'ejecutivos' && (
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

              {tipo === 'proveedores' && (
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
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GastosNoImpactadosPage;
