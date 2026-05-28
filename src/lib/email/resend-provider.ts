import { Resend } from "resend";
import type { EmailProvider, SendEmailParams } from "./types";

function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM ??
    process.env.RESEND_FROM_EMAIL ??
    "JewelFlow <onboarding@resend.dev>"
  );
}

export function createResendProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be configured when EMAIL_PROVIDER=resend");
  }

  const resend = new Resend(apiKey);

  return {
    async send(params: SendEmailParams): Promise<void> {
      const { error } = await resend.emails.send({
        from: getFromAddress(),
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      if (error) throw error;
    },
  };
}
