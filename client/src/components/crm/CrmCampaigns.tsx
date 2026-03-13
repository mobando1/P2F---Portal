import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileText, Clock, Send, Mail } from "lucide-react";
import CampaignBuilder from "./CampaignBuilder";
import CampaignDetail from "./CampaignDetail";

interface Campaign {
  id: number;
  name: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  channel: string;
  recipientCount: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  createdAt: string;
}

const STATUS_FILTERS = ["all", "draft", "sent", "scheduled"] as const;

function statusBadgeVariant(status: string) {
  switch (status) {
    case "draft":
      return "secondary" as const;
    case "cancelled":
      return "destructive" as const;
    default:
      return "default" as const;
  }
}

export default function CrmCampaigns() {
  const { language } = useLanguage();
  const isEs = language === "es";

  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: campaigns = [], refetch } = useQuery<Campaign[]>({
    queryKey: ["/api/admin/campaigns"],
  });

  const filtered =
    statusFilter === "all"
      ? campaigns
      : campaigns.filter((c) => c.status === statusFilter);

  const counts = {
    total: campaigns.length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    sent: campaigns.filter((c) => c.status === "sent").length,
    scheduled: campaigns.filter((c) => c.status === "scheduled").length,
  };

  const summaryCards = [
    {
      label: isEs ? "Total" : "Total Campaigns",
      value: counts.total,
      icon: Mail,
    },
    {
      label: isEs ? "Borradores" : "Drafts",
      value: counts.draft,
      icon: FileText,
    },
    {
      label: isEs ? "Enviados" : "Sent",
      value: counts.sent,
      icon: Send,
    },
    {
      label: isEs ? "Programados" : "Scheduled",
      value: counts.scheduled,
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <card.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header with filter and new button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f}
              variant={statusFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f)}
            >
              {f === "all"
                ? isEs
                  ? "Todos"
                  : "All"
                : f === "draft"
                ? isEs
                  ? "Borrador"
                  : "Draft"
                : f === "sent"
                ? isEs
                  ? "Enviado"
                  : "Sent"
                : isEs
                ? "Programado"
                : "Scheduled"}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setBuilderOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {isEs ? "Nueva Campana" : "New Campaign"}
        </Button>
      </div>

      {/* Campaigns table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">
                    {isEs ? "Nombre" : "Name"}
                  </th>
                  <th className="text-left p-3 font-medium">
                    {isEs ? "Estado" : "Status"}
                  </th>
                  <th className="text-left p-3 font-medium">
                    {isEs ? "Canal" : "Channel"}
                  </th>
                  <th className="text-right p-3 font-medium">
                    {isEs ? "Destinatarios" : "Recipients"}
                  </th>
                  <th className="text-right p-3 font-medium">
                    {isEs ? "Enviados" : "Sent"}
                  </th>
                  <th className="text-right p-3 font-medium">
                    {isEs ? "Abiertos" : "Opened"}
                  </th>
                  <th className="text-right p-3 font-medium">
                    {isEs ? "Clicks" : "Clicked"}
                  </th>
                  <th className="text-left p-3 font-medium">
                    {isEs ? "Creado" : "Created"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-6 text-center text-muted-foreground"
                    >
                      {isEs ? "No hay campanas" : "No campaigns"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelectedCampaignId(c.id)}
                    >
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3">
                        <Badge variant={statusBadgeVariant(c.status)}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="p-3">{c.channel}</td>
                      <td className="p-3 text-right">{c.recipientCount}</td>
                      <td className="p-3 text-right">{c.sentCount}</td>
                      <td className="p-3 text-right">{c.openedCount}</td>
                      <td className="p-3 text-right">{c.clickedCount}</td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Builder Dialog */}
      <CampaignBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onCreated={() => refetch()}
      />

      {/* Campaign Detail Sheet */}
      {selectedCampaignId && (
        <CampaignDetail
          campaignId={selectedCampaignId}
          open={!!selectedCampaignId}
          onClose={() => setSelectedCampaignId(null)}
        />
      )}
    </div>
  );
}
