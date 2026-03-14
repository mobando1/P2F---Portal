import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/i18n";
import { LayoutGrid, List, CheckSquare, BarChart3, Send, Users, Tag, Mail } from "lucide-react";
import CrmPipeline from "./CrmPipeline";
import CrmStudentList from "./CrmStudentList";
import CrmTasksGlobal from "./CrmTasksGlobal";
import CrmMetrics from "./CrmMetrics";
import CrmCampaigns from "./CrmCampaigns";
import OfferManager from "./OfferManager";
import SubscriberList from "./SubscriberList";
import StudentDetail from "./StudentDetail";

export default function CrmDashboard() {
  const { language } = useLanguage();
  const isEs = language === "es";

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const handleSelectStudent = (userId: number) => {
    setSelectedStudentId(userId);
  };

  const handleCloseDetail = () => {
    setSelectedStudentId(null);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="pipeline" className="flex items-center gap-1">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden lg:inline">Pipeline</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-1">
            <List className="h-4 w-4" />
            <span className="hidden lg:inline">{isEs ? "Lista" : "List"}</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-1">
            <Send className="h-4 w-4" />
            <span className="hidden lg:inline">{isEs ? "Campanas" : "Campaigns"}</span>
          </TabsTrigger>
          <TabsTrigger value="offers" className="flex items-center gap-1">
            <Tag className="h-4 w-4" />
            <span className="hidden lg:inline">{isEs ? "Ofertas" : "Offers"}</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-1">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden lg:inline">{isEs ? "Tareas" : "Tasks"}</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden lg:inline">{isEs ? "Metricas" : "Metrics"}</span>
          </TabsTrigger>
          <TabsTrigger value="segments" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden lg:inline">{isEs ? "Segmentos" : "Segments"}</span>
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            <span className="hidden lg:inline">{isEs ? "Suscriptores" : "Subscribers"}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <CrmPipeline onSelectStudent={handleSelectStudent} />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <CrmStudentList onSelectStudent={handleSelectStudent} />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <CrmCampaigns />
        </TabsContent>

        <TabsContent value="offers" className="mt-4">
          <OfferManager />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <CrmTasksGlobal />
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <CrmMetrics />
        </TabsContent>

        <TabsContent value="segments" className="mt-4">
          <SegmentsTab />
        </TabsContent>

        <TabsContent value="subscribers" className="mt-4">
          <SubscriberList />
        </TabsContent>
      </Tabs>

      {/* Student Detail Sheet */}
      {selectedStudentId !== null && (
        <StudentDetail
          userId={selectedStudentId}
          open={selectedStudentId !== null}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}

// Inline Segments tab - lists saved segments with option to create new
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Eye } from "lucide-react";
import SegmentBuilder, { type SegmentFilters } from "./SegmentBuilder";

function SegmentsTab() {
  const { language } = useLanguage();
  const isEs = language === "es";
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [previewSegmentId, setPreviewSegmentId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<{ count: number; sample: any[] } | null>(null);

  const { data: segments = [] } = useQuery({
    queryKey: ["/api/admin/campaigns/segments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/campaigns/segments");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/campaigns/segments/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns/segments"] }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; filters: SegmentFilters }) => {
      const res = await apiRequest("POST", "/api/admin/campaigns/segments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns/segments"] });
      setShowCreate(false);
    },
  });

  const handlePreview = async (segmentId: number) => {
    try {
      const res = await apiRequest("POST", `/api/admin/campaigns/segments/${segmentId}/preview`);
      const data = await res.json();
      setPreviewSegmentId(segmentId);
      setPreviewData(data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{isEs ? "Segmentos de Audiencia" : "Audience Segments"}</h3>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {isEs ? "Nuevo Segmento" : "New Segment"}
        </Button>
      </div>

      <div className="grid gap-3">
        {segments.map((seg: any) => {
          const filters = seg.filters as SegmentFilters;
          const ruleCount = filters?.rules?.length || 0;
          return (
            <Card key={seg.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{seg.name}</p>
                  {seg.description && <p className="text-sm text-muted-foreground">{seg.description}</p>}
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">{ruleCount} {isEs ? "reglas" : "rules"}</Badge>
                    <Badge variant="outline">{filters?.logic || "AND"}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handlePreview(seg.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-500" onClick={() => deleteMutation.mutate(seg.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {segments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{isEs ? "No hay segmentos creados" : "No segments created yet"}</p>
          </div>
        )}
      </div>

      {/* Create Segment Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEs ? "Crear Segmento" : "Create Segment"}</DialogTitle>
          </DialogHeader>
          <SegmentBuilder
            showSave
            onSave={(name, description, filters) => {
              createMutation.mutate({ name, description, filters });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewSegmentId !== null} onOpenChange={() => { setPreviewSegmentId(null); setPreviewData(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEs ? "Vista Previa del Segmento" : "Segment Preview"}</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold text-[#1C7BB1]">{previewData.count}</span>
                <p className="text-muted-foreground">{isEs ? "estudiantes coinciden" : "students match"}</p>
              </div>
              {previewData.sample.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{isEs ? "Muestra:" : "Sample:"}</p>
                  {previewData.sample.map((u: any) => (
                    <div key={u.id} className="flex justify-between text-sm border-b pb-1">
                      <span>{u.firstName} {u.lastName}</span>
                      <span className="text-muted-foreground">{u.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
