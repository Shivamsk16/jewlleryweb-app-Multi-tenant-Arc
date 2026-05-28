import type { EmailProvider } from "./types";
import { createNodemailerProvider } from "./nodemailer-provider";
import { createResendProvider } from "./resend-provider";

function assertEmailAllowedInProduction(): void {
  if (process.env.NODE_ENV === "production" && process.env.DEV_SKIP_EMAIL === "true") {
    throw new Error("DEV_SKIP_EMAIL must not be enabled in production");
  }
}

export function shouldSkipEmail(): boolean {
  return process.env.DEV_SKIP_EMAIL === "true";
}

export function logSkippedEmail(label: string, details: Record<string, string>): void {
  console.log(`[Email DEV] ${label}`);
  for (const [key, value] of Object.entries(details)) {
    console.log(`[Email DEV] ${key}:`, value);
  }
}

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;

  const kind = (process.env.EMAIL_PROVIDER ?? "nodemailer").toLowerCase();
  if (kind === "resend") {
    provider = createResendProvider();
  } else {
    provider = createNodemailerProvider();
  }
  return provider;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  devLog?: Record<string, string>;
}): Promise<void> {
  assertEmailAllowedInProduction();

  if (shouldSkipEmail()) {
    logSkippedEmail(params.subject, {
      to: params.to,
      ...(params.devLog ?? {}),
    });
    return;
  }

  try {
    await getEmailProvider().send({
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
  } catch (error) {
    const err = error as { message?: string; code?: string };
    console.error("[Email] Send failed:", {
      message: err.message ?? "unknown",
      code: err.code,
      to: params.to,
      subject: params.subject,
    });
    throw error;
  }
}
