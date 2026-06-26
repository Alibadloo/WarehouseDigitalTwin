# Warehouse Digital Twin

A real-time 3D interactive warehouse visualization system — built with **React Three Fiber**, **C# .NET**, and **Python AI (Ollama)**.

---

## Features

- **Live 3D Map** — 60 shelves across 3 zones rendered in real-time WebGL
- **Color-coded occupancy** — instantly see empty, low, medium, high, and critical shelves
- **Click to inspect** — select any shelf to view its contents, SKUs, quantities, and weights
- **AI Analysis** — Ollama analyses the entire warehouse and suggests optimization moves
- **AI Move Suggestions** — click any shelf and ask AI where to move its contents
- **Filter views** — show only empty / warning / critical shelves
- **SignalR live updates** — shelf state reflects changes in real time
- **Auto-refresh** every 30 seconds

---

## Architecture

```
┌─────────────────────────────────────┐
│         React Frontend (3004)        │
│  React Three Fiber · Redux Toolkit  │
│  OrbitControls · Shelf3D Meshes     │
└──────────────┬──────────────────────┘
               │ HTTP / SignalR WS
┌──────────────▼──────────────────────┐
│       C# .NET API (5052)             │
│  ASP.NET Core · EF Core · SignalR   │
│  SQLite → Shelves, Items, Movements │
└──────────────┬──────────────────────┘
               │ HTTP (analyze / suggest)
┌──────────────▼──────────────────────┐
│       Python AI Service (8002)       │
│  FastAPI · Ollama · llama3.2        │
│  Warehouse analysis & suggestions   │
└─────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| .NET SDK | 8.0+ |
| Node.js | 18+ |
| Python | 3.10+ |
| [Ollama](https://ollama.com) | latest |

---

### 1. Start Ollama

```bash
ollama serve
ollama pull llama3.2
```

---

### 2. Start C# Backend

```bash
cd backend
dotnet restore
dotnet run
```

API runs at: `http://localhost:5052`

On first run it creates `warehouse.db` with seed data — 60 shelves across 3 zones with realistic items.

---

### 3. Start Python AI Service

```bash
cd ai-service

# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python -m venv venv
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

AI service runs at: `http://localhost:8002`

---

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:3004`

---

## API Reference

### C# Backend (`localhost:5052`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/shelves` | All shelves with occupancy data |
| `GET` | `/api/shelves/{id}` | Shelf detail with items |
| `GET` | `/api/shelves/stats` | Warehouse-level statistics |
| `GET` | `/api/items` | All items |
| `POST` | `/api/items/{id}/move/{toShelfId}` | Move item to another shelf |
| `GET` | `/api/items/movements` | Recent movement log |

### Python AI Service (`localhost:8002`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze` | Full warehouse AI analysis |
| `POST` | `/suggest-move` | Suggest destination for shelf contents |
| `GET` | `/tip` | Random warehouse management tip |
| `GET` | `/health` | Service health check |

---

## 3D Controls

| Action | Control |
|--------|---------|
| Rotate view | Left mouse drag |
| Zoom | Scroll wheel |
| Pan | Right mouse drag |
| Select shelf | Left click |
| Deselect | Click selected shelf again |

---

## Color Legend

| Color | Meaning |
|-------|---------|
| Dark gray | Empty (0%) |
| Blue | Low (1–30%) |
| Green | Medium (30–60%) |
| Amber | High (60–90%) |
| Red | Critical (>90%) |
| Pink | Selected shelf |
| Yellow | AI-highlighted shelf |

---

## Project Structure

```
WarehouseDigitalTwin/
├── backend/                    # C# .NET 8 API
│   ├── Models/                 # Shelf, Item, Movement
│   ├── Data/                   # EF Core DbContext + Seed
│   ├── Controllers/            # REST endpoints
│   ├── Hubs/                   # SignalR hub
│   └── Program.cs
│
├── ai-service/                 # Python FastAPI + Ollama
│   └── app/
│       ├── main.py             # FastAPI routes
│       ├── analyzer.py         # Ollama analysis logic
│       └── config.py
│
└── frontend/                   # React + Vite
    └── src/
        ├── components/
        │   ├── warehouse/      # 3D scene, ShelfMesh, Floor
        │   └── ui/             # StatsBar, ShelfPanel, AIPanel, Legend
        ├── store/              # Redux Toolkit
        └── types/
```

---

## Tech Stack

`React 18` `TypeScript` `React Three Fiber` `Three.js` `Redux Toolkit` `C# .NET 8` `ASP.NET Core` `Entity Framework` `SQLite` `SignalR` `Python` `FastAPI` `Ollama` `llama3.2`

---

MIT © [Alibadloo](https://github.com/Alibadloo)
