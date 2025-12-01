import { useState } from 'react';
import { supabase } from '../../../core/config/supabase';

export interface DataSeederHook {
  seedModule: (moduleId: string) => Promise<void>;
  seedAll: () => Promise<void>;
  clearAll: () => Promise<void>;
  getStats: () => Promise<Record<string, number>>;
}

export const useDataSeeder = (): DataSeederHook => {

  const seedModule = async (moduleId: string): Promise<void> => {
    try {
      // Llamar a la función SQL correspondiente según el módulo
      const { error } = await supabase.rpc(`seed_${moduleId}_data`);

      if (error) {
        throw new Error(`Error al poblar ${moduleId}: ${error.message}`);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Error desconocido al poblar datos');
    }
  };

  const seedAll = async (): Promise<void> => {
    // Orden de ejecución respetando dependencias
    const executionOrder = ['core', 'catalogos', 'clientes', 'eventos', 'finanzas', 'contabilidad', 'inventario', 'rrhh'];

    for (const moduleId of executionOrder) {
      await seedModule(moduleId);
    }
  };

  const clearAll = async (): Promise<void> => {
    try {
      const { error } = await supabase.rpc('clear_all_test_data');

      if (error) {
        throw new Error(`Error al limpiar datos: ${error.message}`);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Error desconocido al limpiar datos');
    }
  };

  const getStats = async (): Promise<Record<string, number>> => {
    try {
      // Obtener conteos de todas las tablas principales
      const stats: Record<string, number> = {};

      // Core
      const { count: companiesCount } = await supabase
        .from('companies_erp')
        .select('*', { count: 'exact', head: true });
      stats.core = companiesCount || 0;

      // Catálogos
      const { count: estadosCount } = await supabase
        .from('evt_estados_erp')
        .select('*', { count: 'exact', head: true });
      const { count: tiposCount } = await supabase
        .from('tipos_eventos_erp')
        .select('*', { count: 'exact', head: true });
      const { count: categoriasCount } = await supabase
        .from('evt_categorias_gastos_erp')
        .select('*', { count: 'exact', head: true });
      stats.catalogos = (estadosCount || 0) + (tiposCount || 0) + (categoriasCount || 0);

      // Clientes
      const { count: clientesCount } = await supabase
        .from('evt_clientes_erp')
        .select('*', { count: 'exact', head: true });
      stats.clientes = clientesCount || 0;

      // Eventos
      const { count: eventosCount } = await supabase
        .from('evt_eventos_erp')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);
      stats.eventos = eventosCount || 0;

      // Finanzas
      const { count: ingresosCount } = await supabase
        .from('evt_ingresos_erp')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);
      const { count: gastosCount } = await supabase
        .from('evt_gastos_erp')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);
      const { count: provisionesCount } = await supabase
        .from('provisiones_categoria_erp')
        .select('*', { count: 'exact', head: true });
      stats.finanzas = (ingresosCount || 0) + (gastosCount || 0) + (provisionesCount || 0);

      // Contabilidad
      const { count: cuentasCount } = await supabase
        .from('cuentas_contables_erp')
        .select('*', { count: 'exact', head: true });
      stats.contabilidad = cuentasCount || 0;

      // Inventario
      const { count: productosCount } = await supabase
        .from('productos_erp')
        .select('*', { count: 'exact', head: true });
      stats.inventario = productosCount || 0;

      // RRHH
      const { count: empleadosCount } = await supabase
        .from('empleados_erp')
        .select('*', { count: 'exact', head: true });
      stats.rrhh = empleadosCount || 0;

      return stats;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {};
    }
  };

  return {
    seedModule,
    seedAll,
    clearAll,
    getStats
  };
};
