"use server";

import { Resend } from "resend";

export interface ContactPayload {
  name: string;
  email: string;
  msg: string;
}

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function sendContactMessage(data: ContactPayload): Promise<ContactResult> {
  const name = data.name.trim();
  const email = data.email.trim();
  const msg = data.msg.trim();

  if (!name || !email || !msg) {
    return { ok: false, error: "Todos los campos son requeridos." };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "arsubo@gmail.com",
      subject: `Nuevo mensaje de contacto de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}`,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo enviar el mensaje. Intenta de nuevo." };
  }
}
