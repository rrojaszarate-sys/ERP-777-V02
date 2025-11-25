# 📋 INSTRUCCIONES EJECUTIVAS PARA PRODUCCIÓN

## ⚡ ACCIÓN INMEDIATA REQUERIDA

**Fecha:** 27 de Octubre de 2025  
**Prioridad:** 🔴 URGENTE  
**Tiempo estimado:** 15-20 minutos

---

## 🎯 OBJETIVO

Actualizar todos los registros de gastos e ingresos a estado "pagado", distribuirlos en cuentas bancarias y validar integridad del sistema completo.

---

## ✅ PASO A PASO (EJECUTAR EN ORDEN)

### PASO 1: Ejecutar Script SQL (5 min)

1. **Abrir Supabase Dashboard**
   ```
   URL: https://supabase.com/dashboard
   ```

2. **Ir a SQL Editor**
   - Clic en "SQL Editor" en el menú lateral

3. **Crear Nueva Query**
   - Clic en "+ New query"

4. **Copiar y Pegar el Script**
   - Abrir archivo: `PLAN_PRODUCCION_URGENTE.sql`
   - Copiar TODO el contenido
   - Pegar en el editor SQL

5. **Ejecutar**
   - Clic en botón "Run" o presionar `Ctrl+Enter`
   - ⏳ Esperar a que termine (puede tardar 1-2 minutos)

6. **Verificar Resultado**
   - ✅ Debe mostrar mensajes de éxito
   - ✅ Debe mostrar cantidades actualizadas
   - ✅ No debe haber errores en rojo

---

### PASO 2: Validación Automática (3 min)

1. **Abrir Terminal**
   ```bash
   cd /home/rodrichrz/proyectos/Made-Erp-777-ok/ERP-777-V01-CLEAN
   ```

2. **Ejecutar Script de Validación**
   ```bash
   node validacion-automatica-produccion.mjs
   ```

3. **Verificar Resultado**
   - ✅ Debe decir: "¡SISTEMA VALIDADO Y LISTO PARA PRODUCCIÓN!"
   - ✅ Porcentaje de éxito: 100%
   - ✅ 0 pruebas fallidas

4. **Si HAY ERRORES:**
   - ❌ NO continuar
   - 📞 Reportar errores inmediatamente
   - 🔄 Ejecutar plan de rollback si es necesario

---

### PASO 3: Validación Manual Frontend (7 min)

El servidor ya está corriendo en: http://localhost:5173

**Probar cada módulo:**

1. **Master de Facturación** → `/eventos/facturacion`
   - [ ] Tabla carga sin errores
   - [ ] Todos los eventos muestran datos correctos
   - [ ] Status de pago es "pagado"

2. **Estados Contables** → `/contabilidad/estados`
   - [ ] Tarjetas de resumen muestran totales
   - [ ] Tabla de eventos por cuenta carga
   - [ ] Totales coinciden con Master de Facturación

3. **Análisis Financiero** → `/eventos/analisis-financiero`
   - [ ] Gráficas cargan sin errores
   - [ ] KPIs muestran valores coherentes

4. **Reportes Bancarios** → `/contabilidad/reportes`
   - [ ] Filtros funcionan
   - [ ] Botón "Exportar" funciona

---

## 🚨 SI ALGO FALLA

### Ejecutar Rollback Inmediato

```sql
-- Abrir Supabase SQL Editor y ejecutar:

-- 1. Restaurar gastos
TRUNCATE evt_gastos;
INSERT INTO evt_gastos 
SELECT * FROM evt_gastos_backup_pre_produccion;

-- 2. Restaurar ingresos
TRUNCATE evt_ingresos;
INSERT INTO evt_ingresos 
SELECT * FROM evt_ingresos_backup_pre_produccion;

-- 3. Restaurar cuentas
UPDATE evt_cuentas_contables c
SET saldo_actual = b.saldo_actual
FROM evt_cuentas_contables_backup_pre_produccion b
WHERE c.id = b.id;
```

---

## ✅ CHECKLIST FINAL

Marcar cuando esté completado:

- [ ] ✅ Script SQL ejecutado sin errores
- [ ] ✅ Validación automática: 100% exitosa
- [ ] ✅ Master de Facturación: funciona correctamente
- [ ] ✅ Estados Contables: funciona correctamente
- [ ] ✅ Análisis Financiero: funciona correctamente
- [ ] ✅ Reportes Bancarios: funciona correctamente
- [ ] ✅ No hay errores en consola del navegador (F12)
- [ ] ✅ Performance aceptable (< 3 segundos)

---

## 📊 RESULTADO ESPERADO

Después de ejecutar todos los pasos:

```
✅ Todos los gastos: PAGADOS
✅ Todos los ingresos: PAGADOS
✅ Todas las cuentas bancarias: ASIGNADAS
✅ Saldos bancarios: CORRECTOS
✅ Vistas de BD: FUNCIONANDO
✅ Frontend: SIN ERRORES
✅ Validación: 100% EXITOSA
```

**Estado final:** 🟢 SISTEMA LISTO PARA PRODUCCIÓN

---

## 📞 CONTACTO DE EMERGENCIA

Si encuentras algún problema:
1. NO entrar en pánico
2. Tomar screenshot del error
3. Ejecutar rollback si es necesario
4. Documentar el problema

---

## 📝 NOTAS ADICIONALES

**Archivos importantes:**
- `PLAN_PRODUCCION_URGENTE.sql` - Script principal
- `validacion-automatica-produccion.mjs` - Validación
- `PLAN_DEPLOYMENT_PRODUCCION.md` - Plan completo
- `GUIA_PRUEBAS_FRONTEND.md` - Guía de pruebas

**Backups disponibles:**
- evt_gastos_backup_pre_produccion
- evt_ingresos_backup_pre_produccion
- evt_cuentas_contables_backup_pre_produccion

---

**⏰ TIEMPO TOTAL ESTIMADO:** 15-20 minutos  
**🎯 OBJETIVO:** Sistema validado y listo para producción  
**📅 FECHA LÍMITE:** HOY (27-Oct-2025)

---

¡COMIENZA AHORA! ⚡
