import { NextResponse } from 'next/server';
import {
  getMaintenanceSetting,
  publicMaintenancePayload,
} from '../../lib/maintenance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const setting = await getMaintenanceSetting();

    return NextResponse.json({
      sukses: true,
      data: publicMaintenancePayload(setting),
    });
  } catch (error) {
    console.error('GET /api/maintenance error:', error);

    return NextResponse.json({
      sukses: true,
      data: {
        enabled: false,
        mode: 'off',
        title: '',
        message: '',
        badge: '',
        estimated_until: '',
        block_checkout: false,
        full_maintenance: false,
      },
    });
  }
}
