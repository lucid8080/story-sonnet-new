import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(
  _req: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { jobId } = await context.params;
  const job = await prisma.storyStudioGenerationJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({
    job: {
      id: job.id,
      draftId: job.draftId,
      step: job.step,
      status: job.status,
      errorMessage: job.errorMessage,
      attempts: job.attempts,
      startedAt: job.startedAt?.toISOString() ?? null,
      finishedAt: job.finishedAt?.toISOString() ?? null,
      resultRef: job.resultRef,
    },
  });
}
