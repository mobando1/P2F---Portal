# Ejemplos de Integración con Sitio Web Wix

## URLs para Botones de Compra en Wix

### Plan 1 Clase por Semana
```html
<a href="https://tu-portal.replit.app/login?plan=1-class&from=purchase" class="buy-button">
  Start Learning Now - $119.96/month
</a>
```

### Plan 2 Clases por Semana (Más Popular)
```html
<a href="https://tu-portal.replit.app/login?plan=2-class&from=purchase" class="buy-button popular">
  Choose This Plan - $219.99/month
</a>
```

### Plan 3 Clases por Semana
```html
<a href="https://tu-portal.replit.app/login?plan=3-class&from=purchase" class="buy-button">
  Start Learning Now - $299.99/month
</a>
```

### URLs Alternativas con Números
```html
<a href="https://tu-portal.replit.app/login?plan=1&from=purchase">1 Clase por Semana</a>
<a href="https://tu-portal.replit.app/login?plan=2&from=purchase">2 Clases por Semana</a>
<a href="https://tu-portal.replit.app/login?plan=3&from=purchase">3 Clases por Semana</a>
```

## Enlaces para Email Marketing

### Usuarios que Completaron Free Trial
```
https://tu-portal.replit.app/login?from=trial
```

### Usuarios Interesados en Plan Específico
```
https://tu-portal.replit.app/login?plan=2-class&from=email
```

## Código JavaScript para Wix

### Redirección Dinámica
```javascript
// En el editor de código de Wix
export function buyPlan(planId) {
  const baseUrl = "https://tu-portal.replit.app";
  const url = `${baseUrl}/login?plan=${planId}&from=purchase`;
  window.open(url, '_blank');
}

// Para usar en botones:
// onClick: () => buyPlan('2-class')
// onClick: () => buyPlan('1-class')
// onClick: () => buyPlan('3-class')
```

### Tracking de Conversiones
```javascript
// Opcional: tracking antes de redirigir
export function trackAndBuy(planId, planName) {
  // Tu código de analytics aquí
  gtag('event', 'begin_checkout', {
    'event_category': 'ecommerce',
    'event_label': planName,
    'value': getPlanPrice(planId)
  });
  
  // Luego redirigir
  buyPlan(planId);
}
```

## Ventajas de esta Implementación

✅ **Experiencia Fluida**: Usuario no sale del ecosistema Passport2Fluency
✅ **Conversión Optimizada**: Proceso directo sin fricciones
✅ **Datos Centralizados**: Todo en tu portal para análisis
✅ **Upselling Natural**: Fácil acceso a más paquetes post-compra
✅ **Flexibilidad**: Soporta múltiples fuentes de tráfico

## Próximos Pasos

1. **Configurar URLs**: Reemplaza `tu-portal.replit.app` con tu dominio
2. **Implementar en Wix**: Agregar enlaces a botones de compra
3. **Probar Flujo**: Verificar experiencia completa
4. **Configurar Analytics**: Tracking de conversiones
5. **Optimizar**: Análisis y mejoras continuas