import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { useLanguage, getLevelText } from "@/lib/i18n";
import Header from "@/components/header";
import { 
  Search, 
  Star, 
  Calendar, 
  Clock, 
  MapPin, 
  Languages, 
  GraduationCap,
  Filter
} from "lucide-react";
import type { Tutor } from "@shared/schema";

export default function TutorsPage() {
  const { toast } = useToast();
  const user = getCurrentUser();
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<string>("all");

  const { data: tutors = [], isLoading } = useQuery<Tutor[]>({
    queryKey: ["/api/tutors"],
  });

  // Filter tutors based on search criteria
  const filteredTutors = (tutors || []).filter(tutor => {
    if (!tutor) return false;
    
    const matchesSearch = (tutor.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (tutor.specialization?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesLanguage = selectedLanguage === "all" || true; // Simplified for now
    
    const matchesLevel = selectedLevel === "all" || true; // Simplified for now
    
    const matchesRating = selectedRating === "all" || 
                         (parseFloat(tutor.rating || '0') >= parseFloat(selectedRating));

    return matchesSearch && matchesLanguage && matchesLevel && matchesRating;
  });

  const handleBookTutor = (tutorId: number) => {
    if (!isAuthenticated()) {
      toast({
        title: language === 'es' ? "Autenticación Requerida" : "Authentication Required",
        description: language === 'es' ? "Por favor inicia sesión para reservar una clase." : "Please log in to book a class with a tutor.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: language === 'es' ? "Calendario de Reservas" : "Booking Calendar",
      description: language === 'es' ? "Redirigiendo al calendario para seleccionar fecha y hora..." : "Redirecting to calendar to select date and time...",
    });
    // In a real app, this would open a booking modal or redirect to calendar
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'fill-[#F59E1C] text-[#F59E1C]' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0A4A6E] mb-2">
            {t.findIdealTutor} <span className="text-[#1C7BB1]">{language === 'es' ? 'Tutor Ideal' : 'Ideal Tutor'}</span>
          </h1>
          <p className="text-[#0A4A6E]/70">
            {t.findIdealTutorDesc}
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1C7BB1]/40 w-4 h-4" />
                <Input
                  placeholder={t.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20"
                />
              </div>

              {/* Language Filter */}
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20">
                  <SelectValue placeholder={t.languages} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allLanguages}</SelectItem>
                  <SelectItem value="Spanish">{language === 'es' ? 'Español' : 'Spanish'}</SelectItem>
                  <SelectItem value="English">{language === 'es' ? 'Inglés' : 'English'}</SelectItem>
                  <SelectItem value="French">{language === 'es' ? 'Francés' : 'French'}</SelectItem>
                  <SelectItem value="Portuguese">{language === 'es' ? 'Portugués' : 'Portuguese'}</SelectItem>
                </SelectContent>
              </Select>

              {/* Level Filter */}
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20">
                  <SelectValue placeholder={t.levels} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allLevels}</SelectItem>
                  <SelectItem value="A1">A1 - {t.beginner}</SelectItem>
                  <SelectItem value="A2">A2 - {t.elementary}</SelectItem>
                  <SelectItem value="B1">B1 - {t.intermediate}</SelectItem>
                  <SelectItem value="B2">B2 - {t.upperIntermediate}</SelectItem>
                  <SelectItem value="C1">C1 - {t.advanced}</SelectItem>
                  <SelectItem value="C2">C2 - {t.mastery}</SelectItem>
                </SelectContent>
              </Select>

              {/* Rating Filter */}
              <Select value={selectedRating} onValueChange={setSelectedRating}>
                <SelectTrigger className="border-[#1C7BB1]/20 focus:border-[#1C7BB1] focus:ring-[#1C7BB1]/20">
                  <SelectValue placeholder={t.rating} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.anyRating}</SelectItem>
                  <SelectItem value="4.5">4.5+ {t.stars}</SelectItem>
                  <SelectItem value="4">4+ {t.stars}</SelectItem>
                  <SelectItem value="3.5">3.5+ {t.stars}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-[#0A4A6E]/70">
            {t.showing} {filteredTutors.length} {t.of} {tutors.length} {t.tutorsText}
          </p>
        </div>

        {/* Tutors Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutors.map((tutor) => (
              <Card key={tutor.id} className="hover:shadow-lg transition-shadow duration-300 border-0">
                <CardContent className="p-6">
                  {/* Tutor Avatar and Basic Info */}
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
                      <img 
                        src={tutor.avatar || `https://ui-avatars.com/api/?name=${tutor.firstName}+${tutor.lastName}&size=64`}
                        alt={`${tutor.firstName} ${tutor.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#0A4A6E] text-lg">
                        {tutor.firstName} {tutor.lastName}
                      </h3>
                      <div className="flex items-center space-x-1 mb-1">
                        {renderStars(tutor.rating)}
                        <span className="text-sm text-gray-600 ml-1">
                          ({tutor.rating})
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-1" />
                        {tutor.country}
                      </div>
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <Languages className="w-4 h-4 text-[#1C7BB1] mr-2" />
                      <span className="text-sm font-medium text-[#0A4A6E]">{t.languages}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tutor.languages.map((lang) => (
                        <Badge key={lang} variant="secondary" className="text-xs">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Specialties */}
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <GraduationCap className="w-4 h-4 text-[#1C7BB1] mr-2" />
                      <span className="text-sm font-medium text-[#0A4A6E]">{t.specialties}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tutor.specialties.slice(0, 3).map((specialty) => (
                        <Badge key={specialty} variant="outline" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {tutor.specialties.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{tutor.specialties.length - 3} {language === 'es' ? 'más' : 'more'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Teaching Levels */}
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <Clock className="w-4 h-4 text-[#1C7BB1] mr-2" />
                      <span className="text-sm font-medium text-[#0A4A6E]">{t.levels}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tutor.teachingLevels.map((level) => (
                        <Badge key={level} variant="secondary" className="text-xs">
                          {getLevelText(level, language)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t.pricePerClass}</span>
                      <span className="text-lg font-bold text-[#0A4A6E]">
                        ${tutor.hourlyRate}{t.perHour}
                      </span>
                    </div>
                  </div>

                  {/* Book Button */}
                  <Button 
                    onClick={() => handleBookTutor(tutor.id)}
                    className="w-full bg-gradient-to-r from-[#1C7BB1] to-[#1C7BB1]/80 hover:from-[#1C7BB1]/90 hover:to-[#1C7BB1] text-white font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {t.bookClass}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredTutors.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#1C7BB1]/10 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Search className="w-8 h-8 text-[#1C7BB1]" />
            </div>
            <h3 className="text-lg font-medium text-[#0A4A6E] mb-2">
              {t.noTutorsFound}
            </h3>
            <p className="text-gray-600 mb-4">
              {t.adjustFilters}
            </p>
            <Button 
              onClick={() => {
                setSearchTerm("");
                setSelectedLanguage("all");
                setSelectedLevel("all");
                setSelectedRating("all");
              }}
              variant="outline"
              className="border-[#1C7BB1] text-[#1C7BB1] hover:bg-[#1C7BB1] hover:text-white"
            >
              {t.clearFilters}
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#D3D3D3] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-[#0A4A6E]">
            <p>&copy; 2024 Passport2Fluency. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}