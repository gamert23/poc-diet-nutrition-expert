"use client";

import { useEffect, useRef, useState } from "react";
import { secondaryButtonClass } from "./ui";

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
        <img src={previewUrl} alt="ภาพที่เลือก" className="max-h-72 w-full rounded-xl object-cover" />
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
      <button type="button" className={secondaryButtonClass} disabled={disabled} onClick={() => inputRef.current?.click()}>
        {label}
      </button>
    </div>
  );
}
