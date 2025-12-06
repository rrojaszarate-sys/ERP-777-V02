/**
 * TIPOS PARA FORMULARIO UNIFICADO DE GASTOS
 * Usado en: Eventos ERP y Gastos No Impactados
 */

// Estado del gasto en el flujo
export type EstadoGasto = 'provision' | 'pendiente' | 'pagado';

// Tipo de documento fiscal
export type TipoDocumento = 'factura' | 'ticket' | null;

// Datos del formulario de gasto
export interface GastoFormData {
    // Identificadores
    id?: string | number;
    company_id?: string;
    evento_id?: number | null;       // NULL = Gasto No Impactado

    // Datos principales
    concepto: string;
    subtotal: number;
    iva: number;
    iva_porcentaje: number;
    total: number;
    fecha_gasto: string;

    // Estado
    estado: EstadoGasto;
    pagado: boolean;

    // Relaciones
    categoria_id?: number | null;
    cuenta_contable_id?: number | null;
    proveedor_id?: number | null;
    responsable_id?: string | null;
    forma_pago_id?: number | null;

    // Datos del proveedor (extraídos de factura)
    proveedor_nombre?: string;
    rfc_proveedor?: string;

    // 📎 DOCUMENTOS (4 campos)
    comprobante_pago_url?: string | null;
    factura_pdf_url?: string | null;
    factura_xml_url?: string | null;
    ticket_url?: string | null;

    // Datos fiscales
    folio_fiscal?: string | null;  // UUID del CFDI

    // Otros
    notas?: string;
    periodo?: string;             // YYYY-MM para reportes
    validacion?: string;          // Estado de validación contable

    // Materiales (específico eventos)
    tipo_movimiento?: 'gasto' | 'retorno' | null;
    detalle_retorno?: any;

    // Auditoría
    created_at?: string;
    created_by?: string;
    updated_at?: string;
}

// Props del formulario unificado
export interface UnifiedExpenseFormProps {
    // Datos
    gasto?: Partial<GastoFormData> | null;
    eventoId?: number | null;           // NULL = Gasto No Impactado
    claveEvento?: string;               // Ej: DOT2025-003 (para rutas de archivos)

    // Catálogos
    categorias?: { id: number; nombre: string; color?: string }[];
    cuentasContables?: { id: number; cuenta: string; subcuenta: string; clave: string }[];
    proveedores?: { id: number; razon_social: string; rfc?: string }[];
    usuarios?: { id: string; nombre: string; email: string }[];
    formasPago?: { id: number; nombre: string }[];

    // Callbacks
    onSave: (data: GastoFormData) => Promise<void>;
    onCancel: () => void;

    // Configuración
    modo?: 'evento' | 'gni';           // evento = con evento_id, gni = sin evento_id
    permitirProvision?: boolean;        // Si permite crear sin documentos

    // Estilo
    className?: string;
}

// Resultado de validación SAT
export interface SATValidationResult {
    success: boolean;
    esValida: boolean;
    esCancelada: boolean;
    noEncontrada: boolean;
    estado?: string;
    mensaje?: string;
    permitirGuardar?: boolean;
}

// Resultado de parseo CFDI
export interface CFDIData {
    emisor: {
        rfc: string;
        nombre: string;
        regimenFiscal?: string;
    };
    receptor: {
        rfc: string;
        nombre: string;
    };
    subtotal: number;
    total: number;
    impuestos?: {
        totalTraslados?: number;
        totalRetenciones?: number;
    };
    fecha?: string;
    folio?: string;
    serie?: string;
    timbreFiscal?: {
        uuid: string;
        fechaTimbrado?: string;
    };
    conceptos?: {
        descripcion: string;
        cantidad: number;
        valorUnitario: number;
        importe: number;
    }[];
}
