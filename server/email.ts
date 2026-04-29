let _resendClient: { emails: { send: (opts: object) => Promise<{ error?: { message: string } | null }> } } | null = null;

async function getResendClient() {
  if (_resendClient) return _resendClient;
  try {
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      _resendClient = new Resend(apiKey);
      return _resendClient;
    }
  } catch {}
  return null;
}

export async function sendOtp(email: string, code: string): Promise<void> {
  const subject = "Your PopMatch verification code";
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h1 style="color: #005F73; font-size: 24px; margin-bottom: 8px;">PopMatch</h1>
      <p style="color: #666; font-size: 14px; margin-bottom: 24px;">UIUC Housing Matchmaker</p>
      <div style="background: #F8F9F3; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="color: #333; font-size: 14px; margin-bottom: 12px;">Your verification code is</p>
        <span style="font-size: 42px; font-weight: 800; letter-spacing: 8px; color: #005F73;">${code}</span>
        <p style="color: #999; font-size: 12px; margin-top: 12px;">Valid for 10 minutes</p>
      </div>
      <p style="color: #999; font-size: 12px;">If you didn't request this, ignore this email.</p>
    </div>
  `;

  const client = await getResendClient();
  if (client) {
    const result = await client.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "PopMatch <onboarding@resend.dev>",
      to: email,
      subject,
      html,
    });
    if (result.error) {
      console.error("Resend error:", result.error.message);
    } else {
      console.log(`OTP email sent to ${email}`);
    }
  } else {
    console.log(`[DEV] OTP for ${email}: ${code}`);
  }
}
