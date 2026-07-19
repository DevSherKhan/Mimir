import { Check, Copy, ExternalLink, Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { type ReactNode, useState } from "react";

export function docsHref(path: string): string {
  const base = import.meta.env.BASE_URL;
  if (path === "/") {
    return base;
  }
  return `${base}${path.replace(/^\//u, "")}`;
}

export function DocsLink({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  const external = /^https?:\/\//u.test(to);
  return (
    <a
      className={className}
      href={external ? to : docsHref(to)}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
      {external ? <ExternalLink aria-hidden="true" className="inline-icon" size={14} /> : null}
    </a>
  );
}

export function CodeBlock({
  children,
  language = "bash",
  label,
}: {
  children: string;
  language?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(children.trim());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-block">
      <div className="code-toolbar">
        <span>{label ?? language}</span>
        <button aria-label="Copy code" onClick={copy} type="button">
          {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{children.trim()}</code>
      </pre>
    </div>
  );
}

export function Callout({
  children,
  title,
  type = "info",
}: {
  children: ReactNode;
  title: string;
  type?: "info" | "warning" | "security";
}) {
  const Icon = type === "warning" ? TriangleAlert : type === "security" ? ShieldCheck : Info;
  return (
    <aside className={`callout callout-${type}`}>
      <Icon aria-hidden="true" size={19} />
      <div>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
    </aside>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="steps">{children}</ol>;
}

export function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li>
      <div>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
    </li>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="page-intro">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="doc-section" id={id}>
      <h2>
        <a aria-label={`Link to ${title}`} href={`#${id}`}>
          {title}
        </a>
      </h2>
      {children}
    </section>
  );
}

export function CommandCard({
  command,
  children,
}: {
  command: string;
  children: ReactNode;
}) {
  return (
    <div className="command-card">
      <code>{command}</code>
      <p>{children}</p>
    </div>
  );
}

export function NextSteps({
  links,
}: {
  links: Array<{ to: string; title: string; description: string }>;
}) {
  return (
    <section className="next-steps" aria-labelledby="next-steps-title">
      <h2 id="next-steps-title">Next steps</h2>
      <div>
        {links.map((link) => (
          <DocsLink key={link.to} to={link.to}>
            <strong>{link.title}</strong>
            <span>{link.description}</span>
          </DocsLink>
        ))}
      </div>
    </section>
  );
}
