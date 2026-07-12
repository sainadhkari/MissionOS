import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileCode, FileText } from 'lucide-react'
import Banner from '../Banner'
import { buttonClasses } from '../Button'
import { analysisService } from '../../services/analysis'
import { getErrorMessage } from '../../utils/http'
import type { ReportFormat } from '../../types/Analysis'

const FORMATS: { value: ReportFormat; label: string; icon: typeof FileText }[] = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'html', label: 'HTML', icon: FileCode },
]

interface ExportReportMenuProps {
  missionId: string
}

function ExportReportMenu({ missionId }: ExportReportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleExport(format: ReportFormat) {
    setIsOpen(false)
    setError(null)
    setIsExporting(true)
    try {
      await analysisService.downloadReport(missionId, format)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not export report.'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={isExporting}
        className={`${buttonClasses('outline', 'sm')} disabled:pointer-events-none disabled:opacity-50`}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {isExporting ? 'Exporting…' : 'Export Report'}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-1 w-36 rounded-md border border-neutral-200 bg-white py-1 shadow-card dark:border-neutral-800 dark:bg-neutral-900">
          {FORMATS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleExport(value)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Icon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <Banner variant="danger" className="absolute right-0 top-full z-10 mt-2 w-64">
          {error}
        </Banner>
      )}
    </div>
  )
}

export default ExportReportMenu
