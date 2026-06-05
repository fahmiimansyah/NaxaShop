import nodemailer from 'nodemailer';

const EMAIL_TIMEOUT_MS = Number(process.env.EMAIL_TIMEOUT_MS || 15000);

function formatRupiah(angka) {
  return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getFromEmail() {
  return process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER;
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL;
}

function emailSiap() {
  return Boolean(
    process.env.EMAIL_SERVER_USER &&
      process.env.EMAIL_SERVER_PASSWORD &&
      getFromEmail()
  );
}

function bikinTransporter() {
  const host = process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_SERVER_PORT || 465);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },

    // Biar kalau Gmail/DNS ngadat, request gak gantung kelamaan
    connectionTimeout: EMAIL_TIMEOUT_MS,
    greetingTimeout: EMAIL_TIMEOUT_MS,
    socketTimeout: EMAIL_TIMEOUT_MS,

    // Kadang membantu TLS Gmail di environment serverless
    tls: {
      servername: host,
    },
  });
}

async function sendMailAman(options) {
  if (!emailSiap()) {
    console.warn('Email belum dikonfigurasi lengkap. Email tidak dikirim:', {
      to: options?.to,
      subject: options?.subject,
    });

    return {
      skipped: true,
      reason: 'EMAIL_NOT_CONFIGURED',
    };
  }

  const transporter = bikinTransporter();
  return transporter.sendMail(options);
}

// EMAIL VERIFIKASI REGISTER
export async function kirimEmailVerifikasi({ to, nama, link }) {
  return sendMailAman({
    from: `NaXaShop <${getFromEmail()}>`,
    to,
    subject: 'Verifikasi Email NaXaShop',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; background:#0f172a; padding:24px; color:#e5e7eb;">
        <div style="max-width:520px; margin:auto; background:#111827; border:1px solid #1f2937; border-radius:18px; padding:24px;">
          <h2 style="margin:0 0 10px; color:#ffffff;">Halo ${escapeHtml(nama)} 👋</h2>
          <p>Makasih udah daftar di <b>NaXaShop</b>.</p>
          <p>Klik tombol di bawah buat verifikasi email lu:</p>

          <p style="margin:24px 0;">
            <a href="${escapeHtml(link)}"
               style="display:inline-block;padding:12px 18px;background:#06b6d4;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;">
              Verifikasi Email
            </a>
          </p>

          <p>Kalau tombolnya gak bisa diklik, copy link ini:</p>
          <p style="word-break:break-all; color:#67e8f9;">${escapeHtml(link)}</p>

          <p style="font-size:13px;color:#9ca3af;">Link ini berlaku 1 jam.</p>
        </div>
      </div>
    `,
  });
}

// EMAIL KE ADMIN KALAU ADA ORDER BERMASALAH
export async function kirimEmailAdmin({ subject, title, message, orderId, detail }) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_SERVER_USER;

  return sendMailAman({
    from: `NaXaShop <${getFromEmail()}>`,
    to: adminEmail,
    subject: subject || 'Notifikasi NaXaShop',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>${escapeHtml(title || 'Notifikasi NaXaShop')}</h2>

        <p>${escapeHtml(message || '-')}</p>

        ${
          orderId
            ? `<p><b>Order ID:</b><br/><code>${escapeHtml(orderId)}</code></p>`
            : ''
        }

        ${
          detail
            ? `
              <p><b>Detail:</b></p>
              <pre style="background:#111827;color:#e5e7eb;padding:12px;border-radius:10px;white-space:pre-wrap;">${escapeHtml(detail)}</pre>
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

// EMAIL KE CUSTOMER HANYA SAAT TOP-UP SUKSES
export async function kirimEmailTopupSukses({
  to,
  orderId,
  namaProduk,
  harga,
  paymentType,
}) {
  if (!to) return null;

  const baseUrl = getBaseUrl();
  const linkCekOrder = `${baseUrl}/lacak?order_id=${encodeURIComponent(orderId)}`;

  return sendMailAman({
    from: `NaXaShop <${getFromEmail()}>`,
    to,
    subject: `Top-up Berhasil - ${orderId}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;background:#0f172a;padding:24px;color:#e5e7eb;">
        <div style="max-width:520px;margin:auto;background:#111827;border:1px solid #1f2937;border-radius:18px;padding:24px;">
          <h2 style="margin:0 0 8px;color:#ffffff;">Top-up Berhasil ✅</h2>

          <p style="display:inline-block;background:#083344;color:#67e8f9;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:bold;">
            SUKSES
          </p>

          <p>Mantap! Top-up kamu sudah berhasil diproses.</p>
          <p>Silakan cek item, diamond, saldo, atau benefit di akun game kamu.</p>

          <div style="background:#020617;border:1px solid #1f2937;border-radius:14px;padding:16px;margin:18px 0;">
            <p style="margin:0 0 8px;"><b>Order ID:</b><br/><code>${escapeHtml(orderId)}</code></p>
            <p style="margin:0 0 8px;"><b>Produk:</b><br/>${escapeHtml(namaProduk || '-')}</p>
            <p style="margin:0 0 8px;"><b>Total:</b><br/>${formatRupiah(harga)}</p>
            <p style="margin:0;"><b>Metode:</b><br/>${escapeHtml(paymentType || '-')}</p>
          </div>

          <p>
            <a href="${escapeHtml(linkCekOrder)}"
               style="display:inline-block;padding:12px 18px;background:#06b6d4;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold;">
              Cek Status Order
            </a>
          </p>

          <p style="font-size:12px;color:#9ca3af;margin-top:20px;">
            Simpan Order ID ini sampai transaksi benar-benar selesai.
          </p>
        </div>
      </div>
    `,
  });
}
