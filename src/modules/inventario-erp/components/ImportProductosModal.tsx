import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X, Upload, Download, FileSpreadsheet, CheckCircle,
  AlertCircle, FileWarning, Loader2
} from 'lucide-react';
import { importProductosFromCSV, downloadCSVTemplate, ImportResult } from '../services/importService';
import toast from 'react-hot-toast';

interface ImportProductosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'result';

export const ImportProductosModal: React.FC<ImportProductosModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companyId
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [updateExisting, setUpdateExisting] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile) return;

    // Validar tipo de archivo
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    const isValidType = validTypes.includes(selectedFile.type) ||
                        selectedFile.name.endsWith('.csv');

    if (!isValidType) {
      toast.error('Por favor selecciona un archivo CSV válido');
      return;
    }

    setFile(selectedFile);
    setIsLoading(true);

    try {
      const content = await selectedFile.text();
      setCsvContent(content);

      // Hacer preview/validación
      const result = await importProductosFromCSV(content, companyId, {
        updateExisting,
        validateOnly: true
      });

      setPreviewResult(result);
      setStep('preview');
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar el archivo');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, updateExisting]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleImport = async () => {
    if (!csvContent) return;

    setStep('importing');
    setIsLoading(true);

    try {
      const result = await importProductosFromCSV(csvContent, companyId, {
        updateExisting
      });

      setImportResult(result);
      setStep('result');

      if (result.success > 0) {
        toast.success(`${result.success} productos importados correctamente`);
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || 'Error durante la importación');
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setCsvContent('');
    setPreviewResult(null);
    setImportResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Importar Productos</h2>
              <p className="text-sm text-gray-500">Carga masiva desde archivo CSV</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Download Template */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900">Plantilla de ejemplo</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Descarga la plantilla CSV con el formato correcto y ejemplos de datos.
                    </p>
                    <button
                      onClick={downloadCSVTemplate}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Descargar Plantilla
                    </button>
                  </div>
                </div>
              </div>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                {isLoading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-600">Procesando archivo...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      Arrastra tu archivo CSV aquí o
                    </p>
                    <label className="inline-block">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        className="hidden"
                      />
                      <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
                        Seleccionar archivo
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-4">
                      Formatos aceptados: CSV (codificación UTF-8)
                    </p>
                  </>
                )}
              </div>

              {/* Options */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="updateExisting"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="updateExisting" className="text-sm text-gray-700">
                  Actualizar productos existentes (si el código ya existe)
                </label>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && previewResult && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-gray-700">
                <FileSpreadsheet className="w-5 h-5" />
                <span className="font-medium">{file?.name}</span>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Válidos para importar</span>
                  </div>
                  <p className="text-3xl font-bold text-green-700 mt-2">
                    {previewResult.success}
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Con errores</span>
                  </div>
                  <p className="text-3xl font-bold text-red-700 mt-2">
                    {previewResult.errors}
                  </p>
                </div>
              </div>

              {/* Preview Data */}
              {previewResult.imported.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Vista previa (primeros 5 registros)
                  </h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Código</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Nombre</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Categoría</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">P. Venta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {previewResult.imported.slice(0, 5).map((p, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-mono text-gray-900">{p.codigo}</td>
                            <td className="px-3 py-2 text-gray-900">{p.nombre}</td>
                            <td className="px-3 py-2 text-gray-600">{p.categoria}</td>
                            <td className="px-3 py-2 text-right text-gray-900">
                              ${p.precio_venta.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Errors */}
              {previewResult.errorDetails.length > 0 && (
                <div>
                  <h3 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                    <FileWarning className="w-4 h-4" />
                    Errores detectados
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {previewResult.errorDetails.slice(0, 10).map((err, i) => (
                      <div key={i} className="text-sm text-red-700 mb-1">
                        <span className="font-medium">Fila {err.row}:</span> {err.error}
                      </div>
                    ))}
                    {previewResult.errorDetails.length > 10 && (
                      <div className="text-sm text-red-600 mt-2">
                        ... y {previewResult.errorDetails.length - 10} errores más
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">Importando productos...</p>
              <p className="text-gray-500 mt-2">Por favor espera, esto puede tomar unos segundos.</p>
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && importResult && (
            <div className="text-center py-8">
              {importResult.success > 0 ? (
                <>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    ¡Importación completada!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Se importaron <span className="font-semibold text-green-600">{importResult.success}</span> productos correctamente.
                    {importResult.errors > 0 && (
                      <span className="text-red-600"> ({importResult.errors} con errores)</span>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Importación fallida
                  </h3>
                  <p className="text-gray-600 mb-6">
                    No se pudo importar ningún producto. Revisa los errores y vuelve a intentar.
                  </p>
                </>
              )}

              {importResult.errorDetails.length > 0 && (
                <div className="text-left bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                  {importResult.errorDetails.map((err, i) => (
                    <div key={i} className="text-sm text-red-700 mb-1">
                      <span className="font-medium">Fila {err.row}:</span> {err.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          {step === 'upload' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setPreviewResult(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleImport}
                disabled={previewResult?.success === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Importar {previewResult?.success} productos
              </button>
            </>
          )}

          {step === 'result' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
