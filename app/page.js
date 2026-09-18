'use client';

import { useState } from 'react';

const initialForm = {
  name: '',
  role: '',
  experience: '',
  goal: '',
  strengths: '',
  challenge: ''
};

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setReport(null);
    setCopied(false);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not generate report');
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setReport(null);
    setError('');
    setCopied(false);
  }

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(report.report);
    setCopied(true);
  }

  return (
    <main className="shell">
      <section className="hero">
        <span className="badge">AI CAREER REPORT</span>
        <h1>Turn your goals into a practical growth plan.</h1>
        <p>Answer six quick questions and get a personalized report with strengths, gaps, a 30-day plan and next steps.</p>
      </section>

      <section className="grid">
        <form className="card form" onSubmit={submit} aria-busy={loading}>
          <h2>Your profile</h2>

          <label htmlFor="name">Name<input id="name" name="name" value={form.name} onChange={update} placeholder="Teja" autoComplete="name" required /></label>
          <label htmlFor="role">Current role<input id="role" name="role" value={form.role} onChange={update} placeholder="Software Engineer" required /></label>
          <label htmlFor="experience">Years of experience<input id="experience" name="experience" value={form.experience} onChange={update} placeholder="2.5" inputMode="decimal" required /></label>
          <label htmlFor="goal">Career goal<textarea id="goal" name="goal" value={form.goal} onChange={update} placeholder="Move into an AI engineering role..." required /></label>
          <label htmlFor="strengths">Main strengths<textarea id="strengths" name="strengths" value={form.strengths} onChange={update} placeholder="Backend, APIs, React, shipping fast..." required /></label>
          <label htmlFor="challenge">Biggest challenge<textarea id="challenge" name="challenge" value={form.challenge} onChange={update} placeholder="Need stronger ML system design and portfolio proof..." required /></label>

          <button type="submit" disabled={loading}>{loading ? 'Generating your plan...' : 'Generate my report'}</button>
          {loading && <p className="status" role="status">Reviewing your profile and shaping practical next steps.</p>}
          {error && <p className="error" role="alert">{error}</p>}
        </form>

        <section className="card result">
          {!report ? (
            <div className="empty">
              <div className="orb">AI</div>
              <h2>Your report appears here</h2>
              <p>The output is generated on the server so the API key never reaches the browser.</p>
            </div>
          ) : (
            <>
              <div className="resultHead">
                <div>
                  <span className="badge">PERSONALIZED REPORT</span>
                  <h2>{report.title}</h2>
                </div>
                <span className="mode">{report.provider}</span>
              </div>
              <Report text={report.report} />
              <div className="resultActions">
                <button type="button" className="secondaryButton" onClick={copyReport}>{copied ? 'Copied' : 'Copy report'}</button>
                <button type="button" className="textButton" onClick={resetForm}>Start over</button>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

function Report({ text }) {
  return (
    <div className="reportText">
      {text.split('\n').map((line, index) => {
        const clean = line.trim();
        if (!clean) return <div key={index} className="spacer" />;
        if (clean.startsWith('## ')) return <h3 key={index}>{clean.slice(3)}</h3>;
        if (clean.startsWith('- ')) return <p key={index} className="bullet">• {clean.slice(2)}</p>;
        return <p key={index}>{clean}</p>;
      })}
    </div>
  );
}
