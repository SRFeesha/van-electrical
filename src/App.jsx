import { useEffect, useState, useMemo } from 'react'
import {
  CANVAS,
  components as layoutComponents,
  breakerPoles,
  terminals,
  wirePaths,
  subsystemColors,
} from './layout'

// --- URL hash <-> selection state ----------------------------------------
// Hash format: #connection=<id> | #component=<id> | #subsystem=<id> | #issue=<id>
// Round-trip so any view is shareable as a deep link.
const KIND_KEYS = ['connection', 'component', 'subsystem', 'issue']

function parseHash(hash) {
  if (!hash) return null
  const trimmed = hash.replace(/^#/, '')
  if (!trimmed) return null
  const [k, v] = trimmed.split('=')
  if (!KIND_KEYS.includes(k) || !v) return null
  return { kind: k, id: decodeURIComponent(v) }
}

function writeHash(sel) {
  const next = sel ? `#${sel.kind}=${encodeURIComponent(sel.id)}` : ''
  if (window.location.hash === next) return
  // replaceState avoids polluting back-button history while still updating the URL.
  history.replaceState(null, '', next || window.location.pathname + window.location.search)
}

export default function App() {
  const [schema, setSchema] = useState(null)
  const [error, setError] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [locked, setLocked] = useState(() => parseHash(window.location.hash))
  const [filter, setFilter] = useState('all')
  const [diagMode, setDiagMode] = useState(false)

  useEffect(() => {
    // Prefer the schema inlined into index.html by the Vite build plugin —
    // saves a round-trip and means the page works without a second request.
    // Fall back to fetching /schema.json when running in dev (the inlined
    // data may be the placeholder string before HMR catches up) or if the
    // tag has been removed.
    const inline = document.getElementById('van-schema-data')?.textContent?.trim()
    if (inline && inline !== '__SCHEMA_INLINE__') {
      try {
        setSchema(JSON.parse(inline))
        return
      } catch {
        // fall through to network fetch
      }
    }
    fetch('./schema.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setSchema)
      .catch((e) => setError(e.message))
  }, [])

  // Sync locked selection -> hash, and react to hash changes (back/forward, manual edits).
  useEffect(() => {
    writeHash(locked)
  }, [locked])

  useEffect(() => {
    const onHash = () => {
      const next = parseHash(window.location.hash)
      setLocked(next)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const active = locked || hovered

  // The active known_issue (if any), used by hover-on-issue and by diagnostics mode.
  const activeIssue = useMemo(() => {
    if (!schema) return null
    if (active?.kind === 'issue') {
      return schema.known_issues.find((i) => i.id === active.id) || null
    }
    return null
  }, [schema, active])

  // In diagnostics mode we always render the *first* known issue's suspected
  // connections in the accent color, regardless of hover. The toggle is a
  // "explain the failure path" view, not a hover state.
  const diagIssue = useMemo(() => {
    if (!schema || !diagMode) return null
    return schema.known_issues[0] || null
  }, [schema, diagMode])

  const suspectedConnSet = useMemo(() => {
    const set = new Set()
    if (activeIssue) for (const id of activeIssue.suspected_connections || []) set.add(id)
    if (diagIssue) for (const id of diagIssue.suspected_connections || []) set.add(id)
    return set
  }, [activeIssue, diagIssue])

  const suspectedCompSet = useMemo(() => {
    const set = new Set()
    if (activeIssue) for (const id of activeIssue.suspected_components || []) set.add(id)
    if (diagIssue) for (const id of diagIssue.suspected_components || []) set.add(id)
    return set
  }, [activeIssue, diagIssue])

  // Per-connection visual state ("normal" | "highlight" | "dim" | "diagnostic")
  const connectionState = useMemo(() => {
    if (!schema) return {}
    const state = {}
    for (const c of schema.connections) {
      let s = 'normal'

      // Filter chip: dim subsystems that don't match.
      if (filter !== 'all' && c.subsystem !== filter) s = 'dim'

      if (active) {
        if (active.kind === 'connection' && active.id === c.id) s = 'highlight'
        else if (active.kind === 'subsystem' && active.id === c.subsystem) s = 'highlight'
        else if (
          active.kind === 'component' &&
          (c.from.component === active.id || c.to.component === active.id)
        ) {
          s = 'highlight'
        } else if (active.kind === 'issue' && suspectedConnSet.has(c.id)) {
          s = 'highlight'
        } else {
          s = 'dim'
        }
      }

      // Diagnostics mode wins over the filter dim, but loses to active highlight.
      if (diagMode) {
        if (suspectedConnSet.has(c.id)) s = 'diagnostic'
        else if (s === 'normal') s = 'dim'
      }

      state[c.id] = s
    }
    return state
  }, [schema, active, filter, diagMode, suspectedConnSet])

  if (error) {
    return (
      <div className="error">
        <h1>Failed to load schema</h1>
        <p>{error}</p>
      </div>
    )
  }

  if (!schema) {
    return <div className="loading">Loading schema…</div>
  }

  const handleEnter = (kind, id) => {
    if (locked) return
    setHovered({ kind, id })
  }
  const handleLeave = () => {
    if (locked) return
    setHovered(null)
  }
  const handleClick = (kind, id) => {
    if (locked && locked.kind === kind && locked.id === id) {
      setLocked(null)
    } else {
      setLocked({ kind, id })
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Campervan · Electrical Reference v{schema.version}</p>
          <h1>{schema.title}</h1>
          <p className="subtitle">{schema.description}</p>
        </div>
        <div className="header-meta">
          <a className="meta-link" href="./schema.json" target="_blank" rel="noreferrer">
            schema.json ↗
          </a>
        </div>
      </header>

      <section className="controls">
        <div className="filter-row">
          <span className="filter-label">Filter:</span>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </Chip>
          {Object.values(schema.subsystems).map((s) => (
            <Chip
              key={s.id}
              active={filter === s.id}
              color={subsystemColors[s.id]}
              onClick={() => setFilter(filter === s.id ? 'all' : s.id)}
            >
              {s.label}
            </Chip>
          ))}
          {locked && (
            <button className="chip clear" onClick={() => setLocked(null)}>
              ✕ unlock selection
            </button>
          )}
          {schema.known_issues.length > 0 && (
            <button
              className={`diag-toggle ${diagMode ? 'active' : ''}`}
              onClick={() => setDiagMode((m) => !m)}
              title="Highlight the suspected failure path on the schematic"
            >
              <span className="swatch" />
              {diagMode ? 'Diagnostic mode on' : 'Show failure path'}
            </button>
          )}
        </div>
        <p className="hint">
          Hover a wire, component, or issue to isolate · Click to lock · Selection syncs to URL
        </p>
      </section>

      <div className="main">
        <div className="diagram-wrap">
          <Schematic
            schema={schema}
            connectionState={connectionState}
            active={active}
            suspectedCompSet={suspectedCompSet}
            diagMode={diagMode}
            onEnter={handleEnter}
            onLeave={handleLeave}
            onClick={handleClick}
          />
        </div>

        <aside className="sidebar">
          <DetailPanel active={active} schema={schema} />
        </aside>
      </div>

      <section className="info-panels">
        <div className="panel">
          <h2>Known issues</h2>
          {schema.known_issues.length === 0 && <p className="muted">None recorded.</p>}
          {schema.known_issues.map((iss) => (
            <IssueCard
              key={iss.id}
              issue={iss}
              schema={schema}
              isActive={active?.kind === 'issue' && active.id === iss.id}
              onEnter={() => handleEnter('issue', iss.id)}
              onLeave={handleLeave}
              onClick={() => handleClick('issue', iss.id)}
            />
          ))}
        </div>

      </section>

      <footer className="footer">
        <p>
          Machine-readable data: <a href="./schema.json">/schema.json</a> · Updated{' '}
          {schema.updated}
        </p>
      </footer>
    </div>
  )
}

function Chip({ active, color, onClick, children }) {
  return (
    <button
      className={`chip ${active ? 'active' : ''}`}
      style={active && color ? { borderColor: color, color: color } : undefined}
      onClick={onClick}
    >
      {color && <span className="chip-dot" style={{ background: color }} />}
      {children}
    </button>
  )
}

function Schematic({
  schema,
  connectionState,
  active,
  suspectedCompSet,
  diagMode,
  onEnter,
  onLeave,
  onClick,
}) {
  const componentDimmed = (id) => {
    if (diagMode && !suspectedCompSet.has(id) && !active) return true
    if (!active) return false
    if (active.kind === 'component') return active.id !== id
    if (active.kind === 'connection') {
      const c = schema.connections.find((x) => x.id === active.id)
      return !c || (c.from.component !== id && c.to.component !== id)
    }
    if (active.kind === 'subsystem') {
      const touched = new Set()
      schema.connections.forEach((c) => {
        if (c.subsystem === active.id) {
          touched.add(c.from.component)
          touched.add(c.to.component)
        }
      })
      return !touched.has(id)
    }
    if (active.kind === 'issue') {
      return !suspectedCompSet.has(id)
    }
    return false
  }

  const componentSuspected = (id) => suspectedCompSet.has(id) && (diagMode || active?.kind === 'issue')

  return (
    <svg
      viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`}
      className="schematic"
      role="img"
      aria-label="Interactive electrical schematic"
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="rgba(0,0,0,0.04)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width={CANVAS.w} height={CANVAS.h} fill="url(#grid)" />

      {Object.entries(layoutComponents).map(([id, c]) => (
        <ComponentBox
          key={id}
          id={id}
          box={c}
          dim={componentDimmed(id)}
          highlighted={active?.kind === 'component' && active.id === id}
          suspected={componentSuspected(id)}
          onEnter={() => onEnter('component', id)}
          onLeave={onLeave}
          onClick={() => onClick('component', id)}
        />
      ))}

      {breakerPoles.map((p, i) => (
        <g key={p.id} className="pole">
          <rect
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
            fill="rgba(255,255,255,0.6)"
            stroke="rgba(40,38,36,0.25)"
            strokeWidth="1"
            rx="4"
          />
          <text
            x={p.x + p.w / 2}
            y={p.y + p.h / 2 + 4}
            textAnchor="middle"
            className="pole-num"
          >
            {i + 1}
          </text>
        </g>
      ))}

      {schema.connections.map((conn) => {
        const path = wirePaths[conn.id]
        if (!path) return null
        const state = connectionState[conn.id] || 'normal'
        const baseColor = subsystemColors[conn.subsystem] || '#666'
        // Accent matches --accent in styles.css. Hardcoded because SVG stroke
        // attributes don't reliably resolve CSS custom properties in all browsers.
        const color = state === 'diagnostic' ? '#b34728' : baseColor
        const isHover = active?.kind === 'connection' && active.id === conn.id
        return (
          <g key={conn.id} className={`wire wire-${state}`}>
            <path
              d={path}
              stroke="transparent"
              strokeWidth="20"
              fill="none"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => onEnter('connection', conn.id)}
              onMouseLeave={onLeave}
              onClick={() => onClick('connection', conn.id)}
            />
            <path
              d={path}
              stroke={color}
              strokeWidth={isHover || state === 'diagnostic' ? 5 : 3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={state === 'dim' ? 0.12 : 1}
              strokeDasharray={conn.verified === false ? '6 4' : 'none'}
            />
          </g>
        )
      })}

      {Object.entries(terminals).map(([id, t]) => (
        <g key={id} className="terminal">
          <circle cx={t.x} cy={t.y} r="4" fill="#1a1817" />
          <text x={t.x + 8} y={t.y + 3} className="terminal-label">
            {t.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function ComponentBox({ id, box, dim, highlighted, suspected, onEnter, onLeave, onClick }) {
  const palette = {
    photovoltaic: { fill: '#E8E4DA', stroke: '#1a1817' },
    shore: { fill: '#D8D4CB', stroke: '#1a1817' },
    circuit_breaker: { fill: '#F5E6E8', stroke: '#1a1817' },
    controller: { fill: '#E0E6F0', stroke: '#1a1817' },
    inverter: { fill: '#F5E0CE', stroke: '#1a1817' },
    battery: { fill: '#D8EBDB', stroke: '#1a1817' },
  }[id] || { fill: '#fff', stroke: '#1a1817' }

  const stroke = suspected ? '#b34728' : palette.stroke
  const strokeWidth = suspected ? 2.5 : highlighted ? 2.5 : 1.2

  return (
    <g
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      opacity={dim ? 0.25 : 1}
    >
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        fill={palette.fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        rx="6"
      />
      <text x={box.x + 12} y={box.y + 22} className="component-label">
        {box.label}
      </text>
    </g>
  )
}

function IssueCard({ issue, schema, isActive, onEnter, onLeave, onClick }) {
  return (
    <div
      className={`issue ${isActive ? 'active' : ''}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <h3>{issue.summary}</h3>

      {issue.symptoms?.length > 0 && (
        <div className="issue-section">
          <p className="issue-section-label">Symptoms</p>
          <ul>
            {issue.symptoms.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {issue.diagnostic_findings?.length > 0 && (
        <div className="issue-section">
          <p className="issue-section-label">Diagnostic findings</p>
          <ul>
            {issue.diagnostic_findings.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {issue.leading_hypothesis && (
        <div className="issue-section">
          <p className="issue-section-label">Leading hypothesis</p>
          <div className="hypothesis">
            <div>{issue.leading_hypothesis.description}</div>
            {issue.leading_hypothesis.reasoning && (
              <div className="why">{issue.leading_hypothesis.reasoning}</div>
            )}
          </div>
        </div>
      )}

      {issue.alternative_hypotheses?.length > 0 && (
        <div className="issue-section">
          <p className="issue-section-label">Alternative hypotheses</p>
          {issue.alternative_hypotheses.map((h, i) => (
            <div className="hypothesis alt" key={i} style={{ marginBottom: 6 }}>
              <div>{h.description}</div>
              {h.reasoning && <div className="why">{h.reasoning}</div>}
            </div>
          ))}
        </div>
      )}

      {issue.suspected_connections?.length > 0 && (
        <div className="issue-section">
          <p className="issue-section-label">Suspected wires</p>
          <ul>
            {issue.suspected_connections.map((cid) => {
              const c = schema.connections.find((x) => x.id === cid)
              return (
                <li key={cid}>
                  <code>{cid}</code>
                  {c && <span className="muted"> · {c.description}</span>}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {issue.next_steps_recommended?.length > 0 && (
        <div className="issue-section">
          <p className="issue-section-label">Next steps</p>
          <ul>
            {issue.next_steps_recommended.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {issue.notes && <p className="muted" style={{ marginTop: 10 }}>{issue.notes}</p>}
    </div>
  )
}

function DetailPanel({ active, schema }) {
  if (!active) {
    return (
      <div className="detail-empty">
        <h2>Details</h2>
        <p className="muted">
          Hover or click any wire, component, issue, or subsystem to see details here.
        </p>
        <h3>Subsystems</h3>
        <ul className="subsystem-list">
          {Object.values(schema.subsystems).map((s) => (
            <li key={s.id}>
              <span className="dot" style={{ background: subsystemColors[s.id] }} />
              <strong>{s.label}</strong>
              <span className="muted"> · {s.voltage}</span>
            </li>
          ))}
        </ul>
        <h3>Legend</h3>
        <ul className="legend">
          <li>
            <svg width="40" height="10">
              <line x1="0" y1="5" x2="40" y2="5" stroke="#666" strokeWidth="3" />
            </svg>
            verified wire
          </li>
          <li>
            <svg width="40" height="10">
              <line
                x1="0"
                y1="5"
                x2="40"
                y2="5"
                stroke="#666"
                strokeWidth="3"
                strokeDasharray="6 4"
              />
            </svg>
            unverified — to confirm
          </li>
        </ul>
      </div>
    )
  }

  if (active.kind === 'connection') {
    const c = schema.connections.find((x) => x.id === active.id)
    if (!c) return null
    const fromComp = schema.components[c.from.component]
    const toComp = schema.components[c.to.component]
    return (
      <div>
        <span className="kind-tag">Connection</span>
        <h2>{c.id}</h2>
        <div className="kv">
          <KV label="From">
            {fromComp.label} · {c.from.terminal}
          </KV>
          <KV label="To">
            {toComp.label} · {c.to.terminal}
          </KV>
          <KV label="Subsystem">
            <span className="dot" style={{ background: subsystemColors[c.subsystem] }} />
            {schema.subsystems[c.subsystem]?.label}
          </KV>
          <KV label="Verified">
            {c.verified ? '✓ yes' : '✗ no — confirm physically'}
          </KV>
        </div>
        <p className="desc">{c.description}</p>
      </div>
    )
  }

  if (active.kind === 'component') {
    const c = schema.components[active.id]
    if (!c) return null
    const incoming = schema.connections.filter((x) => x.to.component === active.id)
    const outgoing = schema.connections.filter((x) => x.from.component === active.id)
    return (
      <div>
        <span className="kind-tag">Component</span>
        <h2>{c.label}</h2>
        <p className="desc">{c.description}</p>
        {c.voltage_nominal && <KV label="Voltage">{c.voltage_nominal}</KV>}
        <h3>Terminals</h3>
        <ul className="terminal-list">
          {(c.terminals || []).map((t) => (
            <li key={t.id}>
              <code>{t.label}</code>
              <span className="muted"> · {t.kind || ''}</span>
            </li>
          ))}
        </ul>
        {c.poles && (
          <>
            <h3>Poles</h3>
            <ul className="terminal-list">
              {c.poles.map((p) => (
                <li key={p.id}>
                  <strong>{p.id}:</strong> {p.function}
                </li>
              ))}
            </ul>
          </>
        )}
        <h3>Incoming wires</h3>
        {incoming.length === 0 && <p className="muted">None</p>}
        <ul className="wire-list">
          {incoming.map((w) => (
            <li key={w.id}>
              <span className="dot" style={{ background: subsystemColors[w.subsystem] }} />
              {w.id}
            </li>
          ))}
        </ul>
        <h3>Outgoing wires</h3>
        {outgoing.length === 0 && <p className="muted">None</p>}
        <ul className="wire-list">
          {outgoing.map((w) => (
            <li key={w.id}>
              <span className="dot" style={{ background: subsystemColors[w.subsystem] }} />
              {w.id}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (active.kind === 'subsystem') {
    const s = schema.subsystems[active.id]
    if (!s) return null
    return (
      <div>
        <span className="kind-tag">Subsystem</span>
        <h2>{s.label}</h2>
        <KV label="Voltage">{s.voltage}</KV>
        <p className="desc">{s.description}</p>
        <h3>Current flow</h3>
        <p className="desc">{s.current_flow}</p>
      </div>
    )
  }

  if (active.kind === 'issue') {
    const iss = schema.known_issues.find((x) => x.id === active.id)
    if (!iss) return null
    return (
      <div>
        <span className="kind-tag">Issue</span>
        <h2>{iss.summary}</h2>
        <p className="desc">
          Hovering this issue highlights its suspected wires and components on the
          schematic. Toggle "Show failure path" for a persistent diagnostic view.
        </p>
        {iss.suspected_components?.length > 0 && (
          <>
            <h3>Suspected components</h3>
            <ul className="wire-list">
              {iss.suspected_components.map((cid) => (
                <li key={cid}>
                  <code>{cid}</code>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    )
  }

  return null
}

function KV({ label, children }) {
  return (
    <div className="kv-row">
      <span className="kv-label">{label}</span>
      <span className="kv-val">{children}</span>
    </div>
  )
}
