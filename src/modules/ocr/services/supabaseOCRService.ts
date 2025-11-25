/**
 * 🚀 SUPABASE OCR SERVICE
 * 
 * Cliente para consumir Edge Function de OCR en Supabase
 * Reemplaza las llamadas a server/ocr-api.js (Node.js)
 */

import React from 'react';
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
 * Procesa un archivo con OCR usando Supabase Edge Function
 */
export async function processFileWithOCR(file: File): Promise<OCRResult> {
  try {
    console.log(`📄 Iniciando OCR para: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    // Convertir archivo a base64
    const base64 = await fileToBase64(file);

    // Obtener URL de la Edge Function
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-process`;

    console.log('🔗 Llamando a Edge Function:', functionUrl);

    // Llamar a Edge Function (sin autenticación ya que usamos --no-verify-jwt)
    // Timeout de 60 segundos (Google Vision puede tardar en cold start)
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
      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        
        let errorData: OCRError;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const result: OCRResult = await response.json();

      console.log(`✅ OCR completado: ${result.confianza_general}% confianza, ${result.lineas.length} líneas`);

      return result;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Timeout: La Edge Function no respondió en 60 segundos. Puede ser cold start de Google Vision.');
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Error en OCR:', error);
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
      // Remover el prefijo "data:image/...;base64,"
      const base64Clean = base64.split(',')[1];
      resolve(base64Clean);
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Verifica si la Edge Function está disponible
 */
export async function checkOCRStatus(): Promise<{
  available: boolean;
  message: string;
}> {
  try {
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-process`;
    
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const response = await fetch(functionUrl, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    });

    if (response.ok) {
      return {
        available: true,
        message: 'Edge Function disponible',
      };
    }

    return {
      available: false,
      message: 'Edge Function no responde',
    };

  } catch (error) {
    console.error('Error verificando OCR:', error);
    return {
      available: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Hook React para usar OCR de Supabase
 */
export function useSupabaseOCR() {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const processFile = async (file: File): Promise<OCRResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await processFileWithOCR(file);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error en OCR:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processFile,
    isProcessing,
    error,
  };
}

// Para compatibilidad con código existente, exportamos como default
export default {
  processFileWithOCR,
  checkOCRStatus,
  useSupabaseOCR,
};
