/**
 * EtiquetasPage - Página para generar etiquetas de productos
 * 
 * Permite seleccionar múltiples productos y generar etiquetas con:
 * - Código de barras (EAN-13, CODE-128)
 * - Código QR
 * - Información del producto (nombre, clave, precio)
 */

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../core/config/supabase';
import JsBarcode from 'jsbarcode';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  Tag,
  Printer,
  Search,
  CheckSquare,
  Square,
  QrCode,
  Barcode,
  Download,
  Settings,
  X,
  Plus,
  Minus,
  RefreshCw,
  Package,
  FileText,
  Eye,
  Warehouse,
  Layers
} from 'lucide-react';

// Tipos
interface Producto {
  id: number;
  clave: string;
  nombre: string;
  descripcion?: string;
  unidad: string;
  precio_venta?: number;
  costo?: number;
  codigo_barras?: string;
  categoria?: string;
  stock?: number;
}

interface ProductoSeleccionado extends Producto {
  cantidadEtiquetas: number;
}

interface Almacen {
  id: number;
  nombre: string;
}

interface ConfiguracionEtiqueta {
  formato: 'A4' | 'carta' | 'termica80' | 'termica58';
  tiposCodigo: ('qr' | 'barcode')[];
  mostrarPrecio: boolean;
  mostrarDescripcion: boolean;
  etiquetasPorFila: number;
  filasPorPagina: number;
  tamanoEtiqueta: string;
  margen: number;
}

// Tamaños de etiquetas estándar comerciales (en mm)
const TAMANOS_ETIQUETA: Record<string, { width: number; height: number; fontSize: number; qrSize: number; barcodeHeight: number; nombre: string; descripcion: string }> = {
  // Etiquetas de precio pequeñas
  'precio-mini': { width: 22, height: 12, fontSize: 5, qrSize: 15, barcodeHeight: 15, nombre: 'Precio Mini', descripcion: '22x12mm - Joyería/Accesorios' },
  'precio-std': { width: 26, height: 16, fontSize: 6, qrSize: 20, barcodeHeight: 18, nombre: 'Precio Estándar', descripcion: '26x16mm - Ropa/Tiendas' },
  'precio-med': { width: 32, height: 19, fontSize: 7, qrSize: 24, barcodeHeight: 22, nombre: 'Precio Mediano', descripcion: '32x19mm - Supermercado' },
  
  // Etiquetas de góndola/anaquel
  'gondola-chica': { width: 38, height: 21, fontSize: 7, qrSize: 26, barcodeHeight: 24, nombre: 'Góndola Chica', descripcion: '38x21mm - Anaquel pequeño' },
  'gondola-std': { width: 50, height: 25, fontSize: 8, qrSize: 32, barcodeHeight: 28, nombre: 'Góndola Estándar', descripcion: '50x25mm - Anaquel normal' },
  'gondola-grande': { width: 60, height: 30, fontSize: 9, qrSize: 38, barcodeHeight: 32, nombre: 'Góndola Grande', descripcion: '60x30mm - Productos grandes' },
  
  // Etiquetas adhesivas rectangulares
  'adhesiva-sm': { width: 40, height: 20, fontSize: 7, qrSize: 25, barcodeHeight: 22, nombre: 'Adhesiva Pequeña', descripcion: '40x20mm - Productos chicos' },
  'adhesiva-md': { width: 50, height: 30, fontSize: 8, qrSize: 35, barcodeHeight: 28, nombre: 'Adhesiva Mediana', descripcion: '50x30mm - Uso general' },
  'adhesiva-lg': { width: 70, height: 35, fontSize: 9, qrSize: 42, barcodeHeight: 35, nombre: 'Adhesiva Grande', descripcion: '70x35mm - Cajas/Bultos' },
  
  // Etiquetas cuadradas (para QR)
  'cuadrada-sm': { width: 25, height: 25, fontSize: 6, qrSize: 30, barcodeHeight: 20, nombre: 'Cuadrada Chica', descripcion: '25x25mm - Solo QR' },
  'cuadrada-md': { width: 40, height: 40, fontSize: 8, qrSize: 48, barcodeHeight: 25, nombre: 'Cuadrada Mediana', descripcion: '40x40mm - QR + Precio' },
  'cuadrada-lg': { width: 50, height: 50, fontSize: 9, qrSize: 60, barcodeHeight: 30, nombre: 'Cuadrada Grande', descripcion: '50x50mm - QR + Info' },
  
  // Etiquetas de colgante (para ropa)
  'colgante-sm': { width: 30, height: 50, fontSize: 7, qrSize: 35, barcodeHeight: 25, nombre: 'Colgante Chica', descripcion: '30x50mm - Ropa' },
  'colgante-md': { width: 40, height: 60, fontSize: 8, qrSize: 45, barcodeHeight: 30, nombre: 'Colgante Mediana', descripcion: '40x60mm - Ropa/Calzado' },
  
  // Para impresora térmica de rollo
  'termica-58': { width: 48, height: 30, fontSize: 8, qrSize: 35, barcodeHeight: 28, nombre: 'Térmica 58mm', descripcion: '48x30mm - Rollo 58mm' },
  'termica-80': { width: 70, height: 40, fontSize: 9, qrSize: 45, barcodeHeight: 35, nombre: 'Térmica 80mm', descripcion: '70x40mm - Rollo 80mm' },
};

// Configuraciones de papel
const FORMATOS_PAPEL = {
  A4: { width: 210, height: 297, name: 'A4 (210x297mm)' },
  carta: { width: 216, height: 279, name: 'Carta (216x279mm)' },
  termica80: { width: 80, height: 297, name: 'Térmica 80mm' },
  termica58: { width: 58, height: 297, name: 'Térmica 58mm' },
};

export const EtiquetasPage: React.FC = () => {
  console.log('[EtiquetasPage] Componente renderizando...');
  
  // Estados
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [almacenSeleccionado, setAlmacenSeleccionado] = useState<number | null>(null);
  const [usarStockComoEtiquetas, setUsarStockComoEtiquetas] = useState(false);
  const [config, setConfig] = useState<ConfiguracionEtiqueta>({
    formato: 'A4',
    tiposCodigo: ['qr'],
    mostrarPrecio: true,
    mostrarDescripcion: false,
    etiquetasPorFila: 5,
    filasPorPagina: 10,
    tamanoEtiqueta: 'precio-std',
    margen: 5
  });

  const printRef = useRef<HTMLDivElement>(null);

  // Cargar productos y almacenes
  useEffect(() => {
    cargarDatos();
  }, []);

  // Recargar stock cuando cambia el almacén
  useEffect(() => {
    if (almacenSeleccionado && productos.length > 0) {
      cargarStockProductos();
    }
  }, [almacenSeleccionado]);

  const cargarDatos = async () => {
    console.log('[EtiquetasPage] cargarDatos iniciando...');
    try {
      setLoading(true);
      setError(null);
      
      // Cargar almacenes
      console.log('[EtiquetasPage] Cargando almacenes...');
      const { data: almacenesData, error: almError } = await supabase
        .from('almacenes_erp')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      
      console.log('[EtiquetasPage] Almacenes:', almacenesData?.length || 0, almError);
      
      const almacenesTyped = (almacenesData || []) as Almacen[];
      setAlmacenes(almacenesTyped);
      if (almacenesTyped.length > 0) {
        setAlmacenSeleccionado(almacenesTyped[0].id);
      }
      
      // Cargar productos - sin límite para mostrar todos
      console.log('[EtiquetasPage] Cargando productos...');
      const { data, error: prodError } = await supabase
        .from('productos_erp')
        .select('id, clave, nombre, descripcion, unidad, precio_venta, costo, codigo_qr, categoria')
        .order('nombre');
      
      console.log('[EtiquetasPage] Productos:', data?.length || 0, prodError);
      
      if (prodError) throw prodError;
      
      const productosData = (data || []) as any[];
      const productosConBarcode: Producto[] = productosData.map(p => ({
        id: p.id,
        clave: p.clave,
        nombre: p.nombre,
        descripcion: p.descripcion,
        unidad: p.unidad,
        precio_venta: p.precio_venta,
        costo: p.costo,
        categoria: p.categoria,
        codigo_barras: p.codigo_qr || p.clave,
        stock: 0
      }));
      
      console.log('[EtiquetasPage] Productos procesados:', productosConBarcode.length);
      setProductos(productosConBarcode);
    } catch (err: any) {
      console.error('[EtiquetasPage] Error cargando datos:', err);
      setError(err.message || 'Error al cargar datos');
      toast.error('Error al cargar datos');
    } finally {
      console.log('[EtiquetasPage] cargarDatos terminado');
      setLoading(false);
    }
  };

  const cargarStockProductos = async () => {
    if (!almacenSeleccionado) return;
    
    try {
      // Obtener stock del almacén seleccionado
      const { data: stockData } = await supabase
        .from('stock_erp')
        .select('producto_id, cantidad')
        .eq('almacen_id', almacenSeleccionado);
      
      const stockMap = new Map<number, number>();
      const stockTyped = (stockData || []) as { producto_id: number; cantidad: number }[];
      stockTyped.forEach(s => {
        stockMap.set(s.producto_id, s.cantidad || 0);
      });
      
      // Actualizar productos con stock
      setProductos(prev => prev.map(p => ({
        ...p,
        stock: stockMap.get(p.id) || 0
      })));
      
      // Si hay productos seleccionados y usarStockComoEtiquetas está activo, actualizar cantidades
      if (usarStockComoEtiquetas) {
        setProductosSeleccionados(prev => prev.map(p => ({
          ...p,
          stock: stockMap.get(p.id) || 0,
          cantidadEtiquetas: Math.max(1, Math.floor(stockMap.get(p.id) || 0))
        })));
      }
    } catch (error) {
      console.error('Error cargando stock:', error);
    }
  };

  // Filtrar productos
  const productosFiltrados = productos.filter(p => {
    const termino = busqueda.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(termino) ||
      p.clave.toLowerCase().includes(termino) ||
      (p.codigo_barras && p.codigo_barras.includes(termino))
    );
  });

  // Verificar si un producto está seleccionado
  const estaSeleccionado = (id: number) => {
    return productosSeleccionados.some(p => p.id === id);
  };

  // Agregar/quitar producto
  const toggleProducto = (producto: Producto) => {
    if (estaSeleccionado(producto.id)) {
      setProductosSeleccionados(prev => prev.filter(p => p.id !== producto.id));
    } else {
      // Si usarStockComoEtiquetas está activo, usar el stock como cantidad inicial
      const cantidadInicial = usarStockComoEtiquetas && producto.stock ? Math.max(1, Math.floor(producto.stock)) : 1;
      setProductosSeleccionados(prev => [...prev, { ...producto, cantidadEtiquetas: cantidadInicial }]);
    }
  };

  // Actualizar cantidad de etiquetas
  const actualizarCantidad = (id: number, cantidad: number) => {
    if (cantidad < 1) cantidad = 1;
    if (cantidad > 9999) cantidad = 9999;
    setProductosSeleccionados(prev =>
      prev.map(p => p.id === id ? { ...p, cantidadEtiquetas: cantidad } : p)
    );
  };

  // Aplicar stock como cantidad de etiquetas a todos los seleccionados
  const aplicarStockComoEtiquetas = () => {
    setProductosSeleccionados(prev => prev.map(p => ({
      ...p,
      cantidadEtiquetas: Math.max(1, Math.floor(p.stock || 0))
    })));
    toast.success('Cantidades actualizadas según stock');
  };

  // Seleccionar todos los filtrados
  const seleccionarTodos = () => {
    const nuevos = productosFiltrados
      .filter(p => !estaSeleccionado(p.id))
      .map(p => ({ ...p, cantidadEtiquetas: 1 }));
    setProductosSeleccionados(prev => [...prev, ...nuevos]);
  };

  // Deseleccionar todos
  const deseleccionarTodos = () => {
    setProductosSeleccionados([]);
  };

  // Generar código de barras para un producto
  const generarCodigoBarras = (producto: ProductoSeleccionado): string => {
    // Usar código de barras existente o generar uno basado en la clave
    return producto.codigo_barras || producto.clave.toUpperCase().replace(/[^A-Z0-9]/g, '');
  };

  // Calcular total de etiquetas
  const totalEtiquetas = productosSeleccionados.reduce((sum, p) => sum + p.cantidadEtiquetas, 0);

  // Generar etiquetas para imprimir
  const generarEtiquetas = () => {
    if (productosSeleccionados.length === 0) {
      toast.error('Seleccione al menos un producto');
      return;
    }
    setShowPreview(true);
  };

  // Imprimir
  const imprimir = () => {
    if (!printRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }

    // Clonar el contenido y convertir canvas a imágenes
    const contenido = printRef.current.cloneNode(true) as HTMLElement;
    const canvasElements = printRef.current.querySelectorAll('canvas');
    const clonedCanvasContainers = contenido.querySelectorAll('canvas');
    
    // Reemplazar cada canvas con una imagen
    canvasElements.forEach((canvas, index) => {
      try {
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        const clonedCanvas = clonedCanvasContainers[index];
        if (clonedCanvas && clonedCanvas.parentNode) {
          clonedCanvas.parentNode.replaceChild(img, clonedCanvas);
        }
      } catch (e) {
        console.error('Error convirtiendo canvas:', e);
      }
    });

    const papel = FORMATOS_PAPEL[config.formato];
    const tamano = TAMANOS_ETIQUETA[config.tamanoEtiqueta];
    const anchoDisponible = papel.width - (config.margen * 2);
    const altoDisponible = papel.height - (config.margen * 2);
    const gapMm = 1;
    
    const styles = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @page {
          size: ${papel.width}mm ${papel.height}mm;
          margin: ${config.margen}mm;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          width: ${anchoDisponible}mm;
        }
        .etiquetas-grid {
          display: grid;
          grid-template-columns: repeat(${config.etiquetasPorFila}, ${tamano.width}mm);
          gap: ${gapMm}mm;
          justify-content: start;
        }
        .etiqueta {
          width: ${tamano.width}mm;
          height: ${tamano.height}mm;
          border: 0.3mm dashed #999;
          padding: 1mm;
          text-align: center;
          page-break-inside: avoid;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
        }
        .etiqueta-nombre {
          font-weight: bold;
          font-size: ${tamano.fontSize}pt;
          line-height: 1.1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
        }
        .etiqueta-clave {
          font-size: ${Math.max(5, tamano.fontSize - 2)}pt;
          color: #555;
        }
        .etiqueta-precio {
          font-size: ${tamano.fontSize + 1}pt;
          font-weight: bold;
        }
        .codigo-container {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .codigo-container svg, .codigo-container img {
          max-width: ${tamano.width - 4}mm;
          max-height: ${tamano.qrSize}px;
          height: auto;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiquetas de Productos</title>
          ${styles}
        </head>
        <body>
          ${contenido.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Esperar a que las imágenes carguen
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Componente de etiqueta individual - Compacto
  const EtiquetaPreview: React.FC<{ producto: ProductoSeleccionado }> = ({ producto }) => {
    const barcodeRef = useRef<SVGSVGElement>(null);
    const codigoBarras = generarCodigoBarras(producto);
    const tamano = TAMANOS_ETIQUETA[config.tamanoEtiqueta];

    useEffect(() => {
      if (barcodeRef.current && config.tiposCodigo.includes('barcode')) {
        try {
          JsBarcode(barcodeRef.current, codigoBarras, {
            format: 'CODE128',
            width: 1,
            height: tamano.barcodeHeight,
            displayValue: true,
            fontSize: tamano.fontSize,
            margin: 0,
            textMargin: 0
          });
        } catch (e) {
          console.error('Error generando código de barras:', e);
        }
      }
    }, [codigoBarras, tamano]);

    return (
      <div 
        className="etiqueta bg-white border border-dashed border-gray-400 flex flex-col items-center justify-between overflow-hidden"
        style={{ 
          width: `${tamano.width}mm`, 
          height: `${tamano.height}mm`,
          padding: '1mm',
          fontSize: `${tamano.fontSize}pt`
        }}
      >
        <div className="etiqueta-nombre font-bold truncate w-full text-center" style={{ fontSize: `${tamano.fontSize}pt` }}>
          {producto.nombre.substring(0, 20)}
        </div>
        
        <div className="etiqueta-clave text-gray-600" style={{ fontSize: `${Math.max(5, tamano.fontSize - 1)}pt` }}>
          {producto.clave}
        </div>

        {/* Contenedor de códigos - layout diferente según selección */}
        <div className={`codigo-container flex items-center justify-center ${
          config.tiposCodigo.includes('qr') && config.tiposCodigo.includes('barcode') 
            ? 'flex-row gap-1' 
            : 'flex-col'
        }`}>
          {/* Código QR */}
          {config.tiposCodigo.includes('qr') && (
            <QRCodeCanvas
              value={producto.clave}
              size={config.tiposCodigo.includes('barcode') ? Math.floor(tamano.qrSize * 0.7) : tamano.qrSize}
              level="L"
              includeMargin={false}
            />
          )}
          
          {/* Código de Barras */}
          {config.tiposCodigo.includes('barcode') && (
            <svg 
              ref={barcodeRef} 
              style={{ 
                maxWidth: config.tiposCodigo.includes('qr') ? '60%' : '100%',
                height: config.tiposCodigo.includes('qr') ? `${tamano.barcodeHeight * 0.7}px` : `${tamano.barcodeHeight}px`
              }} 
            />
          )}
        </div>

        {config.mostrarPrecio && producto.precio_venta && (
          <div className="etiqueta-precio font-bold" style={{ fontSize: `${tamano.fontSize + 1}pt` }}>
            ${producto.precio_venta.toFixed(2)}
          </div>
        )}
      </div>
    );
  };

  console.log('[EtiquetasPage] Render - loading:', loading, 'productos:', productos.length, 'error:', error);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2">Cargando productos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Generador de Etiquetas</h1>
        <div className="bg-red-100 border border-red-400 p-4 rounded">
          <p className="text-red-700">Error: {error}</p>
          <button 
            onClick={cargarDatos}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Debug temporal
  if (productos.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Generador de Etiquetas</h1>
        <div className="bg-yellow-100 border border-yellow-400 p-4 rounded">
          <p>No se encontraron productos en la base de datos.</p>
          <button 
            onClick={cargarDatos}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Tag className="w-7 h-7 mr-2 text-blue-600" />
            Generador de Etiquetas
          </h1>
          <p className="text-gray-500 mt-1">
            Seleccione productos y genere etiquetas con códigos de barras y QR
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            {productosSeleccionados.length} productos | {totalEtiquetas} etiquetas
          </span>
          <button
            onClick={generarEtiquetas}
            disabled={productosSeleccionados.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Eye className="w-4 h-4 mr-2" />
            Vista Previa
          </button>
        </div>
      </div>

      {/* Selector de almacén y opción de stock */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Warehouse className="w-5 h-5 text-gray-500" />
              <label className="text-sm font-medium">Almacén:</label>
              <select
                value={almacenSeleccionado || ''}
                onChange={(e) => setAlmacenSeleccionado(Number(e.target.value))}
                className="border rounded-lg px-3 py-1.5 text-sm"
              >
                {almacenes.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={usarStockComoEtiquetas}
                onChange={(e) => setUsarStockComoEtiquetas(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <Layers className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Usar stock como cantidad de etiquetas</span>
            </label>
            
            {productosSeleccionados.length > 0 && (
              <button
                onClick={aplicarStockComoEtiquetas}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center"
              >
                <Layers className="w-4 h-4 mr-1" />
                Aplicar stock a seleccionados
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 280px)' }}>
        {/* Panel izquierdo: Lista de productos */}
        <div className="col-span-8 bg-white rounded-lg border flex flex-col">
          {/* Buscador */}
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, clave o código de barras..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={seleccionarTodos}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm"
              >
                Seleccionar todos
              </button>
              <button
                onClick={deseleccionarTodos}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Lista de productos */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)', minHeight: '400px' }}>
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clave</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {productosFiltrados.map(producto => (
                  <tr
                    key={producto.id}
                    onClick={() => toggleProducto(producto)}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      estaSeleccionado(producto.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      {estaSeleccionado(producto.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{producto.clave}</td>
                    <td className="px-4 py-3">{producto.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{producto.unidad}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${(producto.stock || 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {producto.stock || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {producto.precio_venta ? `$${producto.precio_venta.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {productosFiltrados.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho: Configuración y seleccionados */}
        <div className="col-span-4 space-y-4">
          {/* Configuración */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-4 flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Configuración de Etiquetas
            </h3>

            <div className="space-y-4">
              {/* Formato de papel */}
              <div>
                <label className="block text-sm font-medium mb-2">Formato de papel</label>
                <select
                  value={config.formato}
                  onChange={(e) => setConfig({ ...config, formato: e.target.value as any })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="A4">A4 (210x297mm)</option>
                  <option value="carta">Carta (216x279mm)</option>
                  <option value="termica80">Térmica 80mm</option>
                  <option value="termica58">Térmica 58mm</option>
                </select>
              </div>

              {/* Tamaño de etiqueta */}
              <div>
                <label className="block text-sm font-medium mb-2">Tamaño de etiqueta</label>
                <select
                  value={config.tamanoEtiqueta}
                  onChange={(e) => setConfig({ ...config, tamanoEtiqueta: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm"
                >
                  <optgroup label="📌 Etiquetas de Precio">
                    <option value="precio-mini">Mini 22x12mm - Joyería</option>
                    <option value="precio-std">Estándar 26x16mm - Tiendas</option>
                    <option value="precio-med">Mediano 32x19mm - Super</option>
                  </optgroup>
                  <optgroup label="🏪 Góndola/Anaquel">
                    <option value="gondola-chica">Chica 38x21mm</option>
                    <option value="gondola-std">Estándar 50x25mm</option>
                    <option value="gondola-grande">Grande 60x30mm</option>
                  </optgroup>
                  <optgroup label="📋 Adhesivas Rectangulares">
                    <option value="adhesiva-sm">Pequeña 40x20mm</option>
                    <option value="adhesiva-md">Mediana 50x30mm</option>
                    <option value="adhesiva-lg">Grande 70x35mm</option>
                  </optgroup>
                  <optgroup label="⬜ Cuadradas (QR)">
                    <option value="cuadrada-sm">Chica 25x25mm</option>
                    <option value="cuadrada-md">Mediana 40x40mm</option>
                    <option value="cuadrada-lg">Grande 50x50mm</option>
                  </optgroup>
                  <optgroup label="👕 Colgantes (Ropa)">
                    <option value="colgante-sm">Chica 30x50mm</option>
                    <option value="colgante-md">Mediana 40x60mm</option>
                  </optgroup>
                  <optgroup label="🖨️ Impresora Térmica">
                    <option value="termica-58">Rollo 58mm (48x30mm)</option>
                    <option value="termica-80">Rollo 80mm (70x40mm)</option>
                  </optgroup>
                </select>
                {TAMANOS_ETIQUETA[config.tamanoEtiqueta] && (
                  <p className="text-xs text-gray-500 mt-1">
                    {TAMANOS_ETIQUETA[config.tamanoEtiqueta].width}x{TAMANOS_ETIQUETA[config.tamanoEtiqueta].height}mm
                  </p>
                )}
              </div>

              {/* Etiquetas por fila */}
              <div>
                <label className="block text-sm font-medium mb-2">Etiquetas por fila</label>
                <select
                  value={config.etiquetasPorFila}
                  onChange={(e) => setConfig({ ...config, etiquetasPorFila: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value={2}>2 por fila</option>
                  <option value={3}>3 por fila</option>
                  <option value={4}>4 por fila</option>
                  <option value={5}>5 por fila</option>
                  <option value={6}>6 por fila</option>
                  <option value={7}>7 por fila</option>
                </select>
              </div>

              {/* Tipo de código */}
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de código</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tipoCodigo"
                      checked={config.tiposCodigo.includes('qr') && !config.tiposCodigo.includes('barcode')}
                      onChange={() => setConfig({ ...config, tiposCodigo: ['qr'] })}
                      className="mr-2"
                    />
                    <QrCode className="w-4 h-4 mr-1" />
                    Solo QR
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tipoCodigo"
                      checked={config.tiposCodigo.includes('barcode') && !config.tiposCodigo.includes('qr')}
                      onChange={() => setConfig({ ...config, tiposCodigo: ['barcode'] })}
                      className="mr-2"
                    />
                    <Barcode className="w-4 h-4 mr-1" />
                    Solo Barras
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tipoCodigo"
                      checked={config.tiposCodigo.includes('qr') && config.tiposCodigo.includes('barcode')}
                      onChange={() => setConfig({ ...config, tiposCodigo: ['qr', 'barcode'] })}
                      className="mr-2"
                    />
                    <span className="flex items-center">
                      <QrCode className="w-4 h-4 mr-1" />
                      +
                      <Barcode className="w-4 h-4 ml-1 mr-1" />
                      Ambos
                    </span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 QR para celular, Barras para lector USB
                </p>
              </div>

              {/* Opciones adicionales */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.mostrarPrecio}
                    onChange={(e) => setConfig({ ...config, mostrarPrecio: e.target.checked })}
                    className="mr-2"
                  />
                  Mostrar precio
                </label>
              </div>

              {/* Margen */}
              <div>
                <label className="block text-sm font-medium mb-2">Margen: {config.margen}mm</label>
                <input
                  type="range"
                  min={2}
                  max={15}
                  value={config.margen}
                  onChange={(e) => setConfig({ ...config, margen: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Productos seleccionados */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-4 flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Seleccionados ({productosSeleccionados.length})
              </span>
              <span className="text-sm font-normal text-gray-500">
                {totalEtiquetas} etiquetas
              </span>
            </h3>

            {productosSeleccionados.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Seleccione productos de la lista
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {productosSeleccionados.map(producto => (
                  <div
                    key={producto.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{producto.nombre}</p>
                      <p className="text-xs text-gray-500">{producto.clave}</p>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <button
                        onClick={() => actualizarCantidad(producto.id, producto.cantidadEtiquetas - 1)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={producto.cantidadEtiquetas}
                        onChange={(e) => actualizarCantidad(producto.id, parseInt(e.target.value) || 1)}
                        className="w-12 text-center border rounded text-sm"
                        min={1}
                        max={100}
                      />
                      <button
                        onClick={() => actualizarCantidad(producto.id, producto.cantidadEtiquetas + 1)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleProducto(producto)}
                        className="p-1 hover:bg-red-100 rounded text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Vista Previa */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Vista Previa de Etiquetas</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={imprimir}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-auto p-4 bg-gray-100">
              <div
                ref={printRef}
                className="bg-white p-4 mx-auto"
                style={{ 
                  width: config.formato === 'A4' ? '210mm' : config.formato === 'termica' ? '80mm' : '58mm',
                  minHeight: '297mm'
                }}
              >
                <div
                  className="etiquetas-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${config.etiquetasPorFila}, 1fr)`,
                    gap: '2mm'
                  }}
                >
                  {productosSeleccionados.flatMap(producto =>
                    Array(producto.cantidadEtiquetas).fill(null).map((_, idx) => (
                      <EtiquetaPreview key={`${producto.id}-${idx}`} producto={producto} />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-500">
              Total: {totalEtiquetas} etiquetas de {productosSeleccionados.length} productos
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

