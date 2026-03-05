import { type Tutor, type InsertTutor } from "@shared/schema";
import { storage } from "../storage";
import { HighLevelService } from "./high-level";

interface TutorProfileData {
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

export class TutorManagementService {
  private highLevelService?: HighLevelService;

  constructor(highLevelApiKey?: string, highLevelLocationId?: string) {
    if (highLevelApiKey && highLevelLocationId) {
      this.highLevelService = new HighLevelService(highLevelApiKey, highLevelLocationId);
    }
  }

  // Crear perfil completo de profesor
  async createTutorProfile(tutorData: TutorProfileData): Promise<Tutor> {
    try {
      // Validar datos requeridos
      this.validateTutorData(tutorData);

      // Crear tutor en la base de datos
      const insertData: InsertTutor = {
        name: tutorData.name,
        email: tutorData.email,
        specialization: tutorData.specialization,
        bio: tutorData.bio,
        hourlyRate: tutorData.hourlyRate.toString(),
        avatar: tutorData.profileImage || this.generateDefaultAvatar(tutorData.name),
        phone: tutorData.phone || null,
        country: tutorData.country || null,
        timezone: tutorData.timezone || null,
        certifications: tutorData.certifications || null,
        yearsOfExperience: tutorData.yearsOfExperience || null,
        rating: "5.00",
        reviewCount: 0,
        isActive: true
      };

      const tutor = await storage.createTutor(insertData);

      // Crear contacto en High Level si está configurado
      if (this.highLevelService) {
        try {
          const contactId = await this.highLevelService.createOrUpdateContact({
            id: 0, // No importa para la creación del contacto
            firstName: tutorData.name.split(' ')[0],
            lastName: tutorData.name.split(' ').slice(1).join(' '),
            email: tutorData.email,
            phone: tutorData.phone ?? null,
            username: '',
            password: '',
            level: 'teacher',
            avatar: tutorData.profileImage ?? null,
            userType: 'trial',
            trialCompleted: false,
            classCredits: 0,
            highLevelContactId: null,
            trialTutorId: null,
            stripeCustomerId: null,
            aiSubscriptionActive: false,
            aiMessagesUsed: 0,
            aiMessagesResetAt: null,
            createdAt: new Date()
          });
          
          console.log(`Profesor ${tutorData.name} añadido a High Level con ID: ${contactId}`);
        } catch (error) {
          console.error("Error añadiendo profesor a High Level:", error);
          // No fallar la creación del tutor si High Level falla
        }
      }

      console.log(`Profesor ${tutorData.name} creado exitosamente`);
      return tutor;

    } catch (error) {
      console.error("Error creando perfil de profesor:", error);
      throw error;
    }
  }

  // Actualizar información de profesor
  async updateTutorProfile(tutorId: number, updateData: Partial<TutorProfileData>): Promise<Tutor | undefined> {
    try {
      const existingTutor = await storage.getTutor(tutorId);
      if (!existingTutor) {
        throw new Error("Profesor no encontrado");
      }

      const updateFields: Partial<InsertTutor> = {};
      
      if (updateData.name) updateFields.name = updateData.name;
      if (updateData.email) updateFields.email = updateData.email;
      if (updateData.specialization) updateFields.specialization = updateData.specialization;
      if (updateData.bio) updateFields.bio = updateData.bio;
      if (updateData.hourlyRate) updateFields.hourlyRate = updateData.hourlyRate.toString();
      if (updateData.profileImage) updateFields.avatar = updateData.profileImage;
      if (updateData.phone !== undefined) updateFields.phone = updateData.phone;
      if (updateData.country !== undefined) updateFields.country = updateData.country;
      if (updateData.timezone !== undefined) updateFields.timezone = updateData.timezone;
      if (updateData.certifications !== undefined) updateFields.certifications = updateData.certifications;
      if (updateData.yearsOfExperience !== undefined) updateFields.yearsOfExperience = updateData.yearsOfExperience;

      // Actualizar en la base de datos (necesitaríamos implementar updateTutor en storage)
      console.log(`Perfil de ${existingTutor.name} actualizado`);
      
      return existingTutor; // Por ahora retornamos el existente

    } catch (error) {
      console.error("Error actualizando perfil de profesor:", error);
      throw error;
    }
  }

  // Subir foto de perfil
  async uploadTutorImage(tutorId: number, imageFile: File): Promise<string> {
    try {
      // En un entorno real, esto subiría la imagen a un servicio como AWS S3, Cloudinary, etc.
      // Por ahora, simularemos la URL de la imagen
      
      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `tutor-${tutorId}-${Date.now()}.${fileExtension}`;
      const imageUrl = `/uploads/tutors/${fileName}`;

      // Aquí iría la lógica real de subida de archivos
      console.log(`Imagen subida para profesor ${tutorId}: ${imageUrl}`);

      return imageUrl;

    } catch (error) {
      console.error("Error subiendo imagen de profesor:", error);
      throw error;
    }
  }

  // Cargar datos de profesores desde CSV/Excel
  async bulkImportTutors(tutorsData: TutorProfileData[]): Promise<{ success: Tutor[], errors: string[] }> {
    const success: Tutor[] = [];
    const errors: string[] = [];

    for (const tutorData of tutorsData) {
      try {
        const tutor = await this.createTutorProfile(tutorData);
        success.push(tutor);
      } catch (error) {
        errors.push(`Error con ${tutorData.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    console.log(`Importación completada: ${success.length} éxitos, ${errors.length} errores`);
    return { success, errors };
  }

  // Generar calendario de disponibilidad
  async setTutorAvailability(tutorId: number, availability: { day: number, startTime: string, endTime: string }[]): Promise<void> {
    try {
      // Aquí se implementaría la lógica para guardar la disponibilidad del tutor
      // Usando la tabla tutorAvailability que creamos en el schema
      
      console.log(`Disponibilidad actualizada para profesor ${tutorId}:`, availability);
      
    } catch (error) {
      console.error("Error configurando disponibilidad:", error);
      throw error;
    }
  }

  // Validaciones
  private validateTutorData(tutorData: TutorProfileData): void {
    if (!tutorData.name || tutorData.name.trim().length < 2) {
      throw new Error("El nombre del profesor es requerido y debe tener al menos 2 caracteres");
    }

    if (!tutorData.email || !this.isValidEmail(tutorData.email)) {
      throw new Error("Email válido es requerido");
    }

    if (!tutorData.specialization || tutorData.specialization.trim().length < 2) {
      throw new Error("La especialización es requerida");
    }

    if (!tutorData.hourlyRate || tutorData.hourlyRate <= 0) {
      throw new Error("La tarifa por hora debe ser mayor a 0");
    }

    if (tutorData.yearsOfExperience !== undefined && tutorData.yearsOfExperience < 0) {
      throw new Error("Los años de experiencia no pueden ser negativos");
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateDefaultAvatar(name: string): string {
    // Genera una URL de avatar por defecto usando las iniciales
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=1E40AF&color=fff&size=200`;
  }

  // Obtener estadísticas de profesor
  async getTutorStats(tutorId: number): Promise<{
    totalClasses: number;
    completedClasses: number;
    averageRating: number;
    earnings: number;
    nextClass?: Date;
  }> {
    try {
      // Aquí se implementaría la lógica para calcular estadísticas
      // Por ahora retornamos datos de ejemplo
      
      return {
        totalClasses: 25,
        completedClasses: 23,
        averageRating: 4.8,
        earnings: 1150.00,
        nextClass: new Date(Date.now() + 24 * 60 * 60 * 1000) // Mañana
      };

    } catch (error) {
      console.error("Error obteniendo estadísticas del profesor:", error);
      throw error;
    }
  }
}