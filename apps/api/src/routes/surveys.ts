import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';

const log = createLogger('api:surveys');

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function surveyRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /surveys?businessId=xxx
   * List all surveys for a business with response counts.
   */
  app.get('/surveys', async (request, reply) => {
    const { businessId } = request.query as { businessId?: string };
    if (!businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

    const surveys = await db.survey.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { responses: true } } },
    });

    return {
      success: true,
      surveys: surveys.map((s) => ({
        id: s.id,
        title: s.title,
        slug: s.slug,
        description: s.description,
        questions: s.schema,
        active: s.active,
        responseCount: s._count.responses,
        createdAt: s.createdAt,
      })),
    };
  });

  /**
   * POST /surveys
   * Create a new survey.
   */
  app.post('/surveys', async (request, reply) => {
    const body = request.body as {
      businessId?: string;
      title?: string;
      description?: string;
      questions?: unknown[];
    };

    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });
    if (!body.title?.trim()) return reply.code(400).send({ success: false, error: 'title is required' });
    if (!body.questions?.length) return reply.code(400).send({ success: false, error: 'at least one question is required' });

    // Generate unique slug
    let baseSlug = slugify(body.title);
    let slug = baseSlug;
    let attempt = 0;
    while (await db.survey.findUnique({ where: { businessId_slug: { businessId: body.businessId, slug } } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const survey = await db.survey.create({
      data: {
        businessId: body.businessId,
        title: body.title.trim(),
        slug,
        description: body.description?.trim() ?? null,
        schema: body.questions as object,
        active: true,
      },
      include: { _count: { select: { responses: true } } },
    });

    log.info({ businessId: body.businessId, surveyId: survey.id }, 'Survey created');

    return {
      success: true,
      survey: {
        id: survey.id,
        title: survey.title,
        slug: survey.slug,
        description: survey.description,
        questions: survey.schema,
        active: survey.active,
        responseCount: 0,
        createdAt: survey.createdAt,
      },
    };
  });

  /**
   * PATCH /surveys/:id
   * Toggle active state or update survey.
   */
  app.patch<{ Params: { id: string } }>('/surveys/:id', async (request) => {
    const { id } = request.params;
    const body = request.body as { active?: boolean; title?: string; description?: string; questions?: unknown[] };

    const survey = await db.survey.findUnique({ where: { id } });
    if (!survey) throw new NotFoundError('Survey', id);

    const updated = await db.survey.update({
      where: { id },
      data: {
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.title ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.questions ? { schema: body.questions as object } : {}),
      },
      include: { _count: { select: { responses: true } } },
    });

    return {
      success: true,
      survey: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        description: updated.description,
        questions: updated.schema,
        active: updated.active,
        responseCount: updated._count.responses,
        createdAt: updated.createdAt,
      },
    };
  });

  /**
   * DELETE /surveys/:id
   */
  app.delete<{ Params: { id: string } }>('/surveys/:id', async (request) => {
    const { id } = request.params;
    const survey = await db.survey.findUnique({ where: { id } });
    if (!survey) throw new NotFoundError('Survey', id);
    await db.survey.delete({ where: { id } });
    log.info({ surveyId: id }, 'Survey deleted');
    return { success: true };
  });

  /**
   * GET /surveys/public/:slug?businessId=xxx
   * Public endpoint — returns survey schema for customer-facing page.
   */
  app.get<{ Params: { slug: string } }>('/surveys/public/:slug', async (request, reply) => {
    const { slug } = request.params;
    const { businessId } = request.query as { businessId?: string };

    const where = businessId
      ? { businessId_slug: { businessId, slug } }
      : undefined;

    const survey = where
      ? await db.survey.findUnique({ where, select: { id: true, title: true, description: true, schema: true, active: true, businessId: true } })
      : await db.survey.findFirst({ where: { slug, active: true }, select: { id: true, title: true, description: true, schema: true, active: true, businessId: true } });

    if (!survey) return reply.code(404).send({ success: false, error: 'Survey not found' });
    if (!survey.active) return reply.code(410).send({ success: false, error: 'Survey is no longer active' });

    return { success: true, survey: { id: survey.id, title: survey.title, description: survey.description, questions: survey.schema } };
  });

  /**
   * POST /surveys/:id/respond
   * Submit a survey response. Creates/upserts a Contact and Lead.
   */
  app.post<{ Params: { id: string } }>('/surveys/:id/respond', async (request, reply) => {
    const { id } = request.params;
    const body = request.body as {
      answers: Record<string, unknown>;
      name?: string;
      email?: string;
      phone?: string;
      score?: number;
    };

    const survey = await db.survey.findUnique({ where: { id }, select: { id: true, businessId: true, active: true } });
    if (!survey) return reply.code(404).send({ success: false, error: 'Survey not found' });
    if (!survey.active) return reply.code(410).send({ success: false, error: 'Survey is no longer active' });

    // Create/find contact if info provided
    let contactId: string | undefined;
    if (body.email || body.phone) {
      const firstName = body.name?.split(' ')[0];
      const lastName = body.name?.split(' ').slice(1).join(' ') || undefined;

      try {
        const contact = await db.contact.upsert({
          where: body.email
            ? { businessId_email: { businessId: survey.businessId, email: body.email } }
            : { businessId_phone: { businessId: survey.businessId, phone: body.phone! } },
          create: {
            businessId: survey.businessId,
            source: 'SURVEY',
            ...(firstName ? { firstName } : {}),
            ...(lastName ? { lastName } : {}),
            ...(body.email ? { email: body.email } : {}),
            ...(body.phone ? { phone: body.phone } : {}),
          },
          update: {
            ...(firstName ? { firstName } : {}),
            ...(lastName ? { lastName } : {}),
          },
        });
        contactId = contact.id;
      } catch {
        // ignore unique constraint if both email+phone provided and conflict
      }
    }

    const response = await db.surveyResponse.create({
      data: {
        surveyId: id,
        ...(contactId ? { contactId } : {}),
        answers: body.answers as object,
        ...(body.score !== undefined ? { score: body.score } : {}),
      },
    });

    log.info({ surveyId: id, responseId: response.id }, 'Survey response submitted');
    return { success: true, responseId: response.id };
  });
}
