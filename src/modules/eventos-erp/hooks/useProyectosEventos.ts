// ============================================
// HOOKS DE PROYECTOS PARA EVENTOS-ERP
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import { proyectosEventosService } from '../services/proyectosEventosService';
import toast from 'react-hot-toast';
import type {
  Proyecto,
  Tarea,
  MiembroEquipo,
  Hito,
  DocumentoProyecto,
  FiltrosProyecto,
  FiltrosTarea
} from '../types/Proyecto';

// ============================================
// HOOKS DE PROYECTOS
// ============================================

export const useProyectosEventos = (filtros?: FiltrosProyecto) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['proyectos-eventos-erp', user?.company_id, filtros],
    queryFn: () => proyectosEventosService.fetchProyectos(user!.company_id!, filtros),
    enabled: !!user?.company_id
  });
};

export const useProyectoEvento = (id: number) => {
  return useQuery({
    queryKey: ['proyecto-evento-erp', id],
    queryFn: () => proyectosEventosService.fetchProyectoById(id),
    enabled: !!id
  });
};

export const useProyectosPorEvento = (eventoId: number) => {
  return useQuery({
    queryKey: ['proyectos-por-evento-erp', eventoId],
    queryFn: () => proyectosEventosService.fetchProyectosPorEvento(eventoId),
    enabled: !!eventoId
  });
};

export const useCreateProyectoEvento = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (proyecto: Partial<Proyecto>) =>
      proyectosEventosService.createProyecto({ ...proyecto, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyectos-eventos-erp'] });
      queryClient.invalidateQueries({ queryKey: ['metricas-proyectos-eventos'] });
      toast.success('Proyecto creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear proyecto');
    }
  });
};

export const useUpdateProyectoEvento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, proyecto }: { id: number; proyecto: Partial<Proyecto> }) =>
      proyectosEventosService.updateProyecto(id, proyecto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyectos-eventos-erp'] });
      queryClient.invalidateQueries({ queryKey: ['proyecto-evento-erp'] });
      queryClient.invalidateQueries({ queryKey: ['metricas-proyectos-eventos'] });
      toast.success('Proyecto actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar proyecto');
    }
  });
};

export const useDeleteProyectoEvento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => proyectosEventosService.deleteProyecto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyectos-eventos-erp'] });
      toast.success('Proyecto eliminado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar proyecto');
    }
  });
};

// ============================================
// HOOKS DE TAREAS
// ============================================

export const useTareasEventos = (filtros?: FiltrosTarea) => {
  return useQuery({
    queryKey: ['tareas-eventos-erp', filtros],
    queryFn: () => proyectosEventosService.fetchTareas(filtros),
    enabled: true
  });
};

export const useTareaEvento = (id: number) => {
  return useQuery({
    queryKey: ['tarea-evento-erp', id],
    queryFn: () => proyectosEventosService.fetchTareaById(id),
    enabled: !!id
  });
};

export const useCreateTareaEvento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tarea: Partial<Tarea>) => proyectosEventosService.createTarea(tarea),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas-eventos-erp'] });
      queryClient.invalidateQueries({ queryKey: ['proyecto-evento-erp'] });
      queryClient.invalidateQueries({ queryKey: ['metricas-proyectos-eventos'] });
      toast.success('Tarea creada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear tarea');
    }
  });
};

export const useUpdateTareaEvento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, tarea }: { id: number; tarea: Partial<Tarea> }) =>
      proyectosEventosService.updateTarea(id, tarea),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas-eventos-erp'] });
      queryClient.invalidateQueries({ queryKey: ['tarea-evento-erp'] });
      queryClient.invalidateQueries({ queryKey: ['proyecto-evento-erp'] });
      toast.success('Tarea actualizada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar tarea');
    }
  });
};

export const useDeleteTareaEvento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => proyectosEventosService.deleteTarea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas-eventos-erp'] });
      queryClient.invalidateQueries({ queryKey: ['proyecto-evento-erp'] });
      toast.success('Tarea eliminada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar tarea');
    }
  });
};

// ============================================
// HOOKS DE EQUIPO
// ============================================

export const useEquipoProyecto = (proyectoId: number) => {
  return useQuery({
    queryKey: ['equipo-proyecto-erp', proyectoId],
    queryFn: () => proyectosEventosService.fetchEquipo(proyectoId),
    enabled: !!proyectoId
  });
};

export const useAddMiembroEquipo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (miembro: Partial<MiembroEquipo>) =>
      proyectosEventosService.addMiembroEquipo(miembro),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipo-proyecto-erp'] });
      queryClient.invalidateQueries({ queryKey: ['proyecto-evento-erp'] });
      toast.success('Miembro agregado al equipo');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al agregar miembro');
    }
  });
};

export const useRemoveMiembroEquipo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => proyectosEventosService.removeMiembroEquipo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipo-proyecto-erp'] });
      queryClient.invalidateQueries({ queryKey: ['proyecto-evento-erp'] });
      toast.success('Miembro removido del equipo');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al remover miembro');
    }
  });
};

// ============================================
// HOOKS DE HITOS
// ============================================

export const useHitosProyecto = (proyectoId: number) => {
  return useQuery({
    queryKey: ['hitos-proyecto-erp', proyectoId],
    queryFn: () => proyectosEventosService.fetchHitos(proyectoId),
    enabled: !!proyectoId
  });
};

export const useCreateHito = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (hito: Partial<Hito>) => proyectosEventosService.createHito(hito),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hitos-proyecto-erp'] });
      toast.success('Hito creado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear hito');
    }
  });
};

export const useMarcarHitoCompletado = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => proyectosEventosService.marcarHitoCompletado(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hitos-proyecto-erp'] });
      toast.success('Hito marcado como completado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al completar hito');
    }
  });
};

// ============================================
// HOOKS DE DOCUMENTOS
// ============================================

export const useDocumentosProyecto = (proyectoId: number) => {
  return useQuery({
    queryKey: ['documentos-proyecto-erp', proyectoId],
    queryFn: () => proyectosEventosService.fetchDocumentos(proyectoId),
    enabled: !!proyectoId
  });
};

export const useUploadDocumentoProyecto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documento: Partial<DocumentoProyecto>) =>
      proyectosEventosService.uploadDocumento(documento),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-proyecto-erp'] });
      toast.success('Documento cargado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cargar documento');
    }
  });
};

// ============================================
// HOOKS DE MÉTRICAS
// ============================================

export const useMetricasProyectosEventos = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['metricas-proyectos-eventos', user?.company_id],
    queryFn: () => proyectosEventosService.fetchMetricasProyectos(user!.company_id!),
    enabled: !!user?.company_id
  });
};
