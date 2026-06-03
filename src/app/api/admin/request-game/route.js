import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '../../../lib/db';

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

const STATUS_VALID = ['baru', 'diproses', 'selesai', 'ditolak'];

export async function GET(request) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const status = bersihinText(searchParams.get('status'));
    const search = bersihinText(searchParams.get('search'));

    const where = [];
    const values = [];

    if (status && status !== 'all') {
      where.push('status_request = ?');
      values.push(status);
    }

    if (search) {
      where.push('(nama_game LIKE ? OR kontak LIKE ? OR catatan LIKE ?)');
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [requests] = await db.query(
      `SELECT id, nama_game, kontak, catatan, status_request, created_at
       FROM request_game
       ${whereSql}
       ORDER BY 
         CASE status_request
           WHEN 'baru' THEN 1
           WHEN 'diproses' THEN 2
           WHEN 'selesai' THEN 3
           WHEN 'ditolak' THEN 4
           ELSE 5
         END,
         created_at DESC
       LIMIT 100`,
      values
    );

    const [stats] = await db.query(
      `SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status_request = 'baru' THEN 1 ELSE 0 END) AS baru,
        SUM(CASE WHEN status_request = 'diproses' THEN 1 ELSE 0 END) AS diproses,
        SUM(CASE WHEN status_request = 'selesai' THEN 1 ELSE 0 END) AS selesai,
        SUM(CASE WHEN status_request = 'ditolak' THEN 1 ELSE 0 END) AS ditolak
       FROM request_game`
    );

    return NextResponse.json({
      sukses: true,
      data: requests,
      stats: stats[0] || {
        total: 0,
        baru: 0,
        diproses: 0,
        selesai: 0,
        ditolak: 0
      }
    });
  } catch (error) {
    console.error('GET admin request game error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal ambil request game bre!' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const id = body.id;
    const status_request = bersihinText(body.status_request);

    if (!id) {
      return NextResponse.json(
        { sukses: false, pesan: 'ID request wajib dikirim bre!' },
        { status: 400 }
      );
    }

    if (!STATUS_VALID.includes(status_request)) {
      return NextResponse.json(
        { sukses: false, pesan: 'Status request gak valid bre!' },
        { status: 400 }
      );
    }

    const [cekRequest] = await db.query(
      `SELECT id FROM request_game WHERE id = ? LIMIT 1`,
      [id]
    );

    if (cekRequest.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Request game gak ketemu bre!' },
        { status: 404 }
      );
    }

    await db.query(
      `UPDATE request_game
       SET status_request = ?
       WHERE id = ?`,
      [status_request, id]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Status request berhasil diupdate bre!'
    });
  } catch (error) {
    console.error('PATCH admin request game error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal update request game bre!' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { sukses: false, pesan: 'ID request wajib dikirim bre!' },
        { status: 400 }
      );
    }

    const [cekRequest] = await db.query(
      `SELECT id, nama_game FROM request_game WHERE id = ? LIMIT 1`,
      [id]
    );

    if (cekRequest.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Request game gak ketemu bre!' },
        { status: 404 }
      );
    }

    await db.query(
      `DELETE FROM request_game WHERE id = ?`,
      [id]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Request game berhasil dihapus bre!'
    });
  } catch (error) {
    console.error('DELETE admin request game error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal hapus request game bre!' },
      { status: 500 }
    );
  }
}