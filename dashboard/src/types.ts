export interface AuditEvent {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardSummary {
  userId: string;
  memoryCount: number;
  installIdentities: Array<{
    installId: string;
    createdAt: string;
    lastSeenAt: string;
  }>;
  recentMemories: MemoryItem[];
  auditEvents: AuditEvent[];
}

export interface MemoryItem {
  id?: string;
  chunkId?: string;
  sourceTool: string;
  workspacePath: string | null;
  sessionId: string;
  role: string;
  timestamp: number;
  content: string;
  createdAt?: string;
  score?: number;
}

export interface MemorySearchResponse {
  mode?: "browse";
  query?: string;
  resultCount: number;
  metadata: {
    provider?: string;
    model?: string;
    strategy?: string;
  };
  results: MemoryItem[];
}

export interface ConversationSummary {
  sourceTool: string;
  workspacePath: string | null;
  sessionId: string;
  title: string;
  startedAt: number;
  lastActivityAt: number;
  memoryCount: number;
}

export interface ConversationPage {
  conversations: ConversationSummary[];
  nextCursor: string | null;
}

export interface ConversationEntry extends MemoryItem {
  chunkId: string;
  createdAt: string;
}

export interface ConversationEntryPage {
  sourceTool: string;
  sessionId: string;
  entries: ConversationEntry[];
  nextCursor: string | null;
}

export type DashboardView = "overview" | "conversations" | "search" | "activity" | "settings";
