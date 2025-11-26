import { supabase } from '../../../core/config/supabase';

// Tipos de catálogos disponibles en el sistema
export type CatalogoTipo =
  // Catálogos de Eventos
  | 'estados_workflow'
  | 'tipos_eventos'
  | 'categorias_gastos'
  | 'categorias_ingresos'
  | 'estados_ingreso'
  | 'roles_evento'
  // Catálogos Generales
  | 'departamentos'
  | 'cuentas_bancarias'
  | 'cuentas_contables'
  // Catálogos de Proyectos
  | 'tipos_proyecto'
  | 'estados_proyecto'
  | 'prioridades'
  | 'roles_proyecto'
  // Catálogos de Nómina
  | 'conceptos_nomina'
  | 'tipos_contrato'
  | 'puestos'
  // Catálogos de Inventario
  | 'categorias_producto'
  | 'unidades_medida'
  // Catálogos de Proveedores
  | 'categorias_proveedor'
  // Catálogos de Contabilidad (GNI)
  | 'ejecutivos'
  | 'proveedores_gni'
  | 'claves_gasto'
  | 'formas_pago';

export interface ItemCatalogo {
  id?: string;
  company_id?: string;
  nombre: string;
  descripcion: string;
  color: string;
  icono?: string;
  orden?: number;
  activo: boolean;
  // Campos específicos para ciertos catálogos
  codigo?: string;
  tipo?: string;
  valor?: number;
  es_deduccion?: boolean;
  naturaleza?: string;
  cuenta_padre_id?: string;
  banco?: string;
  numero_cuenta?: string;
  clabe?: string;
  created_at?: string;
  updated_at?: string;
}

// Información detallada de cada catálogo
export interface CatalogoInfo {
  tabla: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  campos: string[];
  camposRequeridos: string[];
}

// Mapeo de catálogos a tablas de Supabase con información detallada
const catalogoTableMap: Record<CatalogoTipo, string> = {
  // Catálogos de Eventos
  estados_workflow: 'cat_estados_workflow',
  tipos_eventos: 'evt_tipos_evento',
  categorias_gastos: 'evt_categorias_gastos',
  categorias_ingresos: 'evt_categorias_ingresos',
  estados_ingreso: 'evt_estados_ingreso',
  roles_evento: 'evt_roles',
  // Catálogos Generales
  departamentos: 'cat_departamentos',
  cuentas_bancarias: 'evt_cuentas_bancarias',
  cuentas_contables: 'evt_cuentas_contables',
  // Catálogos de Proyectos
  tipos_proyecto: 'prj_tipos_proyecto',
  estados_proyecto: 'prj_estados_proyecto',
  prioridades: 'prj_prioridades',
  roles_proyecto: 'prj_roles',
  // Catálogos de Nómina
  conceptos_nomina: 'nom_conceptos',
  tipos_contrato: 'nom_tipos_contrato',
  puestos: 'nom_puestos',
  // Catálogos de Inventario
  categorias_producto: 'inv_categorias_producto',
  unidades_medida: 'inv_unidades_medida',
  // Catálogos de Proveedores
  categorias_proveedor: 'prov_categorias',
  // Catálogos de Contabilidad (GNI)
  ejecutivos: 'cont_ejecutivos',
  proveedores_gni: 'cont_proveedores',
  claves_gasto: 'cont_claves_gasto',
  formas_pago: 'cont_formas_pago'
};

// Información detallada de cada catálogo para la UI
export const catalogosInfo: Record<CatalogoTipo, CatalogoInfo> = {
  estados_workflow: {
    tabla: 'cat_estados_workflow',
    nombre: 'Estados de Workflow',
    descripcion: 'Estados del flujo de trabajo de eventos',
    icono: '🔄',
    color: 'blue',
    campos: ['nombre', 'descripcion', 'color', 'icono', 'orden', 'activo'],
    camposRequeridos: ['nombre']
  },
  tipos_eventos: {
    tabla: 'evt_tipos_evento',
    nombre: 'Tipos de Eventos',
    descripcion: 'Categorías de eventos que se pueden gestionar',
    icono: '🎯',
    color: 'green',
    campos: ['nombre', 'descripcion', 'color', 'icono', 'activo'],
    camposRequeridos: ['nombre']
  },
  categorias_gastos: {
    tabla: 'evt_categorias_gastos',
    nombre: 'Categorías de Gastos',
    descripcion: 'Clasificación de gastos y costos',
    icono: '💸',
    color: 'red',
    campos: ['nombre', 'descripcion', 'color', 'icono', 'activo'],
    camposRequeridos: ['nombre']
  },
  categorias_ingresos: {
    tabla: 'evt_categorias_ingresos',
    nombre: 'Categorías de Ingresos',
    descripcion: 'Clasificación de tipos de ingresos',
    icono: '💰',
    color: 'emerald',
    campos: ['nombre', 'descripcion', 'color', 'icono', 'activo'],
    camposRequeridos: ['nombre']
  },
  estados_ingreso: {
    tabla: 'evt_estados_ingreso',
    nombre: 'Estados de Ingreso',
    descripcion: 'Estados de los ingresos (pendiente, pagado, etc.)',
    icono: '📋',
    color: 'amber',
    campos: ['nombre', 'descripcion', 'color', 'activo'],
    camposRequeridos: ['nombre']
  },
  roles_evento: {
    tabla: 'evt_roles',
    nombre: 'Roles de Evento',
    descripcion: 'Roles disponibles para participantes en eventos',
    icono: '👥',
    color: 'violet',
    campos: ['nombre', 'descripcion', 'activo'],
    camposRequeridos: ['nombre']
  },
  departamentos: {
    tabla: 'cat_departamentos',
    nombre: 'Departamentos',
    descripcion: 'Áreas organizacionales de la empresa',
    icono: '🏢',
    color: 'purple',
    campos: ['nombre', 'descripcion', 'color', 'activo'],
    camposRequeridos: ['nombre']
  },
  cuentas_bancarias: {
    tabla: 'evt_cuentas_bancarias',
    nombre: 'Cuentas Bancarias',
    descripcion: 'Cuentas bancarias para operaciones financieras',
    icono: '🏦',
    color: 'cyan',
    campos: ['nombre', 'banco', 'numero_cuenta', 'clabe', 'descripcion', 'activo'],
    camposRequeridos: ['nombre', 'banco']
  },
  cuentas_contables: {
    tabla: 'evt_cuentas_contables',
    nombre: 'Cuentas Contables',
    descripcion: 'Plan de cuentas contables',
    icono: '📊',
    color: 'indigo',
    campos: ['codigo', 'nombre', 'descripcion', 'naturaleza', 'activo'],
    camposRequeridos: ['codigo', 'nombre']
  },
  tipos_proyecto: {
    tabla: 'prj_tipos_proyecto',
    nombre: 'Tipos de Proyecto',
    descripcion: 'Clasificación de proyectos',
    icono: '📁',
    color: 'orange',
    campos: ['nombre', 'descripcion', 'color', 'icono', 'activo'],
    camposRequeridos: ['nombre']
  },
  estados_proyecto: {
    tabla: 'prj_estados_proyecto',
    nombre: 'Estados de Proyecto',
    descripcion: 'Estados del ciclo de vida de proyectos',
    icono: '📈',
    color: 'teal',
    campos: ['nombre', 'descripcion', 'color', 'orden', 'activo'],
    camposRequeridos: ['nombre']
  },
  prioridades: {
    tabla: 'prj_prioridades',
    nombre: 'Prioridades',
    descripcion: 'Niveles de prioridad para tareas y proyectos',
    icono: '🚨',
    color: 'rose',
    campos: ['nombre', 'descripcion', 'color', 'orden', 'activo'],
    camposRequeridos: ['nombre']
  },
  roles_proyecto: {
    tabla: 'prj_roles',
    nombre: 'Roles de Proyecto',
    descripcion: 'Roles para miembros de proyectos',
    icono: '👤',
    color: 'sky',
    campos: ['nombre', 'descripcion', 'activo'],
    camposRequeridos: ['nombre']
  },
  conceptos_nomina: {
    tabla: 'nom_conceptos',
    nombre: 'Conceptos de Nómina',
    descripcion: 'Percepciones y deducciones de nómina',
    icono: '💵',
    color: 'lime',
    campos: ['codigo', 'nombre', 'descripcion', 'tipo', 'es_deduccion', 'activo'],
    camposRequeridos: ['codigo', 'nombre']
  },
  tipos_contrato: {
    tabla: 'nom_tipos_contrato',
    nombre: 'Tipos de Contrato',
    descripcion: 'Tipos de contratos laborales',
    icono: '📝',
    color: 'slate',
    campos: ['nombre', 'descripcion', 'activo'],
    camposRequeridos: ['nombre']
  },
  puestos: {
    tabla: 'nom_puestos',
    nombre: 'Puestos',
    descripcion: 'Catálogo de puestos de trabajo',
    icono: '💼',
    color: 'zinc',
    campos: ['nombre', 'descripcion', 'activo'],
    camposRequeridos: ['nombre']
  },
  categorias_producto: {
    tabla: 'inv_categorias_producto',
    nombre: 'Categorías de Producto',
    descripcion: 'Clasificación de productos del inventario',
    icono: '📦',
    color: 'yellow',
    campos: ['nombre', 'descripcion', 'color', 'activo'],
    camposRequeridos: ['nombre']
  },
  unidades_medida: {
    tabla: 'inv_unidades_medida',
    nombre: 'Unidades de Medida',
    descripcion: 'Unidades para medir productos',
    icono: '📏',
    color: 'stone',
    campos: ['codigo', 'nombre', 'descripcion', 'activo'],
    camposRequeridos: ['codigo', 'nombre']
  },
  categorias_proveedor: {
    tabla: 'prov_categorias',
    nombre: 'Categorías de Proveedor',
    descripcion: 'Clasificación de proveedores',
    icono: '🏭',
    color: 'fuchsia',
    campos: ['nombre', 'descripcion', 'color', 'activo'],
    camposRequeridos: ['nombre']
  },
  // Catálogos de Contabilidad (GNI)
  ejecutivos: {
    tabla: 'cont_ejecutivos',
    nombre: 'Ejecutivos',
    descripcion: 'Empleados responsables de eventos, gastos e ingresos',
    icono: '👔',
    color: 'blue',
    campos: ['nombre', 'email', 'departamento', 'activo'],
    camposRequeridos: ['nombre']
  },
  proveedores_gni: {
    tabla: 'cont_proveedores',
    nombre: 'Proveedores GNI',
    descripcion: 'Proveedores de gastos no impactados',
    icono: '🏢',
    color: 'amber',
    campos: ['nombre', 'rfc', 'activo'],
    camposRequeridos: ['nombre']
  },
  claves_gasto: {
    tabla: 'cont_claves_gasto',
    nombre: 'Claves de Gasto',
    descripcion: 'Claves contables para clasificación de gastos',
    icono: '🔑',
    color: 'emerald',
    campos: ['codigo', 'nombre', 'cuenta', 'subcuenta', 'activo'],
    camposRequeridos: ['nombre']
  },
  formas_pago: {
    tabla: 'cont_formas_pago',
    nombre: 'Formas de Pago',
    descripcion: 'Métodos de pago disponibles',
    icono: '💳',
    color: 'violet',
    campos: ['nombre', 'tipo', 'activo'],
    camposRequeridos: ['nombre']
  }
};

// Obtener lista de todos los tipos de catálogos
export const getAllCatalogoTypes = (): CatalogoTipo[] => {
  return Object.keys(catalogoTableMap) as CatalogoTipo[];
};

// Agrupar catálogos por módulo para la UI
export const catalogosPorModulo = {
  eventos: ['estados_workflow', 'tipos_eventos', 'categorias_gastos', 'categorias_ingresos', 'estados_ingreso', 'roles_evento'] as CatalogoTipo[],
  general: ['departamentos', 'cuentas_bancarias', 'cuentas_contables'] as CatalogoTipo[],
  proyectos: ['tipos_proyecto', 'estados_proyecto', 'prioridades', 'roles_proyecto'] as CatalogoTipo[],
  nomina: ['conceptos_nomina', 'tipos_contrato', 'puestos'] as CatalogoTipo[],
  inventario: ['categorias_producto', 'unidades_medida'] as CatalogoTipo[],
  proveedores: ['categorias_proveedor'] as CatalogoTipo[],
  contabilidad: ['ejecutivos', 'proveedores_gni', 'claves_gasto', 'formas_pago'] as CatalogoTipo[]
};

export const catalogosService = {
  // Obtener todos los items de un catálogo
  async getAll(catalogo: CatalogoTipo): Promise<ItemCatalogo[]> {
    const tableName = catalogoTableMap[catalogo];

    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('orden', { ascending: true, nullsFirst: false })
        .order('nombre', { ascending: true });

      if (error) {
        console.error(`Error fetching ${catalogo}:`, error);
        // Si la tabla no existe, retornar array vacío
        if (error.code === '42P01') {
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error(`Error in getAll for ${catalogo}:`, error);
      return [];
    }
  },

  // Obtener un item por ID
  async getById(catalogo: CatalogoTipo, id: string): Promise<ItemCatalogo | null> {
    const tableName = catalogoTableMap[catalogo];

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching ${catalogo} item:`, error);
      throw error;
    }

    return data;
  },

  // Crear nuevo item
  async create(catalogo: CatalogoTipo, item: Omit<ItemCatalogo, 'id' | 'created_at' | 'updated_at'>): Promise<ItemCatalogo> {
    const tableName = catalogoTableMap[catalogo];

    const { data, error } = await supabase
      .from(tableName)
      .insert([{
        ...item,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error(`Error creating ${catalogo} item:`, error);
      throw error;
    }

    return data;
  },

  // Actualizar item existente
  async update(catalogo: CatalogoTipo, id: string, item: Partial<ItemCatalogo>): Promise<ItemCatalogo> {
    const tableName = catalogoTableMap[catalogo];

    const { data, error } = await supabase
      .from(tableName)
      .update({
        ...item,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${catalogo} item:`, error);
      throw error;
    }

    return data;
  },

  // Eliminar item
  async delete(catalogo: CatalogoTipo, id: string): Promise<void> {
    const tableName = catalogoTableMap[catalogo];

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting ${catalogo} item:`, error);
      throw error;
    }
  },

  // Alternar estado activo
  async toggleActive(catalogo: CatalogoTipo, id: string, currentActive: boolean): Promise<ItemCatalogo> {
    return this.update(catalogo, id, { activo: !currentActive });
  },

  // Reordenar items
  async reorder(catalogo: CatalogoTipo, items: { id: string; orden: number }[]): Promise<void> {
    const tableName = catalogoTableMap[catalogo];

    // Actualizar cada item con su nuevo orden
    const promises = items.map(({ id, orden }) =>
      supabase
        .from(tableName)
        .update({ orden, updated_at: new Date().toISOString() })
        .eq('id', id)
    );

    const results = await Promise.all(promises);

    const errors = results.filter((r: { error: unknown }) => r.error);
    if (errors.length > 0) {
      console.error('Errors during reorder:', errors);
      throw new Error('Error al reordenar elementos');
    }
  },

  // Contar items por catálogo
  async count(catalogo: CatalogoTipo): Promise<number> {
    const tableName = catalogoTableMap[catalogo];

    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01') return 0;
        throw error;
      }

      return count || 0;
    } catch {
      return 0;
    }
  },

  // Obtener conteo de todos los catálogos
  async getAllCounts(): Promise<Partial<Record<CatalogoTipo, number>>> {
    const catalogos = getAllCatalogoTypes();

    const counts = await Promise.all(
      catalogos.map(async (catalogo) => ({
        catalogo,
        count: await this.count(catalogo)
      }))
    );

    return counts.reduce((acc, { catalogo, count }) => {
      acc[catalogo] = count;
      return acc;
    }, {} as Partial<Record<CatalogoTipo, number>>);
  },

  // Obtener información de un catálogo
  getInfo(catalogo: CatalogoTipo): CatalogoInfo {
    return catalogosInfo[catalogo];
  },

  // Verificar si una tabla de catálogo existe
  async tableExists(catalogo: CatalogoTipo): Promise<boolean> {
    const tableName = catalogoTableMap[catalogo];
    try {
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);
      return !error || error.code !== '42P01';
    } catch {
      return false;
    }
  }
};

export default catalogosService;
