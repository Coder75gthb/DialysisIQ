const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://dialysisiq-backend-1.onrender.com'

export interface PatientProfile {
  pid: number
  prob: number
  tier: 'HIGH' | 'MEDIUM' | 'LOW'
  sbp: number | null
  dbp: number | null
  sbp_suspect: boolean
  dbp_suspect: boolean
  dm: number
  age: number
  roll3: number
  ktv: number
  idwg: number | null
  avg_uf: number
  drift: boolean
  dtype: string | null
  daction: string | null
  dreason: string | null
  drift_probability: number | null
  drift_intervention: any
  hypo_hist: number
  early_term: number
  nursing_action: string | null
  gender?: string
  birthday?: number
  name?: string
}

export interface BriefingSummary {
  n_total: number
  n_high: number
  n_medium: number
  n_low: number
  n_drift: number
  n_hypotension_repeat: number
}

export interface MorningBriefingResponse {
  available: boolean
  date: string
  summary: BriefingSummary
  briefing: string
  patients: PatientProfile[]
}

export interface BackendPatient {
  pid: number
  gender: string | null
  birthday: number | null
  first_dialysis: string | null
  has_dm: boolean
  name: string | null
}

export interface SessionCreatePayload {
  pid: number
  pre_sbp: number
  pre_dbp: number
  weightstart: number
  dryweight: number
  weight_post?: number
  duration_min?: number
  avg_uf?: number
  max_uf?: number
  avg_conductivity?: number
  avg_dia_temp?: number
}

export interface Module1Response {
  session_id: string
  pid: number
  predicted_qb: number
  qb_mode_continuous: number
  qb_mode_snapped: number
  features_used: number
}

export interface Module2Response {
  session_id: string
  pid: number
  hypotension_probability: number
  hypotension_tier: string
  qb_intervention: boolean | null
}

export interface Module4Response {
  pid: number
  drift_detected: boolean
  drift_probability: number
  drift_type?: string
  intervention?: any
  reason?: string
}

export async function fetchMorningBriefing(): Promise<MorningBriefingResponse> {
  const res = await fetch(`${API_BASE}/module5/predict`, {
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch briefing: ${res.statusText}`)
  }
  return res.json()
}

export async function refreshMorningBriefing(): Promise<MorningBriefingResponse> {
  const res = await fetch(`${API_BASE}/module5/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to refresh briefing: ${res.statusText}`)
  }
  const data = await res.json()
  return data.data
}

export async function fetchPatients(query?: string): Promise<BackendPatient[]> {
  const url = query
    ? `${API_BASE}/patients?query=${encodeURIComponent(query)}`
    : `${API_BASE}/patients`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to fetch patients: ${res.statusText}`)
  }
  const data = await res.json()
  return data.patients || []
}

export async function createSession(payload: SessionCreatePayload) {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to create session: ${res.statusText}`)
  }
  return res.json()
}

export async function fetchModule1Predict(sessionId: string): Promise<Module1Response> {
  const res = await fetch(`${API_BASE}/module1/predict/${sessionId}`)
  if (!res.ok) {
    throw new Error(`Module 1 inference failed: ${res.statusText}`)
  }
  return res.json()
}

export async function fetchModule2Predict(sessionId: string): Promise<Module2Response> {
  const res = await fetch(`${API_BASE}/module2/predict/${sessionId}`)
  if (!res.ok) {
    throw new Error(`Module 2 inference failed: ${res.statusText}`)
  }
  return res.json()
}

export async function updateQbIntervention(sessionId: string, qb_intervention: boolean) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/qb-intervention`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qb_intervention }),
  })
  if (!res.ok) {
    throw new Error(`Failed to update Qb intervention: ${res.statusText}`)
  }
  return res.json()
}

export async function fetchModule4Predict(pid: number): Promise<Module4Response> {
  const res = await fetch(`${API_BASE}/module4/predict/${pid}`)
  if (!res.ok) {
    throw new Error(`Module 4 inference failed: ${res.statusText}`)
  }
  return res.json()
}

export interface Module3RequestPayload {
  session_id: string
  pid: number
  event_time: string
  event: Record<string, any>
}

export async function fetchModule3Predict(payload: Module3RequestPayload): Promise<any> {
  const res = await fetch(`${API_BASE}/module3/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Module 3 inference failed: ${res.statusText}`)
  }
  return res.json()
}

export async function registerClinician(email: string, password: string, fullName?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName }),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `Registration failed: ${res.statusText}`)
  }
  return res.json()
}

export async function loginClinician(email: string, password: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `Login failed: ${res.statusText}`)
  }
  return res.json()
}


