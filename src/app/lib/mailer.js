import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT || 465),
  secure: Number(process.env.EMAIL_SERVER_PORT || 465) === 465,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function kirimEmailVerifikasi({ to, nama, link }) {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER;

  await transporter.sendMail({
    from,
    to,
    subject: 'Verifikasi Email NaXaShop',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Halo ${nama} 👋</h2>
        <p>Makasih udah daftar di <b>NaXaShop</b>.</p>
        <p>Klik tombol di bawah buat verifikasi email lu:</p>

        <p>
          <a href="${link}"
             style="display:inline-block;padding:12px 18px;background:#06b6d4;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;">
            Verifikasi Email
          </a>
        </p>

        <p>Kalau tombolnya gak bisa diklik, copy link ini:</p>
        <p>${link}</p>

        <p>Link ini berlaku 1 jam.</p>
      </div>
    `,
  });
}
export async function kirimEmailAdmin({ subject, title, message, orderId, detail }) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_SERVER_USER;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER,
    to: adminEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>${title}</h2>

        <p>${message}</p>

        ${
          orderId
            ? `<p><b>Order ID:</b><br/><code>${orderId}</code></p>`
            : ''
        }

        ${
          detail
            ? `
              <p><b>Detail:</b></p>
              <pre style="background:#111827;color:#e5e7eb;padding:12px;border-radius:10px;white-space:pre-wrap;">${detail}</pre>
            `
            : ''
        }

        <p style="font-size:12px;color:#666;">
          Email otomatis dari NaXaShop Admin System.
        </p>
      </div>
    `,
  });
}