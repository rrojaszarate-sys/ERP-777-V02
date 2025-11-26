/**
 * MODAL: FORMULARIO DE GASTO NO IMPACTADO
 * Crear/Editar gastos con autocomplete de proveedor
 */

import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Upload, FileText } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthProvider';
import {
  createGasto,
  updateGasto,
  searchProveedores,
  createProveedor,
  createEjecutivo
} from '../services/gastosNoImpactadosService';
import type {
  GastoNoImpactadoView,
  GastoNoImpactadoFormData,
  ClaveGasto,
  FormaPago,
  Proveedor,
  Ejecutivo
} from '../types/gastosNoImpactados';
import toast from 'react-hot-toast';

interface Props {
  gasto: GastoNoImpactadoView | null;
  claves: ClaveGasto[];
  formasPago: FormaPago[];
  proveedores: Proveedor[];
  ejecutivos: Ejecutivo[];
  periodo: string;
  onClose: () => void;
  onSave: () => void;
}

export const GastoFormModal = ({
  gasto,
  claves,
  formasPago,
  proveedores: proveedoresInicial,
  ejecutivos: ejecutivosInicial,
  periodo,
  onClose,
  onSave
}: Props) => {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const [saving, setSaving] = useState(false);

  // Lista de proveedores (puede crecer si se añaden nuevos)
  const [proveedores, setProveedores] = useState<Proveedor[]>(proveedoresInicial);
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>(ejecutivosInicial);

  // Autocomplete proveedor
  const [proveedorSearch, setProveedorSearch] = useState('');
  const [proveedoresFiltrados, setProveedoresFiltrados] = useState<Proveedor[]>([]);
  const [showProveedorDropdown, setShowProveedorDropdown] = useState(false);
  const proveedorInputRef = useRef<HTMLInputElement>(null);

  // Modal nuevo proveedor
  const [showNuevoProveedor, setShowNuevoProveedor] = useState(false);
  const [nuevoProveedorData, setNuevoProveedorData] = useState({
    razon_social: '',
    rfc: ''
  });

  // Form data
  const [formData, setFormData] = useState<GastoNoImpactadoFormData>({
    proveedor_id: null,
    concepto: '',
    clave_gasto_id: null,
    subtotal: 0,
    iva: 0,
    total: 0,
    validacion: 'pendiente',
    forma_pago_id: null,
    ejecutivo_id: null,
    status_pago: 'pagado',
    fecha_gasto: new Date().toISOString().split('T')[0],
    periodo: periodo,
    folio_factura: '',
    documento_url: null,
    notas: ''
  });

  // Inicializar con datos del gasto a editar
  useEffect(() => {
    if (gasto) {
      setFormData({
        proveedor_id: gasto.proveedor_id,
        concepto: gasto.concepto || '',
        clave_gasto_id: claves.find(c => c.clave === gasto.clave)?.id || null,
        subtotal: gasto.subtotal || 0,
        iva: gasto.iva || 0,
        total: gasto.total || 0,
        validacion: gasto.validacion || 'pendiente',
        forma_pago_id: formasPago.find(f => f.nombre === gasto.forma_pago)?.id || null,
        ejecutivo_id: ejecutivos.find(e => e.nombre === gasto.ejecutivo)?.id || null,
        status_pago: gasto.status_pago || 'pagado',
        fecha_gasto: gasto.fecha_gasto?.split('T')[0] || new Date().toISOString().split('T')[0],
        periodo: gasto.periodo || periodo,
        folio_factura: gasto.folio_factura || '',
        documento_url: gasto.documento_url,
        notas: ''
      });
      setProveedorSearch(gasto.proveedor || '');
    }
  }, [gasto]);

  // Búsqueda de proveedores
  useEffect(() => {
    if (proveedorSearch.length >= 2) {
      const filtered = proveedores.filter(p =>
        p.razon_social.toLowerCase().includes(proveedorSearch.toLowerCase()) ||
        (p.rfc && p.rfc.toLowerCase().includes(proveedorSearch.toLowerCase()))
      );
      setProveedoresFiltrados(filtered.slice(0, 10));
      setShowProveedorDropdown(true);
    } else {
      setProveedoresFiltrados([]);
      setShowProveedorDropdown(false);
    }
  }, [proveedorSearch, proveedores]);

  // Calcular total automáticamente
  useEffect(() => {
    const total = formData.subtotal + formData.iva;
    setFormData(prev => ({ ...prev, total }));
  }, [formData.subtotal, formData.iva]);

  const handleSelectProveedor = (proveedor: Proveedor) => {
    setFormData(prev => ({ ...prev, proveedor_id: proveedor.id }));
    setProveedorSearch(proveedor.razon_social);
    setShowProveedorDropdown(false);
  };

  const handleCrearNuevoProveedor = async () => {
    if (!company?.id || !nuevoProveedorData.razon_social) return;

    try {
      const nuevo = await createProveedor({
        razon_social: nuevoProveedorData.razon_social,
        rfc: nuevoProveedorData.rfc,
        nombre_comercial: '',
        direccion: '',
        telefono: '',
        email: '',
        contacto_nombre: '',
        modulo_origen: 'contabilidad'
      }, companyId!);

      setProveedores([...proveedores, nuevo]);
      handleSelectProveedor(nuevo);
      setShowNuevoProveedor(false);
      setNuevoProveedorData({ razon_social: '', rfc: '' });
      toast.success('Proveedor creado');
    } catch (error) {
      toast.error('Error al crear proveedor');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    // Validaciones
    if (!formData.proveedor_id) {
      toast.error('Selecciona un proveedor');
      return;
    }
    if (!formData.concepto.trim()) {
      toast.error('Ingresa el concepto');
      return;
    }
    if (formData.total <= 0) {
      toast.error('El total debe ser mayor a 0');
      return;
    }

    setSaving(true);
    try {
      if (gasto?.id) {
        await updateGasto(gasto.id, formData);
      } else {
        await createGasto(formData, companyId);
      }
      onSave();
    } catch (error) {
      console.error('Error guardando gasto:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Agrupar claves por cuenta
  const clavesAgrupadas = claves.reduce((acc, clave) => {
    if (!acc[clave.cuenta]) acc[clave.cuenta] = [];
    acc[clave.cuenta].push(clave);
    return acc;
  }, {} as Record<string, ClaveGasto[]>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {gasto ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-2 gap-4">
            {/* Proveedor con autocomplete */}
            <div className="col-span-2 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={proveedorInputRef}
                  type="text"
                  value={proveedorSearch}
                  onChange={(e) => {
                    setProveedorSearch(e.target.value);
                    setFormData(prev => ({ ...prev, proveedor_id: null }));
                  }}
                  onFocus={() => proveedorSearch.length >= 2 && setShowProveedorDropdown(true)}
                  placeholder="Buscar proveedor por nombre o RFC..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {formData.proveedor_id && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">
                    RFC: {proveedores.find(p => p.id === formData.proveedor_id)?.rfc || 'N/A'}
                  </span>
                )}
              </div>

              {/* Dropdown de proveedores */}
              {showProveedorDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {proveedoresFiltrados.length > 0 ? (
                    proveedoresFiltrados.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProveedor(p)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
                      >
                        <span className="text-gray-900">{p.razon_social}</span>
                        <span className="text-sm text-gray-500">{p.rfc || ''}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-center">
                      <p className="mb-2">No se encontraron proveedores</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNuevoProveedor(true);
                          setNuevoProveedorData({ razon_social: proveedorSearch, rfc: '' });
                          setShowProveedorDropdown(false);
                        }}
                        className="text-blue-600 hover:underline flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Crear "{proveedorSearch}"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Concepto */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Concepto *
              </label>
              <input
                type="text"
                value={formData.concepto}
                onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Descripción del gasto"
              />
            </div>

            {/* Clave de gasto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clave de Gasto
              </label>
              <select
                value={formData.clave_gasto_id || ''}
                onChange={(e) => setFormData({ ...formData, clave_gasto_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                {Object.entries(clavesAgrupadas).map(([cuenta, items]) => (
                  <optgroup key={cuenta} label={cuenta}>
                    {items.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.clave} - {c.subcuenta}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Forma de pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de Pago
              </label>
              <select
                value={formData.forma_pago_id || ''}
                onChange={(e) => setFormData({ ...formData, forma_pago_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                {formasPago.map(f => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </select>
            </div>

            {/* Subtotal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtotal *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.subtotal}
                onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* IVA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IVA
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.iva}
                onChange={(e) => setFormData({ ...formData, iva: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Total */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.total}
                readOnly
                className="w-full px-4 py-2 border rounded-lg bg-gray-50 font-semibold"
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha *
              </label>
              <input
                type="date"
                value={formData.fecha_gasto}
                onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Ejecutivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ejecutivo
              </label>
              <select
                value={formData.ejecutivo_id || ''}
                onChange={(e) => setFormData({ ...formData, ejecutivo_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                {ejecutivos.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>

            {/* Validación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Validación
              </label>
              <select
                value={formData.validacion}
                onChange={(e) => setFormData({ ...formData, validacion: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="pendiente">Pendiente</option>
                <option value="correcto">Correcto</option>
                <option value="revisar">Revisar</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status de Pago
              </label>
              <select
                value={formData.status_pago}
                onChange={(e) => setFormData({ ...formData, status_pago: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
              </select>
            </div>

            {/* Folio factura */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Folio Factura
              </label>
              <input
                type="text"
                value={formData.folio_factura}
                onChange={(e) => setFormData({ ...formData, folio_factura: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="FACT13287, N/A, etc."
              />
            </div>

            {/* Documento PDF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comprobante PDF
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.documento_url || ''}
                  onChange={(e) => setFormData({ ...formData, documento_url: e.target.value })}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="URL del documento"
                />
                <button
                  type="button"
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                  title="Subir archivo"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notas */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : gasto ? 'Actualizar' : 'Crear Gasto'}
            </button>
          </div>
        </form>

        {/* Modal nuevo proveedor */}
        {showNuevoProveedor && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
              <h3 className="text-lg font-semibold mb-4">Nuevo Proveedor</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    value={nuevoProveedorData.razon_social}
                    onChange={(e) => setNuevoProveedorData({ ...nuevoProveedorData, razon_social: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RFC
                  </label>
                  <input
                    type="text"
                    value={nuevoProveedorData.rfc}
                    onChange={(e) => setNuevoProveedorData({ ...nuevoProveedorData, rfc: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border rounded-lg"
                    maxLength={13}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNuevoProveedor(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCrearNuevoProveedor}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
