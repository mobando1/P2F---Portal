import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, FileText, PenLine } from "lucide-react";

interface QuickSendDialogProps {
  userId: number;
  userName: string;
  userEmail: string;
  open: boolean;
  onClose: () => void;
}

interface Template {
  id: number;
  name: string;
  subject: string;
  body: string;
}

interface Offer {
  id: number;
  name: string;
}

export default function QuickSendDialog({
  userId,
  userName,
  userEmail,
  open,
  onClose,
}: QuickSendDialogProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"template" | "custom">("template");
  const [templateId, setTemplateId] = useState<string>("");
  const [offerId, setOfferId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["campaign-templates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/campaigns/templates");
      return res.json();
    },
    enabled: open,
  });

  const { data: offers = [] } = useQuery<Offer[]>({
    queryKey: ["campaign-offers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/campaigns/offers");
      return res.json();
    },
    enabled: open,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const payload =
        mode === "template"
          ? {
              templateId: Number(templateId),
              ...(offerId ? { offerId: Number(offerId) } : {}),
            }
          : { subject, body };

      const res = await apiRequest(
        "POST",
        `/api/admin/crm/${userId}/quick-send`,
        payload,
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: isEs ? "Mensaje enviado" : "Message sent",
        description: isEs
          ? `Mensaje enviado a ${userName}`
          : `Message sent to ${userName}`,
      });
      queryClient.invalidateQueries({
        queryKey: ["crm-communications", userId],
      });
      resetForm();
      onClose();
    },
    onError: () => {
      toast({
        title: isEs ? "Error" : "Error",
        description: isEs
          ? "No se pudo enviar el mensaje"
          : "Failed to send message",
        variant: "destructive",
      });
    },
  });

  function resetForm() {
    setMode("template");
    setTemplateId("");
    setOfferId("");
    setSubject("");
    setBody("");
  }

  const selectedTemplate = templates.find((t) => String(t.id) === templateId);

  const canSend =
    mode === "template"
      ? !!templateId
      : subject.trim() !== "" && body.trim() !== "";

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEs ? "Enviar a" : "Send to"} {userName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "template" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("template")}
              className="flex-1"
            >
              <FileText className="mr-2 h-4 w-4" />
              {isEs ? "Usar Plantilla" : "Use Template"}
            </Button>
            <Button
              type="button"
              variant={mode === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("custom")}
              className="flex-1"
            >
              <PenLine className="mr-2 h-4 w-4" />
              {isEs ? "Mensaje Personalizado" : "Custom Message"}
            </Button>
          </div>

          {mode === "template" ? (
            <>
              {/* Template select */}
              <div className="space-y-2">
                <Label>{isEs ? "Plantilla" : "Template"}</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isEs
                          ? "Seleccionar plantilla..."
                          : "Select a template..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Offer select (optional) */}
              <div className="space-y-2">
                <Label>
                  {isEs ? "Oferta (opcional)" : "Offer (optional)"}
                </Label>
                <Select value={offerId} onValueChange={setOfferId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isEs ? "Sin oferta" : "No offer"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {isEs ? "Sin oferta" : "No offer"}
                    </SelectItem>
                    {offers.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template preview */}
              {selectedTemplate && (
                <div className="rounded-md border bg-muted/50 p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {isEs ? "Vista previa" : "Preview"}
                  </p>
                  <p className="text-sm font-semibold">
                    {selectedTemplate.subject}
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTemplate.body}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Subject */}
              <div className="space-y-2">
                <Label>{isEs ? "Asunto" : "Subject"}</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={
                    isEs ? "Asunto del mensaje..." : "Message subject..."
                  }
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label>{isEs ? "Mensaje" : "Message"}</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={
                    isEs ? "Escribe tu mensaje..." : "Write your message..."
                  }
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  {isEs
                    ? "Puedes usar etiquetas de combinacion como {{name}}, {{email}}"
                    : "You can use merge tags like {{name}}, {{email}}"}
                </p>
              </div>
            </>
          )}

          {/* Send button */}
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!canSend || sendMutation.isPending}
            className="w-full"
          >
            {sendMutation.isPending ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {sendMutation.isPending
              ? isEs
                ? "Enviando..."
                : "Sending..."
              : isEs
                ? "Enviar Mensaje"
                : "Send Message"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
