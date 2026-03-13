import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Copy, Trash2, Tag } from "lucide-react";

interface Offer {
  id: number;
  name: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  applicableTo: "all" | "packages" | "subscriptions";
  maxUses: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  status: "active" | "expired";
}

export default function OfferManager() {
  const { language } = useLanguage();
  const isEs = language === "es";
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    applicableTo: "all" as "all" | "packages" | "subscriptions",
    maxUses: "",
    validFrom: "",
    validUntil: "",
  });

  const { data: offers = [], isLoading } = useQuery<Offer[]>({
    queryKey: ["/api/admin/campaigns/offers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("POST", "/api/admin/campaigns/offers", {
        ...data,
        discountValue: Number(data.discountValue),
        maxUses: data.maxUses ? Number(data.maxUses) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns/offers"] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/campaigns/offers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns/offers"] });
    },
  });

  function resetForm() {
    setForm({
      name: "",
      code: "",
      discountType: "percentage",
      discountValue: "",
      applicableTo: "all",
      maxUses: "",
      validFrom: "",
      validUntil: "",
    });
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
  }

  function formatDiscount(offer: Offer) {
    return offer.discountType === "percentage"
      ? `${offer.discountValue}%`
      : `$${offer.discountValue}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Tag className="h-5 w-5" />
          {isEs ? "Ofertas y Descuentos" : "Offers & Discounts"}
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {isEs ? "Nueva Oferta" : "New Offer"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isEs ? "Crear Oferta" : "Create Offer"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div>
                <Label>{isEs ? "Nombre" : "Name"}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>{isEs ? "Codigo" : "Code"}</Label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  placeholder="SUMMER25"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{isEs ? "Tipo de Descuento" : "Discount Type"}</Label>
                  <Select
                    value={form.discountType}
                    onValueChange={(v) =>
                      setForm({ ...form, discountType: v as "percentage" | "fixed" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        {isEs ? "Porcentaje" : "Percentage"}
                      </SelectItem>
                      <SelectItem value="fixed">
                        {isEs ? "Monto Fijo" : "Fixed Amount"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{isEs ? "Valor" : "Value"}</Label>
                  <Input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm({ ...form, discountValue: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label>{isEs ? "Aplicable a" : "Applicable To"}</Label>
                <Select
                  value={form.applicableTo}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      applicableTo: v as "all" | "packages" | "subscriptions",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isEs ? "Todos" : "All"}</SelectItem>
                    <SelectItem value="packages">
                      {isEs ? "Paquetes" : "Packages"}
                    </SelectItem>
                    <SelectItem value="subscriptions">
                      {isEs ? "Suscripciones" : "Subscriptions"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isEs ? "Usos Maximos (opcional)" : "Max Uses (optional)"}</Label>
                <Input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  placeholder={isEs ? "Sin limite" : "Unlimited"}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{isEs ? "Valido Desde" : "Valid From"}</Label>
                  <Input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>{isEs ? "Valido Hasta" : "Valid Until"}</Label>
                  <Input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) =>
                      setForm({ ...form, validUntil: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? isEs
                    ? "Creando..."
                    : "Creating..."
                  : isEs
                  ? "Crear Oferta"
                  : "Create Offer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">
              {isEs ? "Cargando..." : "Loading..."}
            </div>
          ) : offers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {isEs ? "No hay ofertas aun" : "No offers yet"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">
                      {isEs ? "Nombre" : "Name"}
                    </th>
                    <th className="text-left p-3 font-medium">
                      {isEs ? "Codigo" : "Code"}
                    </th>
                    <th className="text-left p-3 font-medium">
                      {isEs ? "Descuento" : "Discount"}
                    </th>
                    <th className="text-left p-3 font-medium">
                      {isEs ? "Fechas" : "Valid Dates"}
                    </th>
                    <th className="text-left p-3 font-medium">
                      {isEs ? "Usos" : "Uses"}
                    </th>
                    <th className="text-left p-3 font-medium">
                      {isEs ? "Estado" : "Status"}
                    </th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr key={offer.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">{offer.name}</td>
                      <td className="p-3">
                        <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                          {offer.code}
                        </code>
                      </td>
                      <td className="p-3">{formatDiscount(offer)}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(offer.validFrom).toLocaleDateString()} -{" "}
                        {new Date(offer.validUntil).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        {offer.usedCount}
                        {offer.maxUses ? `/${offer.maxUses}` : ""}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            offer.status === "active" ? "default" : "secondary"
                          }
                        >
                          {offer.status === "active"
                            ? isEs
                              ? "Activo"
                              : "Active"
                            : isEs
                            ? "Expirado"
                            : "Expired"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyCode(offer.code)}
                            title={isEs ? "Copiar codigo" : "Copy code"}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteMutation.mutate(offer.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
