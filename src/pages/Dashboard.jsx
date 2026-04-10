import { useState, useEffect } from 'react';
import { dashboardAPI, loanAPI } from '../services/api';
import { format, parseISO } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentLoans, setRecentLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [statsRes, loansRes] = await Promise.all([
        dashboardAPI.getStats(),
        loanAPI.getAll(),
      ]);
      setStats(statsRes.data.data);
      setRecentLoans(loansRes.data.data.slice(0, 5));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const STAT_CARDS = stats
    ? [
        { label: 'Total Borrowers', value: stats.totalBorrowers, icon: 'bi-people-fill', color: '#3b82f6', bg: '#eff6ff' },
        { label: 'Active Loans', value: stats.activeLoans, icon: 'bi-check-circle-fill', color: '#10b981', bg: '#ecfdf5' },
        { label: 'Completed Loans', value: stats.completedLoans, icon: 'bi-patch-check-fill', color: '#6366f1', bg: '#eef2ff' },
        { label: 'Defaulted Loans', value: stats.defaultedLoans, icon: 'bi-exclamation-diamond-fill', color: '#ef4444', bg: '#fef2f2' },
        { label: 'Overdue Payments', value: stats.overduePayments, icon: 'bi-clock-history', color: '#f59e0b', bg: '#fffbeb' },
        {
          label: 'Total Principal (Active)',
          value: `₹${Number(stats.totalPrincipal).toLocaleString('en-IN')}`,
          icon: 'bi-currency-rupee',
          color: '#0ea5e9',
          bg: '#f0f9ff',
        },
        {
          label: 'Total Disbursed',
          value: `₹${Number(stats.totalDisbursed).toLocaleString('en-IN')}`,
          icon: 'bi-bank',
          color: '#7c3aed',
          bg: '#f5f3ff',
        },
        {
          label: 'Interest Earned',
          value: `₹${Number(stats.totalInterestEarned).toLocaleString('en-IN')}`,
          icon: 'bi-graph-up-arrow',
          color: '#16a34a',
          bg: '#f0fdf4',
        },
        {
          label: 'Amount Recovered',
          value: `₹${Number(stats.totalAmountRecovered).toLocaleString('en-IN')}`,
          icon: 'bi-arrow-down-circle-fill',
          color: '#dc2626',
          bg: '#fef2f2',
        },
      ]
    : [];

  const STATUS_COLORS = { ACTIVE: 'success', COMPLETED: 'secondary', DEFAULTED: 'danger' };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
      <div className="spinner-border text-primary" />
    </div>
  );

  if (error) return (
    <div className="alert alert-danger d-flex align-items-center gap-2">
      <i className="bi bi-exclamation-triangle-fill"></i>
      {error} — is the backend running on port 8080?
    </div>
  );

  return (
    <div>
      {/* Stats Grid */}
      <div className="row g-3 mb-4">
        {STAT_CARDS.map((card) => (
          <div className="col-xl col-lg-4 col-sm-6" key={card.label}>
            <div className="card stat-card h-100">
              <div className="card-body p-3">
                <div className="stat-icon mb-2" style={{ background: card.bg, color: card.color }}>
                  <i className={`bi ${card.icon}`}></i>
                </div>
                <div className="fw-bold fs-5 mb-0">{card.value}</div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Loans */}
      <div className="table-card">
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-semibold">Recent Loans</h6>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Principal</th>
                <th>Rate</th>
                <th>Tenure</th>
                <th>Monthly Interest</th>
                <th>Disbursed</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentLoans.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted py-3">No loans yet</td></tr>
              ) : recentLoans.map((loan) => {
                const monthlyInterest = ((loan.principal * loan.interestRate) / 100).toFixed(2);
                return (
                  <tr key={loan.id}>
                    <td className="fw-medium">{loan.borrower?.name}</td>
                    <td>₹{Number(loan.principal).toLocaleString('en-IN')}</td>
                    <td>{loan.interestRate}%</td>
                    <td>{loan.tenureMonths}m</td>
                    <td className="text-primary">₹{Number(monthlyInterest).toLocaleString('en-IN')}</td>
                    <td className="text-success">₹{Number(loan.disbursedAmount).toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge bg-${STATUS_COLORS[loan.status]}`}>{loan.status}</span>
                    </td>
                    <td className="text-muted">
                      {loan.disbursementDate ? format(parseISO(loan.disbursementDate), 'dd MMM yyyy') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
