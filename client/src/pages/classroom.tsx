import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useLanguage } from "@/lib/i18n";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecordingConsentDialog } from "@/components/RecordingConsentDialog";
import { Loader2, AlertCircle, Video, Mic, Wifi } from "lucide-react";

interface StatusResp {
  livekitAvailable: boolean;
  livekitConfigured: boolean;
  flagEnabled: boolean;
  recordingEnabled: boolean;
  consented: boolean;
  fallbackMeetingLink: string | null;
  role: "tutor" | "student";
}

interface TokenResp {
  token: string;
  url: string;
  roomName: string;
}

export default function ClassroomPage() {
  const [, params] = useRoute("/classroom/:id");
  const [, setLocation] = useLocation();
  const classId = params?.id ? parseInt(params.id) : null;
  const { language } = useLanguage();
  const isEs = language === "es";
  const user = getCurrentUser();
  const [showConsent, setShowConsent] = useState(false);
  const [token, setToken] = useState<TokenResp | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<StatusResp>({
    queryKey: [`/api/livekit/status/${classId}`],
    enabled: !!classId && isAuthenticated(),
  });

  // Once status says we're good (flag on, configured, consented), grab token.
  useEffect(() => {
    if (!status || !classId) return;
    if (!status.livekitAvailable) return;
    if (status.recordingEnabled && !status.consented) {
      setShowConsent(true);
      return;
    }
    (async () => {
      try {
        const res = await apiRequest("POST", `/api/livekit/token/${classId}`, {});
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setTokenError(body.message || "Could not get token");
          return;
        }
        const data = await res.json();
        setToken(data);
      } catch (err: any) {
        setTokenError(err.message || "Network error");
      }
    })();
  }, [status, classId]);

  if (!isAuthenticated() || !user) {
    setLocation("/login");
    return null;
  }
  if (!classId) {
    return <div className="p-8 text-center">{isEs ? "Clase no encontrada" : "Class not found"}</div>;
  }

  // Fallback path — LiveKit not enabled for this user, redirect to Meet link
  if (status && !status.livekitAvailable) {
    return (
      <FallbackToMeet
        meetingLink={status.fallbackMeetingLink}
        reason={!status.flagEnabled ? "flag_off" : "not_configured"}
        isEs={isEs}
        onBack={() => setLocation("/dashboard")}
      />
    );
  }

  if (statusLoading || (!token && !tokenError && status?.livekitAvailable && !showConsent)) {
    return <CenteredLoader text={isEs ? "Conectando a la clase…" : "Connecting to class…"} />;
  }

  if (tokenError) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardContent className="p-6 space-y-3 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-[#0A4A6E]">{isEs ? "No pudimos conectar" : "Could not connect"}</h2>
          <p className="text-sm text-gray-600">{tokenError}</p>
          {status?.fallbackMeetingLink && (
            <Button asChild className="bg-[#1C7BB1] hover:bg-[#0A4A6E]">
              <a href={status.fallbackMeetingLink} target="_blank" rel="noreferrer">
                {isEs ? "Abrir Google Meet (respaldo)" : "Open Google Meet (fallback)"}
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={() => setLocation("/dashboard")}>
            {isEs ? "Volver" : "Back"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <RecordingConsentDialog
        open={showConsent}
        onOpenChange={setShowConsent}
        classId={classId}
        scope="class"
        onAccepted={() => {
          setShowConsent(false);
          refetchStatus();
        }}
      />
      {token && (
        <div className="h-screen w-screen bg-[#0A4A6E]" data-lk-theme="default">
          <LiveKitRoom
            token={token.token}
            serverUrl={token.url}
            connect={true}
            onDisconnected={() => setLocation("/dashboard")}
            video={true}
            audio={true}
          >
            <VideoConference />
            <RoomAudioRenderer />
            <ControlBar />
          </LiveKitRoom>
        </div>
      )}
    </>
  );
}

function CenteredLoader({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F9FA] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-[#1C7BB1]" />
      <p className="text-[#0A4A6E]">{text}</p>
    </div>
  );
}

function FallbackToMeet({
  meetingLink, reason, isEs, onBack,
}: { meetingLink: string | null; reason: "flag_off" | "not_configured"; isEs: boolean; onBack: () => void }) {
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    if (meetingLink) {
      setOpening(true);
      const timer = setTimeout(() => window.location.href = meetingLink, 1500);
      return () => clearTimeout(timer);
    }
  }, [meetingLink]);

  return (
    <Card className="max-w-lg mx-auto mt-16">
      <CardContent className="p-6 space-y-4 text-center">
        <Video className="w-12 h-12 text-[#1C7BB1] mx-auto" />
        <h2 className="text-xl font-bold text-[#0A4A6E]">
          {opening
            ? (isEs ? "Abriendo Google Meet…" : "Opening Google Meet…")
            : (isEs ? "Aula nueva no disponible" : "New classroom not available")}
        </h2>
        <p className="text-sm text-gray-600">
          {reason === "flag_off"
            ? (isEs ? "Tu cuenta todavía no tiene activada el aula integrada. Te llevamos al link de Google Meet." : "Your account doesn't have the embedded classroom yet. Redirecting to Google Meet.")
            : (isEs ? "El aula integrada no está disponible ahora. Usaremos Google Meet." : "Embedded classroom unavailable. Using Google Meet.")}
        </p>
        {meetingLink ? (
          <Button asChild className="bg-[#1C7BB1] hover:bg-[#0A4A6E]">
            <a href={meetingLink} target="_blank" rel="noreferrer">
              {isEs ? "Abrir clase en Google Meet" : "Open class in Google Meet"}
            </a>
          </Button>
        ) : (
          <p className="text-sm text-red-600">{isEs ? "No hay link de respaldo. Contacta soporte." : "No fallback link. Contact support."}</p>
        )}
        <Button variant="outline" onClick={onBack}>{isEs ? "Volver al dashboard" : "Back to dashboard"}</Button>
      </CardContent>
    </Card>
  );
}

/**
 * Pre-flight check that runs before the user actually clicks "Join". Tests
 * camera, mic, and a rough internet bandwidth gauge. Exposed as a separate
 * page (/classroom/:id/preflight) wired from the dashboard "Join" button so
 * users can validate their setup 5 min before class without committing.
 */
export function PreflightCheck() {
  const [, params] = useRoute("/classroom/:id/preflight");
  const [, setLocation] = useLocation();
  const classId = params?.id;
  const { language } = useLanguage();
  const isEs = language === "es";
  const [camOk, setCamOk] = useState<null | boolean>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [micOk, setMicOk] = useState<null | boolean>(null);
  const [latencyMs, setLatencyMs] = useState<null | number>(null);
  const [running, setRunning] = useState(false);

  const runChecks = async () => {
    setRunning(true);
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const tracks = stream.getTracks();
      setCamOk(tracks.some(t => t.kind === "video" && t.readyState === "live"));
      setMicOk(tracks.some(t => t.kind === "audio" && t.readyState === "live"));
      tracks.forEach(t => t.stop());
    } catch (err: any) {
      setCamOk(false);
      setMicOk(false);
      // Distinguish denied vs no-device vs other so the user knows what to fix.
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCamError(isEs ? "Permisos rechazados — habilita cámara y mic en tu navegador" : "Permission denied — enable camera and mic in your browser");
      } else if (err?.name === "NotFoundError") {
        setCamError(isEs ? "No se detectó cámara o micrófono" : "No camera or microphone detected");
      } else {
        setCamError(isEs ? "No se pudo acceder al equipo" : "Could not access devices");
      }
    }
    // Honest network check: 3 sequential pings to /api/health, take the median.
    // We report latency, not "Mbps", because we can't reliably estimate
    // throughput from a 250-byte response.
    try {
      const samples: number[] = [];
      for (let i = 0; i < 3; i++) {
        const t0 = performance.now();
        await fetch("/api/health", { cache: "no-store" }).then(r => r.text());
        samples.push(performance.now() - t0);
      }
      samples.sort((a, b) => a - b);
      setLatencyMs(Math.round(samples[1])); // median
    } catch {
      setLatencyMs(null);
    }
    setRunning(false);
  };

  useEffect(() => { runChecks(); }, []);

  const networkOk = latencyMs !== null && latencyMs < 800;
  const allOk = camOk && micOk && networkOk;

  return (
    <div className="max-w-lg mx-auto mt-16 p-4">
      <Card>
        <CardContent className="p-6 space-y-5">
          <h2 className="text-xl font-bold text-[#0A4A6E] text-center">
            {isEs ? "Prueba de equipo" : "Equipment check"}
          </h2>
          <p className="text-sm text-gray-600 text-center">
            {isEs ? "Verificamos cámara, micrófono y conexión antes de tu clase." : "Checking camera, microphone, and connection before your class."}
          </p>

          <CheckRow icon={<Video className="w-5 h-5" />} label={isEs ? "Cámara" : "Camera"} state={camOk} />
          <CheckRow icon={<Mic className="w-5 h-5" />} label={isEs ? "Micrófono" : "Microphone"} state={micOk} />
          <CheckRow
            icon={<Wifi className="w-5 h-5" />}
            label={isEs ? "Latencia" : "Latency"}
            state={latencyMs === null ? null : latencyMs < 800}
            detail={latencyMs !== null
              ? (latencyMs < 200 ? `${latencyMs}ms (${isEs ? "excelente" : "excellent"})`
                : latencyMs < 500 ? `${latencyMs}ms (${isEs ? "buena" : "good"})`
                : latencyMs < 800 ? `${latencyMs}ms (${isEs ? "aceptable" : "fair"})`
                : `${latencyMs}ms (${isEs ? "alta" : "high"})`)
              : undefined}
          />
          {camError && (
            <p className="text-xs text-red-600 text-center">{camError}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={runChecks} disabled={running} className="flex-1">
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isEs ? "Re-probar" : "Re-test"}
            </Button>
            <Button
              onClick={() => setLocation(`/classroom/${classId}`)}
              disabled={!allOk}
              className="bg-[#1C7BB1] hover:bg-[#0A4A6E] flex-1"
            >
              {isEs ? "Entrar a clase" : "Join class"}
            </Button>
          </div>
          {!allOk && !running && (
            <p className="text-xs text-orange-600 text-center">
              {isEs ? "Resuelve los problemas antes de entrar para evitar cortes en la clase." : "Resolve issues before joining to avoid class interruptions."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CheckRow({ icon, label, state, detail }: { icon: React.ReactNode; label: string; state: null | boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="text-[#1C7BB1]">{icon}</div>
        <span className="font-medium text-[#0A4A6E]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {detail && <span className="text-xs text-gray-500">{detail}</span>}
        {state === null ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          : state ? <span className="text-emerald-500 font-bold">✓</span>
          : <span className="text-red-500 font-bold">✗</span>}
      </div>
    </div>
  );
}
