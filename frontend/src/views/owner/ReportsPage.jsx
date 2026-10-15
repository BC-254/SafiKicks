import React, { useState, useEffect, useCallback } from 'react';
import { ownerApi } from '../../api/owner.api';
import {
  Card,
  Button,
  Badge,
  PageSpinner,
  useToast,
} from '../../design-system';
import { formatKES, formatDate } from '../../utils/formatters';
import {
  BarChart3,
  Calendar,
  MessageSquare,
  TrendingUp,
  Package,
  CheckCircle2,
  PackageCheck,
  CreditCard,
  Smartphone,
  Coins,
} from 'lucide-react';

export function ReportsPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [loading, setLoading] = useState(true);
  const [dailyReport, setDailyReport] = useState(null);

  // SMS analytics
  const [smsLoading, setSmsLoading] = useState(true);
  const [smsData, setSmsData] = useState(null);

  const toast = useToast();

  const fetchDailyReport = useCallback(async (date) => {
    try {
      setLoading(true);
      const res = await ownerApi.getDailyReport(date);
      setDailyReport(res);
    } catch (err) {
      toast.error('Could not load daily report: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchSmsVolume = useCallback(async () => {
    try {
      setSmsLoading(true);
      const res = await ownerApi.getSmsVolume();
      setSmsData(res);
    } catch (err) {
      toast.error('Could not load SMS volume: ' + (err.response?.data?.error || err.message));
    } finally {
      setSmsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDailyReport(selectedDate);
  }, [selectedDate, fetchDailyReport]);

  useEffect(() => {
    fetchSmsVolume();
  }, [fetchSmsVolume]);

  const {
    jobsReceived = 0,
    jobsCompleted = 0,
    jobsPicked = 0,
    totalRevenue = 0,
    serviceBreakdown = [],
    paymentMethodsBreakdown = [],
  } = dailyReport || {};

  const totalServiceRev = serviceBreakdown.reduce((sum, s) => sum + parseFloat(s.revenue || 0), 0);

  // SVG Bar Chart dimensions for 30-day SMS volume
  const dailyVolume = smsData?.dailyVolume || [];
  const maxSmsCount = Math.max(1, ...dailyVolume.map((d) => d.count));
  const chartHeight = 120;
  const chartWidth = 580;
  const barWidth = 12;
  const barGap = 6;

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
          Financial & SMS Analytics
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Daily revenue breakdown by service, payment method distribution, and 30-day SMS dispatch trends
        </p>
      </div>

      {/* Date Filter Bar */}
      <Card style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Calendar size={18} color="var(--color-accent)" />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
              Report Date:
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

          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            Reporting Timezone: <strong>Africa/Nairobi (EAT)</strong>
          </div>
        </div>
      </Card>

      {/* Operational Highlights for Selected Date */}
      {loading ? (
        <PageSpinner message="Compiling daily metrics..." />
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
          }}>
            <Card style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Total Revenue
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-accent)', marginTop: 'var(--space-1)' }}>
                {formatKES(totalRevenue)}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Net collections on {selectedDate}
              </div>
            </Card>

            <Card style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Jobs Received
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text)', marginTop: 'var(--space-1)' }}>
                {jobsReceived}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Intakes or registered
              </div>
            </Card>

            <Card style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Repairs Completed
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-success)', marginTop: 'var(--space-1)' }}>
                {jobsCompleted}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Marked finished by repairer
              </div>
            </Card>

            <Card style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Jobs Picked Up
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text)', marginTop: 'var(--space-1)' }}>
                {jobsPicked}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Released via OTP or override
              </div>
            </Card>
          </div>

          {/* Revenue by Service & Payment Methods Breakdown */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: 'var(--space-6)',
            alignItems: 'start',
          }}>
            {/* Service Breakdown */}
            <Card style={{ padding: 'var(--space-5)' }}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-4)' }}>
                Revenue by Service Catalog ({selectedDate})
              </h3>

              {serviceBreakdown.length === 0 ? (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  No service revenue recorded for this date.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {serviceBreakdown.map((s) => {
                    const rev = parseFloat(s.revenue || 0);
                    const pct = totalServiceRev > 0 ? Math.round((rev / totalServiceRev) * 100) : 0;

                    return (
                      <div key={s.service_name}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                            {s.service_name}
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', fontWeight: 400, marginLeft: '6px' }}>
                              ({s.job_count} job{s.job_count !== 1 ? 's' : ''})
                            </span>
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                            {formatKES(rev)} <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({pct}%)</span>
                          </span>
                        </div>
                        <div style={{
                          height: '8px',
                          borderRadius: '999px',
                          backgroundColor: 'var(--color-border)',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            backgroundColor: 'var(--color-accent)',
                            borderRadius: '999px',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Payment Method Distribution */}
            <Card style={{ padding: 'var(--space-5)' }}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-4)' }}>
                Payment Method Channels ({selectedDate})
              </h3>

              {paymentMethodsBreakdown.length === 0 ? (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  No payments recorded for this date.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {paymentMethodsBreakdown.map((pm) => {
                    const icon = pm.method.toLowerCase() === 'mpesa'
                      ? <Smartphone size={18} color="var(--color-success)" />
                      : pm.method.toLowerCase() === 'cash'
                      ? <Coins size={18} color="var(--color-accent)" />
                      : <CreditCard size={18} color="var(--color-text)" />;

                    return (
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          {icon}
                          <div>
                            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', textTransform: 'uppercase' }}>
                              {pm.method}
                            </div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                              {pm.count} transaction{pm.count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)' }}>
                          {formatKES(pm.total)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* 30-Day SMS Volume Analytics */}
      <Card style={{ padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <MessageSquare size={20} color="var(--color-accent)" />
              SMS Volume Analytics (Last 30 Days)
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              System SMS dispatches for registration, pricing links, reminders, and pickup OTPs
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Sent</span>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text)' }}>
                {smsData?.totalSent || 0}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Daily Avg</span>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-accent)' }}>
                {smsData ? (smsData.totalSent / 30).toFixed(1) : 0}
              </div>
            </div>
          </div>
        </div>

        {smsLoading ? (
          <PageSpinner message="Loading SMS trends..." />
        ) : dailyVolume.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No SMS dispatches recorded in the last 30 days.
          </div>
        ) : (
          <div>
            {/* Native SVG Bar Chart */}
            <div style={{ width: '100%', overflowX: 'auto', padding: 'var(--space-2) 0' }}>
              <svg
                viewBox={`0 0 ${dailyVolume.length * (barWidth + barGap)} ${chartHeight + 30}`}
                style={{ width: '100%', maxHeight: '180px', display: 'block' }}
              >
                {/* Horizontal baseline */}
                <line
                  x1="0"
                  y1={chartHeight}
                  x2={dailyVolume.length * (barWidth + barGap)}
                  y2={chartHeight}
                  stroke="var(--color-border)"
                  strokeWidth="1"
                />

                {dailyVolume.map((item, idx) => {
                  const barH = (item.count / maxSmsCount) * (chartHeight - 15);
                  const x = idx * (barWidth + barGap);
                  const y = chartHeight - barH;
                  const isToday = item.date === todayStr;

                  return (
                    <g key={item.date}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(2, barH)}
                        rx="3"
                        fill={isToday ? 'var(--color-accent)' : item.count > 0 ? '#1D1D1F' : 'var(--color-border)'}
                        opacity={item.count > 0 ? 0.9 : 0.4}
                      >
                        <title>{`${formatDate(item.date)}: ${item.count} SMS`}</title>
                      </rect>
                      {idx % 5 === 0 && (
                        <text
                          x={x + barWidth / 2}
                          y={chartHeight + 18}
                          fontSize="9"
                          fill="var(--color-text-tertiary)"
                          textAnchor="middle"
                        >
                          {new Date(item.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
