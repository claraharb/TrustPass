import { AlertTriangle } from "lucide-react";
import "../../styles/admin-dashboard.css"; // Reuse dashboard styles for centering

export const UnavailablePage = () => {
  return (
    <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--slate-500)', textAlign: 'center' }}>
      <AlertTriangle size={48} style={{ marginBottom: '1rem', color: 'var(--slate-400)' }} />
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--slate-800)' }}>Page Unavailable</h2>
      <p style={{ maxWidth: '400px' }}>This section is still under development</p>
    </div>
  );
};

export default UnavailablePage;
