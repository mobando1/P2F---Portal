import bcrypt from "bcryptjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import {
  users, tutors, classes, videos, subscriptions, userProgress,
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
    highLevelContactId: "TEST_CONTACT_123",
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
    highLevelContactId: "MARIA_CONTACT_456",
  }).onConflictDoNothing({ target: users.email }).returning();

  console.log(`  Created ${[user1, user2].filter(Boolean).length} users`);

  // --- Tutors ---
  console.log("Creating tutors...");
  const tutorData = [
    {
      name: "Carolina Perilla",
      email: "carolsur191919@gmail.com",
      specialization: "Lead Instructor - Bilingual Education",
      bio: "International Relations graduate with a Master's in English Teaching Methodology and 15+ years of experience. Specializes in bilingual education and cross-cultural communication.",
      avatar: "/attached_assets/teachers/carolina-perilla.jpg",
      rating: "4.90",
      reviewCount: 156,
      hourlyRate: "35.00",
      classType: "adults",
      languageTaught: "spanish",
      country: "Colombia",
      timezone: "America/Bogota",
      languages: ["Spanish", "English", "French"],
      certifications: ["M.A. English Teaching Methodology", "Doctorate Student Educational Sciences"],
      yearsOfExperience: 15,
      highLevelContactId: "LuoLdvMdaZWRkidLCeQri",
      highLevelCalendarId: "R5AR05D5vU38A6wUS0R7",
    },
    {
      name: "Evelyn Salcedo",
      email: "evelyn@passport2fluency.com",
      specialization: "Spanish Language Specialist - Cultural Connection",
      bio: "Passionate about languages and connecting people across cultures. 5+ years of experience teaching Spanish and English.",
      avatar: "/attached_assets/teachers/evelyn-salcedo.jpg",
      rating: "4.90",
      reviewCount: 98,
      hourlyRate: "30.00",
      classType: "adults",
      languageTaught: "spanish",
      country: "Venezuela",
      timezone: "America/Caracas",
      languages: ["Spanish", "English"],
      certifications: ["Cultural Connection Expert", "Natural Language Learning Specialist"],
      yearsOfExperience: 5,
      highLevelContactId: "BrcSUKNCvlqeJUqd8l6",
    },
    {
      name: "Diego Felipe Rodriguez Martinez",
      email: "coach@passport2fluency.com",
      specialization: "Spanish Instructor & Education Specialist",
      bio: "Physical Education professor with a Master's in Physical Culture Pedagogy. Expert in creating engaging, active learning environments.",
      avatar: "/attached_assets/teachers/diego-felipe-rodriguez.jpg",
      rating: "4.80",
      reviewCount: 167,
      hourlyRate: "32.00",
      classType: "adults",
      languageTaught: "spanish",
      phone: "(210) 201-4490",
      country: "Colombia",
      timezone: "America/Bogota",
      languages: ["Spanish", "English"],
      certifications: ["M.A. Physical Culture Pedagogy", "PhD Student in Education"],
      yearsOfExperience: 8,
      highLevelContactId: "97rAcKTET2Y8pXmnE7",
    },
    {
      name: "Gloria Cardona",
      email: "gloria@passport2fluency.com",
      specialization: "Children's Specialist - Kids Spanish Expert",
      bio: "Elementary education specialist with 8+ years making Spanish fun for kids.",
      avatar: "/attached_assets/teachers/gloria-cardona.jpg",
      rating: "4.90",
      reviewCount: 142,
      hourlyRate: "28.00",
      classType: "kids",
      languageTaught: "spanish",
      phone: "(312) 312-1826",
      country: "Colombia",
      timezone: "America/Bogota",
      languages: ["Spanish", "English"],
      certifications: ["Elementary Education Specialist", "Kids Spanish Expert"],
      yearsOfExperience: 8,
      highLevelContactId: "FVFbwsXbe6LdJKAJetJye",
    },
    {
      name: "Johanna Pacheco",
      email: "johanna@passport2fluency.com",
      specialization: "Cultural Immersion Expert - Anthropology",
      bio: "Anthropology graduate specializing in Colombian and Latin American culture. Helps students understand regional dialects and cultural nuances.",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
      rating: "4.80",
      reviewCount: 87,
      hourlyRate: "30.00",
      classType: "adults",
      languageTaught: "spanish",
      country: "Colombia",
      timezone: "America/Bogota",
      languages: ["Spanish", "English"],
      certifications: ["B.A. Anthropology Universidad Nacional", "Cultural Immersion Expert"],
      yearsOfExperience: 6,
      highLevelContactId: "zTpvGMpxRnIM5gKqz3kws",
    },
  ];

  const createdTutors = [];
  for (const t of tutorData) {
    const [tutor] = await db.insert(tutors).values(t).onConflictDoNothing({ target: tutors.email }).returning();
    if (tutor) createdTutors.push(tutor);
  }
  console.log(`  Created ${createdTutors.length} tutors`);

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
        meetingLink: "https://meet.google.com/abc-defg-hij",
      },
      {
        userId: user1.id,
        tutorId: createdTutors.length > 2 ? createdTutors[2].id : createdTutors[0].id,
        title: "Business Spanish",
        description: "Professional Spanish for work",
        scheduledAt: nextWeek2,
        duration: 60,
        status: "scheduled",
        meetingLink: "https://meet.google.com/uvw-xyza-bcd",
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
