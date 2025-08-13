# Guía de Configuración de Stripe

## Configuración de Productos y Precios en Stripe

Para que las suscripciones funcionen correctamente, necesitas crear productos y precios en tu Dashboard de Stripe y configurar las variables de entorno correspondientes.

### 1. Crear Productos en Stripe Dashboard

Ve a [https://dashboard.stripe.com/products](https://dashboard.stripe.com/products) y crea los siguientes productos:

#### Producto 1: Plan 1 Clase por Semana
- **Nombre**: "1 Clase por Semana"
- **Descripción**: "Progreso constante con 4 clases mensuales"
- **Precio**: $119.96 USD/mes
- **Tipo**: Suscripción recurrente
- **Intervalo de facturación**: Mensual

#### Producto 2: Plan 2 Clases por Semana (MÁS POPULAR)
- **Nombre**: "2 Clases por Semana"
- **Descripción**: "Progreso más rápido con 8 clases mensuales"
- **Precio**: $219.99 USD/mes
- **Tipo**: Suscripción recurrente
- **Intervalo de facturación**: Mensual

#### Producto 3: Plan 3 Clases por Semana
- **Nombre**: "3 Clases por Semana"
- **Descripción**: "Para estudiantes serios que quieren resultados rápidos con 12 clases mensuales"
- **Precio**: $299.99 USD/mes
- **Tipo**: Suscripción recurrente
- **Intervalo de facturación**: Mensual

### 2. Obtener Price IDs

Después de crear cada producto, Stripe te dará un **Price ID** que comienza con `price_`. Necesitas estos IDs para configurar las variables de entorno.

### 3. Configurar Variables de Entorno

En tu archivo `.env` o en la configuración de Replit Secrets, agrega:

```env
# Claves de Stripe (ya configuradas)
STRIPE_SECRET_KEY=sk_live_... o sk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_live_... o pk_test_...

# Price IDs de los productos (NECESARIOS PARA SUSCRIPCIONES)
STRIPE_PRICE_ID_PLAN_1=price_... # Plan 1 Clase por Semana ($119.96)
STRIPE_PRICE_ID_PLAN_2=price_... # Plan 2 Clases por Semana ($219.99)
STRIPE_PRICE_ID_PLAN_3=price_... # Plan 3 Clases por Semana ($299.99)

# Webhook Secret (para producción)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Configurar Webhooks

Para que las suscripciones se registren automáticamente en la base de datos:

1. Ve a [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Haz clic en "Add endpoint"
3. URL del endpoint: `https://tu-dominio.replit.app/api/stripe-webhook`
4. Selecciona estos eventos:
   - `customer.subscription.created`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `payment_intent.succeeded`

### 5. Pasos para Configurar

#### Paso 1: Crear Productos
```bash
# Ve a Stripe Dashboard > Products
# Crea los 3 productos con los precios mencionados
```

#### Paso 2: Copiar Price IDs
```bash
# En cada producto, copia el Price ID
# Ejemplo: price_1234567890abcdef
```

#### Paso 3: Configurar Secrets en Replit
```bash
# Ve a tu Repl > Secrets
# Agrega las variables STRIPE_PRICE_ID_PLAN_1, 2 y 3
```

#### Paso 4: Probar Suscripciones
```bash
# Las suscripciones ahora se conectarán automáticamente
# con los productos reales de Stripe
```

## Flujo de Suscripción

1. **Usuario selecciona plan** → Sistema obtiene Price ID correspondiente
2. **Sistema crea Customer en Stripe** → Si no existe ya
3. **Sistema crea Subscription** → Usando el Price ID del plan
4. **Usuario completa pago** → Stripe procesa la suscripción
5. **Webhook confirma pago** → Sistema activa suscripción en base de datos
6. **Usuario obtiene acceso** → A las clases según su plan

## Estructura de Precios por Plan

| Plan | Nombre | Clases/Mes | Precio/Mes | Price ID Variable |
|------|--------|------------|------------|------------------|
| Plan 1 | Starter Flow | 4 clases | $119.96 | STRIPE_PRICE_ID_PLAN_1 |
| Plan 2 | Momentum Plan | 8 clases | $219.99 | STRIPE_PRICE_ID_PLAN_2 |
| Plan 3 | Fluency Boost | 12 clases | $299.99 | STRIPE_PRICE_ID_PLAN_3 |

## Estado Actual - ✅ CONFIGURADO

Los Price IDs están configurados correctamente:
- **STRIPE_PRICE_ID_PLAN_1**: price_1RW1BcLeh4G0Mqb7bk0laWwE (Starter Flow)
- **STRIPE_PRICE_ID_PLAN_2**: price_1RW18pLeh4G0Mqb7fLWu0VKI (Momentum Plan)
- **STRIPE_PRICE_ID_PLAN_3**: price_1RW187Leh4G0Mqb7XgxzetzR (Fluency Boost)

## Notas Importantes

- **Modo Test vs Live**: Usa `sk_test_` y `pk_test_` para desarrollo, `sk_live_` y `pk_live_` para producción
- **Price IDs diferentes**: Los Price IDs de test y live son diferentes
- **Webhooks**: Configura webhooks tanto para test como para live
- **Facturación**: Las suscripciones se facturan automáticamente cada mes
- **Cancelación**: Los usuarios pueden cancelar desde su dashboard o contactando soporte

## Verificación

Una vez configurado, verifica que:
- [ ] Los 3 productos existen en Stripe Dashboard
- [ ] Las 3 variables STRIPE_PRICE_ID_PLAN_X están configuradas
- [ ] Los webhooks están activos y apuntando a tu endpoint
- [ ] Las suscripciones de prueba se crean correctamente
- [ ] Los pagos se reflejan en el dashboard del usuario

¡Con esta configuración, el sistema de suscripciones estará completamente funcional!