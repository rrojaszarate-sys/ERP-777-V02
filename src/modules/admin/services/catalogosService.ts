import { supabase } from '../../../core/config/supabase';

export type CatalogoTipo = 'estados_workflow' | 'tipos_eventos' | 'categorias_gastos' | 'departamentos';

export interface ItemCatalogo {
  id?: string;
  company_id?: string;
  nombre: string;
  descripcion: string;
  color: string;
  icono?: string;
  orden?: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

// Mapeo de catálogos a tablas de Supabase
const catalogoTableMap: Record<CatalogoTipo, string> = {
  estados_workflow: 'cat_estados_workflow',
  tipos_eventos: 'evt_tipos_evento',
  categorias_gastos: 'evt_categorias_gastos',
  departamentos: 'cat_departamentos'
};

// Verificar si la tabla existe, si no usar la alternativa
const getTableName = async (catalogo: CatalogoTipo): Promise<string> => {
  const primaryTable = catalogoTableMap[catalogo];

  // Intentar verificar si la tabla existe
  const { error } = await supabase
    .from(primaryTable)
    .select('id')
    .limit(1);

  // Si no hay error, la tabla existe
  if (!error) {
    return primaryTable;
  }

  // Fallback para tablas que podrían no existir aún
  console.warn(`Tabla ${primaryTable} no encontrada, usando fallback`);
  return primaryTable;
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

    const errors = results.filter(r => r.error);
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
  async getAllCounts(): Promise<Record<CatalogoTipo, number>> {
    const catalogos: CatalogoTipo[] = ['estados_workflow', 'tipos_eventos', 'categorias_gastos', 'departamentos'];

    const counts = await Promise.all(
      catalogos.map(async (catalogo) => ({
        catalogo,
        count: await this.count(catalogo)
      }))
    );

    return counts.reduce((acc, { catalogo, count }) => {
      acc[catalogo] = count;
      return acc;
    }, {} as Record<CatalogoTipo, number>);
  }
};

export default catalogosService;
