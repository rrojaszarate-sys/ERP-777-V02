# 📊 Sistema de Alertas Diarias para Responsables de Ingresos

**Fecha:** 16 de Octubre 2025  
**Requerimiento:** Enviar reportes diarios automáticos a cada responsable con sus ingresos pendientes

---

## 🎯 Objetivo

**Enviar diariamente (ej: 9:00 AM) un email a cada responsable con:**
- Lista de todos los ingresos (facturas) que están bajo su responsabilidad
- Estado de cobro de cada ingreso
- Días hasta vencimiento o días vencidos
- Monto total pendiente de cobro
- Resumen ejecutivo con KPIs

---

## 📋 Especificaciones

### 1. Frecuencia
- **Diario:** Lunes a Viernes a las 9:00 AM
- **Opcional:** Sábados si hay facturas muy vencidas

### 2. Destinatarios
- **Responsables de eventos** que tengan ingresos pendientes de cobro
- Un email por responsable con SOLO sus ingresos

### 3. Filtros de Ingresos
**Incluir ingresos que cumplan:**
- `status_cobro = 'pendiente'`
- Tienen `fecha_compromiso` (fecha de vencimiento)
- El evento tiene un `usuario_responsable_id`

**Excluir:**
- Ingresos ya cobrados (`status_cobro = 'cobrado'`)
- Ingresos sin fecha de vencimiento
- Eventos sin responsable asignado

### 4. Categorías de Alertas

#### 🟢 Próximas a Vencer (Verde)
- Faltan más de 7 días para vencimiento
- Acción: Información, no urgente

#### 🟡 Por Vencer Esta Semana (Amarillo)
- Faltan 1-7 días para vencimiento
- Acción: Seguimiento recomendado

#### 🟠 Vencen HOY (Naranja)
- Vencen el día de hoy
- Acción: Urgente, contactar cliente

#### 🔴 Vencidas (Rojo)
- Ya pasó la fecha de vencimiento
- Acción: Muy urgente, escalación

### 5. Contenido del Email

**Asunto:**
```
📊 Reporte Diario de Cobros - [Nombre Responsable] - [Fecha]
```

**Estructura:**

1. **Saludo personalizado**
   ```
   Buenos días [Nombre],
   
   Este es tu reporte diario de ingresos pendientes de cobro.
   ```

2. **Resumen Ejecutivo (KPIs)**
   ```
   📊 RESUMEN DE TUS INGRESOS PENDIENTES
   
   Total de ingresos pendientes: 12
   Monto total por cobrar: $245,890.50 MXN
   
   🟢 Próximas (7+ días): 5 facturas - $85,450.00
   🟡 Esta semana (1-7 días): 4 facturas - $78,320.50
   🟠 Vencen HOY: 1 factura - $25,000.00
   🔴 Vencidas: 2 facturas - $57,120.00
   ```

3. **Tabla Detallada por Categoría**
   
   Para cada categoría (Vencidas, Hoy, Esta Semana, Próximas):
   ```
   🔴 FACTURAS VENCIDAS (URGENTE)
   
   Cliente: Televisa
   Proyecto: Evento Corporativo 2025
   Factura: A-1234
   Monto: $35,000.00 MXN
   Fecha compromiso: 10 Oct 2025
   Días vencida: 6 días
   Notas: Cliente solicitó extensión
   
   Cliente: Bimbo
   Proyecto: Convención Anual
   Factura: B-5678
   Monto: $22,120.00 MXN
   Fecha compromiso: 12 Oct 2025
   Días vencida: 4 días
   Notas: Pendiente de firma de recepción
   
   ---
   
   🟠 FACTURAS QUE VENCEN HOY
   
   Cliente: FEMSA
   Proyecto: Lanzamiento Producto
   Factura: C-9012
   Monto: $25,000.00 MXN
   Fecha compromiso: 16 Oct 2025
   Acción: Contactar urgentemente
   
   ---
   
   🟡 FACTURAS QUE VENCEN ESTA SEMANA
   
   ... (similar)
   
   ---
   
   🟢 PRÓXIMAS FACTURAS
   
   ... (similar, opcional o resumido)
   ```

4. **Acciones Recomendadas**
   ```
   💡 ACCIONES RECOMENDADAS
   
   1. Prioridad 1: Contactar a Televisa (6 días vencida)
   2. Prioridad 2: Llamar a FEMSA (vence hoy)
   3. Prioridad 3: Seguimiento con Bimbo (4 días vencida)
   ```

5. **Links de Acceso Rápido**
   ```
   🔗 ACCESOS RÁPIDOS
   
   📊 Ver todos mis ingresos: [Link al sistema]
   💰 Registrar cobro: [Link al formulario]
   📈 Dashboard de cobros: [Link al dashboard]
   ```

6. **Footer**
   ```
   ---
   Este es un reporte automático generado diariamente.
   Si tienes preguntas, contacta al área de facturación.
   
   Sistema ERP - Made Group
   ```

---

## 🏗️ Arquitectura de Implementación

### Base de Datos

**Tablas involucradas:**

```sql
-- Ingresos (facturas)
evt_ingresos (
  id,
  evento_id,
  uuid_cfdi,
  serie,
  folio,
  total,
  fecha_emision,
  fecha_compromiso,  ← Fecha de vencimiento
  status_cobro,      ← 'pendiente' | 'cobrado'
  notas_cobro
)

-- Eventos (proyectos)
evt_eventos (
  id,
  nombre,
  cliente_id,
  usuario_responsable_id  ← Responsable del evento
)

-- Clientes
clientes (
  id,
  nombre,
  rfc
)

-- Usuarios (responsables)
usuarios (
  id,
  nombre,
  email  ← Destinatario del reporte
)

-- Historial de reportes enviados (NUEVO)
evt_historial_reportes_diarios (
  id,
  fecha_envio,
  usuario_responsable_id,
  total_ingresos,
  monto_total,
  email_enviado,
  error_mensaje
)
```

### Flujo del Sistema

```
┌─────────────────────────────────────────┐
│  CRON JOB                               │
│  Ejecuta diariamente a las 9:00 AM     │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│  Backend Node.js                        │
│  server/services/dailyReportService.js  │
│                                         │
│  1. Obtener responsables con ingresos  │
│  2. Para cada responsable:             │
│     - Consultar sus ingresos           │
│     - Categorizar por urgencia         │
│     - Calcular KPIs                    │
│     - Generar HTML del reporte         │
│     - Enviar email                     │
│     - Registrar en historial           │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│  Supabase PostgreSQL                    │
│  - evt_ingresos                         │
│  - evt_eventos                          │
│  - usuarios                             │
│  - clientes                             │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│  Gmail SMTP                             │
│  madegroup.ti@gmail.com                │
│  Envía emails a cada responsable       │
└─────────────────────────────────────────┘
```

---

## 💻 Implementación

### 1. Crear Tabla de Historial

```sql
-- Ejecutar en Supabase SQL Editor
CREATE TABLE evt_historial_reportes_diarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha_envio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_responsable_id UUID NOT NULL REFERENCES usuarios(id),
  total_ingresos INTEGER NOT NULL,
  total_vencidas INTEGER NOT NULL,
  total_hoy INTEGER NOT NULL,
  total_semana INTEGER NOT NULL,
  total_proximas INTEGER NOT NULL,
  monto_total NUMERIC(15,2) NOT NULL,
  monto_vencidas NUMERIC(15,2) NOT NULL,
  email_enviado BOOLEAN NOT NULL DEFAULT false,
  email_destinatario TEXT,
  error_mensaje TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_historial_reportes_fecha ON evt_historial_reportes_diarios(fecha_envio);
CREATE INDEX idx_historial_reportes_usuario ON evt_historial_reportes_diarios(usuario_responsable_id);

-- Políticas RLS
ALTER TABLE evt_historial_reportes_diarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver su historial de reportes"
ON evt_historial_reportes_diarios
FOR SELECT
USING (auth.uid() = usuario_responsable_id OR auth.uid() IN (
  SELECT id FROM usuarios WHERE role IN ('admin', 'superadmin')
));
```

### 2. Crear Servicio de Reportes Diarios

**Archivo:** `server/services/dailyReportService.js`

```javascript
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export class DailyReportService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  /**
   * Ejecuta el envío de reportes diarios a todos los responsables
   */
  async enviarReportesDiarios() {
    console.log('📊 Iniciando generación de reportes diarios...');
    
    const startTime = Date.now();
    let reportesEnviados = 0;
    let errores = 0;

    try {
      // 1. Obtener todos los responsables que tienen ingresos pendientes
      const responsables = await this.getResponsablesConIngresosPendientes();
      
      console.log(`👥 Responsables con ingresos pendientes: ${responsables.length}`);

      // 2. Para cada responsable, generar y enviar su reporte
      for (const responsable of responsables) {
        try {
          await this.enviarReporteResponsable(responsable);
          reportesEnviados++;
          
          console.log(`✅ Reporte enviado a: ${responsable.nombre} (${responsable.email})`);
        } catch (error) {
          errores++;
          console.error(`❌ Error enviando reporte a ${responsable.email}:`, error.message);
        }
      }

      const duration = Date.now() - startTime;
      
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('  📊 REPORTES DIARIOS COMPLETADOS');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`  ✅ Enviados: ${reportesEnviados}`);
      console.log(`  ❌ Errores: ${errores}`);
      console.log(`  ⏱️ Duración: ${(duration / 1000).toFixed(2)}s`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      return {
        success: true,
        reportesEnviados,
        errores,
        duration
      };

    } catch (error) {
      console.error('❌ Error general en reportes diarios:', error);
      throw error;
    }
  }

  /**
   * Obtiene lista de responsables que tienen ingresos pendientes
   */
  async getResponsablesConIngresosPendientes() {
    const { data, error } = await supabase
      .from('evt_ingresos')
      .select(`
        evento:evt_eventos!inner(
          usuario_responsable_id,
          responsable:usuarios!usuario_responsable_id(
            id,
            nombre,
            email
          )
        )
      `)
      .eq('status_cobro', 'pendiente')
      .not('fecha_compromiso', 'is', null);

    if (error) throw error;

    // Extraer responsables únicos
    const responsablesMap = new Map();
    
    data?.forEach(ingreso => {
      const responsable = ingreso.evento.responsable;
      if (responsable && responsable.email && !responsablesMap.has(responsable.id)) {
        responsablesMap.set(responsable.id, responsable);
      }
    });

    return Array.from(responsablesMap.values());
  }

  /**
   * Envía reporte individual a un responsable
   */
  async enviarReporteResponsable(responsable) {
    // 1. Obtener todos los ingresos del responsable
    const ingresos = await this.getIngresosPorResponsable(responsable.id);
    
    if (ingresos.length === 0) {
      console.log(`⏭️ Sin ingresos para ${responsable.email}`);
      return;
    }

    // 2. Categorizar ingresos
    const categorizado = this.categorizarIngresos(ingresos);
    
    // 3. Calcular KPIs
    const kpis = this.calcularKPIs(categorizado);
    
    // 4. Generar HTML del email
    const { subject, html, text } = this.generarEmailReporte(
      responsable,
      categorizado,
      kpis
    );
    
    // 5. Enviar email
    await this.transporter.sendMail({
      from: `"Sistema ERP - Made Group" <${process.env.GMAIL_USER}>`,
      to: responsable.email,
      subject,
      html,
      text
    });
    
    // 6. Registrar en historial
    await this.registrarEnHistorial(responsable.id, kpis, responsable.email);
  }

  /**
   * Obtiene ingresos pendientes de un responsable
   */
  async getIngresosPorResponsable(responsableId) {
    const { data, error } = await supabase
      .from('evt_ingresos')
      .select(`
        *,
        evento:evt_eventos!inner(
          id,
          nombre,
          cliente:clientes(
            id,
            nombre,
            rfc
          )
        )
      `)
      .eq('evento.usuario_responsable_id', responsableId)
      .eq('status_cobro', 'pendiente')
      .not('fecha_compromiso', 'is', null)
      .order('fecha_compromiso', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  /**
   * Categoriza ingresos por urgencia
   */
  categorizarIngresos(ingresos) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const categorias = {
      vencidas: [],
      hoy: [],
      semana: [],
      proximas: []
    };

    ingresos.forEach(ingreso => {
      const fechaCompromiso = new Date(ingreso.fecha_compromiso);
      fechaCompromiso.setHours(0, 0, 0, 0);
      
      const diffTime = fechaCompromiso - hoy;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        categorias.vencidas.push({ ...ingreso, diasDiferencia: Math.abs(diffDays) });
      } else if (diffDays === 0) {
        categorias.hoy.push({ ...ingreso, diasDiferencia: 0 });
      } else if (diffDays <= 7) {
        categorias.semana.push({ ...ingreso, diasDiferencia: diffDays });
      } else {
        categorias.proximas.push({ ...ingreso, diasDiferencia: diffDays });
      }
    });

    return categorias;
  }

  /**
   * Calcula KPIs del reporte
   */
  calcularKPIs(categorizado) {
    const calcularTotal = (categoria) => {
      return categoria.reduce((sum, ing) => sum + Number(ing.total), 0);
    };

    return {
      totalIngresos: 
        categorizado.vencidas.length + 
        categorizado.hoy.length + 
        categorizado.semana.length + 
        categorizado.proximas.length,
      totalVencidas: categorizado.vencidas.length,
      totalHoy: categorizado.hoy.length,
      totalSemana: categorizado.semana.length,
      totalProximas: categorizado.proximas.length,
      montoTotal: 
        calcularTotal(categorizado.vencidas) +
        calcularTotal(categorizado.hoy) +
        calcularTotal(categorizado.semana) +
        calcularTotal(categorizado.proximas),
      montoVencidas: calcularTotal(categorizado.vencidas),
      montoHoy: calcularTotal(categorizado.hoy),
      montoSemana: calcularTotal(categorizado.semana),
      montoProximas: calcularTotal(categorizado.proximas)
    };
  }

  /**
   * Genera contenido del email
   */
  generarEmailReporte(responsable, categorizado, kpis) {
    const fecha = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formatMoney = (amount) => {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(amount);
    };

    const formatDate = (dateStr) => {
      return new Date(dateStr).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    };

    const subject = `📊 Reporte Diario de Cobros - ${responsable.nombre} - ${fecha}`;

    // ... (continuará en siguiente mensaje por límite de caracteres)
```

---

## 🎯 Próximos Pasos

1. **Crear tabla de historial** en Supabase
2. **Implementar `dailyReportService.js`** con toda la lógica
3. **Actualizar endpoint** `/api/cron/daily-reports` en `server/ocr-api.js`
4. **Configurar node-cron** para ejecución diaria a las 9:00 AM
5. **Testing** con un responsable de prueba
6. **Deploy** y monitoreo

**¿Quieres que implemente el código completo ahora?** 🚀
