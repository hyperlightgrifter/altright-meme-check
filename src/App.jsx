import { useState, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK SETUP — Google Forms integration
//
// To collect feedback in a Google Sheet:
// 1. Go to forms.google.com and create a new form.
// 2. Add these fields (Short Answer for all):
//      - "Analysis result" (what the tool said)
//      - "User disagreement" (why they disagree)
//      - "Content type" (image / text / url)
//      - "Additional comments"
// 3. Click the three-dot menu → "Get pre-filled link"
// 4. Fill each field with a dummy value, click "Get link", copy it.
// 5. From that URL, extract the "entry.XXXXXXXXX" IDs for each field.
// 6. Replace FORM_ID below with your form's ID (from the form URL).
// 7. Replace the entry.XXXXXXXXX values in submitFeedback() below.
// 8. In Google Forms, click Responses → Link to Sheets to auto-populate a spreadsheet.
//
// The form must have "Collect email addresses" OFF and be set to public.
// ─────────────────────────────────────────────────────────────────────────────
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/YOUR_FORM_ID_HERE/formResponse";

// Field entry IDs — replace these after creating your form (see instructions above)
const FORM_FIELDS = {
  analysisResult:  "entry.000000001",   // replace with real entry ID
  userDisagreement:"entry.000000002",
  contentType:     "entry.000000003",
  comments:        "entry.000000004",
};

const SYSTEM_PROMPT = `You are an expert analyst specializing in far-right extremism, white supremacist movements, fascist ideology, and online radicalization in the United States. Your knowledge base draws from research by the Southern Poverty Law Center (SPLC), Anti-Defamation League (ADL), Global Project Against Hate and Extremism (GPAHE), Political Research Associates, the RAND Corporation, academic scholarship in extremism studies and the sociology of hate movements, and primary-source monitoring organizations like SITE Intelligence and Moonshot CVE.

When analyzing content for far-right, white supremacist, or fascist ideological coding in the US context, examine the following categories:

NUMERICAL CODES: 88 (HH = Heil Hitler), 14 (14 Words), 1488, 18 (AB = Aryan Brotherhood), 28 (Blood and Honour), 43 (Hammerskins), 311 (KKK), 4/19 (Oklahoma City date, patriot movement), 5150 (accelerationist). Roman numerals: III% / Three Percenters, IV%.

VISUAL SYMBOLS: Nazi/neo-Nazi: swastika, SS bolts, Iron Cross, Black Sun (Schwarze Sonne), Death's Head, Reichsadler, Sig rune, Othala rune, Wolfsangel, Triskele. White nationalist: Sonnenrad variants, Celtic cross with circle, Valknut, Thor's Hammer (Mjolnir with 88), Confederate battle flag variants. Accelerationist/neo-fascist: Atomwaffen imagery, SIEGE aesthetic, bowl cut (Dylan Roof tribute), skull masks. Far-right militia: III% symbols, Oath Keepers logos, Proud Boys RWDS insignia, Patriot Front fasces, American Identity Movement lambda. Alt-right: Pepe the Frog in political contexts, NPC meme weaponization. Pseudo-Norse/neo-pagan: Odinist/Wotanist rune combinations. Christian nationalism: cross variants with nationalist imagery.

LINGUISTIC MARKERS: Explicit white power: white genocide, great replacement, ZOG, globalists (antisemitic dog whistle), Lugenpresse, based and redpilled, race traitor, mud people. Accelerationist: accelerate, RAHOWA, Day of the Rope, Turner Diaries references, SIEGE culture, leaderless resistance, lone wolf, boogaloo, civil war 2. Militia/patriot: 1776 will commence again, molon labe, III%, constitutional sheriff, sovereign citizen terminology. Antisemitic: globalist, banksters, Rothschild, Soros (conspiratorial), dual loyalty, Jewish Question (JQ), Holocaust denial language. Christian nationalist: Christian nation, dominionism, Seven Mountains Mandate, spiritual warfare (political context). Incel-to-radicalization: black pill, red pill (radicalization context) combined with race. Neo-Confederate: Heritage not hate (context), Lost Cause mythology. Irony/deniability: just asking questions, deliberate misspellings, satire claims, clown world.

MOVEMENT IDENTIFIERS: KKK: AKIA, kloran terminology. Neo-Nazis: AWD/Atomwaffen Division, NSM, O9A references, National Alliance. Alt-right: NPI, VDARE, American Renaissance, TRS/The Right Stuff, Daily Stormer. Patriot/militia: Oath Keepers, Three Percenters, Proud Boys, American Guard, Rise Above Movement. Christian nationalism: Christian Identity, Covenant Sword and Arm of the Lord. Accelerationist: The Base, Sonnenkrieg Division.

CONTEXTUAL INDICATORS: Dehumanizing language (vermin, infestation, invasion, replacement, parasite). Replacement/invasion framing. Calls for violence framed as hypothetical. Red-pilling rhetoric. Nostalgia for fascist regimes. Anti-government extremism combined with racial hierarchy. Dog whistles adopted after mainstream bans.

IMPORTANT: Be precise and evidence-based. Distinguish explicit content, coded language, and ambiguous content. Note when context is insufficient. Do NOT over-flag ambiguous content. Be careful with counter-extremism, educational, journalistic, or artistic contexts.

Write your output for a general audience with no background in extremism research. Avoid jargon. When you must use a technical term, briefly explain it in plain language in parentheses. Write the summary and context fields as if explaining to a curious, intelligent person who has never studied this topic. Be direct but not alarmist. If something is ambiguous, say so plainly.

For citations: include real, stable URLs to authoritative sources. Preferred sources and their URL patterns:
- ADL Hate Symbols Database: https://www.adl.org/resources/hate-symbol/[symbol-name]
- ADL Glossary: https://www.adl.org/resources/glossary-term/[term]
- SPLC Extremist Files: https://www.splcenter.org/fighting-hate/extremist-files/
- SPLC Hatewatch: https://www.splcenter.org/hatewatch
- SPLC Ideology pages: https://www.splcenter.org/fighting-hate/extremist-files/ideology/[ideology]
- GPAHE: https://globalextremism.org/
- Moonshot CVE: https://moonshotcve.com/resources/
- RAND: https://www.rand.org/topics/extremism.html
- Political Research Associates: https://politicalresearch.org/
- DOJ Domestic Terrorism resources: https://www.justice.gov/domestic-terrorism
Only include URLs you are confident are real and stable. If unsure of a specific URL, use the root domain URL for that organization instead of guessing a subpath.

Respond ONLY with a valid JSON object. No preamble, no explanation outside the JSON, no markdown fences. Use only ASCII-safe characters in all string values. Do not use smart quotes, em dashes, curly apostrophes, or any non-ASCII unicode in JSON strings. Keep all string values concise. The JSON must be complete and valid.

Required structure:
{
  "overall_risk": "none",
  "confidence": 85,
  "summary": "plain language summary in 2-3 sentences written for a general audience",
  "findings": [
    {
      "category": "short plain-English category name",
      "severity": "low",
      "indicators": ["indicator one", "indicator two"],
      "context": "plain-language explanation of what this means and why it matters, with citation markers like [1] where relevant. Define any technical terms used.",
      "source_label": "e.g. ADL Hate Symbols Database",
      "source_url": "https://www.adl.org/resources/hate-symbol/88"
    }
  ],
  "citations": [
    {
      "id": 1,
      "label": "short title of source",
      "url": "https://...",
      "org": "ADL"
    }
  ],
  "plausible_deniability_detected": false,
  "deniability_notes": null,
  "movement_associations": ["movement name"],
  "recommended_actions": ["action one"],
  "limitations": "important caveats in plain language"
}

overall_risk must be one of: none, low, moderate, high, severe
severity must be one of: low, moderate, high
Keep indicators arrays to 5 items or fewer per finding. Keep findings to 6 or fewer total.
The citations array should contain all sources referenced across all findings, deduplicated, numbered from 1.
In context fields, reference citations as [1], [2] etc. matching the citations array ids.`;

// ── Palette ───────────────────────────────────────────────────────────────────
const T = { 50:"#E1F5EE", 100:"#9FE1CB", 200:"#5DCAA5", 400:"#1D9E75", 600:"#0F6E56", 800:"#085041" };
const C = { 50:"#FAECE7", 100:"#F5C4B3", 200:"#F0997B", 400:"#D85A30", 600:"#993C1D" };
const A = { 50:"#FAEEDA", 100:"#FAC775", 400:"#BA7517", 600:"#854F0B" };

const riskColors = {
  none:     { bg:"#EAF3DE", text:"#27500A", border:"#639922", label:"No indicators found" },
  low:      { bg:"#E6F1FB", text:"#0C447C", border:"#378ADD", label:"Low risk" },
  moderate: { bg:"#FAEEDA", text:"#633806", border:"#BA7517", label:"Moderate risk" },
  high:     { bg:"#FCEBEB", text:"#791F1F", border:"#E24B4A", label:"High risk" },
  severe:   { bg:"#FAECE7", text:"#4A1B0C", border:"#D85A30", label:"Severe — explicit content" },
};
const severityBadge = {
  low:      { bg:"#E6F1FB", text:"#0C447C" },
  moderate: { bg:"#FAEEDA", text:"#633806" },
  high:     { bg:"#FCEBEB", text:"#791F1F" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function Badge({ level }) {
  const s = severityBadge[level] || severityBadge.low;
  return (
    <span style={{
      background:s.bg, color:s.text, fontSize:11, fontWeight:500,
      padding:"2px 8px", borderRadius:4, textTransform:"uppercase", letterSpacing:"0.05em"
    }}>{level}</span>
  );
}

function CitedText({ text, citations }) {
  if (!text || !citations?.length) return <span>{text}</span>;
  return (
    <span>
      {text.split(/(\[\d+\])/g).map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        if (m) {
          const cit = citations.find(c => c.id === parseInt(m[1]));
          if (cit?.url) return (
            <a key={i} href={cit.url} title={cit.label + " (" + cit.org + ")"} style={{
              fontSize:10, verticalAlign:"super", lineHeight:0,
              color:T[600], textDecoration:"none",
              border:"0.5px solid "+T[100], borderRadius:3,
              padding:"0 3px", marginLeft:1, fontWeight:500
            }}>{m[1]}</a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function RiskMeter({ level, confidence }) {
  const c = riskColors[level] || riskColors.none;
  const levels = ["none","low","moderate","high","severe"];
  const idx = levels.indexOf(level);
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{
        background:c.bg, border:"1.5px solid "+c.border,
        borderRadius:10, padding:"16px 20px",
        display:"flex", alignItems:"center", justifyContent:"space-between"
      }}>
        <div>
          <div style={{ fontSize:11, color:c.text, fontWeight:500, marginBottom:2, opacity:0.75, letterSpacing:"0.07em", textTransform:"uppercase" }}>Result</div>
          <div style={{ fontSize:22, fontWeight:500, color:c.text }}>{c.label}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:11, color:c.text, opacity:0.75, marginBottom:2, letterSpacing:"0.07em", textTransform:"uppercase" }}>Confidence</div>
          <div style={{ fontSize:22, fontWeight:500, color:c.text }}>{confidence}%</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:4, marginTop:8 }}>
        {levels.map((l,i) => (
          <div key={l} style={{ flex:1, height:5, borderRadius:3, background:i<=idx ? riskColors[l].border : "var(--color-border-tertiary)" }}/>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
        {levels.map(l => <span key={l} style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>{l}</span>)}
      </div>
    </div>
  );
}

function parseJSON(raw) {
  let s = raw.replace(/```json\n?|\n?```/g,"").trim();
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON object found");
  s = m[0].replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"");
  return JSON.parse(s);
}

const FALLBACK = {
  overall_risk:"low", confidence:40,
  summary:"The analysis ran but the response could not be read correctly. Please try again, or try with shorter content.",
  findings:[], citations:[], plausible_deniability_detected:false, deniability_notes:null,
  movement_associations:[],
  recommended_actions:["Try running the analysis again. If the problem continues, try pasting shorter text."],
  limitations:"Something went wrong reading the response — these results are incomplete."
};

// ── Buttons ───────────────────────────────────────────────────────────────────
function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      marginTop:18, padding:"13px 24px", fontSize:15, fontWeight:500,
      borderRadius:9, cursor:disabled?"not-allowed":"pointer",
      background:disabled?"#c8ddd8":T[400], color:disabled?"#7aa89e":"#fff",
      border:"none", width:"100%", letterSpacing:"0.01em"
    }}
      onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.background=T[600]; }}
      onMouseLeave={e=>{ if(!disabled) e.currentTarget.style.background=T[400]; }}
    >{children}</button>
  );
}

function GhostBtn({ onClick, children, style: extraStyle }) {
  return (
    <button onClick={onClick} style={{
      padding:"10px 18px", fontSize:13, cursor:"pointer",
      border:"1.5px solid "+T[200], borderRadius:8,
      background:"transparent", color:T[600], fontWeight:500,
      ...extraStyle
    }}
      onMouseEnter={e=>{ e.currentTarget.style.background=T[50]; }}
      onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}
    >{children}</button>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:"7px 16px", fontSize:13, cursor:"pointer", borderRadius:6,
      border:active?"2px solid "+T[400]:"1px solid var(--color-border-tertiary)",
      background:active?T[50]:"transparent",
      color:active?T[600]:"var(--color-text-secondary)",
      fontWeight:active?500:400
    }}>{children}</button>
  );
}

// ── Feedback modal ────────────────────────────────────────────────────────────
function FeedbackModal({ onClose, analysisResult, contentType }) {
  const [disagreement, setDisagreement] = useState("");
  const [comments, setComments]         = useState("");
  const [status, setStatus]             = useState("idle"); // idle | sending | done | error

  const submit = async () => {
    if (!disagreement.trim()) return;
    setStatus("sending");
    try {
      const body = new FormData();
      body.append(FORM_FIELDS.analysisResult,   analysisResult || "");
      body.append(FORM_FIELDS.userDisagreement, disagreement);
      body.append(FORM_FIELDS.contentType,      contentType || "");
      body.append(FORM_FIELDS.comments,         comments);

      // Google Forms accepts cross-origin POST via no-cors fetch
      await fetch(GOOGLE_FORM_URL, { method:"POST", mode:"no-cors", body });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    // Backdrop — normal-flow faux viewport so iframe height is respected
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,0.45)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"20px"
    }}>
      <div style={{
        background:"var(--color-background-primary)",
        borderRadius:14, padding:"28px 26px", maxWidth:480, width:"100%",
        border:"0.5px solid var(--color-border-tertiary)"
      }}>
        {status === "done" ? (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ fontSize:36, marginBottom:12 }}>✓</div>
            <div style={{ fontSize:18, fontWeight:500, color:T[600], marginBottom:8 }}>
              Thanks for the feedback
            </div>
            <div style={{ fontSize:14, color:"var(--color-text-secondary)", lineHeight:1.65, marginBottom:24 }}>
              Your response has been recorded and will be reviewed to help improve accuracy over time.
            </div>
            <GhostBtn onClick={onClose} style={{ width:"100%" }}>Close</GhostBtn>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
              <div>
                <div style={{ fontSize:17, fontWeight:500, color:"var(--color-text-primary)", marginBottom:4 }}>
                  Disagree with this result?
                </div>
                <div style={{ fontSize:13, color:"var(--color-text-secondary)", lineHeight:1.6 }}>
                  This tool makes mistakes. Sharing what it got wrong helps improve it over time.
                </div>
              </div>
              <button onClick={onClose} style={{
                background:"none", border:"none", cursor:"pointer", fontSize:20,
                color:"var(--color-text-tertiary)", lineHeight:1, padding:"0 0 0 12px", flexShrink:0
              }}>x</button>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", display:"block", marginBottom:6 }}>
                What did the tool get wrong? <span style={{ color:C[400] }}>*</span>
              </label>
              <textarea
                value={disagreement}
                onChange={e=>setDisagreement(e.target.value)}
                placeholder="e.g. This is a well-known gaming symbol, not a hate symbol. The number 88 here refers to a car model..."
                rows={4}
                style={{
                  width:"100%", resize:"vertical", fontSize:13,
                  border:"1px solid "+T[100], borderRadius:8,
                  padding:"9px 11px", boxSizing:"border-box",
                  background:"var(--color-background-secondary)",
                  color:"var(--color-text-primary)", lineHeight:1.6, outline:"none"
                }}
                onFocus={e=>e.target.style.border="1.5px solid "+T[400]}
                onBlur={e=>e.target.style.border="1px solid "+T[100]}
              />
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", display:"block", marginBottom:6 }}>
                Anything else to add? (optional)
              </label>
              <textarea
                value={comments}
                onChange={e=>setComments(e.target.value)}
                placeholder="Any other context that might help us understand the content..."
                rows={2}
                style={{
                  width:"100%", resize:"vertical", fontSize:13,
                  border:"1px solid "+T[100], borderRadius:8,
                  padding:"9px 11px", boxSizing:"border-box",
                  background:"var(--color-background-secondary)",
                  color:"var(--color-text-primary)", lineHeight:1.6, outline:"none"
                }}
                onFocus={e=>e.target.style.border="1.5px solid "+T[400]}
                onBlur={e=>e.target.style.border="1px solid "+T[100]}
              />
            </div>

            {status === "error" && (
              <div style={{ fontSize:12, color:"#791F1F", marginBottom:12 }}>
                Something went wrong submitting. Please try again.
              </div>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <GhostBtn onClick={onClose} style={{ flex:1 }}>Cancel</GhostBtn>
              <button onClick={submit} disabled={!disagreement.trim() || status==="sending"} style={{
                flex:2, padding:"10px 18px", fontSize:14, fontWeight:500,
                borderRadius:8, cursor:disagreement.trim()?"pointer":"not-allowed",
                background:disagreement.trim()?T[400]:"#c8ddd8",
                color:disagreement.trim()?"#fff":"#7aa89e",
                border:"none"
              }}
                onMouseEnter={e=>{ if(disagreement.trim()) e.currentTarget.style.background=T[600]; }}
                onMouseLeave={e=>{ if(disagreement.trim()) e.currentTarget.style.background=T[400]; }}
              >
                {status==="sending" ? "Sending..." : "Send feedback"}
              </button>
            </div>

            <div style={{ marginTop:14, fontSize:11, color:"var(--color-text-tertiary)", lineHeight:1.6 }}>
              Feedback is anonymous. The content you analyzed is not stored — only your written response is collected.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode]           = useState("image");
  const [input, setInput]         = useState("");
  const [imageData, setImageData] = useState(null);
  const [imageType, setImageType] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const fileRef = useRef();

  const handleFile = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImageData(ev.target.result.split(",")[1]);
      setImageType(file.type);
      setInput(file.name);
    };
    reader.readAsDataURL(file);
  }, []);

  const analyze = useCallback(async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      let userContent;
      if (mode==="image" && imageData) {
        userContent = [
          { type:"image", source:{ type:"base64", media_type:imageType, data:imageData } },
          { type:"text",  text:"Analyze this image for far-right, white supremacist, or fascist ideological coding. Examine all visual elements, text, symbols, gestures, clothing, and colors." }
        ];
      } else if (mode==="url") {
        userContent = "Analyze the following for far-right ideological coding. Since I cannot fetch the URL directly, analyze any text, handles, hashtags, or content described: " + input;
      } else {
        userContent = "Analyze the following social media post text for far-right, white supremacist, or fascist ideological coding:\n\n" + input;
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:4000,
          system:SYSTEM_PROMPT,
          messages:[{ role:"user", content:userContent }]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "API error");
      const raw = data.content?.map(b=>b.text||"").join("").trim();
      let parsed;
      try { parsed = parseJSON(raw); } catch { parsed = FALLBACK; }
      if (!parsed.citations) parsed.citations = [];
      setResult(parsed);
    } catch(err) {
      setError("Something went wrong: " + (err.message||"Please try again."));
    } finally {
      setLoading(false);
    }
  }, [mode, input, imageData, imageType]);

  const reset = () => {
    setResult(null); setInput(""); setImageData(null);
    setImageType(null); setError(null); setShowFeedback(false);
    if (fileRef.current) fileRef.current.value="";
  };

  const canAnalyze = (mode==="image" ? !!imageData : input.trim().length>0) && !loading;
  const citations  = result?.citations || [];

  // Summary string passed to feedback form
  const analysisResultStr = result
    ? result.overall_risk + " risk — " + (result.summary||"").slice(0,200)
    : "";

  return (
    <div style={{ fontFamily:"var(--font-sans)", maxWidth:700, margin:"0 auto" }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div style={{
        background:"linear-gradient(135deg, "+T[400]+" 0%, "+T[200]+" 60%, "+C[200]+" 100%)",
        borderRadius:14, padding:"32px 28px 28px", marginBottom:24, color:"#fff"
      }}>
        <div style={{
          display:"inline-block", background:"rgba(255,255,255,0.22)",
          borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:500,
          letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14
        }}>Free community tool</div>
        <h1 style={{ fontSize:26, fontWeight:500, margin:"0 0 12px", lineHeight:1.25, color:"#fff" }}>
          Does this meme have a hidden meaning?
        </h1>
        <p style={{ fontSize:15, margin:"0 0 8px", lineHeight:1.75, color:"rgba(255,255,255,0.92)" }}>
          Far-right and white supremacist activists often hide racist or extremist messages inside memes, images, and videos — using symbols and in-jokes that look harmless to outsiders.
        </p>
        <p style={{ fontSize:15, margin:0, lineHeight:1.75, color:"rgba(255,255,255,0.92)" }}>
          Upload a screenshot or paste some text below. You will get a plain-English explanation of anything suspicious, with links to research sources so you can learn more.
        </p>
      </div>

      <div style={{ padding:"0 4px" }}>

        {/* ── How it works ─────────────────────────────────────── */}
        {!result && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:24 }}>
            {[
              { num:"1", color:T[400], light:T[50],  label:"Upload or paste",    desc:"A screenshot, image, or the text of a post" },
              { num:"2", color:C[400], light:C[50],  label:"AI checks it",       desc:"Against a database of known symbols and coded language" },
              { num:"3", color:A[400], light:A[50],  label:"Get a plain report", desc:"With sources so you can verify and learn more" },
            ].map(s => (
              <div key={s.num} style={{
                background:s.light, border:"0.5px solid "+s.color+"44",
                borderRadius:10, padding:"14px 14px 12px"
              }}>
                <div style={{
                  width:26, height:26, borderRadius:"50%", background:s.color,
                  color:"#fff", fontSize:13, fontWeight:500,
                  display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10
                }}>{s.num}</div>
                <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:12, color:"var(--color-text-secondary)", lineHeight:1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Input panel ──────────────────────────────────────── */}
        {!result && (
          <div style={{
            background:"var(--color-background-primary)",
            border:"1.5px solid "+T[100], borderRadius:12, padding:"22px 20px"
          }}>
            <div style={{ display:"flex", gap:8, marginBottom:18 }}>
              {[
                { id:"image", label:"Image or screenshot" },
                { id:"text",  label:"Post text" },
                { id:"url",   label:"URL or username" },
              ].map(t => (
                <TabBtn key={t.id} active={mode===t.id} onClick={()=>{ setMode(t.id); reset(); }}>
                  {t.label}
                </TabBtn>
              ))}
            </div>

            {mode==="image" && (
              <div onClick={()=>fileRef.current?.click()} style={{
                border:"1.5px dashed "+T[200], borderRadius:10,
                padding:"38px 20px", textAlign:"center", cursor:"pointer", background:T[50]
              }}
                onMouseEnter={e=>e.currentTarget.style.background=T[100]+"55"}
                onMouseLeave={e=>e.currentTarget.style.background=T[50]}
              >
                {imageData ? (
                  <>
                    <div style={{ fontSize:14, fontWeight:500, color:T[600], marginBottom:4 }}>{input}</div>
                    <div style={{ fontSize:12, color:T[400] }}>Click to choose a different file</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:28, marginBottom:8, color:T[400] }}>+</div>
                    <div style={{ fontSize:14, color:T[600], marginBottom:5, fontWeight:500 }}>Click to upload an image or screenshot</div>
                    <div style={{ fontSize:12, color:T[400] }}>JPG, PNG, GIF, or WebP</div>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }}/>
              </div>
            )}

            {mode==="text" && (
              <textarea value={input} onChange={e=>setInput(e.target.value)}
                placeholder={"Paste the text of the post, comment, caption, or username here.\n\nExamples: a caption under a meme, a tweet, a YouTube comment, a Telegram post, a username or bio."}
                rows={6}
                style={{
                  width:"100%", resize:"vertical", fontSize:14,
                  border:"1px solid "+T[100], borderRadius:8,
                  padding:"10px 12px", background:"var(--color-background-secondary)",
                  color:"var(--color-text-primary)", boxSizing:"border-box", lineHeight:1.6, outline:"none"
                }}
                onFocus={e=>e.target.style.border="1.5px solid "+T[400]}
                onBlur={e=>e.target.style.border="1px solid "+T[100]}
              />
            )}

            {mode==="url" && (
              <>
                <input value={input} onChange={e=>setInput(e.target.value)}
                  placeholder="Paste a link, username, or hashtag — then describe what you saw..."
                  style={{
                    width:"100%", fontSize:14, marginBottom:10,
                    border:"1px solid "+T[100], borderRadius:8,
                    padding:"10px 12px", background:"var(--color-background-secondary)",
                    color:"var(--color-text-primary)", boxSizing:"border-box", outline:"none"
                  }}
                  onFocus={e=>e.target.style.border="1.5px solid "+T[400]}
                  onBlur={e=>e.target.style.border="1px solid "+T[100]}
                />
                <div style={{ fontSize:12, color:"var(--color-text-tertiary)", lineHeight:1.6 }}>
                  This tool cannot open links directly. For the best results, also paste the text of the post or describe what you saw.
                </div>
              </>
            )}

            <PrimaryBtn onClick={analyze} disabled={!canAnalyze}>
              {loading ? "Checking..." : "Check this content"}
            </PrimaryBtn>
          </div>
        )}

        {loading && (
          <div style={{ textAlign:"center", padding:"44px 0", color:"var(--color-text-secondary)", fontSize:14 }}>
            <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid "+T[100], borderTopColor:T[400], margin:"0 auto 16px", animation:"spin 0.9s linear infinite" }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ fontWeight:500, marginBottom:6 }}>Checking against known symbols and coded language...</div>
            <div style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>This usually takes 10–20 seconds</div>
          </div>
        )}

        {error && (
          <div style={{
            background:"#FCEBEB", border:"0.5px solid #E24B4A",
            borderRadius:8, padding:"12px 16px", fontSize:13, color:"#791F1F", marginTop:12
          }}>{error}</div>
        )}

        {/* ── Results ──────────────────────────────────────────── */}
        {result && (
          <div>
            <RiskMeter level={result.overall_risk} confidence={result.confidence}/>

            <div style={{
              background:"var(--color-background-secondary)", borderRadius:10,
              padding:"16px 18px", marginBottom:20,
              border:"0.5px solid var(--color-border-tertiary)",
              fontSize:15, lineHeight:1.75, color:"var(--color-text-primary)"
            }}>
              <CitedText text={result.summary} citations={citations}/>
            </div>

            {result.plausible_deniability_detected && (
              <div style={{
                background:A[50], border:"0.5px solid "+A[400],
                borderRadius:10, padding:"14px 16px", marginBottom:20,
                fontSize:13, color:A[600], lineHeight:1.65
              }}>
                <strong style={{ fontWeight:500 }}>Note: this content may be using "plausible deniability."</strong>
                {" "}This is a common tactic where extremist content is designed to look like a joke or innocent image so the creator can deny its meaning if challenged.{" "}
                <CitedText text={result.deniability_notes} citations={citations}/>
              </div>
            )}

            {result.movement_associations?.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
                  Possible connections to
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {result.movement_associations.map((m,i) => (
                    <span key={i} style={{
                      background:T[50], border:"0.5px solid "+T[200],
                      borderRadius:5, padding:"4px 12px", fontSize:13, color:T[600]
                    }}>{m}</span>
                  ))}
                </div>
              </div>
            )}

            {result.findings?.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>
                  Findings
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {result.findings.map((f,i) => (
                    <div key={i} style={{
                      background:"var(--color-background-primary)",
                      border:"0.5px solid var(--color-border-tertiary)",
                      borderLeft:"3px solid "+T[400],
                      borderRadius:8, padding:"14px 16px"
                    }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <span style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)" }}>{f.category}</span>
                        <Badge level={f.severity}/>
                      </div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
                        {(f.indicators||[]).map((ind,j) => (
                          <span key={j} style={{
                            background:T[50], border:"0.5px solid "+T[100],
                            borderRadius:4, padding:"2px 8px", fontSize:12,
                            color:T[600], fontFamily:"var(--font-mono)"
                          }}>{ind}</span>
                        ))}
                      </div>
                      <div style={{ fontSize:13, color:"var(--color-text-secondary)", lineHeight:1.75, marginBottom:8 }}>
                        <CitedText text={f.context} citations={citations}/>
                      </div>
                      {f.source_url
                        ? <a href={f.source_url} style={{ fontSize:12, color:T[400], textDecoration:"none", fontWeight:500 }}>
                            {f.source_label||"Source"} {">"}
                          </a>
                        : f.source_label
                          ? <div style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>Source: {f.source_label}</div>
                          : null
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.recommended_actions?.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
                  What you can do
                </div>
                <div style={{
                  background:T[50], border:"0.5px solid "+T[100],
                  borderRadius:10, padding:"14px 16px",
                  display:"flex", flexDirection:"column", gap:8
                }}>
                  {result.recommended_actions.map((a,i) => (
                    <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", fontSize:13, color:"var(--color-text-primary)", lineHeight:1.65 }}>
                      <span style={{ color:T[400], marginTop:2, flexShrink:0, fontWeight:500 }}>{">"}</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {citations.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>
                  Sources and further reading
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  {citations.map(c => (
                    <div key={c.id} style={{ display:"flex", gap:10, alignItems:"flex-start", fontSize:13 }}>
                      <span style={{
                        flexShrink:0, width:20, height:20, background:T[50], color:T[600],
                        border:"0.5px solid "+T[200], borderRadius:3,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:10, fontWeight:500
                      }}>{c.id}</span>
                      <div style={{ lineHeight:1.5 }}>
                        <span style={{ color:"var(--color-text-tertiary)", fontSize:12 }}>{c.org} — </span>
                        {c.url
                          ? <a href={c.url} style={{ color:T[400], textDecoration:"none", fontWeight:500 }}>{c.label}</a>
                          : <span style={{ color:"var(--color-text-primary)" }}>{c.label}</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.limitations && (
              <div style={{
                background:"var(--color-background-secondary)", borderRadius:8,
                padding:"12px 14px", border:"0.5px solid var(--color-border-tertiary)",
                fontSize:12, color:"var(--color-text-secondary)", lineHeight:1.65, marginBottom:20
              }}>
                <strong style={{ fontWeight:500, color:"var(--color-text-primary)" }}>Keep in mind: </strong>
                {result.limitations}
              </div>
            )}

            {/* ── Action row ── */}
            <div style={{ display:"flex", gap:10, marginBottom:8 }}>
              <GhostBtn onClick={reset} style={{ flex:1 }}>Check something else</GhostBtn>
              <button onClick={()=>setShowFeedback(true)} style={{
                flex:1, padding:"10px 18px", fontSize:13, cursor:"pointer",
                border:"1.5px solid "+C[200], borderRadius:8,
                background:"transparent", color:C[600], fontWeight:500
              }}
                onMouseEnter={e=>{ e.currentTarget.style.background=C[50]; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}
              >
                Disagree with this result?
              </button>
            </div>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────── */}
        <div style={{
          marginTop:32, paddingTop:16,
          borderTop:"0.5px solid var(--color-border-tertiary)",
          fontSize:11, color:"var(--color-text-tertiary)", lineHeight:1.8
        }}>
          <div style={{ fontWeight:500, color:"var(--color-text-secondary)", marginBottom:6 }}>About this tool</div>
          <p style={{ margin:"0 0 8px" }}>
            For general awareness and educational purposes only. Not a replacement for expert human review. Analysis draws on published research and resources from the Southern Poverty Law Center (SPLC), the Anti-Defamation League (ADL), the Global Project Against Hate and Extremism (GPAHE), Moonshot CVE, Political Research Associates, the RAND Corporation, and academic scholarship in the fields of extremism studies, sociology of hate movements, and radicalization research.
          </p>
          <p style={{ margin:0, paddingTop:8, borderTop:"0.5px solid var(--color-border-tertiary)" }}>
            <strong style={{ fontWeight:500, color:"var(--color-text-secondary)" }}>AI disclosure: </strong>
            Analysis on this page is generated by{" "}
            <a href="https://www.anthropic.com/claude" style={{ color:T[400], textDecoration:"none", fontWeight:500 }}>Claude AI</a>
            {" "}(Anthropic). The research frameworks and prompting were developed independently as a personal project. AI models can make mistakes — treat results as a starting point, not a final verdict. When in doubt, consult the primary sources linked above or reach out to a specialist organization.
          </p>
        </div>
      </div>

      {/* ── Feedback modal (rendered outside scroll flow) ─────── */}
      {showFeedback && (
        <FeedbackModal
          onClose={()=>setShowFeedback(false)}
          analysisResult={analysisResultStr}
          contentType={mode}
        />
      )}
    </div>
  );
}
