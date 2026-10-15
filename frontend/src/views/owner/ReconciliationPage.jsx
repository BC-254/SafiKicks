import React, { useState, useEffect, useCallback } from 'react';
import { ownerApi } from '../../api/owner.api';
import {
  Card,
  Button,
  Input,
  Textarea,
  Badge,
  PageSpinner,
  useToast,
} from '../../design-system';
import { formatKES, formatDate, formatDateTime } from '../../utils/formatters';
import {
  Coins,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Building2,
  FileText,
  History,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export function ReconciliationPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Daily report & cash status
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  // Close form
  const [cashCounted, setCashCounted] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const toast = useToast();

  const fetchDailyData = useCallback(async (date) => {
    try {
      setLoading(true);
      const res = await ownerApi.getDailyReport(date);
      setReport(res);

      if (res.dayClose) {
        setCashCounted(String(res.dayClose.cash_counted || ''));
        setBankRef(res.dayClose.bank_deposit_reference || '');
        setNotes(res.dayClose.notes || '');
      } else {
        setCashCounted('');
        setBankRef('');
        setNotes('');
      }
    } catch (err) {
      toast.error('Could not load daily report: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await ownerApi.getDayCloseHistory();
      setHistory(res.history || []);
    } catch (err) {
      toast.error('Could not load day close history');
    } finally {
      setHistoryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDailyData(selectedDate);
  }, [selectedDate, fetchDailyData]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Find cash expected from payment methods breakdown
  const cashMethod = report?.paymentMethodsBreakdown?.find((m) => m.method.toLowerCase() === 'cash');
  const expectedCash = parseFloat(cashMethod?.total || 0);

  // Live variance
  const countedNum = cashCounted === '' ? null : parseFloat(cashCounted);
  const variance = countedNum !== null && !isNaN(countedNum) ? countedNum - expectedCash : null;

  const handleSubmitClose = async (e) => {
    e.preventDefault();
    if (countedNum === null || isNaN(countedNum)) {
      toast.error('Please enter a valid counted cash amount.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await ownerApi.submitDayClose({
        close_date: selectedDate,
        cash_counted: countedNum,
        bank_deposit_reference: bankRef,
        notes,
      });

      toast.success(res.message || 'Daily close saved successfully.');
      fetchDailyData(selectedDate);
      fetchHistory();
    } catch (err) {
      toast.error('Failed to submit day close: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 700,
          letterSpacing: '-0.025em',
          color: 'var(--color-text)',
          marginBottom: 'var(--space-1)',
        }}>
          Daily Cash Close & Reconciliation
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Physical drawer cash reconciliation against immutable payment ledger records
        </p>
      </div>

      {/* Date Selector Banner */}
      <Card style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Calendar size={18} color="var(--color-accent)" />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
              Reconciliation Date:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--color-text)',
                outline: 'none',
              }}
            />
            {selectedDate === todayStr && (
              <Badge variant="info" size="sm">Today</Badge>
            )}
          </div>

          <div>
            {report?.dayClose ? (
              <Badge variant="success">
                <CheckCircle2 size={12} style={{ marginRight: '4px' }} />
                Closed on {formatDateTime(report.dayClose.created_at)}
              </Badge>
            ) : (
              <Badge variant="warning">
                <Clock size={12} style={{ marginRight: '4px' }} />
                Pending Close
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Main Reconciliation Interface */}
      {loading ? (
        <PageSpinner message="Calculating drawer ledger..." />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 'var(--space-6)',
          alignItems: 'start',
        }}>
          {/* Left: Close Form */}
          <Card style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Coins size={20} color="var(--color-accent)" />
              Cash Drawer Count
            </h3>

            {/* Computed expected cash pill */}
            <div style={{
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-surface-sunken)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-5)',
            }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                System Expected Cash in Drawer
              </div>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-text)', marginTop: 'var(--space-1)' }}>
                {formatKES(expectedCash)}
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                Calculated from verified cash payments minus refunds/reversals on {selectedDate}
              </p>
            </div>

            <form onSubmit={handleSubmitClose} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                  Physically Counted Cash (KES) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 15000"
                  value={cashCounted}
                  onChange={(e) => setCashCounted(e.target.value)}
                  required
                />
              </div>

              {/* Live Variance Callout */}
              {variance !== null && (
                <div style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: Math.abs(variance) < 0.01
                    ? 'rgba(52, 199, 89, 0.1)'
                    : variance < 0
                    ? 'rgba(255, 59, 48, 0.1)'
                    : 'rgba(0, 113, 227, 0.1)',
                  border: `1px solid ${
                    Math.abs(variance) < 0.01
                      ? 'var(--color-success)'
                      : variance < 0
                      ? 'var(--color-danger)'
                      : 'var(--color-accent)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {Math.abs(variance) < 0.01 ? (
                      <CheckCircle2 size={18} color="var(--color-success)" />
                    ) : variance < 0 ? (
                      <TrendingDown size={18} color="var(--color-danger)" />
                    ) : (
                      <TrendingUp size={18} color="var(--color-accent)" />
                    )}
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                      {Math.abs(variance) < 0.01
                        ? 'Drawer is Perfectly Balanced'
                        : variance < 0
                        ? `Cash Shortfall: ${formatKES(Math.abs(variance))}`
                        : `Cash Surplus: ${formatKES(variance)}`}
                    </span>
                  </div>

                  <span style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: Math.abs(variance) < 0.01
                      ? 'var(--color-success)'
                      : variance < 0
                      ? 'var(--color-danger)'
                      : 'var(--color-accent)',
                  }}>
                    {variance > 0 ? `+${formatKES(variance)}` : formatKES(variance)}
                  </span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                  Bank Deposit Slip / Reference Number (Optional)
                </label>
                <Input
                  placeholder="e.g. KCB-DEP-20261015-881"
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                  Reconciliation Notes / Variance Justification
                </label>
                <Textarea
                  placeholder="Explain any variance or drawer discrepancies..."
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={submitting}
              >
                {submitting ? 'Recording Close...' : report?.dayClose ? 'Update Daily Close' : 'Confirm & Close Day'}
              </Button>
            </form>
          </Card>

          {/* Right: Breakdown of Collections by Method on Selected Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Card style={{ padding: 'var(--space-5)' }}>
              <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
                Collections by Channel ({selectedDate})
              </h4>

              {report?.paymentMethodsBreakdown?.length === 0 ? (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                  No payments recorded for this date.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {report.paymentMethodsBreakdown.map((pm) => (
                    <div
                      key={pm.method}
                      style={{
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-surface-sunken)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', textTransform: 'uppercase' }}>
                          {pm.method}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                          {pm.count} transaction{pm.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)' }}>
                        {formatKES(pm.total)}
                      </div>
                    </div>
                  ))}

                  <div style={{
                    marginTop: 'var(--space-2)',
                    paddingTop: 'var(--space-3)',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                  }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>Total Collections</span>
                    <span style={{ fontSize: 'var(--text-base)', color: 'var(--color-accent)' }}>
                      {formatKES(report?.totalRevenue || 0)}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            <Card style={{ padding: 'var(--space-5)' }}>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
                Auditing Rule SEC-03
              </h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Daily drawer close events cannot delete or alter individual job payment records. Any discrepancies are permanently recorded with your user ID and timestamp for reconciliation audit.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* History of Past Day Closes */}
      <Card style={{ overflow: 'hidden' }}>
        <div style={{
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: 'var(--card-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}>
          <History size={18} color="var(--color-accent)" />
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text)' }}>
            Past Reconciliation History (Last 30 Days)
          </h3>
        </div>

        {historyLoading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <PageSpinner message="Loading past close history..." />
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No past daily closes recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{
                  borderBottom: 'var(--card-border)',
                  color: 'var(--color-text-tertiary)',
                  textAlign: 'left',
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  backgroundColor: 'var(--color-surface-sunken)',
                }}>
                  <th style={{ padding: 'var(--space-3) var(--space-5)', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Expected</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Counted</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Variance</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Bank Reference</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Closed By</th>
                  <th style={{ padding: 'var(--space-3) var(--space-5)', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const varNum = parseFloat(h.variance || 0);
                  return (
                    <tr
                      key={h.id}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <td style={{ padding: 'var(--space-3) var(--space-5)', fontWeight: 600, color: 'var(--color-text)' }}>
                        {formatDate(h.close_date)}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>
                        {formatKES(h.cash_expected)}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-text)' }}>
                        {formatKES(h.cash_counted)}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '980px',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          backgroundColor: Math.abs(varNum) < 0.01 ? 'rgba(52, 199, 89, 0.12)' : varNum < 0 ? 'rgba(255, 59, 48, 0.12)' : 'rgba(0, 113, 227, 0.12)',
                          color: Math.abs(varNum) < 0.01 ? 'var(--color-success)' : varNum < 0 ? 'var(--color-danger)' : 'var(--color-accent)',
                        }}>
                          {varNum > 0 ? `+${formatKES(varNum)}` : formatKES(varNum)}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                        {h.bank_deposit_reference || '—'}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                        {h.closed_by_name}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-5)', textAlign: 'right' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDate(new Date(h.close_date).toISOString().split('T')[0])}
                        >
                          View Date
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
