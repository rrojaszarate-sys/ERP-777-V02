/**
 * 🎯 DUAL OCR SERVICE - Supabase Edge Function O Node.js Local
 * 
 * Configuración via .env:
 * - VITE_OCR_PROVIDER='supabase' → Usa Edge Function (puede dar timeout)
 * - VITE_OCR_PROVIDER='nodejs' → Usa servidor local puerto 3001 (recomendado)
 * - VITE_OCR_PROVIDER='tesseract' → Solo Tesseract (sin Google Vision)
 */

import { supabase } from '../../../core/config/supabase';

interface OCRResult {
  texto_completo: string;
  confianza_general: number;
  lineas: Array<{
    texto: string;
    confianza: number;
  }>;
  procesador: string;
  timestamp: string;
}

interface OCRError {
  error: string;
  message?: string;
  stack?: string;
}

/**
 * Procesa un archivo con OCR usando el provider configurado
 */
export async function processFileWithOCR(file: File): Promise<OCRResult> {
  const provider = import.meta.env.VITE_OCR_PROVIDER || 'nodejs';
  
  console.log(`📄 Iniciando OCR con provider: ${provider}`);
  console.log(`   Archivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

  switch (provider) {
    case 'supabase':
      return await processWithSupabase(file);
    case 'nodejs':
      return await processWithNodeJS(file);
    case 'tesseract':
      throw new Error('Tesseract se usa como fallback automático');
    default:
      console.warn(`⚠️ Provider desconocido: ${provider}, usando nodejs`);
      return await processWithNodeJS(file);
  }
}

/**
 * Procesa con Supabase Edge Function
 */
async function processWithSupabase(file: File): Promise<OCRResult> {
  try {
    console.log('🔗 Usando Supabase Edge Function...');
    
    const base64 = await fileToBase64(file);
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-process`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          fileBase64: base64,
          fileName: file.name,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('📡 Supabase response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Supabase error:', errorText);
        
        let errorData: OCRError;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const result: OCRResult = await response.json();
      console.log(`✅ Supabase OCR: ${result.confianza_general}% confianza, ${result.lineas.length} líneas`);

      return result;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Timeout: Supabase Edge Function no respondió en 60 segundos');
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ Error en Supabase OCR:', error);
    throw error;
  }
}

/**
 * Procesa con servidor Node.js local o Vercel
 */
async function processWithNodeJS(file: File): Promise<OCRResult> {
  try {
    // Detectar si estamos en producción (Vercel) o desarrollo (local)
    const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';
    
    // 🚫 DESHABILITADO EN DESARROLLO: El servidor Node.js no existe en Vite dev server
    if (!isProduction) {
      console.log('⚠️ Node.js OCR deshabilitado en desarrollo (usar Tesseract directo)');
      throw new Error('Node.js OCR server no disponible en desarrollo');
    }
    
    const apiUrl = import.meta.env.VITE_OCR_API_URL || '';
    const endpoint = '/api/ocr-process';
    
    console.log('🔗 Usando Node.js server: Vercel (producción)');

    // En producción (Vercel): enviar base64 como JSON
    const base64 = await fileToBase64(file);
    const body = JSON.stringify({ image: base64 });
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errorData: OCRError = await response.json();
      
      // Si el servidor no está disponible, lanzar error específico
      if (response.status === 503 || errorData.fallback === 'use_tesseract') {
        throw new Error('Node.js OCR server no disponible');
      }
      
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
    }

    const rawResult = await response.json();
    
    // Adaptar respuesta de Vercel al formato esperado
    const result: OCRResult = rawResult.success !== undefined
      ? {
          texto_completo: rawResult.text || '',
          confianza_general: Math.round((rawResult.confidence || 0) * 100),
          lineas: rawResult.text ? rawResult.text.split('\n') : [],
          datos_extraidos: rawResult.data || {},
        }
      : rawResult;
    
    const lineas = result.lineas?.length || 0;
    const confianza = result.confianza_general || 0;
    console.log(`✅ Node.js OCR: ${confianza}% confianza${lineas > 0 ? `, ${lineas} líneas` : ''}`);

    return result;
  } catch (error) {
    console.error('❌ Error en Node.js OCR:', error);
    
    // Si es error de red (servidor no corriendo), dar mensaje específico
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Node.js OCR server no está corriendo. Ejecuta: node server/ocr-api.js');
    }
    
    throw error;
  }
}

/**
 * Convierte un archivo a base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Clean = base64.split(',')[1];
      resolve(base64Clean);
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Verifica qué provider está configurado
 */
export function getOCRProvider(): 'supabase' | 'nodejs' | 'tesseract' {
  const provider = import.meta.env.VITE_OCR_PROVIDER || 'nodejs';
  return provider as 'supabase' | 'nodejs' | 'tesseract';
}

/**
 * Hook React para obtener información del OCR
 */
export function useOCRInfo() {
  const provider = getOCRProvider();
  const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';
  const apiUrl = import.meta.env.VITE_OCR_API_URL || (isProduction ? window.location.origin : 'http://localhost:3001');
  
  return {
    provider,
    apiUrl: provider === 'nodejs' ? apiUrl : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-process`,
    displayName: provider === 'supabase' 
      ? 'Supabase Edge Function' 
      : provider === 'nodejs'
      ? isProduction ? 'Vercel Serverless' : 'Node.js Local Server'
      : 'Tesseract Only',
  };
}
