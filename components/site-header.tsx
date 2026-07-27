"use client";

import { BrandLockup } from "@/components/brand-mark";
import { WatchlistControl } from "@/components/watchlist-control";

export function SiteHeader({
  current,
}: {
  current: "watch" | "music" | "books";
}) {
  return (
    <header className="pf-header">
      <div className="pf-header-inner pf-container">
        <a href="/" className="pf-wordmark" aria-label="DRAWN home">
          <BrandLockup />
        </a>

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

        <div className="pf-profile-slot">
          <WatchlistControl
            theme="dark"
            accent={current === "music" ? "coral" : "lime"}
          />
        </div>
      </div>
    </header>
  );
}
