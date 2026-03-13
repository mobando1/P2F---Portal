import { useState, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Users, Filter, Save, Eye } from "lucide-react";

export interface SegmentRule {
  field: string;
  operator: string;
  value: any;
}

export interface SegmentFilters {
  logic: "AND" | "OR";
  rules: SegmentRule[];
}

interface SegmentBuilderProps {
  onFiltersChange?: (filters: SegmentFilters) => void;
  initialFilters?: SegmentFilters;
  showSave?: boolean;
  onSave?: (name: string, description: string, filters: SegmentFilters) => void;
}

type FieldType = "string" | "number" | "boolean";

interface FieldConfig {
  key: string;
  labelEn: string;
  labelEs: string;
  type: FieldType;
  options?: { value: string; labelEn: string; labelEs: string }[];
}

const FIELD_CONFIGS: FieldConfig[] = [
  {
    key: "userType",
    labelEn: "User Type",
    labelEs: "Tipo de Usuario",
    type: "string",
    options: [
      { value: "trial", labelEn: "Trial", labelEs: "Prueba" },
      { value: "lead", labelEn: "Lead", labelEs: "Prospecto" },
      { value: "negotiation", labelEn: "Negotiation", labelEs: "Negociación" },
      { value: "customer", labelEn: "Customer", labelEs: "Cliente" },
      { value: "inactive", labelEn: "Inactive", labelEs: "Inactivo" },
    ],
  },
  {
    key: "level",
    labelEn: "Level",
    labelEs: "Nivel",
    type: "string",
    options: [
      { value: "A1", labelEn: "A1", labelEs: "A1" },
      { value: "A2", labelEn: "A2", labelEs: "A2" },
      { value: "B1", labelEn: "B1", labelEs: "B1" },
      { value: "B2", labelEn: "B2", labelEs: "B2" },
      { value: "C1", labelEn: "C1", labelEs: "C1" },
      { value: "C2", labelEn: "C2", labelEs: "C2" },
    ],
  },
  {
    key: "trialCompleted",
    labelEn: "Trial Completed",
    labelEs: "Prueba Completada",
    type: "boolean",
  },
  {
    key: "classCredits",
    labelEn: "Class Credits",
    labelEs: "Créditos de Clase",
    type: "number",
  },
  {
    key: "daysSinceRegistration",
    labelEn: "Days Since Registration",
    labelEs: "Días Desde Registro",
    type: "number",
  },
  {
    key: "daysSinceLastActivity",
    labelEn: "Days Since Last Activity",
    labelEs: "Días Desde Última Actividad",
    type: "number",
  },
  {
    key: "aiSubscriptionActive",
    labelEn: "AI Subscription Active",
    labelEs: "Suscripción IA Activa",
    type: "boolean",
  },
  {
    key: "crmTags",
    labelEn: "CRM Tags",
    labelEs: "Etiquetas CRM",
    type: "string",
  },
];

const OPERATORS_BY_TYPE: Record<FieldType, { value: string; labelEn: string; labelEs: string }[]> = {
  string: [
    { value: "equals", labelEn: "Equals", labelEs: "Igual a" },
    { value: "in", labelEn: "In", labelEs: "En" },
  ],
  number: [
    { value: "equals", labelEn: "Equals", labelEs: "Igual a" },
    { value: "greaterThan", labelEn: "Greater than", labelEs: "Mayor que" },
    { value: "lessThan", labelEn: "Less than", labelEs: "Menor que" },
  ],
  boolean: [
    { value: "equals", labelEn: "Equals", labelEs: "Igual a" },
  ],
};

function getFieldConfig(fieldKey: string): FieldConfig | undefined {
  return FIELD_CONFIGS.find((f) => f.key === fieldKey);
}

export default function SegmentBuilder({
  onFiltersChange,
  initialFilters,
  showSave = false,
  onSave,
}: SegmentBuilderProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  const [filters, setFilters] = useState<SegmentFilters>(
    initialFilters ?? { logic: "AND", rules: [] }
  );
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");

  const updateFilters = useCallback(
    (next: SegmentFilters) => {
      setFilters(next);
      setPreviewCount(null);
      onFiltersChange?.(next);
    },
    [onFiltersChange]
  );

  const toggleLogic = () => {
    updateFilters({ ...filters, logic: filters.logic === "AND" ? "OR" : "AND" });
  };

  const addRule = () => {
    updateFilters({
      ...filters,
      rules: [...filters.rules, { field: "userType", operator: "equals", value: "" }],
    });
  };

  const removeRule = (index: number) => {
    updateFilters({
      ...filters,
      rules: filters.rules.filter((_, i) => i !== index),
    });
  };

  const updateRule = (index: number, patch: Partial<SegmentRule>) => {
    const updated = filters.rules.map((r, i) => {
      if (i !== index) return r;
      const merged = { ...r, ...patch };

      // When field changes, reset operator and value to sensible defaults
      if (patch.field && patch.field !== r.field) {
        const cfg = getFieldConfig(patch.field);
        const fieldType = cfg?.type ?? "string";
        merged.operator = OPERATORS_BY_TYPE[fieldType][0].value;
        merged.value = fieldType === "boolean" ? "true" : "";
      }

      return merged;
    });
    updateFilters({ ...filters, rules: updated });
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const res = await apiRequest("POST", "/api/admin/campaigns/segments/preview", filters);
      const data = await res.json();
      setPreviewCount(data.count ?? 0);
    } catch {
      setPreviewCount(0);
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = () => {
    if (onSave && saveName.trim()) {
      onSave(saveName.trim(), saveDescription.trim(), filters);
    }
  };

  const renderValueInput = (rule: SegmentRule, index: number) => {
    const cfg = getFieldConfig(rule.field);
    if (!cfg) {
      return (
        <Input
          value={rule.value ?? ""}
          onChange={(e) => updateRule(index, { value: e.target.value })}
          placeholder={isEs ? "Valor" : "Value"}
          className="w-full min-w-[120px]"
        />
      );
    }

    if (cfg.type === "boolean") {
      return (
        <Select
          value={String(rule.value)}
          onValueChange={(v) => updateRule(index, { value: v })}
        >
          <SelectTrigger className="w-full min-w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">{isEs ? "Sí" : "True"}</SelectItem>
            <SelectItem value="false">{isEs ? "No" : "False"}</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (cfg.type === "number") {
      return (
        <Input
          type="number"
          value={rule.value ?? ""}
          onChange={(e) => updateRule(index, { value: e.target.value })}
          placeholder={isEs ? "Valor" : "Value"}
          className="w-full min-w-[120px]"
        />
      );
    }

    // String type with predefined options (not crmTags)
    if (cfg.options) {
      return (
        <Select
          value={rule.value ?? ""}
          onValueChange={(v) => updateRule(index, { value: v })}
        >
          <SelectTrigger className="w-full min-w-[120px]">
            <SelectValue placeholder={isEs ? "Seleccionar" : "Select"} />
          </SelectTrigger>
          <SelectContent>
            {cfg.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {isEs ? opt.labelEs : opt.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // String type without options (e.g. crmTags)
    return (
      <Input
        value={rule.value ?? ""}
        onChange={(e) => updateRule(index, { value: e.target.value })}
        placeholder={isEs ? "Valor" : "Value"}
        className="w-full min-w-[120px]"
      />
    );
  };

  return (
    <Card className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-[#1C7BB1]" />
          <h3 className="text-lg font-semibold">
            {isEs ? "Constructor de Segmentos" : "Segment Builder"}
          </h3>
        </div>

        {previewCount !== null && (
          <Badge className="bg-[#1C7BB1] hover:bg-[#1C7BB1]/90 text-white text-sm px-3 py-1">
            <Users className="h-4 w-4 mr-1.5" />
            {previewCount} {isEs ? "estudiantes coinciden" : "students match"}
          </Badge>
        )}
      </div>

      {/* Logic toggle */}
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">
          {isEs ? "Combinar reglas con:" : "Combine rules with:"}
        </Label>
        <Button
          variant={filters.logic === "AND" ? "default" : "outline"}
          size="sm"
          onClick={filters.logic !== "AND" ? toggleLogic : undefined}
          className={
            filters.logic === "AND"
              ? "bg-[#1C7BB1] hover:bg-[#1C7BB1]/90"
              : ""
          }
        >
          AND
        </Button>
        <Button
          variant={filters.logic === "OR" ? "default" : "outline"}
          size="sm"
          onClick={filters.logic !== "OR" ? toggleLogic : undefined}
          className={
            filters.logic === "OR"
              ? "bg-[#1C7BB1] hover:bg-[#1C7BB1]/90"
              : ""
          }
        >
          OR
        </Button>
      </div>

      {/* Rules */}
      <div className="space-y-2">
        {filters.rules.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-3 text-center">
            {isEs
              ? "No hay reglas. Agrega una para comenzar."
              : "No rules yet. Add one to get started."}
          </p>
        )}

        {filters.rules.map((rule, index) => {
          const cfg = getFieldConfig(rule.field);
          const fieldType = cfg?.type ?? "string";
          const operators = OPERATORS_BY_TYPE[fieldType];

          return (
            <div
              key={index}
              className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-muted/30"
            >
              {/* Field selector */}
              <Select
                value={rule.field}
                onValueChange={(v) => updateRule(index, { field: v })}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_CONFIGS.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {isEs ? f.labelEs : f.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operator selector */}
              <Select
                value={rule.operator}
                onValueChange={(v) => updateRule(index, { operator: v })}
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {isEs ? op.labelEs : op.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value input */}
              <div className="flex-1 min-w-[120px]">
                {renderValueInput(rule, index)}
              </div>

              {/* Delete button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRule(index)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={addRule}>
          <Plus className="h-4 w-4 mr-1.5" />
          {isEs ? "Agregar Regla" : "Add Rule"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handlePreview}
          disabled={filters.rules.length === 0 || previewing}
        >
          <Eye className="h-4 w-4 mr-1.5" />
          {previewing
            ? isEs
              ? "Cargando..."
              : "Loading..."
            : isEs
              ? "Vista Previa"
              : "Preview"}
        </Button>
      </div>

      {/* Save section */}
      {showSave && (
        <div className="border-t pt-4 space-y-3">
          <Label className="text-sm font-medium">
            {isEs ? "Guardar Segmento" : "Save Segment"}
          </Label>
          <div className="flex flex-wrap gap-2">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={isEs ? "Nombre del segmento" : "Segment name"}
              className="flex-1 min-w-[160px]"
            />
            <Input
              value={saveDescription}
              onChange={(e) => setSaveDescription(e.target.value)}
              placeholder={isEs ? "Descripción (opcional)" : "Description (optional)"}
              className="flex-1 min-w-[200px]"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!saveName.trim() || filters.rules.length === 0}
              className="bg-[#1C7BB1] hover:bg-[#1C7BB1]/90"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {isEs ? "Guardar" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
