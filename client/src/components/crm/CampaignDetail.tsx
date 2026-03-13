import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Users, Send, Eye, MousePointerClick } from "lucide-react";

interface CampaignDetailProps {
  campaignId: number;
  open: boolean;
  onClose: () => void;
}

interface Recipient {
  id: number;
  name: string;
  email: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
}

interface CampaignData {
  id: number;
  name: string;
  status: string;
  channel: string;
  totalRecipients: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  recipients: Recipient[];
}

const statusColors: Record<string, string> = {
  draft: "secondary",
  scheduled: "default",
  sending: "default",
  sent: "default",
  cancelled: "destructive",
};

function statusBadgeVariant(status: string) {
  if (status === "cancelled") return "destructive" as const;
  return status === "draft" ? ("secondary" as const) : ("default" as const);
}

export default function CampaignDetail({
  campaignId,
  open,
  onClose,
}: CampaignDetailProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  const { data: campaign, isLoading } = useQuery<CampaignData>({
    queryKey: [`/api/admin/campaigns/${campaignId}`],
    enabled: open && campaignId > 0,
  });

  function pct(part: number, total: number) {
    if (total === 0) return "0%";
    return `${Math.round((part / total) * 100)}%`;
  }

  function formatDate(d: string | null) {
    if (!d) return "-";
    return new Date(d).toLocaleString();
  }

  function recipientBadgeVariant(status: string) {
    if (status === "failed" || status === "bounced")
      return "destructive" as const;
    if (status === "pending") return "secondary" as const;
    return "default" as const;
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {campaign?.name || (isEs ? "Cargando..." : "Loading...")}
            {campaign && (
              <Badge variant={statusBadgeVariant(campaign.status)}>
                {campaign.status}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {isLoading || !campaign ? (
          <div className="py-8 text-center text-muted-foreground">
            {isEs ? "Cargando..." : "Loading..."}
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">
                      {campaign.totalRecipients}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isEs ? "Destinatarios" : "Recipients"}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Send className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{campaign.sentCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {isEs ? "Enviados" : "Sent"}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">
                      {campaign.openedCount}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({pct(campaign.openedCount, campaign.sentCount)})
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isEs ? "Abiertos" : "Opened"}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <MousePointerClick className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">
                      {campaign.clickedCount}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({pct(campaign.clickedCount, campaign.sentCount)})
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isEs ? "Clicks" : "Clicked"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recipients table */}
            <div>
              <h4 className="text-sm font-semibold mb-2">
                {isEs ? "Destinatarios" : "Recipients"}
              </h4>
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2.5 font-medium">
                        {isEs ? "Nombre" : "Name"}
                      </th>
                      <th className="text-left p-2.5 font-medium">Email</th>
                      <th className="text-left p-2.5 font-medium">
                        {isEs ? "Estado" : "Status"}
                      </th>
                      <th className="text-left p-2.5 font-medium">
                        {isEs ? "Enviado" : "Sent At"}
                      </th>
                      <th className="text-left p-2.5 font-medium">
                        {isEs ? "Abierto" : "Opened At"}
                      </th>
                      <th className="text-left p-2.5 font-medium">
                        {isEs ? "Click" : "Clicked At"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.recipients.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-4 text-center text-muted-foreground"
                        >
                          {isEs
                            ? "No hay destinatarios"
                            : "No recipients"}
                        </td>
                      </tr>
                    ) : (
                      campaign.recipients.map((r) => (
                        <tr key={r.id} className="border-b hover:bg-muted/30">
                          <td className="p-2.5">{r.name}</td>
                          <td className="p-2.5 text-muted-foreground">
                            {r.email}
                          </td>
                          <td className="p-2.5">
                            <Badge variant={recipientBadgeVariant(r.status)}>
                              {r.status}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-xs">{formatDate(r.sentAt)}</td>
                          <td className="p-2.5 text-xs">
                            {formatDate(r.openedAt)}
                          </td>
                          <td className="p-2.5 text-xs">
                            {formatDate(r.clickedAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
