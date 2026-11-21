"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Controller, useForm, useWatch, type Control, type FieldPath, type UseFormRegister, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import { Money } from "@/components/money";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ParentDataSchema, ScenarioSchema } from "@/engine/schemas";
import { cn } from "@/lib/utils";
import { emptyWizard, monthsBefore, referenceDate, STEP_FIELDS, WizardSchema, wizardToCase, type WizardForm } from "@/lib/wizard";
import { useCaseStore } from "@/store/useCaseStore";

const STEPS = ["Sytuacja", "Mama", "Zarobki mamy", "Tata", "Podsumowanie"];
const today = () => new Date().toISOString().slice(0, 10);
const noopSubscribe = () => () => {};
/** Today's date on the client; null while prerendering (cacheComponents forbids reading the clock then). */
function useToday(): string | null {
  return useSyncExternalStore(noopSubscribe, today, () => null);
}
const num = { setValueAs: (v: string) => (v === "" || v == null ? undefined : Number(String(v).replace(",", "."))) };

// ---------- small field helpers ----------

function Hint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground inline-flex rounded-full align-middle" aria-label={`Dlaczego pytamy: ${text}`}>
          <Info className="size-4" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-pretty">{text}</TooltipContent>
    </Tooltip>
  );
}

function Row({ label, htmlFor, hint, error, children, className }: { label: string; htmlFor?: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <Hint text={hint} />}
      </div>
      {children}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Choice<N extends FieldPath<WizardForm>>({
  control,
  name,
  options,
  columns = 2,
  label,
  hint,
}: {
  control: Control<WizardForm>;
  name: N;
  options: { value: string; label: string; desc?: string }[];
  columns?: 2 | 3;
  label: string;
  hint?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <fieldset className="space-y-2">
          <legend className="flex items-center gap-1.5 text-sm font-medium">
            {label} {hint && <Hint text={hint} />}
          </legend>
          <RadioGroup value={String(field.value)} onValueChange={field.onChange} className={cn("grid gap-2", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
            {options.map((o) => {
              const id = `${name}-${o.value}`;
              return (
                <Label
                  key={o.value}
                  htmlFor={id}
                  className={cn(
                    "hover:bg-accent/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal",
                    String(field.value) === o.value && "border-primary bg-accent/40",
                  )}
                >
                  <RadioGroupItem id={id} value={o.value} className="mt-0.5" />
                  <span>
                    <span className="block font-medium">{o.label}</span>
                    {o.desc && <span className="text-muted-foreground block text-xs">{o.desc}</span>}
                  </span>
                </Label>
              );
            })}
          </RadioGroup>
        </fieldset>
      )}
    />
  );
}

function Check({ control, name, label, hint }: { control: Control<WizardForm>; name: FieldPath<WizardForm>; label: string; hint?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center gap-2">
          <Checkbox id={name} checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(v === true)} />
          <Label htmlFor={name} className="font-normal">
            {label}
          </Label>
          {hint && <Hint text={hint} />}
        </div>
      )}
    />
  );
}

type Who = "mother" | "father";

function err(errors: FieldErrors<WizardForm>, who: Who, key: string): string | undefined {
  const e = (errors[who] as Record<string, { message?: string }> | undefined)?.[key];
  return e?.message;
}

// ---------- parent sections ----------

function ParentEmployment({ who, control, register, errors }: { who: Who; control: Control<WizardForm>; register: UseFormRegister<WizardForm>; errors: FieldErrors<WizardForm> }) {
  const title = useWatch({ control, name: `${who}.title` });
  return (
    <div className="space-y-5">
      <Choice
        control={control}
        name={`${who}.title`}
        label="Tytuł ubezpieczenia"
        hint="Od tytułu zależy, czy ubezpieczenie chorobowe jest obowiązkowe, kto wypłaca zasiłek i jak liczona jest podstawa."
        options={[
          { value: "umowa_o_prace", label: "Umowa o pracę" },
          { value: "zlecenie", label: "Umowa zlecenie" },
          { value: "dzialalnosc", label: "Działalność gospodarcza" },
          { value: "brak", label: "Brak / nie pracuję" },
        ]}
      />
      {title !== "brak" && (
        <>
          {title !== "umowa_o_prace" && (
            <Choice
              control={control}
              name={`${who}.sickness`}
              label="Ubezpieczenie chorobowe"
              hint="Przy zleceniu i działalności chorobowe jest dobrowolne. Bez niego nie przysługuje zasiłek chorobowy ani macierzyński."
              columns={3}
              options={[
                { value: "dobrowolne", label: "Dobrowolne – opłacam" },
                { value: "brak", label: "Nie mam" },
                { value: "obowiazkowe", label: "Obowiązkowe" },
              ]}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Od kiedy" htmlFor={`${who}-from`} hint="Data rozpoczęcia ubezpieczenia – liczy się do okresu wyczekiwania (30 / 90 dni)." error={err(errors, who, "from")}>
              <Input id={`${who}-from`} type="date" {...register(`${who}.from`)} />
            </Row>
            <Row label="Do kiedy (jeśli umowa się kończy)" htmlFor={`${who}-to`} hint="Np. koniec umowy na czas określony lub zlecenia. Zasiłek macierzyński wymaga ubezpieczenia w dniu porodu." error={err(errors, who, "to")}>
              <Input id={`${who}-to`} type="date" {...register(`${who}.to`)} />
            </Row>
          </div>
          {title !== "dzialalnosc" && (
            <Choice
              control={control}
              name={`${who}.bigPayer`}
              label="Czy pracodawca / zleceniodawca zgłasza do ubezpieczenia chorobowego więcej niż 20 osób?"
              hint="Jeśli tak, zasiłek wypłaca on sam. Jeśli nie – wypłaca ZUS i potrzebne jest zaświadczenie Z-3 / Z-3a."
              columns={3}
              options={[
                { value: "tak", label: "Tak, więcej niż 20" },
                { value: "nie", label: "Nie, 20 lub mniej" },
                { value: "nie_wiem", label: "Nie wiem" },
              ]}
            />
          )}
          {title === "dzialalnosc" && (
            <Row label="Zadłużenie składkowe w ZUS (zł)" htmlFor={`${who}-debt`} hint="Zadłużenie na dzień powstania prawa wstrzymuje wypłatę zasiłku do czasu spłaty." error={err(errors, who, "debt")}>
              <Input id={`${who}-debt`} type="number" inputMode="decimal" min={0} step="0.01" placeholder="0" {...register(`${who}.debt`, num)} />
            </Row>
          )}
        </>
      )}
      <Check control={control} name={`${who}.age50`} label="Mam 50 lat lub więcej" hint="Od roku, w którym kończysz 50 lat, pracodawca płaci wynagrodzenie chorobowe przez 14 dni zamiast 33." />
    </div>
  );
}

function ParentIncome({ who, control, register, errors, months }: { who: Who; control: Control<WizardForm>; register: UseFormRegister<WizardForm>; errors: FieldErrors<WizardForm>; months: string[] }) {
  const title = useWatch({ control, name: `${who}.title` });
  const mode = useWatch({ control, name: `${who}.incomeMode` });
  if (title === "brak") return <p className="text-muted-foreground text-sm">Brak tytułu ubezpieczenia – nie pytamy o zarobki.</p>;
  if (title === "dzialalnosc") {
    return (
      <Row label="Deklarowana podstawa wymiaru składek (zł / mies.)" htmlFor={`${who}-declared`} hint="Przy działalności zasiłek liczony jest od zadeklarowanej podstawy składek z 12 miesięcy, pomniejszonej o 13,71%." error={err(errors, who, "declaredBase")}>
        <Input id={`${who}-declared`} type="number" inputMode="decimal" min={0} step="0.01" {...register(`${who}.declaredBase`, num)} />
      </Row>
    );
  }
  return (
    <div className="space-y-5">
      <Choice
        control={control}
        name={`${who}.incomeMode`}
        label="Jak podasz zarobki?"
        options={[
          { value: "szybki", label: "Szybko", desc: "jedna średnia kwota brutto" },
          { value: "szczegolowy", label: "Szczegółowo", desc: "12 miesięcy osobno – dokładniejsze" },
        ]}
      />
      {mode === "szybki" ? (
        <Row label="Średnie wynagrodzenie brutto (zł / mies.)" htmlFor={`${who}-avg`} hint="Podstawa zasiłku to średnia z 12 miesięcy przed miesiącem porodu, pomniejszona o 13,71% składek." error={err(errors, who, "avgGross")}>
          <Input id={`${who}-avg`} type="number" inputMode="decimal" min={0} step="0.01" {...register(`${who}.avgGross`, num)} />
        </Row>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            Wynagrodzenie brutto w kolejnych miesiącach
            <Hint text="Miesiące przepracowane w mniej niż połowie (np. przez chorobę) są pomijane przy liczeniu podstawy." />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {months.map((m, i) => (
              <div key={m} className="flex items-center gap-2 rounded-lg border p-2">
                <Label htmlFor={`${who}-m${i}`} className="w-16 shrink-0 font-mono text-xs">
                  {m}
                </Label>
                <Input id={`${who}-m${i}`} type="number" inputMode="decimal" min={0} step="0.01" className="h-8" aria-label={`Wynagrodzenie ${m}`} {...register(`${who}.months.${i}.gross`, num)} />
                <Controller
                  control={control}
                  name={`${who}.months.${i}.half`}
                  render={({ field }) => (
                    <label className="flex shrink-0 items-center gap-1 text-xs">
                      <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} aria-label={`${m}: przepracowano co najmniej połowę`} />
                      ≥ ½
                    </label>
                  )}
                />
              </div>
            ))}
          </div>
          {err(errors, who, "months") && <p className="text-destructive text-sm">{err(errors, who, "months")}</p>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Premie kwartalne – suma z ostatnich 4 kwartałów (zł)" htmlFor={`${who}-q`} hint="Premie kwartalne wliczają się do podstawy w wysokości 1/12 sumy z 4 kwartałów.">
          <Input id={`${who}-q`} type="number" inputMode="decimal" min={0} step="0.01" {...register(`${who}.quarterlyBonuses`, num)} />
        </Row>
        <Row label="Premia roczna za poprzedni rok (zł)" htmlFor={`${who}-a`} hint="Premia roczna wlicza się w wysokości 1/12.">
          <Input id={`${who}-a`} type="number" inputMode="decimal" min={0} step="0.01" {...register(`${who}.annualBonus`, num)} />
        </Row>
      </div>
    </div>
  );
}

// ---------- the wizard ----------

export function WizardFormView() {
  const router = useRouter();
  const setManual = useCaseStore((s) => s.setManual);
  const [step, setStep] = useState(0);
  const {
    control,
    register,
    trigger,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<WizardForm>({ resolver: zodResolver(WizardSchema), defaultValues: emptyWizard(), mode: "onTouched" });

  const situation = useWatch({ control, name: "situation" });
  const premature = useWatch({ control, name: "premature" });
  const childDeath = useWatch({ control, name: "childDeath" });
  const stillbirth = useWatch({ control, name: "stillbirth" });
  const fatherSkip = useWatch({ control, name: "fatherSkip" });
  const watched = useWatch({ control });
  const todayStr = useToday();
  const months = useMemo(() => (todayStr ? monthsBefore(referenceDate(watched as WizardForm, todayStr)) : []), [watched, todayStr]);

  async function next() {
    const fields = step === 3 && getValues("fatherSkip") ? [] : STEP_FIELDS[step];
    const ok = fields.length === 0 || (await trigger(fields as FieldPath<WizardForm>[]));
    if (ok) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Popraw zaznaczone pola");
    }
  }

  const save = handleSubmit(
    (data) => {
      const c = wizardToCase(data, today());
      const problems = [ScenarioSchema.safeParse(c.scenario), ...c.parents.map((p) => ParentDataSchema.safeParse(p))].filter((r) => !r.success);
      if (problems.length) {
        toast.error("Dane są niekompletne – sprawdź poprzednie kroki");
        return;
      }
      setManual(c);
      toast.success("Dane zapisane");
      router.push("/moja-sytuacja");
    },
    () => toast.error("Dane są niekompletne – sprawdź poprzednie kroki"),
  );

  const summary = step === 4 && todayStr ? wizardToCase(getValues(), todayStr) : null;

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6" noValidate>
      <Stepper steps={STEPS} current={step} />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{STEPS[step]}</CardTitle>
          <CardDescription>
            {step === 0 && "Na jakim etapie jesteś? Od tego zależy, które świadczenia sprawdzimy."}
            {step === 1 && "Ubezpieczenie mamy (lub pierwszego rodzica przy adopcji)."}
            {step === 2 && `Zarobki z 12 miesięcy przed miesiącem ${situation === "adopcja" || situation === "piecza" ? "przyjęcia dziecka" : "porodu"}.`}
            {step === 3 && "Drugi rodzic – żeby zaplanować podział urlopów."}
            {step === 4 && "Sprawdź dane przed zapisaniem. Zostaną tylko w tej karcie przeglądarki."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 0 && (
            <>
              <Choice
                control={control}
                name="situation"
                label="Moja sytuacja"
                columns={3}
                options={[
                  { value: "planuje", label: "Planuję dziecko" },
                  { value: "ciaza", label: "Jestem w ciąży" },
                  { value: "urodzenie", label: "Dziecko już jest" },
                  { value: "adopcja", label: "Adopcja" },
                  { value: "piecza", label: "Rodzina zastępcza", desc: "niezawodowa" },
                ]}
              />
              {situation === "planuje" && <p className="text-muted-foreground text-sm">Przyjmiemy orientacyjny termin porodu za 9 miesięcy.</p>}
              {situation === "ciaza" && (
                <Row label="Przewidywana data porodu" htmlFor="dueDate" hint="Na jej podstawie sprawdzimy, czy będziesz ubezpieczona w dniu porodu, i ułożymy kalendarz urlopów." error={errors.dueDate?.message}>
                  <Input id="dueDate" type="date" {...register("dueDate")} />
                </Row>
              )}
              {situation === "urodzenie" && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Row label="Data porodu" htmlFor="birthDate" error={errors.birthDate?.message} hint="Od tej daty liczony jest urlop macierzyński i termin 21 dni na wniosek o cały urlop.">
                      <Input id="birthDate" type="date" {...register("birthDate")} />
                    </Row>
                    <Row label="Liczba dzieci urodzonych przy jednym porodzie" htmlFor="children" error={errors.children?.message} hint="Przy wieloraczkach urlop macierzyński jest dłuższy (31–37 tygodni).">
                      <Input id="children" type="number" min={1} max={10} {...register("children", num)} />
                    </Row>
                  </div>
                  <Check control={control} name="zaZyciem" label="Mam zaświadczenie „Za życiem”" hint="Wydłuża urlop rodzicielski do 65 tygodni (67 przy wieloraczkach)." />
                  <Check control={control} name="premature" label="Dziecko urodziło się przedwcześnie lub było w szpitalu" hint="Daje prawo do urlopu uzupełniającego – do 8 lub 15 tygodni." />
                  {premature && (
                    <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-3">
                      <Row label="Tydzień ciąży przy porodzie" htmlFor="gestationWeek" error={errors.gestationWeek?.message}>
                        <Input id="gestationWeek" type="number" min={20} max={45} {...register("gestationWeek", num)} />
                      </Row>
                      <Row label="Masa urodzeniowa (g)" htmlFor="birthWeightG" error={errors.birthWeightG?.message}>
                        <Input id="birthWeightG" type="number" min={300} max={7000} {...register("birthWeightG", num)} />
                      </Row>
                      <Row label="Tygodnie w szpitalu" htmlFor="hospitalWeeks" error={errors.hospitalWeeks?.message}>
                        <Input id="hospitalWeeks" type="number" min={0} step="0.5" {...register("hospitalWeeks", num)} />
                      </Row>
                      <Row label="Od której doby po porodzie w szpitalu (dzieci donoszone)" htmlFor="hospitalStartDay" className="sm:col-span-3">
                        <Input id="hospitalStartDay" type="number" min={0} {...register("hospitalStartDay", num)} />
                      </Row>
                    </div>
                  )}
                  <Check control={control} name="childDeath" label="Dziecko zmarło lub urodziło się martwe" hint="W tej sytuacji urlop macierzyński jest krótszy – pokażemy, ile przysługuje, i gdzie szukać wsparcia." />
                  {childDeath && (
                    <div className="space-y-3 rounded-lg border p-3">
                      <Check control={control} name="stillbirth" label="Martwe urodzenie" />
                      {!stillbirth && (
                        <Row label="Data zgonu" htmlFor="childDeathDate" error={errors.childDeathDate?.message}>
                          <Input id="childDeathDate" type="date" {...register("childDeathDate")} />
                        </Row>
                      )}
                    </div>
                  )}
                </div>
              )}
              {(situation === "adopcja" || situation === "piecza") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Row label="Data przyjęcia dziecka" htmlFor="acceptDate" error={errors.acceptDate?.message} hint="Od niej liczony jest urlop na warunkach urlopu macierzyńskiego.">
                    <Input id="acceptDate" type="date" {...register("acceptDate")} />
                  </Row>
                  <Row label="Wiek dzieci (lata), np. 2 lub 2, 5" htmlFor="childAges" error={errors.childAges?.message} hint={situation === "adopcja" ? "Urlop przysługuje przy adopcji dziecka do 14 lat." : "W rodzinie zastępczej – dziecko do 7 lat (10 przy odroczonym obowiązku szkolnym)."}>
                    <Input id="childAges" inputMode="numeric" {...register("childAges")} />
                  </Row>
                  {situation === "piecza" && <Check control={control} name="postponedSchool" label="Dziecko ma odroczony obowiązek szkolny" />}
                </div>
              )}
            </>
          )}

          {step === 1 && <ParentEmployment who="mother" control={control} register={register} errors={errors} />}
          {step === 2 && <ParentIncome who="mother" control={control} register={register} errors={errors} months={months} />}
          {step === 3 && (
            <div className="space-y-5">
              <Check control={control} name="fatherSkip" label="Tata nie korzysta z urlopu / nie dotyczy" />
              {!fatherSkip && (
                <>
                  <ParentEmployment who="father" control={control} register={register} errors={errors} />
                  <ParentIncome who="father" control={control} register={register} errors={errors} months={months} />
                </>
              )}
            </div>
          )}
          {step === 4 && summary && (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground">Sytuacja</dt>
                <dd className="font-medium">
                  {summary.scenario.kind === "ciaza" && `Ciąża – termin ${summary.scenario.dueDate}`}
                  {summary.scenario.kind === "urodzenie" && `Poród ${summary.scenario.birthDate}, dzieci: ${summary.scenario.children}`}
                  {(summary.scenario.kind === "adopcja" || summary.scenario.kind === "piecza") &&
                    `${summary.scenario.kind === "adopcja" ? "Adopcja" : "Rodzina zastępcza"} ${summary.scenario.acceptDate}, wiek: ${summary.scenario.childAges.join(", ")}`}
                </dd>
              </div>
              {summary.parents.map((p) => {
                const period = p.periods[0];
                const avg = p.declaredBase?.[0]?.amount ?? (p.incomes.length ? p.incomes.reduce((s, m) => s + m.gross, 0) / p.incomes.length : undefined);
                return (
                  <div key={p.role} className="rounded-lg border p-3">
                    <dt className="text-muted-foreground">{p.role === "matka" ? "Mama" : "Tata"}</dt>
                    <dd className="font-medium">
                      {period
                        ? `${{ umowa_o_prace: "Umowa o pracę", zlecenie: "Zlecenie", dzialalnosc: "Działalność", inne: "Inny tytuł" }[period.title]}, chorobowe: ${period.sickness}, od ${period.from}${period.to ? ` do ${period.to}` : ""}`
                        : "Brak tytułu ubezpieczenia"}
                    </dd>
                    {avg !== undefined && (
                      <dd className="text-muted-foreground">
                        {p.declaredBase ? "Podstawa składek" : "Średnio brutto"}: <Money value={avg} />
                      </dd>
                    )}
                  </div>
                );
              })}
            </dl>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Wstecz
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Dalej
          </Button>
        ) : (
          <Button type="button" onClick={save}>
            Zapisz i zobacz moją sytuację
          </Button>
        )}
      </div>
    </form>
  );
}
