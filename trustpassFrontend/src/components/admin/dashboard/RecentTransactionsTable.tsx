import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Radio, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { TrustRequest } from '../../../types/trust';
import { DecisionBadge } from '../../common/DecisionBadge';

interface RecentTransactionsTableProps {
  transactions: TrustRequest[];
}

export const RecentTransactionsTable: React.FC<RecentTransactionsTableProps> = ({
  transactions,
}) => {
  const [selectedTxId, setSelectedTxId] = useState<number | null>(transactions[0]?.id || null);

  const selectedTx = transactions.find((t) => t.id === selectedTxId);

  return (
    <div className="dashboard-card panel transactions-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Recent transactions</h2>
          <span className="panel-subtitle">Click row to inspect live AI evaluation</span>
        </div>
        <Link to="/admin/transactions" className="panel-link">
          View all →
        </Link>
      </div>

      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Protected action</th>
              <th>Decision</th>
              <th>Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const isSelected = tx.id === selectedTxId;
              return (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTxId(isSelected ? null : tx.id)}
                  className={`interactive-row ${isSelected ? 'row-selected' : ''}`}
                  title="Click to view AI assessment details"
                >
                  <td className="client-cell">
                    <div className="client-with-id">
                      <span>{tx.clientName || `Client #${tx.clientId}`}</span>
                      <small className="req-id-subtle">{tx.requestId}</small>
                    </div>
                  </td>
                  <td className="action-cell">
                    {tx.protectedActionName || 'Protected action'}
                  </td>
                  <td>
                    {tx.decision && <DecisionBadge decision={tx.decision} />}
                  </td>
                  <td className="time-cell">{tx.createdAt}</td>
                  <td className="expand-cell">
                    <ChevronRight
                      size={14}
                      className={`row-chevron ${isSelected ? 'rotated' : ''}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedTx && (
        <div className="tx-inspection-card">
          <div className="inspection-header">
            <div className="inspection-title-group">
              <ShieldCheck size={16} className="inspection-icon" />
              <b>AI Trust Assessment Breakdown</b>
              <span className="inspection-tag">{selectedTx.requestId}</span>
            </div>
            <div className="inspection-score-badge">
              <span>Trust Score:</span>
              <b
                className={
                  selectedTx.trustScore && selectedTx.trustScore >= 70
                    ? 'score-high'
                    : selectedTx.trustScore && selectedTx.trustScore >= 40
                    ? 'score-med'
                    : 'score-low'
                }
              >
                {selectedTx.trustScore ?? '--'}/100
              </b>
            </div>
          </div>

          <div className="inspection-details-grid">
            <div className="detail-item">
              <span className="detail-label">Phone MSISDN</span>
              <span className="detail-val mono">{selectedTx.phoneNumber || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Origin IP</span>
              <span className="detail-val mono">{selectedTx.ipAddress || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Risk Level</span>
              <span className="detail-val">{selectedTx.riskLevel || 'LOW'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Engine Action</span>
              <span className="detail-val bold">{selectedTx.decision}</span>
            </div>
          </div>

          {selectedTx.riskSignals && selectedTx.riskSignals.length > 0 && (
            <div className="inspection-signals">
              <div className="signals-title">
                <Radio size={12} />
                <span>Telecom Network Evidence (CAMARA / Open Gateway):</span>
              </div>
              <div className="signals-list">
                {selectedTx.riskSignals.map((sig) => (
                  <div
                    key={sig.id}
                    className={`signal-pill ${sig.isPositive ? 'positive' : 'negative'}`}
                  >
                    {sig.isPositive ? (
                      <CheckCircle2 size={12} className="sig-icon green" />
                    ) : (
                      <AlertTriangle size={12} className="sig-icon red" />
                    )}
                    <span className="sig-source">[{sig.source}]</span>
                    <span className="sig-text">{sig.details}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
