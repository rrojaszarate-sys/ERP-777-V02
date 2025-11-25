# 🎨 EJEMPLO RÁPIDO - SELECTOR DE PALETAS

## 🚀 **CÓMO USAR EL NUEVO SELECTOR**

### **1. Ubicación en la Interfaz**
El selector está ubicado en el **header principal**, justo a la izquierda del menú de usuario:

```
[🔍 Búsqueda] [🔔 Notificaciones] [🎨 Paletas] [👤 Usuario]
```

### **2. Interacción Básica**

#### **Ver Paleta Actual**
- El botón muestra **3 cuadrados de color** de la paleta activa
- Hover muestra tooltip: *"Cambiar paleta de colores"*

#### **Cambiar Paleta**
1. **Clic en el botón** → Se abre el dropdown
2. **Seleccionar paleta** → Cambio inmediato
3. **Clic fuera** → Se cierra automáticamente

#### **Modo Oscuro/Claro**
- **Botón "Oscuro/Claro"** en la parte superior del dropdown
- Cambio inmediato al hacer clic
- Se mantiene la paleta seleccionada

---

## 🎨 **PALETAS DISPONIBLES**

### **🟢 Mint (Actual)**
- **Colores**: Verde menta empresarial
- **Uso**: Fresco, profesional, amigable
- **Predeterminado**: ✅ Paleta actual del sistema

### **🔵 Azul Corporativo**
- **Colores**: Azul tradicional de empresas
- **Uso**: Formal, confiable, clásico
- **Ideal para**: Presentaciones ejecutivas

### **🟣 Morado Elegante**
- **Colores**: Violeta sofisticado
- **Uso**: Creativo, premium, innovador
- **Ideal para**: Diseño y creatividad

### **🔴 Rojo Energético**
- **Colores**: Rojo vibrante y dinámico
- **Uso**: Llamativo, urgente, potente
- **Ideal para**: Alertas y destacados

### **🟠 Naranja Cálido**
- **Colores**: Naranja acogedor
- **Uso**: Energizante, amistoso, positivo
- **Ideal para**: Interfaces casuales

### **⚫ Azul Nocturno**
- **Colores**: Azul oscuro premium
- **Uso**: Elegante, sofisticado, profesional
- **Ideal para**: Modo ejecutivo

---

## 💻 **PARA DESARROLLADORES**

### **Usar Colores Dinámicos en CSS**
```css
/* Usar variables CSS */
.mi-elemento {
  background-color: var(--theme-primary);
  color: var(--theme-text-primary);
}

/* Usar clases de Tailwind */
.mi-elemento {
  @apply theme-bg-primary theme-text-primary;
}
```

### **Usar Hook en React**
```typescript
import { useTheme } from '@/shared/components/theme';

const MiComponente = () => {
  const { palette, mode, paletteConfig, isLight } = useTheme();
  
  return (
    <div className={`p-4 ${isLight ? 'bg-white' : 'bg-gray-900'}`}>
      <h1 style={{ color: paletteConfig.primary }}>
        Tema: {paletteConfig.name} ({mode})
      </h1>
    </div>
  );
};
```

### **Escuchar Cambios de Tema**
```typescript
useEffect(() => {
  const handleThemeChange = (event: CustomEvent) => {
    const { palette, mode } = event.detail;
    console.log(`Nuevo tema: ${palette} - ${mode}`);
  };

  window.addEventListener('theme-changed', handleThemeChange);
  return () => window.removeEventListener('theme-changed', handleThemeChange);
}, []);
```

---

## ⚙️ **CONFIGURACIÓN AVANZADA**

### **Variables de Entorno**
```bash
# .env - Personalizar comportamiento
VITE_DEFAULT_THEME_PALETTE=blue     # Paleta por defecto
VITE_DEFAULT_THEME_MODE=light       # Modo por defecto
VITE_ENABLE_DARK_MODE=true          # Habilitar modo oscuro
VITE_ENABLE_THEME_PICKER=true       # Mostrar selector
```

### **Resetear Tema Programáticamente**
```typescript
import { resetThemeToDefault } from '@/shared/components/theme';

// Resetear a valores por defecto
resetThemeToDefault();
```

---

## 📱 **COMPATIBILIDAD**

### **✅ Totalmente Compatible**
- **Navegadores**: Chrome, Firefox, Safari, Edge (últimas 2 versiones)
- **Dispositivos**: Desktop, tablet, móvil
- **Sistemas**: Windows, macOS, Linux, iOS, Android
- **Tema anterior**: Migración automática desde configuración existente

### **✅ Progressive Enhancement**
- **CSS no soportado**: Fallback a colores estáticos
- **JavaScript deshabilitado**: Mantiene tema por defecto
- **localStorage no disponible**: Funciona sin persistencia
- **Feature flags**: Deshabilitación granular por ambiente

---

## 🎯 **CASOS DE USO**

### **👨‍💼 Ejecutivos**
```
Problema: "Necesito una interfaz más seria para presentaciones"
Solución: Cambiar a "Azul Corporativo" o "Azul Nocturno"
```

### **🎨 Equipos Creativos**
```
Problema: "Queremos algo más dinámico y creativo"
Solución: Cambiar a "Morado Elegante" o "Naranja Cálido"
```

### **⏰ Trabajo Nocturno**
```
Problema: "La pantalla es muy brillante de noche"
Solución: Activar modo oscuro con cualquier paleta
```

### **🏢 Branding Corporativo**
```
Problema: "Necesitamos colores que representen nuestra marca"
Solución: Seleccionar la paleta que mejor coincida con la identidad
```

---

**🎉 ¡El sistema está listo y funcionando!**

Los usuarios pueden personalizar completamente la apariencia del sistema con solo unos clics, manteniendo una experiencia visual consistente y profesional.