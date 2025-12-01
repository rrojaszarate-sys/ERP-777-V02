/**
 * 📊 Dashboard de Facturas - Estadísticas y Resumen
 */

import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, Progress, Chip } from '@nextui-org/react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  FileText,
  Calendar
} from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import type { InvoiceStats, InvoiceFilters } from '../types/Invoice';

interface InvoiceDashboardProps {
  filters?: InvoiceFilters;
}

export const InvoiceDashboard: React.FC<InvoiceDashboardProps> = ({ filters }) => {
  const [stats, setStats] = useState<InvoiceStats>({
    total_facturas: 0,
    total_monto: 0,
    pendientes: 0,
    monto_pendiente: 0,
    vencidas: 0,
    monto_vencido: 0,
    proximas_vencer: 0,
    cobradas: 0,
    monto_cobrado: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [filters]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await invoiceService.getStats(filters);
      setStats(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calcularPorcentajeCobrado = () => {
    if (stats.total_monto === 0) return 0;
    return Math.round((stats.monto_cobrado / stats.total_monto) * 100);
  };

  const calcularEficienciaCobro = () => {
    if (stats.total_facturas === 0) return 0;
    return Math.round((stats.cobradas / stats.total_facturas) * 100);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardBody className="h-32" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturas */}
        <Card>
          <CardBody className="gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-gray-600">Total Facturas</span>
              </div>
              <Chip size="sm" variant="flat" color="primary">
                {stats.total_facturas}
              </Chip>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(stats.total_monto)}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Cobradas */}
        <Card>
          <CardBody className="gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-gray-600">Cobradas</span>
              </div>
              <Chip size="sm" variant="flat" color="success">
                {stats.cobradas}
              </Chip>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-2xl font-bold text-success">
                {formatCurrency(stats.monto_cobrado)}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Pendientes */}
        <Card>
          <CardBody className="gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-warning" />
                <span className="text-sm font-medium text-gray-600">Pendientes</span>
              </div>
              <Chip size="sm" variant="flat" color="warning">
                {stats.pendientes}
              </Chip>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-2xl font-bold text-warning">
                {formatCurrency(stats.monto_pendiente)}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Vencidas */}
        <Card>
          <CardBody className="gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger" />
                <span className="text-sm font-medium text-gray-600">Vencidas</span>
              </div>
              <Chip size="sm" variant="flat" color="danger">
                {stats.vencidas}
              </Chip>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-2xl font-bold text-danger">
                {formatCurrency(stats.monto_vencido)}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tarjetas de progreso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Progreso de cobro */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <h3 className="font-semibold">Progreso de Cobro</h3>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monto cobrado vs. total</span>
                <span className="font-bold">{calcularPorcentajeCobrado()}%</span>
              </div>
              <Progress 
                value={calcularPorcentajeCobrado()} 
                color="success"
                size="md"
                className="max-w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatCurrency(stats.monto_cobrado)}</span>
                <span>{formatCurrency(stats.total_monto)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Eficiencia de cobro */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Eficiencia de Cobro</h3>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Facturas cobradas vs. total</span>
                <span className="font-bold">{calcularEficienciaCobro()}%</span>
              </div>
              <Progress 
                value={calcularEficienciaCobro()} 
                color="primary"
                size="md"
                className="max-w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{stats.cobradas} cobradas</span>
                <span>{stats.total_facturas} total</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Alertas y atención urgente */}
      {(stats.vencidas > 0 || stats.proximas_vencer > 0) && (
        <Card className="border-l-4 border-l-warning">
          <CardBody>
            <div className="flex items-start gap-4">
              <Calendar className="w-6 h-6 text-warning flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold mb-2">⚠️ Atención Requerida</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  {stats.vencidas > 0 && (
                    <p>
                      • <span className="font-medium text-danger">{stats.vencidas} facturas vencidas</span>
                      {' '}por un monto de <strong>{formatCurrency(stats.monto_vencido)}</strong>
                    </p>
                  )}
                  {stats.proximas_vencer > 0 && (
                    <p>
                      • <span className="font-medium text-warning">{stats.proximas_vencer} facturas próximas a vencer</span>
                      {' '}en los próximos 7 días
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
