"use client";

import { WatchlistControl } from "@/components/watchlist-control";

export function SiteHeader({
  current,
}: {
  current: "watch" | "music" | "books";
}) {
  return (
    <header className="pf-header">
      <div className="pf-container flex h-[4.75rem] items-center justify-between gap-3">
        <a href="/" className="pf-wordmark" aria-label="Pickfilm home">
          <span className="pf-logo-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Pickfilm</strong>
            <small>Watch less menus</small>
          </span>
        </a>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <nav className="pf-nav" aria-label="Primary navigation">
            <a
              href="/"
              aria-current={current === "watch" ? "page" : undefined}
            >
              Watch
            </a>
            <a
              href="/music"
              aria-current={current === "music" ? "page" : undefined}
            >
              Music
            </a>
            <a
              href="/books"
              aria-current={current === "books" ? "page" : undefined}
            >
              Books
            </a>
          </nav>
          <WatchlistControl
            theme="dark"
            accent={current === "music" ? "coral" : "lime"}
          />
        </div>
      </div>
    </header>
  );
}
