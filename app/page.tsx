'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Filter,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  X,
  Activity,
  Cpu,
} from 'lucide-react'
import {
  fetchMorningBriefing,
  refreshMorningBriefing,
  fetchPatients,
  createSession,
  updateQbIntervention,
  fetchModule1Predict,
  fetchModule2Predict,
  fetchModule3Predict,
  fetchModule4Predict,
  registerClinician,
  loginClinician,
  PatientProfile,
  MorningBriefingResponse,
  BackendPatient,
} from '@/lib/api'


function getPatientName(p: { pid: number; name?: string | null }): string {
  return p.name || `Patient #${p.pid}`
}

function getPatientFlags(p: PatientProfile): string[] {
  const flags: string[] = []
  if (p.sbp !== null && p.sbp < 115) flags.push(`Low SBP ${Math.round(p.sbp)} mmHg`)
  if (p.hypo_hist >= 2) flags.push(`Hypotension ${p.hypo_hist}/5 sessions`)
  if (p.idwg !== null && p.idwg > 3) flags.push(`IDWG ${p.idwg.toFixed(1)} kg`)
  else if (p.idwg === null) flags.push('IDWG: no data')
  if (p.drift) flags.push(`${(p.dtype || 'drift').replace('_', ' ')} drift`)
  if (p.dm) flags.push('Diabetic')
  if (p.ktv > 0 && p.ktv < 1.2) flags.push(`Kt/V ${p.ktv.toFixed(2)} below target`)
  return flags.length ? flags : ['Stable trajectory']
}

const navItems = [
  { label: 'Morning Briefing', icon: LayoutDashboard },
  { label: 'Session Logger', icon: ClipboardCheck },
  { label: 'Drift Alerts', icon: Bell, count: 0 },
]

function RiskBadge({ risk }: { risk: string }) {
  return (
    <span className={`risk-badge ${risk.toLowerCase()}`}>
      <span className="risk-dot" />
      {risk}
    </span>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="metric">
      <span className="eyebrow">{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  )
}

export default function Page() {
  const [view, setView] = useState('Morning Briefing')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authenticated, setAuthenticated] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [expanded, setExpanded] = useState(true)
  
  // Live Briefing Data
  const [briefingData, setBriefingData] = useState<MorningBriefingResponse | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(true)
  const [briefingRefreshing, setBriefingRefreshing] = useState(false)
  const [briefingError, setBriefingError] = useState('')

  // Modal State
  const [activeModalPatient, setActiveModalPatient] = useState<PatientProfile | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)
  const [showUnitMenu, setShowUnitMenu] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState('Northside Renal Care')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showAllPatientsModal, setShowAllPatientsModal] = useState(false)

  // Filtering for Drift Alerts
  const [severity, setSeverity] = useState('All severity')
  const [driftType, setDriftType] = useState('All types')

  const loadBriefing = async (isRefresh = false) => {
    try {
      if (isRefresh) setBriefingRefreshing(true)
      else setBriefingLoading(true)
      setBriefingError('')

      const data = isRefresh
        ? await refreshMorningBriefing()
        : await fetchMorningBriefing()

      setBriefingData(data)
    } catch (error: any) {
      console.error('Module 5 error:', error)
      setBriefingError(error.message || 'Unable to load live unit data.')
    } finally {
      setBriefingLoading(false)
      setBriefingRefreshing(false)
    }
  }

  useEffect(() => {
    if (!authenticated) return
    loadBriefing()
  }, [authenticated])

  // Count drift alerts
  const driftCount = useMemo(() => {
    if (!briefingData?.patients) return 0
    return briefingData.patients.filter((p) => p.drift).length
  }, [briefingData])

  if (!authenticated)
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        onAuthenticated={() => setAuthenticated(true)}
      />
    )

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <HeartPulse size={18} />
          </div>
          <div>
            <strong>
              Dialysis<span>IQ</span>
            </strong>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="unit-switcher"
          style={{ cursor: 'pointer', position: 'relative' }}
          onClick={() => setShowUnitMenu(!showUnitMenu)}
        >
          <div className="unit-icon">
            <Stethoscope size={16} />
          </div>
          <div>
            <span>UNIT</span>
            <strong>{selectedUnit}</strong>
          </div>
          <ChevronDown size={15} />

          {showUnitMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '6px',
                background: '#101b23',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                zIndex: 20,
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {[
                'Northside Renal Care',
                'Eastside Dialysis Center',
                'Westside Clinical Unit',
                'Southside Outpatient',
              ].map((u) => (
                <button
                  key={u}
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: selectedUnit === u ? '#193439' : 'transparent',
                    color: selectedUnit === u ? 'var(--primary)' : '#b5c4cc',
                    border: 0,
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    setSelectedUnit(u)
                    setShowUnitMenu(false)
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            const count = item.label === 'Drift Alerts' ? driftCount : undefined

            return (
              <button
                key={item.label}
                className={`nav-item ${
                  view === item.label ? 'active' : ''
                }`}
                onClick={() => {
                  setView(item.label)
                  setMobileNav(false)
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {count !== undefined && count > 0 && <b>{count}</b>}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setShowSettingsModal(true)}>
            <Settings size={17} />
            <span>Settings</span>
          </button>

          <div
            className="profile"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowProfileModal(true)}
          >
            <div className="avatar">JL</div>
            <div>
              <strong>Clinical Team</strong>
              <span>Nephrologist</span>
            </div>
            <ChevronRight size={15} />
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div>
            <span className="topbar-kicker">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }).toUpperCase()}
            </span>
            <h1>{view}</h1>
          </div>

          <div className="topbar-actions">
            <button
              className="icon-button"
              onClick={() => loadBriefing(true)}
              title="Refresh Unit Data"
            >
              <RefreshCw size={18} className={briefingRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              className="icon-button"
              aria-label="Notifications"
              title="Notifications"
              onClick={() => setShowNotificationsModal(true)}
            >
              <Bell size={18} />
              {driftCount > 0 && <i />}
            </button>
            <div
              className="top-avatar"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowProfileModal(true)}
            >
              JL
            </div>
          </div>
        </header>

        {view === 'Morning Briefing' && (
          <Briefing
            expanded={expanded}
            setExpanded={setExpanded}
            data={briefingData}
            loading={briefingLoading}
            refreshing={briefingRefreshing}
            error={briefingError}
            onSelectPatient={setActiveModalPatient}
            onRefresh={() => loadBriefing(true)}
            onViewAllPatients={() => setShowAllPatientsModal(true)}
          />
        )}

        {view === 'Session Logger' && (
          <SessionLogger
            briefingData={briefingData}
            onSessionCreated={() => loadBriefing(true)}
          />
        )}

        {view === 'Drift Alerts' && (
          <DriftAlertsView
            severity={severity}
            setSeverity={setSeverity}
            driftType={driftType}
            setDriftType={setDriftType}
            patients={briefingData?.patients || []}
            onSelectPatient={setActiveModalPatient}
          />
        )}
      </section>

      {activeModalPatient && (
        <PatientDetailModal
          patient={activeModalPatient}
          onClose={() => setActiveModalPatient(null)}
        />
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {showNotificationsModal && (
        <NotificationsModal
          briefingData={briefingData}
          onClose={() => setShowNotificationsModal(false)}
          onSelectPatient={(p) => {
            setShowNotificationsModal(false)
            setActiveModalPatient(p)
          }}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
          onSignOut={() => {
            localStorage.removeItem('dialysisiq_session')
            setShowProfileModal(false)
            setAuthenticated(false)
          }}
        />
      )}

      {showAllPatientsModal && (
        <AllPatientsModal
          patients={briefingData?.patients || []}
          onClose={() => setShowAllPatientsModal(false)}
          onSelectPatient={(p) => {
            setShowAllPatientsModal(false)
            setActiveModalPatient(p)
          }}
        />
      )}
    </main>
  )
}

function Briefing({
  expanded,
  setExpanded,
  data,
  loading,
  refreshing,
  error,
  onSelectPatient,
  onRefresh,
  onViewAllPatients,
}: {
  expanded: boolean
  setExpanded: (v: boolean) => void
  data: MorningBriefingResponse | null
  loading: boolean
  refreshing: boolean
  error: string
  onSelectPatient: (p: PatientProfile) => void
  onRefresh: () => void
  onViewAllPatients?: () => void
}) {
  const patients = data?.patients || []
  const attentionQueue = useMemo(
    () => patients.filter((p) => p.tier === 'HIGH' || p.tier === 'MEDIUM' || p.drift),
    [patients]
  )
  const highRiskPatients = useMemo(
    () => patients.filter((p) => p.tier === 'HIGH'),
    [patients]
  )
  const driftAlerts = useMemo(
    () => patients.filter((p) => p.drift),
    [patients]
  )

  return (
    <div className="content">
      <div className="section-heading">
        <div>
          <p className="section-label">PRE-SHIFT OVERVIEW</p>
          <h2>Good morning, Dr. Lee</h2>
        </div>

        <div className="live-status">
          <span />
          Live unit data
          <small>
            {loading
              ? 'Loading...'
              : refreshing
                ? 'Updating clinical risk scores...'
                : error
                  ? 'Unavailable'
                  : 'Updated just now'}
          </small>
          <button
            onClick={onRefresh}
            style={{
              background: 'none',
              border: 'none',
              color: '#18c6b1',
              cursor: 'pointer',
              marginLeft: '8px',
            }}
            title="Refresh Unit Risk Data"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(220, 38, 38, 0.08)',
            color: '#b91c1c',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      <section className="glance-grid">
        <div className="glance-main">
          <span className="eyebrow">UNIT AT A GLANCE</span>

          <strong>
            {loading ? '—' : data?.summary?.n_total ?? 0}{' '}
            <small>patients today</small>
          </strong>

          <div className="trend">
            <ArrowUpRight size={15} />
            Continuous clinical risk monitoring
          </div>
        </div>

        <Metric
          label="HIGH RISK"
          value={loading ? '—' : String(data?.summary?.n_high ?? 0)}
          tone="high-text"
        />

        <Metric
          label="MEDIUM RISK"
          value={loading ? '—' : String(data?.summary?.n_medium ?? 0)}
          tone="medium-text"
        />

        <Metric
          label="LOW RISK"
          value={loading ? '—' : String(data?.summary?.n_low ?? 0)}
          tone="low-text"
        />
      </section>

      <div className="section-title-row">
        <div>
          <p className="section-label">ATTENTION QUEUE</p>
          <h3>
            Patients requiring attention{' '}
            <span className="count-chip">{attentionQueue.length}</span>
          </h3>
        </div>

        <button className="text-button" onClick={onViewAllPatients}>
          View all {patients.length} patients <ArrowUpRight size={15} />
        </button>
      </div>

      <div className="patient-list">
        {attentionQueue.length > 0 ? (
          attentionQueue.map((patient) => (
            <PatientRow
              key={patient.pid}
              patient={patient}
              onClick={() => onSelectPatient(patient)}
            />
          ))
        ) : (
          <div style={{ padding: '24px 0', color: '#7e909a', fontSize: '13px' }}>
            {loading ? 'Analyzing unit clinical data...' : 'No elevated risk patients flagged for attention.'}
          </div>
        )}
      </div>

      <div className="briefing-columns">
        <section className="panel priorities">
          <div className="panel-header">
            <div>
              <p className="section-label">YOUR SHIFT</p>
              <h3>Clinical priorities for today</h3>
            </div>
            <ShieldCheck size={19} />
          </div>

          {[
            highRiskPatients.length > 0
              ? `Review pre-session dry weight & BP for PID ${highRiskPatients[0].pid}`
              : 'Review dry weights prior to treatment initiation',
            driftAlerts.length > 0
              ? `Nephrologist follow-up for ${driftAlerts.length} dry weight drift alert(s)`
              : 'Monitor weight trends across active dialysis sessions',
            'Verify pre-session SBP and Kt/V targets before start',
          ].map((item, i) => (
            <label className="check-row" key={item}>
              <input type="checkbox" defaultChecked={i === 2} />
              <span className="custom-check">
                <Check size={13} />
              </span>
              <span>{item}</span>
              <b>0{i + 1}</b>
            </label>
          ))}
        </section>

        <section className="panel drift">
          <button
            className="panel-header collapse-button"
            onClick={() => setExpanded(!expanded)}
          >
            <div>
              <p className="section-label">MONITORING</p>
              <h3>
                Dry weight drift alerts{' '}
                <span className="count-chip danger">
                  {loading ? '—' : data?.summary?.n_drift ?? 0}
                </span>
              </h3>
            </div>

            {expanded ? <ChevronDown size={19} /> : <ChevronRight size={19} />}
          </button>

          {expanded && (
            <div className="drift-list">
              {driftAlerts.slice(0, 4).map((alert) => (
                <div
                  className="drift-row"
                  key={alert.pid}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectPatient(alert)}
                >
                  <div>
                    <strong>PID {alert.pid}</strong>
                    <span>{alert.dtype || 'drift'}</span>
                  </div>

                  <RiskBadge risk={alert.tier} />

                  <p>{alert.daction || alert.nursing_action || alert.dreason || 'Reassess dry weight'}</p>
                </div>
              ))}
              {driftAlerts.length === 0 && (
                <p style={{ color: '#7a8c97', fontSize: '11px', marginTop: '12px' }}>
                  No active dry weight drift alerts detected.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="actions-section">
        <div className="section-title-row">
          <div>
            <p className="section-label">HIGH-RISK PROTOCOL</p>
            <h3>Pre-session nursing actions</h3>
          </div>

          <span className="muted-note">
            {loading
              ? 'Loading...'
              : `${highRiskPatients.length} patients require pre-session action`}
          </span>
        </div>

        <div className="action-grid">
          {highRiskPatients.map((p) => (
            <div className="action-card" key={p.pid}>
              <div className="action-top">
                <div>
                  <RiskBadge risk={p.tier} />
                  <strong>PID {p.pid}</strong>
                  <span>{getPatientName(p)}</span>
                </div>

                <AlertTriangle size={18} />
              </div>

              <div className="action-metrics">
                <Metric
                  label="PRE SBP"
                  value={p.sbp ? `${Math.round(p.sbp)} mmHg` : '—'}
                />
                <Metric
                  label="IDWG"
                  value={p.idwg !== null ? `${p.idwg.toFixed(1)} kg` : 'no data'}
                />
                <Metric
                  label="HYPO. PROB."
                  value={`${Math.round(p.prob * 100)}%`}
                />
              </div>

              <p>
                <b>Recommended action</b>
                {p.nursing_action || 'Review dry weight before initiation. Consider reduced UF target and close BP monitoring.'}
              </p>

              <button
                className="outline-button"
                onClick={() => onSelectPatient(p)}
              >
                Open patient record <ArrowUpRight size={14} />
              </button>
            </div>
          ))}
          {highRiskPatients.length === 0 && !loading && (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '24px',
                background: '#0c141b',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: '#7a8c97',
                fontSize: '12px',
              }}
            >
              No high-risk patients flagged for immediate pre-session protocol today.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function PatientRow({
  patient,
  onClick,
}: {
  patient: PatientProfile
  onClick: () => void
}) {
  const flags = getPatientFlags(patient)
  const probPercent = Math.round(patient.prob * 100)

  return (
    <article
      className={`patient-row ${patient.tier === 'HIGH' ? 'high-row' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="patient-id">
        <div className="patient-avatar">
          #{patient.pid % 1000}
        </div>

        <div>
          <strong>PID {patient.pid}</strong>
          <span>{getPatientName(patient)}</span>
        </div>
      </div>

      <RiskBadge risk={patient.tier} />

      <div className="probability">
        <span>Hypotension probability</span>

        <div>
          <div className="bar">
            <i style={{ width: `${probPercent}%` }} />
          </div>

          <b>{probPercent}%</b>
        </div>
      </div>

      <div className="flags">
        {flags.map((flag) => (
          <span
            key={flag}
            className={
              flag.includes('Low SBP') || flag.includes('drift')
                ? 'warning'
                : flag === 'IDWG: no data'
                  ? 'neutral'
                  : ''
            }
          >
            {flag}
          </span>
        ))}
      </div>

      <ArrowUpRight className="row-arrow" size={16} />
    </article>
  )
}

function SessionLogger({
  briefingData,
  onSessionCreated,
}: {
  briefingData: MorningBriefingResponse | null
  onSessionCreated: () => void
}) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BackendPatient[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<BackendPatient | PatientProfile | null>(null)
  
  // Form fields
  const [preSbp, setPreSbp] = useState('128')
  const [preDbp, setPreDbp] = useState('72')
  const [weightStart, setWeightStart] = useState('74.6')
  const [dryWeight, setDryWeight] = useState('72.0')
  const [weightPost, setWeightPost] = useState('')
  const [durationMin, setDurationMin] = useState('240')
  const [avgUf, setAvgUf] = useState('')
  const [maxUf, setMaxUf] = useState('')
  const [avgConductivity, setAvgConductivity] = useState('14.0')
  const [avgDiaTemp, setAvgDiaTemp] = useState('36.5')

  const [logged, setLogged] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true)
        const results = await fetchPatients(query)
        setSearchResults(results)
      } catch (err) {
        console.error('Patient search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) {
      setErrorMsg('Please select a valid patient by PID first.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMsg('')

      await createSession({
        pid: selectedPatient.pid,
        pre_sbp: parseFloat(preSbp) || 120,
        pre_dbp: parseFloat(preDbp) || 75,
        weightstart: parseFloat(weightStart) || 70,
        dryweight: parseFloat(dryWeight) || 68,
        weight_post: weightPost ? parseFloat(weightPost) : undefined,
        duration_min: durationMin ? parseFloat(durationMin) : 240,
        avg_uf: avgUf ? parseFloat(avgUf) : undefined,
        max_uf: maxUf ? parseFloat(maxUf) : undefined,
        avg_conductivity: avgConductivity ? parseFloat(avgConductivity) : 14.0,
        avg_dia_temp: avgDiaTemp ? parseFloat(avgDiaTemp) : 36.5,
      })

      setLogged(true)
      onSessionCreated()
    } catch (err: any) {
      console.error('Failed to log session:', err)
      setErrorMsg(err.message || 'Failed to save treatment session.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (logged)
    return (
      <div className="content narrow">
        <div className="success-state">
          <div className="success-icon">
            <Check size={30} />
          </div>

          <p className="section-label">SESSION RECORDED</p>

          <h2>Session logged successfully</h2>

          <p>
            Treatment data for PID <strong>{selectedPatient?.pid}</strong> has been saved to the clinical record and updated in live patient risk trajectories.
          </p>

          <button
            className="primary-button"
            onClick={() => {
              setLogged(false)
              setSelectedPatient(null)
              setQuery('')
            }}
          >
            <Plus size={16} />
            Log another session
          </button>
        </div>
      </div>
    )

  return (
    <div className="content narrow">
      <div className="form-intro">
        <div>
          <p className="section-label">TREATMENT RECORD</p>
          <h2>Log today&apos;s session</h2>
          <p>
            Capture clinical treatment data to update patient trajectories.
          </p>
        </div>

        <div className="form-step">
          <span>01</span>
          <b>Patient</b>
          <i />
          <span>02</span>
          <b>Session data</b>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(220, 38, 38, 0.08)',
            color: '#b91c1c',
            fontSize: '13px',
          }}
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <section className="form-card">
          <div className="form-card-heading">
            <div className="step-number">01</div>

            <div>
              <h3>Find a patient</h3>
              <p>Search clinical database by Patient ID (PID).</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="patient-id">
              Patient ID <b>Required</b>
            </label>

            <div className="input-wrap">
              <Search size={17} />

              <input
                id="patient-id"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedPatient(null)
                }}
                placeholder="Search patient ID, e.g. 102117"
                autoComplete="off"
              />
            </div>

            {query && !selectedPatient && (
              <div className="search-results">
                {isSearching ? (
                  <div style={{ padding: '12px', fontSize: '11px', color: '#7f939e' }}>
                    Searching clinical database...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((p) => (
                    <button
                      type="button"
                      key={p.pid}
                      onClick={() => {
                        setSelectedPatient(p)
                        setQuery(String(p.pid))
                      }}
                    >
                      <div className="result-avatar">#{p.pid % 1000}</div>

                      <div>
                        <strong>PID {p.pid}</strong>
                        <span>
                          {getPatientName(p)} · {p.gender || 'M'} ·{' '}
                          {p.has_dm ? 'Diabetic' : 'Non-diabetic'}
                        </span>
                      </div>

                      <ChevronRight size={15} />
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    className="new-patient"
                    onClick={() => {
                      const pidNum = parseInt(query, 10) || Math.floor(Math.random() * 900000) + 100000
                      const customPatient: BackendPatient = {
                        pid: pidNum,
                        name: `Patient #${pidNum}`,
                        gender: 'M',
                        birthday: 1965,
                        first_dialysis: null,
                        has_dm: false,
                      }
                      setSelectedPatient(customPatient)
                    }}
                  >
                    <Plus size={16} />
                    <span>Select PID {query} for session logging</span>
                    <ChevronRight size={15} />
                  </button>
                )}
              </div>
            )}
          </div>

          {selectedPatient && (
            <div className="selected-patient">
              <Check size={16} />

              <div>
                <strong>PID {selectedPatient.pid} · {getPatientName(selectedPatient)}</strong>
                <span>
                  {selectedPatient.gender || 'M'} ·{' '}
                  {('has_dm' in selectedPatient ? selectedPatient.has_dm : Boolean(selectedPatient.dm)) ? 'Diabetic' : 'Non-diabetic'} · Active treatment record
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPatient(null)
                  setQuery('')
                }}
              >
                <X size={15} />
              </button>
            </div>
          )}
        </section>

        <section className="form-card">
          <div className="form-card-heading">
            <div className="step-number">02</div>

            <div>
              <h3>Today&apos;s session</h3>
              <p>Required vitals for live risk model scoring.</p>
            </div>
          </div>

          <div className="form-grid session-fields">
            <label className="field">
              <span>Pre-session SBP (mmHg) <b>Required</b></span>
              <input
                type="number"
                value={preSbp}
                onChange={(e) => setPreSbp(e.target.value)}
                placeholder="e.g. 128"
                required
              />
            </label>

            <label className="field">
              <span>Pre-session DBP (mmHg) <b>Required</b></span>
              <input
                type="number"
                value={preDbp}
                onChange={(e) => setPreDbp(e.target.value)}
                placeholder="e.g. 72"
                required
              />
            </label>

            <label className="field">
              <span>Weight at start (kg) <b>Required</b></span>
              <input
                type="number"
                step="0.1"
                value={weightStart}
                onChange={(e) => setWeightStart(e.target.value)}
                placeholder="e.g. 74.6"
                required
              />
            </label>

            <label className="field">
              <span>Dry weight (kg) <b>Required</b></span>
              <input
                type="number"
                step="0.1"
                value={dryWeight}
                onChange={(e) => setDryWeight(e.target.value)}
                placeholder="e.g. 72.0"
                required
              />
            </label>

            <label className="field">
              <span>Weight at end (kg)</span>
              <input
                type="number"
                step="0.1"
                value={weightPost}
                onChange={(e) => setWeightPost(e.target.value)}
                placeholder="Optional"
              />
            </label>

            <label className="field">
              <span>Session duration (min)</span>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                placeholder="e.g. 240"
              />
            </label>

            <label className="field">
              <span>Avg. UF rate (L/hr)</span>
              <input
                type="number"
                step="0.01"
                value={avgUf}
                onChange={(e) => setAvgUf(e.target.value)}
                placeholder="Optional"
              />
            </label>

            <label className="field">
              <span>Max UF rate (L/hr)</span>
              <input
                type="number"
                step="0.01"
                value={maxUf}
                onChange={(e) => setMaxUf(e.target.value)}
                placeholder="Optional"
              />
            </label>

            <label className="field">
              <span>Avg. conductivity (mS/cm)</span>
              <input
                type="number"
                step="0.1"
                value={avgConductivity}
                onChange={(e) => setAvgConductivity(e.target.value)}
                placeholder="e.g. 14.0"
              />
            </label>

            <label className="field">
              <span>Avg. dialysate temp (°C)</span>
              <input
                type="number"
                step="0.1"
                value={avgDiaTemp}
                onChange={(e) => setAvgDiaTemp(e.target.value)}
                placeholder="e.g. 36.5"
              />
            </label>
          </div>

          <button
            className="primary-button submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            <ClipboardCheck size={17} />
            {isSubmitting ? 'Saving treatment record...' : 'Log session'}
          </button>
        </section>
      </form>
    </div>
  )
}

function DriftAlertsView({
  severity,
  setSeverity,
  driftType,
  setDriftType,
  patients,
  onSelectPatient,
}: {
  severity: string
  setSeverity: (v: string) => void
  driftType: string
  setDriftType: (v: string) => void
  patients: PatientProfile[]
  onSelectPatient: (p: PatientProfile) => void
}) {
  const driftAlerts = useMemo(() => {
    return patients.filter((p) => {
      if (!p.drift) return false
      if (severity !== 'All severity' && p.tier !== severity.toUpperCase()) return false
      if (driftType !== 'All types' && p.dtype !== driftType) return false
      return true
    })
  }, [patients, severity, driftType])

  const handleExportReport = () => {
    if (!driftAlerts.length) return
    const headers = ['PID', 'Patient Name', 'Severity', 'Drift Type', 'Probability', 'Recommended Action']
    const rows = driftAlerts.map((a) => [
      a.pid,
      `"${getPatientName(a)}"`,
      a.tier,
      a.dtype || 'drift',
      `${Math.round(a.prob * 100)}%`,
      `"${(a.daction || a.nursing_action || a.dreason || 'Review dry weight target').replace(/"/g, '""')}"`,
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `dialysis_iq_drift_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="content">
      <div className="section-heading">
        <div>
          <p className="section-label">UNIT MONITORING</p>
          <h2>Dry weight drift alerts</h2>
          <p className="subheading">
            Automated clinical detection flags for dry weight trajectory drift.
          </p>
        </div>

        <button className="outline-button" onClick={handleExportReport}>
          <FileText size={15} />
          Export report
        </button>
      </div>

      <div className="filters">
        <Filter size={15} />

        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option>All severity</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <select
          value={driftType}
          onChange={(e) => setDriftType(e.target.value)}
        >
          <option>All types</option>
          <option value="fluid_management">fluid_management</option>
          <option value="body_composition">body_composition</option>
        </select>

        <span>{driftAlerts.length} active alerts</span>
      </div>

      <section className="alert-table">
        <div className="table-head">
          <span>PATIENT ID</span>
          <span>SEVERITY</span>
          <span>DRIFT TYPE</span>
          <span>RECOMMENDED ACTION</span>
          <span />
        </div>

        {driftAlerts.map((a) => (
          <div
            className="table-row"
            key={a.pid}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectPatient(a)}
          >
            <div className="table-patient">
              <div className="patient-avatar">#{a.pid % 1000}</div>

              <div>
                <strong>PID {a.pid}</strong>
                <span>{getPatientName(a)}</span>
              </div>
            </div>

            <RiskBadge risk={a.tier} />

            <span className="type-code">{a.dtype || 'drift'}</span>

            <span className="action-copy">{a.daction || a.nursing_action || a.dreason || 'Review dry weight target'}</span>

            <ChevronRight size={16} className="row-arrow" />
          </div>
        ))}

        {driftAlerts.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#7a8d98', fontSize: '12px' }}>
            No matching dry weight drift alerts found.
          </div>
        )}
      </section>
    </div>
  )
}

function PatientDetailModal({
  patient,
  onClose,
}: {
  patient: PatientProfile
  onClose: () => void
}) {
  const [mod1Loading, setMod1Loading] = useState(false)
  const [mod1Data, setMod1Data] = useState<any>(null)

  const [mod2Loading, setMod2Loading] = useState(false)
  const [mod2Data, setMod2Data] = useState<any>(null)

  const [mod3Loading, setMod3Loading] = useState(false)
  const [mod3Data, setMod3Data] = useState<any>(null)

  const [mod4Loading, setMod4Loading] = useState(false)
  const [mod4Data, setMod4Data] = useState<any>(null)

  const [qbIntervention, setQbIntervention] = useState<boolean | null>(
    patient.drift_intervention?.action ? true : false
  )
  const [updatingQb, setUpdatingQb] = useState(false)

  const runModule1 = async () => {
    try {
      setMod1Loading(true)
      const data = await fetchModule1Predict(`${patient.pid}_latest`)
      setMod1Data(data)
    } catch (err: any) {
      setMod1Data({ error: err.message || 'Qb target calculation failed' })
    } finally {
      setMod1Loading(false)
    }
  }

  const runModule2 = async () => {
    try {
      setMod2Loading(true)
      const data = await fetchModule2Predict(`${patient.pid}_latest`)
      setMod2Data(data)
    } catch (err: any) {
      setMod2Data({ error: err.message || 'Hypotension risk scoring failed' })
    } finally {
      setMod2Loading(false)
    }
  }

  const runModule3 = async () => {
    try {
      setMod3Loading(true)
      const isHighRisk = patient.tier === 'HIGH' || Boolean(patient.drift)

      if (!isHighRisk) {
        setMod3Data({
          predicted_label: 'Normal',
          confidence: 1.0,
          is_normal: true,
        })
        return
      }

      const data = await fetchModule3Predict({
        session_id: `${patient.pid}_latest`,
        pid: patient.pid,
        event_time: new Date().toISOString(),
        event: {
          conductivity_z_trend: 3.5,
          _tiebreak_conductivity_z: 3.2,
          sbp_z_trend: -2.8,
          anomaly_raw_score: 0.85,
          avg_qb_running: 280.0,
          prior_count_conductivity_drift: 2,
        },
      })
      setMod3Data(data)
    } catch (err: any) {
      setMod3Data({ error: err.message || 'Telemetry analysis failed' })
    } finally {
      setMod3Loading(false)
    }
  }

  const runModule4 = async () => {
    try {
      setMod4Loading(true)
      const data = await fetchModule4Predict(patient.pid)
      setMod4Data(data)
    } catch (err: any) {
      setMod4Data({ error: err.message || 'Drift assessment failed' })
    } finally {
      setMod4Loading(false)
    }
  }

  const toggleIntervention = async () => {
    try {
      setUpdatingQb(true)
      const newVal = !qbIntervention
      await updateQbIntervention(`${patient.pid}_latest`, newVal)
      setQbIntervention(newVal)
    } catch (err) {
      console.error('Failed to update Qb intervention:', err)
    } finally {
      setUpdatingQb(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="modal-avatar">#{patient.pid % 1000}</div>
          <div className="modal-header-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2>PID {patient.pid}</h2>
              <RiskBadge risk={patient.tier} />
            </div>
            <p>
              {getPatientName(patient)} · Age {patient.age || '—'} ·{' '}
              {patient.dm ? 'Diabetic' : 'Non-diabetic'} · DialysisIQ Patient Record
            </p>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-section-title">
              <span>LATEST CLINICAL VITALS</span>
              <Activity size={14} />
            </div>

            <div className="modal-vitals-grid">
              <div className="modal-vital-card">
                <span>PRE SBP</span>
                <strong style={{ color: patient.sbp && patient.sbp < 115 ? '#f05b5b' : 'inherit' }}>
                  {patient.sbp ? `${Math.round(patient.sbp)} mmHg` : '—'}
                </strong>
              </div>

              <div className="modal-vital-card">
                <span>PRE DBP</span>
                <strong>{patient.dbp ? `${Math.round(patient.dbp)} mmHg` : '—'}</strong>
              </div>

              <div className="modal-vital-card">
                <span>IDWG</span>
                <strong>{patient.idwg !== null ? `${patient.idwg.toFixed(1)} kg` : 'no data'}</strong>
              </div>

              <div className="modal-vital-card">
                <span>HYPO PROBABILITY</span>
                <strong style={{ color: '#f05b5b' }}>{Math.round(patient.prob * 100)}%</strong>
              </div>
            </div>
          </div>

          <div className="modal-action-box">
            <strong>RECOMMENDED NURSING PROTOCOL</strong>
            {patient.nursing_action || 'Monitor BP closely during session; reassess UFR if symptomatic.'}
          </div>

          <div className="modal-section">
            <div className="modal-section-title">
              <span>CLINICAL INTELLIGENCE ANALYTICS</span>
              <Cpu size={14} />
            </div>

            {/* Target Blood Flow Rate */}
            <div className="modal-module-card">
              <div className="modal-module-header">
                <span className="modal-module-title">Target Blood Flow Rate (Qb)</span>
                {mod1Data && !mod1Data.error && (
                  <span className="modal-module-value">{mod1Data.predicted_qb} mL/min</span>
                )}
                {!mod1Data && (
                  <button className="outline-button" onClick={runModule1} disabled={mod1Loading}>
                    {mod1Loading ? 'Processing...' : 'Assess Target Qb'}
                  </button>
                )}
              </div>
              <p className="modal-module-desc">
                {mod1Data?.error
                  ? mod1Data.error
                  : mod1Data
                    ? `Optimal pre-session blood flow rate: ${mod1Data.predicted_qb} mL/min (Continuous: ${mod1Data.qb_mode_continuous?.toFixed(1)} mL/min).`
                    : 'Calculates optimal individualized blood flow rate based on pre-session clinical vitals.'}
              </p>
            </div>

            {/* Intra-Session Hypotension Risk */}
            <div className="modal-module-card">
              <div className="modal-module-header">
                <span className="modal-module-title">Intra-Session Hypotension Risk Assessment</span>
                <button className="outline-button" onClick={toggleIntervention} disabled={updatingQb}>
                  {qbIntervention ? 'Qb Intervention Active' : 'Annotate Qb Intervention'}
                </button>
              </div>
              <p className="modal-module-desc">
                Intra-session risk: {Math.round(patient.prob * 100)}% ({patient.tier} tier). Post-session Qb intervention status can be recorded for record accuracy.
              </p>
            </div>

            {/* Intra-Session Event Analysis */}
            <div className="modal-module-card">
              <div className="modal-module-header">
                <span className="modal-module-title">Intra-Session Event Analysis</span>
                {mod3Data && !mod3Data.error && (
                  <span
                    className="modal-module-value"
                    style={{
                      color:
                        mod3Data.predicted_label && mod3Data.predicted_label !== 'Normal'
                          ? '#f05b5b'
                          : '#4dc58a',
                    }}
                  >
                    {mod3Data.predicted_label || mod3Data.predicted_event || 'Analyzed'}
                    {mod3Data.confidence ? ` (${Math.round(mod3Data.confidence * 100)}%)` : ''}
                  </span>
                )}
                {!mod3Data && (
                  <button className="outline-button" onClick={runModule3} disabled={mod3Loading}>
                    {mod3Loading ? 'Processing...' : 'Analyze Telemetry'}
                  </button>
                )}
              </div>
              <p className="modal-module-desc">
                {mod3Data?.error
                  ? mod3Data.error
                  : mod3Data?.is_normal || mod3Data?.predicted_label === 'Normal'
                    ? 'Telemetry Analysis Complete: Baseline telemetry stable. No treatment interruption detected (100% confidence).'
                    : mod3Data?.dual_signal_note
                      ? `⚠️ DUAL SIGNAL DETECTED: ${mod3Data.dual_signal_note}`
                      : mod3Data
                        ? `Classified abruption: ${mod3Data.predicted_label} (${Math.round((mod3Data.confidence || 0) * 100)}% conf). Top SHAP drivers: ${(mod3Data.top_features || []).map((f: any) => `${f.feature} (${f.shap > 0 ? '+' : ''}${f.shap})`).join(', ')}.`
                        : 'Analyzes intra-session telemetry patterns for potential treatment interruption events.'}
              </p>
            </div>

            {/* Dry Weight Drift Assessment */}
            <div className="modal-module-card">
              <div className="modal-module-header">
                <span className="modal-module-title">Dry Weight Drift Assessment</span>
                {patient.drift ? (
                  <span className="modal-module-value" style={{ color: '#edb454' }}>
                    Drift Flagged ({patient.dtype})
                  </span>
                ) : (
                  <span className="modal-module-value" style={{ color: '#4dc58a' }}>
                    No Drift
                  </span>
                )}
              </div>
              <p className="modal-module-desc">
                {patient.drift
                  ? `Assessment summary: ${patient.daction || 'Reassess dry weight.'} Reason: ${patient.dreason || 'Weight trend deviation.'}`
                  : 'Trend analysis shows weight history remains within normal bounds.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthScreen({
  mode,
  setMode,
  onAuthenticated,
}: {
  mode: 'login' | 'signup'
  setMode: (mode: 'login' | 'signup') => void
  onAuthenticated: () => void
}) {
  const [email, setEmail] = useState('dr.lee@northside.org')
  const [password, setPassword] = useState('password123')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const cleanEmail = email.trim().toLowerCase()

    try {
      if (mode === 'login') {
        const data = await loginClinician(cleanEmail, password)
        localStorage.setItem(
          'dialysisiq_session',
          JSON.stringify({
            email: data.user?.email || cleanEmail,
            token: data.access_token,
            time: Date.now(),
          })
        )
        onAuthenticated()
      } else {
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.')
          setSubmitting(false)
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please verify your password.')
          setSubmitting(false)
          return
        }
        const data = await registerClinician(cleanEmail, password)
        localStorage.setItem(
          'dialysisiq_session',
          JSON.stringify({
            email: data.user?.email || cleanEmail,
            time: Date.now(),
          })
        )
        onAuthenticated()
      }
    } catch (err: any) {
      console.error('Auth error:', err)
      setError(err.message || 'Authentication failed. Please verify your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">
            <HeartPulse size={18} />
          </div>

          <div>
            <strong>
              Dialysis<span>IQ</span>
            </strong>
          </div>
        </div>

        <div className="auth-heading">
          <p className="section-label">SECURE CLINICAL ACCESS</p>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: '14px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '12px',
              lineHeight: '1.4',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="dr.lee@northside.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={submitting}
            />
          </label>

          {mode === 'signup' && (
            <label className="field">
              <span>Confirm password</span>
              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={submitting}
              />
            </label>
          )}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Authenticating...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          className="auth-link"
          onClick={() => {
            setError('')
            setMode(mode === 'login' ? 'signup' : 'login')
          }}
          disabled={submitting}
        >
          {mode === 'login'
            ? 'New clinician? Create an account'
            : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  )
}



function SettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close settings">
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="modal-avatar" style={{ background: '#193439', color: 'var(--primary)' }}>
            <Settings size={22} />
          </div>
          <div className="modal-header-info">
            <h2>Clinical Engine Settings</h2>
            <p>System Diagnostics & Machine Learning Configuration</p>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-section-title">
              <span>SYSTEM DIAGNOSTICS</span>
              <ShieldCheck size={14} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#101b24', borderRadius: '6px' }}>
                <span style={{ color: '#8295a3' }}>FastAPI Backend Endpoint</span>
                <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>https://dialysisiq-backend-1.onrender.com</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#101b24', borderRadius: '6px' }}>
                <span style={{ color: '#8295a3' }}>Supabase Database Connection</span>
                <strong style={{ color: '#4dc58a' }}>Connected (hmhgdghioq...)</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#101b24', borderRadius: '6px' }}>
                <span style={{ color: '#8295a3' }}>Groq LLM Engine</span>
                <strong style={{ color: '#68e0d1' }}>groq/compound-mini</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#101b24', borderRadius: '6px' }}>
                <span style={{ color: '#8295a3' }}>Module Pipeline Acceleration</span>
                <strong style={{ color: '#4dc58a' }}>O(1) Dictionary Indexing Active</strong>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">
              <span>ML MODULE SPECIFICATIONS</span>
              <Cpu size={14} />
            </div>

            <div style={{ fontSize: '10px', color: '#8ca0ad', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 6px' }}>• <b>Module 1</b>: Continuous & snapped Qb target prediction (66 features)</p>
              <p style={{ margin: '0 0 6px' }}>• <b>Module 2</b>: Intradialytic hypotension risk tiering (100 features)</p>
              <p style={{ margin: '0 0 6px' }}>• <b>Module 3</b>: Telemetry interruption event classification (43 features)</p>
              <p style={{ margin: '0 0 6px' }}>• <b>Module 4</b>: Dry weight drift detection & direction component (25 features)</p>
              <p style={{ margin: '0' }}>• <b>Module 5</b>: Morning briefing aggregation & LLM clinical priorities</p>
            </div>
          </div>

          <button className="primary-button" style={{ width: '100%' }} onClick={onClose}>
            Close Settings
          </button>
        </div>
      </div>
    </div>
  )
}

function NotificationsModal({
  briefingData,
  onClose,
  onSelectPatient,
}: {
  briefingData: MorningBriefingResponse | null
  onClose: () => void
  onSelectPatient: (p: PatientProfile) => void
}) {
  const highRisk = (briefingData?.patients || []).filter((p) => p.tier === 'HIGH')
  const driftAlerts = (briefingData?.patients || []).filter((p) => p.drift)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close notifications">
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="modal-avatar" style={{ background: '#3b2025', color: 'var(--high)' }}>
            <Bell size={22} />
          </div>
          <div className="modal-header-info">
            <h2>Clinical Notifications</h2>
            <p>Active High-Risk Flags & Telemetry Warnings</p>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-section-title">
              <span>HIGH-RISK PATIENT ALERTS ({highRisk.length})</span>
              <AlertTriangle size={14} style={{ color: 'var(--high)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {highRisk.slice(0, 5).map((p) => (
                <div
                  key={p.pid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#141217',
                    border: '1px solid #3d2227',
                    borderRadius: '7px',
                    cursor: 'pointer',
                  }}
                  onClick={() => onSelectPatient(p)}
                >
                  <div>
                    <strong style={{ fontSize: '11px', color: '#f05b5b' }}>PID {p.pid} — High Hypotension Risk ({Math.round(p.prob * 100)}%)</strong>
                    <span style={{ display: 'block', fontSize: '10px', color: '#8a9aa5', marginTop: '2px' }}>
                      Pre SBP: {p.sbp ? `${Math.round(p.sbp)} mmHg` : '—'} · {p.nursing_action || 'Pre-session protocol required.'}
                    </span>
                  </div>
                  <ChevronRight size={16} style={{ color: '#7a8d98' }} />
                </div>
              ))}
              {highRisk.length === 0 && (
                <div style={{ fontSize: '11px', color: '#7a8d98', padding: '8px 0' }}>No active high-risk hypotension alerts.</div>
              )}
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">
              <span>DRY WEIGHT DRIFT ALERTS ({driftAlerts.length})</span>
              <Bell size={14} style={{ color: 'var(--medium)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {driftAlerts.slice(0, 5).map((p) => (
                <div
                  key={p.pid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#14191d',
                    border: '1px solid #2d3b2e',
                    borderRadius: '7px',
                    cursor: 'pointer',
                  }}
                  onClick={() => onSelectPatient(p)}
                >
                  <div>
                    <strong style={{ fontSize: '11px', color: '#edb454' }}>PID {p.pid} — {p.dtype || 'Drift Detected'}</strong>
                    <span style={{ display: 'block', fontSize: '10px', color: '#8a9aa5', marginTop: '2px' }}>
                      {p.daction || p.dreason || 'Reassess target dry weight before next session.'}
                    </span>
                  </div>
                  <ChevronRight size={16} style={{ color: '#7a8d98' }} />
                </div>
              ))}
            </div>
          </div>

          <button className="outline-button" style={{ width: '100%' }} onClick={onClose}>
            Close Notifications
          </button>
        </div>
      </div>
    </div>
  )
}

function ProfileModal({
  onClose,
  onSignOut,
}: {
  onClose: () => void
  onSignOut: () => void
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close profile">
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="modal-avatar" style={{ background: '#21434a', color: '#92e2d8', width: '54px', height: '54px', fontSize: '18px' }}>
            JL
          </div>
          <div className="modal-header-info">
            <h2>Dr. J. Lee, MD</h2>
            <p>Lead Nephrologist · DialysisIQ Unit Administrator</p>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-section-title">
              <span>CLINICIAN CREDENTIALS</span>
              <ShieldCheck size={14} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#101b24', borderRadius: '6px' }}>
                <span style={{ color: '#7f929f' }}>Medical License</span>
                <strong style={{ color: '#dbe5ea' }}>MD-904218-GA</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#101b24', borderRadius: '6px' }}>
                <span style={{ color: '#7f929f' }}>Assigned Unit</span>
                <strong style={{ color: 'var(--primary)' }}>Northside Renal Care Unit #4</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#101b24', borderRadius: '6px' }}>
                <span style={{ color: '#7f929f' }}>Shift Status</span>
                <strong style={{ color: '#4dc58a' }}>Active On Duty (07:00 - 15:00)</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="outline-button" style={{ flex: 1 }} onClick={onClose}>
              Close
            </button>
            <button
              className="outline-button"
              style={{
                flex: 1,
                borderColor: 'rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                background: 'rgba(239, 68, 68, 0.08)',
              }}
              onClick={onSignOut}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


function AllPatientsModal({
  patients,
  onClose,
  onSelectPatient,
}: {
  patients: PatientProfile[]
  onClose: () => void
  onSelectPatient: (p: PatientProfile) => void
}) {
  const [filterTier, setFilterTier] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (filterTier !== 'ALL' && p.tier !== filterTier) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchPid = String(p.pid).includes(q)
        const matchName = getPatientName(p).toLowerCase().includes(q)
        if (!matchPid && !matchName) return false
      }
      return true
    })
  }, [patients, filterTier, searchQuery])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close patient list">
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="modal-avatar" style={{ background: '#102b30', color: 'var(--primary)' }}>
            <Activity size={22} />
          </div>
          <div className="modal-header-info">
            <h2>All Dialysis Patients ({patients.length})</h2>
            <p>Active Unit Roster & Clinical Risk Trajectories</p>
          </div>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="input-wrap" style={{ flex: 1 }}>
              <Search size={16} />
              <input
                placeholder="Search patient ID or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((t) => (
                <button
                  key={t}
                  type="button"
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: '1px solid #233440',
                    background: filterTier === t ? 'var(--primary)' : '#101b24',
                    color: filterTier === t ? '#061412' : '#8fa0ac',
                    fontWeight: 700,
                    fontSize: '10px',
                  }}
                  onClick={() => setFilterTier(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #1e2e38', borderRadius: '8px' }}>
            {filtered.map((patient) => (
              <PatientRow key={patient.pid} patient={patient} onClick={() => onSelectPatient(patient)} />
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#7a8d98', fontSize: '12px' }}>
                No patients match the search criteria.
              </div>
            )}
          </div>

          <button className="outline-button" style={{ width: '100%' }} onClick={onClose}>
            Close Roster
          </button>
        </div>
      </div>
    </div>
  )
}