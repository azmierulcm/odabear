// Shared HTML wrapper for vendor notification emails — keeps every email on
// the same branded card layout.

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function wrapEmail({
  headerEmoji,
  headerGradient,
  headerTitle,
  headerSubtitle,
  bodyHtml,
  ctaLabel,
  ctaUrl,
}: {
  headerEmoji: string
  headerGradient: string
  headerTitle: string
  headerSubtitle: string
  bodyHtml: string
  ctaLabel: string
  ctaUrl: string
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#F7F7F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:900;color:#FF385C;letter-spacing:-1px;">odabear</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#fff;border-radius:16px;border:1px solid #DDDDDD;overflow:hidden;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${headerGradient};padding:32px 40px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:32px;">${headerEmoji}</p>
                    <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;line-height:1.3;">
                      ${headerTitle}
                    </h1>
                    <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">
                      ${headerSubtitle}
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">
                    ${bodyHtml}

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                      <tr>
                        <td align="center">
                          <a href="${ctaUrl}"
                            style="display:inline-block;background:linear-gradient(135deg,#E31C5F,#FF385C);color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;">
                            ${ctaLabel}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#717171;">
                © ${new Date().getFullYear()} Odabear · Built for Malaysian sellers
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
