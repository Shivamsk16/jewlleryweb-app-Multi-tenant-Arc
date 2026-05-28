import { appUrl, getAppBaseUrl } from "./app-url";
import { sendEmail } from "./transport";
import {
  passwordResetHtml,
  passwordResetPlainText,
} from "./templates/password-reset";
import {
  tenantWelcomeHtml,
  tenantWelcomePlainText,
} from "./templates/tenant-welcome";

export { appUrl, getAppBaseUrl } from "./app-url";
export { PASSWORD_RESET_EXPIRY_MINUTES } from "./templates/password-reset";

type PasswordResetParams = {
  to: string;
  name: string;
  resetToken: string;
};

type TenantWelcomeParams = {
  to: string;
  adminName: string;
  tenantName: string;
  setupToken: string;
};

export async function sendPasswordResetEmail(params: PasswordResetParams): Promise<void> {
  const resetUrl = appUrl(
    `/reset-password?token=${encodeURIComponent(params.resetToken)}`,
  );

  await sendEmail({
    to: params.to,
    subject: "Reset your JewelFlow password",
    html: passwordResetHtml({ name: params.name, resetUrl }),
    text: passwordResetPlainText({ name: params.name, resetUrl }),
    devLog: { path: "/reset-password", baseUrl: getAppBaseUrl() },
  });
}

export async function sendTenantWelcomeEmail(params: TenantWelcomeParams): Promise<void> {
  const setupUrl = appUrl(
    `/setup-account?token=${encodeURIComponent(params.setupToken)}`,
  );

  await sendEmail({
    to: params.to,
    subject: `You've been invited to JewelFlow — ${params.tenantName}`,
    html: tenantWelcomeHtml({
      adminName: params.adminName,
      tenantName: params.tenantName,
      setupUrl,
    }),
    text: tenantWelcomePlainText({
      adminName: params.adminName,
      tenantName: params.tenantName,
      setupUrl,
    }),
    devLog: { path: "/setup-account", baseUrl: getAppBaseUrl() },
  });
}
