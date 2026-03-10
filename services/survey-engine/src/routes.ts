import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validate, createLogger } from '@embedo/utils';
import { db } from '@embedo/db';
import { processSurveyTriggers } from './responses/triggers.js';
import { env } from './config.js';
import type { SurveySchema } from '@embedo/types';

const log = createLogger('survey-engine:routes');

const createSurveySchema = z.object({
  businessId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  schema: z.object({
    questions: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        label: z.string(),
        required: z.boolean().default(false),
        options: z.array(z.string()).optional(),
      }),
    ),
    submitLabel: z.string().optional(),
    successMessage: z.string().optional(),
  }),
});

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ ok: true, service: 'survey-engine' }));

  // ─── Create survey ─────────────────────────────────────────────────────────
  app.post('/surveys', async (request, reply) => {
    const data = validate(createSurveySchema, request.body);
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const survey = await db.survey.create({
      data: {
        businessId: data.businessId,
        title: data.title,
        slug,
        description: data.description,
        schema: data.schema as object,
        active: true,
      },
    });

    const surveyUrl = `${env.SURVEY_BASE_URL}/${survey.id}`;
    log.info({ surveyId: survey.id }, 'Survey created');

    return reply.code(201).send({ survey, surveyUrl });
  });

  // ─── Get survey (for rendering) ────────────────────────────────────────────
  app.get('/surveys/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const survey = await db.survey.findUnique({ where: { id } });
    if (!survey) return reply.code(404).send({ error: 'Survey not found' });
    return reply.code(200).send(survey);
  });

  // ─── Render survey HTML ────────────────────────────────────────────────────
  app.get('/surveys/:id/render', async (request, reply) => {
    const { id } = request.params as { id: string };
    const survey = await db.survey.findUnique({ where: { id } });
    if (!survey) return reply.code(404).send('Survey not found');

    const schema = survey.schema as SurveySchema;
    const html = renderSurveyHtml(survey.id, survey.title, schema);
    return reply.header('Content-Type', 'text/html').send(html);
  });

  // ─── Submit survey response ────────────────────────────────────────────────
  app.post('/surveys/:id/respond', async (request, reply) => {
    const { id } = request.params as { id: string };

    const body = request.body as {
      answers: Record<string, unknown>;
      respondentEmail?: string;
      respondentPhone?: string;
      respondentName?: string;
      contactId?: string;
    };

    const survey = await db.survey.findUnique({ where: { id } });
    if (!survey) return reply.code(404).send({ error: 'Survey not found' });

    await processSurveyTriggers({
      surveyId: id,
      businessId: survey.businessId,
      responseData: {
        surveyId: id,
        answers: body.answers,
        respondentEmail: body.respondentEmail,
        respondentPhone: body.respondentPhone,
        respondentName: body.respondentName,
        contactId: body.contactId,
      },
      contactId: body.contactId,
    });

    return reply.code(200).send({
      success: true,
      message: survey.schema && (survey.schema as SurveySchema).successMessage
        ? (survey.schema as SurveySchema).successMessage
        : 'Thank you for your response!',
    });
  });
}

function renderSurveyHtml(surveyId: string, title: string, schema: SurveySchema): string {
  const questionsHtml = schema.questions
    .map((q) => {
      if (q.type === 'rating') {
        return `
        <div class="question">
          <label>${q.label}${q.required ? ' <span class="req">*</span>' : ''}</label>
          <div class="rating">
            ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="rating-btn" data-id="${q.id}" data-value="${n}" onclick="setRating('${q.id}', ${n})">${n}</button>`).join('')}
            <input type="hidden" name="${q.id}" id="rating-${q.id}">
          </div>
        </div>`;
      }
      if (q.type === 'multiple_choice' && q.options) {
        return `
        <div class="question">
          <label>${q.label}${q.required ? ' <span class="req">*</span>' : ''}</label>
          <select name="${q.id}" ${q.required ? 'required' : ''}>
            <option value="">Select...</option>
            ${q.options.map((o) => `<option value="${o}">${o}</option>`).join('')}
          </select>
        </div>`;
      }
      const inputType = q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : 'text';
      return `
      <div class="question">
        <label>${q.label}${q.required ? ' <span class="req">*</span>' : ''}</label>
        <input type="${inputType}" name="${q.id}" ${q.required ? 'required' : ''} placeholder="Your answer">
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f9f9f9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:white;border-radius:20px;padding:48px;max-width:520px;width:100%;box-shadow:0 4px 32px rgba(0,0,0,0.08)}
h1{font-size:24px;font-weight:700;margin-bottom:32px}
.question{margin-bottom:24px}
label{display:block;font-size:15px;font-weight:500;margin-bottom:8px}
.req{color:red}
input,select,textarea{width:100%;border:1px solid #e0e0e0;border-radius:10px;padding:12px 16px;font-size:15px;outline:none;transition:border 0.2s}
input:focus,select:focus,textarea:focus{border-color:#000}
.rating{display:flex;gap:8px}
.rating-btn{width:48px;height:48px;border:2px solid #e0e0e0;border-radius:50%;background:white;cursor:pointer;font-size:16px;font-weight:600;transition:all 0.2s}
.rating-btn.active{background:#000;color:white;border-color:#000}
button[type=submit]{width:100%;background:#000;color:white;border:none;border-radius:100px;padding:16px;font-size:16px;font-weight:600;cursor:pointer;margin-top:8px;transition:opacity 0.2s}
button[type=submit]:hover{opacity:0.8}
.success{text-align:center;padding:24px 0}
.success h2{font-size:22px;margin-bottom:8px}
.success p{color:#666}
</style>
</head>
<body>
<div class="card">
<h1>${title}</h1>
<form id="survey-form">
${questionsHtml}
<button type="submit">${schema.submitLabel ?? 'Submit'}</button>
</form>
<div class="success" id="success" style="display:none">
<h2>✓ Thank you!</h2>
<p>${schema.successMessage ?? 'Your response has been recorded.'}</p>
</div>
</div>
<script>
function setRating(id, value) {
  document.getElementById('rating-' + id).value = value;
  document.querySelectorAll('[data-id="' + id + '"]').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.value) <= value);
  });
}
document.getElementById('survey-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const answers = Object.fromEntries(formData.entries());
  const res = await fetch('/surveys/${surveyId}/respond', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ answers })
  });
  if (res.ok) {
    e.target.style.display = 'none';
    document.getElementById('success').style.display = 'block';
  }
});
</script>
</body>
</html>`;
}
