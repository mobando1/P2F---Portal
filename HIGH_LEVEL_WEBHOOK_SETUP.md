# Configuración de Webhook en High Level

## 📋 Pasos para Configurar la Automatización

### 1. Crear Nueva Automatización
1. Ve a **Automatización** → **Workflows**
2. Haz clic en **"New Workflow"**
3. Nómbrala: **"Clase Completada - Portal Sync"**

### 2. Configurar el Trigger
**Trigger**: Appointment Status
- **Tipo**: "Appointment Status"
- **Condición**: "Changes to" → **"Completed"**
- **Calendario**: Seleccionar calendarios de todos los profesores

### 3. Configurar la Acción Webhook
**Action**: Webhook
- **Action Name**: "Portal Sync"
- **Method**: **POST**
- **URL**: `https://tu-portal.replit.app/api/high-level/webhook`

### 4. Custom Data (JSON)
Copiar exactamente este JSON en el campo Custom Data:

```json
{
  "appointmentId": "{{appointment.id}}",
  "contactId": "{{contact.id}}",
  "status": "completed",
  "appointmentTitle": "{{appointment.title}}",
  "startTime": "{{appointment.start_time}}",
  "endTime": "{{appointment.end_time}}",
  "calendarId": "{{appointment.calendar_id}}",
  "studentEmail": "{{contact.email}}",
  "studentName": "{{contact.first_name}} {{contact.last_name}}",
  "studentPhone": "{{contact.phone}}",
  "timestamp": "{{current_timestamp}}"
}
```

### 5. Headers (Opcional pero Recomendado)
```
Content-Type: application/json
X-High-Level-Source: appointment-completed
```

## 🎯 Automatización Adicional para Cancelaciones

### Crear Segunda Automatización
**Nombre**: "Clase Cancelada - Portal Sync"

**Trigger**: Appointment Status
- **Condición**: "Changes to" → **"Cancelled"**

**Custom Data**:
```json
{
  "appointmentId": "{{appointment.id}}",
  "contactId": "{{contact.id}}",
  "status": "cancelled",
  "appointmentTitle": "{{appointment.title}}",
  "cancelledAt": "{{current_timestamp}}",
  "studentEmail": "{{contact.email}}",
  "reason": "Cancelled in High Level"
}
```

## 🔧 Configuración de Calendarios de Profesores

### Mapeo de Profesores (Para Configurar)
Necesitas proporcionar los Calendar IDs de cada profesor:

```
Carolina Perilla → Calendar ID: [PENDIENTE]
Evelyn Salcedo → Calendar ID: [PENDIENTE]  
Felipe Rodriguez → Calendar ID: [PENDIENTE]
Gloria Cardona → Calendar ID: [PENDIENTE]
Johanna Pacheco → Calendar ID: [PENDIENTE]
```

### Cómo Obtener Calendar IDs
1. Ve a **Calendarios** en High Level
2. Haz clic en cada calendario de profesor
3. Copia el ID que aparece en la URL o en la configuración

## 🧪 Prueba de la Integración

### Paso 1: Probar Webhook
1. Crea una cita de prueba en el calendario de un profesor
2. Marca la cita como "Completed" manualmente
3. Revisa los logs del portal para confirmar que llegó el webhook

### Paso 2: Verificar Descuento de Créditos
1. Crea un usuario de prueba con créditos
2. Agenda una clase para ese usuario
3. Marca como completada
4. Verifica que se descontó 1 crédito automáticamente

## 📊 Logs y Monitoreo

### En High Level
- Ve a **Execution Logs** en el workflow para ver si se ejecutó
- Verifica que no haya errores en el envío del webhook

### En el Portal
Los logs mostrarán:
```
📨 Webhook recibido de High Level: {...}
🔍 Buscando clase con appointmentId: abc123
✅ Clase 456 marcada como completada automáticamente
💳 Créditos actualizados: Juan Pérez - 8 → 7
📧 Notificación de completado enviada a juan@email.com
```

## 🔐 Seguridad (Opcional)

### Validar Origen del Webhook
Para mayor seguridad, puedes agregar un header secreto:

**En High Level (Headers)**:
```
X-Webhook-Secret: tu_secreto_aqui_123
```

**En el Portal**: Validar que el header coincida antes de procesar.

## ❗ Problemas Comunes

### Webhook no llega
- Verificar que la URL esté correcta y sea accesible
- Confirmar que el workflow esté **Publicado** (no en Draft)
- Revisar Execution Logs en High Level

### Créditos no se descuentan
- Verificar que el appointmentId esté llegando correctamente
- Confirmar que la clase existe en la base de datos
- Revisar logs del portal para errores

### Usuario no encontrado
- Asegurar que el contactId en High Level coincida con el usuario del portal
- Verificar que el usuario tenga créditos disponibles

## 🚀 URL del Webhook

**URL de Desarrollo**: `https://tu-repl-name.replit.app/api/high-level/webhook`
**URL de Producción**: `https://tu-dominio-custom.com/api/high-level/webhook`

¡Una vez configurado, el sistema será completamente automático! 🎉