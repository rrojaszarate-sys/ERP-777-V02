# Cómo Regenerar Tipos de Supabase

## Requisitos Previos

1. Tener Supabase CLI instalado globalmente:
   ```bash
   npm install -g supabase
   ```

2. Autenticarse con Supabase:
   ```bash
   npx supabase login
   ```

## Método 1: Usando el Script Automatizado

```bash
./scripts/generate-types.sh
```

## Método 2: Comando Manual

```bash
npx supabase gen types typescript --project-id gomnouwackzvthpwyric > src/core/types/database.generated.ts
```

## Después de Generar los Tipos

1. **Revisar el archivo generado**:
   ```bash
   cat src/core/types/database.generated.ts | head -50
   ```

2. **Hacer backup del archivo actual** (opcional):
   ```bash
   cp src/core/types/database.ts src/core/types/database.backup.ts
   ```

3. **Reemplazar el archivo actual**:
   ```bash
   mv src/core/types/database.generated.ts src/core/types/database.ts
   ```

4. **Verificar que no hay errores de compilación**:
   ```bash
   npm run typecheck
   ```

## Solución de Problemas

### Error: "Login required"
```bash
npx supabase login
```

### Error: "Invalid project ID"
Verificar en `.env` que el `VITE_SUPABASE_URL` es correcto:
```
VITE_SUPABASE_URL=https://gomnouwackzvthpwyric.supabase.co
```

### Error: "Network error"
- Verificar conexión a internet
- Verificar que el proyecto existe en Supabase Dashboard

## Cuándo Regenerar los Tipos

Regenera los tipos cuando:
- ✅ Agregas nuevas tablas a la base de datos
- ✅ Modificas columnas existentes
- ✅ Cambias tipos de datos
- ✅ Agregas o modificas políticas RLS
- ✅ Cambias funciones o triggers

## Nota Importante

⚠️ Los tipos generados automáticamente pueden ser muy restrictivos.
En algunos casos, será necesario usar `as any` o `// @ts-ignore`
temporalmente hasta que Supabase mejore la generación de tipos.
