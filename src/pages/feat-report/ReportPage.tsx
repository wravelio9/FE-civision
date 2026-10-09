import { useState } from 'react'
import { AppLayout } from '../../components/AppLayout'
import { Icon } from '../../components/Icons'
// Placeholder officer. Save the officer from the Report Details design as
// src/assets/officer-report.png, then change this line to import that file instead.
import officerImg from '../../assets/officer-report.png'
import './ReportPage.css'

/* ---------- Mock data (replace with data from the API later) ---------- */
const STATS = [
  { key: 'total', value: 15280, label: 'Total Reports' },
  { key: 'valid', value: 12702, label: 'Valid Reports' },
  { key: 'invalid', value: 2415, label: 'Invalid Reports' },
  { key: 'unverified', value: 163, label: 'Unverified Reports' },
]

// Same status order as the design, repeated for every page.
const STATUS_PATTERN = ['Valid', 'Valid', 'Invalid', 'Unverified', 'Valid', 'Invalid', 'Unverified', 'Unverified', 'Valid']

const REPORTS = Array.from({ length: 63 }, (_, i) => ({
  id: String(i + 1).padStart(5, '0'),
  location: 'Jl. Raya Kb. Jeruk No.27, Kebon Jeruk, Jakarta Barat',
  date: '26/09/2026',
  timestamp: '13:19:27',
  mediaUrl: '#',
  status: STATUS_PATTERN[i % STATUS_PATTERN.length],
}))

const ROWS_PER_PAGE = 9

// Which page buttons to show: the first two, the last two, and the pages next to
// the current one. Missing numbers in between become "…".
// Example: page 1 of 7 -> 1 2 … 6 7
function getPageItems(current: number, total: number): (number | 'gap')[] {
  const candidates = [1, 2, current - 1, current, current + 1, total - 1, total]
  const pages = [...new Set(candidates)]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)

  const items: (number | 'gap')[] = []
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) items.push('gap')
    items.push(p)
  })
  return items
}

export default function ReportPage() {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(REPORTS.length / ROWS_PER_PAGE)
  const rows = REPORTS.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  return (
    <AppLayout title="Report Details">
      {/* Stats card + officer */}
      <section className="report-hero">
        <div className="report-stats">
          {STATS.map((stat) => (
            <div key={stat.key} className={`report-stat report-stat--${stat.key}`}>
              <span className="report-stat__value">{stat.value}</span>
              <span className="report-stat__label">{stat.label}</span>
            </div>
          ))}
        </div>
        <img className="report-hero__officer" src={officerImg} alt="" />
      </section>

      {/* Reports table */}
      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Location</th>
              <th scope="col">Date</th>
              <th scope="col">Timestamp</th>
              <th scope="col">Media</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td className="report-table__location" title={row.location}>
                  {row.location}
                </td>
                <td className="report-table__center">{row.date}</td>
                <td className="report-table__center">{row.timestamp}</td>
                <td className="report-table__center">
                  <a className="report-table__link" href={row.mediaUrl}>
                    Link
                  </a>
                </td>
                <td>
                  <div className="report-table__status-cell">
                    <span className={`report-status report-status--${row.status.toLowerCase()}`}>
                      <span className="report-status__dot" />
                      {row.status}
                    </span>
                    <button
                      type="button"
                      className="report-table__download"
                      aria-label={`Download report ${row.id}`}
                    >
                      <Icon.Download />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <nav className="report-pagination" aria-label="Report pages">
        <div className="report-pagination__pages">
          {getPageItems(page, totalPages).map((item, i) =>
            item === 'gap' ? (
              <span key={`gap-${i}`} className="report-pagination__gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`report-pagination__page${item === page ? ' report-pagination__page--active' : ''}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => setPage(item)}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          className="report-pagination__next"
          aria-label="Next page"
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
        >
          <Icon.ArrowRight />
        </button>
      </nav>
    </AppLayout>
  )
}
