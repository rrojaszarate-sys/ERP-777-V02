# 📁 Estructura de Almacenamiento de Documentos - ERP 777

## Propuesta de Estándar

### 🎯 Principios
1. **Organización por Contexto**: Separar por evento/empresa
2. **Agrupación por Entidad**: Cada gasto/pago tiene su carpeta
3. **Nombres Descriptivos**: Identificar tipo de documento claramente
4. **Trazabilidad**: Incluir fecha y secuencia en nombres

---

## 📂 Estructura de Carpetas

```
bucket/
├── eventos/
│   └── {CLAVE_EVENTO}/           # Ej: DOT2025-003
│       ├── gastos/
│       │   └── {SECUENCIA}/      # Ej: 001, 002, 003...
│       │       ├── factura.xml
│       │       ├── factura.pdf
│       │       ├── ticket.jpg
│       │       └── comprobante_pago.pdf
│       │
│       ├── ingresos/
│       │   └── {SECUENCIA}/
│       │       ├── factura.xml
│       │       ├── factura.pdf
│       │       └── comprobante_ingreso.pdf
│       │
│       ├── provisiones/
│       │   └── {SECUENCIA}/
│       │       └── cotizacion.pdf
│       │
│       └── contratos/
│           └── {NOMBRE_PROVEEDOR}/
│               └── contrato_2025.pdf
│
├── contabilidad/
│   └── gastos_externos/
│       └── {AÑO-MES}/            # Ej: 2025-12
│           └── {SECUENCIA}/      # Ej: GNI-001
│               ├── factura.xml
│               ├── factura.pdf
│               ├── ticket.jpg
│               └── comprobante_pago.pdf
│
└── rh/
    └── nominas/
        └── {AÑO-MES}/
            └── recibos/
```

---

## 📝 Nomenclatura de Archivos (Con Trazabilidad ✅)

### Formato Estándar
```
{CLAVE_EVENTO}_{SECUENCIA}_{NOMBRE_ORIGINAL}.{ext}
```

### Ejemplos para Gastos de Evento
Si el usuario sube: `Factura_ProveedorXYZ.pdf`
```
DOT2025-003_001_Factura_ProveedorXYZ.pdf
```

Si el usuario sube: `XML_Diciembre_2024.xml`
```
DOT2025-003_001_XML_Diciembre_2024.xml
```

Si el usuario sube: `ticket_tacos.jpg`
```
DOT2025-003_042_ticket_tacos.jpg
```

Si el usuario sube: `Transferencia_BBVA_05Dic.pdf`
```
DOT2025-003_001_Transferencia_BBVA_05Dic.pdf
```

### Ejemplos para Gastos No Impactados (GNI)
```
GNI-2025-12_001_Factura_Luz_CFE.pdf
GNI-2025-12_001_CFDI_CFE.xml
GNI-2025-12_001_Comprobante_Transferencia.pdf
```

**Ventajas:**
- ✅ **Trazabilidad Total**: Clave de evento + secuencia al inicio
- ✅ **Información Original**: Mantiene el nombre que el usuario dio al archivo
- ✅ **Descarga Útil**: Archivo descargado tiene contexto completo
- ✅ **Búsqueda Fácil**: Buscar por clave, secuencia, o nombre original

---

## 🔗 URLs Resultantes (Ejemplos)

### Gastos de Evento
Usuario sube: `Factura_Proveedor_ABC.pdf` → Gasto #1 del evento DOT2025-003
```
eventos/DOT2025-003/gastos/001/DOT2025-003_001_Factura_Proveedor_ABC.pdf
```

Usuario sube: `CFDI_Diciembre.xml` → Gasto #1 del evento DOT2025-003
```
eventos/DOT2025-003/gastos/001/DOT2025-003_001_CFDI_Diciembre.xml
```

Usuario sube: `ticket_comida.jpg` → Gasto #42 del evento DOT2025-003
```
eventos/DOT2025-003/gastos/042/DOT2025-003_042_ticket_comida.jpg
```

### Gastos No Impactados (Contabilidad)
```
contabilidad/gastos_externos/2025-12/001/GNI-2025-12_001_Factura_CFE.pdf
contabilidad/gastos_externos/2025-12/001/GNI-2025-12_001_CFDI_CFE.xml
contabilidad/gastos_externos/2025-12/001/GNI-2025-12_001_Transferencia_BBVA.pdf
```

---

## 🗃️ Campos en Base de Datos

Cada registro de gasto almacena las URLs:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `factura_xml_url` | TEXT | URL al archivo XML CFDI |
| `factura_pdf_url` | TEXT | URL al PDF de factura |
| `ticket_url` | TEXT | URL a imagen de ticket |
| `comprobante_pago_url` | TEXT | URL al comprobante de pago |

---

## 🔄 Flujo de Guardado

```mermaid
graph TD
    A[Usuario sube archivos] --> B{¿Es evento?}
    B -->|Sí| C[eventos/{clave}/gastos/{seq}/]
    B -->|No| D[contabilidad/gastos_externos/{año-mes}/{seq}/]
    C --> E[Renombrar: CLAVE_SEQ_NombreOriginal.ext]
    D --> E
    E --> F[Subir a Supabase Storage]
    F --> G[Actualizar URLs en BD]
```

### Código de Implementación

```typescript
type TipoArchivo = 'factura_xml' | 'factura_pdf' | 'ticket' | 'comprobante_pago';

interface SubirArchivoParams {
    modo: 'evento' | 'gni';
    claveEvento?: string;
    secuencia: number;
    archivo: File;
    tipoArchivo: TipoArchivo;
}

/**
 * Genera la ruta completa para subir un archivo
 * Formato: {carpeta}/{CLAVE}_{SEQ}_{nombreOriginal}.{ext}
 */
const generarRutaArchivo = (params: SubirArchivoParams): string => {
    const { modo, claveEvento, secuencia, archivo } = params;
    
    const secStr = String(secuencia).padStart(3, '0');
    
    // Sanitizar nombre original (quitar caracteres especiales)
    const nombreOriginal = archivo.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')  // Reemplazar caracteres especiales
        .replace(/_+/g, '_');               // Evitar múltiples guiones bajos
    
    if (modo === 'evento' && claveEvento) {
        // eventos/DOT2025-003/gastos/001/DOT2025-003_001_Factura_Proveedor.pdf
        const nombreFinal = `${claveEvento}_${secStr}_${nombreOriginal}`;
        return `eventos/${claveEvento}/gastos/${secStr}/${nombreFinal}`;
    } else {
        // contabilidad/gastos_externos/2025-12/001/GNI-2025-12_001_Factura.pdf
        const periodo = new Date().toISOString().slice(0, 7); // 2025-12
        const clave = `GNI-${periodo}`;
        const nombreFinal = `${clave}_${secStr}_${nombreOriginal}`;
        return `contabilidad/gastos_externos/${periodo}/${secStr}/${nombreFinal}`;
    }
};

// Ejemplo de uso:
// const archivo = new File([''], 'Factura_ProveedorXYZ.pdf');
// generarRutaArchivo({ 
//   modo: 'evento', 
//   claveEvento: 'DOT2025-003', 
//   secuencia: 1, 
//   archivo,
//   tipoArchivo: 'factura_pdf' 
// })
// → "eventos/DOT2025-003/gastos/001/DOT2025-003_001_Factura_ProveedorXYZ.pdf"
```

---

## ✅ Validaciones

1. **Gasto con Factura**: Requiere XML + PDF + Comprobante de Pago
2. **Gasto con Ticket**: Requiere Ticket (imagen) + Comprobante de Pago
3. **Provisión**: Sin documentos (se agregan al convertir a gasto)

---

## 📊 Resumen

| Tipo | Ruta Base | Nombre Archivo |
|------|-----------|----------------|
| Gasto Evento | `eventos/{clave}/gastos/{seq}/` | `{CLAVE}_{SEQ}_{NombreOriginal}.ext` |
| Gasto GNI | `contabilidad/gastos_externos/{año-mes}/{seq}/` | `GNI-{periodo}_{SEQ}_{NombreOriginal}.ext` |
| Ingreso Evento | `eventos/{clave}/ingresos/{seq}/` | `{CLAVE}_{SEQ}_{NombreOriginal}.ext` |
| Provisión | `eventos/{clave}/provisiones/{seq}/` | `{CLAVE}_{SEQ}_{NombreOriginal}.ext` |

---

✅ **Estructura aprobada y lista para implementar**

