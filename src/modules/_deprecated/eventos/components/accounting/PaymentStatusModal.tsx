import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Calendar, CreditCard, FileText, Loader2 } from 'lucide-react';
import { Modal } from '../../../../shared/components/ui/Modal';
import { Button } from '../../../../shared/components/ui/Button';
import { formatCurrency, formatDate } from '../../../../shared/utils/formatters';

interface PaymentStatusModalProps {
  income: any;
  onClose: () => void;
  onConfirm: (paymentData: {
    fecha_cobro: string;
    metodo_cobro: string;
    referencia?: string;
  }) => void;
}

export const PaymentStatusModal: React.FC<PaymentStatusModalProps> = ({
  income,
  onClose,
  onConfirm
}) => {
  const [paymentData, setPaymentData] = useState({
    fecha_cobro: new Date().toISOString().split('T')[0],
    metodo_cobro: 'transferencia',
    referencia: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!paymentData.fecha_cobro) {
      newErrors.fecha_cobro = 'La fecha de cobro es requerida';
    }

    if (!paymentData.metodo_cobro) {
      newErrors.metodo_cobro = 'El método de cobro es requerido';
    }

    // Validate that payment date is not in the future
    if (paymentData.fecha_cobro && new Date(paymentData.fecha_cobro) > new Date()) {
      newErrors.fecha_cobro = 'La fecha de cobro no puede ser futura';
    }

    // Validate that payment date is not before invoice date
    if (income.fecha_facturacion && paymentData.fecha_cobro && 
        new Date(paymentData.fecha_cobro) < new Date(income.fecha_facturacion)) {
      newErrors.fecha_cobro = 'La fecha de cobro no puede ser anterior a la fecha de facturación';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onConfirm(paymentData);
    } catch (error) {
      console.error('Error confirming payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Confirmar Pago Recibido"
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Income Information */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-900 mb-3">Información del Ingreso</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Concepto:</span>
              <span className="font-medium text-gray-900">{income.concepto}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monto:</span>
              <span className="font-medium text-green-600">{formatCurrency(income.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Evento:</span>
              <span className="font-medium text-gray-900">{income.evt_eventos?.nombre_proyecto}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cliente:</span>
              <span className="font-medium text-gray-900">{income.cliente_nombre}</span>
            </div>
            {income.fecha_compromiso_pago && (
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha Compromiso:</span>
                <span className={`font-medium ${
                  income.dias_vencido > 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {formatDate(income.fecha_compromiso_pago)}
                  {income.dias_vencido > 0 && ` (${income.dias_vencido} días vencido)`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Details Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Cobro *
            </label>
            <input
              type="date"
              value={paymentData.fecha_cobro}
              onChange={(e) => handleInputChange('fecha_cobro', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.fecha_cobro ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.fecha_cobro && (
              <p className="text-red-600 text-sm mt-1">{errors.fecha_cobro}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Cobro *
            </label>
            <select
              value={paymentData.metodo_cobro}
              onChange={(e) => handleInputChange('metodo_cobro', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.metodo_cobro ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              <option value="transferencia">Transferencia Bancaria</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta">Tarjeta de Crédito/Débito</option>
              <option value="deposito">Depósito Bancario</option>
            </select>
            {errors.metodo_cobro && (
              <p className="text-red-600 text-sm mt-1">{errors.metodo_cobro}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia de Pago
            </label>
            <input
              type="text"
              value={paymentData.referencia}
              onChange={(e) => handleInputChange('referencia', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Número de transferencia, folio, etc."
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Opcional: Número de referencia del pago para seguimiento
            </p>
          </div>
        </div>

        {/* Confirmation Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Resumen de Confirmación</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Monto a confirmar:</span>
              <span className="font-bold text-green-600">{formatCurrency(income.total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Fecha de cobro:</span>
              <span className="font-medium">{formatDate(paymentData.fecha_cobro)}</span>
            </div>
            <div className="flex justify-between">
              <span>Método:</span>
              <span className="font-medium capitalize">{paymentData.metodo_cobro}</span>
            </div>
            {paymentData.referencia && (
              <div className="flex justify-between">
                <span>Referencia:</span>
                <span className="font-medium">{paymentData.referencia}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-500 hover:bg-green-600"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar Pago
          </Button>
        </div>
      </form>
    </Modal>
  );
};