import React from 'react';
import { HelpGuide, GuideSection } from '../../../shared/components/ui/HelpGuide';
import {
  Package, Upload, Plus, Search, BarChart3, Warehouse,
  ArrowLeftRight, AlertTriangle, FileSpreadsheet, Settings
} from 'lucide-react';

interface InventarioHelpGuideProps {
  onClose: () => void;
}

export const InventarioHelpGuide: React.FC<InventarioHelpGuideProps> = ({ onClose }) => {
  const secciones: GuideSection[] = [
    {
      id: 'productos',
      titulo: 'Gestión de Productos',
      descripcion: 'Aprende a crear y administrar tu catálogo de productos',
      icono: <Package className="w-5 h-5" />,
      pasos: [
        {
          titulo: 'Crear un nuevo producto',
          descripcion: 'Para crear un producto, haz clic en el botón "Nuevo Producto" en la esquina superior derecha. Completa todos los campos requeridos: código, nombre, categoría y precios.',
          icono: <Plus className="w-6 h-6 text-indigo-600" />,
          tips: [
            'Usa códigos únicos y fáciles de recordar (ej: MAT-001, SRV-AUDIO)',
            'El código no puede duplicarse en el sistema',
            'Define precios de compra y venta para calcular márgenes automáticamente'
          ],
          advertencias: [
            'El código del producto no se puede cambiar después de crearlo',
            'Asegúrate de seleccionar la unidad de medida correcta'
          ]
        },
        {
          titulo: 'Configurar stock mínimo',
          descripcion: 'Establece el nivel de stock mínimo para recibir alertas automáticas cuando un producto esté por agotarse. Esto te ayuda a planificar compras con anticipación.',
          icono: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          tips: [
            'Considera el tiempo de entrega de tus proveedores',
            'Productos de alta rotación necesitan stocks mínimos más altos',
            'El stock máximo te ayuda a evitar sobrecarga de inventario'
          ]
        },
        {
          titulo: 'Organizar por categorías',
          descripcion: 'Clasifica tus productos en categorías para facilitar la búsqueda y generar reportes más útiles.',
          icono: <Settings className="w-6 h-6 text-purple-600" />,
          tips: [
            'Usa categorías claras y consistentes',
            'Puedes filtrar productos por categoría en cualquier momento',
            'Las categorías se administran desde Administración > Catálogos'
          ]
        }
      ]
    },
    {
      id: 'importar',
      titulo: 'Importar Productos',
      descripcion: 'Carga múltiples productos desde un archivo Excel',
      icono: <Upload className="w-5 h-5" />,
      pasos: [
        {
          titulo: 'Preparar archivo Excel',
          descripcion: 'Descarga la plantilla de importación haciendo clic en "Descargar Plantilla". La plantilla incluye todas las columnas necesarias con ejemplos.',
          icono: <FileSpreadsheet className="w-6 h-6 text-green-600" />,
          tips: [
            'Usa la plantilla proporcionada para evitar errores',
            'No cambies el nombre de las columnas',
            'Puedes agregar hasta 1000 productos por archivo'
          ],
          advertencias: [
            'El archivo debe estar en formato .xlsx o .xls',
            'Los códigos duplicados serán rechazados'
          ]
        },
        {
          titulo: 'Completar la plantilla',
          descripcion: 'Llena cada fila con la información de tus productos. Los campos obligatorios son: código, nombre, categoría, unidad de medida y precio de venta.',
          icono: <Package className="w-6 h-6 text-blue-600" />,
          tips: [
            'Los precios deben ser números sin símbolos de moneda',
            'Para la unidad de medida usa: PZA, KG, LT, MT, SRV',
            'Deja el campo de descripción vacío si no aplica'
          ]
        },
        {
          titulo: 'Importar el archivo',
          descripcion: 'Haz clic en "Importar Productos", selecciona tu archivo y espera a que se procese. Verás un resumen con los productos importados y los errores encontrados.',
          icono: <Upload className="w-6 h-6 text-indigo-600" />,
          tips: [
            'Revisa el resumen antes de confirmar',
            'Los productos con errores no se importarán',
            'Puedes corregir errores y volver a intentar'
          ],
          advertencias: [
            'Esta acción no se puede deshacer',
            'Verifica que los precios estén correctos antes de importar'
          ]
        }
      ]
    },
    {
      id: 'almacenes',
      titulo: 'Gestión de Almacenes',
      descripcion: 'Administra múltiples ubicaciones de almacenamiento',
      icono: <Warehouse className="w-5 h-5" />,
      pasos: [
        {
          titulo: 'Crear un almacén',
          descripcion: 'Ve a la sección de Almacenes y haz clic en "Nuevo Almacén". Asigna un nombre descriptivo y la ubicación física.',
          icono: <Plus className="w-6 h-6 text-indigo-600" />,
          tips: [
            'Usa nombres descriptivos (ej: Almacén Principal, Bodega Norte)',
            'Agrega la dirección para facilitar la logística',
            'Puedes tener múltiples almacenes activos'
          ]
        },
        {
          titulo: 'Asignar responsable',
          descripcion: 'Cada almacén debe tener un responsable asignado. Esta persona será notificada de los movimientos y alertas de stock.',
          icono: <Settings className="w-6 h-6 text-purple-600" />,
          tips: [
            'El responsable debe tener acceso al sistema',
            'Puedes cambiar el responsable en cualquier momento'
          ]
        }
      ]
    },
    {
      id: 'movimientos',
      titulo: 'Movimientos de Inventario',
      descripcion: 'Registra entradas, salidas y transferencias de productos',
      icono: <ArrowLeftRight className="w-5 h-5" />,
      pasos: [
        {
          titulo: 'Registrar entrada de productos',
          descripcion: 'Las entradas aumentan el stock. Selecciona "Entrada" como tipo de movimiento, el producto y la cantidad recibida.',
          icono: <Plus className="w-6 h-6 text-green-600" />,
          tips: [
            'Asocia la entrada con una orden de compra si existe',
            'Registra el número de factura del proveedor',
            'Verifica que la cantidad coincida con lo físico'
          ]
        },
        {
          titulo: 'Registrar salida de productos',
          descripcion: 'Las salidas disminuyen el stock. Selecciona "Salida" como tipo, el producto y la cantidad que sale.',
          icono: <Package className="w-6 h-6 text-red-600" />,
          tips: [
            'Las salidas pueden vincularse a eventos o ventas',
            'El sistema alertará si no hay stock suficiente',
            'Registra el motivo de la salida para reportes'
          ],
          advertencias: [
            'No puedes registrar salidas mayores al stock disponible',
            'Las salidas sin justificación afectan tus reportes'
          ]
        },
        {
          titulo: 'Ajustes de inventario',
          descripcion: 'Usa ajustes para corregir diferencias entre el stock del sistema y el físico después de un conteo.',
          icono: <Settings className="w-6 h-6 text-amber-600" />,
          tips: [
            'Realiza conteos físicos periódicos',
            'Documenta el motivo de cada ajuste',
            'Los ajustes quedan registrados en el historial'
          ]
        }
      ]
    },
    {
      id: 'reportes',
      titulo: 'Reportes de Stock',
      descripcion: 'Analiza el estado de tu inventario con reportes',
      icono: <BarChart3 className="w-5 h-5" />,
      pasos: [
        {
          titulo: 'Ver stock actual',
          descripcion: 'En la sección "Stock" puedes ver el inventario actual de cada producto, organizado por almacén.',
          icono: <Search className="w-6 h-6 text-blue-600" />,
          tips: [
            'Usa los filtros para encontrar productos específicos',
            'Los productos en rojo están bajo el mínimo',
            'Exporta a Excel para análisis externo'
          ]
        },
        {
          titulo: 'Identificar productos críticos',
          descripcion: 'Los productos por debajo del stock mínimo se destacan automáticamente. Revísalos regularmente para evitar desabasto.',
          icono: <AlertTriangle className="w-6 h-6 text-red-600" />,
          tips: [
            'Configura alertas por email para productos críticos',
            'Prioriza la reposición de productos de alta rotación',
            'Revisa tendencias para anticipar necesidades'
          ]
        }
      ]
    }
  ];

  return (
    <HelpGuide
      titulo="Guía de Inventario"
      descripcion="Aprende a gestionar tu inventario de forma eficiente"
      secciones={secciones}
      onClose={onClose}
    />
  );
};

export default InventarioHelpGuide;
