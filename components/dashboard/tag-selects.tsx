"use client";

import { cn } from "@/lib/utils";
import type { Curriculum, DocumentTags } from "@/lib/api/types";

const selectClassName =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

type TagSelectsProps = {
  curriculum: Curriculum | undefined;
  value: DocumentTags;
  onChange: (value: DocumentTags) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function TagSelects({ curriculum, value, onChange, disabled, label, className }: TagSelectsProps) {
  const isDisabled = disabled || !curriculum;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <select
        aria-label={label ? `Grade for ${label}` : "Grade"}
        className={cn(selectClassName, "w-28", value.grade === null && "text-muted-foreground")}
        value={value.grade ?? ""}
        disabled={isDisabled}
        onChange={(e) =>
          onChange({ ...value, grade: e.target.value ? Number(e.target.value) : null })
        }
      >
        <option value="">No grade</option>
        {curriculum?.grades.map((grade) => (
          <option key={grade} value={grade}>
            Grade {grade}
          </option>
        ))}
      </select>
      <select
        aria-label={label ? `Subject for ${label}` : "Subject"}
        className={cn(selectClassName, "w-56", value.subject === null && "text-muted-foreground")}
        value={value.subject ?? ""}
        disabled={isDisabled}
        onChange={(e) => onChange({ ...value, subject: e.target.value || null })}
      >
        <option value="">No subject</option>
        {curriculum?.subjects.map((subject) => (
          <option key={subject} value={subject}>
            {subject}
          </option>
        ))}
      </select>
    </div>
  );
}

export function formatTags(tags: DocumentTags): string {
  const parts = [
    tags.grade !== null ? `Grade ${tags.grade}` : null,
    tags.subject,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "Untagged";
}
