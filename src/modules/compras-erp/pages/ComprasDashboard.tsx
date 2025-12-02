/**
 * ComprasDashboard - Dashboard principal del módulo de compras
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  FileText,
  Package,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Calendar,
  ArrowRight,
  Plus,
  ClipboardList,
} from 'lucide-react';
import { useTheme } from '../../../shared/components/theme';
import { useCompany } from '../../../core/context/CompanyContext';
import { getEstadisticasOrdenes } from '../services/ordenesCompraService';
import { getEstadisticasRequisiciones } from '../services/requisicionesService';
import { getEstadisticasRecepciones } from '../services/recepcionesService';

export const ComprasDashboard: React.FC = () => {
  const { paletteConfig, isDark } = useTheme();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.id || '';

  // Colores dinámicos
  const colors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    bg: isDark ? '#1a1a2e' : '#f8fafc',
    card: isDark ? '#16213e' : '#ffffff',
    text: isDark ? '#e2e8f0' : '#1e293b',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
  }), [paletteConfig, isDark]);

  // Queries
  const { data: statsOrdenes } = useQuery({
    queryKey: ['ordenes-stats', companyId],
    queryFn: () => getEstadisticasOrdenes(companyId),
    enabled: !!companyId,
  });

  const { data: statsRequisiciones } = useQuery({
    queryKey: ['requisiciones-stats', companyId],
    queryFn: () => getEstadisticasRequisiciones(companyId),
    enabled: !!companyId,
  });

  const { data: statsRecepciones } = useQuery({
    queryKey: ['recepciones-stats', companyId],
    queryFn: () => getEstadisticasRecepciones(companyId),
    enabled: !!companyId,
  });

  // Accesos rápidos
  const accesosRapidos = [
    {
      titulo: 'Nueva Requisición',
      descripcion: 'Solicitar materiales',
      icono: ClipboardList,
      color: '#8B5CF6',
      ruta: '/compras/requisiciones/nueva',
    },
    {
      titulo: 'Nueva Orden',
      descripcion: 'Crear orden de compra',
      icono: FileText,
      color: '#3B82F6',
      ruta: '/compras/ordenes/nueva',
    },
    {
      titulo: 'Recibir Mercancía',
      descripcion: 'Registrar recepción',
      icono: Package,
      color: '#10B981',
      ruta: '/compras/recepciones/nueva',
    },
    {
      titulo: 'Ver Proveedores',
      descripcion: 'Catálogo de proveedores',
      icono: Users,
      color: '#F59E0B',
      ruta: '/proveedores/catalogo',
    },
  ];

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="p-4 rounded-2xl"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <ShoppingCart size={32} style={{ color: colors.primary }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
                Compras
              </h1>
              <p style={{ color: colors.textMuted }}>
                Gestión de requisiciones, órdenes y recepciones
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/compras/ordenes/nueva')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white transition-all hover:scale-105"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus size={20} />
            Nueva Orden de Compra
          </button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Compras del mes */}
        <div
          className="p-6 rounded-2xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Compras del Mes</p>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>
                ${(statsOrdenes?.montoMes || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Órdenes activas */}
        <div
          className="p-6 rounded-2xl cursor-pointer hover:scale-102 transition-transform"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          onClick={() => navigate('/compras/ordenes')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: `${colors.primary}20` }}>
              <FileText className="w-6 h-6" style={{ color: colors.primary }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Órdenes Activas</p>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>
                {(statsOrdenes?.enviadas || 0) + (statsOrdenes?.parcialmenteRecibidas || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Requisiciones pendientes */}
        <div
          className="p-6 rounded-2xl cursor-pointer hover:scale-102 transition-transform"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          onClick={() => navigate('/compras/requisiciones')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-100">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Req. Pendientes</p>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>
                {statsRequisiciones?.pendientes || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Pendientes de recibir */}
        <div
          className="p-6 rounded-2xl cursor-pointer hover:scale-102 transition-transform"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          onClick={() => navigate('/compras/recepciones')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Por Recibir</p>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>
                {statsRecepciones?.pendientes || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas y acciones rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Alertas */}
        <div
          className="lg:col-span-2 p-6 rounded-2xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <h2 className="text-lg font-bold mb-4" style={{ color: colors.text }}>
            Atención Requerida
          </h2>
          <div className="space-y-3">
            {/* Requisiciones urgentes */}
            {(statsRequisiciones?.urgentes || 0) > 0 && (
              <div
                className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:opacity-90"
                style={{ backgroundColor: '#EF444420', border: '1px solid #EF4444' }}
                onClick={() => navigate('/compras/requisiciones?prioridad=urgente')}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-red-500" size={20} />
                  <div>
                    <p className="font-medium" style={{ color: colors.text }}>
                      {statsRequisiciones?.urgentes} requisiciones urgentes
                    </p>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      Requieren aprobación inmediata
                    </p>
                  </div>
                </div>
                <ArrowRight className="text-red-500" size={20} />
              </div>
            )}

            {/* Órdenes pendientes de aprobar */}
            {(statsOrdenes?.pendientesAprobacion || 0) > 0 && (
              <div
                className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:opacity-90"
                style={{ backgroundColor: '#F59E0B20', border: '1px solid #F59E0B' }}
                onClick={() => navigate('/compras/ordenes?estado=pendiente_aprobacion')}
              >
                <div className="flex items-center gap-3">
                  <Clock className="text-yellow-500" size={20} />
                  <div>
                    <p className="font-medium" style={{ color: colors.text }}>
                      {statsOrdenes?.pendientesAprobacion} órdenes pendientes de aprobar
                    </p>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      Esperando autorización
                    </p>
                  </div>
                </div>
                <ArrowRight className="text-yellow-500" size={20} />
              </div>
            )}

            {/* Recepciones parciales */}
            {(statsOrdenes?.parcialmenteRecibidas || 0) > 0 && (
              <div
                className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:opacity-90"
                style={{ backgroundColor: '#3B82F620', border: '1px solid #3B82F6' }}
                onClick={() => navigate('/compras/recepciones?estado=parcial')}
              >
                <div className="flex items-center gap-3">
                  <Package className="text-blue-500" size={20} />
                  <div>
                    <p className="font-medium" style={{ color: colors.text }}>
                      {statsOrdenes?.parcialmenteRecibidas} órdenes con recepción parcial
                    </p>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      Pendientes de completar
                    </p>
                  </div>
                </div>
                <ArrowRight className="text-blue-500" size={20} />
              </div>
            )}

            {/* Todo en orden */}
            {!(statsRequisiciones?.urgentes || statsOrdenes?.pendientesAprobacion || statsOrdenes?.parcialmenteRecibidas) && (
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: '#10B98120', border: '1px solid #10B981' }}
              >
                <CheckCircle className="text-green-500" size={20} />
                <p className="font-medium" style={{ color: colors.text }}>
                  Todo en orden - No hay alertas pendientes
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div
          className="p-6 rounded-2xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <h2 className="text-lg font-bold mb-4" style={{ color: colors.text }}>
            Acciones Rápidas
          </h2>
          <div className="space-y-3">
            {accesosRapidos.map((acceso, idx) => {
              const Icon = acceso.icono;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-102"
                  style={{ backgroundColor: `${acceso.color}10`, border: `1px solid ${acceso.color}30` }}
                  onClick={() => navigate(acceso.ruta)}
                >
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${acceso.color}20` }}
                  >
                    <Icon size={20} style={{ color: acceso.color }} />
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: colors.text }}>
                      {acceso.titulo}
                    </p>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      {acceso.descripcion}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Flujo de compras visual */}
      <div
        className="p-6 rounded-2xl"
        style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
      >
        <h2 className="text-lg font-bold mb-6" style={{ color: colors.text }}>
          Flujo de Compras
        </h2>
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Paso 1: Requisición */}
          <div
            className="flex-1 min-w-[200px] p-4 rounded-xl text-center cursor-pointer hover:scale-105 transition-transform"
            style={{ backgroundColor: `#8B5CF620`, border: '2px solid #8B5CF6' }}
            onClick={() => navigate('/compras/requisiciones')}
          >
            <ClipboardList className="mx-auto mb-2 text-purple-500" size={32} />
            <p className="font-bold" style={{ color: colors.text }}>1. Requisición</p>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              {statsRequisiciones?.pendientes || 0} pendientes
            </p>
          </div>

          <ArrowRight size={24} style={{ color: colors.textMuted }} />

          {/* Paso 2: Orden */}
          <div
            className="flex-1 min-w-[200px] p-4 rounded-xl text-center cursor-pointer hover:scale-105 transition-transform"
            style={{ backgroundColor: `#3B82F620`, border: '2px solid #3B82F6' }}
            onClick={() => navigate('/compras/ordenes')}
          >
            <FileText className="mx-auto mb-2 text-blue-500" size={32} />
            <p className="font-bold" style={{ color: colors.text }}>2. Orden de Compra</p>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              {statsOrdenes?.enviadas || 0} enviadas
            </p>
          </div>

          <ArrowRight size={24} style={{ color: colors.textMuted }} />

          {/* Paso 3: Recepción */}
          <div
            className="flex-1 min-w-[200px] p-4 rounded-xl text-center cursor-pointer hover:scale-105 transition-transform"
            style={{ backgroundColor: `#10B98120`, border: '2px solid #10B981' }}
            onClick={() => navigate('/compras/recepciones')}
          >
            <Package className="mx-auto mb-2 text-green-500" size={32} />
            <p className="font-bold" style={{ color: colors.text }}>3. Recepción</p>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              {statsRecepciones?.esteMes || 0} este mes
            </p>
          </div>

          <ArrowRight size={24} style={{ color: colors.textMuted }} />

          {/* Paso 4: Inventario */}
          <div
            className="flex-1 min-w-[200px] p-4 rounded-xl text-center cursor-pointer hover:scale-105 transition-transform"
            style={{ backgroundColor: `#F59E0B20`, border: '2px solid #F59E0B' }}
            onClick={() => navigate('/inventario')}
          >
            <TrendingUp className="mx-auto mb-2 text-yellow-500" size={32} />
            <p className="font-bold" style={{ color: colors.text }}>4. Inventario</p>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              Stock actualizado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprasDashboard;
