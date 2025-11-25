import React, { useState } from 'react';
import { supabase } from '../../../core/config/supabase';

const OCRDebugPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const debugOCR = async () => {
    if (!file) return;

    setLoading(true);
    try {
      // Intentar obtener sesión, pero no es obligatoria para debug
      const { data: { session } } = await supabase.auth.getSession();
      
      const formData = new FormData();
      formData.append('file', file);

      // Headers opcionales - incluir auth si está disponible
      const headers: Record<string, string> = {};
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-debug`,
        {
          method: 'POST',
          headers,
          body: formData
        }
      );

      const data = await response.json();
      setResult(data);
      
      console.log('🔍 Resultado completo:', data);

    } catch (error) {
      console.error('Error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔍 OCR Debug - Análisis de Texto</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange}
          style={{ marginRight: '10px' }}
        />
        <button 
          onClick={debugOCR} 
          disabled={!file || loading}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: loading ? '#ccc' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Analizando...' : 'Analizar Imagen'}
        </button>
      </div>

      {result && (
        <div>
          <h2>📋 Resultado:</h2>
          
          {result.error ? (
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#ffe6e6', 
              border: '1px solid #ff9999', 
              borderRadius: '5px' 
            }}>
              <strong>❌ Error:</strong> {result.error}
            </div>
          ) : (
            <div>
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#e6ffe6', 
                border: '1px solid #99ff99', 
                borderRadius: '5px',
                marginBottom: '10px'
              }}>
                <strong>✅ Texto extraído exitosamente</strong>
                <br />
                <strong>📏 Longitud:</strong> {result.debug?.longitud_texto} caracteres
                <br />
                <strong>🏪 Establecimiento detectado:</strong> {result.debug?.establecimiento || 'No detectado'}
                <br />
                <strong>💰 Total detectado:</strong> {result.debug?.total_encontrado ? `$${result.debug.total_encontrado}` : '❌ No detectado'}
                {result.debug?.patron_usado && (
                  <>
                    <br />
                    <strong>🎯 Patrón usado:</strong> #{result.debug.patron_usado}
                  </>
                )}
              </div>

              <h3>📝 Texto Completo Extraído:</h3>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '15px', 
                border: '1px solid #ddd', 
                borderRadius: '5px',
                whiteSpace: 'pre-wrap',
                fontSize: '12px',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                {result.debug?.texto_completo}
              </pre>

              <h3>📋 Líneas Detectadas:</h3>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                border: '1px solid #dee2e6', 
                borderRadius: '5px',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {result.debug?.lineas?.map((linea: string, index: number) => (
                  <div key={index} style={{ 
                    padding: '2px 0', 
                    borderBottom: '1px solid #eee',
                    fontSize: '12px'
                  }}>
                    <strong>{index + 1}:</strong> "{linea}"
                  </div>
                ))}
              </div>

              <h3>🔍 Debug Completo (JSON):</h3>
              <pre style={{ 
                backgroundColor: '#f0f0f0', 
                padding: '10px', 
                border: '1px solid #ccc', 
                borderRadius: '5px',
                fontSize: '10px',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
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
        <h3>📝 Instrucciones:</h3>
        <ol>
          <li>Sube la imagen del ticket que está fallando</li>
          <li>Haz click en "Analizar Imagen"</li>
          <li>Revisa si detecta correctamente el texto</li>
          <li>Verifica si encuentra el total y establecimiento</li>
          <li>Copia el resultado completo para debugging</li>
        </ol>
      </div>
    </div>
  );
};

export default OCRDebugPage;