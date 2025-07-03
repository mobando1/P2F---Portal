import { TutorManagementService } from "./services/tutor-management";

// Datos reales de profesores de español
const realTutors = [
  {
    name: "María Elena González",
    email: "maria.gonzalez@passport2fluency.com",
    specialization: "Conversación Avanzada",
    bio: "Profesora nativa de español con 8 años de experiencia enseñando a estudiantes internacionales. Especializada en conversación avanzada y preparación para exámenes DELE.",
    phone: "+34 612 345 678",
    country: "España",
    timezone: "Europe/Madrid",
    certifications: ["DELE Examiner", "ELE Master", "Teaching Spanish as Foreign Language"],
    yearsOfExperience: 8,
    hourlyRate: 25,
    profileImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face"
  },
  {
    name: "Carlos Mendoza",
    email: "carlos.mendoza@passport2fluency.com",
    specialization: "Español de Negocios",
    bio: "Experto en español de negocios con experiencia en el sector financiero. Ayudo a profesionales a dominar el español corporativo y las presentaciones empresariales.",
    phone: "+52 55 1234 5678",
    country: "México",
    timezone: "America/Mexico_City",
    certifications: ["Business Spanish Certificate", "Corporate Training Specialist"],
    yearsOfExperience: 12,
    hourlyRate: 30,
    profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"
  },
  {
    name: "Ana Sofía Ruiz",
    email: "ana.ruiz@passport2fluency.com",
    specialization: "Principiantes y Niños",
    bio: "Especialista en enseñanza a principiantes y niños. Mi método dinámico y divertido hace que aprender español sea una aventura emocionante.",
    phone: "+57 1 234 5678",
    country: "Colombia",
    timezone: "America/Bogota",
    certifications: ["Child Language Teaching", "Elementary Spanish Education"],
    yearsOfExperience: 6,
    hourlyRate: 20,
    profileImage: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face"
  },
  {
    name: "Diego Vargas",
    email: "diego.vargas@passport2fluency.com",
    specialization: "Literatura y Cultura",
    bio: "Doctor en Literatura Hispanoamericana. Combino la enseñanza del idioma con el rico patrimonio cultural de América Latina y España.",
    phone: "+54 11 1234 5678",
    country: "Argentina",
    timezone: "America/Argentina/Buenos_Aires",
    certifications: ["PhD Literature", "Cultural Studies Certificate", "Advanced Spanish Grammar"],
    yearsOfExperience: 15,
    hourlyRate: 35,
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face"
  },
  {
    name: "Carmen Jiménez",
    email: "carmen.jimenez@passport2fluency.com",
    specialization: "Pronunciación y Fonética",
    bio: "Especialista en fonética española. Ayudo a estudiantes a perfeccionar su pronunciación y reducir su acento para sonar más naturales.",
    phone: "+34 678 901 234",
    country: "España",
    timezone: "Europe/Madrid",
    certifications: ["Spanish Phonetics Specialist", "Accent Reduction Coach"],
    yearsOfExperience: 10,
    hourlyRate: 28,
    profileImage: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&crop=face"
  },
  {
    name: "Roberto Fernández",
    email: "roberto.fernandez@passport2fluency.com",
    specialization: "Preparación DELE/SIELE",
    bio: "Examinador oficial DELE con más de 1000 estudiantes aprobados. Especializado en preparación intensiva para exámenes oficiales de español.",
    phone: "+34 654 321 987",
    country: "España",
    timezone: "Europe/Madrid",
    certifications: ["DELE Official Examiner", "SIELE Coordinator", "Exam Preparation Specialist"],
    yearsOfExperience: 14,
    hourlyRate: 32,
    profileImage: "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=400&h=400&fit=crop&crop=face"
  }
];

// Configuración de disponibilidad típica para profesores
const defaultAvailability = [
  { day: 1, startTime: "09:00", endTime: "13:00" }, // Lunes
  { day: 1, startTime: "15:00", endTime: "19:00" },
  { day: 2, startTime: "09:00", endTime: "13:00" }, // Martes
  { day: 2, startTime: "15:00", endTime: "19:00" },
  { day: 3, startTime: "09:00", endTime: "13:00" }, // Miércoles
  { day: 3, startTime: "15:00", endTime: "19:00" },
  { day: 4, startTime: "09:00", endTime: "13:00" }, // Jueves
  { day: 4, startTime: "15:00", endTime: "19:00" },
  { day: 5, startTime: "09:00", endTime: "13:00" }, // Viernes
  { day: 5, startTime: "15:00", endTime: "17:00" },
];

async function seedTutors() {
  console.log("🌱 Iniciando carga de profesores...");
  
  const tutorManagement = new TutorManagementService();
  
  try {
    const result = await tutorManagement.bulkImportTutors(realTutors);
    
    console.log(`✅ ${result.success.length} profesores creados exitosamente`);
    console.log(`❌ ${result.errors.length} errores encontrados`);
    
    if (result.errors.length > 0) {
      console.log("\nErrores:");
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    // Configurar disponibilidad para cada profesor creado
    console.log("\n📅 Configurando disponibilidades...");
    for (const tutor of result.success) {
      try {
        await tutorManagement.setTutorAvailability(tutor.id, defaultAvailability);
        console.log(`  ✅ Disponibilidad configurada para ${tutor.name}`);
      } catch (error) {
        console.log(`  ❌ Error configurando disponibilidad para ${tutor.name}:`, error);
      }
    }
    
    console.log("\n🎉 ¡Carga de profesores completada!");
    
  } catch (error) {
    console.error("❌ Error durante la carga de profesores:", error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedTutors().then(() => {
    console.log("Proceso completado");
    process.exit(0);
  }).catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}

export { seedTutors, realTutors };