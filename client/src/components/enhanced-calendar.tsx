import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import type { Tutor } from "@shared/schema";

interface EnhancedCalendarProps {
  remainingClasses: number;
  tutors: Tutor[];
  onBookClass: (tutorId: number, date: Date, time: string) => void;
}

export default function EnhancedCalendar({ remainingClasses, tutors, onBookClass }: EnhancedCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTutor, setSelectedTutor] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
    "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ];

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), 1));
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (clickedDate >= today) {
      setSelectedDate(clickedDate);
      setShowBookingDialog(true);
    }
  };

  const handleBookClass = () => {
    if (selectedDate && selectedTutor && selectedTime) {
      const bookingTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      bookingTime.setHours(hours, minutes);
      
      onBookClass(parseInt(selectedTutor), bookingTime, selectedTime);
      setShowBookingDialog(false);
      setSelectedTutor("");
      setSelectedTime("");
      setSelectedDate(null);
    }
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isPastDate = (day: number) => {
    const today = new Date();
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return checkDate < today;
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const calendarDays = [];
  
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle>Book Your Classes</CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Classes remaining:</span>
              <span className="px-2 py-1 bg-primary text-primary-foreground text-sm rounded-full font-medium">
                {remainingClasses}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">{monthName}</h3>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="p-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="p-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <div key={index} className="aspect-square">
                {day && (
                  <div
                    className={`
                      calendar-day
                      ${isToday(day) ? 'today' : ''}
                      ${isPastDate(day) ? 'disabled' : ''}
                      ${remainingClasses === 0 ? 'cursor-not-allowed opacity-50' : ''}
                    `}
                    onClick={() => remainingClasses > 0 && handleDateClick(day)}
                  >
                    {day}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center space-x-6 mt-6 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary rounded mr-2"></div>
              <span className="text-gray-600">Today</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-gray-600">Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded mr-2"></div>
              <span className="text-gray-600">Past</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book a Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Selected Date
              </label>
              <div className="p-3 bg-gray-50 rounded-lg">
                {selectedDate?.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Tutor
              </label>
              <Select value={selectedTutor} onValueChange={setSelectedTutor}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tutor" />
                </SelectTrigger>
                <SelectContent>
                  {tutors.map((tutor) => (
                    <SelectItem key={tutor.id} value={tutor.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{tutor.name}</span>
                        <span className="text-sm text-gray-500">- ${tutor.hourlyRate}/hr</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Time
              </label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose time slot" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{time}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowBookingDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBookClass}
                disabled={!selectedTutor || !selectedTime}
                className="flex-1"
              >
                Book Class
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}