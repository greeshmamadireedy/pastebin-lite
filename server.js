const express = require("express");
const db = require("./db");

const app = express();
const PORT = 3000;

/* ===== Middleware ===== */
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* ===== Deterministic Time Helper ===== */
function getNow(req) {
  if (
    process.env.TEST_MODE === "1" &&
    req.headers["x-test-now-ms"]
  ) {
    return parseInt(req.headers["x-test-now-ms"]);
  }
  return Date.now();
}

/* ===== Health Check ===== */
app.get("/api/healthz", (req, res) => {
  res.json({ ok: true });
});

/* ===== Create Paste ===== */
app.post("/api/pastes", (req, res) => {
  const content = req.body.content;
  const maxViews = req.body.max_views || null;
  const ttlSeconds = req.body.ttl_seconds || null;

  if (!content || typeof content !== "string") {
    return res.status(400).json({ error: "Invalid content" });
  }

  const id = Date.now().toString();
  const createdAt = getNow(req);
  const expiresAt = ttlSeconds
    ? createdAt + ttlSeconds * 1000
    : null;

  db.run(
    `INSERT INTO pastes (id, content, created_at, expires_at, max_views)
     VALUES (?, ?, ?, ?, ?)`,
    [id, content, createdAt, expiresAt, maxViews],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      res.json({
        id: id,
        url: `http://localhost:${PORT}/p/${id}`
      });
    }
  );
});

/* ===== Get Paste (API) ===== */
app.get("/api/pastes/:id", (req, res) => {
  const id = req.params.id;

  db.get(
    `SELECT content, views, max_views, expires_at
     FROM pastes WHERE id = ?`,
    [id],
    (err, row) => {
      if (!row) {
        return res.status(404).json({ error: "Not found" });
      }

      // TTL check
      if (row.expires_at !== null && getNow(req) > row.expires_at) {
        return res.status(404).json({ error: "Not found" });
      }

      // View limit check
      if (row.max_views !== null && row.views >= row.max_views) {
        return res.status(404).json({ error: "Not found" });
      }

      // Increase views
      db.run(`UPDATE pastes SET views = views + 1 WHERE id = ?`, [id]);

      res.json({
        content: row.content,
        remaining_views:
          row.max_views !== null
            ? row.max_views - (row.views + 1)
            : null,
        expires_at: row.expires_at
          ? new Date(row.expires_at).toISOString()
          : null
      });
    }
  );
});

/* ===== View Paste (HTML) ===== */
app.get("/p/:id", (req, res) => {
  const id = req.params.id;

  db.get(
    `SELECT content, views, max_views, expires_at
     FROM pastes WHERE id = ?`,
    [id],
    (err, row) => {
      if (!row) {
        return res.status(404).send("Paste not found");
      }

      // TTL check
      if (row.expires_at !== null && getNow(req) > row.expires_at) {
        return res.status(404).send("Paste not found");
      }

      // View limit check
      if (row.max_views !== null && row.views >= row.max_views) {
        return res.status(404).send("Paste not found");
      }

      // Increase views
      db.run(`UPDATE pastes SET views = views + 1 WHERE id = ?`, [id]);

      res.send(`
        <html>
          <body>
            <pre>${row.content.replace(/</g, "&lt;")}</pre>
          </body>
        </html>
      `);
    }
  );
});

/* ===== Simple Test Page ===== */
app.get("/test", (req, res) => {
  res.send(`
    <h2>Create Paste (Test Page)</h2>
    <form method="POST" action="/api/pastes">
      <textarea name="content" rows="5" cols="40"></textarea><br/><br/>
      <input type="number" name="max_views" placeholder="Max Views (optional)" /><br/><br/>
      <input type="number" name="ttl_seconds" placeholder="TTL seconds (optional)" /><br/><br/>
      <button type="submit">Create Paste</button>
    </form>
  `);
});

/* ===== Start Server ===== */
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
