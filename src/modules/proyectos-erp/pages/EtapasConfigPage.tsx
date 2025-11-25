import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Plus, Edit2, Trash2, GripVertical, Save, X, FolderKanban, CheckSquare } from 'lucide-react';
import { Tab, Tabs } from '@nextui-org/react';

interface Etapa {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
  secuencia: number;
  es_final?: boolean;
  es_cerrado?: boolean;
  fold?: boolean;
  activo: boolean;
}

export const EtapasConfigPage: React.FC = () => {
  const [etapasProyecto, setEtapasProyecto] = useState<Etapa[]>([
    { id: 1, nombre: 'Planificación', descripcion: 'Proyecto en fase de planificación', color: '#3B82F6', secuencia: 1, es_final: false, activo: true },
    { id: 2, nombre: 'En Progreso', descripcion: 'Proyecto activo', color: '#10B981', secuencia: 2, es_final: false, activo: true },
    { id: 3, nombre: 'En Revisión', descripcion: 'Proyecto en revisión de calidad', color: '#F59E0B', secuencia: 3, es_final: false, activo: true },
    { id: 4, nombre: 'Completado', descripcion: 'Proyecto finalizado exitosamente', color: '#059669', secuencia: 4, es_final: true, activo: true },
    { id: 5, nombre: 'Cancelado', descripcion: 'Proyecto cancelado', color: '#EF4444', secuencia: 5, es_final: true, activo: true },
  ]);

  const [etapasTarea, setEtapasTarea] = useState<Etapa[]>([
    { id: 1, nombre: 'Por Hacer', descripcion: 'Tareas pendientes', color: '#6B7280', secuencia: 1, es_cerrado: false, fold: false, activo: true },
    { id: 2, nombre: 'En Progreso', descripcion: 'Tareas en desarrollo', color: '#3B82F6', secuencia: 2, es_cerrado: false, fold: false, activo: true },
    { id: 3, nombre: 'En Revisión', descripcion: 'Tareas en código review', color: '#F59E0B', secuencia: 3, es_cerrado: false, fold: false, activo: true },
    { id: 4, nombre: 'Pruebas', descripcion: 'Tareas en testing/QA', color: '#8B5CF6', secuencia: 4, es_cerrado: false, fold: false, activo: true },
    { id: 5, nombre: 'Completado', descripcion: 'Tareas finalizadas', color: '#10B981', secuencia: 5, es_cerrado: true, fold: true, activo: true },
  ]);

  const [editandoProyecto, setEditandoProyecto] = useState<Etapa | null>(null);
  const [editandoTarea, setEditandoTarea] = useState<Etapa | null>(null);
  const [mostrandoFormProyecto, setMostrandoFormProyecto] = useState(false);
  const [mostrandoFormTarea, setMostrandoFormTarea] = useState(false);

  const coloresDisponibles = [
    { value: '#3B82F6', label: 'Azul' },
    { value: '#10B981', label: 'Verde' },
    { value: '#F59E0B', label: 'Amarillo' },
    { value: '#EF4444', label: 'Rojo' },
    { value: '#8B5CF6', label: 'Morado' },
    { value: '#EC4899', label: 'Rosa' },
    { value: '#6B7280', label: 'Gris' },
    { value: '#06B6D4', label: 'Cyan' },
  ];

  const renderFormularioEtapa = (
    etapa: Etapa | null,
    tipo: 'proyecto' | 'tarea',
    onSave: (etapa: Etapa) => void,
    onCancel: () => void
  ) => {
    const [formData, setFormData] = useState<Etapa>(
      etapa || {
        id: Date.now(),
        nombre: '',
        descripcion: '',
        color: '#3B82F6',
        secuencia: tipo === 'proyecto' ? etapasProyecto.length + 1 : etapasTarea.length + 1,
        es_final: false,
        es_cerrado: false,
        fold: false,
        activo: true,
      }
    );

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: En Progreso"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex gap-2">
              {coloresDisponibles.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color.value ? 'border-gray-900 scale-110' : 'border-gray-300'
                  } transition-all`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Descripción de la etapa"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={tipo === 'proyecto' ? formData.es_final : formData.es_cerrado}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ...(tipo === 'proyecto'
                      ? { es_final: e.target.checked }
                      : { es_cerrado: e.target.checked }),
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {tipo === 'proyecto' ? 'Etapa Final' : 'Etapa Cerrada'}
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              {tipo === 'proyecto'
                ? 'Marca si es una etapa final (completado/cancelado)'
                : 'Las tareas en esta etapa se consideran finalizadas'}
            </p>
          </div>

          {tipo === 'tarea' && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.fold}
                  onChange={(e) => setFormData({ ...formData, fold: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Colapsar en Kanban</span>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                La columna aparecerá colapsada por defecto
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.nombre.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
        </div>
      </motion.div>
    );
  };

  const renderListaEtapas = (etapas: Etapa[], tipo: 'proyecto' | 'tarea') => {
    return (
      <div className="space-y-2">
        {etapas
          .sort((a, b) => a.secuencia - b.secuencia)
          .map((etapa, index) => (
            <motion.div
              key={etapa.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />

                <div
                  className="w-4 h-4 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: etapa.color }}
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{etapa.nombre}</h3>
                    {(tipo === 'proyecto' ? etapa.es_final : etapa.es_cerrado) && (
                      <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                        {tipo === 'proyecto' ? 'Final' : 'Cerrada'}
                      </span>
                    )}
                    {tipo === 'tarea' && etapa.fold && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                        Colapsa
                      </span>
                    )}
                  </div>
                  {etapa.descripcion && (
                    <p className="text-sm text-gray-500 mt-1">{etapa.descripcion}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (tipo === 'proyecto') {
                        setEditandoProyecto(etapa);
                      } else {
                        setEditandoTarea(etapa);
                      }
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar la etapa "${etapa.nombre}"?`)) {
                        if (tipo === 'proyecto') {
                          setEtapasProyecto((prev) => prev.filter((e) => e.id !== etapa.id));
                        } else {
                          setEtapasTarea((prev) => prev.filter((e) => e.id !== etapa.id));
                        }
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Configuración de Etapas
        </h1>
        <p className="text-gray-500 mt-1">
          Personaliza las etapas para proyectos y tareas (estilo Kanban de Odoo)
        </p>
      </div>

      {/* Tabs */}
      <Tabs aria-label="Configuración de Etapas" color="primary" size="lg">
        <Tab
          key="proyectos"
          title={
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4" />
              <span>Etapas de Proyectos</span>
            </div>
          }
        >
          <div className="mt-6 space-y-6">
            {/* Botón Agregar */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Etapas de Proyectos</h2>
                <p className="text-sm text-gray-500">
                  Define las etapas por las que pasan tus proyectos
                </p>
              </div>
              <button
                onClick={() => {
                  setMostrandoFormProyecto(true);
                  setEditandoProyecto(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nueva Etapa
              </button>
            </div>

            {/* Formulario */}
            {(mostrandoFormProyecto || editandoProyecto) &&
              renderFormularioEtapa(
                editandoProyecto,
                'proyecto',
                (etapa) => {
                  if (editandoProyecto) {
                    setEtapasProyecto((prev) =>
                      prev.map((e) => (e.id === etapa.id ? etapa : e))
                    );
                  } else {
                    setEtapasProyecto((prev) => [...prev, etapa]);
                  }
                  setMostrandoFormProyecto(false);
                  setEditandoProyecto(null);
                },
                () => {
                  setMostrandoFormProyecto(false);
                  setEditandoProyecto(null);
                }
              )}

            {/* Lista */}
            <div className="bg-white rounded-lg shadow p-6">
              {renderListaEtapas(etapasProyecto, 'proyecto')}
            </div>
          </div>
        </Tab>

        <Tab
          key="tareas"
          title={
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              <span>Etapas de Tareas</span>
            </div>
          }
        >
          <div className="mt-6 space-y-6">
            {/* Botón Agregar */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Etapas de Tareas</h2>
                <p className="text-sm text-gray-500">
                  Personaliza las columnas de tu tablero Kanban de tareas
                </p>
              </div>
              <button
                onClick={() => {
                  setMostrandoFormTarea(true);
                  setEditandoTarea(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nueva Etapa
              </button>
            </div>

            {/* Formulario */}
            {(mostrandoFormTarea || editandoTarea) &&
              renderFormularioEtapa(
                editandoTarea,
                'tarea',
                (etapa) => {
                  if (editandoTarea) {
                    setEtapasTarea((prev) =>
                      prev.map((e) => (e.id === etapa.id ? etapa : e))
                    );
                  } else {
                    setEtapasTarea((prev) => [...prev, etapa]);
                  }
                  setMostrandoFormTarea(false);
                  setEditandoTarea(null);
                },
                () => {
                  setMostrandoFormTarea(false);
                  setEditandoTarea(null);
                }
              )}

            {/* Lista */}
            <div className="bg-white rounded-lg shadow p-6">
              {renderListaEtapas(etapasTarea, 'tarea')}
            </div>
          </div>
        </Tab>
      </Tabs>

      {/* Ayuda */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Consejos</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Arrastra las etapas para reorganizarlas (próximamente)</li>
          <li>• Las etapas finales/cerradas marcan proyectos/tareas como completados</li>
          <li>• Las columnas colapsadas en Kanban se muestran minimizadas por defecto</li>
          <li>• Puedes tener múltiples etapas finales (ej: Completado, Cancelado, Archivado)</li>
        </ul>
      </div>
    </div>
  );
};
