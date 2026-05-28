import nodemailer from "nodemailer";
import type { EmailProvider, SendEmailParams } from "./types";

function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM ??
    (process.env.SMTP_USER ? `JewelFlow <${process.env.SMTP_USER}>` : "JewelFlow <noreply@localhost>")
  );
}

export function createNodemailerProvider(): EmailProvider {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be configured for email delivery");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return {
    async send(params: SendEmailParams): Promise<void> {
      await transporter.sendMail({
        from: getFromAddress(),
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
    },
  };
}
