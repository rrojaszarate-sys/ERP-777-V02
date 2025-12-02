export interface Almacen {
  id: number;
  nombre: string;
  codigo: string;
  direccion: string | null;
  tipo: 'principal' | 'sucursal' | 'consignacion' | 'transito';
  activo: boolean;
  company_id: string;
}

export interface MovimientoInventario {
  id: number;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
  producto_id: number;
  almacen_id: number;
  cantidad: number;
  costo_unitario: number | null;
  referencia: string | null;
  created_at: string;
}

// ============================================================================
// DOCUMENTOS DE INVENTARIO (ENTRADAS/SALIDAS CON FIRMAS)
// ============================================================================

export type TipoDocumentoInventario = 'entrada' | 'salida';
export type EstadoDocumentoInventario = 'borrador' | 'confirmado' | 'cancelado';

export interface DocumentoInventario {
  id: number;
  numero_documento: string;
  tipo: TipoDocumentoInventario;
  fecha: string;
  almacen_id: number;
  evento_id: number | null;
  nombre_entrega: string | null;
  firma_entrega: string | null;
  nombre_recibe: string | null;
  firma_recibe: string | null;
  observaciones: string | null;
  estado: EstadoDocumentoInventario;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Relaciones expandidas
  almacen?: Almacen;
  evento?: { id: number; nombre: string };
  detalles?: DetalleDocumentoInventario[];
}

export interface DetalleDocumentoInventario {
  id: number;
  documento_id: number;
  producto_id: number;
  cantidad: number;
  observaciones: string | null;
  created_at: string;
  // Relación expandida
  producto?: Producto;
}

export interface Producto {
  id: number;
  nombre: string;
  codigo: string | null;
  sku: string | null;
  codigo_qr: string | null;
  descripcion: string | null;
  categoria_id: number | null;
  unidad_medida: string;
  precio_compra: number | null;
  precio_venta: number | null;
  stock_minimo: number;
  activo: boolean;
  company_id: string;
  created_at: string;
  // Relación expandida
  categoria?: { id: number; nombre: string };
}

// Para formularios de creación/edición
export interface DocumentoInventarioFormData {
  tipo: TipoDocumentoInventario;
  fecha: string;
  almacen_id: number | null;
  evento_id: number | null;
  nombre_entrega: string;
  firma_entrega: string | null;
  nombre_recibe: string;
  firma_recibe: string | null;
  observaciones: string;
  detalles: DetalleFormData[];
}

export interface DetalleFormData {
  producto_id: number;
  producto?: Producto;
  cantidad: number;
  observaciones: string;
}

// Para la vista consolidada
export interface DocumentoInventarioResumen {
  id: number;
  numero_documento: string;
  tipo: TipoDocumentoInventario;
  fecha: string;
  almacen_id: number;
  almacen_nombre: string;
  evento_id: number | null;
  evento_nombre: string | null;
  nombre_entrega: string | null;
  nombre_recibe: string | null;
  estado: EstadoDocumentoInventario;
  observaciones: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
  total_lineas: number;
  total_productos: number;
}

// Para generación de etiquetas QR
export interface ProductoQRLabel {
  codigo: string;
  nombre: string;
  categoria: string;
}

// ============================================================================
// UBICACIONES EN ALMACÉN
// ============================================================================

export type TipoUbicacion = 'estante' | 'piso' | 'colgante' | 'refrigerado' | 'exterior';

export interface UbicacionAlmacen {
  id: number;
  almacen_id: number;
  codigo: string;
  nombre: string | null;
  pasillo: string | null;
  rack: string | null;
  nivel: string | null;
  posicion: string | null;
  tipo: TipoUbicacion;
  capacidad_kg: number | null;
  capacidad_unidades: number | null;
  es_picking: boolean;
  activo: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
  // Relación expandida
  almacen?: Almacen;
}

// ============================================================================
// LOTES DE INVENTARIO
// ============================================================================

export type EstadoLote = 'activo' | 'agotado' | 'vencido' | 'bloqueado';

export interface LoteInventario {
  id: number;
  producto_id: number;
  almacen_id: number;
  ubicacion_id: number | null;
  numero_lote: string;
  codigo_barras_lote: string | null;
  fecha_fabricacion: string | null;
  fecha_caducidad: string | null;
  fecha_ingreso: string;
  cantidad_inicial: number;
  cantidad_actual: number;
  costo_unitario: number | null;
  proveedor_id: number | null;
  documento_compra: string | null;
  estado: EstadoLote;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Relaciones expandidas
  producto?: Producto;
  almacen?: Almacen;
  ubicacion?: UbicacionAlmacen;
  proveedor?: { id: number; nombre: string };
}

// ============================================================================
// NÚMEROS DE SERIE
// ============================================================================

export type EstadoSerie = 'disponible' | 'reservado' | 'en_uso' | 'en_reparacion' | 'dado_baja' | 'vendido';

export interface NumeroSerie {
  id: number;
  producto_id: number;
  lote_id: number | null;
  almacen_id: number | null;
  ubicacion_id: number | null;
  numero_serie: string;
  codigo_barras: string | null;
  fecha_fabricacion: string | null;
  fecha_garantia_fin: string | null;
  estado: EstadoSerie;
  evento_id: number | null;
  costo_adquisicion: number | null;
  valor_actual: number | null;
  notas: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
  // Relaciones expandidas
  producto?: Producto;
  lote?: LoteInventario;
  almacen?: Almacen;
  ubicacion?: UbicacionAlmacen;
  evento?: { id: number; nombre_proyecto: string };
}

// ============================================================================
// CONTEOS DE INVENTARIO (INVENTARIO FÍSICO)
// ============================================================================

export type TipoConteo = 'completo' | 'parcial' | 'ciclico' | 'aleatorio';
export type EstadoConteo = 'programado' | 'en_proceso' | 'completado' | 'cancelado';
export type EstadoLineaConteo = 'pendiente' | 'contado' | 'verificado' | 'ajustado';

export interface ConteoInventario {
  id: number;
  numero_conteo: string;
  nombre: string | null;
  tipo_conteo: TipoConteo;
  almacen_id: number | null;
  fecha_programada: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: EstadoConteo;
  responsable_id: string | null;
  total_productos: number;
  productos_contados: number;
  productos_con_diferencia: number;
  observaciones: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Relaciones expandidas
  almacen?: Almacen;
  detalles?: ConteoInventarioDetalle[];
}

export interface ConteoInventarioDetalle {
  id: number;
  conteo_id: number;
  producto_id: number;
  ubicacion_id: number | null;
  lote_id: number | null;
  cantidad_sistema: number;
  cantidad_contada: number | null;
  diferencia: number;
  estado: EstadoLineaConteo;
  contado_por: string | null;
  fecha_conteo: string | null;
  ajuste_aplicado: boolean;
  movimiento_ajuste_id: number | null;
  observaciones: string | null;
  created_at: string;
  // Relaciones expandidas
  producto?: Producto;
  ubicacion?: UbicacionAlmacen;
  lote?: LoteInventario;
}

// ============================================================================
// RESERVAS DE STOCK PARA EVENTOS
// ============================================================================

export type EstadoReserva = 'activa' | 'parcial' | 'entregada' | 'devuelta' | 'cancelada';

export interface ReservaStock {
  id: number;
  evento_id: number;
  producto_id: number;
  almacen_id: number;
  lote_id: number | null;
  cantidad_reservada: number;
  cantidad_entregada: number;
  cantidad_devuelta: number;
  fecha_reserva: string;
  fecha_necesidad: string;
  fecha_devolucion_esperada: string | null;
  estado: EstadoReserva;
  documento_salida_id: number | null;
  documento_entrada_id: number | null;
  notas: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Relaciones expandidas
  evento?: { id: number; nombre_proyecto: string; fecha_evento: string };
  producto?: Producto;
  almacen?: Almacen;
  lote?: LoteInventario;
}

// ============================================================================
// KITS DE MATERIALES PARA EVENTOS
// ============================================================================

export type TipoEvento = 'boda' | 'xv_años' | 'bautizo' | 'comunion' | 'graduacion' | 'corporativo' | 'cumpleaños' | 'otro';

export interface KitEvento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipo_evento: TipoEvento;
  categoria: string | null;
  personas_base: number;
  capacidad_personas?: number;
  es_escalable: boolean;
  precio_renta_sugerido: number | null;
  activo: boolean;
  empresa_id?: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Relaciones expandidas
  detalles?: KitEventoDetalle[];
  detalle?: KitEventoDetalle[];
}

export interface KitEventoDetalle {
  id: number;
  kit_id: number;
  producto_id: number;
  cantidad_fija: number;
  cantidad_por_persona: number;
  es_obligatorio: boolean;
  es_alternativo_de: number | null;
  notas: string | null;
  created_at: string;
  // Relaciones expandidas
  producto?: Producto;
}

// Formulario para crear/editar kits
export interface KitEventoFormData {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo_evento: string;
  categoria: string;
  personas_base: number;
  es_escalable: boolean;
  precio_renta_sugerido: number | null;
  detalles: KitEventoDetalleFormData[];
}

export interface KitEventoDetalleFormData {
  producto_id: number;
  producto?: Producto;
  cantidad_fija: number;
  cantidad_por_persona: number;
  es_obligatorio: boolean;
  notas: string;
}

// ============================================================================
// CHECKLIST DE INVENTARIO PARA EVENTOS
// ============================================================================

export type TipoChecklist = 'pre_evento' | 'post_evento';
export type EstadoChecklist = 'pendiente' | 'en_proceso' | 'completado' | 'con_problemas';
export type EstadoChecklistItem = 'pendiente' | 'verificado' | 'con_novedad';
export type EstadoItemChecklist = 'pendiente' | 'verificado' | 'faltante' | 'dañado' | 'devuelto';

export interface FotoChecklist {
  url: string;
  descripcion: string;
  fecha: string;
}

export interface ChecklistEventoInventario {
  id: number;
  evento_id: number;
  tipo: TipoChecklist;
  estado: EstadoChecklist;
  fecha_programada: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  responsable_carga_id: string | null;
  responsable_descarga_id: string | null;
  fotos_carga: FotoChecklist[];
  fotos_descarga: FotoChecklist[];
  nombre_entrega: string | null;
  firma_entrega: string | null;
  nombre_recibe: string | null;
  firma_recibe: string | null;
  total_productos: number;
  total_verificados: number;
  total_con_daño: number;
  total_faltantes: number;
  observaciones: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
  // Relaciones expandidas
  evento?: { id: number; nombre_proyecto: string; fecha_evento: string };
  detalles?: ChecklistEventoDetalle[];
}

export interface ChecklistEventoDetalle {
  id: number;
  checklist_id: number;
  producto_id: number;
  numero_serie_id: number | null;
  cantidad_esperada: number;
  cantidad_verificada: number;
  cantidad_dañada: number;
  cantidad_faltante: number;
  estado: EstadoChecklistItem;
  tipo_daño: string | null;
  descripcion_daño: string | null;
  foto_daño: string | null;
  costo_reposicion: number | null;
  verificado_por: string | null;
  fecha_verificacion: string | null;
  notas: string | null;
  created_at: string;
  // Relaciones expandidas
  producto?: Producto;
  numero_serie?: NumeroSerie;
}

// ============================================================================
// ALERTAS DE INVENTARIO
// ============================================================================

export type TipoAlerta = 'stock_bajo' | 'stock_critico' | 'lote_por_vencer' | 'lote_vencido' | 'conteo_pendiente' | 'reserva_proxima' | 'sin_movimiento';
export type PrioridadAlerta = 'baja' | 'media' | 'alta' | 'critica';
export type EstadoAlerta = 'activa' | 'leida' | 'resuelta' | 'descartada';

export interface AlertaInventario {
  id: number;
  tipo_alerta: TipoAlerta;
  producto_id: number | null;
  lote_id: number | null;
  conteo_id: number | null;
  reserva_id: number | null;
  titulo: string;
  mensaje: string;
  mensaje: string;
  detalles?: string | null;
  prioridad: PrioridadAlerta;
  estado: EstadoAlerta;
  fecha_alerta: string;
  url_accion?: string | null;
  fecha_vencimiento: string | null;
  fecha_lectura: string | null;
  fecha_resolucion: string | null;
  resuelta_por: string | null;
  company_id: string;
  created_at: string;
  // Relaciones expandidas
  producto?: Producto;
  lote?: LoteInventario;
}

// ============================================================================
// HISTORIAL DE NÚMEROS DE SERIE
// ============================================================================

export interface HistorialSerie {
  id: number;
  numero_serie_id: number;
  tipo_movimiento: string;
  almacen_anterior_id: number | null;
  almacen_nuevo_id: number | null;
  ubicacion_anterior_id: number | null;
  ubicacion_nueva_id: number | null;
  evento_id: number | null;
  documento_id: number | null;
  responsable_id: string | null;
  notas: string | null;
  fecha: string;
}

// ============================================================================
// ESTADÍSTICAS Y REPORTES
// ============================================================================

export interface EstadisticasInventario {
  total_productos: number;
  total_almacenes: number;
  productos_bajo_stock: number;
  lotes_por_vencer: number;
  reservas_activas: number;
  conteos_pendientes: number;
  valor_inventario: number;
  alertas_activas: number;
}

export interface ProductoConStock extends Producto {
  stock_actual: number;
  stock_reservado: number;
  stock_disponible: number;
  valor_inventario: number;
}

export interface ResumenReservasEvento {
  evento_id: number;
  evento_nombre: string;
  fecha_evento: string;
  total_productos: number;
  total_unidades: number;
  porcentaje_entregado: number;
  estado: 'pendiente' | 'parcial' | 'completo';
}
