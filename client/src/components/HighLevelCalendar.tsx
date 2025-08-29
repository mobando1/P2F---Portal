import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

  // Script de High Level se carga automáticamente cuando el iframe se monta

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.origin === 'https://api.leadconnectorhq.com' || event.origin.includes('leadconnectorhq.com')) {
          console.log('📅 Mensaje de High Level:', event.data);
          
          // Manejar resize del iframe - ajustar al contenedor flexible
          if (event.data && event.data[0] === 'highlevel.setHeight') {
            const heightData = event.data[1];
            if (heightData && heightData.height && iframeRef.current) {
              // El iframe ya usa flex-1, así que no necesitamos altura fija
              console.log(`📏 High Level solicita altura: ${heightData.height}px (usando flex para ajuste automático)`);
            }
          }
          
          // Manejar completación de reserva
          if (event.data?.type === 'booking_completed' || event.data?.type === 'appointment_booked') {
            console.log('✅ Reserva completada en High Level:', event.data);
            if (onBookingComplete) {
              onBookingComplete();
            }
          }
        }
      } catch (error) {
        console.log('Error procesando mensaje:', error);
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

  const calendarUrl = `https://api.leadconnectorhq.com/widget/booking/${tutor.highLevelCalendarId}?location_id=R5AR05D5vU38A6wUS0R7`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold text-blue-800">
            Agendar Clase con {tutor.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            Selecciona una fecha y hora disponible para tu clase de español
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 pb-6 max-h-[calc(90vh-120px)] overflow-auto">
          <div className="flex items-center justify-end mb-4 gap-2">
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
          
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white relative">
            <iframe
              ref={iframeRef}
              src={calendarUrl}
              style={{ 
                width: '100%', 
                height: '908px',
                minHeight: '600px',
                border: 'none',
                overflow: 'hidden',
                display: 'block'
              }}
              scrolling="no"
              id="msgsndr-calendar"
              name="msgsndr-calendar"
              title={`Calendario de ${tutor.name}`}
              className="w-full"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
              allow="geolocation; microphone; camera"
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