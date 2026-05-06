import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Flag, Plus, Trash2 } from "lucide-react";

interface Flag {
  key: string;
  enabled: boolean;
  rolloutPercentage: number;
  userOverrides: number[];
  description: string | null;
  updatedAt: string;
}

export default function FeatureFlagsTab({ isEs }: { isEs: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: flags = [], isLoading } = useQuery<Flag[]>({
    queryKey: ["/api/admin/feature-flags"],
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ key, body }: { key: string; body: any }) => {
      const r = await apiRequest("PUT", `/api/admin/feature-flags/${key}`, body);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags"] });
    },
    onError: () => toast({ title: "Error", description: isEs ? "No se pudo guardar" : "Could not save", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const r = await apiRequest("DELETE", `/api/admin/feature-flags/${key}`);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags"] });
    },
  });

  const handleCreate = () => {
    if (!newKey.trim()) return;
    upsertMutation.mutate({
      key: newKey.trim(),
      body: { enabled: false, rolloutPercentage: 0, description: newDescription.trim() || null },
    });
    setNewKey("");
    setNewDescription("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-[#1C7BB1]" />
            {isEs ? "Feature Flags" : "Feature Flags"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            {isEs
              ? "Activa o desactiva funcionalidades en tiempo real. Los cambios se aplican en menos de 60 segundos sin redeploy. Útil para hacer rollout gradual (ej. LiveKit al 5% de usuarios primero)."
              : "Toggle features in real time. Changes propagate in under 60 seconds without redeploy. Use for gradual rollouts (e.g. LiveKit at 5% of users first)."}
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mb-6 p-3 bg-gray-50 rounded-lg border">
            <Input
              placeholder={isEs ? "Nombre del flag (ej: livekit_classroom)" : "Flag key (e.g., livekit_classroom)"}
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder={isEs ? "Descripción opcional" : "Optional description"}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleCreate} disabled={!newKey.trim() || upsertMutation.isPending}>
              <Plus className="w-4 h-4 mr-1" />
              {isEs ? "Crear" : "Create"}
            </Button>
          </div>

          {isLoading && <p className="text-gray-500">{isEs ? "Cargando…" : "Loading…"}</p>}

          {!isLoading && flags.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              {isEs ? "Aún no hay flags. Crea el primero arriba." : "No flags yet. Create one above."}
            </p>
          )}

          <div className="space-y-3">
            {flags.map(flag => (
              <FlagRow
                key={flag.key}
                flag={flag}
                isEs={isEs}
                onUpdate={(body) => upsertMutation.mutate({ key: flag.key, body })}
                onDelete={() => {
                  if (confirm(isEs ? `¿Borrar flag "${flag.key}"?` : `Delete flag "${flag.key}"?`)) {
                    deleteMutation.mutate(flag.key);
                  }
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FlagRow({ flag, isEs, onUpdate, onDelete }: {
  flag: Flag; isEs: boolean; onUpdate: (body: any) => void; onDelete: () => void;
}) {
  const [percentage, setPercentage] = useState(flag.rolloutPercentage);
  const [userOverridesText, setUserOverridesText] = useState(flag.userOverrides.join(", "));

  const savePercentage = () => onUpdate({ rolloutPercentage: percentage });
  const saveOverrides = () => {
    const arr = userOverridesText.split(",")
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));
    onUpdate({ userOverrides: arr });
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[#0A4A6E] font-mono text-sm">{flag.key}</h4>
          {flag.description && <p className="text-xs text-gray-600 mt-1">{flag.description}</p>}
          <p className="text-[10px] text-gray-400 mt-1">
            {isEs ? "Actualizado" : "Updated"}: {new Date(flag.updatedAt).toLocaleString(isEs ? "es-ES" : "en-US")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={flag.enabled}
              onCheckedChange={(v) => onUpdate({ enabled: v })}
            />
            <span className="text-xs text-gray-500">{flag.enabled ? (isEs ? "Activo" : "On") : (isEs ? "Apagado" : "Off")}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div>
          <Label className="text-xs">{isEs ? "Rollout %" : "Rollout %"} ({percentage}%)</Label>
          <div className="flex gap-2 items-center">
            <input
              type="range"
              min={0}
              max={100}
              value={percentage}
              onChange={(e) => setPercentage(parseInt(e.target.value))}
              className="flex-1"
              disabled={!flag.enabled}
            />
            <Button size="sm" onClick={savePercentage} disabled={percentage === flag.rolloutPercentage}>
              {isEs ? "Guardar" : "Save"}
            </Button>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            {isEs ? "% determinístico de usuarios. Mismo userId siempre cae igual." : "Deterministic % of users. Same userId always lands the same way."}
          </p>
        </div>

        <div>
          <Label className="text-xs">{isEs ? "User IDs forzados" : "Forced user IDs"}</Label>
          <div className="flex gap-2">
            <Input
              value={userOverridesText}
              onChange={(e) => setUserOverridesText(e.target.value)}
              placeholder="1, 2, 7"
              className="text-xs"
            />
            <Button size="sm" onClick={saveOverrides}>
              {isEs ? "Guardar" : "Save"}
            </Button>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            {isEs ? "Comma-separated. Estos usuarios siempre verán la feature." : "Comma-separated. These users always see the feature."}
          </p>
        </div>
      </div>
    </div>
  );
}
