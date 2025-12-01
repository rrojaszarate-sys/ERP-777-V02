// Componentes del módulo de inventario ERP
export { QRScanner } from './QRScanner';
export { QRLabelGenerator } from './QRLabelGenerator';
export { LabelGenerator } from './LabelGenerator';
export { Barcode, BarcodeCanvas, useBarcodeDataUrl, validateBarcodeValue, generateEAN13CheckDigit, generateProductBarcode } from './BarcodeGenerator';
export type { BarcodeFormat, BarcodeProps, BarcodeCanvasProps } from './BarcodeGenerator';
export { DocumentoInventarioForm } from './DocumentoInventarioForm';
export { ImportProductosModal } from './ImportProductosModal';
export { InventarioHelpGuide } from './InventarioHelpGuide';
export { PDFDocumentoInventario } from './PDFDocumentoInventario';
export { SignatureCapture } from './SignatureCapture';
export { SesionReceiver } from './SesionReceiver';
