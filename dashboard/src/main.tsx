import { StrictMode, useEffect, useMemo, useState } from "react";
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
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("mimir.dashboard.token") ?? "");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isAuthed = token.trim().length > 0;

  const headers = useMemo(() => ({
    Authorization: `Bearer ${token.trim()}`,
  }), [token]);

  async function loadDashboard() {
    if (!isAuthed) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/v1/dashboard", { headers });
      const body = await response.json() as DashboardSummary | { error?: string };
      if (!response.ok) {
        throw new Error("error" in body && body.error ? body.error : "Could not load dashboard");
      }
      setSummary(body as DashboardSummary);
      sessionStorage.setItem("mimir.dashboard.token", token.trim());
    } catch (unknownError) {
      setSummary(null);
      setError(unknownError instanceof Error ? unknownError.message : "Could not load dashboard");
    } finally {
      setBusy(false);
    }
  }

  async function exportMemory() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/v1/memories/export", { headers });
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
        headers,
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
        headers,
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Could not revoke token");
      }
      sessionStorage.removeItem("mimir.dashboard.token");
      setToken("");
      setSummary(null);
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
        headers,
      });
      const body = await response.json() as { revoked?: number; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Could not revoke tokens");
      }
      sessionStorage.removeItem("mimir.dashboard.token");
      setToken("");
      setSummary(null);
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
        headers,
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
    if (isAuthed) {
      void loadDashboard();
    }
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
            <button className="btn-secondary" disabled={busy || !isAuthed} onClick={loadDashboard}>Refresh</button>
            <button className="btn-secondary" disabled={busy || !isAuthed} onClick={revokeToken}>Revoke Token</button>
            <button className="btn-secondary" disabled={busy || !isAuthed} onClick={revokeAllTokens}>Revoke All</button>
          </div>
        </header>

        <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <label className="text-sm font-medium text-zinc-700" htmlFor="token">Bearer token</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="token"
              className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste token from ~/.mimir/cloud-auth.json"
              type="password"
            />
            <button className="btn-primary" disabled={busy || !isAuthed} onClick={loadDashboard}>Load Dashboard</button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </section>

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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
