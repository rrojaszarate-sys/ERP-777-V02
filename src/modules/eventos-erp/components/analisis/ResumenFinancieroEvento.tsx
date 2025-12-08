import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  AreaChart, Area, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, BarChart3, Activity, Layers
} from 'lucide-react';
import { useTheme } from '../../../../shared/components/theme';
import { formatCurrency } from '../../../../shared/utils/formatters';

interface ResumenFinancieroEventoProps {
  evento: any;
  gastos: any[];
  ingresos: any[];
  provisiones: any[];
  showIVA?: boolean;
}

type ChartType = 'bar' | 'area' | 'gauge';

/**
 * Resumen Financiero Compacto - Estilo Excel doTERRA
 * Por default muestra UTILIDAD BRUTA (sin IVA)
 * CORREGIDO: Suma TODOS los gastos sin filtros de categoría
 */
export const ResumenFinancieroEvento: React.FC<ResumenFinancieroEventoProps> = ({
  evento,
  gastos,
  ingresos,
  provisiones,
  showIVA = false
}) => {
  const { paletteConfig, isDark } = useTheme();
  const [chartType, setChartType] = useState<ChartType>('bar');
  // Usar directamente el prop showIVA del header principal (sin switch local)
  const mostrarTotales = showIVA;

  // Colores de la paleta dinámica (menta/teal)
  const colors = {
    primary: paletteConfig.primary || '#14B8A6',
    secondary: paletteConfig.secondary || '#0D9488',
    accent: paletteConfig.accent || '#2DD4BF',
    // Marco gris oscuro
    darkFrame: '#1F2937',
    mediumFrame: '#374151',
    lightFrame: '#4B5563',
    // Gradientes de menta para categorías
    cat1: paletteConfig.primary || '#14B8A6',
    cat2: '#0D9488',
    cat3: '#0F766E',
    cat4: '#115E59',
    cat5: '#134E4A',
    // Estados
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  };

  // ============================================================================
  // CÁLCULOS CORREGIDOS - SIN FILTROS DE CATEGORÍA
  // ============================================================================
  const calculos = useMemo(() => {
    // INGRESOS
    const ingresosTotal = ingresos.reduce((sum, i) => sum + (i.total || 0), 0);
    const ingresosSubtotal = ingresos.reduce((sum, i) => sum + (i.subtotal || i.total / 1.16 || 0), 0);
    const ingresosIVA = ingresosTotal - ingresosSubtotal;

    // EGRESOS - SUMA TOTAL DE TODOS LOS GASTOS (sin filtros)
    const gastosSubtotal = gastos.reduce((sum, g) => sum + (g.subtotal || g.total / 1.16 || 0), 0);
    const gastosIVA = gastos.reduce((sum, g) => sum + (g.iva || 0), 0);
    const gastosTotal = gastos.reduce((sum, g) => sum + (g.total || 0), 0);

    // PROVISIONES
    const provSubtotal = provisiones.reduce((sum, p) => sum + (p.subtotal || p.total || 0), 0);
    const provIVA = provisiones.reduce((sum, p) => sum + (p.iva || 0), 0);
    const provTotal = provisiones.reduce((sum, p) => sum + (p.total || 0), 0);

    // TOTAL EGRESOS = Gastos + Provisiones
    const egresosSubtotal = gastosSubtotal + provSubtotal;
    const egresosIVA = gastosIVA + provIVA;
    const egresosTotal = gastosTotal + provTotal;

    // UTILIDAD
    const utilidadBruta = ingresosSubtotal - egresosSubtotal;
    const utilidadTotal = ingresosTotal - egresosTotal;

    // PORCENTAJES - Base: Subtotal de Ingresos (como en Excel)
    const pctEgresosEnUtilidad = ingresosSubtotal > 0 ? (egresosSubtotal / ingresosSubtotal) * 100 : 0;
    const pctUtilidadBruta = ingresosSubtotal > 0 ? (utilidadBruta / ingresosSubtotal) * 100 : 0;
    const pctEgresosTotalConIVA = ingresosSubtotal > 0 ? (egresosTotal / ingresosSubtotal) * 100 : 0;
    const pctEgresosConIVA = ingresosTotal > 0 ? (egresosTotal / ingresosTotal) * 100 : 0;
    const pctUtilidadConIVA = ingresosTotal > 0 ? (utilidadTotal / ingresosTotal) * 100 : 0;

    // AGRUPAR GASTOS POR CATEGORÍA REAL
    const categoriasTotales: Record<string, { subtotal: number; iva: number; total: number; color: string }> = {};

    gastos.forEach(g => {
      const catNombre = g.categoria?.nombre || 'Sin Categoría';
      const catColor = g.categoria?.color || colors.lightFrame;

      if (!categoriasTotales[catNombre]) {
        categoriasTotales[catNombre] = { subtotal: 0, iva: 0, total: 0, color: catColor };
      }

      categoriasTotales[catNombre].subtotal += (g.subtotal || g.total / 1.16 || 0);
      categoriasTotales[catNombre].iva += (g.iva || 0);
      categoriasTotales[catNombre].total += (g.total || 0);
    });

    // Agregar provisiones como categoría
    if (provTotal > 0) {
      categoriasTotales['PROVISIONES'] = {
        subtotal: provSubtotal,
        iva: provIVA,
        total: provTotal,
        color: colors.accent
      };
    }

    return {
      ingresos: { total: ingresosTotal, subtotal: ingresosSubtotal, iva: ingresosIVA },
      egresos: { total: egresosTotal, subtotal: egresosSubtotal, iva: egresosIVA },
      utilidad: { bruta: utilidadBruta, total: utilidadTotal },
      categorias: categoriasTotales,
      porcentajes: {
        egresosEnUtilidad: pctEgresosEnUtilidad,
        utilidadBruta: pctUtilidadBruta,
        egresosConIVA: pctEgresosConIVA,
        utilidadConIVA: pctUtilidadConIVA,
        egresosTotalConIVA: pctEgresosTotalConIVA
      }
    };
  }, [gastos, ingresos, provisiones, colors]);

  // Datos para gráfica de egresos
  const egresosChartData = useMemo(() => {
    const categoriasArr = Object.entries(calculos.categorias)
      .filter(([_, data]) => data.total > 0)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([nombre, data], idx) => {
        const pct = calculos.ingresos.subtotal > 0 ? (data.total / calculos.ingresos.subtotal) * 100 : 0;
        // Usar gradiente de colores menta
        const gradientColors = [colors.cat1, colors.cat2, colors.cat3, colors.cat4, colors.cat5];
        return {
          name: nombre,
          value: data.total,
          subtotal: data.subtotal,
          iva: data.iva,
          porcentaje: pct,
          fill: gradientColors[idx % gradientColors.length]
        };
      });
    return categoriasArr;
  }, [calculos, colors]);

  // Datos para gráfica de utilidad
  const utilidadChartData = useMemo(() => {
    const pctEgresos = mostrarTotales ? calculos.porcentajes.egresosConIVA : calculos.porcentajes.egresosEnUtilidad;
    const pctUtilidad = mostrarTotales ? calculos.porcentajes.utilidadConIVA : calculos.porcentajes.utilidadBruta;

    return [
      { name: 'Egresos', value: Math.abs(pctEgresos), fill: colors.secondary },
      { name: 'Utilidad', value: Math.max(0, pctUtilidad), fill: pctUtilidad >= 0 ? colors.success : colors.danger },
    ];
  }, [calculos, mostrarTotales, colors]);

  // Componente Velocímetro/Gauge compacto
  const GaugeChart = ({ value, max = 100, color }: { value: number; max?: number; color: string }) => {
    const percentage = Math.min(Math.max(value, 0), max);
    const angle = (percentage / max) * 180;

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.danger} />
              <stop offset="50%" stopColor={colors.warning} />
              <stop offset="100%" stopColor={colors.success} />
            </linearGradient>
            <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.2"/>
            </filter>
          </defs>

          {/* Arco de fondo */}
          <path
            d="M 25 95 A 75 75 0 0 1 175 95"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.25"
          />

          {/* Arco de valor */}
          <path
            d="M 25 95 A 75 75 0 0 1 175 95"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(angle / 180) * 235.6} 235.6`}
            filter="url(#gaugeShadow)"
          />

          {/* Aguja */}
          <g transform={`rotate(${angle - 90}, 100, 95)`}>
            <polygon points="100,28 96,95 104,95" fill={colors.darkFrame} />
            <circle cx="100" cy="95" r="6" fill={colors.darkFrame} />
            <circle cx="100" cy="95" r="3" fill="white" />
          </g>

          {/* Marcas */}
          {[0, 50, 100].map((mark, i) => {
            const markAngle = (mark / 100) * 180 - 90;
            const rad = (markAngle * Math.PI) / 180;
            const x = 100 + 88 * Math.cos(rad);
            const y = 95 + 88 * Math.sin(rad);
            return (
              <text key={i} x={x} y={y} textAnchor="middle" fontSize="9" fill={colors.mediumFrame} fontWeight="500">
                {mark}%
              </text>
            );
          })}

          {/* Valor central */}
          <text x="100" y="85" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>
            {value.toFixed(1)}%
          </text>
          <text x="100" y="100" textAnchor="middle" fontSize="8" fill={colors.mediumFrame}>
            Margen
          </text>
        </svg>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-xl border border-slate-200 text-xs">
          <p className="font-bold text-slate-800 dark:text-white">{data.name}</p>
          {data.subtotal !== undefined && <p className="text-slate-600">Subtotal: {formatCurrency(data.subtotal)}</p>}
          {data.iva !== undefined && <p className="text-slate-400">IVA: {formatCurrency(data.iva)}</p>}
          <p className="font-semibold" style={{ color: data.fill }}>Total: {formatCurrency(data.value)}</p>
          {data.porcentaje !== undefined && <p className="text-slate-500">{data.porcentaje.toFixed(2)}%</p>}
        </div>
      );
    }
    return null;
  };

  // Botones de tipo de gráfica reutilizable
  const ChartTypeButtons = () => (
    <div className="flex gap-0.5 bg-white/20 rounded p-0.5">
      {[
        { type: 'bar' as ChartType, icon: BarChart3 },
        { type: 'area' as ChartType, icon: Layers },
        { type: 'gauge' as ChartType, icon: Activity },
      ].map(({ type, icon: Icon }) => (
        <button
          key={type}
          onClick={() => setChartType(type)}
          className={`p-1 rounded transition-all ${chartType === type ? 'bg-white/30' : 'hover:bg-white/10'}`}
        >
          <Icon className="w-3 h-3 text-white" />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-2">
      {/* GRID: EGRESOS + UTILIDAD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* ============ RESUMEN EGRESOS ============ */}
        <div
          className="rounded-lg overflow-hidden shadow-md"
          style={{ border: `1px solid ${colors.darkFrame}` }}
        >
          {/* Header con botones de gráfica */}
          <div
            className="px-3 py-1.5 flex items-center justify-between"
            style={{ backgroundColor: colors.darkFrame }}
          >
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-white" />
              <h3 className="text-sm font-bold text-white">RESUMEN EGRESOS</h3>
            </div>
            <ChartTypeButtons />
          </div>

          {/* Tabla */}
          <div className="bg-white dark:bg-slate-800 p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: colors.lightFrame }} className="text-white">
                    <th className="text-left py-1.5 px-2 font-semibold rounded-tl">Concepto</th>
                    <th className="text-right py-1.5 px-2 font-semibold">Sub-Total</th>
                    <th className="text-right py-1.5 px-2 font-semibold">I.V.A</th>
                    <th className="text-right py-1.5 px-2 font-semibold">Total</th>
                    <th className="text-right py-1.5 px-2 font-semibold rounded-tr">%</th>
                  </tr>
                </thead>
                <tbody>
                  {egresosChartData.map((cat, idx) => (
                    <tr
                      key={cat.name}
                      className={`border-b border-slate-100 transition-colors hover:bg-teal-50 dark:hover:bg-teal-900/20 ${
                        idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-750'
                      }`}
                    >
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full shadow-sm"
                            style={{ backgroundColor: cat.fill }}
                          />
                          <span className="font-medium text-slate-700 dark:text-slate-200">{cat.name}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-slate-600 dark:text-slate-300">
                        {formatCurrency(cat.subtotal)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-slate-400">
                        {formatCurrency(cat.iva)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-semibold text-slate-800 dark:text-white">
                        {formatCurrency(cat.value)}
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: cat.fill }}
                        >
                          {cat.porcentaje.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: colors.secondary }} className="text-white font-bold text-xs">
                    <td className="py-2 px-2 rounded-bl">TOTAL EGRESOS</td>
                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(calculos.egresos.subtotal)}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(calculos.egresos.iva)}</td>
                    <td className="py-2 px-2 text-right font-mono text-sm">{formatCurrency(calculos.egresos.total)}</td>
                    <td className="py-2 px-2 text-right rounded-br">
                      <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                        {calculos.porcentajes.egresosTotalConIVA.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Gráfica de Egresos - DEBAJO de la tabla */}
            <div className="mt-2 h-[140px] bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded p-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={chartType + '-egresos'}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={egresosChartData} layout="vertical" margin={{ left: 5, right: 25, top: 5, bottom: 5 }}>
                        <defs>
                          {egresosChartData.map((entry, i) => (
                            <React.Fragment key={i}>
                              {/* Gradiente 3D para las barras */}
                              <linearGradient id={`bar3d${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                                <stop offset="50%" stopColor={entry.fill} stopOpacity={0.9} />
                                <stop offset="100%" stopColor={entry.fill} stopOpacity={0.6} />
                              </linearGradient>
                              {/* Brillo superior */}
                              <linearGradient id={`barShine${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="white" stopOpacity={0.4} />
                                <stop offset="30%" stopColor="white" stopOpacity={0.1} />
                                <stop offset="100%" stopColor="white" stopOpacity={0} />
                              </linearGradient>
                            </React.Fragment>
                          ))}
                          <filter id="barShadow3d" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.2"/>
                          </filter>
                        </defs>
                        <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 9, fill: colors.mediumFrame }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 9, fill: colors.mediumFrame }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="porcentaje" radius={[0, 6, 6, 0]} filter="url(#barShadow3d)">
                          {egresosChartData.map((entry, i) => (
                            <Cell key={i} fill={`url(#bar3d${i})`} stroke={entry.fill} strokeWidth={1} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : chartType === 'area' ? (
                      <AreaChart data={egresosChartData} margin={{ left: 5, right: 20, top: 5, bottom: 5 }}>
                        <defs>
                          <linearGradient id="areaGradient3d" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colors.primary} stopOpacity={0.9} />
                            <stop offset="50%" stopColor={colors.primary} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={colors.primary} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="value" stroke={colors.primary} strokeWidth={2} fill="url(#areaGradient3d)" />
                      </AreaChart>
                    ) : (
                      <BarChart data={egresosChartData} margin={{ left: 5, right: 20, top: 10, bottom: 5 }}>
                        <defs>
                          {egresosChartData.map((entry, i) => (
                            <linearGradient key={i} id={`barVert3d${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                              <stop offset="100%" stopColor={entry.fill} stopOpacity={0.5} />
                            </linearGradient>
                          ))}
                          <filter id="barVertShadow" x="-10%" y="-10%" width="120%" height="130%">
                            <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.25"/>
                          </filter>
                        </defs>
                        <XAxis dataKey="name" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="porcentaje" radius={[6, 6, 0, 0]} filter="url(#barVertShadow)">
                          {egresosChartData.map((entry, i) => (
                            <Cell key={i} fill={`url(#barVert3d${i})`} stroke={entry.fill} strokeWidth={1} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ============ RESUMEN UTILIDAD ============ */}
        <div
          className="rounded-lg overflow-hidden shadow-md"
          style={{ border: `1px solid ${colors.darkFrame}` }}
        >
          {/* Header con botones de gráfica */}
          <div
            className="px-3 py-1.5 flex items-center justify-between"
            style={{ backgroundColor: colors.primary }}
          >
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-white" />
              <h3 className="text-sm font-bold text-white">
                RESUMEN UTILIDAD {mostrarTotales ? '' : 'BRUTA'}
              </h3>
            </div>
            <ChartTypeButtons />
          </div>

          {/* Tabla */}
          <div className="bg-white dark:bg-slate-800 p-3">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: colors.lightFrame }} className="text-white">
                  <th className="text-left py-1.5 px-2 font-semibold rounded-tl">CONCEPTO</th>
                  <th className="text-right py-1.5 px-2 font-semibold">MONTO</th>
                  <th className="text-right py-1.5 px-2 font-semibold rounded-tr">PORCENTAJE</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                  <td className="py-2 px-2 font-medium text-slate-700 dark:text-slate-200">SUMA DE INGRESOS</td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-sm text-slate-800 dark:text-slate-100">
                    {formatCurrency(mostrarTotales ? calculos.ingresos.total : calculos.ingresos.subtotal)}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200">
                      100%
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50 dark:bg-slate-750 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                  <td className="py-2 px-2 font-medium text-slate-700 dark:text-slate-200">SUMA DE EGRESOS</td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-sm text-slate-800 dark:text-slate-100">
                    {formatCurrency(mostrarTotales ? calculos.egresos.total : calculos.egresos.subtotal)}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200">
                      {(mostrarTotales ? calculos.porcentajes.egresosConIVA : calculos.porcentajes.egresosEnUtilidad).toFixed(2)}%
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr
                  className="font-bold text-white"
                  style={{
                    backgroundColor: (mostrarTotales ? calculos.utilidad.total : calculos.utilidad.bruta) >= 0
                      ? colors.success
                      : colors.danger
                  }}
                >
                  <td className="py-2 px-2 rounded-bl text-sm">
                    UTILIDAD {mostrarTotales ? '' : 'BRUTA'}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-base">
                    {formatCurrency(mostrarTotales ? calculos.utilidad.total : calculos.utilidad.bruta)}
                  </td>
                  <td className="py-2 px-2 text-right rounded-br">
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                      {(mostrarTotales ? calculos.porcentajes.utilidadConIVA : calculos.porcentajes.utilidadBruta).toFixed(2)}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Gráfica de Utilidad - DEBAJO de la tabla */}
            <div className="mt-2 h-[150px] bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded">
              <AnimatePresence mode="wait">
                <motion.div
                  key={chartType + '-utilidad'}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full h-full"
                >
                  {chartType === 'gauge' ? (
                    <GaugeChart
                      value={Math.max(0, mostrarTotales ? calculos.porcentajes.utilidadConIVA : calculos.porcentajes.utilidadBruta)}
                      color={(mostrarTotales ? calculos.utilidad.total : calculos.utilidad.bruta) >= 0 ? colors.success : colors.danger}
                    />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'bar' ? (
                        <BarChart
                          data={[
                            { name: 'Ingresos', value: mostrarTotales ? calculos.ingresos.total : calculos.ingresos.subtotal, color: colors.primary },
                            { name: 'Egresos', value: mostrarTotales ? calculos.egresos.total : calculos.egresos.subtotal, color: colors.secondary },
                            { name: 'Utilidad', value: Math.abs(mostrarTotales ? calculos.utilidad.total : calculos.utilidad.bruta), color: (mostrarTotales ? calculos.utilidad.total : calculos.utilidad.bruta) >= 0 ? colors.success : colors.danger },
                          ]}
                          margin={{ left: 5, right: 15, top: 10, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id="ing3d" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={colors.primary} stopOpacity={1} />
                              <stop offset="100%" stopColor={colors.primary} stopOpacity={0.5} />
                            </linearGradient>
                            <linearGradient id="egr3d" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={colors.secondary} stopOpacity={1} />
                              <stop offset="100%" stopColor={colors.secondary} stopOpacity={0.5} />
                            </linearGradient>
                            <linearGradient id="util3d" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={colors.success} stopOpacity={1} />
                              <stop offset="100%" stopColor={colors.success} stopOpacity={0.5} />
                            </linearGradient>
                            <filter id="utilBarShadow" x="-10%" y="-10%" width="120%" height="130%">
                              <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.3"/>
                            </filter>
                          </defs>
                          <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 500 }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]} filter="url(#utilBarShadow)">
                            <Cell fill="url(#ing3d)" stroke={colors.primary} strokeWidth={1} />
                            <Cell fill="url(#egr3d)" stroke={colors.secondary} strokeWidth={1} />
                            <Cell fill="url(#util3d)" stroke={colors.success} strokeWidth={1} />
                          </Bar>
                        </BarChart>
                      ) : (
                        <PieChart>
                          <defs>
                            <filter id="pie3dShadow" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3"/>
                            </filter>
                            {utilidadChartData.map((entry, i) => (
                              <linearGradient key={i} id={`pie3d${i}`} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                                <stop offset="100%" stopColor={entry.fill} stopOpacity={0.7} />
                              </linearGradient>
                            ))}
                          </defs>
                          <Pie
                            data={utilidadChartData}
                            cx="50%" cy="45%"
                            innerRadius={35}
                            outerRadius={55}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, value }) => `${value.toFixed(0)}%`}
                            labelLine={false}
                            filter="url(#pie3dShadow)"
                          >
                            {utilidadChartData.map((entry, i) => (
                              <Cell key={i} fill={`url(#pie3d${i})`} stroke="white" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={24} iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Indicadores compactos - estilo sobrio */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="p-2 rounded border border-slate-200 bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Margen</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {(mostrarTotales ? calculos.porcentajes.utilidadConIVA : calculos.porcentajes.utilidadBruta).toFixed(1)}%
                </p>
              </div>
              <div className="p-2 rounded border border-slate-200 bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Estado</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {(mostrarTotales ? calculos.utilidad.total : calculos.utilidad.bruta) >= 0 ? 'Rentable' : 'Déficit'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumenFinancieroEvento;
