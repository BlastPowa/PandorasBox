import "server-only";

/**
 * Sends the "User Issue" notification email via Resend's HTTP API (no SDK needed).
 * Free tier: 100 emails/day / 3,000/month — plenty for a support inbox.
 * Fully optional: if RESEND_API_KEY or CONTACT_EMAIL isn't set, this silently
 * no-ops and the issue is still saved to the user_issues table as a backup.
 */
export async function sendIssueEmail(issueId: string, username: string, message: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY ?? "";
  const to = process.env.CONTACT_EMAIL ?? "";
  if (!apiKey || !to) return false;

  const shortId = issueId.slice(0, 8).toUpperCase();
  const safeUsername = escapeHtml(username);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PBox <onboarding@resend.dev>",
        to: [to],
        subject: `User Issue (${shortId})`,
        html: `<p><strong>User Issue (${shortId})</strong></p><p><strong>From:</strong> ${safeUsername}</p><hr/><p>${safeMessage}</p>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
