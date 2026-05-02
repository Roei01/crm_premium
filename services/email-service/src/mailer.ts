import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      // Ethereal test account fallback (logs preview URL to console)
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: process.env.ETHEREAL_USER || 'test@ethereal.email',
          pass: process.env.ETHEREAL_PASS || 'testpass',
        },
      });
    }
  }
  return transporter;
}

export async function sendEmail(options: {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  from?: string;
}): Promise<{ messageId: string; previewUrl?: string }> {
  const transport = getTransporter();
  const from = options.from || process.env.SMTP_FROM || '"CRM SaaS" <noreply@crm.local>';

  const info = await transport.sendMail({
    from,
    to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
    subject: options.subject,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <p>${options.body.replace(/\n/g, '<br>')}</p>
      <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb">
      <p style="font-size:12px;color:#9ca3af">Sent via CRM SaaS</p>
    </div>`,
    text: options.body,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
  if (previewUrl) console.log('📧 Preview email:', previewUrl);

  return { messageId: info.messageId, previewUrl: previewUrl as string | undefined };
}
