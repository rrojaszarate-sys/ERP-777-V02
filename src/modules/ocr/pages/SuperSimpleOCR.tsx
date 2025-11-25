import React, { useState } from 'react';
import { useAuth } from '../../../core/auth/AuthProvider';
import { supabase } from '../../../core/config/supabase';

const SuperSimpleOCR: React.FC = () => {
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

  const processDirectly = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      // OPCIÓN 1: Procesar directamente en el cliente con datos simulados
      console.log('📤 Procesando archivo:', file.name);
      
      // Simular procesamiento OCR
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const simulatedResult = {
        success: true,
        message: '✅ OCR procesado localmente (SIMULACIÓN)',
        texto_completo: `TORTAS GIGANTES SUR 12
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

FORMA DE PAGO: EFECTIVO`,
        datos_extraidos: {
          establecimiento: "TORTAS GIGANTES SUR 12",
          rfc: "ABC123456789", 
          telefono: "55-1234-5678",
          fecha: "03/09/2025",
          hora: "14:30",
          total: 226.20,
          subtotal: 195.00,
          iva: 31.20,
          forma_pago: "EFECTIVO",
          productos: [
            { nombre: "TORTA ESPECIAL", cantidad: 1, precio_unitario: 125.00 },
            { nombre: "REFRESCO COCA", cantidad: 1, precio_unitario: 25.00 },
            { nombre: "PAPAS FRITAS", cantidad: 1, precio_unitario: 45.00 }
          ]
        },
        procesador: 'local_simulation',
        timestamp: new Date().toISOString()
      };

      // Intentar guardar en base de datos directamente
      try {
        const { data: dbResult, error } = await supabase
          .from('evt_documentos_ocr')
          .insert({
            evento_id: '00000000-0000-0000-0000-000000000001',
            nombre_archivo: file.name,
            archivo_path: `simulacion/${Date.now()}-${file.name}`,
            archivo_url: URL.createObjectURL(file),
            version: 1,
            estado_procesamiento: 'completed',
            procesador: 'local_simulation',
            texto_completo: simulatedResult.texto_completo,
            confianza_general: 95,
            datos_extraidos: simulatedResult.datos_extraidos,
            establecimiento: simulatedResult.datos_extraidos.establecimiento,
            rfc: simulatedResult.datos_extraidos.rfc,
            total: simulatedResult.datos_extraidos.total,
            fecha_documento: simulatedResult.datos_extraidos.fecha,
            created_by: user?.id || '00000000-0000-0000-0000-000000000001',
            tiempo_procesamiento_ms: 2000
          })
          .select()
          .single();

        if (error) {
          console.warn('⚠️ No se pudo guardar en DB:', error.message);
          simulatedResult.db_warning = `No guardado en DB: ${error.message}`;
        } else {
          console.log('✅ Guardado en DB:', dbResult.id);
          simulatedResult.db_success = `Guardado con ID: ${dbResult.id}`;
        }
      } catch (dbError) {
        console.warn('⚠️ Error de DB:', dbError);
        simulatedResult.db_error = 'Error de base de datos';
      }

      setResult(simulatedResult);
      
    } catch (error) {
      console.error('❌ Error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>🚀 OCR Super Simple - SIN Edge Functions</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Procesamiento OCR completamente local sin depender de Edge Functions. Solo simulación + guardado directo en DB.
        </p>

        <div style={{ 
          marginBottom: '15px', 
          padding: '10px', 
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <strong>👤 Usuario:</strong> {user?.nombre} ({user?.id})
          <br />
          <strong>🔧 Modo:</strong> {isDevelopment ? 'Desarrollo' : 'Producción'}
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
            onClick={processDirectly} 
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
            {loading ? '⏳ Procesando...' : '🚀 Procesar OCR Localmente'}
          </button>
        </div>

        {result && (
          <div>
            <h2 style={{ color: '#2c3e50', marginBottom: '15px' }}>📋 Resultado:</h2>
            
            <div style={{ 
              padding: '15px', 
              backgroundColor: result.success ? '#d4edda' : '#f8d7da', 
              border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`, 
              borderRadius: '5px',
              marginBottom: '15px'
            }}>
              <strong>{result.success ? '✅' : '❌'} Estado:</strong> {result.message || result.error}
              {result.db_success && (
                <div style={{ marginTop: '5px', color: '#155724' }}>
                  <strong>💾 Base de datos:</strong> {result.db_success}
                </div>
              )}
              {result.db_warning && (
                <div style={{ marginTop: '5px', color: '#856404' }}>
                  <strong>⚠️ Advertencia DB:</strong> {result.db_warning}
                </div>
              )}
            </div>

            {result.texto_completo && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>📄 Texto Extraído:</h3>
                <pre style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '15px', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '5px',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap'
                }}>
                  {result.texto_completo}
                </pre>
              </div>
            )}

            {result.datos_extraidos && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>📊 Datos Estructurados:</h3>
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '15px', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '5px'
                }}>
                  <p><strong>🏪 Establecimiento:</strong> {result.datos_extraidos.establecimiento}</p>
                  <p><strong>🆔 RFC:</strong> {result.datos_extraidos.rfc}</p>
                  <p><strong>📞 Teléfono:</strong> {result.datos_extraidos.telefono}</p>
                  <p><strong>📅 Fecha:</strong> {result.datos_extraidos.fecha} {result.datos_extraidos.hora}</p>
                  <p><strong>💰 Total:</strong> ${result.datos_extraidos.total}</p>
                  <p><strong>💳 Forma de pago:</strong> {result.datos_extraidos.forma_pago}</p>
                  
                  <h4 style={{ marginTop: '15px', marginBottom: '10px' }}>🛒 Productos:</h4>
                  {result.datos_extraidos.productos.map((producto: any, index: number) => (
                    <div key={index} style={{ 
                      padding: '8px', 
                      backgroundColor: 'white', 
                      marginBottom: '5px',
                      borderRadius: '3px',
                      border: '1px solid #dee2e6'
                    }}>
                      <strong>{producto.nombre}</strong> - Cantidad: {producto.cantidad} - Precio: ${producto.precio_unitario}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>🔍 Detalles Técnicos:</h3>
              <pre style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '15px', 
                border: '1px solid #dee2e6', 
                borderRadius: '5px',
                fontSize: '11px',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperSimpleOCR;