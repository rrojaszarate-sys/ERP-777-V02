/**
 * Servicio de Auditoría - FASE 4.3
 * Registro de acciones de usuario para trazabilidad
 */
import { supabase } from '../config/supabase';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'EXPORT'
  | 'IMPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'PRINT';

export type AuditModule =
  | 'eventos'
  | 'clientes'
  | 'inventario'
  | 'contabilidad'
  | 'facturacion'
  | 'usuarios'
  | 'configuracion'
  | 'reportes'
  | 'sistema';

export interface AuditLog {
  id?: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  action: AuditAction;
  module: AuditModule;
  entity_type: string;
  entity_id?: string | number;
  entity_name?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  company_id?: string;
  created_at?: string;
}

export interface AuditFilter {
  user_id?: string;
  action?: AuditAction;
  module?: AuditModule;
  entity_type?: string;
  entity_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  limit?: number;
  offset?: number;
}

class AuditService {
  private static instance: AuditService;
  private queue: AuditLog[] = [];
  private isProcessing = false;
  private batchSize = 10;
  private flushInterval = 5000; // 5 segundos

  private constructor() {
    // Iniciar procesamiento periódico
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);

      // Flush al cerrar la página
      window.addEventListener('beforeunload', () => {
        this.flush(true);
      });
    }
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Registrar una acción de auditoría
   */
  public async log(entry: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    const auditEntry: AuditLog = {
      ...entry,
      ip_address: await this.getClientIP(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      created_at: new Date().toISOString()
    };

    this.queue.push(auditEntry);

    // Si la cola está llena, procesar inmediatamente
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Registrar acción de forma síncrona (para casos críticos)
   */
  public async logSync(entry: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    try {
      const auditEntry: AuditLog = {
        ...entry,
        ip_address: await this.getClientIP(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      };

      await supabase
        .from('core_audit_log')
        .insert([auditEntry]);
    } catch (error) {
      console.error('Error logging audit entry:', error);
    }
  }

  /**
   * Helpers para acciones comunes
   */
  public async logCreate(
    userId: string,
    module: AuditModule,
    entityType: string,
    entityId: string | number,
    entityName: string,
    newValues?: Record<string, any>,
    companyId?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'CREATE',
      module,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      new_values: newValues,
      company_id: companyId
    });
  }

  public async logUpdate(
    userId: string,
    module: AuditModule,
    entityType: string,
    entityId: string | number,
    entityName: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    companyId?: string
  ): Promise<void> {
    // Solo registrar campos que cambiaron
    const changes: Record<string, any> = {};
    const previousValues: Record<string, any> = {};

    Object.keys(newValues).forEach(key => {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changes[key] = newValues[key];
        previousValues[key] = oldValues[key];
      }
    });

    if (Object.keys(changes).length > 0) {
      await this.log({
        user_id: userId,
        action: 'UPDATE',
        module,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        old_values: previousValues,
        new_values: changes,
        company_id: companyId
      });
    }
  }

  public async logDelete(
    userId: string,
    module: AuditModule,
    entityType: string,
    entityId: string | number,
    entityName: string,
    oldValues?: Record<string, any>,
    companyId?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'DELETE',
      module,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      old_values: oldValues,
      company_id: companyId
    });
  }

  public async logView(
    userId: string,
    module: AuditModule,
    entityType: string,
    entityId?: string | number,
    entityName?: string,
    companyId?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'VIEW',
      module,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      company_id: companyId
    });
  }

  public async logExport(
    userId: string,
    module: AuditModule,
    format: 'PDF' | 'EXCEL' | 'CSV',
    recordCount: number,
    companyId?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'EXPORT',
      module,
      entity_type: 'export',
      metadata: { format, record_count: recordCount },
      company_id: companyId
    });
  }

  public async logLogin(
    userId: string,
    userEmail: string,
    userName?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSync({
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      action: 'LOGIN',
      module: 'sistema',
      entity_type: 'session',
      metadata
    });
  }

  public async logLogout(
    userId: string,
    userEmail?: string
  ): Promise<void> {
    await this.logSync({
      user_id: userId,
      user_email: userEmail,
      action: 'LOGOUT',
      module: 'sistema',
      entity_type: 'session'
    });
  }

  /**
   * Consultar logs de auditoría
   */
  public async getLogs(filters: AuditFilter = {}): Promise<AuditLog[]> {
    let query = supabase
      .from('core_audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.module) {
      query = query.eq('module', filters.module);
    }
    if (filters.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }
    if (filters.fecha_desde) {
      query = query.gte('created_at', filters.fecha_desde);
    }
    if (filters.fecha_hasta) {
      query = query.lte('created_at', filters.fecha_hasta);
    }

    query = query.limit(filters.limit || 100);

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Obtener historial de una entidad específica
   */
  public async getEntityHistory(
    entityType: string,
    entityId: string | number
  ): Promise<AuditLog[]> {
    return this.getLogs({
      entity_type: entityType,
      entity_id: entityId.toString()
    });
  }

  /**
   * Obtener actividad de un usuario
   */
  public async getUserActivity(
    userId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    return this.getLogs({
      user_id: userId,
      limit
    });
  }

  /**
   * Procesar cola de auditoría
   */
  private async flush(sync = false): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    try {
      const entries = this.queue.splice(0, this.batchSize);

      if (entries.length > 0) {
        const { error } = await supabase
          .from('core_audit_log')
          .insert(entries);

        if (error) {
          console.error('Error flushing audit queue:', error);
          // Re-agregar a la cola si falla
          this.queue.unshift(...entries);
        }
      }
    } catch (error) {
      console.error('Error in audit flush:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Obtener IP del cliente (simplificado)
   */
  private async getClientIP(): Promise<string | undefined> {
    try {
      // En producción, esto vendría del servidor
      return undefined;
    } catch {
      return undefined;
    }
  }
}

// Exportar instancia singleton
export const auditService = AuditService.getInstance();

// Hook para usar en componentes React
export function useAudit() {
  return {
    log: auditService.log.bind(auditService),
    logCreate: auditService.logCreate.bind(auditService),
    logUpdate: auditService.logUpdate.bind(auditService),
    logDelete: auditService.logDelete.bind(auditService),
    logView: auditService.logView.bind(auditService),
    logExport: auditService.logExport.bind(auditService),
    getLogs: auditService.getLogs.bind(auditService),
    getEntityHistory: auditService.getEntityHistory.bind(auditService),
    getUserActivity: auditService.getUserActivity.bind(auditService)
  };
}

export default auditService;
