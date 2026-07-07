import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendFollowUpEmail(opts: { to: string; from: string; subject: string; text: string }): Promise<void> {
  await getTransporter().sendMail({
    to: opts.to,
    from: opts.from,
    subject: opts.subject,
    text: opts.text,
  });
}
