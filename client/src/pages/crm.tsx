import { Switch, Route, useLocation, useRoute } from "wouter";
import { AppShell } from "@/components/shell/AppShell";
import CrmOverview from "@/components/crm/CrmOverview";
import CrmPipeline from "@/components/crm/CrmPipeline";
import CrmStudentList from "@/components/crm/CrmStudentList";
import CrmCampaigns from "@/components/crm/CrmCampaigns";
import OfferManager from "@/components/crm/OfferManager";
import CrmTasksGlobal from "@/components/crm/CrmTasksGlobal";
import CrmMetrics from "@/components/crm/CrmMetrics";
import DiagnosticsTab from "@/components/crm/DiagnosticsTab";
import SubscriberList from "@/components/crm/SubscriberList";
import StudentDetail from "@/components/crm/StudentDetail";
import { SegmentsTab } from "@/components/crm/CrmDashboard";
import NotFound from "@/pages/not-found";

/**
 * Área CRM con rutas reales (Wouter) dentro del AppShell unificado.
 * El detalle de contacto se controla por la ruta /admin/crm/contacts/:userId
 * para que ⌘K y los deep-links abran el Sheet directamente.
 */
export default function CrmArea() {
  const [, setLocation] = useLocation();
  const [matchDetail, detailParams] = useRoute("/admin/crm/contacts/:userId");
  const detailUserId = matchDetail && detailParams?.userId ? Number(detailParams.userId) : null;

  const selectStudent = (id: number) => setLocation(`/admin/crm/contacts/${id}`);
  const closeDetail = () => setLocation("/admin/crm/contacts");

  return (
    <AppShell>
      <Switch>
        <Route path="/admin/crm">{() => <CrmOverview />}</Route>
        <Route path="/admin/crm/pipeline">{() => <CrmPipeline onSelectStudent={selectStudent} />}</Route>
        <Route path="/admin/crm/contacts/:userId">{() => <CrmStudentList onSelectStudent={selectStudent} />}</Route>
        <Route path="/admin/crm/contacts">{() => <CrmStudentList onSelectStudent={selectStudent} />}</Route>
        <Route path="/admin/crm/campaigns">{() => <CrmCampaigns />}</Route>
        <Route path="/admin/crm/offers">{() => <OfferManager />}</Route>
        <Route path="/admin/crm/tasks">{() => <CrmTasksGlobal />}</Route>
        <Route path="/admin/crm/diagnostics">{() => <DiagnosticsTab />}</Route>
        <Route path="/admin/crm/metrics">{() => <CrmMetrics />}</Route>
        <Route path="/admin/crm/segments">{() => <SegmentsTab />}</Route>
        <Route path="/admin/crm/subscribers">{() => <SubscriberList />}</Route>
        <Route>{() => <NotFound />}</Route>
      </Switch>

      <StudentDetail userId={detailUserId} open={!!detailUserId} onClose={closeDetail} />
    </AppShell>
  );
}
