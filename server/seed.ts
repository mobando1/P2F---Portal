import bcrypt from "bcryptjs";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  users, tutors, classes, videos, subscriptions, userProgress, reviews,
  learningPathStations, learningPathContent, levelProgressionRules,
} from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to seed the database");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool);

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

  // --- Learning Path Stations & Content (Real P2F Program — 57 Modules) ---
  console.log("\nCreating learning path stations...");

  // ====== A1 — Principiante: Módulos 1-11 ======
  const a1Stations = await db.insert(learningPathStations).values([
    { level: "A1", stationOrder: 1, title: "Who Are You?", titleEs: "¿Quién eres tú?", description: "Introductions, greetings, and basic personal info", descriptionEs: "Presentaciones, saludos e información personal básica", stationType: "lesson", requiredToAdvance: true },
    { level: "A1", stationOrder: 2, title: "Ser and Estar", titleEs: "Ser y Estar", description: "The two verbs 'to be' in Spanish", descriptionEs: "Los dos verbos 'ser' y 'estar'", stationType: "lesson", requiredToAdvance: true },
    { level: "A1", stationOrder: 3, title: "What Do You Do?", titleEs: "¿A qué te dedicas?", description: "Jobs, professions, and occupations", descriptionEs: "Trabajos, profesiones y ocupaciones", stationType: "lesson", requiredToAdvance: true },
    { level: "A1", stationOrder: 4, title: "Basic Expressions & Food Vocabulary", titleEs: "Expresiones Básicas y Vocabulario de Alimentos", description: "Everyday expressions and food words", descriptionEs: "Expresiones cotidianas y vocabulario de alimentos", stationType: "lesson", requiredToAdvance: true },
    { level: "A1", stationOrder: 5, title: "Test: Masculine & Feminine", titleEs: "Test: Femenino y Masculino en el Español", description: "Test covering modules 1-5", descriptionEs: "Prueba de los módulos 1-5", stationType: "quiz", requiredToAdvance: true },
    { level: "A1", stationOrder: 6, title: "Where Do You Live?", titleEs: "¿En Dónde Vives?", description: "Housing, rooms, and neighborhoods", descriptionEs: "Vivienda, habitaciones y vecindarios", stationType: "lesson", requiredToAdvance: true },
    { level: "A1", stationOrder: 7, title: "Basic Conjugations", titleEs: "Conjugaciones Básicas", description: "Present tense of regular verbs", descriptionEs: "Presente de verbos regulares", stationType: "lesson", requiredToAdvance: true },
    { level: "A1", stationOrder: 8, title: "I Like...", titleEs: "A Mí Me Gusta…", description: "Expressing likes and dislikes with gustar", descriptionEs: "Expresar gustos con el verbo gustar", stationType: "lesson", requiredToAdvance: true },
    { level: "A1", stationOrder: 9, title: "Basic Conversations & Welcome", titleEs: "Conversaciones Básicas y Bienvenida", description: "Simple dialogues and welcoming phrases", descriptionEs: "Diálogos simples y frases de bienvenida", stationType: "lesson", requiredToAdvance: true },
    { level: "A1", stationOrder: 10, title: "Test: My City & My Country", titleEs: "Test: Mi Ciudad y Mi País", description: "Test covering modules 6-10", descriptionEs: "Prueba de los módulos 6-10", stationType: "quiz", requiredToAdvance: true },
    { level: "A1", stationOrder: 11, title: "Work & Basic Professional Life", titleEs: "Trabajo y Vida Profesional Básico", description: "Workplace vocabulary and simple work conversations", descriptionEs: "Vocabulario laboral y conversaciones simples de trabajo", stationType: "lesson", requiredToAdvance: true },
    { level: "A1", stationOrder: 12, title: "A1 Complete!", titleEs: "¡A1 Completado!", description: "You finished the beginner level!", descriptionEs: "¡Terminaste el nivel principiante!", stationType: "milestone", requiredToAdvance: false },
  ]).returning();
  console.log(`  Created ${a1Stations.length} A1 stations`);

  // ====== A2 — Elemental: Módulos 12-25 ======
  const a2Stations = await db.insert(learningPathStations).values([
    { level: "A2", stationOrder: 1, title: "Hobbies & Free Time", titleEs: "Pasatiempos y Tiempo Libre", description: "Leisure activities and frequency expressions", descriptionEs: "Actividades de ocio y expresiones de frecuencia", stationType: "lesson", requiredToAdvance: true },
    { level: "A2", stationOrder: 2, title: "Food & Restaurants", titleEs: "Comidas y Restaurantes", description: "Ordering food and restaurant vocabulary", descriptionEs: "Pedir comida y vocabulario de restaurantes", stationType: "lesson", requiredToAdvance: true },
    { level: "A2", stationOrder: 3, title: "Ser & Estar — Part 2", titleEs: "Ser y Estar – Segunda Parte", description: "Advanced uses of ser and estar", descriptionEs: "Usos avanzados de ser y estar", stationType: "lesson", requiredToAdvance: true },
    { level: "A2", stationOrder: 4, title: "Test: Ser & Estar Part 3", titleEs: "Test: Ser y Estar – Tercera Parte", description: "Test covering modules 12-15", descriptionEs: "Prueba de los módulos 12-15", stationType: "quiz", requiredToAdvance: true },
    { level: "A2", stationOrder: 5, title: "A Day in Pilar's Life", titleEs: "Un Día en la Vida de Pilar", description: "Daily routines through storytelling", descriptionEs: "Rutinas diarias a través de una historia", stationType: "lesson", requiredToAdvance: true },
    { level: "A2", stationOrder: 6, title: "That's How I Like It", titleEs: "Así Me Gusta", description: "Preferences and opinions", descriptionEs: "Preferencias y opiniones", stationType: "lesson", requiredToAdvance: true },
    { level: "A2", stationOrder: 7, title: "Alejandro's Daily Routine", titleEs: "Alejandro y la Rutina Diaria", description: "Reflexive verbs and daily activities", descriptionEs: "Verbos reflexivos y actividades diarias", stationType: "lesson", requiredToAdvance: true },
    { level: "A2", stationOrder: 8, title: "I Stay Home", titleEs: "Me Quedo en Casa", description: "Home activities and staying in", descriptionEs: "Actividades en casa", stationType: "lesson", requiredToAdvance: true },
    { level: "A2", stationOrder: 9, title: "Test: Love", titleEs: "Test: El Amor", description: "Test covering modules 16-20", descriptionEs: "Prueba de los módulos 16-20", stationType: "quiz", requiredToAdvance: true },
    { level: "A2", stationOrder: 10, title: "My Favorite Superhero", titleEs: "Mi Súper Héroe Favorito", description: "Descriptions and comparisons", descriptionEs: "Descripciones y comparaciones", stationType: "lesson", requiredToAdvance: true },
    { level: "A2", stationOrder: 11, title: "Visit to the Zoo", titleEs: "Visita al Zoológico", description: "Animal vocabulary and descriptions", descriptionEs: "Vocabulario de animales y descripciones", stationType: "lesson", requiredToAdvance: true },
    { level: "A2", stationOrder: 12, title: "A Walk Through Cali's Zoo", titleEs: "Un Paseo por el Zoológico de Cali", description: "Colombian culture and geography", descriptionEs: "Cultura y geografía colombiana", stationType: "lesson", requiredToAdvance: true },
    { level: "A2", stationOrder: 13, title: "My Pets", titleEs: "Mis Mascotas", description: "Talking about pets and pet care", descriptionEs: "Hablar sobre mascotas y su cuidado", stationType: "lesson", requiredToAdvance: true },
    { level: "A2", stationOrder: 14, title: "Test: How to Care for Your Pets", titleEs: "Test: Cómo Cuidar de tus Mascotas", description: "Test covering modules 21-25", descriptionEs: "Prueba de los módulos 21-25", stationType: "quiz", requiredToAdvance: true },
    { level: "A2", stationOrder: 15, title: "A2 Complete!", titleEs: "¡A2 Completado!", description: "You finished the elementary level!", descriptionEs: "¡Terminaste el nivel elemental!", stationType: "milestone", requiredToAdvance: false },
  ]).returning();
  console.log(`  Created ${a2Stations.length} A2 stations`);

  // ====== B1 — Intermedio: Módulos 26-40 ======
  const b1Stations = await db.insert(learningPathStations).values([
    { level: "B1", stationOrder: 1, title: "An Unforgettable Dinner", titleEs: "Una Cena Inolvidable", description: "Restaurant conversations and past tense narration", descriptionEs: "Conversaciones en restaurantes y narración en pasado", stationType: "lesson", requiredToAdvance: true },
    { level: "B1", stationOrder: 2, title: "Let's Go to the Supermarket", titleEs: "Vamos al Supermercado", description: "Shopping vocabulary and quantities", descriptionEs: "Vocabulario de compras y cantidades", stationType: "lesson", requiredToAdvance: true },
    { level: "B1", stationOrder: 3, title: "Saber and Conocer", titleEs: "Saber y Conocer", description: "The two verbs 'to know' in Spanish", descriptionEs: "Los dos verbos para 'saber' y 'conocer'", stationType: "lesson", requiredToAdvance: true },
    { level: "B1", stationOrder: 4, title: "Phone Conversations", titleEs: "Conversaciones Telefónicas", description: "Making and receiving phone calls", descriptionEs: "Hacer y recibir llamadas telefónicas", stationType: "lesson", requiredToAdvance: true },
    { level: "B1", stationOrder: 5, title: "Test: Visit to the Botero Museum", titleEs: "Test: Una visita al museo Botero", description: "Test covering modules 26-30", descriptionEs: "Prueba de los módulos 26-30", stationType: "quiz", requiredToAdvance: true },
    { level: "B1", stationOrder: 6, title: "Where Are We Going?", titleEs: "¿A dónde vamos?", description: "Directions and transportation", descriptionEs: "Direcciones y transporte", stationType: "lesson", requiredToAdvance: true },
    { level: "B1", stationOrder: 7, title: "Numbers 1 - 100", titleEs: "Números de 1 - 100", description: "Complete number system and math expressions", descriptionEs: "Sistema numérico completo y expresiones matemáticas", stationType: "lesson", requiredToAdvance: true },
    { level: "B1", stationOrder: 8, title: "A Healthy Life", titleEs: "Una Vida Saludable", description: "Health, exercise, and wellness vocabulary", descriptionEs: "Vocabulario de salud, ejercicio y bienestar", stationType: "lesson", requiredToAdvance: true },
    { level: "B1", stationOrder: 9, title: "What Should I Wear?", titleEs: "¿Qué me pongo?", description: "Clothing and fashion vocabulary", descriptionEs: "Vocabulario de ropa y moda", stationType: "lesson", requiredToAdvance: true },
    { level: "B1", stationOrder: 10, title: "Test: Shopping at the Mall", titleEs: "Test: De compras en el centro comercial", description: "Test covering modules 31-35", descriptionEs: "Prueba de los módulos 31-35", stationType: "quiz", requiredToAdvance: true },
    { level: "B1", stationOrder: 11, title: "We Went on a Trip", titleEs: "Nos fuimos de viaje", description: "Travel narration in the past tense", descriptionEs: "Narración de viajes en pasado", stationType: "lesson", requiredToAdvance: true },
    { level: "B1", stationOrder: 12, title: "The World of Work", titleEs: "El Mundo del Trabajo", description: "Professional life and job interviews", descriptionEs: "Vida profesional y entrevistas de trabajo", stationType: "lesson", requiredToAdvance: true },
    { level: "B1", stationOrder: 13, title: "The World of Entertainment", titleEs: "El mundo del espectáculo", description: "Entertainment, media, and cultural events", descriptionEs: "Entretenimiento, medios y eventos culturales", stationType: "lesson", requiredToAdvance: true },
    { level: "B1", stationOrder: 14, title: "The Environment", titleEs: "El Medio Ambiente", description: "Environmental vocabulary and discussions", descriptionEs: "Vocabulario medioambiental y discusiones", stationType: "lesson", requiredToAdvance: true },
    { level: "B1", stationOrder: 15, title: "Test: Once Upon a Time", titleEs: "Test: Érase una vez", description: "Test covering modules 36-40", descriptionEs: "Prueba de los módulos 36-40", stationType: "quiz", requiredToAdvance: true },
    { level: "B1", stationOrder: 16, title: "B1 Complete!", titleEs: "¡B1 Completado!", description: "You finished the intermediate level!", descriptionEs: "¡Terminaste el nivel intermedio!", stationType: "milestone", requiredToAdvance: false },
  ]).returning();
  console.log(`  Created ${b1Stations.length} B1 stations`);

  // ====== B2 — Intermedio Alto: Módulos 41-57 ======
  const b2Stations = await db.insert(learningPathStations).values([
    { level: "B2", stationOrder: 1, title: "The Weather", titleEs: "El tiempo", description: "Weather expressions and climate discussions", descriptionEs: "Expresiones del clima y discusiones climáticas", stationType: "lesson", requiredToAdvance: true },
    { level: "B2", stationOrder: 2, title: "Culture & Literature", titleEs: "Un paseo por la cultura y la literatura", description: "Latin American culture and literary works", descriptionEs: "Cultura y obras literarias latinoamericanas", stationType: "lesson", requiredToAdvance: true },
    { level: "B2", stationOrder: 3, title: "Childhood Memories", titleEs: "Recuerdos de mi infancia", description: "Imperfect tense and nostalgic narration", descriptionEs: "Pretérito imperfecto y narración nostálgica", stationType: "lesson", requiredToAdvance: true },
    { level: "B2", stationOrder: 4, title: "Let's Travel by Plane", titleEs: "Viajemos en avión", description: "Airport vocabulary and travel planning", descriptionEs: "Vocabulario de aeropuerto y planificación de viajes", stationType: "lesson", requiredToAdvance: true },
    { level: "B2", stationOrder: 5, title: "Test: An Adventure in Spain", titleEs: "Test: Una Aventura en España", description: "Test covering modules 41-45", descriptionEs: "Prueba de los módulos 41-45", stationType: "quiz", requiredToAdvance: true },
    { level: "B2", stationOrder: 6, title: "An Adventure in Barcelona", titleEs: "Una Aventura por Barcelona", description: "Spanish cities and cultural exploration", descriptionEs: "Ciudades españolas y exploración cultural", stationType: "lesson", requiredToAdvance: true },
    { level: "B2", stationOrder: 7, title: "Let's Visit Argentina", titleEs: "Visitemos Argentina", description: "Argentine culture and regional expressions", descriptionEs: "Cultura argentina y expresiones regionales", stationType: "lesson", requiredToAdvance: true },
    { level: "B2", stationOrder: 8, title: "The 1940s", titleEs: "Los años 40", description: "Historical narration and past tenses", descriptionEs: "Narración histórica y tiempos pasados", stationType: "lesson", requiredToAdvance: true },
    { level: "B2", stationOrder: 9, title: "Test: Beautiful Mexico", titleEs: "Test: México lindo y querido", description: "Test covering modules 46-50", descriptionEs: "Prueba de los módulos 46-50", stationType: "quiz", requiredToAdvance: true },
    { level: "B2", stationOrder: 10, title: "Galápagos Islands", titleEs: "Islas Galápagos", description: "Nature, ecology, and Ecuadorian culture", descriptionEs: "Naturaleza, ecología y cultura ecuatoriana", stationType: "lesson", requiredToAdvance: true },
    { level: "B2", stationOrder: 11, title: "The 1980s", titleEs: "Los años 80", description: "Pop culture and historical comparisons", descriptionEs: "Cultura pop y comparaciones históricas", stationType: "lesson", requiredToAdvance: true },
    { level: "B2", stationOrder: 12, title: "Panama", titleEs: "Panamá", description: "Panamanian culture and the Canal", descriptionEs: "Cultura panameña y el Canal", stationType: "lesson", requiredToAdvance: true },
    { level: "B2", stationOrder: 13, title: "Let's Go to the Doctor", titleEs: "Vamos al doctor", description: "Medical vocabulary and health conversations", descriptionEs: "Vocabulario médico y conversaciones de salud", stationType: "lesson", requiredToAdvance: true },
    { level: "B2", stationOrder: 14, title: "Test: Hospital Specialties", titleEs: "Test: Especialidades en el hospital", description: "Test covering modules 51-55", descriptionEs: "Prueba de los módulos 51-55", stationType: "quiz", requiredToAdvance: true },
    { level: "B2", stationOrder: 15, title: "Reading Comprehension: A Rainy Day", titleEs: "Comprensión de lectura: un día lluvioso", description: "Advanced reading and comprehension skills", descriptionEs: "Lectura avanzada y comprensión lectora", stationType: "lesson", requiredToAdvance: true },
    { level: "B2", stationOrder: 16, title: "Final Module", titleEs: "Módulo Final", description: "Final review and celebration", descriptionEs: "Repaso final y celebración", stationType: "lesson", requiredToAdvance: true },
    { level: "B2", stationOrder: 17, title: "B2 Complete!", titleEs: "¡B2 Completado!", description: "You finished the upper-intermediate level!", descriptionEs: "¡Terminaste el nivel intermedio alto!", stationType: "milestone", requiredToAdvance: false },
  ]).returning();
  console.log(`  Created ${b2Stations.length} B2 stations`);

  // ====== QUIZ CONTENT for TEST stations ======
  console.log("Creating quiz content for test stations...");

  // A1 Test — Module 5: Masculine & Feminine (a1Stations[4])
  await db.insert(learningPathContent).values([{
    stationId: a1Stations[4].id,
    contentType: "quiz",
    title: "Test: Masculine & Feminine in Spanish",
    titleEs: "Test: Femenino y Masculino en el Español",
    durationMinutes: 15,
    sortOrder: 1,
    contentData: {
      passingScore: 70,
      questions: [
        { type: "multiple_choice", question: "What is the feminine form of 'el profesor'?", questionEs: "¿Cuál es la forma femenina de 'el profesor'?", options: ["La profesora", "La profesore", "La profesor", "La profesoria"], optionsEs: ["La profesora", "La profesore", "La profesor", "La profesoria"], correctAnswer: 0, points: 1 },
        { type: "multiple_choice", question: "Which article goes with 'mesa'?", questionEs: "¿Qué artículo va con 'mesa'?", options: ["El", "La", "Los", "Un"], optionsEs: ["El", "La", "Los", "Un"], correctAnswer: 1, points: 1 },
        { type: "true_false", question: "'El agua' is feminine despite using 'el'", questionEs: "'El agua' es femenino a pesar de usar 'el'", options: ["True", "False"], optionsEs: ["Verdadero", "Falso"], correctAnswer: 0, points: 1 },
        { type: "fill_blank", question: "The plural of 'el libro' is '_____ libros'", questionEs: "El plural de 'el libro' es '_____ libros'", correctAnswer: "los", points: 1 },
        { type: "multiple_choice", question: "How do you say 'Good morning' in Spanish?", questionEs: "¿Cómo se dice 'Good morning' en español?", options: ["Buenas noches", "Buenos días", "Buenas tardes", "Buen día"], optionsEs: ["Buenas noches", "Buenos días", "Buenas tardes", "Buen día"], correctAnswer: 1, points: 1 },
        { type: "multiple_choice", question: "Which word is masculine?", questionEs: "¿Cuál palabra es masculina?", options: ["Casa", "Silla", "Carro", "Puerta"], optionsEs: ["Casa", "Silla", "Carro", "Puerta"], correctAnswer: 2, points: 1 },
      ],
    },
  }]);

  // A1 Test — Module 10: My City & Country (a1Stations[9])
  await db.insert(learningPathContent).values([{
    stationId: a1Stations[9].id,
    contentType: "quiz",
    title: "Test: My City & My Country",
    titleEs: "Test: Mi Ciudad y Mi País",
    durationMinutes: 15,
    sortOrder: 1,
    contentData: {
      passingScore: 70,
      questions: [
        { type: "multiple_choice", question: "How do you say 'I live in the city' in Spanish?", questionEs: "¿Cómo se dice 'I live in the city'?", options: ["Vivo en la ciudad", "Vive en la ciudad", "Vivir en la ciudad", "Vivimos en la ciudad"], optionsEs: ["Vivo en la ciudad", "Vive en la ciudad", "Vivir en la ciudad", "Vivimos en la ciudad"], correctAnswer: 0, points: 1 },
        { type: "fill_blank", question: "Yo _____ en un apartamento. (vivir)", questionEs: "Yo _____ en un apartamento. (vivir)", correctAnswer: "vivo", points: 1 },
        { type: "multiple_choice", question: "What does 'Me gusta mi barrio' mean?", questionEs: "¿Qué significa 'Me gusta mi barrio'?", options: ["I like my bar", "I like my neighborhood", "I like my barrier", "I go to my bar"], optionsEs: ["Me gusta mi bar", "Me gusta mi barrio", "Me gusta mi barrera", "Voy a mi bar"], correctAnswer: 1, points: 1 },
        { type: "true_false", question: "'Estar' is used for permanent states like nationality", questionEs: "'Estar' se usa para estados permanentes como la nacionalidad", options: ["True", "False"], optionsEs: ["Verdadero", "Falso"], correctAnswer: 1, points: 1 },
        { type: "multiple_choice", question: "Choose the correct conjugation: 'Ella _____ de Colombia' (ser)", questionEs: "Elige la conjugación correcta: 'Ella _____ de Colombia' (ser)", options: ["soy", "eres", "es", "somos"], optionsEs: ["soy", "eres", "es", "somos"], correctAnswer: 2, points: 1 },
        { type: "fill_blank", question: "¿_____ te llamas? (What)", questionEs: "¿_____ te llamas?", correctAnswer: "Cómo", points: 1 },
      ],
    },
  }]);

  // A2 Test — Module 15: Ser & Estar Part 3 (a2Stations[3])
  await db.insert(learningPathContent).values([{
    stationId: a2Stations[3].id,
    contentType: "quiz",
    title: "Test: Ser & Estar — Part 3",
    titleEs: "Test: Ser y Estar – Tercera Parte",
    durationMinutes: 15,
    sortOrder: 1,
    contentData: {
      passingScore: 70,
      questions: [
        { type: "multiple_choice", question: "'La sopa _____ caliente' — which verb?", questionEs: "'La sopa _____ caliente' — ¿cuál verbo?", options: ["es", "está", "ser", "son"], optionsEs: ["es", "está", "ser", "son"], correctAnswer: 1, points: 1 },
        { type: "multiple_choice", question: "'Mi hermana _____ doctora' — which verb?", questionEs: "'Mi hermana _____ doctora' — ¿cuál verbo?", options: ["está", "es", "estar", "están"], optionsEs: ["está", "es", "estar", "están"], correctAnswer: 1, points: 1 },
        { type: "true_false", question: "'Estoy aburrido' means 'I am boring'", questionEs: "'Estoy aburrido' significa 'Soy aburrido'", options: ["True", "False"], optionsEs: ["Verdadero", "Falso"], correctAnswer: 1, points: 1, explanation: "'Estoy aburrido' = I am bored. 'Soy aburrido' = I am boring.", explanationEs: "'Estoy aburrido' = estado temporal. 'Soy aburrido' = característica permanente." },
        { type: "fill_blank", question: "La fiesta _____ en mi casa. (to be located)", questionEs: "La fiesta _____ en mi casa. (ubicación)", correctAnswer: "es", points: 1 },
        { type: "multiple_choice", question: "Which sentence uses 'estar' correctly?", questionEs: "¿Cuál oración usa 'estar' correctamente?", options: ["Ella está colombiana", "Ella está contenta", "Ella está profesora", "Ella está alta"], optionsEs: ["Ella está colombiana", "Ella está contenta", "Ella está profesora", "Ella está alta"], correctAnswer: 1, points: 1 },
        { type: "fill_blank", question: "Mis amigos _____ cansados hoy. (estar)", questionEs: "Mis amigos _____ cansados hoy. (estar)", correctAnswer: "están", points: 1 },
      ],
    },
  }]);

  // A2 Test — Module 20: Love (a2Stations[8])
  await db.insert(learningPathContent).values([{
    stationId: a2Stations[8].id,
    contentType: "quiz",
    title: "Test: Love",
    titleEs: "Test: El Amor",
    durationMinutes: 15,
    sortOrder: 1,
    contentData: {
      passingScore: 70,
      questions: [
        { type: "multiple_choice", question: "How do you say 'I love you' in Spanish?", questionEs: "¿Cómo se dice 'I love you'?", options: ["Te quiero", "Te necesito", "Te extraño", "Te busco"], optionsEs: ["Te quiero", "Te necesito", "Te extraño", "Te busco"], correctAnswer: 0, points: 1 },
        { type: "fill_blank", question: "Ella se _____ todos los días a las 7. (levantarse)", questionEs: "Ella se _____ todos los días a las 7. (levantarse)", correctAnswer: "levanta", points: 1 },
        { type: "multiple_choice", question: "What does 'Me quedo en casa' mean?", questionEs: "¿Qué significa 'Me quedo en casa'?", options: ["I leave the house", "I stay home", "I clean the house", "I build a house"], optionsEs: ["Salgo de casa", "Me quedo en casa", "Limpio la casa", "Construyo una casa"], correctAnswer: 1, points: 1 },
        { type: "true_false", question: "Reflexive verbs always use 'se' before the verb", questionEs: "Los verbos reflexivos siempre usan 'se' antes del verbo", options: ["True", "False"], optionsEs: ["Verdadero", "Falso"], correctAnswer: 1, points: 1, explanation: "The reflexive pronoun changes: me, te, se, nos, se", explanationEs: "El pronombre reflexivo cambia: me, te, se, nos, se" },
        { type: "multiple_choice", question: "'Nos acostamos temprano' means:", questionEs: "'Nos acostamos temprano' significa:", options: ["We wake up early", "We go to bed early", "We eat early", "We leave early"], optionsEs: ["Nos despertamos temprano", "Nos acostamos temprano", "Comemos temprano", "Salimos temprano"], correctAnswer: 1, points: 1 },
        { type: "fill_blank", question: "Yo me _____ los dientes después de comer. (cepillarse)", questionEs: "Yo me _____ los dientes después de comer. (cepillarse)", correctAnswer: "cepillo", points: 1 },
      ],
    },
  }]);

  // A2 Test — Module 25: Pet Care (a2Stations[13])
  await db.insert(learningPathContent).values([{
    stationId: a2Stations[13].id,
    contentType: "quiz",
    title: "Test: How to Care for Your Pets",
    titleEs: "Test: Cómo Cuidar de tus Mascotas",
    durationMinutes: 15,
    sortOrder: 1,
    contentData: {
      passingScore: 70,
      questions: [
        { type: "multiple_choice", question: "How do you say 'dog' in Spanish?", questionEs: "¿Cómo se dice 'dog'?", options: ["Gato", "Perro", "Pájaro", "Conejo"], optionsEs: ["Gato", "Perro", "Pájaro", "Conejo"], correctAnswer: 1, points: 1 },
        { type: "multiple_choice", question: "What does 'Mi héroe favorito es fuerte' mean?", questionEs: "¿Qué significa 'Mi héroe favorito es fuerte'?", options: ["My favorite hero is smart", "My favorite hero is strong", "My favorite hero is fast", "My favorite hero is tall"], optionsEs: ["Mi héroe favorito es inteligente", "Mi héroe favorito es fuerte", "Mi héroe favorito es rápido", "Mi héroe favorito es alto"], correctAnswer: 1, points: 1 },
        { type: "true_false", question: "'El zoológico' means 'the zoo'", questionEs: "'El zoológico' significa 'the zoo'", options: ["True", "False"], optionsEs: ["Verdadero", "Falso"], correctAnswer: 0, points: 1 },
        { type: "fill_blank", question: "Mi gato _____ muy juguetón. (ser)", questionEs: "Mi gato _____ muy juguetón. (ser)", correctAnswer: "es", points: 1 },
        { type: "multiple_choice", question: "Which animal is 'una tortuga'?", questionEs: "¿Qué animal es 'una tortuga'?", options: ["A bird", "A fish", "A turtle", "A rabbit"], optionsEs: ["Un pájaro", "Un pez", "Una tortuga", "Un conejo"], correctAnswer: 2, points: 1 },
        { type: "fill_blank", question: "Los perros necesitan _____ todos los días. (caminar/to walk)", questionEs: "Los perros necesitan _____ todos los días.", correctAnswer: "caminar", points: 1 },
      ],
    },
  }]);

  // B1 Test — Module 30: Botero Museum (b1Stations[4])
  await db.insert(learningPathContent).values([{
    stationId: b1Stations[4].id,
    contentType: "quiz",
    title: "Test: Visit to the Botero Museum",
    titleEs: "Test: Una visita al museo Botero",
    durationMinutes: 15,
    sortOrder: 1,
    contentData: {
      passingScore: 70,
      questions: [
        { type: "multiple_choice", question: "What is Fernando Botero known for?", questionEs: "¿Por qué es famoso Fernando Botero?", options: ["Thin figures", "Exaggerated volumes", "Abstract art", "Minimalism"], optionsEs: ["Figuras delgadas", "Volúmenes exagerados", "Arte abstracto", "Minimalismo"], correctAnswer: 1, points: 1 },
        { type: "fill_blank", question: "Yo _____ la diferencia entre saber y conocer. (know)", questionEs: "Yo _____ la diferencia entre saber y conocer.", correctAnswer: "sé", points: 1 },
        { type: "multiple_choice", question: "'¿Podría hablar más despacio?' is used when:", questionEs: "'¿Podría hablar más despacio?' se usa cuando:", options: ["You want to hang up", "You need someone to slow down", "You want to call back", "You're ordering food"], optionsEs: ["Quieres colgar", "Necesitas que hablen más lento", "Quieres devolver la llamada", "Estás pidiendo comida"], correctAnswer: 1, points: 1 },
        { type: "true_false", question: "'Saber' is used for knowing people", questionEs: "'Saber' se usa para conocer personas", options: ["True", "False"], optionsEs: ["Verdadero", "Falso"], correctAnswer: 1, points: 1, explanation: "'Conocer' is for people and places, 'saber' is for facts and skills", explanationEs: "'Conocer' es para personas y lugares, 'saber' es para hechos y habilidades" },
        { type: "multiple_choice", question: "How do you say 'supermarket' in Spanish?", questionEs: "¿Cómo se dice 'supermarket'?", options: ["La tienda", "El supermercado", "El mercado", "La farmacia"], optionsEs: ["La tienda", "El supermercado", "El mercado", "La farmacia"], correctAnswer: 1, points: 1 },
        { type: "fill_blank", question: "Yo _____ a María desde hace 5 años. (conocer)", questionEs: "Yo _____ a María desde hace 5 años. (conocer)", correctAnswer: "conozco", points: 1 },
      ],
    },
  }]);

  // B1 Test — Module 35: Shopping at the Mall (b1Stations[9])
  await db.insert(learningPathContent).values([{
    stationId: b1Stations[9].id,
    contentType: "quiz",
    title: "Test: Shopping at the Mall",
    titleEs: "Test: De compras en el centro comercial",
    durationMinutes: 15,
    sortOrder: 1,
    contentData: {
      passingScore: 70,
      questions: [
        { type: "multiple_choice", question: "How do you say 'Turn left' in Spanish?", questionEs: "¿Cómo se dice 'Turn left'?", options: ["Gire a la derecha", "Siga derecho", "Gire a la izquierda", "Pare aquí"], optionsEs: ["Gire a la derecha", "Siga derecho", "Gire a la izquierda", "Pare aquí"], correctAnswer: 2, points: 1 },
        { type: "fill_blank", question: "Setenta y cinco = _____", questionEs: "Setenta y cinco = _____", correctAnswer: "75", points: 1 },
        { type: "multiple_choice", question: "What does 'Me llevo esta camisa' mean?", questionEs: "¿Qué significa 'Me llevo esta camisa'?", options: ["I'm returning this shirt", "I'll take this shirt", "I'm trying this shirt", "I don't like this shirt"], optionsEs: ["Devuelvo esta camisa", "Me llevo esta camisa", "Me pruebo esta camisa", "No me gusta esta camisa"], correctAnswer: 1, points: 1 },
        { type: "true_false", question: "'Debo hacer ejercicio' means 'I should exercise'", questionEs: "'Debo hacer ejercicio' significa 'I should exercise'", options: ["True", "False"], optionsEs: ["Verdadero", "Falso"], correctAnswer: 0, points: 1 },
        { type: "multiple_choice", question: "What is 'cuarenta y tres' as a number?", questionEs: "¿Qué número es 'cuarenta y tres'?", options: ["33", "34", "43", "53"], optionsEs: ["33", "34", "43", "53"], correctAnswer: 2, points: 1 },
        { type: "fill_blank", question: "¿_____ cuesta esta falda? (How much)", questionEs: "¿_____ cuesta esta falda?", correctAnswer: "Cuánto", points: 1 },
      ],
    },
  }]);

  // B1 Test — Module 40: Once Upon a Time (b1Stations[14])
  await db.insert(learningPathContent).values([{
    stationId: b1Stations[14].id,
    contentType: "quiz",
    title: "Test: Once Upon a Time",
    titleEs: "Test: Érase una vez",
    durationMinutes: 15,
    sortOrder: 1,
    contentData: {
      passingScore: 70,
      questions: [
        { type: "multiple_choice", question: "What tense is used to narrate past trips?", questionEs: "¿Qué tiempo se usa para narrar viajes pasados?", options: ["Present", "Future", "Preterite/Past", "Conditional"], optionsEs: ["Presente", "Futuro", "Pretérito", "Condicional"], correctAnswer: 2, points: 1 },
        { type: "fill_blank", question: "El año pasado nosotros _____ a México. (ir)", questionEs: "El año pasado nosotros _____ a México. (ir)", correctAnswer: "fuimos", points: 1 },
        { type: "multiple_choice", question: "What does 'el medio ambiente' mean?", questionEs: "¿Qué significa 'el medio ambiente'?", options: ["The middle way", "The half time", "The environment", "The average"], optionsEs: ["El camino medio", "El medio tiempo", "El medio ambiente", "El promedio"], correctAnswer: 2, points: 1 },
        { type: "true_false", question: "'Fui' can mean both 'I went' and 'I was'", questionEs: "'Fui' puede significar tanto 'I went' como 'I was'", options: ["True", "False"], optionsEs: ["Verdadero", "Falso"], correctAnswer: 0, points: 1, explanation: "'Fui' is the preterite of both 'ir' (to go) and 'ser' (to be)", explanationEs: "'Fui' es el pretérito tanto de 'ir' como de 'ser'" },
        { type: "multiple_choice", question: "'Ella trabajaba en una oficina' — what tense is this?", questionEs: "'Ella trabajaba en una oficina' — ¿qué tiempo es?", options: ["Preterite", "Imperfect", "Present", "Future"], optionsEs: ["Pretérito", "Imperfecto", "Presente", "Futuro"], correctAnswer: 1, points: 1 },
        { type: "fill_blank", question: "Cuando era niño, yo _____ al parque todos los días. (ir)", questionEs: "Cuando era niño, yo _____ al parque todos los días. (ir)", correctAnswer: "iba", points: 1 },
      ],
    },
  }]);

  // B2 Test — Module 45: Adventure in Spain (b2Stations[4])
  await db.insert(learningPathContent).values([{
    stationId: b2Stations[4].id,
    contentType: "quiz",
    title: "Test: An Adventure in Spain",
    titleEs: "Test: Una Aventura en España",
    durationMinutes: 20,
    sortOrder: 1,
    contentData: {
      passingScore: 70,
      questions: [
        { type: "multiple_choice", question: "What does 'Hace sol' mean?", questionEs: "¿Qué significa 'Hace sol'?", options: ["It's raining", "It's sunny", "It's cold", "It's windy"], optionsEs: ["Llueve", "Hace sol", "Hace frío", "Hace viento"], correctAnswer: 1, points: 1 },
        { type: "fill_blank", question: "Cuando era niño, yo _____ mucho. (jugar, imperfect)", questionEs: "Cuando era niño, yo _____ mucho. (jugar, imperfecto)", correctAnswer: "jugaba", points: 1 },
        { type: "multiple_choice", question: "Which author wrote 'Don Quijote'?", questionEs: "¿Qué autor escribió 'Don Quijote'?", options: ["Gabriel García Márquez", "Miguel de Cervantes", "Pablo Neruda", "Jorge Luis Borges"], optionsEs: ["Gabriel García Márquez", "Miguel de Cervantes", "Pablo Neruda", "Jorge Luis Borges"], correctAnswer: 1, points: 1 },
        { type: "true_false", question: "'La puerta de embarque' means 'the boarding gate'", questionEs: "'La puerta de embarque' significa 'the boarding gate'", options: ["True", "False"], optionsEs: ["Verdadero", "Falso"], correctAnswer: 0, points: 1 },
        { type: "multiple_choice", question: "How do you say 'I used to play' (imperfect)?", questionEs: "¿Cómo se dice 'I used to play' (imperfecto)?", options: ["Jugué", "Jugaba", "Juego", "Jugaré"], optionsEs: ["Jugué", "Jugaba", "Juego", "Jugaré"], correctAnswer: 1, points: 1 },
        { type: "fill_blank", question: "Necesito mi pasaporte y mi tarjeta de _____. (boarding)", questionEs: "Necesito mi pasaporte y mi tarjeta de _____.", correctAnswer: "embarque", points: 1 },
        { type: "multiple_choice", question: "'Está lloviendo a cántaros' means:", questionEs: "'Está lloviendo a cántaros' significa:", options: ["It's drizzling", "It's raining cats and dogs", "It's about to rain", "The rain stopped"], optionsEs: ["Está lloviznando", "Llueve a cántaros", "Va a llover", "Dejó de llover"], correctAnswer: 1, points: 1 },
      ],
    },
  }]);

  // B2 Test — Module 50: Beautiful Mexico (b2Stations[8])
  await db.insert(learningPathContent).values([{
    stationId: b2Stations[8].id,
    contentType: "quiz",
    title: "Test: Beautiful Mexico",
    titleEs: "Test: México lindo y querido",
    durationMinutes: 20,
    sortOrder: 1,
    contentData: {
      passingScore: 70,
      questions: [
        { type: "multiple_choice", question: "What is 'voseo' commonly associated with?", questionEs: "¿Con qué país se asocia comúnmente el 'voseo'?", options: ["Mexico", "Spain", "Argentina", "Colombia"], optionsEs: ["México", "España", "Argentina", "Colombia"], correctAnswer: 2, points: 1 },
        { type: "fill_blank", question: "Barcelona es una ciudad muy _____. (beautiful)", questionEs: "Barcelona es una ciudad muy _____. (bonita)", correctAnswer: "bonita", points: 1 },
        { type: "multiple_choice", question: "What happened in the 1940s in Latin America?", questionEs: "¿Qué pasó en los años 40 en Latinoamérica?", options: ["Internet was invented", "Golden age of cinema", "Television became popular", "Social media started"], optionsEs: ["Se inventó internet", "Época dorada del cine", "Se popularizó la TV", "Empezaron las redes sociales"], correctAnswer: 1, points: 1 },
        { type: "true_false", question: "In Argentina, 'vos tenés' is equivalent to 'tú tienes'", questionEs: "En Argentina, 'vos tenés' es equivalente a 'tú tienes'", options: ["True", "False"], optionsEs: ["Verdadero", "Falso"], correctAnswer: 0, points: 1 },
        { type: "multiple_choice", question: "What is 'La Sagrada Familia' in Barcelona?", questionEs: "¿Qué es 'La Sagrada Familia' en Barcelona?", options: ["A restaurant", "A church/basilica", "A museum", "A park"], optionsEs: ["Un restaurante", "Una iglesia/basílica", "Un museo", "Un parque"], correctAnswer: 1, points: 1 },
        { type: "fill_blank", question: "En los años 40, la gente _____ la radio. (escuchar, imperfect)", questionEs: "En los años 40, la gente _____ la radio. (escuchar, imperfecto)", correctAnswer: "escuchaba", points: 1 },
      ],
    },
  }]);

  // B2 Test — Module 55: Hospital Specialties (b2Stations[13])
  await db.insert(learningPathContent).values([{
    stationId: b2Stations[13].id,
    contentType: "quiz",
    title: "Test: Hospital Specialties",
    titleEs: "Test: Especialidades en el hospital",
    durationMinutes: 20,
    sortOrder: 1,
    contentData: {
      passingScore: 70,
      questions: [
        { type: "multiple_choice", question: "What are the Galápagos Islands famous for?", questionEs: "¿Por qué son famosas las Islas Galápagos?", options: ["Beaches", "Unique wildlife", "Nightlife", "Shopping"], optionsEs: ["Playas", "Fauna única", "Vida nocturna", "Compras"], correctAnswer: 1, points: 1 },
        { type: "fill_blank", question: "Me duele la _____. (head)", questionEs: "Me duele la _____. (cabeza)", correctAnswer: "cabeza", points: 1 },
        { type: "multiple_choice", question: "What does 'el cardiólogo' specialize in?", questionEs: "¿En qué se especializa 'el cardiólogo'?", options: ["Bones", "Heart", "Eyes", "Skin"], optionsEs: ["Huesos", "Corazón", "Ojos", "Piel"], correctAnswer: 1, points: 1 },
        { type: "true_false", question: "The Panama Canal connects the Atlantic and Pacific oceans", questionEs: "El Canal de Panamá conecta los océanos Atlántico y Pacífico", options: ["True", "False"], optionsEs: ["Verdadero", "Falso"], correctAnswer: 0, points: 1 },
        { type: "multiple_choice", question: "How do you say 'I have a fever' in Spanish?", questionEs: "¿Cómo se dice 'I have a fever'?", options: ["Tengo tos", "Tengo fiebre", "Tengo gripe", "Tengo dolor"], optionsEs: ["Tengo tos", "Tengo fiebre", "Tengo gripe", "Tengo dolor"], correctAnswer: 1, points: 1 },
        { type: "fill_blank", question: "Necesito ir al _____ porque me duele una muela. (dentist)", questionEs: "Necesito ir al _____ porque me duele una muela.", correctAnswer: "dentista", points: 1 },
        { type: "multiple_choice", question: "What decade is associated with 'La Movida' in Spain?", questionEs: "¿Con qué década se asocia 'La Movida' en España?", options: ["1940s", "1960s", "1980s", "2000s"], optionsEs: ["Los 40", "Los 60", "Los 80", "Los 2000"], correctAnswer: 2, points: 1 },
      ],
    },
  }]);

  console.log("  Created 11 quiz contents for test stations");

  // ====== DOCUMENT CONTENT for lesson stations ======
  console.log("Creating document content for lesson stations...");

  // A1 Lesson Documents
  const a1Docs = [
    { idx: 0, title: "Who Are You? — Lesson Guide", titleEs: "¿Quién eres tú? — Guía de la lección", text: "# Greetings & Introductions\n\n- **Hola** — Hello\n- **Buenos días** — Good morning\n- **Buenas tardes** — Good afternoon\n- **¿Cómo te llamas?** — What's your name?\n- **Me llamo...** — My name is...\n- **¿Cuántos años tienes?** — How old are you?\n- **Soy de...** — I'm from...\n- **Mucho gusto** — Nice to meet you\n\n## Practice\nPrepare a video introducing yourself: greeting, name, last name, age, nationality." },
    { idx: 1, title: "Ser and Estar — Lesson Guide", titleEs: "Ser y Estar — Guía de la lección", text: "# Ser vs Estar\n\nBoth mean 'to be' but are used differently.\n\n## SER — permanent characteristics\n- Yo **soy** estudiante (I am a student)\n- Ella **es** colombiana (She is Colombian)\n- Nosotros **somos** amigos (We are friends)\n\n## ESTAR — temporary states & location\n- Yo **estoy** cansado (I am tired)\n- Ella **está** en la oficina (She is at the office)\n- Nosotros **estamos** contentos (We are happy)\n\n## Key: DOCTOR vs PLACE\n- SER: Description, Occupation, Characteristic, Time, Origin, Relationship\n- ESTAR: Position, Location, Action, Condition, Emotion" },
    { idx: 2, title: "What Do You Do? — Lesson Guide", titleEs: "¿A qué te dedicas? — Guía de la lección", text: "# Jobs & Professions\n\n- **Profesor/a** — Teacher\n- **Doctor/a** — Doctor\n- **Abogado/a** — Lawyer\n- **Ingeniero/a** — Engineer\n- **Contador/a** — Accountant\n- **Enfermero/a** — Nurse\n\n## Key Phrases\n- **¿A qué te dedicas?** — What do you do?\n- **Trabajo como...** — I work as...\n- **Soy...** — I am a...\n- **Trabajo en...** — I work at..." },
    { idx: 3, title: "Basic Expressions & Food — Lesson Guide", titleEs: "Expresiones Básicas y Alimentos — Guía", text: "# Everyday Expressions\n\n- **Por favor** — Please\n- **Gracias** — Thank you\n- **De nada** — You're welcome\n- **Perdón** — Excuse me\n- **Lo siento** — I'm sorry\n\n# Food Vocabulary\n\n- **El arroz** — Rice\n- **El pollo** — Chicken\n- **La fruta** — Fruit\n- **La leche** — Milk\n- **El pan** — Bread\n- **Las verduras** — Vegetables\n- **El agua** — Water\n- **El jugo** — Juice" },
    { idx: 5, title: "Where Do You Live? — Lesson Guide", titleEs: "¿En Dónde Vives? — Guía de la lección", text: "# Home & Neighborhood\n\n- **La casa** — House\n- **El apartamento** — Apartment\n- **La cocina** — Kitchen\n- **El baño** — Bathroom\n- **La sala** — Living room\n- **El dormitorio** — Bedroom\n\n## Key Phrases\n- **Vivo en...** — I live in...\n- **Mi casa tiene...** — My house has...\n- **Está cerca de...** — It's close to...\n- **Mi barrio es...** — My neighborhood is..." },
    { idx: 6, title: "Basic Conjugations — Lesson Guide", titleEs: "Conjugaciones Básicas — Guía", text: "# Present Tense — Regular Verbs\n\n## -AR verbs (hablar)\n| | Singular | Plural |\n|---|---|---|\n| 1st | habl**o** | habl**amos** |\n| 2nd | habl**as** | habl**áis** |\n| 3rd | habl**a** | habl**an** |\n\n## -ER verbs (comer)\n| | Singular | Plural |\n|---|---|---|\n| 1st | com**o** | com**emos** |\n| 2nd | com**es** | com**éis** |\n| 3rd | com**e** | com**en** |\n\n## -IR verbs (vivir)\n| | Singular | Plural |\n|---|---|---|\n| 1st | viv**o** | viv**imos** |\n| 2nd | viv**es** | viv**ís** |\n| 3rd | viv**e** | viv**en** |" },
    { idx: 7, title: "I Like... — Lesson Guide", titleEs: "A Mí Me Gusta… — Guía de la lección", text: "# The Verb GUSTAR\n\nGustar works differently — the thing you like is the subject.\n\n- **Me gusta** el café — I like coffee\n- **Me gustan** los libros — I like books\n- **Te gusta** bailar — You like to dance\n- **Le gusta** la música — He/she likes music\n- **Nos gustan** las películas — We like movies\n\n## Other verbs like GUSTAR:\n- **Encantar** — to love\n- **Molestar** — to bother\n- **Importar** — to matter\n- **Interesar** — to interest" },
    { idx: 8, title: "Basic Conversations — Lesson Guide", titleEs: "Conversaciones Básicas — Guía", text: "# Simple Dialogues\n\n## Meeting Someone\n- ¡Hola! ¿Cómo estás? — Hi! How are you?\n- Bien, gracias. ¿Y tú? — Fine, thanks. And you?\n- Muy bien. ¿Cómo te llamas? — Very well. What's your name?\n- Me llamo Ana. ¿Y tú? — My name is Ana. And you?\n\n## At a Store\n- Buenos días, ¿en qué puedo ayudarle?\n- Busco una camisa, por favor.\n- ¿De qué talla?\n- Talla mediana, gracias." },
    { idx: 10, title: "Work & Professional Life — Lesson Guide", titleEs: "Trabajo y Vida Profesional — Guía", text: "# Workplace Vocabulary\n\n- **La oficina** — Office\n- **El jefe/La jefa** — Boss\n- **Los compañeros** — Coworkers\n- **La reunión** — Meeting\n- **El horario** — Schedule\n\n## Key Phrases\n- **Trabajo de lunes a viernes** — I work Monday to Friday\n- **Mi horario es de 8 a 5** — My schedule is 8 to 5\n- **Tengo una reunión a las 3** — I have a meeting at 3" },
  ];

  for (const doc of a1Docs) {
    await db.insert(learningPathContent).values([{
      stationId: a1Stations[doc.idx].id,
      contentType: "document",
      title: doc.title,
      titleEs: doc.titleEs,
      durationMinutes: 10,
      sortOrder: 1,
      contentData: { text: doc.text },
    }]);
  }
  console.log("  Created A1 lesson documents");

  // A2 Lesson Documents
  const a2Docs = [
    { idx: 0, title: "Hobbies & Free Time — Lesson Guide", titleEs: "Pasatiempos y Tiempo Libre — Guía", text: "# Free Time Activities\n\n- **Ir al cine** — Go to the movies\n- **Jugar fútbol** — Play soccer\n- **Leer un libro** — Read a book\n- **Cocinar** — Cook\n- **Pintar** — Paint\n- **Tomar fotos** — Take photos\n\n## Frequency Expressions\n- **Siempre** — Always\n- **A menudo** — Often\n- **A veces** — Sometimes\n- **Rara vez** — Rarely\n- **Nunca** — Never\n\n## Example: 'Voy al cine una vez a la semana.'" },
    { idx: 1, title: "Food & Restaurants — Lesson Guide", titleEs: "Comidas y Restaurantes — Guía", text: "# At the Restaurant\n\n- **¿Qué desea ordenar?** — What would you like to order?\n- **Me gustaría...** — I would like...\n- **La cuenta, por favor** — The check, please\n- **¿Tiene menú en inglés?** — Do you have an English menu?\n\n## Food Types\n- **La entrada** — Appetizer\n- **El plato principal** — Main course\n- **El postre** — Dessert\n- **La bebida** — Drink" },
    { idx: 2, title: "Ser & Estar Part 2 — Lesson Guide", titleEs: "Ser y Estar Segunda Parte — Guía", text: "# Advanced Ser vs Estar\n\n## Adjectives that change meaning:\n- **Ser listo** — to be smart\n- **Estar listo** — to be ready\n- **Ser aburrido** — to be boring\n- **Estar aburrido** — to be bored\n- **Ser verde** — to be green (color)\n- **Estar verde** — to be unripe\n\n## With past participles:\n- **La puerta está abierta** — The door is open (state)\n- **El libro es escrito por García Márquez** — The book is written by García Márquez (passive)" },
    { idx: 4, title: "A Day in Pilar's Life — Lesson Guide", titleEs: "Un Día en la Vida de Pilar — Guía", text: "# Daily Routines\n\n## Pilar's Day\n- Se despierta a las 6 de la mañana\n- Se ducha y se viste\n- Desayuna café con pan\n- Va al trabajo en bus\n- Almuerza con sus compañeros\n- Regresa a casa a las 5\n- Cocina la cena\n- Ve televisión\n- Se acuesta a las 10\n\n## Reflexive Verbs\n- **Despertarse** — to wake up\n- **Ducharse** — to shower\n- **Vestirse** — to get dressed\n- **Acostarse** — to go to bed" },
    { idx: 5, title: "That's How I Like It — Lesson Guide", titleEs: "Así Me Gusta — Guía", text: "# Expressing Preferences\n\n- **Prefiero...** — I prefer...\n- **Me encanta...** — I love...\n- **No me gusta para nada...** — I don't like... at all\n- **Me fascina...** — I'm fascinated by...\n\n## Comparing\n- **Más que** — More than\n- **Menos que** — Less than\n- **Tan... como** — As... as\n- **Mejor que** — Better than\n- **Peor que** — Worse than" },
    { idx: 6, title: "Daily Routine — Lesson Guide", titleEs: "Alejandro y la Rutina Diaria — Guía", text: "# Alejandro's Routine — Reflexive Verbs\n\n- **Me levanto** — I get up\n- **Me baño** — I bathe\n- **Me cepillo los dientes** — I brush my teeth\n- **Me peino** — I comb my hair\n- **Me visto** — I get dressed\n- **Me acuesto** — I go to bed\n\n## Time Expressions\n- **Por la mañana** — In the morning\n- **Al mediodía** — At noon\n- **Por la tarde** — In the afternoon\n- **Por la noche** — At night" },
    { idx: 7, title: "I Stay Home — Lesson Guide", titleEs: "Me Quedo en Casa — Guía", text: "# Home Activities\n\n- **Ver televisión** — Watch TV\n- **Leer un libro** — Read a book\n- **Cocinar** — Cook\n- **Limpiar la casa** — Clean the house\n- **Escuchar música** — Listen to music\n- **Jugar videojuegos** — Play video games\n- **Hacer ejercicio** — Exercise\n\n## Phrases\n- **Me quedo en casa** — I stay home\n- **Prefiero descansar** — I prefer to rest\n- **Hoy no salgo** — I'm not going out today" },
    { idx: 9, title: "My Favorite Superhero — Lesson Guide", titleEs: "Mi Súper Héroe Favorito — Guía", text: "# Descriptions & Comparisons\n\n## Physical Descriptions\n- **Alto/a** — Tall\n- **Fuerte** — Strong\n- **Rápido/a** — Fast\n- **Valiente** — Brave\n- **Inteligente** — Intelligent\n\n## Comparisons\n- Superman es **más fuerte que** Batman\n- Wonder Woman es **tan valiente como** Superman\n- Spider-Man es **el más ágil de** todos" },
    { idx: 10, title: "Visit to the Zoo — Lesson Guide", titleEs: "Visita al Zoológico — Guía", text: "# Animal Vocabulary\n\n- **El león** — Lion\n- **El elefante** — Elephant\n- **La jirafa** — Giraffe\n- **El mono** — Monkey\n- **El oso** — Bear\n- **La serpiente** — Snake\n- **El cocodrilo** — Crocodile\n- **El pingüino** — Penguin\n\n## Describing Animals\n- **El león es grande y fuerte**\n- **La jirafa tiene el cuello largo**\n- **El mono es muy gracioso**" },
    { idx: 11, title: "Cali's Zoo — Lesson Guide", titleEs: "Zoológico de Cali — Guía", text: "# Colombian Culture: Cali\n\n- Cali is the third-largest city in Colombia\n- Known as the 'Salsa Capital of the World'\n- The Cali Zoo is one of the best in Latin America\n\n## Colombian Animals\n- **El cóndor** — National bird of Colombia\n- **La guacamaya** — Macaw\n- **El jaguar** — Jaguar\n- **El oso de anteojos** — Spectacled bear" },
    { idx: 12, title: "My Pets — Lesson Guide", titleEs: "Mis Mascotas — Guía", text: "# Pet Vocabulary\n\n- **El perro** — Dog\n- **El gato** — Cat\n- **El pez** — Fish\n- **El conejo** — Rabbit\n- **La tortuga** — Turtle\n- **El hámster** — Hamster\n\n## Pet Care\n- **Dar de comer** — To feed\n- **Sacar a pasear** — To walk\n- **Llevar al veterinario** — Take to the vet\n- **Bañar** — To bathe\n- **Cuidar** — To take care of" },
  ];

  for (const doc of a2Docs) {
    await db.insert(learningPathContent).values([{
      stationId: a2Stations[doc.idx].id,
      contentType: "document",
      title: doc.title,
      titleEs: doc.titleEs,
      durationMinutes: 10,
      sortOrder: 1,
      contentData: { text: doc.text },
    }]);
  }
  console.log("  Created A2 lesson documents");

  // B1 Lesson Documents
  const b1Docs = [
    { idx: 0, title: "An Unforgettable Dinner — Guide", titleEs: "Una Cena Inolvidable — Guía", text: "# Restaurant Conversations\n\n## Ordering\n- **Quisiera el menú del día** — I'd like the daily special\n- **¿Cuál es la especialidad?** — What's the specialty?\n- **Para mí, una sopa y un plato de arroz con pollo** — For me, a soup and a rice with chicken plate\n\n## Past Tense Narration\n- **Anoche fuimos a un restaurante increíble**\n- **Pedimos una botella de vino**\n- **La comida estuvo deliciosa**\n\n## Tongue Twister\n*La fruta fresca como la fresa fresca me refresca. ¡Qué rica fresa!*" },
    { idx: 1, title: "Let's Go to the Supermarket — Guide", titleEs: "Vamos al Supermercado — Guía", text: "# Shopping Vocabulary\n\n- **El carrito** — Shopping cart\n- **La caja** — Checkout\n- **El pasillo** — Aisle\n- **La oferta** — Sale/offer\n- **El precio** — Price\n\n## Quantities\n- **Un kilo de...** — A kilo of...\n- **Una docena de...** — A dozen of...\n- **Un litro de...** — A liter of...\n- **Una bolsa de...** — A bag of..." },
    { idx: 2, title: "Saber and Conocer — Guide", titleEs: "Saber y Conocer — Guía", text: "# Two Verbs for 'To Know'\n\n## SABER — facts, skills, information\n- **Sé hablar español** — I know how to speak Spanish\n- **¿Sabes dónde está el banco?** — Do you know where the bank is?\n- **Sé la respuesta** — I know the answer\n\n## CONOCER — people, places, familiarity\n- **Conozco a María** — I know María\n- **¿Conoces Colombia?** — Do you know Colombia?\n- **No conozco este restaurante** — I don't know this restaurant\n\n## Bingo Game: Saber y Conocer\nPractice choosing the correct verb in different contexts!" },
    { idx: 3, title: "Phone Conversations — Guide", titleEs: "Conversaciones Telefónicas — Guía", text: "# Telephone Spanish\n\n## Answering\n- **¿Aló?** / **¿Bueno?** / **¿Diga?** — Hello?\n- **¿Quién habla?** — Who's speaking?\n\n## Making Calls\n- **¿Podría hablar con...?** — Could I speak with...?\n- **Le llamo de parte de...** — I'm calling on behalf of...\n- **¿Podría dejar un mensaje?** — Could I leave a message?\n\n## Problems\n- **No se escucha bien** — I can't hear well\n- **¿Podría repetir, por favor?** — Could you repeat, please?\n- **Se cortó la llamada** — The call got disconnected" },
    { idx: 5, title: "Where Are We Going? — Guide", titleEs: "¿A dónde vamos? — Guía", text: "# Directions & Transportation\n\n## Directions\n- **Siga derecho** — Go straight\n- **Gire a la derecha** — Turn right\n- **Gire a la izquierda** — Turn left\n- **Está a dos cuadras** — It's two blocks away\n\n## Transportation\n- **El bus** — Bus\n- **El taxi** — Taxi\n- **El metro** — Subway\n- **A pie** — On foot\n\n## Asking\n- **¿Cómo llego a...?** — How do I get to...?\n- **¿Está lejos?** — Is it far?\n- **¿Hay un bus que vaya a...?** — Is there a bus to...?" },
    { idx: 6, title: "Numbers 1-100 — Guide", titleEs: "Números de 1-100 — Guía", text: "# Numbers\n\n## 1-20\n1 uno, 2 dos, 3 tres, 4 cuatro, 5 cinco, 6 seis, 7 siete, 8 ocho, 9 nueve, 10 diez, 11 once, 12 doce, 13 trece, 14 catorce, 15 quince, 16 dieciséis, 17 diecisiete, 18 dieciocho, 19 diecinueve, 20 veinte\n\n## 21-100\n21 veintiuno, 30 treinta, 40 cuarenta, 50 cincuenta, 60 sesenta, 70 setenta, 80 ochenta, 90 noventa, 100 cien\n\n## Pattern: 31-99\nTreinta **y** uno, cuarenta **y** dos, etc." },
    { idx: 7, title: "A Healthy Life — Guide", titleEs: "Una Vida Saludable — Guía", text: "# Health & Wellness\n\n## Healthy Habits\n- **Hacer ejercicio** — Exercise\n- **Comer bien** — Eat well\n- **Dormir 8 horas** — Sleep 8 hours\n- **Beber agua** — Drink water\n- **No fumar** — Don't smoke\n\n## Body Parts\n- **La cabeza** — Head\n- **El brazo** — Arm\n- **La pierna** — Leg\n- **El corazón** — Heart\n- **El estómago** — Stomach\n\n## At the Doctor\n- **Me duele...** — It hurts...\n- **Tengo fiebre** — I have a fever\n- **Estoy enfermo/a** — I'm sick" },
    { idx: 8, title: "What Should I Wear? — Guide", titleEs: "¿Qué me pongo? — Guía", text: "# Clothing Vocabulary\n\n- **La camisa** — Shirt\n- **El pantalón** — Pants\n- **La falda** — Skirt\n- **El vestido** — Dress\n- **Los zapatos** — Shoes\n- **La chaqueta** — Jacket\n- **El sombrero** — Hat\n- **Los calcetines** — Socks\n\n## Shopping Phrases\n- **¿Cuánto cuesta?** — How much?\n- **¿Tiene talla mediana?** — Do you have medium?\n- **Me queda bien** — It fits me well\n- **Está en oferta** — It's on sale" },
    { idx: 10, title: "We Went on a Trip — Guide", titleEs: "Nos fuimos de viaje — Guía", text: "# Travel Narration (Past Tense)\n\n## Preterite Irregular Verbs\n- **Ir** → fui, fuiste, fue, fuimos, fueron\n- **Hacer** → hice, hiciste, hizo, hicimos, hicieron\n- **Tener** → tuve, tuviste, tuvo, tuvimos, tuvieron\n\n## Travel Vocabulary\n- **El viaje** — Trip\n- **El hotel** — Hotel\n- **La maleta** — Suitcase\n- **El pasaporte** — Passport\n\n## Narrating a Trip\n- **El año pasado fuimos a la playa**\n- **Nos quedamos en un hotel precioso**\n- **Hicimos muchas actividades**" },
    { idx: 11, title: "The World of Work — Guide", titleEs: "El Mundo del Trabajo — Guía", text: "# Professional Life\n\n## Job Interview\n- **¿Cuál es su experiencia?** — What's your experience?\n- **Tengo X años de experiencia en...** — I have X years of experience in...\n- **Mis fortalezas son...** — My strengths are...\n\n## Work Vocabulary\n- **El currículum** — Resume\n- **La entrevista** — Interview\n- **El salario** — Salary\n- **El contrato** — Contract\n- **Los beneficios** — Benefits" },
    { idx: 12, title: "Entertainment World — Guide", titleEs: "El mundo del espectáculo — Guía", text: "# Entertainment Vocabulary\n\n- **La película** — Movie\n- **La serie** — TV show\n- **El concierto** — Concert\n- **El teatro** — Theater\n- **La exposición** — Exhibition\n\n## Genres\n- **Comedia** — Comedy\n- **Drama** — Drama\n- **Acción** — Action\n- **Terror** — Horror\n- **Documental** — Documentary\n\n## Opinions\n- **Me pareció excelente** — I thought it was excellent\n- **Es una obra maestra** — It's a masterpiece\n- **No me gustó mucho** — I didn't like it much" },
    { idx: 13, title: "The Environment — Guide", titleEs: "El Medio Ambiente — Guía", text: "# Environmental Vocabulary\n\n- **El medio ambiente** — Environment\n- **La contaminación** — Pollution\n- **El reciclaje** — Recycling\n- **El cambio climático** — Climate change\n- **La deforestación** — Deforestation\n\n## Actions\n- **Reciclar** — Recycle\n- **Ahorrar agua** — Save water\n- **Reducir el consumo** — Reduce consumption\n- **Proteger los bosques** — Protect forests\n- **Usar transporte público** — Use public transportation" },
  ];

  for (const doc of b1Docs) {
    await db.insert(learningPathContent).values([{
      stationId: b1Stations[doc.idx].id,
      contentType: "document",
      title: doc.title,
      titleEs: doc.titleEs,
      durationMinutes: 12,
      sortOrder: 1,
      contentData: { text: doc.text },
    }]);
  }
  console.log("  Created B1 lesson documents");

  // B2 Lesson Documents
  const b2Docs = [
    { idx: 0, title: "The Weather — Guide", titleEs: "El tiempo — Guía", text: "# Weather Expressions\n\n## Weather Phrases (use HACER)\n- **Hace sol** — It's sunny\n- **Hace frío** — It's cold\n- **Hace calor** — It's hot\n- **Hace viento** — It's windy\n\n## Weather Verbs\n- **Llueve / Está lloviendo** — It rains / It's raining\n- **Nieva / Está nevando** — It snows / It's snowing\n- **Truena** — It thunders\n\n## Idioms\n- **Llueve a cántaros** — It's raining cats and dogs\n- **Después de la tormenta viene la calma** — After the storm comes the calm" },
    { idx: 1, title: "Culture & Literature — Guide", titleEs: "Cultura y Literatura — Guía", text: "# Latin American Literature\n\n## Key Authors\n- **Gabriel García Márquez** — Colombia. *Cien años de soledad*\n- **Pablo Neruda** — Chile. Poetry\n- **Jorge Luis Borges** — Argentina. Short stories\n- **Isabel Allende** — Chile. *La casa de los espíritus*\n- **Miguel de Cervantes** — Spain. *Don Quijote*\n\n## Literary Terms\n- **El cuento** — Short story\n- **La novela** — Novel\n- **El poema** — Poem\n- **El realismo mágico** — Magical realism" },
    { idx: 2, title: "Childhood Memories — Guide", titleEs: "Recuerdos de mi infancia — Guía", text: "# The Imperfect Tense\n\nUsed for habitual past actions, descriptions, and ongoing states.\n\n## -AR verbs (jugar)\n- jugaba, jugabas, jugaba, jugábamos, jugaban\n\n## -ER/-IR verbs (comer/vivir)\n- comía, comías, comía, comíamos, comían\n\n## Irregular\n- **Ser** → era, eras, era, éramos, eran\n- **Ir** → iba, ibas, iba, íbamos, iban\n- **Ver** → veía, veías, veía, veíamos, veían\n\n## Usage\n- **Cuando era niño, jugaba en el parque** — When I was a child, I used to play in the park" },
    { idx: 3, title: "Let's Travel by Plane — Guide", titleEs: "Viajemos en avión — Guía", text: "# Airport Vocabulary\n\n- **El aeropuerto** — Airport\n- **La puerta de embarque** — Boarding gate\n- **La tarjeta de embarque** — Boarding pass\n- **El equipaje de mano** — Carry-on luggage\n- **Facturar el equipaje** — Check luggage\n- **El control de seguridad** — Security check\n- **La aduana** — Customs\n\n## Key Phrases\n- **¿A qué hora sale el vuelo?** — What time does the flight leave?\n- **Mi vuelo tiene escala en...** — My flight has a layover in...\n- **Quisiera un asiento en el pasillo** — I'd like an aisle seat" },
    { idx: 5, title: "An Adventure in Barcelona — Guide", titleEs: "Una Aventura por Barcelona — Guía", text: "# Barcelona, Spain\n\n## Landmarks\n- **La Sagrada Familia** — Gaudí's famous basilica\n- **Las Ramblas** — Iconic boulevard\n- **El Parque Güell** — Gaudí's colorful park\n- **El Barrio Gótico** — Gothic Quarter\n\n## Spanish vs Latin American Spanish\n- **Vosotros** (Spain) vs **Ustedes** (Latin America)\n- **Coger** (Spain: to take) — different meaning in Latin America!\n- **El ordenador** (Spain) vs **La computadora** (Latin America)" },
    { idx: 6, title: "Let's Visit Argentina — Guide", titleEs: "Visitemos Argentina — Guía", text: "# Argentine Culture\n\n## Voseo\n- **Vos tenés** instead of *tú tienes*\n- **Vos querés** instead of *tú quieres*\n- **Vos podés** instead of *tú puedes*\n\n## Argentine Vocabulary\n- **Che** — Hey/buddy\n- **Bondi** — Bus\n- **Laburo** — Work\n- **Mina/Pibe** — Girl/Boy\n\n## Culture\n- **El tango** — iconic dance from Buenos Aires\n- **El mate** — traditional herbal drink\n- **El asado** — Argentine barbecue" },
    { idx: 7, title: "The 1940s — Guide", titleEs: "Los años 40 — Guía", text: "# Latin America in the 1940s\n\n## Historical Context\n- Golden age of Mexican and Argentine cinema\n- Rise of radio as main entertainment\n- Tango's golden era in Buenos Aires\n\n## Narrating History (Past Tenses)\n- **Imperfect** for descriptions: *La gente escuchaba la radio todas las noches*\n- **Preterite** for events: *En 1945, terminó la Segunda Guerra Mundial*\n\n## Cultural Icons\n- **Pedro Infante** — Mexican actor/singer\n- **Cantinflas** — Mexican comedian\n- **Carlos Gardel** — Tango legend" },
    { idx: 9, title: "Galápagos Islands — Guide", titleEs: "Islas Galápagos — Guía", text: "# The Galápagos Islands\n\n## About\n- Located 1,000 km off Ecuador's coast\n- UNESCO World Heritage Site\n- Charles Darwin visited in 1835\n\n## Unique Wildlife\n- **La tortuga gigante** — Giant tortoise\n- **La iguana marina** — Marine iguana\n- **El piquero de patas azules** — Blue-footed booby\n- **El pingüino de Galápagos** — Galápagos penguin\n\n## Environmental Vocabulary\n- **La biodiversidad** — Biodiversity\n- **Las especies endémicas** — Endemic species\n- **La conservación** — Conservation\n- **El ecosistema** — Ecosystem" },
    { idx: 10, title: "The 1980s — Guide", titleEs: "Los años 80 — Guía", text: "# The 1980s in the Spanish-Speaking World\n\n## Spain: La Movida Madrileña\n- Cultural movement after Franco's dictatorship\n- Music, art, film, fashion explosion\n- **Pedro Almodóvar** — Iconic filmmaker\n\n## Latin America\n- **Rock en Español** gained popularity\n- Soda Stereo, Maná, Los Prisioneros\n\n## Comparing Decades\n- **En los 40, la gente escuchaba la radio**\n- **En los 80, la gente veía MTV**\n- **Hoy en día, la gente usa streaming**" },
    { idx: 11, title: "Panama — Guide", titleEs: "Panamá — Guía", text: "# Panama\n\n## The Panama Canal\n- Connects Atlantic and Pacific oceans\n- Built between 1904-1914\n- One of the greatest engineering achievements\n\n## Panamanian Culture\n- **El sombrero pintao** — Traditional painted hat\n- **La pollera** — Traditional dress\n- **El tamborito** — Traditional dance\n\n## Panamanian Expressions\n- **¡Qué xopa!** — What's up!\n- **Buena nota** — Cool/awesome\n- **Chuleta** — Wow!" },
    { idx: 12, title: "Let's Go to the Doctor — Guide", titleEs: "Vamos al doctor — Guía", text: "# Medical Vocabulary\n\n## Symptoms\n- **Me duele la cabeza** — I have a headache\n- **Tengo fiebre** — I have a fever\n- **Tengo tos** — I have a cough\n- **Me siento mareado** — I feel dizzy\n- **Tengo náuseas** — I feel nauseous\n\n## Medical Specialists\n- **El cardiólogo** — Cardiologist\n- **El dentista** — Dentist\n- **El oftalmólogo** — Ophthalmologist\n- **El pediatra** — Pediatrician\n- **El dermatólogo** — Dermatologist\n\n## At the Pharmacy\n- **Necesito una receta** — I need a prescription\n- **¿Tiene algo para el dolor de cabeza?** — Do you have something for headaches?" },
    { idx: 14, title: "Reading Comprehension: A Rainy Day — Guide", titleEs: "Comprensión de lectura: un día lluvioso — Guía", text: "# Reading Comprehension Skills\n\n## Strategies\n- **Scanning** — look for specific information\n- **Skimming** — get the general idea\n- **Context clues** — guess unknown words from context\n\n## A Rainy Day (Story excerpt)\n*Era un día gris en la ciudad. La lluvia caía sin parar desde la mañana. María miraba por la ventana de su apartamento, pensando en los días de sol. De repente, sonó el teléfono...*\n\n## Key Vocabulary\n- **La lluvia** — Rain\n- **El paraguas** — Umbrella\n- **El charco** — Puddle\n- **Mojarse** — To get wet" },
    { idx: 15, title: "Final Module — Guide", titleEs: "Módulo Final — Guía", text: "# Congratulations! — Final Review\n\n## What You've Learned\n- **A1**: Basic greetings, ser/estar, present tense, likes/dislikes\n- **A2**: Daily routines, reflexive verbs, comparisons, animals, pets\n- **B1**: Past tense, saber/conocer, directions, shopping, work, environment\n- **B2**: Imperfect, weather, culture, literature, travel, medical vocabulary\n\n## Next Steps\n- Continue practicing with your tutor\n- Watch Spanish-language content (movies, series, podcasts)\n- Travel to a Spanish-speaking country!\n- Read books in Spanish at your level\n\n¡Felicitaciones por completar el programa P2F!" },
  ];

  for (const doc of b2Docs) {
    await db.insert(learningPathContent).values([{
      stationId: b2Stations[doc.idx].id,
      contentType: "document",
      title: doc.title,
      titleEs: doc.titleEs,
      durationMinutes: 15,
      sortOrder: 1,
      contentData: { text: doc.text },
    }]);
  }
  console.log("  Created B2 lesson documents");

  // ====== LEVEL PROGRESSION RULES (A1→B2 only) ======
  console.log("Creating level progression rules...");
  await db.insert(levelProgressionRules).values([
    { fromLevel: "A1", toLevel: "A2", requiredClassesCompleted: 6, requiredQuizAvgScore: 70, requiredStationsCompleted: 11, autoPromote: true },
    { fromLevel: "A2", toLevel: "B1", requiredClassesCompleted: 12, requiredQuizAvgScore: 70, requiredStationsCompleted: 14, autoPromote: true },
    { fromLevel: "B1", toLevel: "B2", requiredClassesCompleted: 20, requiredQuizAvgScore: 75, requiredStationsCompleted: 15, autoPromote: true },
  ]).onConflictDoNothing();
  console.log("  Created 3 level progression rules");

  console.log("\nSeed completed successfully!");
  await pool.end();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
