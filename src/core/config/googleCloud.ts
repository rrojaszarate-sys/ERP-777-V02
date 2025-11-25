/**
 * Configuración de Google Cloud Platform para OCR
 */

export interface GoogleCloudConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  privateKeyId: string;
  clientId: string;
  authUri: string;
  tokenUri: string;
  authProviderX509CertUrl: string;
  clientX509CertUrl: string;
}

/**
 * Configuración de Google Vision API
 */
export const getGoogleCloudConfig = (): GoogleCloudConfig | null => {
  try {
    // Método 1: Usar Service Account JSON (más seguro)
    const serviceAccountKey = import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      const config = JSON.parse(serviceAccountKey);
      return {
        projectId: config.project_id,
        clientEmail: config.client_email,
        privateKey: config.private_key,
        privateKeyId: config.private_key_id,
        clientId: config.client_id,
        authUri: config.auth_uri,
        tokenUri: config.token_uri,
        authProviderX509CertUrl: config.auth_provider_x509_cert_url,
        clientX509CertUrl: config.client_x509_cert_url,
      };
    }

    // Método 2: Usar variables individuales
    const projectId = import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_ID;
    const clientEmail = import.meta.env.VITE_GOOGLE_CLIENT_EMAIL;
    const privateKey = import.meta.env.VITE_GOOGLE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      return {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'), // Decodificar saltos de línea
        privateKeyId: import.meta.env.VITE_GOOGLE_PRIVATE_KEY_ID || '',
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        authUri: 'https://accounts.google.com/o/oauth2/auth',
        tokenUri: 'https://oauth2.googleapis.com/token',
        authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
        clientX509CertUrl: import.meta.env.VITE_GOOGLE_CLIENT_X509_CERT_URL || '',
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing Google Cloud config:', error);
    return null;
  }
};

/**
 * Verifica si Google Vision está configurado correctamente
 */
export const isGoogleVisionConfigured = (): boolean => {
  const config = getGoogleCloudConfig();
  return !!(config?.projectId && config?.clientEmail && config?.privateKey);
};

/**
 * Obtiene solo el Project ID para operaciones simples
 */
export const getGoogleCloudProjectId = (): string | null => {
  const config = getGoogleCloudConfig();
  return config?.projectId || import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_ID || null;
};

/**
 * Configuración de OCR específica
 */
export const OCR_CONFIG = {
  maxFileSize: parseInt(import.meta.env.VITE_OCR_MAX_FILE_SIZE) || 10485760, // 10MB
  supportedFormats: (import.meta.env.VITE_OCR_SUPPORTED_FORMATS || 'pdf,jpg,jpeg,png').split(','),
  confidenceThreshold: parseInt(import.meta.env.VITE_OCR_CONFIDENCE_THRESHOLD) || 70,
  languageHints: (import.meta.env.VITE_OCR_LANGUAGE_HINTS || 'es,en').split(','),
  detectTables: import.meta.env.VITE_OCR_DETECT_TABLES === 'true',
  detectHandwriting: import.meta.env.VITE_OCR_DETECT_HANDWRITING === 'true',
};

/**
 * Log de configuración en desarrollo
 */
if (import.meta.env.VITE_ENABLE_CONSOLE_LOGS === 'true') {
  const isConfigured = isGoogleVisionConfigured();
  console.log('🤖 Google Vision API Configuration:');
  console.log('- Configured:', isConfigured ? '✅' : '❌');
  if (isConfigured) {
    console.log('- Project ID:', getGoogleCloudProjectId()?.substring(0, 10) + '...');
    console.log('- Max File Size:', (OCR_CONFIG.maxFileSize / 1024 / 1024).toFixed(1) + 'MB');
    console.log('- Supported Formats:', OCR_CONFIG.supportedFormats.join(', '));
    console.log('- Language Hints:', OCR_CONFIG.languageHints.join(', '));
  } else {
    console.log('- Status: ⚠️ Not configured, using simulation mode');
  }
}