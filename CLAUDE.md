# Passport2Fluency — Portal

## Descripción
Plataforma SaaS de aprendizaje de idiomas (español/inglés) donde estudiantes reservan clases con tutores en vivo, practican con un AI partner ("Lingo"), y siguen un learning path gamificado.

## Stack Técnico
- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query + Wouter + Framer Motion
- **Backend:** Node.js + Express + TypeScript
- **Base de datos:** PostgreSQL + Drizzle ORM
- **Auth:** express-session + bcryptjs + Google OAuth + Microsoft OAuth
- **Pagos:** Stripe (suscripciones + one-time purchases)
- **AI:** Anthropic Claude API (AI practice partner "Lingo")
- **Video llamadas:** Google Meet (con fallback a Jitsi)
- **Emails:** Resend
- **Deploy:** Replit

## Usuarios y Roles
- **student:** reserva clases, practica con IA, sigue learning path, compra paquetes
- **tutor:** ve su agenda, gestiona clases, da feedback a estudiantes
- **admin:** gestiona tutores, estudiantes, suscripciones, analytics

## Páginas Principales
- `/` → redirect según rol
- `/dashboard` → dashboard del estudiante (clases, progreso, stats)
- `/tutors` → catálogo de tutores
- `/tutor/:id` → perfil del tutor + reservar clase
- `/ai-practice` → chat con Lingo (AI partner)
- `/learning-path` → snake path gamificado con stations por nivel
- `/packages` → planes de suscripción
- `/checkout` → pago con Stripe
- `/admin` → panel de administración
- `/tutor-portal` → dashboard del tutor
- `/join` → activación de cuenta de tutor (via invite link)
- `/profile`, `/settings`, `/messages`, `/support`, `/guide`

## Estructura de Carpetas
```
client/src/
  components/    → componentes reutilizables
  pages/         → una página por ruta
  lib/           → auth, queryClient, i18n, currency, websocket
server/
  routes/        → un archivo por dominio (auth, tutors, classes, etc.)
  services/      → lógica de negocio (stripe, AI, calendar, email)
  storage.ts     → interface IStorage + MemStorage (desarrollo)
  storage-database.ts → DatabaseStorage (producción con Drizzle)
shared/
  schema.ts      → tablas Drizzle + tipos TypeScript
```

## Modelo de Negocio
- Tipo: SaaS con suscripción mensual
- Planes: Basic / Standard / Premium (por cantidad de clases al mes)
- One-time: paquetes de clases individuales
- Moneda principal: USD (soporte COP y MXN para display)
- Los tutores son contratados por P2F — no hay self-registration, se activan via invite link del admin

## Internacionalización
- Soporte ES/EN en toda la UI
- Hook `useTranslation()` en `/client/src/lib/i18n.ts`
- Siempre agregar traducciones en ambos idiomas al crear strings de UI

## Convenciones de Código
- TypeScript estricto — nunca usar `any`
- Mobile-first en todos los componentes (Tailwind responsive: base → sm → md → lg)
- Mutations con TanStack Query `useMutation` + `queryClient.invalidateQueries` para refetch
- Nunca fetch directo en componentes — siempre `useQuery` / `useMutation`
- API routes en `/api/...` — siempre validar con zod
- Errores de API: `res.status(4xx/5xx).json({ message: "..." })`
- Sessions: `req.session.userId` para auth en cada request
- Admin routes protegidas con `requireAdmin` middleware
- Tutor routes protegidas con `requireTutor` middleware

## Integraciones Externas Configuradas
- **Stripe:** suscripciones + webhooks en `/api/stripe/webhook`
- **Google OAuth:** `/api/auth/google`
- **Microsoft OAuth:** `/api/auth/microsoft`
- **Google Meet:** creación automática de links al reservar clase
- **Anthropic Claude:** AI practice partner en `/api/ai/`
- **Resend:** emails transaccionales (verificación, confirmación de clase)

## Gamificación (Learning Path)
- Snake path visual con stations por nivel (A1 → A2 → B1 → B2)
- Cada station tiene: quizzes, flashcards, speaking prompts, AI scenarios
- Sistema de XP, niveles, logros (achievements)
- Principio "Make It Stick": retrieval practice, spaced repetition

## Reglas de Negocio Importantes
- Un estudiante solo puede tener una suscripción activa a la vez
- Las clases se cancelan con mínimo 24h de anticipación
- Los tutores pueden enseñar múltiples tipos (adults/kids) e idiomas (spanish/english) — arrays
- El invite link de tutor expira en 30 días y es de un solo uso
- El AI partner "Lingo" mantiene conversación en el idioma objetivo del estudiante

## Lo que NO hacer
- No usar Redux (usamos TanStack Query para estado del servidor)
- No crear archivos README.md ni documentación extra
- No instalar librerías nuevas sin preguntar primero
- No hacer `git push` sin que el usuario lo pida explícitamente
- No romper mobile-first
- No hardcodear strings de UI — usar el sistema i18n
- No usar `eq()` de Drizzle en columnas `text[]` — usar `sql\`col @> ARRAY[val]::text[]\``

## Variables de Entorno Necesarias
```
DATABASE_URL
SESSION_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET
ANTHROPIC_API_KEY
RESEND_API_KEY
GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET
```
