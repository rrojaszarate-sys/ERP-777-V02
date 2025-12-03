/**
 * Tipos para CFDI 4.0 - FASE 5.1
 * Comprobantes Fiscales Digitales por Internet
 */

// Tipos de comprobante
export type TipoComprobante = 'I' | 'E' | 'T' | 'N' | 'P';

export const TIPO_COMPROBANTE_LABEL: Record<TipoComprobante, string> = {
  'I': 'Ingreso',
  'E': 'Egreso',
  'T': 'Traslado',
  'N': 'Nómina',
  'P': 'Pago'
};

// Uso de CFDI
export type UsoCFDI =
  | 'G01' | 'G02' | 'G03' | 'I01' | 'I02' | 'I03' | 'I04' | 'I05' | 'I06' | 'I07' | 'I08'
  | 'D01' | 'D02' | 'D03' | 'D04' | 'D05' | 'D06' | 'D07' | 'D08' | 'D09' | 'D10'
  | 'S01' | 'CP01' | 'CN01';

export const USO_CFDI_CATALOG: Record<UsoCFDI, string> = {
  'G01': 'Adquisición de mercancías',
  'G02': 'Devoluciones, descuentos o bonificaciones',
  'G03': 'Gastos en general',
  'I01': 'Construcciones',
  'I02': 'Mobiliario y equipo de oficina por inversiones',
  'I03': 'Equipo de transporte',
  'I04': 'Equipo de cómputo y accesorios',
  'I05': 'Dados, troqueles, moldes, matrices y herramental',
  'I06': 'Comunicaciones telefónicas',
  'I07': 'Comunicaciones satelitales',
  'I08': 'Otra maquinaria y equipo',
  'D01': 'Honorarios médicos, dentales y gastos hospitalarios',
  'D02': 'Gastos médicos por incapacidad o discapacidad',
  'D03': 'Gastos funerales',
  'D04': 'Donativos',
  'D05': 'Intereses reales efectivamente pagados por créditos hipotecarios',
  'D06': 'Aportaciones voluntarias al SAR',
  'D07': 'Primas por seguros de gastos médicos',
  'D08': 'Gastos de transportación escolar obligatoria',
  'D09': 'Depósitos en cuentas para el ahorro, primas pensión',
  'D10': 'Pagos por servicios educativos (colegiaturas)',
  'S01': 'Sin efectos fiscales',
  'CP01': 'Pagos',
  'CN01': 'Nómina'
};

// Régimen fiscal
export type RegimenFiscal =
  | '601' | '603' | '605' | '606' | '607' | '608' | '609' | '610' | '611' | '612'
  | '614' | '615' | '616' | '620' | '621' | '622' | '623' | '624' | '625' | '626';

export const REGIMEN_FISCAL_CATALOG: Record<RegimenFiscal, string> = {
  '601': 'General de Ley Personas Morales',
  '603': 'Personas Morales con Fines no Lucrativos',
  '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606': 'Arrendamiento',
  '607': 'Régimen de Enajenación o Adquisición de Bienes',
  '608': 'Demás ingresos',
  '609': 'Consolidación',
  '610': 'Residentes en el Extranjero sin Establecimiento Permanente en México',
  '611': 'Ingresos por Dividendos (socios y accionistas)',
  '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
  '614': 'Ingresos por intereses',
  '615': 'Régimen de los ingresos por obtención de premios',
  '616': 'Sin obligaciones fiscales',
  '620': 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
  '621': 'Incorporación Fiscal',
  '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623': 'Opcional para Grupos de Sociedades',
  '624': 'Coordinados',
  '625': 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626': 'Régimen Simplificado de Confianza'
};

// Método de pago
export type MetodoPago = 'PUE' | 'PPD';

export const METODO_PAGO_LABEL: Record<MetodoPago, string> = {
  'PUE': 'Pago en una sola exhibición',
  'PPD': 'Pago en parcialidades o diferido'
};

// Forma de pago
export type FormaPago =
  | '01' | '02' | '03' | '04' | '05' | '06' | '08' | '12' | '13' | '14' | '15'
  | '17' | '23' | '24' | '25' | '26' | '27' | '28' | '29' | '30' | '31' | '99';

export const FORMA_PAGO_CATALOG: Record<FormaPago, string> = {
  '01': 'Efectivo',
  '02': 'Cheque nominativo',
  '03': 'Transferencia electrónica de fondos',
  '04': 'Tarjeta de crédito',
  '05': 'Monedero electrónico',
  '06': 'Dinero electrónico',
  '08': 'Vales de despensa',
  '12': 'Dación en pago',
  '13': 'Pago por subrogación',
  '14': 'Pago por consignación',
  '15': 'Condonación',
  '17': 'Compensación',
  '23': 'Novación',
  '24': 'Confusión',
  '25': 'Remisión de deuda',
  '26': 'Prescripción o caducidad',
  '27': 'A satisfacción del acreedor',
  '28': 'Tarjeta de débito',
  '29': 'Tarjeta de servicios',
  '30': 'Aplicación de anticipos',
  '31': 'Intermediario pagos',
  '99': 'Por definir'
};

// Moneda
export type MonedaCFDI = 'MXN' | 'USD' | 'EUR';

// Objeto de impuesto
export type ObjetoImpuesto = '01' | '02' | '03' | '04';

export const OBJETO_IMPUESTO_LABEL: Record<ObjetoImpuesto, string> = {
  '01': 'No objeto de impuesto',
  '02': 'Sí objeto de impuesto',
  '03': 'Sí objeto del impuesto y no obligado al desglose',
  '04': 'Sí objeto del impuesto y no causa impuesto'
};

// Interfaces principales
export interface EmisorCFDI {
  rfc: string;
  nombre: string;
  regimen_fiscal: RegimenFiscal;
  domicilio_fiscal?: string;
  // Datos adicionales
  logo_url?: string;
  certificado_numero?: string;
  certificado_vigencia?: string;
}

export interface ReceptorCFDI {
  rfc: string;
  nombre: string;
  domicilio_fiscal_receptor: string;
  regimen_fiscal_receptor: RegimenFiscal;
  uso_cfdi: UsoCFDI;
  // Opcionales
  email?: string;
  telefono?: string;
}

export interface ConceptoCFDI {
  clave_prod_serv: string;
  no_identificacion?: string;
  cantidad: number;
  clave_unidad: string;
  unidad?: string;
  descripcion: string;
  valor_unitario: number;
  importe: number;
  descuento?: number;
  objeto_imp: ObjetoImpuesto;
  // Impuestos del concepto
  impuestos?: {
    traslados?: ImpuestoTrasladoCFDI[];
    retenciones?: ImpuestoRetencionCFDI[];
  };
}

export interface ImpuestoTrasladoCFDI {
  base: number;
  impuesto: '002' | '003'; // IVA o IEPS
  tipo_factor: 'Tasa' | 'Cuota' | 'Exento';
  tasa_o_cuota?: number;
  importe?: number;
}

export interface ImpuestoRetencionCFDI {
  base: number;
  impuesto: '001' | '002' | '003'; // ISR, IVA o IEPS
  tipo_factor: 'Tasa';
  tasa_o_cuota: number;
  importe: number;
}

export interface CFDI {
  // Encabezado
  version: '4.0';
  serie?: string;
  folio?: string;
  fecha: string; // ISO format
  forma_pago?: FormaPago;
  no_certificado?: string;
  condiciones_de_pago?: string;
  subtotal: number;
  descuento?: number;
  moneda: MonedaCFDI;
  tipo_cambio?: number;
  total: number;
  tipo_de_comprobante: TipoComprobante;
  exportacion: '01' | '02' | '03' | '04';
  metodo_pago?: MetodoPago;
  lugar_expedicion: string;

  // Participantes
  emisor: EmisorCFDI;
  receptor: ReceptorCFDI;

  // Conceptos
  conceptos: ConceptoCFDI[];

  // Impuestos globales
  impuestos?: {
    total_impuestos_trasladados?: number;
    total_impuestos_retenidos?: number;
    traslados?: ImpuestoTrasladoCFDI[];
    retenciones?: ImpuestoRetencionCFDI[];
  };

  // Complementos
  complementos?: {
    tipo: string;
    datos: Record<string, any>;
  }[];

  // Datos de timbrado (después de certificar)
  uuid?: string;
  fecha_timbrado?: string;
  sello_cfdi?: string;
  sello_sat?: string;
  no_certificado_sat?: string;
  cadena_original_complemento?: string;

  // Estado
  estado?: 'pendiente' | 'timbrado' | 'cancelado' | 'error';
  motivo_cancelacion?: string;
  fecha_cancelacion?: string;
}

// Factura en base de datos
export interface Factura {
  id: number;
  company_id: string;

  // Relaciones
  cliente_id?: number;
  evento_id?: number;

  // Datos CFDI
  uuid?: string;
  serie?: string;
  folio: string;
  tipo_comprobante: TipoComprobante;
  fecha_emision: string;
  fecha_timbrado?: string;

  // Montos
  subtotal: number;
  descuento: number;
  iva: number;
  isr_retenido: number;
  iva_retenido: number;
  total: number;
  moneda: MonedaCFDI;
  tipo_cambio: number;

  // Receptor
  rfc_receptor: string;
  razon_social_receptor: string;
  uso_cfdi: UsoCFDI;
  regimen_fiscal_receptor: RegimenFiscal;
  domicilio_fiscal_receptor: string;

  // Pago
  forma_pago?: FormaPago;
  metodo_pago: MetodoPago;
  condiciones_pago?: string;

  // Estado
  estado: 'borrador' | 'pendiente' | 'timbrada' | 'pagada' | 'cancelada' | 'error';
  error_mensaje?: string;

  // Archivos
  xml_url?: string;
  pdf_url?: string;

  // Auditoría
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Catálogo de productos/servicios SAT (simplificado)
export interface ClaveProdServSAT {
  clave: string;
  descripcion: string;
}

// Catálogo de unidades SAT (simplificado)
export interface ClaveUnidadSAT {
  clave: string;
  nombre: string;
  descripcion?: string;
}

// Configuración de facturación
export interface ConfiguracionFacturacion {
  id: number;
  company_id: string;

  // Datos fiscales
  rfc: string;
  razon_social: string;
  regimen_fiscal: RegimenFiscal;
  domicilio_fiscal: string;
  lugar_expedicion: string;

  // Certificados
  certificado_cer?: string;
  certificado_key?: string;
  certificado_password?: string;
  certificado_numero?: string;
  certificado_vigencia_inicio?: string;
  certificado_vigencia_fin?: string;

  // PAC
  pac_provider: 'finkok' | 'facturapi' | 'sw' | 'otro';
  pac_usuario?: string;
  pac_password?: string;
  pac_token?: string;
  pac_sandbox: boolean;

  // Series y folios
  serie_ingreso?: string;
  folio_ingreso: number;
  serie_egreso?: string;
  folio_egreso: number;
  serie_pago?: string;
  folio_pago: number;

  // Opciones
  logo_url?: string;
  color_primario?: string;
  notas_predeterminadas?: string;
  enviar_email_automatico: boolean;

  activo: boolean;
  created_at: string;
  updated_at: string;
}
