using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using WarehouseAPI.Data;
using WarehouseAPI.Hubs;
using WarehouseAPI.Models;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly WarehouseDbContext _ctx;
    private readonly IHubContext<WarehouseHub> _hub;

    public AdminController(WarehouseDbContext ctx, IHubContext<WarehouseHub> hub)
    {
        _ctx = ctx;
        _hub = hub;
    }

    // ── RESET ─────────────────────────────────────────────────────────────
    // mode=empty  → wipe everything, start blank
    // mode=seed   → wipe + reload sample data
    [HttpPost("reset")]
    public async Task<IActionResult> Reset([FromQuery] string mode = "empty")
    {
        _ctx.Movements.RemoveRange(_ctx.Movements);
        _ctx.Items.RemoveRange(_ctx.Items);
        _ctx.Shelves.RemoveRange(_ctx.Shelves);
        await _ctx.SaveChangesAsync();

        if (mode == "seed")
            SeedData.Initialize(_ctx);

        await _hub.Clients.Group("warehouse").SendAsync("WarehouseReset");

        var stats = await BuildStats();
        return Ok(new { message = mode == "seed" ? "Reset with sample data" : "Warehouse cleared", stats });
    }

    // ── EXPORT ────────────────────────────────────────────────────────────
    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var shelves = await _ctx.Shelves.Include(s => s.Items).ToListAsync();
        var payload = shelves.Select(s => new
        {
            s.Code, s.Zone, s.Row, s.Column, s.MaxCapacity, s.Category, s.Notes,
            Items = s.Items.Select(i => new
            {
                i.SKU, i.Name, i.Category, i.Quantity, i.Weight
            })
        });

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true });
        return File(System.Text.Encoding.UTF8.GetBytes(json),
                    "application/json",
                    $"warehouse-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}.json");
    }

    // ── IMPORT ────────────────────────────────────────────────────────────
    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] List<ImportShelfDto> data)
    {
        if (data == null || data.Count == 0)
            return BadRequest(new { error = "No data provided" });

        // Clear existing
        _ctx.Items.RemoveRange(_ctx.Items);
        _ctx.Shelves.RemoveRange(_ctx.Shelves);
        await _ctx.SaveChangesAsync();

        int shelfId = 1, itemId = 1;
        foreach (var s in data)
        {
            var shelf = new Shelf
            {
                Id = shelfId, Code = s.Code, Zone = s.Zone, Row = s.Row,
                Column = s.Column, MaxCapacity = s.MaxCapacity,
                Category = s.Category, Notes = s.Notes ?? "",
                LastUpdated = DateTime.UtcNow
            };
            _ctx.Shelves.Add(shelf);

            foreach (var i in s.Items ?? [])
            {
                _ctx.Items.Add(new Item
                {
                    Id = itemId++, SKU = i.SKU, Name = i.Name, Category = i.Category,
                    Quantity = i.Quantity, Weight = i.Weight,
                    ShelfId = shelfId, LastMoved = DateTime.UtcNow
                });
            }
            shelfId++;
        }

        await _ctx.SaveChangesAsync();
        await _hub.Clients.Group("warehouse").SendAsync("WarehouseReset");

        return Ok(new { message = $"Imported {shelfId - 1} shelves", shelfCount = shelfId - 1 });
    }

    // ── SHELF CRUD ────────────────────────────────────────────────────────
    [HttpPost("shelves")]
    public async Task<IActionResult> AddShelf([FromBody] AddShelfRequest req)
    {
        var code = $"{req.Zone}-{req.Row:D2}{req.Column:D2}";
        if (await _ctx.Shelves.AnyAsync(s => s.Code == code))
            return Conflict(new { error = $"Shelf {code} already exists" });

        var shelf = new Shelf
        {
            Code = code, Zone = req.Zone.ToUpper(), Row = req.Row,
            Column = req.Column, MaxCapacity = req.MaxCapacity,
            Category = req.Category, LastUpdated = DateTime.UtcNow
        };
        _ctx.Shelves.Add(shelf);
        await _ctx.SaveChangesAsync();

        await _hub.Clients.Group("warehouse").SendAsync("WarehouseReset");
        return Ok(new { shelf.Id, shelf.Code, shelf.Zone, shelf.Row, shelf.Column, shelf.MaxCapacity, shelf.Category });
    }

    [HttpPut("shelves/{id:int}")]
    public async Task<IActionResult> UpdateShelf(int id, [FromBody] UpdateShelfRequest req)
    {
        var shelf = await _ctx.Shelves.FindAsync(id);
        if (shelf == null) return NotFound();

        if (req.MaxCapacity.HasValue) shelf.MaxCapacity = req.MaxCapacity.Value;
        if (req.Category != null) shelf.Category = req.Category;
        if (req.Notes != null) shelf.Notes = req.Notes;
        shelf.LastUpdated = DateTime.UtcNow;

        await _ctx.SaveChangesAsync();
        await _hub.Clients.Group("warehouse").SendAsync("ShelfUpdated", id);
        return Ok();
    }

    [HttpDelete("shelves/{id:int}")]
    public async Task<IActionResult> DeleteShelf(int id)
    {
        var shelf = await _ctx.Shelves.Include(s => s.Items).FirstOrDefaultAsync(s => s.Id == id);
        if (shelf == null) return NotFound();
        if (shelf.Items.Any())
            return BadRequest(new { error = "Cannot delete shelf with items. Remove items first." });

        _ctx.Shelves.Remove(shelf);
        await _ctx.SaveChangesAsync();
        await _hub.Clients.Group("warehouse").SendAsync("WarehouseReset");
        return Ok(new { message = "Shelf deleted" });
    }

    // ── STATS (private helper) ────────────────────────────────────────────
    private async Task<object> BuildStats()
    {
        var shelves = await _ctx.Shelves.Include(s => s.Items).ToListAsync();
        return new
        {
            TotalShelves = shelves.Count,
            TotalItems = shelves.Sum(s => s.Items.Sum(i => i.Quantity)),
            EmptyShelves = shelves.Count(s => !s.Items.Any())
        };
    }
}

public class ImportShelfDto
{
    public string Code { get; set; } = "";
    public string Zone { get; set; } = "";
    public int Row { get; set; }
    public int Column { get; set; }
    public int MaxCapacity { get; set; } = 50;
    public string Category { get; set; } = "";
    public string? Notes { get; set; }
    public List<ImportItemDto> Items { get; set; } = [];
}

public class ImportItemDto
{
    public string SKU { get; set; } = "";
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public int Quantity { get; set; }
    public double Weight { get; set; }
}

public record AddShelfRequest(string Zone, int Row, int Column, int MaxCapacity, string Category);
public record UpdateShelfRequest(int? MaxCapacity, string? Category, string? Notes);
