import nodemailer from 'nodemailer';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (error) {
  console.error('Gagal set DNS server Node:', error);
}
const EMAIL_TIMEOUT_MS = Number(process.env.EMAIL_TIMEOUT_MS || 10000);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_SERVER_PORT || 465),
  secure: Number(process.env.EMAIL_SERVER_PORT || 465) === 465,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },

  // Biar kalau Gmail/DNS ngadat, gak ngegantung kelamaan
  connectionTimeout: EMAIL_TIMEOUT_MS,
  greetingTimeout: EMAIL_TIMEOUT_MS,
  socketTimeout: EMAIL_TIMEOUT_MS,
});

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
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'
  );
}

function emailSiap() {
  return Boolean(
    process.env.EMAIL_SERVER_USER &&
      process.env.EMAIL_SERVER_PASSWORD &&
      getFromEmail()
  );
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

  return transporter.sendMail(options);
}

// EMAIL VERIFIKASI REGISTER
export async function kirimEmailVerifikasi({ to, nama, link }) {
  await sendMailAman({
    from: getFromEmail(),
    to,
    subject: 'Verifikasi Email NaXaShop',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Halo ${escapeHtml(nama)} 👋</h2>
        <p>Makasih udah daftar di <b>NaXaShop</b>.</p>
        <p>Klik tombol di bawah buat verifikasi email lu:</p>

        <p>
          <a href="${escapeHtml(link)}"
             style="display:inline-block;padding:12px 18px;background:#06b6d4;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;">
            Verifikasi Email
          </a>
        </p>

        <p>Kalau tombolnya gak bisa diklik, copy link ini:</p>
        <p>${escapeHtml(link)}</p>

        <p>Link ini berlaku 1 jam.</p>
      </div>
    `,
  });
}

// EMAIL KE ADMIN KALAU ADA ORDER BERMASALAH
export async function kirimEmailAdmin({ subject, title, message, orderId, detail }) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_SERVER_USER;

  await sendMailAman({
    from: getFromEmail(),
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
  paymentType
}) {
  if (!to) return;

  const baseUrl = getBaseUrl();
  const linkCekOrder = `${baseUrl}/lacak?order_id=${encodeURIComponent(orderId)}`;

  await sendMailAman({
    from: getFromEmail(),
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
    `
  });
}