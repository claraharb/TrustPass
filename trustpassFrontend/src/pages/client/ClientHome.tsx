import { useEffect, useState } from 'react';
import { KeyRound, Package, ShieldCheck, Activity, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import {
  createClientSubscription,
  getClientPackages,
  getClientUsage,
  getCurrentClientSubscription,
  type ClientPackage,
  type ClientSubscription,
  type ClientUsage,
} from '../../services/api';

export function ClientHome() {
  const { client } = useAuth();
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [subscription, setSubscription] = useState<ClientSubscription | null>(null);
  const [usage, setUsage] = useState<ClientUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const packageResponse = await getClientPackages();
        setPackages(packageResponse.packages);

        try {
          const subscriptionResponse = await getCurrentClientSubscription();
          setSubscription(subscriptionResponse.subscription);
          try {
            const usageResponse = await getClientUsage();
            setUsage(usageResponse.usage);
          } catch {
            setUsage(null);
          }
        } catch {
          setSubscription(null);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load packages');
      } finally {
        setIsLoading(false);
      }
    };

    void loadWorkspace();
  }, []);

  const handleSubscribe = async () => {
    if (!selectedPackageId) return;
    setIsSubscribing(true);
    setError(null);

    try {
      const response = await createClientSubscription(selectedPackageId);
      setSubscription(response.subscription);
    } catch (subscribeError) {
      setError(subscribeError instanceof Error ? subscribeError.message : 'Unable to activate package');
    } finally {
      setIsSubscribing(false);
    }
  };

  const formatPrice = (price: string | number) => `$${Number(price).toFixed(2)}`;
  const formatDate = (date: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date));

  return (
    <div className="client-home">
      <section className="client-welcome">
        <div>
          <span className="client-eyebrow">Client workspace</span>
          <h1>Good to see you, {client?.name}.</h1>
          <p>Your TrustPass workspace is ready. Connect your first protected action below.</p>
        </div>
        <div className="client-live-status"><span /> Platform operational</div>
      </section>

      <section className="client-summary-grid" aria-label="Workspace summary">
        <div className="client-summary-item"><span>Current plan</span><strong>{subscription?.package.name ?? 'Not activated'}</strong><small>{subscription ? `Active until ${formatDate(subscription.endDate)}` : 'Choose a package to begin'}</small></div>
        <div className="client-summary-item"><span>API requests</span><strong>{usage?.requestsUsed.toLocaleString() ?? subscription?.requestsUsed.toLocaleString() ?? '0'}</strong><small>{usage ? `${usage.remainingRequests.toLocaleString()} remaining` : subscription ? `of ${subscription.package.requestLimit.toLocaleString()} included` : 'Usage will appear here'}</small></div>
        <div className="client-summary-item"><span>Trust checks</span><strong>Ready</strong><small><Activity size={13} /> Engine available</small></div>
      </section>

      {error && <p className="client-inline-error" role="alert">{error}</p>}

      <div className="client-section-heading"><div><span className="client-eyebrow">Protection plan</span><h2>{subscription ? 'Your active plan' : 'Choose your protection layer'}</h2></div></div>
      {isLoading ? <div className="client-panel client-loading">Loading available packages...</div> : subscription ? (
        <section className="client-plan-active">
          <div className="client-card-icon"><ShieldCheck size={20} /></div>
          <div><span className="client-plan-status">Active plan</span><h3>{subscription.package.name}</h3><p>{subscription.package.description ?? 'Trust decisions for your protected actions.'}</p></div>
          <div className="client-plan-meta"><strong>{(usage?.remainingRequests ?? (subscription.package.requestLimit - subscription.requestsUsed)).toLocaleString()}/{subscription.package.requestLimit.toLocaleString()}</strong><span>requests left</span></div>
          {usage && <div className="client-usage-meter"><div><span>Usage</span><strong>{usage.usagePercentage}%</strong></div><span className="client-usage-track"><span style={{ width: `${Math.min(usage.usagePercentage, 100)}%` }} /></span></div>}
        </section>
      ) : (
        <section className="client-package-grid">
          {packages.map((clientPackage) => (
            <button type="button" className={`client-package-card ${selectedPackageId === clientPackage.id ? 'selected' : ''}`} key={clientPackage.id} onClick={() => setSelectedPackageId(clientPackage.id)}>
              <span className="client-card-icon"><Package size={20} /></span>
              <span className="client-package-name">{clientPackage.name}</span>
              <span className="client-package-description">{clientPackage.description}</span>
              <span className="client-package-price">{formatPrice(clientPackage.price)} <small>/ {clientPackage.durationDays} days</small></span>
              <span className="client-package-limit">{clientPackage.requestLimit.toLocaleString()} requests</span>
            </button>
          ))}
          <div className="client-subscribe-action"><p>Select a package to activate simulated billing and start making trust checks.</p><button type="button" className="client-primary-button" disabled={!selectedPackageId || isSubscribing} onClick={() => void handleSubscribe()}>{isSubscribing ? 'Activating...' : 'Activate package'} <ArrowRight size={16} /></button></div>
        </section>
      )}

      <div className="client-section-heading client-followup-heading"><div><span className="client-eyebrow">After activation</span><h2>Continue your setup</h2></div></div>
      <section className="client-workspace-grid">
        <article className="client-workspace-card"><span className="client-card-icon"><KeyRound size={20} /></span><h3>Create an API key</h3><p>Connect your application securely and keep production credentials under control.</p><Link to="/client/api-keys">Manage API keys <ArrowRight size={14} /></Link></article>
        <article className="client-workspace-card"><span className="client-card-icon"><ShieldCheck size={20} /></span><h3>Run a trust check</h3><p>Evaluate a sensitive action with network signals before it reaches your system.</p><Link to="/client/trust-check">Open trust lab <ArrowRight size={14} /></Link></article>
        <article className="client-workspace-card"><span className="client-card-icon"><Activity size={20} /></span><h3>Monitor usage</h3><p>Track request volume and remaining capacity as your integration comes online.</p><span className="client-card-muted">Coming soon</span></article>
      </section>
    </div>
  );
}
