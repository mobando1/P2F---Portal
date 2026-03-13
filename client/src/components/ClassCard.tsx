import { motion } from "framer-motion";
import { Video, Calendar, Clock, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";

interface ClassCardProps {
  classItem: {
    id: number;
    title: string;
    scheduledAt: string | Date;
    duration: number;
    status: string;
    meetingLink?: string | null;
    tutorName?: string;
    isTrial?: boolean;
  };
  onCancel?: (classId: number) => void;
  onReschedule?: (classId: number) => void;
  showActions?: boolean;
}

export function ClassCard({ classItem, onCancel, onReschedule, showActions = true }: ClassCardProps) {
  const { language } = useLanguage();
  const scheduledAt = new Date(classItem.scheduledAt);
  const now = new Date();
  const minutesUntilClass = (scheduledAt.getTime() - now.getTime()) / (1000 * 60);
  const isJoinable = minutesUntilClass > 0 && minutesUntilClass <= 30;
  const isUpcoming = minutesUntilClass > 0;
  const hoursUntilClass = minutesUntilClass / 60;
  const canCancel = hoursUntilClass >= 24;

  const dateStr = scheduledAt.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const timeStr = scheduledAt.toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 text-sm truncate">
              {classItem.tutorName || classItem.title}
            </h4>
            {classItem.isTrial && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                Trial
              </Badge>
            )}
            {isJoinable && (
              <Badge className="text-xs bg-green-100 text-green-700 animate-pulse">
                {language === 'es' ? 'Ahora' : 'Now'}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {dateStr}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeStr}
            </span>
            <span>{classItem.duration} min</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Join button - prominent when class is about to start */}
          {isUpcoming && classItem.meetingLink && (
            <a href={classItem.meetingLink} target="_blank" rel="noopener noreferrer">
              <Button
                size="sm"
                className={`text-xs ${
                  isJoinable
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-200"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
                variant={isJoinable ? "default" : "outline"}
              >
                <Video className="w-3 h-3 mr-1" />
                {language === 'es' ? 'Unirse' : 'Join'}
              </Button>
            </a>
          )}

          {/* Action buttons */}
          {showActions && isUpcoming && (
            <>
              {onReschedule && canCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReschedule(classItem.id)}
                  className="text-xs text-gray-400 hover:text-blue-600 p-1.5"
                  aria-label={language === 'es' ? 'Reagendar' : 'Reschedule'}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              )}
              {onCancel && canCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCancel(classItem.id)}
                  className="text-xs text-gray-400 hover:text-red-600 p-1.5"
                  aria-label={language === 'es' ? 'Cancelar' : 'Cancel'}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
