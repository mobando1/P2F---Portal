import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, X } from "lucide-react";
import type { Tutor } from "@shared/schema";

interface HighLevelCalendarProps {
  tutor: Tutor;
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete?: () => void;
}

export function HighLevelCalendar({ tutor, isOpen, onClose, onBookingComplete }: HighLevelCalendarProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (isOpen && tutor.highLevelCalendarId && !scriptLoadedRef.current) {
      // Cargar el script de High Level
      const script = document.createElement('script');
      script.src = 'https://api.leadconnectorhq.com/js/form_embed.js';
      script.type = 'text/javascript';
      script.onload = () => {
        scriptLoadedRef.current = true;
      };
      document.head.appendChild(script);

      return () => {
        // Limpiar script al desmontar
        const existingScript = document.querySelector('script[src="https://api.leadconnectorhq.com/js/form_embed.js"]');
        if (existingScript) {
          existingScript.remove();
        }
      };
    }
  }, [isOpen, tutor.highLevelCalendarId]);

  // Detectar cuando se completa una reserva
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Escuchar mensajes del iframe de High Level
      if (event.origin === 'https://api.leadconnectorhq.com') {
        if (event.data?.type === 'booking_completed' || event.data?.type === 'appointment_booked') {
          console.log('📅 Reserva completada en High Level:', event.data);
          if (onBookingComplete) {
            onBookingComplete();
          }
        }
      }
    };

    if (isOpen) {
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [isOpen, onBookingComplete]);

  if (!tutor.highLevelCalendarId) {
    return null;
  }

  const calendarUrl = `https://api.leadconnectorhq.com/widget/booking/${tutor.highLevelCalendarId}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-blue-800">
              Agendar Clase con {tutor.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(calendarUrl, '_blank')}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir en Nueva Ventana
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Selecciona una fecha y hora disponible para tu clase de español
          </p>
        </DialogHeader>
        
        <div className="px-6 pb-6">
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <iframe
              ref={iframeRef}
              src={calendarUrl}
              style={{ 
                width: '100%', 
                height: '600px',
                border: 'none',
                overflow: 'hidden'
              }}
              scrolling="no"
              id={`${tutor.highLevelCalendarId}_${Date.now()}`}
              title={`Calendario de ${tutor.name}`}
              className="w-full"
            />
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">
              📋 Información Importante:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Tu clase será descontada automáticamente de tu balance</li>
              <li>• Recibirás confirmación por email con el enlace de Google Meet</li>
              <li>• El sistema detectará automáticamente cuando la clase termine</li>
              <li>• Los créditos se actualizarán en tiempo real</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}