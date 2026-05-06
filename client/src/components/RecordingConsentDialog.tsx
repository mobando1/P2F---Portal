import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Video, FileText, Lock, Trash2 } from "lucide-react";

export interface RecordingConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId?: number;
  scope?: "class" | "global";
  onAccepted: () => void;
}

/**
 * Modal that asks the student/tutor to accept recording + transcription
 * before they can join a recorded class. Backed by /api/recording-consent.
 *
 * Wire it on the "Join class" button: if hasUserConsented returns false for
 * the (userId, classId) pair, render this modal first; only call the actual
 * join handler in onAccepted.
 */
export function RecordingConsentDialog({
  open,
  onOpenChange,
  classId,
  scope = "class",
  onAccepted,
}: RecordingConsentDialogProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/recording-consent", { classId, scope });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recording-consent/status", classId] });
      onOpenChange(false);
      onAccepted();
    },
    onError: () => {
      toast({
        title: "Error",
        description: isEs ? "No pudimos guardar tu aceptación. Inténtalo de nuevo." : "Could not save your acceptance. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-[#1C7BB1]" />
            {isEs ? "Grabación y transcripción de la clase" : "Class recording & transcription"}
          </DialogTitle>
          <DialogDescription>
            {isEs
              ? "Antes de unirte, necesitamos tu consentimiento explícito para grabar y procesar la clase con IA."
              : "Before you join, we need your explicit consent to record and process the class with AI."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="flex gap-3">
            <Video className="w-5 h-5 text-[#1C7BB1] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#0A4A6E]">
                {isEs ? "Lo que grabamos" : "What we record"}
              </p>
              <p className="text-gray-600">
                {isEs
                  ? "Audio y video de toda la clase (tutor + estudiante)."
                  : "Audio and video of the full class (tutor + student)."}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <FileText className="w-5 h-5 text-[#1C7BB1] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#0A4A6E]">
                {isEs ? "Cómo lo usamos" : "How we use it"}
              </p>
              <p className="text-gray-600">
                {isEs
                  ? "Generamos automáticamente un resumen, vocabulario, errores corregidos y tareas. Solo tú y tu tutor lo pueden ver."
                  : "We automatically generate a summary, vocabulary, corrected errors, and homework. Only you and your tutor can see it."}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Lock className="w-5 h-5 text-[#1C7BB1] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#0A4A6E]">
                {isEs ? "Privacidad" : "Privacy"}
              </p>
              <p className="text-gray-600">
                {isEs
                  ? "Almacenamiento cifrado. Los proveedores de IA (Anthropic, OpenAI) no usan tus datos para entrenar modelos."
                  : "Encrypted storage. AI providers (Anthropic, OpenAI) do not train models on your data."}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Trash2 className="w-5 h-5 text-[#1C7BB1] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#0A4A6E]">
                {isEs ? "Tu derecho a borrar" : "Your right to deletion"}
              </p>
              <p className="text-gray-600">
                {isEs
                  ? "Puedes pedir borrar la grabación en cualquier momento desde Configuración. La transcripción y el resumen se borran junto con ella."
                  : "You can request deletion of the recording any time from Settings. The transcript and summary are deleted with it."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
          <Checkbox
            id="consent-checkbox"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
          />
          <label htmlFor="consent-checkbox" className="text-sm text-[#0A4A6E] cursor-pointer leading-snug">
            {isEs
              ? "Acepto que esta clase sea grabada y procesada con IA según se describe arriba. Entiendo que puedo retirar mi consentimiento en clases futuras desde Configuración."
              : "I agree to this class being recorded and processed with AI as described above. I understand I can withdraw consent for future classes from Settings."}
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={acceptMutation.isPending}>
            {isEs ? "Cancelar" : "Cancel"}
          </Button>
          <Button
            onClick={() => acceptMutation.mutate()}
            disabled={!agreed || acceptMutation.isPending}
            className="bg-[#1C7BB1] hover:bg-[#0A4A6E]"
          >
            {acceptMutation.isPending
              ? (isEs ? "Guardando…" : "Saving…")
              : (isEs ? "Acepto y entrar a clase" : "Accept and join class")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
