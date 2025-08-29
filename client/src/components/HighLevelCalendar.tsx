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
      <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-3 pb-1 shrink-0 bg-gradient-to-r from-blue-50 to-blue-100 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold text-blue-800">
                Agendar Clase con {tutor.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Selecciona fecha y hora disponible
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(calendarUrl, '_blank')}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Nueva Ventana
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
        </DialogHeader>
        
        <div className="px-3 pb-3 flex-1 flex flex-col overflow-hidden min-h-0">
          
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white flex-1 min-h-0 relative">
            <iframe
              ref={iframeRef}
              src={calendarUrl}
              style={{ 
                width: '100%', 
                height: '100%',
                minHeight: '850px',
                border: 'none',
                overflow: 'hidden',
                display: 'block'
              }}
              scrolling="no"
              id="msgsndr-calendar"
              name="msgsndr-calendar"
              title={`Calendario de ${tutor.name}`}
              className="w-full h-full"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
              allow="geolocation; microphone; camera"
            />
          </div>
          
          {/* Información Importante - Muy Compacta */}
          <div className="mt-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-green-50 rounded-md border border-blue-100 shrink-0">
            <div className="flex items-center justify-center space-x-6 text-xs text-blue-700">
              <span className="flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>Descuento automático</span>
              <span className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>Confirmación email</span>
              <span className="flex items-center"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1.5"></span>Detección automática</span>
              <span className="flex items-center"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></span>Créditos en tiempo real</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}