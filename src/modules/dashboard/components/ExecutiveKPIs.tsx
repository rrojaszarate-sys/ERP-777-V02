/**
 * KPIs Ejecutivos - FASE 4.1
 * Panel de indicadores clave de rendimiento multimodular
 */
import { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  Skeleton,
  Progress,
  Chip,
  Tooltip
} from '@nextui-org/react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Briefcase,
  Receipt,
  Warehouse,
  CreditCard
} from 'lucide-react';
import { supabase } from '../../../core/config/supabase';
import { formatCurrency, formatPercentage } from '../../../shared/utils/formatters';

interface KPIData {
  // Eventos
  eventosActivos: number;
  eventosProximos: number;
  eventosCompletados: number;
  ingresosTotales: number;
  gastosTotales: number;
  utilidadNeta: number;
  margenPromedio: number;
  tasaCobranza: number;

  // Inventario
  productosActivos: number;
  productosStockBajo: number;
  valorInventario: number;
  reservasActivas: number;

  // Clientes
  clientesActivos: number;
  clientesNuevosMes: number;

  // Contabilidad
  polizasPendientes: number;
  cuentasPorCobrar: number;
  cuentasPorPagar: number;

  // Proyectos
  proyectosActivos: number;
  tareasVencidas: number;
}

interface ExecutiveKPIsProps {
  companyId: string;
  periodo?: 'mes' | 'trimestre' | 'anio';
}

export function ExecutiveKPIs({ companyId, periodo = 'mes' }: ExecutiveKPIsProps) {
  const [data, setData] = useState<KPIData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, [companyId, periodo]);

  const loadKPIs = async () => {
    setIsLoading(true);
    try {
      // Fechas del período
      const hoy = new Date();
      let fechaInicio: Date;

      switch (periodo) {
        case 'trimestre':
          fechaInicio = new Date(hoy.getFullYear(), Math.floor(hoy.getMonth() / 3) * 3, 1);
          break;
        case 'anio':
          fechaInicio = new Date(hoy.getFullYear(), 0, 1);
          break;
        default:
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      }

      const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
      const hoyStr = hoy.toISOString().split('T')[0];

      // Consultas paralelas para mejor performance
      const [
        eventosRes,
        ingresosRes,
        gastosRes,
        productosRes,
        clientesRes,
        reservasRes,
        polizasRes,
        proyectosRes,
        tareasRes
      ] = await Promise.all([
        // Eventos
        supabase
          .from('evt_eventos_erp')
          .select('id, estado_id, fecha_inicio')
          .eq('activo', true),

        // Ingresos del período
        supabase
          .from('evt_ingresos_erp')
          .select('total, cobrado')
          .gte('created_at', fechaInicioStr)
          .is('deleted_at', null),

        // Gastos del período
        supabase
          .from('evt_gastos_erp')
          .select('total, pagado')
          .gte('created_at', fechaInicioStr)
          .is('deleted_at', null),

        // Productos
        supabase
          .from('inv_productos_erp')
          .select('id, stock_actual, stock_minimo, costo_promedio')
          .eq('activo', true),

        // Clientes
        supabase
          .from('evt_clientes_erp')
          .select('id, created_at')
          .eq('activo', true),

        // Reservas activas
        supabase
          .from('reservas_stock_erp')
          .select('id')
          .in('estado', ['activa', 'parcial']),

        // Pólizas pendientes (no publicadas)
        supabase
          .from('polizas_erp')
          .select('id, status')
          .neq('status', 'publicada'),

        // Proyectos activos
        supabase
          .from('proy_proyectos')
          .select('id, status')
          .eq('activo', true)
          .in('status', ['en_progreso', 'activo', 'iniciado']),

        // Tareas vencidas
        supabase
          .from('proy_tareas')
          .select('id, fecha_fin, status')
          .lt('fecha_fin', hoyStr)
          .not('status', 'in', '("completada","cancelada")')
      ]);

      // Procesar eventos
      const eventos = eventosRes.data || [];
      const eventosActivos = eventos.filter(e => e.estado_id && e.estado_id < 5).length;
      const eventosProximos = eventos.filter(e => {
        if (!e.fecha_inicio) return false;
        const fecha = new Date(e.fecha_inicio);
        const en7Dias = new Date();
        en7Dias.setDate(en7Dias.getDate() + 7);
        return fecha >= hoy && fecha <= en7Dias;
      }).length;
      const eventosCompletados = eventos.filter(e => e.estado_id && e.estado_id >= 5).length;

      // Procesar ingresos
      const ingresos = ingresosRes.data || [];
      const ingresosTotales = ingresos.reduce((sum, i) => sum + (i.total || 0), 0);
      const ingresosCobrados = ingresos
        .filter(i => i.cobrado)
        .reduce((sum, i) => sum + (i.total || 0), 0);
      const tasaCobranza = ingresosTotales > 0 ? (ingresosCobrados / ingresosTotales) * 100 : 0;

      // Procesar gastos
      const gastos = gastosRes.data || [];
      const gastosTotales = gastos.reduce((sum, g) => sum + (g.total || 0), 0);
      const utilidadNeta = ingresosTotales - gastosTotales;
      const margenPromedio = ingresosTotales > 0 ? (utilidadNeta / ingresosTotales) * 100 : 0;

      // Procesar productos
      const productos = productosRes.data || [];
      const productosActivos = productos.length;
      const productosStockBajo = productos.filter(p =>
        (p.stock_actual || 0) <= (p.stock_minimo || 0)
      ).length;
      const valorInventario = productos.reduce((sum, p) =>
        sum + ((p.stock_actual || 0) * (p.costo_promedio || 0)), 0
      );

      // Procesar clientes
      const clientes = clientesRes.data || [];
      const clientesActivos = clientes.length;
      const clientesNuevosMes = clientes.filter(c => {
        if (!c.created_at) return false;
        return new Date(c.created_at) >= fechaInicio;
      }).length;

      // Reservas
      const reservasActivas = (reservasRes.data || []).length;

      // Pólizas pendientes (borrador, en_revision, etc)
      const polizasPendientes = (polizasRes.data || []).length;

      // Proyectos activos
      const proyectosActivos = (proyectosRes.data || []).length;

      // Tareas vencidas (fecha_fin pasada y no completadas)
      const tareasVencidas = (tareasRes.data || []).length;

      setData({
        eventosActivos,
        eventosProximos,
        eventosCompletados,
        ingresosTotales,
        gastosTotales,
        utilidadNeta,
        margenPromedio,
        tasaCobranza,
        productosActivos,
        productosStockBajo,
        valorInventario,
        reservasActivas,
        clientesActivos,
        clientesNuevosMes,
        polizasPendientes,
        cuentasPorCobrar: ingresosTotales - ingresosCobrados,
        cuentasPorPagar: gastos.filter(g => !g.pagado).reduce((sum, g) => sum + (g.total || 0), 0),
        proyectosActivos,
        tareasVencidas
      });

    } catch (err) {
      console.error('Error loading KPIs:', err);
      // Datos de fallback
      setData({
        eventosActivos: 0,
        eventosProximos: 0,
        eventosCompletados: 0,
        ingresosTotales: 0,
        gastosTotales: 0,
        utilidadNeta: 0,
        margenPromedio: 0,
        tasaCobranza: 0,
        productosActivos: 0,
        productosStockBajo: 0,
        valorInventario: 0,
        reservasActivas: 0,
        clientesActivos: 0,
        clientesNuevosMes: 0,
        polizasPendientes: 0,
        cuentasPorCobrar: 0,
        cuentasPorPagar: 0,
        proyectosActivos: 0,
        tareasVencidas: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardBody className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Fila 1: KPIs Financieros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Ingresos del Período"
          value={formatCurrency(data.ingresosTotales)}
          icon={DollarSign}
          color="success"
          trend={data.ingresosTotales > 0 ? 'up' : 'neutral'}
        />
        <KPICard
          title="Gastos del Período"
          value={formatCurrency(data.gastosTotales)}
          icon={Receipt}
          color="danger"
          trend={data.gastosTotales > data.ingresosTotales ? 'down' : 'neutral'}
        />
        <KPICard
          title="Utilidad Neta"
          value={formatCurrency(data.utilidadNeta)}
          icon={data.utilidadNeta >= 0 ? TrendingUp : TrendingDown}
          color={data.utilidadNeta >= 0 ? 'success' : 'danger'}
          subtitle={`Margen: ${formatPercentage(data.margenPromedio)}`}
          trend={data.utilidadNeta >= 0 ? 'up' : 'down'}
        />
        <KPICard
          title="Tasa de Cobranza"
          value={`${data.tasaCobranza.toFixed(1)}%`}
          icon={Target}
          color={data.tasaCobranza >= 80 ? 'success' : data.tasaCobranza >= 50 ? 'warning' : 'danger'}
          trend={data.tasaCobranza >= 80 ? 'up' : 'down'}
        >
          <Progress
            value={data.tasaCobranza}
            color={data.tasaCobranza >= 80 ? 'success' : data.tasaCobranza >= 50 ? 'warning' : 'danger'}
            size="sm"
            className="mt-2"
          />
        </KPICard>
      </div>

      {/* Fila 2: Eventos y Clientes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Eventos Activos"
          value={data.eventosActivos.toString()}
          icon={Calendar}
          color="primary"
          subtitle={`${data.eventosProximos} próximos (7 días)`}
        />
        <KPICard
          title="Eventos Completados"
          value={data.eventosCompletados.toString()}
          icon={CheckCircle}
          color="success"
        />
        <KPICard
          title="Clientes Activos"
          value={data.clientesActivos.toString()}
          icon={Users}
          color="secondary"
          subtitle={`+${data.clientesNuevosMes} este período`}
        />
        <KPICard
          title="Por Cobrar"
          value={formatCurrency(data.cuentasPorCobrar)}
          icon={CreditCard}
          color={data.cuentasPorCobrar > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Fila 3: Inventario y Operaciones */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Productos en Inventario"
          value={data.productosActivos.toString()}
          icon={Package}
          color="primary"
          subtitle={`Valor: ${formatCurrency(data.valorInventario)}`}
        />
        <KPICard
          title="Stock Bajo"
          value={data.productosStockBajo.toString()}
          icon={AlertTriangle}
          color={data.productosStockBajo > 0 ? 'danger' : 'success'}
          subtitle={data.productosStockBajo > 0 ? 'Requieren reorden' : 'Todo en orden'}
        />
        <KPICard
          title="Reservas Activas"
          value={data.reservasActivas.toString()}
          icon={Warehouse}
          color="secondary"
        />
        <KPICard
          title="Por Pagar"
          value={formatCurrency(data.cuentasPorPagar)}
          icon={Receipt}
          color={data.cuentasPorPagar > 0 ? 'warning' : 'default'}
        />
      </div>
    </div>
  );
}

// Componente de tarjeta KPI individual
interface KPICardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  children?: React.ReactNode;
}

function KPICard({ title, value, icon: Icon, color, subtitle, trend, children }: KPICardProps) {
  const colorClasses = {
    default: 'bg-gray-100 text-gray-600',
    primary: 'bg-primary-100 text-primary-600',
    secondary: 'bg-secondary-100 text-secondary-600',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-100 text-warning-600',
    danger: 'bg-danger-100 text-danger-600'
  };

  const trendColors = {
    up: 'text-success',
    down: 'text-danger',
    neutral: 'text-gray-400'
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardBody className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold">{value}</p>
              {trend && trend !== 'neutral' && (
                <span className={trendColors[trend]}>
                  {trend === 'up' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

export default ExecutiveKPIs;
