import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Copy,
  Database,
  Download,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquareText,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ApiError,
  deleteCloudMemory,
  exportCloudMemory,
  findMemories,
  getConversationEntries,
  getConversations,
  getDashboard,
  removeInstall,
  revokeCurrentToken,
  revokeEveryToken,
} from "./api.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  ConversationEntry,
  ConversationSummary,
  DashboardSummary,
  DashboardView,
  MemoryItem,
  MemorySearchResponse,
} from "./types.js";

const navigation: Array<{ view: DashboardView; label: string; icon: LucideIcon }> = [
  { view: "overview", label: "Overview", icon: LayoutDashboard },
  { view: "conversations", label: "Conversations", icon: MessageSquareText },
  { view: "search", label: "Search", icon: Search },
  { view: "activity", label: "Activity", icon: Activity },
  { view: "settings", label: "Settings", icon: Settings },
];

export function App() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<DashboardView>(readViewFromHash);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [conversationEntries, setConversationEntries] = useState<ConversationEntry[]>([]);
  const [conversationCursor, setConversationCursor] = useState<string | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setError(null);
    try {
      const result = await getDashboard();
      setSummary(result);
      setAuthRequired(false);
    } catch (unknownError) {
      if (unknownError instanceof ApiError && unknownError.status === 401) {
        setSummary(null);
        setAuthRequired(true);
      } else {
        setError(errorMessage(unknownError, "Could not load dashboard"));
      }
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const updateView = () => setActiveView(readViewFromHash());
    window.addEventListener("hashchange", updateView);
    return () => window.removeEventListener("hashchange", updateView);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function navigate(view: DashboardView) {
    window.location.hash = view;
    setActiveView(view);
    setMobileNavOpen(false);
  }

  async function openConversation(conversation: ConversationSummary) {
    setSelectedConversation(conversation);
    setConversationEntries([]);
    setConversationCursor(null);
    setConversationLoading(true);
    try {
      const page = await getConversationEntries(conversation.sourceTool, conversation.sessionId);
      setConversationEntries(page.entries);
      setConversationCursor(page.nextCursor);
    } catch (unknownError) {
      setError(errorMessage(unknownError, "Could not load conversation"));
      setSelectedConversation(null);
    } finally {
      setConversationLoading(false);
    }
  }

  async function loadMoreConversation() {
    if (!selectedConversation || !conversationCursor) return;
    setConversationLoading(true);
    try {
      const page = await getConversationEntries(
        selectedConversation.sourceTool,
        selectedConversation.sessionId,
        conversationCursor,
      );
      setConversationEntries((current) => [...current, ...page.entries]);
      setConversationCursor(page.nextCursor);
    } catch (unknownError) {
      setError(errorMessage(unknownError, "Could not load more messages"));
    } finally {
      setConversationLoading(false);
    }
  }

  if (initialLoading) {
    return <InitialDashboardSkeleton />;
  }

  if (authRequired || !summary) {
    return <LoginScreen error={error} onAuthenticated={loadDashboard} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r bg-card transition-transform lg:translate-x-0",
        mobileNavOpen && "translate-x-0",
      )}>
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BrainCircuit className="size-5" /></div>
          <div><p className="font-semibold leading-none">Mimir</p><p className="mt-1 text-xs text-muted-foreground">Cloud memory</p></div>
          <Button className="ml-auto lg:hidden" variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X className="size-4" /></Button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navigation.map((item) => (
            <button
              key={item.view}
              className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", activeView === item.view && "bg-accent text-foreground")}
              onClick={() => navigate(item.view)}
            >
              <item.icon className="size-4" />{item.label}
            </button>
          ))}
        </nav>
        <div className="border-t p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-emerald-500" />Cloud connected</div>
          <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground" title={summary.userId}>{summary.userId}</p>
        </div>
      </aside>

      {mobileNavOpen ? <button className="fixed inset-0 z-30 bg-black/30 lg:hidden" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /> : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <Button className="lg:hidden" variant="outline" size="icon" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu className="size-4" /></Button>
          <div className="min-w-0"><p className="font-semibold capitalize">{activeView}</p><p className="hidden text-xs text-muted-foreground sm:block">Your private AI conversation memory</p></div>
          <Button className="ml-auto" variant="outline" size="sm" onClick={() => void loadDashboard()}><RefreshCw className="size-3.5" />Refresh</Button>
        </header>

        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          {error ? <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"><span>{error}</span><button onClick={() => setError(null)} aria-label="Dismiss error"><X className="size-4" /></button></div> : null}
          {activeView === "overview" ? <OverviewView summary={summary} onOpenConversation={openConversation} onNavigate={navigate} /> : null}
          {activeView === "conversations" ? <ConversationsView onOpenConversation={openConversation} /> : null}
          {activeView === "search" ? <SearchView onOpenConversation={openConversation} /> : null}
          {activeView === "activity" ? <ActivityView summary={summary} /> : null}
          {activeView === "settings" ? (
            <SettingsView
              summary={summary}
              reload={loadDashboard}
              notify={setNotice}
              onSignedOut={() => { setSummary(null); setAuthRequired(true); }}
            />
          ) : null}
        </main>
      </div>

      {selectedConversation ? (
        <ConversationDrawer
          conversation={selectedConversation}
          entries={conversationEntries}
          loading={conversationLoading}
          hasMore={Boolean(conversationCursor)}
          onLoadMore={loadMoreConversation}
          onClose={() => setSelectedConversation(null)}
          notify={setNotice}
        />
      ) : null}

      {notice ? <div className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg"><CheckCircle2 className="size-4 text-emerald-600" />{notice}</div> : null}
    </div>
  );
}

function OverviewView({ summary, onOpenConversation, onNavigate }: {
  summary: DashboardSummary;
  onOpenConversation(conversation: ConversationSummary): void;
  onNavigate(view: DashboardView): void;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getConversations({ limit: 6 })
      .then((page) => setConversations(page.conversations))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);
  const lastUpload = summary.auditEvents.find((event) => event.action === "memories.upload");

  return <div className="space-y-6">
    <PageHeading eyebrow="Workspace" title="Welcome back" description="Search, revisit, and manage the context your AI tools have accumulated." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={Database} label="Cloud memories" value={summary.memoryCount.toLocaleString()} detail="Sanitized chunks" />
      <MetricCard icon={MessageSquareText} label="Recent conversations" value={conversations.length.toLocaleString()} detail="Latest loaded" />
      <MetricCard icon={Cloud} label="Connected installs" value={summary.installIdentities.length.toLocaleString()} detail="Authorized devices" />
      <MetricCard icon={ShieldCheck} label="Cloud status" value="Healthy" detail={lastUpload ? `Last upload ${relativeTime(lastUpload.createdAt)}` : "Ready for first upload"} success />
    </div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle>Recent conversations</CardTitle><CardDescription>Continue where your tools left off.</CardDescription></div><Button variant="ghost" size="sm" onClick={() => onNavigate("conversations")}>View all<ChevronRight className="size-4" /></Button></CardHeader>
        <CardContent className="space-y-1">
          {loading ? <ListSkeleton rows={5} /> : conversations.length ? conversations.map((conversation) => <ConversationRow key={`${conversation.sourceTool}:${conversation.sessionId}`} conversation={conversation} onOpen={() => onOpenConversation(conversation)} />) : <EmptyState icon={MessageSquareText} title="No conversations yet" description="Upload local memories to see conversations here." />}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Sync health</CardTitle><CardDescription>Cloud-side upload visibility.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <StatusRow label="API connection" value="Connected" good />
          <StatusRow label="Last upload" value={lastUpload ? relativeTime(lastUpload.createdAt) : "Not yet"} />
          <StatusRow label="Stored memories" value={summary.memoryCount.toLocaleString()} />
          <div className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">Pending local chunks stay private on your laptop. Run <code className="font-mono text-foreground">mimir status</code> to inspect them.</div>
        </CardContent>
      </Card>
    </div>
  </div>;
}

function ConversationsView({ onOpenConversation }: { onOpenConversation(conversation: ConversationSummary): void }) {
  const [source, setSource] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (append = false, nextSource = source) => {
    setLoading(true); setError(null);
    try {
      const page = await getConversations({ sourceTool: nextSource, workspacePath: workspace, cursor: append ? cursor ?? undefined : undefined });
      setConversations((current) => append ? [...current, ...page.conversations] : page.conversations);
      setCursor(page.nextCursor);
    } catch (unknownError) { setError(errorMessage(unknownError, "Could not load conversations")); }
    finally { setLoading(false); }
  }, [cursor, source, workspace]);

  useEffect(() => { void load(); }, []);

  function chooseSource(value: string) { setSource(value); setCursor(null); void load(false, value); }
  function applyWorkspace(event: FormEvent) { event.preventDefault(); setCursor(null); void load(false); }

  return <div className="space-y-6">
    <PageHeading eyebrow="Library" title="Conversations" description="Browse complete sessions across every connected AI tool." />
    <Card>
      <CardHeader className="gap-4">
        <SourceChips value={source} onChange={chooseSource} />
        <form className="flex max-w-xl gap-2" onSubmit={applyWorkspace}><Input value={workspace} onChange={(event) => setWorkspace(event.target.value)} placeholder="Filter by exact workspace path" /><Button variant="outline" type="submit">Apply</Button></form>
      </CardHeader>
      <CardContent>
        {error ? <InlineError message={error} /> : null}
        {loading && !conversations.length ? <ListSkeleton rows={8} /> : conversations.length ? <div className="divide-y">{conversations.map((conversation) => <ConversationRow key={`${conversation.sourceTool}:${conversation.sessionId}`} conversation={conversation} onOpen={() => onOpenConversation(conversation)} />)}</div> : <EmptyState icon={MessageSquareText} title="No matching conversations" description="Clear a filter or upload more memories." />}
        {cursor ? <div className="mt-5 flex justify-center"><Button variant="outline" disabled={loading} onClick={() => void load(true)}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : null}Load more</Button></div> : null}
      </CardContent>
    </Card>
  </div>;
}

function SearchView({ onOpenConversation }: { onOpenConversation(conversation: ConversationSummary): void }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [workspacePath, setWorkspacePath] = useState("");
  const [role, setRole] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [response, setResponse] = useState<MemorySearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(overrides: Partial<{ query: string; source: string; sessionId: string; workspacePath: string }> = {}) {
    const filters = { query: overrides.query ?? query, sourceTool: overrides.source ?? source, sessionId: overrides.sessionId ?? sessionId, workspacePath: overrides.workspacePath ?? workspacePath, role, since: since ? `${since}T00:00:00` : "", until: until ? `${until}T23:59:59.999` : "", limit: 20 };
    if (!filters.query.trim() && !filters.sourceTool.trim() && !filters.sessionId.trim() && !filters.workspacePath.trim() && !filters.role && !filters.since && !filters.until) { setResponse(null); return; }
    setLoading(true); setError(null);
    try { setResponse(await findMemories(filters)); }
    catch (unknownError) { setError(errorMessage(unknownError, "Could not search memories")); setResponse(null); }
    finally { setLoading(false); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void run(); }
  function chooseSource(value: string) { setSource(value); void run({ source: value }); }
  const groups = useMemo(() => groupSearchResults(response?.results ?? []), [response]);

  return <div className="space-y-6">
    <PageHeading eyebrow="Discovery" title="Search memory" description="Use hybrid keyword and semantic search, or browse instantly with filters alone." />
    <Card>
      <CardContent className="space-y-5 pt-6">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search decisions, code, errors, or ideas…" /></div>
          <Button className="h-11" type="submit" disabled={loading || (!query.trim() && !source && !sessionId.trim() && !workspacePath.trim() && !role && !since && !until)}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}{query.trim() ? "Search" : "Show results"}</Button>
        </form>
        <SourceChips value={source} onChange={chooseSource} />
        <details className="rounded-lg border bg-muted/30"><summary className="cursor-pointer px-4 py-3 text-sm font-medium">Advanced filters</summary><div className="grid gap-4 border-t p-4 md:grid-cols-2 xl:grid-cols-5"><Field label="Session ID"><Input className="font-mono" value={sessionId} onChange={(event) => setSessionId(event.target.value)} placeholder="Exact session ID" /></Field><Field label="Workspace"><Input value={workspacePath} onChange={(event) => setWorkspacePath(event.target.value)} placeholder="Exact workspace path" /></Field><Field label="Role"><Select value={role} onChange={(event) => setRole(event.target.value)}><option value="">Any role</option><option value="user">User</option><option value="assistant">Assistant</option><option value="system">System</option><option value="tool">Tool</option></Select></Field><Field label="From"><Input type="date" value={since} onChange={(event) => setSince(event.target.value)} /></Field><Field label="Until"><Input type="date" value={until} onChange={(event) => setUntil(event.target.value)} /></Field></div></details>
        {error ? <InlineError message={error} /> : null}
      </CardContent>
    </Card>
    {loading ? <SearchSkeleton /> : response ? <Card><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle>{response.resultCount} {response.mode === "browse" ? "filtered memories" : "search results"}</CardTitle><CardDescription>{response.mode === "browse" ? "Newest matches first" : `Hybrid results for “${response.query}”`}</CardDescription></div>{response.metadata.provider === "dev" && response.mode !== "browse" ? <Badge variant="outline">Keyword optimized</Badge> : null}</CardHeader><CardContent>{groups.length ? <div className="space-y-4">{groups.map((group) => <SearchResultGroup key={`${group.sourceTool}:${group.sessionId}`} group={group} query={response.query ?? ""} onOpen={onOpenConversation} />)}</div> : <EmptyState icon={Search} title="No matching memory" description="Try fewer filters or a broader phrase." />}</CardContent></Card> : <EmptyState icon={Search} title="Search your history" description="Enter a phrase or choose a source such as Codex to browse without text." />}
  </div>;
}

function ActivityView({ summary }: { summary: DashboardSummary }) {
  return <div className="space-y-6"><PageHeading eyebrow="Security" title="Activity" description="Recent authenticated actions recorded for this account." /><Card><CardContent className="pt-6">{summary.auditEvents.length ? <div className="divide-y">{summary.auditEvents.map((event) => <div className="flex items-start gap-3 py-4 first:pt-0" key={event.id}><div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-muted"><ShieldCheck className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{formatAuditAction(event.action)}</p><p className="mt-1 text-xs text-muted-foreground">{metadataSummary(event.metadata)}</p></div><time className="shrink-0 text-xs text-muted-foreground">{relativeTime(event.createdAt)}</time></div>)}</div> : <EmptyState icon={Activity} title="No activity yet" description="Authenticated actions will appear here." />}</CardContent></Card></div>;
}

function SettingsView({ summary, reload, notify, onSignedOut }: { summary: DashboardSummary; reload(): Promise<void>; notify(message: string): void; onSignedOut(): void }) {
  const [busy, setBusy] = useState(false);
  async function action(operation: () => Promise<void>, success: string) { setBusy(true); try { await operation(); notify(success); } catch (error) { notify(errorMessage(error, "Action failed")); } finally { setBusy(false); } }
  return <div className="space-y-6"><PageHeading eyebrow="Account" title="Settings" description="Manage devices, exports, sessions, and cloud data." /><div className="grid gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle>Connected installs</CardTitle><CardDescription>Devices associated with this Mimir identity.</CardDescription></CardHeader><CardContent className="space-y-3">{summary.installIdentities.map((identity) => <div className="flex items-center gap-3 rounded-lg border p-3" key={identity.installId}><div className="flex size-9 items-center justify-center rounded-md bg-muted"><Cloud className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate font-mono text-xs">{identity.installId}</p><p className="mt-1 text-xs text-muted-foreground">Seen {relativeTime(identity.lastSeenAt)}</p></div><Button variant="ghost" size="sm" disabled={busy} onClick={() => { if (confirm("Remove this install identity?")) void action(async () => { await removeInstall(identity.installId); await reload(); }, "Install removed"); }}>Remove</Button></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Data portability</CardTitle><CardDescription>Download a copy of sanitized cloud memory.</CardDescription></CardHeader><CardContent><Button variant="outline" disabled={busy} onClick={() => void action(exportCloudMemory, "Export downloaded")}><Download className="size-4" />Export JSON</Button></CardContent></Card><Card><CardHeader><CardTitle>Sessions</CardTitle><CardDescription>Control browser and CLI access tokens.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void action(async () => { await revokeCurrentToken(); onSignedOut(); }, "Signed out")}><LogOut className="size-4" />Sign out</Button><Button variant="outline" disabled={busy} onClick={() => { if (confirm("Revoke all cloud tokens?")) void action(async () => { await revokeEveryToken(); onSignedOut(); }, "All tokens revoked"); }}><KeyRound className="size-4" />Revoke all</Button></CardContent></Card><Card className="border-destructive/30"><CardHeader><CardTitle className="text-destructive">Danger zone</CardTitle><CardDescription>Permanently delete uploaded cloud memory. Local files are untouched.</CardDescription></CardHeader><CardContent><Button variant="destructive" disabled={busy} onClick={() => { if (confirm("Delete all uploaded cloud memory? This cannot be undone.")) void action(async () => { const deleted = await deleteCloudMemory(); await reload(); notify(`Deleted ${deleted} memories`); }, "Cloud memory deleted"); }}><Trash2 className="size-4" />Delete cloud memory</Button></CardContent></Card></div></div>;
}

function ConversationDrawer({ conversation, entries, loading, hasMore, onLoadMore, onClose, notify }: { conversation: ConversationSummary; entries: ConversationEntry[]; loading: boolean; hasMore: boolean; onLoadMore(): Promise<void>; onClose(): void; notify(message: string): void }) {
  const messages = groupConversationEntries(entries);
  async function copyConversation() { await navigator.clipboard.writeText(messages.map((message) => `${message.role.toUpperCase()}\n${message.content}`).join("\n\n")); notify("Conversation copied"); }
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/35" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl"><div className="flex items-start gap-3 border-b p-4 sm:p-5"><div className="min-w-0 flex-1"><div className="mb-2 flex items-center gap-2"><Badge variant="secondary">{sourceLabel(conversation.sourceTool)}</Badge><span className="text-xs text-muted-foreground">{conversation.memoryCount} memories</span></div><h2 className="truncate text-lg font-semibold" title={conversation.title}>{conversation.title}</h2><p className="mt-1 truncate font-mono text-xs text-muted-foreground">{conversation.workspacePath ?? conversation.sessionId}</p></div><Button variant="ghost" size="icon" onClick={() => void copyConversation()} aria-label="Copy conversation"><Copy className="size-4" /></Button><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close conversation"><X className="size-4" /></Button></div><div className="flex-1 overflow-y-auto p-4 sm:p-6">{loading && !entries.length ? <ListSkeleton rows={6} /> : <div className="space-y-5">{messages.map((message) => <div className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")} key={message.id}><div className={cn("max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6", message.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-card")}><div className="mb-1 text-[11px] font-medium uppercase tracking-wide opacity-60">{message.role}</div><p className="whitespace-pre-wrap break-words">{message.content}</p><time className="mt-2 block text-[10px] opacity-60">{new Date(message.timestamp).toLocaleString()}</time></div></div>)}</div>}{hasMore ? <div className="mt-6 flex justify-center"><Button variant="outline" disabled={loading} onClick={() => void onLoadMore()}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : null}Load more messages</Button></div> : null}</div></aside></div>;
}

function LoginScreen({ error, onAuthenticated }: { error: string | null; onAuthenticated(): Promise<void> }) {
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [localError, setLocalError] = useState<string | null>(error); const loginCommand = `mimir login --cloud-url ${window.location.origin}`;
  async function approve(event: FormEvent) { event.preventDefault(); setBusy(true); setLocalError(null); try { const response = await fetch("/device/approve", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code: code.trim().toUpperCase() }) }); if (!response.ok) throw new Error(readHtmlMessage(await response.text()) ?? "Could not approve login"); await onAuthenticated(); } catch (unknownError) { setLocalError(errorMessage(unknownError, "Could not approve login")); } finally { setBusy(false); } }
  return <main className="grid min-h-screen place-items-center bg-muted/30 p-4"><Card className="w-full max-w-lg"><CardHeader><div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BrainCircuit className="size-6" /></div><CardTitle className="text-2xl">Connect to Mimir</CardTitle><CardDescription>Start secure device login from your terminal, then approve the short code here.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="flex items-center gap-2 rounded-lg bg-zinc-950 p-3 text-zinc-100"><code className="min-w-0 flex-1 overflow-x-auto text-xs">{loginCommand}</code><Button variant="secondary" size="sm" onClick={() => void navigator.clipboard.writeText(loginCommand)}><Copy className="size-3.5" />Copy</Button></div><form className="space-y-3" onSubmit={approve}><Field label="Login code"><Input className="h-11 font-mono uppercase tracking-[0.2em]" value={code} onChange={(event) => setCode(event.target.value)} placeholder="AB12CD34" autoComplete="one-time-code" /></Field><Button className="w-full" type="submit" disabled={busy || !code.trim()}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}Approve and sign in</Button></form>{localError ? <InlineError message={localError} /> : null}<Button className="w-full" variant="ghost" onClick={() => void onAuthenticated()}>I already approved — refresh</Button></CardContent></Card></main>;
}

function ConversationRow({ conversation, onOpen }: { conversation: ConversationSummary; onOpen(): void }) { return <button className="group flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted" onClick={onOpen}><div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background"><MessageSquareText className="size-4 text-muted-foreground" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{conversation.title}</p><div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><span>{sourceLabel(conversation.sourceTool)}</span><span>·</span><span>{conversation.memoryCount} memories</span><span>·</span><span>{relativeTime(conversation.lastActivityAt)}</span></div></div><ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></button>; }

function SearchResultGroup({ group, query, onOpen }: { group: SearchGroup; query: string; onOpen(conversation: ConversationSummary): void }) { const first = group.items[0]!; const conversation: ConversationSummary = { sourceTool: group.sourceTool, sessionId: group.sessionId, workspacePath: first.workspacePath, title: deriveClientTitle(first.content), startedAt: Math.min(...group.items.map((item) => item.timestamp)), lastActivityAt: Math.max(...group.items.map((item) => item.timestamp)), memoryCount: group.items.length }; return <div className="rounded-xl border"><button className="flex w-full items-center gap-3 border-b bg-muted/30 px-4 py-3 text-left hover:bg-muted/60" onClick={() => onOpen(conversation)}><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{conversation.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{sourceLabel(group.sourceTool)} · {group.items.length} matching {group.items.length === 1 ? "memory" : "memories"} · {first.workspacePath ?? group.sessionId}</p></div><ChevronRight className="size-4" /></button><div className="divide-y">{group.items.slice(0, 3).map((item) => <div className="p-4" key={item.chunkId ?? item.id}><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Badge variant="outline">{item.role}</Badge><span>{new Date(item.timestamp).toLocaleString()}</span>{typeof item.score === "number" ? <span className="ml-auto">Score {item.score.toFixed(3)}</span> : null}</div><p className="line-clamp-4 text-sm leading-6"><HighlightedText text={item.content} query={query} /></p></div>)}</div></div>; }

function HighlightedText({ text, query }: { text: string; query: string }) { const terms: string[] = query.toLowerCase().match(/[\p{L}\p{N}_-]{3,}/gu) ?? []; if (!terms.length) return text; const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "giu"); return <>{text.split(pattern).map((part, index) => terms.includes(part.toLowerCase()) ? <mark className="rounded bg-amber-200/70 px-0.5 text-inherit" key={index}>{part}</mark> : part)}</>; }

function SourceChips({ value, onChange }: { value: string; onChange(value: string): void }) { return <div className="flex flex-wrap gap-2" aria-label="Filter by source">{[{ value: "", label: "All" }, { value: "codex", label: "Codex" }, { value: "claude", label: "Claude" }, { value: "cursor", label: "Cursor" }].map((option) => <Button key={option.value || "all"} variant={value === option.value ? "default" : "outline"} size="sm" onClick={() => onChange(option.value)}>{option.label}</Button>)}</div>; }
function MetricCard({ icon: Icon, label, value, detail, success = false }: { icon: LucideIcon; label: string; value: string; detail: string; success?: boolean }) { return <Card><CardContent className="flex items-start gap-4 pt-6"><div className={cn("flex size-10 items-center justify-center rounded-lg bg-muted", success && "bg-emerald-50 text-emerald-700")}><Icon className="size-5" /></div><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div></CardContent></Card>; }
function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div><p className="text-sm font-medium text-primary">{eyebrow}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="grid gap-2 text-xs font-medium text-muted-foreground">{label}{children}</label>; }
function StatusRow({ label, value, good = false }: { label: string; value: string; good?: boolean }) { return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className={cn("font-medium", good && "text-emerald-700")}>{value}</span></div>; }
function InlineError({ message }: { message: string }) { return <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{message}</div>; }
function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) { return <div className="grid place-items-center px-4 py-12 text-center"><div className="flex size-11 items-center justify-center rounded-full bg-muted"><Icon className="size-5 text-muted-foreground" /></div><p className="mt-3 text-sm font-medium">{title}</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p></div>; }
function ListSkeleton({ rows }: { rows: number }) { return <div className="space-y-4">{Array.from({ length: rows }, (_, index) => <div className="flex gap-3" key={index}><Skeleton className="size-10 shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div></div>)}</div>; }
function SearchSkeleton() { return <Card><CardContent className="space-y-5 pt-6"><Skeleton className="h-6 w-52" /><ListSkeleton rows={4} /></CardContent></Card>; }
function InitialDashboardSkeleton() { return <div className="min-h-screen bg-background p-6"><div className="mx-auto max-w-6xl space-y-6"><Skeleton className="h-10 w-44" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton className="h-32" key={index} />)}</div><Skeleton className="h-[420px]" /></div></div>; }

interface SearchGroup { sourceTool: string; sessionId: string; items: MemoryItem[]; }
function groupSearchResults(results: MemoryItem[]): SearchGroup[] { const groups = new Map<string, SearchGroup>(); for (const item of results) { const key = `${item.sourceTool}:${item.sessionId}`; const group = groups.get(key) ?? { sourceTool: item.sourceTool, sessionId: item.sessionId, items: [] }; group.items.push(item); groups.set(key, group); } return [...groups.values()]; }
function groupConversationEntries(entries: ConversationEntry[]) { const grouped: Array<{ id: string; role: string; timestamp: number; content: string }> = []; for (const entry of entries) { const previous = grouped.at(-1); if (previous && previous.role === entry.role && previous.timestamp === entry.timestamp) previous.content += `\n\n${entry.content}`; else grouped.push({ id: entry.chunkId, role: entry.role, timestamp: entry.timestamp, content: entry.content }); } return grouped; }
function deriveClientTitle(content: string): string { const normalized = content.replace(/\s+/gu, " ").trim(); return normalized.length > 84 ? `${normalized.slice(0, 83).trimEnd()}…` : normalized || "Untitled conversation"; }
function sourceLabel(source: string): string { return source === "claude-code" || source === "claude" ? "Claude Code" : source.charAt(0).toUpperCase() + source.slice(1); }
function relativeTime(value: string | number): string { const timestamp = typeof value === "number" ? value : Date.parse(value); const difference = Date.now() - timestamp; const minutes = Math.max(0, Math.floor(difference / 60_000)); if (minutes < 1) return "just now"; if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; const days = Math.floor(hours / 24); return days < 30 ? `${days}d ago` : new Date(timestamp).toLocaleDateString(); }
function metadataSummary(metadata: Record<string, unknown>): string { const entries = Object.entries(metadata).slice(0, 3); return entries.length ? entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ") : "No additional details"; }
function formatAuditAction(action: string): string { return action.split(".").map((part) => part.charAt(0).toUpperCase() + part.slice(1).replaceAll("_", " ")).join(" · "); }
function errorMessage(error: unknown, fallback: string): string { return error instanceof Error ? error.message : fallback; }
function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function readViewFromHash(): DashboardView { const value = window.location.hash.replace(/^#/, ""); return navigation.some((item) => item.view === value) ? value as DashboardView : "overview"; }
function readHtmlMessage(html: string): string | null { const document = new DOMParser().parseFromString(html, "text/html"); return document.querySelector("p")?.textContent?.trim() ?? document.querySelector("h1")?.textContent?.trim() ?? null; }
