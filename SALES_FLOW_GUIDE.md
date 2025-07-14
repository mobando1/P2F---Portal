# Guía del Flujo de Ventas - Passport2Fluency

## Flujo de Ventas Implementado

### 1. Desde Sitio Web Wix
**Usuario ve planes en sitio web principal**
- Planes expuestos con precios claros
- Botones "Comprar Ahora" por plan
- Links dirigidos a: `https://portal.dominio.com/login?plan=10&from=purchase`

### 2. Redirección a Portal de Login
**URL de ejemplo**: `/login?plan=10&from=purchase`
- Detecta automáticamente que viene desde compra
- Mensaje contextual: "¡Estás a un paso de comenzar! Inicia sesión o regístrate para completar tu compra."
- Soporte para usuarios nuevos y existentes

### 3. Post-Login/Registro
**Redirección automática**:
- Login exitoso → `/packages?plan=10`
- Registro exitoso → `/packages?plan=10`
- Sin parámetros → `/dashboard`

### 4. Página de Paquetes
**Plan preseleccionado**:
- Detecta parámetro `plan` en URL
- Preselecciona automáticamente el paquete correcto
- Proceso de compra con Stripe
- Confirmación y acceso al dashboard

### 5. Dashboard Post-Compra
**Experiencia completa**:
- Créditos de clases disponibles
- Acceso a calendario de reservas
- Botón "Comprar Más" para upselling

## URLs de Integración

### Desde Wix a Portal
```
https://portal.dominio.com/login?plan=1-class&from=purchase
https://portal.dominio.com/login?plan=2-class&from=purchase
https://portal.dominio.com/login?plan=3-class&from=purchase
```

### Parámetros Soportados
- `plan`: Identificador del plan (1-class, 2-class, 3-class) o número (1, 2, 3)
- `from=purchase`: Indica origen desde compra
- `from=trial`: Indica origen desde trial completado

## Flujos Alternativos

### A. Usuario Existente
1. Sitio Wix → Portal Login
2. Login exitoso → Packages preseleccionado
3. Compra → Dashboard actualizado

### B. Usuario Nuevo
1. Sitio Wix → Portal Login
2. Registro → Packages preseleccionado
3. Compra → Dashboard con acceso completo

### C. Free Trial Completado
1. High Level → Email sequence
2. Link a portal: `/login?from=trial`
3. Mensaje: "¿Completaste tu clase gratuita? ¡Perfecto!"
4. Login → Dashboard o Packages

## Ventajas del Flujo Implementado

✅ **Experiencia Unificada**: Todo sucede en el portal
✅ **Datos Centralizados**: Control total de usuarios y compras
✅ **Upselling Natural**: Fácil acceso a más paquetes
✅ **Flexibilidad**: Soporta múltiples orígenes de tráfico
✅ **Conversión Optimizada**: Proceso simple y directo

## Implementación Técnica

### Login Page
- Detección de parámetros URL
- Mensajes contextuales
- Redirección inteligente post-auth

### Packages Page
- Preselección automática de planes
- Integración con Stripe
- Manejo de estados de compra

### Dashboard
- Display de créditos disponibles
- Acceso directo a compra de más clases
- Experiencia post-compra optimizada