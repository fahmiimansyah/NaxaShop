import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import db from '../../../../lib/db';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

async function cekAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.email !== EMAIL_CEO) {
    return false;
  }

  return true;
}

function bersihinText(value) {
  return String(value || '').trim();
}

export async function PUT(request, { params }) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const promoId = Number(id);

    if (!Number.isInteger(promoId) || promoId <= 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'ID promo gak valid bre!' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const badge = bersihinText(body.badge);
    const title = bersihinText(body.title);
    const description = bersihinText(body.description);
    const cta_text = bersihinText(body.cta_text) || 'Lihat Promo';
    const cta_href = bersihinText(body.cta_href) || '#game-list';
    const gradient =
      bersihinText(body.gradient) ||
      'from-blue-600/30 via-cyan-500/20 to-slate-900';
    const image_url = bersihinText(body.image_url);

    const sort_order = Number(body.sort_order || 0);
    const is_active = Number(body.is_active ?? 1) === 1 ? 1 : 0;

    if (!badge || !title || !description) {
      return NextResponse.json(
        { sukses: false, pesan: 'Badge, judul, dan deskripsi wajib diisi bre!' },
        { status: 400 }
      );
    }

    if (
      badge.length > 100 ||
      title.length > 255 ||
      cta_text.length > 100 ||
      cta_href.length > 255 ||
      gradient.length > 255 ||
      image_url.length > 500
    ) {
      return NextResponse.json(
        { sukses: false, pesan: 'Ada input promo yang kepanjangan bre!' },
        { status: 400 }
      );
    }

    const [cekPromo] = await db.query(
      `SELECT id FROM promo_slider WHERE id = ? LIMIT 1`,
      [promoId]
    );

    if (cekPromo.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Promo gak ketemu bre!' },
        { status: 404 }
      );
    }

    await db.query(
      `UPDATE promo_slider
       SET badge = ?,
           title = ?,
           description = ?,
           cta_text = ?,
           cta_href = ?,
           gradient = ?,
           image_url = ?,
           sort_order = ?,
           is_active = ?
       WHERE id = ?`,
      [
        badge,
        title,
        description,
        cta_text,
        cta_href,
        gradient,
        image_url || null,
        sort_order,
        is_active,
        promoId
      ]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Promo berhasil diedit bre!'
    });
  } catch (error) {
    console.error('Edit promo error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur edit promo meledak bre!' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const promoId = Number(id);

    if (!Number.isInteger(promoId) || promoId <= 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'ID promo gak valid bre!' },
        { status: 400 }
      );
    }

    const [cekPromo] = await db.query(
      `SELECT id, title FROM promo_slider WHERE id = ? LIMIT 1`,
      [promoId]
    );

    if (cekPromo.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Promo gak ketemu bre!' },
        { status: 404 }
      );
    }

    await db.query(
      `DELETE FROM promo_slider WHERE id = ?`,
      [promoId]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Promo berhasil dihapus bre!'
    });
  } catch (error) {
    console.error('Gagal hapus promo:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur hapus promo meledak bre!' },
      { status: 500 }
    );
  }
}