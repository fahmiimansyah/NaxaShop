import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

async function cekAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.email !== EMAIL_CEO) {
    return false;
  }

  return true;
}

export async function POST(request) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('gambar');

    if (!file) {
      return NextResponse.json(
        { sukses: false, pesan: 'File gambar wajib dikirim bre!' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { sukses: false, pesan: 'File harus gambar bre!' },
        { status: 400 }
      );
    }

    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        { sukses: false, pesan: 'Gambar kegedean bre! Maksimal 2MB.' },
        { status: 400 }
      );
    }

    const extDariMime = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };

    const ext = extDariMime[file.type];

    if (!ext) {
      return NextResponse.json(
        { sukses: false, pesan: 'Format gambar harus jpg, png, webp, atau gif bre!' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const namaFile = `game-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;

    const folderUpload = path.join(process.cwd(), 'public', 'uploads', 'games');
    await fs.mkdir(folderUpload, { recursive: true });

    const lokasiFile = path.join(folderUpload, namaFile);
    await fs.writeFile(lokasiFile, buffer);

    const urlGambar = `/uploads/games/${namaFile}`;

    return NextResponse.json({
      sukses: true,
      pesan: 'Gambar berhasil diupload!',
      url: urlGambar
    });
  } catch (error) {
    console.error('Upload gambar error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Upload gambar gagal bre!' },
      { status: 500 }
    );
  }
}