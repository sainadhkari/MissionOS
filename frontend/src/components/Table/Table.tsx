import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

function Table({ className = '', ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className={`w-full text-left text-sm ${className}`} {...props} />
    </div>
  )
}

function TableHeader({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`bg-neutral-50 dark:bg-neutral-900/60 ${className}`} {...props} />
}

function TableBody({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={`divide-y divide-neutral-200 dark:divide-neutral-800 dark:bg-neutral-900 ${className}`}
      {...props}
    />
  )
}

function TableRow({ className = '', ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${className}`} {...props} />
}

function TableHeaderCell({ className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ${className}`}
      {...props}
    />
  )
}

function TableCell({ className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-3 text-neutral-700 dark:text-neutral-300 ${className}`} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell }
