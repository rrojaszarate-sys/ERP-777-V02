/**
 * Gestor de Branding (Logos y Membretes) - FASE 6
 */
import { useState, useRef } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Image,
  Input,
  Divider,
  Chip,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter
} from '@nextui-org/react';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Trash2,
  Download,
  Eye,
  Palette,
  PenTool,
  Stamp,
  Check
} from 'lucide-react';
import { useUploadArchivo, useDeleteArchivo, useArchivosEmpresa, useUpdateBranding } from '../hooks/useEmpresas';
import type { Empresa, TipoArchivoEmpresa, ArchivoEmpresa } from '../types';

interface BrandingManagerProps {
  empresa: Empresa;
}

interface BrandingItem {
  tipo: TipoArchivoEmpresa;
  label: string;
  descripcion: string;
  icon: React.ReactNode;
  campo: keyof Empresa;
  dimensiones?: string;
  formatos?: string[];
}

const BRANDING_ITEMS: BrandingItem[] = [
  {
    tipo: 'logo_principal',
    label: 'Logo Principal',
    descripcion: 'Logo para documentos y sistema',
    icon: <ImageIcon className="w-5 h-5" />,
    campo: 'logo_principal_url',
    dimensiones: '500x500 px',
    formatos: ['PNG', 'SVG', 'JPG']
  },
  {
    tipo: 'logo_secundario',
    label: 'Logo Secundario',
    descripcion: 'Logo alternativo (monocromático)',
    icon: <ImageIcon className="w-5 h-5" />,
    campo: 'logo_secundario_url',
    dimensiones: '500x500 px',
    formatos: ['PNG', 'SVG']
  },
  {
    tipo: 'membrete',
    label: 'Membrete',
    descripcion: 'Encabezado para documentos oficiales',
    icon: <FileText className="w-5 h-5" />,
    campo: 'membrete_url',
    dimensiones: '2100x300 px (carta)',
    formatos: ['PNG', 'JPG', 'PDF']
  },
  {
    tipo: 'favicon',
    label: 'Favicon',
    descripcion: 'Ícono para navegador',
    icon: <ImageIcon className="w-5 h-5" />,
    campo: 'favicon_url',
    dimensiones: '32x32 o 64x64 px',
    formatos: ['PNG', 'ICO']
  },
  {
    tipo: 'firma',
    label: 'Firma Digital',
    descripcion: 'Firma autorizada para documentos',
    icon: <PenTool className="w-5 h-5" />,
    campo: 'firma_digital_url',
    dimensiones: '400x150 px',
    formatos: ['PNG']
  },
  {
    tipo: 'sello',
    label: 'Sello de Empresa',
    descripcion: 'Sello oficial de la empresa',
    icon: <Stamp className="w-5 h-5" />,
    campo: 'sello_empresa_url',
    dimensiones: '300x300 px',
    formatos: ['PNG']
  }
];

export function BrandingManager({ empresa }: BrandingManagerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState<string>('');
  const [colorPrimario, setColorPrimario] = useState(empresa.color_primario || '#006FEE');
  const [colorSecundario, setColorSecundario] = useState(empresa.color_secundario || '#17C964');
  const [colorAcento, setColorAcento] = useState(empresa.color_acento || '#F5A524');

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: archivos, isLoading: loadingArchivos } = useArchivosEmpresa(empresa.id);
  const uploadArchivo = useUploadArchivo();
  const deleteArchivo = useDeleteArchivo();
  const updateBranding = useUpdateBranding();

  const handleFileSelect = async (tipo: TipoArchivoEmpresa, file: File) => {
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Tipo de archivo no válido');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo no debe superar 5MB');
      return;
    }

    await uploadArchivo.mutateAsync({
      companyId: empresa.id,
      file,
      tipo
    });
  };

  const handleDelete = async (archivo: ArchivoEmpresa) => {
    if (confirm('¿Eliminar este archivo?')) {
      await deleteArchivo.mutateAsync(archivo.id);
    }
  };

  const handleSaveColors = async () => {
    await updateBranding.mutateAsync({
      id: empresa.id,
      branding: {
        color_primario: colorPrimario,
        color_secundario: colorSecundario,
        color_acento: colorAcento
      }
    });
  };

  const getArchivoUrl = (tipo: TipoArchivoEmpresa): string | null => {
    const item = BRANDING_ITEMS.find(b => b.tipo === tipo);
    if (item) {
      return empresa[item.campo] as string || null;
    }
    return null;
  };

  const openPreview = (url: string, label: string) => {
    setPreviewUrl(url);
    setPreviewLabel(label);
  };

  return (
    <div className="space-y-6">
      {/* Logos y Archivos */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Logos y Archivos de Marca</h3>
          </div>
        </CardHeader>
        <CardBody>
          {loadingArchivos ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BRANDING_ITEMS.map((item) => {
                const url = getArchivoUrl(item.tipo);

                return (
                  <Card key={item.tipo} className="border">
                    <CardBody className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-default-100 rounded-lg">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{item.label}</h4>
                          <p className="text-xs text-gray-500">{item.descripcion}</p>
                          <div className="flex gap-1 mt-1">
                            <Chip size="sm" variant="flat">{item.dimensiones}</Chip>
                          </div>
                        </div>
                      </div>

                      <Divider className="my-3" />

                      {url ? (
                        <div className="space-y-2">
                          {/* Preview */}
                          <div
                            className="relative h-24 bg-gray-50 rounded-lg overflow-hidden cursor-pointer flex items-center justify-center"
                            onClick={() => openPreview(url, item.label)}
                          >
                            {item.tipo === 'membrete' ? (
                              <Image
                                src={url}
                                alt={item.label}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Image
                                src={url}
                                alt={item.label}
                                className="max-h-20 max-w-20 object-contain"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                              <Eye className="w-6 h-6 text-white" />
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="flat"
                              startContent={<Upload className="w-3 h-3" />}
                              className="flex-1"
                              onPress={() => fileInputRefs.current[item.tipo]?.click()}
                              isLoading={uploadArchivo.isPending}
                            >
                              Cambiar
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              color="danger"
                              isIconOnly
                              onPress={() => {
                                const archivo = archivos?.find(a => a.tipo === item.tipo);
                                if (archivo) handleDelete(archivo);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary-50/30 transition-colors"
                          onClick={() => fileInputRefs.current[item.tipo]?.click()}
                        >
                          <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500">
                            Click para subir
                          </p>
                          <p className="text-xs text-gray-400">
                            {item.formatos?.join(', ')}
                          </p>
                        </div>
                      )}

                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={(el) => { fileInputRefs.current[item.tipo] = el; }}
                        className="hidden"
                        accept={item.formatos?.map(f => `.${f.toLowerCase()}`).join(',')}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(item.tipo, file);
                          e.target.value = '';
                        }}
                      />
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Colores */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Colores de Marca</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Color Primario */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Color Primario</label>
              <p className="text-xs text-gray-500">Para botones y elementos principales</p>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={colorPrimario}
                  onChange={(e) => setColorPrimario(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                />
                <Input
                  value={colorPrimario}
                  onChange={(e) => setColorPrimario(e.target.value)}
                  size="sm"
                  className="flex-1"
                />
              </div>
              <div
                className="h-8 rounded-lg"
                style={{ backgroundColor: colorPrimario }}
              />
            </div>

            {/* Color Secundario */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Color Secundario</label>
              <p className="text-xs text-gray-500">Para acentos y éxito</p>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={colorSecundario}
                  onChange={(e) => setColorSecundario(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                />
                <Input
                  value={colorSecundario}
                  onChange={(e) => setColorSecundario(e.target.value)}
                  size="sm"
                  className="flex-1"
                />
              </div>
              <div
                className="h-8 rounded-lg"
                style={{ backgroundColor: colorSecundario }}
              />
            </div>

            {/* Color Acento */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Color Acento</label>
              <p className="text-xs text-gray-500">Para advertencias y destacados</p>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={colorAcento}
                  onChange={(e) => setColorAcento(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                />
                <Input
                  value={colorAcento}
                  onChange={(e) => setColorAcento(e.target.value)}
                  size="sm"
                  className="flex-1"
                />
              </div>
              <div
                className="h-8 rounded-lg"
                style={{ backgroundColor: colorAcento }}
              />
            </div>
          </div>

          {/* Preview */}
          <Divider className="my-4" />
          <div className="space-y-2">
            <label className="text-sm font-medium">Vista Previa</label>
            <div className="flex gap-2 flex-wrap">
              <Button style={{ backgroundColor: colorPrimario, color: 'white' }}>
                Primario
              </Button>
              <Button style={{ backgroundColor: colorSecundario, color: 'white' }}>
                Secundario
              </Button>
              <Button style={{ backgroundColor: colorAcento, color: 'white' }}>
                Acento
              </Button>
              <Chip style={{ backgroundColor: colorPrimario, color: 'white' }}>
                Chip Primario
              </Chip>
              <Chip style={{ backgroundColor: colorSecundario, color: 'white' }}>
                Chip Secundario
              </Chip>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              color="primary"
              startContent={<Check className="w-4 h-4" />}
              onPress={handleSaveColors}
              isLoading={updateBranding.isPending}
            >
              Guardar Colores
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Modal de Preview */}
      <Modal isOpen={!!previewUrl} onClose={() => setPreviewUrl(null)} size="2xl">
        <ModalContent>
          <ModalHeader>{previewLabel}</ModalHeader>
          <ModalBody>
            {previewUrl && (
              <div className="flex justify-center bg-gray-100 rounded-lg p-4">
                <Image
                  src={previewUrl}
                  alt={previewLabel}
                  className="max-h-[60vh] object-contain"
                />
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            {previewUrl && (
              <Button
                variant="flat"
                startContent={<Download className="w-4 h-4" />}
                as="a"
                href={previewUrl}
                download
                target="_blank"
              >
                Descargar
              </Button>
            )}
            <Button onPress={() => setPreviewUrl(null)}>
              Cerrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default BrandingManager;
