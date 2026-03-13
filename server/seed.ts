import bcrypt from "bcryptjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import {
  users, tutors, classes, videos, subscriptions, userProgress, reviews,
} from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to seed the database");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function seed() {
  console.log("Seeding database...\n");

  const hashedPassword = await bcrypt.hash("password123", 12);

  // --- Admin User ---
  console.log("Creating admin user...");
  const adminPassword = await bcrypt.hash("admin123", 12);
  await db.insert(users).values({
    username: "admin_p2f",
    email: "admin@p2f.com",
    password: adminPassword,
    firstName: "Admin",
    lastName: "P2F",
    userType: "admin",
    trialCompleted: false,
    classCredits: 0,
  }).onConflictDoNothing({ target: users.email });

  // --- Users ---
  console.log("Creating test users...");
  const [user1] = await db.insert(users).values({
    username: "juan_sanchez",
    email: "juan.sanchez@example.com",
    password: hashedPassword,
    firstName: "Juan",
    lastName: "Sanchez",
    phone: "+1-555-0123",
    level: "B1",
    userType: "customer",
    trialCompleted: true,
    classCredits: 8,
  }).onConflictDoNothing({ target: users.email }).returning();

  const [user2] = await db.insert(users).values({
    username: "maria_rodriguez",
    email: "maria.rodriguez@example.com",
    password: hashedPassword,
    firstName: "Maria",
    lastName: "Rodriguez",
    phone: "+1-555-0124",
    level: "A2",
    userType: "customer",
    trialCompleted: true,
    classCredits: 12,
  }).onConflictDoNothing({ target: users.email }).returning();

  console.log(`  Created ${[user1, user2].filter(Boolean).length} users`);

  // --- Reviewer Users (for realistic reviews) ---
  console.log("Creating reviewer users...");
  const reviewerData = [
    { username: "sarah_m", email: "sarah.m@review.test", firstName: "Sarah", lastName: "Mitchell", avatar: "https://randomuser.me/api/portraits/women/12.jpg" },
    { username: "carlos_v", email: "carlos.v@review.test", firstName: "Carlos", lastName: "Vega", avatar: "https://randomuser.me/api/portraits/men/15.jpg" },
    { username: "emma_w", email: "emma.w@review.test", firstName: "Emma", lastName: "Wilson", avatar: "https://randomuser.me/api/portraits/women/23.jpg" },
    { username: "andres_g", email: "andres.g@review.test", firstName: "Andres", lastName: "Garcia", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
    { username: "jennifer_l", email: "jennifer.l@review.test", firstName: "Jennifer", lastName: "Lopez", avatar: "https://randomuser.me/api/portraits/women/45.jpg" },
    { username: "david_r", email: "david.r@review.test", firstName: "David", lastName: "Ramirez", avatar: "https://randomuser.me/api/portraits/men/22.jpg" },
    { username: "lisa_k", email: "lisa.k@review.test", firstName: "Lisa", lastName: "Kim", avatar: "https://randomuser.me/api/portraits/women/56.jpg" },
    { username: "roberto_m", email: "roberto.m@review.test", firstName: "Roberto", lastName: "Mendez", avatar: "https://randomuser.me/api/portraits/men/41.jpg" },
    { username: "ashley_t", email: "ashley.t@review.test", firstName: "Ashley", lastName: "Thompson", avatar: "https://randomuser.me/api/portraits/women/67.jpg" },
    { username: "miguel_s", email: "miguel.s@review.test", firstName: "Miguel", lastName: "Santos", avatar: "https://randomuser.me/api/portraits/men/53.jpg" },
    { username: "rachel_b", email: "rachel.b@review.test", firstName: "Rachel", lastName: "Brown", avatar: "https://randomuser.me/api/portraits/women/78.jpg" },
    { username: "pablo_h", email: "pablo.h@review.test", firstName: "Pablo", lastName: "Hernandez", avatar: "https://randomuser.me/api/portraits/men/67.jpg" },
    { username: "nicole_d", email: "nicole.d@review.test", firstName: "Nicole", lastName: "Davis", avatar: "https://randomuser.me/api/portraits/women/34.jpg" },
    { username: "fernando_c", email: "fernando.c@review.test", firstName: "Fernando", lastName: "Castro", avatar: "https://randomuser.me/api/portraits/men/78.jpg" },
    { username: "amanda_p", email: "amanda.p@review.test", firstName: "Amanda", lastName: "Price", avatar: "https://randomuser.me/api/portraits/women/89.jpg" },
    { username: "diana_f", email: "diana.f@review.test", firstName: "Diana", lastName: "Flores", avatar: "https://randomuser.me/api/portraits/women/15.jpg" },
    { username: "james_w", email: "james.w@review.test", firstName: "James", lastName: "Walker", avatar: "https://randomuser.me/api/portraits/men/88.jpg" },
    { username: "lucia_r", email: "lucia.r@review.test", firstName: "Lucia", lastName: "Rivera", avatar: "https://randomuser.me/api/portraits/women/42.jpg" },
    { username: "kevin_h", email: "kevin.h@review.test", firstName: "Kevin", lastName: "Hall", avatar: "https://randomuser.me/api/portraits/men/36.jpg" },
    { username: "valentina_o", email: "valentina.o@review.test", firstName: "Valentina", lastName: "Ortiz", avatar: "https://randomuser.me/api/portraits/women/51.jpg" },
  ];

  const createdReviewers: { id: number }[] = [];
  for (const r of reviewerData) {
    const [reviewer] = await db.insert(users).values({
      ...r,
      password: hashedPassword,
      level: "B1",
      userType: "customer",
      trialCompleted: true,
      classCredits: 0,
    }).onConflictDoNothing({ target: users.email }).returning();
    if (reviewer) createdReviewers.push(reviewer);
  }
  // If reviewers already exist, fetch them by email pattern
  if (createdReviewers.length === 0) {
    const allUsers = await db.select().from(users);
    const reviewerUsers = allUsers.filter(u => u.email.endsWith("@review.test"));
    createdReviewers.push(...reviewerUsers);
  }
  console.log(`  ${createdReviewers.length} reviewer users available`);

  // --- Tutors ---
  console.log("Creating tutors...");
  const tutorData = [
    {
      name: "Carolina Perilla",
      email: "carolsur191919@gmail.com",
      specialization: "Lead Instructor - Bilingual Education",
      specializationEs: "Instructora Principal - Educación Bilingüe",
      bio: "International Relations graduate with a Master's in English Teaching Methodology and 15+ years of experience. Specializes in bilingual education and cross-cultural communication.",
      bioEs: "Graduada en Relaciones Internacionales con Maestría en Metodología de Enseñanza de Inglés y más de 15 años de experiencia. Especialista en educación bilingüe y comunicación intercultural.",
      avatar: "/attached_assets/teachers/carolina-perilla.jpg",
      rating: "4.97",
      reviewCount: 178,
      hourlyRate: "35.00",
      classType: "adults",
      languageTaught: "spanish",
      country: "Colombia",
      timezone: "America/Bogota",
      languages: ["Spanish", "English", "French"],
      certifications: ["M.A. English Teaching Methodology", "Doctorate Student Educational Sciences"],
      yearsOfExperience: 15,
    },
    {
      name: "Evelyn Salcedo",
      email: "evelyn@passport2fluency.com",
      specialization: "Spanish Language Specialist - Cultural Connection",
      specializationEs: "Especialista en Español - Conexión Cultural",
      bio: "Passionate about languages and connecting people across cultures. 5+ years of experience teaching Spanish and English.",
      bioEs: "Apasionada por los idiomas y por conectar personas entre culturas. Más de 5 años de experiencia enseñando español e inglés.",
      avatar: "/attached_assets/teachers/evelyn-salcedo.jpg",
      rating: "4.93",
      reviewCount: 124,
      hourlyRate: "30.00",
      classType: "adults",
      languageTaught: "spanish",
      country: "Venezuela",
      timezone: "America/Caracas",
      languages: ["Spanish", "English"],
      certifications: ["Cultural Connection Expert", "Natural Language Learning Specialist"],
      yearsOfExperience: 5,
    },
    {
      name: "Diego Felipe Rodriguez Martinez",
      email: "coach@passport2fluency.com",
      specialization: "Spanish Instructor & Education Specialist",
      specializationEs: "Instructor de Español y Especialista en Educación",
      bio: "Physical Education professor with a Master's in Physical Culture Pedagogy. Expert in creating engaging, active learning environments.",
      bioEs: "Profesor de Educación Física con Maestría en Pedagogía de Cultura Física. Experto en crear ambientes de aprendizaje dinámicos y participativos.",
      avatar: "/attached_assets/teachers/diego-felipe-rodriguez.jpg",
      rating: "4.91",
      reviewCount: 203,
      hourlyRate: "32.00",
      classType: "adults",
      languageTaught: "spanish",
      phone: "(210) 201-4490",
      country: "Colombia",
      timezone: "America/Bogota",
      languages: ["Spanish", "English"],
      certifications: ["M.A. Physical Culture Pedagogy", "PhD Student in Education"],
      yearsOfExperience: 8,
    },
    {
      name: "Gloria Cardona",
      email: "gloria@passport2fluency.com",
      specialization: "Children's Specialist - Kids Spanish Expert",
      specializationEs: "Especialista en Niños - Experta en Español Infantil",
      bio: "Elementary education specialist with 8+ years making Spanish fun for kids.",
      bioEs: "Especialista en educación primaria con más de 8 años haciendo que el español sea divertido para los niños.",
      avatar: "/attached_assets/teachers/gloria-cardona.jpg",
      rating: "4.95",
      reviewCount: 167,
      hourlyRate: "28.00",
      classType: "kids",
      languageTaught: "spanish",
      phone: "(312) 312-1826",
      country: "Colombia",
      timezone: "America/Bogota",
      languages: ["Spanish", "English"],
      certifications: ["Elementary Education Specialist", "Kids Spanish Expert"],
      yearsOfExperience: 8,
    },
    {
      name: "Johanna Pacheco",
      email: "johanna@passport2fluency.com",
      specialization: "Cultural Immersion Expert - Anthropology",
      specializationEs: "Experta en Inmersión Cultural - Antropología",
      bio: "Anthropology graduate specializing in Colombian and Latin American culture. Helps students understand regional dialects and cultural nuances.",
      bioEs: "Graduada en Antropología especializada en cultura colombiana y latinoamericana. Ayuda a los estudiantes a comprender dialectos regionales y matices culturales.",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
      rating: "4.92",
      reviewCount: 96,
      hourlyRate: "30.00",
      classType: "adults",
      languageTaught: "spanish",
      country: "Colombia",
      timezone: "America/Bogota",
      languages: ["Spanish", "English"],
      certifications: ["B.A. Anthropology Universidad Nacional", "Cultural Immersion Expert"],
      yearsOfExperience: 6,
    },
  ];

  const createdTutors = [];
  for (const t of tutorData) {
    const [tutor] = await db.insert(tutors).values(t).onConflictDoNothing({ target: tutors.email }).returning();
    if (tutor) createdTutors.push(tutor);
  }
  // If tutors already exist, fetch them
  if (createdTutors.length === 0) {
    const existingTutors = await db.select().from(tutors);
    createdTutors.push(...existingTutors);
  }
  console.log(`  ${createdTutors.length} tutors available`);

  // --- Reviews ---
  if (createdTutors.length > 0 && createdReviewers.length > 0) {
    console.log("Creating reviews...");

    // Review templates - mix of Spanish/English, varied lengths
    const reviewComments = [
      // Long reviews
      "Carolina is an incredible teacher. She makes every lesson engaging and adapts to your pace perfectly. After 3 months I went from barely being able to order food to having full conversations. Highly recommend!",
      "Excelente profesora! Me encanta su metodo de enseñanza. Siempre prepara material interesante y relevante. He mejorado muchisimo mi pronunciacion y confianza para hablar en publico.",
      "I've tried several tutors on different platforms and this has been the best experience by far. The classes are well-structured, fun, and I actually look forward to them every week.",
      "Mi hijo ha avanzado muchisimo gracias a estas clases. La profesora tiene una paciencia increible con los niños y sabe como mantenerlos motivados durante toda la leccion.",
      "The cultural context she provides alongside the language is what sets these lessons apart. I don't just learn words, I learn how and when to use them naturally. Worth every penny.",
      "Despues de 6 meses de clases puedo mantener conversaciones fluidas con mis colegas hispanohablantes. El metodo es muy practico y orientado a situaciones reales del dia a dia.",
      "Best investment I've made in my career. My boss noticed the improvement in my Spanish within the first month. The business Spanish focus is exactly what I needed for client meetings.",
      "Las clases son super dinamicas. Nunca me aburro porque siempre hay actividades diferentes. Mi parte favorita son las conversaciones sobre cultura latinoamericana.",

      // Medium reviews
      "Great teacher, very patient and professional. My Spanish has improved a lot in just 2 months.",
      "Excelente clase, muy bien preparada. Siempre puntual y con material relevante.",
      "Really enjoying the lessons. The pronunciation practice has been especially helpful.",
      "Muy buena profesora. Me gusta que corrige mis errores de forma amable y constructiva.",
      "Perfect for beginners. She explains grammar in a way that actually makes sense.",
      "Las clases de conversacion son lo mejor. Me siento mucho mas seguro hablando español.",
      "Highly recommend for anyone wanting to learn Spanish. Very organized and effective teaching method.",
      "Mi hijo adora las clases! Siempre sale contento y practicando lo que aprendio.",
      "The class structure is excellent. Good balance between grammar, conversation, and vocabulary.",
      "Muy profesional y dedicada. Se nota que le apasiona la enseñanza.",
      "I appreciate how she customizes lessons to my specific goals. Very attentive teacher.",
      "Fantastica experiencia. Cada clase se siente productiva y aprendo algo nuevo.",

      // Short reviews
      "Excellent teacher!",
      "Muy buena profe, la recomiendo.",
      "Great classes, very professional.",
      "Excelente, 100% recomendada.",
      "Love the lessons!",
      "Muy paciente y dedicada.",
      "Best Spanish tutor I've had.",
      "Clases muy entretenidas y utiles.",
      "Highly recommended!",
      "Super buena onda y profesional.",
      "Amazing progress in just weeks.",
      "Mi profe favorita!",
      "Really effective teaching style.",
      "Siempre preparada y puntual.",
      "Can't recommend enough!",
    ];

    const now = new Date();
    let reviewCount = 0;

    // Distribute reviews across tutors with varied counts
    const reviewsPerTutor = [28, 24, 32, 26, 20]; // Carolina, Evelyn, Diego, Gloria, Johanna

    for (let ti = 0; ti < createdTutors.length; ti++) {
      const tutor = createdTutors[ti];
      const numReviews = reviewsPerTutor[ti] || 22;

      for (let ri = 0; ri < numReviews; ri++) {
        // Pick a random reviewer (cycling through to avoid duplicate constraint)
        const reviewer = createdReviewers[ri % createdReviewers.length];

        // Ratings: mostly 5, some 4, rarely no comment
        const ratingRoll = Math.random();
        const rating = ratingRoll < 0.65 ? 5 : ratingRoll < 0.92 ? 4 : 5;

        // Some reviews have no comment (rating only) ~15%
        const hasComment = Math.random() > 0.15;
        const commentIdx = (ti * 7 + ri) % reviewComments.length;
        const comment = hasComment ? reviewComments[commentIdx] : null;

        // Spread dates over last 6 months
        const daysAgo = Math.floor(Math.random() * 180) + 1;
        const reviewDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

        try {
          await db.insert(reviews).values({
            userId: reviewer.id,
            tutorId: tutor.id,
            rating,
            comment,
            createdAt: reviewDate,
          }).onConflictDoNothing();
          reviewCount++;
        } catch {
          // Skip duplicates (same user+tutor)
        }
      }
    }
    console.log(`  Created ${reviewCount} reviews`);
  }

  // --- Videos ---
  console.log("Creating sample videos...");
  const videoData = [
    { title: "Spanish Grammar Basics", description: "Master the fundamentals of Spanish grammar", instructor: "Prof. Ana Garcia", level: "Beginner", duration: "24:15", thumbnailUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop", videoUrl: "https://example.com/video1.mp4", category: "Grammar" },
    { title: "Conversation Techniques", description: "Improve your speaking confidence", instructor: "Prof. Carlos Mendez", level: "Intermediate", duration: "18:42", thumbnailUrl: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=600&h=400&fit=crop", videoUrl: "https://example.com/video2.mp4", category: "Speaking" },
    { title: "Business Spanish", description: "Professional Spanish for the workplace", instructor: "Prof. Isabella Torres", level: "Advanced", duration: "32:08", thumbnailUrl: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=600&h=400&fit=crop", videoUrl: "https://example.com/video3.mp4", category: "Business" },
    { title: "Pronunciation Mastery", description: "Perfect your Spanish accent", instructor: "Prof. Miguel Ruiz", level: "All Levels", duration: "15:30", thumbnailUrl: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=600&h=400&fit=crop", videoUrl: "https://example.com/video4.mp4", category: "Pronunciation" },
    { title: "Cultural Insights", description: "Understanding Hispanic cultures", instructor: "Prof. Sofia Vargas", level: "Intermediate", duration: "21:45", thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop", videoUrl: "https://example.com/video5.mp4", category: "Culture" },
    { title: "Advanced Writing", description: "Master complex writing structures", instructor: "Prof. Eduardo Morales", level: "Advanced", duration: "28:12", thumbnailUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop", videoUrl: "https://example.com/video6.mp4", category: "Writing" },
  ];

  const insertedVideos = await db.insert(videos).values(videoData).onConflictDoNothing().returning();
  console.log(`  Created ${insertedVideos.length} videos`);

  // --- User Progress ---
  if (user1) {
    console.log("Creating user progress...");
    await db.insert(userProgress).values({
      userId: user1.id,
      classesCompleted: 8,
      learningHours: "24.50",
      currentStreak: 5,
      totalVideosWatched: 12,
    }).onConflictDoNothing();
  }

  // --- Sample Classes ---
  if (user1 && createdTutors.length > 0) {
    console.log("Creating sample classes...");
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeek2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    await db.insert(classes).values([
      {
        userId: user1.id,
        tutorId: createdTutors[0].id,
        title: "Conversation Practice",
        description: "Practice conversational Spanish",
        scheduledAt: nextWeek,
        duration: 60,
        status: "scheduled",
        meetingLink: `https://meet.jit.si/P2F-${createdTutors[0].name.replace(/\s+/g, '-')}-${Date.now()}`,
      },
      {
        userId: user1.id,
        tutorId: createdTutors.length > 2 ? createdTutors[2].id : createdTutors[0].id,
        title: "Business Spanish",
        description: "Professional Spanish for work",
        scheduledAt: nextWeek2,
        duration: 60,
        status: "scheduled",
        meetingLink: `https://meet.jit.si/P2F-${(createdTutors[2] || createdTutors[0]).name.replace(/\s+/g, '-')}-${Date.now() + 1}`,
      },
    ]).onConflictDoNothing();
    console.log("  Created 2 sample classes");
  }

  console.log("\nSeed completed successfully!");
  await pool.end();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
