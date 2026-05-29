import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '../../lib/db';

function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        new URL('/login?verified=missing-token', request.url)
      );
    }

    const tokenRahasia = hashToken(token);

    const [users] = await db.query(
      `SELECT id
       FROM users
       WHERE verification_token = ?
       AND verification_expires > NOW()
       LIMIT 1`,
      [tokenRahasia]
    );

    if (users.length === 0) {
      return NextResponse.redirect(
        new URL('/login?verified=invalid-or-expired', request.url)
      );
    }

    await db.query(
      `UPDATE users
       SET email_verified = 1,
           verification_token = NULL,
           verification_expires = NULL
       WHERE id = ?`,
      [users[0].id]
    );

    return NextResponse.redirect(
      new URL('/login?verified=success', request.url)
    );
  } catch (error) {
    console.error('Verify email error:', error);

    return NextResponse.redirect(
      new URL('/login?verified=error', request.url)
    );
  }
}