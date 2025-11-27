import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  Calculator,
  Loader2,
  Camera,
  CheckCircle,
  AlertTriangle,
  Upload,
  FileText,
  ExternalLink,
  X,
  ChevronDown,
  ChevronUp,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../../shared/components/ui/Button';
import { useExpenseCategories } from '../../hooks/useFinances';
import { useCuentasContables } from '../../hooks/useCuentasContables';
import { useUsers } from '../../hooks/useUsers';
import { formatCurrency, formatDateForInput } from '../../../../shared/utils/formatters';
import { MEXICAN_CONFIG, BUSINESS_RULES } from '../../../../core/config/constants';
import { Expense } from '../../types/Finance';
import { parseCFDIXml, cfdiToExpenseData } from '../../utils/cfdiXmlParser';
import { processFileWithOCR } from '../../../ocr/services/dualOCRService';

interface DualOCRExpenseFormProps {
  expense?: Expense | null;
  eventId: string;
  onSave: (data: Partial<Expense>) => void;
  onCancel: () => void;
  className?: string;
}

interface OCRData {
  establecimiento: string | null;
  rfc: string | null;
  telefono: string | null;
  fecha: string | null;
  hora: string | null;
  total: number | null;
  subtotal: number | null;
  iva: number | null;
  forma_pago: string | null;
  concepto_sugerido: string | null; // NUEVO: Concepto generado inteligentemente
  categoria_sugerida: string | null; // NUEVO: Categoría sugerida automáticamente
  productos: Array<{
    nombre?: string;
    descripcion?: string;
    cantidad: number;
    precio_unitario: number;
    total?: number;
  }>;
  // Campos SAT adicionales (para mapeo con Gemini)
  uuid_cfdi?: string | null;
  serie?: string | null;
  folio?: string | null;
  folio_fiscal?: string | null;
  metodo_pago_sat?: string | null;
  forma_pago_sat?: string | null;
  uso_cfdi?: string | null;
  lugar_expedicion?: string | null;
  moneda?: string | null;
  tipo_cambio?: number | null;
  direccion_proveedor?: string | null;
  email_proveedor?: string | null;
  telefono_proveedor?: string | null;
  regimen_fiscal?: string | null;
  establecimiento_info?: string | null;
  tipo_comprobante?: string | null;
  detalle_compra?: string | null;
}

// 🔄 Helper: Convertir detalle_compra JSON a formato legible
const formatDetalleCompraForDisplay = (detalleCompra: string | null | undefined): string => {
  if (!detalleCompra) return '';
  
  try {
    const productos = JSON.parse(detalleCompra);
    if (!Array.isArray(productos) || productos.length === 0) return '';
    
    // Convertir a formato legible: "1 x PRODUCTO - $150.00 = $150.00"
    return productos.map((p, idx) => 
      `${idx + 1}. ${p.cantidad} x ${p.descripcion} - $${p.precio_unitario.toFixed(2)} = $${p.total.toFixed(2)}`
    ).join('\n');
  } catch (error) {
    console.warn('⚠️ No se pudo parsear detalle_compra:', error);
    return detalleCompra; // Devolver como está si no es JSON válido
  }
};

export const DualOCRExpenseForm: React.FC<DualOCRExpenseFormProps> = ({
  expense,
  eventId,
  onSave,
  onCancel,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    concepto: expense?.concepto || '',
    descripcion: expense?.descripcion || '',
    detalle_compra: formatDetalleCompraForDisplay(expense?.detalle_compra) || '', // 🔄 Convertir JSON a texto legible
    total: expense?.total || 0,
    iva_porcentaje: expense?.iva_porcentaje || MEXICAN_CONFIG.ivaRate,
    proveedor: expense?.proveedor || '',
    rfc_proveedor: expense?.rfc_proveedor || '',
    fecha_gasto: expense?.fecha_gasto || new Date().toISOString().split('T')[0],
    categoria_id: expense?.categoria_id || '',
    cuenta_id: expense?.cuenta_id || '', // 🏦 NUEVO: Campo para cuenta bancaria
    responsable_id: expense?.responsable_id || '', // 👤 NUEVO: Campo para responsable (obligatorio)
    forma_pago: expense?.forma_pago || 'transferencia', // Forma de pago (texto descriptivo)
    tipo_comprobante: expense?.tipo_comprobante || 'I', // SAT: I=Ingreso, E=Egreso, T=Traslado, N=Nómina, P=Pago
    referencia: expense?.referencia || '',
    status_aprobacion: expense?.status_aprobacion || 'aprobado',
    // Campos SAT adicionales
    uuid_cfdi: expense?.uuid_cfdi || '',
    serie: expense?.serie || '',
    folio: expense?.folio || '',
    folio_fiscal: expense?.folio_fiscal || '',
    metodo_pago_sat: expense?.metodo_pago_sat || 'PUE', // Default: Pago en Una Exhibición
    forma_pago_sat: expense?.forma_pago_sat || '99', // Default: 99 = Por definir
    lugar_expedicion: expense?.lugar_expedicion || '',
    moneda: expense?.moneda || 'MXN',
    tipo_cambio: expense?.tipo_cambio || 1,
    // Información adicional del establecimiento
    telefono_proveedor: expense?.telefono_proveedor || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string>(''); // NUEVO: Estado del progreso OCR
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [showSATFields, setShowSATFields] = useState(false); // NUEVO: Controlar colapso de datos fiscales SAT
  
  /**
   * 🕐 Valida formato de hora HH:MM o HH:MM:SS
   * Previene errores como "70:22" en PostgreSQL
   */
  const validateTimeFormat = (time: string): string | null => {
    if (!time) return null;
    
    // Regex: HH:MM o HH:MM:SS (00-23 horas, 00-59 minutos/segundos)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
    
    const trimmed = time.trim();
    return timeRegex.test(trimmed) ? trimmed : null;
  };
  
  // 🆕 ESTADOS SEPARADOS PARA XML Y ARCHIVO VISUAL
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [visualFile, setVisualFile] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null); // Mantener para compatibilidad
  
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(expense?.archivo_adjunto || null); // 📎 NUEVO: Archivo existente
  const [isDragging, setIsDragging] = useState(false); // NUEVO: Estado del drag & drop
  // ❌ GEMINI AI DESACTIVADO: API Key incompatible con Gemini REST API
  // const [useGeminiAI, setUseGeminiAI] = useState(false);

  const { data: categories } = useExpenseCategories();
  const { data: cuentasContables } = useCuentasContables();
  const { data: users } = useUsers();

  // 🔒 Filtrar cuentas bancarias solo para gastos (id <= 23) según reglas de negocio
  const filteredCuentas = useMemo(() => {
    if (!cuentasContables) return [];
    
    if (BUSINESS_RULES.limitBankAccountsForExpenses) {
      // Solo mostrar cuentas con id <= 23 para gastos
      return cuentasContables.filter(c => {
        const cuentaId = parseInt(c.id);
        return cuentaId <= BUSINESS_RULES.maxBankAccountIdForExpenses;
      });
    }
    
    return cuentasContables;
  }, [cuentasContables]);

  // Cálculos simplificados - Solo total
  const total = formData.total;
  const iva_factor = 1 + (formData.iva_porcentaje / 100);
  const subtotal = total / iva_factor;
  const iva = total - subtotal;



  // 🧹 FUNCIÓN DE LIMPIEZA DE NOMBRES DE PRODUCTOS (OCR)
  const cleanProductName = (raw: string): string => {
    let cleaned = raw
      // Eliminar símbolos de inicio (==, |, I, -, números con decimales)
      .replace(/^[=\-|I\s]+/, '')
      // Eliminar números de inicio (ej: "1 PRODUCTO" → "PRODUCTO", "0.160000 DESC" → "DESC")
      .replace(/^\d+(\.\d+)?\s+/, '')
      // Eliminar patrones comunes de OCR al inicio (ej: "pr ", "I ", "| ")
      .replace(/^(pr|I|l)\s+/i, '')
      // Normalizar espacios múltiples
      .replace(/\s+/g, ' ')
      .trim();
    
    // Capitalizar primera letra de cada palabra
    cleaned = cleaned.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return cleaned;
  };

  const extractMexicanTicketData = (text: string): OCRData => {
    console.log('🔍 Iniciando mapeo inteligente de datos...');

    // 🔧 CONSOLIDAR LÍNEAS FRAGMENTADAS
    // Google Vision a veces devuelve cada palabra en su propia línea
    const rawLines = text.split('\n').map(line => line.trim()).filter(line => line);

    console.log('📋 Líneas crudas recibidas:', rawLines.length);
    console.log('📄 Muestra de líneas crudas:', rawLines.slice(0, 10));

    // Consolidar líneas muy cortas (fragmentos) con la línea anterior
    const consolidatedLines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      // Ignorar líneas de basura completa
      if (
        line.length === 1 && !/[a-zA-Z0-9]/.test(line) || // Solo símbolos
        line.match(/^[_\-\s.]+$/) || // Solo guiones, puntos, espacios
        line.match(/^[^\w\s]{2,}$/) || // Solo símbolos raros (2+ caracteres)
        line === 'hike ae' || // Basura conocida del OCR
        line.match(/^[a-z]\s[A-Z]$/) || // Fragmentos tipo "e.", "y i"
        line.match(/^(qi|ae|Ti|BRL)$/i) // Palabras sin sentido conocidas
      ) {
        continue;
      }

      // Si la línea es muy corta (< 5 caracteres) y no es un número completo, concatenar
      if (line.length < 5 && !line.match(/^\d+\.?\d*$/)) {
        currentLine += (currentLine ? ' ' : '') + line;
      } else {
        // Guardar la línea acumulada si existe
        if (currentLine) {
          consolidatedLines.push(currentLine);
        }
        currentLine = line;
      }
    }

    // Agregar la última línea acumulada
    if (currentLine) {
      consolidatedLines.push(currentLine);
    }

    // Filtrar líneas finales: mínimo 2 caracteres y con contenido válido
    const lines = consolidatedLines.filter(line => {
      return (
        line.length > 1 &&
        line.trim().length > 0 &&
        !/^[^\w\s]+$/.test(line) // No solo símbolos
      );
    });

    console.log('✅ Líneas consolidadas:', lines.length);
    console.log('📄 Muestra de líneas consolidadas:', lines.slice(0, 15));
    
    const data: OCRData = {
      establecimiento: null,
      rfc: null,
      telefono: null,
      fecha: null,
      hora: null,
      total: null,
      subtotal: null,
      iva: null,
      forma_pago: null,
      concepto_sugerido: null,
      categoria_sugerida: null,
      productos: []
    };

    console.log('📄 Líneas procesadas:', lines);

    // 1. ESTABLECIMIENTO - Buscar en las primeras líneas, evitar números y palabras clave
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (line.length > 4 && 
          !line.match(/^\d+\.?\d*$/) && // No solo números
          !line.match(/rfc|total|subtotal|iva|fecha|hora|folio|ticket|factura/i) &&
          !line.match(/^\$/) && // No precios
          line.match(/[a-zA-Z]/) && // Contiene letras
          line.length < 50) { // No muy largo
        data.establecimiento = line.toUpperCase();
        console.log('🏪 Establecimiento encontrado:', data.establecimiento);
        break;
      }
    }

    // 2. RFC - Mejorado para priorizar RFC del EMISOR (primeras 10 líneas)
    const rfcPatterns = [
      /r\.?f\.?c\.?[:\s]*([A-Z&Ñ]{3,4}[-\s]?\d{6}[-\s]?[A-Z0-9]{2,3})/gi,  // Con "R.F.C." explícito (GLOBAL)
      /\b([A-Z&Ñ]{3,4}[-\s]?\d{6}[-\s]?[A-Z0-9]{2,3})\b/g      // Sin "RFC"
    ];
    
    // Buscar SOLO en las primeras 10 líneas (donde está el emisor)
    const primerasLineas = lines.slice(0, 10).join('\n');
    
    for (const pattern of rfcPatterns) {
      const matches = [...primerasLineas.matchAll(pattern)];
      if (matches.length > 0) {
        for (const match of matches) {
          // Limpiar el RFC
          let rfc = (match[1] || match[0]).replace(/r\.?f\.?c\.?[:\s]*/i, '').trim();
          rfc = rfc.replace(/[-\s]/g, ''); // Quitar guiones y espacios
          
          // Ignorar RFCs genéricos (XAXX, XXXX, etc.)
          if (rfc.startsWith('XAXX') || rfc.startsWith('XXXX')) {
            console.log('⚠️ RFC genérico ignorado:', rfc);
            continue;
          }
          
          // Validar longitud (12-13 caracteres)
          if (rfc.length >= 12 && rfc.length <= 13 && rfc.match(/^[A-Z&Ñ]{3,4}\d{6}/)) {
            data.rfc = rfc.toUpperCase();
            console.log('📄 RFC encontrado (emisor):', data.rfc);
            break;
          }
        }
        if (data.rfc) break;
      }
    }

    // 3. TOTAL - Búsqueda más inteligente
    console.log('💰 Buscando totales...');
    const numerosEncontrados: Array<{valor: number, fuente: string, prioridad: number}> = [];
    
    // Helper: Validar y corregir total con texto en palabras (OCR mexicano)
    const validarYCorregirTotal = (valor: number): number | null => {
      const textLower = text.toLowerCase();
      
      // Buscar "SON: [número en palabras]"
      const textoEnPalabras = /son[:\s]*([\w\s]+)\s*pesos/i.exec(textLower);
      
      if (textoEnPalabras) {
        const palabras = textoEnPalabras[1].toLowerCase();
        
        // Detectar si menciona "mil"
        const tieneMil = palabras.includes('mil');
        const tieneOchocientos = palabras.includes('ochocientos');
        
        // 895 = ochocientos noventa y cinco (sin "mil")
        // 1895 = mil ochocientos noventa y cinco (con "mil")
        
        // Si el valor es 1895 pero el texto NO menciona "mil", es un error de OCR
        if (valor >= 1000 && !tieneMil && tieneOchocientos) {
          // Corregir automáticamente: 1895 → 895
          const valorCorregido = parseInt(valor.toString().substring(1));
          console.log(`🔧 Valor ${valor} corregido a ${valorCorregido}: texto dice "${palabras}" (sin "mil")`);
          return valorCorregido;
        }
        
        if (valor < 1000 && tieneMil) {
          console.log(`⚠️ Valor ${valor} rechazado: texto dice "${palabras}" (con "mil")`);
          return null;
        }
        
        console.log(`✅ Valor ${valor} validado con texto: "${palabras}"`);
        return valor;
      }
      
      // Si no hay texto en palabras, aceptar el valor como está
      return valor;
    };
    
    // Patrones específicos para totales con prioridades MUY ALTAS
    const totalPatterns = [
      // MÁXIMA PRIORIDAD: "TOTALMXN 4,139.10" o "TOTAL MXN 4,139"
      { pattern: /total\s*mxn[:\s]*\$?\s*([0-9,]+\.?\d{0,2})/gi, prioridad: 105 },
      
      // MÁXIMA PRIORIDAD: Líneas que contienen SOLO "TOTAL" + cantidad
      { pattern: /^TOTAL\s*\$?\s*([0-9,]+\.?\d{0,2})\s*$/gim, prioridad: 100 },
      { pattern: /\bTOTAL\s*\$\s*([0-9,]+\.?\d{0,2})\b/gi, prioridad: 95 },
      
      // Alta prioridad: Total con dos puntos
      { pattern: /total[:\s]+\$?\s*([0-9,]+\.?\d{0,2})/gi, prioridad: 90 },
      { pattern: /a\s*pagar[:\s]+\$?\s*([0-9,]+\.?\d{0,2})/gi, prioridad: 85 },
      
      // Prioridad media: Cantidad después de palabra clave
      { pattern: /neto[:\s]*\$?\s*([0-9,]+\.?\d{0,2})/gi, prioridad: 70 },
      { pattern: /monto[:\s]*\$?\s*([0-9,]+\.?\d{0,2})/gi, prioridad: 70 },
      
      // BAJA prioridad: "IMPORTE" (puede ser encabezado de columna)
      { pattern: /\bimporte\b[:\s]+\$?\s*([0-9,]+\.?\d{0,2})/gi, prioridad: 40 },
    ];
    
    // 🔍 MÉTODO ESPECIAL: Buscar "TOTALMXN" como encabezado y valor en líneas cercanas
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (line === 'TOTALMXN' || line === 'TOTAL MXN' || line === 'TOTAL:' || 
          line.includes('TOTAL') && line.includes('MXN')) {
        // Buscar valor numérico en las siguientes 5 líneas o en la misma línea
        
        // Primero: Verificar si está en la misma línea (ej: "TOTALMXN 4,139.19")
        const sameLine = line.match(/([0-9,]+\.?\d{2,})/);
        if (sameLine) {
          const valorStr = sameLine[1];
          const valor = parseFloat(valorStr.replace(/,/g, ''));
          if (!isNaN(valor) && valor > 100 && valor < 999999) {
            numerosEncontrados.push({
              valor: valor,
              fuente: `${line} (misma línea)`,
              prioridad: 110 // MÁXIMA PRIORIDAD
            });
            console.log(`💵 TOTAL MXN encontrado en misma línea (prioridad 110):`, valor);
            break;
          }
        }
        
        // Segundo: Buscar en las siguientes líneas
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const nextLine = lines[j].trim();
          // Buscar patrón: números con posible coma y punto decimal
          const valorMatch = nextLine.match(/^\$?\s*([0-9,]+\.\d{2})$/);
          if (valorMatch) {
            const valorStr = valorMatch[1];
            const valor = parseFloat(valorStr.replace(/,/g, ''));
            if (!isNaN(valor) && valor > 100 && valor < 999999) {
              numerosEncontrados.push({
                valor: valor,
                fuente: `TOTAL MXN (${j - i} líneas después)`,
                prioridad: 110 // MÁXIMA PRIORIDAD
              });
              console.log(`💵 TOTAL MXN encontrado ${j - i} líneas después (prioridad 110):`, valor, 'línea:', nextLine);
              break;
            }
          }
        }
        break;
      }
    }

    // Buscar con patrones específicos
    for (const {pattern, prioridad} of totalPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        if (!match[1]) continue; // Saltar si no hay grupo de captura
        
        const numStrOriginal = match[1];
        let valorAjustado = 0;
        
        // Detectar si la coma es separador decimal (formato 189,00)
        if (numStrOriginal.includes(',') && !numStrOriginal.includes('.')) {
          const partes = numStrOriginal.split(',');
          if (partes.length === 2 && partes[1].length <= 2) {
            // Formato decimal con coma (189,00 = 189.00)
            valorAjustado = parseFloat(partes[0] + '.' + partes[1]);
          } else {
            // Coma como separador de miles
            valorAjustado = parseFloat(numStrOriginal.replace(/,/g, ''));
          }
        } else {
          // Formato estándar
          valorAjustado = parseFloat(numStrOriginal.replace(/,/g, ''));
        }
        
        if (!isNaN(valorAjustado) && valorAjustado > 1 && valorAjustado < 999999) {
          // Validar y corregir con texto en palabras antes de agregar
          const valorValidado = validarYCorregirTotal(valorAjustado);
          if (valorValidado !== null) {
            numerosEncontrados.push({
              valor: valorValidado,
              fuente: match[0],
              prioridad: prioridad
            });
            console.log(`💵 TOTAL encontrado (prioridad ${prioridad}):`, valorValidado, 'desde:', match[0]);
          }
        }
      }
    }

    // Buscar números que terminen líneas SOLO si no encontramos total explícito
    if (numerosEncontrados.length === 0) {
      for (const line of lines) {
        // Evitar líneas que claramente no son totales
        if (line.toLowerCase().includes('folio') || 
            line.toLowerCase().includes('fecha') || 
            line.toLowerCase().includes('hora')) {
          continue;
        }
        
        const numeroFinal = line.match(/([0-9,]+\.?\d{0,2})\s*$/);
        if (numeroFinal) {
          const numStrOriginal = numeroFinal[1];
          let valorAjustado = 0;
          
          // Detectar si la coma es separador decimal (formato 189,00)
          if (numStrOriginal.includes(',') && !numStrOriginal.includes('.')) {
            const partes = numStrOriginal.split(',');
            if (partes.length === 2 && partes[1].length <= 2) {
              // Formato decimal con coma (189,00 = 189.00)
              valorAjustado = parseFloat(partes[0] + '.' + partes[1]);
            } else {
              // Coma como separador de miles
              valorAjustado = parseFloat(numStrOriginal.replace(/,/g, ''));
            }
          } else {
            // Formato estándar
            valorAjustado = parseFloat(numStrOriginal.replace(/,/g, ''));
          }
          
          if (!isNaN(valorAjustado) && valorAjustado > 10 && valorAjustado < 99999) {
            numerosEncontrados.push({
              valor: valorAjustado,
              fuente: line,
              prioridad: 1 // Baja prioridad para números al final
            });
            console.log('💵 Número al final de línea:', valorAjustado, 'desde:', line);
          }
        }
      }
    }

    // Si encontramos números, tomar el de mayor prioridad
    if (numerosEncontrados.length > 0) {
      // Ordenar por prioridad descendente, luego por MAYOR valor
      numerosEncontrados.sort((a, b) => {
        if (a.prioridad !== b.prioridad) {
          return b.prioridad - a.prioridad;
        }
        // 🎯 REGLA CRÍTICA: Si tienen igual prioridad, tomar el MAYOR valor
        // (en facturas mexicanas, TOTAL FINAL = Subtotal + IVA, siempre el más grande)
        return b.valor - a.valor;
      });
      
      console.log('🔢 Números encontrados ordenados por prioridad:', numerosEncontrados);
      console.log('🎯 Top 3 candidatos:', numerosEncontrados.slice(0, 3));
      
      // 🔧 VALIDACIÓN EXTRA: Si el primer candidato es muy pequeño comparado con otros,
      // probablemente sea un error (ej: detectó IVA como "TOTAL")
      if (numerosEncontrados.length >= 2) {
        const candidato1 = numerosEncontrados[0];
        const candidato2 = numerosEncontrados[1];
        
        // Si el segundo candidato es >70% más grande y tienen prioridades similares (diff < 20)
        const diffPrioridad = Math.abs(candidato1.prioridad - candidato2.prioridad);
        const ratio = candidato2.valor / candidato1.valor;
        
        if (diffPrioridad < 20 && ratio > 1.7) {
          console.log(`⚠️ Candidato principal (${candidato1.valor}) es muy pequeño comparado con segundo (${candidato2.valor})`);
          console.log(`   Ratio: ${ratio.toFixed(2)}x - Usando el MAYOR como total`);
          data.total = candidato2.valor;
          console.log('✅ Total seleccionado (MAYOR):', data.total, 'desde:', candidato2.fuente);
        } else {
          data.total = candidato1.valor;
          console.log('✅ Total seleccionado (prioridad):', data.total, 'desde:', candidato1.fuente);
        }
      } else {
        data.total = numerosEncontrados[0].valor;
        console.log('✅ Total seleccionado:', data.total, 'desde:', numerosEncontrados[0].fuente);
      }
    }

    // 4. FECHA - Priorizar fecha de CFDI (formato ISO con hora)
    const fechaPatterns = [
      // MÁXIMA PRIORIDAD: Formato ISO con hora (CFDI): "2025-03-19T16:36:47"
      { pattern: /(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}/g, prioridad: 100 },
      // Formato mexicano con mes en texto: "04/Jun/2025"
      { pattern: /fecha[:\s]*(\d{1,2})[/\-]([A-Za-z]{3})[/\-](\d{4})/gi, prioridad: 90 },
      // Formato ISO con palabra "fecha": "fecha: 2025-06-04"
      { pattern: /fecha[:\s]*(\d{4})[-/](\d{2})[-/](\d{2})/gi, prioridad: 85 },
      // Formato DD/MM/YYYY con palabra "fecha"
      { pattern: /fecha[:\s]*(\d{1,2})[-/](\d{1,2})[-/](\d{4})/gi, prioridad: 80 },
      // Sin palabra clave (baja prioridad)
      { pattern: /(\d{4})[-/](\d{2})[-/](\d{2})/g, prioridad: 50 },
      { pattern: /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/g, prioridad: 40 }
    ];
    
    // Ordenar por prioridad y tomar la primera
    const fechasEncontradas: Array<{fecha: string, prioridad: number, fuente: string}> = [];
    
    for (const {pattern, prioridad} of fechaPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const fullMatch = match[0];
        let fechaFormateada = '';
        
        // Si es formato ISO (YYYY-MM-DD)
        if (match[1] && match[2] && match[3] && match[1].length === 4) {
          const año = match[1];
          const mes = match[2];
          const dia = match[3];
          fechaFormateada = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
          fechasEncontradas.push({ fecha: fechaFormateada, prioridad, fuente: fullMatch });
        }
        // Si es formato DD/MM/YYYY
        else if (match[1] && match[2] && match[3] && match[3].length === 4) {
          const dia = match[1];
          const mes = match[2];
          const año = match[3];
          
          // Convertir mes texto si existe
          if (/[A-Za-z]/.test(mes)) {
            const meses: Record<string, string> = {
              'ene': '01', 'jan': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'apr': '04',
              'may': '05', 'jun': '06', 'jul': '07', 'ago': '08', 'aug': '08',
              'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12', 'dec': '12'
            };
            const mesNumero = meses[mes.toLowerCase()] || '01';
            fechaFormateada = `${año}-${mesNumero}-${dia.padStart(2, '0')}`;
          } else {
            fechaFormateada = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
          }
          fechasEncontradas.push({ fecha: fechaFormateada, prioridad, fuente: fullMatch });
        }
      }
    }
    
    // Ordenar por prioridad y tomar la mejor
    if (fechasEncontradas.length > 0) {
      fechasEncontradas.sort((a, b) => b.prioridad - a.prioridad);
      data.fecha = fechasEncontradas[0].fecha;
      console.log('📅 Fecha encontrada y convertida:', data.fecha, `(desde ${fechasEncontradas[0].fuente}, prioridad ${fechasEncontradas[0].prioridad})`);
    }

    // 5. HORA
    const horaMatches = [...text.matchAll(/(\d{1,2}:\d{2}(?::\d{2})?)/g)];
    if (horaMatches.length > 0) {
      data.hora = horaMatches[0][1];
      console.log('🕐 Hora encontrada:', data.hora);
    }

    // 6. SUBTOTAL e IVA - Búsqueda mejorada en líneas separadas
    // 🔍 Buscar SUBTOTAL en línea separada
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (line === 'SUBTOTAL' || line.startsWith('SUBTOTAL')) {
        // Buscar valor en las siguientes líneas
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const valorLine = lines[j].trim();
          const valorMatch = valorLine.match(/^\$?\s*([0-9,]+\.\d{2})$/);
          if (valorMatch) {
            const valor = parseFloat(valorMatch[1].replace(/,/g, ''));
            if (!isNaN(valor) && valor > 10 && valor < 999999) {
              data.subtotal = valor;
              console.log(`📊 SUBTOTAL encontrado en línea separada:`, valor);
              break;
            }
          }
        }
        if (data.subtotal) break;
      }
    }
    
    // 🔍 Buscar IVA en línea separada
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if ((line.includes('IVA') || line.includes('I.V.A')) && line.includes('16')) {
        // Buscar valor en las siguientes líneas
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const valorLine = lines[j].trim();
          const valorMatch = valorLine.match(/^\$?\s*([0-9,]+\.\d{2})$/);
          if (valorMatch) {
            const valor = parseFloat(valorMatch[1].replace(/,/g, ''));
            if (!isNaN(valor) && valor > 1 && valor < 999999) {
              data.iva = valor;
              console.log(`📊 IVA encontrado en línea separada:`, valor);
              break;
            }
          }
        }
        if (data.iva) break;
      }
    }
    
    // 🧮 Si tenemos total y subtotal, calcular IVA
    if (data.total && data.subtotal && !data.iva) {
      data.iva = Math.round((data.total - data.subtotal) * 100) / 100;
      console.log('🧮 IVA calculado desde total y subtotal:', data.iva);
    }
    
    // 🧮 Si tenemos total e IVA, calcular subtotal
    if (data.total && data.iva && !data.subtotal) {
      data.subtotal = Math.round((data.total - data.iva) * 100) / 100;
      console.log('🧮 Subtotal calculado desde total e IVA:', data.subtotal);
    }
    
    // 🧮 Si solo tenemos total, calcular asumiendo IVA 16%
    if (data.total && !data.subtotal && !data.iva) {
      data.subtotal = Math.round((data.total / 1.16) * 100) / 100;
      data.iva = Math.round((data.total - data.subtotal) * 100) / 100;
      console.log('🧮 Subtotal e IVA calculados (IVA 16%):', data.subtotal, 'IVA:', data.iva);
    }

    // 7. FORMA DE PAGO
    const pagoPatterns = [
      /tarjeta|card|débito|crédito/i,
      /efectivo|cash/i,
      /transfer/i
    ];
    
    for (const pattern of pagoPatterns) {
      if (text.match(pattern)) {
        if (pattern.source.includes('tarjeta|card')) data.forma_pago = 'TARJETA';
        else if (pattern.source.includes('efectivo')) data.forma_pago = 'EFECTIVO';
        else if (pattern.source.includes('transfer')) data.forma_pago = 'TRANSFERENCIA';
        console.log('💳 Forma de pago encontrada:', data.forma_pago);
        break;
      }
    }

    // 7B. INFORMACIÓN DEL ESTABLECIMIENTO (adicional)
    console.log('🏪 Extrayendo información adicional del establecimiento...');
    
    // Teléfono (10 dígitos mexicanos o con formato)
    const telefonoPatterns = [
      /tel(?:éfono|efono)?[:\s]*(\d{10})/i,
      /tel(?:éfono|efono)?[:\s]*(\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})/i,
      /\b(\d{10})\b/g, // 10 dígitos consecutivos
      /\b(\d{2,3}[-\s]\d{3,4}[-\s]\d{4})\b/g // Con guiones o espacios
    ];
    
    for (const pattern of telefonoPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const telefono = match[1].replace(/[-\s]/g, ''); // Limpiar
        if (telefono.length === 10 && /^\d{10}$/.test(telefono)) {
          data.telefono_proveedor = telefono;
          console.log('📞 Teléfono encontrado:', data.telefono_proveedor);
          break;
        }
      }
    }
    
    // Dirección (líneas con calle, número, colonia, CP)
    const direccionPatterns = [
      /(?:calle|av|avenida|calz|calzada)[:\s]+(.+?)(?=\n|$)/i,
      /(?:domicilio|dirección|direccion)[:\s]+(.+?)(?=\n|$)/i,
      /(?:colonia|col)[:\s]+(.+?)(?=\n|$)/i,
      /\b\d{5}\b/g // Código postal
    ];
    
    const direccionPartes: string[] = [];
    for (const pattern of direccionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        direccionPartes.push(match[1].trim());
      }
    }
    
    if (direccionPartes.length > 0) {
      data.direccion_proveedor = direccionPartes.join(', ');
      console.log('📍 Dirección encontrada:', data.direccion_proveedor);
    }
    
    // Email
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatch = text.match(emailPattern);
    if (emailMatch && emailMatch.length > 0) {
      data.email_proveedor = emailMatch[0].toLowerCase();
      console.log('📧 Email encontrado:', data.email_proveedor);
    }
    
    // Información general del establecimiento (sucursal, horario, etc.)
    const infoEstablecimiento: string[] = [];
    
    // Sucursal
    const sucursalPattern = /sucursal[:\s]+(.+?)(?=\n|$)/i;
    const sucursalMatch = text.match(sucursalPattern);
    if (sucursalMatch && sucursalMatch[1]) {
      infoEstablecimiento.push(`Sucursal: ${sucursalMatch[1].trim()}`);
      console.log('🏢 Sucursal encontrada:', sucursalMatch[1].trim());
    }
    
    // Horario
    const horarioPattern = /horario[:\s]+(.+?)(?=\n|$)/i;
    const horarioMatch = text.match(horarioPattern);
    if (horarioMatch && horarioMatch[1]) {
      infoEstablecimiento.push(`Horario: ${horarioMatch[1].trim()}`);
      console.log('🕐 Horario encontrado:', horarioMatch[1].trim());
    }
    
    if (infoEstablecimiento.length > 0) {
      data.establecimiento_info = infoEstablecimiento.join(' | ');
      console.log('ℹ️ Info adicional establecimiento:', data.establecimiento_info);
    }
    
    console.log('✅ Información del establecimiento extraída completamente');
    
    // 7C. CAMPOS SAT ADICIONALES
    console.log('📋 Extrayendo campos SAT CFDI...');
    
    // UUID CFDI (36 caracteres, formato 8-4-4-4-12)
    const uuidPattern = /[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i;
    const uuidMatch = text.match(uuidPattern);
    if (uuidMatch) {
      data.uuid_cfdi = uuidMatch[0].toUpperCase();
      console.log('🆔 UUID CFDI encontrado:', data.uuid_cfdi);
    }
    
    // Tipo de Comprobante (I, E, T, N, P)
    const tipoComprobantePattern = /tipo\s*de\s*comprobante[:\s]*([IETNP])\s*-\s*(\w+)/i;
    const tipoComprobanteMatch = text.match(tipoComprobantePattern);
    if (tipoComprobanteMatch) {
      data.tipo_comprobante = tipoComprobanteMatch[1].toUpperCase();
      console.log('📝 Tipo de Comprobante encontrado:', data.tipo_comprobante, '-', tipoComprobanteMatch[2]);
    }
    
    // Serie y Folio
    const seriePattern = /serie[:\s]*([A-Z0-9]+)/i;
    const serieMatch = text.match(seriePattern);
    if (serieMatch) {
      data.serie = serieMatch[1].toUpperCase();
      console.log('📄 Serie encontrada:', data.serie);
    }
    
    const folioPattern = /folio[:\s]*(\d+)/i;
    const folioMatch = text.match(folioPattern);
    if (folioMatch) {
      data.folio = folioMatch[1];
      console.log('🔢 Folio encontrado:', data.folio);
    }
    
    // Folio Fiscal - Puede venir después de "FOLIO FISCAL UUID" o solo "FOLIO FISCAL:"
    // Si ya tenemos UUID, usar ese como folio fiscal
    if (data.uuid_cfdi && !data.folio_fiscal) {
      data.folio_fiscal = data.uuid_cfdi;
      console.log('📋 Folio Fiscal (desde UUID):', data.folio_fiscal);
    } else {
      // Buscar patrón "FOLIO FISCAL UUID [uuid]" o "FOLIO FISCAL: [uuid]"
      const folioFiscalPattern = /folio\s*fiscal(?:\s*uuid)?[:\s]*([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/i;
      const folioFiscalMatch = text.match(folioFiscalPattern);
      if (folioFiscalMatch) {
        data.folio_fiscal = folioFiscalMatch[1].toUpperCase();
        console.log('📋 Folio Fiscal encontrado:', data.folio_fiscal);
      }
    }
    
    // Método de Pago SAT (PUE o PPD)
    const metodoPagoPattern = /método\s*de\s*pago[:\s]*(PUE|PPD)/i;
    const metodoPagoMatch = text.match(metodoPagoPattern);
    if (metodoPagoMatch) {
      data.metodo_pago_sat = metodoPagoMatch[1].toUpperCase();
      console.log('💳 Método de Pago SAT:', data.metodo_pago_sat);
    }
    
    // Forma de Pago SAT (código 01-99)
    const formaPagoSatPattern = /forma\s*de\s*pago[:\s]*(\d{2})/i;
    const formaPagoSatMatch = text.match(formaPagoSatPattern);
    if (formaPagoSatMatch) {
      data.forma_pago_sat = formaPagoSatMatch[1];
      console.log('💰 Forma de Pago SAT:', data.forma_pago_sat);
    } else {
      // Inferir de la forma de pago detectada
      if (data.forma_pago === 'EFECTIVO') data.forma_pago_sat = '01';
      else if (data.forma_pago === 'TRANSFERENCIA') data.forma_pago_sat = '03';
      else if (data.forma_pago === 'TARJETA') data.forma_pago_sat = '04';
      if (data.forma_pago_sat) {
        console.log('💰 Forma de Pago SAT inferida:', data.forma_pago_sat);
      }
    }
    
    // Uso CFDI - Ampliado para incluir S01, G03, D01, etc.
    const usoCfdiPattern = /uso\s*(?:de\s*)?cfdi[:\s]*([A-Z]\d{2})/i;
    const usoCfdiMatch = text.match(usoCfdiPattern);
    if (usoCfdiMatch) {
      data.uso_cfdi = usoCfdiMatch[1].toUpperCase();
      console.log('📊 Uso CFDI encontrado:', data.uso_cfdi);
    }
    
    // Régimen Fiscal Receptor
    const regimenPattern = /régimen\s*fiscal[:\s]*(\d{3})/i;
    const regimenMatch = text.match(regimenPattern);
    if (regimenMatch) {
      data.regimen_fiscal_receptor = regimenMatch[1];
      console.log('🏛️ Régimen Fiscal Receptor:', data.regimen_fiscal_receptor);
    }
    
    // Lugar de Expedición (código postal) - Varios formatos
    const lugarPatterns = [
      /lugar\s*(?:de\s*)?expedición[:\s]*\(?(?:C\.?P\.?\s*)?(\d{5})\)?/i,
      /\(C\.?P\.?\)\s*(\d{5})/i,
      /C\.?P\.?\s*(\d{5})/i
    ];
    
    for (const pattern of lugarPatterns) {
      const lugarMatch = text.match(pattern);
      if (lugarMatch) {
        data.lugar_expedicion = lugarMatch[1];
        console.log('📍 Lugar de Expedición:', data.lugar_expedicion);
        break;
      }
    }
    
    // Moneda (MXN, USD, EUR)
    const monedaPattern = /moneda[:\s]*(MXN|USD|EUR)/i;
    const monedaMatch = text.match(monedaPattern);
    if (monedaMatch) {
      data.moneda = monedaMatch[1].toUpperCase();
      console.log('💱 Moneda:', data.moneda);
    } else {
      data.moneda = 'MXN'; // Por defecto
    }
    
    // Tipo de Cambio
    const tipoCambioPattern = /tipo\s*de\s*cambio[:\s]*([\d.]+)/i;
    const tipoCambioMatch = text.match(tipoCambioPattern);
    if (tipoCambioMatch) {
      data.tipo_cambio = parseFloat(tipoCambioMatch[1]);
      console.log('💹 Tipo de Cambio:', data.tipo_cambio);
    } else {
      data.tipo_cambio = 1; // Por defecto para MXN
    }
    
    console.log('✅ Campos SAT extraídos completamente');

    // 8. EXTRAER PRODUCTOS DEL TICKET (MÉTODO MEJORADO PARA CFDI)
    console.log('🛒 Extrayendo productos del ticket (Formato CFDI)...');
    console.log('📋 Total de líneas a procesar:', lines.length);
    
    const productosTemp: Array<{
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
      total: number;
    }> = [];
    
    // 🔍 PASO 1: Buscar descripción entre "DESCRIPCIÓN DEL PRODUCTO" y "FORMA PAGO"
    let descripcionInicio = -1;
    let descripcionFin = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (line.includes('DESCRIPCIÓN') && line.includes('PRODUCTO')) {
        descripcionInicio = i + 1;
        console.log(`📍 Inicio descripción en línea ${descripcionInicio}`);
      }
      if (descripcionInicio > 0 && (line.includes('FORMA') && line.includes('PAGO'))) {
        descripcionFin = i;
        console.log(`📍 Fin descripción en línea ${descripcionFin}`);
        break;
      }
    }
    
    // Extraer descripción
    let descripcionProducto = '';
    if (descripcionInicio > 0 && descripcionFin > descripcionInicio) {
      const descripcionLineas = [];
      for (let i = descripcionInicio; i < descripcionFin; i++) {
        const line = lines[i].trim();
        // Ignorar líneas de encabezados o códigos
        if (line && 
            !line.match(/^\d{5,}$/) && // Ignorar códigos largos
            !line.match(/^[A-Z0-9]{2}-[A-Z0-9]/) && // Ignorar códigos con guiones
            line.length > 3) {
          descripcionLineas.push(line);
        }
      }
      descripcionProducto = descripcionLineas.join(' ').trim();
      console.log(`✅ Descripción extraída: "${descripcionProducto}"`);
    }
    
    // 🔍 PASO 2: Buscar cantidad en "CANTIDAD/UNIDAD"
    let cantidad = 1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const upperLine = line.toUpperCase();
      
      if (upperLine.includes('CANTIDAD') && upperLine.includes('UNIDAD')) {
        // La siguiente línea debería tener la cantidad
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const cantMatch = nextLine.match(/^(\d+)/);
          if (cantMatch) {
            cantidad = parseInt(cantMatch[1]);
            console.log(`✅ Cantidad extraída: ${cantidad}`);
          }
        }
        break;
      }
    }
    
    // 🔍 PASO 3: Buscar precio en "IMPORTE" o "PRECIO UNITARIO"
    let precioUnitario = 0;
    let importeTotal = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const upperLine = line.toUpperCase();
      
      // Buscar después de "IMPORTE" (último encabezado antes del valor)
      if (upperLine === 'IMPORTE' || upperLine === 'PRECIO UNITARIO') {
        // Buscar valor en las siguientes 3 líneas
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const valorLine = lines[j].trim();
          // Buscar patrón: números con coma como separador de miles
          const precioMatch = valorLine.match(/^[\d,]+\.?\d{0,2}$/);
          if (precioMatch) {
            const precioStr = precioMatch[0].replace(/,/g, '');
            const precio = parseFloat(precioStr);
            
            if (precio > 10 && precio < 999999) {
              if (upperLine === 'PRECIO UNITARIO') {
                precioUnitario = precio;
                console.log(`✅ Precio unitario: $${precioUnitario}`);
              } else {
                importeTotal = precio;
                console.log(`✅ Importe total: $${importeTotal}`);
              }
              break;
            }
          }
        }
      }
    }
    
    // 🔍 PASO 4: Construir producto
    if (descripcionProducto && (precioUnitario > 0 || importeTotal > 0)) {
      const precioFinal = precioUnitario > 0 ? precioUnitario : importeTotal;
      
      const producto = {
        descripcion: descripcionProducto,
        cantidad: cantidad,
        precio_unitario: precioFinal,
        total: precioFinal * cantidad
      };
      
      productosTemp.push(producto);
      console.log(`✅ Producto CFDI agregado:`, producto);
    } else {
      console.warn('⚠️ No se pudo construir producto CFDI completo');
      console.warn(`   Descripción: "${descripcionProducto}"`);
      console.warn(`   Cantidad: ${cantidad}`);
      console.warn(`   Precio Unit: ${precioUnitario}`);
      console.warn(`   Importe: ${importeTotal}`);
    }
    
    // FALLBACK: Método antiguo si no se encontró producto
    if (productosTemp.length === 0) {
      console.log('⚠️ Intentando método de extracción antiguo...');
      
      let enSeccionProductos = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const upperLine = line.toUpperCase();
        
        if (upperLine.includes('DESCRIP') && upperLine.includes('PRODUCTO')) {
          enSeccionProductos = true;
          continue;
        }
        
        if (upperLine.includes('SUBTOTAL') || upperLine.includes('FORMA PAGO')) {
          break;
        }
        
        if (!enSeccionProductos) continue;
        
        // Buscar líneas con precio
        const priceMatches = line.match(/\$(\d+\.?\d*)|(\d+\.\d{2})$/);
        if (!priceMatches) {
          continue;
        }
        
        const precio = parseFloat(priceMatches[1] || priceMatches[2]);
        if (precio <= 0 || precio > 999999) {
          continue;
        }
        
        const priceIndex = priceMatches.index || line.lastIndexOf('$');
        let descripcion = line.substring(0, priceIndex).trim();
        
        let cantidad = 1;
        const cantidadMatch = descripcion.match(/^(\d+)\s+/);
        if (cantidadMatch) {
          cantidad = parseInt(cantidadMatch[1]);
          descripcion = descripcion.replace(/^\d+\s+/, '').trim();
        }
        
        descripcion = descripcion
          .replace(/^\d+x?\s*/i, '')
          .replace(/\$\d+\.?\d*/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (descripcion.length < 2 || descripcion.length > 100) {
          continue;
        }
        
        // Ignorar encabezados
        if (
          /^(CANT|CANTIDAD|DESC|IMPORTE|PRECIO|TOTAL|SUMA)/i.test(descripcion) ||
          /^[\d\s\$\.,]+$/.test(descripcion)
        ) {
          continue;
        }
        
        const producto = {
          descripcion,
          cantidad,
          precio_unitario: parseFloat((precio / cantidad).toFixed(2)),
          total: precio
        };
        
        console.log(`✅ Producto fallback ${productosTemp.length + 1} extraído:`, producto);
        productosTemp.push(producto);
      }
    }
    
    console.log(`✅ Total productos extraídos (método principal): ${productosTemp.length}`);
    console.log('📦 Productos completos:', productosTemp);
    
    // 📦 MÉTODO ESPECIAL: Factura Samsung vertical (descripción, cantidad, precio en líneas separadas)
    if (productosTemp.length === 0) {
      console.warn('⚠️ No se detectaron productos con método lineal, intentando método vertical (Samsung)...');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const upperLine = line.toUpperCase();
        
        // Buscar "DESCRIPCIÓN DEL PRODUCTO" como inicio
        if (upperLine.includes('DESCRIPCIÓN') && upperLine.includes('PRODUCTO')) {
          console.log(`📍 Inicio de productos en línea ${i}: "${line}"`);
          
          // La SIGUIENTE línea es la descripción del producto
          if (i + 1 < lines.length) {
            const descripcion = lines[i + 1].trim();
            console.log(`   📝 Descripción encontrada (línea ${i+1}): "${descripcion}"`);
            
            // Buscar "CANTIDAD/UNIDAD" en las siguientes líneas
            let cantidad = 1;
            let precioUnitario = 0;
            let importe = 0;
            
            for (let j = i + 2; j < Math.min(i + 10, lines.length); j++) {
              const nextLine = lines[j].trim();
              const nextUpper = nextLine.toUpperCase();
              
              // Detectar cantidad (ej: "1 H87 Pieza")
              if (nextUpper.includes('PIEZA') || nextUpper.includes('UNIDAD') || /^\d+\s+H\d+/.test(nextLine)) {
                const cantMatch = nextLine.match(/^(\d+)/);
                if (cantMatch) {
                  cantidad = parseInt(cantMatch[1]);
                  console.log(`   🔢 Cantidad detectada (línea ${j}): ${cantidad}`);
                }
              }
              
              // Detectar precio unitario (línea que dice "PRECIO UNITARIO" seguida del valor)
              if (nextUpper.includes('PRECIO') && nextUpper.includes('UNITARIO')) {
                if (j + 1 < lines.length) {
                  const precioLine = lines[j + 1].trim();
                  const precioMatch = precioLine.match(/[\d,]+\.?\d*/);
                  if (precioMatch) {
                    precioUnitario = parseFloat(precioMatch[0].replace(/,/g, ''));
                    console.log(`   💰 Precio unitario (línea ${j+1}): $${precioUnitario}`);
                  }
                }
              }
              
              // Detectar importe (línea que dice "IMPORTE" seguida del valor)
              if (nextUpper === 'IMPORTE' || (nextUpper.includes('IMPORTE') && !nextUpper.includes('UNITARIO'))) {
                if (j + 1 < lines.length) {
                  const importeLine = lines[j + 1].trim();
                  const importeMatch = importeLine.match(/[\d,]+\.?\d*/);
                  if (importeMatch) {
                    importe = parseFloat(importeMatch[0].replace(/,/g, ''));
                    console.log(`   💵 Importe total (línea ${j+1}): $${importe}`);
                  }
                }
              }
              
              // Si encontramos SUBTOTAL, ya terminamos la sección de productos
              if (nextUpper.includes('SUBTOTAL')) {
                break;
              }
            }
            
            // Validar y agregar producto
            if (descripcion.length > 2 && (precioUnitario > 0 || importe > 0)) {
              const producto = {
                descripcion: descripcion.replace(/,\s*/g, ' ').trim(),
                cantidad: cantidad,
                precio_unitario: precioUnitario > 0 ? precioUnitario : parseFloat((importe / cantidad).toFixed(2)),
                total: importe > 0 ? importe : precioUnitario * cantidad
              };
              
              console.log(`✅ Producto Samsung extraído:`, producto);
              productosTemp.push(producto);
            }
          }
          break; // Solo procesar el primer bloque de productos
        }
      }
    }
    
    // Método alternativo si no se encontraron productos
    if (productosTemp.length === 0) {
      console.warn('⚠️ No se detectaron productos, intentando método alternativo...');
      console.log('🔍 Buscando líneas con formato: [cantidad?] descripcion $precio');
      
      // Primero encontrar la línea de inicio de productos
      let inicioProductos = -1;
      let finProductos = lines.length;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim().toUpperCase();
        if (line.includes('CANT') && (line.includes('DESCRIP') || line.includes('IMPORTE'))) {
          inicioProductos = i + 1; // Empezar después del encabezado
          console.log(`  📍 Inicio de productos en línea ${inicioProductos}`);
        }
        if ((line.includes('SUBTOTAL') || line.includes('TOTAL:')) && inicioProductos > 0) {
          finProductos = i;
          console.log(`  📍 Fin de productos en línea ${finProductos}`);
          break;
        }
      }
      
      // Si no encontramos inicio, buscar en todo el ticket
      if (inicioProductos < 0) {
        console.log('  ⚠️ No se encontró encabezado de productos, buscando en todo el ticket');
        inicioProductos = 0;
      }
      
      for (let i = inicioProductos; i < finProductos; i++) {
        const line = lines[i].trim();
        
        // Ignorar líneas muy cortas o que sean solo encabezados
        if (line.length < 3) {
          continue;
        }
        
        // ✅ FILTROS MEJORADOS: Excluir metadatos fiscales y encabezados
        if (/^(SUBTOTAL|TOTAL|IVA|PROPINA|CAMBIO|GRACIAS|SON:|ESTE|CANT|DESCRIPCION|IMPORTE|FOLIO|MESA|ORDEN|PERSONAS|MESERO)/i.test(line)) {
          console.log(`  ⏩ Línea ${i} ignorada (encabezado/total): "${line}"`);
          continue;
        }
        
        // ❌ EXCLUIR METADATOS FISCALES SAT
        if (/^(REGIMEN|FISCAL|FORMA|PAGO|USO|CFDI|LUGAR|EXPEDICION|METODO|RFC|UUID|SERIE|FOLIO|MONEDA|TIPO|CAMBIO|CERTIFICADO)/i.test(line)) {
          console.log(`  ⏩ Línea ${i} ignorada (metadato fiscal SAT): "${line}"`);
          continue;
        }
        
        // ❌ EXCLUIR FECHAS Y NÚMEROS SUELTOS
        if (/^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(line) || /^\d{1,3}\.\d{6}$/.test(line)) {
          console.log(`  ⏩ Línea ${i} ignorada (fecha o número suelto): "${line}"`);
          continue;
        }
        
        // MÉTODO 1: Buscar líneas que terminen con $XXX.XX
        const matchConPeso = line.match(/^(.+?)\s+\$(\d+\.?\d*)$/);
        if (matchConPeso) {
          const [, desc, precio] = matchConPeso;
          const precioNum = parseFloat(precio);
          
          console.log(`  🔍 Línea ${i} con $: "${line}"`);
          console.log(`     Descripción: "${desc}", Precio: ${precioNum}`);
          
          // ✅ VALIDACIONES MEJORADAS
          const descUpper = desc.toUpperCase().trim();
          
          // ❌ Validar que NO sea metadato fiscal SAT
          if (/^(REGIMEN|FISCAL|FORMA|PAGO|USO|CFDI|LUGAR|EXPEDICION|METODO|RFC|UUID|SERIE|FOLIO|MONEDA)/.test(descUpper)) {
            console.log(`     ❌ Ignorado: Metadato fiscal SAT - "${desc}"`);
            continue;
          }
          
          // ❌ Validar que no sea el nombre del establecimiento
          if (descUpper.includes('GIGANTES') || descUpper.includes('SUR 12')) {
            console.log(`     ❌ Ignorado: Parece ser el nombre del establecimiento`);
            continue;
          }
          
          // ❌ Validar que no sea solo un número (ej: "0.160000 $31")
          if (/^\d+\.?\d*$/.test(desc.trim())) {
            console.log(`     ❌ Ignorado: Solo número sin descripción - "${desc}"`);
            continue;
          }
          
          // ❌ Validar rango de precio (precios demasiado bajos pueden ser códigos, no productos)
          if (precioNum < 5 || precioNum > 10000) {
            console.log(`     ❌ Precio fuera de rango: ${precioNum}`);
            continue;
          }
          
          // ❌ Validar longitud de descripción
          if (desc.length < 2 || desc.length > 80) {
            console.log(`     ❌ Descripción muy corta/larga: ${desc.length} caracteres`);
            continue;
          }
          
          // Extraer cantidad si está al inicio
          let cantidad = 1;
          let descripcionLimpia = desc.trim();
          const cantidadMatch = descripcionLimpia.match(/^(\d+)\s+(.+)$/);
          
          if (cantidadMatch) {
            cantidad = parseInt(cantidadMatch[1]);
            descripcionLimpia = cantidadMatch[2];
            console.log(`     ✅ Cantidad detectada: ${cantidad}`);
          }
          
          const producto = {
            descripcion: cleanProductName(descripcionLimpia.trim()),
            cantidad: cantidad,
            precio_unitario: parseFloat((precioNum / cantidad).toFixed(2)),
            total: precioNum
          };
          
          console.log(`✅ Producto alternativo ${productosTemp.length + 1} agregado:`, producto);
          productosTemp.push(producto);
        } 
        // MÉTODO 2: Sin el símbolo $
        else if (line.match(/^(.+?)\s+(\d+\.\d{2})$/)) {
          const matchSinPeso = line.match(/^(.+?)\s+(\d+\.\d{2})$/);
          if (matchSinPeso) {
            const [, desc, precio] = matchSinPeso;
            const precioNum = parseFloat(precio);
            
            console.log(`  🔍 Línea ${i} sin $: "${line}"`);
            console.log(`     Descripción: "${desc}", Precio: ${precioNum}`);
            
            // ✅ MISMAS VALIDACIONES MEJORADAS
            const descUpper = desc.toUpperCase().trim();
            
            // ❌ Validar que NO sea metadato fiscal SAT
            if (/^(REGIMEN|FISCAL|FORMA|PAGO|USO|CFDI|LUGAR|EXPEDICION|METODO|RFC|UUID|SERIE|FOLIO|MONEDA)/.test(descUpper)) {
              console.log(`     ❌ Ignorado: Metadato fiscal SAT - "${desc}"`);
              continue;
            }
            
            // ❌ Validar que no sea el nombre del establecimiento
            if (descUpper.includes('GIGANTES') || descUpper.includes('SUR 12')) {
              console.log(`     ❌ Ignorado: Parece ser el nombre del establecimiento`);
              continue;
            }
            
            // ❌ Validar que no sea solo un número
            if (/^\d+\.?\d*$/.test(desc.trim())) {
              console.log(`     ❌ Ignorado: Solo número sin descripción - "${desc}"`);
              continue;
            }
            
            // ❌ Validar rango de precio
            if (precioNum < 5 || precioNum > 10000) {
              console.log(`     ❌ Precio fuera de rango: ${precioNum}`);
              continue;
            }
            
            // ❌ Validar longitud de descripción
            if (desc.length < 2 || desc.length > 80) {
              console.log(`     ❌ Descripción muy corta/larga: ${desc.length} caracteres`);
              continue;
            }
            
            let cantidad = 1;
            let descripcionLimpia = desc.trim();
            const cantidadMatch = descripcionLimpia.match(/^(\d+)\s+(.+)$/);
            
            if (cantidadMatch) {
              cantidad = parseInt(cantidadMatch[1]);
              descripcionLimpia = cantidadMatch[2];
              console.log(`     ✅ Cantidad detectada: ${cantidad}`);
            }
            
            const producto = {
              descripcion: cleanProductName(descripcionLimpia.trim()),
              cantidad: cantidad,
              precio_unitario: parseFloat((precioNum / cantidad).toFixed(2)),
              total: precioNum
            };
            
            console.log(`✅ Producto alternativo ${productosTemp.length + 1} agregado:`, producto);
            productosTemp.push(producto);
          }
        }
        // MÉTODO 3 (NUEVO): Formato multi-línea - descripción sin precio + siguiente línea con precio
        else if (i + 1 < finProductos && !line.match(/\$?\d+\.\d{2}$/)) {
          const nextLine = lines[i + 1].trim();
          const precioMatch = nextLine.match(/^\$?(\d+\.?\d*)$/);
          
          if (precioMatch) {
            const precioNum = parseFloat(precioMatch[1]);
            console.log(`  🔍 MULTI-LÍNEA detectada en líneas ${i}-${i+1}:`);
            console.log(`     Línea ${i}: "${line}"`);
            console.log(`     Línea ${i+1}: "${nextLine}" → Precio: ${precioNum}`);
            
            // Validaciones de precio
            if (precioNum < 5 || precioNum > 10000) {
              console.log(`     ❌ Precio fuera de rango: ${precioNum}`);
              continue;
            }
            
            // Validar longitud de descripción
            if (line.length < 2 || line.length > 80) {
              console.log(`     ❌ Descripción muy corta/larga: ${line.length} caracteres`);
              continue;
            }
            
            // Validar que no                                                                         sea nombre de establecimiento
            if (line.toUpperCase().includes('GIGANTES') || line.toUpperCase().includes('SUR 12')) {
              console.log(`     ❌ Ignorado: Parece ser el nombre del establecimiento`);
              continue;
            }
            
            // Extraer cantidad si está al inicio de la descripción
            let cantidad = 1;
            let descripcionLimpia = line.trim();
            const cantidadMatch = descripcionLimpia.match(/^(\d+)\s+(.+)$/);
            
            if (cantidadMatch) {
              cantidad = parseInt(cantidadMatch[1]);
              descripcionLimpia = cantidadMatch[2];
              console.log(`     ✅ Cantidad detectada: ${cantidad}`);
            }
            
            const producto = {
              descripcion: cleanProductName(descripcionLimpia.trim()),
              cantidad: cantidad,
              precio_unitario: parseFloat((precioNum / cantidad).toFixed(2)),
              total: precioNum
            };
            
            console.log(`✅ Producto MULTI-LÍNEA ${productosTemp.length + 1} agregado:`, producto);
            productosTemp.push(producto);
            
            // Saltar la siguiente línea ya que la procesamos
            i++;
          }
        }
      }
      
      console.log(`✅ Total con método alternativo: ${productosTemp.length}`);
    }
    
    data.productos = productosTemp;
    console.log(`🎯 RESULTADO FINAL: ${productosTemp.length} productos extraídos`);
    
    // Mostrar TODOS los productos extraídos con detalles
    if (productosTemp.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📦 DETALLE DE TODOS LOS PRODUCTOS EXTRAÍDOS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      productosTemp.forEach((prod, index) => {
        console.log(`\n🛒 Producto #${index + 1}:`);
        console.log(`   📝 Descripción: "${prod.descripcion}"`);
        console.log(`   🔢 Cantidad: ${prod.cantidad}`);
        console.log(`   💵 Precio Unitario: $${prod.precio_unitario.toFixed(2)}`);
        console.log(`   💰 Total: $${prod.total.toFixed(2)}`);
      });
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // 9. GENERAR CONCEPTO INTELIGENTE (basado en productos y establecimiento)
    if (data.establecimiento) {
      const establecimientoLower = data.establecimiento.toLowerCase();
      
      // Detectar tipo de establecimiento y generar concepto
      if (establecimientoLower.includes('torta') || establecimientoLower.includes('taquería') || establecimientoLower.includes('restaurant')) {
        data.concepto_sugerido = 'Alimentos y Bebidas';
      } else if (establecimientoLower.includes('gasolina') || establecimientoLower.includes('pemex') || establecimientoLower.includes('gas')) {
        data.concepto_sugerido = 'Combustible';
      } else if (establecimientoLower.includes('hotel') || establecimientoLower.includes('hospedaje')) {
        data.concepto_sugerido = 'Hospedaje';
      } else if (establecimientoLower.includes('taxi') || establecimientoLower.includes('uber') || establecimientoLower.includes('transporte')) {
        data.concepto_sugerido = 'Transporte';
      } else if (establecimientoLower.includes('papelería') || establecimientoLower.includes('office')) {
        data.concepto_sugerido = 'Papelería';
      } else {
        // Si detectamos productos específicos, usar eso
        const textLower = text.toLowerCase();
        if (textLower.includes('comida') || textLower.includes('alimento') || textLower.includes('bebida')) {
          data.concepto_sugerido = 'Alimentos y Bebidas';
        } else {
          data.concepto_sugerido = 'Gastos Generales';
        }
      }
      
      console.log('💡 Concepto sugerido:', data.concepto_sugerido);
    }

    // 10. SUGERIR CATEGORÍA (basado en el concepto y establecimiento)
    if (data.concepto_sugerido) {
      const conceptoMap: Record<string, string> = {
        'Alimentos y Bebidas': 'alimentacion',
        'Combustible': 'transporte',
        'Hospedaje': 'hospedaje',
        'Transporte': 'transporte',
        'Papelería': 'material_oficina',
        'Gastos Generales': 'otros'
      };
      
      data.categoria_sugerida = conceptoMap[data.concepto_sugerido] || 'otros';
      console.log('🏷️ Categoría sugerida:', data.categoria_sugerida);
    }

    // MOSTRAR RESUMEN COMPLETO DE TODOS LOS DATOS EXTRAÍDOS
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN COMPLETO DE DATOS EXTRAÍDOS DEL TICKET');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n🏪 INFORMACIÓN DEL ESTABLECIMIENTO:');
    console.log(`   Nombre: ${data.establecimiento || 'No detectado'}`);
    console.log(`   RFC: ${data.rfc || 'No detectado'}`);
    console.log(`   Teléfono: ${data.telefono || 'No detectado'}`);
    
    console.log('\n📅 INFORMACIÓN DEL DOCUMENTO:');
    console.log(`   Fecha: ${data.fecha || 'No detectado'}`);
    console.log(`   Hora: ${data.hora || 'No detectado'}`);
    
    console.log('\n💰 INFORMACIÓN FINANCIERA:');
    console.log(`   Total: $${data.total?.toFixed(2) || '0.00'}`);
    console.log(`   Subtotal: $${data.subtotal?.toFixed(2) || '0.00'}`);
    console.log(`   IVA: $${data.iva?.toFixed(2) || '0.00'}`);
    
    console.log('\n🛒 PRODUCTOS EXTRAÍDOS:');
    if (data.productos && data.productos.length > 0) {
      console.log(`   Total de productos: ${data.productos.length}`);
      data.productos.forEach((prod: any, index: number) => {
        console.log(`\n   ${index + 1}. ${prod.descripcion}`);
        console.log(`      Cantidad: ${prod.cantidad}`);
        console.log(`      Precio Unit: $${prod.precio_unitario?.toFixed(2) || '0.00'}`);
        console.log(`      Total: $${prod.total?.toFixed(2) || '0.00'}`);
      });
    } else {
      console.log('   ⚠️ No se detectaron productos');
    }
    
    console.log('\n💡 SUGERENCIAS INTELIGENTES:');
    console.log(`   Concepto sugerido: ${data.concepto_sugerido || 'No generado'}`);
    console.log(`   Categoría sugerida: ${data.categoria_sugerida || 'No generada'}`);
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
    console.log('✅ Datos extraídos finales:', data);
    return data;
  };

  // 🆕 Función para procesar archivos XML CFDI (SIN OCR)
  const processXMLCFDI = async (xmlFile: File) => {
    setIsProcessingOCR(true);
    setOcrProgress('Leyendo XML CFDI...');
    
    try {
      console.log('📄 Procesando XML CFDI:', xmlFile.name);
      
      // Leer el contenido del archivo XML
      const xmlContent = await xmlFile.text();
      console.log('📝 Contenido XML cargado, parseando...');
      
      // Parsear el XML
      setOcrProgress('Extrayendo datos del CFDI...');
      const cfdiData = await parseCFDIXml(xmlContent);
      
      console.log('✅ CFDI parseado exitosamente:', cfdiData);
      console.log('  - Emisor:', cfdiData.emisor.nombre);
      console.log('  - Total:', cfdiData.total);
      console.log('  - UUID:', cfdiData.timbreFiscal?.uuid);
      
      // Convertir a formato del formulario
      setOcrProgress('Aplicando datos al formulario...');
      const expenseData = cfdiToExpenseData(cfdiData);
      
      console.log('📋 Datos convertidos para el formulario:', expenseData);
      
      // Actualizar el formulario con los datos extraídos
      setFormData(prev => ({
        ...prev,
        ...expenseData,
        // Mantener evento_id del formulario actual
        evento_id: eventId
      }));
      
      // Mensaje de éxito
      setOcrProgress('');
      toast.success(
        `✅ XML CFDI procesado exitosamente\n` +
        `Emisor: ${cfdiData.emisor.nombre}\n` +
        `Total: $${cfdiData.total.toFixed(2)}\n` +
        `UUID: ${cfdiData.timbreFiscal?.uuid || 'N/A'}`,
        { duration: 5000 }
      );
      
      console.log('✅ Formulario actualizado con datos del CFDI');
      
      // TODO: Guardar el XML en storage también
      // await uploadXMLToStorage(xmlFile, cfdiData.timbreFiscal?.uuid);
      
    } catch (error: any) {
      console.error('❌ Error procesando XML CFDI:', error);
      setOcrProgress('');
      
      // Mensaje de error detallado
      const errorMsg = error.message || 'Error desconocido';
      toast.error(
        `Error procesando XML CFDI:\n${errorMsg}\n\nVerifica que el archivo sea un CFDI válido.`,
        { duration: 6000 }
      );
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // 🆕 FUNCIÓN PRINCIPAL: Procesar XML + Visual simultáneamente
  const processDocuments = async () => {
    try {
      setIsProcessingOCR(true);

      // 🎯 PRIORIDAD 1: Si hay XML, extraer datos de ahí (100% preciso)
      if (xmlFile) {
        setOcrProgress('📄 Procesando XML CFDI...');
        console.log('✅ XML detectado - Extrayendo datos del XML (sin OCR)');
        
        await processXMLCFDI(xmlFile);
        
        // Si también hay archivo visual, solo informar que está disponible
        if (visualFile) {
          console.log('📎 Archivo visual también disponible:', visualFile.name);
          toast.success('✅ XML procesado + Archivo visual adjunto');
        }
        
        return; // ✅ Ya tenemos los datos del XML, no necesitamos OCR
      }

      // 🎯 PRIORIDAD 2: Si NO hay XML pero SÍ hay imagen/PDF, usar OCR
      if (visualFile && !xmlFile) {
        setOcrProgress('🔍 Procesando con OCR...');
        console.log('⚠️ Sin XML - Usando OCR en archivo visual');
        
        await processGoogleVisionOCR(visualFile);
        
        return;
      }

      // ⚠️ Sin archivos
      console.warn('⚠️ No hay archivos para procesar');
      toast.error('Por favor sube al menos un archivo (XML o imagen/PDF)');

    } catch (error) {
      console.error('❌ Error procesando documentos:', error);
      toast.error('Error procesando documentos');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // Función para procesar con Google Vision API (SOLO DATOS REALES)
  const processGoogleVisionOCR = async (file: File) => {
    setIsProcessingOCR(true);
    setOcrProgress('Preparando archivo...');
    
    try {
      console.log('🚀 Procesando con OCR inteligente (Google Vision/OCR.space + fallback Tesseract)...');
      
      // PASO 1: Obtener clave_evento y guardar en bucket event_docs
      setOcrProgress('Guardando archivo en almacenamiento...');
      const { autoCompressIfNeeded } = await import('../../../../shared/utils/imageCompression');
      const { supabase } = await import('../../../../core/config/supabase');
      
      // Obtener la clave_evento (formato: EVT-2025-001)
      const { data: eventData, error: eventError } = await supabase
        .from('evt_eventos')
        .select('clave_evento')
        .eq('id', eventId)
        .single();
      
      let claveEvento = eventId;
      
      if (eventError || !eventData) {
        console.warn('⚠️ No se pudo obtener clave_evento:', eventError?.message);
        // Continuar con OCR usando eventId
      } else {
        claveEvento = (eventData as any).clave_evento || eventId;
      }
      
      // ✅ SOPORTE PARA PDFs: Se procesarán con Tesseract
      const isPDF = file.type === 'application/pdf';
      if (isPDF) {
        console.log('📄 PDF detectado - Se procesará con Tesseract OCR');
      }
      
      // Construir ruta base
      const timestamp = Date.now();
      const version = 1; // Primera versión
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      // Comprimir y guardar imagen
      const processedFile = await autoCompressIfNeeded(file, {
        maxSizeKB: 2048,
        maxWidth: 2400,
        maxHeight: 2400,
        quality: 0.85
      });
      
      const fileName = `${claveEvento}_temp_${timestamp}_v${version}_${cleanFileName}`;
      const filePath = `${claveEvento}/gastos/${fileName}`;
      
      console.log('📁 Guardando imagen en bucket event_docs:', filePath);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event_docs') // Correcto, no necesita cambio
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.warn('⚠️ No se pudo guardar imagen en bucket:', uploadError.message);
      } else {
        console.log('✅ Imagen guardada en bucket:', uploadData.path);
      }
      
      // IMPORTANTE: Actualizar referencia para usar imagen comprimida en OCR
      file = processedFile;
      
      // ============================================
      // 🚀 PROCESAMIENTO OCR PARA IMÁGENES Y PDFs
      // ============================================
      // 1. Imágenes: Google Vision (preferido) → Tesseract (fallback)
      // 2. PDFs: Tesseract directo
      // ============================================

      let result: { text: string; confidence: number };

      if (isPDF) {
        // PDFs: usar Tesseract directamente
        setOcrProgress('Procesando PDF con Tesseract...');
        console.log('📄 Procesando PDF con Tesseract OCR');

        try {
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('spa');

          const { data } = await worker.recognize(file);
          await worker.terminate();

          result = {
            text: data.text,
            confidence: data.confidence
          };

          console.log('✅ Tesseract OK para PDF');
          console.log('📝 Texto:', result.text.substring(0, 200) + '...');
          console.log('🎯 Confianza:', result.confidence + '%');

        } catch (tesseractError) {
          console.error('❌ Error en Tesseract para PDF:', tesseractError);
          throw new Error('No se pudo extraer texto del PDF. Intenta con una imagen o XML.');
        }

      } else {
        // Imágenes: intentar Google Vision primero
        try {
          setOcrProgress('Procesando imagen con Google Vision (Supabase)...');
          console.log('🤖 Google Vision API (Supabase Edge Function) - imagen');

          const supabaseResult = await processFileWithOCR(file);
          result = {
            text: supabaseResult.texto_completo,
            confidence: supabaseResult.confianza_general
          };

          console.log('✅ Google Vision OK (Supabase)');
          console.log('📝 Texto:', result.text.substring(0, 200) + '...');
          console.log('🎯 Confianza:', result.confidence + '%');

        } catch (visionError) {
          console.warn('⚠️ Google Vision falló:', visionError);

          // FALLBACK: Tesseract para imágenes
          setOcrProgress('Usando Tesseract para imagen...');
          console.log('🔄 Fallback: Tesseract');

          const { default: Tesseract } = await import('tesseract.js');
          const { data: { text, confidence } } = await Tesseract.recognize(file, 'spa+eng', {
            logger: (m: any) => {
              if (m.status === 'recognizing text') {
                setOcrProgress(`OCR: ${Math.round(m.progress * 100)}%`);
              }
            }
          });

          result = { text, confidence: Math.round(confidence) };
          console.log('✅ Tesseract OK');
        }
      }

      // Extraer datos estructurados
      setOcrProgress('Extrayendo información...');
      
      // ✅ MAPEO TRADICIONAL: Funciona excelente sin IA externa (90%+ precisión)
      console.log('📋 Usando mapeo tradicional optimizado...');
      const extractedData: OCRData = extractMexicanTicketData(result.text);
      
      // Autocompletar formulario
      const updatedFormData = { ...formData };
      console.log('🎯 Autocompletando formulario con datos extraídos...');

      // CORRECCIÓN: Establecimiento → Proveedor, Concepto Sugerido → Concepto
      if (extractedData.establecimiento) {
        updatedFormData.proveedor = extractedData.establecimiento;
        console.log('  ✅ Proveedor:', extractedData.establecimiento);
      }

      if (extractedData.concepto_sugerido) {
        updatedFormData.concepto = extractedData.concepto_sugerido;
        console.log('  ✅ Concepto:', extractedData.concepto_sugerido);
      }

      if (extractedData.rfc) {
        updatedFormData.rfc_proveedor = extractedData.rfc;
        console.log('  ✅ RFC:', extractedData.rfc);
      }

      // CORRECCIÓN CRÍTICA: Mapear categoria_sugerida (texto) a categoria_id (número)
      if (extractedData.categoria_sugerida && categories) {
        console.log('  🔍 Buscando categoría:', extractedData.categoria_sugerida);

        // Buscar la categoría por nombre (case-insensitive)
        const categoriaEncontrada = categories.find((cat: any) => {
          const nombreCategoria = cat.nombre.toLowerCase();
          const nombreSugerido = extractedData.categoria_sugerida!.toLowerCase();

          // Mapeo flexible: "otros" → "otros", "alimentacion" → "alimentación", etc.
          return nombreCategoria.includes(nombreSugerido) ||
                 nombreSugerido.includes(nombreCategoria) ||
                 (nombreSugerido === 'otros' && nombreCategoria.includes('otros'));
        });

        if (categoriaEncontrada) {
          updatedFormData.categoria_id = String(categoriaEncontrada.id);
          console.log('  ✅ Categoría mapeada:', categoriaEncontrada.nombre, '(ID:', categoriaEncontrada.id, ')');
        } else {
          // Si no se encuentra, usar la primera categoría como fallback
          if (categories.length > 0) {
            updatedFormData.categoria_id = String(categories[0].id);
            console.log('  ⚠️ Categoría no encontrada, usando primera:', categories[0].nombre, '(ID:', categories[0].id, ')');
          } else {
            console.log('  ❌ No hay categorías disponibles');
          }
        }
      }

      if (extractedData.total) {
        updatedFormData.total = extractedData.total;
        console.log('  ✅ Total:', extractedData.total);
      }

      // Nota: subtotal e IVA se calculan automáticamente en el resumen
      if (extractedData.fecha) {
        updatedFormData.fecha_gasto = formatDateForInput(extractedData.fecha);
        console.log('  ✅ Fecha:', updatedFormData.fecha_gasto);
      }

      if (extractedData.forma_pago) {
        updatedFormData.forma_pago = extractedData.forma_pago;
        console.log('  ✅ Forma de pago:', extractedData.forma_pago);
      }
      
      // Campos adicionales del establecimiento
      if (extractedData.telefono_proveedor) {
        updatedFormData.telefono_proveedor = extractedData.telefono_proveedor;
        console.log('  ✅ Teléfono proveedor:', extractedData.telefono_proveedor);
      }
      
      if (extractedData.direccion_proveedor) {
        updatedFormData.direccion_proveedor = extractedData.direccion_proveedor;
        console.log('  ✅ Dirección proveedor:', extractedData.direccion_proveedor);
      }
      
      if (extractedData.email_proveedor) {
        updatedFormData.email_proveedor = extractedData.email_proveedor;
        console.log('  ✅ Email proveedor:', extractedData.email_proveedor);
      }
      
      if (extractedData.establecimiento_info) {
        updatedFormData.establecimiento_info = extractedData.establecimiento_info;
        console.log('  ✅ Info establecimiento:', extractedData.establecimiento_info);
      }
      
      // ========================================
      // CAMPOS SAT/CFDI (CRÍTICO PARA CONTABILIDAD)
      // ========================================
      console.log('  📋 Autorellenando campos SAT/CFDI...');
      
      if (extractedData.uuid_cfdi) {
        updatedFormData.uuid_cfdi = extractedData.uuid_cfdi;
        console.log('  ✅ UUID CFDI:', extractedData.uuid_cfdi);
      }
      
      if (extractedData.folio_fiscal) {
        updatedFormData.folio_fiscal = extractedData.folio_fiscal;
        console.log('  ✅ Folio Fiscal:', extractedData.folio_fiscal);
      }
      
      if (extractedData.serie) {
        updatedFormData.serie = extractedData.serie;
        console.log('  ✅ Serie:', extractedData.serie);
      }
      
      if (extractedData.folio) {
        updatedFormData.folio_interno = extractedData.folio;
        console.log('  ✅ Folio:', extractedData.folio);
      }
      
      if (extractedData.tipo_comprobante) {
        const validTipos = ['I', 'E', 'T', 'N', 'P'];
        if (validTipos.includes(extractedData.tipo_comprobante)) {
          updatedFormData.tipo_comprobante = extractedData.tipo_comprobante as 'I' | 'E' | 'T' | 'N' | 'P';
          console.log('  ✅ Tipo Comprobante:', extractedData.tipo_comprobante);
        }
      }
      
      if (extractedData.forma_pago_sat) {
        updatedFormData.forma_pago_sat = extractedData.forma_pago_sat;
        console.log('  ✅ Forma Pago SAT:', extractedData.forma_pago_sat);
      }
      
      if (extractedData.metodo_pago_sat) {
        updatedFormData.metodo_pago_sat = extractedData.metodo_pago_sat;
        console.log('  ✅ Método Pago SAT:', extractedData.metodo_pago_sat);
      }
      
      if (extractedData.uso_cfdi) {
        updatedFormData.uso_cfdi = extractedData.uso_cfdi;
        console.log('  ✅ Uso CFDI:', extractedData.uso_cfdi);
      }
      
      if (extractedData.lugar_expedicion) {
        updatedFormData.lugar_expedicion = extractedData.lugar_expedicion;
        console.log('  ✅ Lugar Expedición:', extractedData.lugar_expedicion);
      }
      
      if (extractedData.regimen_fiscal_receptor) {
        updatedFormData.regimen_fiscal_receptor = extractedData.regimen_fiscal_receptor;
        console.log('  ✅ Régimen Fiscal Receptor:', extractedData.regimen_fiscal_receptor);
      }
      
      if (extractedData.moneda) {
        const validMonedas = ['MXN', 'USD', 'EUR', 'CAD', 'GBP'];
        if (validMonedas.includes(extractedData.moneda)) {
          updatedFormData.moneda = extractedData.moneda as 'MXN' | 'USD' | 'EUR' | 'CAD' | 'GBP';
          console.log('  ✅ Moneda:', extractedData.moneda);
        }
      }
      
      if (extractedData.tipo_cambio) {
        updatedFormData.tipo_cambio = extractedData.tipo_cambio;
        console.log('  ✅ Tipo Cambio:', extractedData.tipo_cambio);
      }
      
      if (extractedData.hora) {
        // 🕐 Validar formato de hora antes de asignar (fix error "70:22")
        const horaValidada = validateTimeFormat(extractedData.hora);
        if (horaValidada) {
          updatedFormData.hora_emision = horaValidada;
          console.log('  ✅ Hora Emisión:', horaValidada);
        } else {
          console.warn('  ⚠️ Hora inválida detectada:', extractedData.hora, '- se omitirá');
          updatedFormData.hora_emision = null;
        }
      }
      
      console.log('  ✅ Campos SAT/CFDI autorellenados completamente');
      // ========================================
      
      // NUEVO: Guardar productos en formato legible Y JSONB en detalle_compra
      if (extractedData.productos && extractedData.productos.length > 0) {
        console.log('  📦 Generando detalle de compra con', extractedData.productos.length, 'productos...');

        // Convertir productos a formato JSONB para Supabase
        const detalleCompraJSON = extractedData.productos.map(prod => ({
          descripcion: prod.descripcion || prod.nombre || 'Producto',
          cantidad: prod.cantidad || 1,
          precio_unitario: prod.precio_unitario || 0,
          total: prod.total || ((prod.cantidad || 1) * (prod.precio_unitario || 0))
        }));

        // Formato legible para el textarea (un renglón por producto)
        const detalleTexto = extractedData.productos.map((prod, index) => {
          const desc = prod.descripcion || prod.nombre || 'Producto';
          const cant = prod.cantidad || 1;
          const precioUnit = prod.precio_unitario || 0;
          const total = prod.total || (cant * precioUnit);
          return `${index + 1}. ${cant} x ${desc} - $${precioUnit.toFixed(2)} = $${total.toFixed(2)}`;
        }).join('\n');

        // Guardar como texto legible en el campo (para visualización)
        updatedFormData.detalle_compra = detalleTexto;
        
        console.log('  ✅ Detalle de compra (JSONB):', detalleCompraJSON);
        console.log('  ✅ Detalle de compra (texto legible):\n' + detalleTexto);

        // Descripción más simple
        updatedFormData.descripcion = `Compra en ${extractedData.establecimiento || 'establecimiento'} - ${extractedData.productos.length} producto(s)`;
        console.log('  ✅ Descripción:', updatedFormData.descripcion);
        
        // Guardar JSONB en un campo temporal para enviarlo a la BD
        (updatedFormData as any)._detalle_compra_json = detalleCompraJSON;
      } else {
        console.log('  ⚠️ No se detectaron productos en el ticket');
        updatedFormData.detalle_compra = '';
      }

      console.log('🎉 Formulario actualizado con todos los datos extraídos');
      console.log('📊 Estado final del formulario:', updatedFormData);

      setFormData(updatedFormData);
      setOcrResult(result.text);
      setOcrProgress('Completado');

      toast.success(`✅ Datos extraídos exitosamente (Confianza: ${result.confidence}%)`);

      return result;
      
    } catch (error) {
      console.error('❌ Error procesando OCR:', error);
      setOcrProgress('Error en procesamiento');
      console.log('🔄 Fallback: Procesando con Tesseract.js (datos reales)...');
      
      // Fallback a Tesseract.js (DATOS REALES)
      await processTesseractOCR(file);
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // Función de optimización de imagen para Tesseract
  const optimizeImageForOCR = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convertir a escala de grises y aumentar contraste
    for (let i = 0; i < data.length; i += 4) {
      // Escala de grises
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      // Aumentar contraste (threshold adaptivo)
      const enhanced = gray > 127 ? Math.min(255, gray * 1.2) : Math.max(0, gray * 0.8);
      
      data[i] = enhanced;     // R
      data[i + 1] = enhanced; // G  
      data[i + 2] = enhanced; // B
      // Alpha permanece igual
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Función para procesar con Tesseract.js optimizado
  const processTesseractOCR = async (file: File) => {
    setIsProcessingOCR(true);
    
    try {
      console.log('🚀 Procesando y optimizando imagen con Tesseract.js...');
      
      // Crear canvas para optimizar imagen
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = URL.createObjectURL(file);
      });

      // Redimensionar si es muy grande (mantener aspect ratio)
      let { width, height } = img;
      const maxSize = 1200;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Optimizar imagen
      optimizeImageForOCR(canvas, ctx);

      // Convertir canvas a blob optimizado
      const optimizedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
      });

      // Usar Tesseract.js con configuración optimizada
      const { createWorker } = await import('tesseract.js');
      
      const worker = await createWorker('spa+eng', 1, {
        logger: m => console.log('📊 OCR:', m.status, Math.round(m.progress * 100) + '%')
      });

      // Configurar Tesseract para facturas/tickets
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚáéíóúñÑ.,:-/$% ',
      });

      console.log('📄 Procesando imagen optimizada...');
      const { data: { text, confidence } } = await worker.recognize(optimizedBlob);
      
      await worker.terminate();
      
      console.log('📄 Texto REAL extraído:');
      console.log(text);
      console.log('🎯 Confianza:', Math.round(confidence) + '%');
      
      // Validar que el texto extraído sea real (no vacío o muy corto)
      if (!text || text.trim().length < 10) {
        throw new Error('No se pudo extraer texto suficiente de la imagen. Verifique la calidad de la imagen.');
      }

      // Extraer datos estructurados del texto REAL
      const datosExtraidos = extractMexicanTicketData(text);
      
      // Mejorar extracción de totales si no se encontró
      if (!datosExtraidos.total && text.length > 20) {
        console.log('🔍 Buscando totales con patrones adicionales...');
        
        // Patrones más agresivos para encontrar totales
        const patronesTotales = [
          /\$\s*([0-9,]+\.?\d{0,2})/g,
          /([0-9,]+\.\d{2})/g,
          /total.*?([0-9,]+\.?\d{0,2})/gi,
          /importe.*?([0-9,]+\.?\d{0,2})/gi
        ];
        
        const todosLosNumeros = new Set<number>();
        
        for (const patron of patronesTotales) {
          const matches = [...text.matchAll(patron)];
          matches.forEach(match => {
            const num = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(num) && num > 5 && num < 100000) {
              todosLosNumeros.add(num);
            }
          });
        }
        
        if (todosLosNumeros.size > 0) {
          // Tomar el número más alto como posible total
          datosExtraidos.total = Math.max(...Array.from(todosLosNumeros));
          console.log('💡 Total detectado:', datosExtraidos.total);
        }
      }

      const result = {
        success: text.length > 10, // Solo exitoso si hay texto suficiente
        confidence: Math.round(confidence),
        text: text,
        data: datosExtraidos,
        engine: 'Tesseract.js (Datos Reales)',
        isRealData: true // Marcador de datos reales
      };

      setOcrResult(result);
      autoCompletarFormulario(datosExtraidos);
      
    } catch (error) {
      console.error('❌ Error procesando con Tesseract:', error);
      setOcrResult({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        engine: 'Tesseract.js'
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const autoCompletarFormulario = (datos: OCRData) => {
    const updates: Record<string, unknown> = {};
    
    if (datos.establecimiento) {
      updates.proveedor = datos.establecimiento;
      updates.concepto = `Compra en ${datos.establecimiento}`;
    }
    
    if (datos.rfc) updates.rfc_proveedor = datos.rfc;
    if (datos.fecha) updates.fecha_gasto = convertirFecha(datos.fecha);
    if (datos.total) updates.total = datos.total;
    if (datos.forma_pago) updates.forma_pago = mapearFormaPago(datos.forma_pago);
    
    if (datos.productos && datos.productos.length > 0) {
      const descripcionProductos = datos.productos
        .map(p => `${p.nombre} (${p.cantidad}x)`)
        .join(', ');
      updates.descripcion = descripcionProductos;
    }

    setFormData(prev => ({ ...prev, ...updates }));
  };

  const convertirFecha = (fecha: string): string => {
    try {
      // Intentar varios formatos de fecha mexicanos
      const formats = [
        /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/,
        /(\d{1,2})\s+de\s+(\w+)\s+(\d{4})/i
      ];
      
      for (const format of formats) {
        const match = fecha.match(format);
        if (match && match[1]) {
          if (format.source.includes('de')) {
            // Formato "15 de enero 2024"
            if (!match[2] || !match[3]) continue;
            const meses: { [key: string]: string } = {
              'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
              'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
              'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
            };
            const mes = meses[match[2].toLowerCase()] || '01';
            return `${match[3]}-${mes}-${match[1].padStart(2, '0')}`;
          } else {
            // Formato DD/MM/YYYY o DD-MM-YYYY
            const [, dia, mes, añoOriginal] = match;
            if (!dia || !mes || !añoOriginal) continue;
            const año = añoOriginal.length === 2 ? '20' + añoOriginal : añoOriginal;
            return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
          }
        }
      }
      return formData.fecha_gasto;
    } catch {
      return formData.fecha_gasto;
    }
  };

  const mapearFormaPago = (pago: string): string => {
    const pagos = pago.toLowerCase();
    if (pagos.includes('tarjeta') || pagos.includes('card')) return 'tarjeta_credito';
    if (pagos.includes('efectivo') || pagos.includes('cash')) return 'efectivo';
    if (pagos.includes('transfer')) return 'transferencia';
    return 'efectivo';
  };

  const handleFileUpload = async (selectedFile: File) => {
    // 🆕 DETECTAR XML AUTOMÁTICAMENTE
    const isXML = selectedFile.name.toLowerCase().endsWith('.xml') || 
                  selectedFile.type === 'text/xml' || 
                  selectedFile.type === 'application/xml';
    
    // Si es XML, procesarlo directamente (SIN OCR)
    if (isXML) {
      console.log('📄 Archivo XML detectado - Procesando CFDI...');
      setFile(selectedFile);
      setOcrProgress('Procesando XML CFDI...');
      
      try {
        await processXMLCFDI(selectedFile);
        return;
      } catch (error) {
        console.error('❌ Error procesando XML:', error);
        toast.error('Error procesando XML CFDI. Verifica que sea un archivo válido.');
        setOcrProgress('');
        return;
      }
    }
    
    // Validar tipo de archivo (imagen/PDF)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Tipo de archivo no válido. Solo se permiten: JPG, PNG, PDF, XML');
      return;
    }
    
    // Validar tamaño (10MB máximo)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      toast.error('El archivo es demasiado grande. Máximo 10MB permitido.');
      return;
    }
    
    const isPDF = selectedFile.type === 'application/pdf';
    console.log(`📄 Archivo seleccionado: ${selectedFile.name} (${isPDF ? 'PDF' : 'Imagen'})`);
    
    setFile(selectedFile);
    setOcrProgress(isPDF ? 'Procesando PDF...' : 'Subiendo archivo...');
    
    try {
      // Siempre usar el mejor OCR disponible (Google → Tesseract automático)
      await processGoogleVisionOCR(selectedFile);
    } catch (error) {
      console.error('❌ Error procesando archivo:', error);
      toast.error(isPDF 
        ? 'Error procesando PDF. Intenta con una imagen o verifica que el PDF contenga texto.' 
        : 'Error procesando imagen. Intenta con otro archivo.');
      setOcrProgress('');
    }
  };
  
  // NUEVO: Manejadores de Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Validar tipo
      const isImage = droppedFile.type.startsWith('image/');
      const isPDF = droppedFile.type === 'application/pdf';
      
      if (!isImage && !isPDF) {
        toast.error('Solo se permiten imágenes (JPG, PNG) o archivos PDF');
        return;
      }
      
      await handleFileUpload(droppedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('💾 Iniciando guardado de gasto...');
    console.log('📋 Datos del formulario:', formData);

    // Validación básica
    const newErrors: Record<string, string> = {};
    if (!formData.concepto.trim()) newErrors.concepto = 'El concepto es obligatorio';
    if (formData.total <= 0) newErrors.total = 'El total debe ser mayor a 0';

    if (Object.keys(newErrors).length > 0) {
      console.log('❌ Errores de validación:', newErrors);
      setErrors(newErrors);
      return;
    }

    // Validación de categoria_id
    if (formData.categoria_id && isNaN(Number(formData.categoria_id))) {
      console.error('❌ ERROR CRÍTICO: categoria_id no es un número:', formData.categoria_id);
      toast.error(`Error: Categoría inválida (${formData.categoria_id}). Debe ser un número.`);
      return;
    }

    console.log('✅ Validación pasada. Guardando...');
    console.log('  - Concepto:', formData.concepto);
    console.log('  - Total:', formData.total);
    console.log('  - Proveedor:', formData.proveedor);
    console.log('  - Categoría ID:', formData.categoria_id);
    console.log('  - Detalle compra (caracteres):', formData.detalle_compra?.length || 0);
    
    // 🧮 CALCULAR subtotal e IVA desde el total
    // Este es el mismo cálculo que se hace en las líneas 140-144 para mostrar en la UI
    const total = formData.total;
    const iva_factor = 1 + (formData.iva_porcentaje / 100);
    const subtotalCalculado = total / iva_factor;
    const ivaCalculado = total - subtotalCalculado;
    
    console.log('  💰 Cálculos financieros:');
    console.log('    - Total ingresado:', total.toFixed(2));
    console.log('    - IVA %:', formData.iva_porcentaje);
    console.log('    - Factor IVA:', iva_factor);
    console.log('    - Subtotal calculado:', subtotalCalculado.toFixed(2));
    console.log('    - IVA calculado:', ivaCalculado.toFixed(2));
    
    // Preparar datos para envío CON los valores calculados
    const dataToSend = { 
      ...formData,
      subtotal: subtotalCalculado,  // ✅ Usar valor calculado
      iva: ivaCalculado             // ✅ Usar valor calculado
    };
    
    // 🧹 LIMPIEZA: Eliminar campos que no existen en la tabla evt_gastos
    const camposNoExistentes = [
      'uso_cfdi',
      'regimen_fiscal_receptor',
      'regimen_fiscal_emisor',
      'direccion_proveedor',
      'email_proveedor',
      'establecimiento_info',
      'folio' // Solo existe folio_fiscal
    ];
    
    camposNoExistentes.forEach(campo => {
      if (campo in dataToSend) {
        delete (dataToSend as any)[campo];
      }
    });
    
    // 🔧 CORRECCIÓN CRÍTICA: Convertir cadenas vacías a null para campos numéricos
    // Esto evita el error "invalid input syntax for type integer: ''"
    if (!dataToSend.categoria_id || dataToSend.categoria_id.toString().trim() === '') {
      dataToSend.categoria_id = null as any;
      console.log('  🔧 categoria_id vacío convertido a null');
    }
    
    // 🔧 CORRECCIÓN CRÍTICA: Convertir cadenas vacías a null para campos SAT
    // La restricción check_forma_pago_sat solo acepta NULL o códigos válidos ('01', '02', '03', '04', '05', '28', '99')
    if (!dataToSend.forma_pago_sat || dataToSend.forma_pago_sat.trim() === '') {
      dataToSend.forma_pago_sat = '99'; // Default: 99 = Por definir (más seguro)
      console.log('  ⚠️ forma_pago_sat vacío, usando default: 99 (Por definir)');
    }
    
    // Validar que forma_pago_sat sea un código válido
    const codigosValidos = ['01', '02', '03', '04', '05', '28', '99'];
    if (!codigosValidos.includes(dataToSend.forma_pago_sat)) {
      console.error('❌ ERROR: forma_pago_sat inválido:', dataToSend.forma_pago_sat);
      toast.error(`Código de forma de pago SAT inválido: ${dataToSend.forma_pago_sat}`);
      return;
    }
    
    console.log('  ✅ forma_pago_sat validado:', dataToSend.forma_pago_sat);
    
    // Convertir detalle_compra de texto legible a JSONB
    if ((formData as any)._detalle_compra_json) {
      // Si tenemos el JSON temporal, usarlo
      dataToSend.detalle_compra = JSON.stringify((formData as any)._detalle_compra_json);
      console.log('  ✅ Usando detalle_compra desde JSON temporal:', (formData as any)._detalle_compra_json);
    } else if (formData.detalle_compra) {
      // Si el usuario editó el textarea, intentar parsear
      try {
        // Intentar parsear como JSON primero
        const parsed = JSON.parse(formData.detalle_compra);
        dataToSend.detalle_compra = JSON.stringify(parsed);
        console.log('  ✅ Detalle compra parseado como JSON:', parsed);
      } catch {
        // Si no es JSON, parsear el formato de texto legible
        console.log('  🔄 Convirtiendo formato texto a JSON...');
        const lines = formData.detalle_compra.split('\n').filter(l => l.trim());
        const productos = lines.map(line => {
          // Formato: "1 x PRODUCTO_NAME - $150.00 = $150.00"
          const match = line.match(/^(\d+)\s*x\s*(.+?)\s*-\s*\$?([\d.]+)\s*=\s*\$?([\d.]+)$/);
          if (match && match[1] && match[2] && match[3] && match[4]) {
            return {
              descripcion: match[2].trim(),
              cantidad: parseInt(match[1]),
              precio_unitario: parseFloat(match[3]),
              total: parseFloat(match[4])
            };
          }
          return null;
        }).filter(Boolean);
        
        dataToSend.detalle_compra = JSON.stringify(productos);
        console.log('  ✅ Detalle compra convertido a JSON:', productos);
      }
    } else {
      console.log('  ⚠️ No hay detalle de compra');
      dataToSend.detalle_compra = JSON.stringify([]);
    }

    setIsSubmitting(true);
    try {
      console.log('📤 [DualOCRExpenseForm] Enviando datos a onSave...');
      console.log('📦 [DualOCRExpenseForm] Detalle compra final (JSONB):', dataToSend.detalle_compra);
      console.log('📋 [DualOCRExpenseForm] Todos los datos a enviar:', JSON.stringify(dataToSend, null, 2));
      
      // Llamar a onSave (que ejecutará la mutación)
      onSave(dataToSend);
      
      console.log('✅ [DualOCRExpenseForm] onSave ejecutado correctamente');
      
      // El toast de éxito lo mostramos aquí, pero la mutación puede fallar después
      // Por eso agregamos logs en el ExpenseTab para ver qué pasa
    } catch (error) {
      console.error('❌ [DualOCRExpenseForm] Error al llamar onSave:', error);
      console.error('❌ [DualOCRExpenseForm] Stack:', error instanceof Error ? error.stack : 'N/A');
      toast.error(`Error al guardar el gasto: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 max-w-7xl mx-auto ${className}`}>
      {/* Header con botón de cerrar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-red-50 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {expense ? 'Editar Gasto' : 'Nuevo Gasto con OCR'}
            </h2>
            <p className="text-sm text-gray-600">Extracción automática de datos</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-100 transition-colors"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">

      {/* ✅ OCR TRADICIONAL: Sistema optimizado sin IA externa */}
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              ✅ OCR Optimizado con Reglas Inteligentes
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                90%+ Precisión
              </span>
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Sistema de extracción con validación automática y reglas expertas - Sin costos adicionales
            </p>
          </div>
        </div>
      </div>

      {/* 📎 SECCIÓN DE ARCHIVOS ADJUNTOS - SISTEMA DUAL XML + VISUAL */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documentos del Gasto
          </div>
        </label>

        {/* ZONAS DE UPLOAD EN UNA SOLA FILA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 🆕 ZONA 1: XML CFDI (Facturas) */}
          <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-700 font-bold">📄</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">XML CFDI</h3>
                <p className="text-xs text-gray-600">100% precisa</p>
              </div>
            </div>

            {!xmlFile && (
              <div className="relative">
                <input
                  type="file"
                  id="xmlInput"
                  accept=".xml,text/xml,application/xml"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      console.log('📄 XML seleccionado:', selectedFile.name);
                      setXmlFile(selectedFile);
                      setFile(selectedFile);
                    }
                  }}
                  className="hidden"
                  disabled={isProcessingOCR}
                />
                <label
                  htmlFor="xmlInput"
                  className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:bg-purple-100/50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-purple-700 font-medium">
                    XML aquí
                  </span>
                </label>
              </div>
            )}

            {xmlFile && (
              <div className="p-3 bg-purple-100 border border-purple-300 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-700" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{xmlFile.name}</p>
                      <p className="text-xs text-gray-600">{(xmlFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setXmlFile(null);
                      if (file?.name.endsWith('.xml')) setFile(null);
                    }}
                    className="px-2 py-1 text-xs text-purple-700 hover:bg-purple-200 rounded"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 🆕 ZONA 2: PDF/Imagen (Visual) */}
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-700 font-bold">📷</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">PDF/Imagen</h3>
                <p className="text-xs text-gray-600">Visual o Ticket • OCR</p>
              </div>
            </div>

            {!visualFile && (
              <div className="relative">
                <input
                  type="file"
                  id="visualInput"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      console.log('📷 Archivo visual seleccionado:', selectedFile.name);
                      setVisualFile(selectedFile);
                      setFile(selectedFile);
                    }
                  }}
                  className="hidden"
                  disabled={isProcessingOCR}
                />
                <label
                  htmlFor="visualInput"
                  className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100/50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">
                    PDF/Imagen aquí
                  </span>
                </label>
              </div>
            )}

            {visualFile && (
              <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-700" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{visualFile.name}</p>
                      <p className="text-xs text-gray-600">{(visualFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVisualFile(null);
                      if (file?.name.match(/\.(pdf|jpg|jpeg|png)$/i)) setFile(null);
                    }}
                    className="px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 rounded"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 💡 Mensaje informativo */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mt-4">
          <p className="text-xs text-gray-600">
            <strong>💡 Tip:</strong> Para facturas, sube ambos archivos (XML + PDF) para obtener datos precisos del SAT más el archivo visual. Para tickets, sube solo la imagen.
          </p>
        </div>

        {/* 🚀 BOTÓN PARA PROCESAR DOCUMENTOS */}
        {(xmlFile || visualFile) && !isProcessingOCR && (
          <button
            type="button"
            onClick={processDocuments}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Loader2 className="w-5 h-5" />
            {xmlFile && visualFile && '🎯 Procesar XML + Archivo Visual'}
            {xmlFile && !visualFile && '📄 Extraer Datos del XML'}
            {!xmlFile && visualFile && '🔍 Procesar con OCR'}
          </button>
        )}

        {/* Mensaje de procesamiento */}
        {isProcessingOCR && (
          <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-yellow-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Procesando...</p>
                <p className="text-xs text-gray-600 mt-1">{ocrProgress || 'Extrayendo datos del documento'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Drag & drop funcional (invisible pero activo) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={isDragging ? "fixed inset-0 z-50 bg-blue-500/20 flex items-center justify-center" : "hidden"}
      >
        {isDragging && (
          <div className="bg-white p-8 rounded-xl shadow-2xl border-4 border-blue-500 border-dashed">
            <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <p className="text-2xl font-bold text-gray-900">¡Suelta el archivo aquí!</p>
          </div>
        )}
      </div>

      {/* Resultado OCR */}
      {/*ocrResult && (
        <div className={`mb-6 p-4 rounded-lg border ${
          ocrResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {ocrResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium">
              {ocrResult.success ? 'OCR Completado' : 'Error en OCR'} - {ocrResult.engine}
            </span>
            {ocrResult.isRealData && (
              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-semibold">
                📄 DATOS REALES
              </span>
            )}
            {ocrResult.confidence && (
              <span className={`px-2 py-1 text-xs rounded-full ${
                ocrResult.confidence > 80 ? 'bg-green-100 text-green-800' : 
                ocrResult.confidence > 60 ? 'bg-yellow-100 text-yellow-800' : 
                'bg-red-100 text-red-800'
              }`}>
                {ocrResult.confidence}% confianza
              </span>
            )}
          </div>
          
          {ocrResult.success && ocrResult.data && (
            <div className="text-sm text-gray-600">
              <p><strong>Establecimiento:</strong> {ocrResult.data.establecimiento || 'No detectado'}</p>
              <p><strong>Total:</strong> {ocrResult.data.total ? formatCurrency(ocrResult.data.total) : 'No detectado'}</p>
              <p><strong>RFC:</strong> {ocrResult.data.rfc || 'No detectado'}</p>
            </div>
          )}
          
          {!ocrResult.success && (
            <p className="text-sm text-red-600">{ocrResult.error}</p>
          )}
        </div>
      )*/}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Concepto */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Concepto *
            </label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => setFormData(prev => ({ ...prev, concepto: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Ej: Compra de materiales"
            />
            {errors.concepto && <p className="text-red-600 text-xs mt-0.5">{errors.concepto}</p>}
          </div>

          {/* Total con máscara de dinero */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Total *
            </label>
            <input
              type="text"
              value={formData.total ? formData.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                const parsed = parseFloat(value);
                setFormData(prev => ({ ...prev, total: isNaN(parsed) ? 0 : parseFloat(parsed.toFixed(2)) }));
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="0.00"
              style={{ appearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
            />
            {errors.total && <p className="text-red-600 text-xs mt-0.5">{errors.total}</p>}
          </div>

          {/* Proveedor */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Proveedor
            </label>
            <input
              type="text"
              value={formData.proveedor}
              onChange={(e) => setFormData(prev => ({ ...prev, proveedor: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Nombre del proveedor"
            />
          </div>

          {/* RFC Proveedor */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              RFC Proveedor
            </label>
            <input
              type="text"
              value={formData.rfc_proveedor}
              onChange={(e) => setFormData(prev => ({ ...prev, rfc_proveedor: e.target.value.toUpperCase() }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="RFC del proveedor"
            />
          </div>

          {/* Teléfono Proveedor */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.telefono_proveedor}
              onChange={(e) => setFormData(prev => ({ ...prev, telefono_proveedor: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="10 dígitos"
              maxLength={10}
            />
          </div>

          {/* Email Proveedor */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email_proveedor}
              onChange={(e) => setFormData(prev => ({ ...prev, email_proveedor: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="correo@ejemplo.com"
            />
          </div>

          {/* Dirección Proveedor */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={formData.direccion_proveedor}
              onChange={(e) => setFormData(prev => ({ ...prev, direccion_proveedor: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Calle, número, colonia, CP, ciudad"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Fecha del Gasto
            </label>
            <input
              type="date"
              value={formData.fecha_gasto}
              onChange={(e) => setFormData(prev => ({ ...prev, fecha_gasto: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={formData.categoria_id}
              onChange={(e) => setFormData(prev => ({ ...prev, categoria_id: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Seleccionar categoría</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Responsable */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Responsable *
            </label>
            <select
              value={formData.responsable_id}
              onChange={(e) => setFormData(prev => ({ ...prev, responsable_id: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            >
              <option value="">Seleccionar responsable</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Cuenta Bancaria */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Cuenta Bancaria *
            </label>
            <select
              value={formData.cuenta_id}
              onChange={(e) => setFormData(prev => ({ ...prev, cuenta_id: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            >
              <option value="">Seleccionar cuenta</option>
              {filteredCuentas?.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.codigo} - {cuenta.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Estado de Aprobación */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Estado de Aprobación
            </label>
            <select
              value={formData.status_aprobacion}
              onChange={(e) => setFormData(prev => ({ ...prev, status_aprobacion: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="pendiente">⏳ Pendiente</option>
              <option value="aprobado">✅ Aprobado</option>
              <option value="rechazado">❌ Rechazado</option>
            </select>
          </div>
        </div>

        {/* Descripción y Detalle - Compactos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Descripción detallada del gasto"
            />
          </div>

          {/* Información General del Establecimiento */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Info. Establecimiento
              <span className="text-xs text-gray-400 ml-1">(Sucursal, horario, etc.)</span>
            </label>
            <textarea
              value={formData.establecimiento_info}
              onChange={(e) => setFormData(prev => ({ ...prev, establecimiento_info: e.target.value }))}
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Ej: Sucursal: Centro | Horario: 9:00 - 18:00"
            />
          </div>
        </div>

        {/* Detalle de Compra (productos extraídos del ticket) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Detalle de Compra
            <span className="text-xs text-gray-400 ml-1">(Productos del ticket - Un renglón por producto)</span>
          </label>
          <textarea
            value={formData.detalle_compra}
            onChange={(e) => setFormData(prev => ({ ...prev, detalle_compra: e.target.value }))}
            rows={4}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-xs"
            placeholder="1. 1 x TORTA ESPECIAL - $150.00 = $150.00&#10;2. 2 x REFRESCO - $25.00 = $50.00"
          />
        </div>

        {/* Sección SAT - Datos Fiscales del Comprobante - COLAPSABLE */}
        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowSATFields(!showSATFields)}
            className="flex items-center justify-between w-full text-left p-2 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              📄 Datos Fiscales SAT (CFDI)
              <span className="text-xs font-normal text-gray-500">(Opcional - No obligatorio)</span>
            </h4>
            {showSATFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showSATFields && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
            {/* Tipo de Comprobante */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tipo Comprobante
              </label>
              <select
                value={formData.tipo_comprobante}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo_comprobante: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
              >
                <option value="I">I - Ingreso</option>
                <option value="E">E - Egreso</option>
                <option value="T">T - Traslado</option>
                <option value="N">N - Nómina</option>
                <option value="P">P - Pago</option>
              </select>
            </div>

            {/* UUID CFDI */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                UUID
              </label>
              <input
                type="text"
                value={formData.uuid_cfdi}
                onChange={(e) => setFormData(prev => ({ ...prev, uuid_cfdi: e.target.value.toUpperCase() }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="UUID"
                maxLength={36}
              />
            </div>

            {/* Serie */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Serie
              </label>
              <input
                type="text"
                value={formData.serie}
                onChange={(e) => setFormData(prev => ({ ...prev, serie: e.target.value.toUpperCase() }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="Serie"
              />
            </div>

            {/* Folio */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Folio
              </label>
              <input
                type="text"
                value={formData.folio}
                onChange={(e) => setFormData(prev => ({ ...prev, folio: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="Folio"
              />
            </div>

            {/* Folio Fiscal */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Folio Fiscal
              </label>
              <input
                type="text"
                value={formData.folio_fiscal}
                onChange={(e) => setFormData(prev => ({ ...prev, folio_fiscal: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="Folio fiscal"
              />
            </div>

            {/* Método de Pago SAT */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Método Pago
              </label>
              <select
                value={formData.metodo_pago_sat}
                onChange={(e) => setFormData(prev => ({ ...prev, metodo_pago_sat: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Seleccionar</option>
                <option value="PUE">PUE</option>
                <option value="PPD">PPD</option>
              </select>
            </div>

            {/* Forma de Pago SAT */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Forma Pago
              </label>
              <select
                value={formData.forma_pago_sat}
                onChange={(e) => setFormData(prev => ({ ...prev, forma_pago_sat: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Seleccionar</option>
                <option value="01">01 - Efectivo</option>
                <option value="02">02 - Cheque</option>
                <option value="03">03 - Transferencia</option>
                <option value="04">04 - Tarj. crédito</option>
                <option value="28">28 - Tarj. débito</option>
                <option value="99">99 - Por definir</option>
              </select>
            </div>

            {/* Uso CFDI */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Uso CFDI
              </label>
              <select
                value={formData.uso_cfdi}
                onChange={(e) => setFormData(prev => ({ ...prev, uso_cfdi: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Seleccionar</option>
                <option value="G01">G01 - Mercancías</option>
                <option value="G02">G02 - Devoluciones</option>
                <option value="G03">G03 - Gastos</option>
                <option value="P01">P01 - Por definir</option>
              </select>
            </div>

            {/* Régimen Fiscal Receptor */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Régimen Fiscal
              </label>
              <input
                type="text"
                value={formData.regimen_fiscal_receptor}
                onChange={(e) => setFormData(prev => ({ ...prev, regimen_fiscal_receptor: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="Ej: 601, 612"
              />
            </div>

            {/* Lugar de Expedición */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Lugar Expedición (C.P.)
              </label>
              <input
                type="text"
                value={formData.lugar_expedicion}
                onChange={(e) => setFormData(prev => ({ ...prev, lugar_expedicion: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="C.P."
                maxLength={5}
              />
            </div>

            {/* Moneda */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Moneda
              </label>
              <select
                value={formData.moneda}
                onChange={(e) => setFormData(prev => ({ ...prev, moneda: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            {/* Tipo de Cambio */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tipo Cambio
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.tipo_cambio}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo_cambio: parseFloat(e.target.value) || 1 }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                placeholder="1.0000"
              />
            </div>
          </div>
          )}
        </div>

        {/* Resumen de cálculos */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Resumen de Cálculos
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Subtotal:</p>
              <p className="font-medium">{formatCurrency(subtotal)}</p>
            </div>
            <div>
              <p className="text-gray-600">IVA ({formData.iva_porcentaje}%):</p>
              <p className="font-medium">{formatCurrency(iva)}</p>
            </div>
            <div>
              <p className="text-gray-600">Total:</p>
              <p className="font-semibold text-lg">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>

        {/* Botón de Guardar - Sticky al fondo */}
        <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-200 -mx-6 px-6">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg shadow-lg flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {expense ? 'Actualizar Gasto' : 'Guardar Gasto'}
              </>
            )}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
};