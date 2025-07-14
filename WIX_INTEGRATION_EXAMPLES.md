# Ejemplos de Integración con Sitio Web Wix

## URLs para Botones de Compra en Wix

### Paquete de 5 Clases
```html
<a href="https://tu-portal.replit.app/login?plan=5&from=purchase" class="buy-button">
  Comprar 5 Clases - $75
</a>
```

### Paquete de 10 Clases (Más Popular)
```html
<a href="https://tu-portal.replit.app/login?plan=10&from=purchase" class="buy-button popular">
  Comprar 10 Clases - $140
</a>
```

### Paquete de 20 Clases
```html
<a href="https://tu-portal.replit.app/login?plan=20&from=purchase" class="buy-button">
  Comprar 20 Clases - $260
</a>
```

### Paquete de 30 Clases
```html
<a href="https://tu-portal.replit.app/login?plan=30&from=purchase" class="buy-button">
  Comprar 30 Clases - $360
</a>
```

## Enlaces para Email Marketing

### Usuarios que Completaron Free Trial
```
https://tu-portal.replit.app/login?from=trial
```

### Usuarios Interesados en Plan Específico
```
https://tu-portal.replit.app/login?plan=10&from=email
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
// onClick: () => buyPlan(10)
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