export function deviceApprovalHtml(code: string): string {
  return pageHtml("Approve Mimir Login", `
    <form method="post" action="/device/approve">
      <p>Approve this code only if you started <strong>mimir login</strong> in your terminal.</p>
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
      body { font-family: system-ui, sans-serif; max-width: 520px; margin: 80px auto; padding: 0 20px; line-height: 1.5; }
      form { display: grid; gap: 16px; }
      label { display: grid; gap: 6px; font-weight: 600; }
      input { font: inherit; padding: 10px 12px; border: 1px solid #bbb; border-radius: 6px; }
      button { font: inherit; padding: 10px 14px; border: 0; border-radius: 6px; background: #111; color: white; cursor: pointer; }
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
