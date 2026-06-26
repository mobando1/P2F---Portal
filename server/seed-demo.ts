/**
 * Demo CRM seed — pobla el CRM con datos realistas para demos a clientes.
 *
 * SEGURO: todo lo demo está namespaced y es 100% reversible:
 *   - usuarios:   email LIKE '%@demo.p2f', username 'demo_*'
 *   - campañas/segmentos/templates: name LIKE '[DEMO]%'
 *   - ofertas:    code LIKE 'DEMO-%'
 * El script SIEMPRE limpia su propio namespace antes de insertar (idempotente),
 * por lo que re-ejecutarlo regenera un set demo limpio sin tocar datos reales.
 *
 *   npm run db:seed:demo
 */
import bcrypt from "bcryptjs";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql, inArray, or, type SQL } from "drizzle-orm";
import {
  users, crmTags, crmUserTags, crmNotes, crmTasks,
  emailTemplates, audienceSegments, campaigns, campaignRecipients,
  offers, communicationLog, newsletterSubscribers, contactSubmissions,
} from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to seed the database");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool);

const DEMO_EMAIL_SUFFIX = "@demo.p2f";

// ── helpers ──
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");

type TaskInsert = typeof crmTasks.$inferInsert;
type RecipInsert = typeof campaignRecipients.$inferInsert;
type LogInsert = typeof communicationLog.$inferInsert;
type SubInsert = typeof newsletterSubscribers.$inferInsert;
type ContactInsert = typeof contactSubmissions.$inferInsert;

const FIRST = ["Sofía", "Mateo", "Valentina", "Diego", "Camila", "Andrés", "Lucía", "Daniela", "Santiago", "Isabella", "Sebastián", "Mariana", "Emily", "Michael", "Jessica", "David", "Laura", "Carlos", "Ana", "Tomás", "Gabriela", "Felipe", "Renata", "Joaquín"];
const LAST = ["Restrepo", "Herrera", "Ruiz", "Salazar", "Torres", "Gómez", "Fernández", "Castro", "Vargas", "Moreno", "Johnson", "Brown", "Smith", "García", "Mendoza", "Ríos", "Ortega", "Delgado", "Navarro", "Cruz"];
const PHONES = ["+57 300", "+57 310", "+52 55", "+52 33", "+1 305", "+1 786", "+1 212"];
const LEVELS = ["A1", "A1", "A2", "A2", "B1", "B1", "B2"];
const TZ = ["America/Bogota", "America/Mexico_City", "America/New_York"];
const CUR = ["USD", "COP", "MXN"];

interface StageSpec { type: string; count: number; }
const STAGES: StageSpec[] = [
  { type: "trial", count: 12 },
  { type: "lead", count: 18 },
  { type: "negotiation", count: 8 },
  { type: "customer", count: 16 },
  { type: "inactive", count: 6 },
];

async function clearDemo() {
  console.log("Limpiando datos demo previos (namespace @demo.p2f / [DEMO] / DEMO-)...");
  const demoUsers = await db.select({ id: users.id }).from(users).where(sql`${users.email} LIKE ${"%" + DEMO_EMAIL_SUFFIX}`);
  const demoUserIds = demoUsers.map((u) => u.id);
  const demoCampaigns = await db.select({ id: campaigns.id }).from(campaigns).where(sql`${campaigns.name} LIKE ${"[DEMO]%"}`);
  const demoCampaignIds = demoCampaigns.map((c) => c.id);

  {
    const conds: SQL[] = [];
    if (demoUserIds.length) conds.push(inArray(communicationLog.userId, demoUserIds));
    if (demoCampaignIds.length) conds.push(inArray(communicationLog.campaignId, demoCampaignIds));
    if (demoUserIds.length) conds.push(inArray(communicationLog.sentBy, demoUserIds));
    if (conds.length) await db.delete(communicationLog).where(or(...conds));
  }
  {
    const conds: SQL[] = [];
    if (demoCampaignIds.length) conds.push(inArray(campaignRecipients.campaignId, demoCampaignIds));
    if (demoUserIds.length) conds.push(inArray(campaignRecipients.userId, demoUserIds));
    if (conds.length) await db.delete(campaignRecipients).where(or(...conds));
  }
  await db.delete(campaigns).where(sql`${campaigns.name} LIKE ${"[DEMO]%"}`);
  if (demoUserIds.length) {
    await db.delete(crmNotes).where(or(inArray(crmNotes.userId, demoUserIds), inArray(crmNotes.adminId, demoUserIds)));
    await db.delete(crmTasks).where(or(inArray(crmTasks.userId, demoUserIds), inArray(crmTasks.assignedTo, demoUserIds)));
    await db.delete(crmUserTags).where(inArray(crmUserTags.userId, demoUserIds));
  }
  await db.delete(audienceSegments).where(sql`${audienceSegments.name} LIKE ${"[DEMO]%"}`);
  await db.delete(emailTemplates).where(sql`${emailTemplates.name} LIKE ${"[DEMO]%"}`);
  await db.delete(offers).where(sql`${offers.code} LIKE ${"DEMO-%"}`);
  await db.delete(newsletterSubscribers).where(sql`${newsletterSubscribers.email} LIKE ${"%" + DEMO_EMAIL_SUFFIX}`);
  await db.delete(contactSubmissions).where(sql`${contactSubmissions.email} LIKE ${"%" + DEMO_EMAIL_SUFFIX}`);
  if (demoUserIds.length) {
    await db.delete(users).where(inArray(users.id, demoUserIds));
  }
  console.log(`  ✓ removidos ${demoUserIds.length} usuarios demo y entidades asociadas`);
}

async function seedDemo() {
  await clearDemo();
  console.log("\nSembrando datos demo del CRM...");
  const pw = await bcrypt.hash("demo1234", 10);

  // ── Demo admin (owner de notas/tareas/campañas; excluido del pipeline) ──
  const [admin] = await db
    .insert(users)
    .values({
      username: "demo_admin",
      email: "demo.admin" + DEMO_EMAIL_SUFFIX,
      password: pw,
      firstName: "Demo",
      lastName: "Admin",
      userType: "admin",
      trialCompleted: false,
      classCredits: 0,
    })
    .returning({ id: users.id });
  const adminId = admin.id;

  // ── Tags (reusados por nombre único entre corridas) ──
  const TAGS = [
    { name: "Hot Lead", color: "#EF4444" },
    { name: "Kids", color: "#F59E0B" },
    { name: "Adults", color: "#1C7BB1" },
    { name: "Spanish", color: "#22C55E" },
    { name: "English", color: "#0A4A6E" },
    { name: "Corporate", color: "#7C3AED" },
    { name: "Referral", color: "#EC4899" },
    { name: "Reactivation", color: "#94A3B8" },
  ];
  await db.insert(crmTags).values(TAGS).onConflictDoNothing({ target: crmTags.name });
  const tagRows = await db.select({ id: crmTags.id, name: crmTags.name }).from(crmTags);
  const tagId = (name: string) => tagRows.find((t) => t.name === name)?.id;

  // ── Users por stage ──
  const userRows: { id: number; userType: string; firstName: string; lastName: string; email: string }[] = [];
  let n = 0;
  for (const stage of STAGES) {
    for (let i = 0; i < stage.count; i++) {
      n++;
      const first = pick(FIRST);
      const last = pick(LAST);
      const created =
        stage.type === "trial" ? daysAgo(rand(0, 21))
        : stage.type === "negotiation" ? daysAgo(rand(7, 45))
        : daysAgo(rand(5, 90));
      const lastAct =
        stage.type === "inactive" ? daysAgo(rand(46, 89))
        : stage.type === "negotiation" ? daysAgo(rand(0, 6))
        : daysAgo(rand(0, 14));
      const [row] = await db
        .insert(users)
        .values({
          username: `demo_${slug(first)}${slug(last)}${n}`,
          email: `${slug(first)}.${slug(last)}${n}${DEMO_EMAIL_SUFFIX}`,
          password: pw,
          firstName: first,
          lastName: last,
          phone: `${pick(PHONES)} ${rand(1000000, 9999999)}`,
          level: pick(LEVELS),
          userType: stage.type,
          trialCompleted: stage.type !== "trial",
          classCredits: stage.type === "customer" ? rand(4, 20) : stage.type === "trial" ? 1 : 0,
          aiSubscriptionActive: stage.type === "customer" && Math.random() > 0.5,
          preferredLanguage: Math.random() > 0.5 ? "es" : "en",
          timezone: pick(TZ),
          currency: pick(CUR),
          emailVerified: stage.type !== "trial",
          lastActivityAt: lastAct,
          createdAt: created,
        })
        .returning({ id: users.id, userType: users.userType, firstName: users.firstName, lastName: users.lastName, email: users.email });
      userRows.push(row);
    }
  }
  console.log(`  ✓ ${userRows.length} contactos por etapa`);

  // ── User tags (1-3 por ~70% de los usuarios) ──
  const tagLinks: { userId: number; tagId: number }[] = [];
  for (const u of userRows) {
    if (Math.random() > 0.3) {
      const pool2 = [...TAGS];
      const k = rand(1, 3);
      for (let j = 0; j < k && pool2.length; j++) {
        const t = pool2.splice(rand(0, pool2.length - 1), 1)[0];
        const id = tagId(t.name);
        if (id) tagLinks.push({ userId: u.id, tagId: id });
      }
    }
  }
  if (tagLinks.length) await db.insert(crmUserTags).values(tagLinks);
  console.log(`  ✓ ${tagLinks.length} etiquetas asignadas`);

  // ── Notes ──
  const NOTE_TEXTS = [
    "Interesada en plan Premium, pidió descuento para 3 meses.",
    "Pagó primer paquete, asignar tutor de kids.",
    "No contesta hace 2 semanas, intentar por WhatsApp.",
    "Quiere clases de Business English para su equipo.",
    "Prefiere horarios de noche (después de 7pm).",
    "Refiere a P2F una amiga, aplicar descuento referral.",
    "Completó trial, muy motivada con el learning path.",
  ];
  const notes: { userId: number; adminId: number; content: string; createdAt: Date }[] = [];
  for (const u of userRows) {
    if (Math.random() > 0.6) {
      const k = rand(1, 2);
      for (let j = 0; j < k; j++) notes.push({ userId: u.id, adminId, content: pick(NOTE_TEXTS), createdAt: daysAgo(rand(0, 40)) });
    }
  }
  if (notes.length) await db.insert(crmNotes).values(notes);
  console.log(`  ✓ ${notes.length} notas`);

  // ── Tasks (vencidas / pendientes / completadas) ──
  const TASK_TITLES = ["Llamar para cerrar paquete", "Enviar propuesta corporativa", "Agendar trial", "Seguimiento de pago", "Confirmar horario de clase", "Enviar material de bienvenida", "Recordatorio de renovación"];
  const tasks: TaskInsert[] = [];
  for (let i = 0; i < 6; i++) tasks.push({ userId: pick(userRows).id, assignedTo: adminId, title: `${pick(TASK_TITLES)} — ${pick(FIRST)}`, dueDate: daysAgo(rand(1, 10)), priority: pick(["high", "medium", "high"]), status: "pending" });
  for (let i = 0; i < 8; i++) tasks.push({ userId: Math.random() > 0.4 ? pick(userRows).id : null, assignedTo: adminId, title: pick(TASK_TITLES), dueDate: daysAhead(rand(1, 14)), priority: pick(["low", "medium", "high"]), status: "pending" });
  for (let i = 0; i < 6; i++) tasks.push({ userId: pick(userRows).id, assignedTo: adminId, title: pick(TASK_TITLES), dueDate: daysAgo(rand(5, 30)), priority: pick(["low", "medium"]), status: "completed", completedAt: daysAgo(rand(1, 20)) });
  await db.insert(crmTasks).values(tasks);
  console.log(`  ✓ ${tasks.length} tareas`);

  // ── Email templates ──
  const [tplWelcomeEs, tplWelcomeEn, tplReactivar, tplReminder, tplPromo] = await db
    .insert(emailTemplates)
    .values([
      { name: "[DEMO] Bienvenida Trial", subject: "¡Bienvenido a Passport2Fluency, {{firstName}}!", body: "Hola {{firstName}}, reserva tu primera clase gratis hoy.", channel: "email", category: "transactional", language: "es", createdBy: adminId },
      { name: "[DEMO] Welcome Trial", subject: "Welcome to Passport2Fluency, {{firstName}}!", body: "Hi {{firstName}}, book your first free class today.", channel: "email", category: "transactional", language: "en", createdBy: adminId },
      { name: "[DEMO] Oferta Reactivación", subject: "Te extrañamos, {{firstName}} 🎁", body: "Vuelve con {{offerCode}} y obtén un descuento especial.", channel: "email", category: "marketing", language: "es", createdBy: adminId },
      { name: "[DEMO] Class Reminder", subject: "Your class is coming up, {{firstName}}", body: "Reminder: your next class is scheduled soon.", channel: "email", category: "transactional", language: "en", createdBy: adminId },
      { name: "[DEMO] Promo Verano", subject: "Verano de fluidez ☀️", body: "Aprovecha {{offerCode}} antes de que termine el verano.", channel: "email", category: "marketing", language: "es", createdBy: adminId },
    ])
    .returning({ id: emailTemplates.id });
  console.log("  ✓ 5 templates de email");

  // ── Offers ──
  const offerRows = await db
    .insert(offers)
    .values([
      { name: "[DEMO] Bienvenida 20%", code: "DEMO-WELCOME20", discountType: "percentage", discountValue: "20.00", applicableTo: "all", maxUses: 100, usedCount: rand(5, 40), validFrom: daysAgo(20), validUntil: daysAhead(30), isActive: true, createdBy: adminId },
      { name: "[DEMO] Reactivación $15", code: "DEMO-COMEBACK15", discountType: "fixed", discountValue: "15.00", applicableTo: "subscriptions", maxUses: 50, usedCount: rand(2, 15), validFrom: daysAgo(10), validUntil: daysAhead(14), isActive: true, createdBy: adminId },
      { name: "[DEMO] Verano 30%", code: "DEMO-VERANO30", discountType: "percentage", discountValue: "30.00", applicableTo: "packages", maxUses: 80, usedCount: rand(8, 30), validFrom: daysAgo(5), validUntil: daysAhead(45), isActive: true, createdBy: adminId },
      { name: "[DEMO] Black Friday (expirada)", code: "DEMO-BF2025", discountType: "percentage", discountValue: "40.00", applicableTo: "all", maxUses: 200, usedCount: rand(40, 120), validFrom: daysAgo(60), validUntil: daysAgo(10), isActive: false, createdBy: adminId },
    ])
    .returning({ id: offers.id });
  console.log("  ✓ 4 ofertas");

  // ── Segments ──
  const segRows = await db
    .insert(audienceSegments)
    .values([
      { name: "[DEMO] Trials sin convertir", description: "Usuarios en trial que aún no completan", filters: { logic: "AND", rules: [{ field: "userType", operator: "equals", value: "trial" }, { field: "trialCompleted", operator: "equals", value: false }] }, createdBy: adminId },
      { name: "[DEMO] Inactivos +30 días", description: "Sin actividad reciente", filters: { logic: "AND", rules: [{ field: "daysSinceLastActivity", operator: "greaterThan", value: 30 }] }, createdBy: adminId },
      { name: "[DEMO] Customers A1/A2", description: "Clientes de nivel inicial", filters: { logic: "AND", rules: [{ field: "userType", operator: "equals", value: "customer" }, { field: "level", operator: "in", value: ["A1", "A2"] }] }, createdBy: adminId },
      { name: "[DEMO] Hot Leads", description: "Etiquetados como Hot Lead", filters: { logic: "OR", rules: [{ field: "crmTags", operator: "includes", value: "Hot Lead" }] }, createdBy: adminId },
    ])
    .returning({ id: audienceSegments.id });
  console.log("  ✓ 4 segmentos");

  // ── Campaigns + recipients + communication log ──
  interface CampSpec { name: string; status: string; recipients: number; sent: number; tpl: number; seg: number; offer?: number; daysOffset: number; }
  const campSpecs: CampSpec[] = [
    { name: "[DEMO] Bienvenida Q2", status: "sent", recipients: 30, sent: 30, tpl: tplWelcomeEs.id, seg: segRows[0].id, daysOffset: -25 },
    { name: "[DEMO] Reactivación Mayo", status: "sent", recipients: 12, sent: 12, tpl: tplReactivar.id, seg: segRows[1].id, offer: offerRows[1].id, daysOffset: -18 },
    { name: "[DEMO] Promo Verano", status: "sending", recipients: 25, sent: 18, tpl: tplPromo.id, seg: segRows[2].id, offer: offerRows[2].id, daysOffset: -1 },
    { name: "[DEMO] Newsletter Junio", status: "scheduled", recipients: 40, sent: 0, tpl: tplReminder.id, seg: segRows[2].id, daysOffset: 3 },
    { name: "[DEMO] Cierre negociaciones", status: "draft", recipients: 0, sent: 0, tpl: tplWelcomeEn.id, seg: segRows[3].id, daysOffset: 0 },
    { name: "[DEMO] BF cancelada", status: "cancelled", recipients: 20, sent: 0, tpl: tplPromo.id, seg: segRows[0].id, offer: offerRows[3].id, daysOffset: -40 },
  ];

  for (const c of campSpecs) {
    const opened = Math.round(c.sent * 0.4);
    const clicked = Math.round(c.sent * 0.1);
    const [camp] = await db
      .insert(campaigns)
      .values({
        name: c.name,
        templateId: c.tpl,
        segmentId: c.seg,
        channel: "email",
        status: c.status,
        offerId: c.offer ?? null,
        scheduledAt: c.status === "scheduled" ? daysAhead(c.daysOffset) : null,
        sentAt: c.status === "sent" || c.status === "sending" ? daysAgo(-c.daysOffset) : null,
        totalRecipients: c.recipients,
        totalSent: c.sent,
        totalOpened: opened,
        totalClicked: clicked,
        createdBy: adminId,
      })
      .returning({ id: campaigns.id });

    if (c.sent > 0) {
      const targets = [...userRows].sort(() => Math.random() - 0.5).slice(0, c.sent);
      const recips: RecipInsert[] = [];
      const logs: LogInsert[] = [];
      targets.forEach((u, idx) => {
        const isClicked = idx < clicked;
        const isOpened = idx < opened;
        const status = isClicked ? "clicked" : isOpened ? "opened" : "sent";
        const sentAt = daysAgo(-c.daysOffset + rand(0, 1));
        recips.push({
          campaignId: camp.id,
          userId: u.id,
          status,
          sentAt,
          openedAt: isOpened ? sentAt : null,
          clickedAt: isClicked ? sentAt : null,
          renderedSubject: c.name.replace("[DEMO] ", ""),
        });
        logs.push({ userId: u.id, channel: "email", direction: "outbound", subject: c.name.replace("[DEMO] ", ""), body: "Campaign email", campaignId: camp.id, status, sentBy: adminId, createdAt: sentAt });
      });
      await db.insert(campaignRecipients).values(recips);
      await db.insert(communicationLog).values(logs);
    }
  }
  console.log(`  ✓ ${campSpecs.length} campañas con destinatarios y métricas`);

  // ── Communication log adicional (manual / inbound) para timelines vivos ──
  const extraLogs: LogInsert[] = [];
  for (const u of userRows) {
    const k = rand(0, 3);
    for (let j = 0; j < k; j++) {
      const inbound = Math.random() > 0.7;
      extraLogs.push({
        userId: u.id,
        channel: pick(["email", "sms", "in_app"]),
        direction: inbound ? "inbound" : "outbound",
        subject: inbound ? "Re: tu consulta" : pick(["Seguimiento", "Recordatorio de clase", "Oferta especial"]),
        body: inbound ? "Gracias, me interesa." : "Mensaje de seguimiento del equipo P2F.",
        status: pick(["sent", "delivered", "opened"]),
        sentBy: inbound ? null : adminId,
        createdAt: daysAgo(rand(0, 50)),
      });
    }
  }
  if (extraLogs.length) await db.insert(communicationLog).values(extraLogs);
  console.log(`  ✓ ${extraLogs.length} comunicaciones individuales`);

  // ── Newsletter subscribers ──
  const subs: SubInsert[] = [];
  for (let i = 0; i < 25; i++) {
    const first = pick(FIRST);
    const last = pick(LAST);
    subs.push({
      email: `news.${slug(first)}${slug(last)}${i}${DEMO_EMAIL_SUFFIX}`,
      firstName: first,
      lastName: last,
      source: pick(["website", "contact_form", "checkout"]),
      status: i < 22 ? "active" : "unsubscribed",
      subscribedAt: daysAgo(rand(1, 80)),
      unsubscribedAt: i >= 22 ? daysAgo(rand(1, 20)) : null,
    });
  }
  await db.insert(newsletterSubscribers).values(subs).onConflictDoNothing({ target: newsletterSubscribers.email });
  console.log(`  ✓ ${subs.length} suscriptores de newsletter`);

  // ── Contact submissions (varios 'new') ──
  const CONTACT_MSGS = [
    { subject: "Clases para niños", message: "Quiero info de clases de inglés para mi hija de 8 años." },
    { subject: "Business Spanish", message: "Business Spanish for my team of 5 people." },
    { subject: "Horarios", message: "¿Tienen horarios los fines de semana?" },
    { subject: "Precios", message: "Me gustaría conocer los planes y precios." },
  ];
  const subm: ContactInsert[] = [];
  for (let i = 0; i < 10; i++) {
    const first = pick(FIRST);
    const last = pick(LAST);
    const msg = pick(CONTACT_MSGS);
    subm.push({
      name: `${first} ${last}`,
      email: `contact.${slug(first)}${slug(last)}${i}${DEMO_EMAIL_SUFFIX}`,
      phone: `${pick(PHONES)} ${rand(1000000, 9999999)}`,
      level: pick(LEVELS),
      subject: msg.subject,
      message: msg.message,
      preferredContact: pick(["email", "phone", "whatsapp"]),
      status: i < 5 ? "new" : pick(["read", "replied"]),
      createdAt: daysAgo(rand(0, 30)),
    });
  }
  await db.insert(contactSubmissions).values(subm);
  console.log(`  ✓ ${subm.length} solicitudes de contacto`);

  console.log("\n✅ Demo CRM seed completado.");
}

seedDemo()
  .then(() => pool.end())
  .catch((err) => {
    console.error("Demo seed failed:", err);
    pool.end();
    process.exit(1);
  });
