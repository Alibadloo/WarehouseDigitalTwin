using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Hubs;
using WarehouseAPI.Models;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ShelvesController : ControllerBase
{
    private readonly WarehouseDbContext _ctx;
    private readonly IHubContext<WarehouseHub> _hub;

    public ShelvesController(WarehouseDbContext ctx, IHubContext<WarehouseHub> hub)
    {
        _ctx = ctx;
        _hub = hub;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var shelves = await _ctx.Shelves
            .Include(s => s.Items)
            .Select(s => new
            {
                s.Id, s.Code, s.Zone, s.Row, s.Column,
                s.MaxCapacity, s.Category, s.LastUpdated,
                CurrentCount = s.Items.Sum(i => i.Quantity),
                ItemCount = s.Items.Count,
                OccupancyPct = s.MaxCapacity > 0
                    ? (double)s.Items.Sum(i => i.Quantity) / s.MaxCapacity * 100
                    : 0.0
            })
            .ToListAsync();

        return Ok(shelves);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var shelf = await _ctx.Shelves
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (shelf == null) return NotFound();

        return Ok(new
        {
            shelf.Id, shelf.Code, shelf.Zone, shelf.Row, shelf.Column,
            shelf.MaxCapacity, shelf.Category, shelf.Notes, shelf.LastUpdated,
            CurrentCount = shelf.Items.Sum(i => i.Quantity),
            OccupancyPct = shelf.MaxCapacity > 0
                ? (double)shelf.Items.Sum(i => i.Quantity) / shelf.MaxCapacity * 100 : 0.0,
            Items = shelf.Items.Select(i => new
            {
                i.Id, i.SKU, i.Name, i.Category, i.Quantity, i.Weight,
                LastMoved = i.LastMoved.ToString("o")
            })
        });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var shelves = await _ctx.Shelves.Include(s => s.Items).ToListAsync();
        var totalItems = shelves.Sum(s => s.Items.Sum(i => i.Quantity));
        var totalCap = shelves.Sum(s => s.MaxCapacity);

        return Ok(new
        {
            TotalShelves = shelves.Count,
            EmptyShelves = shelves.Count(s => !s.Items.Any()),
            FullShelves = shelves.Count(s => s.MaxCapacity > 0 &&
                (double)s.Items.Sum(i => i.Quantity) / s.MaxCapacity >= 0.90),
            TotalItems = totalItems,
            TotalCapacity = totalCap,
            AvgOccupancyPct = totalCap > 0 ? (double)totalItems / totalCap * 100 : 0.0,
            Zones = shelves
                .GroupBy(s => s.Zone)
                .Select(g => new
                {
                    Zone = g.Key,
                    Shelves = g.Count(),
                    Items = g.Sum(s => s.Items.Sum(i => i.Quantity)),
                    Capacity = g.Sum(s => s.MaxCapacity),
                    Empty = g.Count(s => !s.Items.Any())
                })
                .OrderBy(z => z.Zone)
        });
    }

    [HttpPatch("{id:int}/notes")]
    public async Task<IActionResult> UpdateNotes(int id, [FromBody] NotesRequest req)
    {
        var shelf = await _ctx.Shelves.FindAsync(id);
        if (shelf == null) return NotFound();

        shelf.Notes = req.Notes ?? "";
        shelf.LastUpdated = DateTime.UtcNow;
        await _ctx.SaveChangesAsync();

        await _hub.Clients.Group("warehouse").SendAsync("ShelfUpdated", id);
        return Ok();
    }
}

public record NotesRequest(string? Notes);
