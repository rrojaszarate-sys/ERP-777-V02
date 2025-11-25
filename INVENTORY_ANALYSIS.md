# DEEP INVENTORY SYSTEM ANALYSIS
## ERP-777 Inventario & Inventario-ERP Modules

---

## 1. PAGES AVAILABLE FOR INVENTORY MANAGEMENT

### INVENTARIO MODULE (Modern/Advanced)
Located at: `/src/modules/inventario/`

**Page Structure:**
- `InventarioDashboard.tsx` - Main dashboard with summary stats
  - Total almacenes
  - Movimientos del mes
  - Productos activos
  - Stock bajo alert

### INVENTARIO-ERP MODULE (Company-oriented)
Located at: `/src/modules/inventario-erp/pages/`

1. **ProductosPage.tsx**
   - Product CRUD operations
   - Create/Edit/Delete products
   - Search & filter by name, code, category
   - Status management (active/inactive)
   - Manual form-based entry only

2. **StockPage.tsx**
   - Real-time stock visibility
   - Stock per product per warehouse
   - Filter by low stock items
   - Search functionality
   - Calculated from movimientos_inventario_erp table

3. **AlmacenesPage.tsx**
   - Warehouse management
   - Create/Edit/Delete warehouses
   - Warehouse types:
     * General
     * Raw Materials
     * Finished Products
     * Tools
     * Spare Parts
     * In Transit
     * Quarantine
   - Capacity management
   - Location tracking

4. **MovimientosPage.tsx**
   - Inventory movements (stock in/out)
   - Movement types: entrada/salida/ajuste/transferencia
   - Track by warehouse
   - Link to purchase orders
   - Statistics: total, entries, exits, adjustments

5. **InventarioDashboard.tsx**
   - Summary statistics
   - Quick navigation
   - KPIs at a glance

---

## 2. HOW TO LOAD PRODUCTS

### CURRENT METHOD: Manual Form Entry Only
There is **NO bulk import functionality** currently implemented.

#### Step-by-Step User Process:

**Option A: Single Product Entry**
1. Navigate to ProductosPage
2. Click "Nuevo Producto" button
3. Fill form with:
   - **Código** (Product code) - Required, must be unique
   - **Nombre** (Product name) - Required
   - **Descripción** (Description) - Optional
   - **Categoría** (Category) - Optional
   - **Unidad de Medida** (Unit) - Select from predefined units
   - **Precio Compra** (Purchase price)
   - **Precio Venta** (Sale price)
   - **Stock Mínimo** (Minimum stock level)
   - **Stock Máximo** (Maximum stock level)
   - **Activo** (Active status)
4. Save product
5. Product is now available in system

#### Form Fields Available (ProductoFormModal.tsx):
```
BÁSICO:
- codigo (unique)
- nombre (required)
- descripcion
- categoria_id
- unidad_medida_id

PRECIOS:
- costo_actual (current cost)
- precio_venta (sale price)
- margen_utilidad (margin %)
- precio_venta_min (minimum sale price)

CONTROL:
- existencia_minima (minimum stock)
- existencia_maxima (maximum stock)
- punto_reorden (reorder point)

CONFIGURACIÓN:
- es_servicio (is service?)
- es_compra (can purchase?)
- es_venta (can sell?)
- maneja_lote (batch tracking?)
- maneja_serie (serial tracking?)

IMPUESTOS:
- aplica_iva (apply VAT?)
- tasa_iva (VAT rate)
- aplica_ieps (apply IEPS?)
- tasa_ieps (IEPS rate)

OTROS:
- codigo_barras (barcode)
- codigo_sat (SAT code)
- peso
- volumen
- imagen_url
```

### MISSING: Bulk Import Options
The system lacks:
- CSV/Excel import
- Bulk upload from file
- API endpoint for batch product creation
- Template-based import
- Error handling for bulk operations
- Duplicate detection in bulk imports
- Progress tracking for large imports

---

## 3. SUPPLIER PRODUCT MANAGEMENT

### CURRENT STATUS: PARTIALLY IMPLEMENTED

#### Supplier Module Available
Location: `/src/modules/proveedores-erp/`

**Supplier Features:**
- Proveedor (supplier) CRUD
- Orden de Compra (Purchase Orders) with line items
- Supplier ratings (quality, service)
- Credit terms (days, limit)
- Contact information

**Suppliers Table Schema:**
```
proveedor_id (PK)
tipo: 'proveedor' | 'prospecto' | 'inactivo'
razon_social (business name)
nombre_comercial (commercial name)
rfc (tax ID)
email
telefono
direccion (address)
ciudad
estado
categoria
dias_credito (credit days)
limite_credito (credit limit)
calificacion_calidad (quality rating)
calificacion_servicio (service rating)
activo
```

### MISSING: Supplier-Product Link
**CRITICAL GAP**: There is **NO junction table** linking:
- Suppliers to Products (no proveedor_producto table)
- Supplier pricing history
- Supplier lead times
- Preferred supplier per product
- Supplier SKU mappings

#### Current Workaround:
- Purchase orders link suppliers to products through PartidaOC (order line items)
- But this is temporary - only tracks what was ordered
- No persistent supplier catalog per product
- Cannot set preferred suppliers

---

## 4. STOCK MANAGEMENT

### How Stock Works:

**Two-Module Architecture:**

#### INVENTARIO Module (Advanced):
- **inv_existencias** table structure:
  ```
  id
  producto_id
  almacen_id
  ubicacion_id (optional - warehouse location)
  cantidad (total quantity)
  cantidad_disponible (available - not reserved)
  cantidad_reservada (reserved for sales)
  costo_promedio (average cost - weighted)
  ultima_entrada (last entry date)
  ultima_salida (last exit date)
  ```

- **Advanced Movement Tracking:**
  - ENTRADA (entry) - increases stock, updates avg cost
  - SALIDA (exit) - decreases stock, maintains avg cost
  - TRASPASO (transfer) - between warehouses
  - AJUSTE (adjustment) - physical count corrections

- **Automatic Stock Calculations:**
  - Weighted average cost updates on entries
  - Tracks both reserved and available quantity
  - Prevents over-selling (checks available qty)
  - Multi-warehouse stock visibility

#### INVENTARIO-ERP Module (Company-level):
- Simple single table approach
- Calculates stock from movement history
- Movement types:
  - entrada (entry)
  - salida (exit)
  - ajuste (adjustment)
- Sums all movements per product per warehouse

### Stock Management Features:

1. **Minimum/Maximum Tracking**
   - existencia_minima on producto table
   - existencia_maxima on producto table
   - Alerts when below minimum

2. **Reservation System**
   - cantidad_reservada tracks committed stock
   - cantidad_disponible = cantidad - reservada
   - Prevents over-allocation

3. **Multi-Warehouse Support**
   - Each almacen has independent stock
   - Transfer between warehouses
   - View stock by warehouse

4. **Cost Tracking**
   - Weighted average cost (PROMEDIO method)
   - Last cost
   - Supports PEPS/UEPS (in types, not implemented)

5. **Batch & Serial Support**
   - Lote tracking (batches with expiration)
   - Serie tracking (serial numbers)
   - Lifecycle: DISPONIBLE → VENDIDO → BAJA

---

## 5. WAREHOUSE MANAGEMENT

### Warehouse Features:

**Almacén (Warehouse) Properties:**
```
id
codigo (warehouse code)
nombre (name)
descripcion (description)
tipo: 'PRINCIPAL' | 'SUCURSAL' | 'TRANSITO' | 'VIRTUAL'
es_principal (is main warehouse?)
direccion (address)
ciudad (city)
estado (state)
codigo_postal (postal code)
responsable_id (warehouse manager)
activo (active/inactive)
```

**Ubicación (Location) Hierarchy:**
```
id
almacen_id
codigo (location code)
nombre (location name)
pasillo (aisle)
rack (rack number)
nivel (shelf level)
capacidad_maxima (max capacity)
unidad_capacidad (unit: m3, units, etc)
activo
```

### Warehouse Operations Available:

1. **Create Warehouse**
   - Assign type (principal, branch, in-transit, virtual)
   - Set location details
   - Assign responsible person
   - Mark as principal (max 1)

2. **Location Management**
   - Create locations within warehouse
   - Define hierarchy: pasillo → rack → nivel
   - Track capacity
   - Link products to specific locations

3. **Multi-Warehouse Transfers**
   - Create TRASPASO movements
   - Transfer from warehouse A to B
   - Tracks origin and destination locations

4. **Warehouse Statistics**
   - Total products stored
   - Inventory value per warehouse
   - Occupancy tracking
   - Location capacity monitoring

5. **Warehouse Queries**
   - Get all warehouses
   - Get principal warehouse
   - Filter by type, manager, status
   - Get locations by warehouse

---

## 6. PRODUCT CATEGORIES & TYPES CATALOGS

### Category System:

**Categoría Producto Structure:**
```
id
codigo (category code)
nombre (category name)
descripcion (description)
categoria_padre_id (parent category for hierarchies)
activo (active/inactive)
created_at
updated_at
```

**Features:**
- Hierarchical categories (parent-child)
- Subcategories supported
- Active/inactive status
- Code-based identification

**Usage:**
- Products linked via categoria_id
- Filter products by category
- Organize product catalog

### Unit of Measure System:

**Unidad Medida Structure:**
```
id
codigo (code)
nombre (name)
abreviatura (abbreviation)
tipo: 'LONGITUD' | 'PESO' | 'VOLUMEN' | 'UNIDAD' | 'TIEMPO'
activo
```

**Predefined Units Available:**
- UNIDAD: PZA (piece), SRV (service)
- PESO: KG (kilogram), GR (gram)
- VOLUMEN: LT (liter), ML (milliliter)
- LONGITUD: MT (meter), CM (centimeter)
- TIEMPO: HR (hour), DÍA (day)

### Classification Features:

**Product Type Flags:**
- es_servicio (is service/product)
- es_compra (can be purchased)
- es_venta (can be sold)
- maneja_lote (uses batch/lot tracking)
- maneja_serie (uses serial numbers)

---

## 7. COMPLETE INVENTORY OF FEATURES

### IMPLEMENTED FEATURES ✓

#### Products (Inventario Module)
- [x] Create products with detailed configuration
- [x] Edit product information
- [x] Soft delete with restore
- [x] Search by code, name, barcode
- [x] Filter by category, status, type
- [x] Product statistics (count, value, etc)
- [x] Service vs physical goods distinction
- [x] Barcode & SAT code support
- [x] Tax configuration per product
- [x] Image URL storage
- [x] Hierarchical categories
- [x] Multiple unit of measure support

#### Stock/Existencias
- [x] Multi-warehouse stock tracking
- [x] Location-based inventory (within warehouse)
- [x] Available vs reserved quantity
- [x] Weighted average cost tracking
- [x] Last entry/exit date tracking
- [x] Minimum/maximum stock levels
- [x] Reorder point definition
- [x] Stock movement calculation

#### Movements
- [x] Entry movements (compras)
- [x] Exit movements (ventas)
- [x] Transfers between warehouses
- [x] Adjustment movements (physical counts)
- [x] Movement status tracking (BORRADOR→PROCESADO→CANCELADO)
- [x] Auto folio generation
- [x] Movement reversal on cancellation
- [x] Cost tracking per movement

#### Batches & Series
- [x] Batch/lot management with expiration
- [x] Serial number tracking
- [x] Serial lifecycle management (DISPONIBLE→VENDIDO→BAJA)
- [x] Serial allocation to specific locations

#### Warehouses
- [x] Multiple warehouse types
- [x] Principal warehouse designation
- [x] Warehouse locations/zones
- [x] Location hierarchy (pasillo/rack/nivel)
- [x] Manager assignment
- [x] Warehouse statistics

#### Suppliers (Partial)
- [x] Supplier CRUD
- [x] Supplier ratings & classification
- [x] Credit terms management
- [x] Purchase orders with line items
- [x] Supplier contact information
- [x] Supplier status tracking

### MISSING FEATURES ✗

#### Critical Gaps
- [ ] Bulk product import (CSV/Excel)
- [ ] Supplier-Product junction table (proveedor_producto)
- [ ] Preferred supplier per product
- [ ] Supplier SKU codes
- [ ] Supplier pricing history/catalogs
- [ ] Supplier lead times
- [ ] Supplier performance metrics
- [ ] API endpoints for bulk operations

#### Reporting & Analytics
- [ ] Stock valuation reports (PEPS/UEPS implemented but not exposed)
- [ ] ABC analysis
- [ ] Rotation analysis
- [ ] Deadstock identification
- [ ] Reorder analysis
- [ ] Warehouse occupancy reports
- [ ] Movement history drilling

#### Advanced Features
- [ ] Physical count/cycle counting
- [ ] Quality control on receipts
- [ ] Expiration date management
- [ ] Product substitution rules
- [ ] Material requirements planning (MRP)
- [ ] Demand forecasting
- [ ] Barcode scanning integration
- [ ] Real-time stock sync

#### Compliance & Control
- [ ] Product price history
- [ ] Cost variance analysis
- [ ] Inventory audit trail
- [ ] Access control per warehouse
- [ ] Movement approval workflows
- [ ] Cold chain tracking (for perishables)

---

## 8. STEP-BY-STEP USER GUIDE: LOADING INVENTORY

### Phase 1: SETUP (Before adding products)

#### Step 1: Configure Warehouses
1. Go to Almacenes page
2. Create main warehouse:
   - Código: "ALM-PRINCIPAL"
   - Nombre: "Almacén Principal"
   - Tipo: "PRINCIPAL"
   - Marcar como es_principal: ✓
3. Create secondary warehouses as needed:
   - Warehouse for different locations
   - Each with unique code and type

#### Step 2: Create Warehouse Locations (Optional but Recommended)
1. For each warehouse, create locations:
   - Pasillo A, Rack 1, Nivel 1
   - Pasillo A, Rack 1, Nivel 2
   - Define maximum capacity per location

#### Step 3: Set Up Categories
1. Go to product catalog management
2. Create categories:
   - Electronics
   - Furniture
   - Office Supplies
   - etc.

#### Step 4: Review Units of Measure
- Predefined units available
- Can add custom units if needed

### Phase 2: ADD PRODUCTS

#### For Each Product:
1. Click "Nuevo Producto"
2. Enter basic info:
   - **Código**: unique identifier (e.g., "PROD-001")
   - **Nombre**: product name
   - **Descripción**: optional details
3. Set financials:
   - **Costo Actual**: what you paid
   - **Precio Venta**: what you sell for
   - **Margen**: auto-calculated
4. Configure inventory control:
   - **Existencia Mínima**: when to reorder
   - **Existencia Máxima**: capacity limit
   - **Punto de Reorden**: optional
5. Set classifications:
   - Type (service vs product)
   - Can purchase? Can sell?
   - Batch/serial tracking needed?
6. Add taxes if applicable
7. Save

### Phase 3: LOAD INITIAL STOCK

#### Using Entrada Movements:
1. Go to Movimientos → Nuevo Movimiento
2. Type: "ENTRADA"
3. Select:
   - Destination warehouse
   - Date
   - Products to add (with quantities)
   - Unit costs
4. Add locations if using
5. Save as BORRADOR
6. Click "Procesar" to apply to inventory
7. Stock is now counted

**Alternative: Direct adjustment for inventory count**
1. Go to Movimientos → Nuevo Movimiento
2. Type: "AJUSTE"
3. Enter system quantity vs physical count
4. Difference is automatically adjusted

### Phase 4: MANAGE SUPPLIER PURCHASES

#### When receiving from supplier:
1. Create Purchase Order in Proveedores module
2. Link to supplier
3. Add products and quantities
4. Mark as confirmed when order sent
5. When receiving:
   - Create ENTRADA movement
   - Link to purchase order reference
   - Mark PO as received (complete/partial)
   - System updates stock automatically

---

## 9. WHAT'S MISSING FOR A COMPLETE SYSTEM

### URGENT (Blocker for Production)

1. **Bulk Product Import**
   - CSV/Excel upload capability
   - Template with required/optional fields
   - Bulk validation before import
   - Error reporting with line numbers
   - Duplicate detection
   - Category/supplier auto-linking

2. **Supplier-Product Relationship**
   - Proveedor_Producto junction table:
     ```
     id
     proveedor_id (FK)
     producto_id (FK)
     codigo_proveedor (supplier's SKU)
     precio_proveedor (supplier's price)
     tiempo_entrega_dias (lead time in days)
     cantidad_minima_pedido (MOQ)
     cantidad_multiplo (order multiple)
     vigencia_desde/hasta (price validity period)
     preferido (is preferred supplier?)
     ```
   - Link to product when creating
   - View supplier options per product
   - Auto-populate supplier price in PO

3. **Stock Receipt Quality Control**
   - Received vs ordered mismatch alerts
   - Damage/defect reporting
   - Acceptance/rejection workflow
   - Return authorization tracking

### HIGH PRIORITY (Impact on Operations)

4. **Physical Count Management**
   - Create count sessions
   - Mobile-friendly counting interface
   - Variance investigation
   - Automatic adjustment creation
   - Count scheduling (monthly, quarterly)

5. **Reporting**
   - Stock valuation (PEPS/UEPS selection)
   - ABC analysis (80/20 rule)
   - Slow-moving inventory identification
   - Stockturn analysis by product
   - Warehouse occupancy by %

6. **Cost Management**
   - Purchase price history
   - Cost variance reporting
   - Standard cost setup
   - Cost roll-up (for assemblies)

7. **Expiration Management**
   - Expiry date alerts
   - Lot expiry report
   - FIFO enforcement on exits
   - Expired stock write-offs

### MEDIUM PRIORITY (Nice to Have)

8. **Advanced Features**
   - Barcode generation/scanning
   - Product substitutions/alternatives
   - Bundle/kit configuration
   - Multi-tenant warehouse sharing
   - Forecasting based on history
   - Demand/supply planning

9. **Integration Points**
   - API for external systems
   - Real-time stock sync
   - EDI for supplier orders
   - POS system integration

10. **Compliance & Audit**
    - Complete movement history export
    - User access logging per warehouse
    - Change audit trail
    - Compliance reporting (inventory reconciliation)

---

## 10. RECOMMENDATIONS: SUPPLIER-PRODUCT RELATIONSHIP

### Recommended Architecture:

```sql
-- New table needed
CREATE TABLE proveedor_producto (
  id UUID PRIMARY KEY,
  proveedor_id UUID NOT NULL,
  producto_id UUID NOT NULL,
  
  -- Supplier's identification
  codigo_proveedor VARCHAR(100),
  descripcion_proveedor TEXT,
  
  -- Pricing & Terms
  precio_unitario DECIMAL(12,4),
  cantidad_minima_pedido INT,
  cantidad_multiplo INT,
  tiempo_entrega_dias INT,
  
  -- Validity
  vigencia_desde DATE,
  vigencia_hasta DATE,
  
  -- Quality
  preferido BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE(proveedor_id, producto_id),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores_erp(id),
  FOREIGN KEY (producto_id) REFERENCES inv_productos(id)
);
```

### User Workflow with Suppliers:

**1. Setup Phase:**
- Create suppliers first
- For each product, add supplier options
- Set preferred supplier
- Configure lead times & MOQ

**2. Sourcing Phase:**
- View supplier options for product
- See all pricing tiers
- Select supplier based on:
  - Price
  - Lead time
  - Availability
  - Performance rating

**3. Ordering Phase:**
- Create PO from product
- Auto-populate supplier details
- Pre-fill pricing from catalog
- Track against committed quantities

**4. Receipt Phase:**
- Receive goods
- Quality check
- Create stock entry
- Auto-update supplier rating (if issues found)
- Link to PO automatically

**5. Analytics Phase:**
- Supplier performance tracking
- Price trends over time
- Lead time adherence
- Quality metrics
- Cost analysis

### Implementation Priority:

1. **Week 1**: Create proveedor_producto table
2. **Week 2**: Add UI for managing supplier products
3. **Week 3**: Update PO creation to use supplier products
4. **Week 4**: Add supplier performance metrics

---

## SUMMARY TABLE

| Feature | Status | Module | Notes |
|---------|--------|--------|-------|
| Product CRUD | ✓ | inventario | Form-based only |
| Categories | ✓ | inventario | Hierarchical support |
| Units of Measure | ✓ | inventario | Predefined + custom |
| Stock Tracking | ✓ | inventario | Multi-warehouse, reserved |
| Movements | ✓ | inventario | ENTRADA/SALIDA/TRASPASO/AJUSTE |
| Batches | ✓ | inventario | With expiry tracking |
| Series | ✓ | inventario | Lifecycle tracking |
| Warehouses | ✓ | inventario-erp | With locations |
| Suppliers | ✓ | proveedores-erp | Basic CRUD only |
| Purchase Orders | ✓ | proveedores-erp | No link to catalog |
| **Bulk Import** | ✗ | - | **MISSING** |
| **Supplier Products** | ✗ | - | **MISSING** |
| **Quality Control** | ✗ | - | **MISSING** |
| **Reporting** | ✗ | - | **MISSING** |
| **Physical Count** | ✗ | - | **MISSING** |
| **Expiry Mgmt** | ✗ | - | **MISSING** |

