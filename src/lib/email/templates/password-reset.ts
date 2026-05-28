import { escapeHtml } from "../escape";

export const PASSWORD_RESET_EXPIRY_MINUTES = Number(
  process.env.PASSWORD_RESET_TTL_MINUTES ?? "30",
);

type PasswordResetTemplateParams = {
  name: string;
  resetUrl: string;
};

export function passwordResetHtml(params: PasswordResetTemplateParams): string {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:8px;padding:32px;">
    <tr>
      <td>
        <p style="font-family:Georgia,serif;font-size:24px;color:#2C5F7C;margin:0 0 24px;font-weight:bold;">JewelFlow</p>
        <p style="font-size:16px;color:#333;margin:0 0 16px;">Hello ${escapeHtml(params.name)},</p>
        <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
          We received a request to reset your password. Click the button below to choose a new password.
        </p>
        <p style="margin:0 0 24px;">
          <a href="${params.resetUrl}" style="display:inline-block;background:#2C5F7C;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:bold;">
            Reset Password
          </a>
        </p>
        <p style="font-size:12px;color:#888;line-height:1.5;margin:0 0 16px;">
          Or copy and paste this link into your browser:<br />
          <span style="word-break:break-all;">${escapeHtml(params.resetUrl)}</span>
        </p>
        <p style="font-size:12px;color:#888;line-height:1.5;margin:0 0 24px;">
          This link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes. If you did not request a password reset, you can safely ignore this email—your password will not change.
        </p>
        <p style="font-size:11px;color:#aaa;margin:0;">© ${year} JewelFlow</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function passwordResetPlainText(params: PasswordResetTemplateParams): string {
  return `Hello ${params.name},

We received a request to reset your JewelFlow password.

Reset your password: ${params.resetUrl}

This link expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes. If you did not request this, ignore this email—your password will not change.

© ${new Date().getFullYear()} JewelFlow`;
}
