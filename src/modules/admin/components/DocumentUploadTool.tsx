import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertTriangle, Download, Loader2, Database } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/config/supabase';
import { Button } from '../../../shared/components/ui/Button';
import { Modal } from '../../../shared/components/ui/Modal';
import { fileUploadService } from '../../../services/fileUploadService';
import { formatFileSize } from '../../../shared/utils/formatters';

interface DocumentUploadToolProps {
  onClose: () => void;
}

export const DocumentUploadTool: React.FC<DocumentUploadToolProps> = ({ onClose }) => {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    url?: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  // Fetch events for dropdown
  const { data: eventos, isLoading: eventosLoading } = useQuery({
    queryKey: ['eventos-for-upload'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('evt_eventos')
          .select('id, clave_evento, nombre_proyecto, fecha_evento')
          .eq('activo', true)
          .order('fecha_evento', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching events:', error);
        return [];
      }
    },
    staleTime: 0,
    gcTime: 0
  });

  const validateFile = (file: File): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validate file type
    if (file.type !== 'application/pdf') {
      errors.push('Solo se permiten archivos PDF');
    }

    // Validate file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'pdf') {
      errors.push('El archivo debe tener extensión .pdf');
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      errors.push(`Archivo demasiado grande: ${formatFileSize(file.size)} (máximo 10MB)`);
    }

    // Validate file is not empty
    if (file.size === 0) {
      errors.push('El archivo está vacío');
    }

    // Validate filename
    if (!file.name || file.name.trim().length === 0) {
      errors.push('Nombre de archivo inválido');
    }

    if (file.name.length > 255) {
      errors.push('Nombre de archivo demasiado largo (máximo 255 caracteres)');
    }

    // Validate dangerous characters
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(file.name)) {
      errors.push('Nombre de archivo contiene caracteres no permitidos');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationError('');
      setUploadResult(null);
      
      // Validate immediately
      const validation = validateFile(file);
      if (!validation.valid) {
        setValidationError(validation.errors.join('. '));
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedEventId) {
      setValidationError('Debe seleccionar un evento');
      return;
    }

    if (!selectedFile) {
      setValidationError('Debe seleccionar un archivo PDF');
      return;
    }

    // Final validation
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setValidationError(validation.errors.join('. '));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setValidationError('');
    setUploadResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload using fileUploadService
      const result = await fileUploadService.uploadEventDocument(selectedFile, selectedEventId);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadResult({
        success: true,
        message: `Documento subido exitosamente: ${selectedFile.name}`,
        url: result.url
      });

      // Reset form
      setSelectedFile(null);
      setSelectedEventId('');
      
      // Reset file input
      const fileInput = document.getElementById('admin-file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      setTimeout(() => {
        setUploadProgress(0);
      }, 2000);

    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido al subir el documento'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedEventId('');
    setSelectedFile(null);
    setValidationError('');
    setUploadResult(null);
    setUploadProgress(0);
    
    const fileInput = document.getElementById('admin-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Herramienta de Subida de Documentos"
      size="md"
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">Admin Tool - Subida de Documentos</h3>
              <p className="text-sm text-blue-700">
                Herramienta interna para subir documentos PDF de prueba a eventos
              </p>
            </div>
          </div>
        </div>

        {/* Event Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Evento *
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setValidationError('');
              setUploadResult(null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isUploading || eventosLoading}
          >
            <option value="">
              {eventosLoading ? 'Cargando eventos...' : 'Seleccionar evento...'}
            </option>
            {eventos?.map(evento => (
              <option key={evento.id} value={evento.id}>
                {evento.clave_evento} - {evento.nombre_proyecto} ({new Date(evento.fecha_evento).toLocaleDateString('es-MX')})
              </option>
            ))}
          </select>
          {eventosLoading && (
            <p className="text-sm text-gray-500 mt-1">Cargando lista de eventos...</p>
          )}
        </div>

        {/* File Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Archivo PDF *
          </label>
          <div className="space-y-3">
            <input
              id="admin-file-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={isUploading}
            />
            
            {selectedFile && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">{selectedFile.name}</p>
                    <p className="text-sm text-green-700">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type}
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-1">
            Solo archivos PDF. Tamaño máximo: 10MB. El archivo se guardará en Supabase Storage.
          </p>
        </div>

        {/* Validation Error */}
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Error de Validación</h4>
                <p className="text-red-700 text-sm mt-1">{validationError}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border rounded-lg p-4 ${
              uploadResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start space-x-3">
              {uploadResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className={`font-medium ${
                  uploadResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {uploadResult.success ? 'Subida Exitosa' : 'Error en la Subida'}
                </h4>
                <p className={`text-sm mt-1 ${
                  uploadResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {uploadResult.message}
                </p>
                
                {uploadResult.success && uploadResult.url && (
                  <div className="mt-3 space-y-2">
                    <div className="bg-white border border-green-300 rounded p-2">
                      <p className="text-xs text-gray-600 mb-1">URL pública:</p>
                      <code className="text-xs text-green-800 break-all">
                        {uploadResult.url}
                      </code>
                    </div>
                    <Button
                      onClick={() => window.open(uploadResult.url, '_blank')}
                      variant="outline"
                      size="sm"
                      className="text-green-600 hover:text-green-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Ver Documento
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Upload className="w-5 h-5 text-blue-600 animate-bounce" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Subiendo documento...</p>
                  <p className="text-sm text-blue-700">
                    {selectedFile?.name} • {selectedFile ? formatFileSize(selectedFile.size) : ''}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-blue-700">
                  <span>Progreso</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <motion.div
                    className="bg-blue-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            onClick={resetForm}
            variant="outline"
            disabled={isUploading}
          >
            Limpiar Formulario
          </Button>
          
          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isUploading}
            >
              Cerrar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedEventId || !selectedFile || isUploading}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Subir Documento de Prueba
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Instrucciones de Uso</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Selecciona un evento de la lista desplegable</li>
            <li>• Elige un archivo PDF (máximo 10MB)</li>
            <li>• El documento se guardará en: <code className="bg-gray-200 px-1 rounded">/eventos/{'{evento_id}'}/documentos</code></li>
            <li>• Esta herramienta es solo para uso interno y pruebas</li>
            <li>• No requiere validación de estado del evento</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};