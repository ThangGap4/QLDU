export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null
  const items = []
  for (let i = 1; i <= pages; i += 1) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) items.push(i)
    else if (items[items.length - 1] !== '…') items.push('…')
  }
  return (
    <div className="pagination">
      <button className="btn btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ Trước</button>
      {items.map((it, idx) =>
        it === '…' ? (
          <span key={`e${idx}`} className="muted">…</span>
        ) : (
          <button
            key={it}
            className={`btn ${it === page ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onChange(it)}
          >
            {it}
          </button>
        ),
      )}
      <button className="btn btn-ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>Sau ›</button>
    </div>
  )
}
