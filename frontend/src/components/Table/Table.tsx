import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

function Table({ className = '', ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className={`w-full text-left text-sm ${className}`} {...props} />
    </div>
  )
}

function TableHeader({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`bg-neutral-50 ${className}`} {...props} />
}

function TableBody({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`divide-y divide-neutral-200 ${className}`} {...props} />
}

function TableRow({ className = '', ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`${className}`} {...props} />
}

function TableHeaderCell({ className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500 ${className}`}
      {...props}
    />
  )
}

function TableCell({ className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-3 text-neutral-700 ${className}`} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell }
