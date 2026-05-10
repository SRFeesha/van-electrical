#!/usr/bin/env node
// Validates that public/schema.json and src/layout.js are consistent.
// Exits non-zero on any error so it can gate `npm run build`.

import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SCHEMA_PATH = resolve(ROOT, 'public/schema.json')
const LAYOUT_PATH = resolve(ROOT, 'src/layout.js')

const errors = []
const err = (loc, msg) => errors.push(`${loc}: ${msg}`)

// Locate the line number of a substring in the schema source — best-effort,
// just so failure messages can point a human at roughly the right place.
const schemaText = readFileSync(SCHEMA_PATH, 'utf8')
const lineOf = (needle) => {
  const idx = schemaText.indexOf(needle)
  if (idx === -1) return '?'
  return schemaText.slice(0, idx).split('\n').length
}

const schema = JSON.parse(schemaText)
const layoutMod = await import(pathToFileURL(LAYOUT_PATH).href)
const { terminals: layoutTerminals, wirePaths } = layoutMod

// 1. Build the set of valid (component, terminal) pairs from the schema.
const validTerminals = new Map() // component_id -> Set(terminal_id)
for (const [compId, comp] of Object.entries(schema.components)) {
  const set = new Set()
  for (const t of comp.terminals || []) set.add(t.id)
  for (const pole of comp.poles || []) for (const t of pole.terminals || []) set.add(t.id)
  validTerminals.set(compId, set)
}

const referencedTerminals = new Set() // "<terminal_id>"
const referencedConnIds = new Set()

// 2. Validate connections.
for (const c of schema.connections) {
  const loc = `${SCHEMA_PATH}:${lineOf(`"${c.id}"`)}`
  referencedConnIds.add(c.id)

  for (const side of ['from', 'to']) {
    const ref = c[side]
    const set = validTerminals.get(ref.component)
    if (!set) {
      err(loc, `connection ${c.id}: ${side}.component '${ref.component}' is not a known component`)
    } else if (!set.has(ref.terminal)) {
      err(
        loc,
        `connection ${c.id}: ${side}.terminal '${ref.terminal}' not found on component '${ref.component}'`,
      )
    } else {
      referencedTerminals.add(ref.terminal)
    }
  }

  if (!schema.subsystems[c.subsystem]) {
    err(loc, `connection ${c.id}: subsystem '${c.subsystem}' not declared in subsystems`)
  }

  if (typeof c.verified !== 'boolean') {
    err(loc, `connection ${c.id}: 'verified' must be boolean (got ${typeof c.verified})`)
  }

  if (!wirePaths[c.id]) {
    err(`${LAYOUT_PATH}`, `connection ${c.id}: no entry in wirePaths`)
  }
}

// 3. Stale wirePaths in layout.
for (const id of Object.keys(wirePaths)) {
  if (!referencedConnIds.has(id)) {
    err(LAYOUT_PATH, `wirePaths['${id}'] has no matching connection in schema.json`)
  }
}

// 4. Every terminal in layout.js is referenced by at least one connection,
//    OR is on a known unused/unconnected pin (kind: 'unused' or connected: false).
const explicitlyUnused = new Set()
for (const comp of Object.values(schema.components)) {
  for (const t of comp.terminals || []) {
    if (t.kind === 'unused' || t.connected === false) explicitlyUnused.add(t.id)
  }
  for (const pole of comp.poles || []) {
    for (const t of pole.terminals || []) {
      if (t.kind === 'unused' || t.connected === false) explicitlyUnused.add(t.id)
    }
  }
}
for (const p of schema.placeholder_terminals || []) {
  explicitlyUnused.add(p.terminal)
  if (!validTerminals.get(p.component)?.has(p.terminal)) {
    err(
      `${SCHEMA_PATH}:${lineOf(`"${p.terminal}"`)}`,
      `placeholder_terminals: '${p.terminal}' is not a real terminal of '${p.component}'`,
    )
  }
}

for (const tid of Object.keys(layoutTerminals)) {
  if (!referencedTerminals.has(tid) && !explicitlyUnused.has(tid)) {
    err(LAYOUT_PATH, `terminals['${tid}'] is drawn but unused — connect it or mark the schema terminal as kind:'unused' / connected:false`)
  }
}

// 5. measurements: probe references must resolve to real terminals.
const measurementIds = new Set()
for (const m of schema.measurements || []) {
  const loc = `${SCHEMA_PATH}:${lineOf(`"${m.id}"`)}`
  if (measurementIds.has(m.id)) err(loc, `measurement '${m.id}' duplicated`)
  measurementIds.add(m.id)
  if (m.kind !== 'multimeter') continue
  if (typeof m.probes === 'string') continue
  for (const side of ['red', 'black']) {
    const ref = m.probes?.[side]
    if (!ref) { err(loc, `measurement ${m.id}: missing probes.${side}`); continue }
    const set = validTerminals.get(ref.component)
    if (!set) err(loc, `measurement ${m.id}: probes.${side}.component '${ref.component}' unknown`)
    else if (!set.has(ref.terminal)) err(loc, `measurement ${m.id}: probes.${side}.terminal '${ref.terminal}' not found on '${ref.component}'`)
  }
}

// 6. known_issues: suspected_connections / suspected_components must exist;
//    evidence[] (issue and per-alternative) must reference real measurement ids.
//    open_questions: affects[] ids must be valid connection ids.
for (const iss of schema.known_issues || []) {
  const loc = `${SCHEMA_PATH}:${lineOf(`"${iss.id}"`)}`
  for (const cid of iss.suspected_connections || []) {
    if (!referencedConnIds.has(cid)) {
      err(loc, `known_issue ${iss.id}: suspected_connections references unknown id '${cid}'`)
    }
  }
  for (const cid of iss.suspected_components || []) {
    if (!schema.components[cid]) {
      err(loc, `known_issue ${iss.id}: suspected_components references unknown component '${cid}'`)
    }
  }
  for (const eid of iss.evidence || []) {
    if (!measurementIds.has(eid)) err(loc, `known_issue ${iss.id}: evidence references unknown measurement '${eid}'`)
  }
  for (const alt of iss.alternative_hypotheses || []) {
    for (const eid of alt.evidence || []) {
      if (!measurementIds.has(eid)) err(loc, `known_issue ${iss.id}: alternative_hypotheses[].evidence references unknown measurement '${eid}'`)
    }
  }
}
for (const q of schema.open_questions || []) {
  const loc = `${SCHEMA_PATH}:${lineOf(`"${q.id}"`)}`
  for (const cid of q.affects || []) {
    if (!referencedConnIds.has(cid)) {
      err(loc, `open_question ${q.id}: affects[] references unknown connection '${cid}'`)
    }
  }
}

if (errors.length) {
  console.error(`\nschema validation FAILED with ${errors.length} error(s):\n`)
  for (const e of errors) console.error(`  • ${e}`)
  console.error('')
  process.exit(1)
}

console.log(
  `schema validation OK — ${schema.connections.length} connections, ${
    Object.keys(schema.components).length
  } components, ${Object.keys(layoutTerminals).length} terminals.`,
)
