import httpx
import json
from .config import settings, get_active_model


async def _ask_ollama(prompt: str, timeout: float = 45.0) -> str:
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={"model": get_active_model(), "prompt": prompt, "stream": False},
            )
            return r.json().get("response", "")
    except Exception:
        return ""


def _extract_json(text: str) -> dict | None:
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except Exception:
            pass
    return None


async def analyze_warehouse(shelves: list) -> dict:
    empty = [s for s in shelves if s.currentCount == 0]
    overfull = [s for s in shelves if s.occupancyPct >= 90]
    total_items = sum(s.currentCount for s in shelves)
    total_cap = sum(s.maxCapacity for s in shelves)

    zone_stats: dict[str, dict] = {}
    for s in shelves:
        z = s.zone
        if z not in zone_stats:
            zone_stats[z] = {"items": 0, "cap": 0, "empty": 0}
        zone_stats[z]["items"] += s.currentCount
        zone_stats[z]["cap"] += s.maxCapacity
        if s.currentCount == 0:
            zone_stats[z]["empty"] += 1

    zone_summary = {
        z: f"{v['items']}/{v['cap']} ({v['items'] / max(v['cap'], 1) * 100:.0f}% full, {v['empty']} empty)"
        for z, v in zone_stats.items()
    }

    empty_codes = ", ".join(s.code for s in empty[:6])
    full_codes = ", ".join(s.code for s in overfull[:6])

    prompt = f"""You are a warehouse management AI. Give 3 concise actionable recommendations.

Data:
- Total shelves: {len(shelves)} | Empty: {len(empty)} | >90% full: {len(overfull)}
- Fill: {total_items}/{total_cap} ({total_items/max(total_cap,1)*100:.0f}%)
- Zones: {json.dumps(zone_summary)}
- Empty shelves: {empty_codes}
- Overfull: {full_codes}

Return ONLY valid JSON:
{{
  "overall_health": "GOOD|WARNING|CRITICAL",
  "summary": "one sentence",
  "recommendations": [
    {{"priority": "HIGH|MEDIUM|LOW", "action": "...", "reason": "...", "shelves": ["code"]}}
  ]
}}"""

    text = await _ask_ollama(prompt)
    data = _extract_json(text)
    if data and "recommendations" in data:
        return data

    health = "CRITICAL" if len(empty) > 15 else ("WARNING" if len(empty) > 5 else "GOOD")
    recs = []
    if empty:
        recs.append({"priority": "HIGH", "action": f"Fill {len(empty)} empty shelves",
                     "reason": "Unused capacity", "shelves": [s.code for s in empty[:4]]})
    if overfull:
        recs.append({"priority": "HIGH", "action": f"Redistribute {len(overfull)} overloaded shelves",
                     "reason": "Above 90% — overflow risk", "shelves": [s.code for s in overfull[:4]]})
    best_zone = max(zone_stats, key=lambda z: zone_stats[z]["empty"], default="A")
    recs.append({"priority": "MEDIUM", "action": f"Route incoming stock to Zone {best_zone}",
                 "reason": "Most available space", "shelves": []})

    return {
        "overall_health": health,
        "summary": f"Warehouse {total_items/max(total_cap,1)*100:.0f}% full, {len(empty)} empty shelves.",
        "recommendations": recs[:3],
    }


async def suggest_move(shelf_code: str, items: list, all_shelves: list) -> dict:
    if not items:
        return {"suggestions": [], "reason": "Shelf is empty"}

    item_summary = "\n".join(
        f"- {i.get('name','?')} qty:{i.get('quantity',0)} cat:{i.get('category','?')}"
        for i in items[:5]
    )
    available = [s for s in all_shelves if s.zone != shelf_code[0] and s.occupancyPct < 70][:6]
    avail_str = ", ".join(f"{s.code}({s.occupancyPct:.0f}%)" for s in available)

    prompt = f"""Warehouse AI: where to move items from shelf {shelf_code}?

Items: {item_summary}
Available shelves: {avail_str or 'none'}

Return ONLY JSON:
{{"suggestions":[{{"targetShelf":"code","reason":"why"}}],"priority":"HIGH|MEDIUM|LOW"}}"""

    text = await _ask_ollama(prompt, timeout=30)
    data = _extract_json(text)
    if data and "suggestions" in data:
        return data

    if available:
        return {"suggestions": [{"targetShelf": available[0].code,
                                  "reason": f"{100-available[0].occupancyPct:.0f}% free space"}],
                "priority": "MEDIUM"}
    return {"suggestions": [], "reason": "No suitable shelves found"}


async def quick_tip() -> dict:
    tips = [
        "Heavy items on lower shelves (Row 4-5) reduce injury risk.",
        "Fast-moving SKUs near zone entrances cut picking time by 30%.",
        "Group items by category to reduce picker travel distance.",
        "Shelves above 90% capacity risk overflow — redistribute now.",
        "Audit shelves idle 30+ days for obsolete stock.",
        "Use Zone B (center) for cross-docking — equidistant from all sides.",
        "Label empty shelves with expected category to prevent misplacement.",
    ]
    import random
    return {"tip": random.choice(tips)}
