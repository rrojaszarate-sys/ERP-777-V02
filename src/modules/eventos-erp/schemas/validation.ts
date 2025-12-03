/**
 * Esquemas de validación Zod para el módulo de Eventos
 * FASE 1.2 - Validaciones robustas
 */
import { z } from 'zod';

// ============================================================================
// UTILIDADES DE VALIDACIÓN
// ============================================================================

/**
 * Validador de RFC mexicano (personas físicas y morales)
 */
const rfcRegex = {
  moral: /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/,
  fisica: /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/,
};

const rfcSchema = z.string()
  .transform(val => val?.toUpperCase().trim() || '')
  .refine(
    (val) => {
      if (!val) return true; // RFC es opcional en muchos casos
      return rfcRegex.moral.test(val) || rfcRegex.fisica.test(val);
    },
    { message: 'RFC inválido. Debe tener formato válido de persona física o moral.' }
  );

/**
 * Schema para montos monetarios (precisión de 2 decimales)
 */
const montoSchema = z.number()
  .nonnegative('El monto no puede ser negativo')
  .multipleOf(0.01, 'El monto debe tener máximo 2 decimales')
  .or(z.string().transform(val => parseFloat(val) || 0));

/**
 * Schema para fechas (acepta string ISO o null)
 */
const fechaOpcionalSchema = z.string()
  .nullable()
  .optional()
  .transform(val => {
    if (!val || val === '') return null;
    // Validar que sea una fecha válida
    const date = new Date(val);
    if (isNaN(date.getTime())) return null;
    return val;
  });

const fechaRequeridaSchema = z.string()
  .min(1, 'La fecha es requerida')
  .refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Fecha inválida' }
  );

// ============================================================================
// SCHEMA DE EVENTO
// ============================================================================

export const eventoSchema = z.object({
  nombre_proyecto: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(200, 'El nombre no puede exceder 200 caracteres'),

  clave_evento: z.string()
    .regex(/^EVT-\d{4}-[A-Z0-9]+$/, 'Formato de clave inválido (EVT-YYYY-XXX)')
    .optional(),

  cliente_id: z.number()
    .positive('Debe seleccionar un cliente')
    .or(z.string().transform(val => parseInt(val) || 0)),

  tipo_evento_id: z.number()
    .positive('Debe seleccionar un tipo de evento')
    .optional()
    .nullable(),

  fecha_inicio: fechaRequeridaSchema,
  fecha_fin: fechaOpcionalSchema,

  lugar: z.string().max(500).optional().nullable(),
  descripcion: z.string().max(2000).optional().nullable(),

  ganancia_estimada: montoSchema.optional().default(0),

  provision_combustible_peaje: montoSchema.optional().default(0),
  provision_materiales: montoSchema.optional().default(0),
  provision_recursos_humanos: montoSchema.optional().default(0),
  provision_solicitudes_pago: montoSchema.optional().default(0),

  responsable_id: z.string().uuid().optional().nullable(),
  estado_id: z.number().optional().default(1),

  notas: z.string().max(5000).optional().nullable(),
});

export type EventoInput = z.infer<typeof eventoSchema>;

// ============================================================================
// SCHEMA DE INGRESO
// ============================================================================

export const ingresoSchema = z.object({
  evento_id: z.number().positive('Debe seleccionar un evento'),

  concepto: z.string()
    .min(3, 'El concepto debe tener al menos 3 caracteres')
    .max(500, 'El concepto no puede exceder 500 caracteres'),

  descripcion: z.string().max(2000).optional().nullable(),

  // Campos monetarios
  subtotal: montoSchema,
  iva: montoSchema.optional().default(0),
  iva_porcentaje: z.number().min(0).max(100).optional().default(16),
  total: montoSchema,

  // Para cálculos legacy
  cantidad: z.number().positive().optional().default(1),
  precio_unitario: montoSchema.optional(),

  // Fechas
  fecha_ingreso: fechaRequeridaSchema,
  fecha_facturacion: fechaOpcionalSchema,
  fecha_cobro: fechaOpcionalSchema,
  fecha_compromiso_pago: fechaOpcionalSchema,

  // Estados
  facturado: z.boolean().optional().default(false),
  cobrado: z.boolean().optional().default(false),

  // Datos fiscales CFDI 4.0
  uuid_cfdi: z.string()
    .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'UUID CFDI inválido')
    .optional()
    .nullable(),

  serie: z.string().max(25).optional().nullable(),
  folio: z.string().max(40).optional().nullable(),

  rfc_cliente: rfcSchema.optional().nullable(),

  referencia: z.string().max(200).optional().nullable(),
  notas: z.string().max(2000).optional().nullable(),

  archivo_adjunto: z.string().url().optional().nullable(),
});

export type IngresoInput = z.infer<typeof ingresoSchema>;

// ============================================================================
// SCHEMA DE GASTO
// ============================================================================

export const gastoSchema = z.object({
  evento_id: z.number().positive('Debe seleccionar un evento'),

  concepto: z.string()
    .min(3, 'El concepto debe tener al menos 3 caracteres')
    .max(500, 'El concepto no puede exceder 500 caracteres'),

  descripcion: z.string().max(2000).optional().nullable(),

  categoria_id: z.number().positive('Debe seleccionar una categoría').optional().nullable(),

  // Campos monetarios
  cantidad: z.number().positive('La cantidad debe ser mayor a 0').optional().default(1),
  precio_unitario: montoSchema,
  subtotal: montoSchema,
  iva: montoSchema.optional().default(0),
  iva_porcentaje: z.number().min(0).max(100).optional().default(16),
  total: montoSchema,

  // Tipo de cambio - solo para moneda extranjera
  moneda: z.enum(['MXN', 'USD', 'EUR']).optional().default('MXN'),
  tipo_cambio: z.number().positive()
    .optional()
    .nullable()
    .transform((val, ctx) => {
      // Si es MXN, tipo_cambio debe ser null
      const moneda = (ctx as any).parent?.moneda;
      if (moneda === 'MXN' || !moneda) return null;
      return val || 1;
    }),

  // Fechas
  fecha_gasto: fechaRequeridaSchema,
  fecha_pago: fechaOpcionalSchema,
  fecha_factura: fechaOpcionalSchema,

  // Datos del proveedor
  proveedor: z.string().max(200).optional().nullable(),
  rfc_proveedor: rfcSchema.optional().nullable(),

  // Forma de pago
  forma_pago: z.enum([
    'efectivo', 'transferencia', 'cheque', 'tarjeta_credito',
    'tarjeta_debito', 'vales', 'otro'
  ]).optional().default('efectivo'),

  // Estados
  pagado: z.boolean().optional().default(false),
  aprobado: z.enum(['pendiente', 'aprobado', 'rechazado']).optional().default('pendiente'),

  // Datos fiscales
  uuid_cfdi: z.string()
    .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'UUID CFDI inválido')
    .optional()
    .nullable(),

  folio_fiscal: z.string().max(100).optional().nullable(),
  folio_interno: z.string().max(50).optional().nullable(),

  // Detalle de compra (productos)
  detalle_compra: z.array(z.object({
    nombre: z.string(),
    cantidad: z.number(),
    precio_unitario: z.number(),
    precio_total: z.number(),
  })).optional().nullable(),

  notas: z.string().max(2000).optional().nullable(),
  archivo_adjunto: z.string().url().optional().nullable(),

  // Campos OCR
  ocr_confianza: z.number().min(0).max(100).optional().nullable(),
  ocr_validado: z.boolean().optional().default(false),
});

export type GastoInput = z.infer<typeof gastoSchema>;

// ============================================================================
// SCHEMA DE CLIENTE
// ============================================================================

export const clienteSchema = z.object({
  razon_social: z.string()
    .min(3, 'La razón social debe tener al menos 3 caracteres')
    .max(300, 'La razón social no puede exceder 300 caracteres'),

  nombre_comercial: z.string().max(200).optional().nullable(),

  rfc: rfcSchema,

  // Datos fiscales
  regimen_fiscal: z.string().max(100).optional().nullable(),
  uso_cfdi: z.string().max(10).optional().nullable(),

  // Contacto
  email: z.string().email('Email inválido').optional().nullable(),
  telefono: z.string().max(20).optional().nullable(),

  // Dirección
  calle: z.string().max(200).optional().nullable(),
  numero_exterior: z.string().max(20).optional().nullable(),
  numero_interior: z.string().max(20).optional().nullable(),
  colonia: z.string().max(100).optional().nullable(),
  codigo_postal: z.string()
    .regex(/^\d{5}$/, 'Código postal debe tener 5 dígitos')
    .optional()
    .nullable(),
  ciudad: z.string().max(100).optional().nullable(),
  estado: z.string().max(100).optional().nullable(),
  pais: z.string().max(100).optional().default('México'),

  notas: z.string().max(2000).optional().nullable(),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

// ============================================================================
// FUNCIONES DE VALIDACIÓN HELPERS
// ============================================================================

/**
 * Valida datos de ingreso y retorna errores formateados
 */
export function validarIngreso(data: unknown): {
  success: boolean;
  data?: IngresoInput;
  errors?: string[]
} {
  const result = ingresoSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err =>
    `${err.path.join('.')}: ${err.message}`
  );

  return { success: false, errors };
}

/**
 * Valida datos de gasto y retorna errores formateados
 */
export function validarGasto(data: unknown): {
  success: boolean;
  data?: GastoInput;
  errors?: string[]
} {
  const result = gastoSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err =>
    `${err.path.join('.')}: ${err.message}`
  );

  return { success: false, errors };
}

/**
 * Valida datos de evento y retorna errores formateados
 */
export function validarEvento(data: unknown): {
  success: boolean;
  data?: EventoInput;
  errors?: string[]
} {
  const result = eventoSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err =>
    `${err.path.join('.')}: ${err.message}`
  );

  return { success: false, errors };
}

/**
 * Valida datos de cliente y retorna errores formateados
 */
export function validarCliente(data: unknown): {
  success: boolean;
  data?: ClienteInput;
  errors?: string[]
} {
  const result = clienteSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err =>
    `${err.path.join('.')}: ${err.message}`
  );

  return { success: false, errors };
}
