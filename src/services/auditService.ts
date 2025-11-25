import { supabase } from '../core/config/supabase';
import { AuditLog } from '../core/types/events';

export class AuditService {
  private static instance: AuditService;

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  async logAction(
    eventoId: string,
    usuarioId: string,
    action: string,
    datosAnteriores?: any,
    datosNuevos?: any
  ): Promise<void> {
    try {
      const auditEntry: Omit<AuditLog, 'id' | 'usuario'> = {
        evento_id: eventoId,
        usuario_id: usuarioId,
        company_id: null, // Will be set by database trigger or application logic
        action,
        datos_anteriores: datosAnteriores,
        datos_nuevos: datosNuevos,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('core_audit_log')
        .insert([auditEntry]);

      if (error) {
        console.warn('[AuditService] No se pudo guardar el log de auditoría:', error.message);
        // No lanzamos el error para no interrumpir el flujo principal
      } else {
        console.log('[AuditService] Log de auditoría guardado:', action);
      }
    } catch (error) {
      console.warn('[AuditService] Error al guardar log de auditoría:', error);
      // No lanzamos el error para no interrumpir el flujo principal
    }
  }

  async getEventAuditLog(eventoId: string): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('core_audit_log')
        .select(`
          *,
          usuario:core_users(nombre, email)
        `)
        .eq('evento_id', eventoId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit log:', error);
      return [];
    }
  }

  async getUserAuditLog(usuarioId: string, limit: number = 50): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('core_audit_log')
        .select(`
          *,
          usuario:core_users(nombre, email)
        `)
        .eq('usuario_id', usuarioId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user audit log:', error);
      return [];
    }
  }

  async getSystemAuditLog(
    filters?: {
      fechaInicio?: string;
      fechaFin?: string;
      action?: string;
      usuarioId?: string;
    },
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      let query = supabase
        .from('core_audit_log')
        .select(`
          *,
          usuario:core_users(nombre, email)
        `);

      if (filters?.fechaInicio) {
        query = query.gte('timestamp', filters.fechaInicio);
      }

      if (filters?.fechaFin) {
        query = query.lte('timestamp', filters.fechaFin);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.usuarioId) {
        query = query.eq('usuario_id', filters.usuarioId);
      }

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching system audit log:', error);
      return [];
    }
  }

  // Predefined action types for consistency
  static readonly ACTIONS = {
    // Event actions
    EVENT_CREATED: 'evento_creado',
    EVENT_UPDATED: 'evento_actualizado',
    EVENT_DELETED: 'evento_eliminado',
    EVENT_STATUS_CHANGED: 'evento_status_cambiado',
    
    // Income actions
    INCOME_ADDED: 'ingreso_agregado',
    INCOME_UPDATED: 'ingreso_actualizado',
    INCOME_DELETED: 'ingreso_eliminado',
    
    // Expense actions
    EXPENSE_ADDED: 'gasto_agregado',
    EXPENSE_UPDATED: 'gasto_actualizado',
    EXPENSE_DELETED: 'gasto_eliminado',
    EXPENSE_APPROVED: 'gasto_aprobado',
    EXPENSE_REJECTED: 'gasto_rechazado',
    
    // Document actions
    DOCUMENT_UPLOADED: 'documento_subido',
    DOCUMENT_DELETED: 'documento_eliminado',
    OCR_VALIDATED: 'ocr_validado',
    
    // Export actions
    EXPORT_PDF: 'exportacion_pdf',
    EXPORT_EXCEL: 'exportacion_excel',
    
    // System actions
    LOGIN: 'login',
    LOGOUT: 'logout',
    PERMISSION_CHANGED: 'permiso_cambiado'
  } as const;
}

export const auditService = AuditService.getInstance();