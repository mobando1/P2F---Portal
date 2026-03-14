import { storage } from "../storage";
import { gamificationService } from "./gamification";
import type { LearningPathStation, StudentPathProgress } from "@shared/schema";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2"] as const;

export const learningPathService = {
  /**
   * Initialize the learning path for a new student.
   * Creates progress entries for all stations at their current level.
   */
  async initializeStudentPath(userId: number, level: string): Promise<void> {
    const stations = await storage.getStationsByLevel(level);
    if (stations.length === 0) return;

    const existing = await storage.getStudentProgress(userId);
    const existingStationIds = new Set(existing.map(p => p.stationId));

    for (let i = 0; i < stations.length; i++) {
      const station = stations[i];
      if (existingStationIds.has(station.id)) continue;

      await storage.upsertStudentProgress({
        userId,
        stationId: station.id,
        status: i === 0 ? "available" : "locked",
      });
    }
  },

  /**
   * Complete a station and unlock the next one in sequence.
   */
  async completeStation(userId: number, stationId: number, score?: number): Promise<{ leveledUp: boolean; newLevel?: string }> {
    const station = await storage.getStation(stationId);
    if (!station) throw new Error("Station not found");

    // Mark as completed
    await storage.upsertStudentProgress({
      userId,
      stationId,
      status: "completed",
      score: score ?? null,
      completedAt: new Date(),
    });

    // Unlock next station in same level
    const levelStations = await storage.getStationsByLevel(station.level);
    const currentIdx = levelStations.findIndex(s => s.id === stationId);
    if (currentIdx >= 0 && currentIdx < levelStations.length - 1) {
      const nextStation = levelStations[currentIdx + 1];
      const nextProgress = await storage.getStudentStationProgress(userId, nextStation.id);
      if (!nextProgress || nextProgress.status === "locked") {
        await storage.upsertStudentProgress({
          userId,
          stationId: nextStation.id,
          status: "available",
        });
      }
    }

    // Check gamification for first station completion
    const allProgress = await storage.getStudentProgress(userId);
    const completedCount = allProgress.filter(p => p.status === "completed").length;
    if (completedCount === 1) {
      await gamificationService.onLearningPathMilestone(userId, "first_station");
    }

    // Check level advancement
    const result = await this.checkAndAdvanceLevel(userId);

    // If didn't level up, check if close and notify tutor
    if (!result.leveledUp) {
      await this.checkAndNotifyAdvancementProximity(userId);
    }

    return result;
  },

  /**
   * Submit quiz answers, evaluate, and return results.
   */
  async submitQuiz(userId: number, contentId: number, answers: any[]): Promise<{
    score: number;
    maxScore: number;
    passed: boolean;
    attemptNumber: number;
  }> {
    const content = await storage.getContent(contentId);
    if (!content || content.contentType !== "quiz") {
      throw new Error("Quiz content not found");
    }

    const quizData = content.contentData as any;
    if (!quizData?.questions) throw new Error("Invalid quiz data");

    const questions = quizData.questions as Array<{
      type: string;
      correctAnswer: any;
      points?: number;
    }>;

    let score = 0;
    const maxScore = questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const userAnswer = answers[i];
      const points = q.points || 1;

      if (q.type === "multiple_choice" || q.type === "true_false") {
        if (userAnswer === q.correctAnswer) score += points;
      } else if (q.type === "fill_blank") {
        const correct = String(q.correctAnswer).toLowerCase().trim();
        const answer = String(userAnswer || "").toLowerCase().trim();
        if (answer === correct) score += points;
      } else if (q.type === "ordering") {
        if (JSON.stringify(userAnswer) === JSON.stringify(q.correctAnswer)) score += points;
      }
    }

    // Get attempt number
    const previousAttempts = await storage.getQuizAttempts(userId, contentId);
    const attemptNumber = previousAttempts.length + 1;

    const passingScore = quizData.passingScore || 70;
    const scorePercent = Math.round((score / maxScore) * 100);
    const passed = scorePercent >= passingScore;

    await storage.createQuizAttempt({
      userId,
      contentId,
      answers,
      score,
      maxScore,
      passed,
      attemptNumber,
    });

    // If passed and this quiz belongs to a station, check if station can be completed
    if (passed && content.stationId) {
      const stationContents = await storage.getContentByStation(content.stationId);
      // Auto-complete station if all quizzes in it are passed
      const allQuizzes = stationContents.filter(c => c.contentType === "quiz");
      let allPassed = true;
      for (const quiz of allQuizzes) {
        const attempts = await storage.getQuizAttempts(userId, quiz.id);
        if (!attempts.some(a => a.passed)) {
          allPassed = false;
          break;
        }
      }

      if (allPassed) {
        // Mark station in_progress → will be completed when user explicitly completes
        const progress = await storage.getStudentStationProgress(userId, content.stationId);
        if (progress && progress.status !== "completed") {
          await storage.upsertStudentProgress({
            userId,
            stationId: content.stationId,
            status: "in_progress",
          });
        }
      }
    }

    // Check quiz master achievement
    const allAttempts = await storage.getQuizAttemptsByUser(userId);
    const passedQuizzes = new Set(allAttempts.filter(a => a.passed).map(a => a.contentId));
    if (passedQuizzes.size >= 5) {
      await gamificationService.onLearningPathMilestone(userId, "quiz_master");
    }

    // Check advancement proximity after quiz
    if (passed) {
      await this.checkAndNotifyAdvancementProximity(userId);
    }

    return { score, maxScore, passed, attemptNumber };
  },

  /**
   * Check if student meets level advancement criteria.
   */
  async checkAndAdvanceLevel(userId: number): Promise<{ leveledUp: boolean; newLevel?: string }> {
    const user = await storage.getUser(userId);
    if (!user) return { leveledUp: false };

    const currentLevel = user.level;
    const levelIdx = CEFR_LEVELS.indexOf(currentLevel as any);
    if (levelIdx < 0 || levelIdx >= CEFR_LEVELS.length - 1) return { leveledUp: false };

    const rules = await storage.getLevelRules(currentLevel);
    if (!rules || !rules.autoPromote) return { leveledUp: false };

    // Check classes completed
    const progress = await storage.getUserProgress(userId);
    const classesCompleted = progress?.classesCompleted || 0;
    if (classesCompleted < rules.requiredClassesCompleted) return { leveledUp: false };

    // Check stations completed in current level
    const levelStations = await storage.getStationsByLevel(currentLevel);
    const studentProgress = await storage.getStudentProgress(userId);
    const stationIds = new Set(levelStations.map(s => s.id));
    const completedStations = studentProgress.filter(
      p => stationIds.has(p.stationId) && p.status === "completed"
    ).length;
    if (completedStations < rules.requiredStationsCompleted) return { leveledUp: false };

    // Check quiz average score
    const allAttempts = await storage.getQuizAttemptsByUser(userId);
    if (allAttempts.length > 0) {
      const avgScore = allAttempts.reduce((sum, a) => sum + Math.round((a.score / a.maxScore) * 100), 0) / allAttempts.length;
      if (avgScore < rules.requiredQuizAvgScore) return { leveledUp: false };
    }

    // All criteria met — advance level
    const newLevel = rules.toLevel;
    await storage.updateUser(userId, { level: newLevel });

    // Initialize path for new level
    await this.initializeStudentPath(userId, newLevel);

    // Gamification: level up achievement
    await gamificationService.onLearningPathMilestone(userId, `level_${newLevel.toLowerCase()}`);

    // Create notification
    try {
      await storage.createNotification({
        userId,
        type: "system",
        title: `Level Up! ${newLevel}`,
        message: `Congratulations! You've advanced to level ${newLevel}!`,
        link: "/learning-path",
      });
    } catch {}

    return { leveledUp: true, newLevel };
  },

  /**
   * Check if a student is close to advancing and notify their tutor(s).
   * "Close" means >= 80% of all criteria met for the next level.
   */
  async checkAndNotifyAdvancementProximity(userId: number): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return;

      const currentLevel = user.level;
      const levelIdx = CEFR_LEVELS.indexOf(currentLevel as any);
      if (levelIdx < 0 || levelIdx >= CEFR_LEVELS.length - 1) return;

      const rules = await storage.getLevelRules(currentLevel);
      if (!rules) return;

      // Compute how close the student is to each criterion
      const progress = await storage.getUserProgress(userId);
      const classesCompleted = progress?.classesCompleted || 0;
      const classesPct = Math.min(classesCompleted / rules.requiredClassesCompleted, 1);

      const levelStations = await storage.getStationsByLevel(currentLevel);
      const studentProgress = await storage.getStudentProgress(userId);
      const stationIds = new Set(levelStations.map(s => s.id));
      const completedStations = studentProgress.filter(
        p => stationIds.has(p.stationId) && p.status === "completed"
      ).length;
      const stationsPct = Math.min(completedStations / rules.requiredStationsCompleted, 1);

      const allAttempts = await storage.getQuizAttemptsByUser(userId);
      let quizPct = 0;
      if (allAttempts.length > 0) {
        const avgScore = allAttempts.reduce((sum, a) => sum + Math.round((a.score / a.maxScore) * 100), 0) / allAttempts.length;
        quizPct = Math.min(avgScore / rules.requiredQuizAvgScore, 1);
      }

      const overallPct = (classesPct + stationsPct + quizPct) / 3;

      // Only notify if >= 80% overall progress toward next level
      if (overallPct < 0.8) return;

      // Find student's tutors through completed classes
      const studentClasses = await storage.getUserClasses(userId);
      const tutorIds = Array.from(new Set(studentClasses.map(c => c.tutorId)));

      const nextLevel = CEFR_LEVELS[levelIdx + 1];
      const studentName = `${user.firstName} ${user.lastName}`;
      const pctDisplay = Math.round(overallPct * 100);

      for (const tutorId of tutorIds) {
        const tutor = await storage.getTutor(tutorId);
        if (!tutor?.userId) continue;

        await storage.createNotification({
          userId: tutor.userId,
          type: "system",
          title: `${studentName} está cerca de avanzar a ${nextLevel}`,
          message: `${studentName} ha completado el ${pctDisplay}% de los requisitos para avanzar de ${currentLevel} a ${nextLevel}. Clases: ${classesCompleted}/${rules.requiredClassesCompleted}, Estaciones: ${completedStations}/${rules.requiredStationsCompleted}.`,
          link: "/tutor-portal",
        });
      }

      // Also notify the student
      await storage.createNotification({
        userId,
        type: "system",
        title: `¡Casi llegas a ${nextLevel}!`,
        message: `Has completado el ${pctDisplay}% de los requisitos para avanzar a ${nextLevel}. ¡Sigue así!`,
        link: "/learning-path",
      });
    } catch {
      // Non-critical — don't break the flow
    }
  },

  /**
   * Get the full path view for a student with all stations and progress.
   */
  async getStudentPathView(userId: number): Promise<{
    currentLevel: string;
    levels: Array<{
      level: string;
      stations: Array<LearningPathStation & { progress: StudentPathProgress | null }>;
    }>;
    stats: {
      totalCompleted: number;
      totalStations: number;
      quizAvgScore: number;
      classesCompleted: number;
    };
  }> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error("User not found");

    // Only fetch levels up to current + 1 (for preview)
    const currentIdx = CEFR_LEVELS.indexOf(user.level as any);
    const relevantLevels = CEFR_LEVELS.slice(0, Math.min(currentIdx + 2, CEFR_LEVELS.length));

    // Fetch stations only for relevant levels (in parallel)
    const stationsByLevel = await Promise.all(
      relevantLevels.map(level => storage.getStationsByLevel(level))
    );

    const allStations = stationsByLevel.flat();
    const studentProgress = await storage.getStudentProgress(userId);
    const progressMap = new Map(studentProgress.map(p => [p.stationId, p]));

    // Build levels array
    const levels = relevantLevels
      .map((level, i) => ({
        level,
        stations: stationsByLevel[i].map(station => ({
          ...station,
          progress: progressMap.get(station.id) || null,
        })),
      }))
      .filter(l => l.stations.length > 0);

    // Stats
    const totalCompleted = studentProgress.filter(p => p.status === "completed").length;
    const totalStations = allStations.length;

    const allAttempts = await storage.getQuizAttemptsByUser(userId);
    const quizAvgScore = allAttempts.length > 0
      ? Math.round(allAttempts.reduce((sum, a) => sum + Math.round((a.score / a.maxScore) * 100), 0) / allAttempts.length)
      : 0;

    const userProgress = await storage.getUserProgress(userId);
    const classesCompleted = userProgress?.classesCompleted || 0;

    return {
      currentLevel: user.level,
      levels,
      stats: { totalCompleted, totalStations, quizAvgScore, classesCompleted },
    };
  },
};
