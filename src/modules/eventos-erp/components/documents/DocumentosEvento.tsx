import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../core/config/supabase';
import { FileText, Trash2, UploadCloud } from 'lucide-react';
import { useAuth } from '../../../../core/auth/AuthProvider';
import toast from 'react-hot-toast';
import { fileUploadService } from '../../../../services/fileUploadService';
import { workflowService } from '../../services/workflowService';
import { Database } from '../../types/database.types';

interface DocumentoEvento {
  id: number;
  evento_id: number;
  nombre: string;
  url: string;
  path: string;
  created_by: string | null;
  created_at?: string;
}

interface DocumentosEventoProps {
  eventoId: number;
  estadoActual?: number;
  onDocumentUploaded?: (newStateName?: string) => void;
}

export const DocumentosEvento: React.FC<DocumentosEventoProps> = ({ eventoId, estadoActual, onDocumentUploaded }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isDevMode = import.meta.env.VITE_SECURITY_MODE === 'development';

  // En desarrollo, comprobar si el usuario existe en users_erp
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);

  // Verificar si el usuario existe en users_erp al montar el componente
  React.useEffect(() => {
    const checkUser = async () => {
      if (isDevMode) {
        // Intentar encontrar un usuario válido en users_erp
        const { data: devUser } = await supabase
          .from('users_erp')
          .select('id')
          .limit(1)
          .single<{ id: string }>();

        if (devUser?.id) {
          setEffectiveUserId(devUser.id);
          console.log('Usuario de desarrollo encontrado:', devUser.id);
        } else {
          console.warn('No se encontró un usuario de desarrollo válido en users_erp');
          toast.error('No hay usuarios válidos en users_erp');
        }
      } else {
        setEffectiveUserId(user?.id || null);
      }
    };
    
    checkUser();
  }, [isDevMode, user]);

  const { data: documents, refetch } = useQuery<DocumentoEvento[]>({
    queryKey: ['documentos_evento', eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evt_documentos') // Asegúrate que la tabla es correcta
        .select('*')
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DocumentoEvento[];
    },
    enabled: !!eventoId,
  });

  // Procesar documentos para encontrar la última versión de cada tipo
  const latestDocs = React.useMemo(() => {
    const docMap = new Map<string, DocumentoEvento>();
    documents?.forEach(doc => {
      // Path format: {clave_evento}/{tipo}/{clave_evento}_{tipo}_V{version}_{filename}
      // Extract tipo from path: clave_evento/tipo/filename
      const pathParts = doc.path?.split('/');
      if (!pathParts || pathParts.length < 2) return;

      const tipo = pathParts[1]; // El tipo está en la segunda posición del path

      // Si no se puede extraer el tipo, se ignora el documento.
      if (!tipo) return;

      // Guardar solo la versión más reciente de cada tipo
      // Los documentos ya vienen ordenados por created_at desc, así que la primera versión es la más reciente
      if (!docMap.has(tipo)) {
        docMap.set(tipo, doc);
      }
    });
    return docMap;
  }, [documents]);

  const handleUpload = async (tipo: string, file: File) => {
    if (!effectiveUserId) {
      toast.error('No hay un usuario válido para subir documentos');
      return;
    }

    // Verificar que el usuario existe en users_erp
    const { data: userExists, error: userError } = await supabase
      .from('users_erp')
      .select('id')
      .eq('id', effectiveUserId)
      .single();

    if (userError || !userExists) {
      console.error('Error: Usuario no encontrado en users_erp');
      toast.error('Usuario no válido para subir documentos');
      return;
    }

    try {
      // Delegar la subida al servicio centralizado
      const result = await fileUploadService.uploadEventDocument(
        file,
        String(eventoId),
        tipo
      );

      // Registrar el documento en la base de datos
      const { error: dbError } = await supabase
        .from('evt_documentos')
        .insert([{
          evento_id: eventoId,
          nombre: result.fileName,
          url: result.url,
          path: result.path,
          created_by: effectiveUserId
        }]);

      if (dbError) {
        console.error('Error al insertar documento:', dbError);
        throw dbError;
      }

      toast.success('Documento subido correctamente');

    } catch (error) {
      console.error('Error en handleUpload:', error);
      toast.error(error instanceof Error ? error.message : 'Error al subir el documento.');
      return; // Detener si hay un error
    }

    await refetch();

    // --- LÓGICA DE AVANCE DE ESTADO IMPLEMENTADA AQUÍ ---
    // Después de subir el documento, intentamos avanzar el estado.
    if (effectiveUserId) {
      try {
        console.log(`[DocumentosEvento] Intentando avanzar estado - eventoId: ${eventoId}, tipo: ${tipo}, userId: ${effectiveUserId}`);
        const result = await workflowService.advanceStateOnDocumentUpload(eventoId, tipo, effectiveUserId);
        console.log('[DocumentosEvento] Resultado del avance:', result);

        if (result.success) {
          // Si el estado avanzó, llamamos a onDocumentUploaded con el nombre del nuevo estado.
          toast.success(`🎉 Estado avanzado a: ${result.newState}`);
          if (typeof onDocumentUploaded === 'function') {
            onDocumentUploaded(result.newState);
          }
        } else {
          // Si no avanzó, mostramos un mensaje informativo y notificamos para refrescar.
          toast(`ℹ️ ${result.message}`, { duration: 4000 });
          if (typeof onDocumentUploaded === 'function') {
            onDocumentUploaded();
          }
        }
      } catch (error) {
        console.error('[DocumentosEvento] Error al intentar avanzar estado:', error);
        toast.error('Error al intentar avanzar el estado del evento');
      }
    }
  };

  const handleDelete = async (docId: number, docPath: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este documento? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      // 1. Eliminar de Supabase Storage
      await fileUploadService.deleteFile(docPath);

      // 2. Eliminar registro de la base de datos
      const { error: dbError } = await supabase
        .from('evt_documentos')
        .delete()
        .eq('id', docId);

      if (dbError) throw dbError;

      toast.success('Documento eliminado correctamente.');
      await refetch();
    } catch (error) {
      console.error('Error en handleDelete:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el documento.');
    }
  };

  const documentTypes = [
    { label: '🟧 Contrato-Acuerdo', tipo: 'contrato', estadoRequerido: 1 },
    { label: '🟩 Orden de Compra', tipo: 'orden_compra', estadoRequerido: 2 },
    { label: '🟥 Cierre del Evento', tipo: 'cierre_evento', estadoRequerido: 4 }, // Asumiendo que se sube en "En Ejecución"
  ];

  return (
    <div className="space-y-4">
      {documentTypes.map(({ label, tipo, estadoRequerido }) => (
        <DocumentoItem
          key={tipo}
          label={label}
          tipo={tipo}
          documento={latestDocs.get(tipo)} // La versión más reciente
          historial={(documents || []).filter(d => {
            const pathParts = d.path?.split('/');
            return pathParts && pathParts.length >= 2 && pathParts[1] === tipo;
          })}
          onUpload={handleUpload}
          onDelete={handleDelete}
          canUpload={estadoActual === undefined || estadoActual === estadoRequerido || isDevMode}
          canDelete={isAdmin || isDevMode}
        />
      ))}
    </div>
  );
};

interface DocumentoItemProps {
  label: string;
  tipo: string;
  documento: DocumentoEvento | undefined;
  historial: DocumentoEvento[];
  onUpload: (tipo: string, file: File) => void;
  onDelete: (docId: number, docPath: string) => void;
  canUpload: boolean;
  canDelete: boolean;
}

const DocumentoItem: React.FC<DocumentoItemProps> = ({ label, tipo, documento, historial, onUpload, onDelete, canUpload, canDelete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await onUpload(tipo, file);
    } finally {
      setIsUploading(false);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800">{label}</h3>
        {canUpload && (
          <div className="flex items-center">
            <input type="file" accept=".pdf" onChange={handleFileChange} ref={fileInputRef} className="hidden" id={`upload-${tipo}`} />
            <label htmlFor={`upload-${tipo}`} className={`cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg flex items-center gap-2 text-sm ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? 'Subiendo...' : (documento ? 'Subir Nueva Versión' : 'Subir Archivo')}</span>
            </label>
          </div>
        )}
      </div>
      {documento ? (
        <div className="flex items-center justify-between gap-3">
          <a href={documento.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
            <FileText className="w-4 h-4" />
            <span className="truncate">{documento.nombre}</span>
          </a>
          {canDelete && (
            <button onClick={() => onDelete(documento.id, documento.path)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">La subida de este documento no está disponible en el estado actual.</p>
      )}

      {historial.length > 1 && (
        <div className="text-sm text-gray-600 mt-3">
          <strong>Versiones anteriores:</strong>
          <ul className="list-disc list-inside space-y-1 mt-1">
            {historial.slice(1).map((doc) => (
              <li key={doc.id}>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  {doc.nombre}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
