export function deviceApprovalHtml(code: string): string {
  return pageHtml("Approve Mimir Login", `
    <form method="post" action="/device/approve">
      <p class="lead">Approve this code only if you started <strong>mimir login</strong> in your terminal.</p>
      <label>
        Login code
        <input name="code" value="${escapeHtml(code)}" required />
      </label>
      <p class="muted">This grants the local Mimir CLI access to your cloud memory account.</p>
      <button type="submit">Approve login</button>
    </form>
  `);
}

export function pageHtml(title: string, content: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light; }
      body { background: #fafafa; color: #18181b; font-family: Inter, ui-sans-serif, system-ui, sans-serif; max-width: 520px; margin: 80px auto; padding: 0 20px; line-height: 1.5; }
      h1 { font-size: 2rem; letter-spacing: -0.02em; margin-bottom: 24px; }
      form { display: grid; gap: 16px; }
      label { display: grid; gap: 6px; font-weight: 600; }
      input { background: white; font: inherit; padding: 10px 12px; border: 1px solid #d4d4d8; border-radius: 8px; }
      button { font: inherit; padding: 10px 14px; border: 0; border-radius: 8px; background: #18181b; color: white; cursor: pointer; }
      button:hover { background: #3f3f46; }
      .lead { color: #3f3f46; }
      .muted { color: #555; font-size: 0.95rem; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    ${content.includes("<") ? content : `<p>${escapeHtml(content)}</p>`}
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
