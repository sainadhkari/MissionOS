import type { PropsWithChildren } from 'react'

interface ReportSectionProps {
  title: string
  /** Forces a new printed page before this section — used for the major
   * section breaks so a card is never sliced across two printed pages. */
  pageBreakBefore?: boolean
}

/** Renders the exact same section-heading style already used throughout
 * the Executive Dashboard (`text-sm font-semibold ...`) — no numbering,
 * no icon, no extra chrome — so a printed section header looks identical
 * to its on-screen counterpart. The only thing this adds beyond a plain
 * `<div>` is print pagination behavior (`break-inside-avoid-page`, and an
 * optional forced page break), both no-ops outside paged/print media. */
function ReportSection({ title, pageBreakBefore, children }: PropsWithChildren<ReportSectionProps>) {
  return (
    <section className={`break-inside-avoid-page ${pageBreakBefore ? 'print:break-before-page' : ''}`}>
      <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
      {children}
    </section>
  )
}

export default ReportSection
