// ============================================
// HOOKS DE REACT QUERY PARA PROYECTOS
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthProvider';
import { proyectosService } from '../services/proyectosService';
import toast from 'react-hot-toast';
import type {
  Proyecto,
  Tarea,
  MiembroEquipo,
  FiltrosProyecto,
  FiltrosTarea
} from '../types';

// ============================================
// HOOKS DE PROYECTOS
// ============================================

export const useProyectos = (filters?: FiltrosProyecto) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['proyectos', user?.company_id, filters],
    queryFn: () => proyectosService.fetchProyectos(user!.company_id!, filters),
    enabled: !!user?.company_id
  });
};

export const useProyecto = (id: number) => {
  return useQuery({
    queryKey: ['proyecto', id],
    queryFn: () => proyectosService.fetchProyectoById(id),
    enabled: !!id
  });
};

export const useCreateProyecto = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (proyecto: Partial<Proyecto>) =>
      proyectosService.createProyecto({ ...proyecto, company_id: user!.company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Proyecto creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear proyecto');
    }
  });
};

export const useUpdateProyecto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, proyecto }: { id: number; proyecto: Partial<Proyecto> }) =>
      proyectosService.updateProyecto(id, proyecto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Proyecto actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar proyecto');
    }
  });
};

export const useDeleteProyecto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => proyectosService.deleteProyecto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Proyecto eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar proyecto');
    }
  });
};

// ============================================
// HOOKS DE TAREAS
// ============================================

export const useTareas = (filters?: FiltrosTarea) => {
  return useQuery({
    queryKey: ['tareas', filters],
    queryFn: () => proyectosService.fetchTareas(filters),
    enabled: true
  });
};

export const useTarea = (id: number) => {
  return useQuery({
    queryKey: ['tarea', id],
    queryFn: () => proyectosService.fetchTareaById(id),
    enabled: !!id
  });
};

export const useCreateTarea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tarea: Partial<Tarea>) => proyectosService.createTarea(tarea),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Tarea creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear tarea');
    }
  });
};

export const useUpdateTarea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, tarea }: { id: number; tarea: Partial<Tarea> }) =>
      proyectosService.updateTarea(id, tarea),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Tarea actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar tarea');
    }
  });
};

export const useDeleteTarea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => proyectosService.deleteTarea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Tarea eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar tarea');
    }
  });
};

// ============================================
// HOOKS DE EQUIPO
// ============================================

export const useMiembrosEquipo = (proyectoId: number) => {
  return useQuery({
    queryKey: ['miembros-equipo', proyectoId],
    queryFn: () => proyectosService.fetchMiembrosEquipo(proyectoId),
    enabled: !!proyectoId
  });
};

export const useAddMiembroEquipo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (miembro: Partial<MiembroEquipo>) =>
      proyectosService.addMiembroEquipo(miembro),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miembros-equipo'] });
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
    mutationFn: (id: number) => proyectosService.removeMiembroEquipo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miembros-equipo'] });
      toast.success('Miembro removido del equipo');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al remover miembro');
    }
  });
};

// ============================================
// HOOKS DE MÉTRICAS
// ============================================

export const useMetricasProyectos = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['metricas-proyectos', user?.company_id],
    queryFn: () => proyectosService.fetchMetricasProyectos(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useCalcularProgreso = (proyectoId: number) => {
  return useQuery({
    queryKey: ['progreso-proyecto', proyectoId],
    queryFn: () => proyectosService.calcularProgresoproyecto(proyectoId),
    enabled: !!proyectoId
  });
};

// ============================================
// HOOKS DE ETAPAS (KANBAN)
// ============================================

export const useEtapasProyecto = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['etapas-proyecto', user?.company_id],
    queryFn: () => proyectosService.fetchEtapasProyecto(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useEtapasTarea = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['etapas-tarea', user?.company_id],
    queryFn: () => proyectosService.fetchEtapasTarea(user!.company_id!),
    enabled: !!user?.company_id
  });
};

export const useUpdateTareaEtapa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tareaId, etapaId }: { tareaId: number; etapaId: number }) =>
      proyectosService.updateTareaEtapa(tareaId, etapaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar etapa de tarea');
    }
  });
};

// ============================================
// HOOKS DE MILESTONES (HITOS)
// ============================================

export const useMilestones = (proyectoId?: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['milestones', user?.company_id, proyectoId],
    queryFn: () => proyectosService.fetchMilestones(user!.company_id!, proyectoId),
    enabled: !!user?.company_id
  });
};

export const useCreateMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (milestone: any) => proyectosService.createMilestone(milestone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Hito creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear hito');
    }
  });
};

export const useUpdateMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      proyectosService.updateMilestone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Hito actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar hito');
    }
  });
};

export const useDeleteMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => proyectosService.deleteMilestone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Hito eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar hito');
    }
  });
};

export const useCompleteMilestone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => proyectosService.completeMilestone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast.success('Hito marcado como completado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al completar hito');
    }
  });
};

// ============================================
// HOOKS DE TIMESHEET (REGISTROS DE TIEMPO)
// ============================================

export const useRegistrosTiempo = (filters?: any) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['registros-tiempo', user?.company_id, filters],
    queryFn: () => proyectosService.fetchRegistrosTiempo(user!.company_id!, filters),
    enabled: !!user?.company_id
  });
};

export const useCreateRegistroTiempo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (registro: any) => proyectosService.createRegistroTiempo(registro),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-tiempo'] });
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      toast.success('Registro de tiempo creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear registro');
    }
  });
};

export const useUpdateRegistroTiempo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      proyectosService.updateRegistroTiempo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-tiempo'] });
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      toast.success('Registro de tiempo actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar registro');
    }
  });
};

export const useDeleteRegistroTiempo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => proyectosService.deleteRegistroTiempo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-tiempo'] });
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      toast.success('Registro de tiempo eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar registro');
    }
  });
};

export const useApproveRegistroTiempo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => proyectosService.approveRegistroTiempo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-tiempo'] });
      toast.success('Registro de tiempo aprobado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al aprobar registro');
    }
  });
};
