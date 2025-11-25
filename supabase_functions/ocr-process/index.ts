/**
 * 🚀 SUPABASE EDGE FUNCTION - OCR PROCESSOR
 * 
 * Reemplazo de server/ocr-api.js usando Deno y Google Vision API
 * 
 * Deploy:
 *   supabase functions deploy ocr-process
 * 
 * Endpoint:
 *   POST https://[project-ref].supabase.co/functions/v1/ocr-process
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { ImageAnnotatorClient } from 'npm:@google-cloud/vision@4.3.2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OCRRequest {
  fileBase64: string
  fileName: string
}

interface OCRResponse {
  texto_completo: string
  confianza_general: number
  lineas: Array<{
    texto: string
    confianza: number
  }>
  procesador: string
  timestamp: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📄 OCR Edge Function invoked')

    // Verificar credenciales de Google Vision
    const credentials = Deno.env.get('GOOGLE_VISION_CREDENTIALS')
    if (!credentials) {
      console.error('❌ GOOGLE_VISION_CREDENTIALS no configurado')
      return new Response(
        JSON.stringify({
          error: 'Google Vision no configurado',
          message: 'Configure GOOGLE_VISION_CREDENTIALS en Supabase Secrets'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const { fileBase64, fileName }: OCRRequest = await req.json()

    if (!fileBase64) {
      return new Response(
        JSON.stringify({ error: 'fileBase64 es requerido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`🔍 Procesando archivo: ${fileName || 'unknown'}`)

    // Inicializar Google Vision Client
    const credentialsObj = JSON.parse(credentials)
    const visionClient = new ImageAnnotatorClient({
      credentials: credentialsObj,
      projectId: credentialsObj.project_id,
    })

    // Convertir base64 a buffer
    const imageBuffer = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0))

    // Llamar a Google Vision API
    const [result] = await visionClient.textDetection({
      image: { content: imageBuffer },
    })

    const detections = result.textAnnotations

    if (!detections || detections.length === 0) {
      console.log('⚠️ No se detectó texto')
      return new Response(
        JSON.stringify({
          texto_completo: '',
          confianza_general: 0,
          lineas: [],
          procesador: 'google_vision',
          timestamp: new Date().toISOString(),
        } as OCRResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Texto completo (primera detección)
    const textoCompleto = detections[0]?.description || ''

    // Líneas individuales (resto de detecciones)
    const lineas = detections.slice(1).map(detection => ({
      texto: detection.description || '',
      confianza: detection.confidence || 0.85, // Google Vision no siempre devuelve confidence
    }))

    // Calcular confianza promedio
    const confianzaGeneral = lineas.length > 0
      ? lineas.reduce((sum, l) => sum + l.confianza, 0) / lineas.length
      : 0.85

    const response: OCRResponse = {
      texto_completo: textoCompleto,
      confianza_general: Math.round(confianzaGeneral * 100),
      lineas,
      procesador: 'google_vision',
      timestamp: new Date().toISOString(),
    }

    console.log(`✅ OCR completado: ${lineas.length} líneas, ${confianzaGeneral.toFixed(2)} confianza`)

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error: unknown) {
    console.error('❌ Error en OCR:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    const errorStack = error instanceof Error ? error.stack : ''
    
    return new Response(
      JSON.stringify({
        error: 'Error procesando OCR',
        message: errorMessage,
        stack: errorStack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/* 
 * 📚 CONFIGURACIÓN REQUERIDA:
 * 
 * 1. En Supabase Dashboard > Settings > Edge Functions > Secrets:
 *    GOOGLE_VISION_CREDENTIALS = {"type":"service_account","project_id":"..."}
 * 
 * 2. Deploy:
 *    supabase functions deploy ocr-process
 * 
 * 3. Test local:
 *    supabase functions serve ocr-process
 * 
 * 4. Logs:
 *    supabase functions logs ocr-process
 */
