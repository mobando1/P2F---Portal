import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Image,
  Link2,
  Upload,
  Plus,
  Trash2,
  Loader2,
  FolderOpen,
  ExternalLink,
} from "lucide-react";

interface TutorMaterial {
  id: number;
  title: string;
  description: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  fileType: string;
  level: string | null;
  category: string | null;
  createdAt: string;
}

const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  image: Image,
  link: Link2,
  document: FileText,
};

const CATEGORY_LABELS: Record<string, { es: string; en: string }> = {
  grammar: { es: "Gramática", en: "Grammar" },
  vocabulary: { es: "Vocabulario", en: "Vocabulary" },
  reading: { es: "Lectura", en: "Reading" },
  speaking: { es: "Speaking", en: "Speaking" },
  general: { es: "General", en: "General" },
};

export default function TutorMaterialsSection() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEs = language === "es";

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [level, setLevel] = useState("all");
  const [category, setCategory] = useState("general");
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file");

  const { data: materials, isLoading } = useQuery<TutorMaterial[]>({
    queryKey: ["/api/tutor/materials"],
    queryFn: () => apiRequest("GET", "/api/tutor/materials").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/tutor/materials", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/materials"] });
      setShowModal(false);
      resetForm();
      toast({ title: isEs ? "Material guardado" : "Material saved" });
    },
    onError: () => {
      toast({ title: "Error", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tutor/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/materials"] });
      toast({ title: isEs ? "Material eliminado" : "Material deleted" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setExternalUrl("");
    setFileData(null);
    setFileName("");
    setLevel("all");
    setCategory("general");
    setUploadMode("file");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: isEs ? "Archivo muy grande (máx 5MB)" : "File too large (max 5MB)", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setFileData(result);
    };
    reader.readAsDataURL(file);

    // Auto-detect file type
    if (file.type.startsWith("image/")) setUploadMode("file");
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const fileType = uploadMode === "link" ? "link"
      : fileName.endsWith(".pdf") ? "pdf"
      : fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "image"
      : "document";

    createMutation.mutate({
      title: title.trim(),
      description: description || null,
      fileUrl: uploadMode === "file" ? fileData : null,
      externalUrl: uploadMode === "link" ? externalUrl : null,
      fileType,
      level: level === "all" ? null : level,
      category,
    });
  };

  const openMaterial = (m: TutorMaterial) => {
    if (m.externalUrl) {
      window.open(m.externalUrl, "_blank");
    } else if (m.fileUrl) {
      const link = document.createElement("a");
      link.href = m.fileUrl;
      link.download = m.title;
      link.click();
    }
  };

  const Icon = (type: string) => FILE_TYPE_ICONS[type] || FileText;

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-[#F59E1C]" />
              <h3 className="font-semibold text-[#0A4A6E]">{isEs ? "Mis Materiales" : "My Materials"}</h3>
              {materials && materials.length > 0 && (
                <Badge className="bg-[#1C7BB1]/10 text-[#1C7BB1]">{materials.length}</Badge>
              )}
            </div>
            <Button size="sm" className="bg-[#1C7BB1] hover:bg-[#0A4A6E]" onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              {isEs ? "Subir" : "Upload"}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin h-5 w-5 text-[#1C7BB1]" /></div>
          ) : !materials || materials.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">{isEs ? "Sin materiales. Sube PDFs, documentos o links." : "No materials. Upload PDFs, documents or links."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {materials.map(m => {
                const TypeIcon = Icon(m.fileType);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer group"
                    onClick={() => openMaterial(m)}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      m.fileType === "pdf" ? "bg-red-100" : m.fileType === "image" ? "bg-blue-100" : m.fileType === "link" ? "bg-purple-100" : "bg-gray-100"
                    }`}>
                      <TypeIcon className={`h-4 w-4 ${
                        m.fileType === "pdf" ? "text-red-600" : m.fileType === "image" ? "text-blue-600" : m.fileType === "link" ? "text-purple-600" : "text-gray-600"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0A4A6E] truncate">{m.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {m.level && <Badge variant="outline" className="text-[9px] px-1 py-0">{m.level}</Badge>}
                        {m.category && (
                          <span className="text-[9px] text-gray-400">
                            {CATEGORY_LABELS[m.category]?.[isEs ? "es" : "en"] || m.category}
                          </span>
                        )}
                        {m.externalUrl && <ExternalLink className="h-2.5 w-2.5 text-gray-400" />}
                      </div>
                    </div>
                    <button
                      className="p-1 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(m.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEs ? "Subir Material" : "Upload Material"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{isEs ? "Título" : "Title"} *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isEs ? "Ej: Verbos irregulares A2" : "E.g. Irregular verbs A2"} />
            </div>

            <div className="space-y-1.5">
              <Label>{isEs ? "Descripción (opcional)" : "Description (optional)"}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={isEs ? "Notas sobre este material..." : "Notes about this material..."} />
            </div>

            {/* Upload mode toggle */}
            <div className="flex gap-2">
              <Button
                variant={uploadMode === "file" ? "default" : "outline"}
                size="sm"
                className={uploadMode === "file" ? "bg-[#1C7BB1]" : ""}
                onClick={() => setUploadMode("file")}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                {isEs ? "Archivo" : "File"}
              </Button>
              <Button
                variant={uploadMode === "link" ? "default" : "outline"}
                size="sm"
                className={uploadMode === "link" ? "bg-[#1C7BB1]" : ""}
                onClick={() => setUploadMode("link")}
              >
                <Link2 className="h-3.5 w-3.5 mr-1" />
                Link
              </Button>
            </div>

            {uploadMode === "file" ? (
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 px-3 py-3 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
                  <Upload className="h-4 w-4" />
                  {fileName || (isEs ? "Seleccionar archivo (PDF, imagen, doc)" : "Select file (PDF, image, doc)")}
                  <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" className="hidden" onChange={handleFileUpload} />
                </label>
                <p className="text-[10px] text-gray-400">{isEs ? "Máx 5MB" : "Max 5MB"}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>URL</Label>
                <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://drive.google.com/..." />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isEs ? "Nivel" : "Level"}</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isEs ? "Todos" : "All"}</SelectItem>
                    <SelectItem value="A1">A1</SelectItem>
                    <SelectItem value="A2">A2</SelectItem>
                    <SelectItem value="B1">B1</SelectItem>
                    <SelectItem value="B2">B2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{isEs ? "Categoría" : "Category"}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="grammar">{isEs ? "Gramática" : "Grammar"}</SelectItem>
                    <SelectItem value="vocabulary">{isEs ? "Vocabulario" : "Vocabulary"}</SelectItem>
                    <SelectItem value="reading">{isEs ? "Lectura" : "Reading"}</SelectItem>
                    <SelectItem value="speaking">Speaking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>{isEs ? "Cancelar" : "Cancel"}</Button>
            <Button
              className="bg-[#1C7BB1] hover:bg-[#0A4A6E]"
              onClick={handleSubmit}
              disabled={!title.trim() || (uploadMode === "file" ? !fileData : !externalUrl.trim()) || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <>{isEs ? "Guardar" : "Save"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
