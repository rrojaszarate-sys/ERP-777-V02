/**
 * MODAL: IMPORTAR DESDE EXCEL
 * Carga masiva de gastos desde archivo Excel formato GNI
 */

import { useState, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../core/auth/AuthProvider';
import { importarDesdeExcel } from '../services/gastosNoImpactadosService';
import type { ExcelGastoRow, ImportExcelResult } from '../types/gastosNoImpactados';
import toast from 'react-hot-toast';

interface Props {
  periodo: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportExcelModal = ({ periodo, onClose, onSuccess }: Props) => {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [preview, setPreview] = useState<ExcelGastoRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportExcelResult | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);

        // Filtrar hojas que parecen ser meses (ENE25, FEB25, etc.)
        const monthSheets = wb.SheetNames.filter(name =>
          /^(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\d{2}$/i.test(name)
        );

        setSheets(monthSheets.length > 0 ? monthSheets : wb.SheetNames);

        // Seleccionar automáticamente la hoja del período actual
        const [year, month] = periodo.split('-');
        const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        const expectedSheet = `${monthNames[parseInt(month) - 1]}${year.slice(2)}`;

        if (wb.SheetNames.includes(expectedSheet)) {
          setSelectedSheet(expectedSheet);
          loadSheetPreview(wb, expectedSheet);
        } else if (monthSheets.length > 0) {
          setSelectedSheet(monthSheets[0]);
          loadSheetPreview(wb, monthSheets[0]);
        }
      } catch (error) {
        console.error('Error leyendo Excel:', error);
        toast.error('Error al leer el archivo Excel');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [periodo]);

  const loadSheetPreview = (wb: XLSX.WorkBook, sheetName: string) => {
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<ExcelGastoRow>(sheet, { defval: '' });

    // Filtrar filas vacías
    const validData = data.filter(row =>
      row.PROVEEDOR && row.CONCEPTO && (row.TOTAL || row.TOTAL === 0)
    );

    setPreview(validData.slice(0, 10)); // Preview de 10 filas
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      loadSheetPreview(workbook, sheetName);
    }
  };

  const handleImport = async () => {
    if (!companyId || !workbook || !selectedSheet) return;

    setImporting(true);
    try {
      const sheet = workbook.Sheets[selectedSheet];
      const data = XLSX.utils.sheet_to_json<ExcelGastoRow>(sheet, { defval: '' });

      // Filtrar filas válidas
      const validData = data.filter(row =>
        row.PROVEEDOR && row.CONCEPTO && (row.TOTAL || row.TOTAL === 0)
      );

      const result = await importarDesdeExcel(validData, companyId, periodo);
      setResult(result);

      if (result.errores === 0) {
        toast.success(`${result.importados} gastos importados correctamente`);
      } else {
        toast.success(`Importados: ${result.importados}, Errores: ${result.errores}`);
      }
    } catch (error) {
      console.error('Error importando:', error);
      toast.error('Error durante la importación');
    } finally {
      setImporting(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value || 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Importar desde Excel
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!file ? (
            /* Dropzone */
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600 mb-2">
                {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra un archivo Excel o haz clic para seleccionar'}
              </p>
              <p className="text-sm text-gray-400">
                Formato soportado: .xlsx con hojas mensuales (ENE25, FEB25, etc.)
              </p>
            </div>
          ) : result ? (
            /* Resultado de importación */
            <div className="space-y-6">
              <div className={`p-4 rounded-lg ${
                result.errores === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-start gap-3">
                  {result.errores === 0 ? (
                    <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {result.errores === 0 ? 'Importación Exitosa' : 'Importación Completada con Advertencias'}
                    </h3>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total de filas:</span>
                        <span className="ml-2 font-medium">{result.total_filas}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Importados:</span>
                        <span className="ml-2 font-medium text-green-600">{result.importados}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Errores:</span>
                        <span className="ml-2 font-medium text-red-600">{result.errores}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Proveedores nuevos:</span>
                        <span className="ml-2 font-medium text-blue-600">{result.proveedores_nuevos}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {result.detalle_errores.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Detalle de errores:</h4>
                  <div className="max-h-40 overflow-y-auto">
                    {result.detalle_errores.map((err, i) => (
                      <div key={i} className="text-sm text-red-700 py-1">
                        <span className="font-medium">Fila {err.fila}:</span> {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                    setPreview([]);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Importar otro archivo
                </button>
                <button
                  onClick={onSuccess}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            /* Preview */
            <div className="space-y-4">
              {/* Info del archivo */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview([]);
                  }}
                  className="text-red-600 hover:underline text-sm"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Selector de hoja */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar hoja (mes) a importar:
                </label>
                <div className="flex flex-wrap gap-2">
                  {sheets.map(sheet => (
                    <button
                      key={sheet}
                      onClick={() => handleSheetChange(sheet)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedSheet === sheet
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {sheet}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info columnas */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Se importarán las columnas: PROVEEDOR, CONCEPTO, SUBCUENTA, CUENTA, CLAVE,
                  SUBTOTAL, IVA, TOTAL, VALIDACIÓN, FORMA DE PAGO, EJECUTIVO, STATUS, FECHA, FACTURA
                </p>
              </div>

              {/* Preview de datos */}
              {preview.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Vista previa (primeras 10 filas):
                  </h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Proveedor</th>
                          <th className="px-3 py-2 text-left">Concepto</th>
                          <th className="px-3 py-2 text-left">Clave</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2 text-left">Ejecutivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {preview.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 max-w-40 truncate">{row.PROVEEDOR}</td>
                            <td className="px-3 py-2 max-w-48 truncate">{row.CONCEPTO}</td>
                            <td className="px-3 py-2 font-mono text-blue-600">{row.CLAVE}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(row.TOTAL)}</td>
                            <td className="px-3 py-2">{row.EJECUTIVO}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Se encontraron {preview.length}+ registros válidos
                  </p>
                </div>
              )}

              {/* Acciones */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedSheet || importing}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Importar {selectedSheet}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
