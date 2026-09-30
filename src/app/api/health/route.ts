import { NextResponse } from 'next/server';
import { databaseDescription } from '@/db/index';

/** Used by the deploy platform and by you, to confirm the app is up. */
export async function GET(): Promise<Response> {
  return NextResponse.json({
    ok: true,
    database: databaseDescription(),
    time: new Date().toISOString(),
  });
}
