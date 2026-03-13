import { useState, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save, Eye, Copy, Type, Mail, MessageSquare, Tag } from "lucide-react";

interface TemplateEditorProps {
  initialData?: {
    name?: string;
    subject?: string;
    body?: string;
    channel?: string;
    language?: string;
  };
  onSave?: (data: {
    name: string;
    subject: string;
    body: string;
    channel: string;
    language: string;
  }) => void;
  mode?: "create" | "edit";
}

const MERGE_TAGS = [
  {
    category: "Contact",
    categoryEs: "Contacto",
    tags: [
      { label: "First Name", labelEs: "Nombre", value: "{{firstName}}" },
      { label: "Last Name", labelEs: "Apellido", value: "{{lastName}}" },
      { label: "Email", labelEs: "Correo", value: "{{email}}" },
    ],
  },
  {
    category: "Learning",
    categoryEs: "Aprendizaje",
    tags: [
      { label: "Level", labelEs: "Nivel", value: "{{level}}" },
      { label: "Class Credits", labelEs: "Creditos de clase", value: "{{classCredits}}" },
      { label: "Classes Completed", labelEs: "Clases completadas", value: "{{classesCompleted}}" },
      { label: "Current Streak", labelEs: "Racha actual", value: "{{currentStreak}}" },
      { label: "Learning Hours", labelEs: "Horas de aprendizaje", value: "{{learningHours}}" },
    ],
  },
  {
    category: "Account",
    categoryEs: "Cuenta",
    tags: [
      { label: "User Type", labelEs: "Tipo de usuario", value: "{{userType}}" },
      { label: "Trial Status", labelEs: "Estado de prueba", value: "{{trialStatus}}" },
    ],
  },
  {
    category: "Offers",
    categoryEs: "Ofertas",
    tags: [
      { label: "Offer Code", labelEs: "Codigo de oferta", value: "{{offerCode}}" },
      { label: "Offer Discount", labelEs: "Descuento", value: "{{offerDiscount}}" },
      { label: "Offer Expiry", labelEs: "Vencimiento", value: "{{offerExpiry}}" },
    ],
  },
  {
    category: "Links",
    categoryEs: "Enlaces",
    tags: [
      { label: "Packages URL", labelEs: "URL de paquetes", value: "{{packagesUrl}}" },
      { label: "Portal URL", labelEs: "URL del portal", value: "{{portalUrl}}" },
      { label: "Tutor Name", labelEs: "Nombre del tutor", value: "{{tutorName}}" },
    ],
  },
];

const sampleData: Record<string, string> = {
  firstName: "Maria",
  lastName: "Garcia",
  email: "maria@example.com",
  level: "A2",
  classCredits: "3",
  classesCompleted: "5",
  currentStreak: "3",
  learningHours: "10.5",
  userType: "customer",
  trialStatus: "Completed",
  offerCode: "SPRING15",
  offerDiscount: "15%",
  offerExpiry: "2026-04-01",
  packagesUrl: "https://passport2fluency.com/packages",
  portalUrl: "https://passport2fluency.com/dashboard",
  tutorName: "Carlos Martinez",
};

function replaceMergeTags(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => sampleData[key] ?? match);
}

export default function TemplateEditor({
  initialData,
  onSave,
  mode = "create",
}: TemplateEditorProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  const [name, setName] = useState(initialData?.name ?? "");
  const [subject, setSubject] = useState(initialData?.subject ?? "");
  const [body, setBody] = useState(initialData?.body ?? "");
  const [channel, setChannel] = useState(initialData?.channel ?? "email");
  const [templateLang, setTemplateLang] = useState(initialData?.language ?? "es");
  const [activeField, setActiveField] = useState<"subject" | "body">("body");

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = useCallback(
    (tag: string) => {
      if (activeField === "subject") {
        const el = subjectRef.current;
        if (el) {
          const start = el.selectionStart ?? subject.length;
          const end = el.selectionEnd ?? subject.length;
          const updated = subject.slice(0, start) + tag + subject.slice(end);
          setSubject(updated);
          requestAnimationFrame(() => {
            el.focus();
            const pos = start + tag.length;
            el.setSelectionRange(pos, pos);
          });
        }
      } else {
        const el = bodyRef.current;
        if (el) {
          const start = el.selectionStart ?? body.length;
          const end = el.selectionEnd ?? body.length;
          const updated = body.slice(0, start) + tag + body.slice(end);
          setBody(updated);
          requestAnimationFrame(() => {
            el.focus();
            const pos = start + tag.length;
            el.setSelectionRange(pos, pos);
          });
        }
      }
    },
    [activeField, subject, body]
  );

  const handleSave = () => {
    onSave?.({ name, subject, body, channel, language: templateLang });
  };

  const canSave = name.trim() && body.trim() && (channel === "sms" || subject.trim());

  const MergeTagDropdown = ({ targetField }: { targetField: "subject" | "body" }) => (
    <Select
      value=""
      onValueChange={(val) => {
        setActiveField(targetField);
        // Small delay to ensure activeField is set before insert
        setTimeout(() => insertTag(val), 0);
      }}
    >
      <SelectTrigger className="w-auto h-8 gap-1 text-xs border-dashed">
        <Tag className="h-3 w-3" />
        <span className="hidden sm:inline">{isEs ? "Insertar tag" : "Insert tag"}</span>
      </SelectTrigger>
      <SelectContent>
        {MERGE_TAGS.map((group) => (
          <div key={group.category}>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {isEs ? group.categoryEs : group.category}
            </div>
            {group.tags.map((tag) => (
              <SelectItem key={tag.value} value={tag.value}>
                <span className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs px-1.5 py-0 text-blue-600 bg-blue-50">
                    {tag.value}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {isEs ? tag.labelEs : tag.label}
                  </span>
                </span>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Type className="h-5 w-5" />
          {mode === "create"
            ? isEs
              ? "Nueva plantilla"
              : "New Template"
            : isEs
              ? "Editar plantilla"
              : "Edit Template"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              {isEs ? "Editor" : "Editor"}
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {isEs ? "Vista previa" : "Preview"}
            </TabsTrigger>
          </TabsList>

          {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-4">
            {/* Template Name */}
            <div className="space-y-1.5">
              <Label htmlFor="template-name">
                {isEs ? "Nombre de la plantilla" : "Template Name"}
              </Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isEs ? "Ej: Bienvenida nuevo estudiante" : "E.g. Welcome new student"}
              />
            </div>

            {/* Channel & Language Selectors */}
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1.5">
                <Label>{isEs ? "Canal" : "Channel"}</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={channel === "email" ? "default" : "outline"}
                    onClick={() => setChannel("email")}
                    className="gap-1.5"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={channel === "sms" ? "default" : "outline"}
                    onClick={() => setChannel("sms")}
                    className="gap-1.5"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    SMS
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{isEs ? "Idioma" : "Language"}</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={templateLang === "es" ? "default" : "outline"}
                    onClick={() => setTemplateLang("es")}
                  >
                    ES
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={templateLang === "en" ? "default" : "outline"}
                    onClick={() => setTemplateLang("en")}
                  >
                    EN
                  </Button>
                </div>
              </div>
            </div>

            {/* Subject Line (email only) */}
            {channel === "email" && (
              <div className="space-y-1.5">
                <Label htmlFor="template-subject">
                  {isEs ? "Asunto" : "Subject"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="template-subject"
                    ref={subjectRef}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    onFocus={() => setActiveField("subject")}
                    placeholder={
                      isEs
                        ? "Ej: Hola {{firstName}}, tu clase esta confirmada"
                        : "E.g. Hi {{firstName}}, your class is confirmed"
                    }
                    className="flex-1"
                  />
                  <MergeTagDropdown targetField="subject" />
                </div>
              </div>
            )}

            {/* Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="template-body">
                  {channel === "email"
                    ? isEs
                      ? "Cuerpo (HTML)"
                      : "Body (HTML)"
                    : isEs
                      ? "Mensaje"
                      : "Message"}
                </Label>
                <MergeTagDropdown targetField="body" />
              </div>
              <Textarea
                id="template-body"
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => setActiveField("body")}
                placeholder={
                  channel === "email"
                    ? isEs
                      ? "<p>Hola {{firstName}},</p>\n<p>Gracias por unirte a Passport2Fluency...</p>"
                      : "<p>Hi {{firstName}},</p>\n<p>Thank you for joining Passport2Fluency...</p>"
                    : isEs
                      ? "Hola {{firstName}}, tu proxima clase es manana a las..."
                      : "Hi {{firstName}}, your next class is tomorrow at..."
                }
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            {/* Available Merge Tags Reference */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {isEs ? "Tags disponibles" : "Available merge tags"}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {MERGE_TAGS.flatMap((group) =>
                  group.tags.map((tag) => (
                    <Badge
                      key={tag.value}
                      variant="secondary"
                      className="font-mono text-xs cursor-pointer px-2 py-0.5 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                      onClick={() => insertTag(tag.value)}
                    >
                      {tag.value}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={!canSave} className="gap-2">
                <Save className="h-4 w-4" />
                {mode === "create"
                  ? isEs
                    ? "Crear plantilla"
                    : "Create Template"
                  : isEs
                    ? "Guardar cambios"
                    : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              {/* Preview Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  {isEs ? "Vista previa con datos de ejemplo" : "Preview with sample data"}
                </div>
                <Badge variant="outline" className="text-xs">
                  {channel === "email" ? "Email" : "SMS"} / {templateLang.toUpperCase()}
                </Badge>
              </div>

              {/* Subject Preview (email only) */}
              {channel === "email" && subject && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {isEs ? "Asunto" : "Subject"}
                  </Label>
                  <div className="text-sm font-medium bg-background rounded-md border px-3 py-2">
                    {replaceMergeTags(subject)}
                  </div>
                </div>
              )}

              {/* Body Preview */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {channel === "email"
                    ? isEs
                      ? "Cuerpo"
                      : "Body"
                    : isEs
                      ? "Mensaje"
                      : "Message"}
                </Label>
                {channel === "email" ? (
                  <div
                    className="bg-white rounded-md border p-4 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: replaceMergeTags(body) }}
                  />
                ) : (
                  <div className="bg-background rounded-md border px-3 py-2 text-sm whitespace-pre-wrap">
                    {replaceMergeTags(body)}
                  </div>
                )}
              </div>

              {/* Sample Data Reference */}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  {isEs ? "Ver datos de ejemplo utilizados" : "View sample data used"}
                </summary>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-muted-foreground">
                  {Object.entries(sampleData).map(([key, val]) => (
                    <div key={key} className="truncate">
                      <span className="font-mono text-blue-600">{`{{${key}}}`}</span>{" "}
                      <span>{val}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>

            {/* Back to Editor hint */}
            <p className="text-xs text-muted-foreground text-center">
              {isEs
                ? "Cambia a la pestana Editor para modificar la plantilla"
                : "Switch to the Editor tab to modify the template"}
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
