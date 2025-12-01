import React, { useRef, useState } from 'react';
import { supabase } from '../../../../core/config/supabase';
import { Button } from '../../../../shared/components/ui/Button';
import { Loader2, Trash2 } from 'lucide-react';
import { useEventDocuments } from '../../hooks/useEventDocuments';
import toast from 'react-hot-toast';

interface EventDocumentUploadProps {
  eventId: string;
  onUploadSuccess?: (file: { name: string }) => void;
}

export const EventDocumentUpload: React.FC<EventDocumentUploadProps> = ({ eventId, onUploadSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const bucket = 'documents';
  const { documents, isLoading, addDocument, deleteDocument } = useEventDocuments(eventId);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const file = files[0];
    const path = `${eventId}/${file.name}`;

    // 1. Subir a Supabase Storage
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });

    if (error) {
      toast.error('Error al subir archivo');
      console.error(error);
    } else {
      const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

      // 2. Guardar registro en la tabla evt_documentos
      const newDocument = {
        evento_id: eventId,
        nombre: file.name,
        path,
        url: publicUrl,
        created_at: new Date().toISOString(),
      };
      
      addDocument(newDocument);

      // 3. Notificar al componente padre
      if (onUploadSuccess) {
        onUploadSuccess({ name: file.name });
      }
    }
    setUploading(false);
  };

  const handleRemove = async (doc: any) => {
    // 1. Borrar del bucket
    const { error } = await supabase.storage.from(bucket).remove([doc.path]);
    if (error) {
      toast.error('Error al eliminar archivo');
      console.error(error);
      return;
    }

    // 2. Borrar de la tabla evt_documentos
    deleteDocument(doc.id);
  };

  return (
    <div className="space-y-4">
      {/* Botón de subir */}
      <div>
        <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-mint-500 hover:bg-mint-600"
        >
          {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</> : 'Subir Documento'}
        </Button>
      </div>

      {/* Lista de documentos */}
      {isLoading ? (
        <p className="text-sm text-gray-500">Cargando documentos...</p>
      ) : documents.length > 0 ? (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg border"
            >
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm"
              >
                {doc.nombre}
              </a>
              <button onClick={() => handleRemove(doc)}>
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No hay documentos adjuntos.</p>
      )}
    </div>
  );
};
