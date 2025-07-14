import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  appointmentId?: string;
}

interface TutorCalendarProps {
  tutorId: number;
  tutorName: string;
  userId: number;
  onBookingSuccess?: () => void;
}

export function TutorCalendar({ tutorId, tutorName, userId, onBookingSuccess }: TutorCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Consultar disponibilidad del tutor
  const { data: availability, isLoading, error } = useQuery({
    queryKey: ['tutor-availability', tutorId, selectedDate],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/calendar/tutor/${tutorId}/availability?date=${selectedDate}`);
      return response.json();
    },
    enabled: !!tutorId && !!selectedDate
  });

  // Mutación para reservar clase
  const bookClassMutation = useMutation({
    mutationFn: async (bookingData: { userId: number; tutorId: number; date: string; startTime: string; endTime: string }) => {
      const response = await apiRequest('POST', '/api/calendar/book', bookingData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "¡Clase reservada!",
        description: `Tu clase con ${tutorName} ha sido reservada exitosamente.`,
        variant: "default",
      });
      
      // Invalidar cache para actualizar disponibilidad
      queryClient.invalidateQueries({ queryKey: ['tutor-availability', tutorId] });
      queryClient.invalidateQueries({ queryKey: ['user-classes', userId] });
      
      setSelectedSlot(null);
      onBookingSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error al reservar",
        description: error.message || "No se pudo reservar la clase. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  });

  const handleBookClass = () => {
    if (!selectedSlot) return;

    bookClassMutation.mutate({
      userId,
      tutorId,
      date: selectedDate,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getNextSevenDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        display: date.toLocaleDateString('es-ES', { 
          weekday: 'short', 
          day: 'numeric',
          month: 'short'
        })
      });
    }
    
    return days;
  };

  if (error) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-red-500">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>Error cargando disponibilidad</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center text-[#0A4A6E]">
          <Calendar className="w-5 h-5 mr-2" />
          Reservar clase con {tutorName}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Selector de fecha */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[#0A4A6E] mb-3">Selecciona una fecha</h3>
          <div className="grid grid-cols-7 gap-2">
            {getNextSevenDays().map((day) => (
              <Button
                key={day.date}
                variant={selectedDate === day.date ? "default" : "outline"}
                className={`p-2 text-xs h-auto flex flex-col ${
                  selectedDate === day.date 
                    ? 'bg-[#1C7BB1] text-white' 
                    : 'hover:bg-[#1C7BB1]/10'
                }`}
                onClick={() => {
                  setSelectedDate(day.date);
                  setSelectedSlot(null);
                }}
              >
                {day.display}
              </Button>
            ))}
          </div>
        </div>

        {/* Slots de tiempo */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[#0A4A6E] mb-3">Horarios disponibles</h3>
          
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : availability && availability.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {availability.map((slot: TimeSlot, index: number) => (
                <Button
                  key={index}
                  variant={selectedSlot?.start === slot.start ? "default" : "outline"}
                  className={`p-2 text-xs h-10 ${
                    !slot.available 
                      ? 'opacity-50 cursor-not-allowed' 
                      : selectedSlot?.start === slot.start
                        ? 'bg-[#1C7BB1] text-white'
                        : 'hover:bg-[#1C7BB1]/10'
                  }`}
                  disabled={!slot.available}
                  onClick={() => setSelectedSlot(slot)}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(slot.start)}
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No hay horarios disponibles para esta fecha</p>
            </div>
          )}
        </div>

        {/* Información del slot seleccionado */}
        {selectedSlot && (
          <div className="mb-6 p-4 bg-[#EAF4FA] rounded-lg border border-[#1C7BB1]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2 text-[#1C7BB1]" />
                <span className="font-medium text-[#0A4A6E]">{tutorName}</span>
              </div>
              <Badge variant="secondary" className="bg-[#1C7BB1]/10 text-[#1C7BB1]">
                {formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}
              </Badge>
            </div>
            <p className="text-sm text-[#0A4A6E]/70 mt-2">
              Fecha: {new Date(selectedDate).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        )}

        {/* Botón de reserva */}
        <Button 
          onClick={handleBookClass}
          disabled={!selectedSlot || bookClassMutation.isPending}
          className="w-full bg-gradient-to-r from-[#1C7BB1] to-[#1C7BB1]/80 hover:from-[#1C7BB1]/90 hover:to-[#1C7BB1] text-white font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          {bookClassMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Reservando...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Reservar clase
            </>
          )}
        </Button>

        {/* Nota informativa */}
        <p className="text-xs text-[#0A4A6E]/60 mt-4 text-center">
          Las clases se pueden cancelar hasta 24 horas antes sin penalización
        </p>
      </CardContent>
    </Card>
  );
}