using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Hubs;
using WarehouseAPI.Models;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ItemsController : ControllerBase
{
    private readonly WarehouseDbContext _ctx;
    private readonly IHubContext<WarehouseHub> _hub;

    public ItemsController(WarehouseDbContext ctx, IHubContext<WarehouseHub> hub)
    {
        _ctx = ctx;
        _hub = hub;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await _ctx.Items
            .Include(i => i.Shelf)
            .Select(i => new
            {
                i.Id, i.SKU, i.Name, i.Category, i.Quantity, i.Weight,
                LastMoved = i.LastMoved.ToString("o"),
                ShelfCode = i.Shelf != null ? i.Shelf.Code : "",
                i.ShelfId
            })
            .ToListAsync();
        return Ok(items);
    }

    // ── CREATE ──────────────────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateItemRequest req)
    {
        var shelf = await _ctx.Shelves.Include(s => s.Items).FirstOrDefaultAsync(s => s.Id == req.ShelfId);
        if (shelf == null) return NotFound(new { error = "Shelf not found" });

        var current = shelf.Items.Sum(i => i.Quantity);
        if (current + req.Quantity > shelf.MaxCapacity)
            return BadRequest(new { error = $"Not enough space. Available: {shelf.MaxCapacity - current}" });

        var item = new Item
        {
            SKU = string.IsNullOrWhiteSpace(req.SKU)
                ? $"SKU-{shelf.Code}-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}"
                : req.SKU,
            Name = req.Name,
            Category = req.Category,
            Quantity = req.Quantity,
            Weight = req.Weight,
            ShelfId = req.ShelfId,
            LastMoved = DateTime.UtcNow
        };

        shelf.LastUpdated = DateTime.UtcNow;
        _ctx.Items.Add(item);
        await _ctx.SaveChangesAsync();

        await _hub.Clients.Group("warehouse").SendAsync("ShelfUpdated", req.ShelfId);
        return Ok(new { item.Id, item.SKU, item.Name, item.Category, item.Quantity, item.Weight, item.ShelfId });
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateItemRequest req)
    {
        var item = await _ctx.Items.FindAsync(id);
        if (item == null) return NotFound();

        if (req.Name != null) item.Name = req.Name;
        if (req.Category != null) item.Category = req.Category;
        if (req.SKU != null) item.SKU = req.SKU;
        if (req.Weight.HasValue) item.Weight = req.Weight.Value;

        if (req.Quantity.HasValue)
        {
            var shelf = await _ctx.Shelves.Include(s => s.Items).FirstOrDefaultAsync(s => s.Id == item.ShelfId);
            if (shelf != null)
            {
                var otherQty = shelf.Items.Where(i => i.Id != id).Sum(i => i.Quantity);
                if (otherQty + req.Quantity.Value > shelf.MaxCapacity)
                    return BadRequest(new { error = $"Not enough space. Available: {shelf.MaxCapacity - otherQty}" });
                shelf.LastUpdated = DateTime.UtcNow;
            }
            item.Quantity = req.Quantity.Value;
        }

        item.LastMoved = DateTime.UtcNow;
        await _ctx.SaveChangesAsync();

        await _hub.Clients.Group("warehouse").SendAsync("ShelfUpdated", item.ShelfId);
        return Ok(new { item.Id, item.Name, item.SKU, item.Category, item.Quantity, item.Weight });
    }

    // ── DELETE ──────────────────────────────────────────────────────────────
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _ctx.Items.FindAsync(id);
        if (item == null) return NotFound();

        int shelfId = item.ShelfId;
        var shelf = await _ctx.Shelves.FindAsync(shelfId);
        if (shelf != null) shelf.LastUpdated = DateTime.UtcNow;

        _ctx.Items.Remove(item);
        await _ctx.SaveChangesAsync();

        await _hub.Clients.Group("warehouse").SendAsync("ShelfUpdated", shelfId);
        return Ok(new { message = "Item deleted", id });
    }

    // ── MOVE ─────────────────────────────────────────────────────────────────
    [HttpPost("{itemId:int}/move/{toShelfId:int}")]
    public async Task<IActionResult> MoveItem(int itemId, int toShelfId, [FromBody] MoveRequest req)
    {
        var item = await _ctx.Items.Include(i => i.Shelf).FirstOrDefaultAsync(i => i.Id == itemId);
        var toShelf = await _ctx.Shelves.Include(s => s.Items).FirstOrDefaultAsync(s => s.Id == toShelfId);
        if (item == null || toShelf == null) return NotFound();

        var toCount = toShelf.Items.Where(i => i.Id != itemId).Sum(i => i.Quantity);
        int qty = req.Quantity > 0 ? req.Quantity : item.Quantity;
        if (toCount + qty > toShelf.MaxCapacity)
            return BadRequest(new { error = $"Not enough space. Available: {toShelf.MaxCapacity - toCount}" });

        int fromShelfId = item.ShelfId;
        _ctx.Movements.Add(new Movement
        {
            ItemId = item.Id, FromShelfId = fromShelfId, ToShelfId = toShelfId,
            Quantity = qty, Reason = req.Reason ?? "Manual move", Timestamp = DateTime.UtcNow
        });

        item.ShelfId = toShelfId;
        item.LastMoved = DateTime.UtcNow;

        var fromShelf = await _ctx.Shelves.FindAsync(fromShelfId);
        if (fromShelf != null) fromShelf.LastUpdated = DateTime.UtcNow;
        toShelf.LastUpdated = DateTime.UtcNow;

        await _ctx.SaveChangesAsync();
        await _hub.Clients.Group("warehouse").SendAsync("ShelfUpdated", fromShelfId);
        await _hub.Clients.Group("warehouse").SendAsync("ShelfUpdated", toShelfId);

        return Ok(new { message = "Item moved", fromShelfId, toShelfId });
    }

    // ── MOVEMENTS LOG ────────────────────────────────────────────────────────
    [HttpGet("movements")]
    public async Task<IActionResult> GetMovements([FromQuery] int limit = 50)
    {
        var movements = await _ctx.Movements
            .Include(m => m.Item).Include(m => m.FromShelf).Include(m => m.ToShelf)
            .OrderByDescending(m => m.Timestamp).Take(limit)
            .Select(m => new
            {
                m.Id,
                Item = m.Item != null ? m.Item.Name : "Unknown",
                From = m.FromShelf != null ? m.FromShelf.Code : "—",
                To = m.ToShelf != null ? m.ToShelf.Code : "—",
                m.Quantity, m.Reason,
                Timestamp = m.Timestamp.ToString("o")
            })
            .ToListAsync();
        return Ok(movements);
    }
}

public record MoveRequest(int Quantity, string? Reason);
public record CreateItemRequest(string Name, string SKU, string Category, int Quantity, double Weight, int ShelfId);
public record UpdateItemRequest(string? Name, string? SKU, string? Category, int? Quantity, double? Weight);
