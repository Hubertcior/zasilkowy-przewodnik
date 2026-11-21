import type { RenderedForm } from "@/forms/types";

/** Printable preview of an application with a clear "SYMULACJA" watermark (no ZUS logo or emblem). */
export function DocumentPreview({ doc, attachments, signature }: { doc: RenderedForm; attachments: string[]; signature: string }) {
  return (
    <article
      aria-label="Podgląd wniosku – symulacja"
      className="relative mx-auto max-w-3xl overflow-hidden rounded-lg border bg-white p-6 text-sm text-neutral-900 shadow-sm sm:p-10 print:max-w-none print:border-0 print:p-0 print:shadow-none"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-around select-none">
        {[0, 1, 2].map((i) => (
          <span key={i} className="-rotate-30 text-xl font-black tracking-widest whitespace-nowrap text-red-600/15 uppercase sm:text-4xl">
            SYMULACJA – wzór niewiążący
          </span>
        ))}
      </div>
      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-neutral-400 pb-3">
          <p className="text-xs text-neutral-600">Zasiłkowy Przewodnik · wzór wniosku</p>
          <span className="rounded border-2 border-dashed border-red-600 px-2 py-0.5 text-xs font-bold tracking-wider text-red-700 uppercase">Symulacja</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <p className="whitespace-pre-line">{doc.intro ?? ""}</p>
          <p className="sm:text-right">
            Adresat: <strong>{doc.addressee}</strong>
          </p>
        </div>
        <h2 className="text-center text-base font-semibold sm:text-lg">{doc.title}</h2>
        {doc.rows && (
          <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,14rem)_1fr]">
            {doc.rows.map((r) => (
              <div key={r.label} className="contents">
                <dt className="text-neutral-600">{r.label}</dt>
                <dd className="font-medium break-words">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="space-y-3 leading-relaxed">
          {doc.paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
        <p className="pt-6 text-right text-neutral-600">……………………………………<br />{signature}</p>
        {attachments.length > 0 && (
          <div className="space-y-1">
            <p className="font-medium">Załączniki:</p>
            <ol className="list-decimal space-y-1 pl-5">
              {attachments.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>
          </div>
        )}
        <p className="border-t border-dashed border-neutral-400 pt-3 text-xs text-neutral-600">
          Wzór przygotowany w symulacji na podstawie przepisów. Przed złożeniem sprawdź dane. Wysyłka z tej aplikacji jest symulowana.
        </p>
      </div>
    </article>
  );
}
