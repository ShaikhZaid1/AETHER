import { useState, useEffect, useRef, useCallback } from "react";

const MODES = [
  {
    id: "oracle", name: "Oracle", symbol: "◎",
    tagline: "Ask the cosmos anything",
    system: "You are a wise, eloquent oracle. Give profound, thoughtful answers in 3-5 vivid sentences. Use metaphor when it illuminates. Be specific, never generic. Surprise the reader.",
    placeholder: "What do you seek to understand?",
    accent: "#D4A056", glow: "rgba(212,160,86,0.18)", border: "rgba(212,160,86,0.35)"
  },
  {
    id: "forge", name: "Forge", symbol: "⬡",
    tagline: "Transform words into art",
    system: "You are a master poet and creative writer. Transform the given input into something beautiful and unexpected—a poem, vivid prose, or lyrical fragment. 60-100 words. Be surprising and emotionally resonant.",
    placeholder: "A word, feeling, or seed idea to transform…",
    accent: "#9B7EE8", glow: "rgba(155,126,232,0.18)", border: "rgba(155,126,232,0.35)"
  },
  {
    id: "lens", name: "Lens", symbol: "◈",
    tagline: "Every idea, every angle",
    system: "You are a multi-perspectival thinker. Present exactly 3 contrasting perspectives on the topic. Format strictly as:\n**[Title 1]**\n[1-2 sentence perspective]\n\n**[Title 2]**\n[1-2 sentence perspective]\n\n**[Title 3]**\n[1-2 sentence perspective]\n\nMake each perspective genuinely distinct and illuminating.",
    placeholder: "What shall we examine from all angles?",
    accent: "#4DBFA0", glow: "rgba(77,191,160,0.18)", border: "rgba(77,191,160,0.35)"
  }
];

function StarField() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, ctx = c.getContext("2d");
    let raf, stars = [];
    const init = () => {
      c.width = c.offsetWidth; c.height = c.offsetHeight;
      stars = Array.from({ length: 130 }, () => ({
        x: Math.random() * c.width, y: Math.random() * c.height,
        r: Math.random() * 1.1 + 0.15, vy: Math.random() * 0.12 + 0.04,
        phase: Math.random() * Math.PI * 2, b: Math.random() * 0.5 + 0.15
      }));
    };
    init();
    window.addEventListener("resize", init);
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      stars.forEach(s => {
        s.phase += 0.013; s.y -= s.vy;
        if (s.y < -3) { s.y = c.height + 3; s.x = Math.random() * c.width; }
        const a = s.b * (0.55 + 0.45 * Math.sin(s.phase));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", init); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

function TypewriterText({ text, speed = 12, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const [idx, setIdx] = useState(0);
  useEffect(() => { setDisplayed(""); setIdx(0); }, [text]);
  useEffect(() => {
    if (!text || idx >= text.length) { if (idx > 0 && onDone) onDone(); return; }
    const t = setTimeout(() => {
      setDisplayed(p => p + text[idx]);
      setIdx(i => i + 1);
    }, speed);
    return () => clearTimeout(t);
  }, [text, idx, speed, onDone]);

  const lines = displayed.split("\n");
  return (
    <div style={{ fontFamily: "'Georgia', serif", fontSize: 15, lineHeight: 1.85, color: "#E8E0D0", whiteSpace: "pre-wrap" }}>
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {parts.map((p, j) =>
              p.startsWith("**") && p.endsWith("**")
                ? <strong key={j} style={{ color: "#fff", fontWeight: 600, letterSpacing: "0.02em" }}>{p.slice(2, -2)}</strong>
                : p
            )}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
      {idx < (text?.length ?? 0) && <span style={{ animation: "blink 0.7s infinite", color: "#888" }}>▋</span>}
    </div>
  );
}

function HistoryItem({ item, accent, onRestore }) {
  return (
    <div onClick={() => onRestore(item)} style={{
      padding: "10px 14px", borderRadius: 8, cursor: "pointer", marginBottom: 6,
      background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)",
      transition: "background 0.2s"
    }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
    >
      <div style={{ fontSize: 11, color: "#888", marginBottom: 3, fontFamily: "'DM Mono', monospace" }}>
        {item.mode.toUpperCase()} · {item.time}
      </div>
      <div style={{ fontSize: 13, color: "#C0B8A8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.query}
      </div>
    </div>
  );
}

export default function Aether() {
  const [modeIdx, setModeIdx] = useState(0);
  const [query, setQuery] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const mode = MODES[modeIdx];

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("aether-history");
        if (res?.value) setHistory(JSON.parse(res.value));
      } catch {}
    })();
  }, []);

  const saveHistory = useCallback(async (items) => {
    try { await window.storage.set("aether-history", JSON.stringify(items)); } catch {}
  }, []);

  const submit = useCallback(async () => {
    if (!query.trim() || loading) return;
    setLoading(true); setOutput(""); setError(""); setDone(false);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: mode.system,
          messages: [{ role: "user", content: query.trim() }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "The stars are silent. Try again.";
      setOutput(text);
      const entry = {
        id: Date.now(), mode: mode.id, query: query.trim(),
        response: text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setHistory(h => {
        const next = [entry, ...h].slice(0, 20);
        saveHistory(next);
        return next;
      });
    } catch (e) {
      setError("Connection lost. The cosmos is unreachable.");
    } finally {
      setLoading(false);
    }
  }, [query, loading, mode, saveHistory]);

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const clear = () => { setQuery(""); setOutput(""); setError(""); setDone(false); textareaRef.current?.focus(); };

  const restoreHistory = (item) => {
    const idx = MODES.findIndex(m => m.id === item.mode);
    if (idx >= 0) setModeIdx(idx);
    setQuery(item.query); setOutput(item.response); setDone(true); setShowHistory(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#05060F", position: "relative",
      fontFamily: "'system-ui', sans-serif", overflow: "hidden"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        textarea:focus { outline: none !important; }
        textarea::placeholder { color: #4A4840 !important; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      <StarField />

      {/* Nebula glow orb */}
      <div style={{
        position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 300, borderRadius: "50%",
        background: mode.glow, filter: "blur(80px)", pointerEvents: "none",
        transition: "background 0.8s ease", zIndex: 1
      }} />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>

        {/* Header */}
        <div style={{ paddingTop: 36, paddingBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600,
              color: "#F0EBE1", letterSpacing: "0.08em"
            }}>ÆTHER</div>
            <div style={{ fontSize: 11, color: "#5A5650", letterSpacing: "0.18em", marginTop: 2, fontFamily: "'DM Mono', monospace" }}>
              AI CREATIVE STUDIO
            </div>
          </div>
          <button onClick={() => setShowHistory(h => !h)} style={{
            background: showHistory ? "rgba(255,255,255,0.08)" : "transparent",
            border: "0.5px solid rgba(255,255,255,0.15)", borderRadius: 8,
            color: "#888", padding: "7px 14px", cursor: "pointer", fontSize: 12,
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em", transition: "all 0.2s"
          }}>
            {showHistory ? "✕ HISTORY" : "◷ HISTORY"}
          </button>
        </div>

        {/* Mode selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {MODES.map((m, i) => (
            <button key={m.id} onClick={() => { setModeIdx(i); setOutput(""); setError(""); setDone(false); }}
              style={{
                flex: 1, padding: "12px 8px", borderRadius: 10, cursor: "pointer",
                background: i === modeIdx ? "rgba(255,255,255,0.07)" : "transparent",
                border: i === modeIdx ? `0.5px solid ${m.border}` : "0.5px solid rgba(255,255,255,0.08)",
                transition: "all 0.3s", display: "flex", flexDirection: "column", alignItems: "center", gap: 5
              }}>
              <span style={{ fontSize: 22, color: i === modeIdx ? m.accent : "#3A3830", transition: "color 0.3s" }}>{m.symbol}</span>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", color: i === modeIdx ? m.accent : "#4A4840", fontFamily: "'DM Mono', monospace", transition: "color 0.3s" }}>
                {m.name.toUpperCase()}
              </span>
            </button>
          ))}
        </div>

        {/* History drawer */}
        {showHistory && (
          <div style={{
            marginBottom: 20, padding: "16px", borderRadius: 12,
            background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.08)",
            animation: "fadeUp 0.25s ease", maxHeight: 260, overflowY: "auto"
          }}>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.15em", marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
              RECENT SESSIONS
            </div>
            {history.length === 0
              ? <div style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No history yet</div>
              : history.map(item => (
                <HistoryItem key={item.id} item={item} accent={MODES.find(m => m.id === item.mode)?.accent} onRestore={restoreHistory} />
              ))
            }
          </div>
        )}

        {/* Mode description */}
        <div style={{ marginBottom: 16, animation: "fadeUp 0.4s ease" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "#A09880", fontStyle: "italic" }}>
            {mode.tagline}
          </div>
        </div>

        {/* Input area */}
        <div style={{
          borderRadius: 14, border: `0.5px solid ${mode.border}`,
          background: "rgba(255,255,255,0.03)", padding: 20, marginBottom: 16,
          transition: "border-color 0.4s", boxShadow: `0 0 40px ${mode.glow}`
        }}>
          <textarea
            ref={textareaRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
            placeholder={mode.placeholder}
            rows={4}
            style={{
              width: "100%", background: "transparent", border: "none", resize: "none",
              color: "#E8E0D0", fontSize: 15, lineHeight: 1.7, fontFamily: "'Georgia', serif",
              caretColor: mode.accent
            }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
            <span style={{ fontSize: 11, color: "#3A3830", fontFamily: "'DM Mono', monospace" }}>⌘↵ to invoke</span>
            <button
              onClick={submit}
              disabled={!query.trim() || loading}
              style={{
                background: loading ? "transparent" : mode.accent,
                border: loading ? `0.5px solid ${mode.border}` : "none",
                borderRadius: 8, color: loading ? mode.accent : "#0A0810",
                padding: "9px 22px", cursor: loading ? "default" : "pointer",
                fontSize: 12, fontWeight: 600, letterSpacing: "0.08em",
                fontFamily: "'DM Mono', monospace", transition: "all 0.3s",
                opacity: !query.trim() ? 0.3 : 1, display: "flex", alignItems: "center", gap: 8
              }}>
              {loading
                ? <><span style={{ display: "inline-block", width: 12, height: 12, border: `1.5px solid ${mode.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> CHANNELING</>
                : "INVOKE ↗"
              }
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(180,60,60,0.1)", border: "0.5px solid rgba(180,60,60,0.3)", color: "#E08080", fontSize: 13, marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>
            {error}
          </div>
        )}

        {/* Output area */}
        {(output || loading) && (
          <div style={{
            borderRadius: 14, border: "0.5px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.025)", padding: 24, marginBottom: 16,
            animation: "fadeUp 0.4s ease"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ color: mode.accent, fontSize: 16 }}>{mode.symbol}</span>
              <span style={{ fontSize: 11, color: "#5A5650", letterSpacing: "0.15em", fontFamily: "'DM Mono', monospace" }}>
                {mode.name.toUpperCase()} RESPONSE
              </span>
              <div style={{ flex: 1 }} />
              {loading && !output && (
                <span style={{ fontSize: 11, color: "#5A5650", animation: "pulse 1.5s infinite", fontFamily: "'DM Mono', monospace" }}>
                  REACHING…
                </span>
              )}
            </div>

            {output ? (
              <TypewriterText text={output} speed={10} onDone={() => setDone(true)} />
            ) : (
              <div style={{ display: "flex", gap: 6, padding: "8px 0" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: mode.accent, animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            )}

            {done && (
              <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
                <button onClick={copy} style={{
                  background: "transparent", border: "0.5px solid rgba(255,255,255,0.12)",
                  borderRadius: 7, color: copied ? mode.accent : "#666", padding: "7px 14px",
                  cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono', monospace",
                  letterSpacing: "0.05em", transition: "all 0.2s"
                }}>
                  {copied ? "✓ COPIED" : "⌘ COPY"}
                </button>
                <button onClick={clear} style={{
                  background: "transparent", border: "0.5px solid rgba(255,255,255,0.12)",
                  borderRadius: 7, color: "#666", padding: "7px 14px",
                  cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono', monospace",
                  letterSpacing: "0.05em"
                }}>
                  ↺ NEW
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mode guide (empty state) */}
        {!output && !loading && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20, animation: "fadeUp 0.5s ease" }}>
            {[
              { label: "Ask", hint: "What makes consciousness possible?" },
              { label: "Explore", hint: "The feeling of Sunday evenings" },
              { label: "Examine", hint: "Is progress inevitable?" },
              { label: "Transform", hint: "A rainy afternoon in a strange city" }
            ].map((ex, i) => (
              <button key={i} onClick={() => setQuery(ex.hint)}
                style={{
                  background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.07)",
                  borderRadius: 10, padding: "12px 14px", cursor: "pointer", textAlign: "left",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = mode.border; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
              >
                <div style={{ fontSize: 10, color: mode.accent, letterSpacing: "0.15em", marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>
                  {ex.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 13, color: "#6A6258", fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
                  "{ex.hint}"
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ paddingBottom: 30, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#2A2820", letterSpacing: "0.15em", fontFamily: "'DM Mono', monospace" }}>
            POWERED BY CLAUDE · ANTHROPIC
          </div>
        </div>
      </div>
    </div>
  );
}
