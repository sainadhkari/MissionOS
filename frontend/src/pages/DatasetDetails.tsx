import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Database } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Loading from '../components/Loading'
import Banner from '../components/Banner'
import EmptyState from '../components/EmptyState'
import { buttonClasses } from '../components/Button'
import { Table, TableBody, TableHeader, TableHeaderCell, TableRow, TableCell } from '../components/Table'
import { ROUTES, missionDetailsPath } from '../constants/routes'
import { useDatasetDetails } from '../hooks/useDatasetDetails'
import { formatDate } from '../utils/date'
import {
  columnCategoryBadgeVariant,
  columnCategoryLabel,
  datasetStatusBadgeVariant,
  datasetStatusLabel,
  formatFileSize,
  formatStatValue,
} from '../utils/dataset'
import type { Dataset } from '../types/Dataset'

function DatasetDetails() {
  const { datasetId } = useParams<{ datasetId: string }>()
  const state = useDatasetDetails(datasetId)

  if (state.status === 'loading') {
    return (
      <div>
        <PageHeader title="Dataset Details" />
        <Loading />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div>
        <PageHeader title="Dataset Details" />
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title={state.message}
            action={
              <Link to={ROUTES.dataLibrary} className={buttonClasses('outline', 'sm')}>
                Back to Data Library
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  return <DatasetDetailsView dataset={state.data} />
}

function DatasetDetailsView({ dataset }: { dataset: Dataset }) {
  const { profile, upload_status: status } = dataset

  return (
    <div>
      <PageHeader
        title={dataset.original_filename}
        subtitle={`${dataset.file_type.toUpperCase()} · ${formatFileSize(dataset.file_size)} · uploaded ${formatDate(dataset.created_at)}`}
        actions={
          <>
            <Badge variant={datasetStatusBadgeVariant(status)}>{datasetStatusLabel(status)}</Badge>
            <Link
              to={missionDetailsPath(dataset.mission_id)}
              className={buttonClasses('outline', 'sm')}
            >
              Back to Mission
            </Link>
          </>
        }
      />

      {(status === 'uploaded' || status === 'validating') && (
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <Loading />
            <p className="text-sm font-medium text-neutral-900">Validating dataset…</p>
            <p className="max-w-xs text-sm text-neutral-500">
              Reading the file, detecting its structure, and computing column statistics. This
              page updates automatically.
            </p>
          </div>
        </Card>
      )}

      {status === 'failed' && (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Validation failed"
            description="This file could not be read or profiled."
          />
          {profile?.validation_errors && profile.validation_errors.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {profile.validation_errors.map((error, index) => (
                <Banner key={index} variant="danger">
                  {error}
                </Banner>
              ))}
            </div>
          )}
        </Card>
      )}

      {status === 'ready' && profile && (
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-neutral-900">Summary</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryStat label="Rows" value={profile.row_count.toLocaleString()} />
              <SummaryStat label="Columns" value={profile.column_count.toLocaleString()} />
              <SummaryStat
                label="Duplicate Rows"
                value={profile.duplicate_row_count.toLocaleString()}
              />
              <SummaryStat label="Encoding" value={profile.encoding ?? '—'} />
            </div>
            {profile.delimiter && (
              <p className="mt-4 text-xs text-neutral-400">
                Delimiter detected: <code className="text-neutral-600">{profile.delimiter}</code>
              </p>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-neutral-900">Columns</h2>
            {profile.columns.length === 0 ? (
              <EmptyState icon={Database} title="No columns detected" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Column</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Category</TableHeaderCell>
                    <TableHeaderCell>Missing</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profile.columns.map((column) => (
                    <TableRow key={column.name}>
                      <TableCell className="font-medium text-neutral-900">{column.name}</TableCell>
                      <TableCell>
                        <code className="text-xs text-neutral-500">{column.dtype}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={columnCategoryBadgeVariant(column.category)}>
                          {columnCategoryLabel(column.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {column.missing_count.toLocaleString()}
                        {profile.row_count > 0 && (
                          <span className="ml-1 text-xs text-neutral-400">
                            ({((column.missing_count / profile.row_count) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {Object.keys(profile.numeric_summary).length > 0 && (
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-neutral-900">Numeric Statistics</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Column</TableHeaderCell>
                    <TableHeaderCell>Min</TableHeaderCell>
                    <TableHeaderCell>Max</TableHeaderCell>
                    <TableHeaderCell>Mean</TableHeaderCell>
                    <TableHeaderCell>Median</TableHeaderCell>
                    <TableHeaderCell>Std Dev</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(profile.numeric_summary).map(([column, summary]) => (
                    <TableRow key={column}>
                      <TableCell className="font-medium text-neutral-900">{column}</TableCell>
                      <TableCell>{formatStatValue(summary.min)}</TableCell>
                      <TableCell>{formatStatValue(summary.max)}</TableCell>
                      <TableCell>{formatStatValue(summary.mean)}</TableCell>
                      <TableCell>{formatStatValue(summary.median)}</TableCell>
                      <TableCell>{formatStatValue(summary.std)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {Object.keys(profile.categorical_summary).length > 0 && (
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-neutral-900">
                Categorical Statistics
              </h2>
              <div className="flex flex-col gap-5">
                {Object.entries(profile.categorical_summary).map(([column, summary]) => (
                  <div key={column}>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-sm font-medium text-neutral-900">{column}</h3>
                      <span className="text-xs text-neutral-400">
                        {summary.unique_count.toLocaleString()} unique values
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {summary.top_values.map((entry, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700"
                        >
                          {String(entry.value ?? '—')}
                          <span className="text-neutral-400">×{entry.count.toLocaleString()}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  )
}

export default DatasetDetails
