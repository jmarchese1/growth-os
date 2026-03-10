import type { ProposalContent, ProposalIntakeData } from '@embedo/types';
import { formatDate } from '@embedo/utils';

/**
 * Render a proposal as a professional HTML document.
 * Used for the shareable proposal page and PDF generation.
 */
export function renderProposalHtml(params: {
  intake: ProposalIntakeData;
  content: ProposalContent;
  shareToken: string;
  proposalBaseUrl: string;
}): string {
  const { intake, content } = params;
  const date = formatDate(new Date());

  const modulesHtml = content.modules
    .filter((m) => m.included)
    .map(
      (m) => `
      <div class="module">
        <h3>${m.name}</h3>
        <p>${m.description}</p>
        <ul>
          ${m.benefits.map((b) => `<li>${b}</li>`).join('')}
        </ul>
      </div>`,
    )
    .join('');

  const benefitsHtml = content.expectedBenefits
    .map((b) => `<li>${b}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Transformation Proposal — ${intake.businessName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; background: #fff; }
    .container { max-width: 800px; margin: 0 auto; padding: 60px 40px; }
    .header { border-bottom: 3px solid #000; padding-bottom: 40px; margin-bottom: 48px; }
    .logo { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #666; margin-bottom: 32px; }
    h1 { font-size: 40px; font-weight: 700; line-height: 1.1; margin-bottom: 16px; }
    .meta { font-size: 15px; color: #666; }
    .meta span { color: #1a1a1a; font-weight: 500; }
    section { margin-bottom: 48px; }
    h2 { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #666; margin-bottom: 16px; border-top: 1px solid #e0e0e0; padding-top: 16px; }
    h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 16px; line-height: 1.7; color: #333; margin-bottom: 12px; }
    ul { padding-left: 20px; }
    li { font-size: 15px; line-height: 1.8; color: #333; }
    .modules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
    .module { background: #f8f8f8; border-radius: 12px; padding: 24px; }
    .module h3 { font-size: 15px; margin-bottom: 8px; }
    .module p { font-size: 14px; margin-bottom: 12px; }
    .module li { font-size: 13px; }
    .cta-box { background: #000; color: #fff; border-radius: 16px; padding: 48px; text-align: center; margin-top: 48px; }
    .cta-box h2 { color: #fff; border-top: none; padding-top: 0; font-size: 13px; letter-spacing: 0.1em; }
    .cta-box p { color: rgba(255,255,255,0.8); }
    .cta-button { display: inline-block; margin-top: 24px; background: #fff; color: #000; padding: 16px 32px; border-radius: 100px; font-size: 15px; font-weight: 600; text-decoration: none; }
    @media (max-width: 600px) {
      .container { padding: 32px 20px; }
      h1 { font-size: 28px; }
      .modules-grid { grid-template-columns: 1fr; }
    }
    @media print {
      .cta-button { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Embedo — AI Infrastructure for Local Business</div>
      <h1>AI Transformation<br>Proposal for<br>${intake.businessName}</h1>
      <p class="meta">Prepared for <span>${intake.contactName ?? 'the Business Owner'}</span> · <span>${date}</span></p>
    </div>

    <section>
      <h2>Executive Summary</h2>
      <p>${content.executiveSummary}</p>
    </section>

    <section>
      <h2>The Challenge</h2>
      <p>${content.problemStatement}</p>
    </section>

    <section>
      <h2>Our Solution</h2>
      <p>${content.solution}</p>
    </section>

    <section>
      <h2>What Gets Deployed</h2>
      <div class="modules-grid">
        ${modulesHtml}
      </div>
    </section>

    <section>
      <h2>Expected Outcomes</h2>
      <ul>${benefitsHtml}</ul>
    </section>

    <section>
      <h2>Investment</h2>
      <p>${content.investmentOverview}</p>
    </section>

    <section>
      <h2>Implementation Timeline</h2>
      <p>${content.timeline}</p>
    </section>

    <section>
      <h2>Next Steps</h2>
      <p>${content.nextSteps}</p>
    </section>

    <div class="cta-box">
      <h2>Ready to Transform ${intake.businessName}?</h2>
      <p>${content.callToAction}</p>
      <a href="https://calendly.com/embedo/strategy" class="cta-button">Book Your Free Strategy Call</a>
    </div>
  </div>
</body>
</html>`;
}
