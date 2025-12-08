import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  PieChart,
  Copy,
  Calendar,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../../shared/utils/formatters';
import { useTheme } from '../../../../shared/components/theme';

interface GastosAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  gastos: any[];
  evento: any;
  eventoNombre: string;
}

export const GastosAnalysisModal: React.FC<GastosAnalysisModalProps> = ({
  isOpen,
  onClose,
  gastos,
  evento,
  eventoNombre
}) => {
  const { paletteConfig } = useTheme();

  const colors = {
    primary: paletteConfig.primary || '#14B8A6',
    secondary: paletteConfig.secondary || '#0D9488',
    dark: '#1E293B',
  };

  // Fechas del evento
  const eventoFechaInicio = evento?.fecha_inicio ? new Date(evento.fecha_inicio) : null;
  const eventoFechaFin = evento?.fecha_fin ? new Date(evento.fecha_fin) : null;

  // ============================================================================
  // ANÁLISIS DE DATOS
  // ============================================================================
  const analysis = useMemo(() => {
    let totalGastos = 0;
    const categoriasMap = new Map<string, number>();
    const proveedoresMap = new Map<string, number>();
    const alertas: { tipo: string; mensaje: string; monto: number; gasto: any }[] = [];
    const duplicateCheck = new Map<string, any>();

    gastos.forEach((gasto) => {
      const total = Number(gasto.total) || 0;
      const gastoFecha = gasto.fecha_gasto ? new Date(gasto.fecha_gasto) : null;
      totalGastos += total;

      // Acumular por categoría
      const catNombre = gasto.categoria?.nombre || 'Sin Categoría';
      categoriasMap.set(catNombre, (categoriasMap.get(catNombre) || 0) + total);

      // Acumular por proveedor
      const provNombre = gasto.proveedor_nombre || gasto.proveedor?.razon_social || 'Sin Proveedor';
      proveedoresMap.set(provNombre, (proveedoresMap.get(provNombre) || 0) + total);

      // Detectar duplicados REALES: mismo monto + misma fecha + mismo proveedor + mismo concepto
      const fechaExacta = gasto.fecha_gasto?.split('T')[0] || '';
      const conceptoNorm = (gasto.concepto || '').toLowerCase().trim().substring(0, 50);
      if (fechaExacta && total > 0 && conceptoNorm) {
        const duplicateKey = `${total.toFixed(2)}-${fechaExacta}-${provNombre.toLowerCase().trim()}-${conceptoNorm}`;
        const existente = duplicateCheck.get(duplicateKey);
        if (existente && existente.id !== gasto.id) {
          alertas.push({
            tipo: 'duplicado',
            mensaje: `Duplicado exacto: mismo concepto, monto, fecha y proveedor`,
            monto: total,
            gasto
          });
        } else if (!existente) {
          duplicateCheck.set(duplicateKey, gasto);
        }
      }

      // Detectar fechas fuera del periodo
      if (gastoFecha && eventoFechaInicio && gastoFecha < eventoFechaInicio) {
        const dias = Math.ceil((eventoFechaInicio.getTime() - gastoFecha.getTime()) / (1000 * 60 * 60 * 24));
        if (dias > 7) { // Solo si es más de 7 días antes
          alertas.push({
            tipo: 'fecha',
            mensaje: `${dias} días antes del evento`,
            monto: total,
            gasto
          });
        }
      }

      if (gastoFecha && eventoFechaFin && gastoFecha > eventoFechaFin) {
        const dias = Math.ceil((gastoFecha.getTime() - eventoFechaFin.getTime()) / (1000 * 60 * 60 * 24));
        if (dias > 7) { // Solo si es más de 7 días después
          alertas.push({
            tipo: 'fecha',
            mensaje: `${dias} días después del evento`,
            monto: total,
            gasto
          });
        }
      }
    });

    // Top 10 gastos más altos
    const topGastos = [...gastos]
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 10);

    // Top categorías
    const topCategorias = Array.from(categoriasMap.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([nombre, total]) => ({
        nombre,
        total,
        porcentaje: totalGastos > 0 ? (total / totalGastos) * 100 : 0
      }));

    // Top 5 proveedores
    const topProveedores = Array.from(proveedoresMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([nombre, total]) => ({
        nombre,
        total,
        porcentaje: totalGastos > 0 ? (total / totalGastos) * 100 : 0
      }));

    // Ticket promedio
    const ticketPromedio = gastos.length > 0 ? totalGastos / gastos.length : 0;

    // Gasto más alto
    const gastoMasAlto = topGastos[0]?.total || 0;

    return {
      totalGastos,
      ticketPromedio,
      gastoMasAlto,
      topGastos,
      topCategorias,
      topProveedores,
      alertas,
      numGastos: gastos.length
    };
  }, [gastos, eventoFechaInicio, eventoFechaFin]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal - Grande */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-7xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">

              {/* Header */}
              <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: colors.dark }}>
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-white" />
                  <div>
                    <h2 className="text-lg font-bold text-white">Análisis de Gastos</h2>
                    <p className="text-slate-400 text-sm">{eventoNombre}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Content - Scrolleable */}
              <div className="p-6 overflow-y-auto flex-1">

                {/* ROW 1: Stats Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4" style={{ color: colors.primary }} />
                      <span className="text-xs text-slate-500 font-medium">TOTAL GASTOS</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{formatCurrency(analysis.totalGastos)}</p>
                    <p className="text-xs text-slate-400">{analysis.numGastos} registros</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4" style={{ color: colors.secondary }} />
                      <span className="text-xs text-slate-500 font-medium">GASTO MÁS ALTO</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{formatCurrency(analysis.gastoMasAlto)}</p>
                    <p className="text-xs text-slate-400">{analysis.topGastos[0]?.concepto?.substring(0, 25) || '-'}...</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-1">
                      <PieChart className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-slate-500 font-medium">TICKET PROMEDIO</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{formatCurrency(analysis.ticketPromedio)}</p>
                    <p className="text-xs text-slate-400">por gasto</p>
                  </div>

                  <div className={`rounded-lg p-4 border ${analysis.alertas.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {analysis.alertas.length > 0 ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      <span className="text-xs text-slate-500 font-medium">ALERTAS</span>
                    </div>
                    <p className={`text-xl font-bold ${analysis.alertas.length > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                      {analysis.alertas.length}
                    </p>
                    <p className="text-xs text-slate-400">
                      {analysis.alertas.length > 0 ? 'revisar' : 'todo ok'}
                    </p>
                  </div>
                </div>

                {/* ROW 2: Main Content - 3 columns */}
                <div className="grid grid-cols-3 gap-6">

                  {/* COL 1: Top 10 Gastos Más Altos */}
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" style={{ color: colors.primary }} />
                        Top 10 Gastos Más Altos
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {analysis.topGastos.map((gasto, idx) => (
                        <div key={gasto.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: colors.primary, opacity: 1 - (idx * 0.15) }}>
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{gasto.concepto}</p>
                            <p className="text-xs text-slate-400 truncate">{gasto.proveedor_nombre || 'Sin proveedor'}</p>
                          </div>
                          <span className="font-bold text-slate-700 text-sm">{formatCurrency(gasto.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* COL 2: Distribución por Categoría */}
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-purple-500" />
                        Distribución por Categoría
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      {analysis.topCategorias.slice(0, 5).map((cat, idx) => (
                        <div key={cat.nombre}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700 truncate">{cat.nombre}</span>
                            <span className="text-slate-500">{cat.porcentaje.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${cat.porcentaje}%`,
                                backgroundColor: colors.primary,
                                opacity: 1 - (idx * 0.12)
                              }}
                            />
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(cat.total)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* COL 3: Top Proveedores + Alertas */}
                  <div className="space-y-4">
                    {/* Top Proveedores */}
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                          <Users className="w-4 h-4 text-orange-500" />
                          Top Proveedores
                        </h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {analysis.topProveedores.slice(0, 4).map((prov, idx) => (
                          <div key={prov.nombre} className="px-4 py-2 flex items-center justify-between">
                            <span className="text-sm text-slate-700 truncate flex-1">{prov.nombre}</span>
                            <span className="text-sm font-semibold text-slate-800 ml-2">{formatCurrency(prov.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Alertas (si hay) - Muestra todas */}
                    {analysis.alertas.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-amber-100 border-b border-amber-200">
                          <h3 className="font-semibold text-amber-800 flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            Alertas ({analysis.alertas.length})
                          </h3>
                        </div>
                        <div className="divide-y divide-amber-100">
                          {analysis.alertas.map((alerta, idx) => (
                            <div key={idx} className="px-4 py-2 flex items-center gap-2">
                              {alerta.tipo === 'duplicado' ? (
                                <Copy className="w-3 h-3 text-amber-600 shrink-0" />
                              ) : (
                                <Calendar className="w-3 h-3 text-amber-600 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-amber-800 truncate">{alerta.gasto.concepto}</p>
                                <p className="text-xs text-amber-600">{alerta.mensaje}</p>
                              </div>
                              <span className="text-xs font-semibold text-amber-700">{formatCurrency(alerta.monto)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sin alertas */}
                    {analysis.alertas.length === 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium text-green-700">Sin alertas</p>
                        <p className="text-xs text-green-600">Todos los gastos lucen correctos</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  Periodo: {eventoFechaInicio ? formatDate(evento.fecha_inicio) : 'N/A'} - {eventoFechaFin ? formatDate(evento.fecha_fin) : 'N/A'}
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: colors.primary }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
