import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

interface DashboardSummary {
  userId: string;
  memoryCount: number;
  installIdentities: Array<{
    installId: string;
    createdAt: string;
    lastSeenAt: string;
  }>;
  recentMemories: Array<{
    id: string;
    sourceTool: string;
    workspacePath: string | null;
    sessionId: string;
    role: string;
    timestamp: number;
    content: string;
    createdAt: string;
  }>;
  auditEvents: Array<{
    id: string;
    action: string;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
}

function App() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [loginCode, setLoginCode] = useState("");
  const loginCommand = `mimir login --cloud-url ${window.location.origin}`;

  async function loadDashboard() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/v1/dashboard", { credentials: "same-origin" });
      const body = await response.json() as DashboardSummary | { error?: string };
      if (response.status === 401) {
        setSummary(null);
        setAuthRequired(true);
        return;
      }
      if (!response.ok) {
        throw new Error("error" in body && body.error ? body.error : "Could not load dashboard");
      }
      setSummary(body as DashboardSummary);
      setAuthRequired(false);
    } catch (unknownError) {
      setSummary(null);
      setError(unknownError instanceof Error ? unknownError.message : "Could not load dashboard");
    } finally {
      setBusy(false);
    }
  }

  async function approveLogin() {
    const code = loginCode.trim().toUpperCase();
    if (!code) {
      setError("Enter the login code shown by the Mimir CLI.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/device/approve", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ code }),
      });
      const body = await response.text();
      if (!response.ok) {
        throw new Error(readHtmlMessage(body) ?? "Could not approve login code");
      }
      setLoginCode("");
      await loadDashboard();
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Could not approve login code");
    } finally {
      setBusy(false);
    }
  }

  async function copyLoginCommand() {
    try {
      await navigator.clipboard.writeText(loginCommand);
    } catch {
      setError("Could not copy automatically. Select and copy the command manually.");
    }
  }

  async function exportMemory() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/v1/memories/export", { credentials: "same-origin" });
      const body = await response.blob();
      if (!response.ok) {
        throw new Error("Could not export memory");
      }
      const url = URL.createObjectURL(body);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mimir-memory-export.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Could not export memory");
    } finally {
      setBusy(false);
    }
  }

  async function deleteMemory() {
    if (!confirm("Delete all uploaded cloud memory? This does not affect your local database.")) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/v1/memories", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const body = await response.json() as { deleted?: number; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Could not delete cloud memory");
      }
      await loadDashboard();
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Could not delete cloud memory");
    } finally {
      setBusy(false);
    }
  }

  async function revokeToken() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/v1/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Could not revoke token");
      }
      setSummary(null);
      setAuthRequired(true);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Could not revoke token");
    } finally {
      setBusy(false);
    }
  }

  async function revokeAllTokens() {
    if (!confirm("Revoke all cloud tokens for this user? You will need to log in again.")) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/v1/auth/revoke-all", {
        method: "POST",
        credentials: "same-origin",
      });
      const body = await response.json() as { revoked?: number; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Could not revoke tokens");
      }
      setSummary(null);
      setAuthRequired(true);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Could not revoke tokens");
    } finally {
      setBusy(false);
    }
  }

  async function deleteInstallIdentity(installId: string) {
    if (!confirm("Remove this install identity? That device may be assigned a new user identity next time it logs in.")) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/v1/install-identities/${encodeURIComponent(installId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const body = await response.json() as { deleted?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Could not remove install identity");
      }
      await loadDashboard();
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Could not remove install identity");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">Mimir Cloud</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Memory Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={busy} onClick={loadDashboard}>Refresh</button>
            <button className="btn-secondary" disabled={busy || !summary} onClick={revokeToken}>Sign out</button>
            <button className="btn-secondary" disabled={busy || !summary} onClick={revokeAllTokens}>Revoke All</button>
          </div>
        </header>

        {authRequired && !summary ? (
          <section className="grid gap-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-medium text-zinc-500">Secure browser sign-in</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Connect this browser to Mimir</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">Start login from the Mimir CLI so this dashboard connects to the same account and memories as your local install. No bearer token needs to be copied.</p>
            </div>
            <div className="grid gap-3 rounded-md bg-zinc-950 p-4 text-zinc-100 sm:grid-cols-[1fr_auto] sm:items-center">
              <code className="overflow-x-auto text-sm">{loginCommand}</code>
              <button className="rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200" onClick={copyLoginCommand}>Copy command</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="grid gap-2 text-sm font-medium text-zinc-700" htmlFor="login-code">
                Login code
                <input
                  id="login-code"
                  className="min-w-0 rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm uppercase tracking-widest outline-none focus:border-zinc-900"
                  value={loginCode}
                  onChange={(event) => setLoginCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void approveLogin();
                    }
                  }}
                  placeholder="AB12CD34"
                  autoComplete="one-time-code"
                />
              </label>
              <button className="btn-primary self-end" disabled={busy || !loginCode.trim()} onClick={approveLogin}>Approve and sign in</button>
            </div>
            <p className="text-xs leading-5 text-zinc-500">The CLI may open a separate approval page automatically. You can approve there, then return here and press Refresh.</p>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </section>
        ) : error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Cloud memories" value={summary?.memoryCount.toLocaleString() ?? "-"} />
          <Metric label="Connected installs" value={summary?.installIdentities.length.toLocaleString() ?? "-"} />
          <Metric label="User" value={summary?.userId ?? "-"} mono />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 className="font-medium">Latest memories</h2>
              <button className="btn-secondary" disabled={busy || !summary} onClick={exportMemory}>Export JSON</button>
            </div>
            <div className="divide-y divide-zinc-100">
              {summary?.recentMemories.length ? summary.recentMemories.map((memory) => (
                <article className="grid gap-2 p-4" key={memory.id}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="tag">{memory.sourceTool}</span>
                    <span>{new Date(memory.timestamp).toLocaleString()}</span>
                    <span>{memory.role}</span>
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-zinc-800">{memory.content}</p>
                  <p className="truncate text-xs text-zinc-500">{memory.workspacePath ?? memory.sessionId}</p>
                </article>
              )) : (
                <p className="p-4 text-sm text-zinc-500">No uploaded memories loaded.</p>
              )}
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="font-medium">Connected installs</h2>
              <div className="mt-3 grid gap-3">
                {summary?.installIdentities.length ? summary.installIdentities.map((identity) => (
                  <div className="rounded-md bg-zinc-50 p-3" key={identity.installId}>
                    <p className="break-all font-mono text-xs text-zinc-700">{identity.installId}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-zinc-500">Last seen {new Date(identity.lastSeenAt).toLocaleString()}</p>
                      <button className="text-xs font-medium text-red-600 hover:text-red-700" disabled={busy} onClick={() => deleteInstallIdentity(identity.installId)}>Remove</button>
                    </div>
                  </div>
                )) : <p className="text-sm text-zinc-500">No install identity loaded.</p>}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="font-medium">Security activity</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Recent authenticated actions on this account.</p>
              <div className="mt-3 divide-y divide-zinc-100">
                {summary?.auditEvents.length ? summary.auditEvents.map((event) => (
                  <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={event.id}>
                    <p className="text-sm font-medium text-zinc-700">{formatAuditAction(event.action)}</p>
                    <time className="shrink-0 text-xs text-zinc-500" dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
                  </div>
                )) : <p className="text-sm text-zinc-500">No security activity recorded yet.</p>}
              </div>
            </div>

            <div className="rounded-lg border border-red-200 bg-white p-4 shadow-sm">
              <h2 className="font-medium text-red-700">Danger zone</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">Delete all uploaded cloud memory for this user. Local memory on your laptop is not touched.</p>
              <button className="mt-4 w-full rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || !summary} onClick={deleteMemory}>Delete Cloud Memory</button>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-2 truncate text-2xl font-semibold ${mono ? "font-mono text-sm" : ""}`}>{value}</p>
    </div>
  );
}

function readHtmlMessage(html: string): string | null {
  const document = new DOMParser().parseFromString(html, "text/html");
  return document.querySelector("p")?.textContent?.trim()
    ?? document.querySelector("h1")?.textContent?.trim()
    ?? null;
}

function formatAuditAction(action: string): string {
  return action
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).replaceAll("_", " "))
    .join(" · ");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
