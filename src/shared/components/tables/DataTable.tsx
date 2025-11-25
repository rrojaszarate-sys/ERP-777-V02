import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, ChevronUp, ChevronDown, FileSpreadsheet, FileText, File, MoreVertical, Trash2, CreditCard as Edit, Eye } from 'lucide-react';
import { usePermissions } from '../../../core/permissions/usePermissions';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { exportService } from '../../../services/exportService';
interface Column {
  key: string;
  label: string;
  filterType?: 'text' | 'select' | 'date' | 'number' | 'date-range' | 'number-range';
  filterOptions?: Array<{ value: string; label: string }>;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
}

interface Action {
  label: string;
  icon: React.ComponentType<any>;
  onClick: (row: any) => void;
  show?: (row: any) => boolean;
  className?: string;
  tooltip?: string;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  actions?: Action[];
  exportable?: boolean;
  selectable?: boolean;
  filterable?: boolean;
  onRowClick?: (row: any) => void;
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  data = [],
  columns,
  actions,
  exportable = true,
  selectable = false,
  filterable = true,
  onRowClick,
  className = ''
}) => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sorting, setSorting] = useState<{ field: string | null; direction: 'asc' | 'desc' }>({ 
    field: null, 
    direction: 'asc' 
  });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25 });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  
  const { hasPermission } = usePermissions();

  // Procesamiento de datos
  const processedData = useMemo(() => {
    let result = [...data];

    // Búsqueda global
    if (globalSearch) {
      result = result.filter(row =>
        Object.values(row).some(value => {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Handle nested objects (like cliente, responsable)
            return Object.values(value).some(nestedValue =>
              String(nestedValue || '').toLowerCase().includes(globalSearch.toLowerCase())
            );
          }
          return String(value || '').toLowerCase().includes(globalSearch.toLowerCase());
        }
        )
      );
    }

    // Filtros por columna
    Object.entries(filters).forEach(([column, filterValue]) => {
      if (filterValue !== '' && filterValue != null) {
        result = result.filter(row => {
          const cellValue = row[column];
          const columnConfig = columns.find(col => col.key === column);
          
          switch (columnConfig?.filterType) {
            case 'select':
              return Array.isArray(filterValue) 
                ? filterValue.includes(cellValue)
                : filterValue === cellValue;
            case 'date':
              return new Date(cellValue).toDateString() === new Date(filterValue).toDateString();
            case 'number':
              return Number(cellValue) === Number(filterValue);
            default:
              return String(cellValue || '').toLowerCase().includes(String(filterValue).toLowerCase());
          }
        });
      }
    });

    // Ordenamiento
    if (sorting.field) {
      result.sort((a, b) => {
        const aVal = a[sorting.field!];
        const bVal = b[sorting.field!];
        const direction = sorting.direction === 'asc' ? 1 : -1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * direction;
        }
        
        if (aVal instanceof Date && bVal instanceof Date) {
          return (aVal.getTime() - bVal.getTime()) * direction;
        }
        
        return String(aVal || '').localeCompare(String(bVal || '')) * direction;
      });
    }

    return result;
  }, [data, filters, sorting, globalSearch]);

  // Paginación
  const paginatedData = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    return processedData.slice(startIndex, startIndex + pagination.pageSize);
  }, [processedData, pagination]);

  const totalPages = Math.ceil(processedData.length / pagination.pageSize);

  const handleSort = (field: string) => {
    setSorting(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = () => {
    if (selectedRows.length === paginatedData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedData.map(row => row.id));
    }
  };

  const handleRowSelect = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedRows(prev => [...prev, id]);
    } else {
      setSelectedRows(prev => prev.filter(rowId => rowId !== id));
    }
  };

  const exportToExcel = () => {
    try {
      exportService.exportDataToExcel(processedData, columns, 'Datos_Exportados');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error al exportar a Excel. Por favor, intente nuevamente.');
    }
    console.log('Exportando a Excel...', processedData);
  };

  const exportToPDF = () => {
    try {
      exportService.exportDataToPDF(processedData, columns, 'Datos_Exportados');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Error al exportar a PDF. Por favor, intente nuevamente.');
    }
    console.log('Exportando a PDF...', processedData);
  };

  const exportToCSV = () => {
    // Implementación de exportación a CSV
    const csv = [
      columns.map(col => col.label).join(','),
      ...processedData.map(row => 
        columns.map(col => row[col.key] || '').join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Barra de herramientas */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          {/* Búsqueda global */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Búsqueda general..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
            />
          </div>

          {/* Acciones */}
          <div className="flex items-center space-x-3">
            {selectedRows.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedRows.length} seleccionados
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => console.log('Eliminar seleccionados', selectedRows)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
              </div>
            )}
            
            {exportable && hasPermission('reportes', 'export') && (
              <div className="relative group">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={exportToExcel}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2 text-red-600" />
                    PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {selectable && (
                <th className="p-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-mint-600 focus:ring-mint-500"
                  />
                </th>
              )}
              
              {columns.map(column => (
                <th key={column.key} className="p-3 text-left">
                  <div className="flex flex-col space-y-2">
                    {/* Header con ordenamiento */}
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center justify-between hover:text-mint-600 transition-colors group"
                    >
                      <span className="font-medium text-gray-900">{column.label}</span>
                      <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronUp 
                          className={`w-3 h-3 ${
                            sorting.field === column.key && sorting.direction === 'asc' 
                              ? 'text-mint-600 opacity-100' 
                              : 'text-gray-300'
                          }`} 
                        />
                        <ChevronDown 
                          className={`w-3 h-3 -mt-1 ${
                            sorting.field === column.key && sorting.direction === 'desc' 
                              ? 'text-mint-600 opacity-100' 
                              : 'text-gray-300'
                          }`} 
                        />
                      </div>
                    </button>
                    
                    {/* Filtro por columna */}
                    {filterable && (
                      <ColumnFilter
                        column={column}
                        value={filters[column.key] || ''}
                        onChange={(value) => setFilters(prev => ({
                          ...prev,
                          [column.key]: value
                        }))}
                      />
                    )}
                  </div>
                </th>
              ))}
              
              {actions && actions.length > 0 && (
                <th className="p-3 text-center w-20">Acciones</th>
              )}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  className="px-6 py-12 text-center"
                >
                  <div className="text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No se encontraron resultados</p>
                    <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow
                  key={row.id || index}
                  row={row}
                  columns={columns}
                  actions={actions}
                  selectable={selectable}
                  selected={selectedRows.includes(row.id)}
                  onSelect={(selected) => handleRowSelect(row.id, selected)}
                  onRowClick={onRowClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} a{' '}
            {Math.min(pagination.page * pagination.pageSize, processedData.length)} de{' '}
            {processedData.length} resultados
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={pagination.pageSize}
              onChange={(e) => setPagination(prev => ({ 
                ...prev, 
                pageSize: parseInt(e.target.value), 
                page: 1 
              }))}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ 
                  ...prev, 
                  page: Math.max(1, prev.page - 1) 
                }))}
                disabled={pagination.page === 1}
              >
                Anterior
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber = Math.max(1, Math.min(
                  totalPages - 4,
                  Math.max(1, pagination.page - 2)
                )) + i;
                
                return (
                  <Button
                    key={pageNumber}
                    variant={pagination.page === pageNumber ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: pageNumber }))}
                    className="w-8"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ 
                  ...prev, 
                  page: Math.min(totalPages, prev.page + 1) 
                }))}
                disabled={pagination.page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de filtro por columna
const ColumnFilter: React.FC<{
  column: Column;
  value: any;
  onChange: (value: any) => void;
}> = ({ column, value, onChange }) => {
  switch (column.filterType) {
    case 'select':
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-mint-500"
        >
          <option value="">Todos</option>
          {column.filterOptions?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
      
    case 'date':
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-mint-500"
        />
      );
      
    case 'number':
      return (
        <input
          type="number"
          placeholder="Número..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-mint-500"
        />
      );
      
    default:
      return (
        <input
          type="text"
          placeholder={`Buscar ${column.label.toLowerCase()}...`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-mint-500"
        />
      );
  }
};

// Componente de fila de tabla
const TableRow: React.FC<{
  row: any;
  columns: Column[];
  actions?: Action[];
  selectable: boolean;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onRowClick?: (row: any) => void;
}> = ({ row, columns, actions, selectable, selected, onSelect, onRowClick }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.tr
      className={`hover:bg-gray-50 transition-colors ${
        onRowClick ? 'cursor-pointer' : ''
      }`}
      onClick={() => onRowClick?.(row)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {selectable && (
        <td className="p-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="rounded border-gray-300 text-mint-600 focus:ring-mint-500"
          />
        </td>
      )}
      
      {columns.map(column => (
        <td
          key={column.key}
          className={`p-3 text-${column.align || 'left'}`}
        >
          {column.render ? (
            column.render(row[column.key], row)
          ) : (
            <span className="text-gray-900">
              {row[column.key] || '-'}
            </span>
          )}
        </td>
      ))}
      
      {actions && actions.length > 0 && (
        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-10">
                {actions.map((action, index) => {
                  const shouldShow = action.show ? action.show(row) : true;
                  if (!shouldShow) return null;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        action.onClick(row);
                        setShowActions(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center transition-colors ${
                        action.className || 'text-gray-700'
                      }`}
                      title={action.tooltip}
                    >
                      <action.icon className="w-4 h-4 mr-2" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </td>
      )}
    </motion.tr>
  );
};