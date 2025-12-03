/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║           SERVICIOS DEL MÓDULO DE INVENTARIO - ERP 777 V2                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Este archivo centraliza la exportación de todos los servicios de inventario.
 * 
 * @module inventario-erp/services
 * @version 2.0.0
 * @date 2025-12-03
 */

// ============================================================================
// SERVICIOS PRINCIPALES
// ============================================================================

/**
 * Servicio de Inventario General
 * - Gestión de productos, stock y movimientos
 * - Consultas de existencias por almacén
 */
export * from './inventarioService';

/**
 * Servicio de Alertas
 * - Alertas de stock bajo, vencimiento, sobrestock
 * - Estadísticas y conteo por prioridad
 * - Tabla: inv_alertas_erp (alias: alertas_inventario_erp)
 */
export * from './alertasService';

/**
 * Servicio de Lotes
 * - Gestión de lotes con fechas de caducidad
 * - Trazabilidad de productos por lote
 * - Tabla: inv_lotes (alias: lotes_inventario_erp)
 */
export * from './lotesService';

/**
 * Servicio de Reservas
 * - Reservas de stock para eventos
 * - Estados: activa, parcial, completada, cancelada
 * - Tabla: inv_reservas (alias: reservas_inventario_erp)
 */
export * from './reservasService';

/**
 * Servicio de Ubicaciones
 * - Gestión de ubicaciones dentro de almacenes
 * - Rack, anaquel, nivel, posición
 * - Tabla: inv_ubicaciones (alias: ubicaciones_inventario_erp)
 */
export * from './ubicacionesService';

// ============================================================================
// SERVICIOS DE CONTROL Y AUDITORÍA
// ============================================================================

/**
 * Servicio de Conteos Físicos
 * - Conteos de inventario programados
 * - Diferencias y ajustes de inventario
 * - Tabla: inv_conteos_erp (alias: conteos_inventario_erp)
 */
export * from './conteosService';

/**
 * Servicio de Checklists
 * - Checklists de entrada/salida para eventos
 * - Verificación de productos y condiciones
 * - Tabla: inv_checklists_erp (alias: checklist_evento_inventario_erp)
 */
export * from './checklistService';

/**
 * Servicio de Kardex
 * - Historial detallado de movimientos por producto
 * - Trazabilidad completa de entradas y salidas
 */
export * from './kardexService';

// ============================================================================
// SERVICIOS DE MOVIMIENTOS
// ============================================================================

/**
 * Servicio de Transferencias
 * - Transferencias entre almacenes
 * - Estados: pendiente, en_transito, recibida, cancelada
 * - Tablas: transferencias_erp, transferencias_detalle_erp
 */
export * from './transferenciasService';

// ============================================================================
// SERVICIOS ESPECIALIZADOS
// ============================================================================

/**
 * Servicio de Kits
 * - Gestión de productos compuestos (kits)
 * - Armado y desarmado automático
 */
export * from './kitsService';

/**
 * Servicio de Reorden
 * - Puntos de reorden automáticos
 * - Generación de órdenes de compra sugeridas
 */
export * from './reordenService';

/**
 * Servicio de Valuación
 * - Métodos: PEPS, UEPS, Promedio Ponderado
 * - Cálculo de costos de inventario
 */
export * from './valuacionService';

// ============================================================================
// SERVICIOS DE DOCUMENTOS
// ============================================================================

/**
 * Servicio de Documentos de Inventario
 * - Entradas, salidas, ajustes, traspasos
 * - Vinculación con eventos y proveedores
 */
export * from './documentosInventarioService';

/**
 * Servicio de Importación
 * - Importación masiva desde Excel/CSV
 * - Validación y mapeo de campos
 */
export * from './importService';
