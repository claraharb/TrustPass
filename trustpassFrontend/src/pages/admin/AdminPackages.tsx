import { useEffect, useState } from 'react';
import { Package, Plus, Archive, Edit } from 'lucide-react';
import {
  getClientPackages,
  createAdminPackage,
  updateAdminPackage,
  deactivateAdminPackage,
} from '../../services/api';
import type { ClientPackage } from '../../services/api';
import '../../styles/admin-clients.css';

export function AdminPackages() {
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ClientPackage | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [requestLimit, setRequestLimit] = useState('');
  const [price, setPrice] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [features, setFeatures] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const response = await getClientPackages();
      setPackages(response.packages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load packages');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPackages();
  }, []);

  const openCreateForm = () => {
    setIsEditing(false);
    setSelectedPackage(null);
    setName('');
    setDescription('');
    setRequestLimit('');
    setPrice('');
    setDurationDays('30');
    setFeatures('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (pkg: ClientPackage) => {
    setIsEditing(true);
    setSelectedPackage(pkg);
    setName(pkg.name);
    setDescription(pkg.description || '');
    setRequestLimit(String(pkg.requestLimit));
    setPrice(String(pkg.price));
    setDurationDays(String(pkg.durationDays));
    setFeatures(pkg.features);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (isEditing && selectedPackage) {
        await updateAdminPackage(selectedPackage.id, {
          name,
          description,
          requestLimit: parseInt(requestLimit, 10),
          price: parseFloat(price),
          durationDays: parseInt(durationDays, 10),
          features,
        });
      } else {
        await createAdminPackage({
          name,
          description,
          requestLimit: parseInt(requestLimit, 10),
          price: parseFloat(price),
          durationDays: parseInt(durationDays, 10),
          features,
        });
      }
      setIsFormOpen(false);
      void loadPackages();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this package?')) return;
    try {
      await deactivateAdminPackage(id);
      void loadPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deactivation failed');
    }
  };

  if (isLoading && packages.length === 0) {
    return <div className="dashboard-content clients-page-state">Loading packages...</div>;
  }

  return (
    <div className="dashboard-content clients-page">
      <div className="clients-page-header">
        <div>
          <p className="clients-eyebrow">Billing</p>
          <h1>Packages</h1>
          <p className="clients-subtitle">Manage service tiers and pricing.</p>
        </div>
        <div className="clients-header-actions">
          <button type="button" className="clients-primary-btn" onClick={openCreateForm}>
            <Plus size={16} style={{ marginRight: '6px' }} />
            Create Package
          </button>
        </div>
      </div>

      {error && <div className="clients-alert" role="alert">{error}</div>}

      <section className="clients-card" style={{ marginTop: '2rem' }}>
        <div className="clients-card-heading">
          <div>
            <h2>Active Packages</h2>
            <span>{packages.length} tier{packages.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        
        {packages.length === 0 ? (
          <div className="clients-empty-state">
            <Package size={22} />
            <h3>No packages defined</h3>
            <p>Create a package to allow clients to subscribe to services.</p>
          </div>
        ) : (
          <div className="clients-table-wrap">
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Package Name</th>
                  <th>Price</th>
                  <th>Requests</th>
                  <th>Duration</th>
                  <th className="clients-actions-heading">Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td>
                      <div className="client-identity">
                        <span><strong>{pkg.name}</strong><small>{pkg.description || 'No description'}</small></span>
                      </div>
                    </td>
                    <td><strong>${pkg.price}</strong></td>
                    <td>{pkg.requestLimit.toLocaleString()}</td>
                    <td>{pkg.durationDays} days</td>
                    <td>
                      <div className="client-row-actions">
                        <button type="button" title="Edit package" aria-label={`Edit ${pkg.name}`} onClick={() => openEditForm(pkg)}><Edit size={15} /></button>
                        <button type="button" title="Deactivate package" aria-label={`Deactivate ${pkg.name}`} onClick={() => void handleDeactivate(pkg.id)}><Archive size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isFormOpen && (
        <div className="clients-drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsFormOpen(false); }}>
          <aside className="clients-drawer" aria-label={isEditing ? 'Edit Package' : 'Create Package'}>
            <div className="clients-drawer-header">
              <div>
                <span className="clients-eyebrow">Package configuration</span>
                <h2>{isEditing ? 'Edit Package' : 'New Package'}</h2>
              </div>
              <button type="button" className="clients-close-btn" onClick={() => setIsFormOpen(false)} aria-label="Close form">&times;</button>
            </div>
            
            <form onSubmit={(e) => void handleSubmit(e)} className="client-form">
              {formError && <div className="clients-alert" role="alert">{formError}</div>}
              
              <label>Name
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </label>

              <label>Description
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>

              <div style={{ display: 'flex', gap: '14px' }}>
                <label style={{ flex: 1 }}>Price ($)
                  <input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                </label>
                <label style={{ flex: 1 }}>Request Limit
                  <input required type="number" min="1" value={requestLimit} onChange={(e) => setRequestLimit(e.target.value)} />
                </label>
              </div>

              <label>Duration (Days)
                <input required type="number" min="1" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} style={{ width: 'calc(50% - 7px)' }} />
              </label>

              <label>Features (comma separated)
                <textarea required value={features} onChange={(e) => setFeatures(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 10px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', color: 'var(--ink)', font: '13px var(--font-sans)', outline: 'none', minHeight: '80px', resize: 'vertical' }} />
              </label>

              <div className="client-form-actions">
                <button type="button" onClick={() => setIsFormOpen(false)} className="clients-secondary-btn" style={{ marginRight: '8px' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="clients-primary-btn">
                  {isSubmitting ? 'Saving...' : 'Save Package'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
