import { escapeHtml } from "../escape";

export type TenantWelcomeTemplateParams = {
  adminName: string;
  tenantName: string;
  setupUrl: string;
};

export function tenantWelcomeHtml(params: TenantWelcomeTemplateParams): string {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:8px;padding:32px;">
    <tr>
      <td>
        <p style="font-family:Georgia,serif;font-size:24px;color:#2C5F7C;margin:0 0 24px;font-weight:bold;">JewelFlow</p>
        <p style="font-size:16px;color:#333;margin:0 0 16px;">Hello ${escapeHtml(params.adminName)},</p>
        <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
          You have been added as the administrator of <strong>${escapeHtml(params.tenantName)}</strong> on JewelFlow.
          Click the button below to set up your password and access your account.
        </p>
        <p style="margin:0 0 24px;">
          <a href="${params.setupUrl}" style="display:inline-block;background:#2C5F7C;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:bold;">
            Set Up My Account
          </a>
        </p>
        <p style="font-size:12px;color:#888;line-height:1.5;margin:0 0 24px;">
          This link expires in 48 hours. If you did not expect this email, you can safely ignore it.
        </p>
        <p style="font-size:11px;color:#aaa;margin:0;">© ${year} JewelFlow</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function tenantWelcomePlainText(params: TenantWelcomeTemplateParams): string {
  return `Hello ${params.adminName},

You have been added as the administrator of ${params.tenantName} on JewelFlow.

Set up your account: ${params.setupUrl}

This link expires in 48 hours. If you did not expect this email, you can safely ignore it.

© ${new Date().getFullYear()} JewelFlow`;
}
