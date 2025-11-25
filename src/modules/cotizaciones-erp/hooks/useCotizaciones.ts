/**
 * HOOKS DE COTIZACIONES
 * Hooks personalizados para gestión de cotizaciones
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import * as cotizacionesService from '../services/cotizacionesService';
import type { Cotizacion, PartidaCotizacion } from '../types';
import toast from 'react-hot-toast';

// ============================================================================
// COTIZACIONES
// ============================================================================

export const useCotizaciones = (filters?: {
  status?: string;
  cliente_id?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cotizaciones', user?.company_id, filters],
    queryFn: () => cotizacionesService.fetchCotizaciones(user!.company_id!, filters),
    enabled: !!user?.company_id,
    staleTime: 1000 * 30,
  });
};

export const useCotizacion = (id: number | null) => {
  return useQuery({
    queryKey: ['cotizacion', id],
    queryFn: () => cotizacionesService.fetchCotizacionById(id!),
    enabled: !!id,
  });
};

export const useGenerarFolio = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cotizacion-nuevo-folio', user?.company_id],
    queryFn: () => cotizacionesService.generarFolio(user!.company_id!),
    enabled: !!user?.company_id,
  });
};

export const useCreateCotizacion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      cotizacionData,
      partidas,
    }: {
      cotizacionData: Partial<Cotizacion>;
      partidas: Partial<PartidaCotizacion>[];
    }) =>
      cotizacionesService.createCotizacion(
        {
          ...cotizacionData,
          company_id: user?.company_id,
          elaborado_por: user?.id,
        },
        partidas
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['cotizacion-nuevo-folio'] });
      toast.success('Cotización creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear cotización: ${error.message}`);
    },
  });
};

export const useUpdateCotizacion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Cotizacion> }) =>
      cotizacionesService.updateCotizacion(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['cotizacion'] });
      toast.success('Cotización actualizada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar cotización: ${error.message}`);
    },
  });
};

export const useUpdatePartidas = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cotizacionId,
      partidas,
    }: {
      cotizacionId: number;
      partidas: Partial<PartidaCotizacion>[];
    }) => cotizacionesService.updatePartidas(cotizacionId, partidas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizacion'] });
      toast.success('Partidas actualizadas exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar partidas: ${error.message}`);
    },
  });
};

export const useEnviarCotizacion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cotizacionesService.enviarCotizacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['cotizacion'] });
      toast.success('Cotización enviada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al enviar cotización: ${error.message}`);
    },
  });
};

export const useAprobarCotizacion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: number) => cotizacionesService.aprobarCotizacion(id, user!.id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['cotizacion'] });
      toast.success('Cotización aprobada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al aprobar cotización: ${error.message}`);
    },
  });
};

export const useRechazarCotizacion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cotizacionesService.rechazarCotizacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['cotizacion'] });
      toast.success('Cotización rechazada');
    },
    onError: (error: Error) => {
      toast.error(`Error al rechazar cotización: ${error.message}`);
    },
  });
};

export const useConvertirCotizacionAEvento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cotizacionId, eventoId }: { cotizacionId: number; eventoId: number }) =>
      cotizacionesService.convertirCotizacionAEvento(cotizacionId, eventoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['cotizacion'] });
      toast.success('Cotización convertida a evento exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al convertir cotización: ${error.message}`);
    },
  });
};

export const useDuplicarCotizacion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: number) =>
      cotizacionesService.duplicarCotizacion(id, user!.id!, user!.company_id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['cotizacion-nuevo-folio'] });
      toast.success('Cotización duplicada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al duplicar cotización: ${error.message}`);
    },
  });
};

// ============================================================================
// UTILIDADES
// ============================================================================

export const useCalcularTotalesPartida = () => {
  return {
    calcular: cotizacionesService.calcularTotalesPartida,
  };
};

export const useCalcularTotalesCotizacion = () => {
  return {
    calcular: cotizacionesService.calcularTotalesCotizacion,
  };
};
