import type { Express } from "express";
import { storage, sanitizeUser } from "../storage";
import { requireAdmin } from "./auth";

export function registerCrmRoutes(app: Express) {
  // ── Tags (must be before :userId routes) ──
  app.get("/api/admin/crm/tags", requireAdmin, async (_req, res) => {
    try {
      const tags = await storage.getAllCrmTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/crm/tags", requireAdmin, async (req, res) => {
    try {
      const { name, color } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });
      const tag = await storage.createCrmTag({ name, color: color || "#1C7BB1" });
      res.json(tag);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/crm/tags/:tagId", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCrmTag(parseInt(req.params.tagId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Tasks (global, must be before :userId routes) ──
  app.get("/api/admin/crm/tasks", requireAdmin, async (req, res) => {
    try {
      const { status, assignedTo } = req.query;
      const tasks = await storage.getCrmTasks({
        status: typeof status === "string" ? status : undefined,
        assignedTo: assignedTo ? parseInt(assignedTo as string) : undefined,
      });
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/crm/tasks", requireAdmin, async (req, res) => {
    try {
      const { userId, title, description, dueDate, priority, assignedTo } = req.body;
      if (!title || !dueDate) return res.status(400).json({ message: "Title and dueDate are required" });
      const adminUserId = req.session.userId!;
      const task = await storage.createCrmTask({
        userId: userId || null,
        assignedTo: assignedTo || adminUserId,
        title,
        description: description || null,
        dueDate: new Date(dueDate),
        priority: priority || "medium",
      });
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/crm/tasks/:taskId", requireAdmin, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const updates: any = {};
      if (req.body.title) updates.title = req.body.title;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.dueDate) updates.dueDate = new Date(req.body.dueDate);
      if (req.body.priority) updates.priority = req.body.priority;
      if (req.body.status) {
        updates.status = req.body.status;
        updates.completedAt = req.body.status === "completed" ? new Date() : null;
      }
      const task = await storage.updateCrmTask(taskId, updates);
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/crm/tasks/:taskId", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCrmTask(parseInt(req.params.taskId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Metrics (must be before :userId routes) ──
  app.get("/api/admin/crm/metrics", requireAdmin, async (_req, res) => {
    try {
      const funnel = await storage.getCrmFunnel();
      const allStudents = await storage.getStudentsCRM({ limit: 10000 });

      const totalStudents = allStudents.total;
      const trialCount = funnel.find(f => f.stage === "trial")?.count || 0;
      const leadCount = funnel.find(f => f.stage === "lead")?.count || 0;
      const customerCount = funnel.find(f => f.stage === "customer")?.count || 0;
      const negotiationCount = funnel.find(f => f.stage === "negotiation")?.count || 0;
      const inactiveCount = funnel.find(f => f.stage === "inactive")?.count || 0;

      const conversionRate = totalStudents > 0
        ? Math.round((customerCount / totalStudents) * 100)
        : 0;

      res.json({
        totalStudents,
        conversionRate,
        funnel: [
          { stage: "trial", count: trialCount, label: "Trial" },
          { stage: "lead", count: leadCount, label: "Lead" },
          { stage: "negotiation", count: negotiationCount, label: "Negotiation" },
          { stage: "customer", count: customerCount, label: "Customer" },
          { stage: "inactive", count: inactiveCount, label: "Inactive" },
        ],
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── CSV Export ──
  app.get("/api/admin/crm/export", requireAdmin, async (_req, res) => {
    try {
      const result = await storage.getStudentsCRM({ limit: 10000 });

      const header = "ID,Nombre,Email,Telefono,Tipo,Trial Completado,Creditos,Fecha Registro,Ultima Actividad\n";
      const rows = result.students.map(s => {
        return [
          s.id,
          `"${s.firstName} ${s.lastName}"`,
          s.email,
          s.phone || "",
          s.userType,
          s.trialCompleted ? "Si" : "No",
          s.classCredits || 0,
          s.createdAt ? new Date(s.createdAt).toISOString().split("T")[0] : "",
          s.lastActivityAt ? new Date(s.lastActivityAt).toISOString().split("T")[0] : "",
        ].join(",");
      }).join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=estudiantes-crm.csv");
      res.send(header + rows);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Student List (paginated) ──
  app.get("/api/admin/crm", requireAdmin, async (req, res) => {
    try {
      const { status, search, page, limit } = req.query;

      const result = await storage.getStudentsCRM({
        status: typeof status === "string" ? status : undefined,
        search: typeof search === "string" ? search : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      });

      // Enrich with class data and tags
      const enriched = await Promise.all(
        result.students.map(async (student) => {
          const classes = await storage.getUserClasses(student.id);
          const completedClasses = classes.filter(c => c.status === "completed").length;
          const trialClass = classes.find(c => c.isTrial);
          const tags = await storage.getUserCrmTags(student.id);

          return {
            ...sanitizeUser(student),
            totalClasses: classes.length,
            completedClasses,
            trialDate: trialClass?.scheduledAt || null,
            trialCompleted: student.trialCompleted,
            classCredits: student.classCredits || 0,
            lastActivityAt: student.lastActivityAt,
            tags,
          };
        })
      );

      // Summary counts from funnel
      const funnel = await storage.getCrmFunnel();
      const summary = {
        total: result.total,
        trial: funnel.find(f => f.stage === "trial")?.count || 0,
        lead: funnel.find(f => f.stage === "lead")?.count || 0,
        customer: funnel.find(f => f.stage === "customer")?.count || 0,
        negotiation: funnel.find(f => f.stage === "negotiation")?.count || 0,
        inactive: funnel.find(f => f.stage === "inactive")?.count || 0,
      };

      res.json({
        students: enriched,
        total: result.total,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        summary,
      });
    } catch (error) {
      console.error("CRM error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Student Stage Update (for Kanban drag) ──
  app.patch("/api/admin/crm/:userId/stage", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { userType } = req.body;
      if (!userType) return res.status(400).json({ message: "userType is required" });
      const user = await storage.updateUser(userId, { userType });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Student Detail ──
  app.get("/api/admin/crm/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const classes = await storage.getUserClasses(userId);
      const notes = await storage.getCrmNotes(userId);
      const tasks = await storage.getCrmTasks({ userId });
      const tags = await storage.getUserCrmTags(userId);

      res.json({
        ...sanitizeUser(user),
        classes,
        notes,
        tasks,
        tags,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Notes for a Student ──
  app.get("/api/admin/crm/:userId/notes", requireAdmin, async (req, res) => {
    try {
      const notes = await storage.getCrmNotes(parseInt(req.params.userId));
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/crm/:userId/notes", requireAdmin, async (req, res) => {
    try {
      const adminUserId = req.session.userId!;
      const note = await storage.createCrmNote({
        userId: parseInt(req.params.userId),
        adminId: adminUserId,
        content: req.body.content,
      });
      res.json(note);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/crm/notes/:noteId", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCrmNote(parseInt(req.params.noteId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Tags for a Student ──
  app.post("/api/admin/crm/:userId/tags", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { tagId } = req.body;
      await storage.addUserCrmTag(userId, tagId);
      const tags = await storage.getUserCrmTags(userId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/crm/:userId/tags/:tagId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const tagId = parseInt(req.params.tagId);
      await storage.removeUserCrmTag(userId, tagId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
