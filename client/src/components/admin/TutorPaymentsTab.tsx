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
  DollarSign,
  Clock,
  Users,
  CheckCircle,
  Upload,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface PendingPayment {
  tutorId: number;
  tutorName: string;
  tutorEmail: string;
  hourlyRate: number;
  unpaidClasses: number;
  unpaidHours: number;
  amountOwed: number;
  periodStart: string | null;
  periodEnd: string | null;
}

interface TutorPaymentRecord {
  id: number;
  tutorId: number;
  amount: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  classesCount: number;
  hoursWorked: string;
  status: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  receiptUrl: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
}

export default function TutorPaymentsTab() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEs = language === "es";

  const [payModal, setPayModal] = useState<PendingPayment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("wise");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [view, setView] = useState<"pending" | "history">("pending");

  const { data: pending, isLoading: pendingLoading } = useQuery<PendingPayment[]>({
    queryKey: ["/api/admin/tutor-payments/pending"],
    queryFn: () => apiRequest("GET", "/api/admin/tutor-payments/pending").then(r => r.json()),
    enabled: view === "pending",
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery<TutorPaymentRecord[]>({
    queryKey: ["/api/admin/tutor-payments"],
    queryFn: () => apiRequest("GET", "/api/admin/tutor-payments").then(r => r.json()),
    enabled: view === "history",
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/admin/tutor-payments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tutor-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tutor-payments/pending"] });
      setPayModal(null);
      resetForm();
      toast({ title: isEs ? "Pago registrado" : "Payment registered" });
    },
    onError: () => {
      toast({ title: "Error", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setPaymentMethod("wise");
    setPaymentReference("");
    setPaymentNotes("");
    setReceiptFile(null);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: isEs ? "Archivo muy grande (máx 5MB)" : "File too large (max 5MB)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptFile(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = () => {
    if (!payModal) return;
    createPaymentMutation.mutate({
      tutorId: payModal.tutorId,
      amount: payModal.amountOwed.toString(),
      currency: "USD",
      periodStart: payModal.periodStart,
      periodEnd: payModal.periodEnd,
      classesCount: payModal.unpaidClasses,
      hoursWorked: payModal.unpaidHours.toString(),
      status: "paid",
      paymentMethod,
      paymentReference: paymentReference || null,
      receiptUrl: receiptFile,
      notes: paymentNotes || null,
    });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      pending: { label: isEs ? "Pendiente" : "Pending", color: "bg-warning/15 text-warning-foreground" },
      paid: { label: isEs ? "Pagado" : "Paid", color: "bg-success/15 text-success" },
      cancelled: { label: isEs ? "Cancelado" : "Cancelled", color: "bg-destructive/15 text-destructive" },
    };
    const s = map[status] || map.pending;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex gap-2">
        <Button
          variant={view === "pending" ? "default" : "outline"}
          size="sm"
          className={view === "pending" ? "bg-primary hover:bg-primary-900" : ""}
          onClick={() => setView("pending")}
        >
          <AlertCircle className="h-4 w-4 mr-1.5" />
          {isEs ? "Liquidación" : "Pending"}
        </Button>
        <Button
          variant={view === "history" ? "default" : "outline"}
          size="sm"
          className={view === "history" ? "bg-primary hover:bg-primary-900" : ""}
          onClick={() => setView("history")}
        >
          <FileText className="h-4 w-4 mr-1.5" />
          {isEs ? "Historial" : "History"}
        </Button>
      </div>

      {/* Pending Liquidation */}
      {view === "pending" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <h2 className="text-base font-semibold text-primary-900 mb-4">
              {isEs ? "Liquidación Pendiente" : "Pending Liquidation"}
            </h2>
            {pendingLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
            ) : !pending || pending.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-sm">{isEs ? "Todos los tutores están al día" : "All tutors are paid up"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map(p => (
                  <div key={p.tutorId} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/40">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-primary-900">{p.tutorName}</h4>
                      <p className="text-xs text-muted-foreground">{p.tutorEmail}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0 hidden sm:flex">
                      <div className="text-center">
                        <p className="font-bold text-primary-900">{p.unpaidClasses}</p>
                        <p>{isEs ? "Clases" : "Classes"}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-primary-900">{p.unpaidHours}h</p>
                        <p>{isEs ? "Horas" : "Hours"}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-primary-900">${p.hourlyRate}/h</p>
                        <p>{isEs ? "Tarifa" : "Rate"}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-success">${p.amountOwed.toFixed(2)}</p>
                      <Button
                        size="sm"
                        className="mt-1 bg-green-600 hover:bg-green-700 h-7 text-xs"
                        onClick={() => { resetForm(); setPayModal(p); }}
                      >
                        {isEs ? "Pagar" : "Pay"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {view === "history" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <h2 className="text-base font-semibold text-primary-900 mb-4">
              {isEs ? "Historial de Pagos" : "Payment History"}
            </h2>
            {paymentsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
            ) : !payments || payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm">{isEs ? "Sin pagos registrados" : "No payments recorded"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                    <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary-900">
                        {isEs ? "Tutor" : "Tutor"} #{p.tutorId} — {p.classesCount} {isEs ? "clases" : "classes"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.periodStart).toLocaleDateString()} — {new Date(p.periodEnd).toLocaleDateString()}
                        {p.paymentMethod && ` · ${p.paymentMethod}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-primary-900">${parseFloat(p.amount).toFixed(2)}</p>
                      {statusBadge(p.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pay Modal */}
      <Dialog open={!!payModal} onOpenChange={(open) => { if (!open) setPayModal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEs ? "Registrar Pago" : "Register Payment"}</DialogTitle>
          </DialogHeader>

          {payModal && (
            <div className="space-y-4 py-2">
              {/* Summary */}
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <p className="font-medium text-primary-900">{payModal.tutorName}</p>
                <p className="text-xs text-primary">{payModal.tutorEmail}</p>
                <div className="flex gap-4 mt-2 text-xs text-primary-900">
                  <span>{payModal.unpaidClasses} {isEs ? "clases" : "classes"}</span>
                  <span>{payModal.unpaidHours}h</span>
                  <span>${payModal.hourlyRate}/h</span>
                </div>
                <p className="text-lg font-bold text-success mt-1">${payModal.amountOwed.toFixed(2)} USD</p>
              </div>

              <div className="space-y-1.5">
                <Label>{isEs ? "Método de pago" : "Payment method"}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wise">Wise</SelectItem>
                    <SelectItem value="bank_transfer">{isEs ? "Transferencia bancaria" : "Bank transfer"}</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="payoneer">Payoneer</SelectItem>
                    <SelectItem value="other">{isEs ? "Otro" : "Other"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{isEs ? "Referencia de transacción" : "Transaction reference"}</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={isEs ? "ID de Wise, # de transferencia..." : "Wise ID, transfer #..."}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{isEs ? "Comprobante de pago" : "Payment receipt"}</Label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/40 text-sm text-muted-foreground flex-1">
                    <Upload className="h-4 w-4" />
                    {receiptFile ? (isEs ? "Archivo cargado" : "File loaded") : (isEs ? "Subir imagen o PDF" : "Upload image or PDF")}
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleReceiptUpload} />
                  </label>
                  {receiptFile && (
                    <Button variant="outline" size="sm" onClick={() => setReceiptFile(null)}>X</Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">{isEs ? "Máx 5MB. JPG, PNG o PDF" : "Max 5MB. JPG, PNG or PDF"}</p>
              </div>

              <div className="space-y-1.5">
                <Label>{isEs ? "Notas (opcional)" : "Notes (optional)"}</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder={isEs ? "Notas internas..." : "Internal notes..."}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayModal(null)}>{isEs ? "Cancelar" : "Cancel"}</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSubmitPayment}
              disabled={createPaymentMutation.isPending}
            >
              {createPaymentMutation.isPending ? (
                <><Loader2 className="animate-spin mr-2 h-4 w-4" /> {isEs ? "Registrando..." : "Registering..."}</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-1" /> {isEs ? "Confirmar Pago" : "Confirm Payment"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
