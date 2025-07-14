# Sistema de Calendarios Integrado - Guía de Implementación

## Arquitectura Recomendada

### 1. Sistema Híbrido High Level + Portal

**Free Trial (Mantener actual)**
- High Level maneja automáticamente la asignación de profesor disponible
- Funciona bien para conversiones rápidas sin complejidad

**Usuarios Suscritos (Nuevo sistema)**
- Portal permite seleccionar profesor específico
- Cada profesor tiene su propio calendario en High Level
- Portal consulta disponibilidad en tiempo real via API
- Usuario ve slots disponibles y reserva directamente

## 2. Flujo de Reserva Optimizado

### Para Usuarios Suscritos:

1. **Selección de Profesor**: Usuario navega a página de tutores
2. **Clic en "Reservar Clase"**: Abre modal con calendario del tutor
3. **Selección de Fecha**: Muestra próximos 7 días disponibles
4. **Selección de Hora**: Slots de 1 hora desde 9 AM a 5 PM
5. **Confirmación**: Crea cita en High Level + registro en portal
6. **Notificaciones**: Automáticas para estudiante y profesor
7. **Recordatorios**: Programados 24h antes automáticamente

### Para Free Trial (Mantener actual):

1. **Formulario en Wix**: Captura información básica
2. **High Level**: Asigna automáticamente profesor disponible
3. **Confirmación**: Estándar via High Level
4. **Conversión**: Después del trial, dirige al portal para suscripción

## 3. Estructura de Datos

### Calendarios por Profesor
```
- Carolina Perilla: Calendario ID específico en High Level
- Evelyn Salcedo: Calendario ID específico en High Level
- Felipe Rodriguez: Calendario ID específico en High Level
- Gloria Cardona: Calendario ID específico en High Level
- Johanna Pacheco: Calendario ID específico en High Level
```

### Disponibilidad
```
- Lunes a Viernes: 9 AM - 5 PM
- Slots de 1 hora
- Zona horaria del profesor
- Exclusiones automáticas para clases ya reservadas
```

## 4. APIs Implementadas

### Consultar Disponibilidad
```
GET /api/calendar/tutor/:tutorId/availability?date=2025-01-15
```

### Reservar Clase
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

### Cancelar Clase
```
PUT /api/calendar/cancel/:classId
{
  "userId": 1
}
```

## 5. Ventajas del Sistema

### Para Estudiantes:
- Pueden elegir su profesor favorito
- Ven disponibilidad en tiempo real
- Reservan cuando les conviene
- Cancelación flexible (24h antes)

### Para Profesores:
- Controlan su propio calendario
- Notificaciones automáticas
- Menos conflictos de horarios
- Mejor preparación para clases

### Para Passport2Fluency:
- Mayor satisfacción del cliente
- Reducción de cancelaciones
- Mejor utilización de profesores
- Datos detallados de preferencias

## 6. Integración con High Level

### Configuración Requerida:
1. **Calendario por Profesor**: Cada profesor debe tener su propio calendario en High Level
2. **API Keys**: Para consultar disponibilidad y crear citas
3. **Webhooks**: Para sincronización en tiempo real
4. **Plantillas**: Para notificaciones automáticas

### Flujo de Sincronización:
1. **Portal → High Level**: Crear cita cuando usuario reserva
2. **High Level → Portal**: Actualizar disponibilidad via webhook
3. **Notificaciones**: Automáticas para ambas partes
4. **Recordatorios**: Programados 24h antes

## 7. Experiencia de Usuario

### Página de Tutores:
- Lista de profesores con especialidades
- Botón "Reservar Clase" para cada profesor
- Modal con calendario integrado
- Selección fácil de fecha y hora

### Dashboard del Usuario:
- Próximas clases reservadas
- Historial de clases
- Opción de cancelar (con restricciones)
- Créditos de clase restantes

## 8. Consideraciones Técnicas

### Rendimiento:
- Cache de disponibilidad por 15 minutos
- Consultas optimizadas a High Level
- Sincronización en tiempo real solo cuando necesario

### Escalabilidad:
- Soporte para agregar más profesores
- Zonas horarias múltiples
- Configuración flexible de horarios

### Seguridad:
- Validación de permisos de usuario
- Límites de cancelación
- Verificación de créditos disponibles

## 9. Próximos Pasos

1. **Configurar Calendarios**: Crear calendario individual para cada profesor en High Level
2. **Obtener API Keys**: Para integración completa
3. **Probar Sistema**: Con datos reales de disponibilidad
4. **Entrenar Profesores**: Sobre el nuevo sistema
5. **Migrar Usuarios**: Del sistema actual al nuevo

## 10. Métricas de Éxito

- **Reducción de cancelaciones**: Target 30%
- **Satisfacción del cliente**: Target 95%+
- **Utilización de profesores**: Target 80%+
- **Tiempo promedio de reserva**: Target <2 minutos

Esta implementación mantiene la simplicidad del free trial mientras proporciona una experiencia premium para usuarios suscritos, maximizando la satisfacción y retención de clientes.