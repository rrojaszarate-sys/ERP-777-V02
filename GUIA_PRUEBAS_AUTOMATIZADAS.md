# Guía de Pruebas Automatizadas - ERP 777 V2

## Paso a Paso para Ejecutar las Pruebas

### Requisitos Previos

1. **Node.js** instalado (versión 18 o superior)
2. **Acceso a terminal/consola** (CMD, PowerShell, o Terminal)
3. **Conexión a internet** (las pruebas conectan a Supabase)

---

## PASO 1: Abrir la Terminal

### Windows
- Presiona `Win + R`, escribe `cmd` y presiona Enter
- O busca "Terminal" en el menú de inicio

### Mac/Linux
- Abre la aplicación "Terminal"

---

## PASO 2: Navegar al Proyecto

Copia y pega este comando (ajusta la ruta si es diferente):

```bash
cd /home/rodri/proyectos/ERP-777-V02-pc/ERP-777-V02
```

**Resultado esperado:** No debe mostrar error. El prompt cambiará mostrando la nueva ubicación.

---

## PASO 3: Verificar que Node está Instalado

```bash
node --version
```

**Resultado esperado:** Debe mostrar algo como `v18.x.x` o `v20.x.x`

Si muestra error "command not found", necesitas instalar Node.js desde https://nodejs.org

---

## PASO 4: Instalar Dependencias (solo la primera vez)

```bash
npm install
```

**Resultado esperado:**
- Verás muchas líneas de texto mientras descarga paquetes
- Al final debe decir algo como "added XXX packages"
- NO debe mostrar errores en rojo

**Tiempo estimado:** 1-3 minutos

---

## PASO 5: Ejecutar Pruebas de Admin Empresas

```bash
node scripts/test_admin_empresas.mjs
```

### Resultado Esperado:

```
╔═══════════════════════════════════════════════════════════════════════════╗
║       🏢 PRUEBAS AUTOMATIZADAS - ADMIN EMPRESAS (FASE 6)                 ║
╚═══════════════════════════════════════════════════════════════════════════╝

🏗️  PRUEBAS DE ESTRUCTURA DE BASE DE DATOS

   ✅ Tabla core_companies existe
   ✅ core_companies tiene columna codigo
   ✅ Tabla core_roles_empresa existe
   ... (más líneas con ✅)

🏢 PRUEBAS DE GESTIÓN DE EMPRESAS

   ✅ Empresa MADREGROUP existe
      📝 Nombre: MADREGROUP, Código: madregroup
   ... (más líneas)

╔═══════════════════════════════════════════════════════════════════╗
║              📊 RESUMEN - ADMIN EMPRESAS                         ║
╠═══════════════════════════════════════════════════════════════════╣
║  Total de pruebas:       45                                 ║
║  ✅ Exitosas:            45                                 ║
║  ❌ Fallidas:             0                                 ║
║  📈 Tasa de éxito:    100.0%                                ║
╚═══════════════════════════════════════════════════════════════════╝
```

### ¿Qué significa cada símbolo?
- ✅ = Prueba exitosa (BIEN)
- ❌ = Prueba fallida (PROBLEMA)
- 📝 = Información adicional

### ¿Qué hacer si hay errores?
- Si ves ❌, anota el nombre de la prueba que falló
- Copia el mensaje de error (la línea que empieza con 💥)
- Reporta al desarrollador

---

## PASO 6: Ejecutar Pruebas Exhaustivas del Sistema

```bash
node scripts/pruebas-exhaustivas.mjs
```

### Resultado Esperado:

```
╔═══════════════════════════════════════════════════════════════════╗
║     🧪 SUITE DE PRUEBAS EXHAUSTIVAS - ERP 777 V2                ║
╚═══════════════════════════════════════════════════════════════════╝

🔌 PRUEBAS DE CONECTIVIDAD Y ESTRUCTURA
   ✅ Conexión a Supabase
   ✅ Tabla evt_eventos_erp existe
   ... (más tablas)

🎉 PRUEBAS DE CICLO COMPLETO DE EVENTOS
   ✅ Eventos creados en sistema
      📝 11 eventos encontrados
   ...

💰 PRUEBAS FINANCIERAS
   ✅ Cálculo correcto de utilidad real
   ✅ Balance ingresos cobrados/pendientes
      📝 Cobrados: $12,368,556.57, Pendientes: $2,132,000
   ...

╔═══════════════════════════════════════════════════════════════════╗
║                   📊 RESUMEN DE PRUEBAS                          ║
╠═══════════════════════════════════════════════════════════════════╣
║  Total de pruebas:       49                                 ║
║  ✅ Exitosas:            49                                 ║
║  ❌ Fallidas:             0                                 ║
║  📈 Tasa de éxito:    100.0%                                ║
╚═══════════════════════════════════════════════════════════════════╝

🎉 ¡Todas las pruebas pasaron exitosamente!
```

---

## PASO 7: Verificar el Build (Compilación)

```bash
npm run build
```

### Resultado Esperado:
- Muchas líneas mostrando archivos siendo procesados
- Al final debe decir: `✓ built in XX.XXs`
- NO debe mostrar errores (las advertencias en amarillo están OK)

**Tiempo estimado:** 20-40 segundos

---

## Resumen de Comandos

| Paso | Comando | Qué hace |
|------|---------|----------|
| 5 | `node scripts/test_admin_empresas.mjs` | Prueba módulo de empresas |
| 6 | `node scripts/pruebas-exhaustivas.mjs` | Prueba todo el sistema |
| 7 | `npm run build` | Compila la aplicación |

---

## ¿Qué se está probando?

### Pruebas Admin Empresas (45 pruebas)
| Categoría | Qué verifica |
|-----------|--------------|
| Estructura BD | Que existan todas las tablas necesarias |
| Empresas | Que MADREGROUP exista con código correcto |
| Roles | Que haya roles de admin, supervisor, etc. |
| Módulos | Que los 21 módulos estén asignados |
| Usuarios | Que los usuarios tengan empresa asignada |
| Storage | Que el bucket erp-madregroup exista |
| Performance | Que las consultas sean rápidas (<500ms) |

### Pruebas Exhaustivas (49 pruebas)
| Categoría | Qué verifica |
|-----------|--------------|
| Conectividad | Conexión a base de datos |
| Eventos | 11 eventos de prueba existen |
| Financieras | Cálculos de ingresos y gastos |
| Inventario | 568 productos, 5 almacenes |
| CRUD | Crear, leer, actualizar, eliminar datos |

---

## Solución de Problemas Comunes

### Error: "Cannot find module"
```bash
npm install
```

### Error: "Connection refused" o "timeout"
- Verifica tu conexión a internet
- Espera 30 segundos e intenta de nuevo

### Error: "Permission denied"
- En Linux/Mac, intenta con: `sudo node scripts/test_admin_empresas.mjs`

### Las pruebas tardan mucho
- Normal: 5-15 segundos cada suite
- Si tarda más de 2 minutos, puede haber problema de conexión

---

## Criterios de Éxito

| Métrica | Valor Aceptable |
|---------|-----------------|
| Tasa de éxito Admin Empresas | 100% (45/45) |
| Tasa de éxito Exhaustivas | 100% (49/49) |
| Build | Sin errores |

**Si todas las pruebas pasan con 100%, el sistema está funcionando correctamente.**

---

*Guía creada: 3 de Diciembre 2025*
*ERP 777 V2 - Sistema de Vanguardia para Manejo de Eventos*
