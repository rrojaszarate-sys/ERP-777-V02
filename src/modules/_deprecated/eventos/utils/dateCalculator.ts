/**
 * 📅 Utilidades para Cálculo de Fechas de Cobro
 */

/**
 * Calcula la fecha de compromiso de cobro
 */
export function calcularFechaCompromiso(fechaEmision: Date, diasCredito: number): Date {
  const fecha = new Date(fechaEmision);
  fecha.setDate(fecha.getDate() + diasCredito);
  return fecha;
}

/**
 * Calcula la fecha de alerta previa (X días antes del compromiso)
 */
export function calcularFechaAlertaPrevia(fechaCompromiso: Date, diasAntes: number): Date {
  const fecha = new Date(fechaCompromiso);
  fecha.setDate(fecha.getDate() - diasAntes);
  return fecha;
}

/**
 * Calcula los días restantes hasta el vencimiento
 */
export function diasHastaVencimiento(fechaCompromiso: Date): number {
  const hoy = new Date();
  const diferencia = new Date(fechaCompromiso).getTime() - hoy.getTime();
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}

/**
 * Verifica si una factura está vencida
 */
export function estaVencida(fechaCompromiso: Date): boolean {
  return diasHastaVencimiento(fechaCompromiso) < 0;
}

/**
 * Verifica si una factura está próxima a vencer (dentro de X días)
 */
export function proximaAVencer(fechaCompromiso: Date, diasLimite: number = 7): boolean {
  const dias = diasHastaVencimiento(fechaCompromiso);
  return dias >= 0 && dias <= diasLimite;
}

/**
 * Calcula el estado de cobro basado en la fecha
 */
export function calcularEstadoCobro(
  fechaCompromiso: Date, 
  montoCobrado: number, 
  montoTotal: number,
  statusActual?: string
): 'pendiente' | 'parcial' | 'cobrado' | 'vencido' | 'cancelado' {
  // Si está cancelado, mantener ese estado
  if (statusActual === 'cancelado') return 'cancelado';
  
  // Si está totalmente cobrado
  if (montoCobrado >= montoTotal) return 'cobrado';
  
  // Si tiene cobro parcial
  if (montoCobrado > 0 && montoCobrado < montoTotal) return 'parcial';
  
  // Si está vencida y no tiene cobros
  if (estaVencida(fechaCompromiso)) return 'vencido';
  
  // Si está pendiente
  return 'pendiente';
}

/**
 * Formatea una fecha para mostrar en la UI
 */
export function formatDateForDisplay(date: Date | string): string {
  const fecha = typeof date === 'string' ? new Date(date) : date;
  return fecha.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Formatea una fecha para inputs HTML (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date | string): string {
  const fecha = typeof date === 'string' ? new Date(date) : date;
  return fecha.toISOString().split('T')[0];
}

/**
 * Calcula los días transcurridos desde una fecha
 */
export function diasDesde(fecha: Date): number {
  const hoy = new Date();
  const diferencia = hoy.getTime() - new Date(fecha).getTime();
  return Math.floor(diferencia / (1000 * 60 * 60 * 24));
}

/**
 * Agrega días a una fecha
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Obtiene el color del badge según los días restantes
 */
export function getColorByDaysRemaining(diasRestantes: number): 'danger' | 'warning' | 'success' | 'info' {
  if (diasRestantes < 0) return 'danger';      // Vencida
  if (diasRestantes <= 3) return 'warning';    // Próxima a vencer
  if (diasRestantes <= 7) return 'info';       // Alerta temprana
  return 'success';                             // A tiempo
}

/**
 * Obtiene un mensaje descriptivo del estado de la factura
 */
export function getMensajeEstado(fechaCompromiso: Date, statusCobro: string): string {
  if (statusCobro === 'cobrado') return '✅ Factura cobrada';
  if (statusCobro === 'cancelado') return '⚫ Factura cancelada';
  
  const dias = diasHastaVencimiento(fechaCompromiso);
  
  if (dias < 0) {
    return `🔴 Vencida hace ${Math.abs(dias)} día(s)`;
  } else if (dias === 0) {
    return '🟡 Vence hoy';
  } else if (dias <= 3) {
    return `⚠️ Vence en ${dias} día(s)`;
  } else if (dias <= 7) {
    return `📅 Vence en ${dias} días`;
  } else {
    return `✅ Vence en ${dias} días`;
  }
}
