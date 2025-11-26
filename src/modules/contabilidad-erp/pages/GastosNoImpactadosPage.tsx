/**
 * PÁGINA: GASTOS NO IMPACTADOS
 * Dashboard para gestión de gastos operativos
 */

import { useState, useEffect, useMemo } from 'react';
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
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthProvider';
import {
  fetchGastosNoImpactados,
  fetchClavesGasto,
  fetchFormasPago,
  fetchProveedores,
  fetchEjecutivos,
  getPeriodoActual,
  getPeriodosDisponibles
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
import toast from 'react-hot-toast';

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

  // Contadores por estado
  const contadores = useMemo(() => {
    return {
      correctos: gastosFiltrados.filter(g => g.validacion === 'correcto').length,
      pendientes: gastosFiltrados.filter(g => g.validacion === 'pendiente').length,
      pagados: gastosFiltrados.filter(g => g.status_pago === 'pagado').length
    };
  }, [gastosFiltrados]);

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
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos No Impactados</h1>
          <p className="text-gray-500 mt-1">
            Gestión de gastos operativos - Período: {getPeriodoLabel(filtros.periodo || getPeriodoActual())}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importar Excel
          </button>
          <button
            onClick={() => setShowExportPDFModal(true)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Exportar PDF
          </button>
          <button
            onClick={() => setShowGastoModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Gasto
          </button>
        </div>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Período</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totales.total)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Validados</p>
              <p className="text-xl font-bold text-gray-900">{contadores.correctos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-xl font-bold text-gray-900">{contadores.pendientes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Registros</p>
              <p className="text-xl font-bold text-gray-900">{totales.cantidad}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por proveedor, concepto, clave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Selector de período */}
          <select
            value={filtros.periodo || ''}
            onChange={(e) => setFiltros({ ...filtros, periodo: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los períodos</option>
            {periodos.map(p => (
              <option key={p} value={p}>{getPeriodoLabel(p)}</option>
            ))}
          </select>

          {/* Toggle filtros avanzados */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
              showFilters ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>

          {/* Refrescar */}
          <button
            onClick={loadGastos}
            className="p-2 border rounded-lg hover:bg-gray-50"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clave</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IVA</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Validación</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ejecutivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Cargando gastos...
                  </td>
                </tr>
              ) : gastosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    No hay gastos para mostrar
                  </td>
                </tr>
              ) : (
                gastosFiltrados.map(gasto => (
                  <tr
                    key={gasto.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEditGasto(gasto)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(gasto.fecha_gasto)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-48 truncate">
                      {gasto.proveedor || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-64 truncate">
                      {gasto.concepto}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-blue-600">
                      {gasto.clave || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {gasto.cuenta || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(gasto.subtotal || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">
                      {formatCurrency(gasto.iva || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(gasto.total || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {gasto.validacion === 'correcto' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Correcto
                        </span>
                      ) : gasto.validacion === 'revisar' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Revisar
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          <Clock className="w-3 h-3 mr-1" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {gasto.ejecutivo || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {gasto.folio_factura || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {gastosFiltrados.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm font-medium text-gray-700">
                    Total ({totales.cantidad} registros)
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                    {formatCurrency(totales.subtotal)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-700">
                    {formatCurrency(totales.iva)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">
                    {formatCurrency(totales.total)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
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
    </div>
  );
};

export default GastosNoImpactadosPage;
