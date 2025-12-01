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
  Eye
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
}

interface ProductoSeleccionado extends Producto {
  cantidadEtiquetas: number;
}

interface ConfiguracionEtiqueta {
  formato: 'A4' | 'termica' | 'rollo';
  tiposCodigo: ('qr' | 'barcode')[];
  mostrarPrecio: boolean;
  mostrarDescripcion: boolean;
  etiquetasPorFila: number;
  tamanoFuente: 'small' | 'medium' | 'large';
  margen: number;
}

export const EtiquetasPage: React.FC = () => {
  // Estados
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [config, setConfig] = useState<ConfiguracionEtiqueta>({
    formato: 'A4',
    tiposCodigo: ['barcode', 'qr'],
    mostrarPrecio: true,
    mostrarDescripcion: false,
    etiquetasPorFila: 3,
    tamanoFuente: 'medium',
    margen: 5
  });

  const printRef = useRef<HTMLDivElement>(null);

  // Cargar productos
  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('productos_erp')
        .select('id, clave, nombre, descripcion, unidad, precio_venta, costo, codigo_barras, categoria')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
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
      setProductosSeleccionados(prev => [...prev, { ...producto, cantidadEtiquetas: 1 }]);
    }
  };

  // Actualizar cantidad de etiquetas
  const actualizarCantidad = (id: number, cantidad: number) => {
    if (cantidad < 1) cantidad = 1;
    if (cantidad > 100) cantidad = 100;
    setProductosSeleccionados(prev =>
      prev.map(p => p.id === id ? { ...p, cantidadEtiquetas: cantidad } : p)
    );
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

    const styles = `
      <style>
        @page {
          size: ${config.formato === 'A4' ? 'A4' : config.formato === 'termica' ? '80mm 297mm' : '58mm auto'};
          margin: ${config.margen}mm;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .etiquetas-grid {
          display: grid;
          grid-template-columns: repeat(${config.etiquetasPorFila}, 1fr);
          gap: 2mm;
        }
        .etiqueta {
          border: 1px dashed #ccc;
          padding: 3mm;
          text-align: center;
          page-break-inside: avoid;
        }
        .etiqueta-nombre {
          font-weight: bold;
          font-size: ${config.tamanoFuente === 'small' ? '8pt' : config.tamanoFuente === 'medium' ? '10pt' : '12pt'};
          margin-bottom: 2mm;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .etiqueta-clave {
          font-size: ${config.tamanoFuente === 'small' ? '7pt' : config.tamanoFuente === 'medium' ? '8pt' : '10pt'};
          color: #666;
          margin-bottom: 2mm;
        }
        .etiqueta-precio {
          font-size: ${config.tamanoFuente === 'small' ? '10pt' : config.tamanoFuente === 'medium' ? '12pt' : '14pt'};
          font-weight: bold;
          color: #000;
          margin-top: 2mm;
        }
        .codigo-container {
          margin: 2mm 0;
        }
        svg, canvas {
          max-width: 100%;
          height: auto;
        }
        @media print {
          .etiqueta {
            border: 1px dashed #ccc;
          }
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
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Esperar a que las imágenes carguen
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Componente de etiqueta individual
  const EtiquetaPreview: React.FC<{ producto: ProductoSeleccionado }> = ({ producto }) => {
    const barcodeRef = useRef<SVGSVGElement>(null);
    const codigoBarras = generarCodigoBarras(producto);

    useEffect(() => {
      if (barcodeRef.current && config.tiposCodigo.includes('barcode')) {
        try {
          JsBarcode(barcodeRef.current, codigoBarras, {
            format: codigoBarras.length === 13 ? 'EAN13' : 'CODE128',
            width: 1.5,
            height: 40,
            displayValue: true,
            fontSize: 10,
            margin: 2
          });
        } catch (e) {
          console.error('Error generando código de barras:', e);
        }
      }
    }, [codigoBarras]);

    return (
      <div className="etiqueta bg-white border border-dashed border-gray-300 p-2 text-center">
        <div className="etiqueta-nombre font-bold text-sm truncate">
          {producto.nombre}
        </div>
        <div className="etiqueta-clave text-xs text-gray-500">
          {producto.clave}
        </div>
        
        {config.mostrarDescripcion && producto.descripcion && (
          <div className="text-xs text-gray-400 truncate">
            {producto.descripcion}
          </div>
        )}

        <div className="codigo-container my-2 flex flex-col items-center gap-1">
          {config.tiposCodigo.includes('barcode') && (
            <svg ref={barcodeRef} className="max-w-full" />
          )}
          
          {config.tiposCodigo.includes('qr') && (
            <QRCodeCanvas
              value={JSON.stringify({
                id: producto.id,
                clave: producto.clave,
                nombre: producto.nombre
              })}
              size={60}
              level="M"
              includeMargin={false}
            />
          )}
        </div>

        {config.mostrarPrecio && producto.precio_venta && (
          <div className="etiqueta-precio font-bold text-lg">
            ${producto.precio_venta.toFixed(2)}
          </div>
        )}
        
        <div className="text-xs text-gray-400 mt-1">
          {producto.unidad}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
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

      <div className="grid grid-cols-12 gap-6">
        {/* Panel izquierdo: Lista de productos */}
        <div className="col-span-8 bg-white rounded-lg border">
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
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clave</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
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
              Configuración
            </h3>

            <div className="space-y-4">
              {/* Formato */}
              <div>
                <label className="block text-sm font-medium mb-2">Formato de papel</label>
                <select
                  value={config.formato}
                  onChange={(e) => setConfig({ ...config, formato: e.target.value as any })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="A4">A4 (Hoja completa)</option>
                  <option value="termica">Térmica 80mm</option>
                  <option value="rollo">Rollo 58mm</option>
                </select>
              </div>

              {/* Tipo de código */}
              <div>
                <label className="block text-sm font-medium mb-2">Tipos de código</label>
                <div className="flex space-x-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.tiposCodigo.includes('barcode')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setConfig({ ...config, tiposCodigo: [...config.tiposCodigo, 'barcode'] });
                        } else {
                          setConfig({ ...config, tiposCodigo: config.tiposCodigo.filter(t => t !== 'barcode') });
                        }
                      }}
                      className="mr-2"
                    />
                    <Barcode className="w-4 h-4 mr-1" />
                    Barras
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.tiposCodigo.includes('qr')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setConfig({ ...config, tiposCodigo: [...config.tiposCodigo, 'qr'] });
                        } else {
                          setConfig({ ...config, tiposCodigo: config.tiposCodigo.filter(t => t !== 'qr') });
                        }
                      }}
                      className="mr-2"
                    />
                    <QrCode className="w-4 h-4 mr-1" />
                    QR
                  </label>
                </div>
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
                </select>
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
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.mostrarDescripcion}
                    onChange={(e) => setConfig({ ...config, mostrarDescripcion: e.target.checked })}
                    className="mr-2"
                  />
                  Mostrar descripción
                </label>
              </div>

              {/* Tamaño de fuente */}
              <div>
                <label className="block text-sm font-medium mb-2">Tamaño de texto</label>
                <select
                  value={config.tamanoFuente}
                  onChange={(e) => setConfig({ ...config, tamanoFuente: e.target.value as any })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="small">Pequeño</option>
                  <option value="medium">Mediano</option>
                  <option value="large">Grande</option>
                </select>
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
