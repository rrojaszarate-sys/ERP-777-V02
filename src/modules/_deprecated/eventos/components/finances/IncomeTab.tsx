import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, FileText, DollarSign, Loader2, Paperclip } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Badge } from '../../../../shared/components/ui/Badge';
import { Modal } from '../../../../shared/components/ui/Modal';
import { useIncomes } from '../../hooks/useFinances';
import { usePermissions } from '../../../../core/permissions/usePermissions';
import { useAuth } from '../../../../core/auth/AuthProvider';
import { formatCurrency, formatDate } from '../../../../shared/utils/formatters';
import { Income } from '../../types/Finance';
import { IncomeForm } from './IncomeForm';
import { IncomeCard } from './IncomeCard';
import { useAccountingStates } from '../../hooks/useAccountingStates';

interface IncomeTabProps {
  eventId: string;
  incomes: Income[];
  onRefresh: () => void;
}

export const IncomeTab: React.FC<IncomeTabProps> = ({
  eventId,
  incomes,
  onRefresh
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { user } = useAuth();
  const { createIncome, updateIncome, deleteIncome } = useIncomes(eventId);
  const { markAsPaid } = useAccountingStates();

  const handleDelete = (income: Income) => {
    if (confirm(`¿Está seguro de que desea eliminar este ingreso de ${formatCurrency(income.total)}?`)) {
      deleteIncome(income.id);
    }
  };

  const handleMarkAsPaid = (income: Income) => {
    const paymentData = {
      fecha_cobro: new Date().toISOString().split('T')[0],
      metodo_cobro: 'transferencia',
      referencia: `PAY-${Date.now()}`
    };
    
    markAsPaid({
      incomeId: income.id,
      paymentData
    });
  };
  const totalIngresos = incomes.reduce((sum, income) => sum + income.total, 0);
  const ingresosConArchivo = incomes.filter(income => income.archivo_adjunto);
  const ingresosSinArchivo = incomes.filter(income => !income.archivo_adjunto);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Ingresos del Evento</h3>
          <p className="text-sm text-gray-600">
            Total: {formatCurrency(totalIngresos)} • 
            {ingresosConArchivo.length} con archivo • {ingresosSinArchivo.length} sin archivo
          </p>
        </div>
        
        {canCreate('ingresos') && (
          <Button
            onClick={() => {
              setEditingIncome(null);
              setShowForm(true);
            }}
            className="bg-green-500 hover:bg-green-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Ingreso
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-6 h-6 text-green-600" />
            <div>
              <div className="text-lg font-bold text-green-700">
                {formatCurrency(totalIngresos)}
              </div>
              <div className="text-sm text-green-600">Total Ingresos</div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-blue-700">{incomes.length}</div>
              <div className="text-sm text-blue-600">Registros</div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Paperclip className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-blue-700">{ingresosConArchivo.length}</div>
              <div className="text-sm text-blue-600">Con Archivo</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Pencil className="w-6 h-6 text-gray-600" />
            <div>
              <div className="text-lg font-bold text-gray-700">{ingresosSinArchivo.length}</div>
              <div className="text-sm text-gray-600">Sin Archivo</div>
            </div>
          </div>
        </div>
      </div>

      {/* Incomes List */}
      <div className="space-y-4">
        {incomes.length === 0 ? (
          <div className="text-center py-12 bg-white border rounded-lg">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No hay ingresos registrados</p>
            {canCreate('ingresos') && (
              <div className="space-y-2">
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Ingreso
                </Button>
                <p className="text-xs text-gray-400">
                  Recuerda adjuntar la factura PDF correspondiente
                </p>
              </div>
            )}
          </div>
        ) : (
          incomes.map(income => (
            <IncomeCard
              key={income.id}
              income={income}
              onEdit={() => {
                setEditingIncome(income);
                setShowForm(true);
              }}
              onDelete={() => handleDelete(income)}
              onMarkAsPaid={() => handleMarkAsPaid(income)}
              canEdit={canUpdate('ingresos')}
              canDelete={canDelete('ingresos')}
              showAccountingState={true}
            />
          ))
        )}
      </div>

      {/* Income Form Modal */}
      {showForm && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowForm(false);
            setEditingIncome(null);
          }}
          title={editingIncome ? 'Editar Ingreso' : 'Nuevo Ingreso'}
          size="lg"
        >
          <IncomeForm
            income={editingIncome}
            eventId={eventId}
            onSave={(data) => {
              if (editingIncome) {
                updateIncome({ id: editingIncome.id, data });
              } else {
                createIncome({ ...data, evento_id: eventId });
              }
              setShowForm(false);
              setEditingIncome(null);
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingIncome(null);
            }}
          />
        </Modal>
      )}
    </motion.div>
  );
};
