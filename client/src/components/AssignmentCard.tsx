import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Brain, Video, Dumbbell, Clock, User } from "lucide-react";

interface Assignment {
  id: number;
  tutorId: number;
  studentId: number;
  contentId: number;
  dueDate: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  contentTitle: string;
  contentTitleEs: string;
  contentType: string;
  tutorName: string;
}

interface AssignmentCardProps {
  assignment: Assignment;
  onClick?: () => void;
}

const CONTENT_ICONS: Record<string, any> = {
  document: FileText,
  quiz: Brain,
  video: Video,
  exercise: Dumbbell,
};

const STATUS_STYLES: Record<string, { label: string; labelEs: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  assigned: { label: "Assigned", labelEs: "Asignada", variant: "default" },
  in_progress: { label: "In Progress", labelEs: "En Progreso", variant: "secondary" },
  completed: { label: "Completed", labelEs: "Completada", variant: "outline" },
  overdue: { label: "Overdue", labelEs: "Vencida", variant: "destructive" },
};

export default function AssignmentCard({ assignment, onClick }: AssignmentCardProps) {
  const { language } = useLanguage();
  const Icon = CONTENT_ICONS[assignment.contentType] || FileText;
  const statusInfo = STATUS_STYLES[assignment.status] || STATUS_STYLES.assigned;
  const title = language === "es" ? assignment.contentTitleEs : assignment.contentTitle;

  const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date() && assignment.status !== "completed";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "es" ? "es" : "en", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-md ${isOverdue ? "border-red-200" : ""}`}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <div className={`p-2 rounded-lg ${isOverdue ? "bg-red-100" : "bg-gray-100"}`}>
          <Icon size={18} className={isOverdue ? "text-red-600" : "text-gray-600"} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <User size={12} />
            <span>{assignment.tutorName}</span>
            {assignment.dueDate && (
              <>
                <Clock size={12} />
                <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                  {formatDate(assignment.dueDate)}
                </span>
              </>
            )}
          </div>
        </div>
        <Badge variant={isOverdue ? "destructive" : statusInfo.variant}>
          {isOverdue
            ? (language === "es" ? "Vencida" : "Overdue")
            : (language === "es" ? statusInfo.labelEs : statusInfo.label)}
        </Badge>
      </CardContent>
    </Card>
  );
}
