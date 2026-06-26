from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import httpx
from .analyzer import analyze_warehouse, suggest_move, quick_tip
from .config import settings, get_active_model, set_active_model

app = FastAPI(title="Warehouse Digital Twin — AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request models ────────────────────────────────────────────────────────────

class ShelfInfo(BaseModel):
    id: int
    code: str
    zone: str
    row: int
    column: int
    maxCapacity: int
    currentCount: int
    occupancyPct: float
    category: str
    itemCount: int


class AnalyzeRequest(BaseModel):
    shelves: List[ShelfInfo]


class SuggestRequest(BaseModel):
    shelfCode: str
    items: List[dict]
    allShelves: List[ShelfInfo]


class ConfigUpdate(BaseModel):
    model: str


# ── Analysis routes ───────────────────────────────────────────────────────────

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    return await analyze_warehouse(req.shelves)


@app.post("/suggest-move")
async def suggest(req: SuggestRequest):
    return await suggest_move(req.shelfCode, req.items, req.allShelves)


@app.get("/tip")
async def tip():
    return await quick_tip()


# ── Ollama model management ───────────────────────────────────────────────────

@app.get("/models")
async def list_models():
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(f"{settings.ollama_base_url}/api/tags")
            data = r.json()
            models = [m["name"] for m in data.get("models", [])]
            return {"models": models, "active": get_active_model()}
    except Exception as e:
        return {"models": [], "active": get_active_model(), "error": str(e)}


@app.get("/config")
async def get_config():
    return {
        "model": get_active_model(),
        "ollama_url": settings.ollama_base_url,
    }


@app.put("/config")
async def update_config(req: ConfigUpdate):
    # Verify the model exists in Ollama before switching
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(f"{settings.ollama_base_url}/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
            if req.model not in models:
                raise HTTPException(400, f"Model '{req.model}' not found in Ollama")
    except HTTPException:
        raise
    except Exception:
        pass  # If Ollama unreachable, allow the change anyway

    set_active_model(req.model)
    return {"message": f"Model updated to {req.model}", "model": req.model}


# ── Ollama connectivity check ─────────────────────────────────────────────────

@app.get("/ollama-status")
async def ollama_status():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{settings.ollama_base_url}/api/tags")
            data = r.json()
            models = [m["name"] for m in data.get("models", [])]
            return {"online": True, "model_count": len(models), "models": models}
    except Exception as e:
        return {"online": False, "error": str(e)}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "active_model": get_active_model(),
        "ollama": settings.ollama_base_url,
    }
