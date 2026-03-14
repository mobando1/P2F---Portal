import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin, requireTutor } from "./auth";
import { learningPathService } from "../services/learning-path";
import { z } from "zod";

const submitQuizSchema = z.object({
  answers: z.array(z.any()),
});

const createAssignmentSchema = z.object({
  studentId: z.number().int(),
  contentId: z.number().int(),
  stationId: z.number().int().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

const createStationSchema = z.object({
  level: z.string(),
  stationOrder: z.number().int(),
  title: z.string(),
  titleEs: z.string(),
  description: z.string().optional(),
  descriptionEs: z.string().optional(),
  stationType: z.enum(["lesson", "quiz", "activity", "milestone"]).default("lesson"),
  requiredToAdvance: z.boolean().default(true),
});

const createContentSchema = z.object({
  stationId: z.number().int(),
  contentType: z.enum(["document", "quiz", "video", "exercise"]),
  title: z.string(),
  titleEs: z.string(),
  description: z.string().optional(),
  descriptionEs: z.string().optional(),
  contentData: z.any().optional(),
  durationMinutes: z.number().int().default(15),
  sortOrder: z.number().int().default(0),
});

// Placement test questions — covers A1 through B2 concepts
const PLACEMENT_QUESTIONS = [
  // A1 questions (basic)
  { id: 1, level: "A1", question: "How do you say 'Hello' in Spanish?", questionEs: "¿Cómo se dice 'Hello' en español?", options: ["Hola", "Adiós", "Gracias", "Por favor"], correctAnswer: 0 },
  { id: 2, level: "A1", question: "What does 'Buenos días' mean?", questionEs: "¿Qué significa 'Buenos días'?", options: ["Good night", "Good morning", "Good afternoon", "Goodbye"], correctAnswer: 1 },
  { id: 3, level: "A1", question: "Complete: 'Yo _____ estudiante' (ser)", questionEs: "Completa: 'Yo _____ estudiante' (ser)", options: ["es", "soy", "está", "eres"], correctAnswer: 1 },
  { id: 4, level: "A1", question: "Which article goes with 'casa'?", questionEs: "¿Qué artículo va con 'casa'?", options: ["El", "La", "Los", "Un"], correctAnswer: 1 },
  { id: 5, level: "A1", question: "'Me gusta el café' means:", questionEs: "'Me gusta el café' significa:", options: ["I drink coffee", "I like coffee", "I need coffee", "I make coffee"], correctAnswer: 1 },
  // A2 questions (elementary)
  { id: 6, level: "A2", question: "'Ella se levanta a las 7' — this verb is:", questionEs: "'Ella se levanta a las 7' — este verbo es:", options: ["Regular", "Irregular", "Reflexive", "Passive"], correctAnswer: 2 },
  { id: 7, level: "A2", question: "What does 'A veces voy al cine' mean?", questionEs: "¿Qué significa 'A veces voy al cine'?", options: ["I always go to the cinema", "I sometimes go to the cinema", "I never go to the cinema", "I want to go to the cinema"], correctAnswer: 1 },
  { id: 8, level: "A2", question: "'La sopa está caliente' — why 'estar'?", questionEs: "'La sopa está caliente' — ¿por qué 'estar'?", options: ["It's a permanent state", "It's a temporary state", "It's a location", "It's an occupation"], correctAnswer: 1 },
  { id: 9, level: "A2", question: "The opposite of 'más que' is:", questionEs: "Lo opuesto de 'más que' es:", options: ["mejor que", "peor que", "menos que", "tanto como"], correctAnswer: 2 },
  { id: 10, level: "A2", question: "How do you say 'turtle' in Spanish?", questionEs: "¿Cómo se dice 'turtle' en español?", options: ["Conejo", "Tortuga", "Serpiente", "Pájaro"], correctAnswer: 1 },
  // B1 questions (intermediate)
  { id: 11, level: "B1", question: "'Yo sé hablar español' — why 'saber'?", questionEs: "'Yo sé hablar español' — ¿por qué 'saber'?", options: ["Knowing a person", "Knowing a fact/skill", "Being familiar with", "Recognizing"], correctAnswer: 1 },
  { id: 12, level: "B1", question: "What is 'cuarenta y siete'?", questionEs: "¿Qué número es 'cuarenta y siete'?", options: ["37", "47", "57", "74"], correctAnswer: 1 },
  { id: 13, level: "B1", question: "'El año pasado fuimos a México' — the tense is:", questionEs: "'El año pasado fuimos a México' — el tiempo es:", options: ["Present", "Imperfect", "Preterite", "Future"], correctAnswer: 2 },
  { id: 14, level: "B1", question: "'¿Podría hablar más despacio?' is used to:", questionEs: "'¿Podría hablar más despacio?' se usa para:", options: ["Hang up", "Ask someone to slow down", "Order food", "Give directions"], correctAnswer: 1 },
  { id: 15, level: "B1", question: "'Gire a la izquierda' means:", questionEs: "'Gire a la izquierda' significa:", options: ["Go straight", "Turn right", "Turn left", "Stop here"], correctAnswer: 2 },
  // B2 questions (upper-intermediate)
  { id: 16, level: "B2", question: "'Cuando era niño, jugaba en el parque' — the tense is:", questionEs: "'Cuando era niño, jugaba en el parque' — el tiempo es:", options: ["Preterite", "Imperfect", "Present perfect", "Conditional"], correctAnswer: 1 },
  { id: 17, level: "B2", question: "What is 'voseo'?", questionEs: "¿Qué es el 'voseo'?", options: ["A type of food", "Using 'vos' instead of 'tú'", "A dance style", "A literary genre"], correctAnswer: 1 },
  { id: 18, level: "B2", question: "'La puerta de embarque' refers to:", questionEs: "'La puerta de embarque' se refiere a:", options: ["The exit door", "The boarding gate", "The emergency door", "The hotel entrance"], correctAnswer: 1 },
  { id: 19, level: "B2", question: "Who wrote 'Cien años de soledad'?", questionEs: "¿Quién escribió 'Cien años de soledad'?", options: ["Pablo Neruda", "Jorge Luis Borges", "Gabriel García Márquez", "Isabel Allende"], correctAnswer: 2 },
  { id: 20, level: "B2", question: "'Me duele la cabeza' means:", questionEs: "'Me duele la cabeza' significa:", options: ["I have a cough", "I have a headache", "I feel dizzy", "I have a fever"], correctAnswer: 1 },
];

export function registerLearningPathRoutes(app: Express) {
  // ===== Placement Test =====

  // Get placement test questions
  app.get("/api/placement-test", requireAuth, async (req, res) => {
    // Return questions without correct answers
    const questions = PLACEMENT_QUESTIONS.map(({ correctAnswer, ...q }) => q);
    res.json({ questions });
  });

  // Submit placement test and determine level
  app.post("/api/placement-test/submit", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { answers } = req.body; // Array of { questionId: number, answer: number }

      if (!Array.isArray(answers)) {
        return res.status(400).json({ message: "answers must be an array" });
      }

      // Score by level
      const scoreByLevel: Record<string, { correct: number; total: number }> = {
        A1: { correct: 0, total: 0 },
        A2: { correct: 0, total: 0 },
        B1: { correct: 0, total: 0 },
        B2: { correct: 0, total: 0 },
      };

      for (const ans of answers) {
        const question = PLACEMENT_QUESTIONS.find(q => q.id === ans.questionId);
        if (!question) continue;
        scoreByLevel[question.level].total++;
        if (ans.answer === question.correctAnswer) {
          scoreByLevel[question.level].correct++;
        }
      }

      // Determine level: highest level where student got >= 60% correct
      let determinedLevel = "A1";
      const levels = ["A1", "A2", "B1", "B2"];
      for (const level of levels) {
        const { correct, total } = scoreByLevel[level];
        if (total > 0 && (correct / total) >= 0.6) {
          determinedLevel = level;
        } else {
          break; // If they fail a level, don't check higher ones
        }
      }

      // Update user level
      await storage.updateUser(userId, { level: determinedLevel });

      // Initialize learning path for the determined level
      await learningPathService.initializeStudentPath(userId, determinedLevel);

      // Create notification
      await storage.createNotification({
        userId,
        type: "system",
        title: `Nivel asignado: ${determinedLevel}`,
        message: `Tu test de colocación ha determinado tu nivel como ${determinedLevel}. ¡Bienvenido al programa!`,
        link: "/learning-path",
      });

      res.json({
        level: determinedLevel,
        scores: scoreByLevel,
        totalCorrect: Object.values(scoreByLevel).reduce((sum, s) => sum + s.correct, 0),
        totalQuestions: PLACEMENT_QUESTIONS.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== Student Endpoints =====

  // Get full learning path view
  app.get("/api/learning-path", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;

      // Initialize path if student has no progress yet
      const progress = await storage.getStudentProgress(userId);
      if (progress.length === 0) {
        const user = await storage.getUser(userId);
        if (user) {
          await learningPathService.initializeStudentPath(userId, user.level);
        }
      }

      const pathView = await learningPathService.getStudentPathView(userId);
      res.json(pathView);
    } catch (error) {
      console.error("Error getting learning path:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get station detail with content
  app.get("/api/learning-path/stations/:id", requireAuth, async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);
      if (isNaN(stationId)) return res.status(400).json({ message: "Invalid station ID" });

      const station = await storage.getStation(stationId);
      if (!station) return res.status(404).json({ message: "Station not found" });

      const content = await storage.getContentByStation(stationId);
      const userId = req.session.userId!;
      const progress = await storage.getStudentStationProgress(userId, stationId);

      // Enrich content with quiz attempt data
      const enrichedContent = await Promise.all(content.map(async (c) => {
        if (c.contentType === "quiz") {
          const attempts = await storage.getQuizAttempts(userId, c.id);
          return { ...c, attempts, bestScore: attempts.length > 0 ? Math.max(...attempts.map(a => Math.round((a.score / a.maxScore) * 100))) : null };
        }
        return { ...c, attempts: [], bestScore: null };
      }));

      res.json({ station, content: enrichedContent, progress });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Complete a station
  app.post("/api/learning-path/stations/:id/complete", requireAuth, async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);
      if (isNaN(stationId)) return res.status(400).json({ message: "Invalid station ID" });

      const userId = req.session.userId!;
      const progress = await storage.getStudentStationProgress(userId, stationId);

      if (!progress || progress.status === "locked") {
        return res.status(400).json({ message: "Station is not available yet" });
      }
      if (progress.status === "completed") {
        return res.status(400).json({ message: "Station already completed" });
      }

      const result = await learningPathService.completeStation(userId, stationId, req.body.score);
      res.json({ message: "Station completed", ...result });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Submit quiz answers
  app.post("/api/learning-path/quiz/:contentId/submit", requireAuth, async (req, res) => {
    try {
      const contentId = parseInt(req.params.contentId);
      if (isNaN(contentId)) return res.status(400).json({ message: "Invalid content ID" });

      const parsed = submitQuizSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid quiz submission", errors: parsed.error.errors });

      const userId = req.session.userId!;
      const result = await learningPathService.submitQuiz(userId, contentId, parsed.data.answers);
      res.json(result);
    } catch (error: any) {
      if (error.message === "Quiz content not found" || error.message === "Invalid quiz data") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get student's assignments
  app.get("/api/learning-path/assignments", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const assignments = await storage.getAssignmentsForStudent(userId);

      // Enrich with content and tutor info
      const enriched = await Promise.all(assignments.map(async (a) => {
        const content = await storage.getContent(a.contentId);
        const tutor = await storage.getTutor(a.tutorId);
        return {
          ...a,
          contentTitle: content?.title || "Unknown",
          contentTitleEs: content?.titleEs || "Desconocido",
          contentType: content?.contentType || "unknown",
          tutorName: tutor?.name || "Unknown",
        };
      }));

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== Tutor Endpoints =====

  // Get student's path progress (for tutor view)
  app.get("/api/tutor/students/:studentId/path", requireTutor, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      if (isNaN(studentId)) return res.status(400).json({ message: "Invalid student ID" });

      const pathView = await learningPathService.getStudentPathView(studentId);
      res.json(pathView);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create assignment
  app.post("/api/tutor/assignments", requireTutor, async (req, res) => {
    try {
      const parsed = createAssignmentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid assignment data", errors: parsed.error.errors });

      const userId = req.session.userId!;
      const tutor = await storage.getTutorByUserId(userId);
      if (!tutor) return res.status(403).json({ message: "Tutor profile not found" });

      const assignment = await storage.createAssignment({
        tutorId: tutor.id,
        studentId: parsed.data.studentId,
        contentId: parsed.data.contentId,
        stationId: parsed.data.stationId,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
        notes: parsed.data.notes,
        status: "assigned",
      });

      // Notify student
      try {
        await storage.createNotification({
          userId: parsed.data.studentId,
          type: "system",
          title: "Nueva actividad asignada",
          message: `${tutor.name} te asigno una nueva actividad`,
          link: "/learning-path",
        });
      } catch {}

      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update assignment
  app.put("/api/tutor/assignments/:id", requireTutor, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid assignment ID" });

      const updated = await storage.updateAssignment(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tutor's assignments
  app.get("/api/tutor/assignments", requireTutor, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tutor = await storage.getTutorByUserId(userId);
      if (!tutor) return res.status(403).json({ message: "Tutor profile not found" });

      const assignments = await storage.getAssignmentsByTutor(tutor.id);

      // Enrich with student and content info
      const enriched = await Promise.all(assignments.map(async (a) => {
        const student = await storage.getUser(a.studentId);
        const content = await storage.getContent(a.contentId);
        return {
          ...a,
          studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
          studentLevel: student?.level || "A1",
          contentTitle: content?.title || "Unknown",
          contentType: content?.contentType || "unknown",
        };
      }));

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== Admin Endpoints =====

  // Create station
  app.post("/api/admin/learning-path/stations", requireAdmin, async (req, res) => {
    try {
      const parsed = createStationSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid station data", errors: parsed.error.errors });

      const station = await storage.createStation(parsed.data);
      res.status(201).json(station);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create content
  app.post("/api/admin/learning-path/content", requireAdmin, async (req, res) => {
    try {
      const parsed = createContentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid content data", errors: parsed.error.errors });

      const content = await storage.createContent(parsed.data);
      res.status(201).json(content);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update content
  app.put("/api/admin/learning-path/content/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid content ID" });

      const updated = await storage.updateContent(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all stations (admin view)
  app.get("/api/admin/learning-path/stations", requireAdmin, async (req, res) => {
    try {
      const stations = await storage.getAllStations();
      res.json(stations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get/set level progression rules
  app.get("/api/admin/learning-path/rules", requireAdmin, async (req, res) => {
    try {
      const rules = await storage.getAllLevelRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/learning-path/rules", requireAdmin, async (req, res) => {
    try {
      const rule = await storage.upsertLevelRule(req.body);
      res.json(rule);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete a station (and its content)
  app.delete("/api/admin/learning-path/stations/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid station ID" });
      await storage.deleteStation(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete content
  app.delete("/api/admin/learning-path/content/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid content ID" });
      await storage.deleteContent(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get content for a station (admin)
  app.get("/api/admin/learning-path/stations/:id/content", requireAdmin, async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);
      if (isNaN(stationId)) return res.status(400).json({ message: "Invalid station ID" });
      const content = await storage.getContentByStation(stationId);
      res.json(content);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
