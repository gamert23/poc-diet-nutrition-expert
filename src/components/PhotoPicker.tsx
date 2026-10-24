"use client";

import { useEffect, useRef, useState } from "react";

export function PhotoPicker({ label, onSelect, disabled }: { label: string; onSelect: (file: File) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <div className="space-y-3">
      {previewUrl && (
        // Object URLs are local previews, so next/image optimization does not apply.
        <img src={previewUrl} alt="ภาพที่เลือก" className="max-h-72 w-full rounded-card object-cover" />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setPreviewUrl(URL.createObjectURL(file));
          onSelect(file);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-card bg-paper-2 p-6 text-center transition-[background-color,translate] duration-[var(--dur-micro)] ease-out hover:bg-paper-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0 ${
          previewUrl ? "" : "min-h-48"
        }`}
      >
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-pill bg-accent text-accent-ink">
          <CameraIcon />
        </span>
        <span className="text-xl font-bold">{label}</span>
      </button>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}
