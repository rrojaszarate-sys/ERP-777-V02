/**
 * ConfiguracionInventarioPage - Administración de Submódulos de Inventario
 * 
 * Permite mostrar/ocultar submódulos según el tipo de almacén y necesidades.
 * Incluye descripción de cada submódulo y su estado de implementación.
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Clock,
  Package,
  Truck,
  FileText,
  DollarSign,
  Bell,
  MapPin,
  Tag,
  ClipboardCheck,
  BarChart3,
  ShoppingCart,
  QrCode,
  Smartphone,
  Archive,
  AlertCircle,
  Save,
  RotateCcw,
  Info
} from 'lucide-react';
import { supabase } from '../../../core/config/supabase';

// Definición de todos los submódulos de inventario
interface SubmoduloConfig {
  id: string;
  nombre: string;
  ruta: string;
  icono: React.ElementType;
  descripcion: string;
  descripcionDetallada: string;
  estadoImplementacion: 'completo' | 'parcial' | 'pendiente';
  tiposAlmacenCompatibles: ('general' | 'evento' | 'consumibles' | 'equipo' | 'todos')[];
  categoria: 'basico' | 'avanzado' | 'especializado';
  dependencias?: string[];
}

const SUBMODULOS: SubmoduloConfig[] = [
  // BÁSICOS - Siempre visibles
  {
    id: 'productos',
    nombre: 'Productos',
    ruta: '/inventario/productos',
    icono: Package,
    descripcion: 'Catálogo de productos',
    descripcionDetallada: 'Gestión completa del catálogo de productos: alta, baja, modificación, categorías, precios, códigos de barras.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['todos'],
    categoria: 'basico'
  },
  {
    id: 'almacenes',
    nombre: 'Almacenes',
    ruta: '/inventario/almacenes',
    icono: Archive,
    descripcion: 'Gestión de almacenes',
    descripcionDetallada: 'Configuración de almacenes físicos, virtuales y de tránsito. Definición de tipos y características.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['todos'],
    categoria: 'basico'
  },
  {
    id: 'stock',
    nombre: 'Stock',
    ruta: '/inventario/stock',
    icono: BarChart3,
    descripcion: 'Niveles de inventario',
    descripcionDetallada: 'Visualización de existencias actuales por producto y almacén. Filtros por estado de stock.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['todos'],
    categoria: 'basico'
  },
  {
    id: 'movimientos',
    nombre: 'Movimientos',
    ruta: '/inventario/movimientos',
    icono: Truck,
    descripcion: 'Entradas y salidas',
    descripcionDetallada: 'Registro de movimientos de inventario: entradas por compra, salidas por venta, ajustes, devoluciones.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['todos'],
    categoria: 'basico'
  },
  
  // AVANZADOS
  {
    id: 'transferencias',
    nombre: 'Transferencias',
    ruta: '/inventario/transferencias',
    icono: Truck,
    descripcion: 'Movimientos entre almacenes',
    descripcionDetallada: 'Gestión de transferencias de stock entre almacenes. Estados: borrador, en tránsito, recibida. Requiere tabla de transferencias.',
    estadoImplementacion: 'parcial',
    tiposAlmacenCompatibles: ['general', 'evento', 'equipo'],
    categoria: 'avanzado',
    dependencias: ['almacenes', 'productos']
  },
  {
    id: 'kardex',
    nombre: 'Kardex',
    ruta: '/inventario/kardex',
    icono: FileText,
    descripcion: 'Historial de movimientos',
    descripcionDetallada: 'Vista detallada del histórico de movimientos por producto con saldo acumulado. Exportación a Excel/CSV.',
    estadoImplementacion: 'parcial',
    tiposAlmacenCompatibles: ['todos'],
    categoria: 'avanzado',
    dependencias: ['movimientos']
  },
  {
    id: 'valuacion',
    nombre: 'Valuación',
    ruta: '/inventario/valuacion',
    icono: DollarSign,
    descripcion: 'Valorización del inventario',
    descripcionDetallada: 'Reportes de valuación de inventario con métodos PEPS, UEPS, Promedio. Análisis ABC de productos.',
    estadoImplementacion: 'parcial',
    tiposAlmacenCompatibles: ['general', 'equipo'],
    categoria: 'avanzado',
    dependencias: ['productos', 'stock']
  },
  {
    id: 'reorden',
    nombre: 'Punto Reorden',
    ruta: '/inventario/reorden',
    icono: Bell,
    descripcion: 'Gestión de mínimos',
    descripcionDetallada: 'Identificación de productos bajo stock mínimo y generación automática de requisiciones de compra.',
    estadoImplementacion: 'parcial',
    tiposAlmacenCompatibles: ['general', 'consumibles'],
    categoria: 'avanzado',
    dependencias: ['productos', 'stock']
  },
  {
    id: 'ubicaciones',
    nombre: 'Ubicaciones',
    ruta: '/inventario/ubicaciones',
    icono: MapPin,
    descripcion: 'Ubicaciones físicas',
    descripcionDetallada: 'Gestión de ubicaciones dentro del almacén: pasillos, racks, niveles, bins. Mapeo físico del inventario.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['general', 'equipo'],
    categoria: 'avanzado'
  },
  {
    id: 'lotes',
    nombre: 'Lotes',
    ruta: '/inventario/lotes',
    icono: Tag,
    descripcion: 'Control de lotes y caducidad',
    descripcionDetallada: 'Trazabilidad por lote, fechas de caducidad, números de serie. FIFO/FEFO automático.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['general', 'consumibles'],
    categoria: 'avanzado'
  },
  {
    id: 'conteos',
    nombre: 'Conteos',
    ruta: '/inventario/conteos',
    icono: ClipboardCheck,
    descripcion: 'Inventario físico',
    descripcionDetallada: 'Conteos cíclicos y generales. Reconciliación de diferencias, ajustes automáticos, reportes de discrepancias.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['todos'],
    categoria: 'avanzado'
  },
  
  // ESPECIALIZADOS - Para eventos
  {
    id: 'reservas',
    nombre: 'Reservas',
    ruta: '/inventario/reservas',
    icono: Clock,
    descripcion: 'Reservas para eventos',
    descripcionDetallada: 'Sistema de reservas de stock para eventos futuros. Gestión de disponibilidad temporal.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['evento'],
    categoria: 'especializado'
  },
  {
    id: 'kits',
    nombre: 'Kits Evento',
    ruta: '/inventario/kits',
    icono: Package,
    descripcion: 'Kits de materiales',
    descripcionDetallada: 'Configuración de kits predefinidos para tipos de eventos. Armado y desarmado de kits.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['evento'],
    categoria: 'especializado'
  },
  {
    id: 'checklists',
    nombre: 'Checklists',
    ruta: '/inventario/checklists',
    icono: ClipboardCheck,
    descripcion: 'Pre/Post evento',
    descripcionDetallada: 'Checklists de verificación antes y después del evento. Fotos de daños, firmas digitales.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['evento'],
    categoria: 'especializado'
  },
  {
    id: 'alertas',
    nombre: 'Alertas',
    ruta: '/inventario/alertas',
    icono: AlertCircle,
    descripcion: 'Centro de alertas',
    descripcionDetallada: 'Notificaciones de stock bajo, lotes por vencer, conteos pendientes, reservas próximas.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['todos'],
    categoria: 'especializado'
  },
  
  // HERRAMIENTAS
  {
    id: 'documentos',
    nombre: 'Documentos',
    ruta: '/inventario/documentos',
    icono: FileText,
    descripcion: 'Documentos de inventario',
    descripcionDetallada: 'Generación de documentos: vales de entrada/salida, etiquetas, reportes imprimibles.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['todos'],
    categoria: 'basico'
  },
  {
    id: 'etiquetas',
    nombre: 'Etiquetas',
    ruta: '/inventario/etiquetas',
    icono: QrCode,
    descripcion: 'Códigos QR y etiquetas',
    descripcionDetallada: 'Diseño e impresión de etiquetas con código de barras/QR para productos y ubicaciones.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['todos'],
    categoria: 'basico'
  },
  {
    id: 'sesiones',
    nombre: 'Sesiones Móvil',
    ruta: '/inventario/sesiones',
    icono: Smartphone,
    descripcion: 'Control de acceso móvil',
    descripcionDetallada: 'Gestión de sesiones de dispositivos móviles para conteo y escaneo de inventario.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['todos'],
    categoria: 'basico'
  },
  {
    id: 'scanner',
    nombre: 'Scanner Móvil',
    ruta: '/inventario/mobile-scanner',
    icono: QrCode,
    descripcion: 'Escáner de códigos',
    descripcionDetallada: 'Aplicación web progresiva para escaneo de códigos QR y barras desde dispositivos móviles.',
    estadoImplementacion: 'completo',
    tiposAlmacenCompatibles: ['todos'],
    categoria: 'basico'
  }
];

// Componente de badge de estado
const EstadoBadge: React.FC<{ estado: SubmoduloConfig['estadoImplementacion'] }> = ({ estado }) => {
  const config = {
    completo: { color: 'bg-green-100 text-green-800', icon: CheckCircle, texto: 'Completo' },
    parcial: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, texto: 'Parcial' },
    pendiente: { color: 'bg-red-100 text-red-800', icon: Clock, texto: 'Pendiente' }
  };
  
  const { color, icon: Icon, texto } = config[estado];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {texto}
    </span>
  );
};

// Componente de card de submódulo
const SubmoduloCard: React.FC<{
  submodulo: SubmoduloConfig;
  habilitado: boolean;
  onToggle: () => void;
}> = ({ submodulo, habilitado, onToggle }) => {
  const [expandido, setExpandido] = useState(false);
  const Icon = submodulo.icono;
  
  return (
    <div className={`bg-white rounded-xl border-2 transition-all duration-200 ${
      habilitado ? 'border-blue-200 shadow-sm' : 'border-gray-100 opacity-70'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${habilitado ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Icon className={`w-5 h-5 ${habilitado ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-800">{submodulo.nombre}</h3>
                <EstadoBadge estado={submodulo.estadoImplementacion} />
              </div>
              <p className="text-sm text-gray-500 mt-1">{submodulo.descripcion}</p>
            </div>
          </div>
          
          <button
            onClick={onToggle}
            className={`p-2 rounded-lg transition-colors ${
              habilitado 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
            title={habilitado ? 'Deshabilitar' : 'Habilitar'}
          >
            {habilitado ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
        
        {/* Info expandible */}
        <button
          onClick={() => setExpandido(!expandido)}
          className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          <Info className="w-3 h-3" />
          {expandido ? 'Menos info' : 'Más info'}
        </button>
        
        {expandido && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
            <p className="text-gray-700">{submodulo.descripcionDetallada}</p>
            
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Compatible con:</span>
              {submodulo.tiposAlmacenCompatibles.map(tipo => (
                <span key={tipo} className="px-2 py-0.5 bg-gray-200 rounded text-xs text-gray-600">
                  {tipo === 'todos' ? 'Todos' : tipo}
                </span>
              ))}
            </div>
            
            {submodulo.dependencias && submodulo.dependencias.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">Requiere:</span>
                {submodulo.dependencias.map(dep => (
                  <span key={dep} className="px-2 py-0.5 bg-blue-100 rounded text-xs text-blue-600">
                    {dep}
                  </span>
                ))}
              </div>
            )}
            
            <div className="mt-2 text-xs text-gray-400">
              Ruta: <code className="bg-gray-200 px-1 rounded">{submodulo.ruta}</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente principal
const ConfiguracionInventarioPage: React.FC = () => {
  const [habilitados, setHabilitados] = useState<Set<string>>(new Set(
    SUBMODULOS.map(s => s.id) // Por defecto todos habilitados
  ));
  const [tipoAlmacen, setTipoAlmacen] = useState<'todos' | 'general' | 'evento' | 'consumibles' | 'equipo'>('todos');
  const [guardando, setGuardando] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<'todos' | 'basico' | 'avanzado' | 'especializado'>('todos');

  // Cargar configuración guardada
  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const { data: config } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'submodulos_inventario_habilitados')
        .single();
      
      if (config?.valor) {
        const modulosGuardados = JSON.parse(config.valor);
        setHabilitados(new Set(modulosGuardados));
      }
    } catch (e) {
      // Si no existe la configuración, usar valores por defecto
      console.log('Usando configuración por defecto');
    }
  };

  const guardarConfiguracion = async () => {
    setGuardando(true);
    try {
      const modulosArray = Array.from(habilitados);
      
      await supabase
        .from('configuracion_sistema')
        .upsert({
          clave: 'submodulos_inventario_habilitados',
          valor: JSON.stringify(modulosArray),
          descripcion: 'Submódulos de inventario habilitados',
          updated_at: new Date().toISOString()
        }, { onConflict: 'clave' });
      
      // Guardar en localStorage también para acceso inmediato
      localStorage.setItem('submodulos_inventario', JSON.stringify(modulosArray));
      
      alert('Configuración guardada correctamente');
    } catch (e) {
      console.error('Error al guardar:', e);
      alert('Error al guardar la configuración');
    } finally {
      setGuardando(false);
    }
  };

  const toggleSubmodulo = (id: string) => {
    const nuevosHabilitados = new Set(habilitados);
    if (nuevosHabilitados.has(id)) {
      nuevosHabilitados.delete(id);
    } else {
      nuevosHabilitados.add(id);
    }
    setHabilitados(nuevosHabilitados);
  };

  const habilitarPorTipo = (tipo: typeof tipoAlmacen) => {
    const nuevosHabilitados = new Set<string>();
    SUBMODULOS.forEach(s => {
      if (s.tiposAlmacenCompatibles.includes('todos') || s.tiposAlmacenCompatibles.includes(tipo as 'general' | 'evento' | 'consumibles' | 'equipo')) {
        nuevosHabilitados.add(s.id);
      }
    });
    setHabilitados(nuevosHabilitados);
    setTipoAlmacen(tipo);
  };

  const resetearConfiguracion = () => {
    if (confirm('¿Restablecer todos los submódulos como habilitados?')) {
      setHabilitados(new Set(SUBMODULOS.map(s => s.id)));
      setTipoAlmacen('todos');
    }
  };

  // Filtrar submódulos
  const submodulosFiltrados = SUBMODULOS.filter(s => {
    if (categoriaFiltro !== 'todos' && s.categoria !== categoriaFiltro) return false;
    if (tipoAlmacen !== 'todos' && !s.tiposAlmacenCompatibles.includes('todos') && !s.tiposAlmacenCompatibles.includes(tipoAlmacen as 'general' | 'evento' | 'consumibles' | 'equipo')) return false;
    return true;
  });

  const stats = {
    total: SUBMODULOS.length,
    habilitados: habilitados.size,
    completos: SUBMODULOS.filter(s => s.estadoImplementacion === 'completo').length,
    parciales: SUBMODULOS.filter(s => s.estadoImplementacion === 'parcial').length
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Settings className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Configuración de Inventario</h1>
            <p className="text-gray-500">Administra qué submódulos mostrar según el tipo de almacén</p>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Total Submódulos</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
          <p className="text-sm text-blue-600">Habilitados</p>
          <p className="text-2xl font-bold text-blue-600">{stats.habilitados}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200">
          <p className="text-sm text-green-600">Completos</p>
          <p className="text-2xl font-bold text-green-600">{stats.completos}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-200">
          <p className="text-sm text-yellow-600">Parciales</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.parciales}</p>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Filtro por tipo de almacén */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por tipo de almacén:
            </label>
            <div className="flex gap-2">
              {(['todos', 'general', 'evento', 'consumibles', 'equipo'] as const).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => habilitarPorTipo(tipo)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    tipoAlmacen === tipo
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tipo === 'todos' ? 'Todos' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro por categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría:
            </label>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value as typeof categoriaFiltro)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value="todos">Todas</option>
              <option value="basico">Básicos</option>
              <option value="avanzado">Avanzados</option>
              <option value="especializado">Especializados</option>
            </select>
          </div>

          {/* Acciones */}
          <div className="flex gap-2">
            <button
              onClick={resetearConfiguracion}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Resetear
            </button>
            <button
              onClick={guardarConfiguracion}
              disabled={guardando}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {/* Info sobre módulos parciales */}
      {stats.parciales > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Módulos con implementación parcial</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Los módulos marcados como "Parcial" funcionan pero pueden requerir configuración de base de datos adicional 
                (tablas o vistas). Se recomienda ejecutar las migraciones pendientes antes de habilitarlos.
              </p>
              <ul className="mt-2 text-sm text-yellow-600 list-disc list-inside">
                {SUBMODULOS.filter(s => s.estadoImplementacion === 'parcial').map(s => (
                  <li key={s.id}><strong>{s.nombre}</strong>: Requiere ejecutar migración 026</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Grid de submódulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {submodulosFiltrados.map(submodulo => (
          <SubmoduloCard
            key={submodulo.id}
            submodulo={submodulo}
            habilitado={habilitados.has(submodulo.id)}
            onToggle={() => toggleSubmodulo(submodulo.id)}
          />
        ))}
      </div>

      {/* Leyenda */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl">
        <h3 className="font-medium text-gray-700 mb-3">Leyenda de estados:</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <EstadoBadge estado="completo" />
            <span className="text-gray-600">Totalmente funcional</span>
          </div>
          <div className="flex items-center gap-2">
            <EstadoBadge estado="parcial" />
            <span className="text-gray-600">Funcional, puede requerir migración DB</span>
          </div>
          <div className="flex items-center gap-2">
            <EstadoBadge estado="pendiente" />
            <span className="text-gray-600">En desarrollo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionInventarioPage;
