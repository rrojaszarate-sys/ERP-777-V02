/**
 * PÁGINA DE ADMINISTRACIÓN DE CUENTAS CONTABLES (CLAVES/SUBCLAVES)
 * CRUD completo con gestión por año
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Copy, Save, X, Search, Filter, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Calendar } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import {
  getCuentasContablesPorAnio,
  getAniosDisponiblesCuentas,
  createCuentaContable,
  updateCuentaContable,
  deleteCuentaContable,
  toggleCuentaContableActiva,
  duplicarEstructuraAnio
} from '../services/catalogosCentralizadosService';
import type { CuentaContable, CuentaContableFormData } from '../types/catalogosCentralizados';
import toast from 'react-hot-toast';

const anioActual = new Date().getFullYear();

const tiposCuenta: { value: CuentaContable['tipo']; label: string }[] = [
  { value: 'gasto', label: 'Gasto' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'activo', label: 'Activo' },
  { value: 'pasivo', label: 'Pasivo' },
  { value: 'capital', label: 'Capital' }
];

export default function CuentasContablesPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  // Estados principales
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [aniosDisponibles, setAniosDisponibles] = useState<number[]>([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState(anioActual);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCuenta, setFilterCuenta] = useState('');
  const [showInactivas, setShowInactivas] = useState(false);

  // Estados del modal
  const [showModal, setShowModal] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<CuentaContable | null>(null);
  const [formData, setFormData] = useState<CuentaContableFormData>({
    clave: '',
    cuenta: '',
    subcuenta: '',
    tipo: 'gasto',
    presupuesto_anual: 0,
    descripcion: '',
    anio: anioActual
  });

  // Estado para duplicar año
  const [showDuplicarModal, setShowDuplicarModal] = useState(false);
  const [anioOrigen, setAnioOrigen] = useState(anioActual);
  const [anioDestino, setAnioDestino] = useState(anioActual + 1);

  // Expandir/colapsar categorías
  const [expandedCuentas, setExpandedCuentas] = useState<Set<string>>(new Set());

  // Cargar datos
  const loadData = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const [cuentasData, aniosData] = await Promise.all([
        getCuentasContablesPorAnio(companyId, anioSeleccionado),
        getAniosDisponiblesCuentas(companyId)
      ]);

      setCuentas(cuentasData);
      setAniosDisponibles(aniosData.length > 0 ? aniosData : [anioActual]);

      // Expandir todas las categorías por defecto
      const categorias = [...new Set(cuentasData.map(c => c.cuenta))];
      setExpandedCuentas(new Set(categorias));
    } catch (error) {
      console.error('Error cargando cuentas:', error);
      toast.error('Error al cargar las cuentas');
    } finally {
      setLoading(false);
    }
  }, [companyId, anioSeleccionado]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrar cuentas
  const cuentasFiltradas = cuentas.filter(c => {
    if (!showInactivas && !c.activa) return false;
    if (filterCuenta && c.cuenta !== filterCuenta) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        c.clave.toLowerCase().includes(search) ||
        c.cuenta.toLowerCase().includes(search) ||
        (c.subcuenta?.toLowerCase().includes(search) ?? false)
      );
    }
    return true;
  });

  // Agrupar por categoría (cuenta)
  const cuentasAgrupadas = cuentasFiltradas.reduce((acc, cuenta) => {
    const key = cuenta.cuenta;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cuenta);
    return acc;
  }, {} as Record<string, CuentaContable[]>);

  // Obtener lista de categorías únicas
  const categorias = [...new Set(cuentas.map(c => c.cuenta))].sort();

  // Toggle expandir categoría
  const toggleExpand = (categoria: string) => {
    const newSet = new Set(expandedCuentas);
    if (newSet.has(categoria)) {
      newSet.delete(categoria);
    } else {
      newSet.add(categoria);
    }
    setExpandedCuentas(newSet);
  };

  // Handlers del formulario
  const handleOpenCreate = () => {
    setEditingCuenta(null);
    setFormData({
      clave: `MDE${anioSeleccionado}-`,
      cuenta: '',
      subcuenta: '',
      tipo: 'gasto',
      presupuesto_anual: 0,
      descripcion: '',
      anio: anioSeleccionado
    });
    setShowModal(true);
  };

  const handleOpenEdit = (cuenta: CuentaContable) => {
    setEditingCuenta(cuenta);
    setFormData({
      clave: cuenta.clave,
      cuenta: cuenta.cuenta,
      subcuenta: cuenta.subcuenta || '',
      tipo: cuenta.tipo,
      presupuesto_anual: cuenta.presupuesto_anual,
      descripcion: cuenta.descripcion || '',
      anio: cuenta.anio || anioSeleccionado
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!companyId) return;

    try {
      if (editingCuenta) {
        await updateCuentaContable(editingCuenta.id, formData);
        toast.success('Cuenta actualizada correctamente');
      } else {
        await createCuentaContable(companyId, formData);
        toast.success('Cuenta creada correctamente');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error guardando cuenta:', error);
      toast.error('Error al guardar la cuenta');
    }
  };

  const handleDelete = async (cuenta: CuentaContable) => {
    if (!confirm(`¿Eliminar la cuenta ${cuenta.clave}?`)) return;

    try {
      await deleteCuentaContable(cuenta.id);
      toast.success('Cuenta eliminada');
      loadData();
    } catch (error) {
      console.error('Error eliminando cuenta:', error);
      toast.error('Error al eliminar la cuenta');
    }
  };

  const handleToggleActiva = async (cuenta: CuentaContable) => {
    try {
      await toggleCuentaContableActiva(cuenta.id, !cuenta.activa);
      toast.success(cuenta.activa ? 'Cuenta desactivada' : 'Cuenta activada');
      loadData();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      toast.error('Error al cambiar el estado');
    }
  };

  const handleDuplicarAnio = async () => {
    if (!companyId) return;

    try {
      const resultado = await duplicarEstructuraAnio(companyId, anioOrigen, anioDestino);
      toast.success(`Estructura duplicada: ${resultado.creadas} nuevas, ${resultado.existentes} ya existían`);
      setShowDuplicarModal(false);
      loadData();
    } catch (error) {
      console.error('Error duplicando estructura:', error);
      toast.error('Error al duplicar la estructura');
    }
  };

  // Calcular clave padre (sin letra final)
  const getClavePadre = (clave: string) => {
    return clave.match(/[A-Z]$/) ? clave.slice(0, -1) : clave;
  };

  if (!companyId) {
    return <div className="p-8">No se encontró la empresa</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catálogo de Cuentas</h1>
            <p className="text-gray-500 mt-1">Administra las claves y subclaves contables por año</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de año */}
            <div className="flex items-center gap-2 bg-violet-50 px-4 py-2 rounded-lg">
              <Calendar className="w-5 h-5 text-violet-600" />
              <select
                value={anioSeleccionado}
                onChange={(e) => setAnioSeleccionado(parseInt(e.target.value))}
                className="bg-transparent border-none text-violet-700 font-semibold focus:ring-0"
              >
                {aniosDisponibles.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowDuplicarModal(true)}
              className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Duplicar Año
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Cuenta
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por clave, cuenta o subcuenta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterCuenta}
              onChange={(e) => setFilterCuenta(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactivas}
              onChange={(e) => setShowInactivas(e.target.checked)}
              className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            Mostrar inactivas
          </label>
        </div>
      </div>

      {/* Lista de cuentas agrupadas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(cuentasAgrupadas)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([categoria, items]) => (
              <div key={categoria} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header de categoría */}
                <button
                  onClick={() => toggleExpand(categoria)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedCuentas.has(categoria) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-semibold text-gray-900">{categoria}</span>
                    <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded-full">
                      {items.length} {items.length === 1 ? 'cuenta' : 'cuentas'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Clave: {getClavePadre(items[0]?.clave || '')}
                  </span>
                </button>

                {/* Lista de subclaves */}
                {expandedCuentas.has(categoria) && (
                  <div className="divide-y divide-gray-100">
                    {items.map(cuenta => (
                      <div
                        key={cuenta.id}
                        className={`px-6 py-3 flex items-center justify-between hover:bg-gray-50 ${
                          !cuenta.activa ? 'opacity-50 bg-gray-50' : ''
                        }`}
                      >
                        <div className="flex-1 grid grid-cols-4 gap-4">
                          <div>
                            <span className="text-xs text-gray-500">Subclave</span>
                            <p className="font-mono font-medium text-gray-900">{cuenta.clave}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs text-gray-500">Concepto Subclave</span>
                            <p className="text-gray-700">{cuenta.subcuenta || '-'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Presupuesto</span>
                            <p className="text-gray-900">
                              ${cuenta.presupuesto_anual.toLocaleString('es-MX')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActiva(cuenta)}
                            className={`p-2 rounded-lg ${
                              cuenta.activa
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={cuenta.activa ? 'Desactivar' : 'Activar'}
                          >
                            {cuenta.activa ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(cuenta)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cuenta)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

          {Object.keys(cuentasAgrupadas).length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No se encontraron cuentas para {anioSeleccionado}</p>
              <button
                onClick={() => setShowDuplicarModal(true)}
                className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                Duplicar estructura desde otro año
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCuenta ? 'Editar Cuenta' : 'Nueva Cuenta'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subclave (Código)
                  </label>
                  <input
                    type="text"
                    value={formData.clave}
                    onChange={(e) => setFormData({ ...formData, clave: e.target.value.toUpperCase() })}
                    placeholder="MDE2025-001A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Año
                  </label>
                  <input
                    type="number"
                    value={formData.anio}
                    onChange={(e) => setFormData({ ...formData, anio: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuenta (Categoría/Concepto Clave)
                </label>
                <input
                  type="text"
                  value={formData.cuenta}
                  onChange={(e) => setFormData({ ...formData, cuenta: e.target.value.toUpperCase() })}
                  placeholder="GASTOS FIJOS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  list="categorias-list"
                />
                <datalist id="categorias-list">
                  {categorias.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcuenta (Concepto Subclave/Detalle)
                </label>
                <input
                  type="text"
                  value={formData.subcuenta}
                  onChange={(e) => setFormData({ ...formData, subcuenta: e.target.value })}
                  placeholder="Servicio de luz"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as CuentaContable['tipo'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  >
                    {tiposCuenta.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Presupuesto Anual
                  </label>
                  <input
                    type="number"
                    value={formData.presupuesto_anual}
                    onChange={(e) => setFormData({ ...formData, presupuesto_anual: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Duplicar Año */}
      {showDuplicarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Duplicar Estructura de Año
              </h2>
              <button
                onClick={() => setShowDuplicarModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-600 text-sm">
                Esta acción copiará todas las cuentas de un año a otro, cambiando el año en las claves.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Año Origen
                  </label>
                  <select
                    value={anioOrigen}
                    onChange={(e) => setAnioOrigen(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  >
                    {aniosDisponibles.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Año Destino
                  </label>
                  <input
                    type="number"
                    value={anioDestino}
                    onChange={(e) => setAnioDestino(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-800 text-sm">
                  <strong>Ejemplo:</strong> MDE{anioOrigen}-001A → MDE{anioDestino}-001A
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowDuplicarModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleDuplicarAnio}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Duplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
