/**
 * FUNCIÓN TEMPORAL: OCR Simple Test
 * 
 * Esta función simula el procesamiento OCR sin Google Vision
 * para probar que todo el flujo funciona correctamente
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-development-mode',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
  }

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 [OCR Test Function] Iniciando...')

    // DESARROLLO: Bypass de autenticación para pruebas
    const authHeader = req.headers.get('Authorization')
    const devModeHeader = req.headers.get('X-Development-Mode')
    const isDevelopment = devModeHeader === 'true' || (!authHeader && devModeHeader !== 'false')
    
    if (isDevelopment) {
      console.log('🔓 [DEV] Modo desarrollo detectado - bypass de autenticación activado')
    } else {
      console.log('🔐 [PROD] Modo producción - verificando autenticación...')
    }

    // Inicializar Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parsear FormData
    const formData = await req.formData()
    const file = formData.get('file') as File
    const eventoId = formData.get('evento_id') as string || formData.get('eventoId') as string
    const userId = formData.get('created_by') as string || formData.get('userId') as string

    console.log('📄 Datos recibidos:', {
      fileName: file?.name,
      fileSize: file?.size,
      eventoId,
      userId
    })

    if (!file || !eventoId || !userId) {
      throw new Error('Faltan parámetros: file, evento_id, created_by')
    }

    // SIMULACIÓN: Procesar imagen con OCR falso
    console.log('🔍 Procesando imagen con OCR simulado...')
    
    const textoSimulado = `
TORTAS GIGANTES SUR 12
RFC: ABC123456789
TEL: 55-1234-5678
FECHA: 03/09/2025
HORA: 14:30

PRODUCTOS:
TORTA ESPECIAL       1    $125.00
REFRESCO COCA        1     $25.00
PAPAS FRITAS         1     $45.00

SUBTOTAL:                  $195.00
IVA:                        $31.20
TOTAL:                     $226.20

FORMA DE PAGO: EFECTIVO
GRACIAS POR SU COMPRA
    `

    // Datos extraídos simulados
    const datosExtraidos = {
      establecimiento: "TORTAS GIGANTES SUR 12",
      direccion: null,
      telefono: "55-1234-5678",
      rfc: "ABC123456789",
      fecha: "03/09/2025",
      hora: "14:30",
      total: 226.20,
      subtotal: 195.00,
      iva: 31.20,
      forma_pago: "EFECTIVO",
      productos: [
        {
          nombre: "TORTA ESPECIAL",
          cantidad: 1,
          precio_unitario: 125.00
        },
        {
          nombre: "REFRESCO COCA",
          cantidad: 1,
          precio_unitario: 25.00
        },
        {
          nombre: "PAPAS FRITAS",
          cantidad: 1,
          precio_unitario: 45.00
        }
      ]
    }

    // Simular guardado en storage
    console.log('💾 Simulando guardado en storage...')
    const archivoInfo = {
      url: `https://gomnouwackzvthpwyric.supabase.co/storage/v1/object/public/documentos-ocr/${eventoId}/${file.name}`,
      path: `${eventoId}/gastos/${Date.now()}-v1-${file.name}`,
      version: 1
    }

    // Registrar en tabla de documentos OCR
    console.log('📝 Registrando documento OCR...')
    const { data: ocrDoc, error: ocrError } = await supabaseClient
      .from('evt_documentos_ocr')
      .insert({
        evento_id: eventoId,
        nombre_archivo: file.name,
        archivo_path: archivoInfo.path,
        archivo_url: archivoInfo.url,
        version: archivoInfo.version,
        estado_procesamiento: 'completed',
        procesador: 'ocr_simulado',
        texto_completo: textoSimulado,
        confianza_general: 95,
        datos_extraidos: datosExtraidos,
        establecimiento: datosExtraidos.establecimiento,
        rfc: datosExtraidos.rfc,
        total: datosExtraidos.total,
        fecha_documento: datosExtraidos.fecha,
        created_by: userId,
        tiempo_procesamiento_ms: 1500
      })
      .select()
      .single()

    if (ocrError) {
      console.error('❌ Error registrando documento OCR:', ocrError)
      throw ocrError
    }

    console.log('✅ Documento OCR registrado:', ocrDoc.id)

    // Respuesta exitosa
    const response = {
      success: true,
      message: '✅ OCR procesado correctamente (SIMULADO)',
      texto_completo: textoSimulado,
      confianza_general: 95,
      datos_extraidos: datosExtraidos,
      archivo: archivoInfo,
      procesador: 'ocr_simulado',
      documento_id: ocrDoc.id,
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('❌ Error en función OCR Test:', error)
    
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    })
  }
})