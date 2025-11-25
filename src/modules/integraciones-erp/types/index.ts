export interface ConfiguracionIntegracion {
  id: number;
  company_id: string;
  tipo: 'api' | 'webhook' | 'ftp' | 'email' | 'contpaq' | 'odoo';
  nombre: string;
  credenciales: Record<string, any> | null;
  activo: boolean;
  ultima_sincronizacion: string | null;
  created_at: string;
}

export interface LogIntegracion {
  id: number;
  configuracion_id: number;
  tipo_evento: string;
  mensaje: string;
  data: any;
  exitoso: boolean;
  created_at: string;
}

export interface ConfiguracionFormData extends Partial<ConfiguracionIntegracion> {}
