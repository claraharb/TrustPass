import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ShieldCheck, AlertTriangle, Zap, RefreshCw } from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { TimeRangeSelector, type TimeRange } from '../../components/common/TimeRangeSelector';
import { TrustRequestChart } from '../../components/admin/dashboard/TrustRequestChart';
import { TrustDecisionBar } from '../../components/admin/dashboard/TrustDecisionBar';
import { RecentTransactionsTable } from '../../components/admin/dashboard/RecentTransactionsTable';
import { FraudMonitoringPanel } from '../../components/admin/dashboard/FraudMonitoringPanel';
import { getAdminDashboard } from '../../services/api';
import type { AdminDashboardMetrics } from '../../types/admin';
import '../../styles/admin-dashboard.css';

export const AdminDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState('Just now');
  const [data, setData] = useState<AdminDashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const dashboard = await getAdminDashboard(timeRange);
        if (cancelled) return;
        setError(null);
        setData(dashboard);
        setLastRefreshedTime('Just now');
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data');
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const dashboard = await getAdminDashboard(timeRange);
      setError(null);
      setData(dashboard);
      setLastRefreshedTime('Just now');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data');
    }
    setIsRefreshing(false);
  };

  if (!data && error) {
    return (
      <div className="dashboard-content">
        <div className="dashboard-error" role="alert">
          <h1>Dashboard unavailable</h1>
          <p>{error}</p>
          <Link to="/admin/login" className="refresh-btn">Sign in</Link>
          <button type="button" className="refresh-btn" onClick={handleRefresh}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="dashboard-content dashboard-loading">Loading dashboard data...</div>;
  }

  return (
    <div className="dashboard-content">
      <div className="live-status-banner">
        <div className="live-banner-left">
          <span className="live-radar-dot" />
          <span className="live-banner-title">AI Trust Engine Active</span>
          <span className="live-banner-sep">•</span>
          <span className="live-banner-desc">
            Evaluating digital transactions in real-time with CAMARA & Nokia Network-as-Code signals
          </span>
        </div>
        <div className="live-banner-right">
          <span className="live-timestamp">Updated: {lastRefreshedTime}</span>
          <button
            type="button"
            className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleRefresh}
            title="Refresh live telemetry"
            aria-label="Refresh telemetry"
          >
            <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <h1>Platform overview</h1>
          <div className="dashboard-subtitle">
            Monitor trust decisions, active clients, telecom API throughput, and automated fraud prevention.
          </div>
        </div>

        <div className="dashboard-header-actions">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      <div className="metrics-grid">
        <StatCard
          label="Active clients"
          value={data.activeClients.total.toLocaleString()}
          deltaHighlight={`+${data.activeClients.deltaPercentage}%`}
          deltaText="from previous period"
          isPositiveDelta={data.activeClients.isPositive}
          icon={<Users size={16} />}
        />

        <StatCard
          label="Trust requests"
          value={data.trustRequests.total.toLocaleString()}
          deltaHighlight={`+${data.trustRequests.deltaPercentage}%`}
          deltaText="from previous period"
          isPositiveDelta={data.trustRequests.isPositive}
          icon={<ShieldCheck size={16} />}
        />

        <StatCard
          label="Open fraud events"
          value={data.openFraudEvents.total.toString()}
          deltaHighlight={`${data.openFraudEvents.highSeverityCount} high severity`}
          isNegativeDelta={true}
          variant="red"
          icon={<AlertTriangle size={16} />}
        />

        <StatCard
          label="API requests used"
          value={data.apiRequestsUsed.formatted}
          deltaHighlight={`${data.apiRequestsUsed.successRatePercentage}%`}
          deltaText="successful"
          isPositiveDelta={true}
          icon={<Zap size={16} />}
        />
      </div>

      <div className="charts-grid">
        <TrustRequestChart data={data.activityTrend} />
        <TrustDecisionBar
          decisions={data.decisionDistribution}
          totalAssessed={data.trustRequests.total}
        />
      </div>

      <div className="operational-grid">
        <RecentTransactionsTable transactions={data.recentTransactions} />
        <FraudMonitoringPanel
          events={data.recentFraudEvents}
          networkStatus={data.networkApiStatus}
        />
      </div>
    </div>
  );
};
export default AdminDashboard;
