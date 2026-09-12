import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { getNumberVerificationCallback, type TrustCheckResult } from "../../services/api";

export function NumberVerificationCallback() {
    const [searchParams] = useSearchParams();
    const [result, setResult] = useState<TrustCheckResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(true);

    useEffect(() => {
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (!code || !state) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setError("Invalid callback parameters. Missing code or state.");
            setIsVerifying(false);
            return;
        }

        getNumberVerificationCallback(code, state)
            .then((res) => {
                setResult(res);
                setError(null);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : "Verification failed");
            })
            .finally(() => {
                setIsVerifying(false);
            });
    }, [searchParams]);

    return (
        <div className="client-page client-trust-page">
            <div className="client-page-heading">
                <div>
                    <h1>Number Verification</h1>
                    <p>Processing the network provider's response.</p>
                </div>
                <Link className="client-secondary-button" to="/client/trust-check">Back to Trust Lab</Link>
            </div>

            {error && <p className="client-inline-error" role="alert">{error}</p>}

            <div className="client-trust-layout" style={{ justifyContent: 'center' }}>
                <section className="client-trust-result" aria-live="polite" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                    {isVerifying && (
                        <div className="client-result-empty" style={{ textAlign: 'center' }}>
                            <Loader2 size={40} className="clients-spin" style={{ color: 'var(--blue)', marginBottom: '16px' }} />
                            <h2>Verifying with network provider</h2>
                            <p>Please wait while we finalize the trust decision...</p>
                        </div>
                    )}
                    
                    {!isVerifying && !result && !error && (
                        <div className="client-result-empty">
                            <ShieldCheck size={30} />
                            <h2>Verification Failed</h2>
                            <p>Could not complete the process.</p>
                        </div>
                    )}

                    {result?.status === "COMPLETED" && result.decision && (
                        <div className="client-result-complete">
                            <div className={`client-decision-mark ${result.decision.decision.toLowerCase()}`}>
                                <CheckCircle2 size={28} />
                            </div>
                            <span className="client-result-label">Trust decision</span>
                            <div className="client-decision-line">
                                <h2>{result.decision.decision}</h2>
                                <strong>{result.decision.trustScore}<small>/100</small></strong>
                            </div>
                            <div className="client-result-meta">
                                <span>Risk level <strong>{result.decision.riskLevel}</strong></span>
                                <span>Request <strong>{result.requestId}</strong></span>
                            </div>
                            <p className="client-result-explanation">{result.decision.explanation || result.message}</p>
                            
                            {result.aiAgent && (
                                <div className="client-ai-note">
                                    <span>AI evidence plan</span>
                                    <p>{result.aiAgent.reason}</p>
                                    <small>{result.aiAgent.selectedSignals.join(" · ")}</small>
                                </div>
                            )}
                            
                            {!!result.signals?.length && (
                                <div className="client-signal-list">
                                    <span className="client-result-label">Collected signals</span>
                                    {result.signals.map((signal, index) => {
                                        const isDegraded = signal.source === 'CAMARA' && (!signal.isPositive && signal.details?.toLowerCase().includes('failed'));
                                        const isDemo = signal.source === 'CAMARA' && signal.isPositive && signal.value === 'Mock/Demo Data';
                                        return (
                                            <div className={`client-signal-row ${isDegraded ? 'degraded' : ''}`} key={`${signal.signalType}-${index}`}>
                                                <span className={isDegraded ? 'neutral' : (signal.isPositive ? "positive" : "negative")}>
                                                    {isDegraded ? 'Unavailable' : (signal.isPositive ? "Positive" : "Review")}
                                                </span>
                                                <strong>{signal.signalType.replaceAll("_", " ")} {isDemo && <span style={{fontSize: '0.7em', padding: '2px 4px', background: '#e0e0e0', borderRadius: '4px', marginLeft: '4px'}}>Demo</span>}</strong>
                                                <small>{signal.details || signal.value || signal.source}</small>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
