/**
 * PÁGINA DE DEMO - OCR INTELIGENTE
 *
 * Muestra el funcionamiento del módulo de clasificación automática
 * GASTOS vs INGRESOS con visualización en tiempo real
 */

import React, { useRef, useState } from 'react';
import { useIntelligentOCR, classificationToExpenseData, classificationToIncomeData } from '../hooks/useIntelligentOCR';
import { TransactionCategory } from '../services/intelligentOCRClassifier';

export default function IntelligentOCRDemo() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [jsonView, setJsonView] = useState(false);

  const {
    processDocument,
    isProcessing,
    progress,
    error,
    result,
    reset,
    getFormattedJSON,
    getVisualReport
  } = useIntelligentOCR();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    // Procesar
    await processDocument(file);
  };

  const handleReset = () => {
    reset();
    setPreviewUrl(null);
    setJsonView(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('✅ Copiado al portapapeles');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🤖 OCR Inteligente Contable
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Clasifica automáticamente documentos en <span className="text-red-600 font-semibold">GASTOS</span> o <span className="text-green-600 font-semibold">INGRESOS</span>
          </p>
        </div>

        {/* Panel de carga */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-center">
            <div className="w-full">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click para subir</span> o arrastra aquí
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tickets, facturas, recibos, comprobantes (PNG, JPG, PDF)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
              </label>
            </div>
          </div>

          {/* Barra de progreso */}
          {isProcessing && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Procesando... {progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-300 text-sm">❌ {error}</p>
            </div>
          )}
        </div>

        {/* Resultados */}
        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel izquierdo: Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                📄 Documento Original
              </h3>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-700"
                />
              )}
            </div>

            {/* Panel derecho: Clasificación */}
            <div className="space-y-6">
              {/* Resultado de clasificación */}
              <div className={`rounded-2xl shadow-xl p-8 ${
                result.categoria === TransactionCategory.GASTO
                  ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20'
                  : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl">
                      {result.categoria === TransactionCategory.GASTO ? '💸' : '💰'}
                    </span>
                    <div>
                      <h3 className={`text-3xl font-bold ${
                        result.categoria === TransactionCategory.GASTO
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-green-700 dark:text-green-300'
                      }`}>
                        {result.categoria}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {result.tipoDocumento.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Confianza</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {result.confianzaClasificacion}%
                    </p>
                  </div>
                </div>

                {/* Barra de confianza */}
                <div className="w-full bg-white/50 dark:bg-gray-800/50 rounded-full h-2 mb-4">
                  <div
                    className={`h-2 rounded-full ${
                      result.categoria === TransactionCategory.GASTO
                        ? 'bg-red-600'
                        : 'bg-green-600'
                    }`}
                    style={{ width: `${result.confianzaClasificacion}%` }}
                  />
                </div>

                {/* Datos principales */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Monto</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${result.datosExtraidos.monto?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Fecha</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {result.datosExtraidos.fecha || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Detalles */}
                <div className="mt-4 bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Concepto</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {result.datosExtraidos.concepto}
                  </p>
                </div>

                {result.datosExtraidos.emisor && (
                  <div className="mt-4 bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Proveedor</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {result.datosExtraidos.emisor.nombre}
                    </p>
                    {result.datosExtraidos.emisor.rfc && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        RFC: {result.datosExtraidos.emisor.rfc}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Validación */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                  {result.validacion.datosCompletos ? '✅' : '⚠️'} Validación
                </h3>

                {result.validacion.erroresDetectados.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Errores:</p>
                    <ul className="space-y-1">
                      {result.validacion.erroresDetectados.map((err, i) => (
                        <li key={i} className="text-sm text-red-700 dark:text-red-300">• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.validacion.advertencias.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">Advertencias:</p>
                    <ul className="space-y-1">
                      {result.validacion.advertencias.map((adv, i) => (
                        <li key={i} className="text-sm text-yellow-700 dark:text-yellow-300">• {adv}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.validacion.camposFaltantes.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Campos faltantes:</p>
                    <div className="flex flex-wrap gap-2">
                      {result.validacion.camposFaltantes.map((campo, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                        >
                          {campo}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.validacion.datosCompletos && (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    ✓ Todos los datos necesarios están presentes
                  </p>
                )}
              </div>

              {/* Razonamiento */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                  🧠 Razonamiento
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  {result.razonamiento.explicacion}
                </p>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Factores considerados:</p>
                  {result.razonamiento.factoresPositivos.map((factor, i) => (
                    <div key={i} className="text-xs text-green-700 dark:text-green-300 flex items-start gap-2">
                      <span>✓</span>
                      <span>{factor}</span>
                    </div>
                  ))}
                  {result.razonamiento.factoresNegativos.map((factor, i) => (
                    <div key={i} className="text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                      <span>✗</span>
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setJsonView(!jsonView)}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  {jsonView ? '👁️ Ver visual' : '📋 Ver JSON'}
                </button>
                <button
                  onClick={() => copyToClipboard(jsonView ? getFormattedJSON()! : getVisualReport()!)}
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  📋 Copiar
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  🔄 Nuevo
                </button>
              </div>

              {/* Vista JSON/Visual */}
              {jsonView && (
                <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto">
                  <pre className="text-xs text-green-400 font-mono">
                    {getFormattedJSON()}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
