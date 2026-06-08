import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import {
  getMaintenanceSetting,
  normalizeMaintenanceSetting,
  publicMaintenancePayload,
  saveMaintenanceSetting,
} from '../../../lib/maintenance';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

async function cekAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.email !== EMAIL_CEO) {
    return { valid: false, session: null };
  }

  return { valid: true, session };
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await cekAdmin();

  if (!admin.valid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const setting = await getMaintenanceSetting();

    return NextResponse.json({
      sukses: true,
      data: {
        ...setting,
        public: publicMaintenancePayload(setting),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/maintenance error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal ambil setting maintenance bre!' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const admin = await cekAdmin();

  if (!admin.valid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const normalized = normalizeMaintenanceSetting({
      ...body,
      updated_by: admin.session?.user?.email || '',
    });

    const saved = await saveMaintenanceSetting(normalized);

    return NextResponse.json({
      sukses: true,
      pesan: saved.enabled
        ? 'Mode maintenance berhasil dinyalakan/diupdate bre!'
        : 'Mode maintenance berhasil dimatikan bre!',
      data: {
        ...saved,
        public: publicMaintenancePayload(saved),
      },
    });
  } catch (error) {
    console.error('PATCH /api/admin/maintenance error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal simpan setting maintenance bre!' },
      { status: 500 }
    );
  }
}
