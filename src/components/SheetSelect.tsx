"use client";

import { useId, useRef } from "react";
import { cardInputClass, inputClass } from "./ui";

export interface SheetOption<T extends string> {
  value: T;
  label: string;
}

// A select whose options open in a bottom sheet: a modal <dialog> gives focus
// trapping, Escape and the backdrop; the slide is CSS (.sheet in globals.css).
export function SheetSelect<T extends string>({
  id,
  title,
  value,
  options,
  onChange,
  onCard = false,
}: {
  id?: string;
  title: string;
  value: T;
  options: readonly SheetOption<T>[];
  onChange: (value: T) => void;
  onCard?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const groupName = useId();
  const titleId = useId();
  const selected = options.find((option) => option.value === value);

  function open() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.classList.remove("sheet-closing");
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>("input:checked")?.focus();
  }

  function close() {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    dialog.classList.add("sheet-closing");
    dialog.addEventListener("animationend", () => dialog.close(), { once: true });
  }

  return (
    <>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        onClick={open}
        className={`${onCard ? cardInputClass : inputClass} flex items-center justify-between gap-3 text-left`}
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronUp />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="sheet"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="mx-auto w-full max-w-md rounded-t-card bg-card px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-card-ink">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id={titleId} className="text-xl">
              {title}
            </h2>
            <button
              type="button"
              onClick={close}
              className="min-h-11 rounded-control px-3 font-bold text-card-muted transition-colors duration-[var(--dur-micro)] hover:text-card-ink"
            >
              ปิด
            </button>
          </div>
          <fieldset className="max-h-[60dvh] divide-y divide-card-rule overflow-y-auto">
            <legend className="visually-hidden">{title}</legend>
            {options.map((option) => (
              <label key={option.value} className="flex min-h-14 cursor-pointer items-center gap-3 py-3">
                <input
                  type="radio"
                  name={groupName}
                  value={option.value}
                  checked={option.value === value}
                  onChange={() => {
                    onChange(option.value);
                    close();
                  }}
                  className="h-5 w-5 shrink-0 accent-meal-lunch"
                />
                <span className={option.value === value ? "font-bold" : ""}>{option.label}</span>
              </label>
            ))}
          </fieldset>
        </div>
      </dialog>
    </>
  );
}

function ChevronUp() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0 opacity-70"
      aria-hidden="true"
    >
      <path d="M5 12l5-5 5 5" />
    </svg>
  );
}
