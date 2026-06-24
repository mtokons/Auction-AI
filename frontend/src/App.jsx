import { useState, useEffect } from 'react';
import { Search, Loader2, ArrowRight, Activity, MapPin, Building, AlertTriangle, ShieldCheck, Euro } from 'lucide-react';

const API_BASE = 'https://auction-ai-proxy.mhasnainn.workers.dev';

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/properties`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (e) {
      console.error("Failed to fetch properties:", e);
    } finally {
      setLoadingProps(false);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/analyze-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze');
      
      setResult(data);
      // Refresh properties list to show the newly added one
      fetchProperties();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ paddingBottom: '4rem' }}>
      {/* HEADER */}
      <header style={{ padding: '1.5rem 5%', borderBottom: '1px solid var(--dark-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span className="font-serif text-gold" style={{ fontSize: '1.8rem' }}>PropClear</span>
          <span className="font-mono text-gold-light" style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.7 }}>Intelligence Platform</span>
        </div>
        <div className="pill" style={{ background: 'rgba(184, 146, 42, 0.1)', color: 'var(--gold-light)' }}>
          <Activity size={14} className="text-gold" /> Live
        </div>
      </header>

      {/* HERO / SEARCH SECTION */}
      <section style={{ padding: '6rem 5% 4rem', textAlign: 'center', background: 'radial-gradient(circle at 50% 0%, rgba(184,146,42,0.1) 0%, transparent 60%)' }}>
        <h1 className="font-serif animate-fade-up" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', color: '#fff', marginBottom: '1rem', lineHeight: 1.1 }}>
          Analyze any German<br/>auction property instantly.
        </h1>
        <p className="animate-fade-up font-mono" style={{ color: 'var(--dark-muted)', fontSize: '0.85rem', marginBottom: '3rem', animationDelay: '0.1s' }}>
          Paste a link from DIIA.de or supported sources. Our AI extracts legal terms, runs risk analysis, and estimates true value.
        </p>

        <form onSubmit={handleAnalyze} className="animate-fade-up glass" style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', gap: '0.5rem', padding: '0.5rem', borderRadius: '12px', animationDelay: '0.2s' }}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={20} style={{ position: 'absolute', left: '1rem', color: 'var(--dark-muted)' }} />
            <input 
              type="url" 
              className="input-glass" 
              style={{ border: 'none', paddingLeft: '3rem', background: 'transparent' }} 
              placeholder="https://www.diia.de/?thema=auctions..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0 2rem' }}>
            {loading ? <><Loader2 size={18} className="spin-slow" /> Analyzing...</> : <><Activity size={18} /> Analyze</>}
          </button>
        </form>

        {error && (
          <div className="animate-fade-up" style={{ marginTop: '2rem', color: 'var(--red)', background: 'rgba(176,48,48,0.1)', display: 'inline-flex', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(176,48,48,0.3)' }}>
            <AlertTriangle size={18} style={{ marginRight: '0.5rem' }} /> {error}
          </div>
        )}
      </section>

      {/* RESULT VIEW */}
      {result && (
        <section className="animate-fade-up" style={{ padding: '0 5%', maxWidth: '1000px', margin: '0 auto 4rem' }}>
          <div className="glass-gold" style={{ padding: '2rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span className={`pill ${result.decision === 'BUY' ? 'pill-buy' : result.decision === 'CAUTION' ? 'pill-caution' : 'pill-avoid'}`}>
                    {result.decision}
                  </span>
                  <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--dark-muted)', border: '1px solid var(--dark-border)', padding: '0.35rem 0.75rem', borderRadius: '20px' }}>
                    Score: {result.investment_score}/10
                  </span>
                </div>
                <h2 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>{result.title_en}</h2>
                <div className="font-mono" style={{ display: 'flex', gap: '1.5rem', color: 'var(--dark-muted)', fontSize: '0.75rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14}/> {result.location}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Building size={14}/> {result.property_type}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="text-gold font-mono" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Est. True Value</div>
                <div className="font-serif text-gold-light" style={{ fontSize: '2.5rem' }}>{result.estimated_true_value?.split(' ')[0] || 'N/A'}</div>
              </div>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: '2rem', fontSize: '0.95rem' }}>
              {result.summary}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Pros & Cons */}
              <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                <h3 className="font-mono text-gold" style={{ fontSize: '0.8rem', marginBottom: '1rem', textTransform: 'uppercase' }}>Strengths & Risks</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {result.pros?.map((pro, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                      <span style={{ color: '#81c784' }}>✓</span> {pro}
                    </div>
                  ))}
                  {result.cons?.map((con, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: i === 0 ? '0.5rem' : '0' }}>
                      <span style={{ color: '#ef9a9a' }}>✗</span> {con}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal Terms */}
              <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                <h3 className="font-mono text-gold" style={{ fontSize: '0.8rem', marginBottom: '1rem', textTransform: 'uppercase' }}>Legal Flags</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {result.legal_terms?.map((lt, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span className="font-mono text-gold-light" style={{ fontSize: '0.75rem' }}>{lt.de}</span>
                        <span className={`pill ${lt.status === 'OK' ? 'pill-buy' : lt.status === 'CHECK' ? 'pill-caution' : 'pill-avoid'}`} style={{ padding: '0.1rem 0.4rem', fontSize: '0.55rem' }}>{lt.status}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{lt.explanation}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* LEADERBOARD SECTION */}
      <section style={{ padding: '2rem 5%', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '2rem', borderBottom: '1px solid var(--dark-border)', paddingBottom: '1rem' }}>
          <div>
            <h2 className="font-serif" style={{ fontSize: '2.5rem', color: '#fff' }}>Market Database</h2>
            <p className="font-mono" style={{ color: 'var(--dark-muted)', fontSize: '0.75rem' }}>Automatically ranked by AI investment score.</p>
          </div>
          <div className="font-mono text-gold" style={{ fontSize: '0.8rem' }}>{properties.length} Properties Analyzed</div>
        </div>

        {loadingProps ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--dark-muted)' }}>
            <Loader2 size={32} className="spin-slow" style={{ margin: '0 auto 1rem' }} />
            <p className="font-mono">Loading rankings...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {properties.map((p, idx) => (
              <div key={idx} className="glass" style={{ padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.2s ease', cursor: 'pointer' }} onClick={() => setResult(p)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className={`pill ${p.decision === 'BUY' ? 'pill-buy' : p.decision === 'CAUTION' ? 'pill-caution' : 'pill-avoid'}`}>
                    {p.decision}
                  </span>
                  <span className="font-serif text-gold-light" style={{ fontSize: '1.5rem' }}>{p.investment_score}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '0.25rem', lineHeight: 1.3 }}>{p.title_en}</h3>
                  <div className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--dark-muted)' }}>{p.location}</div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--dark-border)' }}>
                  <div style={{ flex: 1 }}>
                    <div className="font-mono" style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--dark-muted)', marginBottom: '0.2rem' }}>Est. Value</div>
                    <div className="text-gold font-mono" style={{ fontSize: '0.75rem' }}>{p.estimated_true_value?.split(' ')[0] || 'N/A'}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="font-mono" style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--dark-muted)', marginBottom: '0.2rem' }}>Legal Score</div>
                    <div className="text-gold font-mono" style={{ fontSize: '0.75rem' }}>{p.legal_score}/10</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
