import { useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ExternalLink, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ClientBreadcrumb } from "../../components/common/ClientBreadcrumb";
import {
    postTrustCheck,
    type TrustCheckResult,
} from "../../services/api";

const demoInputs = {
    action: "LOGIN",
    phoneNumber: "+123456789",
    ipAddress: "203.0.113.10",
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
    attemptCount: "1",
};

export function ClientTrustCheck() {
    const [apiKey, setApiKey] = useState("");
    const [form, setForm] = useState(demoInputs);
    const [result, setResult] = useState<TrustCheckResult | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const key = apiKey.trim();
        if (!key) {
            setError("Paste an API key secret to run a trust check.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setResult(null);

        try {
            setResult(await postTrustCheck(key, {
                action: form.action.trim(),
                phoneNumber: form.phoneNumber.trim() || undefined,
                ipAddress: form.ipAddress.trim() || undefined,
                userAgent: form.userAgent.trim() || undefined,
                attemptCount: Number(form.attemptCount) || undefined,
            }));
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Trust check failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateField = (field: keyof typeof form, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    return (
        <div className="client-page client-trust-page">
            <div className="client-page-heading">
                <div>
                    <ClientBreadcrumb current="Trust lab" />
                    <h1>Run a trust check</h1>
                    <p>Evaluate a sensitive action with live TrustPass signals before it reaches your system.</p>
                </div>
                <Link className="client-secondary-button" to="/client/api-keys">Manage API keys <ArrowRight size={15} /></Link>
            </div>

            {error && <p className="client-inline-error" role="alert">{error}</p>}

            <div className="client-trust-layout">
                <form className="client-panel client-trust-form" onSubmit={(event) => void handleSubmit(event)}>
                    <div className="client-panel-heading">
                        <div className="client-card-icon"><ShieldCheck size={20} /></div>
                        <div><h2>Request context</h2><p>Send the same shape your application would send.</p></div>
                    </div>

                    <label>API key secret
                        <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="tp_live_..." type="password" autoComplete="off" />
                    </label>
                    <p className="client-field-note">Use the full secret shown when you created the key. It cannot be recovered later.</p>

                    <div className="client-form-two-column">
                        <label>Protected action
                            <span className="client-select-control">
                                <select value={form.action} onChange={(event) => updateField("action", event.target.value)}>
                                    <option value="LOGIN">Login</option>
                                    <option value="OTP_REQUEST">OTP request</option>
                                </select>
                                <ChevronDown size={17} aria-hidden="true" />
                            </span>
                        </label>
                        <label>OTP attempts<input type="number" min="1" value={form.attemptCount} onChange={(event) => updateField("attemptCount", event.target.value)} disabled={form.action !== "OTP_REQUEST"} /></label>
                    </div>
                    <div className="client-form-two-column">
                        <label>Phone number<input value={form.phoneNumber} onChange={(event) => updateField("phoneNumber", event.target.value)} /></label>
                        <label>IP address<input value={form.ipAddress} onChange={(event) => updateField("ipAddress", event.target.value)} /></label>
                    </div>
                    <label>Browser user agent<input value={form.userAgent} onChange={(event) => updateField("userAgent", event.target.value)} /></label>
                    <button className="client-primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Assessing request..." : "Run trust check"} <ArrowRight size={16} /></button>
                </form>

                <section className="client-trust-result" aria-live="polite">
                    {!result && <div className="client-result-empty"><ShieldCheck size={30} /><h2>Your decision appears here</h2><p>Run a request to see the final decision, score, explanation, and evidence collected.</p></div>}
                    {result?.status === "PENDING" && <div className="client-result-pending"><AlertTriangle size={30} /><span className="client-result-label">Additional verification required</span><h2>Number verification is pending</h2><p>{result.message}</p>{result.authorizationUrl && <a className="client-primary-button" href={result.authorizationUrl} target="_blank" rel="noreferrer">Open verification <ExternalLink size={15} /></a>}</div>}
                    {result?.status === "COMPLETED" && result.decision && <div className="client-result-complete">
                        <div className={`client-decision-mark ${result.decision.decision.toLowerCase()}`}><CheckCircle2 size={28} /></div>
                        <span className="client-result-label">Trust decision</span>
                        <div className="client-decision-line"><h2>{result.decision.decision}</h2><strong>{result.decision.trustScore}<small>/100</small></strong></div>
                        <div className="client-result-meta"><span>Risk level <strong>{result.decision.riskLevel}</strong></span><span>Request <strong>{result.requestId}</strong></span></div>
                        <p className="client-result-explanation">{result.decision.explanation || result.message}</p>
                        {result.aiAgent && <div className="client-ai-note"><span>AI evidence plan</span><p>{result.aiAgent.reason}</p><small>{result.aiAgent.selectedSignals.join(" · ")}</small></div>}
                        {!!result.signals?.length && <div className="client-signal-list"><span className="client-result-label">Collected signals</span>{result.signals.map((signal, index) => <div className="client-signal-row" key={`${signal.signalType}-${index}`}><span className={signal.isPositive ? "positive" : "negative"}>{signal.isPositive ? "Positive" : "Review"}</span><strong>{signal.signalType.replaceAll("_", " ")}</strong><small>{signal.details || signal.value || signal.source}</small></div>)}</div>}
                    </div>}
                </section>
            </div>
        </div>
    );
}