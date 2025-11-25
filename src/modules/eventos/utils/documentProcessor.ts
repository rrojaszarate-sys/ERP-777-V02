/**
 * 🧠 PROCESADOR INTELIGENTE DE DOCUMENTOS
 * 
 * Sistema híbrido que procesa:
 * - XML CFDI (facturas) → Extracción 100% precisa
 * - PDF/Imágenes → OCR con Google Vision/Tesseract
 * - XML + PDF → Combina datos XML + archivo de respaldo
 * 
 * Gestiona almacenamiento organizado por tipo y folio
 */

import { supabase } from '../../../core/config/supabase';
import { parseCFDIXml, cfdiToExpenseData } from './cfdiXmlParser';

export type DocumentType = 'xml' | 'pdf' | 'image';
export type ProcessingMode = 'xml_only' | 'ocr_only' | 'hybrid';

export interface DocumentUpload {
  xmlFile?: File;
  visualFile?: File; // PDF o imagen
  mode: ProcessingMode;
}

export interface ProcessedDocument {
  formData: any; // Datos extraídos para el formulario
  storedFiles: {
    xmlUrl?: string;
    visualUrl?: string;
    folderPath: string;
  };
  metadata: {
    hasXML: boolean;
    hasVisual: boolean;
    xmlProcessed: boolean;
    ocrProcessed: boolean;
    confidence?: number;
    folio?: string;
    uuid?: string;
  };
}

/**
 * Detecta el tipo de archivo
 */
export function detectFileType(file: File): DocumentType {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  
  if (fileName.endsWith('.xml') || fileType === 'text/xml' || fileType === 'application/xml') {
    return 'xml';
  }
  
  if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
    return 'pdf';
  }
  
  return 'image';
}

/**
 * Determina el modo de procesamiento según los archivos subidos
 */
export function determineProcessingMode(files: File[]): ProcessingMode {
  const hasXML = files.some(f => detectFileType(f) === 'xml');
  const hasVisual = files.some(f => ['pdf', 'image'].includes(detectFileType(f)));
  
  if (hasXML && hasVisual) return 'hybrid';
  if (hasXML) return 'xml_only';
  return 'ocr_only';
}

/**
 * Genera path de carpeta organizado por folio/UUID
 * Estructura: gastos/EVENTO_ID/FOLIO_o_UUID/
 */
export function generateStoragePath(
  eventId: string, 
  folio?: string, 
  uuid?: string
): string {
  const folderName = folio || uuid || `TEMP_${Date.now()}`;
  const cleanFolderName = folderName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `gastos/${eventId}/${cleanFolderName}`;
}

/**
 * 🚀 PROCESADOR PRINCIPAL - Sistema Híbrido Inteligente
 */
export async function processDocuments(
  eventId: string,
  files: File[],
  onProgress?: (message: string) => void
): Promise<ProcessedDocument> {
  
  const log = (msg: string) => {
    console.log(`📄 [documentProcessor] ${msg}`);
    onProgress?.(msg);
  };
  
  log('Iniciando procesamiento inteligente...');
  
  // 1. CLASIFICAR ARCHIVOS
  const xmlFile = files.find(f => detectFileType(f) === 'xml');
  const visualFile = files.find(f => ['pdf', 'image'].includes(detectFileType(f)));
  const mode = determineProcessingMode(files);
  
  log(`Modo detectado: ${mode}`);
  log(`XML: ${xmlFile ? '✅' : '❌'} | Visual: ${visualFile ? '✅' : '❌'}`);
  
  let formData: any = {};
  let xmlProcessed = false;
  let ocrProcessed = false;
  let confidence: number | undefined;
  let folio: string | undefined;
  let uuid: string | undefined;
  
  // 2. PROCESAR XML (si existe)
  if (xmlFile) {
    try {
      log('📄 Procesando XML CFDI...');
      const xmlContent = await xmlFile.text();
      const cfdiData = await parseCFDIXml(xmlContent);
      
      // Extraer identificadores para carpeta
      folio = cfdiData.folio || cfdiData.serie;
      uuid = cfdiData.timbreFiscal?.uuid;
      
      log(`✅ XML procesado - Folio: ${folio}, UUID: ${uuid}`);
      
      // Convertir a datos del formulario
      formData = cfdiToExpenseData(cfdiData);
      xmlProcessed = true;
      confidence = 100; // XML siempre es 100% confiable
      
      log(`💰 Total extraído: $${formData.total}`);
      
    } catch (error) {
      console.error('❌ Error procesando XML:', error);
      log('⚠️ Error en XML, continuando con OCR si hay archivo visual');
    }
  }
  
  // 3. PROCESAR VISUAL (si existe y no hay XML exitoso)
  if (visualFile && !xmlProcessed) {
    try {
      log('🔍 Procesando con OCR (Google Vision)...');
      
      // TODO: Aquí integrar con tu función de OCR existente
      // const ocrData = await processGoogleVisionOCR(visualFile);
      // formData = ocrData;
      // ocrProcessed = true;
      // confidence = ocrData.confidence;
      
      log('⚠️ OCR no implementado en este módulo (usar función existente)');
      
    } catch (error) {
      console.error('❌ Error procesando OCR:', error);
      log('⚠️ Error en OCR');
    }
  }
  
  // 4. SUBIR ARCHIVOS AL STORAGE
  const storagePath = generateStoragePath(eventId, folio, uuid);
  log(`📁 Creando carpeta: ${storagePath}`);
  
  const storedFiles: ProcessedDocument['storedFiles'] = {
    folderPath: storagePath
  };
  
  // Subir XML
  if (xmlFile) {
    try {
      const xmlPath = `${storagePath}/${xmlFile.name}`;
      log(`⬆️ Subiendo XML: ${xmlPath}`);
      
      const { data: xmlUpload, error: xmlError } = await supabase.storage
        .from('event_docs')
        .upload(xmlPath, xmlFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (xmlError) throw xmlError;
      
      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('event_docs')
        .getPublicUrl(xmlPath);
      
      storedFiles.xmlUrl = publicUrl;
      log(`✅ XML subido: ${publicUrl}`);
      
    } catch (error: any) {
      console.error('❌ Error subiendo XML:', error);
      log(`⚠️ Error subiendo XML: ${error.message}`);
    }
  }
  
  // Subir Visual (PDF/Imagen)
  if (visualFile) {
    try {
      const visualPath = `${storagePath}/${visualFile.name}`;
      log(`⬆️ Subiendo archivo visual: ${visualPath}`);
      
      const { data: visualUpload, error: visualError } = await supabase.storage
        .from('event_docs')
        .upload(visualPath, visualFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (visualError) throw visualError;
      
      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('event_docs')
        .getPublicUrl(visualPath);
      
      storedFiles.visualUrl = publicUrl;
      log(`✅ Visual subido: ${publicUrl}`);
      
    } catch (error: any) {
      console.error('❌ Error subiendo visual:', error);
      log(`⚠️ Error subiendo visual: ${error.message}`);
    }
  }
  
  // 5. PREPARAR RESULTADO
  const result: ProcessedDocument = {
    formData: {
      ...formData,
      evento_id: eventId,
      // Guardar AMBAS URLs si existen
      archivo_adjunto: storedFiles.visualUrl || storedFiles.xmlUrl,
      archivo_xml_url: storedFiles.xmlUrl, // URL específica del XML
      carpeta_documentos: storagePath // Path de la carpeta
    },
    storedFiles,
    metadata: {
      hasXML: !!xmlFile,
      hasVisual: !!visualFile,
      xmlProcessed,
      ocrProcessed,
      confidence,
      folio,
      uuid
    }
  };
  
  log('✅ Procesamiento completado');
  console.log('📊 Resultado final:', result);
  
  return result;
}

/**
 * Valida si un archivo es XML CFDI válido (lectura rápida)
 */
export async function isValidCFDI(file: File): Promise<boolean> {
  try {
    const content = await file.text();
    // Verificar que contenga elementos clave de CFDI
    return content.includes('cfdi:Comprobante') || 
           content.includes('Comprobante') &&
           (content.includes('TimbreFiscalDigital') || content.includes('tfd:TimbreFiscalDigital'));
  } catch {
    return false;
  }
}

/**
 * Obtiene información rápida de un XML sin procesarlo completamente
 */
export async function getXMLQuickInfo(file: File): Promise<{
  folio?: string;
  total?: number;
  emisor?: string;
  fecha?: string;
}> {
  try {
    const content = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');
    
    const comprobante = xmlDoc.querySelector('Comprobante') || 
                        xmlDoc.getElementsByTagNameNS('http://www.sat.gob.mx/cfd/4', 'Comprobante')[0];
    
    if (!comprobante) return {};
    
    return {
      folio: comprobante.getAttribute('Folio') || undefined,
      total: parseFloat(comprobante.getAttribute('Total') || '0'),
      emisor: comprobante.querySelector('Emisor')?.getAttribute('Nombre') || undefined,
      fecha: comprobante.getAttribute('Fecha') || undefined
    };
  } catch {
    return {};
  }
}
