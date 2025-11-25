/**
 * 📤 Modal para Subir Factura XML (CFDI)
 */

import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea } from '@nextui-org/react';
import { Upload, FileText, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { invoiceService } from '../services/invoiceService';
import { calcularFechaCompromiso, formatDateForDisplay } from '../utils/dateCalculator';
import type { Invoice } from '../types/Invoice';

interface InvoiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventoId: string;
  onSuccess?: (invoice: Invoice) => void;
}

export const InvoiceUploadModal: React.FC<InvoiceUploadModalProps> = ({
  isOpen,
  onClose,
  eventoId,
  onSuccess
}) => {
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [diasCredito, setDiasCredito] = useState<number>(30);
  const [notasCobro, setNotasCobro] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    fechaEmision: Date | null;
    fechaCompromiso: Date | null;
  }>({ fechaEmision: null, fechaCompromiso: null });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'text/xml' || file.name.endsWith('.xml')) {
        setXmlFile(file);
        // Intentar parsear para preview
        parseForPreview(file);
      } else {
        toast.error('❌ Por favor selecciona un archivo XML válido');
      }
    }
  };

  const parseForPreview = async (file: File) => {
    try {
      const content = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      
      // Buscar fecha
      const cfdiNode = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0] 
                    || xmlDoc.getElementsByTagName('Comprobante')[0];
      
      if (cfdiNode) {
        const fechaStr = cfdiNode.getAttribute('Fecha') || '';
        if (fechaStr) {
          const fechaEmision = new Date(fechaStr);
          setPreviewData({
            fechaEmision,
            fechaCompromiso: calcularFechaCompromiso(fechaEmision, diasCredito)
          });
        }
      }
    } catch (error) {
      console.warn('No se pudo parsear para preview:', error);
    }
  };

  const handleDiasCreditoChange = (value: string) => {
    const dias = parseInt(value) || 0;
    setDiasCredito(dias);
    
    // Recalcular fecha de compromiso
    if (previewData.fechaEmision) {
      setPreviewData({
        ...previewData,
        fechaCompromiso: calcularFechaCompromiso(previewData.fechaEmision, dias)
      });
    }
  };

  const handleSubmit = async () => {
    if (!xmlFile) {
      toast.error('❌ Por favor selecciona un archivo XML');
      return;
    }

    if (diasCredito < 0) {
      toast.error('❌ Los días de crédito deben ser un número positivo');
      return;
    }

    setIsUploading(true);
    
    try {
      console.log('📤 Subiendo factura XML...');
      
      const factura = await invoiceService.createFromXML(
        xmlFile,
        eventoId,
        diasCredito,
        notasCobro || undefined
      );
      
      toast.success('✅ Factura cargada exitosamente');
      
      if (onSuccess) {
        onSuccess(factura);
      }
      
      handleClose();
    } catch (error: any) {
      console.error('❌ Error al subir factura:', error);
      toast.error(`❌ Error: ${error.message || 'No se pudo procesar el XML'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setXmlFile(null);
    setDiasCredito(30);
    setNotasCobro('');
    setPreviewData({ fechaEmision: null, fechaCompromiso: null });
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                <span>Cargar Factura Electrónica (XML)</span>
              </div>
            </ModalHeader>
            
            <ModalBody>
              {/* Selector de archivo XML */}
              <div className="space-y-4">
                <div>
                  <label 
                    htmlFor="xml-upload" 
                    className="block text-sm font-medium mb-2"
                  >
                    Archivo XML (CFDI)
                  </label>
                  
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                    <input
                      id="xml-upload"
                      type="file"
                      accept=".xml"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    <label 
                      htmlFor="xml-upload" 
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <FileText className="w-12 h-12 text-gray-400" />
                      {xmlFile ? (
                        <>
                          <p className="text-sm font-medium text-success">
                            ✅ {xmlFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(xmlFile.size / 1024).toFixed(1)} KB
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium">
                            Haz clic para seleccionar o arrastra el XML aquí
                          </p>
                          <p className="text-xs text-gray-500">
                            Solo archivos .xml (CFDI versión 3.3 o 4.0)
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Días de crédito */}
                <Input
                  type="number"
                  label="Días de crédito"
                  placeholder="30"
                  value={diasCredito.toString()}
                  onValueChange={handleDiasCreditoChange}
                  min="0"
                  max="365"
                  startContent={<Calendar className="w-4 h-4 text-gray-400" />}
                  description="Número de días para el pago de la factura"
                />

                {/* Preview de fechas */}
                {previewData.fechaEmision && (
                  <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-medium">Fechas calculadas:</span>
                    </div>
                    <div className="ml-6 space-y-1 text-sm">
                      <p>
                        <span className="text-gray-600 dark:text-gray-400">Emisión:</span>{' '}
                        <span className="font-medium">
                          {formatDateForDisplay(previewData.fechaEmision)}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-600 dark:text-gray-400">Compromiso de pago:</span>{' '}
                        <span className="font-medium text-primary">
                          {previewData.fechaCompromiso && formatDateForDisplay(previewData.fechaCompromiso)}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Notas de cobro */}
                <Textarea
                  label="Notas de cobro (opcional)"
                  placeholder="Ej: Transferencia a cuenta 1234..."
                  value={notasCobro}
                  onValueChange={setNotasCobro}
                  maxRows={3}
                  description="Información adicional sobre el cobro"
                />

                {/* Información */}
                <div className="flex gap-2 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p>El sistema extraerá automáticamente:</p>
                    <ul className="list-disc list-inside ml-2 text-xs">
                      <li>UUID, RFC emisor/receptor, montos, fechas</li>
                      <li>Calculará la fecha de compromiso de pago</li>
                      <li>Configurará alertas automáticas de cobro</li>
                    </ul>
                  </div>
                </div>
              </div>
            </ModalBody>
            
            <ModalFooter>
              <Button 
                color="danger" 
                variant="light" 
                onPress={handleClose}
                isDisabled={isUploading}
              >
                Cancelar
              </Button>
              <Button 
                color="primary" 
                onPress={handleSubmit}
                isLoading={isUploading}
                isDisabled={!xmlFile}
              >
                {isUploading ? 'Procesando...' : 'Cargar Factura'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
