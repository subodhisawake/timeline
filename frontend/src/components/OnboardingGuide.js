// frontend/src/components/OnboardingGuide.js
// Shows once on first visit (localStorage), re-openable via the ? button.
// 7 steps covering every major technical concept in the project.

import { useState, useEffect } from 'react';
import '../styles/OnboardingGuide.css';

// ── step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'welcome',
    phase: null,
    icon: '🌍',
    title: 'Welcome to Timeline',
    body: 'Timeline is a collaborative historical record built on an interactive globe. Browse posts left at real locations across history, add your own, and let an AI fact-check them against a vector database of verified sources.',
    action: null,
    tech: null,
  },
  {
    id: 'globe',
    phase: 'Phase 1',
    icon: '⟳',
    title: 'Pick your era',
    body: 'Drag the globe left or right, or use the slider, to scrub through years from 0 to 2023 CE. The globe rotates to reflect time passing. When you find a year that interests you, hit "Select Timeline."',
    action: 'Try dragging the globe, then click "Select Timeline" to enter.',
    tech: {
      label: 'Three.js · react-globe.gl · WebGL',
      detail: 'The globe is rendered with react-globe.gl, a React wrapper around Three.js WebGL. Dragging maps mouse delta to a Y-axis rotation on the Three.js scene, which is converted back to a year value using a linear scale across the full date range. Camera, zoom, and pan controls are locked during this phase so the globe behaves purely as a timeline scrubber.',
    },
  },
  {
    id: 'map',
    phase: 'Phase 2',
    icon: '🗺',
    title: 'Explore the map',
    body: 'You\'re now on a real interactive map set to your chosen year. Zoom in on any region — markers appear at zoom level 3+. Each marker\'s colour signals its fact-check status: green = verified, red = disputed, gold = verified author. Click a marker to read the post.',
    action: 'Zoom into a region. Try "Go to Rome" (bottom right) to jump to pre-seeded posts.',
    tech: {
      label: 'MapLibre GL · react-map-gl · MongoDB GeoJSON · 2dsphere index',
      detail: 'The map is powered by MapLibre GL via react-map-gl, rendering open tile data. Post locations are stored in MongoDB as GeoJSON Point objects (longitude, latitude). The Post schema has a 2dsphere index on location.coordinates, enabling efficient $near geospatial queries with a configurable $maxDistance radius. The API filters posts by year and proximity in a single MongoDB query.',
    },
  },
  {
    id: 'post',
    phase: 'Phase 2',
    icon: '✍',
    title: 'Add a historical post',
    body: 'Zoom past level 3, then click anywhere on the map. You\'ll need to register or log in — posts are tied to your account. Passwords are hashed with bcrypt before storage. Once submitted, your post appears as a marker on the map immediately.',
    action: 'Zoom in until the hint says "Click anywhere to add a post", then click.',
    tech: {
      label: 'JWT · bcrypt · React Context API · Express REST',
      detail: 'Auth uses JSON Web Tokens (30-day expiry, signed with JWT_SECRET). Passwords are hashed with bcrypt (salt rounds: 10) — plaintext is never stored. The token lives in localStorage and is sent as an Authorization: Bearer header on protected requests. On the frontend, AuthContext (React\'s createContext + Provider + useContext) distributes the user object and auth functions to any component in the tree without prop drilling. The Express backend uses a protect middleware that verifies the JWT before allowing writes.',
    },
  },
  {
    id: 'ai-context',
    phase: 'AI Features',
    icon: '✦',
    title: 'AI historical context',
    body: 'Open any post and tap "Context" in the action bar. The backend sends the post\'s content, location, and year to Gemini and returns a historical summary. The result is cached in the post document — the second request is instant with no AI call.',
    action: 'Open a post, press "Context", and wait a few seconds.',
    tech: {
      label: 'Gemini 3 Flash · @google/genai SDK · Write-through cache',
      detail: 'The context request hits POST /api/posts/:id/context. If post.aiContext is already populated, it\'s returned immediately (from_cache: true). Otherwise the backend calls gemini-3-flash-preview (v1beta API) with a prompt built from location, year, and content. The response is written back to the aiContext field in MongoDB — a write-through cache pattern that also applies to fact-check verdicts. Both AI features are fire-and-cache: the first user to trigger them pays the latency; everyone after gets the cached result.',
    },
  },
  {
    id: 'rag',
    phase: 'AI Features',
    icon: '⚖',
    title: 'RAG fact-checking',
    body: 'Tap "Fact Check" on any post. This runs a full Retrieval-Augmented Generation pipeline: the claim is embedded into a vector, semantically matched against verified historical facts filtered by year and location, then a verdict is generated from the retrieved evidence. If no facts match, the AI reasons from its training knowledge instead.',
    action: 'Open a post and press "Fact Check" to watch the pipeline run.',
    tech: {
      label: 'Gemini Embeddings · Atlas Vector Search · $vectorSearch · Compound pre-filter',
      detail: 'Step 1 — Embed: The post text is vectorised using gemini-embedding-2-preview (gemini-embedding-001 fallback), producing a high-dimensional float array. Step 2 — Retrieve: MongoDB Atlas $vectorSearch queries historicalVectorIndex with a compound pre-filter: yearRange.start ≤ post.year ≤ yearRange.end AND locationKeywords includes the post\'s location name. The HistoricalFact schema carries separate B-tree indexes on yearRange.start, yearRange.end, and locationKeywords — Atlas requires these for $vectorSearch filter fields. The top 3 cosine-similar facts are returned. Step 3 — Generate: The facts are injected into a Gemini prompt as grounding context, producing a VERIFIED, DISPUTED, or INSUFFICIENT DATA verdict with 2-sentence reasoning.',
    },
  },
  {
    id: 'mcp',
    phase: 'MCP',
    icon: '⟨/⟩',
    title: 'Model Context Protocol',
    body: 'The entire Timeline database is also exposed as an MCP server — a standardised protocol that lets AI assistants like Claude use your app as a live tool. Through natural language, an AI can query posts, create new ones, run fact-checks, or semantically search the vector database.',
    action: null,
    tech: {
      label: 'MCP · HTTP/SSE transport · Express-integrated · 8 registered tools',
      detail: 'The MCP server is mounted directly inside the Express app at /mcp — no separate process or port. It uses HTTP/SSE transport from @modelcontextprotocol/sdk: the client opens a persistent SSE stream on GET /mcp and sends JSON-RPC tool calls via POST /mcp. Each connection gets its own McpServer + SSEServerTransport instance, tracked in a Map keyed by sessionId. The 8 tools are: get_posts, get_post, create_post (JWT), vote_post (JWT), get_ai_context, verify_claim, search_historical_facts (direct vector search with optional year + location filters), and get_stats. To connect Claude Desktop, point it at the SSE endpoint in claude_desktop_config.json — Claude can then query and post to Timeline through conversation.',
    },
  },
];

// ── component ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'timeline_guide_seen_v2';

const OnboardingGuide = () => {
  const [open, setOpen]         = useState(false);
  const [step, setStep]         = useState(0);
  const [techOpen, setTechOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setOpen(true);
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  const goTo = (idx) => {
    setStep(idx);
    setTechOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) goTo(step + 1);
    else close();
  };

  const prev = () => {
    if (step > 0) goTo(step - 1);
  };

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  const phaseClass =
    current.phase === 'AI Features' ? 'chip-ai'  :
    current.phase === 'MCP'         ? 'chip-mcp' :
    current.phase === 'Phase 1'     ? 'chip-p1'  :
    current.phase === 'Phase 2'     ? 'chip-p2'  : '';

  return (
    <>
      <button
        className="guide-fab"
        onClick={() => { setOpen(true); setStep(0); setTechOpen(false); }}
        aria-label="Open guide"
        title="How to use Timeline"
      >
        ?
      </button>

      {open && (
        <div className="guide-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="guide-modal" role="dialog" aria-modal="true" aria-label="Timeline guide">

            <div className="guide-header">
              <div className="guide-header-left">
                {current.phase && (
                  <span className={`guide-phase-chip ${phaseClass}`}>{current.phase}</span>
                )}
                <span className="guide-step-count">{step + 1} / {STEPS.length}</span>
              </div>
              <button className="guide-close-btn" onClick={close} aria-label="Close guide">✕</button>
            </div>

            <div className="guide-dots">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  className={`guide-dot${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                />
              ))}
            </div>

            <div className="guide-body">
              <div className="guide-icon" aria-hidden="true">{current.icon}</div>
              <h2 className="guide-title">{current.title}</h2>
              <p className="guide-text">{current.body}</p>

              {current.action && (
                <div className="guide-action-hint">
                  <span className="guide-action-arrow">→</span>
                  <span>{current.action}</span>
                </div>
              )}

              {current.tech && (
                <div className="guide-tech-block">
                  <button
                    className={`guide-tech-toggle${techOpen ? ' open' : ''}`}
                    onClick={() => setTechOpen(v => !v)}
                  >
                    <span className="guide-tech-icon">⟨/⟩</span>
                    <span className="guide-tech-label">{current.tech.label}</span>
                    <span className="guide-tech-chevron">{techOpen ? '▲' : '▼'}</span>
                  </button>
                  {techOpen && (
                    <p className="guide-tech-detail">{current.tech.detail}</p>
                  )}
                </div>
              )}
            </div>

            <div className="guide-footer">
              <button
                className="guide-nav-btn guide-prev"
                onClick={prev}
                disabled={step === 0}
              >
                ← Back
              </button>
              <button className="guide-skip-btn" onClick={close}>
                Skip guide
              </button>
              <button className="guide-nav-btn guide-next" onClick={next}>
                {isLast ? 'Start exploring →' : 'Next →'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default OnboardingGuide;