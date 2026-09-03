const path = require('path');
const express = require('express');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DB_FILE = path.join(ROOT, 'leads.db');

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    raw_note   TEXT NOT NULL,
    name       TEXT,
    whatsapp   TEXT,
    company    TEXT,
    need       TEXT,
    product    TEXT,
    tier       TEXT,
    status     TEXT DEFAULT 'new',
    notes      TEXT
  )
`);

const app = express();
app.use(express.json({ limit: '1mb' }));

const stats = {
  insert: db.prepare(`INSERT INTO leads (raw_note) VALUES (?)`),
  insertParsed: db.prepare(`
    INSERT INTO leads (raw_note, name, whatsapp, company, need, product, tier, notes)
    VALUES (@raw_note, @name, @whatsapp, @company, @need, @product, @tier, @notes)
  `),
  all: db.prepare(`SELECT * FROM leads ORDER BY id DESC`),
  byId: db.prepare(`SELECT * FROM leads WHERE id = ?`),
  patch: db.prepare(`
    UPDATE leads SET
      name = COALESCE(@name, name),
      whatsapp = COALESCE(@whatsapp, whatsapp),
      company = COALESCE(@company, company),
      need = COALESCE(@need, need),
      product = COALESCE(@product, product),
      tier = COALESCE(@tier, tier),
      status = COALESCE(@status, status),
      notes = COALESCE(@notes, notes)
    WHERE id = @id
  `),
  del: db.prepare(`DELETE FROM leads WHERE id = ?`),
  counts: db.prepare(`SELECT COUNT(*) AS total FROM leads`),
};

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/leads', (req, res) => {
  const rows = stats.all.all();
  res.json({ total: rows.length, leads: rows });
});

app.post('/api/leads', (req, res) => {
  const note = (req.body && (req.body.raw_note || req.body.note || '').trim()) || '';
  if (!note) return res.status(400).json({ error: 'raw_note is required' });

  const info = stats.insert.run(note);
  const lead = stats.byId.get(info.lastInsertRowid);
  res.status(201).json({ ok: true, lead });
});

app.patch('/api/leads/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!stats.byId.get(id)) return res.status(404).json({ error: 'lead not found' });
  const b = req.body || {};
  stats.patch.run({
    id,
    name: b.name ?? null, whatsapp: b.whatsapp ?? null, company: b.company ?? null,
    need: b.need ?? null, product: b.product ?? null, tier: b.tier ?? null,
    status: b.status ?? null, notes: b.notes ?? null,
  });
  res.json({ ok: true, lead: stats.byId.get(id) });
});

app.delete('/api/leads/:id', (req, res) => {
  const id = Number(req.params.id);
  stats.del.run(id);
  res.json({ ok: true });
});

app.use(express.static(ROOT));

app.listen(PORT, () => {
  console.log(`Incentric booth server running at http://localhost:${PORT}`);
  console.log(`Lead DB: ${DB_FILE}`);
});
