import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Settings, 
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Globe
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
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'tutors' | 'highlevel' | 'settings'>('tutors');
  const [showAddTutor, setShowAddTutor] = useState(false);
  const [newTutor, setNewTutor] = useState<TutorData>({
    name: '',
    email: '',
    specialization: '',
    bio: '',
    hourlyRate: 25
  });
  const [highLevelConfig, setHighLevelConfig] = useState({
    apiKey: '',
    locationId: '',
    testEmail: '',
    testMessage: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener lista de tutores
  const { data: tutors, isLoading } = useQuery({
    queryKey: ['/api/tutors'],
    queryFn: () => apiRequest('/api/tutors').then(res => res.json())
  });

  // Crear nuevo tutor
  const createTutorMutation = useMutation({
    mutationFn: (tutorData: TutorData) => 
      apiRequest('/api/tutors', {
        method: 'POST',
        body: JSON.stringify(tutorData)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tutors'] });
      setShowAddTutor(false);
      setNewTutor({
        name: '',
        email: '',
        specialization: '',
        bio: '',
        hourlyRate: 25
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

  // Cargar profesores de ejemplo
  const seedTutorsMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/tutors/bulk-import', {
        method: 'POST',
        body: JSON.stringify({
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
        })
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

  // Probar conexión High Level
  const testHighLevelMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/high-level/test-connection', {
        method: 'POST'
      }).then(res => res.json()),
    onSuccess: (result) => {
      toast({
        title: result.connected ? "Conexión exitosa" : "Conexión fallida",
        description: result.message,
        variant: result.connected ? "default" : "destructive"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error de conexión",
        description: error.message || "No se pudo conectar con High Level",
        variant: "destructive"
      });
    }
  });

  // Enviar mensaje de prueba
  const sendTestMessageMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/high-level/send-test-message', {
        method: 'POST',
        body: JSON.stringify({
          email: highLevelConfig.testEmail,
          message: highLevelConfig.testMessage
        })
      }).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Mensaje enviado",
        description: "El mensaje de prueba se envió exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error enviando mensaje",
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
          <p className="text-gray-600">Gestiona profesores, configuraciones y integraciones</p>
        </div>

        {/* Navegación de pestañas */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('tutors')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tutors'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="inline w-4 h-4 mr-2" />
                Profesores
              </button>
              <button
                onClick={() => setActiveTab('highlevel')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'highlevel'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MessageSquare className="inline w-4 h-4 mr-2" />
                High Level
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="inline w-4 h-4 mr-2" />
                Configuración
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Añadir Profesor
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
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                            {tutor.country && (
                              <Badge variant="outline">
                                <Globe className="w-3 h-3 mr-1" />
                                {tutor.country}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center text-yellow-500 mb-1">
                            <span className="text-sm font-medium">{tutor.rating || "5.0"}</span>
                            <span className="ml-1">⭐</span>
                          </div>
                          <p className="text-xs text-gray-500">{tutor.reviewCount || 0} reseñas</p>
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
                      className="bg-blue-600 hover:bg-blue-700"
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
          </div>
        )}

        {activeTab === 'highlevel' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de High Level</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="apiKey">API Key de High Level</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={highLevelConfig.apiKey}
                    onChange={(e) => setHighLevelConfig({...highLevelConfig, apiKey: e.target.value})}
                    placeholder="Introduce tu API key de High Level"
                  />
                </div>
                
                <div>
                  <Label htmlFor="locationId">Location ID</Label>
                  <Input
                    id="locationId"
                    value={highLevelConfig.locationId}
                    onChange={(e) => setHighLevelConfig({...highLevelConfig, locationId: e.target.value})}
                    placeholder="ID de tu ubicación en High Level"
                  />
                </div>
                
                <Button 
                  onClick={() => testHighLevelMutation.mutate()}
                  disabled={testHighLevelMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {testHighLevelMutation.isPending ? "Probando..." : "Probar Conexión"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Enviar Mensaje de Prueba</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="testEmail">Email del Contacto</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    value={highLevelConfig.testEmail}
                    onChange={(e) => setHighLevelConfig({...highLevelConfig, testEmail: e.target.value})}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="testMessage">Mensaje</Label>
                  <Textarea
                    id="testMessage"
                    value={highLevelConfig.testMessage}
                    onChange={(e) => setHighLevelConfig({...highLevelConfig, testMessage: e.target.value})}
                    placeholder="Mensaje de prueba..."
                    rows={3}
                  />
                </div>
                
                <Button 
                  onClick={() => sendTestMessageMutation.mutate()}
                  disabled={sendTestMessageMutation.isPending || !highLevelConfig.testEmail || !highLevelConfig.testMessage}
                  variant="outline"
                >
                  {sendTestMessageMutation.isPending ? "Enviando..." : "Enviar Mensaje de Prueba"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración General</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Configuraciones adicionales del sistema estarán disponibles próximamente.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}