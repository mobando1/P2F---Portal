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

  // ── Today inbox (actionable daily view) ──
  app.get("/api/admin/crm/today", requireAdmin, async (_req, res) => {
    try {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

      const pendingTasks = await storage.getCrmTasks({ status: "pending" });
      const overdueTasks = pendingTasks.filter((t) => t.dueDate && new Date(t.dueDate) < startOfDay);
      const todayTasks = pendingTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) >= startOfDay && new Date(t.dueDate) <= endOfDay,
      );

      const leadRes = await storage.getStudentsCRM({ status: "lead", limit: 500 });
      const newLeads = leadRes.students
        .filter((u) => u.createdAt && new Date(u.createdAt) >= startOfDay)
        .map(sanitizeUser);

      let trialsToday: any[] = [];
      try {
        const allClasses = await storage.getAllClasses();
        trialsToday = allClasses.filter(
          (c) => c.isTrial && c.scheduledAt && new Date(c.scheduledAt) >= startOfDay && new Date(c.scheduledAt) <= endOfDay,
        );
      } catch (e) {
        console.error("CRM today: failed to load trials:", e);
      }

      res.json({
        overdueTasks,
        todayTasks,
        newLeads,
        trialsToday,
        counts: {
          overdue: overdueTasks.length,
          today: todayTasks.length,
          newLeads: newLeads.length,
          trials: trialsToday.length,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Insights: conversion by source, time-to-convert, trial no-show ──
  app.get("/api/admin/crm/insights", requireAdmin, async (_req, res) => {
    try {
      const { students } = await storage.getStudentsCRM({ limit: 10000 });
      const sourceMap = new Map<string, { leads: number; customers: number }>();
      const convDays: number[] = [];
      for (const s of students) {
        const src = (s as any).leadSource || "unknown";
        const e = sourceMap.get(src) || { leads: 0, customers: 0 };
        e.leads++;
        if (s.userType === "customer") {
          e.customers++;
          const conv = (s as any).convertedToCustomerAt;
          if (conv && s.createdAt) {
            const days = (new Date(conv).getTime() - new Date(s.createdAt).getTime()) / 86400000;
            if (days >= 0 && days < 365) convDays.push(days);
          }
        }
        sourceMap.set(src, e);
      }
      const bySource = Array.from(sourceMap.entries())
        .map(([source, v]) => ({
          source,
          leads: v.leads,
          customers: v.customers,
          rate: v.leads ? Math.round((v.customers / v.leads) * 100) : 0,
        }))
        .sort((a, b) => b.leads - a.leads);
      const avgDaysToConvert = convDays.length
        ? +(convDays.reduce((a, b) => a + b, 0) / convDays.length).toFixed(1)
        : null;

      let trialNoShowRate: number | null = null;
      try {
        const allClasses = await storage.getAllClasses();
        const trials = allClasses.filter((c) => c.isTrial);
        const noShows = trials.filter((c) => (c as any).tutorConfirmation === "no_show").length;
        trialNoShowRate = trials.length ? Math.round((noShows / trials.length) * 100) : 0;
      } catch (e) {
        console.error("CRM insights: failed to load trials:", e);
      }

      res.json({ bySource, avgDaysToConvert, trialNoShowRate });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Bulk actions (change stage / add tag to many) ──
  app.post("/api/admin/crm/bulk", requireAdmin, async (req, res) => {
    try {
      const { ids, action, value } = req.body as { ids: number[]; action: "stage" | "tag"; value: any };
      if (!Array.isArray(ids) || !ids.length || !action) {
        return res.status(400).json({ message: "ids and action are required" });
      }
      let updated = 0;
      for (const id of ids) {
        try {
          if (action === "stage") {
            const patch: any = { userType: value };
            if (value === "customer") patch.convertedToCustomerAt = new Date();
            await storage.updateUser(id, patch);
            updated++;
          } else if (action === "tag") {
            await storage.addUserCrmTag(id, parseInt(value));
            updated++;
          }
        } catch (e) {
          /* skip individual failures */
        }
      }
      res.json({ success: true, updated });
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

      // Enrich with class data and tags (resilient — one failure doesn't break the list)
      const enriched = await Promise.all(
        result.students.map(async (student) => {
          let classes: any[] = [];
          let tags: any[] = [];
          try {
            classes = await storage.getUserClasses(student.id);
          } catch (e) {
            console.error(`CRM: failed to get classes for user ${student.id}:`, e);
          }
          try {
            tags = await storage.getUserCrmTags(student.id);
          } catch (e) {
            console.error(`CRM: failed to get tags for user ${student.id}:`, e);
          }
          const completedClasses = classes.filter(c => c.status === "completed").length;
          const trialClass = classes.find(c => c.isTrial);

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

      // Summary counts from funnel (resilient)
      let summary = { total: result.total, trial: 0, lead: 0, customer: 0, negotiation: 0, inactive: 0 };
      try {
        const funnel = await storage.getCrmFunnel();
        summary = {
          total: result.total,
          trial: funnel.find(f => f.stage === "trial")?.count || 0,
          lead: funnel.find(f => f.stage === "lead")?.count || 0,
          customer: funnel.find(f => f.stage === "customer")?.count || 0,
          negotiation: funnel.find(f => f.stage === "negotiation")?.count || 0,
          inactive: funnel.find(f => f.stage === "inactive")?.count || 0,
        };
      } catch (e) {
        console.error("CRM: failed to get funnel summary:", e);
      }

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
      const patch: any = { userType };
      // Stamp conversion time the first time they become a customer (for time-to-convert)
      if (userType === "customer") {
        const existing = await storage.getUser(userId);
        if (existing && !(existing as any).convertedToCustomerAt) patch.convertedToCustomerAt = new Date();
      }
      const user = await storage.updateUser(userId, patch);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Class Credits Adjustment (manual admin grant: QA, demos, refunds) ──
  app.patch("/api/admin/crm/:userId/credits", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (!Number.isFinite(userId)) {
        return res.status(400).json({ message: "Invalid userId" });
      }
      const { classCredits } = req.body ?? {};
      if (
        typeof classCredits !== "number" ||
        !Number.isInteger(classCredits) ||
        classCredits < 0 ||
        classCredits > 1000
      ) {
        return res
          .status(400)
          .json({ message: "classCredits must be an integer between 0 and 1000" });
      }
      const target = await storage.getUser(userId);
      if (!target) return res.status(404).json({ message: "User not found" });
      if (target.userType === "admin" || target.userType === "tutor") {
        return res
          .status(403)
          .json({ message: "Credits can only be adjusted on student accounts" });
      }
      const previous = target.classCredits ?? 0;
      const user = await storage.updateUser(userId, { classCredits });
      if (!user) return res.status(404).json({ message: "User not found" });
      console.log(
        `[admin] credits adjusted: userId=${userId} by=${req.session.userId} from=${previous} to=${classCredits}`
      );
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("CRM credits update error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ── Delete Student ──
  app.delete("/api/admin/crm/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.userType === "admin") return res.status(403).json({ message: "Cannot delete admin users" });

      // Delete CRM-specific data first
      try {
        const notes = await storage.getCrmNotes(userId);
        for (const note of notes) await storage.deleteCrmNote(note.id);
      } catch {}
      try {
        const tasks = await storage.getCrmTasks({ userId });
        for (const task of tasks) await storage.deleteCrmTask(task.id);
      } catch {}
      try {
        const tags = await storage.getUserCrmTags(userId);
        for (const tag of tags) await storage.removeUserCrmTag(userId, tag.id);
      } catch {}

      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("CRM delete user error:", error);
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

  // ── Log a manual communication (call / sms / whatsapp / email / note) ──
  app.post("/api/admin/crm/:userId/log", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { channel, direction, subject, body } = req.body as {
        channel: string;
        direction?: string;
        subject?: string;
        body?: string;
      };
      if (!channel) return res.status(400).json({ message: "channel is required" });
      const entry = await storage.createCommunicationLog({
        userId,
        channel,
        direction: direction || "outbound",
        subject: subject || null,
        body: body || null,
        status: "sent",
        sentBy: req.session.userId!,
      } as any);
      res.json(entry);
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
