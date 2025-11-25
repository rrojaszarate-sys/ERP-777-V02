import React, { useState } from 'react';
import { useAuth } from '../../../core/auth/AuthProvider';

const SimpleOCRDebugPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { user, isDevelopment } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const debugOCRDirect = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // En modo desarrollo, usar el ID del usuario de desarrollo que existe en core_users
      const userId = isDevelopment ? '00000000-0000-0000-0000-000000000001' : user?.id;
      const eventoId = '00000000-0000-0000-0000-000000000001'; // ID de prueba
      
      formData.append('evento_id', eventoId);
      formData.append('created_by', userId || '00000000-0000-0000-0000-000000000001');

      console.log('📤 Enviando archivo OCR:', {
        fileName: file.name,
        userId,
        eventoId,
        isDevelopment
      });

      // Llamada a la función OCR de prueba (simulada) con headers necesarios
      const response = await fetch(
        'https://gomnouwackzvthpwyric.supabase.co/functions/v1/ocr-test',
        {
          method: 'POST',
          headers: {
            'X-Development-Mode': 'true',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDI5ODMsImV4cCI6MjA3NDY3ODk4M30.bVW8sq_ARq6obcz8z12qvt4KZ2P_yVHnJc5CorTXkKg'
          },
          body: formData
        }
      );

      console.log('📡 Response status:', response.status, response.statusText);
      console.log('📡 Response headers:', [...response.headers.entries()]);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      setResult(data);
      
      console.log('🔍 Resultado completo:', data);

    } catch (error) {
      console.error('❌ Error completo:', error);
      setResult({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>🧪 OCR Test - Simulación de Procesamiento</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Función de prueba que simula el procesamiento OCR sin Google Vision. Sube cualquier imagen para probar el flujo completo.
        </p>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          border: '1px solid #90caf9', 
          borderRadius: '5px' 
        }}>
          <strong>📋 Instrucciones:</strong>
          <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
            <li>Selecciona la imagen del ticket de "TORTAS GIGANTES SUR 12"</li>
            <li>Haz click en "Procesar con OCR"</li>
            <li>Verifica que extraiga: Establecimiento, Total ($695.00), Fecha y Productos</li>
            <li>Revisa el texto completo extraído por Google Vision</li>
          </ol>
        </div>

        <div style={{ 
          marginBottom: '15px', 
          padding: '10px', 
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <strong>🔐 Usuario Activo:</strong> {isDevelopment ? `✅ Desarrollo (${user?.nombre})` : `✅ ${user?.nombre || 'Usuario'}`}
          <br />
          <strong>🆔 ID:</strong> {user?.id}
          <br />
          <strong>📧 Email:</strong> {user?.email}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            style={{ 
              marginRight: '15px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
          <button 
            onClick={debugOCRDirect} 
            disabled={!file || loading}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: loading ? '#ccc' : '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {loading ? '🔄 Procesando...' : '🚀 Procesar con OCR'}
          </button>
        </div>

        {result && (
          <div>
            <h2 style={{ color: '#2c3e50', marginBottom: '15px' }}>📋 Resultado del Análisis:</h2>
            
            {result.error ? (
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#ffe6e6', 
                border: '1px solid #ff9999', 
                borderRadius: '5px',
                marginBottom: '15px'
              }}>
                <strong>❌ Error:</strong> {result.error}
                {result.stack && (
                  <pre style={{ 
                    marginTop: '10px', 
                    fontSize: '12px', 
                    backgroundColor: '#f5f5f5', 
                    padding: '10px',
                    overflow: 'auto'
                  }}>
                    {result.stack}
                  </pre>
                )}
              </div>
            ) : result.success ? (
              <>
                <div style={{ 
                  padding: '15px', 
                  backgroundColor: '#e8f5e8', 
                  border: '1px solid #28a745', 
                  borderRadius: '5px',
                  marginBottom: '20px'
                }}>
                  <strong>✅ Análisis Completado Exitosamente</strong>
                  <div style={{ marginTop: '10px' }}>
                    <strong>📏 Longitud del texto:</strong> {result.debug?.longitud_texto || 0} caracteres<br />
                    <strong>🏪 Establecimiento:</strong> {result.debug?.establecimiento || '❌ No detectado'}<br />
                    <strong>💰 Total encontrado:</strong> {
                      result.debug?.total_encontrado ? 
                        `✅ $${result.debug.total_encontrado} (Patrón #${result.debug.patron_usado})` : 
                        '❌ No detectado'
                    }
                  </div>
                </div>

                {/* Texto completo */}
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ color: '#2c3e50' }}>📝 Texto Completo Extraído por Google Vision:</h3>
                  <pre style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '15px', 
                    border: '1px solid #dee2e6', 
                    borderRadius: '5px',
                    whiteSpace: 'pre-wrap',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    maxHeight: '300px',
                    overflow: 'auto',
                    fontFamily: 'Consolas, Monaco, monospace'
                  }}>
                    {result.debug?.texto_completo || 'No hay texto'}
                  </pre>
                </div>

                {/* Líneas detectadas */}
                {result.debug?.lineas && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ color: '#2c3e50' }}>📋 Líneas Detectadas Individualmente:</h3>
                    <div style={{ 
                      backgroundColor: '#f8f9fa', 
                      padding: '15px', 
                      border: '1px solid #dee2e6', 
                      borderRadius: '5px',
                      maxHeight: '250px',
                      overflow: 'auto'
                    }}>
                      {result.debug.lineas.map((linea: string, index: number) => (
                        <div key={index} style={{ 
                          padding: '3px 0', 
                          borderBottom: index < result.debug.lineas.length - 1 ? '1px solid #eee' : 'none',
                          fontSize: '12px',
                          fontFamily: 'Consolas, Monaco, monospace'
                        }}>
                          <span style={{ color: '#666', marginRight: '10px' }}>{index + 1}:</span>
                          <span style={{ backgroundColor: linea.trim().length === 0 ? '#fff3cd' : 'transparent' }}>
                            "{linea}"
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Debug completo */}
                <details style={{ marginTop: '20px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#2c3e50' }}>
                    🔍 Ver Debug Completo (JSON)
                  </summary>
                  <pre style={{ 
                    backgroundColor: '#f0f0f0', 
                    padding: '15px', 
                    border: '1px solid #ccc', 
                    borderRadius: '5px',
                    fontSize: '11px',
                    maxHeight: '300px',
                    overflow: 'auto',
                    marginTop: '10px'
                  }}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </>
            ) : (
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#fff3cd', 
                border: '1px solid #ffc107', 
                borderRadius: '5px'
              }}>
                <strong>⚠️ Respuesta inesperada:</strong>
                <pre style={{ marginTop: '10px', fontSize: '12px' }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        <div style={{ 
          marginTop: '30px', 
          padding: '15px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '5px' 
        }}>
          <h3 style={{ color: '#2c3e50', marginTop: 0 }}>🎯 ¿Qué Buscar?</h3>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li><strong>Texto correcto:</strong> ¿Se ve "TORTAS GIGANTES SUR 12" y "$695.00"?</li>
            <li><strong>Líneas limpias:</strong> ¿Cada línea del ticket está separada correctamente?</li>
            <li><strong>Total detectado:</strong> ¿El patrón encontró correctamente el total?</li>
            <li><strong>Establecimiento:</strong> ¿Se detectó el nombre del restaurante?</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SimpleOCRDebugPage;