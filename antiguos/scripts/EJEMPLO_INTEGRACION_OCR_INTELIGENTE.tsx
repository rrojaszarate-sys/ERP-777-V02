/**
 * EJEMPLO DE INTEGRACIÓN DEL MÓDULO OCR INTELIGENTE
 *
 * Este archivo muestra cómo integrar el clasificador inteligente
 * en la página OcrTestPage.tsx existente
 */

import React, { useState } from 'react';
import { useIntelligentOCR } from '@/modules/ocr/hooks/useIntelligentOCR';
import { TransactionCategory } from '@/modules/ocr/services/intelligentOCRClassifier';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, TrendingUp, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * ===================================================================
 * OPCIÓN 1: AGREGAR UN NUEVO TAB EN OcrTestPage
 * ===================================================================
 *
 * Agregar esta sección como un nuevo tab "Clasificación Inteligente"
 * dentro de la página OcrTestPage.tsx
 */

export function IntelligentClassificationTab() {
  const {
    processDocument,
    isProcessing,
    progress,
    error,
    result,
    reset,
    getVisualReport
  } = useIntelligentOCR();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const classification = await processDocument(file);

    if (classification) {
      // Mostrar notificación con el resultado
      const icono = classification.categoria === TransactionCategory.GASTO ? '💸' : '💰';
      toast.success(
        `${icono} Clasificado como ${classification.categoria} (${classification.confianzaClasificacion}% confianza)`,
        { duration: 5000 }
      );

      // Log del reporte
      console.log(getVisualReport());
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Alert>
        <TrendingUp className="w-4 h-4" />
        <AlertDescription>
          <strong>Clasificación Inteligente:</strong> El sistema analiza automáticamente si el documento es un GASTO o INGRESO
          utilizando lógica contable avanzada.
        </AlertDescription>
      </Alert>

      {/* Upload área */}
      <Card>
        <CardHeader>
          <CardTitle>Subir documento para clasificar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={isProcessing}
              accept="image/*"
              className="hidden"
              id="intelligent-ocr-upload"
            />

            {isProcessing ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <div>
                  <h3 className="text-lg font-medium">Procesando con IA...</h3>
                  <p className="text-gray-500">Analizando y clasificando documento</p>
                  <div className="mt-4 bg-gray-200 rounded-full h-2 w-full max-w-md mx-auto">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-400 mt-2">{progress}%</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-16 h-16 mx-auto text-gray-400" />
                <div>
                  <h3 className="text-lg font-medium">Subir documento</h3>
                  <p className="text-gray-500">Tickets, facturas, recibos o comprobantes</p>
                </div>
                <Button
                  onClick={() => document.getElementById('intelligent-ocr-upload')?.click()}
                >
                  Seleccionar archivo
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultado de clasificación */}
      {result && (
        <div className="space-y-4">
          {/* Tarjeta de clasificación principal */}
          <Card className={`border-2 ${
            result.categoria === TransactionCategory.GASTO
              ? 'border-red-300 bg-red-50'
              : 'border-green-300 bg-green-50'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-6xl">
                    {result.categoria === TransactionCategory.GASTO ? '💸' : '💰'}
                  </div>
                  <div>
                    <h2 className={`text-3xl font-bold ${
                      result.categoria === TransactionCategory.GASTO
                        ? 'text-red-700'
                        : 'text-green-700'
                    }`}>
                      {result.categoria}
                    </h2>
                    <p className="text-gray-600">
                      {result.tipoDocumento.replace(/_/g, ' ').toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-600">Confianza</p>
                  <p className="text-4xl font-bold text-gray-900">
                    {result.confianzaClasificacion}%
                  </p>
                </div>
              </div>

              {/* Barra de confianza */}
              <div className="w-full bg-white rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    result.categoria === TransactionCategory.GASTO
                      ? 'bg-red-600'
                      : 'bg-green-600'
                  }`}
                  style={{ width: `${result.confianzaClasificacion}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Datos extraídos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Datos Extraídos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Monto</p>
                  <p className="text-2xl font-bold">
                    ${result.datosExtraidos.monto?.toFixed(2) || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha</p>
                  <p className="text-lg font-semibold">
                    {result.datosExtraidos.fecha || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Subtotal</p>
                  <p className="text-lg font-semibold">
                    ${result.datosExtraidos.subtotal?.toFixed(2) || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">IVA</p>
                  <p className="text-lg font-semibold">
                    ${result.datosExtraidos.iva?.toFixed(2) || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Método de pago</p>
                  <p className="text-lg font-semibold">
                    {result.datosExtraidos.metodoPago || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {result.categoria === TransactionCategory.GASTO ? 'Proveedor' : 'Cliente'}
                  </p>
                  <p className="text-lg font-semibold">
                    {result.categoria === TransactionCategory.GASTO
                      ? result.datosExtraidos.emisor?.nombre
                      : result.datosExtraidos.receptor?.nombre
                    } || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Concepto */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Concepto</p>
                <p className="font-medium">{result.datosExtraidos.concepto}</p>
              </div>

              {/* UUID si existe */}
              {result.datosExtraidos.uuid && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">UUID Fiscal</p>
                  <p className="font-mono text-sm">{result.datosExtraidos.uuid}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.validacion.datosCompletos ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                )}
                Validación de Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Estado general */}
              <div>
                {result.validacion.datosCompletos ? (
                  <Badge variant="success" className="text-sm">
                    ✓ Todos los datos necesarios están presentes
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-sm">
                    ⚠️ Algunos datos están incompletos
                  </Badge>
                )}
              </div>

              {/* Errores */}
              {result.validacion.erroresDetectados.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription>
                    <p className="font-semibold mb-2 text-red-700">Errores detectados:</p>
                    <ul className="space-y-1 text-sm text-red-600">
                      {result.validacion.erroresDetectados.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Advertencias */}
              {result.validacion.advertencias.length > 0 && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <AlertDescription>
                    <p className="font-semibold mb-2 text-yellow-700">Advertencias:</p>
                    <ul className="space-y-1 text-sm text-yellow-600">
                      {result.validacion.advertencias.map((adv, i) => (
                        <li key={i}>• {adv}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Campos faltantes */}
              {result.validacion.camposFaltantes.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Campos faltantes:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.validacion.camposFaltantes.map((campo, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {campo}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Razonamiento */}
          <Card>
            <CardHeader>
              <CardTitle>🧠 Razonamiento de la Clasificación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {result.razonamiento.explicacion}
              </p>

              <div>
                <p className="font-semibold text-sm text-gray-700 mb-2">
                  Factores considerados:
                </p>
                <div className="space-y-1">
                  {result.razonamiento.factoresPositivos.map((factor, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{factor}</span>
                    </div>
                  ))}
                  {result.razonamiento.factoresNegativos.map((factor, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                // Aquí integrar con el formulario de gastos/ingresos
                if (result.categoria === TransactionCategory.GASTO) {
                  // Abrir formulario de gastos con datos pre-llenados
                  console.log('Crear gasto con:', result.datosExtraidos);
                  toast.success('Abriendo formulario de gastos...');
                } else {
                  // Abrir formulario de ingresos con datos pre-llenados
                  console.log('Crear ingreso con:', result.datosExtraidos);
                  toast.success('Abriendo formulario de ingresos...');
                }
              }}
              className="flex-1"
            >
              {result.categoria === TransactionCategory.GASTO
                ? '💸 Crear Gasto'
                : '💰 Crear Ingreso'
              }
            </Button>

            <Button
              onClick={() => {
                const report = getVisualReport();
                navigator.clipboard.writeText(report || '');
                toast.success('📋 Reporte copiado al portapapeles');
              }}
              variant="outline"
            >
              📋 Copiar reporte
            </Button>

            <Button
              onClick={reset}
              variant="outline"
            >
              🔄 Nuevo documento
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * ===================================================================
 * OPCIÓN 2: MODIFICAR LA FUNCIÓN handleFileUpload EN OcrTestPage
 * ===================================================================
 *
 * Reemplazar la función handleFileUpload existente con esta versión
 * que usa el clasificador inteligente
 */

export async function handleFileUploadWithIntelligentClassification(
  file: File,
  setProcessing: (val: boolean) => void,
  setProgress: (val: number) => void
) {
  setProcessing(true);
  setProgress(0);

  try {
    // Importar servicios
    const { tesseractOCRService } = await import('@/modules/ocr/services/tesseractOCRService_OPTIMIZED');
    const { IntelligentOCRClassifier, TransactionCategory } = await import('@/modules/ocr/services/intelligentOCRClassifier');

    // Paso 1: Ejecutar OCR (0-60%)
    setProgress(10);
    const ocrResult = await tesseractOCRService.processDocument(file);
    setProgress(60);

    // Paso 2: Clasificación inteligente (60-80%)
    setProgress(65);
    const classification = IntelligentOCRClassifier.classify(
      ocrResult.texto_completo,
      ocrResult.datos_ticket,
      ocrResult.datos_factura
    );
    setProgress(80);

    // Paso 3: Mostrar resultado (80-100%)
    const report = IntelligentOCRClassifier.generateReport(classification);
    console.log('\n' + report + '\n');

    // Notificación con resultado
    const icono = classification.categoria === TransactionCategory.GASTO ? '💸' : '💰';
    const color = classification.categoria === TransactionCategory.GASTO ? 'red' : 'green';

    toast.success(
      `${icono} Clasificado como ${classification.categoria}\n` +
      `Confianza: ${classification.confianzaClasificacion}%\n` +
      `Monto: $${classification.datosExtraidos.monto?.toFixed(2) || 'N/A'}`,
      {
        duration: 5000,
        style: {
          background: color === 'red' ? '#fee2e2' : '#dcfce7',
          color: color === 'red' ? '#991b1b' : '#166534'
        }
      }
    );

    setProgress(100);

    // Retornar clasificación para uso posterior
    return classification;

  } catch (error: any) {
    toast.error(`❌ Error: ${error.message}`);
    console.error('Error en OCR inteligente:', error);
    return null;
  } finally {
    setProcessing(false);
    setProgress(0);
  }
}

/**
 * ===================================================================
 * OPCIÓN 3: AGREGAR BOTÓN DE ACCIÓN RÁPIDA
 * ===================================================================
 *
 * Agregar este botón en cada documento procesado para clasificarlo
 * automáticamente como gasto o ingreso
 */

export function QuickClassifyButton({ document, onClassified }: {
  document: any;
  onClassified: (classification: any) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleClassify = async () => {
    setLoading(true);

    try {
      const { IntelligentOCRClassifier, TransactionCategory } = await import(
        '@/modules/ocr/services/intelligentOCRClassifier'
      );

      const classification = IntelligentOCRClassifier.classify(
        document.texto_completo || '',
        document.datos_ticket,
        document.datos_factura
      );

      const icono = classification.categoria === TransactionCategory.GASTO ? '💸' : '💰';

      toast.success(
        `${icono} ${classification.categoria} (${classification.confianzaClasificacion}%)`,
        { duration: 3000 }
      );

      onClassified(classification);

    } catch (error: any) {
      toast.error('Error al clasificar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClassify}
      disabled={loading}
      className="flex items-center gap-2"
    >
      {loading ? (
        <>
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Clasificando...
        </>
      ) : (
        <>
          🧠 Clasificar
        </>
      )}
    </Button>
  );
}

/**
 * ===================================================================
 * INSTRUCCIONES DE INTEGRACIÓN
 * ===================================================================
 *
 * 1. Para usar la Opción 1 (Nuevo tab):
 *    - Importar IntelligentClassificationTab en OcrTestPage.tsx
 *    - Agregar como un nuevo tab usando tu sistema de tabs
 *
 * 2. Para usar la Opción 2 (Reemplazar función):
 *    - Copiar handleFileUploadWithIntelligentClassification
 *    - Reemplazar la función handleFileUpload existente
 *
 * 3. Para usar la Opción 3 (Botón de acción):
 *    - Agregar QuickClassifyButton en cada card de documento
 *    - Manejar el callback onClassified para mostrar/guardar resultado
 *
 * RECOMENDACIÓN: Usar Opción 1 para mantener funcionalidades separadas
 */

export default {
  IntelligentClassificationTab,
  handleFileUploadWithIntelligentClassification,
  QuickClassifyButton
};
