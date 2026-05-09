# Van Electrical — Interactive Schema

Interactive, machine-readable reference for a campervan's electrical system.

**Live data:** [`/schema.json`](./public/schema.json) — single source of truth.
**App:** Vite + React renders the interactive diagram from that JSON.

---

## For AI agents / LLMs

This project is intentionally machine-readable. If you are an agent helping someone debug this van's electrical system:

1. **Fetch the schema first** — `GET /schema.json`. Everything you need is there.
2. **Topology model:**
   - `components` — physical devices (battery, controller, breaker, inverter, panels, shore inlet) with their `terminals`.
   - `connections` — directed wires between component terminals. Each has a `subsystem` (`pv` / `battery_dc` / `ac`) and a `verified` flag.
   - `subsystems` — logical groupings, with `current_flow` descriptions in plain language.
3. **Trace a circuit** by filtering `connections` where `subsystem === <id>`. Follow `from` → `to` to walk the path.
4. **Trust signals:**
   - `verified: true` → confirmed in person.
   - `verified: false` → drawn but not physically traced. Treat as hypothesis.
   - Items in `open_questions` are unresolved. **Do not assume them resolved.**
5. **Issues** — `known_issues` lists the human's currently observed faults. When suggesting diagnostics, reference components and connections by their `id` so the human can follow you back to the diagram.

Field-by-field descriptions live under `agent_field_descriptions` inside the JSON itself.

---

## For humans

### What this is

A campervan electrical setup with three parallel subsystems meeting at a 4-pole circuit breaker:

- **PV (purple)** — solar panels → breaker pole 2 → MPPT controller PV inputs.
- **Battery DC (green)** — controller BAT+ → breaker pole 1 → 24V LiFePO4 battery → inverter DC inputs (direct, no breaker on the discharge side).
- **AC (orange)** — shore-power inlet and inverter 220V output meet at breaker pole 4. Pole 4's transfer logic is **not yet fully verified** (see open questions).

Pole 3 of the breaker is reserved for the controller's LOAD output but is currently **not wired**.

### Running locally

```bash
npm install
npm run dev
```

### Validating the schema

```bash
npm run validate
```

Checks that every connection references real terminals, every wire path in `src/layout.js` has a matching connection, every drawn terminal is either wired or listed in `placeholder_terminals`, every `verified` flag is a boolean, and every ID referenced from `known_issues` / `open_questions` actually exists. `npm run build` runs this first and fails the build on errors.

### Schema additions for the failure-path UI

- `known_issues[]` entries support a richer shape: `symptoms[]`, `diagnostic_findings[]`, `leading_hypothesis: {description, reasoning}`, `alternative_hypotheses[]`, `suspected_components[]`, `suspected_connections[]`, `next_steps_recommended[]`. The UI's "Show failure path" toggle highlights `suspected_connections` of the first issue in accent color.
- `placeholder_terminals[]` (top-level): `{component, terminal, reason}` for terminals drawn in the diagram whose connections are intentionally not yet documented (reserved future wires, or known-unknown destinations pending investigation).

### URL state

The current selection (a wire, component, subsystem, or issue) is reflected in `window.location.hash` as `#connection=…`, `#component=…`, `#subsystem=…`, or `#issue=…` — any view is shareable as a deep link.

### Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel: New Project → import the repo. Vercel auto-detects Vite. Just hit Deploy.
3. After deploy, your machine-readable data is at `https://<your-project>.vercel.app/schema.json`.

No env vars or build settings needed.

### Editing the schema

`public/schema.json` is the only place to edit topology. The React app re-fetches on reload. Visual layout (positions of boxes, wire paths) lives in `src/layout.js` and is intentionally separate from the semantic data.

---

## Status & known issues

See `known_issues` and `open_questions` inside `schema.json`. The "issue_placeholder" entry should be replaced with the actual current malfunction.
