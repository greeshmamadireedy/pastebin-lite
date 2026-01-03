# Pastebin Lite

A simple Pastebin-like application built using Node.js, Express, and SQLite.

Users can create text pastes and share a unique URL to view them.
Pastes can optionally expire after a given time (TTL) or after a maximum
number of views.

---

## Features

- Create a paste with arbitrary text
- Get a shareable URL for the paste
- View a paste via browser or API
- Optional time-based expiry (TTL)
- Optional view-count limit
- Deterministic time support for automated testing
- Persistent storage using SQLite

---

## Tech Stack

- Node.js
- Express.js
- SQLite (persistent database)

---

## API Endpoints

### Health Check
GET /api/healthz  
Returns `{ "ok": true }`

### Create Paste
POST /api/pastes  

Request body (JSON):
```json
{
  "content": "Hello World",
  "ttl_seconds": 60,
  "max_views": 5
}
