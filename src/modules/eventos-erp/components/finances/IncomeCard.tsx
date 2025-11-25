import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Calendar, CheckCircle, Clock, AlertTriangle, Paperclip, CreditCard as Edit, Trash2 } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Badge } from '../../../../shared/components/ui/Badge';
import { formatCurrency, formatDate } from '../../../../shared/utils/formatters';
import { Income } from '../../types/Finance';
import { AccountingStateIndicator } from '../accounting/AccountingStateIndicator';

interface IncomeCardProps {
  income: Income;
  onEdit: () => void;
  onDelete: () => void;
  onMarkAsPaid?: () => void;
  canEdit: boolean;
  canDelete: boolean;
  showAccountingState?: boolean;
  className?: string;
}

export const IncomeCard: React.FC<IncomeCardProps> = ({
  income,
  onEdit,
  onDelete,
  onMarkAsPaid,
  canEdit,
  canDelete,
  showAccountingState = true,
  className = ''
}) => {
  const getPaymentStatus = () => {
    if (income.cobrado) return 'Pagado';
    if (income.facturado) {
      if (income.fecha_compromiso_pago) {
        const isOverdue = new Date(income.fecha_compromiso_pago) < new Date();
        return isOverdue ? 'Vencido' : 'Pendiente';
      }
      return 'Facturado';
    }
    return 'Sin Facturar';
  };

  const getPaymentStatusColor = () => {
    const status = getPaymentStatus();
    switch (status) {
      case 'Pagado': return 'text-green-600';
      case 'Vencido': return 'text-red-600';
      case 'Pendiente': return 'text-yellow-600';
      case 'Facturado': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getDaysOverdue = () => {
    if (!income.fecha_compromiso_pago || income.cobrado) return 0;
    
    const today = new Date();
    const commitmentDate = new Date(income.fecha_compromiso_pago);
    const diffTime = today.getTime() - commitmentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysOverdue = getDaysOverdue();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${className}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-3">
            <h4 className="font-medium text-gray-900">{income.concepto}</h4>
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(income.total)}
            </span>
            
            {/* File attachment indicator */}
            {income.archivo_adjunto && (
              <Badge variant="success" size="sm">
                <Paperclip className="w-3 h-3 mr-1" />
                PDF
              </Badge>
            )}
          </div>
          
          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 mb-3">
            <div>
              <span className="font-medium">Fecha:</span>
              <div>{formatDate(income.fecha_ingreso)}</div>
            </div>
            <div>
              <span className="font-medium">Cantidad:</span>
              <div>{income.cantidad}</div>
            </div>
            <div>
              <span className="font-medium">Precio unitario:</span>
              <div>{formatCurrency(income.precio_unitario)}</div>
            </div>
            <div>
              <span className="font-medium">IVA:</span>
              <div>{formatCurrency(income.iva)}</div>
            </div>
          </div>

          {/* Additional Information */}
          {income.descripcion && (
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Descripción:</span> {income.descripcion}
            </div>
          )}
          
          {income.referencia && (
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Referencia:</span> {income.referencia}
            </div>
          )}

          {/* Payment Timeline */}
          <div className="space-y-2 mb-3">
            {income.fecha_facturacion && (
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="w-3 h-3 text-blue-500" />
                <span className="text-gray-600">Facturado:</span>
                <span className="text-gray-900">{formatDate(income.fecha_facturacion)}</span>
              </div>
            )}
            
            {income.fecha_compromiso_pago && (
              <div className="flex items-center space-x-2 text-sm">
                <Clock className={`w-3 h-3 ${daysOverdue > 0 ? 'text-red-500' : 'text-yellow-500'}`} />
                <span className="text-gray-600">Compromiso:</span>
                <span className={daysOverdue > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                  {formatDate(income.fecha_compromiso_pago)}
                  {daysOverdue > 0 && ` (${daysOverdue} días vencido)`}
                </span>
              </div>
            )}
            
            {income.fecha_cobro && (
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-gray-600">Cobrado:</span>
                <span className="text-green-600 font-medium">{formatDate(income.fecha_cobro)}</span>
                {income.metodo_cobro && (
                  <Badge variant="success" size="sm">
                    {income.metodo_cobro}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* File attachment links */}
          <div className="space-y-2 mb-3">
            {/* Factura (XML + PDF) */}
            {income.archivo_adjunto && (
              <div className="flex items-center space-x-2 text-sm">
                <Paperclip className="w-3 h-3 text-purple-500" />
                <span className="text-gray-600 font-medium">Factura:</span>
                <a 
                  href={income.archivo_adjunto} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 hover:underline"
                >
                  {income.archivo_nombre || 'Ver factura adjunta'}
                </a>
              </div>
            )}

            {/* Orden de Compra */}
            {(income as any).orden_compra_url && (
              <div className="flex items-center space-x-2 text-sm">
                <Paperclip className="w-3 h-3 text-indigo-500" />
                <span className="text-gray-600 font-medium">Orden de Compra:</span>
                <a 
                  href={(income as any).orden_compra_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  {(income as any).orden_compra_nombre || 'Ver orden de compra'}
                </a>
              </div>
            )}

            {/* Comprobante de Pago */}
            {income.documento_pago_url && (
              <div className="flex items-center space-x-2 text-sm">
                <Paperclip className="w-3 h-3 text-green-500" />
                <span className="text-gray-600 font-medium">Comprobante de Pago:</span>
                <a 
                  href={income.documento_pago_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-800 hover:underline"
                >
                  {income.documento_pago_nombre || 'Ver comprobante de pago'}
                </a>
              </div>
            )}
          </div>
          
          {/* Status indicators */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Payment Status */}
            <Badge 
              variant={
                income.cobrado ? 'success' :
                income.facturado ? (daysOverdue > 0 ? 'danger' : 'warning') : 'default'
              } 
              size="sm"
            >
              {getPaymentStatus()}
            </Badge>

            {/* Accounting State */}
            {showAccountingState && (
              <AccountingStateIndicator
                stateName={getPaymentStatus()}
                showIcon={false}
                size="sm"
              />
            )}

            {/* Overdue warning */}
            {daysOverdue > 0 && (
              <Badge variant="danger" size="sm">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {daysOverdue} días vencido
              </Badge>
            )}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col space-y-2 ml-4">
          {/* Mark as paid button - Solo si hay comprobante de pago adjunto */}
          {income.facturado && !income.cobrado && onMarkAsPaid && income.documento_pago_url && (
            <Button
              onClick={onMarkAsPaid}
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white"
              title="Marcar como pagado (comprobante adjunto)"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Marcar Pagado
            </Button>
          )}

          {/* Advertencia si está facturado pero sin comprobante */}
          {income.facturado && !income.cobrado && !income.documento_pago_url && (
            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              ⚠️ Adjunte comprobante de pago para poder marcar como pagado
            </div>
          )}
          
          {/* Edit button */}
          {canEdit && (
            <Button
              onClick={onEdit}
              variant="outline"
              size="sm"
            >
              <Edit className="w-3 h-3" />
            </Button>
          )}
          
          {/* Delete button */}
          {canDelete && (
            <Button
              onClick={onDelete}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};