import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { buildChecklist, checklistToCsv, checklistToMarkdown } from '@/lib/checklist';

/**
 * Download the apply checklist as Markdown or CSV.
 *
 * The checklist is the one thing you carry away from the app and act on in the
 * game, on a screen the app cannot see. Making it a file means you can follow it
 * without holding a phone in one hand.
 */
export async function GET(request: Request): Promise<Response> {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get('format') === 'csv' ? 'csv' : 'md';
  const checklist = await buildChecklist();
  const stamp = checklist.generatedAt.slice(0, 10);
  const body = format === 'csv' ? checklistToCsv(checklist) : checklistToMarkdown(checklist);

  return new NextResponse(body, {
    headers: {
      'content-type':
        format === 'csv' ? 'text/csv; charset=utf-8' : 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="apply-checklist-${stamp}.${format}"`,
    },
  });
}
