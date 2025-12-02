import { supabase } from '../../../core/config/supabase';

export interface ProductoImport {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  unidad_medida?: string;
  precio_compra: number;
  precio_venta: number;
  stock_minimo?: number;
  stock_maximo?: number;
  codigo_barras_fabrica?: string;
  activo?: boolean;
}

export interface ImportResult {
  success: number;
  errors: number;
  errorDetails: { row: number; error: string; data?: any }[];
  imported: ProductoImport[];
}

// Validar un producto individual
const validateProducto = (producto: any, rowIndex: number): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!producto.codigo || producto.codigo.toString().trim() === '') {
    errors.push('Código es requerido');
  }

  if (!producto.nombre || producto.nombre.toString().trim() === '') {
    errors.push('Nombre es requerido');
  }

  const precioCompra = parseFloat(producto.precio_compra);
  if (isNaN(precioCompra) || precioCompra < 0) {
    errors.push('Precio de compra debe ser un número válido >= 0');
  }

  const precioVenta = parseFloat(producto.precio_venta);
  if (isNaN(precioVenta) || precioVenta < 0) {
    errors.push('Precio de venta debe ser un número válido >= 0');
  }

  return { valid: errors.length === 0, errors };
};

// Parsear CSV a objetos
export const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) {
    throw new Error('El archivo debe tener al menos una fila de encabezados y una fila de datos');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[normalizeHeader(header)] = values[index].trim().replace(/^"|"$/g, '');
      });
      data.push(obj);
    }
  }

  return data;
};

// Parsear una línea de CSV (maneja comas dentro de comillas)
const parseCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);

  return values;
};

// Normalizar nombres de columnas
const normalizeHeader = (header: string): string => {
  const mappings: Record<string, string> = {
    'codigo': 'codigo',
    'code': 'codigo',
    'sku': 'codigo',
    'nombre': 'nombre',
    'name': 'nombre',
    'producto': 'nombre',
    'descripcion': 'descripcion',
    'description': 'descripcion',
    'categoria': 'categoria',
    'category': 'categoria',
    'unidad': 'unidad_medida',
    'unidad_medida': 'unidad_medida',
    'unit': 'unidad_medida',
    'precio_compra': 'precio_compra',
    'costo': 'precio_compra',
    'cost': 'precio_compra',
    'precio_venta': 'precio_venta',
    'precio': 'precio_venta',
    'price': 'precio_venta',
    'stock_minimo': 'stock_minimo',
    'min_stock': 'stock_minimo',
    'stock_maximo': 'stock_maximo',
    'max_stock': 'stock_maximo',
    'codigo_barras': 'codigo_barras_fabrica',
    'codigo_barras_fabrica': 'codigo_barras_fabrica',
    'barcode': 'codigo_barras_fabrica',
    'upc': 'codigo_barras_fabrica',
    'ean': 'codigo_barras_fabrica',
    'activo': 'activo',
    'active': 'activo'
  };

  return mappings[header.toLowerCase()] || header.toLowerCase();
};

// Transformar datos parseados a formato de producto
const transformToProducto = (row: any): ProductoImport => {
  return {
    codigo: (row.codigo || '').toString().trim().toUpperCase(),
    nombre: (row.nombre || '').toString().trim(),
    descripcion: (row.descripcion || '').toString().trim(),
    categoria: (row.categoria || 'Otros').toString().trim(),
    unidad_medida: (row.unidad_medida || 'PZA').toString().trim().toUpperCase(),
    precio_compra: parseFloat(row.precio_compra) || 0,
    precio_venta: parseFloat(row.precio_venta) || 0,
    stock_minimo: parseInt(row.stock_minimo) || 0,
    stock_maximo: parseInt(row.stock_maximo) || 100,
    codigo_barras_fabrica: (row.codigo_barras_fabrica || '').toString().trim(),
    activo: row.activo !== 'false' && row.activo !== '0' && row.activo !== 'no'
  };
};

// Importar productos desde CSV
export const importProductosFromCSV = async (
  csvText: string,
  companyId: string,
  options: {
    updateExisting?: boolean;
    validateOnly?: boolean;
  } = {}
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    errors: 0,
    errorDetails: [],
    imported: []
  };

  try {
    // Parsear CSV
    const rawData = parseCSV(csvText);

    if (rawData.length === 0) {
      throw new Error('No se encontraron datos válidos en el archivo');
    }

    // Obtener códigos existentes para detectar duplicados
    const { data: existingProducts } = await supabase
      .from('productos_erp')
      .select('id, codigo')
      .eq('company_id', companyId);

    const existingCodes = new Map(
      (existingProducts || []).map(p => [p.codigo.toLowerCase(), p.id])
    );

    // Procesar cada fila
    const productosToInsert: any[] = [];
    const productosToUpdate: { id: number; data: any }[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const rowIndex = i + 2; // +2 porque la fila 1 es el encabezado y las filas empiezan en 1
      const rawRow = rawData[i];
      const producto = transformToProducto(rawRow);

      // Validar
      const validation = validateProducto(producto, rowIndex);

      if (!validation.valid) {
        result.errors++;
        result.errorDetails.push({
          row: rowIndex,
          error: validation.errors.join(', '),
          data: rawRow
        });
        continue;
      }

      // Verificar si ya existe
      const existingId = existingCodes.get(producto.codigo.toLowerCase());

      if (existingId) {
        if (options.updateExisting) {
          productosToUpdate.push({
            id: existingId,
            data: { ...producto, updated_at: new Date().toISOString() }
          });
          result.imported.push(producto);
        } else {
          result.errors++;
          result.errorDetails.push({
            row: rowIndex,
            error: `El código ${producto.codigo} ya existe`,
            data: rawRow
          });
        }
      } else {
        productosToInsert.push({
          ...producto,
          company_id: companyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        result.imported.push(producto);
      }
    }

    // Si solo es validación, retornar aquí
    if (options.validateOnly) {
      result.success = productosToInsert.length + productosToUpdate.length;
      return result;
    }

    // Insertar nuevos productos
    if (productosToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('productos_erp')
        .insert(productosToInsert);

      if (insertError) {
        throw new Error(`Error al insertar productos: ${insertError.message}`);
      }
      result.success += productosToInsert.length;
    }

    // Actualizar productos existentes
    for (const update of productosToUpdate) {
      const { error: updateError } = await supabase
        .from('productos_erp')
        .update(update.data)
        .eq('id', update.id);

      if (updateError) {
        result.errors++;
        result.errorDetails.push({
          row: 0,
          error: `Error actualizando ${update.data.codigo}: ${updateError.message}`
        });
      } else {
        result.success++;
      }
    }

    return result;
  } catch (error: any) {
    throw new Error(`Error procesando archivo: ${error.message}`);
  }
};

// Generar plantilla CSV
export const generateCSVTemplate = (): string => {
  const headers = [
    'codigo',
    'nombre',
    'descripcion',
    'categoria',
    'unidad_medida',
    'precio_compra',
    'precio_venta',
    'stock_minimo',
    'stock_maximo',
    'codigo_barras_fabrica',
    'activo'
  ];

  const exampleRows = [
    ['PROD-001', 'Mesa Redonda 10 personas', 'Mesa elegante para eventos', 'Mobiliario', 'PZA', '500', '750', '5', '50', '7501234567890', 'true'],
    ['PROD-002', 'Silla Tiffany Dorada', 'Silla estilo Tiffany acabado dorado', 'Mobiliario', 'PZA', '150', '250', '20', '200', '7501234567891', 'true'],
    ['PROD-003', 'Mantel Blanco 3m', 'Mantel de tela blanca para mesa redonda', 'Decoración', 'PZA', '80', '120', '30', '100', '7501234567892', 'true']
  ];

  return [headers.join(','), ...exampleRows.map(row => row.join(','))].join('\n');
};

// Descargar plantilla
export const downloadCSVTemplate = () => {
  const csv = generateCSVTemplate();
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla_productos.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
