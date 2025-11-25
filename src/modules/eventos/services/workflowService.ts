import { supabase } from '../../../core/config/supabase';
import { Database } from '../../../core/types/database';
import { auditService } from '../../../services/auditService';
import { workflowLogger } from '../../../core/utils/logger';

// Definir tipos basados en database.ts para mayor seguridad de tipos
type Evento = Database['public']['Tables']['evt_eventos']['Row'];
type Estado = Database['public']['Tables']['evt_estados']['Row'];

// Definición explícita del tipo para un estado cuando se selecciona un subconjunto de columnas
interface EstadoInfo {
  id: number;
  nombre: string;
  orden: number;
}

export class WorkflowService {
  private static instance: WorkflowService;

  private constructor() {}

  public static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  /**
   * Cambia el estado de un evento con validación y registro de auditoría
   */
  async changeEventState(
    eventId: number,
    newStateId: number,
    userId: string,
    validationData?: {
      notes?: string;
      transition_date?: string;
      [key: string]: any;
    }
  ): Promise<void> {
    // Obtener el estado actual del evento
    const { data: currentEvent, error: eventError } = await supabase
      .from('evt_eventos')
      .select('estado_id, nombre_proyecto')
      .eq('id', eventId)
      .single<{ estado_id: number; nombre_proyecto: string }>();

    if (eventError || !currentEvent) throw eventError || new Error('Evento no encontrado');

    // Obtener información del estado
    const { data: newState, error: stateError } = await supabase
      .from('evt_estados')
      .select('*')
      .eq('id', newStateId)
      .single<Estado>();

    if (stateError || !newState) throw stateError || new Error('Estado no encontrado');

    // Verificar si el usuario existe en core_users
    const { data: userExists } = await supabase
      .from('core_users')
      .select('id')
      .eq('id', userId)
      .single();

    // Actualizar estado del evento
    const updateData: any = { estado_id: newStateId };

    // Solo agregar updated_by si el usuario existe en core_users
    if (userExists) {
      updateData.updated_by = userId;
      workflowLogger.info(`Usuario ${userId} existe en core_users, se actualizará updated_by`);
    } else {
      workflowLogger.warn(`Usuario ${userId} NO existe en core_users, se omitirá updated_by`);
    }

    const { error: updateError } = await supabase
      .from('evt_eventos')
      .update(updateData)
      .eq('id', eventId);

    if (updateError) throw updateError;

    // Registrar el cambio de estado
    await auditService.logAction(
      String(eventId),
      userId,
      'estado_cambiado',
      { 
        estado_anterior_id: currentEvent.estado_id,
        evento_nombre: currentEvent.nombre_proyecto,
      },
      { 
        estado_nuevo_id: newStateId,
        estado_nombre: newState.nombre,
        notas: validationData?.notes,
        fecha_transicion: validationData?.transition_date || new Date().toISOString(),
      }
    );

    workflowLogger.info(`Estado del evento ${eventId} cambiado a: ${newState.nombre}`);
  }

  /**
   * Avanza automáticamente el estado del evento basado en la subida de un nuevo documento.
   */
  async advanceStateOnDocumentUpload(
    eventId: number,
    fileName: string,
    userId: string
  ): Promise<{ success: boolean; message: string; newState?: string }> {
    workflowLogger.info(`Iniciando avance de estado para evento ${eventId}, tipo documento: ${fileName}`);

    const lowerCaseFileName = fileName.toLowerCase();

    // 1. Definir el mapeo de palabras clave a nombres de estado (usando los nombres correctos de la BD)
    const documentToStateMap: Record<string, string> = {
      'contrato': 'Acuerdo',
      'orden_compra': 'Orden de Compra',
      'cierre_evento': 'Finalizado',
    };

    let targetStateName: string | null = null;
    // El 'fileName' que recibimos aquí es en realidad el 'tipo' del documento,
    // como 'contrato', 'orden_compra', etc.
    // La lógica de extracción de palabras clave se simplifica.
    for (const keyword in documentToStateMap) {
      if (lowerCaseFileName.includes(keyword)) {
        targetStateName = documentToStateMap[keyword];
        break;
      }
    }

    if (!targetStateName) {
      workflowLogger.info(`No se encontró mapeo para el documento tipo: ${fileName}`);
      return { success: false, message: 'El documento no provocó un cambio de estado automático.' };
    }

    workflowLogger.info(`Estado objetivo identificado: ${targetStateName}`);

    try {
      // 2. Obtener el ID del estado objetivo
      const { data: targetState, error: stateError } = await supabase
        .from('evt_estados')
        .select('id, nombre, orden')
        .eq('nombre', targetStateName)
        .single<Pick<Estado, 'id' | 'nombre' | 'orden'>>();

      if (stateError || !targetState) {
        workflowLogger.error(`Error o estado no encontrado para '${targetStateName}'`, stateError);
        return { success: false, message: `El estado objetivo '${targetStateName}' no se encontró en la base de datos.` };
      }

      // 3. Obtener el estado actual del evento
      workflowLogger.info(`Consultando evento ID: ${eventId}`);
      const { data: currentEvent, error: eventError } = await supabase
        .from('evt_eventos')
        .select('estado_id')
        .eq('id', eventId)
        .single<{ estado_id: number }>();

      if (eventError || !currentEvent) {
        workflowLogger.error('Error al obtener evento:', eventError);
        return { success: false, message: 'No se pudo obtener el estado actual del evento.' };
      }

      workflowLogger.info(`Evento encontrado. Estado actual ID: ${currentEvent.estado_id}`);

      // Obtener el orden del estado actual
      const { data: currentState, error: currentStateError } = await supabase
        .from('evt_estados')
        .select('orden, nombre')
        .eq('id', currentEvent.estado_id)
        .single<{ orden: number; nombre: string }>();

      if (currentStateError || !currentState) {
        workflowLogger.error('Error al obtener estado actual:', currentStateError);
        return { success: false, message: 'No se pudo obtener información del estado actual.' };
      }

      workflowLogger.info(`Estado actual: ${currentState.nombre} (orden: ${currentState.orden})`);
      workflowLogger.info(`Estado objetivo: ${targetState.nombre} (orden: ${targetState.orden})`);

      const currentStateOrder = currentState.orden;

      // 4. Validar si la transición es un avance
      if (targetState.orden <= currentStateOrder) {
        workflowLogger.info(`No se avanza: estado objetivo (${targetState.orden}) <= estado actual (${currentStateOrder})`);
        return { success: false, message: `El evento ya está en un estado igual o más avanzado (${currentState.nombre}).` };
      }

      // 5. Cambiar el estado del evento
      workflowLogger.info(`Avanzando estado de "${currentState.nombre}" a "${targetState.nombre}"`);
      await this.changeEventState(eventId, targetState.id, userId, {
        notes: `Estado avanzado automáticamente por subida de documento: ${fileName}`,
      });

      workflowLogger.info(`Estado avanzado exitosamente a: ${targetState.nombre}`);
      return {
        success: true,
        message: `Evento avanzado al estado: ${targetState.nombre}`,
        newState: targetState.nombre,
      };

    } catch (error) {
      workflowLogger.error('Error en advanceStateOnDocumentUpload', error);
      return { success: false, message: 'Ocurrió un error interno al intentar avanzar el estado.' };
    }
  }

  /**
   * Obtiene el historial del flujo de trabajo para un evento
   */
  async getEventWorkflowHistory(eventId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('core_audit_log')
        .select(`
          *,
          usuario:core_users(nombre, email)
        `)
        .eq('entity_id', String(eventId))
        .eq('action', 'estado_cambiado')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      workflowLogger.error('Error al obtener el historial del flujo de trabajo', error);
      return [];
    }
  }

  /**
   * Valida si una transición de estado está permitida
   */
  async validateStateTransition(
    eventId: number,
    currentStateId: number,
    targetStateId: number
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Obtener información de los estados
      const { data, error } = await supabase
        .from('evt_estados')
        .select('id, nombre, orden')
        .in('id', [currentStateId, targetStateId]);

      if (error || !data) {
        workflowLogger.error('Error fetching states', error);
        return { valid: false, errors: ['Error al obtener información de los estados'] };
      }
      
      const states = data as EstadoInfo[];

      const currentState = states.find(s => s.id === currentStateId);
      const targetState = states.find(s => s.id === targetStateId);

      if (!currentState) {
        errors.push('Estado actual no encontrado');
      }

      if (!targetState) {
        errors.push('Estado objetivo no encontrado');
      }

      if (currentState && targetState) {
        // Comprobar si la transición es secuencial (solo se puede avanzar un paso a la vez)
        if (targetState.orden > currentState.orden && targetState.orden !== currentState.orden + 1) {
          errors.push('Solo se puede avanzar un estado a la vez');
        }

        // Comprobar reglas de negocio para transiciones específicas
        if (targetState.nombre.toLowerCase() === 'facturado') {
          // Validar que el evento tenga registros de ingresos
          const { count } = await supabase
            .from('evt_ingresos')
            .select('*', { count: 'exact', head: true })
            .eq('evento_id', eventId);

          if (!count || count === 0) {
            errors.push('El evento debe tener al menos un ingreso registrado para ser facturado');
          }
        }

        if (targetState.nombre.toLowerCase() === 'pagado') {
          // Validar que el evento haya sido facturado
          const { data: event } = await supabase
            .from('evt_eventos')
            .select('status_facturacion')
            .eq('id', eventId)
            .single<{ status_facturacion: string | null }>();

          if (event?.status_facturacion !== 'facturado') {
            errors.push('El evento debe estar facturado antes de marcarse como pagado');
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      workflowLogger.error('Error al validar la transición de estado', error);
      return {
        valid: false,
        errors: ['Error al validar la transición de estado'],
      };
    }
  }

  /**
   * Obtiene eventos por estado para informes
   */
  async getEventsByState(stateId?: number, companyId?: string): Promise<Evento[]> {
    try {
      let query = supabase
        .from('evt_eventos')
        .select('*')
        .eq('activo', true);

      if (stateId) {
        query = query.eq('estado_id', stateId);
      }

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      workflowLogger.error('Error al obtener eventos por estado', error);
      return [];
    }
  }

  /**
   * Cancela un evento, moviéndolo al estado 'Cancelado'.
   */
  async cancelEvent(
    eventId: number,
    userId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Obtener el ID del estado "Cancelado"
      const { data: cancelledState, error: stateError } = await supabase
        .from('evt_estados')
        .select('id, nombre')
        .eq('nombre', 'Cancelado')
        .single<Pick<Estado, 'id' | 'nombre'>>();

      if (stateError || !cancelledState) {
        workflowLogger.error('Error: El estado "Cancelado" no se encuentra en la base de datos', stateError);
        return { success: false, message: 'No se pudo encontrar el estado de cancelación.' };
      }

      // 2. Cambiar el estado del evento usando el método existente
      await this.changeEventState(eventId, cancelledState.id, userId, {
        notes: `Evento cancelado. Motivo: ${reason}`,
      });

      // 3. Opcional: Actualizar el campo status_evento si existe
      await supabase
        .from('evt_eventos')
        .update({ status_evento: 'cancelado' } as any) // Solución: Forzar el tipo
        .eq('id', eventId);

      return { success: true, message: 'El evento ha sido cancelado correctamente.' };
    } catch (error) {
      workflowLogger.error('Error al cancelar el evento', error);
      return { success: false, message: 'Ocurrió un error interno al cancelar el evento.' };
    }
  }

  /**
   * Finaliza un evento, moviéndolo al estado 'Finalizado'.
   */
  async finalizeEvent(
    eventId: number,
    userId: string,
    reason: string = 'Evento finalizado'
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Obtener el ID del estado "Finalizado"
      const { data: finalizedState, error: stateError } = await supabase
        .from('evt_estados')
        .select('id, nombre')
        .eq('nombre', 'Finalizado')
        .single<Pick<Estado, 'id' | 'nombre'>>();

      if (stateError || !finalizedState) {
        workflowLogger.error('Error: El estado "Finalizado" no se encuentra en la base de datos', stateError);
        return { success: false, message: 'No se pudo encontrar el estado de finalización.' };
      }

      // 2. Cambiar el estado del evento usando el método existente
      await this.changeEventState(eventId, finalizedState.id, userId, {
        notes: reason,
      });

      return { success: true, message: 'El evento ha sido finalizado correctamente.' };
    } catch (error) {
      workflowLogger.error('Error al finalizar el evento', error);
      return { success: false, message: 'Ocurrió un error interno al finalizar el evento.' };
    }
  }
}

export const workflowService = WorkflowService.getInstance();