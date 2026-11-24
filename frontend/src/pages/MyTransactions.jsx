import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { TX_TYPE, formatDate, formatPrice, formatVND } from '../utils.js'

function TxCard({ tx, role, onAction }) {
  return (
    <div className="card pad tx-card">
      <div className="tx-head">
        <span className={`badge ${tx.type === 'deposit' ? 'badge-primary' : 'badge-muted'}`}>{TX_TYPE[tx.type]}</span>
        <StatusBadge status={tx.status} kind="tx" />
        <span className="muted small">#{tx.id} · {formatDate(tx.created_at, true)}</span>
      </div>
      <Link to={`/listings/${tx.listing_id}`} className="list-title">{tx.listing_title}</Link>
      <div className="muted small">
        Giá: {formatPrice(tx.listing_price, tx.listing_transaction_type)}
        {tx.listing_status === 'deposited' && <> · <StatusBadge status="deposited" /></>}
      </div>
      <div className="tx-info">
        {role === 'owner' ? (
          <div>Người gửi: <b>{tx.buyer_name}</b> ({tx.buyer_email}) · SĐT: <b>{tx.phone}</b></div>
        ) : (
          <div>Người đăng: <b>{tx.owner_name}</b> · SĐT: <b>{tx.owner_phone}</b></div>
        )}
        {tx.type === 'contact' && tx.viewing_date && <div>Ngày muốn xem: <b>{formatDate(tx.viewing_date)}</b></div>}
        {tx.type === 'deposit' && <div>Số tiền đặt cọc: <b className="price">{formatVND(tx.deposit_amount)}</b></div>}
        {tx.message && <div className="tx-message">“{tx.message}”</div>}
      </div>
      {tx.status === 'pending' && (
        <div className="tx-actions">
          {role === 'owner' ? (
            <>
              <button className="btn btn-primary" onClick={() => onAction(tx, 'accept')}>Chấp nhận</button>
              <button className="btn btn-danger" onClick={() => onAction(tx, 'reject')}>Từ chối</button>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={() => onAction(tx, 'cancel')}>Hủy yêu cầu</button>
          )}
        </div>
      )}
    </div>
  )
}

export default function MyTransactions() {
  const [tab, setTab] = useState('received')
  const [received, setReceived] = useState(null)
  const [sent, setSent] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = () =>
    Promise.all([api('/api/transactions/received'), api('/api/transactions/sent')])
      .then(([r, s]) => {
        setReceived(r)
        setSent(s)
      })
      .catch((err) => setError(err.message))

  useEffect(() => {
    load()
  }, [])

  const confirmText = {
    accept: 'Chấp nhận yêu cầu này?',
    reject: 'Từ chối yêu cầu này?',
    cancel: 'Hủy yêu cầu này?',
  }

  const onAction = async (tx, action) => {
    let text = confirmText[action]
    if (action === 'accept' && tx.type === 'deposit') {
      text = 'Chấp nhận đặt cọc? Tin sẽ chuyển sang "Đã đặt cọc" và các yêu cầu đặt cọc khác sẽ bị từ chối.'
    }
    if (!window.confirm(text)) return
    setError('')
    try {
      await api(`/api/transactions/${tx.id}/${action}`, { method: 'POST' })
      setNotice('Đã cập nhật trạng thái giao dịch.')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const list = tab === 'received' ? received : sent
  const pendingCount = (received || []).filter((t) => t.status === 'pending').length

  return (
    <div>
      <h1 className="page-title">Giao dịch của tôi</h1>
      <div className="tabs tabs-lg">
        <button className={tab === 'received' ? 'active' : ''} onClick={() => setTab('received')}>
          Yêu cầu nhận được {pendingCount > 0 && <span className="count">{pendingCount}</span>}
        </button>
        <button className={tab === 'sent' ? 'active' : ''} onClick={() => setTab('sent')}>
          Yêu cầu đã gửi
        </button>
      </div>
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {!list && !error && <div className="empty">Đang tải...</div>}
      {list && list.length === 0 && (
        <div className="empty">
          {tab === 'received' ? 'Chưa có ai gửi yêu cầu cho tin của bạn.' : 'Bạn chưa gửi yêu cầu nào.'}
        </div>
      )}
      <div className="tx-list">
        {list?.map((tx) => (
          <TxCard key={tx.id} tx={tx} role={tab === 'received' ? 'owner' : 'buyer'} onAction={onAction} />
        ))}
      </div>
    </div>
  )
}
