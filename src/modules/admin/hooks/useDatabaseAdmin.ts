import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';
import { dataGeneratorService } from '../services/dataGeneratorService';
import { auditService } from '../../../services/auditService';

interface DatabaseStats {
  clientes: number;
  eventos: number;
  gastos: number;
  ingresos: number;
  lastUpdated: string;
}

export const useDatabaseStats = () => {
  return useQuery({
    queryKey: ['database-stats'],
    queryFn: async (): Promise<DatabaseStats> => {
      try {
        const [clientesResult, eventosResult, gastosResult, ingresosResult] = await Promise.all([
          supabase.from('evt_clientes').select('*', { count: 'exact', head: true }),
          supabase.from('evt_eventos').select('*', { count: 'exact', head: true }),
          supabase.from('evt_gastos').select('*', { count: 'exact', head: true }),
          supabase.from('evt_ingresos').select('*', { count: 'exact', head: true })
        ]);

        return {
          clientes: clientesResult.count || 0,
          eventos: eventosResult.count || 0,
          gastos: gastosResult.count || 0,
          ingresos: ingresosResult.count || 0,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        console.error('Error fetching database stats:', error);
        return {
          clientes: 0,
          eventos: 0,
          gastos: 0,
          ingresos: 0,
          lastUpdated: new Date().toISOString()
        };
      }
    },
    refetchInterval: 30000,
    retry: 2
  });
};

export const useClearDatabase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (onProgress?: (progress: number, message: string) => void) => {
      try {
        onProgress?.(10, 'Iniciando limpieza...');
        
        // Clear data using the service
        await dataGeneratorService.clearAllData();
        
        onProgress?.(100, 'Base de datos limpiada exitosamente');
        
        return true;
      } catch (error) {
        console.error('Clear database error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['database-stats'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    }
  });
};

export const useGenerateTestData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      numClients = 10, 
      onProgress 
    }: { 
      numClients?: number; 
      onProgress?: (progress: number, message: string) => void 
    }) => {
      try {
        // Validate input
        if (numClients < 1 || numClients > 1000) {
          throw new Error('El número de clientes debe estar entre 1 y 1000');
        }

        onProgress?.(5, 'Preparando datos de referencia...');
        
        // Ensure reference data exists
        const referenceData = await dataGeneratorService.ensureReferenceData();
        
        onProgress?.(10, `Generando ${numClients} clientes...`);
        
        // Generate and insert clients
        const clientes = dataGeneratorService.generateClientes(numClients, referenceData.companyId, referenceData.createdByUserId);
        const clientesInsertados = await dataGeneratorService.batchInsert(
          'evt_clientes',
          clientes,
          25,
          (current, total) => {
            const progress = 10 + (current / total) * 20;
            onProgress?.(progress, `Clientes: ${current}/${total}`);
          }
        );

        onProgress?.(30, 'Obteniendo IDs de clientes creados...');
        
        // Get created client IDs
        const { data: clientesCreados } = await supabase
          .from('evt_clientes')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(clientesInsertados);

        onProgress?.(35, 'Generando eventos (5 por cliente)...');
        
        // Generate events for each client (5 events per client)
        let totalEventos = 0;
        const eventsPerClient = 5;
        
        for (let i = 0; i < (clientesCreados?.length || 0); i++) {
          const cliente = clientesCreados![i];
          const eventos = dataGeneratorService.generateEventos(eventsPerClient, cliente.id, referenceData);
          
          const eventosInsertados = await dataGeneratorService.batchInsert(
            'evt_eventos',
            eventos,
            25,
            (current, total) => {
              const clientProgress = (i + 1) / (clientesCreados?.length || 1);
              const progress = 35 + clientProgress * 25;
              onProgress?.(progress, `Eventos: Cliente ${i + 1}/${clientesCreados?.length} - ${current}/${total}`);
            }
          );
          
          totalEventos += eventosInsertados;
        }

        onProgress?.(60, 'Obteniendo IDs de eventos creados...');
        
        // Get created event IDs
        const { data: eventosCreados } = await supabase
          .from('evt_eventos')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(totalEventos);

        onProgress?.(65, 'Generando gastos (5 por evento)...');
        
        // Generate expenses for each event (5 expenses per event)
        let totalGastos = 0;
        const expensesPerEvent = 5;
        
        for (let i = 0; i < (eventosCreados?.length || 0); i++) {
          const evento = eventosCreados![i];
          const gastos = dataGeneratorService.generateGastos(expensesPerEvent, evento.id, referenceData.categorias);
          
          const gastosInsertados = await dataGeneratorService.batchInsert(
            'evt_gastos',
            gastos,
            50,
            (current, total) => {
              const eventProgress = (i + 1) / (eventosCreados?.length || 1);
              const progress = 65 + eventProgress * 20;
              onProgress?.(progress, `Gastos: Evento ${i + 1}/${eventosCreados?.length} - ${current}/${total}`);
            }
          );
          
          totalGastos += gastosInsertados;
        }

        onProgress?.(85, 'Generando ingresos (2 por evento)...');
        
        // Generate incomes for each event (2 incomes per event)
        let totalIngresos = 0;
        const incomesPerEvent = 2;
        
        for (let i = 0; i < (eventosCreados?.length || 0); i++) {
          const evento = eventosCreados![i];
          const ingresos = dataGeneratorService.generateIngresos(incomesPerEvent, evento.id);
          
          const ingresosInsertados = await dataGeneratorService.batchInsert(
            'evt_ingresos',
            ingresos,
            50,
            (current, total) => {
              const eventProgress = (i + 1) / (eventosCreados?.length || 1);
              const progress = 85 + eventProgress * 15;
              onProgress?.(progress, `Ingresos: Evento ${i + 1}/${eventosCreados?.length} - ${current}/${total}`);
            }
          );
          
          totalIngresos += ingresosInsertados;
        }

        onProgress?.(100, 'Generación completada exitosamente');

        // Log the operation
        await auditService.logAction(
          'system',
          referenceData.createdByUserId || 'system',
          'test_data_generated',
          null,
          { 
            clientes: clientesInsertados,
            eventos: totalEventos,
            gastos: totalGastos,
            ingresos: totalIngresos,
            timestamp: new Date().toISOString()
          }
        );

        return {
          clientes: clientesInsertados,
          eventos: totalEventos,
          gastos: totalGastos,
          ingresos: totalIngresos
        };
      } catch (error) {
        console.error('Generate test data error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['database-stats'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    }
  });
};