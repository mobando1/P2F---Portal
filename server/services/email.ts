import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = "Passport2Fluency <noreply@passport2fluency.com>";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!resend) {
    console.log(`[Email Mock] To: ${params.to} | Subject: ${params.subject}`);
    return true;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

async function sendEmailWithId(params: EmailParams): Promise<string | null> {
  if (!resend) {
    console.log(`[Email Mock] To: ${params.to} | Subject: ${params.subject}`);
    return `mock_${Date.now()}`;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return (result as any).id || null;
  } catch (error) {
    console.error("Error sending email:", error);
    return null;
  }
}

function brandHeader(title: string): string {
  return `
    <div style="background: linear-gradient(135deg, #1C7BB1, #0A4A6E); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-family: Arial, sans-serif; font-size: 22px;">${title}</h1>
    </div>
  `;
}

function brandFooter(lang: "es" | "en"): string {
  const text = lang === "es" ? "Passport2Fluency — Tu camino hacia la fluidez" : "Passport2Fluency — Your path to fluency";
  return `
    <div style="background: #f8f9fa; padding: 16px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0; font-family: Arial, sans-serif;">${text}</p>
    </div>
  `;
}

function wrapTemplate(title: string, body: string, lang: "es" | "en"): string {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      ${brandHeader(title)}
      <div style="padding: 24px;">
        ${body}
      </div>
      ${brandFooter(lang)}
    </div>
  `;
}

export const emailService = {
  async sendBookingConfirmation(params: {
    to: string;
    studentName: string;
    tutorName: string;
    date: string;
    time: string;
    meetingLink?: string;
    lang: "es" | "en";
  }): Promise<boolean> {
    const { to, studentName, tutorName, date, time, meetingLink, lang } = params;
    const isEs = lang === "es";

    const subject = isEs ? `Clase confirmada con ${tutorName}` : `Class confirmed with ${tutorName}`;
    const body = `
      <p style="color: #374151; font-size: 16px;">${isEs ? "Hola" : "Hi"} <strong>${studentName}</strong>,</p>
      <p style="color: #374151;">${isEs ? "Tu clase ha sido reservada exitosamente:" : "Your class has been booked successfully:"}</p>
      <div style="background: #EAF4FA; border-left: 4px solid #1C7BB1; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 4px 0; color: #0A4A6E;"><strong>${isEs ? "Profesor:" : "Tutor:"}</strong> ${tutorName}</p>
        <p style="margin: 4px 0; color: #0A4A6E;"><strong>${isEs ? "Fecha:" : "Date:"}</strong> ${date}</p>
        <p style="margin: 4px 0; color: #0A4A6E;"><strong>${isEs ? "Hora:" : "Time:"}</strong> ${time}</p>
      </div>
      ${meetingLink ? `<p style="margin: 16px 0;"><a href="${meetingLink}" style="background: #1C7BB1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">${isEs ? "Unirse a la clase" : "Join class"}</a></p>` : ""}
    `;

    return sendEmail({ to, subject, html: wrapTemplate(isEs ? "Clase Confirmada" : "Class Confirmed", body, lang) });
  },

  async sendCancellationNotification(params: {
    to: string;
    name: string;
    tutorName: string;
    date: string;
    lang: "es" | "en";
  }): Promise<boolean> {
    const { to, name, tutorName, date, lang } = params;
    const isEs = lang === "es";

    const subject = isEs ? `Clase cancelada — ${date}` : `Class cancelled — ${date}`;
    const body = `
      <p style="color: #374151; font-size: 16px;">${isEs ? "Hola" : "Hi"} <strong>${name}</strong>,</p>
      <p style="color: #374151;">${isEs
        ? `Tu clase con ${tutorName} programada para el ${date} ha sido cancelada.`
        : `Your class with ${tutorName} scheduled for ${date} has been cancelled.`}</p>
      <p style="color: #374151;">${isEs ? "Tu crédito de clase ha sido devuelto." : "Your class credit has been refunded."}</p>
    `;

    return sendEmail({ to, subject, html: wrapTemplate(isEs ? "Clase Cancelada" : "Class Cancelled", body, lang) });
  },

  async sendClassReminder(params: {
    to: string;
    name: string;
    tutorName: string;
    date: string;
    time: string;
    meetingLink?: string;
    lang: "es" | "en";
  }): Promise<boolean> {
    const { to, name, tutorName, date, time, meetingLink, lang } = params;
    const isEs = lang === "es";

    const subject = isEs ? `Recordatorio: Clase mañana con ${tutorName}` : `Reminder: Class tomorrow with ${tutorName}`;
    const body = `
      <p style="color: #374151; font-size: 16px;">${isEs ? "Hola" : "Hi"} <strong>${name}</strong>,</p>
      <p style="color: #374151;">${isEs ? "Te recordamos que tienes una clase programada:" : "This is a reminder about your upcoming class:"}</p>
      <div style="background: #FFF7ED; border-left: 4px solid #F59E1C; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 4px 0; color: #0A4A6E;"><strong>${isEs ? "Profesor:" : "Tutor:"}</strong> ${tutorName}</p>
        <p style="margin: 4px 0; color: #0A4A6E;"><strong>${isEs ? "Fecha:" : "Date:"}</strong> ${date}</p>
        <p style="margin: 4px 0; color: #0A4A6E;"><strong>${isEs ? "Hora:" : "Time:"}</strong> ${time}</p>
      </div>
      ${meetingLink ? `<p style="margin: 16px 0;"><a href="${meetingLink}" style="background: #F59E1C; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">${isEs ? "Unirse a la clase" : "Join class"}</a></p>` : ""}
    `;

    return sendEmail({ to, subject, html: wrapTemplate(isEs ? "Recordatorio de Clase" : "Class Reminder", body, lang) });
  },

  // === Drip Campaign Emails ===

  async sendWelcomeEmail(params: { to: string; name: string; lang: "es" | "en" }): Promise<boolean> {
    const { to, name, lang } = params;
    const isEs = lang === "es";
    const subject = isEs ? "¡Bienvenido a Passport2Fluency!" : "Welcome to Passport2Fluency!";
    const body = `
      <p style="color: #374151; font-size: 16px;">${isEs ? "Hola" : "Hi"} <strong>${name}</strong>,</p>
      <p style="color: #374151;">${isEs
        ? "¡Bienvenido a Passport2Fluency! Estamos emocionados de tenerte aquí."
        : "Welcome to Passport2Fluency! We're excited to have you."}</p>
      <p style="color: #374151;">${isEs
        ? "Tienes una <strong>clase de prueba gratis</strong> esperándote. Reserva ahora con uno de nuestros tutores expertos."
        : "You have a <strong>free trial class</strong> waiting for you. Book now with one of our expert tutors."}</p>
      <p style="margin: 16px 0;"><a href="https://portal.passport2fluency.com/tutors" style="background: #F59E1C; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">${isEs ? "Reservar Clase Gratis" : "Book Free Class"}</a></p>
    `;
    return sendEmail({ to, subject, html: wrapTemplate(isEs ? "¡Bienvenido!" : "Welcome!", body, lang) });
  },

  async sendPreClassTips(params: { to: string; name: string; tutorName: string; date: string; lang: "es" | "en" }): Promise<boolean> {
    const { to, name, tutorName, date, lang } = params;
    const isEs = lang === "es";
    const subject = isEs ? `Tips para tu clase con ${tutorName}` : `Tips for your class with ${tutorName}`;
    const body = `
      <p style="color: #374151; font-size: 16px;">${isEs ? "Hola" : "Hi"} <strong>${name}</strong>,</p>
      <p style="color: #374151;">${isEs
        ? `Tu clase con ${tutorName} está programada para el ${date}. ¡Aquí van algunos tips!`
        : `Your class with ${tutorName} is scheduled for ${date}. Here are some tips!`}</p>
      <div style="background: #EAF4FA; padding: 16px; margin: 16px 0; border-radius: 8px;">
        <ul style="color: #0A4A6E; margin: 0; padding-left: 20px;">
          <li style="margin: 8px 0;">${isEs ? "Busca un lugar tranquilo sin distracciones" : "Find a quiet space without distractions"}</li>
          <li style="margin: 8px 0;">${isEs ? "Ten papel y lápiz a mano para tomar notas" : "Have pen and paper ready for notes"}</li>
          <li style="margin: 8px 0;">${isEs ? "No tengas miedo de cometer errores — ¡así se aprende!" : "Don't be afraid to make mistakes — that's how you learn!"}</li>
        </ul>
      </div>
    `;
    return sendEmail({ to, subject, html: wrapTemplate(isEs ? "Tips Pre-Clase" : "Pre-Class Tips", body, lang) });
  },

  async sendFeedbackRequest(params: { to: string; name: string; lang: "es" | "en" }): Promise<boolean> {
    const { to, name, lang } = params;
    const isEs = lang === "es";
    const subject = isEs ? "¿Cómo fue tu clase de prueba?" : "How was your trial class?";
    const body = `
      <p style="color: #374151; font-size: 16px;">${isEs ? "Hola" : "Hi"} <strong>${name}</strong>,</p>
      <p style="color: #374151;">${isEs
        ? "¡Esperamos que hayas disfrutado tu clase de prueba! Nos encantaría saber cómo te fue."
        : "We hope you enjoyed your trial class! We'd love to know how it went."}</p>
      <p style="color: #374151;">${isEs
        ? "¿Listo para continuar tu camino hacia la fluidez? Tienes <strong>1 crédito de clase gratis</strong> para reservar tu siguiente sesión."
        : "Ready to continue your path to fluency? You have <strong>1 free class credit</strong> to book your next session."}</p>
      <p style="margin: 16px 0;"><a href="https://portal.passport2fluency.com/packages" style="background: #1C7BB1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">${isEs ? "Ver Planes" : "View Plans"}</a></p>
    `;
    return sendEmail({ to, subject, html: wrapTemplate(isEs ? "¿Cómo te fue?" : "How was it?", body, lang) });
  },

  async sendDiscountReminder(params: { to: string; name: string; discountPercent: number; lang: "es" | "en" }): Promise<boolean> {
    const { to, name, discountPercent, lang } = params;
    const isEs = lang === "es";
    const subject = isEs ? `${discountPercent}% de descuento — ¡Solo por tiempo limitado!` : `${discountPercent}% off — Limited time only!`;
    const body = `
      <p style="color: #374151; font-size: 16px;">${isEs ? "Hola" : "Hi"} <strong>${name}</strong>,</p>
      <p style="color: #374151;">${isEs
        ? `¡No dejes pasar esta oportunidad! Te ofrecemos un <strong>${discountPercent}% de descuento</strong> en tu primer paquete de clases.`
        : `Don't miss this opportunity! We're offering you <strong>${discountPercent}% off</strong> your first class package.`}</p>
      <p style="margin: 16px 0;"><a href="https://portal.passport2fluency.com/packages" style="background: #F59E1C; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">${isEs ? "Comprar con Descuento" : "Buy with Discount"}</a></p>
    `;
    return sendEmail({ to, subject, html: wrapTemplate(isEs ? "Oferta Especial" : "Special Offer", body, lang) });
  },

  async sendLastChance(params: { to: string; name: string; discountPercent: number; lang: "es" | "en" }): Promise<boolean> {
    const { to, name, discountPercent, lang } = params;
    const isEs = lang === "es";
    const subject = isEs ? "Última oportunidad — Tu descuento expira pronto" : "Last chance — Your discount expires soon";
    const body = `
      <p style="color: #374151; font-size: 16px;">${isEs ? "Hola" : "Hi"} <strong>${name}</strong>,</p>
      <p style="color: #374151; font-size: 18px; font-weight: bold;">${isEs ? "⏰ ¡Última oportunidad!" : "⏰ Last chance!"}</p>
      <p style="color: #374151;">${isEs
        ? `Tu descuento del <strong>${discountPercent}%</strong> expira pronto. No pierdas la oportunidad de mejorar tu idioma con los mejores tutores.`
        : `Your <strong>${discountPercent}%</strong> discount expires soon. Don't miss your chance to improve your language skills with top tutors.`}</p>
      <p style="margin: 16px 0;"><a href="https://portal.passport2fluency.com/packages" style="background: #EF4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">${isEs ? "Aprovechar Descuento" : "Claim Discount"}</a></p>
    `;
    return sendEmail({ to, subject, html: wrapTemplate(isEs ? "Última Oportunidad" : "Last Chance", body, lang) });
  },

  async sendTutorNewBooking(params: {
    to: string;
    tutorName: string;
    studentName: string;
    date: string;
    time: string;
    lang: "es" | "en";
  }): Promise<boolean> {
    const { to, tutorName, studentName, date, time, lang } = params;
    const isEs = lang === "es";

    const subject = isEs ? `Nueva clase agendada — ${studentName}` : `New class booked — ${studentName}`;
    const body = `
      <p style="color: #374151; font-size: 16px;">${isEs ? "Hola" : "Hi"} <strong>${tutorName}</strong>,</p>
      <p style="color: #374151;">${isEs ? "Tienes una nueva clase agendada:" : "You have a new class booked:"}</p>
      <div style="background: #EAF4FA; border-left: 4px solid #1C7BB1; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 4px 0; color: #0A4A6E;"><strong>${isEs ? "Estudiante:" : "Student:"}</strong> ${studentName}</p>
        <p style="margin: 4px 0; color: #0A4A6E;"><strong>${isEs ? "Fecha:" : "Date:"}</strong> ${date}</p>
        <p style="margin: 4px 0; color: #0A4A6E;"><strong>${isEs ? "Hora:" : "Time:"}</strong> ${time}</p>
      </div>
    `;

    return sendEmail({ to, subject, html: wrapTemplate(isEs ? "Nueva Clase" : "New Class", body, lang) });
  },

  async sendCampaignEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ sent: boolean; messageId: string | null }> {
    // Campaign emails come pre-formatted with their own HTML,
    // just wrap them with the brand header/footer
    const wrappedHtml = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        ${brandHeader("Passport2Fluency")}
        <div style="padding: 24px;">
          ${params.html}
        </div>
        ${brandFooter("es")}
      </div>
    `;
    const messageId = await sendEmailWithId({ to: params.to, subject: params.subject, html: wrappedHtml });
    return { sent: messageId !== null, messageId };
  },
};
