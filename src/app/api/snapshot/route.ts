import { NextResponse } from 'next/server';
import { exportSnapshot, restoreSnapshot, type Snapshot } from '@/db/snapshot';
import { isAuthenticated } from '@/lib/auth';

/**
 * Download (GET) or restore (POST) a full JSON snapshot of your franchise state.
 * This is how you move the app between your laptop and your phone's copy.
 */

export async function GET(): Promise<Response> {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const snapshot = await exportSnapshot();
  const stamp = snapshot.exportedAt.slice(0, 10);
  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="franchise-snapshot-${stamp}.json"`,
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    let payload: Snapshot;
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) throw new Error('No snapshot file was attached.');
      payload = JSON.parse(await file.text()) as Snapshot;
    } else {
      payload = (await request.json()) as Snapshot;
    }

    const written = await restoreSnapshot(payload);
    return NextResponse.json({ ok: true, written });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
