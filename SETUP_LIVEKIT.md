# LiveKit + Recording — Setup inicial (Fase 1)

Después de este setup, el aula embebida estará lista pero **apagada con feature flag** (no afecta a usuarios reales hasta que tú la prendas).

Costo: **$0** mientras estés en LiveKit Cloud free (5,000 min/mes) + Cloudflare R2 free (10 GB).

---

## 1. LiveKit Cloud (10 min)

### Crear cuenta
1. Entra a https://cloud.livekit.io/signup → registrate con `info@passport2fluency.com`.
2. Plan **Build (free)** — 5,000 minutos de uso, 50 conexiones simultáneas. Más que suficiente para empezar.
3. Cuando pidas crear un proyecto: nombre `p2f-prod`, region **United States East** (latencia mejor para LATAM y US).

### Obtener credenciales
4. En el dashboard del proyecto → **Settings → Keys → Add Key**.
5. Te da:
   - **API Key** (empieza con `API...`)
   - **API Secret** (string largo)
   - **WebSocket URL** (algo como `wss://p2f-prod-xxxxx.livekit.cloud`)

### Configurar webhook
6. **Settings → Webhooks → Add Webhook**.
7. URL: `https://portal.passport2fluency.com/api/livekit/webhook`
8. Activar todos los eventos (participant_joined/left, room_started/finished, egress_*).
9. Save.

### Agregar env vars en Railway
10. Railway → tu proyecto → **Variables** → Add:

```
LIVEKIT_API_KEY=API...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://p2f-prod-xxxxx.livekit.cloud
LIVEKIT_HTTP_URL=https://p2f-prod-xxxxx.livekit.cloud
```

`LIVEKIT_HTTP_URL` es la misma URL pero con `https://` en lugar de `wss://`. Es necesaria para iniciar grabaciones.

11. Railway hace redeploy automático.

---

## 2. Cloudflare R2 para grabaciones (10 min)

### Crear bucket
1. https://dash.cloudflare.com/sign-up con `info@passport2fluency.com`.
2. Sidebar → **R2 Object Storage** → "Create bucket".
3. Name: `p2f-recordings`
4. Location: **Automatic**
5. Save.

### Crear API token
6. **R2 → Manage R2 API Tokens → Create API Token**.
7. Name: `p2f-recordings-token`
8. Permissions: **Object Read & Write**
9. Bucket: solo `p2f-recordings`
10. Save → te muestra **Access Key ID** y **Secret Access Key** **una sola vez** — copia los dos a tu password manager.

### Encontrar el endpoint
11. R2 → bucket `p2f-recordings` → **Settings**.
12. Copia el **S3 API endpoint** (algo como `https://<account_id>.r2.cloudflarestorage.com`).

### Env vars en Railway
13. Agregar:

```
R2_BUCKET=p2f-recordings
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
```

---

## 3. Verificar que todo arrancó

Después del redeploy:

```bash
curl https://portal.passport2fluency.com/api/livekit/config
```

Debería responder:

```json
{
  "url": "wss://p2f-prod-xxxxx.livekit.cloud",
  "configured": true,
  "recordingEnabled": true
}
```

Si `configured: false` → falta alguna env var de LiveKit.
Si `recordingEnabled: false` → falta alguna env var de R2 (LiveKit funciona pero sin grabar).

---

## 4. Habilitar el aula para tu cuenta primero

LiveKit está integrado pero **apagado por feature flag**. Para probarlo:

1. Login al portal como admin.
2. Admin → **Flags** tab.
3. Crea flag con key `livekit_classroom`, description "Embedded LiveKit classroom".
4. Toggle **Enabled** ON.
5. En **Forced user IDs**, escribe **tu user ID** (lo ves en el panel CRM o en `/api/auth/me`). Save.

Eso te activa el aula solo a ti, sin afectar a nadie más.

---

## 5. Test end-to-end

1. Agenda una clase con cualquier tutor (puede ser una clase de prueba).
2. Espera a que falten <30 min para empezarla (o hackea la fecha en DB para acelerarlo).
3. Botón **"Unirse"** te lleva a `/classroom/<id>/preflight`.
4. Pasa la prueba de equipo (cam/mic/internet) → click "Entrar a clase".
5. Modal de consentimiento aparece → acepta.
6. Te conecta al aula con video LiveKit.
7. En otro browser/device, login como el tutor de esa clase y haz lo mismo.
8. Ambos se ven, audio funciona, grabación arranca automáticamente cuando ambos están dentro.
9. Termina la clase (cuelga).
10. Espera 1-2 min → recarga la fila de la clase en `/admin` → debe tener `recording_url` poblado.

---

## 6. Rollout gradual

Una vez probado contigo:

| Paso | Cambio en flag |
|---|---|
| Tu cuenta sola | `userOverrides: [tu user ID]`, `rolloutPercentage: 0` |
| 5% de usuarios | `rolloutPercentage: 5` |
| 25% | `rolloutPercentage: 25` |
| 100% | `rolloutPercentage: 100` |

Entre cada salto: revisa Sentry, AI Cost (no aplica a esta fase pero por hábito), y feedback de los usuarios afectados. Si algo se rompe → toggle Enabled OFF y vuelve a Meet inmediato.

---

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| Botón "Unirse" abre Meet en vez de LiveKit | Flag no aplica a tu user | Verifica en Flags tab |
| `/api/livekit/config` dice `configured: false` | Env vars mal nombradas | Revisa Railway → Variables |
| Video conecta pero no graba | R2 env vars mal | `recordingEnabled` debe ser `true` en `/api/livekit/config` |
| Webhook no llega | URL mal en LiveKit dashboard | Debe ser `https://portal.passport2fluency.com/api/livekit/webhook` exacto |
| `participant_joined` no actualiza DB | Webhook llegando pero erroreando | Sentry → busca "LiveKit webhook" |
| Error "Not a participant" al pedir token | El user logueado no es el estudiante ni el tutor de esa clase | Solo el dueño del classId puede entrar |
