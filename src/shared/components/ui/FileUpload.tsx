import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, XCircle, X, AlertTriangle, Download, Eye } from 'lucide-react';
import { Button } from './Button';
import { fileUploadService, FileUploadResult } from '../../../services/fileUploadService';
import { formatFileSize } from '../../utils/formatters';

interface FileUploadProps {
  type: 'expense' | 'income';
  onFileUploaded: (result: FileUploadResult) => void;
  onFileRemoved?: () => void;
  currentFile?: {
    url: string;
    name: string;
    size?: number;
  };
  required?: boolean;
  disabled?: boolean;
  className?: string;
  eventId?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  type,
  onFileUploaded,
  onFileRemoved,
  currentFile,
  required = false,
  disabled = false,
  className = '',
  eventId
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const getFileTypeInfo = () => {
    if (type === 'income') {
      return {
        title: 'Factura PDF',
        description: 'Sube la factura en formato PDF',
        acceptedTypes: ['.pdf'],
        maxSize: '10MB',
        icon: FileText,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    } else {
      return {
        title: 'Comprobante',
        description: 'Sube el comprobante de gasto (PDF o imagen)',
        acceptedTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
        maxSize: '5MB',
        icon: FileText,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }
  };

  const fileInfo = getFileTypeInfo();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Validate file
      const validation = fileUploadService.validateFile(file, type);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file
      const result = await fileUploadService.uploadFile(file, type, eventId);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Call success callback
      onFileUploaded(result);
      
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Error al subir archivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = async () => {
    if (currentFile && onFileRemoved) {
      try {
        // Extract path from URL if needed
        const urlParts = currentFile.url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const folder = type === 'income' ? 'income' : 'expense';
        const filePath = eventId ? `${folder}/${eventId}/${fileName}` : `${folder}/${fileName}`;
        
        await fileUploadService.deleteFile(filePath);
        onFileRemoved();
      } catch (error) {
        console.error('Error removing file:', error);
        setError('Error al eliminar archivo');
      }
    }
  };

  const handlePreview = () => {
    if (currentFile?.url) {
      window.open(currentFile.url, '_blank');
    }
  };

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {currentFile ? (
          <motion.div
            key="uploaded"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`border-2 rounded-lg p-4 ${fileInfo.bgColor} ${fileInfo.borderColor}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg">
                  <fileInfo.icon className={`w-5 h-5 ${fileInfo.color}`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{currentFile.name}</p>
                  {currentFile.size && (
                    <p className="text-sm text-gray-600">
                      {formatFileSize(currentFile.size)}
                    </p>
                  )}
                </div>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handlePreview}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                {!disabled && (
                  <Button
                    onClick={handleRemoveFile}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              disabled 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : isDragActive
                ? 'border-mint-500 bg-mint-50'
                : error
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-mint-400 hover:bg-mint-50/30 cursor-pointer'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept={fileInfo.acceptedTypes.join(',')}
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={disabled || isUploading}
            />
            
            <div className="space-y-4">
              {isUploading ? (
                <div className="space-y-3">
                  <Upload className="w-8 h-8 text-mint-500 mx-auto animate-bounce" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">Subiendo archivo...</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <motion.div
                        className="bg-mint-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{uploadProgress}%</p>
                  </div>
                </div>
              ) : error ? (
                <div className="space-y-3">
                  <XCircle className="w-8 h-8 text-red-500 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-red-900">Error al subir archivo</p>
                    <p className="text-sm text-red-700">{error}</p>
                    <Button
                      onClick={() => setError(null)}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      Intentar nuevamente
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <fileInfo.icon className={`w-8 h-8 mx-auto ${
                    disabled ? 'text-gray-300' : isDragActive ? 'text-mint-500' : 'text-gray-400'
                  }`} />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {disabled ? 'Carga de archivos deshabilitada' : 
                       isDragActive ? `Suelta aquí tu ${fileInfo.title.toLowerCase()}` :
                       `Arrastra tu ${fileInfo.title.toLowerCase()} aquí`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {disabled ? 'Función temporalmente no disponible' : 
                       'o haz clic para seleccionar un archivo'}
                    </p>
                  </div>
                  
                  {!disabled && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400">
                        {fileInfo.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        Tipos permitidos: {fileInfo.acceptedTypes.join(', ')} • Máximo {fileInfo.maxSize}
                      </p>
                      {required && (
                        <div className="flex items-center justify-center space-x-1 text-xs text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Archivo obligatorio</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};