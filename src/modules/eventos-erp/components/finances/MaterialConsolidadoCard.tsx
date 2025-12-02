/**
 * TARJETA COLAPSABLE PARA MATERIALES CONSOLIDADOS
 *
 * Muestra un resumen de la entrada/salida de materiales
 * con opción de expandir para ver el detalle completo.
 *
 * Características:
 * - Vista colapsada: Total, fecha, número de items, tipo
 * - Vista expandida: Lista de productos con cantidades y costos
 * - Paleta de colores dinámica
 * - Diseño responsivo y compacto
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, Package, ArrowDownLeft, ArrowUpRight,
  Calendar, Pencil, Trash2, FileText, Printer
} from 'lucide-react';
import { useTheme } from '../../../../shared/components/theme';
import { formatCurrency, formatDate } from '../../../../shared/utils/formatters';
import { Badge } from '../../../../shared/components/ui/Badge';

interface LineaMaterial {
  producto_id: number | null;
  producto_nombre: string;
  producto_clave: string;
  cantidad: number;
  costo_unitario: number;
  unidad: string;
  subtotal: number;
}

interface MaterialConsolidadoCardProps {
  gasto: {
    id: number;
    concepto: string;
    descripcion?: string;
    total: number;
    subtotal?: number;
    iva?: number;
    fecha_gasto: string;
    tipo_movimiento: 'gasto' | 'retorno';
    detalle_retorno?: string | LineaMaterial[];
    notas?: string;
    categoria?: {
      nombre: string;
      color: string;
    };
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const MaterialConsolidadoCard: React.FC<MaterialConsolidadoCardProps> = ({
  gasto,
  onEdit,
  onDelete,
  onPrint,
  canEdit = true,
  canDelete = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { paletteConfig, isDark } = useTheme();

  // Parsear detalle de materiales
  const lineas: LineaMaterial[] = useMemo(() => {
    if (!gasto.detalle_retorno) return [];
    try {
      if (typeof gasto.detalle_retorno === 'string') {
        return JSON.parse(gasto.detalle_retorno);
      }
      return gasto.detalle_retorno;
    } catch {
      return [];
    }
  }, [gasto.detalle_retorno]);

  // Determinar si es un material consolidado (tiene líneas)
  const esConsolidado = lineas.length > 0;

  // Configuración de colores según tipo
  const config = useMemo(() => {
    if (gasto.tipo_movimiento === 'retorno') {
      return {
        bgLight: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
        bgHover: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
        border: '#10B981',
        text: '#059669',
        icon: ArrowDownLeft,
        label: 'RETORNO',
        prefix: '-'
      };
    }
    return {
      bgLight: isDark ? `${paletteConfig.primary}15` : `${paletteConfig.primary}08`,
      bgHover: isDark ? `${paletteConfig.primary}20` : `${paletteConfig.primary}12`,
      border: paletteConfig.primary,
      text: paletteConfig.primary,
      icon: ArrowUpRight,
      label: 'INGRESO',
      prefix: ''
    };
  }, [gasto.tipo_movimiento, paletteConfig, isDark]);

  const IconoTipo = config.icon;

  // Si no es consolidado, mostrar como tarjeta simple
  if (!esConsolidado) {
    return (
      <div
        className="border rounded-lg p-3 transition-all"
        style={{
          backgroundColor: gasto.tipo_movimiento === 'retorno' ? config.bgLight : 'white',
          borderColor: gasto.tipo_movimiento === 'retorno' ? config.border + '40' : '#E5E7EB'
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {gasto.tipo_movimiento === 'retorno' && (
                <Badge variant="default" className="text-[10px] px-2 py-0.5" style={{ backgroundColor: config.bgLight, color: config.text }}>
                  {config.label}
                </Badge>
              )}
              <span className="font-medium text-gray-900 truncate">{gasto.concepto}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(gasto.fecha_gasto)}
              </span>
              {gasto.categoria && (
                <Badge variant="default" className="text-xs" style={{ backgroundColor: gasto.categoria.color + '20', color: gasto.categoria.color }}>
                  {gasto.categoria.nombre}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold" style={{ color: config.text }}>
              {config.prefix}{formatCurrency(gasto.total)}
            </span>
            <div className="flex gap-1">
              {canEdit && onEdit && (
                <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: config.text }}>
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {canDelete && onDelete && (
                <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tarjeta colapsable para materiales consolidados
  return (
    <div
      className="border-2 rounded-xl overflow-hidden transition-all"
      style={{
        borderColor: isExpanded ? config.border : (config.border + '40'),
        backgroundColor: config.bgLight
      }}
    >
      {/* Header - Siempre visible */}
      <div
        className="p-3 cursor-pointer transition-colors"
        style={{ backgroundColor: isExpanded ? config.bgHover : 'transparent' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {/* Icono de tipo y expand */}
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ backgroundColor: config.border + '20' }}
          >
            <IconoTipo className="w-5 h-5" style={{ color: config.text }} />
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="default"
                className="text-[10px] px-2 py-0.5 font-bold"
                style={{ backgroundColor: config.border + '25', color: config.text }}
              >
                {config.label}
              </Badge>
              <span className="text-sm font-medium text-gray-600">
                {lineas.length} material{lineas.length !== 1 ? 'es' : ''}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(gasto.fecha_gasto)}
              </span>
            </div>

            {/* Resumen de productos (colapsado) */}
            {!isExpanded && (
              <p className="text-sm text-gray-600 mt-1 truncate">
                {lineas.slice(0, 3).map(l => l.producto_nombre).join(', ')}
                {lineas.length > 3 && ` y ${lineas.length - 3} más...`}
              </p>
            )}
          </div>

          {/* Total y acciones */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="text-xl font-bold" style={{ color: config.text }}>
                {config.prefix}{formatCurrency(gasto.total)}
              </div>
              {gasto.subtotal && (
                <div className="text-[10px] text-gray-500">
                  Sub: {formatCurrency(gasto.subtotal)} + IVA
                </div>
              )}
            </div>

            {/* Botón expandir */}
            <button
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: config.border + '15', color: config.text }}
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Contenido expandido */}
      {isExpanded && (
        <div className="border-t" style={{ borderColor: config.border + '30' }}>
          {/* Tabla de productos */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Producto</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 w-20">Cant.</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 w-16">Unidad</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600 w-24">Costo</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600 w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((linea, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-gray-100 hover:bg-white/70 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium text-gray-800 block truncate">
                            {linea.producto_nombre}
                          </span>
                          {linea.producto_clave && (
                            <span className="text-[10px] text-gray-400">{linea.producto_clave}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center font-semibold" style={{ color: config.text }}>
                      {linea.cantidad}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-500 text-xs">
                      {linea.unidad}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {formatCurrency(linea.costo_unitario)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: config.text }}>
                      {formatCurrency(linea.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2" style={{ borderColor: config.border + '40' }}>
                  <td colSpan={4} className="px-3 py-2 text-right font-semibold text-gray-600">
                    Subtotal:
                  </td>
                  <td className="px-3 py-2 text-right font-bold" style={{ color: config.text }}>
                    {formatCurrency(gasto.subtotal || lineas.reduce((s, l) => s + l.subtotal, 0))}
                  </td>
                </tr>
                {gasto.iva && (
                  <tr>
                    <td colSpan={4} className="px-3 py-1 text-right text-sm text-gray-500">
                      IVA 16%:
                    </td>
                    <td className="px-3 py-1 text-right text-gray-600">
                      {formatCurrency(gasto.iva)}
                    </td>
                  </tr>
                )}
                <tr style={{ backgroundColor: config.border + '15' }}>
                  <td colSpan={4} className="px-3 py-2 text-right font-bold" style={{ color: config.text }}>
                    TOTAL {gasto.tipo_movimiento === 'retorno' ? 'RETORNO' : 'INGRESO'}:
                  </td>
                  <td className="px-3 py-2 text-right text-lg font-bold" style={{ color: config.text }}>
                    {config.prefix}{formatCurrency(gasto.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notas si existen */}
          {gasto.notas && (
            <div className="px-3 py-2 bg-white/50 border-t" style={{ borderColor: config.border + '20' }}>
              <p className="text-xs text-gray-500">
                <FileText className="w-3 h-3 inline mr-1" />
                {gasto.notas}
              </p>
            </div>
          )}

          {/* Acciones */}
          <div
            className="px-3 py-2 flex justify-between items-center bg-white/70 border-t"
            style={{ borderColor: config.border + '30' }}
          >
            <div className="text-xs text-gray-500">
              ID: {gasto.id}
            </div>
            <div className="flex gap-2">
              {onPrint && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPrint(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ backgroundColor: config.border + '15', color: config.text }}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
              )}
              {canEdit && onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ backgroundColor: config.border + '15', color: config.text }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialConsolidadoCard;
