/**
 * 💰 Hook useCalculosFinancieros
 *
 * Calcula utilidad según la fórmula del cliente:
 * UTILIDAD = INGRESOS - GASTOS - PROVISIONES_DISPONIBLES
 * PROVISIONES_DISPONIBLES = MAX(0, PROVISIONES - GASTOS)
 *
 * Semáforo de utilidad:
 * - Verde   ≥ 35% - Excelente
 * - Amarillo 25-34% - Regular
 * - Rojo    1-24% - Bajo
 * - Gris    ≤ 0% - Ninguno
 */

export interface CalculosFinancieros {
  ingresosTotales: number;
  ingresosCobrados: number;
  ingresosPendientes: number;
  gastosTotales: number;
  gastosPagados: number;
  gastosPendientes: number;
  provisionesTotales: number;
  provisionesDisponibles: number;
  utilidad: number;
  margenUtilidad: number;
  semaforo: 'verde' | 'amarillo' | 'rojo' | 'gris';
  etiqueta: 'Excelente' | 'Regular' | 'Bajo' | 'Ninguno';
}

export interface GastosPorCategoria {
  sps: number;       // ID 6 - Solicitudes de Pago
  rh: number;        // ID 7 - Recursos Humanos
  materiales: number; // ID 8 - Materiales
  combustible: number; // ID 9 - Combustible/Peaje
}

export interface EventoFinanciero {
  id: number;
  ingresos?: Array<{ total: number; cobrado: boolean }>;
  gastos?: Array<{ total: number; pagado: boolean; categoria_id?: number }>;
  provisiones?: number;
  ingresosTotales?: number;
  ingresosCobrados?: number;
  gastosTotales?: number;
  gastosPagados?: number;
}

/**
 * Calcula provisiones disponibles (nunca negativas)
 */
export function calcularProvisionesDisponibles(
  provisionesTotales: number,
  gastosTotales: number
): number {
  return Math.max(0, provisionesTotales - gastosTotales);
}

/**
 * Calcula utilidad según fórmula del cliente
 * UTILIDAD = INGRESOS - GASTOS - PROVISIONES_DISPONIBLES
 */
export function calcularUtilidad(
  ingresosTotales: number,
  gastosTotales: number,
  provisionesDisponibles: number
): number {
  return ingresosTotales - gastosTotales - provisionesDisponibles;
}

/**
 * Calcula margen de utilidad en porcentaje
 */
export function calcularMargenUtilidad(
  utilidad: number,
  ingresosTotales: number
): number {
  if (ingresosTotales <= 0) return 0;
  return (utilidad / ingresosTotales) * 100;
}

/**
 * Determina el color del semáforo según el margen de utilidad
 */
export function getSemaforoColor(margen: number): 'verde' | 'amarillo' | 'rojo' | 'gris' {
  if (margen >= 35) return 'verde';
  if (margen >= 25) return 'amarillo';
  if (margen >= 1) return 'rojo';
  return 'gris';
}

/**
 * Obtiene la etiqueta del semáforo
 */
export function getSemaforoEtiqueta(margen: number): 'Excelente' | 'Regular' | 'Bajo' | 'Ninguno' {
  if (margen >= 35) return 'Excelente';
  if (margen >= 25) return 'Regular';
  if (margen >= 1) return 'Bajo';
  return 'Ninguno';
}

/**
 * Calcula todos los valores financieros de un evento
 */
export function calcularFinancieros(evento: EventoFinanciero): CalculosFinancieros {
  // Si ya tiene los totales calculados (desde la vista SQL)
  let ingresosTotales = evento.ingresosTotales ?? 0;
  let ingresosCobrados = evento.ingresosCobrados ?? 0;
  let ingresosPendientes = 0;
  let gastosTotales = evento.gastosTotales ?? 0;
  let gastosPagados = evento.gastosPagados ?? 0;
  let gastosPendientes = 0;

  // Si tiene arrays de ingresos/gastos, calcular desde ellos
  if (evento.ingresos && Array.isArray(evento.ingresos)) {
    ingresosTotales = evento.ingresos.reduce((sum, i) => sum + (i.total || 0), 0);
    ingresosCobrados = evento.ingresos
      .filter(i => i.cobrado)
      .reduce((sum, i) => sum + (i.total || 0), 0);
    ingresosPendientes = ingresosTotales - ingresosCobrados;
  }

  if (evento.gastos && Array.isArray(evento.gastos)) {
    gastosTotales = evento.gastos.reduce((sum, g) => sum + (g.total || 0), 0);
    gastosPagados = evento.gastos
      .filter(g => g.pagado)
      .reduce((sum, g) => sum + (g.total || 0), 0);
    gastosPendientes = gastosTotales - gastosPagados;
  }

  const provisionesTotales = evento.provisiones ?? 0;
  const provisionesDisponibles = calcularProvisionesDisponibles(provisionesTotales, gastosTotales);
  const utilidad = calcularUtilidad(ingresosTotales, gastosTotales, provisionesDisponibles);
  const margenUtilidad = calcularMargenUtilidad(utilidad, ingresosTotales);
  const semaforo = getSemaforoColor(margenUtilidad);
  const etiqueta = getSemaforoEtiqueta(margenUtilidad);

  return {
    ingresosTotales,
    ingresosCobrados,
    ingresosPendientes,
    gastosTotales,
    gastosPagados,
    gastosPendientes,
    provisionesTotales,
    provisionesDisponibles,
    utilidad,
    margenUtilidad,
    semaforo,
    etiqueta
  };
}

/**
 * Calcula gastos por categoría
 */
export function calcularGastosPorCategoria(
  gastos: Array<{ total: number; categoria_id?: number }>
): GastosPorCategoria {
  return {
    sps: gastos.filter(g => g.categoria_id === 6).reduce((sum, g) => sum + (g.total || 0), 0),
    rh: gastos.filter(g => g.categoria_id === 7).reduce((sum, g) => sum + (g.total || 0), 0),
    materiales: gastos.filter(g => g.categoria_id === 8).reduce((sum, g) => sum + (g.total || 0), 0),
    combustible: gastos.filter(g => g.categoria_id === 9).reduce((sum, g) => sum + (g.total || 0), 0)
  };
}

/**
 * Calcula totales de un conjunto de eventos
 */
export function calcularTotalesEventos(eventos: EventoFinanciero[]): CalculosFinancieros {
  const totales = eventos.reduce(
    (acc, evento) => {
      const calc = calcularFinancieros(evento);
      return {
        ingresosTotales: acc.ingresosTotales + calc.ingresosTotales,
        ingresosCobrados: acc.ingresosCobrados + calc.ingresosCobrados,
        ingresosPendientes: acc.ingresosPendientes + calc.ingresosPendientes,
        gastosTotales: acc.gastosTotales + calc.gastosTotales,
        gastosPagados: acc.gastosPagados + calc.gastosPagados,
        gastosPendientes: acc.gastosPendientes + calc.gastosPendientes,
        provisionesTotales: acc.provisionesTotales + calc.provisionesTotales,
        provisionesDisponibles: acc.provisionesDisponibles + calc.provisionesDisponibles,
        utilidad: acc.utilidad + calc.utilidad
      };
    },
    {
      ingresosTotales: 0,
      ingresosCobrados: 0,
      ingresosPendientes: 0,
      gastosTotales: 0,
      gastosPagados: 0,
      gastosPendientes: 0,
      provisionesTotales: 0,
      provisionesDisponibles: 0,
      utilidad: 0
    }
  );

  const margenUtilidad = calcularMargenUtilidad(totales.utilidad, totales.ingresosTotales);

  return {
    ...totales,
    margenUtilidad,
    semaforo: getSemaforoColor(margenUtilidad),
    etiqueta: getSemaforoEtiqueta(margenUtilidad)
  };
}

/**
 * Formatea un número como moneda
 */
export function formatearMoneda(valor: number, opciones?: {
  formato?: 'normal' | 'miles' | 'millones';
  mostrarCentavos?: boolean;
}): string {
  const { formato = 'normal', mostrarCentavos = false } = opciones || {};

  let valorFormateado = valor;
  let sufijo = '';

  if (formato === 'miles' && Math.abs(valor) >= 1000) {
    valorFormateado = valor / 1000;
    sufijo = 'K';
  } else if (formato === 'millones' && Math.abs(valor) >= 1000000) {
    valorFormateado = valor / 1000000;
    sufijo = 'M';
  }

  const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: mostrarCentavos ? 2 : 0,
    maximumFractionDigits: mostrarCentavos ? 2 : (sufijo ? 1 : 0)
  });

  return formatter.format(valorFormateado).replace('MXN', '').trim() + sufijo;
}
