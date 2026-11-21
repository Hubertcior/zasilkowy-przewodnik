"use client";

import { AlertTriangle, FileUp, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { AiBadge } from "@/components/ai-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CaseFile } from "@/engine/types";
import {
  extractionToForm,
  formToCase,
  validateExtractionForm,
  type Extraction,
  type ExtractionForm,
  type ScalarKey,
} from "@/lib/extraction";
import { cn } from "@/lib/utils";

const selectCls =
  "border-input bg-background h-9 w-full rounded-md border px-2 text-sm";
const CONF_LABEL = {
  wysoka: "pewne",
  srednia: "do sprawdzenia",
  niska: "niepewne / brak",
} as const;

/** One verified field with confidence highlight and the source quote from the document. */
function Row({
  k,
  label,
  children,
  extraction,
  errors,
}: {
  k: ScalarKey;
  label: string;
  children: ReactNode;
  extraction: Extraction | null;
  errors: Record<string, string>;
}) {
  const meta = extraction?.[k];
  const low = meta?.confidence === "niska";
  const mid = meta?.confidence === "srednia";
  return (
    <div
      className={cn(
        "space-y-1 rounded-lg p-2",
        low && "bg-warning-soft ring-warning/40 ring-1",
        mid && "bg-info-soft",
      )}
    >
      <Label htmlFor={`x-${k}`} className="text-xs">
        {label}{" "}
        {meta && (
          <span className="text-muted-foreground font-normal">
            · {CONF_LABEL[meta.confidence]}
          </span>
        )}
      </Label>
      {children}
      {meta?.sourceQuote && (
        <p className="text-muted-foreground text-xs italic">
          „{meta.sourceQuote}”
        </p>
      )}
      {errors[k] && <p className="text-destructive text-xs">{errors[k]}</p>}
    </div>
  );
}

/** [AI] Upload of PDFs → model reading → verification form → CaseFile (KAN-36). */
export function PdfExtract({
  onConfirm,
  onCancel,
}: {
  onConfirm: (c: CaseFile) => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [form, setForm] = useState<ExtractionForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function upload(files: FileList) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      for (const f of Array.from(files)) body.append("files", f);
      const res = await fetch("/api/cases/extract", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? `Błąd ${res.status}`);
      setExtraction(json.extraction as Extraction);
      setForm(extractionToForm(json.extraction as Extraction));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function confirm() {
    if (!form) return;
    const e = validateExtractionForm(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    onConfirm(formToCase(form));
  }

  const set = <K extends keyof ExtractionForm>(k: K, v: ExtractionForm[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  if (!form || !extraction) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Odczyt dokumentów PDF <AiBadge />
          </CardTitle>
          <CardDescription>
            Wgraj wniosek ZAM, zaświadczenie Z-3 lub Z-3a albo zaświadczenie
            lekarskie (do 5 plików PDF, po 10 MB). Model AI odczyta dane, a Ty
            je sprawdzisz i poprawisz przed wyliczeniem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Plik jest wysyłany do modelu AI (Claude, Anthropic) w celu odczytu i
            nie jest przechowywany.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files?.length && upload(e.target.files)}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => fileRef.current?.click()} disabled={busy}>
              <FileUp aria-hidden />{" "}
              {busy ? "Odczytuję… (do minuty)" : "Wybierz pliki PDF"}
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={busy}>
              Anuluj
            </Button>
          </div>
          {error && (
            <p className="text-destructive text-sm">
              {error}{" "}
              <Link href="/kreator" className="underline">
                Wprowadź dane ręcznie
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          Sprawdź odczytane dane <AiBadge />
        </CardTitle>
        <CardDescription>
          Odczytane dokumenty:{" "}
          {extraction.documents.map((d) => d.kind).join(", ") || "—"}. Pola
          podświetlone na żółto są niepewne albo ich brak – uzupełnij je. Pod
          polami widać cytat z dokumentu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {extraction.notes.length > 0 && (
          <div className="bg-warning-soft flex gap-2 rounded-lg p-3 text-sm">
            <AlertTriangle
              className="text-warning mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <ul className="list-disc pl-4">
              {extraction.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <Row
            extraction={extraction}
            errors={errors}
            k="applicantName"
            label="Imię i nazwisko"
          >
            <Input
              id="x-applicantName"
              value={form.applicantName}
              onChange={(e) => set("applicantName", e.target.value)}
            />
          </Row>
          <Row
            extraction={extraction}
            errors={errors}
            k="applicantRole"
            label="Wnioskodawca"
          >
            <select
              id="x-applicantRole"
              className={selectCls}
              value={form.applicantRole}
              onChange={(e) =>
                set(
                  "applicantRole",
                  e.target.value as ExtractionForm["applicantRole"],
                )
              }
            >
              <option value="matka">Mama</option>
              <option value="ojciec">Tata</option>
            </select>
          </Row>
          <Row
            extraction={extraction}
            errors={errors}
            k="insuranceTitle"
            label="Tytuł ubezpieczenia"
          >
            <select
              id="x-insuranceTitle"
              className={selectCls}
              value={form.insuranceTitle}
              onChange={(e) =>
                set(
                  "insuranceTitle",
                  e.target.value as ExtractionForm["insuranceTitle"],
                )
              }
            >
              <option value="umowa_o_prace">Umowa o pracę</option>
              <option value="zlecenie">Umowa zlecenie</option>
              <option value="dzialalnosc">Działalność gospodarcza</option>
              <option value="inne">Inny</option>
            </select>
          </Row>
          <Row
            extraction={extraction}
            errors={errors}
            k="sickness"
            label="Ubezpieczenie chorobowe"
          >
            <select
              id="x-sickness"
              className={selectCls}
              value={form.sickness}
              onChange={(e) =>
                set("sickness", e.target.value as ExtractionForm["sickness"])
              }
            >
              <option value="obowiazkowe">Obowiązkowe</option>
              <option value="dobrowolne">Dobrowolne</option>
              <option value="brak">Brak</option>
            </select>
          </Row>
          <Row
            extraction={extraction}
            errors={errors}
            k="insuredFrom"
            label="Ubezpieczenie od"
          >
            <Input
              id="x-insuredFrom"
              type="date"
              value={form.insuredFrom}
              onChange={(e) => set("insuredFrom", e.target.value)}
            />
          </Row>
          <Row
            extraction={extraction}
            errors={errors}
            k="payerName"
            label="Płatnik składek"
          >
            <Input
              id="x-payerName"
              value={form.payerName}
              onChange={(e) => set("payerName", e.target.value)}
            />
          </Row>
          <Row
            extraction={extraction}
            errors={errors}
            k="payerInsuredCount"
            label="Liczba ubezpieczonych u płatnika"
          >
            <Input
              id="x-payerInsuredCount"
              inputMode="numeric"
              value={form.payerInsuredCount}
              onChange={(e) => set("payerInsuredCount", e.target.value)}
            />
          </Row>
          {form.insuranceTitle === "dzialalnosc" && (
            <Row
              extraction={extraction}
              errors={errors}
              k="declaredBase"
              label="Zadeklarowana podstawa składek (zł/mies.)"
            >
              <Input
                id="x-declaredBase"
                inputMode="decimal"
                value={form.declaredBase}
                onChange={(e) => set("declaredBase", e.target.value)}
              />
            </Row>
          )}
          <Row
            extraction={extraction}
            errors={errors}
            k="scenario"
            label="Sytuacja"
          >
            <select
              id="x-scenario"
              className={selectCls}
              value={form.scenario}
              onChange={(e) =>
                set("scenario", e.target.value as ExtractionForm["scenario"])
              }
            >
              <option value="ciaza">Ciąża</option>
              <option value="urodzenie">Urodzenie dziecka</option>
              <option value="adopcja">Adopcja</option>
              <option value="piecza">Rodzina zastępcza</option>
            </select>
          </Row>
          <Row
            extraction={extraction}
            errors={errors}
            k="eventDate"
            label={
              form.scenario === "ciaza"
                ? "Przewidywana data porodu"
                : form.scenario === "urodzenie"
                  ? "Data porodu"
                  : "Data przyjęcia dziecka"
            }
          >
            <Input
              id="x-eventDate"
              type="date"
              value={form.eventDate}
              onChange={(e) => set("eventDate", e.target.value)}
            />
          </Row>
          <Row
            extraction={extraction}
            errors={errors}
            k="children"
            label="Liczba dzieci"
          >
            <Input
              id="x-children"
              inputMode="numeric"
              value={form.children}
              onChange={(e) => set("children", e.target.value)}
            />
          </Row>
          {form.scenario === "urodzenie" && (
            <>
              <Row
                extraction={extraction}
                errors={errors}
                k="gestationWeek"
                label="Tydzień ciąży przy porodzie (wcześniak)"
              >
                <Input
                  id="x-gestationWeek"
                  inputMode="numeric"
                  value={form.gestationWeek}
                  onChange={(e) => set("gestationWeek", e.target.value)}
                />
              </Row>
              <Row
                extraction={extraction}
                errors={errors}
                k="birthWeightG"
                label="Masa urodzeniowa (g)"
              >
                <Input
                  id="x-birthWeightG"
                  inputMode="numeric"
                  value={form.birthWeightG}
                  onChange={(e) => set("birthWeightG", e.target.value)}
                />
              </Row>
              <Row
                extraction={extraction}
                errors={errors}
                k="hospitalWeeks"
                label="Tygodnie pobytu dziecka w szpitalu"
              >
                <Input
                  id="x-hospitalWeeks"
                  inputMode="decimal"
                  value={form.hospitalWeeks}
                  onChange={(e) => set("hospitalWeeks", e.target.value)}
                />
              </Row>
            </>
          )}
          <Row
            extraction={extraction}
            errors={errors}
            k="zaZyciem"
            label="Zaświadczenie „Za życiem”"
          >
            <div className="flex items-center gap-2">
              <Checkbox
                id="x-zaZyciem"
                checked={form.zaZyciem}
                onCheckedChange={(v) => set("zaZyciem", v === true)}
              />
              <span className="text-sm">tak</span>
            </div>
          </Row>
          <Row
            extraction={extraction}
            errors={errors}
            k="longApplication"
            label="Wniosek o pełny wymiar urlopów (81,5%)"
          >
            <div className="flex items-center gap-2">
              <Checkbox
                id="x-longApplication"
                checked={form.longApplication}
                onCheckedChange={(v) => set("longApplication", v === true)}
              />
              <span className="text-sm">tak</span>
            </div>
          </Row>
        </div>

        {form.insuranceTitle !== "dzialalnosc" && (
          <section className="space-y-2" aria-labelledby="inc-h">
            <h3 id="inc-h" className="text-sm font-medium">
              Wynagrodzenie brutto z 12 miesięcy (Z-3 / Z-3a)
            </h3>
            <ul className="space-y-1">
              {form.incomes.map((inc, i) => {
                const meta = extraction.incomes.find(
                  (x) => x.month === inc.month,
                );
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex items-center gap-2",
                      meta?.confidence === "niska" &&
                        "bg-warning-soft rounded-md p-1",
                    )}
                  >
                    <Input
                      aria-label={`Miesiąc ${i + 1}`}
                      className="w-28"
                      value={inc.month}
                      placeholder="RRRR-MM"
                      onChange={(e) =>
                        set(
                          "incomes",
                          form.incomes.map((x, j) =>
                            j === i ? { ...x, month: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Input
                      aria-label={`Kwota brutto ${inc.month}`}
                      inputMode="decimal"
                      value={inc.gross}
                      onChange={(e) =>
                        set(
                          "incomes",
                          form.incomes.map((x, j) =>
                            j === i ? { ...x, gross: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Usuń miesiąc"
                      onClick={() =>
                        set(
                          "incomes",
                          form.incomes.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </li>
                );
              })}
            </ul>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                set("incomes", [...form.incomes, { month: "", gross: "" }])
              }
            >
              <Plus aria-hidden /> Dodaj miesiąc
            </Button>
            {errors.incomes && (
              <p className="text-destructive text-xs">{errors.incomes}</p>
            )}
          </section>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel}>
            Anuluj
          </Button>
          <Button onClick={confirm}>Zatwierdź i zobacz wyliczenie</Button>
        </div>
      </CardContent>
    </Card>
  );
}
