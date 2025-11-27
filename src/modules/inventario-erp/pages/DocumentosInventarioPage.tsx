import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../core/auth/AuthProvider';
import { useTheme } from '../../../shared/components/theme';
import { fetchDocumentosInventario, deleteDocumentoInventario, cancelarDocumento, confirmarDocumento, getEstadisticasDocumentos } from '../services/documentosInventarioService';
import { fetchAlmacenes } from '../services/inventarioService';
import { DocumentoInventarioForm } from '../components/DocumentoInventarioForm';
import { PDFDocumentoInventario } from '../components/PDFDocumentoInventario';
import { QRLabelGenerator } from '../components/QRLabelGenerator';
import { ConfirmDialog } from '../../../shared/components/ui';
import type { DocumentoInventarioResumen, TipoDocumentoInventario, EstadoDocumentoInventario, Almacen, Producto } from '../types';

export const DocumentosInventarioPage: React.FC = () => {
  const { userData, companyId } = useAuth();
  const { paletteConfig, isDark } = useTheme();

  // Estado
  const [documentos, setDocumentos] = useState<DocumentoInventarioResumen[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<any>(null);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<TipoDocumentoInventario | ''>('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoDocumentoInventario | ''>('');
  const [filtroAlmacen, setFiltroAlmacen] = useState<number | ''>('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(25);

  // Modales
  const [showForm, setShowForm] = useState(false);
  const [formTipo, setFormTipo] = useState<TipoDocumentoInventario>('salida');
  const [editingDoc, setEditingDoc] = useState<number | null>(null);
  const [viewingDoc, setViewingDoc] = useState<number | null>(null);
  const [showPDF, setShowPDF] = useState(false);
  const [pdfDocId, setPdfDocId] = useState<number | null>(null);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'cancel' | 'confirm'; docId: number } | null>(null);

  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    background: isDark ? '#111827' : '#f3f4f6',
    cardBg: isDark ? '#1f2937' : '#ffffff',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#f3f4f6' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
  }), [paletteConfig, isDark]);

  // Cargar datos iniciales
  const loadData = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      const [docsResult, almacenesData, statsData] = await Promise.all([
        fetchDocumentosInventario(companyId, {
          tipo: filtroTipo || undefined,
          estado: filtroEstado || undefined,
          almacenId: filtroAlmacen || undefined,
          fechaDesde: filtroFechaDesde || undefined,
          fechaHasta: filtroFechaHasta || undefined,
          limit: pageSize,
          offset: page * pageSize,
        }),
        fetchAlmacenes(companyId),
        getEstadisticasDocumentos(companyId),
      ]);

      setDocumentos(docsResult.data);
      setTotalCount(docsResult.count);
      setAlmacenes(almacenesData || []);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError(err.message || 'Error al cargar los documentos');
    } finally {
      setLoading(false);
    }
  }, [companyId, filtroTipo, filtroEstado, filtroAlmacen, filtroFechaDesde, filtroFechaHasta, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleNuevoDocumento = (tipo: TipoDocumentoInventario) => {
    setFormTipo(tipo);
    setEditingDoc(null);
    setShowForm(true);
  };

  const handleEditDocumento = (docId: number) => {
    setEditingDoc(docId);
    setShowForm(true);
  };

  const handleViewDocumento = (docId: number) => {
    setViewingDoc(docId);
    setShowForm(true);
  };

  const handleDeleteDocumento = async () => {
    if (!confirmAction || confirmAction.type !== 'delete') return;
    try {
      await deleteDocumentoInventario(confirmAction.docId);
      setConfirmAction(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const handleCancelDocumento = async () => {
    if (!confirmAction || confirmAction.type !== 'cancel') return;
    try {
      await cancelarDocumento(confirmAction.docId);
      setConfirmAction(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al cancelar');
    }
  };

  const handleConfirmDocumento = async () => {
    if (!confirmAction || confirmAction.type !== 'confirm') return;
    try {
      await confirmarDocumento(confirmAction.docId);
      setConfirmAction(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al confirmar');
    }
  };

  const handlePrintPDF = (docId: number) => {
    setPdfDocId(docId);
    setShowPDF(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingDoc(null);
    setViewingDoc(null);
    loadData();
  };

  // Estado badges
  const getEstadoBadge = (estado: EstadoDocumentoInventario) => {
    const styles: Record<EstadoDocumentoInventario, { bg: string; text: string; label: string }> = {
      borrador: { bg: '#fef3c7', text: '#92400e', label: 'Borrador' },
      confirmado: { bg: '#d1fae5', text: '#065f46', label: 'Confirmado' },
      cancelado: { bg: '#fee2e2', text: '#991b1b', label: 'Cancelado' },
    };
    const style = styles[estado];
    return (
      <span
        className="px-2 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {style.label}
      </span>
    );
  };

  const getTipoBadge = (tipo: TipoDocumentoInventario) => {
    const isEntrada = tipo === 'entrada';
    return (
      <span
        className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
        style={{
          backgroundColor: isEntrada ? '#dbeafe' : '#fce7f3',
          color: isEntrada ? '#1e40af' : '#9d174d',
        }}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isEntrada ? 'M3 16V8a5 5 0 015-5h8a5 5 0 015 5v8a5 5 0 01-5 5H8a5 5 0 01-5-5z M12 8v8 M8 12h8' : 'M3 16V8a5 5 0 015-5h8a5 5 0 015 5v8a5 5 0 01-5 5H8a5 5 0 01-5-5z M8 12h8'}
          />
        </svg>
        {isEntrada ? 'Entrada' : 'Salida'}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: themeColors.background }}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: themeColors.text }}>
            Documentos de Inventario
          </h1>
          <p className="text-sm mt-1" style={{ color: themeColors.textMuted }}>
            Entradas y salidas con firmas digitales
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowQRGenerator(true)}
            className="px-4 py-2 rounded-lg border flex items-center gap-2 hover:opacity-80 transition-all"
            style={{ borderColor: themeColors.border, color: themeColors.text }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Etiquetas QR
          </button>
          <button
            onClick={() => handleNuevoDocumento('entrada')}
            className="px-4 py-2 rounded-lg flex items-center gap-2 text-white hover:opacity-90 transition-all"
            style={{ backgroundColor: '#3b82f6' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Entrada
          </button>
          <button
            onClick={() => handleNuevoDocumento('salida')}
            className="px-4 py-2 rounded-lg flex items-center gap-2 text-white hover:opacity-90 transition-all"
            style={{ backgroundColor: themeColors.primary }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Salida
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, color: themeColors.primary },
            { label: 'Entradas', value: stats.entradas, color: '#3b82f6' },
            { label: 'Salidas', value: stats.salidas, color: '#ec4899' },
            { label: 'Borradores', value: stats.borradores, color: '#f59e0b' },
            { label: 'Confirmados', value: stats.confirmados, color: '#10b981' },
            { label: 'Cancelados', value: stats.cancelados, color: '#ef4444' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4"
              style={{ backgroundColor: themeColors.cardBg }}
            >
              <p className="text-xs" style={{ color: themeColors.textMuted }}>{stat.label}</p>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div
        className="rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4"
        style={{ backgroundColor: themeColors.cardBg }}
      >
        <div>
          <label className="block text-xs mb-1" style={{ color: themeColors.textMuted }}>Tipo</label>
          <select
            value={filtroTipo}
            onChange={(e) => { setFiltroTipo(e.target.value as any); setPage(0); }}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
          >
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: themeColors.textMuted }}>Estado</label>
          <select
            value={filtroEstado}
            onChange={(e) => { setFiltroEstado(e.target.value as any); setPage(0); }}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
          >
            <option value="">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="confirmado">Confirmado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: themeColors.textMuted }}>Almacén</label>
          <select
            value={filtroAlmacen}
            onChange={(e) => { setFiltroAlmacen(e.target.value ? Number(e.target.value) : ''); setPage(0); }}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
          >
            <option value="">Todos</option>
            {almacenes.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: themeColors.textMuted }}>Desde</label>
          <input
            type="date"
            value={filtroFechaDesde}
            onChange={(e) => { setFiltroFechaDesde(e.target.value); setPage(0); }}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: themeColors.textMuted }}>Hasta</label>
          <input
            type="date"
            value={filtroFechaHasta}
            onChange={(e) => { setFiltroFechaHasta(e.target.value); setPage(0); }}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              setFiltroTipo('');
              setFiltroEstado('');
              setFiltroAlmacen('');
              setFiltroFechaDesde('');
              setFiltroFechaHasta('');
              setPage(0);
            }}
            className="w-full px-3 py-2 rounded-lg border text-sm hover:opacity-80 transition-all"
            style={{ borderColor: themeColors.border, color: themeColors.textMuted }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: themeColors.cardBg }}>
        {loading ? (
          <div className="p-12 text-center" style={{ color: themeColors.textMuted }}>
            <svg className="w-8 h-8 mx-auto mb-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Cargando documentos...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">
            <p>{error}</p>
            <button onClick={loadData} className="mt-4 px-4 py-2 rounded-lg border border-red-300 hover:bg-red-50">
              Reintentar
            </button>
          </div>
        ) : documentos.length === 0 ? (
          <div className="p-12 text-center" style={{ color: themeColors.textMuted }}>
            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium mb-2">No hay documentos</p>
            <p className="text-sm">Crea tu primer documento de entrada o salida</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: isDark ? '#374151' : '#f9fafb' }}>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeColors.textMuted }}>
                      Documento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeColors.textMuted }}>
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeColors.textMuted }}>
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeColors.textMuted }}>
                      Almacén
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeColors.textMuted }}>
                      Evento
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: themeColors.textMuted }}>
                      Productos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeColors.textMuted }}>
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: themeColors.textMuted }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
                  {documentos.map((doc) => (
                    <tr key={doc.id} className="hover:opacity-90 transition-opacity">
                      <td className="px-4 py-3">
                        <p className="font-mono font-medium" style={{ color: themeColors.text }}>
                          {doc.numero_documento}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {getTipoBadge(doc.tipo)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: themeColors.text }}>
                        {new Date(doc.fecha).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: themeColors.text }}>
                        {doc.almacen_nombre}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: doc.evento_nombre ? themeColors.text : themeColors.textMuted }}>
                        {doc.evento_nombre || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium" style={{ backgroundColor: `${themeColors.primary}20`, color: themeColors.primary }}>
                          {doc.total_productos}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getEstadoBadge(doc.estado)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Ver/Editar */}
                          <button
                            onClick={() => doc.estado === 'borrador' ? handleEditDocumento(doc.id) : handleViewDocumento(doc.id)}
                            className="p-1.5 rounded-lg hover:opacity-80 transition-all"
                            style={{ backgroundColor: `${themeColors.primary}20`, color: themeColors.primary }}
                            title={doc.estado === 'borrador' ? 'Editar' : 'Ver'}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={doc.estado === 'borrador' ? 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'} />
                            </svg>
                          </button>

                          {/* Imprimir PDF */}
                          <button
                            onClick={() => handlePrintPDF(doc.id)}
                            className="p-1.5 rounded-lg hover:opacity-80 transition-all"
                            style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}
                            title="Imprimir PDF"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>

                          {/* Confirmar (solo borradores) */}
                          {doc.estado === 'borrador' && (
                            <button
                              onClick={() => setConfirmAction({ type: 'confirm', docId: doc.id })}
                              className="p-1.5 rounded-lg hover:opacity-80 transition-all"
                              style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
                              title="Confirmar"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}

                          {/* Cancelar (no cancelados) */}
                          {doc.estado !== 'cancelado' && (
                            <button
                              onClick={() => setConfirmAction({ type: 'cancel', docId: doc.id })}
                              className="p-1.5 rounded-lg hover:opacity-80 transition-all"
                              style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                              title="Cancelar"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}

                          {/* Eliminar (solo borradores) */}
                          {doc.estado === 'borrador' && (
                            <button
                              onClick={() => setConfirmAction({ type: 'delete', docId: doc.id })}
                              className="p-1.5 rounded-lg hover:opacity-80 transition-all"
                              style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
                              title="Eliminar"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 flex items-center justify-between border-t" style={{ borderColor: themeColors.border }}>
                <p className="text-sm" style={{ color: themeColors.textMuted }}>
                  Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)} de {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 rounded-lg border text-sm disabled:opacity-50 hover:opacity-80 transition-all"
                    style={{ borderColor: themeColors.border, color: themeColors.text }}
                  >
                    Anterior
                  </button>
                  <span className="text-sm" style={{ color: themeColors.text }}>
                    Página {page + 1} de {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded-lg border text-sm disabled:opacity-50 hover:opacity-80 transition-all"
                    style={{ borderColor: themeColors.border, color: themeColors.text }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modales */}
      {showForm && (
        <DocumentoInventarioForm
          tipo={formTipo}
          documentoId={editingDoc || viewingDoc}
          readOnly={viewingDoc !== null && editingDoc === null}
          onClose={handleFormClose}
          onSave={loadData}
        />
      )}

      {showPDF && pdfDocId && (
        <PDFDocumentoInventario
          documentoId={pdfDocId}
          onClose={() => { setShowPDF(false); setPdfDocId(null); }}
        />
      )}

      {showQRGenerator && (
        <QRLabelGenerator
          productos={productos}
          onClose={() => setShowQRGenerator(false)}
        />
      )}

      {/* Confirm Dialogs */}
      {confirmAction?.type === 'delete' && (
        <ConfirmDialog
          isOpen={true}
          title="Eliminar Documento"
          message="¿Estás seguro de eliminar este documento? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={handleDeleteDocumento}
          onCancel={() => setConfirmAction(null)}
          variant="danger"
        />
      )}

      {confirmAction?.type === 'cancel' && (
        <ConfirmDialog
          isOpen={true}
          title="Cancelar Documento"
          message="¿Estás seguro de cancelar este documento? Si ya fue confirmado, los movimientos de inventario NO serán revertidos."
          confirmLabel="Cancelar Documento"
          cancelLabel="Volver"
          onConfirm={handleCancelDocumento}
          onCancel={() => setConfirmAction(null)}
          variant="warning"
        />
      )}

      {confirmAction?.type === 'confirm' && (
        <ConfirmDialog
          isOpen={true}
          title="Confirmar Documento"
          message="¿Estás seguro de confirmar este documento? Se generarán los movimientos de inventario y no podrás editar el documento."
          confirmLabel="Confirmar"
          cancelLabel="Volver"
          onConfirm={handleConfirmDocumento}
          onCancel={() => setConfirmAction(null)}
          variant="success"
        />
      )}
    </div>
  );
};

export default DocumentosInventarioPage;
