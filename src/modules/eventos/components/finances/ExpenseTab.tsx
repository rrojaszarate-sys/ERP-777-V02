import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, CreditCard as Edit, Trash2, TrendingDown, DollarSign, Loader2, FileText, Paperclip, Sparkles, Bot } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { Badge } from '../../../../shared/components/ui/Badge';
import { Modal } from '../../../../shared/components/ui/Modal';
import { useExpenses, useExpenseCategories } from '../../hooks/useFinances';
import { usePermissions } from '../../../../core/permissions/usePermissions';
import { useAuth } from '../../../../core/auth/AuthProvider';
import { formatCurrency, formatDate } from '../../../../shared/utils/formatters';
import { Expense } from '../../types/Finance';
import { ExpenseForm } from './ExpenseForm';
import { DualOCRExpenseForm } from './DualOCRExpenseForm';

interface ExpenseTabProps {
  eventId: string;
  expenses: Expense[];
  onRefresh: () => void;
}

export const ExpenseTab: React.FC<ExpenseTabProps> = ({
  eventId,
  expenses,
  onRefresh
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { user } = useAuth();
  const { createExpense, updateExpense, deleteExpense } = useExpenses(eventId);
  const { data: categories } = useExpenseCategories();

  const handleDelete = (expense: Expense) => {
    const reason = prompt('Motivo de eliminación (opcional):');
    if (confirm(`¿Está seguro de que desea eliminar este gasto de ${formatCurrency(expense.total)}?`)) {
      deleteExpense({ id: expense.id, reason: reason || undefined, userId: user?.id });
    }
  };

  const totalGastos = expenses.reduce((sum, expense) => sum + expense.total, 0);
  const gastosConArchivo = expenses.filter(expense => expense.archivo_adjunto);
  const gastosSinArchivo = expenses.filter(expense => !expense.archivo_adjunto);
  const gastosPendientes = expenses.filter(expense => expense.status_aprobacion === 'pendiente');

  // Group expenses by category
  const gastosPorCategoria = expenses.reduce((acc, expense) => {
    const categoria = expense.categoria?.nombre || 'Sin categoría';
    acc[categoria] = (acc[categoria] || 0) + expense.total;
    return acc;
  }, {} as Record<string, number>);

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
          <h3 className="text-lg font-medium text-gray-900">Gastos del Evento</h3>
          <p className="text-sm text-gray-600">
            Total: {formatCurrency(totalGastos)} • 
            {gastosConArchivo.length} con archivo • {gastosSinArchivo.length} sin archivo
            {gastosPendientes.length > 0 && (
              <span className="text-yellow-600"> • {gastosPendientes.length} pendientes</span>
            )}
          </p>
        </div>
        
        {canCreate('gastos') && (
          <div className="flex space-x-3">
            <Button
              onClick={() => {
                setEditingExpense(null);
                setShowForm(true);
              }}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              <Bot className="w-4 h-4 mr-1" />
              Nuevo Gasto OCR Dual
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <TrendingDown className="w-6 h-6 text-red-600" />
            <div>
              <div className="text-lg font-bold text-red-700">
                {formatCurrency(totalGastos)}
              </div>
              <div className="text-sm text-red-600">Total Gastos</div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Paperclip className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-blue-700">{gastosConArchivo.length}</div>
              <div className="text-sm text-blue-600">Con Archivo</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Edit className="w-6 h-6 text-gray-600" />
            <div>
              <div className="text-lg font-bold text-gray-700">{gastosSinArchivo.length}</div>
              <div className="text-sm text-gray-600">Sin Archivo</div>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-6 h-6 text-yellow-600" />
            <div>
              <div className="text-lg font-bold text-yellow-700">{gastosPendientes.length}</div>
              <div className="text-sm text-yellow-600">Pendientes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(gastosPorCategoria).length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Gastos por Categoría</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(gastosPorCategoria).map(([categoria, monto]) => (
              <div key={categoria} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-900">{formatCurrency(monto)}</div>
                <div className="text-xs text-gray-600">{categoria}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses List */}
      <div className="space-y-4">
        {expenses.length === 0 ? (
          <div className="text-center py-12 bg-white border rounded-lg">
            <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No hay gastos registrados</p>
            {canCreate('gastos') && (
              <div className="space-y-2">
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <Bot className="w-4 h-4 mr-1" />
                  Crear Primer Gasto con OCR
                </Button>
                <p className="text-xs text-gray-400">
                  🏆 <strong>Sube una foto</strong> y el sistema completará automáticamente los campos con <strong>94% de precisión</strong>
                </p>
              </div>
            )}
          </div>
        ) : (
          expenses.map(expense => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onEdit={() => {
                setEditingExpense(expense);
                setShowForm(true);
              }}
              onDelete={() => handleDelete(expense)}
              canEdit={canUpdate('gastos')}
              canDelete={canDelete('gastos')}
            />
          ))
        )}
      </div>

      {/* Expense Form Modal */}
      {showForm && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowForm(false);
            setEditingExpense(null);
          }}
          title={editingExpense ? 'Editar Gasto con OCR Dual' : 'Nuevo Gasto con OCR Dual'}
          size="xl"
        >
          <DualOCRExpenseForm
            expense={editingExpense}
            eventId={eventId}
            onSave={(data) => {
              console.log('📤 [ExpenseTab] onSave llamado con datos:', data);
              try {
                if (editingExpense) {
                  console.log('🔄 [ExpenseTab] Actualizando gasto existente:', editingExpense.id);
                  updateExpense({ id: editingExpense.id, data });
                } else {
                  console.log('➕ [ExpenseTab] Creando nuevo gasto');
                  createExpense({ ...data, evento_id: eventId });
                }
                setShowForm(false);
                setEditingExpense(null);
              } catch (error) {
                console.error('❌ [ExpenseTab] Error en onSave:', error);
              }
            }}
            onCancel={() => {
              console.log('🚫 [ExpenseTab] Cancelando formulario');
              setShowForm(false);
              setEditingExpense(null);
            }}
          />
        </Modal>
      )}
    </motion.div>
  );
};

// Expense Card Component
const ExpenseCard: React.FC<{
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}> = ({ expense, onEdit, onDelete, canEdit, canDelete }) => {
  const getApprovalBadge = (status: string) => {
    const variants = {
      'pendiente': 'warning',
      'aprobado': 'success',
      'rechazado': 'danger'
    };
    
    const labels = {
      'pendiente': 'Pendiente',
      'aprobado': 'Aprobado',
      'rechazado': 'Rechazado'
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants] as any} size="sm">
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h4 className="font-medium text-gray-900">{expense.concepto}</h4>
            <span className="text-lg font-bold text-red-600">
              {formatCurrency(expense.total)}
            </span>
            {expense.categoria && (
              <Badge 
                variant="default" 
                style={{ 
                  backgroundColor: expense.categoria.color + '20', 
                  color: expense.categoria.color,
                  borderColor: expense.categoria.color + '40'
                }}
                size="sm"
              >
                {expense.categoria.nombre}
              </Badge>
            )}
            {expense.archivo_adjunto && (
              <Badge variant="info" size="sm">
                <Paperclip className="w-3 h-3 mr-1" />
                Archivo
              </Badge>
            )}
            {expense.ocr_processed && (
              <Badge variant="success" size="sm">
                <Sparkles className="w-3 h-3 mr-1" />
                OCR {expense.ocr_confidence?.toFixed(0)}%
              </Badge>
            )}
          </div>
          
          <div className="text-sm text-gray-500 space-y-1">
            <div className="grid grid-cols-2 gap-4">
              <div>Fecha: {formatDate(expense.fecha_gasto)}</div>
              <div>Cantidad: {expense.cantidad}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>Precio unitario: {formatCurrency(expense.precio_unitario)}</div>
              <div>IVA: {formatCurrency(expense.iva)}</div>
            </div>
            {expense.proveedor && (
              <div>Proveedor: {expense.proveedor}</div>
            )}
            {expense.rfc_proveedor && (
              <div>RFC: {expense.rfc_proveedor}</div>
            )}
            {expense.descripcion && (
              <div>Descripción: {expense.descripcion}</div>
            )}
            {expense.referencia && (
              <div>Referencia: {expense.referencia}</div>
            )}
            
            {/* 📎 ARCHIVOS ADJUNTOS - XML Y PDF */}
            <div className="space-y-2">
              {/* XML CFDI */}
              {expense.xml_file_url && (
                <div className="flex items-center space-x-2">
                  <FileText className="w-3 h-3 text-purple-600" />
                  <a 
                    href={expense.xml_file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                  >
                    📄 Ver XML CFDI
                  </a>
                </div>
              )}
              
              {/* PDF/Imagen */}
              {expense.archivo_adjunto && (
                <div className="flex items-center space-x-2">
                  <Paperclip className="w-3 h-3 text-blue-500" />
                  <a 
                    href={expense.archivo_adjunto} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {expense.archivo_nombre || 'Ver comprobante'}
                  </a>
                </div>
              )}
            </div>
          </div>
          
          {/* Status and approval */}
          <div className="flex space-x-2 mt-3">
            {getApprovalBadge(expense.status_aprobacion)}
            <Badge variant="info" size="sm">
              {expense.forma_pago}
            </Badge>
          </div>
        </div>
        
        <div className="flex space-x-2 ml-4">
          {canEdit && (
            <Button
              onClick={onEdit}
              variant="outline"
              size="sm"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              onClick={onDelete}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Expense Form Modal
const ExpenseFormModal: React.FC<{
  expense?: Expense | null;
  eventId: string;
  categories: any[];
  onClose: () => void;
  onSave: (data: any) => void;
}> = ({ expense, eventId, categories, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    concepto: expense?.concepto || '',
    descripcion: expense?.descripcion || '',
    cantidad: expense?.cantidad || 1,
    precio_unitario: expense?.precio_unitario || 0,
    fecha_gasto: expense?.fecha_gasto || new Date().toISOString().split('T')[0],
    proveedor: expense?.proveedor || '',
    rfc_proveedor: expense?.rfc_proveedor || '',
    categoria_id: expense?.categoria_id || '',
    forma_pago: expense?.forma_pago || 'transferencia',
    referencia: expense?.referencia || '',
    status_aprobacion: expense?.status_aprobacion || 'aprobado'
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = formData.cantidad * formData.precio_unitario;
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={expense ? 'Editar Gasto' : 'Nuevo Gasto'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concepto *
            </label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => setFormData(prev => ({ ...prev, concepto: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500"
              required
              placeholder="Descripción del gasto"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <select
              value={formData.categoria_id}
              onChange={(e) => setFormData(prev => ({ ...prev, categoria_id: parseInt(e.target.value) || '' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500"
              required
            >
              <option value="">Seleccionar categoría...</option>
              {categories.map(categoria => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor
            </label>
            <input
              type="text"
              value={formData.proveedor}
              onChange={(e) => setFormData(prev => ({ ...prev, proveedor: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500"
              placeholder="Nombre del proveedor"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RFC Proveedor
            </label>
            <input
              type="text"
              value={formData.rfc_proveedor}
              onChange={(e) => setFormData(prev => ({ ...prev, rfc_proveedor: e.target.value.toUpperCase() }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500"
              placeholder="ABC123456XYZ"
              maxLength={13}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad *
            </label>
            <input
              type="number"
              value={formData.cantidad}
              onChange={(e) => setFormData(prev => ({ ...prev, cantidad: parseFloat(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500"
              min="0.001"
              step="0.001"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio Unitario *
            </label>
            <input
              type="number"
              value={formData.precio_unitario}
              onChange={(e) => setFormData(prev => ({ ...prev, precio_unitario: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha del Gasto *
            </label>
            <input
              type="date"
              value={formData.fecha_gasto}
              onChange={(e) => setFormData(prev => ({ ...prev, fecha_gasto: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forma de Pago
            </label>
            <select
              value={formData.forma_pago}
              onChange={(e) => setFormData(prev => ({ ...prev, forma_pago: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500"
            placeholder="Detalles adicionales del gasto"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Referencia
          </label>
          <input
            type="text"
            value={formData.referencia}
            onChange={(e) => setFormData(prev => ({ ...prev, referencia: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500"
            placeholder="Número de factura, folio, etc."
          />
        </div>

        {/* Calculation Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Resumen de Cálculo</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA (16%):</span>
              <span className="font-medium">{formatCurrency(iva)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span className="text-red-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Approval Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado de Aprobación
          </label>
          <select
            value={formData.status_aprobacion}
            onChange={(e) => setFormData(prev => ({ ...prev, status_aprobacion: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500"
          >
            <option value="pendiente">Pendiente</option>
            <option value="aprobado">Aprobado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-red-500 hover:bg-red-600"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {expense ? 'Actualizar' : 'Crear'} Gasto
          </Button>
        </div>
      </form>
    </Modal>
  );
};