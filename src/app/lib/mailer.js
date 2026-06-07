const EMAIL_TIMEOUT_MS = Number(process.env.EMAIL_TIMEOUT_MS || 15000);
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

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

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function ambilEmailMurni(value) {
  const text = String(value || '').trim();
  const match = text.match(/<([^>]+)>/);
  return (match?.[1] || text).trim();
}

function getFromEmail() {
  // Contoh value yang bagus di Vercel:
  // EMAIL_FROM=NaXaShop <noreply@naxashop.id>
  return process.env.EMAIL_FROM || process.env.RESEND_FROM || '';
}

function getReplyTo() {
  return process.env.EMAIL_REPLY_TO || process.env.SUPPORT_EMAIL || '';
}

function getAdminEmail() {
  return (
    process.env.ADMIN_EMAIL ||
    process.env.EMAIL_ADMIN ||
    process.env.EMAIL_REPLY_TO ||
    process.env.SUPPORT_EMAIL ||
    ambilEmailMurni(getFromEmail())
  );
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL;
}

function emailSiap() {
  return Boolean(process.env.RESEND_API_KEY && getFromEmail());
}

async function bacaJsonAman(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function kirimLewatResend(payload, idempotencyKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'naxashop/1.0',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await bacaJsonAman(response);

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        data?.raw ||
        `Resend error HTTP ${response.status}`;

      const error = new Error(message);
      error.status = response.status;
      error.resend = data;
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendMailAman(options) {
  const from = options?.from || getFromEmail();
  const to = options?.to;
  const subject = options?.subject;
  const html = options?.html || '';
  const text = options?.text || stripHtml(html);
  const replyTo = options?.replyTo || getReplyTo();

  if (!emailSiap()) {
    console.warn('Resend belum dikonfigurasi lengkap. Email tidak dikirim:', {
      to,
      subject,
      butuh: ['RESEND_API_KEY', 'EMAIL_FROM'],
    });

    return {
      skipped: true,
      reason: 'RESEND_NOT_CONFIGURED',
    };
  }

  if (!to || !subject || !html) {
    console.warn('Payload email tidak lengkap. Email tidak dikirim:', {
      to,
      subject,
      adaHtml: Boolean(html),
    });

    return {
      skipped: true,
      reason: 'EMAIL_PAYLOAD_INCOMPLETE',
    };
  }

  const payload = {
    from,
    to,
    subject,
    html,
    text,
    ...(replyTo ? { reply_to: replyTo } : {}),
  };

  return kirimLewatResend(payload, options?.idempotencyKey);
}

// EMAIL VERIFIKASI REGISTER
export async function kirimEmailVerifikasi({ to, nama, link }) {
  const namaAman = escapeHtml(nama || 'Kak');
  const linkAman = escapeHtml(link);

  return sendMailAman({
    to,
    subject: 'Verifikasi akun NaXaShop kamu',
    idempotencyKey: `verify-${to}-${Date.now()}`.slice(0, 240),
    html: `
      <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6;">
        <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:26px;">
            <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">Halo ${namaAman},</h1>

            <p style="margin:0 0 14px;">Terima kasih sudah mendaftar di <b>NaXaShop</b>.</p>
            <p style="margin:0 0 22px;">Klik tombol di bawah ini untuk memverifikasi akun kamu.</p>

            <p style="margin:0 0 24px;">
              <a href="${linkAman}"
                 style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:12px;padding:12px 18px;">
                Verifikasi Akun
              </a>
            </p>

            <p style="margin:0 0 8px;font-size:14px;color:#475569;">Kalau tombol tidak bisa dibuka, salin link ini ke browser:</p>
            <p style="margin:0 0 18px;font-size:13px;word-break:break-all;color:#0369a1;">${linkAman}</p>

            <p style="margin:0 0 16px;font-size:14px;color:#475569;">Link ini berlaku 1 jam.</p>
            <p style="margin:0;font-size:13px;color:#64748b;">Kalau kamu tidak merasa mendaftar, abaikan email ini.</p>
          </div>

          <p style="text-align:center;font-size:12px;color:#94a3b8;margin:18px 0 0;">
            Email otomatis dari NaXaShop.
          </p>
        </div>
      </div>
    `,
  });
}

// EMAIL KE ADMIN KALAU ADA ORDER BERMASALAH
export async function kirimEmailAdmin({ subject, title, message, orderId, detail }) {
  const adminEmail = getAdminEmail();

  if (!adminEmail) {
    console.warn('ADMIN_EMAIL belum diset. Email admin tidak dikirim.', {
      subject,
      orderId,
    });
    return { skipped: true, reason: 'ADMIN_EMAIL_NOT_CONFIGURED' };
  }

  return sendMailAman({
    to: adminEmail,
    subject: subject || 'Notifikasi NaXaShop',
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a;">
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
              <pre style="background:#0f172a;color:#e5e7eb;padding:12px;border-radius:10px;white-space:pre-wrap;">${escapeHtml(detail)}</pre>
            `
            : ''
        }

        <p style="font-size:12px;color:#64748b;">
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
  const linkCekOrder = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/lacak?order_id=${encodeURIComponent(orderId)}`
    : '';

  return sendMailAman({
    to,
    subject: `Top-up berhasil - ${orderId}`,
    idempotencyKey: `topup-${orderId}`.slice(0, 240),
    html: `
      <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6;">
        <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:26px;">
            <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">Top-up berhasil</h1>

            <p style="display:inline-block;margin:0 0 16px;background:#dcfce7;color:#166534;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:bold;">
              SUKSES
            </p>

            <p style="margin:0 0 14px;">Mantap, pesanan kamu sudah berhasil diproses.</p>
            <p style="margin:0 0 18px;color:#475569;">Silakan cek item, diamond, saldo, atau benefit di akun game kamu.</p>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin:18px 0;">
              <p style="margin:0 0 8px;"><b>Order ID:</b><br/><code>${escapeHtml(orderId)}</code></p>
              <p style="margin:0 0 8px;"><b>Produk:</b><br/>${escapeHtml(namaProduk || '-')}</p>
              <p style="margin:0 0 8px;"><b>Total:</b><br/>${formatRupiah(harga)}</p>
              <p style="margin:0;"><b>Metode:</b><br/>${escapeHtml(paymentType || '-')}</p>
            </div>

            ${
              linkCekOrder
                ? `
                  <p style="margin:0 0 18px;">
                    <a href="${escapeHtml(linkCekOrder)}"
                       style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:12px;padding:12px 18px;">
                      Cek Status Order
                    </a>
                  </p>
                `
                : ''
            }

            <p style="margin:0;font-size:13px;color:#64748b;">
              Simpan Order ID ini sampai transaksi benar-benar selesai.
            </p>
          </div>

          <p style="text-align:center;font-size:12px;color:#94a3b8;margin:18px 0 0;">
            Email otomatis dari NaXaShop.
          </p>
        </div>
      </div>
    `,
  });
}


// EMAIL REWARD VOUCHER SETELAH ORDER PERTAMA SUKSES
export async function kirimEmailVoucherOrderPertama({
  to,
  orderId,
  kodeVoucher,
  tipeDiskon,
  nilaiDiskon,
  minimalTransaksi,
  maksimalDiskon,
  expiredAt,
  namaProduk,
}) {
  if (!to || !kodeVoucher) return null;

  const baseUrl = getBaseUrl();
  const linkMulaiTopup = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/`
    : '';

  const tipe = String(tipeDiskon || 'nominal').toLowerCase();
  const labelDiskon = tipe === 'persen'
    ? `${Number(nilaiDiskon || 0)}%${Number(maksimalDiskon || 0) > 0 ? ` maksimal ${formatRupiah(maksimalDiskon)}` : ''}`
    : formatRupiah(nilaiDiskon);

  const expiredText = expiredAt
    ? new Date(expiredAt).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  return sendMailAman({
    to,
    subject: `Voucher makasih order pertama - ${kodeVoucher}`,
    idempotencyKey: `first-order-voucher-${orderId}-${kodeVoucher}`.slice(0, 240),
    html: `
      <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6;">
        <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:26px;">
            <p style="display:inline-block;margin:0 0 16px;background:#dbeafe;color:#1d4ed8;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:bold;">
              MEMBER REWARD
            </p>

            <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">Makasih udah top-up di NaXaShop 🎉</h1>

            <p style="margin:0 0 14px;">Order pertama kamu sudah berhasil diproses.</p>
            <p style="margin:0 0 18px;color:#475569;">
              Biar makin gatel top-up lagi, ini voucher khusus akun kamu buat transaksi berikutnya.
            </p>

            <div style="background:#0f172a;color:#e0f2fe;border-radius:16px;padding:18px;margin:18px 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#93c5fd;font-weight:bold;text-transform:uppercase;letter-spacing:.08em;">Kode Voucher</p>
              <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:.06em;">${escapeHtml(kodeVoucher)}</p>
            </div>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin:18px 0;">
              <p style="margin:0 0 8px;"><b>Diskon:</b><br/>${escapeHtml(labelDiskon)}</p>
              <p style="margin:0 0 8px;"><b>Minimal transaksi:</b><br/>${formatRupiah(minimalTransaksi)}</p>
              <p style="margin:0 0 8px;"><b>Berlaku sampai:</b><br/>${escapeHtml(expiredText)}</p>
              <p style="margin:0 0 8px;"><b>Khusus akun:</b><br/>${escapeHtml(to)}</p>
              <p style="margin:0 0 8px;"><b>Order sumber:</b><br/><code>${escapeHtml(orderId || '-')}</code></p>
              <p style="margin:0;"><b>Produk:</b><br/>${escapeHtml(namaProduk || '-')}</p>
            </div>

            ${
              linkMulaiTopup
                ? `
                  <p style="margin:0 0 18px;">
                    <a href="${escapeHtml(linkMulaiTopup)}"
                       style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:12px;padding:12px 18px;">
                      Pakai Voucher Sekarang
                    </a>
                  </p>
                `
                : ''
            }

            <p style="margin:0;font-size:13px;color:#64748b;">
              Voucher ini cuma bisa dipakai 1x dan hanya berlaku saat kamu login dengan akun yang sama.
            </p>
          </div>

          <p style="text-align:center;font-size:12px;color:#94a3b8;margin:18px 0 0;">
            Email otomatis dari NaXaShop.
          </p>
        </div>
      </div>
    `,
  });
}
