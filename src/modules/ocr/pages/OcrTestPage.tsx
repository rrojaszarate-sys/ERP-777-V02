import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Progress } from '../../../components/ui/progress';
import { Separator } from '../../../components/ui/separator';
import { 
  Bot, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2,
  Search,
  TrendingUp,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

import { ocrService } from '../services/ocrService';
import { OCRDocument, ProcessingConfig } from '../types/OCRTypes';

interface TestStats {
  total: number;
  tickets: number;
  facturas: number;
  completados: number;
  validados: number;
  confianzaPromedio: number;
}

export const OcrTestPage: React.FC = () => {
  const [documents, setDocuments] = useState<OCRDocument[]>([]);
  const [stats, setStats] = useState<TestStats>({
    total: 0,
    tickets: 0,
    facturas: 0,
    completados: 0,
    validados: 0,
    confianzaPromedio: 0
  });
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedType, setSelectedType] = useState<'ticket' | 'factura' | 'auto'>('auto');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando documentos OCR...');
      
      const docs = await ocrService.getDocuments({
        limit: 50,
        orderBy: 'created_at',
        order: 'desc'
      });
      
      console.log('📄 Documentos obtenidos:', docs.length);
      console.log('📋 Lista de documentos:', docs);
      
      setDocuments(docs);
      
      // Calcular estadísticas
      const total = docs.length;
      const tickets = docs.filter(d => d.tipo_documento === 'ticket').length;
      const facturas = docs.filter(d => d.tipo_documento === 'factura').length;
      const completados = docs.filter(d => d.estado_procesamiento === 'completed').length;
      const validados = docs.filter(d => d.validado).length;
      const confianzaPromedio = docs.length > 0 
        ? Math.round(docs.reduce((sum, d) => sum + (d.confianza_general || 0), 0) / docs.length)
        : 0;

      setStats({
        total,
        tickets,
        facturas,
        completados,
        validados,
        confianzaPromedio
      });
    } catch (error: any) {
      toast.error(`Error cargando documentos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validaciones
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('Archivo muy grande. Máximo 50MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no soportado');
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const config: ProcessingConfig = {
        tipo_documento: selectedType === 'auto' ? 'ticket' : selectedType,
        idioma: 'spa',
        preprocesar: true,
        extraer_texto_completo: true,
        validar_automaticamente: selectedType === 'factura'
      };

      const result = await ocrService.processDocument({
        file,
        config,
        evento_id: 'test-event',
        user_id: 'test-user'
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success && result.document) {
        toast.success(`✅ Documento procesado con ${result.document.confianza_general}% de confianza`);
        await loadDocuments(); // Recargar lista
      } else {
        toast.error(`❌ Error: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`❌ Error procesando: ${error.message}`);
    } finally {
      setProcessing(false);
      setProgress(0);
      // Limpiar input
      event.target.value = '';
    }
  };

  const handleValidateDocument = async (docId: string) => {
    try {
      await ocrService.validateDocument(docId, 'test-user', 'Validado desde página de pruebas');
      toast.success('✅ Documento validado');
      await loadDocuments();
    } catch (error: any) {
      toast.error(`❌ Error validando: ${error.message}`);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    try {
      await ocrService.deleteDocument(docId);
      toast.success('🗑️ Documento eliminado');
      await loadDocuments();
    } catch (error: any) {
      toast.error(`❌ Error eliminando: ${error.message}`);
    }
  };

  const getConfianzaColor = (confianza: number) => {
    if (confianza >= 90) return 'text-green-600 bg-green-50';
    if (confianza >= 70) return 'text-blue-600 bg-blue-50';
    if (confianza >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'processing': return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.nombre_archivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.texto_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.datos_factura && JSON.stringify(doc.datos_factura).toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doc.datos_ticket && JSON.stringify(doc.datos_ticket).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Debug: mostrar información del filtrado
  console.log('🔍 Documentos totales:', documents.length);
  console.log('🔍 Documentos filtrados:', filteredDocuments.length);
  console.log('🔍 Término de búsqueda:', searchTerm);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bot className="w-8 h-8 text-blue-600" />
            Pruebas OCR
          </h1>
          <p className="text-gray-600 mt-1">
            Página de pruebas para el módulo de reconocimiento óptico de caracteres
          </p>
        </div>
        <Button onClick={loadDocuments} disabled={loading} variant="outline">
          <TrendingUp className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.tickets}</div>
            <div className="text-sm text-gray-600">Tickets</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.facturas}</div>
            <div className="text-sm text-gray-600">Facturas</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.completados}</div>
            <div className="text-sm text-gray-600">Completados</div>
          </CardContent>
        </Card>
        <Card className="bg-teal-50 border-teal-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-teal-600">{stats.validados}</div>
            <div className="text-sm text-gray-600">Validados</div>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.confianzaPromedio}%</div>
            <div className="text-sm text-gray-600">Confianza</div>
          </CardContent>
        </Card>
      </div>

      {/* Área de upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Procesar Documento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de tipo */}
          <div className="flex gap-2">
            <Button
              variant={selectedType === 'auto' ? 'primary' : 'outline'}
              onClick={() => setSelectedType('auto')}
              className="flex items-center gap-2"
            >
              <Bot className="w-4 h-4" />
              Auto-detectar
            </Button>
            <Button
              variant={selectedType === 'ticket' ? 'primary' : 'outline'}
              onClick={() => setSelectedType('ticket')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Ticket
            </Button>
            <Button
              variant={selectedType === 'factura' ? 'primary' : 'outline'}
              onClick={() => setSelectedType('factura')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Factura
            </Button>
          </div>

          {/* Área de upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              disabled={processing}
            />
            
            {processing ? (
              <div className="space-y-4">
                <Bot className="w-16 h-16 mx-auto text-blue-600 animate-pulse" />
                <div>
                  <h3 className="text-lg font-medium">Procesando con IA...</h3>
                  <p className="text-gray-500">El sistema está analizando el documento</p>
                </div>
                <Progress value={progress} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-gray-400">
                  {progress < 30 ? 'Subiendo archivo...' : 
                   progress < 60 ? 'Extrayendo texto...' : 
                   progress < 90 ? 'Estructurando datos...' : 'Finalizando...'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-16 h-16 mx-auto text-gray-400" />
                <div>
                  <h3 className="text-lg font-medium">Subir documento para procesar</h3>
                  <p className="text-gray-500">
                    Arrastra archivos aquí o haz click para seleccionar
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Soporta: JPG, PNG, PDF - Máximo 50MB
                  </p>
                </div>
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Seleccionar Archivo
                </Button>
              </div>
            )}
          </div>

          {/* Info del tipo seleccionado */}
          <Alert>
            <Bot className="w-4 h-4" />
            <AlertDescription>
              <strong>{selectedType === 'auto' ? 'Detección Automática' : selectedType === 'ticket' ? 'Ticket' : 'Factura'}:</strong> {' '}
              {selectedType === 'auto' && 'El sistema detectará automáticamente si es ticket o factura.'}
              {selectedType === 'ticket' && 'Extraerá establecimiento, total, fecha, productos y detalles de pago.'}
              {selectedType === 'factura' && 'Extraerá UUID, RFC, totales, impuestos y validará con SAT.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, texto, RFC, establecimiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm('')}
              >
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de documentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documentos Procesados ({filteredDocuments.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 mx-auto text-gray-400 animate-spin mb-2" />
              <p className="text-gray-500">Cargando documentos...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron documentos' : 'No hay documentos'}
              </h3>
              <p className="text-gray-500">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Sube tu primer documento para comenzar'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                  {/* Header del documento */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getEstadoIcon(doc.estado_procesamiento)}
                      <div>
                        <h4 className="font-medium">{doc.nombre_archivo}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Badge variant="default" className="text-xs">
                            {doc.tipo_documento}
                          </Badge>
                          <span>•</span>
                          <span>{new Date(doc.created_at).toLocaleString()}</span>
                          {doc.tiempo_procesamiento_ms && (
                            <>
                              <span>•</span>
                              <span>{(doc.tiempo_procesamiento_ms / 1000).toFixed(1)}s</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Confianza */}
                      <Badge className={`${getConfianzaColor(doc.confianza_general || 0)} px-2 py-1`}>
                        {doc.confianza_general || 0}%
                      </Badge>

                      {/* Validado */}
                      {doc.validado ? (
                        <Badge variant="success">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Validado
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleValidateDocument(doc.id)}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Validar
                        </Button>
                      )}

                      {/* Acciones */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Datos extraídos */}
                  {doc.estado_procesamiento === 'completed' && (
                    <div className="bg-gray-50 rounded p-3 space-y-2">
                      <h5 className="font-medium text-sm">Datos Extraídos:</h5>
                      
                      {doc.tipo_documento === 'ticket' && doc.datos_ticket && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Establecimiento:</span>
                            <div className="font-medium">{doc.datos_ticket.establecimiento || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Total:</span>
                            <div className="font-medium">${doc.datos_ticket.total || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Fecha:</span>
                            <div className="font-medium">{doc.datos_ticket.fecha || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Forma de pago:</span>
                            <div className="font-medium">{doc.datos_ticket.forma_pago || 'N/A'}</div>
                          </div>
                        </div>
                      )}

                      {doc.tipo_documento === 'factura' && doc.datos_factura && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">UUID:</span>
                            <div className="font-medium font-mono text-xs">{doc.datos_factura.uuid || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">RFC Emisor:</span>
                            <div className="font-medium">{doc.datos_factura.rfc_emisor || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Total:</span>
                            <div className="font-medium">${doc.datos_factura.total || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Estado SAT:</span>
                            <div className="font-medium">{doc.datos_factura.estado || 'N/A'}</div>
                          </div>
                        </div>
                      )}

                      {/* Texto extraído (primeros 200 caracteres) */}
                      {doc.texto_completo && (
                        <div className="mt-2">
                          <span className="text-gray-600 text-sm">Texto extraído:</span>
                          <div className="text-xs text-gray-700 bg-white p-2 rounded border">
                            {doc.texto_completo.substring(0, 200)}
                            {doc.texto_completo.length > 200 && '...'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {doc.estado_procesamiento === 'error' && doc.error_mensaje && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-700">
                        <strong>Error:</strong> {doc.error_mensaje}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OcrTestPage;
