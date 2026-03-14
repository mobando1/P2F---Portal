import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileText,
  HelpCircle,
  Video,
  Dumbbell,
  Settings2,
  Pencil,
  BookOpen,
  Star,
} from "lucide-react";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const STATION_TYPES = ["lesson", "quiz", "activity", "milestone"] as const;
const CONTENT_TYPES = ["document", "quiz", "video", "exercise"] as const;
const QUESTION_TYPES = ["multiple_choice", "true_false", "fill_blank", "ordering"] as const;

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-green-100 text-green-700",
  A2: "bg-teal-100 text-teal-700",
  B1: "bg-blue-100 text-blue-700",
  B2: "bg-indigo-100 text-indigo-700",
  C1: "bg-orange-100 text-orange-700",
  C2: "bg-yellow-100 text-yellow-700",
};

const CONTENT_ICONS: Record<string, typeof FileText> = {
  document: FileText,
  quiz: HelpCircle,
  video: Video,
  exercise: Dumbbell,
};

interface Station {
  id: number;
  level: string;
  stationOrder: number;
  title: string;
  titleEs: string;
  description?: string;
  descriptionEs?: string;
  stationType: string;
  requiredToAdvance: boolean;
}

interface Content {
  id: number;
  stationId: number;
  contentType: string;
  title: string;
  titleEs: string;
  description?: string;
  descriptionEs?: string;
  contentData?: any;
  durationMinutes: number;
  sortOrder: number;
}

interface LevelRule {
  id?: number;
  fromLevel: string;
  toLevel: string;
  requiredClassesCompleted: number;
  requiredQuizAvgScore: number;
  requiredStationsCompleted: number;
  autoPromote: boolean;
}

interface QuizQuestion {
  type: string;
  question: string;
  questionEs: string;
  options?: string[];
  optionsEs?: string[];
  correctAnswer: string;
  points: number;
  explanation?: string;
  explanationEs?: string;
}

export default function AdminLearningPath() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEs = language === "es";

  const [activeSection, setActiveSection] = useState<"stations" | "rules">("stations");
  const [expandedStations, setExpandedStations] = useState<Set<number>>(new Set());
  const [showStationDialog, setShowStationDialog] = useState(false);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [contentForStation, setContentForStation] = useState<number | null>(null);

  // Queries
  const { data: stations = [], isLoading } = useQuery<Station[]>({
    queryKey: ["/api/admin/learning-path/stations"],
    queryFn: () => apiRequest("GET", "/api/admin/learning-path/stations").then(r => r.json()),
  });

  const { data: rules = [] } = useQuery<LevelRule[]>({
    queryKey: ["/api/admin/learning-path/rules"],
    queryFn: () => apiRequest("GET", "/api/admin/learning-path/rules").then(r => r.json()),
    enabled: activeSection === "rules",
  });

  // Mutations
  const createStationMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/learning-path/stations", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/learning-path/stations"] });
      setShowStationDialog(false);
      toast({ title: isEs ? "Estación creada" : "Station created" });
    },
  });

  const deleteStationMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/learning-path/stations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/learning-path/stations"] });
      toast({ title: isEs ? "Estación eliminada" : "Station deleted" });
    },
  });

  const createContentMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/learning-path/content", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/learning-path/content"] });
      setShowContentDialog(false);
      toast({ title: isEs ? "Contenido creado" : "Content created" });
    },
  });

  const updateContentMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/admin/learning-path/content/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/learning-path/content"] });
      setShowContentDialog(false);
      toast({ title: isEs ? "Contenido actualizado" : "Content updated" });
    },
  });

  const deleteContentMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/learning-path/content/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/learning-path/content"] });
      toast({ title: isEs ? "Contenido eliminado" : "Content deleted" });
    },
  });

  const upsertRuleMut = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/admin/learning-path/rules", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/learning-path/rules"] });
      toast({ title: isEs ? "Regla guardada" : "Rule saved" });
    },
  });

  // Group stations by level
  const stationsByLevel = LEVELS.reduce((acc, level) => {
    acc[level] = stations.filter(s => s.level === level).sort((a, b) => a.stationOrder - b.stationOrder);
    return acc;
  }, {} as Record<string, Station[]>);

  const toggleExpand = (stationId: number) => {
    setExpandedStations(prev => {
      const next = new Set(prev);
      if (next.has(stationId)) next.delete(stationId);
      else next.add(stationId);
      return next;
    });
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">{isEs ? "Cargando..." : "Loading..."}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Section Toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeSection === "stations" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSection("stations")}
          className={activeSection === "stations" ? "bg-[#1C7BB1]" : ""}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          {isEs ? "Estaciones" : "Stations"}
        </Button>
        <Button
          variant={activeSection === "rules" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSection("rules")}
          className={activeSection === "rules" ? "bg-[#1C7BB1]" : ""}
        >
          <Settings2 className="w-4 h-4 mr-2" />
          {isEs ? "Reglas de Progresión" : "Progression Rules"}
        </Button>
      </div>

      {/* Stations Section */}
      {activeSection === "stations" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-[#0A4A6E]">
              {isEs ? "Gestión de Estaciones" : "Station Management"}
            </h2>
            <Button
              size="sm"
              className="bg-[#1C7BB1]"
              onClick={() => { setEditingStation(null); setShowStationDialog(true); }}
            >
              <Plus className="w-4 h-4 mr-1" />
              {isEs ? "Nueva Estación" : "New Station"}
            </Button>
          </div>

          {LEVELS.map(level => {
            const levelStations = stationsByLevel[level];
            if (levelStations.length === 0 && stations.length > 0) return null;

            return (
              <Card key={level}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className={LEVEL_COLORS[level]}>{level}</Badge>
                    <span className="text-gray-500">
                      {levelStations.length} {isEs ? "estaciones" : "stations"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {levelStations.length === 0 && (
                    <p className="text-sm text-gray-400 py-4 text-center">
                      {isEs ? "Sin estaciones. Crea la primera." : "No stations. Create the first one."}
                    </p>
                  )}
                  {levelStations.map(station => (
                    <StationRow
                      key={station.id}
                      station={station}
                      isExpanded={expandedStations.has(station.id)}
                      onToggle={() => toggleExpand(station.id)}
                      onDelete={() => deleteStationMut.mutate(station.id)}
                      onAddContent={() => { setContentForStation(station.id); setEditingContent(null); setShowContentDialog(true); }}
                      onEditContent={(content) => { setContentForStation(station.id); setEditingContent(content); setShowContentDialog(true); }}
                      onDeleteContent={(id) => deleteContentMut.mutate(id)}
                      isEs={isEs}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {stations.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">
                  {isEs ? "No hay estaciones creadas todavía" : "No stations created yet"}
                </p>
                <Button
                  className="bg-[#1C7BB1]"
                  onClick={() => { setEditingStation(null); setShowStationDialog(true); }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {isEs ? "Crear Primera Estación" : "Create First Station"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Rules Section */}
      {activeSection === "rules" && (
        <RulesEditor rules={rules} onSave={(rule) => upsertRuleMut.mutate(rule)} isEs={isEs} />
      )}

      {/* Station Dialog */}
      {showStationDialog && (
        <StationDialog
          station={editingStation}
          stations={stations}
          onClose={() => setShowStationDialog(false)}
          onSave={(data) => createStationMut.mutate(data)}
          isEs={isEs}
        />
      )}

      {/* Content Dialog */}
      {showContentDialog && contentForStation !== null && (
        <ContentDialog
          content={editingContent}
          stationId={contentForStation}
          onClose={() => setShowContentDialog(false)}
          onSave={(data) => {
            if (editingContent) {
              updateContentMut.mutate({ id: editingContent.id, data });
            } else {
              createContentMut.mutate(data);
            }
          }}
          isEs={isEs}
        />
      )}
    </div>
  );
}

// --- Station Row Component ---
function StationRow({
  station,
  isExpanded,
  onToggle,
  onDelete,
  onAddContent,
  onEditContent,
  onDeleteContent,
  isEs,
}: {
  station: Station;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onAddContent: () => void;
  onEditContent: (content: Content) => void;
  onDeleteContent: (id: number) => void;
  isEs: boolean;
}) {
  const { data: contents = [] } = useQuery<Content[]>({
    queryKey: ["/api/admin/learning-path/content", station.id],
    queryFn: () => apiRequest("GET", `/api/admin/learning-path/stations/${station.id}/content`).then(r => r.json()),
    enabled: isExpanded,
  });

  return (
    <div className="border rounded-lg">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {station.stationType === "milestone" && <Star className="w-4 h-4 text-amber-500" />}
            <span className="font-medium text-sm text-gray-800">
              #{station.stationOrder} — {isEs ? station.titleEs : station.title}
            </span>
            <Badge variant="outline" className="text-[10px]">{station.stationType}</Badge>
          </div>
          {station.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {isEs ? station.descriptionEs : station.description}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-400 hover:text-red-600 p-1"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {isExpanded && (
        <div className="border-t px-3 py-2 bg-gray-50/50 space-y-2">
          {contents.length === 0 && (
            <p className="text-xs text-gray-400 py-2 text-center">
              {isEs ? "Sin contenido" : "No content"}
            </p>
          )}
          {contents.map(content => {
            const Icon = CONTENT_ICONS[content.contentType] || FileText;
            return (
              <div key={content.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white border text-sm">
                <Icon className="w-3.5 h-3.5 text-gray-400" />
                <span className="flex-1 truncate text-gray-700">
                  {isEs ? content.titleEs : content.title}
                </span>
                <Badge variant="outline" className="text-[10px]">{content.contentType}</Badge>
                <span className="text-xs text-gray-400">{content.durationMinutes}min</span>
                <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={() => onEditContent(content)}>
                  <Pencil className="w-3 h-3 text-gray-400" />
                </Button>
                <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={() => onDeleteContent(content.id)}>
                  <Trash2 className="w-3 h-3 text-red-400" />
                </Button>
              </div>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={onAddContent}
          >
            <Plus className="w-3 h-3 mr-1" />
            {isEs ? "Agregar Contenido" : "Add Content"}
          </Button>
        </div>
      )}
    </div>
  );
}

// --- Station Dialog ---
function StationDialog({
  station,
  stations,
  onClose,
  onSave,
  isEs,
}: {
  station: Station | null;
  stations: Station[];
  onClose: () => void;
  onSave: (data: any) => void;
  isEs: boolean;
}) {
  const [form, setForm] = useState({
    level: station?.level || "A1",
    stationOrder: station?.stationOrder || (stations.filter(s => s.level === (station?.level || "A1")).length + 1),
    title: station?.title || "",
    titleEs: station?.titleEs || "",
    description: station?.description || "",
    descriptionEs: station?.descriptionEs || "",
    stationType: station?.stationType || "lesson",
    requiredToAdvance: station?.requiredToAdvance ?? true,
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#0A4A6E]">
            {station ? (isEs ? "Editar Estación" : "Edit Station") : (isEs ? "Nueva Estación" : "New Station")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{isEs ? "Nivel" : "Level"}</Label>
              <select
                value={form.level}
                onChange={(e) => {
                  const level = e.target.value;
                  setForm(f => ({ ...f, level, stationOrder: stations.filter(s => s.level === level).length + 1 }));
                }}
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              >
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <Label>{isEs ? "Orden" : "Order"}</Label>
              <Input type="number" value={form.stationOrder} onChange={(e) => setForm(f => ({ ...f, stationOrder: parseInt(e.target.value) || 1 }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>{isEs ? "Tipo" : "Type"}</Label>
            <select
              value={form.stationType}
              onChange={(e) => setForm(f => ({ ...f, stationType: e.target.value }))}
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
            >
              {STATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title (EN)</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Título (ES)</Label>
              <Input value={form.titleEs} onChange={(e) => setForm(f => ({ ...f, titleEs: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Description (EN)</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Descripción (ES)</Label>
              <Textarea value={form.descriptionEs} onChange={(e) => setForm(f => ({ ...f, descriptionEs: e.target.value }))} className="mt-1" rows={2} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.requiredToAdvance}
              onChange={(e) => setForm(f => ({ ...f, requiredToAdvance: e.target.checked }))}
              id="required"
            />
            <Label htmlFor="required">{isEs ? "Requerida para avanzar" : "Required to advance"}</Label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {isEs ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              className="flex-1 bg-[#1C7BB1]"
              disabled={!form.title || !form.titleEs}
              onClick={() => onSave(form)}
            >
              {isEs ? "Guardar" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Content Dialog ---
function ContentDialog({
  content,
  stationId,
  onClose,
  onSave,
  isEs,
}: {
  content: Content | null;
  stationId: number;
  onClose: () => void;
  onSave: (data: any) => void;
  isEs: boolean;
}) {
  const [form, setForm] = useState({
    stationId,
    contentType: content?.contentType || "document",
    title: content?.title || "",
    titleEs: content?.titleEs || "",
    description: content?.description || "",
    descriptionEs: content?.descriptionEs || "",
    durationMinutes: content?.durationMinutes || 15,
    sortOrder: content?.sortOrder || 0,
  });

  const [questions, setQuestions] = useState<QuizQuestion[]>(
    content?.contentData?.questions || []
  );

  const isQuiz = form.contentType === "quiz";

  const addQuestion = () => {
    setQuestions(q => [...q, {
      type: "multiple_choice",
      question: "",
      questionEs: "",
      options: ["", "", "", ""],
      optionsEs: ["", "", "", ""],
      correctAnswer: "",
      points: 1,
    }]);
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions(q => q.map((qq, i) => i === idx ? { ...qq, [field]: value } : qq));
  };

  const removeQuestion = (idx: number) => {
    setQuestions(q => q.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const data: any = { ...form };
    if (isQuiz && questions.length > 0) {
      data.contentData = { questions, passingScore: 70 };
    }
    onSave(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#0A4A6E]">
            {content ? (isEs ? "Editar Contenido" : "Edit Content") : (isEs ? "Nuevo Contenido" : "New Content")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{isEs ? "Tipo" : "Type"}</Label>
              <select
                value={form.contentType}
                onChange={(e) => setForm(f => ({ ...f, contentType: e.target.value }))}
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
              >
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{isEs ? "Duración (min)" : "Duration (min)"}</Label>
                <Input type="number" value={form.durationMinutes} onChange={(e) => setForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 15 }))} className="mt-1" />
              </div>
              <div>
                <Label>{isEs ? "Orden" : "Order"}</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title (EN)</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Título (ES)</Label>
              <Input value={form.titleEs} onChange={(e) => setForm(f => ({ ...f, titleEs: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Description (EN)</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Descripción (ES)</Label>
              <Textarea value={form.descriptionEs} onChange={(e) => setForm(f => ({ ...f, descriptionEs: e.target.value }))} className="mt-1" rows={2} />
            </div>
          </div>

          {/* Quiz Questions Editor */}
          {isQuiz && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[#0A4A6E] font-semibold">
                  {isEs ? "Preguntas" : "Questions"} ({questions.length})
                </Label>
                <Button variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="w-3 h-3 mr-1" />
                  {isEs ? "Agregar" : "Add"}
                </Button>
              </div>

              {questions.map((q, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">Q{idx + 1}</Badge>
                    <div className="flex items-center gap-2">
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(idx, "type", e.target.value)}
                        className="text-xs border rounded px-2 py-1"
                      >
                        {QUESTION_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                      </select>
                      <Input
                        type="number"
                        value={q.points}
                        onChange={(e) => updateQuestion(idx, "points", parseInt(e.target.value) || 1)}
                        className="w-16 h-7 text-xs"
                        placeholder="pts"
                      />
                      <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={() => removeQuestion(idx)}>
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Question (EN)"
                      value={q.question}
                      onChange={(e) => updateQuestion(idx, "question", e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Pregunta (ES)"
                      value={q.questionEs}
                      onChange={(e) => updateQuestion(idx, "questionEs", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  {(q.type === "multiple_choice" || q.type === "true_false") && (
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">{isEs ? "Opciones (EN | ES)" : "Options (EN | ES)"}</Label>
                      {(q.options || []).map((opt, oi) => (
                        <div key={oi} className="grid grid-cols-2 gap-2">
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(q.options || [])];
                              newOpts[oi] = e.target.value;
                              updateQuestion(idx, "options", newOpts);
                            }}
                            className="text-xs h-8"
                            placeholder={`Option ${oi + 1}`}
                          />
                          <Input
                            value={(q.optionsEs || [])[oi] || ""}
                            onChange={(e) => {
                              const newOpts = [...(q.optionsEs || [])];
                              newOpts[oi] = e.target.value;
                              updateQuestion(idx, "optionsEs", newOpts);
                            }}
                            className="text-xs h-8"
                            placeholder={`Opción ${oi + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">{isEs ? "Respuesta correcta" : "Correct answer"}</Label>
                      <Input
                        value={q.correctAnswer}
                        onChange={(e) => updateQuestion(idx, "correctAnswer", e.target.value)}
                        className="text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">{isEs ? "Explicación (EN)" : "Explanation (EN)"}</Label>
                      <Input
                        value={q.explanation || ""}
                        onChange={(e) => updateQuestion(idx, "explanation", e.target.value)}
                        className="text-sm mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {isEs ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              className="flex-1 bg-[#1C7BB1]"
              disabled={!form.title || !form.titleEs}
              onClick={handleSave}
            >
              {isEs ? "Guardar" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Rules Editor ---
function RulesEditor({
  rules,
  onSave,
  isEs,
}: {
  rules: LevelRule[];
  onSave: (rule: any) => void;
  isEs: boolean;
}) {
  const levelPairs = LEVELS.slice(0, -1).map((from, i) => ({
    fromLevel: from,
    toLevel: LEVELS[i + 1],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-[#0A4A6E]">
          {isEs ? "Reglas de Progresión de Nivel" : "Level Progression Rules"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-3">{isEs ? "De → A" : "From → To"}</th>
                <th className="pb-2 pr-3">{isEs ? "Clases req." : "Classes req."}</th>
                <th className="pb-2 pr-3">{isEs ? "Estaciones req." : "Stations req."}</th>
                <th className="pb-2 pr-3">{isEs ? "Quiz avg mín." : "Quiz avg min."}</th>
                <th className="pb-2 pr-3">{isEs ? "Auto-promover" : "Auto-promote"}</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {levelPairs.map(pair => {
                const existing = rules.find(r => r.fromLevel === pair.fromLevel && r.toLevel === pair.toLevel);
                return (
                  <RuleRow
                    key={pair.fromLevel}
                    fromLevel={pair.fromLevel}
                    toLevel={pair.toLevel}
                    existing={existing}
                    onSave={onSave}
                    isEs={isEs}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function RuleRow({
  fromLevel,
  toLevel,
  existing,
  onSave,
  isEs,
}: {
  fromLevel: string;
  toLevel: string;
  existing?: LevelRule;
  onSave: (rule: any) => void;
  isEs: boolean;
}) {
  const [form, setForm] = useState({
    fromLevel,
    toLevel,
    requiredClassesCompleted: existing?.requiredClassesCompleted ?? 4,
    requiredStationsCompleted: existing?.requiredStationsCompleted ?? 6,
    requiredQuizAvgScore: existing?.requiredQuizAvgScore ?? 70,
    autoPromote: existing?.autoPromote ?? true,
  });

  const [dirty, setDirty] = useState(false);

  const update = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    setDirty(true);
  };

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-3">
        <Badge className={LEVEL_COLORS[fromLevel]}>{fromLevel}</Badge>
        <span className="mx-1">→</span>
        <Badge className={LEVEL_COLORS[toLevel]}>{toLevel}</Badge>
      </td>
      <td className="py-2 pr-3">
        <Input
          type="number"
          value={form.requiredClassesCompleted}
          onChange={(e) => update("requiredClassesCompleted", parseInt(e.target.value) || 0)}
          className="w-16 h-8 text-sm"
        />
      </td>
      <td className="py-2 pr-3">
        <Input
          type="number"
          value={form.requiredStationsCompleted}
          onChange={(e) => update("requiredStationsCompleted", parseInt(e.target.value) || 0)}
          className="w-16 h-8 text-sm"
        />
      </td>
      <td className="py-2 pr-3">
        <Input
          type="number"
          value={form.requiredQuizAvgScore}
          onChange={(e) => update("requiredQuizAvgScore", parseInt(e.target.value) || 0)}
          className="w-16 h-8 text-sm"
        />
      </td>
      <td className="py-2 pr-3">
        <input
          type="checkbox"
          checked={form.autoPromote}
          onChange={(e) => update("autoPromote", e.target.checked)}
        />
      </td>
      <td className="py-2">
        <Button
          size="sm"
          variant={dirty ? "default" : "outline"}
          className={dirty ? "bg-[#1C7BB1] h-8 text-xs" : "h-8 text-xs"}
          onClick={() => { onSave(form); setDirty(false); }}
        >
          {isEs ? "Guardar" : "Save"}
        </Button>
      </td>
    </tr>
  );
}
