import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v2 as cloudinary } from 'cloudinary';
import { authOptions } from '../../auth/[...nextauth]/route';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function cekAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.email !== EMAIL_CEO) {
    return false;
  }

  return true;
}

function envCloudinaryLengkap() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function uploadKeCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    stream.end(buffer);
  });
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
    if (!envCloudinaryLengkap()) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Konfigurasi Cloudinary belum lengkap bre!'
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('gambar');

    if (!file) {
      return NextResponse.json(
        { sukses: false, pesan: 'File gambar wajib dikirim bre!' },
        { status: 400 }
      );
    }

    if (!file.type?.startsWith('image/')) {
      return NextResponse.json(
        { sukses: false, pesan: 'File harus gambar bre!' },
        { status: 400 }
      );
    }

    const formatValid = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!formatValid.includes(file.type)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Format gambar harus jpg, png, webp, atau gif bre!'
        },
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const hasilUpload = await uploadKeCloudinary(buffer, {
      folder: 'naxashop/games',
      resource_type: 'image',
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      transformation: [
        {
          width: 600,
          height: 600,
          crop: 'fill',
          gravity: 'auto',
          quality: 'auto',
          fetch_format: 'auto'
        }
      ]
    });

    return NextResponse.json({
      sukses: true,
      pesan: 'Gambar berhasil diupload ke Cloudinary!',
      url: hasilUpload.secure_url,
      public_id: hasilUpload.public_id
    });
  } catch (error) {
    console.error('Upload Cloudinary error:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: error?.message || 'Upload gambar gagal bre!'
      },
      { status: 500 }
    );
  }
}