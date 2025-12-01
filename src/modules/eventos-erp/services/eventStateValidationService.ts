/**
 * Servicio de Validación de Estados de Eventos
 *
 * Valida las transiciones de estado permitidas en el workflow de eventos
 */

import { supabase } from '../../../core/config/supabase';

export interface EstadoEvento {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  orden: number;
  workflow_step: number;
}

export interface TransicionEstado {
  estado_origen_id: string;
  estado_destino_id: string;
  requiere_validacion: boolean;
  validaciones: string[];
}

export interface ValidacionResult {
  valido: boolean;
  errores: string[];
  advertencias: string[];
}

class EventStateValidationService {
  private static instance: EventStateValidationService;
  private estadosCache: EstadoEvento[] | null = null;

  private constructor() {}

  public static getInstance(): EventStateValidationService {
    if (!EventStateValidationService.instance) {
      EventStateValidationService.instance = new EventStateValidationService();
    }
    return EventStateValidationService.instance;
  }

  /**
   * Obtiene todos los estados disponibles
   */
  async getEstados(): Promise<EstadoEvento[]> {
    if (this.estadosCache) {
      return this.estadosCache;
    }

    const { data, error } = await supabase
      .from('evt_estados_erp')
      .select('*')
      .order('orden', { ascending: true });

    if (error) throw error;
    this.estadosCache = data || [];
    return this.estadosCache;
  }

  /**
   * Invalida el cache de estados
   */
  invalidateCache(): void {
    this.estadosCache = null;
  }

  /**
   * Valida si una transición de estado es permitida
   */
  async validarTransicion(
    eventoId: string,
    estadoActualId: string,
    estadoDestinoId: string
  ): Promise<ValidacionResult> {
    const errores: string[] = [];
    const advertencias: string[] = [];

    try {
      // Obtener estados
      const estados = await this.getEstados();
      const estadoActual = estados.find(e => e.id === estadoActualId);
      const estadoDestino = estados.find(e => e.id === estadoDestinoId);

      if (!estadoActual) {
        errores.push('Estado actual no encontrado');
        return { valido: false, errores, advertencias };
      }

      if (!estadoDestino) {
        errores.push('Estado destino no encontrado');
        return { valido: false, errores, advertencias };
      }

      // Validar que el workflow_step sea secuencial (no se puede retroceder más de 1 paso)
      const diferenciaPasos = estadoDestino.workflow_step - estadoActual.workflow_step;

      if (diferenciaPasos < -1) {
        errores.push(`No se puede retroceder más de un paso en el workflow. Actual: ${estadoActual.nombre}, Destino: ${estadoDestino.nombre}`);
      }

      // Obtener datos del evento para validaciones específicas
      const { data: evento, error: eventoError } = await supabase
        .from('evt_eventos_erp')
        .select('*, ingresos:ingresos_erp(monto_cobrado), gastos:gastos_erp(total)')
        .eq('id', eventoId)
        .single();

      if (eventoError) {
        advertencias.push('No se pudo validar datos financieros del evento');
      } else {
        // Validaciones específicas por estado destino
        const validacionesEspecificas = await this.validacionesPorEstado(
          estadoDestino.nombre,
          evento
        );
        errores.push(...validacionesEspecificas.errores);
        advertencias.push(...validacionesEspecificas.advertencias);
      }

      return {
        valido: errores.length === 0,
        errores,
        advertencias
      };
    } catch (error: any) {
      errores.push(`Error en validación: ${error.message}`);
      return { valido: false, errores, advertencias };
    }
  }

  /**
   * Validaciones específicas por estado destino
   */
  private async validacionesPorEstado(
    nombreEstado: string,
    evento: any
  ): Promise<{ errores: string[]; advertencias: string[] }> {
    const errores: string[] = [];
    const advertencias: string[] = [];

    const nombreNormalizado = nombreEstado.toLowerCase();

    // Validación para estado "Cobrado" o "Finalizado"
    if (nombreNormalizado.includes('cobrado') || nombreNormalizado.includes('finalizado')) {
      const totalIngresos = evento.ingresos?.reduce(
        (sum: number, i: any) => sum + (parseFloat(i.monto_cobrado) || 0), 0
      ) || 0;

      if (totalIngresos === 0) {
        advertencias.push('El evento no tiene ingresos cobrados registrados');
      }
    }

    // Validación para estado "En Proceso"
    if (nombreNormalizado.includes('proceso') || nombreNormalizado.includes('ejecución')) {
      if (!evento.fecha_evento) {
        errores.push('El evento debe tener una fecha asignada antes de iniciar');
      }
    }

    // Validación para estado "Cancelado"
    if (nombreNormalizado.includes('cancelado')) {
      const totalCobrado = evento.ingresos?.reduce(
        (sum: number, i: any) => sum + (parseFloat(i.monto_cobrado) || 0), 0
      ) || 0;

      if (totalCobrado > 0) {
        advertencias.push(`El evento tiene $${totalCobrado.toLocaleString()} cobrados. Considere realizar devolución.`);
      }
    }

    return { errores, advertencias };
  }

  /**
   * Obtiene las transiciones permitidas desde un estado
   */
  async getTransicionesPermitidas(estadoActualId: string): Promise<EstadoEvento[]> {
    const estados = await this.getEstados();
    const estadoActual = estados.find(e => e.id === estadoActualId);

    if (!estadoActual) return [];

    // Permitir avanzar al siguiente paso o retroceder un paso
    return estados.filter(e => {
      const diferencia = e.workflow_step - estadoActual.workflow_step;
      return diferencia >= -1 && diferencia <= 1 && e.id !== estadoActualId;
    });
  }

  /**
   * Registra un cambio de estado en el historial
   */
  async registrarCambioEstado(
    eventoId: string,
    estadoAnteriorId: string,
    estadoNuevoId: string,
    userId: string,
    comentario?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('historial_estados_eventos')
      .insert([{
        evento_id: eventoId,
        estado_anterior_id: estadoAnteriorId,
        estado_nuevo_id: estadoNuevoId,
        usuario_id: userId,
        comentario,
        fecha_cambio: new Date().toISOString()
      }]);

    if (error) {
      // Si la tabla no existe, solo loguear advertencia
      if (error.code === '42P01') {
        console.warn('Tabla historial_estados_eventos no existe, omitiendo registro');
        return;
      }
      throw error;
    }
  }
}

export const eventStateValidationService = EventStateValidationService.getInstance();
