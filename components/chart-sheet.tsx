"use client";

import { useEffect } from "react";

export interface ChartOption {
  id: string;
  label: string;
  description: string;
}

interface ChartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: ChartOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ChartSheet({
  isOpen,
  onClose,
  title,
  options,
  selectedId,
  onSelect,
}: ChartSheetProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="pf-sheet-overlay" onClick={onClose}>
      <div
        className="pf-sheet-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="pf-sheet-handle-bar">
          <div className="pf-sheet-handle" />
        </div>

        <div className="pf-sheet-header">
          <div>
            <span className="pf-kicker text-[var(--lime)]">Select Ranking Chart</span>
            <h2 className="display-serif mt-1 text-2xl font-bold text-white">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="pf-sheet-close"
          >
            ✕
          </button>
        </div>

        <div className="pf-sheet-body">
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((opt) => {
              const isSelected = opt.id === selectedId;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSelect(opt.id);
                    onClose();
                  }}
                  className={`pf-chart-option ${isSelected ? "is-selected" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white text-sm">
                      {opt.label}
                    </span>
                    {isSelected && (
                      <span className="size-2 rounded-full bg-[var(--lime)] shadow-[0_0_8px_var(--lime)]" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/50 leading-relaxed text-left">
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
