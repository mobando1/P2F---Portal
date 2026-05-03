# Observabilidad — Setup inicial (Fase 0)

Este doc te guía a activar Sentry (errores) y Better Stack (logs + uptime) en tu Railway deployment. Todo es free tier, costo $0.

Sin esto, cuando algo falla en producción no sabes ni qué pasó ni dónde — debugear LiveKit y la IA sin observabilidad es imposible. Por eso esto va antes que todo.

---

## 1. Sentry — captura de errores backend + frontend (15 min)

### Crear cuenta
1. Entra a https://sentry.io/signup/ con tu email (mateo@passport2fluency.com).
2. Selecciona plan **Developer (free)** — incluye 5K eventos/mes, suficiente.
3. Cuando pregunte "What's your team size?", responde 1.

### Crear los dos proyectos
4. Click "Create Project" → selecciona **Node.js** → nombre `p2f-backend` → "Create Project".
5. Copia el **DSN** que te muestra (algo tipo `https://abc123@o4506...ingest.us.sentry.io/4506...`).
6. Repite para frontend: "Create Project" → **React** → nombre `p2f-frontend` → copia el DSN.

### Configurar en Railway
7. Entra a https://railway.app → tu proyecto P2F-Portal → **Variables**.
8. Agrega estas dos variables:
   - `SENTRY_DSN` = el DSN del proyecto backend.
   - `VITE_SENTRY_DSN` = el DSN del proyecto frontend.
9. Click "Deploy" para que Railway re-deploye con los env vars nuevos.

### Verificar
10. Una vez desplegado, abre el portal en browser.
11. En Sentry → tu proyecto frontend → Issues → debería aparecer el primer evento si hay cualquier error en navegación.
12. Para forzar un test: en la consola del navegador escribe `throw new Error("sentry test")` → recarga Sentry → debería aparecer.

---

## 2. Better Stack — logs estructurados + uptime monitor (10 min)

### Crear cuenta
1. Entra a https://betterstack.com/users/sign-up → registrate.
2. En el dashboard hay dos productos: **Logs** (antes Logflare) y **Uptime**.

### Logs (opcional, deja para después si quieres)
3. Por ahora los logs Pino van a stdout y Railway los muestra en su dashboard. Suficiente.
4. Cuando quieras búsqueda + retención larga: en Better Stack → **Logs** → "Add Source" → Heroku/Railway syslog → te da un endpoint y un token.
5. Agregar a Railway: `LOGTAIL_SOURCE_TOKEN` = el token. Próxima iteración cableamos pino-logtail.

### Uptime monitor (sí hazlo ahora — 5 min)
6. En Better Stack → **Uptime** → "Create Monitor".
7. **URL:** `https://portal.passport2fluency.com/api/health` (o tu URL de Railway si todavía no está el dominio).
8. **Check frequency:** 3 minutes (free tier permite).
9. **Expected status code:** 200.
10. **Request timeout:** 30 seconds.
11. **Notifications:** activar email a mateo@passport2fluency.com. Opcionalmente Slack.
12. Save.

Ahora si el server cae o el DB se desconecta, te llega email en <3 min.

---

## 3. Verificar que todo está bien

Visita `https://portal.passport2fluency.com/api/health` — debes ver algo como:

```json
{
  "status": "ok",
  "storage": "database",
  "db": { "status": "ok", "latencyMs": 12 },
  "uptimeSeconds": 1834,
  "responseTimeMs": 14,
  "timestamp": "2026-05-02T15:30:00.000Z",
  "commit": "013e4b2"
}
```

Si `db.status` es `unreachable` o el endpoint devuelve 503, hay problema de conexión a Postgres.

---

## 4. Cómo usar el logger desde código

En cualquier handler de Express, `req.log` ya está disponible y trae el `traceId`:

```ts
app.post("/api/algo", (req, res) => {
  req.log.info({ userId: req.session.userId, action: "do_thing" }, "User did thing");
  // si algo falla:
  req.log.error({ err }, "Could not do thing");
});
```

Fuera de un request (cron, worker), importa el logger global:

```ts
import { logger } from "../services/logger";
logger.info({ jobId: 42 }, "Cron sweep started");
```

**No uses `console.log` para nada nuevo.** Los logs estructurados son indexables en Logflare/Better Stack y se pueden filtrar por `userId`, `traceId`, etc. Los `console.log` legacy del codebase se migrarán progresivamente.

---

## Costos

| Servicio | Plan | Costo | Cap |
|---|---|---|---|
| Sentry | Developer | $0 | 5K errores/mes, 10K replays/mes |
| Better Stack Uptime | Free | $0 | 10 monitors, check cada 3 min |
| Better Stack Logs | Free | $0 | 1 GB/mes ingesta, 3 días retención |

Cuando crezcas y satures alguno → upgrade. Mínimo 6-12 meses de operación normal sin pagar.

---

## Próximos pasos de Fase 0

Después de esto vienen, en este orden:

1. ✅ **Observabilidad** (este doc)
2. ⏳ Cost guard de IA (tabla `ai_usage` + helper `assertWithinBudget`)
3. ⏳ Eval suite mínima de IA (5 transcripciones gold + script `npm run eval-ai`)
4. ⏳ Feature flags en DB (tabla + helper `isEnabled`)
5. ⏳ Consentimiento de grabación (tabla `recording_consents` + modal UI)
6. ⏳ Runbook (`RUNBOOKS.md` con pasos para fallas comunes)

Con eso completo, arrancamos LiveKit (Fase 1).
