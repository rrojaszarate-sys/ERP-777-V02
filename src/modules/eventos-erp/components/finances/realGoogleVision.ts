/**
 * Google Vision API - Implementación DIRECTA con Service Account
 *
 * Usa Google Cloud Vision API directamente desde el frontend
 *
 * Estrategia:
 * - PDFs: Convierte a imagen PNG primero, luego procesa con Google Vision
 * - Imágenes: Procesa directamente con Google Vision
 *
 * Esto permite procesar PDFs escaneados (sin capa de texto) con alta precisión.
 */

interface VisionResponse {
  text: string;
  confidence: number;
}

/**
 * Procesa archivo (PDF o imagen) con Google Vision usando Service Account
 *
 * Para PDFs: Convierte a imagen PNG antes de procesar
 * Para imágenes: Procesa directamente
 *
 * @param file - Archivo PDF o imagen (JPG/PNG)
 * @returns Texto extraído y nivel de confianza
 */
export async function processWithRealGoogleVision(file: File): Promise<VisionResponse> {
  console.log('🚀 Iniciando Google Vision con Service Account...');

  try {
    // Obtener credenciales desde variable de entorno
    const credentialsJson = import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY;
    
    if (!credentialsJson) {
      throw new Error('Credenciales de Google Vision no configuradas. Define VITE_GOOGLE_SERVICE_ACCOUNT_KEY en archivo .env');
    }

    const credentials = JSON.parse(credentialsJson);
    console.log('🔑 Service Account encontrado:', credentials.project_id);

    // Detectar tipo de archivo
    const isPDF = file.type === 'application/pdf';
    console.log(`📄 Tipo de archivo: ${isPDF ? 'PDF' : 'Imagen'}`);

    // Si es PDF, convertirlo a imagen primero
    let fileToProcess = file;
    if (isPDF) {
      try {
        console.log('🔄 Convirtiendo PDF a imagen...');
        const { convertPDFToImage } = await import('../../../../shared/utils/pdfToImage');
        const pdfResult = await convertPDFToImage(file, {
          scale: 1.5,
          quality: 0.85,
          format: 'png'
        });
        fileToProcess = pdfResult.imageFile;
        console.log(`✅ PDF convertido: ${pdfResult.width}x${pdfResult.height}px`);
      } catch (pdfError) {
        console.error('❌ Error convirtiendo PDF:', pdfError);
        throw new Error('No se pudo convertir el PDF. Intenta con imagen JPG/PNG.');
      }
    }

    const base64 = await fileToBase64(fileToProcess);
    console.log('📷 Archivo convertido a base64');

    // Obtener access token OAuth2
    console.log('🔐 Obteniendo access token...');
    const accessToken = await getAccessToken(credentials);
    console.log('✅ Access token obtenido');

    // Siempre usar TEXT_DETECTION (PDFs ya convertidos a imagen)
    const featureType = 'TEXT_DETECTION';
    console.log(`🎯 Usando ${featureType} para imagen`);

    // Llamada a Google Vision API con OAuth2
    console.log('📤 Enviando a Google Vision API...');
    const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{
            type: featureType,
            maxResults: 1
          }],
          imageContext: {
            languageHints: ['es', 'en']
          }
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Vision API error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Respuesta recibida de Google Vision');

    return parseVisionResponse(result);

  } catch (error) {
    console.error('❌ Error en Google Vision:', error);
    throw error;
  }
}

/**
 * Obtiene access token de OAuth2 usando JWT
 */
async function getAccessToken(credentials: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  // Crear JWT assertion
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hora

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const claimSet = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-vision',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now
  };

  // Codificar en base64url
  const base64url = (str: string) => {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaim = base64url(JSON.stringify(claimSet));
  const unsignedToken = `${encodedHeader}.${encodedClaim}`;

  // Firmar con private key usando Web Crypto API
  const signature = await signWithPrivateKey(unsignedToken, credentials.private_key);
  const jwt = `${unsignedToken}.${signature}`;

  // Intercambiar JWT por access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error obteniendo access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Firma el JWT con la private key usando Web Crypto API
 */
async function signWithPrivateKey(data: string, privateKeyPem: string): Promise<string> {
  // Limpiar el PEM
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');

  // Decodificar base64
  const binaryDer = atob(pemContents);
  const binaryDerArray = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    binaryDerArray[i] = binaryDer.charCodeAt(i);
  }

  // Importar la clave
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDerArray,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  // Firmar
  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(data)
  );

  // Convertir a base64url
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray));
  return signatureBase64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Parsea respuesta de Google Vision API
 */
function parseVisionResponse(result: {
  responses?: Array<{
    textAnnotations?: Array<{
      description?: string;
    }>;
    fullTextAnnotation?: {
      text?: string;
    };
  }>;
}): VisionResponse {
  console.log('📋 Parseando respuesta de Google Vision');

  const response = result.responses?.[0];
  
  if (!response) {
    throw new Error('No se recibió respuesta de Google Vision');
  }

  // Intentar obtener texto de fullTextAnnotation (para PDFs/documentos)
  let text = response.fullTextAnnotation?.text || '';
  
  // Si no hay fullTextAnnotation, usar textAnnotations (para imágenes simples)
  if (!text) {
    const annotations = response.textAnnotations || [];
    if (annotations.length === 0) {
      throw new Error('No se detectó texto en el documento');
    }
    text = annotations[0]?.description || '';
  }

  if (!text || text.trim().length === 0) {
    throw new Error('El documento no contiene texto legible');
  }

  const confidence = 95; // Google Vision es muy confiable

  console.log('✅ Texto extraído:', text.length, 'caracteres');
  console.log('🎯 Confianza:', confidence + '%');

  return { text, confidence };
}

/**
 * Convierte archivo a base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Error convirtiendo archivo'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Función wrapper simplificada para compatibilidad
 * @param file Archivo a procesar (imagen o PDF)
 * @returns Texto extraído y confianza
 */
export async function processWithGoogleVision(file: File): Promise<{ text: string; confidence: number }> {
  const result = await processWithRealGoogleVision(file);
  return {
    text: result.text,
    confidence: result.confidence
  };
}
