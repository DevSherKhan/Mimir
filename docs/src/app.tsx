import {
  Check,
  ChevronRight,
  GitFork,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { docsHref, DocsLink } from "./components";
import { renderPage } from "./pages";
import { findPage, navigation, normalizePath, pages } from "./site";

type Theme = "light" | "dark";

export function App() {
  const path = currentDocsPath();
  const page = findPage(path);
  const isHome = path === "/";
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [headings, setHeadings] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("mimir-docs-theme", theme);
    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute("content", theme === "dark" ? "#11110f" : "#faf9f6");
  }, [theme]);

  useEffect(() => {
    document.title = page ? `${page.title} · Mimir` : "Page not found · Mimir";
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", page?.description ?? "Mimir documentation");

    const nextHeadings = Array.from(document.querySelectorAll<HTMLElement>(".documentation-article .doc-section[id]"))
      .map((section) => ({
        id: section.id,
        title: section.querySelector("h2")?.textContent?.trim() ?? section.id,
      }));
    setHeadings(nextHeadings);
    window.scrollTo({ top: 0 });
  }, [page]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable='true']");
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMobileNavigationOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <DocsLink className="brand" to="/">
            <span aria-hidden="true" className="brand-mark">M</span>
            <span>Mimir</span>
            <small>Docs</small>
          </DocsLink>
          <div className="header-actions">
            <button className="search-trigger" onClick={() => setSearchOpen(true)} type="button">
              <Search aria-hidden="true" size={16} />
              <span>Search docs</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
              className="icon-button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              type="button"
            >
              {theme === "dark" ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
            </button>
            <a
              aria-label="Mimir on GitHub"
              className="icon-button"
              href="https://github.com/DevSherKhan/Mimir"
              rel="noreferrer"
              target="_blank"
            >
              <GitFork aria-hidden="true" size={19} />
            </a>
            {!isHome ? (
              <button
                aria-expanded={mobileNavigationOpen}
                aria-label="Toggle documentation navigation"
                className="icon-button mobile-menu-button"
                onClick={() => setMobileNavigationOpen((open) => !open)}
                type="button"
              >
                {mobileNavigationOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className={isHome ? "site-layout home-layout" : "site-layout docs-layout"}>
        {!isHome ? (
          <Sidebar
            currentPath={page?.path ?? path}
            mobileOpen={mobileNavigationOpen}
            onNavigate={() => setMobileNavigationOpen(false)}
          />
        ) : null}

        <main id="main-content">
          <article className={isHome ? "documentation-home" : "documentation-article"}>
            {renderPage(page?.path ?? path)}
          </article>
          {!isHome ? <DocumentFooter /> : <HomeFooter />}
        </main>

        {!isHome && headings.length > 1 ? <TableOfContents headings={headings} /> : null}
      </div>

      {mobileNavigationOpen ? (
        <button
          aria-label="Close navigation"
          className="mobile-overlay"
          onClick={() => setMobileNavigationOpen(false)}
          type="button"
        />
      ) : null}

      {searchOpen ? <SearchDialog currentPath={path} onClose={() => setSearchOpen(false)} /> : null}
    </>
  );
}

function Sidebar({
  currentPath,
  mobileOpen,
  onNavigate,
}: {
  currentPath: string;
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  return (
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <nav aria-label="Documentation">
        {navigation.map((group) => (
          <div className="navigation-group" key={group.title}>
            <span>{group.title}</span>
            {group.pages.map((item) => {
              const active = item.path === currentPath;
              return (
                <a
                  aria-current={active ? "page" : undefined}
                  className={active ? "active" : undefined}
                  href={docsHref(item.path)}
                  key={item.path}
                  onClick={onNavigate}
                >
                  {item.title}
                  {active ? <ChevronRight aria-hidden="true" size={14} /> : null}
                </a>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function TableOfContents({ headings }: { headings: Array<{ id: string; title: string }> }) {
  return (
    <aside className="table-of-contents">
      <span>On this page</span>
      <nav aria-label="On this page">
        {headings.map((heading) => (
          <a href={`#${heading.id}`} key={heading.id}>{heading.title}</a>
        ))}
      </nav>
    </aside>
  );
}

function SearchDialog({
  currentPath,
  onClose,
}: {
  currentPath: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return pages.filter((page) => page.path !== "/").slice(0, 6);
    }
    return pages
      .filter((page) => page.path !== "/")
      .map((page) => {
        const haystack = [page.title, page.description, page.section, ...page.keywords].join(" ").toLowerCase();
        const score = page.title.toLowerCase().includes(normalized) ? 2 : haystack.includes(normalized) ? 1 : 0;
        return { page, score };
      })
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((result) => result.page);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      aria-label="Search documentation"
      aria-modal="true"
      className="search-overlay"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      role="dialog"
    >
      <div className="search-dialog">
        <div className="search-input-wrap">
          <Search aria-hidden="true" size={19} />
          <input
            aria-label="Search documentation"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search installation, MCP, cloud…"
            ref={inputRef}
            type="search"
            value={query}
          />
          <button aria-label="Close search" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="search-results">
          <span>{query ? `${results.length} results` : "Suggested pages"}</span>
          {results.length > 0 ? (
            results.map((result) => (
              <a
                className={result.path === currentPath ? "current" : undefined}
                href={docsHref(result.path)}
                key={result.path}
              >
                <div>
                  <small>{result.section}</small>
                  <strong>{result.title}</strong>
                  <p>{result.description}</p>
                </div>
                {result.path === currentPath ? <Check aria-label="Current page" size={17} /> : <ChevronRight aria-hidden="true" size={17} />}
              </a>
            ))
          ) : (
            <div className="empty-search">
              <Search aria-hidden="true" size={24} />
              <strong>No matching page</strong>
              <p>Try a command name, integration, or feature.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentFooter() {
  return (
    <footer className="document-footer">
      <p>Found a documentation issue?</p>
      <a
        href="https://github.com/DevSherKhan/Mimir/issues/new"
        rel="noreferrer"
        target="_blank"
      >
        Open an issue
      </a>
      <span>·</span>
      <a
        href="https://github.com/DevSherKhan/Mimir/blob/main/docs/src/pages.tsx"
        rel="noreferrer"
        target="_blank"
      >
        Edit this page
      </a>
    </footer>
  );
}

function HomeFooter() {
  return (
    <footer className="home-footer">
      <div>
        <span aria-hidden="true" className="brand-mark">M</span>
        <p>Local-first memory for AI coding conversations.</p>
      </div>
      <nav aria-label="Project links">
        <DocsLink to="/guide/installation/">Documentation</DocsLink>
        <DocsLink to="https://github.com/DevSherKhan/Mimir">GitHub</DocsLink>
        <DocsLink to="https://github.com/DevSherKhan/Mimir/blob/main/LICENSE">ISC License</DocsLink>
      </nav>
    </footer>
  );
}

function currentDocsPath(): string {
  const base = import.meta.env.BASE_URL;
  const pathname = window.location.pathname;
  const relative = base !== "/" && pathname.startsWith(base)
    ? `/${pathname.slice(base.length)}`
    : pathname;
  return normalizePath(relative);
}

function initialTheme(): Theme {
  const saved = localStorage.getItem("mimir-docs-theme");
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
