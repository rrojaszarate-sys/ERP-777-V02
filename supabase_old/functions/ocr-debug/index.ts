/**
 * FUNCIÓN TEMPORTAL DE DEBUG OCR
 * 
 * Esta función es para debugging - muestra exactamente qué texto
 * está extrayendo Google Vision y cómo lo está procesando
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 [DEBUG OCR] Iniciando función de debug...')
    console.log('📡 Headers:', req.headers)

    // Parsear FormData
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      throw new Error('Falta el archivo')
    }

    console.log('📄 Archivo recibido:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`)

    // Procesar con Google Vision
    const credentialsJson = Deno.env.get('GOOGLE_VISION_CREDENTIALS')
    if (!credentialsJson) {
      throw new Error('GOOGLE_VISION_CREDENTIALS no configurado en variables de entorno')
    }

    const credentials = JSON.parse(credentialsJson)

    // Convertir a base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    // Llamar a Google Vision
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${credentials.api_key || ''}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getGoogleAccessToken(credentials)}`
        },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [{
              type: 'TEXT_DETECTION',
              maxResults: 1
            }],
            imageContext: {
              languageHints: ['es', 'en']
            }
          }]
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status}`)
    }

    const result = await response.json()
    const textAnnotations = result.responses[0]?.textAnnotations || []

    if (textAnnotations.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se detectó texto en la imagen'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const textoCompleto = textAnnotations[0].description || ''

    console.log('📝 TEXTO EXTRAÍDO:')
    console.log('=' + '='.repeat(50))
    console.log(textoCompleto)
    console.log('=' + '='.repeat(50))

    // Dividir en líneas para análisis
    const lines = textoCompleto.split('\n')
    console.log('📋 LÍNEAS DETECTADAS:')
    lines.forEach((line, index) => {
      console.log(`${index + 1}: "${line}"`)
    })

    // Buscar el patrón TOTAL específicamente
    console.log('🔍 BUSCANDO TOTAL...')
    
    // Múltiples patrones para encontrar el total
    const totalPatterns = [
      /TOTAL[\s:]*\$?[\s]*([0-9]{1,4}(?:\.[0-9]{2})?)/i,
      /TOTAL[\s:]*([0-9]{1,4}\.[0-9]{2})/i,
      /^TOTAL.*?([0-9]{1,4}\.[0-9]{2})$/im,
      /\$([0-9]{1,4}\.[0-9]{2})/g
    ]

    let totalEncontrado = null
    let patronUsado = null

    for (let i = 0; i < totalPatterns.length; i++) {
      const pattern = totalPatterns[i]
      const match = textoCompleto.match(pattern)
      if (match) {
        totalEncontrado = parseFloat(match[1])
        patronUsado = i + 1
        console.log(`✅ Total encontrado con patrón ${patronUsado}: ${totalEncontrado}`)
        break
      }
    }

    if (!totalEncontrado) {
      console.log('❌ NO SE ENCONTRÓ TOTAL')
      console.log('🔍 Buscando todos los números con formato de precio...')
      
      const allNumbers = textoCompleto.match(/\$?([0-9]{1,4}\.[0-9]{2})/g) || []
      console.log('💰 Números encontrados:', allNumbers)
    }

    // Buscar establecimiento
    const establecimiento = lines.find(line => 
      line.trim().length > 3 && 
      !line.match(/^(CALLE|CALL|AV\.|TEL|RFC)/i)
    )?.trim()

    console.log('🏪 Establecimiento:', establecimiento)

    return new Response(
      JSON.stringify({
        success: true,
        debug: {
          texto_completo: textoCompleto,
          lineas: lines,
          total_encontrado: totalEncontrado,
          patron_usado: patronUsado,
          establecimiento: establecimiento,
          longitud_texto: textoCompleto.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Función auxiliar para Google Auth
async function getGoogleAccessToken(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const jwtPayload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-vision',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify(jwtPayload))
  const signature = await signJWT(header + '.' + payload, credentials.private_key)

  const jwt = `${header}.${payload}.${signature}`

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })

  const result = await response.json()
  return result.access_token
}

async function signJWT(data: string, privateKey: string): Promise<string> {
  // Implementación simplificada - en producción usar librerías crypto adecuadas
  return btoa('signature_placeholder')
}