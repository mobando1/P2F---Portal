import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import EnhancedCalendar from "@/components/enhanced-calendar";
import TutorCard from "@/components/tutor-card";
import SubscriptionCard from "@/components/subscription-card";
import VideoLibrary from "@/components/video-library";
import { 
  CalendarCheck, 
  GraduationCap, 
  Clock, 
  Star, 
  Video as VideoIcon,
  BookOpen,
  Headphones,
  X 
} from "lucide-react";
import type { Tutor, Video, Class } from "@shared/schema";

interface DashboardData {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    level: string;
    avatar?: string;
  };
  subscription: any;
  progress: any;
  upcomingClasses: any[];
  stats: {
    classesBooked: number;
    classesCompleted: number;
    learningHours: string;
    currentLevel: string;
    remainingClasses: number;
  };
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const { t } = useLanguage();

  // Redirect if not authenticated
  if (!isAuthenticated() || !user) {
    setLocation("/login");
    return null;
  }

  // Queries with error handling
  const { data: dashboardData, isLoading: isDashboardLoading, isError: isDashboardError, error: dashboardError } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", user.id],
  });

  // CRITICAL: Handle query errors - force session reset if dashboard fails to load
  if (isDashboardError) {
    console.error('Dashboard query failed:', dashboardError);
    console.log('User ID:', user.id);
    console.log('Query URL would be:', `/api/dashboard/${user.id}`);
    
    toast({
      title: "Error de sesión",
      description: "Recargando tu sesión...",
      variant: "destructive",
    });
    
    // Force logout and cache clear to recover from corrupted state
    queryClient.clear();
    localStorage.removeItem('passport2fluency_user');
    setLocation("/login");
    return null;
  }

  const { data: tutors = [], isLoading: isTutorsLoading } = useQuery<Tutor[]>({
    queryKey: ["/api/tutors"],
  });

  const { data: videos = [], isLoading: isVideosLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const { data: userClasses = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes", user.id],
  });

  // Mutations
  const bookClassMutation = useMutation({
    mutationFn: async ({ tutorId, scheduledAt, time }: { tutorId: number; scheduledAt: Date; time: string }) => {
      const response = await apiRequest("POST", "/api/classes", {
        userId: user.id,
        tutorId,
        title: "Language Lesson",
        description: "One-on-one language lesson",
        scheduledAt: scheduledAt.toISOString(),
        duration: 60,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes", user.id] });
      toast({
        title: "Class booked!",
        description: "Your Spanish lesson has been scheduled.",
      });
    },
    onError: () => {
      toast({
        title: "Booking failed",
        description: "Unable to book the class. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelClassMutation = useMutation({
    mutationFn: async (classId: number) => {
      const response = await apiRequest("PUT", `/api/classes/${classId}/cancel`, {
        userId: user.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes", user.id] });
      toast({
        title: "Class cancelled",
        description: "Your class has been cancelled successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Cancellation failed",
        description: "Unable to cancel the class. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Customer Portal mutation
  const customerPortalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-customer-portal-session", {
        userId: user.id,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    },
    onError: (error: any) => {
      console.error("Error creating customer portal session:", error);
      toast({
        title: "Error",
        description: "Unable to open subscription management. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleBookClass = (tutorId: number, scheduledAt: Date, time: string) => {
    bookClassMutation.mutate({ tutorId, scheduledAt, time });
  };

  const handleVideoPlay = (video: Video) => {
    toast({
      title: `Playing: ${video.title}`,
      description: "Video player would open here in a real implementation.",
    });
  };

  const handleUpgradeSubscription = () => {
    setLocation("/subscription");
  };

  const handleManageSubscription = () => {
    // Open Stripe Customer Portal for subscription management
    customerPortalMutation.mutate();
  };

  const handleCancelClass = (classId: number) => {
    cancelClassMutation.mutate(classId);
  };

  if (isDashboardLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {
    classesBooked: 0,
    classesCompleted: 0,
    learningHours: "0.00",
    currentLevel: "A1",
    remainingClasses: 0,
  };

  const upcomingClasses = dashboardData?.upcomingClasses || [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0A4A6E] mb-2">
            {t.welcomeName} <span className="text-[#1C7BB1]">{dashboardData?.user?.firstName || user.firstName}</span>!
          </h1>
          <p className="text-[#0A4A6E]/70">{t.continueJourney}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#1C7BB1', opacity: 0.1 }}>
                  <CalendarCheck className="h-6 w-6" style={{ color: '#1C7BB1' }} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#0A4A6E]">{t.classesBooked}</p>
                  <p className="text-2xl font-bold text-[#0A4A6E]">{stats.classesBooked}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#F59E1C', opacity: 0.1 }}>
                  <GraduationCap className="h-6 w-6" style={{ color: '#F59E1C' }} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#0A4A6E]">{t.classesCompleted}</p>
                  <p className="text-2xl font-bold text-[#0A4A6E]">{stats.classesCompleted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#1C7BB1', opacity: 0.1 }}>
                  <Clock className="h-6 w-6" style={{ color: '#1C7BB1' }} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#0A4A6E]">{t.learningHours}</p>
                  <p className="text-2xl font-bold text-[#0A4A6E]">{stats.learningHours}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#F59E1C', opacity: 0.1 }}>
                  <Star className="h-6 w-6" style={{ color: '#F59E1C' }} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#0A4A6E]">{t.currentLevel}</p>
                  <p className="text-2xl font-bold text-[#0A4A6E]">{stats.currentLevel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nueva tarjeta para clases restantes */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-[#1C7BB1] to-[#0A4A6E] text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/90">
                    {t.language === 'es' ? 'Clases Restantes' : 'Remaining Classes'}
                  </p>
                  <p className="text-2xl font-bold text-white">{stats.remainingClasses}</p>
                </div>
                <div className="text-right">
                  <Button 
                    onClick={() => setLocation("/packages")}
                    size="sm"
                    className="bg-white text-[#1C7BB1] hover:bg-white/90 font-medium"
                  >
                    {t.language === 'es' ? 'Comprar Más' : 'Buy More'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Calendar & Booking */}
          <div className="lg:col-span-2 space-y-8">
            {/* Calendar Section */}
            <EnhancedCalendar 
              remainingClasses={stats.remainingClasses}
              tutors={tutors}
              onBookClass={handleBookClass}
            />

            {/* Available Tutors */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-[#0A4A6E] mb-1">{t.availableTutors}</h2>
                  <p className="text-[#0A4A6E]/70">{t.choosePreferredTutor}</p>
                </div>
                
                {isTutorsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-24 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tutors.map((tutor) => (
                      <TutorCard 
                        key={tutor.id} 
                        tutor={tutor} 
                        onBook={(tutorId) => {
                          // Simple booking - use tomorrow at 2 PM as default
                          const scheduledAt = new Date();
                          scheduledAt.setDate(scheduledAt.getDate() + 1);
                          scheduledAt.setHours(14, 0, 0, 0);
                          handleBookClass(tutorId, scheduledAt, "14:00");
                        }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Subscription Info */}
            {dashboardData?.subscription && (
              <SubscriptionCard
                subscription={dashboardData.subscription}
                onUpgrade={handleUpgradeSubscription}
                onManage={handleManageSubscription}
              />
            )}

            {/* Upcoming Classes */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-[#0A4A6E] mb-4">{t.upcomingClasses}</h2>
                
                <div className="space-y-4">
                  {upcomingClasses.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-[#EAF4FA] rounded-full mx-auto mb-4 flex items-center justify-center">
                        <CalendarCheck className="w-8 h-8 text-[#1C7BB1]" />
                      </div>
                      <p className="text-[#0A4A6E]/60 mb-2">{t.noUpcomingClasses}</p>
                      <p className="text-[#0A4A6E]/40 text-sm mb-4">
                        {t.reserveFirstClass}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation("/tutors")}
                        className="border-[#1C7BB1] text-[#1C7BB1] hover:bg-[#1C7BB1] hover:text-white"
                      >
                        {t.exploreTutors}
                      </Button>
                    </div>
                  ) : (
                    upcomingClasses.map((classItem: any) => (
                      <div key={classItem.id} className="flex items-center space-x-3 p-3 border border-[#1C7BB1]/20 rounded-lg hover:bg-[#EAF4FA]/30 transition-colors">
                        <div className="w-12 h-12 bg-[#1C7BB1]/10 rounded-lg flex items-center justify-center">
                          <VideoIcon className="text-[#1C7BB1] h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#0A4A6E]">{classItem.title}</h4>
                          <p className="text-sm text-[#0A4A6E]/70">{t.with} {classItem.tutorName}</p>
                          <p className="text-sm text-[#0A4A6E]/50">
                            {new Date(classItem.scheduledAt).toLocaleDateString('es-ES', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelClass(classItem.id)}
                          className="text-[#0A4A6E]/40 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-[#0A4A6E] mb-4">{t.quickActions}</h2>
                
                <div className="space-y-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-[#EAF4FA]"
                    onClick={() => setLocation("/tutors")}
                  >
                    <CalendarCheck className="mr-3 h-4 w-4 text-[#1C7BB1]" />
                    {t.bookNewClass}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-[#EAF4FA]"
                    onClick={() => setLocation("/subscription")}
                  >
                    <BookOpen className="mr-3 h-4 w-4 text-[#F59E1C]" />
                    {t.updatePlan}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-[#EAF4FA]"
                    onClick={() => toast({ title: t.contactSupport, description: "Función próximamente disponible!" })}
                  >
                    <Headphones className="mr-3 h-4 w-4 text-[#1C7BB1]" />
                    {t.contactSupport}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Video Library Section */}
        <VideoLibrary 
          videos={videos} 
          onVideoPlay={handleVideoPlay}
        />
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
