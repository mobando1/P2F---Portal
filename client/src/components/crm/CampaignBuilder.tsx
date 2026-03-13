import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, ArrowRight, Send, Clock, Check } from "lucide-react";
import SegmentBuilder from "./SegmentBuilder";
import TemplateEditor from "./TemplateEditor";

interface CampaignBuilderProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface Segment {
  id: number;
  name: string;
  userCount: number;
}

interface Template {
  id: number;
  name: string;
  subject: string;
  body: string;
  channel: string;
}

interface Offer {
  id: number;
  name: string;
  code: string;
}

const STEPS = [
  { en: "Setup", es: "Configuracion" },
  { en: "Audience", es: "Audiencia" },
  { en: "Content", es: "Contenido" },
  { en: "Review & Send", es: "Revisar y Enviar" },
];

export default function CampaignBuilder({
  open,
  onClose,
  onCreated,
}: CampaignBuilderProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [showSegmentBuilder, setShowSegmentBuilder] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  const [form, setForm] = useState({
    name: "",
    channel: "email" as "email" | "sms",
    segmentId: "",
    templateId: "",
    subject: "",
    body: "",
    offerId: "",
  });

  const { data: segments = [] } = useQuery<Segment[]>({
    queryKey: ["/api/admin/campaigns/segments"],
    enabled: open,
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/admin/campaigns/templates"],
    enabled: open,
  });

  const { data: offers = [] } = useQuery<Offer[]>({
    queryKey: ["/api/admin/campaigns/offers"],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/campaigns", {
        name: form.name,
        channel: form.channel,
        segmentId: form.segmentId ? Number(form.segmentId) : null,
        templateId: form.templateId ? Number(form.templateId) : null,
        subject: form.subject,
        body: form.body,
        offerId: form.offerId ? Number(form.offerId) : null,
      }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setCreatedId(data.id);
    },
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/admin/campaigns/${createdId}/send`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      onCreated?.();
      handleClose();
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/admin/campaigns/${createdId}/send`, {
        scheduledAt: scheduleDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      onCreated?.();
      handleClose();
    },
  });

  function handleClose() {
    setStep(0);
    setCreatedId(null);
    setShowSegmentBuilder(false);
    setScheduleDate("");
    setForm({
      name: "",
      channel: "email",
      segmentId: "",
      templateId: "",
      subject: "",
      body: "",
      offerId: "",
    });
    onClose();
  }

  async function handleNext() {
    if (step === 2 && !createdId) {
      await createMutation.mutateAsync();
    }
    setStep((s) => Math.min(s + 1, 3));
  }

  const selectedSegment = segments.find(
    (s) => s.id === Number(form.segmentId)
  );
  const selectedTemplate = templates.find(
    (t) => t.id === Number(form.templateId)
  );
  const selectedOffer = offers.find((o) => o.id === Number(form.offerId));

  const canNext =
    (step === 0 && form.name.trim()) ||
    (step === 1 && form.segmentId) ||
    (step === 2 && (form.templateId || (form.subject && form.body))) ||
    step === 3;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEs ? "Crear Campana" : "Create Campaign"}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    i < step ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {isEs ? STEPS[step].es : STEPS[step].en}
        </p>

        <div className="space-y-4 py-2">
          {/* Step 0: Setup */}
          {step === 0 && (
            <>
              <div>
                <Label>{isEs ? "Nombre de la Campana" : "Campaign Name"}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={
                    isEs ? "Ej: Promo de Verano" : "e.g. Summer Promo"
                  }
                />
              </div>
              <div>
                <Label>{isEs ? "Canal" : "Channel"}</Label>
                <Select
                  value={form.channel}
                  onValueChange={(v) =>
                    setForm({ ...form, channel: v as "email" | "sms" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Step 1: Audience */}
          {step === 1 && (
            <>
              {!showSegmentBuilder ? (
                <>
                  <div>
                    <Label>{isEs ? "Segmento" : "Segment"}</Label>
                    <Select
                      value={form.segmentId}
                      onValueChange={(v) =>
                        setForm({ ...form, segmentId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isEs
                              ? "Seleccionar segmento"
                              : "Select a segment"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {segments.map((seg) => (
                          <SelectItem key={seg.id} value={String(seg.id)}>
                            {seg.name} ({seg.userCount})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedSegment && (
                    <p className="text-sm text-muted-foreground">
                      {isEs ? "Destinatarios estimados:" : "Estimated recipients:"}{" "}
                      <span className="font-medium">
                        {selectedSegment.userCount}
                      </span>
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSegmentBuilder(true)}
                  >
                    {isEs ? "Crear Nuevo Segmento" : "Create New Segment"}
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <SegmentBuilder
                    showSave
                    onSave={async (name, description, filters) => {
                      try {
                        const res = await apiRequest("POST", "/api/admin/campaigns/segments", { name, description, filters });
                        const segment = await res.json();
                        setForm({ ...form, segmentId: String(segment.id) });
                        setShowSegmentBuilder(false);
                        queryClient.invalidateQueries({
                          queryKey: ["/api/admin/campaigns/segments"],
                        });
                      } catch (e) {
                        console.error("Failed to create segment:", e);
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSegmentBuilder(false)}
                  >
                    {isEs ? "Cancelar" : "Cancel"}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Step 2: Content */}
          {step === 2 && (
            <>
              <div>
                <Label>{isEs ? "Plantilla" : "Template"}</Label>
                <Select
                  value={form.templateId}
                  onValueChange={(v) => {
                    const tpl = templates.find((t) => t.id === Number(v));
                    setForm({
                      ...form,
                      templateId: v,
                      subject: tpl?.subject || form.subject,
                      body: tpl?.body || form.body,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isEs ? "Seleccionar plantilla" : "Select a template"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      .filter(
                        (t) =>
                          t.channel === form.channel || t.channel === "both"
                      )
                      .map((tpl) => (
                        <SelectItem key={tpl.id} value={String(tpl.id)}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isEs ? "Asunto" : "Subject"}</Label>
                <Input
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  placeholder={
                    isEs ? "Asunto del mensaje" : "Message subject"
                  }
                />
              </div>
              <div>
                <Label>{isEs ? "Contenido" : "Body"}</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={5}
                  placeholder={
                    isEs ? "Escribe tu mensaje..." : "Write your message..."
                  }
                />
              </div>
              <div>
                <Label>
                  {isEs ? "Adjuntar Oferta (opcional)" : "Attach Offer (optional)"}
                </Label>
                <Select
                  value={form.offerId}
                  onValueChange={(v) => setForm({ ...form, offerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={isEs ? "Sin oferta" : "No offer"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {offers.map((offer) => (
                      <SelectItem key={offer.id} value={String(offer.id)}>
                        {offer.name} ({offer.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              {(form.subject || form.body) && (
                <div className="border rounded-md p-4 bg-muted/30 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    {isEs ? "Vista Previa" : "Preview"}
                  </p>
                  {form.subject && (
                    <p className="font-semibold text-sm">{form.subject}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{form.body}</p>
                  {selectedOffer && (
                    <Badge variant="secondary">
                      {isEs ? "Oferta:" : "Offer:"} {selectedOffer.code}
                    </Badge>
                  )}
                </div>
              )}
            </>
          )}

          {/* Step 3: Review & Send */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="border rounded-md p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {isEs ? "Campana" : "Campaign"}
                  </span>
                  <span className="text-sm font-medium">{form.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {isEs ? "Canal" : "Channel"}
                  </span>
                  <Badge variant="secondary">{form.channel}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {isEs ? "Segmento" : "Segment"}
                  </span>
                  <span className="text-sm font-medium">
                    {selectedSegment?.name || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {isEs ? "Destinatarios" : "Recipients"}
                  </span>
                  <span className="text-sm font-medium">
                    {selectedSegment?.userCount || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {isEs ? "Asunto" : "Subject"}
                  </span>
                  <span className="text-sm font-medium">{form.subject}</span>
                </div>
                {selectedOffer && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {isEs ? "Oferta" : "Offer"}
                    </span>
                    <Badge variant="secondary">{selectedOffer.code}</Badge>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending || !createdId}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {sendMutation.isPending
                    ? isEs
                      ? "Enviando..."
                      : "Sending..."
                    : isEs
                    ? "Enviar Ahora"
                    : "Send Now"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>{isEs ? "O programar para:" : "Or schedule for:"}</Label>
                <div className="flex gap-2">
                  <Input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => scheduleMutation.mutate()}
                    disabled={
                      !scheduleDate ||
                      scheduleMutation.isPending ||
                      !createdId
                    }
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    {isEs ? "Programar" : "Schedule"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        {step < 3 && (
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => (step === 0 ? handleClose() : setStep(step - 1))}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {step === 0
                ? isEs
                  ? "Cancelar"
                  : "Cancel"
                : isEs
                ? "Atras"
                : "Back"}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canNext || createMutation.isPending}
            >
              {createMutation.isPending
                ? isEs
                  ? "Creando..."
                  : "Creating..."
                : isEs
                ? "Siguiente"
                : "Next"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
        {step === 3 && (
          <div className="pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              {isEs ? "Atras" : "Back"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
