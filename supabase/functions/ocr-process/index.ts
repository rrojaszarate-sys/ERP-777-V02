/**
 * 🚀 Edge Function - Google Vision OCR
 * Usa secrets individuales en lugar de JSON completo
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🎯 OCR Request:', req.method)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Leer secrets individuales
    const projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID')
    const clientEmail = Deno.env.get('GOOGLE_CLOUD_CLIENT_EMAIL')
    const privateKey = Deno.env.get('GOOGLE_CLOUD_PRIVATE_KEY')

    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ Missing credentials')
      return new Response(
        JSON.stringify({ error: 'Google Cloud credentials not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Credentials loaded, project:', projectId)

    const { fileBase64, fileName } = await req.json()
    console.log('📄 Processing:', fileName)

    // Importar Google Vision
    console.log('📦 Importing Google Vision...')
    const { ImageAnnotatorClient } = await import('npm:@google-cloud/vision@4.3.2')
    console.log('✅ Google Vision imported')

    // Crear credentials object
    const credentials = {
      type: 'service_account',
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'), // Fix newlines
    }

    const visionClient = new ImageAnnotatorClient({
      credentials,
      projectId,
    })

    console.log('✅ Vision client created')

    // Procesar imagen
    const imageBuffer = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0))
    console.log('📡 Calling Vision API...')

    const [result] = await visionClient.textDetection({
      image: { content: imageBuffer },
    })

    console.log('✅ Vision API responded')

    const detections = result.textAnnotations

    if (!detections || detections.length === 0) {
      console.log('⚠️ No text detected')
      return new Response(
        JSON.stringify({
          texto_completo: '',
          confianza_general: 0,
          lineas: [],
          procesador: 'google-vision',
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fullText = detections[0]?.description || ''
    const lineas = detections.slice(1).map(det => ({
      texto: det.description || '',
      confianza: 95
    }))

    console.log(`✅ Success: ${lineas.length} lines detected`)

    return new Response(
      JSON.stringify({
        texto_completo: fullText,
        confianza_general: 95,
        lineas,
        procesador: 'google-vision',
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
