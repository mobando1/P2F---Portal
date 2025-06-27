import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
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

  // Redirect if not authenticated
  if (!isAuthenticated() || !user) {
    setLocation("/login");
    return null;
  }

  // Queries
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", user.id],
  });

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
    toast({
      title: "Upgrade Plan",
      description: "Redirecting to subscription upgrade page...",
    });
  };

  const handleManageSubscription = () => {
    toast({
      title: "Manage Subscription",
      description: "Opening subscription management portal...",
    });
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Bienvenido, <span>{dashboardData?.user?.firstName || user.firstName}</span>!
          </h1>
          <p className="text-gray-600">Continue your Spanish learning journey</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-primary/10">
                  <CalendarCheck className="text-primary h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Classes Booked</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.classesBooked}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <GraduationCap className="text-green-500 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Classes Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.classesCompleted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Clock className="text-blue-500 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Learning Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.learningHours}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Star className="text-yellow-500 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Current Level</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.currentLevel}</p>
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
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Available Tutors</h2>
                  <p className="text-gray-600">Choose your preferred tutor for upcoming classes</p>
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Classes</h2>
                
                <div className="space-y-4">
                  {upcomingClasses.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No upcoming classes scheduled</p>
                  ) : (
                    upcomingClasses.map((classItem: any) => (
                      <div key={classItem.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <VideoIcon className="text-primary h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{classItem.title}</h4>
                          <p className="text-sm text-gray-600">with {classItem.tutorName}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(classItem.scheduledAt).toLocaleDateString('en-US', {
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
                          className="text-gray-400 hover:text-red-500"
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                
                <div className="space-y-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => toast({ title: "Book New Class", description: "Feature coming soon!" })}
                  >
                    <CalendarCheck className="mr-3 h-4 w-4 text-primary" />
                    Book New Class
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => toast({ title: "View Progress", description: "Feature coming soon!" })}
                  >
                    <BookOpen className="mr-3 h-4 w-4 text-green-500" />
                    View Progress
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => toast({ title: "Contact Support", description: "Feature coming soon!" })}
                  >
                    <Headphones className="mr-3 h-4 w-4 text-blue-500" />
                    Contact Support
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
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 EspañolPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
