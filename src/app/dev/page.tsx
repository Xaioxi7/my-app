'use client';

import { useState } from 'react';

export default function DevPage() {
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function addSampleTask() {
    setBusy(true);
    setOut(null);
    try {
      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Add a task: review BIO 230 notes tomorrow 9am' }
          ]
        })
      });
      const json = await res.json();
      setOut(json);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Dev Test</h1>
      <p>Click to ask AI to create a task.</p>
      <button onClick={addSampleTask} disabled={busy}>
        {busy ? 'Working…' : 'Add sample task'}
      </button>
      <pre style={{ marginTop: 16, background:'#f6f6f6', padding:12, borderRadius:8 }}>
        {out ? JSON.stringify(out, null, 2) : 'No output yet'}
      </pre>
    </main>
  );
}
