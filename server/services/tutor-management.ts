import { type Tutor, type InsertTutor } from "@shared/schema";
import { storage } from "../storage";

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
  classType?: string;
  languageTaught?: string;
  isActive?: boolean;
}

export class TutorManagementService {
  async createTutorProfile(tutorData: TutorProfileData): Promise<Tutor> {
    this.validateTutorData(tutorData);

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
      classType: tutorData.classType || "adults",
      languageTaught: tutorData.languageTaught || "spanish",
      rating: "5.00",
      reviewCount: 0,
      isActive: true,
    };

    const tutor = await storage.createTutor(insertData);
    return tutor;
  }

  async updateTutorProfile(tutorId: number, updateData: Partial<TutorProfileData>): Promise<Tutor | undefined> {
    const existingTutor = await storage.getTutor(tutorId);
    if (!existingTutor) {
      throw new Error("Tutor not found");
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
    if (updateData.classType !== undefined) updateFields.classType = updateData.classType;
    if (updateData.languageTaught !== undefined) updateFields.languageTaught = updateData.languageTaught;
    if (updateData.isActive !== undefined) updateFields.isActive = updateData.isActive;

    if (Object.keys(updateFields).length === 0) return existingTutor;
    return await storage.updateTutor(tutorId, updateFields) || existingTutor;
  }

  async bulkImportTutors(tutorsData: TutorProfileData[]): Promise<{ success: Tutor[]; errors: string[] }> {
    const success: Tutor[] = [];
    const errors: string[] = [];

    for (const tutorData of tutorsData) {
      try {
        const tutor = await this.createTutorProfile(tutorData);
        success.push(tutor);
      } catch (error) {
        errors.push(`Error with ${tutorData.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return { success, errors };
  }

  async setTutorAvailability(tutorId: number, availability: { day: number; startTime: string; endTime: string }[]): Promise<void> {
    await storage.setTutorAvailability(
      tutorId,
      availability.map((a) => ({
        tutorId,
        dayOfWeek: a.day,
        startTime: a.startTime,
        endTime: a.endTime,
      }))
    );
  }

  async getTutorStats(tutorId: number) {
    const allClasses = await storage.getAllClasses();
    const tutorClasses = allClasses.filter((c) => c.tutorId === tutorId);
    const completed = tutorClasses.filter((c) => c.status === "completed");
    const tutor = await storage.getTutor(tutorId);

    const nextScheduled = tutorClasses
      .filter((c) => c.status === "scheduled" && new Date(c.scheduledAt) > new Date())
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

    return {
      totalClasses: tutorClasses.length,
      completedClasses: completed.length,
      averageRating: parseFloat(tutor?.rating || "5.0"),
      earnings: completed.reduce((sum, c) => sum + parseFloat(tutor?.hourlyRate || "25") * ((c.duration || 60) / 60), 0),
      nextClass: nextScheduled ? new Date(nextScheduled.scheduledAt) : undefined,
    };
  }

  private validateTutorData(tutorData: TutorProfileData): void {
    if (!tutorData.name || tutorData.name.trim().length < 2) throw new Error("Name is required");
    if (!tutorData.email || !this.isValidEmail(tutorData.email)) throw new Error("Valid email is required");
    if (!tutorData.specialization || tutorData.specialization.trim().length < 2) throw new Error("Specialization is required");
    if (!tutorData.hourlyRate || tutorData.hourlyRate <= 0) throw new Error("Hourly rate must be > 0");
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private generateDefaultAvatar(name: string): string {
    const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=1E40AF&color=fff&size=200`;
  }
}
