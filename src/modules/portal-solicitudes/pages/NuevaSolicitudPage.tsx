/**
 * Página de Nueva Solicitud - Wizard de 4 pasos
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Plus,
  Trash2,
  Calendar,
  Target,
  FileText,
  ClipboardList,
  Upload,
  Link as LinkIcon,
  Image,
  AlertTriangle,
} from 'lucide-react';
import { usePortalAuth } from '../context/PortalAuthContext';
import { crearSolicitud, enviarSolicitud } from '../services/solicitudesService';
import { supabase } from '../../../core/config/supabase';
import type { 
  SolicitudCompraCreate, 
  ItemSolicitudCreate, 
  TipoDestino, 
  Prioridad 
} from '../types';
import { TIPOS_DESTINO_CONFIG, PRIORIDADES_CONFIG } from '../types';

const PASOS = [
  { numero: 1, titulo: 'Destino', icon: Target },
  { numero: 2, titulo: 'Artículos', icon: ClipboardList },
  { numero: 3, titulo: 'Justificación', icon: FileText },
  { numero: 4, titulo: 'Revisión', icon: Check },
];

export const NuevaSolicitudPage: React.FC = () => {
  const navigate = useNavigate();
  const { usuario } = usePortalAuth();
  const [pasoActual, setPasoActual] = useState(1);

  // Estado del formulario
  const [form, setForm] = useState<Partial<SolicitudCompraCreate>>({
    tipo_destino: 'operativo',
    prioridad: 'normal',
    items: [],
  });

  const [items, setItems] = useState<ItemSolicitudCreate[]>([
    { descripcion: '', cantidad: 1, unidad_medida: 'PZA' }
  ]);

  // Obtener proyectos y eventos
  const { data: proyectos = [] } = useQuery({
    queryKey: ['proyectos-portal'],
    queryFn: async () => {
      const { data } = await supabase
        .from('proyectos_erp')
        .select('id, nombre, codigo')
        .eq('activo', true)
        .order('nombre');
      return data || [];
    },
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ['eventos-portal'],
    queryFn: async () => {
      const { data } = await supabase
        .from('eventos')
        .select('id, nombre_proyecto, fecha_evento')
        .gte('fecha_evento', new Date().toISOString().split('T')[0])
        .order('fecha_evento');
      return data || [];
    },
  });

  const { data: departamentos = [] } = useQuery({
    queryKey: ['departamentos-portal'],
    queryFn: async () => {
      const { data } = await supabase
        .from('departamentos_erp')
        .select('id, codigo, nombre, centro_costos')
        .eq('activo', true)
        .order('nombre');
      return data || [];
    },
  });

  // Tipos de gasto
  const { data: tiposGasto = [] } = useQuery({
    queryKey: ['tipos-gasto-portal'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tipos_gasto_erp')
        .select('id, codigo, nombre, descripcion, categoria')
        .eq('activo', true)
        .order('nombre');
      return data || [];
    },
  });

  // Mutación para crear
  const crearMutation = useMutation({
    mutationFn: async (enviar: boolean) => {
      if (!usuario?.empresa_id || !usuario?.id) throw new Error('Usuario no válido');
      
      const solicitud = await crearSolicitud(
        usuario.empresa_id,
        usuario.id,
        {
          ...form,
          items,
        } as SolicitudCompraCreate
      );

      if (enviar) {
        await enviarSolicitud(solicitud.id, usuario.id);
      }

      return solicitud;
    },
    onSuccess: (solicitud, enviar) => {
      toast.success(enviar ? 'Solicitud enviada correctamente' : 'Solicitud guardada como borrador');
      navigate(`/portal/solicitud/${solicitud.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear solicitud');
    },
  });

  // Cálculos
  const montoTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + (item.cantidad * (item.precio_referencia || 0));
    }, 0);
  }, [items]);

  const nivelAprobacion = useMemo(() => {
    if (montoTotal <= 5000) return { nivel: 1, nombre: 'Jefe Inmediato' };
    if (montoTotal <= 25000) return { nivel: 2, nombre: 'Gerente de Área' };
    if (montoTotal <= 100000) return { nivel: 3, nombre: 'Director' };
    if (montoTotal <= 500000) return { nivel: 4, nombre: 'Dirección + Finanzas' };
    return { nivel: 5, nombre: 'Comité de Compras' };
  }, [montoTotal]);

  // Validaciones
  const validarPaso = (paso: number): boolean => {
    switch (paso) {
      case 1:
        if (!form.tipo_destino) return false;
        if (form.tipo_destino === 'proyecto' && !form.proyecto_id) return false;
        if (form.tipo_destino === 'evento' && !form.evento_id) return false;
        return true;
      case 2:
        return items.length > 0 && items.every(item => 
          item.descripcion.trim() !== '' && item.cantidad > 0
        );
      case 3:
        return !!form.justificacion && form.justificacion.trim().length >= 20;
      default:
        return true;
    }
  };

  const puedeAvanzar = validarPaso(pasoActual);

  // Handlers
  const agregarItem = () => {
    setItems([...items, { descripcion: '', cantidad: 1, unidad_medida: 'PZA' }]);
  };

  const eliminarItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const actualizarItem = (index: number, campo: keyof ItemSolicitudCreate, valor: any) => {
    const nuevosItems = [...items];
    nuevosItems[index] = { ...nuevosItems[index], [campo]: valor };
    setItems(nuevosItems);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/portal')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-gray-800">Nueva Solicitud de Compra</h1>
              <p className="text-sm text-gray-500">Completa los pasos para crear tu solicitud</p>
            </div>
          </div>
        </div>
      </header>

      {/* Indicador de pasos */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {PASOS.map((paso, index) => {
              const Icon = paso.icon;
              const completado = pasoActual > paso.numero;
              const activo = pasoActual === paso.numero;
              
              return (
                <React.Fragment key={paso.numero}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        completado
                          ? 'bg-green-500 text-white'
                          : activo
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {completado ? <Check size={20} /> : <Icon size={20} />}
                    </div>
                    <span
                      className={`hidden sm:block text-sm font-medium ${
                        activo ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {paso.titulo}
                    </span>
                  </div>
                  {index < PASOS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded ${
                        completado ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido del paso */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          {/* Paso 1: Destino */}
          {pasoActual === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  ¿Para qué es esta compra?
                </h2>
                <p className="text-sm text-gray-500">
                  Selecciona el destino o propósito de la solicitud
                </p>
              </div>

              {/* Tipo de destino */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(TIPOS_DESTINO_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setForm({ ...form, tipo_destino: key as TipoDestino })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      form.tipo_destino === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl">{config.icon}</span>
                    <p className="mt-2 font-medium text-gray-800">{config.label}</p>
                  </button>
                ))}
              </div>

              {/* Selector de proyecto/evento */}
              {form.tipo_destino === 'proyecto' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecciona el proyecto *
                  </label>
                  <select
                    value={form.proyecto_id || ''}
                    onChange={(e) => setForm({ ...form, proyecto_id: parseInt(e.target.value) || undefined })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar proyecto...</option>
                    {proyectos.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} - {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.tipo_destino === 'evento' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecciona el evento *
                  </label>
                  <select
                    value={form.evento_id || ''}
                    onChange={(e) => setForm({ ...form, evento_id: parseInt(e.target.value) || undefined })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar evento...</option>
                    {eventos.map((e: any) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre_proyecto} - {new Date(e.fecha_evento).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Departamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departamento
                </label>
                <select
                  value={form.departamento_id || usuario?.departamento_id || ''}
                  onChange={(e) => setForm({ ...form, departamento_id: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar departamento...</option>
                  {departamentos.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre} ({d.centro_costos || d.codigo})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Gasto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Gasto *
                </label>
                <select
                  value={form.tipo_gasto_id || ''}
                  onChange={(e) => setForm({ ...form, tipo_gasto_id: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar tipo de gasto...</option>
                  {tiposGasto.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} - {t.categoria}
                    </option>
                  ))}
                </select>
                {form.tipo_gasto_id && tiposGasto.find((t: any) => t.id === form.tipo_gasto_id)?.descripcion && (
                  <p className="mt-1 text-xs text-gray-500">
                    {tiposGasto.find((t: any) => t.id === form.tipo_gasto_id)?.descripcion}
                  </p>
                )}
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridad
                </label>
                <div className="flex gap-4">
                  {Object.entries(PRIORIDADES_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setForm({ ...form, prioridad: key as Prioridad })}
                      className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                        form.prioridad === key
                          ? `border-current`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{
                        borderColor: form.prioridad === key ? config.color : undefined,
                        backgroundColor: form.prioridad === key ? config.bgColor : undefined,
                      }}
                    >
                      <p className="font-medium" style={{ color: config.color }}>
                        {config.label}
                      </p>
                      <p className="text-xs text-gray-500">{config.dias} días</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha requerida */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha requerida de entrega
                </label>
                <input
                  type="date"
                  value={form.fecha_requerida || ''}
                  onChange={(e) => setForm({ ...form, fecha_requerida: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Paso 2: Artículos */}
          {pasoActual === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  ¿Qué necesitas comprar?
                </h2>
                <p className="text-sm text-gray-500">
                  Agrega los artículos o materiales que necesitas
                </p>
              </div>

              {/* Lista de items */}
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">
                        Artículo {index + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          onClick={() => eliminarItem(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          placeholder="Descripción del artículo *"
                          value={item.descripcion}
                          onChange={(e) => actualizarItem(index, 'descripcion', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Especificaciones (opcional)"
                          value={item.especificaciones || ''}
                          onChange={(e) => actualizarItem(index, 'especificaciones', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Cantidad"
                          value={item.cantidad}
                          onChange={(e) => actualizarItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                          min={1}
                          className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                          value={item.unidad_medida}
                          onChange={(e) => actualizarItem(index, 'unidad_medida', e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="PZA">Piezas</option>
                          <option value="KG">Kilogramos</option>
                          <option value="LT">Litros</option>
                          <option value="MT">Metros</option>
                          <option value="CJA">Cajas</option>
                          <option value="PAQ">Paquetes</option>
                          <option value="SRV">Servicio</option>
                        </select>
                      </div>

                      <div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            $
                          </span>
                          <input
                            type="number"
                            placeholder="Precio estimado"
                            value={item.precio_referencia || ''}
                            onChange={(e) => actualizarItem(index, 'precio_referencia', parseFloat(e.target.value) || undefined)}
                            className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Proveedor sugerido (opcional)"
                          value={item.proveedor_sugerido_nombre || ''}
                          onChange={(e) => actualizarItem(index, 'proveedor_sugerido_nombre', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="URL de referencia (opcional)"
                            value={item.url_referencia || ''}
                            onChange={(e) => actualizarItem(index, 'url_referencia', e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg">
                            <LinkIcon size={20} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {item.precio_referencia && (
                      <div className="mt-3 text-right">
                        <span className="text-sm text-gray-500">Subtotal: </span>
                        <span className="font-medium text-gray-800">
                          {formatMoney(item.cantidad * item.precio_referencia)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={agregarItem}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Agregar otro artículo
              </button>

              {/* Resumen */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-800">Total estimado:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatMoney(montoTotal)}
                  </span>
                </div>
                {montoTotal > 0 && (
                  <p className="text-sm text-blue-600 mt-2">
                    <AlertTriangle size={14} className="inline mr-1" />
                    Esta solicitud requiere aprobación de: <strong>{nivelAprobacion.nombre}</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Paso 3: Justificación */}
          {pasoActual === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  Justifica tu solicitud
                </h2>
                <p className="text-sm text-gray-500">
                  Explica por qué es necesaria esta compra
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Justificación *
                </label>
                <textarea
                  value={form.justificacion || ''}
                  onChange={(e) => setForm({ ...form, justificacion: e.target.value })}
                  placeholder="Describe detalladamente por qué necesitas estos artículos o servicios..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Mínimo 20 caracteres ({(form.justificacion?.length || 0)}/20)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Impacto si no se realiza la compra (opcional)
                </label>
                <textarea
                  value={form.impacto_sin_compra || ''}
                  onChange={(e) => setForm({ ...form, impacto_sin_compra: e.target.value })}
                  placeholder="¿Qué sucedería si no se aprueba esta solicitud?"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="tiene_presupuesto"
                  checked={form.tiene_presupuesto || false}
                  onChange={(e) => setForm({ ...form, tiene_presupuesto: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="tiene_presupuesto" className="text-gray-700">
                  Esta compra está contemplada en el presupuesto
                </label>
              </div>

              {form.tiene_presupuesto && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Partida presupuestal
                  </label>
                  <input
                    type="text"
                    value={form.partida_presupuestal || ''}
                    onChange={(e) => setForm({ ...form, partida_presupuestal: e.target.value })}
                    placeholder="Ej: OPEX-2025-001"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción del objetivo (opcional)
                </label>
                <textarea
                  value={form.objetivo_descripcion || ''}
                  onChange={(e) => setForm({ ...form, objetivo_descripcion: e.target.value })}
                  placeholder="Contexto adicional sobre el uso de estos materiales..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Paso 4: Revisión */}
          {pasoActual === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  Revisa tu solicitud
                </h2>
                <p className="text-sm text-gray-500">
                  Verifica que toda la información sea correcta antes de enviar
                </p>
              </div>

              {/* Resumen */}
              <div className="space-y-4">
                {/* Destino */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-700 mb-2">Destino</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {TIPOS_DESTINO_CONFIG[form.tipo_destino!].icon}
                    </span>
                    <span className="text-gray-800">
                      {TIPOS_DESTINO_CONFIG[form.tipo_destino!].label}
                    </span>
                  </div>
                  {form.prioridad !== 'normal' && (
                    <span
                      className="inline-block mt-2 px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: PRIORIDADES_CONFIG[form.prioridad!].bgColor,
                        color: PRIORIDADES_CONFIG[form.prioridad!].color,
                      }}
                    >
                      Prioridad: {PRIORIDADES_CONFIG[form.prioridad!].label}
                    </span>
                  )}
                </div>

                {/* Artículos */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-700 mb-2">
                    Artículos ({items.length})
                  </h3>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.cantidad} {item.unidad_medida} - {item.descripcion}
                        </span>
                        <span className="text-gray-800 font-medium">
                          {item.precio_referencia 
                            ? formatMoney(item.cantidad * item.precio_referencia)
                            : 'Sin precio'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                    <span className="font-medium text-gray-700">Total:</span>
                    <span className="font-bold text-blue-600">{formatMoney(montoTotal)}</span>
                  </div>
                </div>

                {/* Justificación */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-700 mb-2">Justificación</h3>
                  <p className="text-gray-600 text-sm">{form.justificacion}</p>
                </div>

                {/* Info de aprobación */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
                    <div>
                      <p className="font-medium text-yellow-800">
                        Nivel de aprobación requerido
                      </p>
                      <p className="text-sm text-yellow-700">
                        {nivelAprobacion.nombre} (Nivel {nivelAprobacion.nivel})
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navegación */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => {
              if (pasoActual === 1) {
                navigate('/portal');
              } else {
                setPasoActual(pasoActual - 1);
              }
            }}
            className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            {pasoActual === 1 ? 'Cancelar' : 'Anterior'}
          </button>

          <div className="flex gap-3">
            {pasoActual === 4 && (
              <button
                onClick={() => crearMutation.mutate(false)}
                disabled={crearMutation.isPending}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Guardar borrador
              </button>
            )}

            {pasoActual < 4 ? (
              <button
                onClick={() => setPasoActual(pasoActual + 1)}
                disabled={!puedeAvanzar}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                onClick={() => crearMutation.mutate(true)}
                disabled={crearMutation.isPending}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {crearMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Enviar solicitud
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NuevaSolicitudPage;
