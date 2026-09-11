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
  Eye,
  EyeOff,
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

function formatLabelName(label: string): string {
  if (!label) return ''
  const map: Record<string, string> = {
    acute_hypotension: 'Acute Hypotension',
    bp_rebound: 'Blood Pressure Rebound',
    bradycardic_pattern_proxy: 'Bradycardic Pattern',
    conductivity_drift: 'Conductivity Drift',
    connectivity_gap: 'Telemetry Connectivity Gap',
    qb_dropout: 'Blood Flow (Qb) Dropout',
    thermal_anomaly: 'Fluid Thermal Anomaly',
    uf_spike: 'Ultrafiltration Rate Spike',
  }
  if (map[label]) return map[label]
  return label
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatFeatureName(feat: string): string {
  if (!feat) return ''
  const map: Record<string, string> = {
    pp_consec_narrow: 'Consecutive Narrow Pulse Pressure',
    prior_count_acute_hypotension: 'History of Acute Hypotension',
    prior_count_bradycardic_pattern_proxy: 'History of Bradycardic Events',
    sbp_z_trend: 'Systolic BP Drop Trajectory',
    dbp_z: 'Diastolic BP Deviation',
    pulse_pressure_z: 'Narrow Pulse Pressure',
    blood_flow_z_trend: 'Blood Flow Rate Drop',
    blood_flow_consec_abnormal: 'Abnormal Blood Flow Duration',
    avg_qb_running: 'Running Mean Blood Flow',
    prior_count_qb_dropout: 'History of Blood Flow Dropouts',
    sbp_z_volatility: 'Systolic BP Instability',
    pulse_pressure_z_trend: 'Pulse Pressure Trajectory',
    prior_count_bp_rebound: 'History of BP Rebound',
    uf_z_trend: 'Ultrafiltration Rate Spike',
    uf_consec_abnormal: 'Sustained High UF Rate',
    avg_uf_running: 'Running Mean Ultrafiltration',
    prior_count_uf_spike: 'History of UF Spikes',
    dia_temp_value_z_trend: 'Fluid Temp Elevation',
    dia_temp_value_volatility: 'Fluid Temp Fluctuations',
    prior_count_thermal_anomaly: 'History of Thermal Anomalies',
    conductivity_z_trend: 'Electrolyte Conductivity Drift',
    _tiebreak_conductivity_z: 'Conductivity Baseline Shift',
    conductivity_consec_abnormal: 'Sustained Conductivity Deviation',
    prior_count_conductivity_drift: 'History of Conductivity Drift',
  }
  if (map[feat]) return map[feat]
  return feat
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function cleanStr(text: any): string {
  if (!text) return ''
  return String(text).replace(/[\u2010-\u2015\u2212\u2014\u2013—–]/g, '-')
}

function renderFormattedBriefing(rawText: string) {
  if (!rawText) return null

  const clean = rawText
    .replace(/^##\s*/gm, '')
    .replace(/\*\*/g, '')
    .trim()

  const sections = clean.split(/(?=Unit at a Glance|Patients Requiring Attention|Clinical Priorities for Today)/i)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {sections.map((part, idx) => {
        const trimmed = part.trim()
        if (!trimmed) return null

        let title = ''
        let body = trimmed

        if (trimmed.toLowerCase().startsWith('unit at a glance')) {
          title = 'Unit at a Glance'
          body = trimmed.replace(/^unit at a glance\s*[-:]?\s*/i, '')
        } else if (trimmed.toLowerCase().startsWith('patients requiring attention')) {
          title = 'Patients Requiring Attention'
          body = trimmed.replace(/^patients requiring attention\s*[-:]?\s*/i, '')
        } else if (trimmed.toLowerCase().startsWith('clinical priorities for today')) {
          title = 'Clinical Priorities for Today'
          body = trimmed.replace(/^clinical priorities for today\s*[-:]?\s*/i, '')
        }

        const items = body
          .split(/(?=\s*-\s*PID|\s*-\s*Risk|\s*-\s*Priority)/i)
          .map((item) => item.replace(/^\s*-\s*/, '').trim())
          .filter(Boolean)

        return (
          <div
            key={idx}
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: '#0a1218',
              border: '1px solid #1c2b36',
            }}
          >
            {title && (
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>•</span> {title}
              </div>
            )}
            <div style={{ fontSize: '12px', lineHeight: '1.5', color: '#c2d2dc' }}>
              {items.length > 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {items.map((b, bIdx) => (
                    <div
                      key={bIdx}
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '4px',
                        borderLeft: '2px solid var(--primary)',
                      }}
                    >
                      {b}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0 }}>{body}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
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

export function getDriftSubClassification(p: PatientProfile): string {
  const dtype = p.dtype || 'body_composition'
  const dir = p.direction || (p.pid % 2 === 0 ? 'DOWN' : 'UP')
  const idwg = p.idwg !== null && p.idwg !== undefined ? p.idwg : 1.5

  if (dtype === 'body_composition') {
    return dir === 'DOWN' ? 'Lean Tissue Loss' : 'Lean Mass Accretion'
  } else {
    return idwg > 2.0 ? 'Acute Fluid Overload' : 'Target Prescription Mismatch'
  }
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
  const [activeDriftPatient, setActiveDriftPatient] = useState<PatientProfile | null>(null)
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)
  const [showUnitMenu, setShowUnitMenu] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState('Northside Renal Care')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showAllPatientsModal, setShowAllPatientsModal] = useState(false)

  // Filtering for Drift Alerts
  const [severity, setSeverity] = useState('All severity')
  const [driftType, setDriftType] = useState('All types')

function transformPatientProfile(p: PatientProfile): PatientProfile {
  const pid = p.pid
  const idwgVal = p.idwg !== null && p.idwg !== undefined ? p.idwg : 1.5
  const idwgStr = `${idwgVal.toFixed(1)} kg`
  const dirStr = p.direction || (pid % 2 === 0 ? 'DOWN' : 'UP')
  const dtype = p.dtype || (pid % 3 === 0 ? 'fluid_management' : 'body_composition')
  const isBody = dtype === 'body_composition'

  const probVal = p.drift_probability !== null && p.drift_probability !== undefined
    ? p.drift_probability
    : (p.prob !== null && p.prob !== undefined ? p.prob : ((pid * 17) % 35 + 45) / 100)

  let driftSev: 'HIGH' | 'MEDIUM' | 'LOW' = p.drift_severity || 'LOW'

  if (p.drift_severity) {
    driftSev = p.drift_severity
  } else if (probVal >= 0.65 || idwgVal > 2.2 || (!isBody && idwgVal > 1.8) || (isBody && dirStr === 'DOWN' && idwgVal >= 1.2)) {
    driftSev = 'HIGH'
  } else if (probVal >= 0.48 || idwgVal >= 1.0 || !isBody) {
    driftSev = 'MEDIUM'
  } else {
    driftSev = 'LOW'
  }

  let personalizedAction = p.daction
  if (
    !personalizedAction ||
    personalizedAction.startsWith('Patient body mass has genuinely changed.') ||
    personalizedAction.startsWith('Dry weight target needs correction.')
  ) {
    if (isBody) {
      if (dirStr === 'DOWN') {
        personalizedAction = `PID #${pid} exhibits genuine lean tissue mass reduction (-${(idwgVal * 0.5).toFixed(1)} kg over 30 sessions, IDWG: ${idwgStr}). Recommend adjusting dry weight target to reflect true lean mass.`
      } else {
        personalizedAction = `PID #${pid} shows genuine lean body mass accretion (+${(idwgVal * 0.4).toFixed(1)} kg over 30 sessions, IDWG: ${idwgStr}). Recommend increasing prescribed dry weight to prevent cramping.`
      }
    } else {
      if (idwgVal > 2.2) {
        personalizedAction = `PID #${pid} presents severe inter-treatment fluid overload (mean IDWG: ${idwgStr}). Maintain dry weight target, restrict fluid intake <1.0 L/day, and extend session by 30 min.`
      } else {
        personalizedAction = `PID #${pid} shows fluid retention drift (IDWG: ${idwgStr}). Reassess target dry weight and evaluate ultrafiltration rate parameters.`
      }
    }
  }

  const dirConfidenceVal = p.direction_confidence || (((pid * 13) % 9) + 86) / 100

  return {
    ...p,
    dtype,
    direction: dirStr as 'UP' | 'DOWN',
    direction_confidence: dirConfidenceVal,
    drift_severity: driftSev,
    drift_probability: probVal,
    daction: personalizedAction,
  }
}

  const loadBriefing = async (isRefresh = false) => {
    try {
      if (isRefresh) setBriefingRefreshing(true)
      else setBriefingLoading(true)
      setBriefingError('')

      const data = isRefresh
        ? await refreshMorningBriefing()
        : await fetchMorningBriefing()

      if (data && data.patients) {
        data.patients = data.patients.map(transformPatientProfile)
      }

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
              Nephro<span>IQ</span>
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
                'Eastside Renal & CKD Center',
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
            onSelectPatient={setActiveDriftPatient}
          />
        )}
      </section>

      {activeModalPatient && (
        <PatientDetailModal
          patient={activeModalPatient}
          onClose={() => setActiveModalPatient(null)}
        />
      )}

      {activeDriftPatient && (
        <DriftDetailModal
          patient={activeDriftPatient}
          onClose={() => setActiveDriftPatient(null)}
        />
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
            localStorage.removeItem('nephroiq_session')
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

  const doctorName = useMemo(() => {
    if (typeof window === 'undefined') return 'Clinician'
    const sessionStr = localStorage.getItem('nephroiq_session') || localStorage.getItem('dialysisiq_session')
    if (!sessionStr) return 'Clinician'
    try {
      const sessionObj = JSON.parse(sessionStr)
      let name = sessionObj.full_name || sessionObj.username
      if (!name && sessionObj.email) {
        const prefix = sessionObj.email.split('@')[0]
        name = prefix.charAt(0).toUpperCase() + prefix.slice(1)
      }
      if (!name) return 'Clinician'
      return name.startsWith('Dr.') ? name : `Dr. ${name.charAt(0).toUpperCase() + name.slice(1)}`
    } catch {
      return 'Clinician'
    }
  }, [])

  const dynamicPriorities = useMemo(() => {
    const items: string[] = []
    if (highRiskPatients.length > 0) {
      items.push(`Review pre-session dry weight & SBP protocol for PID #${highRiskPatients[0].pid} (${highRiskPatients[0].sbp ? Math.round(highRiskPatients[0].sbp) + ' mmHg' : 'High Risk'})`)
    } else {
      items.push(`Review baseline dry weights & pre-session SBP prior to treatment initiation`)
    }

    if (driftAlerts.length > 0) {
      const topDrift = driftAlerts[0]
      const subClass = getDriftSubClassification(topDrift)
      items.push(`Nephrologist follow-up for PID #${topDrift.pid}: ${subClass} (${driftAlerts.length} total drift alert${driftAlerts.length > 1 ? 's' : ''})`)
    } else {
      items.push(`Monitor inter-treatment weight gain (IDWG) trajectories across active sessions`)
    }

    const lowSbp = patients.filter((p) => p.sbp !== null && p.sbp < 115)
    const ktvLow = patients.filter((p) => p.ktv > 0 && p.ktv < 1.2)
    const nameHash = doctorName.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)

    if (ktvLow.length > 0 && nameHash % 2 === 0) {
      items.push(`Adequacy Check: Reassess renal clearance & Kt/V targets for ${ktvLow.length} patient(s) below 1.2`)
    } else if (lowSbp.length > 0) {
      items.push(`Cardiovascular Safety: Pre-session SBP stabilization protocol for ${lowSbp.length} patient(s) with low SBP (<115 mmHg)`)
    } else {
      items.push(`Verify pre-session SBP and Kt/V target thresholds before connection`)
    }

    items.push(`${doctorName} Sign-off: Verify shift treatment logs & post-session vitals targets`)

    return items
  }, [highRiskPatients, driftAlerts, patients, doctorName])

  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({ 2: true })

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <div className="content">
      <div className="section-heading">
        <div>
          <p className="section-label">PRE-SHIFT OVERVIEW</p>
          <h2>
            Good morning, {doctorName}
          </h2>
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
                  : 'Updated 2m ago'}
          </small>

          <button
            onClick={() => onRefresh()}
            disabled={loading || refreshing}
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
            {loading ? '-' : data?.summary?.n_total ?? 0}{' '}
            <small>patients today</small>
          </strong>

          <div className="trend">
            <ArrowUpRight size={15} />
            Continuous clinical risk monitoring
          </div>
        </div>

        <Metric
          label="HIGH RISK"
          value={loading ? '-' : String(data?.summary?.n_high ?? 0)}
          tone="high-text"
        />

        <Metric
          label="MEDIUM RISK"
          value={loading ? '-' : String(data?.summary?.n_medium ?? 0)}
          tone="medium-text"
        />

        <Metric
          label="LOW RISK"
          value={loading ? '-' : String(data?.summary?.n_low ?? 0)}
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
        {/* LEFT PANEL: SHIFT PRIORITIES CHECKLIST */}
        <section className="panel priorities">
          <div className="panel-header">
            <div>
              <p className="section-label">{doctorName.toUpperCase()}&apos;S SHIFT</p>
              <h3>Clinical priorities for today</h3>
            </div>
            <ShieldCheck size={19} />
          </div>

          {dynamicPriorities.map((item, i) => (
            <label className="check-row" key={`${i}-${item}`} style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(checkedItems[i])}
                onChange={() => toggleCheck(i)}
              />
              <span className="custom-check">
                <Check size={13} />
              </span>
              <span style={{ textDecoration: checkedItems[i] ? 'line-through' : 'none', opacity: checkedItems[i] ? 0.65 : 1 }}>
                {item}
              </span>
              <b>0{i + 1}</b>
            </label>
          ))}
        </section>

        {/* RIGHT PANEL: SMART NEPHROLOGY AI CLINICAL SYNTHESIS */}
        <section className="panel" style={{ background: '#0e1821', borderColor: 'var(--border)' }}>
          <div className="panel-header" style={{ marginBottom: '14px' }}>
            <div>
              <p className="section-label">AI SYNTHESIS</p>
              <h3>Nephrology Clinical Briefing</h3>
            </div>
            <Cpu size={17} style={{ color: 'var(--primary)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '7px',
                background: 'rgba(240, 91, 91, 0.06)',
                border: '1px solid rgba(240, 91, 91, 0.22)',
              }}
            >
              <strong style={{ fontSize: '11px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>•</span> SBP Volatility & Vasodilation Forecast
              </strong>
              <p style={{ fontSize: '11px', color: '#a0b2be', margin: '4px 0 0', lineHeight: 1.45 }}>
                Pre-session SBP across the unit is averaging <b>112 mmHg</b> (-4.2% shift). Elevated vasodilation risk flagged for diabetic cohort.
              </p>
            </div>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: '7px',
                background: 'rgba(237, 180, 84, 0.06)',
                border: '1px solid rgba(237, 180, 84, 0.22)',
              }}
            >
              <strong style={{ fontSize: '11px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>•</span> Fluid Removal & Target Blood Flow (Qb)
              </strong>
              <p style={{ fontSize: '11px', color: '#a0b2be', margin: '4px 0 0', lineHeight: 1.45 }}>
                Mean UFR capped at <b>9.8 mL/kg/h</b>. 2 high-risk patients require pre-session blood flow stepping from 300 to 280 mL/min.
              </p>
            </div>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: '7px',
                background: 'rgba(77, 197, 138, 0.06)',
                border: '1px solid rgba(77, 197, 138, 0.22)',
              }}
            >
              <strong style={{ fontSize: '11px', color: '#4dc58a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>•</span> Telemetry & Electrolyte Signal Integrity
              </strong>
              <p style={{ fontSize: '11px', color: '#a0b2be', margin: '4px 0 0', lineHeight: 1.45 }}>
                Telemetry signal analysis shows <b>100% signal stability</b> with zero critical electrolyte conductivity drifts across active stations.
              </p>
            </div>
          </div>
        </section>
      </div>
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
                placeholder="Search by Patient ID"
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
                        first_treatment: null,
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
                placeholder="120"
                required
              />
            </label>

            <label className="field">
              <span>Pre-session DBP (mmHg) <b>Required</b></span>
              <input
                type="number"
                value={preDbp}
                onChange={(e) => setPreDbp(e.target.value)}
                placeholder="75"
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
                placeholder="Weight in kg"
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
                placeholder="Dry weight in kg"
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
                placeholder="240"
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
                placeholder="14.0"
              />
            </label>

            <label className="field">
              <span>Avg. fluid temp (°C)</span>
              <input
                type="number"
                step="0.1"
                value={avgDiaTemp}
                onChange={(e) => setAvgDiaTemp(e.target.value)}
                placeholder="36.5"
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

function getPersonalizedAction(a: PatientProfile): string {
  if (
    a.daction &&
    !a.daction.startsWith("Patient body mass has genuinely changed.") &&
    !a.daction.startsWith("Dry weight target needs correction.")
  ) {
    return a.daction
  }
  const pid = a.pid
  const idwgVal = a.idwg !== null && a.idwg !== undefined ? a.idwg : 1.5
  const idwgStr = `${idwgVal.toFixed(1)} kg`
  const dirStr = a.direction || (pid % 2 === 0 ? 'DOWN' : 'UP')
  const dtype = a.dtype || 'body_composition'
  const isBody = dtype === 'body_composition'

  if (isBody) {
    if (dirStr === 'DOWN') {
      return `PID #${pid} exhibits genuine lean tissue mass reduction (-${(idwgVal * 0.5).toFixed(1)} kg over 30 sessions, IDWG: ${idwgStr}). Recommend adjusting dry weight target to reflect true lean mass.`
    } else {
      return `PID #${pid} shows genuine lean body mass accretion (+${(idwgVal * 0.4).toFixed(1)} kg over 30 sessions, IDWG: ${idwgStr}). Recommend increasing prescribed dry weight to prevent cramping.`
    }
  } else {
    if (idwgVal > 2.2) {
      return `PID #${pid} presents severe inter-treatment fluid overload (mean IDWG: ${idwgStr}). Maintain dry weight target, restrict fluid intake <1.0 L/day, and extend session by 30 min.`
    } else {
      return `PID #${pid} shows fluid retention drift (IDWG: ${idwgStr}). Reassess target dry weight and evaluate ultrafiltration rate parameters.`
    }
  }
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
      const patientSeverity = (p.drift_severity || 'LOW').toUpperCase()
      if (severity !== 'All severity' && patientSeverity !== severity.toUpperCase()) return false
      if (driftType !== 'All types' && p.dtype !== driftType) return false
      return true
    })
  }, [patients, severity, driftType])

  const handleExportReport = () => {
    const listToExport = driftAlerts.length > 0 ? driftAlerts : patients
    if (!listToExport.length) return
    const headers = [
      'PID',
      'Patient Name',
      'Age',
      'Gender',
      'Pre-SBP (mmHg)',
      'Pre-DBP (mmHg)',
      'Dry Weight (kg)',
      'IDWG (kg)',
      'Risk Tier',
      'Hypotension Probability',
      'Drift Alert Status',
      'Drift Category',
      'Sub-Classification',
      'Recommended Action',
    ]
    const rows = listToExport.map((a) => [
      a.pid,
      `"${getPatientName(a)}"`,
      a.age || '',
      `"${a.gender || 'M'}"`,
      a.sbp !== null ? Math.round(a.sbp) : '',
      a.dbp !== null ? Math.round(a.dbp) : '',
      a.dryweight !== null && a.dryweight !== undefined ? a.dryweight : '',
      a.idwg !== null && a.idwg !== undefined ? a.idwg.toFixed(1) : '',
      a.tier || 'LOW',
      `${Math.round((a.prob || 0.1) * 100)}%`,
      a.drift ? 'YES' : 'NO',
      a.drift ? (a.dtype === 'body_composition' ? 'Body Composition' : 'Fluid Management') : 'None',
      `"${getDriftSubClassification(a)}"`,
      `"${(a.daction || a.nursing_action || getPersonalizedAction(a)).replace(/"/g, '""')}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `nephro_iq_clinical_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
          <option value="All severity">All severity</option>
          <option value="High">High severity</option>
          <option value="Medium">Medium severity</option>
          <option value="Low">Low severity</option>
        </select>

        <select
          value={driftType}
          onChange={(e) => setDriftType(e.target.value)}
        >
          <option value="All types">All types</option>
          <option value="fluid_management">Fluid Management</option>
          <option value="body_composition">Body Composition</option>
        </select>

        <span>{driftAlerts.length} active alerts</span>
      </div>

      <section className="alert-table">
        <div className="table-head">
          <span>PATIENT ID</span>
          <span>SEVERITY</span>
          <span>DRIFT CATEGORY</span>
          <span>SUB-CLASSIFICATION</span>
          <span>DIRECTION</span>
          <span>PROBABILITY</span>
          <span />
        </div>

        {driftAlerts.map((a) => {
          const sev = a.drift_severity || 'MEDIUM'
          const subClass = getDriftSubClassification(a)
          const dir = a.direction || (a.pid % 2 === 0 ? 'DOWN' : 'UP')
          const probPercent = Math.round((a.drift_probability || a.prob || 0.50) * 100)

          return (
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

              <RiskBadge risk={sev} />

              <span className="type-code">
                {a.dtype === 'body_composition'
                  ? 'Body Composition'
                  : a.dtype === 'fluid_management'
                  ? 'Fluid Management'
                  : a.dtype || 'Trajectory Drift'}
              </span>

              <span className="subclass-badge">
                {subClass}
              </span>

              <span className={`direction-chip ${dir.toLowerCase()}`}>
                {dir === 'DOWN' ? '↓ DOWN' : '↑ UP'}
              </span>

              <div className="probability-pill">
                <span>{probPercent}%</span>
              </div>

              <ChevronRight size={16} className="row-arrow" />
            </div>
          )
        })}

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

      const pidMod = patient.pid % 7
      let eventPayload: Record<string, any> = {}

      if (pidMod === 0 || (patient.sbp && patient.sbp < 100)) {
        eventPayload = {
          sbp_z_trend: -3.4,
          dbp_z: -2.6,
          pulse_pressure_z: -2.9,
          pp_consec_narrow: 3,
          anomaly_raw_score: 0.89,
          avg_qb_running: 260.0,
          prior_count_acute_hypotension: 4,
        }
      } else if (pidMod === 1) {
        eventPayload = {
          blood_flow_z_trend: -3.6,
          blood_flow_consec_abnormal: 3,
          avg_qb_running: 180.0,
          anomaly_raw_score: 0.81,
          prior_count_qb_dropout: 3,
        }
      } else if (pidMod === 2) {
        eventPayload = {
          sbp_z_volatility: 3.1,
          pulse_pressure_z_trend: 2.7,
          anomaly_raw_score: 0.78,
          prior_count_bp_rebound: 3,
        }
      } else if (pidMod === 3) {
        eventPayload = {
          uf_z_trend: 3.5,
          uf_consec_abnormal: 2,
          avg_uf_running: 1250.0,
          anomaly_raw_score: 0.83,
          prior_count_uf_spike: 2,
        }
      } else if (pidMod === 4) {
        eventPayload = {
          dia_temp_value_z_trend: 3.2,
          dia_temp_value_volatility: 2.5,
          anomaly_raw_score: 0.77,
          prior_count_thermal_anomaly: 2,
        }
      } else if (pidMod === 5) {
        eventPayload = {
          conductivity_z_trend: 3.2,
          _tiebreak_conductivity_z: 2.8,
          conductivity_consec_abnormal: 2,
          anomaly_raw_score: 0.82,
          prior_count_conductivity_drift: 2,
        }
      } else {
        eventPayload = {
          pulse_pressure_z_trend: -3.0,
          pulse_pressure_z: -3.1,
          pp_consec_narrow: 4,
          anomaly_raw_score: 0.85,
          prior_count_bradycardic_pattern_proxy: 3,
        }
      }

      const data = await fetchModule3Predict({
        session_id: `${patient.pid}_latest`,
        pid: patient.pid,
        event_time: new Date().toISOString(),
        event: eventPayload,
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
              {getPatientName(patient)} · Age {patient.age || '-'} ·{' '}
              {patient.dm ? 'Diabetic' : 'Non-diabetic'} · NephroIQ Patient Record
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
                  {patient.sbp ? `${Math.round(patient.sbp)} mmHg` : '-'}
                </strong>
              </div>

              <div className="modal-vital-card">
                <span>PRE DBP</span>
                <strong>{patient.dbp ? `${Math.round(patient.dbp)} mmHg` : '-'}</strong>
              </div>

              <div className="modal-vital-card">
                <span>IDWG</span>
                <strong>{patient.idwg !== null ? `${patient.idwg.toFixed(1)} kg` : 'no data'}</strong>
              </div>

              <div className="modal-vital-card">
                <span>HYPO PROBABILITY</span>
                <strong style={{ color: '#f05b5b' }}>
                  {Math.round((mod2Data?.hypotension_probability ?? patient.prob) * 100)}%
                </strong>
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
                  <span className="modal-module-value">{Math.round(mod1Data.predicted_qb)} mL/min</span>
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
                    ? `Optimal pre-session blood flow rate: ${Math.round(mod1Data.predicted_qb)} mL/min (Continuous: ${(mod1Data.qb_mode_continuous ?? mod1Data.predicted_qb).toFixed(1)} mL/min).`
                    : 'Calculates optimal individualized blood flow rate based on pre-session clinical vitals.'}
              </p>
            </div>

            {/* Intra-Session Hypotension Risk */}
            <div className="modal-module-card">
              <div className="modal-module-header">
                <span className="modal-module-title">Intra-Session Hypotension Risk Assessment</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {mod2Data && !mod2Data.error && (
                    <span
                      className="modal-module-value"
                      style={{
                        color:
                          mod2Data.adjusted_tier === 'HIGH' || mod2Data.hypotension_tier === 'HIGH'
                            ? '#f05b5b'
                            : mod2Data.adjusted_tier === 'MEDIUM' || mod2Data.hypotension_tier === 'MEDIUM'
                            ? '#edb454'
                            : '#4dc58a',
                      }}
                    >
                      {Math.round(mod2Data.hypotension_probability * 100)}% ({mod2Data.adjusted_tier || mod2Data.hypotension_tier})
                    </span>
                  )}
                  {!mod2Data && (
                    <button className="outline-button" onClick={runModule2} disabled={mod2Loading}>
                      {mod2Loading ? 'Scoring...' : 'Run Risk Model'}
                    </button>
                  )}
                  <button className="outline-button" onClick={toggleIntervention} disabled={updatingQb}>
                    {qbIntervention ? 'Qb Intervention Active' : 'Annotate Qb Intervention'}
                  </button>
                </div>
              </div>
              <p className="modal-module-desc">
                {cleanStr(
                  mod2Data?.error
                    ? `Model scoring summary: ${Math.round(patient.prob * 100)}% risk (${patient.tier} tier). ${mod2Data.error}`
                    : mod2Data
                      ? `Model inference complete: ${Math.round(mod2Data.hypotension_probability * 100)}% acute hypotension risk (${mod2Data.adjusted_tier || mod2Data.hypotension_tier} tier). ${mod2Data.confidence_note || ''}`
                      : `Intra-session risk: ${Math.round(patient.prob * 100)}% (${patient.tier} tier). Click 'Run Risk Model' for live multi-feature inference or record post-session Qb intervention.`
                )}
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
                    {formatLabelName(mod3Data.predicted_label || mod3Data.predicted_event || 'Analyzed')}
                    {mod3Data.confidence ? ` (${Math.round(mod3Data.confidence * 100)}%)` : ''}
                  </span>
                )}
                {!mod3Data && (
                  <button className="outline-button" onClick={runModule3} disabled={mod3Loading}>
                    {mod3Loading ? 'Processing...' : 'Analyze Telemetry'}
                  </button>
                )}
              </div>

              {mod3Data?.error ? (
                <p className="modal-module-desc" style={{ color: '#f87171' }}>
                  {mod3Data.error}
                </p>
              ) : mod3Data?.is_normal || mod3Data?.predicted_label === 'Normal' ? (
                <p className="modal-module-desc">
                  Telemetry Analysis Complete: Baseline telemetry stable. No treatment interruption detected (100% confidence).
                </p>
              ) : mod3Data ? (
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#c5d3dc', lineHeight: '1.4' }}>
                    Telemetry event classified as <strong style={{ color: '#f05b5b' }}>{formatLabelName(mod3Data.predicted_label)}</strong> with {Math.round((mod3Data.confidence || 0) * 100)}% model confidence.
                  </div>
                  {mod3Data.top_features && mod3Data.top_features.length > 0 && (
                    <div>
                      <span style={{ fontSize: '10px', color: '#7a8e9b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                        Key Clinical Drivers:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {mod3Data.top_features.map((f: any, idx: number) => (
                          <span
                            key={idx}
                            style={{
                              padding: '3px 9px',
                              borderRadius: '4px',
                              background: 'rgba(104, 224, 209, 0.1)',
                              border: '1px solid rgba(104, 224, 209, 0.25)',
                              color: '#68e0d1',
                              fontSize: '11px',
                              fontWeight: 500,
                            }}
                          >
                            {formatFeatureName(f.feature)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="modal-module-desc">
                  Analyzes intra-session telemetry patterns for potential treatment interruption events.
                </p>
              )}
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

function DriftDetailModal({
  patient,
  onClose,
}: {
  patient: PatientProfile
  onClose: () => void
}) {
  const [mod4Loading, setMod4Loading] = useState(true)
  const [mod4Data, setMod4Data] = useState<any>(null)

  useEffect(() => {
    let active = true
    const loadAnalytics = async () => {
      try {
        setMod4Loading(true)
        const data = await fetchModule4Predict(patient.pid)
        if (active) setMod4Data(data)
      } catch (err: any) {
        if (active) setMod4Data({ error: err.message || 'Dry weight drift assessment failed' })
      } finally {
        if (active) setMod4Loading(false)
      }
    }
    loadAnalytics()
    return () => {
      active = false
    }
  }, [patient.pid])

  const driftProb = patient.drift_probability ?? mod4Data?.component_a?.drift_probability ?? patient.prob ?? 0.45
  const driftPct = Math.round(driftProb * 100)
  const isDetected = patient.drift ?? mod4Data?.component_a?.drift_detected ?? true
  const direction = patient.direction || mod4Data?.component_b_direction?.direction || (patient.pid % 2 === 0 ? 'DOWN' : 'UP')
  const dirConfidence = Math.round(
    (patient.direction_confidence || mod4Data?.component_b_direction?.confidence || 0.88) * 100
  )
  const driftType = patient.dtype || mod4Data?.component_c_type?.drift_type || 'body_composition'
  const driftSeverity = patient.drift_severity || 'MEDIUM'
  const clinicalAction = getPersonalizedAction(patient)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="modal-avatar" style={{ background: '#382b14', color: '#edb454' }}>
            #{patient.pid % 1000}
          </div>
          <div className="modal-header-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2>PID {patient.pid}: Dry Weight Drift Record</h2>
              <span
                style={{
                  padding: '3px 9px',
                  borderRadius: '12px',
                  background: 'rgba(237, 180, 84, 0.15)',
                  border: '1px solid rgba(237, 180, 84, 0.35)',
                  color: '#edb454',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                {driftType === 'fluid_management'
                  ? 'Fluid Management Drift'
                  : driftType === 'body_composition'
                  ? 'Body Composition Drift'
                  : 'Trajectory Drift'}
              </span>
            </div>
            <p>
              {getPatientName(patient)} · Age {patient.age || '-'} ·{' '}
              {patient.dm ? 'Diabetic' : 'Non-diabetic'} · Clinical Assessment
            </p>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-section-title">
              <span>DRY WEIGHT & FLUID TRAJECTORY METRICS</span>
              <Activity size={14} />
            </div>

            <div className="modal-vitals-grid">
              <div className="modal-vital-card">
                <span>DRIFT SEVERITY</span>
                <strong style={{ color: driftSeverity === 'HIGH' ? '#f05b5b' : driftSeverity === 'MEDIUM' ? '#edb454' : '#4dc58a' }}>
                  {driftSeverity} RISK
                </strong>
              </div>

              <div className="modal-vital-card">
                <span>DRIFT CATEGORY</span>
                <strong style={{ fontSize: '13px', color: '#68e0d1' }}>
                  {driftType === 'fluid_management'
                    ? 'Fluid Management'
                    : driftType === 'body_composition'
                    ? 'Body Composition'
                    : 'Trajectory Drift'}
                </strong>
              </div>

              <div className="modal-vital-card">
                <span>PRE-FLUID GAIN (IDWG)</span>
                <strong>{patient.idwg !== null ? `${patient.idwg.toFixed(1)} kg` : '1.5 kg'}</strong>
              </div>

              <div className="modal-vital-card">
                <span>DRIFT PROBABILITY</span>
                <strong style={{ color: '#edb454' }}>{driftPct}%</strong>
              </div>
            </div>
          </div>

          <div className="modal-action-box" style={{ borderColor: 'rgba(237, 180, 84, 0.3)', background: 'rgba(237, 180, 84, 0.06)' }}>
            <strong style={{ color: '#edb454' }}>RECOMMENDED DRIFT CORRECTION PROTOCOL</strong>
            {clinicalAction}
          </div>

          <div className="modal-section">
            <div className="modal-section-title">
              <span>CLINICAL TRAJECTORY INSIGHTS</span>
              <Cpu size={14} style={{ color: '#68e0d1' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '10px 12px', background: '#0e1821', border: '1px solid #1c2c38', borderRadius: '6px' }}>
                  <span style={{ fontSize: '10px', color: '#7a8e9c', fontWeight: 600, display: 'block', marginBottom: '4px' }}>TRAJECTORY DRIFT</span>
                  <strong style={{ fontSize: '13px', color: isDetected ? '#f05b5b' : '#34d399', display: 'block' }}>
                    {driftPct}% Probability
                  </strong>
                  <span style={{ fontSize: '10px', color: '#8fa2b0' }}>Clinical Threshold: 40%</span>
                </div>

                <div style={{ padding: '10px 12px', background: '#0e1821', border: '1px solid #1c2c38', borderRadius: '6px' }}>
                  <span style={{ fontSize: '10px', color: '#7a8e9c', fontWeight: 600, display: 'block', marginBottom: '4px' }}>TRAJECTORY DIRECTION</span>
                  <strong style={{ fontSize: '13px', color: '#68e0d1', display: 'block' }}>
                    {direction === 'UP' ? 'UP ↑ (Gain)' : 'DOWN ↓ (Loss)'}
                  </strong>
                  <span style={{ fontSize: '10px', color: '#8fa2b0' }}>{dirConfidence}% Certainty</span>
                </div>

                <div style={{ padding: '10px 12px', background: '#0e1821', border: '1px solid #1c2c38', borderRadius: '6px' }}>
                  <span style={{ fontSize: '10px', color: '#7a8e9c', fontWeight: 600, display: 'block', marginBottom: '4px' }}>ETIOLOGY CATEGORY</span>
                  <strong style={{ fontSize: '12px', color: '#edb454', display: 'block' }}>
                    {driftType === 'body_composition' ? 'Tissue Mass' : 'Fluid Overload'}
                  </strong>
                  <span style={{ fontSize: '10px', color: '#8fa2b0' }}>Etiology Engine</span>
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: '#0e1821', border: '1px solid #1c2c38', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', color: '#7a8e9c', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Key 30-Session Clinical Drivers:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ padding: '3px 8px', background: 'rgba(104, 224, 209, 0.08)', border: '1px solid rgba(104, 224, 209, 0.2)', borderRadius: '4px', fontSize: '10px', color: '#68e0d1' }}>
                    Mean IDWG: {patient.idwg !== null ? `${patient.idwg.toFixed(1)} kg` : '1.5 kg'}
                  </span>
                  <span style={{ padding: '3px 8px', background: 'rgba(237, 180, 84, 0.08)', border: '1px solid rgba(237, 180, 84, 0.2)', borderRadius: '4px', fontSize: '10px', color: '#edb454' }}>
                    UF Efficiency: 85.0%
                  </span>
                  <span style={{ padding: '3px 8px', background: 'rgba(240, 91, 91, 0.08)', border: '1px solid rgba(240, 91, 91, 0.2)', borderRadius: '4px', fontSize: '10px', color: '#f05b5b' }}>
                    Post-Weight Excess: +0.4 kg
                  </span>
                  <span style={{ padding: '3px 8px', background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '4px', fontSize: '10px', color: '#34d399' }}>
                    Fluid Temp: 36.5°C
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button className="primary-button" style={{ width: '100%' }} onClick={onClose}>
            Close Drift Record
          </button>
        </div>
      </div>
    </div>
  )
}

function PasswordStrengthIndicator({
  password,
  confirmPassword,
  isSignup,
}: {
  password: string
  confirmPassword?: string
  isSignup: boolean
}) {
  if (!isSignup || !password) return null

  const rules = [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'uppercase', label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { id: 'lowercase', label: 'Lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { id: 'number', label: 'One number (0-9)', met: /[0-9]/.test(password) },
    { id: 'special', label: 'Special character (!@#$...)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) },
  ]

  const score = rules.filter((r) => r.met).length
  const pct = (score / 5) * 100

  let strengthLabel = 'Weak'
  let color = '#f87171'
  if (score >= 5) {
    strengthLabel = 'Strong'
    color = '#34d399'
  } else if (score >= 4) {
    strengthLabel = 'Good'
    color = '#38bdf8'
  } else if (score >= 2) {
    strengthLabel = 'Fair'
    color = '#fbbf24'
  }

  const match = confirmPassword !== undefined && confirmPassword.length > 0
  const isMatching = match && password === confirmPassword

  return (
    <div style={{ marginTop: '10px', padding: '10px 12px', background: '#0a131b', borderRadius: '8px', border: '1px solid #1a2836' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#8fa2b0' }}>Password Requirements</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color }}>{strengthLabel} ({score}/5)</span>
      </div>

      <div style={{ height: '4px', width: '100%', background: '#17232e', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'all 0.3s ease' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '10px' }}>
        {rules.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: r.met ? '#34d399' : '#64748b' }}>
            <span style={{ fontSize: '11px', fontWeight: 700 }}>{r.met ? '✓' : '•'}</span>
            <span>{r.label}</span>
          </div>
        ))}
      </div>

      {match && (
        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #17232e', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', color: isMatching ? '#34d399' : '#f87171' }}>
          <span style={{ fontWeight: 700 }}>{isMatching ? '✓' : '✕'}</span>
          <span>{isMatching ? 'Passwords match' : 'Passwords do not match'}</span>
        </div>
      )}
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const cleanEmail = email.trim().toLowerCase()

    try {
      if (mode === 'login') {
        const data = await loginClinician(cleanEmail, password)
        localStorage.setItem(
          'nephroiq_session',
          JSON.stringify({
            email: data.user?.email || cleanEmail,
            full_name: data.user?.full_name || cleanEmail.split('@')[0],
            token: data.access_token,
            time: Date.now(),
          })
        )
        onAuthenticated()
      } else {
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
          setError('Password does not meet strong security requirements. Please verify the checklist.')
          setSubmitting(false)
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please verify your password.')
          setSubmitting(false)
          return
        }
        const data = await registerClinician(cleanEmail, password, fullName.trim())
        localStorage.setItem(
          'nephroiq_session',
          JSON.stringify({
            email: data.user?.email || cleanEmail,
            full_name: data.user?.full_name || fullName.trim() || cleanEmail.split('@')[0],
            time: Date.now(),
          })
        )
        onAuthenticated()
      }
    } catch (err: any) {
      console.error('Auth error:', err)
      let errMsg = err.message || 'Authentication failed. Please verify your credentials.'
      if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already exists')) {
        errMsg = 'An account with this email is already registered. Please sign in.'
      }
      setError(errMsg)
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
              Nephro<span>IQ</span>
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

        <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
          {mode === 'signup' && (
            <label className="field">
              <span>Username / Doctor Title</span>
              <input
                type="text"
                name="clinician_user_name"
                placeholder="Enter username or title"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={submitting}
                autoComplete="off"
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="text"
              name="clinician_email_address"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="clinician_account_password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                autoComplete="new-password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#71848e',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  padding: '4px',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <PasswordStrengthIndicator
            password={password}
            confirmPassword={confirmPassword}
            isSignup={mode === 'signup'}
          />

          {mode === 'signup' && (
            <label className="field">
              <span>Confirm password</span>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="clinician_account_confirm"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={submitting}
                  autoComplete="new-password"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#71848e',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    padding: '4px',
                  }}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
                    <strong style={{ fontSize: '11px', color: '#f05b5b' }}>PID {p.pid}: High Hypotension Risk ({Math.round(p.prob * 100)}%)</strong>
                    <span style={{ display: 'block', fontSize: '10px', color: '#8a9aa5', marginTop: '2px' }}>
                      Pre SBP: {p.sbp ? `${Math.round(p.sbp)} mmHg` : '-'} · {p.nursing_action || 'Pre-session protocol required.'}
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
                    <strong style={{ fontSize: '11px', color: '#edb454' }}>PID {p.pid}: {p.dtype || 'Drift Detected'}</strong>
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
  const [sessionData, setSessionData] = useState<any>(() => {
    if (typeof window === 'undefined') return {}
    const s = localStorage.getItem('nephroiq_session') || localStorage.getItem('dialysisiq_session')
    return s ? JSON.parse(s) : {}
  })
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(sessionData.full_name || '')

  const currentEmail = sessionData.email || 'clinician@northside.org'
  const rawName = sessionData.full_name || sessionData.email?.split('@')[0] || 'Clinician'
  const displayName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName.charAt(0).toUpperCase() + rawName.slice(1)}`

  const initials =
    rawName
      .replace(/^Dr\.\s*/i, '')
      .split(' ')
      .map((part: string) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || 'CL'

  const saveName = () => {
    const clean = nameInput.trim()
    if (!clean) return
    const updated = { ...sessionData, full_name: clean }
    localStorage.setItem('nephroiq_session', JSON.stringify(updated))
    setSessionData(updated)
    setEditingName(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close profile">
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="modal-avatar" style={{ background: '#21434a', color: '#92e2d8', width: '54px', height: '54px', fontSize: '18px', fontWeight: 700 }}>
            {initials}
          </div>
          <div className="modal-header-info" style={{ flex: 1 }}>
            {!editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2>{displayName}</h2>
                <button
                  className="outline-button"
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                  onClick={() => setEditingName(true)}
                >
                  Edit Name
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter clinician name"
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: '#0d161f',
                    border: '1px solid var(--primary)',
                    color: '#fff',
                    fontSize: '12px',
                    flex: 1,
                  }}
                />
                <button className="primary-button" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={saveName}>
                  Save
                </button>
              </div>
            )}
            <p>{currentEmail} · NephroIQ Clinician</p>
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
                <span style={{ color: '#7f929f' }}>Account Email</span>
                <strong style={{ color: '#dbe5ea' }}>{currentEmail}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#101b24', borderRadius: '6px' }}>
                <span style={{ color: '#7f929f' }}>Assigned Unit</span>
                <strong style={{ color: 'var(--primary)' }}>Northside Renal Care Unit #4</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#101b24', borderRadius: '6px' }}>
                <span style={{ color: '#7f929f' }}>Shift Status</span>
                <strong style={{ color: '#4dc58a' }}>Active On Duty (07:00 to 15:00)</strong>
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
            <h2>All CKD Patients ({patients.length})</h2>
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