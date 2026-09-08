import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import adminService from "../../services/adminService";
import RefreshButton from "../../components/common/RefreshButton";
import {
  FiServer,
  FiDatabase,
  FiCpu,
  FiActivity,
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiUsers,
  FiZap,
  FiLink,
  FiAlertTriangle,
  FiArrowRight,
} from "react-icons/fi";
import "../../styles/Admin.css";

/* ─── System Maintenance & Platform Health ───
   Live, REAL health data for the ApnaBnB admin panel. Every figure comes from
   the backend health endpoint — actual traffic metrics, live DB probes, real
   service pings and the audit log. Values that cannot be measured render as
   "Unavailable", never as invented numbers. ──────────────────────────────── */

const STATUS_META = {
  operational: { label: "Operational", tone: "ok" },
  degraded: { label: "Degraded", tone: "warn" },
  down: { label: "Down", tone: "bad" },
  unconfigured: { label: "Not configured", tone: "muted" },
  unavailable: { label: "Unavailable", tone: "muted" },
  running: { label: "Running", tone: "ok" },
  success: { label: "Success", tone: "ok" },
};

const SEVERITY_META = {
  critical: { label: "Critical", tone: "bad" },
  error: { label: "Error", tone: "warn" },
  warning: { label: "Warning", tone: "warn" },
  info: { label: "Info", tone: "ok" },
  notice: { label: "Notice", tone: "muted" },
};

const isMissing = (v) => v === null || v === undefined || v === "";

const fmt = (v, fallback = "Unavailable") => (isMissing(v) ? fallback : v);

const fmtMs = (v) => (isMissing(v) ? "Unavailable" : `${v} ms`);

const fmtDuration = (sec) => {
  if (isMissing(sec)) return "Unavailable";
  const s = Math.floor(sec);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
};

const timeAgo = (iso) => {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const fullTime = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

const activitySeverity = (action = "") =>
  action.startsWith("admin") ? "notice" : "info";

const StatusPill = ({ status, label }) => {
  const meta = STATUS_META[status] || STATUS_META.unavailable;
  return (
    <span className={`adm-h-pill adm-h-pill--${meta.tone}`}>
      <span className="adm-h-pill-dot" />
      {label || meta.label}
    </span>
  );
};

const SeverityPill = ({ severity }) => {
  const meta = SEVERITY_META[severity] || SEVERITY_META.info;
  return (
    <span className={`adm-h-pill adm-h-pill--flat adm-h-pill--${meta.tone}`}>
      {meta.label}
    </span>
  );
};

const MetricCard = ({ icon: Icon, label, value, sub, tone = "muted" }) => (
  <div className={`adm-h-metric adm-h-metric--${tone}`}>
    {Icon ? (
      <div className="adm-h-metric-icon">
        <Icon size={16} />
      </div>
    ) : null}
    <div className="adm-h-metric-body">
      <div className="adm-h-metric-label">{label}</div>
      <div className="adm-h-metric-value">{value}</div>
      {sub ? <div className="adm-h-metric-sub">{sub}</div> : null}
    </div>
  </div>
);

const Gauge = ({ label, value, suffix = "%", tone }) => {
  const pct = typeof value === "number" ? Math.round(Math.min(100, Math.max(0, value))) : null;
  const t =
    tone ||
    (pct === null ? "muted" : pct >= 85 ? "bad" : pct >= 60 ? "warn" : "ok");
  return (
    <div className="adm-h-gauge">
      <div className="adm-h-gauge-head">
        <span className="adm-h-gauge-label">{label}</span>
        <span className="adm-h-gauge-value">
          {pct === null ? "Unavailable" : `${pct}${suffix}`}
        </span>
      </div>
      <div className="adm-h-gauge-track">
        <div
          className={`adm-h-gauge-fill adm-h-gauge-fill--${t}`}
          style={{ width: pct === null ? "0%" : `${pct}%` }}
        />
      </div>
    </div>
  );
};

const RequestSpark = ({ points }) => {
  const max = Math.max(1, ...points.map((p) => p.requests || 0));
  return (
    <div className="adm-h-spark" role="img" aria-label="Requests per minute">
      {points.map((p) => (
        <div
          key={p.min}
          className="adm-h-spark-col"
          title={`${p.requests} request${p.requests === 1 ? "" : "s"} · ${p.errors} error${p.errors === 1 ? "" : "s"}`}
        >
          <div className="adm-h-spark-track">
            <div
              className={`adm-h-spark-bar${p.errors > 0 ? " adm-h-spark-bar--err" : ""}`}
              style={{ height: `${Math.max((p.requests / max) * 100, p.requests > 0 ? 8 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const Section = ({ title, sub, action, children }) => (
  <section className="adm-h-section">
    <div className="adm-h-section-head">
      <h3 className="adm-card-title">{title}</h3>
      {sub ? <p className="adm-h-section-sub">{sub}</p> : null}
      <div className="adm-h-section-action">{action}</div>
    </div>
    {children}
  </section>
);

const TABLE = "adm-h-box";

export default function AdminHealth() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState("all");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const health = await adminService.getHealth({ fresh: isRefresh });
      setData(health);
    } catch (err) {
      setError(err.message || "Failed to load system health");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* Silent auto-refresh every 60s — a monitoring page should feel live. */
  useEffect(() => {
    const timer = setInterval(() => load(), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const d = data;
  const overall = d?.overall || {};
  const api = d?.api || {};
  const db = d?.database || {};
  const server = d?.server || {};
  const matching = d?.matching || {};
  const services = d?.services || [];
  const security = d?.security || { events: [] };
  const errs = d?.errors || { recent: [] };
  const activity = d?.activity || [];

  const spark = useMemo(() => (api?.byMinute || []).slice(-30), [api?.byMinute]);

  const filteredErrors = useMemo(() => {
    if (severityFilter === "all") return errs.recent;
    return errs.recent.filter((e) => e.severity === severityFilter);
  }, [errs.recent, severityFilter]);

  const SEV_FILTERS = [
    { value: "all", label: "All" },
    { value: "error", label: "Errors" },
    { value: "warning", label: "Warnings" },
    { value: "critical", label: "Critical" },
  ];

  const statusTone =
    overall.status === "down"
      ? "bad"
      : overall.status === "degraded"
        ? "warn"
        : "ok";

  if (isLoading) {
    return (
      <div className="adm-page">
        <div className="adm-loading">Loading system health…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="adm-page">
        <div className="adm-error">Error loading system health: {error}</div>
      </div>
    );
  }

  return (
    <div className="adm-page adm-health">
      <div className="adm-header">
        <div>
          <h1 className="adm-title">System Maintenance & Platform Health</h1>
          <p className="adm-subtitle">
            Live technical health of the ApnaBnB platform.
            {d?.generatedAt ? (
              <>
                {" "}
                <span className="adm-updated-at">
                  Last checked {fullTime(d.generatedAt)}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="adm-header-actions">
          <RefreshButton onRefresh={() => load(true)} refreshing={refreshing} />
        </div>
      </div>

      {/* ── 1. SYSTEM OVERVIEW ── */}
      <div className={`adm-h-hero adm-h-hero--${statusTone}`}>
        <div className="adm-h-hero-main">
          <div className="adm-h-hero-status">
            <span className="adm-h-hero-dot" />
            <span className="adm-h-hero-status-label">Overall system status</span>
            <span className="adm-h-hero-status-value">{fmt(overall.label)}</span>
          </div>
          {d?.generatedAt ? (
            <span className="adm-h-hero-check">
              <FiClock size={12} /> last checked {timeAgo(d.generatedAt)}
            </span>
          ) : null}
        </div>
        <div className="adm-h-hero-right">
          <div className="adm-h-hero-score" title={`Health score ${fmt(overall.healthScore)}/100`}>
            <span className="adm-h-hero-score-num">{fmt(overall.healthScore, "—")}</span>
            <span className="adm-h-hero-score-label">health</span>
          </div>
        </div>
        {overall.reason ? (
          <p className="adm-h-hero-reason">{overall.reason}</p>
        ) : null}
      </div>

      <div className="adm-kpis adm-h-kpis">
        <MetricCard icon={FiClock} label="Uptime" value={fmtDuration(api.uptimeSec)} tone="ok" sub={d?.api?.startedAt ? `since ${new Date(d.api.startedAt).toLocaleString()}` : null} />
        <MetricCard icon={FiUsers} label="Active users (15m)" value={fmt(d?.system?.activeUsers)} sub="Last seen within 15 min" />
        <MetricCard icon={FiZap} label="Requests / min" value={fmt(api.rpm)} sub="avg since boot" />
        <MetricCard
          icon={FiActivity}
          label="API availability"
          value={fmt(api?.lastHour?.availability, "—") + "%"}
          tone={api?.lastHour?.availability >= 99 ? "ok" : api?.lastHour?.availability >= 95 ? "warn" : "bad"}
          sub="last hour"
        />
      </div>

      {/* ── 2. API & BACKEND HEALTH ── */}
      <Section
        title="API & Backend Health"
        sub="Traffic, latency and error rates for this API process — since boot unless stated."
      >
        <div className="adm-h-grid adm-h-grid--5">
          <MetricCard icon={FiServer} label="Total requests" value={fmt(api?.totals?.requests, 0)} />
          <MetricCard icon={FiCheckCircle} label="Successful" value={fmt(api?.totals?.success, 0)} tone="ok" />
          <MetricCard icon={FiXCircle} label="Failed" value={fmt((api?.totals?.clientError || 0) + (api?.totals?.serverError || 0), 0)} tone="bad" />
          <MetricCard icon={FiAlertTriangle} label="4xx errors" value={fmt(api?.totals?.clientError, 0)} tone="warn" />
          <MetricCard icon={FiAlertTriangle} label="5xx errors" value={fmt(api?.totals?.serverError, 0)} tone="bad" />
          <MetricCard icon={FiClock} label="Avg response" value={fmtMs(api?.totals?.avgMs)} />
          <MetricCard icon={FiActivity} label="Requests / min" value={fmt(api.rpm)} />
          <MetricCard icon={FiZap} label="Last-hour availability" value={fmt(api?.lastHour?.availability, "—") + "%"} tone={api?.lastHour?.availability >= 99 ? "ok" : "warn"} />
        </div>

        <div className="adm-h-panel-group">
          <div className="adm-card adm-h-panel">
            <h4 className="adm-h-panel-title">Requests per minute (last 30 min)</h4>
            {spark.length ? (
              <>
                <RequestSpark points={spark} />
                <div className="adm-h-spark-axis">
                  <span>{timeAgo(d?.api?.startedAt) || "earlier"}</span>
                  <span>now</span>
                </div>
              </>
            ) : (
              <p className="adm-empty">No traffic recorded yet.</p>
            )}
          </div>

          <div className="adm-card adm-h-panel">
            <h4 className="adm-h-panel-title">Slowest endpoints</h4>
            {api?.endpoints?.length ? (
              <div className={TABLE}>
                <table className="adm-table adm-table--dense">
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Requests</th>
                      <th>Avg</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {api.endpoints.slice(0, 5).map((ep) => (
                      <tr key={ep.name}>
                        <td className="adm-h-mono">{ep.name}</td>
                        <td>{ep.count}</td>
                        <td>{fmtMs(ep.avgMs)}</td>
                        <td>{fmtMs(ep.totalMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="adm-empty">No endpoint traffic yet.</p>
            )}
          </div>
        </div>
      </Section>

      {/* ── 3. DATABASE HEALTH ── */}
      <Section
        title="Database Health"
        sub="Live probes against the Postgres (Supabase) database."
      >
        <div className="adm-h-grid adm-h-grid--4">
          <MetricCard
            icon={FiDatabase}
            label="Connection"
            value={db.connected ? "Connected" : "Down"}
            tone={db.connected ? "ok" : "bad"}
            sub={db.status === "operational" ? "SELECT 1 OK" : fmt(db.detail)}
          />
          <MetricCard icon={FiClock} label="Query latency" value={fmtMs(db.latencyMs)} sub={db.connected ? "avg of 3 probes" : null} tone={db.connected && db.latencyMs < 50 ? "ok" : db.connected ? "warn" : "muted"} />
          <MetricCard icon={FiUsers} label="Active connections" value={fmt(db.activeConnections)} sub="pg_stat_activity" />
          <MetricCard icon={FiDatabase} label="Database size" value={fmt(db.usageLabel)} sub={db.usageBytes ? "current_db_size" : null} />
          <MetricCard icon={FiXCircle} label="Failed queries" value="Unavailable" sub="Not captured by this process" />
          <MetricCard icon={FiClock} label="Slow queries" value="Unavailable" sub="No query log enabled" />
          <MetricCard icon={FiCheckCircle} label="Last successful backup" value="Unavailable" sub="No backup API access" />
        </div>
      </Section>

      {/* ── 4. SERVER / RESOURCE HEALTH ── */}
      <Section
        title="Server / Resource Health"
        sub={`API instance ${fmt(server.hostname)} · ${fmt(server.platform)} · process up ${fmtDuration(server.processUptimeSec)}`}
      >
        <div className="adm-h-panel-group">
          <div className="adm-card adm-h-panel">
            <h4 className="adm-h-panel-title">Resource usage</h4>
            <div className="adm-h-gauges">
              <Gauge label="CPU usage" value={server.cpuUsage} />
              <Gauge label="Memory (RAM)" value={server.memory?.usedPct} sub={server.memory ? `${fmt(server.memory.usedLabel)} of ${fmt(server.memory.totalLabel)}` : null} />
              <Gauge label="Storage" value={server.storage?.usedPct} sub={server.storage ? `${fmt(server.storage.usedLabel)} of ${fmt(server.storage.totalLabel)}` : null} />
            </div>
          </div>
          <div className="adm-h-grid adm-h-grid--4">
            <MetricCard icon={FiCpu} label="CPU cores" value={fmt(server.cpuCount)} />
            <MetricCard icon={FiActivity} label="Load average (1m)" value={fmt(server.loadAvg)} sub={server.loadAvg == null ? "unavailable on this OS" : null} />
            <MetricCard icon={FiServer} label="Server uptime" value={fmtDuration(server.serverUptimeSec)} />
            <MetricCard icon={FiZap} label="Network activity" value={fmt(api.rpm)} sub={`${fmt(server.hostname)} requests/min`} />
          </div>
        </div>
      </Section>

      {/* ── 5. MATCHING ENGINE ── */}
      <Section
        title="ApnaBnB Matching Engine"
        sub="Real aggregates for the core property ↔ requirement matching feature."
      >
        <div className="adm-h-grid adm-h-grid--4">
          <MetricCard
            icon={FiLink}
            label="Engine status"
            value={fmt((matching?.status || "unavailable"), "Unavailable")}
            tone={matching?.status === "operational" ? "ok" : "muted"}
            sub={matching?.status === "operational" ? "Match scoring responsive" : "Could not query match data"}
          />
          <MetricCard icon={FiLink} label="Matches generated" value={fmt(matching.total, 0)} sub={fmt(matching.last24h, "—") !== "—" ? `${fmt(matching.last24h)} in last 24h` : null} />
          <MetricCard icon={FiClock} label="Pending matches" value={fmt(matching.pending, "—")} tone={(matching.pending || 0) > 0 ? "warn" : "ok"} />
          <MetricCard icon={FiCheckCircle} label="Accepted" value={fmt(matching.accepted, "—")} tone="ok" />
          <MetricCard icon={FiCheckCircle} label="Rejected" value={fmt(matching.rejected, "—")} />
          <MetricCard icon={FiXCircle} label="Closed" value={fmt(matching.closed, "—")} />
          <MetricCard icon={FiAlertTriangle} label="Failed AI scoring" value={fmt(matching.aiFailed, "—")} tone={(matching.aiFailed || 0) > 0 ? "bad" : "ok"} />
          <MetricCard icon={FiClock} label="Avg processing time" value="Unavailable" sub="Not stored historically" />
        </div>
      </Section>

      {/* ── 6. BACKGROUND JOBS ── */}
      <Section
        title="Background Jobs"
        sub="Scheduled / queued work tracked by this API process."
      >
        <div className="adm-h-grid adm-h-grid--4">
          <MetricCard icon={FiActivity} label="Running" value={fmt(d?.jobs?.counts?.running, "—")} tone="ok" sub="In-process 2FA setup sweep" />
          <MetricCard icon={FiCheckCircle} label="Completed" value="Unavailable" sub="No job framework" />
          <MetricCard icon={FiXCircle} label="Failed" value="Unavailable" sub="No job framework" />
          <MetricCard icon={FiClock} label="Pending / retries" value="Unavailable" sub="No job queue configured" />
        </div>
        <p className="adm-h-note">
          ApnaBnB runs synchronously on request — there is no cron / queue
          backend. The only scheduled task is the in-process cleanup of
          abandoned 2FA setups (runs every 10 minutes).
        </p>
      </Section>

      {/* ── 7. EXTERNAL SERVICES ── */}
      <Section
        title="External Services"
        sub="Live status of the third-party services ApnaBnB relies on."
      >
        <div className={TABLE}>
          <div className="adm-table-wrap">
            <table className="adm-table adm-table--dense">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Response time</th>
                  <th>Last check</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td className="adm-table-title">{s.name}</td>
                    <td><StatusPill status={s.status} /></td>
                    <td>{fmtMs(s.latencyMs)}</td>
                    <td>{timeAgo(s.lastCheckedAt)}</td>
                    <td className="adm-table-sub">{fmt(s.detail)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ── 8. ERROR & WARNING MONITORING ── */}
      <Section
        title="Error & Warning Monitoring"
        sub="Real 4xx/5xx responses observed by this process. Critical = 5xx, warnings = 404/429, errors = other 4xx."
      >
        <div className="adm-h-grid adm-h-grid--4">
          <MetricCard icon={FiAlertTriangle} label="Total errors" value={fmt(errs.total, 0)} tone={errs.total > 0 ? "warn" : "ok"} />
          <MetricCard icon={FiXCircle} label="Critical (5xx)" value={fmt(errs.critical, 0)} tone={errs.critical > 0 ? "bad" : "ok"} />
          <MetricCard icon={FiAlertTriangle} label="Warnings" value={fmt(errs.warnings, 0)} tone="warn" />
          <MetricCard icon={FiAlertTriangle} label="Other 4xx" value={fmt(errs.errors, 0)} />
        </div>

        <div className="adm-h-filter">
          {SEV_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`adm-h-filter-btn${severityFilter === f.value ? " adm-h-filter-btn--active" : ""}`}
              onClick={() => setSeverityFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filteredErrors.length ? (
          <div className={TABLE}>
            <div className="adm-table-wrap">
              <table className="adm-table adm-table--dense">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Error type</th>
                    <th>Endpoint</th>
                    <th>Status</th>
                    <th>Latency</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredErrors.map((e, i) => (
                    <tr key={`${e.time}-${i}`}>
                      <td><SeverityPill severity={e.severity} /></td>
                      <td>{fmt(e.method)}</td>
                      <td className="adm-h-mono">{e.path}</td>
                      <td>{e.status}</td>
                      <td>{fmtMs(e.ms)}</td>
                      <td>{fullTime(e.time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="adm-h-note adm-h-note--ok">
            <FiCheckCircle size={14} /> No {severityFilter === "all" ? "" : `${severityFilter} `}errors recorded since the server started.
          </p>
        )}
      </Section>

      {/* ── 9. SECURITY / SYSTEM EVENTS ── */}
      <Section
        title="Security / System Events"
        sub="Derived from real responses: failed logins (401/429 on login), rate-limit violations (429) and unauthorized/forbidden access."
      >
        <div className="adm-h-grid adm-h-grid--4">
          <MetricCard icon={FiShield} label="Failed logins" value={fmt(security.failedLogins, 0)} tone={(security.failedLogins || 0) > 0 ? "bad" : "ok"} />
          <MetricCard icon={FiAlertTriangle} label="Rate-limit violations" value={fmt(security.rateLimited, 0)} tone={(security.rateLimited || 0) > 0 ? "warn" : "ok"} />
          <MetricCard icon={FiShield} label="Unauthorized" value={fmt(security.unauthorized, 0)} tone={(security.unauthorized || 0) > 0 ? "warn" : "ok"} />
          <MetricCard icon={FiShield} label="Forbidden" value={fmt(security.forbidden, 0)} />
        </div>

        {security.events?.length ? (
          <div className={TABLE}>
            <div className="adm-table-wrap">
              <table className="adm-table adm-table--dense">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Path</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {security.events.slice(0, 10).map((e, i) => (
                    <tr key={`${e.time}-${i}`}>
                      <td className="adm-table-title">
                        {e.type.replace(/_/g, " ")}
                      </td>
                      <td className="adm-h-mono">{e.path}</td>
                      <td>{e.status}</td>
                      <td>{fullTime(e.time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="adm-h-note adm-h-note--ok">
            <FiCheckCircle size={14} /> No security events recorded since the server started.
          </p>
        )}
      </Section>

      {/* ── 10. RECENT SYSTEM ACTIVITY ── */}
      <Section
        title="Recent System Activity"
        sub="Latest entries from the audit log (same data as System Logs). Status is Success because the audit trail records completed actions."
        action={
          <Link to="/admin/logs" className="adm-card-link">
            View all logs <FiArrowRight size={13} style={{ verticalAlign: "-2px" }} />
          </Link>
        }
      >
        {activity.length ? (
          <div className={TABLE}>
            <div className="adm-table-wrap">
              <table className="adm-table adm-table--dense">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Type</th>
                    <th>User / System</th>
                    <th>Timestamp</th>
                    <th>Status</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((log) => (
                    <tr key={log.id}>
                      <td className="adm-h-mono">{log.action}</td>
                      <td>{log.entityType || "system"}</td>
                      <td>{log.userName || log.userEmail || "System"}</td>
                      <td>{fullTime(log.createdAt)}</td>
                      <td><StatusPill status="success" /></td>
                      <td><SeverityPill severity={activitySeverity(log.action)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="adm-empty">No activity recorded yet.</p>
        )}
      </Section>
    </div>
  );
}