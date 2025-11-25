import React from 'react';
import { Filter, Calendar, User, Building2, X } from 'lucide-react';
import { FinancialFilters as FiltersType } from '../../types/Event';
import { Cliente, TipoEvento, Usuario } from '../../types/Event';

interface FinancialFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  clients?: Cliente[];
  eventTypes?: TipoEvento[];
  users?: Usuario[];
}

/**
 * Componente de Filtros para Análisis Financiero
 */
export const FinancialFiltersComponent: React.FC<FinancialFiltersProps> = ({
  filters,
  onFiltersChange,
  clients = [],
  eventTypes = [],
  users = []
}) => {

  const handleFilterChange = (key: keyof FiltersType, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => filters[key as keyof FiltersType] !== undefined);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Filter className="w-5 h-5 mr-2 text-blue-600" />
          Filtros de Análisis
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center text-sm text-red-600 hover:text-red-700 font-medium"
          >
            <X className="w-4 h-4 mr-1" />
            Limpiar Filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Cliente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
            <Building2 className="w-4 h-4 mr-1" />
            Cliente
          </label>
          <select
            value={filters.cliente_id || ''}
            onChange={(e) => handleFilterChange('cliente_id', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.nombre_comercial || client.razon_social}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Evento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Evento
          </label>
          <select
            value={filters.tipo_evento_id || ''}
            onChange={(e) => handleFilterChange('tipo_evento_id', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los tipos</option>
            {eventTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Responsable */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
            <User className="w-4 h-4 mr-1" />
            Responsable
          </label>
          <select
            value={filters.responsable_id || ''}
            onChange={(e) => handleFilterChange('responsable_id', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los responsables</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Año */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            Año
          </label>
          <select
            value={filters.año || ''}
            onChange={(e) => handleFilterChange('año', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los años</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Mes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mes
          </label>
          <select
            value={filters.mes || ''}
            onChange={(e) => handleFilterChange('mes', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!filters.año}
          >
            <option value="">Todos los meses</option>
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha Inicio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Inicio
          </label>
          <input
            type="date"
            value={filters.fecha_inicio || ''}
            onChange={(e) => handleFilterChange('fecha_inicio', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Fecha Fin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Fin
          </label>
          <input
            type="date"
            value={filters.fecha_fin || ''}
            onChange={(e) => handleFilterChange('fecha_fin', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Margen Mínimo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Margen Mínimo (%)
          </label>
          <input
            type="number"
            value={filters.margen_minimo || ''}
            onChange={(e) => handleFilterChange('margen_minimo', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
            max="100"
            step="1"
            placeholder="0"
          />
        </div>

        {/* Solo Completados */}
        <div className="flex items-center pt-6">
          <input
            type="checkbox"
            id="solo_completados"
            checked={filters.solo_completados || false}
            onChange={(e) => handleFilterChange('solo_completados', e.target.checked || undefined)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="solo_completados" className="ml-2 text-sm text-gray-700">
            Solo eventos completados
          </label>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <strong>Filtros activos:</strong>{' '}
            {Object.entries(filters).filter(([_, value]) => value !== undefined).length}
          </p>
        </div>
      )}
    </div>
  );
};
