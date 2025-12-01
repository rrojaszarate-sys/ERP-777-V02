import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fileUploadService, FileUploadResult } from '../../../services/fileUploadService';

export const useFileUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async ({ 
      file, 
      type, 
      eventId 
    }: { 
      file: File; 
      type: 'expense' | 'income'; 
      eventId?: string;
    }): Promise<FileUploadResult> => {
      setUploadProgress(0);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      try {
        const result = await fileUploadService.uploadFile(file, type, eventId);
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Reset progress after a delay
        setTimeout(() => setUploadProgress(0), 1000);
        
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        setUploadProgress(0);
        throw error;
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (filePath: string) => {
      await fileUploadService.deleteFile(filePath);
    }
  });

  const validateFile = useCallback((file: File, type: 'expense' | 'income') => {
    return fileUploadService.validateFile(file, type);
  }, []);

  return {
    uploadFile: uploadMutation.mutateAsync, // ✅ Cambiar a mutateAsync para retornar resultado
    deleteFile: deleteMutation.mutate,
    validateFile,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    uploadProgress,
    uploadError: uploadMutation.error,
    deleteError: deleteMutation.error
  };
};