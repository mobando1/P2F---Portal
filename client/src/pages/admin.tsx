import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import CrmDashboard from "@/components/crm/CrmDashboard";
import AdminCalendar from "@/components/admin/AdminCalendar";
import AdminLearningPath from "@/components/admin/AdminLearningPath";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Users,
  UserPlus,
  MessageSquare,
  Settings,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Sparkles,
  MessageCircle,
  TrendingUp,
  CalendarDays,
  BookOpen,
  BarChart3,
  AlertTriangle,
  LifeBuoy,
  Pencil,
  DollarSign,
  CreditCard,
  Search,
  ArrowUpDown,
  Eye,
  Calendar as CalendarIcon,
  RefreshCw,
} from "lucide-react";

interface TutorData {
  name: string;
  email: string;
  specialization: string;
  bio: string;
  phone?: string;
  country?: string;
  timezone?: string;
  certifications?: string[];
  yearsOfExperience?: number;
  hourlyRate: number;
  profileImage?: string;
  classType: string;
  languageTaught: string;
}

interface ClassItem {
  id: number;
  userId: number;
  tutorId: number;
  title: string;
  description: string | null;
  scheduledAt: string;
  duration: number;
  status: string;
  isTrial: boolean;
  meetingLink: string | null;
  classCategory: string | null;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'tutors' | 'classes' | 'calendar' | 'learning-path' | 'analytics' | 'ai-stats' | 'support' | 'settings' | 'crm'>('tutors');
  const [showAddTutor, setShowAddTutor] = useState(false);
  const [editingTutor, setEditingTutor] = useState<any>(null);
  const [classFilter, setClassFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [newTutor, setNewTutor] = useState<TutorData>({
    name: '',
    email: '',
    specialization: '',
    bio: '',
    hourlyRate: 25,
    classType: 'adults',
    languageTaught: 'spanish',
  });

  const { toast } = useToast();
  const { language } = useLanguage();
  const isEs = language === 'es';
  const queryClient = useQueryClient();

  // AI Admin Stats
  const { data: aiStats, isLoading: isAiStatsLoading } = useQuery<{
    totalConversations: number;
    totalMessages: number;
    activeUsers: number;
    userStats: Array<{
      userId: number;
      userName: string;
      conversationCount: number;
      messageCount: number;
      lastActive: string | null;
    }>;
  }>({
    queryKey: ['/api/ai/admin-stats'],
    queryFn: () => apiRequest('GET', '/api/ai/admin-stats').then(res => res.json()),
    enabled: activeTab === 'ai-stats',
  });


  // Obtener lista de tutores
  const { data: tutors, isLoading } = useQuery({
    queryKey: ['/api/tutors'],
    queryFn: () => apiRequest('GET', '/api/tutors').then(res => res.json())
  });

  // Obtener todas las clases (admin)
  const { data: allClasses, isLoading: isClassesLoading } = useQuery<ClassItem[]>({
    queryKey: ['/api/admin/classes'],
    queryFn: () => apiRequest('GET', '/api/admin/classes').then(res => res.json()),
    enabled: activeTab === 'classes',
  });

  // Analytics
  // Analytics state
  const [analyticsView, setAnalyticsView] = useState<'overview' | 'revenue' | 'students'>('overview');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1),
    to: new Date(),
  });
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [txCursor, setTxCursor] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<{ paymentIntentId: string; amount: number; customerEmail: string } | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSortKey, setStudentSortKey] = useState<string>("totalSpent");
  const [studentSortDir, setStudentSortDir] = useState<"asc" | "desc">("desc");

  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery<{
    classesByCategory: Record<string, number>;
    classesByStatus: Record<string, number>;
    classesByMonth: Array<{ month: string; count: number }>;
    tutorActivity: Array<{ tutorId: number; tutorName: string; scheduledCount: number; completedCount: number; totalClasses: number; utilization: number }>;
    studentActivity: { totalActive: number; newThisMonth: number; withCredits: number; withoutCredits: number; totalStudents: number };
    capacityAlerts: Array<{ type: string; message: string }>;
    summary: { totalClasses: number; totalStudents: number; completionRate: number; totalHours: number };
    revenue: { totalRevenue: number; revenueByMonth: Array<{ month: string; amount: number }>; avgRevenuePerStudent: number; trialConversionRate: number; activeSubscriptions: number; newSubscriptionsByMonth: Array<{ month: string; count: number }> };
    retention: { activeThisMonth: number; activeLastMonth: number; retentionRate: number; churnedStudents: number; avgClassesPerStudent: number };
  }>({
    queryKey: ['/api/admin/analytics', dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: () => apiRequest('GET', `/api/admin/analytics?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`).then(res => res.json()),
    enabled: activeTab === 'analytics',
  });

  const { data: studentsList } = useQuery<{ students: Array<{ id: number; name: string; email: string; userType: string; classCredits: number; totalClasses: number; completedClasses: number; totalSpent: number; lastClassDate: string | null; createdAt: string; lastActivityAt: string | null; hasSubscription: boolean }>; total: number }>({
    queryKey: ['/api/admin/analytics/students'],
    queryFn: () => apiRequest('GET', '/api/admin/analytics/students').then(res => res.json()),
    enabled: activeTab === 'analytics' && analyticsView === 'students',
  });

  const { data: studentDetail } = useQuery<any>({
    queryKey: ['/api/admin/analytics/student', selectedStudentId],
    queryFn: () => apiRequest('GET', `/api/admin/analytics/student/${selectedStudentId}`).then(res => res.json()),
    enabled: !!selectedStudentId,
  });

  const { data: stripeMetrics } = useQuery<{
    mrr: number; mrrTrend: Array<{ month: string; mrr: number }>; churnRate: number; churnCount: number;
    failedPayments: number; atRiskSubscribers: Array<{ userId: number; name: string; email: string; lastFailedAt: string }>;
  }>({
    queryKey: ['/api/admin/analytics/stripe-metrics'],
    queryFn: () => apiRequest('GET', '/api/admin/analytics/stripe-metrics').then(res => res.json()),
    enabled: activeTab === 'analytics' && analyticsView === 'revenue',
  });

  const { data: transactions, refetch: refetchTransactions } = useQuery<{
    data: Array<{ id: string; amount: number; currency: string; status: string; refunded: boolean; amountRefunded: number; customerEmail: string; description: string; created: string; paymentMethodType: string; cardBrand: string | null; cardLast4: string | null; receiptUrl: string | null; paymentIntentId: string | null }>;
    hasMore: boolean; nextCursor: string | null;
  }>({
    queryKey: ['/api/admin/analytics/transactions', txCursor],
    queryFn: () => apiRequest('GET', `/api/admin/analytics/transactions?limit=25${txCursor ? `&starting_after=${txCursor}` : ''}`).then(res => res.json()),
    enabled: activeTab === 'analytics' && analyticsView === 'revenue',
  });

  const { data: studentStripe } = useQuery<{
    ltv: number; stripeCustomerId: string | null;
    paymentMethods: Array<{ id: string; brand: string; last4: string; expMonth: number; expYear: number }>;
    transactions: Array<{ id: string; amount: number; status: string; refunded: boolean; created: string; description: string; paymentIntentId: string | null }>;
  }>({
    queryKey: ['/api/admin/analytics/student', selectedStudentId, 'stripe'],
    queryFn: () => apiRequest('GET', `/api/admin/analytics/student/${selectedStudentId}/stripe`).then(res => res.json()),
    enabled: !!selectedStudentId,
  });

  const refundMutation = useMutation({
    mutationFn: (data: { paymentIntentId: string; amount?: number }) =>
      apiRequest('POST', '/api/admin/analytics/refund', data).then(res => res.json()),
    onSuccess: () => {
      toast({ title: isEs ? 'Reembolso procesado' : 'Refund processed', description: isEs ? 'El reembolso se ha completado exitosamente' : 'The refund has been completed successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/stripe-metrics'] });
      if (selectedStudentId) queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/student', selectedStudentId, 'stripe'] });
      setRefundTarget(null);
    },
    onError: (error: any) => {
      toast({ title: isEs ? 'Error' : 'Error', description: error.message || 'Refund failed', variant: 'destructive' });
    },
  });

  const sortedStudents = useMemo(() => {
    if (!studentsList?.students) return [];
    let filtered = studentsList.students;
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    return [...filtered].sort((a: any, b: any) => {
      const aVal = a[studentSortKey] ?? 0;
      const bVal = b[studentSortKey] ?? 0;
      return studentSortDir === "desc" ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
    });
  }, [studentsList, studentSearch, studentSortKey, studentSortDir]);

  // Support tickets (admin)
  const { data: supportTickets, isLoading: isSupportLoading } = useQuery<Array<{
    id: number; userId: number; subject: string; category: string; status: string; priority: string; createdAt: string; updatedAt: string;
  }>>({
    queryKey: ['/api/support/tickets'],
    queryFn: () => apiRequest('GET', '/api/support/tickets').then(res => res.json()),
    enabled: activeTab === 'support',
  });

  // Crear nuevo tutor
  const createTutorMutation = useMutation({
    mutationFn: (tutorData: TutorData) =>
      apiRequest('POST', '/api/tutors', tutorData).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tutors'] });
      setShowAddTutor(false);
      setNewTutor({
        name: '',
        email: '',
        specialization: '',
        bio: '',
        hourlyRate: 25,
        classType: 'adults',
        languageTaught: 'spanish',
      });
      toast({
        title: "Profesor creado",
        description: "El nuevo profesor ha sido añadido exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error creando profesor",
        variant: "destructive"
      });
    }
  });

  const updateTutorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest('PUT', `/api/tutors/${id}`, data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tutors'] });
      setEditingTutor(null);
      toast({
        title: isEs ? "Profesor actualizado" : "Tutor updated",
        description: isEs ? "Los cambios se guardaron correctamente" : "Changes saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error updating tutor",
        variant: "destructive"
      });
    }
  });

  // Cargar profesores de ejemplo
  const seedTutorsMutation = useMutation({
    mutationFn: () =>
      apiRequest('POST', '/api/tutors/bulk-import', {
          tutors: [
            {
              name: "María Elena González",
              email: "maria.gonzalez@passport2fluency.com",
              specialization: "Conversación Avanzada",
              bio: "Profesora nativa de español con 8 años de experiencia.",
              phone: "+34 612 345 678",
              country: "España",
              timezone: "Europe/Madrid",
              certifications: ["DELE Examiner", "ELE Master"],
              yearsOfExperience: 8,
              hourlyRate: 25,
              profileImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face"
            },
            {
              name: "Carlos Mendoza",
              email: "carlos.mendoza@passport2fluency.com",
              specialization: "Español de Negocios",
              bio: "Experto en español de negocios con experiencia corporativa.",
              phone: "+52 55 1234 5678",
              country: "México",
              timezone: "America/Mexico_City",
              certifications: ["Business Spanish Certificate"],
              yearsOfExperience: 12,
              hourlyRate: 30,
              profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"
            },
            {
              name: "Ana Sofía Ruiz",
              email: "ana.ruiz@passport2fluency.com",
              specialization: "Principiantes y Niños",
              bio: "Especialista en enseñanza a principiantes y niños.",
              phone: "+57 1 234 5678",
              country: "Colombia",
              timezone: "America/Bogota",
              certifications: ["Child Language Teaching"],
              yearsOfExperience: 6,
              hourlyRate: 20,
              profileImage: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face"
            }
          ]
      }).then(res => res.json()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tutors'] });
      toast({
        title: "Profesores cargados",
        description: `${result.success?.length || 0} profesores añadidos exitosamente`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error cargando profesores",
        variant: "destructive"
      });
    }
  });

  const handleCreateTutor = () => {
    if (!newTutor.name || !newTutor.email || !newTutor.specialization) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }
    createTutorMutation.mutate(newTutor);
  };

  // Filter classes
  const filteredClasses = allClasses?.filter(c => classFilter === 'all' || c.status === classFilter) || [];

  // Class stats
  const classStats = {
    total: allClasses?.length || 0,
    scheduled: allClasses?.filter(c => c.status === 'scheduled').length || 0,
    completed: allClasses?.filter(c => c.status === 'completed').length || 0,
    cancelled: allClasses?.filter(c => c.status === 'cancelled').length || 0,
  };

  // Find tutor name by id
  const getTutorName = (tutorId: number) => {
    const tutor = tutors?.find((t: any) => t.id === tutorId);
    return tutor?.name || `Tutor #${tutorId}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{isEs ? 'Panel de Administración' : 'Admin Dashboard'}</h1>
          <p className="text-gray-600">{isEs ? 'Gestiona profesores, clases y configuraciones' : 'Manage tutors, classes, and settings'}</p>
        </div>

        {/* Navegación de pestañas */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('tutors')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tutors'
                    ? 'border-[#1C7BB1] text-[#1C7BB1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="inline w-4 h-4 mr-2" />
                {isEs ? 'Profesores' : 'Tutors'}
              </button>
              <button
                onClick={() => setActiveTab('classes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'classes'
                    ? 'border-[#1C7BB1] text-[#1C7BB1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CalendarDays className="inline w-4 h-4 mr-2" />
                {isEs ? 'Clases' : 'Classes'}
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'calendar'
                    ? 'border-[#1C7BB1] text-[#1C7BB1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CalendarIcon className="inline w-4 h-4 mr-2" />
                {isEs ? 'Calendario' : 'Calendar'}
              </button>
              <button
                onClick={() => setActiveTab('learning-path')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'learning-path'
                    ? 'border-[#1C7BB1] text-[#1C7BB1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BookOpen className="inline w-4 h-4 mr-2" />
                {isEs ? 'Culebrita' : 'Learning Path'}
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-[#1C7BB1] text-[#1C7BB1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="inline w-4 h-4 mr-2" />
                {isEs ? 'Analíticas' : 'Analytics'}
              </button>
              <button
                onClick={() => setActiveTab('support')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'support'
                    ? 'border-[#1C7BB1] text-[#1C7BB1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <LifeBuoy className="inline w-4 h-4 mr-2" />
                {isEs ? 'Soporte' : 'Support'}
              </button>
              <button
                onClick={() => setActiveTab('ai-stats')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ai-stats'
                    ? 'border-[#F59E1C] text-[#F59E1C]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Sparkles className="inline w-4 h-4 mr-2" />
                {isEs ? 'IA Práctica' : 'AI Practice'}
              </button>
              <button
                onClick={() => setActiveTab('crm')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'crm'
                    ? 'border-[#1C7BB1] text-[#1C7BB1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="inline w-4 h-4 mr-2" />
                CRM
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-[#1C7BB1] text-[#1C7BB1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="inline w-4 h-4 mr-2" />
                {isEs ? 'Configuración' : 'Settings'}
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido de pestañas */}
        {activeTab === 'tutors' && (
          <div className="space-y-6">
            {/* Acciones rápidas */}
            <div className="flex gap-4">
              <Button
                onClick={() => setShowAddTutor(true)}
                className="bg-[#1C7BB1] hover:bg-[#0A4A6E]"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isEs ? 'Añadir Profesor' : 'Add Tutor'}
              </Button>
              <Button
                variant="outline"
                onClick={() => seedTutorsMutation.mutate()}
                disabled={seedTutorsMutation.isPending}
              >
                <Upload className="w-4 h-4 mr-2" />
                Cargar Profesores de Ejemplo
              </Button>
            </div>

            {/* Lista de profesores */}
            <Card>
              <CardHeader>
                <CardTitle>Profesores Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C7BB1]"></div>
                    <p className="mt-2 text-gray-600">Cargando profesores...</p>
                  </div>
                ) : tutors && tutors.length > 0 ? (
                  <div className="grid gap-4">
                    {tutors.map((tutor: any) => (
                      <div key={tutor.id} className="border rounded-lg p-4 flex items-center space-x-4">
                        <img
                          src={tutor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=1E40AF&color=fff`}
                          alt={tutor.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{tutor.name}</h3>
                          <p className="text-sm text-gray-600">{tutor.specialization}</p>
                          <p className="text-sm text-gray-500">{tutor.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">${tutor.hourlyRate}/hora</Badge>
                            <Badge variant={tutor.isActive ? "default" : "secondary"}>
                              {tutor.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                            <Badge variant="outline">
                              {tutor.classType === 'kids' ? 'Niños' : 'Adultos'}
                            </Badge>
                            <Badge variant="outline">
                              {tutor.languageTaught === 'english' ? 'Inglés' : 'Español'}
                            </Badge>
                            {tutor.country && (
                              <Badge variant="outline">
                                <Globe className="w-3 h-3 mr-1" />
                                {tutor.country}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div className="flex items-center text-yellow-500 mb-1">
                            <span className="text-sm font-medium">{tutor.rating || "5.0"}</span>
                            <span className="ml-1">⭐</span>
                          </div>
                          <p className="text-xs text-gray-500">{tutor.reviewCount || 0} reseñas</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingTutor(tutor)}
                            className="text-[#1C7BB1] border-[#1C7BB1]/30 hover:bg-[#1C7BB1]/10"
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            {isEs ? 'Editar' : 'Edit'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No hay profesores registrados</p>
                    <p className="text-sm text-gray-400 mt-1">Añade profesores o carga los datos de ejemplo</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modal para añadir profesor */}
            {showAddTutor && (
              <Card className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl font-bold mb-4">Añadir Nuevo Profesor</h2>

                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nombre *</Label>
                        <Input
                          id="name"
                          value={newTutor.name}
                          onChange={(e) => setNewTutor({...newTutor, name: e.target.value})}
                          placeholder="Nombre completo"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newTutor.email}
                          onChange={(e) => setNewTutor({...newTutor, email: e.target.value})}
                          placeholder="email@ejemplo.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="classType">Tipo de Clase *</Label>
                        <select
                          id="classType"
                          value={newTutor.classType}
                          onChange={(e) => setNewTutor({...newTutor, classType: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="adults">Adultos</option>
                          <option value="kids">Niños</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="languageTaught">Idioma que Enseña *</Label>
                        <select
                          id="languageTaught"
                          value={newTutor.languageTaught}
                          onChange={(e) => setNewTutor({...newTutor, languageTaught: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="spanish">Español</option>
                          <option value="english">Inglés</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="specialization">Especialización *</Label>
                      <Input
                        id="specialization"
                        value={newTutor.specialization}
                        onChange={(e) => setNewTutor({...newTutor, specialization: e.target.value})}
                        placeholder="Ej: Conversación, Negocios, Principiantes"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bio">Biografía</Label>
                      <Textarea
                        id="bio"
                        value={newTutor.bio}
                        onChange={(e) => setNewTutor({...newTutor, bio: e.target.value})}
                        placeholder="Describe la experiencia y metodología del profesor"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="hourlyRate">Tarifa/Hora ($)</Label>
                        <Input
                          id="hourlyRate"
                          type="number"
                          value={newTutor.hourlyRate}
                          onChange={(e) => setNewTutor({...newTutor, hourlyRate: Number(e.target.value)})}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          value={newTutor.phone || ''}
                          onChange={(e) => setNewTutor({...newTutor, phone: e.target.value})}
                          placeholder="+1 234 567 8900"
                        />
                      </div>
                      <div>
                        <Label htmlFor="country">País</Label>
                        <Input
                          id="country"
                          value={newTutor.country || ''}
                          onChange={(e) => setNewTutor({...newTutor, country: e.target.value})}
                          placeholder="España, México, etc."
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="profileImage">URL de Foto de Perfil</Label>
                      <Input
                        id="profileImage"
                        value={newTutor.profileImage || ''}
                        onChange={(e) => setNewTutor({...newTutor, profileImage: e.target.value})}
                        placeholder="https://ejemplo.com/foto.jpg"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <Button
                      onClick={handleCreateTutor}
                      disabled={createTutorMutation.isPending}
                      className="bg-[#1C7BB1] hover:bg-[#0A4A6E]"
                    >
                      {createTutorMutation.isPending ? "Creando..." : "Crear Profesor"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddTutor(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Modal para editar profesor */}
            {editingTutor && (
              <Card className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl font-bold mb-4">{isEs ? 'Editar Profesor' : 'Edit Tutor'}: {editingTutor.name}</h2>

                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{isEs ? 'Nombre' : 'Name'} *</Label>
                        <Input
                          value={editingTutor.name}
                          onChange={(e) => setEditingTutor({...editingTutor, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={editingTutor.email}
                          onChange={(e) => setEditingTutor({...editingTutor, email: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{isEs ? 'Tipo de Clase' : 'Class Type'}</Label>
                        <select
                          value={editingTutor.classType || 'adults'}
                          onChange={(e) => setEditingTutor({...editingTutor, classType: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="adults">{isEs ? 'Adultos' : 'Adults'}</option>
                          <option value="kids">{isEs ? 'Niños' : 'Kids'}</option>
                        </select>
                      </div>
                      <div>
                        <Label>{isEs ? 'Idioma que Enseña' : 'Language Taught'}</Label>
                        <select
                          value={editingTutor.languageTaught || 'spanish'}
                          onChange={(e) => setEditingTutor({...editingTutor, languageTaught: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="spanish">{isEs ? 'Español' : 'Spanish'}</option>
                          <option value="english">{isEs ? 'Inglés' : 'English'}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label>{isEs ? 'Especialización' : 'Specialization'} *</Label>
                      <Input
                        value={editingTutor.specialization}
                        onChange={(e) => setEditingTutor({...editingTutor, specialization: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label>{isEs ? 'Biografía' : 'Bio'}</Label>
                      <Textarea
                        value={editingTutor.bio || ''}
                        onChange={(e) => setEditingTutor({...editingTutor, bio: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>{isEs ? 'Tarifa/Hora ($)' : 'Hourly Rate ($)'}</Label>
                        <Input
                          type="number"
                          value={editingTutor.hourlyRate}
                          onChange={(e) => setEditingTutor({...editingTutor, hourlyRate: Number(e.target.value)})}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label>{isEs ? 'Teléfono' : 'Phone'}</Label>
                        <Input
                          value={editingTutor.phone || ''}
                          onChange={(e) => setEditingTutor({...editingTutor, phone: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>{isEs ? 'País' : 'Country'}</Label>
                        <Input
                          value={editingTutor.country || ''}
                          onChange={(e) => setEditingTutor({...editingTutor, country: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>{isEs ? 'URL de Foto de Perfil' : 'Profile Image URL'}</Label>
                      <Input
                        value={editingTutor.avatar || ''}
                        onChange={(e) => setEditingTutor({...editingTutor, profileImage: e.target.value, avatar: e.target.value})}
                        placeholder="https://ejemplo.com/foto.jpg"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Label>{isEs ? 'Estado' : 'Status'}:</Label>
                      <Button
                        size="sm"
                        variant={editingTutor.isActive ? "default" : "secondary"}
                        onClick={() => setEditingTutor({...editingTutor, isActive: !editingTutor.isActive})}
                        className={editingTutor.isActive ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {editingTutor.isActive
                          ? (isEs ? '✓ Activo' : '✓ Active')
                          : (isEs ? '✗ Inactivo' : '✗ Inactive')}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <Button
                      onClick={() => updateTutorMutation.mutate({
                        id: editingTutor.id,
                        data: {
                          name: editingTutor.name,
                          email: editingTutor.email,
                          specialization: editingTutor.specialization,
                          bio: editingTutor.bio,
                          hourlyRate: editingTutor.hourlyRate,
                          phone: editingTutor.phone,
                          country: editingTutor.country,
                          profileImage: editingTutor.profileImage || editingTutor.avatar,
                          classType: editingTutor.classType,
                          languageTaught: editingTutor.languageTaught,
                          isActive: editingTutor.isActive,
                        }
                      })}
                      disabled={updateTutorMutation.isPending}
                      className="bg-[#1C7BB1] hover:bg-[#0A4A6E]"
                    >
                      {updateTutorMutation.isPending
                        ? (isEs ? "Guardando..." : "Saving...")
                        : (isEs ? "Guardar Cambios" : "Save Changes")}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingTutor(null)}>
                      {isEs ? 'Cancelar' : 'Cancel'}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="space-y-6">
            {/* Class Stats / Estadísticas de Clases */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-md cursor-pointer" onClick={() => setClassFilter('all')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#1C7BB1]/10">
                      <BookOpen className="h-5 w-5 text-[#1C7BB1]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-xl font-bold text-gray-900">{classStats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md cursor-pointer" onClick={() => setClassFilter('scheduled')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{isEs ? 'Programadas' : 'Scheduled'}</p>
                      <p className="text-xl font-bold text-gray-900">{classStats.scheduled}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md cursor-pointer" onClick={() => setClassFilter('completed')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{isEs ? 'Completadas' : 'Completed'}</p>
                      <p className="text-xl font-bold text-gray-900">{classStats.completed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md cursor-pointer" onClick={() => setClassFilter('cancelled')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{isEs ? 'Canceladas' : 'Cancelled'}</p>
                      <p className="text-xl font-bold text-gray-900">{classStats.cancelled}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2">
              {(['all', 'scheduled', 'completed', 'cancelled'] as const).map(f => (
                <Button
                  key={f}
                  variant={classFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setClassFilter(f)}
                  className={classFilter === f ? "bg-[#1C7BB1]" : ""}
                >
                  {f === 'all' ? 'Todas' : f === 'scheduled' ? 'Programadas' : f === 'completed' ? 'Completadas' : 'Canceladas'}
                </Button>
              ))}
            </div>

            {/* Classes list */}
            <Card>
              <CardHeader>
                <CardTitle>Todas las Clases</CardTitle>
              </CardHeader>
              <CardContent>
                {isClassesLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C7BB1]"></div>
                    <p className="mt-2 text-gray-600">Cargando clases...</p>
                  </div>
                ) : filteredClasses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Clase</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Profesor</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Fecha</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Duración</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Estado</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClasses
                          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                          .map((c) => (
                          <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-3 px-4">
                              <p className="font-medium text-gray-900">{c.title}</p>
                              {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700">
                              {getTutorName(c.tutorId)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date(c.scheduledAt).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="text-center py-3 px-4 text-sm text-gray-600">
                              {c.duration} min
                            </td>
                            <td className="text-center py-3 px-4">
                              <Badge variant={
                                c.status === 'scheduled' ? 'default' :
                                c.status === 'completed' ? 'secondary' : 'destructive'
                              }>
                                {c.status === 'scheduled' ? 'Programada' :
                                 c.status === 'completed' ? 'Completada' : 'Cancelada'}
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-4">
                              {c.isTrial && <Badge variant="outline" className="text-[#F59E1C] border-[#F59E1C]">Trial</Badge>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CalendarDays className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">No hay clases {classFilter !== 'all' ? 'con ese filtro' : 'registradas'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'ai-stats' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-[#F59E1C]/10">
                      <MessageCircle className="h-6 w-6 text-[#F59E1C]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{isEs ? 'Total Mensajes IA' : 'Total AI Messages'}</p>
                      <p className="text-2xl font-bold text-gray-900">{aiStats?.totalMessages ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-[#1C7BB1]/10">
                      <MessageSquare className="h-6 w-6 text-[#1C7BB1]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{isEs ? 'Conversaciones' : 'Conversations'}</p>
                      <p className="text-2xl font-bold text-gray-900">{aiStats?.totalConversations ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-green-100">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{isEs ? 'Estudiantes Activos' : 'Active Students'}</p>
                      <p className="text-2xl font-bold text-gray-900">{aiStats?.activeUsers ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Student Usage Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#F59E1C]" />
                  {isEs ? 'Práctica IA por Estudiante' : 'AI Practice by Student'}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {isEs ? 'Ve cuánto practican tus estudiantes con el AI Practice Partner para planificar mejor tus clases' : 'See how much your students practice with the AI Practice Partner to plan your classes better'}
                </p>
              </CardHeader>
              <CardContent>
                {isAiStatsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F59E1C]"></div>
                    <p className="mt-2 text-gray-600">{isEs ? 'Cargando estadísticas...' : 'Loading stats...'}</p>
                  </div>
                ) : aiStats?.userStats && aiStats.userStats.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{isEs ? 'Estudiante' : 'Student'}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">{isEs ? 'Conversaciones' : 'Conversations'}</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">{isEs ? 'Mensajes' : 'Messages'}</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{isEs ? 'Última Actividad' : 'Last Activity'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiStats.userStats
                          .sort((a, b) => b.messageCount - a.messageCount)
                          .map((stat) => (
                          <tr key={stat.userId} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#1C7BB1]/10 flex items-center justify-center">
                                  <span className="text-xs font-bold text-[#1C7BB1]">
                                    {stat.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </span>
                                </div>
                                <span className="font-medium text-gray-900">{stat.userName}</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-4">
                              <Badge variant="secondary">{stat.conversationCount}</Badge>
                            </td>
                            <td className="text-center py-3 px-4">
                              <span className="font-semibold text-[#0A4A6E]">{stat.messageCount}</span>
                            </td>
                            <td className="text-right py-3 px-4 text-sm text-gray-500">
                              {stat.lastActive
                                ? new Date(stat.lastActive).toLocaleDateString('es-ES', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Sparkles className="mx-auto h-12 w-12 text-[#F59E1C]/40 mb-4" />
                    <p className="text-gray-500">{isEs ? 'Ningún estudiante ha usado el AI Practice Partner aún' : 'No students have used the AI Practice Partner yet'}</p>
                    <p className="text-sm text-gray-400 mt-1">{isEs ? 'Las estadísticas aparecerán aquí cuando los estudiantes practiquen' : 'Stats will appear here when students start practicing'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'calendar' && <AdminCalendar />}

        {activeTab === 'learning-path' && <AdminLearningPath />}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Date Range Picker + Sub-nav */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2">
                {(['overview', 'revenue', 'students'] as const).map(view => (
                  <Button
                    key={view}
                    variant={analyticsView === view ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAnalyticsView(view)}
                    className={analyticsView === view ? "bg-[#1C7BB1] hover:bg-[#0A4A6E]" : ""}
                  >
                    {view === 'overview' ? (isEs ? 'General' : 'Overview') :
                     view === 'revenue' ? (isEs ? 'Ingresos' : 'Revenue') :
                     (isEs ? 'Estudiantes' : 'Students')}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: '30d', days: 30 },
                  { label: '3m', months: 3 },
                  { label: '6m', months: 6 },
                  { label: '1a', months: 12 },
                  { label: isEs ? 'Todo' : 'All', months: 60 },
                ].map(preset => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => {
                      const to = new Date();
                      const from = new Date();
                      if (preset.days) from.setDate(from.getDate() - preset.days);
                      else if (preset.months) from.setMonth(from.getMonth() - preset.months);
                      setDateRange({ from, to });
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range: any) => {
                        if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to });
                        else if (range?.from) setDateRange({ from: range.from, to: new Date() });
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {isAnalyticsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C7BB1]"></div>
                <p className="mt-2 text-gray-600">{isEs ? 'Cargando analíticas...' : 'Loading analytics...'}</p>
              </div>
            ) : analytics ? (
              <>
                {/* ============ OVERVIEW ============ */}
                {analyticsView === 'overview' && (
                  <>
                    {/* Summary Cards - 6 columns */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {[
                        { icon: BookOpen, color: '#1C7BB1', bg: 'bg-[#1C7BB1]/10', label: isEs ? 'Total Clases' : 'Total Classes', value: analytics.summary.totalClasses },
                        { icon: Users, color: '#22c55e', bg: 'bg-green-100', label: isEs ? 'Estudiantes' : 'Students', value: analytics.summary.totalStudents },
                        { icon: TrendingUp, color: '#F59E1C', bg: 'bg-[#F59E1C]/10', label: isEs ? 'Completadas' : 'Completion', value: `${analytics.summary.completionRate}%` },
                        { icon: Clock, color: '#1C7BB1', bg: 'bg-[#1C7BB1]/10', label: isEs ? 'Horas' : 'Hours', value: analytics.summary.totalHours },
                        { icon: DollarSign, color: '#22c55e', bg: 'bg-green-100', label: isEs ? 'Ingresos' : 'Revenue', value: `$${analytics.revenue.totalRevenue.toLocaleString()}` },
                        { icon: CreditCard, color: '#8b5cf6', bg: 'bg-purple-100', label: isEs ? 'Suscripciones' : 'Subscriptions', value: analytics.revenue.activeSubscriptions },
                      ].map((card, i) => (
                        <Card key={i} className="border-0 shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${card.bg}`}>
                                <card.icon className="h-5 w-5" style={{ color: card.color }} />
                              </div>
                              <div>
                                <p className="text-[11px] text-gray-500">{card.label}</p>
                                <p className="text-lg font-bold text-gray-900">{card.value}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Retention + Alerts row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-0 shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-500">{isEs ? 'Tasa de Retención' : 'Retention Rate'}</p>
                              <p className="text-3xl font-bold text-[#1C7BB1]">{analytics.retention.retentionRate}%</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {isEs ? `${analytics.retention.activeThisMonth} activos este mes · ${analytics.retention.churnedStudents} perdidos` :
                                  `${analytics.retention.activeThisMonth} active this month · ${analytics.retention.churnedStudents} churned`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">{isEs ? 'Promedio clases/estudiante' : 'Avg classes/student'}</p>
                              <p className="text-2xl font-bold text-gray-700">{analytics.retention.avgClassesPerStudent}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {analytics.capacityAlerts.length > 0 && (
                        <Card className="border-orange-200 bg-orange-50/50">
                          <CardContent className="p-4">
                            <p className="text-sm font-medium text-orange-700 flex items-center gap-2 mb-2">
                              <AlertTriangle className="h-4 w-4" />
                              {isEs ? 'Alertas de Capacidad' : 'Capacity Alerts'}
                            </p>
                            <div className="space-y-1">
                              {analytics.capacityAlerts.map((alert, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-orange-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                  {alert.message}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Classes by Month - AreaChart */}
                      <Card>
                        <CardHeader><CardTitle className="text-base">{isEs ? 'Clases por Mes' : 'Classes by Month'}</CardTitle></CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={analytics.classesByMonth}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                              <Tooltip />
                              <Area type="monotone" dataKey="count" stroke="#1C7BB1" fill="#1C7BB1" fillOpacity={0.15} name={isEs ? 'Clases' : 'Classes'} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Classes by Category */}
                      <Card>
                        <CardHeader><CardTitle className="text-base">{isEs ? 'Clases por Categoría' : 'Classes by Category'}</CardTitle></CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Object.entries(analytics.classesByCategory).map(([cat, count]) => {
                              const maxCount = Math.max(...Object.values(analytics.classesByCategory), 1);
                              const label = cat === 'adults-spanish' ? (isEs ? 'Español Adultos' : 'Adults Spanish') :
                                cat === 'kids-spanish' ? (isEs ? 'Español Niños' : 'Kids Spanish') :
                                cat === 'adults-english' ? (isEs ? 'Inglés Adultos' : 'Adults English') :
                                cat === 'kids-english' ? (isEs ? 'Inglés Niños' : 'Kids English') : cat;
                              return (
                                <div key={cat}>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-700">{label}</span>
                                    <span className="font-semibold text-gray-900">{count}</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                                    <div className="bg-[#1C7BB1] h-2.5 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Student Activity */}
                      <Card>
                        <CardHeader><CardTitle className="text-base">{isEs ? 'Actividad de Estudiantes' : 'Student Activity'}</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { value: analytics.studentActivity.totalActive, label: isEs ? 'Activos' : 'Active', color: 'text-[#1C7BB1]' },
                              { value: analytics.studentActivity.newThisMonth, label: isEs ? 'Nuevos este mes' : 'New this month', color: 'text-green-600' },
                              { value: analytics.studentActivity.withCredits, label: isEs ? 'Con créditos' : 'With credits', color: 'text-[#F59E1C]' },
                              { value: analytics.studentActivity.withoutCredits, label: isEs ? 'Sin créditos' : 'No credits', color: 'text-red-500' },
                            ].map((item, i) => (
                              <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                                <p className="text-xs text-gray-500">{item.label}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Tutor Activity */}
                      <Card>
                        <CardHeader><CardTitle className="text-base">{isEs ? 'Actividad de Tutores' : 'Tutor Activity'}</CardTitle></CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 text-gray-500 font-medium">Tutor</th>
                                  <th className="text-center py-2 text-gray-500 font-medium">Prog.</th>
                                  <th className="text-center py-2 text-gray-500 font-medium">Comp.</th>
                                  <th className="text-center py-2 text-gray-500 font-medium">%</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analytics.tutorActivity.map(t => (
                                  <tr key={t.tutorId} className="border-b border-gray-50">
                                    <td className="py-2 font-medium text-gray-900">{t.tutorName.split(' ')[0]}</td>
                                    <td className="text-center py-2">{t.scheduledCount}</td>
                                    <td className="text-center py-2">{t.completedCount}</td>
                                    <td className="text-center py-2">
                                      <Badge variant={t.utilization >= 0.7 ? "default" : "secondary"}>
                                        {(t.utilization * 100).toFixed(0)}%
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {/* ============ REVENUE ============ */}
                {analyticsView === 'revenue' && (
                  <>
                    {/* Stripe Metrics: MRR, Churn, Failed */}
                    {stripeMetrics && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-0 shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-gray-500 font-medium">MRR</p>
                              <DollarSign className="h-4 w-4 text-green-500" />
                            </div>
                            <p className="text-3xl font-bold text-green-600">${stripeMetrics.mrr.toLocaleString()}</p>
                            {stripeMetrics.mrrTrend.length > 1 && (
                              <ResponsiveContainer width="100%" height={50}>
                                <AreaChart data={stripeMetrics.mrrTrend}>
                                  <Area type="monotone" dataKey="mrr" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
                                </AreaChart>
                              </ResponsiveContainer>
                            )}
                          </CardContent>
                        </Card>
                        <Card className="border-0 shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-gray-500 font-medium">{isEs ? 'Tasa de Churn' : 'Churn Rate'}</p>
                              <TrendingUp className="h-4 w-4 text-orange-500" />
                            </div>
                            <p className={`text-3xl font-bold ${stripeMetrics.churnRate > 5 ? 'text-red-600' : stripeMetrics.churnRate > 2 ? 'text-orange-500' : 'text-green-600'}`}>
                              {stripeMetrics.churnRate}%
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {stripeMetrics.churnCount} {isEs ? 'cancelaciones este mes' : 'cancellations this month'}
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="border-0 shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-gray-500 font-medium">{isEs ? 'Pagos Fallidos' : 'Failed Payments'}</p>
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            </div>
                            <p className={`text-3xl font-bold ${stripeMetrics.failedPayments > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {stripeMetrics.failedPayments}
                            </p>
                            {stripeMetrics.atRiskSubscribers.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-500 font-medium">{isEs ? 'En riesgo:' : 'At risk:'}</p>
                                {stripeMetrics.atRiskSubscribers.slice(0, 3).map((sub) => (
                                  <p key={sub.userId} className="text-xs text-red-500 truncate">{sub.name} - {sub.email}</p>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Revenue summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: isEs ? 'Ingresos Totales' : 'Total Revenue', value: `$${analytics.revenue.totalRevenue.toLocaleString()}`, color: 'text-green-600' },
                        { label: isEs ? 'Promedio/Estudiante' : 'Avg/Student', value: `$${analytics.revenue.avgRevenuePerStudent}`, color: 'text-[#1C7BB1]' },
                        { label: isEs ? 'Conversión Trial' : 'Trial Conversion', value: `${analytics.revenue.trialConversionRate}%`, color: 'text-[#F59E1C]' },
                        { label: isEs ? 'Suscripciones Activas' : 'Active Subscriptions', value: analytics.revenue.activeSubscriptions, color: 'text-purple-600' },
                      ].map((card, i) => (
                        <Card key={i} className="border-0 shadow-md">
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Revenue by Month */}
                      <Card>
                        <CardHeader><CardTitle className="text-base">{isEs ? 'Ingresos por Mes' : 'Revenue by Month'}</CardTitle></CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={analytics.revenue.revenueByMonth}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                              <Tooltip formatter={(v: number) => [`$${v}`, isEs ? 'Ingresos' : 'Revenue']} />
                              <Area type="monotone" dataKey="amount" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* New Subscriptions by Month */}
                      <Card>
                        <CardHeader><CardTitle className="text-base">{isEs ? 'Nuevas Suscripciones por Mes' : 'New Subscriptions by Month'}</CardTitle></CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analytics.revenue.newSubscriptionsByMonth}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name={isEs ? 'Suscripciones' : 'Subscriptions'} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Top students by spending */}
                    {studentsList && (
                      <Card>
                        <CardHeader><CardTitle className="text-base">{isEs ? 'Top 10 Estudiantes por Gasto' : 'Top 10 Students by Spending'}</CardTitle></CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 text-gray-500 font-medium">{isEs ? 'Nombre' : 'Name'}</th>
                                  <th className="text-center py-2 text-gray-500 font-medium">{isEs ? 'Clases' : 'Classes'}</th>
                                  <th className="text-center py-2 text-gray-500 font-medium">{isEs ? 'Créditos' : 'Credits'}</th>
                                  <th className="text-right py-2 text-gray-500 font-medium">{isEs ? 'Total Gastado' : 'Total Spent'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...studentsList.students].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10).map(s => (
                                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedStudentId(s.id)}>
                                    <td className="py-2 font-medium text-gray-900">{s.name}</td>
                                    <td className="text-center py-2">{s.completedClasses}/{s.totalClasses}</td>
                                    <td className="text-center py-2">{s.classCredits}</td>
                                    <td className="text-right py-2 font-semibold text-green-600">${s.totalSpent.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Transaction History from Stripe */}
                    {transactions && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            {isEs ? 'Historial de Transacciones (Stripe)' : 'Transaction History (Stripe)'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 text-gray-500 font-medium">{isEs ? 'Fecha' : 'Date'}</th>
                                  <th className="text-left py-2 text-gray-500 font-medium">{isEs ? 'Cliente' : 'Customer'}</th>
                                  <th className="text-right py-2 text-gray-500 font-medium">{isEs ? 'Monto' : 'Amount'}</th>
                                  <th className="text-center py-2 text-gray-500 font-medium">{isEs ? 'Estado' : 'Status'}</th>
                                  <th className="text-center py-2 text-gray-500 font-medium">{isEs ? 'Método' : 'Method'}</th>
                                  <th className="text-center py-2 text-gray-500 font-medium">{isEs ? 'Acciones' : 'Actions'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {transactions.data.map((tx) => (
                                  <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="py-2 text-xs text-gray-600">{new Date(tx.created).toLocaleDateString()}</td>
                                    <td className="py-2 text-xs truncate max-w-[150px]">{tx.customerEmail || '-'}</td>
                                    <td className="py-2 text-right font-semibold">
                                      ${tx.amount.toFixed(2)}
                                      {tx.refunded && <span className="text-red-500 text-xs ml-1">(-${tx.amountRefunded.toFixed(2)})</span>}
                                    </td>
                                    <td className="py-2 text-center">
                                      <Badge variant={tx.status === 'succeeded' ? 'default' : tx.status === 'failed' ? 'destructive' : 'secondary'}
                                        className={`text-[10px] ${tx.refunded ? 'bg-red-100 text-red-700' : tx.status === 'succeeded' ? 'bg-green-100 text-green-700' : ''}`}>
                                        {tx.refunded ? (isEs ? 'Reembolsado' : 'Refunded') : tx.status}
                                      </Badge>
                                    </td>
                                    <td className="py-2 text-center text-xs text-gray-500">
                                      {tx.cardBrand && tx.cardLast4 ? `${tx.cardBrand} •${tx.cardLast4}` : tx.paymentMethodType}
                                    </td>
                                    <td className="py-2 text-center">
                                      {tx.status === 'succeeded' && !tx.refunded && tx.paymentIntentId && (
                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => setRefundTarget({ paymentIntentId: tx.paymentIntentId!, amount: tx.amount, customerEmail: tx.customerEmail })}>
                                          {isEs ? 'Reembolsar' : 'Refund'}
                                        </Button>
                                      )}
                                      {tx.receiptUrl && (
                                        <a href={tx.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline ml-1">
                                          {isEs ? 'Recibo' : 'Receipt'}
                                        </a>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {transactions.hasMore && (
                            <div className="text-center mt-4">
                              <Button variant="outline" size="sm" onClick={() => setTxCursor(transactions.nextCursor)}>
                                {isEs ? 'Cargar más' : 'Load more'}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Refund Confirmation Dialog */}
                    {refundTarget && (
                      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setRefundTarget(null)}>
                        <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
                          <h3 className="text-lg font-bold mb-2">{isEs ? 'Confirmar Reembolso' : 'Confirm Refund'}</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            {isEs
                              ? `¿Estás seguro de reembolsar $${refundTarget.amount.toFixed(2)} a ${refundTarget.customerEmail}?`
                              : `Are you sure you want to refund $${refundTarget.amount.toFixed(2)} to ${refundTarget.customerEmail}?`
                            }
                          </p>
                          <p className="text-xs text-red-500 mb-4">
                            {isEs ? 'Esta acción no se puede deshacer. Los créditos del estudiante serán ajustados.' : 'This action cannot be undone. Student credits will be adjusted.'}
                          </p>
                          <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setRefundTarget(null)}>{isEs ? 'Cancelar' : 'Cancel'}</Button>
                            <Button variant="destructive" disabled={refundMutation.isPending}
                              onClick={() => refundMutation.mutate({ paymentIntentId: refundTarget.paymentIntentId })}>
                              {refundMutation.isPending ? (isEs ? 'Procesando...' : 'Processing...') : (isEs ? 'Confirmar Reembolso' : 'Confirm Refund')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ============ STUDENTS ============ */}
                {analyticsView === 'students' && (
                  <>
                    {/* Search bar */}
                    <div className="flex gap-4 items-center">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder={isEs ? 'Buscar por nombre o email...' : 'Search by name or email...'}
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        {sortedStudents.length} {isEs ? 'estudiantes' : 'students'}
                      </p>
                    </div>

                    <Card>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-gray-50/50">
                                {[
                                  { key: 'name', label: isEs ? 'Nombre' : 'Name', align: 'left' },
                                  { key: 'userType', label: isEs ? 'Tipo' : 'Type', align: 'center' },
                                  { key: 'classCredits', label: isEs ? 'Créditos' : 'Credits', align: 'center' },
                                  { key: 'completedClasses', label: isEs ? 'Clases' : 'Classes', align: 'center' },
                                  { key: 'totalSpent', label: isEs ? 'Gastado' : 'Spent', align: 'right' },
                                  { key: 'lastClassDate', label: isEs ? 'Última Clase' : 'Last Class', align: 'center' },
                                  { key: 'hasSubscription', label: 'Sub.', align: 'center' },
                                  { key: 'actions', label: '', align: 'center' },
                                ].map(col => (
                                  <th
                                    key={col.key}
                                    className={`py-3 px-3 text-gray-500 font-medium cursor-pointer hover:text-gray-700 text-${col.align}`}
                                    onClick={() => {
                                      if (col.key === 'actions') return;
                                      if (studentSortKey === col.key) setStudentSortDir(d => d === 'desc' ? 'asc' : 'desc');
                                      else { setStudentSortKey(col.key); setStudentSortDir('desc'); }
                                    }}
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      {col.label}
                                      {studentSortKey === col.key && <ArrowUpDown className="h-3 w-3" />}
                                    </span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sortedStudents.map(s => (
                                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                  <td className="py-3 px-3">
                                    <div>
                                      <p className="font-medium text-gray-900">{s.name}</p>
                                      <p className="text-xs text-gray-400">{s.email}</p>
                                    </div>
                                  </td>
                                  <td className="text-center py-3 px-3">
                                    <Badge variant={s.userType === 'customer' ? 'default' : 'secondary'} className="text-xs">
                                      {s.userType}
                                    </Badge>
                                  </td>
                                  <td className="text-center py-3 px-3 font-semibold">{s.classCredits}</td>
                                  <td className="text-center py-3 px-3">{s.completedClasses}/{s.totalClasses}</td>
                                  <td className="text-right py-3 px-3 font-semibold text-green-600">${s.totalSpent.toLocaleString()}</td>
                                  <td className="text-center py-3 px-3 text-xs text-gray-500">
                                    {s.lastClassDate ? new Date(s.lastClassDate).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="text-center py-3 px-3">
                                    {s.hasSubscription ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-gray-300">-</span>}
                                  </td>
                                  <td className="text-center py-3 px-3">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedStudentId(s.id)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            ) : null}

            {/* ============ STUDENT DETAIL SHEET ============ */}
            <Sheet open={!!selectedStudentId} onOpenChange={(open) => { if (!open) setSelectedStudentId(null); }}>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{isEs ? 'Detalle del Estudiante' : 'Student Detail'}</SheetTitle>
                </SheetHeader>
                {studentDetail && (
                  <div className="space-y-6 mt-4">
                    {/* Header */}
                    <div>
                      <h3 className="text-lg font-bold">{studentDetail.user.firstName} {studentDetail.user.lastName}</h3>
                      <p className="text-sm text-gray-500">{studentDetail.user.email}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge>{studentDetail.user.userType}</Badge>
                        <Badge variant="outline">{studentDetail.user.level}</Badge>
                        {studentDetail.user.aiSubscriptionActive && <Badge variant="secondary">AI</Badge>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {isEs ? 'Miembro desde' : 'Member since'}: {studentDetail.user.createdAt ? new Date(studentDetail.user.createdAt).toLocaleDateString() : '-'}
                      </p>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: isEs ? 'Completadas' : 'Completed', value: studentDetail.classes.completed, color: 'text-[#1C7BB1]' },
                        { label: isEs ? 'Gastado' : 'Spent', value: `$${studentDetail.financial.totalSpent}`, color: 'text-green-600' },
                        { label: isEs ? 'Créditos' : 'Credits', value: studentDetail.financial.creditsRemaining, color: 'text-[#F59E1C]' },
                        { label: isEs ? 'Días sin clase' : 'Days idle', value: studentDetail.engagement.daysSinceLastClass ?? '-', color: 'text-red-500' },
                      ].map((stat, i) => (
                        <div key={i} className="text-center p-2 bg-gray-50 rounded-lg">
                          <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                          <p className="text-[10px] text-gray-500">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Class history chart */}
                    {studentDetail.classes.byMonth.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">{isEs ? 'Clases por Mes' : 'Classes by Month'}</p>
                        <ResponsiveContainer width="100%" height={120}>
                          <AreaChart data={studentDetail.classes.byMonth}>
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={20} />
                            <Area type="monotone" dataKey="count" stroke="#1C7BB1" fill="#1C7BB1" fillOpacity={0.15} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Engagement */}
                    <div>
                      <p className="text-sm font-medium mb-2">{isEs ? 'Engagement' : 'Engagement'}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-500">{isEs ? 'Promedio/mes' : 'Avg/month'}</span>
                          <span className="font-semibold">{studentDetail.engagement.avgClassesPerMonth}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-500">{isEs ? 'Días registrado' : 'Days registered'}</span>
                          <span className="font-semibold">{studentDetail.engagement.daysSinceSignup}</span>
                        </div>
                        {studentDetail.engagement.preferredCategory && (
                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                            <span className="text-gray-500">{isEs ? 'Categoría' : 'Category'}</span>
                            <span className="font-semibold text-xs">{studentDetail.engagement.preferredCategory}</span>
                          </div>
                        )}
                        {studentDetail.engagement.preferredTutor && (
                          <div className="flex justify-between p-2 bg-gray-50 rounded">
                            <span className="text-gray-500">{isEs ? 'Tutor favorito' : 'Fav tutor'}</span>
                            <span className="font-semibold text-xs">{studentDetail.engagement.preferredTutor.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Usage */}
                    {(studentDetail.aiUsage.conversations > 0 || studentDetail.aiUsage.messages > 0) && (
                      <div>
                        <p className="text-sm font-medium mb-2">{isEs ? 'Uso de AI' : 'AI Usage'}</p>
                        <div className="flex gap-4 text-sm">
                          <div className="text-center p-2 bg-purple-50 rounded flex-1">
                            <p className="font-bold text-purple-600">{studentDetail.aiUsage.conversations}</p>
                            <p className="text-[10px] text-gray-500">{isEs ? 'Conversaciones' : 'Conversations'}</p>
                          </div>
                          <div className="text-center p-2 bg-purple-50 rounded flex-1">
                            <p className="font-bold text-purple-600">{studentDetail.aiUsage.messages}</p>
                            <p className="text-[10px] text-gray-500">{isEs ? 'Mensajes' : 'Messages'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Financial */}
                    <div>
                      <p className="text-sm font-medium mb-2">{isEs ? 'Financiero' : 'Financial'}</p>
                      {studentDetail.financial.subscription && (
                        <div className="p-2 bg-green-50 rounded mb-2 text-sm">
                          <span className="text-green-700 font-medium">{isEs ? 'Suscripción activa' : 'Active subscription'}: </span>
                          <Badge variant="outline" className="text-green-700">{studentDetail.financial.subscription.status}</Badge>
                        </div>
                      )}
                      {studentDetail.financial.purchases.length > 0 && (
                        <div className="space-y-1">
                          {studentDetail.financial.purchases.slice(0, 5).map((p: any) => (
                            <div key={p.id} className="flex justify-between text-xs border-b border-gray-100 py-1">
                              <span className="text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                              <span>+{p.classesAdded} {isEs ? 'clases' : 'classes'}</span>
                              <span className="font-semibold text-green-600">${Number(p.amount).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stripe Data */}
                    {studentStripe && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <CreditCard className="h-3.5 w-3.5" /> Stripe
                        </p>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="text-center p-2 bg-green-50 rounded">
                            <p className="text-lg font-bold text-green-600">${studentStripe.ltv.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-500">LTV</p>
                          </div>
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <p className="text-lg font-bold text-blue-600">{studentStripe.paymentMethods.length}</p>
                            <p className="text-[10px] text-gray-500">{isEs ? 'Métodos de pago' : 'Payment Methods'}</p>
                          </div>
                        </div>
                        {studentStripe.paymentMethods.length > 0 && (
                          <div className="space-y-1 mb-3">
                            {studentStripe.paymentMethods.map((pm) => (
                              <div key={pm.id} className="flex justify-between text-xs p-1.5 bg-gray-50 rounded">
                                <span className="font-medium capitalize">{pm.brand} •{pm.last4}</span>
                                <span className="text-gray-400">{pm.expMonth}/{pm.expYear}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {studentStripe.transactions.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 font-medium">{isEs ? 'Transacciones recientes' : 'Recent transactions'}</p>
                            {studentStripe.transactions.slice(0, 5).map((tx) => (
                              <div key={tx.id} className="flex justify-between text-xs border-b border-gray-100 py-1">
                                <span className="text-gray-500">{new Date(tx.created).toLocaleDateString()}</span>
                                <Badge variant={tx.refunded ? 'destructive' : tx.status === 'succeeded' ? 'default' : 'secondary'} className="text-[9px] h-4">
                                  {tx.refunded ? (isEs ? 'Reemb.' : 'Refund') : tx.status}
                                </Badge>
                                <span className={`font-semibold ${tx.refunded ? 'text-red-500 line-through' : 'text-green-600'}`}>${tx.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recent classes */}
                    {studentDetail.classes.recent.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">{isEs ? 'Clases Recientes' : 'Recent Classes'}</p>
                        <div className="space-y-1">
                          {studentDetail.classes.recent.slice(0, 5).map((c: any) => (
                            <div key={c.id} className="flex justify-between items-center text-xs border-b border-gray-100 py-1.5">
                              <div>
                                <p className="font-medium">{c.title}</p>
                                <p className="text-gray-400">{c.tutorName}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant={c.status === 'completed' ? 'default' : c.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-[10px]">
                                  {c.status}
                                </Badge>
                                <p className="text-gray-400 mt-0.5">{new Date(c.scheduledAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reviews */}
                    {studentDetail.reviews.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">{isEs ? 'Reviews' : 'Reviews'}</p>
                        <div className="space-y-2">
                          {studentDetail.reviews.map((r: any) => (
                            <div key={r.id} className="p-2 bg-gray-50 rounded text-xs">
                              <div className="flex justify-between">
                                <span className="font-medium">{r.tutorName}</span>
                                <span className="text-yellow-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                              </div>
                              {r.comment && <p className="text-gray-600 mt-1">{r.comment}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tickets de Soporte</CardTitle>
              </CardHeader>
              <CardContent>
                {isSupportLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C7BB1]"></div>
                  </div>
                ) : supportTickets && supportTickets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">#</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Asunto</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Categoría</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Estado</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Prioridad</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supportTickets.map(ticket => (
                          <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-3 px-4 text-sm text-gray-600">#{ticket.id}</td>
                            <td className="py-3 px-4 font-medium text-gray-900">{ticket.subject}</td>
                            <td className="text-center py-3 px-4">
                              <Badge variant="outline">{ticket.category}</Badge>
                            </td>
                            <td className="text-center py-3 px-4">
                              <Badge variant={
                                ticket.status === 'open' ? 'default' :
                                ticket.status === 'in_progress' ? 'secondary' :
                                ticket.status === 'resolved' ? 'outline' : 'destructive'
                              }>
                                {ticket.status === 'open' ? 'Abierto' :
                                 ticket.status === 'in_progress' ? 'En Progreso' :
                                 ticket.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-4">
                              <Badge variant={ticket.priority === 'high' ? 'destructive' : 'secondary'}>
                                {ticket.priority === 'high' ? 'Alta' : ticket.priority === 'normal' ? 'Normal' : 'Baja'}
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-4 text-sm text-gray-500">
                              {new Date(ticket.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <LifeBuoy className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">No hay tickets de soporte</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'crm' && <CrmDashboard />}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{isEs ? 'Configuración General' : 'General Settings'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{isEs ? 'Configuraciones adicionales del sistema estarán disponibles próximamente.' : 'Additional system settings will be available soon.'}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
