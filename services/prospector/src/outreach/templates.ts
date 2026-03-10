export const DEFAULT_EMAIL_SUBJECT = `quick question for {{businessName}}`;

export const DEFAULT_EMAIL_BODY_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 540px; color: #1a1a1a; line-height: 1.65; font-size: 15px;">
  <p>Hey {{businessName}},</p>

  <p>
    Came across your place in {{city}} — wanted to reach out directly.
    I help restaurants stop losing customers to missed calls and slow follow-ups
    using a simple AI layer that runs in the background 24/7.
  </p>

  <p>
    Takes about a week to set up and most places recover a few lost reservations
    in the first week alone. Happy to show you exactly what it looks like for your spot.
  </p>

  <table style="margin-top: 28px; border-top: 1px solid #eee; padding-top: 20px; border-collapse: collapse; width: 100%;" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding-right: 12px; vertical-align: middle; width: 56px;">
        <img src="https://i.imgur.com/RDXkWkD.jpeg" alt="Jason" width="48" height="48" style="border-radius: 50%; display: block; object-fit: cover;" />
      </td>
      <td style="vertical-align: middle;">
        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">Jason</p>
        <p style="margin: 2px 0 0; font-size: 13px; color: #666;">Data Scientist · <a href="https://embedo.io" style="color: #4f46e5; text-decoration: none;">embedo.io</a></p>
      </td>
    </tr>
  </table>

  <p style="margin-top: 32px; font-size: 11px; color: #bbb;">
    Saw your restaurant in a local search. Not interested?
    <a href="mailto:{{replyEmail}}?subject=Unsubscribe" style="color: #bbb;">Unsubscribe</a>
  </p>
</div>
`;

export function renderEmailHtml(
  template: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    template,
  );
}
