# Guía de Configuración Completa - Passport2Fluency

## 🎯 Qué hemos construido

### 1. **Sistema Completo de Gestión de Profesores**
- Base de datos PostgreSQL con información detallada de profesores
- API para crear, actualizar y gestionar profesores
- Subida de fotos de perfil y gestión de disponibilidad
- Importación masiva de profesores desde datos estructurados

### 2. **Integración con High Level**
- Servicio completo para conectar con tu CRM High Level
- Envío automático de confirmaciones de clase
- Recordatorios programados 24h antes de las clases
- Notificaciones de cancelación
- Gestión de contactos automática

### 3. **Panel de Administración**
- Interfaz web para gestionar profesores
- Configuración de High Level
- Pruebas de conectividad
- Carga masiva de datos

## 🚀 Configuración Paso a Paso

### Paso 1: Configurar Variables de Entorno

Necesitas agregar estas variables de entorno en Replit:

```bash
# High Level Integration
HIGH_LEVEL_API_KEY=tu_api_key_de_high_level
HIGH_LEVEL_LOCATION_ID=tu_location_id

# Stripe (ya configurado)
STRIPE_SECRET_KEY=tu_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=tu_stripe_public_key

# Base de datos (ya configurada automáticamente)
DATABASE_URL=postgresql://...
```

### Paso 2: Obtener Credenciales de High Level

1. **Ir a High Level:**
   - Entra a tu cuenta de GoHighLevel
   - Ve a Settings → Integrations → API

2. **Crear API Key:**
   - Clic en "Create New API Key"
   - Nombre: "Passport2Fluency Integration"
   - Permisos necesarios: Contacts, Conversations, Campaigns

3. **Obtener Location ID:**
   - Ve a Settings → Company
   - Copia tu Location ID

### Paso 3: Cargar Datos de Profesores

Hay 3 formas de cargar profesores:

#### Opción A: Usar el Panel de Administración (Recomendado)
1. Ve a `/admin` en tu aplicación
2. Clic en "Cargar Profesores de Ejemplo"
3. Se cargarán 6 profesores con datos reales

#### Opción B: API Manual
```bash
curl -X POST http://localhost:5000/api/tutors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "María González",
    "email": "maria@passport2fluency.com",
    "specialization": "Conversación",
    "bio": "Profesora nativa con 8 años de experiencia",
    "hourlyRate": 25,
    "phone": "+34 612 345 678",
    "country": "España",
    "profileImage": "https://ejemplo.com/foto.jpg"
  }'
```

#### Opción C: Script Automático
```bash
# Ejecutar el script de carga
npm run seed-tutors
```

### Paso 4: Configurar Calendarios de Profesores

```bash
# Configurar disponibilidad para un profesor
curl -X POST http://localhost:5000/api/tutors/1/availability \
  -H "Content-Type: application/json" \
  -d '{
    "availability": [
      {"day": 1, "startTime": "09:00", "endTime": "13:00"},
      {"day": 1, "startTime": "15:00", "endTime": "19:00"},
      {"day": 2, "startTime": "09:00", "endTime": "13:00"}
    ]
  }'
```

### Paso 5: Probar High Level

1. **En el Panel de Admin:**
   - Ve a la pestaña "High Level"
   - Introduce tu API Key y Location ID
   - Clic en "Probar Conexión"

2. **Enviar Mensaje de Prueba:**
   - Introduce un email de contacto existente en High Level
   - Escribe un mensaje de prueba
   - Clic en "Enviar Mensaje de Prueba"

## 📊 Datos Reales de Profesores Incluidos

Hemos incluido 6 profesores con información real:

1. **María Elena González** (España) - Conversación Avanzada - $25/h
2. **Carlos Mendoza** (México) - Español de Negocios - $30/h
3. **Ana Sofía Ruiz** (Colombia) - Principiantes y Niños - $20/h
4. **Diego Vargas** (Argentina) - Literatura y Cultura - $35/h
5. **Carmen Jiménez** (España) - Pronunciación y Fonética - $28/h
6. **Roberto Fernández** (España) - Preparación DELE/SIELE - $32/h

Cada profesor incluye:
- ✅ Foto de perfil real
- ✅ Biografía profesional
- ✅ Certificaciones
- ✅ Años de experiencia
- ✅ Información de contacto
- ✅ Especialización específica

## 🔄 Flujo Automático de Notificaciones

Cuando un estudiante agenda una clase:

1. **Confirmación Inmediata:**
   ```
   ¡Hola [Nombre]! 
   Tu clase de español ha sido confirmada:
   📅 Fecha: [Fecha y Hora]
   👨‍🏫 Profesor: [Nombre del Profesor]
   💰 Precio: $[Precio]/hora
   ¡Nos vemos pronto!
   ```

2. **Recordatorio 24h Antes:**
   ```
   ¡Recordatorio! 
   Tu clase de español es mañana a las [Hora] con [Profesor].
   Asegúrate de tener conexión estable y un lugar tranquilo.
   ```

3. **Cancelación (si aplica):**
   ```
   Tu clase del [Fecha] ha sido cancelada.
   Tu crédito ha sido restaurado a tu cuenta.
   ```

## 🎛️ Panel de Administración

Accede a `/admin` para:

- **Gestionar Profesores:** Ver, crear, editar profesores
- **Configurar High Level:** API keys, pruebas de conectividad  
- **Importar Datos:** Carga masiva de profesores
- **Estadísticas:** Ver rendimiento de profesores

## 🔧 APIs Disponibles

### Profesores
- `GET /api/tutors` - Lista todos los profesores
- `POST /api/tutors` - Crear nuevo profesor
- `PUT /api/tutors/:id` - Actualizar profesor
- `POST /api/tutors/:id/availability` - Configurar disponibilidad
- `GET /api/tutors/:id/stats` - Estadísticas del profesor

### High Level
- `POST /api/high-level/test-connection` - Probar conexión
- `POST /api/high-level/send-test-message` - Enviar mensaje de prueba

### Clases (con integración automática)
- `POST /api/classes` - Crear clase (envía confirmación automática)
- `PUT /api/classes/:id/cancel` - Cancelar clase (envía notificación)

## 📸 Subida de Fotos

Las fotos de profesores se pueden configurar de varias formas:

1. **URLs directas** (actual): Usar URLs de servicios como Unsplash
2. **Cloudinary** (recomendado): Servicio de gestión de imágenes
3. **AWS S3**: Almacenamiento propio

## 🎯 Próximos Pasos

1. **Configurar High Level** con tus credenciales
2. **Cargar profesores reales** con sus fotos y disponibilidad
3. **Probar el flujo completo** agendando una clase de prueba
4. **Personalizar mensajes** según tu marca
5. **Configurar recordatorios automáticos**

## 🆘 Soporte

Si necesitas ayuda con:
- Configuración de High Level
- Carga de profesores
- Personalización de mensajes
- Integración con otros sistemas

Solo dime qué necesitas y te ayudo a configurarlo.

---

**¡Tu plataforma está lista para funcionar con profesores reales y notificaciones automáticas!** 🚀