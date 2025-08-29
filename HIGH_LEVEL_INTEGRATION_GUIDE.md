# Guía de Integración con High Level

## Resumen de la Integración

Esta guía explica cómo el portal Passport2Fluency se conecta automáticamente con High Level para gestionar calendarios, reservas de clases y seguimiento de asistencia.

## 🎯 Funcionalidades Implementadas

### 1. Gestión Automática de Contactos
- **Creación automática**: Cuando un usuario se registra o agenda una clase, se crea automáticamente un contacto en High Level
- **Sincronización bidireccional**: Los cambios en High Level se reflejan en el portal
- **Etiquetado inteligente**: Estudiantes y profesores se etiquetan automáticamente

### 2. Calendarios de Profesores Conectados
- **Disponibilidad en tiempo real**: Los calendarios de High Level se muestran directamente en el portal
- **Reservas instantáneas**: Al hacer clic en "Book a Class", se crea la cita directamente en High Level
- **Prevención de doble reserva**: El sistema verifica disponibilidad antes de confirmar

### 3. Notificaciones Automáticas Duales
- **Confirmación de reserva**: Se envía automáticamente al estudiante Y al profesor
- **Recordatorios 24h antes**: Programados automáticamente para ambas partes
- **Notificaciones de cancelación**: Informan inmediatamente a estudiante y profesor

### 4. Seguimiento de Asistencia Automático
- **Detección de asistencia**: Webhooks de High Level marcan automáticamente las clases como "completadas"
- **Cancelaciones automáticas**: Si se cancela en High Level, se actualiza automáticamente en el portal
- **Historial sincronizado**: Todo el historial de clases se mantiene actualizado

## 🔧 Configuración Técnica

### Variables de Entorno Requeridas
```
HIGH_LEVEL_API_KEY=tu_api_key_de_high_level
HIGH_LEVEL_LOCATION_ID=tu_location_id
```

### Endpoints del API

#### 1. Obtener Disponibilidad
```
GET /api/calendar/tutor/:tutorId/availability?date=2025-01-15
```
Retorna slots disponibles del calendario de High Level para el profesor.

#### 2. Agendar Clase
```
POST /api/calendar/book
{
  "userId": 1,
  "tutorId": 2,
  "date": "2025-01-15",
  "startTime": "10:00",
  "endTime": "11:00"
}
```
Crea la cita en High Level y envía confirmaciones automáticas.

#### 3. Webhook de High Level
```
POST /api/high-level/webhook
```
Recibe notificaciones de High Level sobre cambios en las citas.

## 🚀 Flujo Completo de una Reserva

### 1. Usuario Selecciona Profesor y Horario
- El portal consulta la disponibilidad del profesor en High Level
- Se muestran solo los horarios realmente disponibles

### 2. Usuario Confirma la Reserva
- Se crea el contacto en High Level (si no existe)
- Se agenda la cita en el calendario del profesor
- Se guarda la referencia local con `highLevelAppointmentId`

### 3. Notificaciones Automáticas
- **Al estudiante**: Confirmación con detalles del profesor y hora
- **Al profesor**: Notificación con datos del estudiante y clase

### 4. Recordatorios Programados
- Se programan automáticamente recordatorios 24h antes
- Ambas partes reciben recordatorios por SMS/email

### 5. Seguimiento de Asistencia
- Cuando la clase termina, High Level envía webhook
- El portal marca automáticamente la clase como "completada"
- Se actualiza el historial del estudiante

## 📱 Configuración en High Level

### 1. Configurar Webhooks
En High Level, configura estos webhooks:
- `appointment.created` → `https://tudominio.com/api/high-level/webhook`
- `appointment.completed` → `https://tudominio.com/api/high-level/webhook`
- `appointment.cancelled` → `https://tudominio.com/api/high-level/webhook`

### 2. Configurar Calendarios de Profesores
- Cada profesor debe tener su calendario configurado en High Level
- Los IDs de los calendarios deben coincider con los `highLevelContactId` en la base de datos

### 3. Plantillas de Mensajes (Opcional)
Puedes crear plantillas personalizadas en High Level para:
- Confirmaciones de reserva
- Recordatorios de clase
- Notificaciones de cancelación

## 🔍 Monitoreo y Debugging

### Logs del Sistema
El sistema registra todos los eventos importantes:
```
✅ Confirmación enviada al alumno: user@email.com
✅ Confirmación enviada al profesor: tutor@email.com
✅ Recordatorio programado para 2025-01-14 10:00
Clase 123 marcada como completada automáticamente
```

### Verificar Integración
1. **Probar creación de contacto**: Registra un usuario nuevo y verifica que aparezca en High Level
2. **Probar reserva**: Agenda una clase y verifica que aparezca en el calendario del profesor
3. **Probar webhooks**: Marca una cita como completada en High Level y verifica que se actualice en el portal

## 🛠️ Métodos Disponibles

### HighLevelService
- `createOrUpdateContact(user)` - Gestión de contactos
- `createAppointment(data)` - Crear citas
- `getCalendarAvailability(tutorId, date)` - Obtener disponibilidad
- `updateAppointmentStatus(appointmentId, status)` - Actualizar estado
- `sendBookingConfirmation(user, class, tutor)` - Enviar confirmaciones
- `sendClassReminder(user, class, tutor)` - Enviar recordatorios
- `sendClassCancellation(user, class, tutor)` - Enviar cancelaciones

### CalendarIntegrationService
- `getTutorAvailability(tutorId, date)` - Disponibilidad de profesor
- `bookClassWithTutor(userId, tutorId, date, startTime, endTime)` - Reservar clase
- `getAllTutorsAvailability(date)` - Disponibilidad de todos los profesores

## ✅ Beneficios de la Integración

1. **Automatización Completa**: Sin intervención manual para reservas y notificaciones
2. **Sincronización en Tiempo Real**: Los cambios se reflejan inmediatamente
3. **Prevención de Errores**: No hay dobles reservas ni conflictos de horario
4. **Experiencia del Usuario Mejorada**: Proceso fluido y profesional
5. **Seguimiento Automático**: Asistencia y cancelaciones se registran automáticamente
6. **Comunicación Dual**: Tanto estudiantes como profesores están siempre informados

## 🔧 Solución de Problemas

### Error: "Tutor not found or missing High Level contact ID"
- Verifica que el profesor tenga `highLevelContactId` configurado en la base de datos
- Asegúrate de que el ID corresponda al calendario correcto en High Level

### Error: "High Level API error: 401"
- Verifica que `HIGH_LEVEL_API_KEY` esté configurado correctamente
- Confirma que la API key tenga los permisos necesarios

### Las notificaciones no se envían
- Verifica que `HIGH_LEVEL_LOCATION_ID` esté configurado
- Confirma que las plantillas de mensajes estén configuradas en High Level

### Los webhooks no funcionan
- Verifica que la URL del webhook esté configurada correctamente en High Level
- Confirma que el endpoint esté accesible públicamente

## 📞 Soporte
Para soporte adicional, contacta al equipo de desarrollo con:
- Logs específicos del error
- Pasos para reproducir el problema
- Información del entorno (desarrollo/producción)