/**
 * Tipos para el Portal de Solicitudes de Compra
 */

// Usuario del portal (viene de Google OAuth)
export interface UsuarioPortal {
  id: string;
  empresa_id: string;
  google_id: string;
  email: string;
  nombre_completo: string;
  nombre?: string;
  apellido?: string;
  avatar_url?: string;
  departamento_id?: number;
  departamento?: Departamento;
  puesto?: string;
  telefono?: string;
  extension?: string;
  nivel_autorizacion: number;
  puede_aprobar: boolean;
  limite_aprobacion?: number;
  jefe_directo_id?: string;
  jefe_directo?: UsuarioPortal;
  activo: boolean;
  rol: RolPortal;
  primer_acceso: boolean;
  ultimo_acceso?: string;
  created_at: string;
}

export type RolPortal = 'solicitante' | 'aprobador' | 'compras' | 'admin';

// Departamento
export interface Departamento {
  id: number;
  empresa_id: string;
  codigo: string;
  nombre: string;
  centro_costos?: string;
  email_departamento?: string; // Correo del departamento
  responsable_id?: string;
  responsable?: UsuarioPortal;
  activo: boolean;
}

// Tipo de Gasto (para clasificación y reportes)
export interface TipoGasto {
  id: number;
  empresa_id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: CategoriaGasto;
  cuenta_contable?: string;
  requiere_proyecto: boolean;
  requiere_evento: boolean;
  activo: boolean;
}

export type CategoriaGasto = 'operativo' | 'inversion' | 'proyecto' | 'evento';

// Solicitud de compra
export interface SolicitudCompra {
  id: number;
  empresa_id: string;
  numero_solicitud: string;
  
  // Solicitante
  solicitante_id: string;
  solicitante?: UsuarioPortal;
  departamento_id?: number;
  departamento?: Departamento;
  centro_costos?: string;
  
  // Destino y clasificación
  tipo_destino: TipoDestino;
  tipo_gasto_id?: number;
  tipo_gasto?: TipoGasto;
  proyecto_id?: number;
  proyecto?: any;
  evento_id?: number;
  evento?: any;
  objetivo_descripcion?: string;
  
  // Urgencia
  prioridad: Prioridad;
  fecha_requerida?: string;
  
  // Justificación
  justificacion: string;
  impacto_sin_compra?: string;
  
  // Presupuesto (sin límite de costo - todo por autorización)
  tiene_presupuesto: boolean;
  partida_presupuestal?: string;
  monto_estimado: number;
  monto_aprobado?: number;
  
  // Estado
  estado: EstadoSolicitud;
  etapa_actual: number;
  nivel_aprobacion_requerido: number;
  
  // Resultados
  orden_compra_id?: number;
  motivo_rechazo?: string;
  
  // Relaciones
  items?: ItemSolicitud[];
  aprobaciones?: Aprobacion[];
  historial?: HistorialSolicitud[];
  adjuntos?: AdjuntoSolicitud[];
  
  // Auditoría
  created_at: string;
  updated_at: string;
  enviada_at?: string;
  cerrada_at?: string;
}

export type TipoDestino = 'proyecto' | 'evento' | 'operativo' | 'stock';

export type Prioridad = 'normal' | 'urgente' | 'critica';

export type EstadoSolicitud = 
  | 'borrador'
  | 'enviada'
  | 'en_revision'
  | 'aprobada'
  | 'rechazada'
  | 'en_cotizacion'
  | 'orden_generada'
  | 'en_transito'
  | 'recibida'
  | 'cerrada'
  | 'cancelada';

// Item de solicitud
export interface ItemSolicitud {
  id: number;
  solicitud_id: number;
  descripcion: string;
  especificaciones?: string;
  cantidad: number;
  unidad_medida: string;
  precio_referencia?: number;
  subtotal_estimado?: number;
  proveedor_sugerido_id?: number;
  proveedor_sugerido_nombre?: string;
  url_referencia?: string;
  imagen_url?: string;
  notas?: string;
  orden: number;
  created_at: string;
}

// Aprobación
export interface Aprobacion {
  id: number;
  solicitud_id: number;
  nivel: number;
  rol_requerido?: string;
  aprobador_id?: string;
  aprobador?: UsuarioPortal;
  estado: EstadoAprobacion;
  fecha_accion?: string;
  comentarios?: string;
  delegado_por?: string;
  motivo_delegacion?: string;
  created_at: string;
}

export type EstadoAprobacion = 'pendiente' | 'aprobada' | 'rechazada' | 'delegada';

// Historial
export interface HistorialSolicitud {
  id: number;
  solicitud_id: number;
  usuario_id?: string;
  usuario?: UsuarioPortal;
  tipo_accion: string;
  descripcion?: string;
  estado_anterior?: string;
  estado_nuevo?: string;
  datos_adicionales?: any;
  created_at: string;
}

// Adjunto
export interface AdjuntoSolicitud {
  id: number;
  solicitud_id: number;
  nombre_archivo: string;
  tipo_archivo?: string;
  tamano_bytes?: number;
  url_archivo: string;
  subido_por?: string;
  created_at: string;
}

// Configuración de aprobación
export interface ConfigAprobacion {
  id: number;
  empresa_id: string;
  nivel: number;
  nombre: string;
  descripcion?: string;
  monto_minimo: number;
  monto_maximo?: number;
  roles_aprobadores: string[];
  requiere_todos: boolean;
  tiempo_limite_horas: number;
  activo: boolean;
}

// Notificación
export interface NotificacionPortal {
  id: number;
  empresa_id: string;
  usuario_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje?: string;
  url_accion?: string;
  solicitud_id?: number;
  leida: boolean;
  fecha_leida?: string;
  created_at: string;
}

export type TipoNotificacion = 
  | 'solicitud_enviada'
  | 'aprobacion_pendiente'
  | 'pendiente_aprobacion'
  | 'solicitud_aprobada'
  | 'solicitud_rechazada'
  | 'aprobacion'
  | 'rechazo'
  | 'info'
  | 'exito'
  | 'info_requerida'
  | 'orden_generada'
  | 'material_recibido';

// Centro de Mensajes
export interface MensajePortal {
  id: number;
  empresa_id: string;
  solicitud_id?: number;
  solicitud?: SolicitudCompra;
  hilo_id?: number;
  hilo_padre?: MensajePortal;
  
  remitente_id: string;
  remitente?: UsuarioPortal;
  destinatario_id?: string;
  destinatario?: UsuarioPortal;
  destinatario_departamento_id?: number;
  destinatario_departamento?: Departamento;
  
  asunto?: string;
  mensaje: string;
  tipo_mensaje: TipoMensaje;
  
  tiene_adjuntos: boolean;
  adjuntos?: MensajeAdjunto[];
  
  leido: boolean;
  fecha_leido?: string;
  importante: boolean;
  archivado: boolean;
  
  // Respuestas (si es hilo padre)
  respuestas?: MensajePortal[];
  
  created_at: string;
}

export type TipoMensaje = 'comentario' | 'pregunta' | 'respuesta' | 'alerta' | 'sistema';

export interface MensajeAdjunto {
  id: number;
  mensaje_id: number;
  nombre_archivo: string;
  tipo_archivo?: string;
  tamano_bytes?: number;
  url_archivo: string;
  created_at: string;
}

// Para crear solicitudes
export interface SolicitudCompraCreate {
  tipo_destino: TipoDestino;
  tipo_gasto_id?: number;
  proyecto_id?: number;
  evento_id?: number;
  objetivo_descripcion?: string;
  prioridad: Prioridad;
  fecha_requerida?: string;
  justificacion: string;
  impacto_sin_compra?: string;
  tiene_presupuesto?: boolean;
  partida_presupuestal?: string;
  departamento_id?: number;
  items: ItemSolicitudCreate[];
}

export interface ItemSolicitudCreate {
  descripcion: string;
  especificaciones?: string;
  cantidad: number;
  unidad_medida?: string;
  precio_referencia?: number;
  proveedor_sugerido_nombre?: string;
  url_referencia?: string;
  imagen_url?: string;
  notas?: string;
}

// Estadísticas del dashboard
export interface EstadisticasSolicitudes {
  total: number;
  borradores: number;
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
  completadas: number;
  monto_total_pendiente: number;
  monto_total_aprobado: number;
}

// Reportes de gastos
export interface ReporteGastosPorTipo {
  empresa_id: string;
  tipo_gasto_id: number;
  tipo_gasto_codigo: string;
  tipo_gasto_nombre: string;
  categoria: CategoriaGasto;
  mes: string;
  cantidad_solicitudes: number;
  monto_total_estimado: number;
  monto_total_aprobado: number;
  aprobadas: number;
  rechazadas: number;
  pendientes: number;
}

export interface ReporteGastosPorEvento {
  empresa_id: string;
  evento_id: number;
  evento_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  cantidad_solicitudes: number;
  monto_total_estimado: number;
  monto_total_aprobado: number;
  aprobadas: number;
  rechazadas: number;
  completadas: number;
}

export interface ReporteGastosPorDepartamento {
  empresa_id: string;
  departamento_id: number;
  departamento_codigo: string;
  departamento_nombre: string;
  centro_costos: string;
  mes: string;
  cantidad_solicitudes: number;
  monto_total_estimado: number;
  monto_total_aprobado: number;
  aprobadas: number;
  rechazadas: number;
}

// Configuración de estilos por estado
export const ESTADOS_CONFIG: Record<EstadoSolicitud, { label: string; color: string; bgColor: string; icon: string }> = {
  borrador: { label: 'Borrador', color: '#6B7280', bgColor: '#6B728020', icon: '📝' },
  enviada: { label: 'Enviada', color: '#3B82F6', bgColor: '#3B82F620', icon: '📤' },
  en_revision: { label: 'En Revisión', color: '#F59E0B', bgColor: '#F59E0B20', icon: '👀' },
  aprobada: { label: 'Aprobada', color: '#10B981', bgColor: '#10B98120', icon: '✅' },
  rechazada: { label: 'Rechazada', color: '#EF4444', bgColor: '#EF444420', icon: '❌' },
  en_cotizacion: { label: 'En Cotización', color: '#8B5CF6', bgColor: '#8B5CF620', icon: '💰' },
  orden_generada: { label: 'Orden Generada', color: '#06B6D4', bgColor: '#06B6D420', icon: '📋' },
  en_transito: { label: 'En Tránsito', color: '#F97316', bgColor: '#F9731620', icon: '🚚' },
  recibida: { label: 'Recibida', color: '#059669', bgColor: '#05966920', icon: '📦' },
  cerrada: { label: 'Cerrada', color: '#374151', bgColor: '#37415120', icon: '🔒' },
  cancelada: { label: 'Cancelada', color: '#DC2626', bgColor: '#DC262620', icon: '🚫' },
};

export const PRIORIDADES_CONFIG: Record<Prioridad, { label: string; color: string; bgColor: string; dias: number }> = {
  normal: { label: 'Normal', color: '#6B7280', bgColor: '#6B728020', dias: 7 },
  urgente: { label: 'Urgente', color: '#F59E0B', bgColor: '#F59E0B20', dias: 3 },
  critica: { label: 'Crítica', color: '#EF4444', bgColor: '#EF444420', dias: 1 },
};

export const TIPOS_DESTINO_CONFIG: Record<TipoDestino, { label: string; icon: string }> = {
  proyecto: { label: 'Proyecto', icon: '📁' },
  evento: { label: 'Evento', icon: '📅' },
  operativo: { label: 'Operativo', icon: '⚙️' },
  stock: { label: 'Reposición Stock', icon: '📦' },
};
