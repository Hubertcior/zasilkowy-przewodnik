"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FieldDef } from "@/forms/types";
import { cn } from "@/lib/utils";

/** Renders one form field from its definition (src/forms). */
export function FormField({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  value: string | boolean | undefined;
  error?: string;
  onChange: (v: string | boolean) => void;
}) {
  const id = `f-${field.name}`;
  const describedBy = [field.hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
  const label = (
    <>
      {field.label}
      {field.required && field.type !== "checkbox" && <span className="text-destructive"> *</span>}
    </>
  );

  if (field.type === "checkbox") {
    return (
      <div className="space-y-1">
        <div className="flex items-start gap-3">
          <Checkbox id={id} checked={value === true} onCheckedChange={(c) => onChange(c === true)} aria-invalid={!!error} aria-describedby={describedBy} className="mt-0.5" />
          <Label htmlFor={id} className="leading-snug font-normal">
            {field.label}
          </Label>
        </div>
        {error && (
          <p id={`${id}-err`} className="text-destructive pl-7 text-sm">
            {error}
          </p>
        )}
      </div>
    );
  }

  const str = typeof value === "string" ? value : "";
  return (
    <div className={cn("space-y-1", field.type === "textarea" && "sm:col-span-2")}>
      <Label htmlFor={id}>{label}</Label>
      {field.type === "select" ? (
        <Select value={str || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="h-auto min-h-8 w-full text-left whitespace-normal" aria-invalid={!!error} aria-describedby={describedBy}>
            <SelectValue placeholder="Wybierz…" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => (
              <SelectItem key={o.value} value={o.value} className="whitespace-normal">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "textarea" ? (
        <textarea
          id={id}
          rows={3}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30 w-full rounded-lg border bg-transparent px-2.5 py-2 text-base outline-none focus-visible:ring-3 md:text-sm"
        />
      ) : (
        <Input
          id={id}
          type={field.type === "date" ? "date" : "text"}
          inputMode={field.type === "pesel" || field.type === "iban" ? "numeric" : undefined}
          autoComplete={field.type === "iban" ? "off" : undefined}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
        />
      )}
      {field.hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {field.hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
