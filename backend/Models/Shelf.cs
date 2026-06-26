namespace WarehouseAPI.Models;

public class Shelf
{
    public int Id { get; set; }
    public string Code { get; set; } = "";        // A-0101, B-0203
    public string Zone { get; set; } = "";         // A, B, C
    public int Row { get; set; }                   // 1-5
    public int Column { get; set; }                // 1-4
    public int MaxCapacity { get; set; } = 50;
    public string Category { get; set; } = "";
    public string Notes { get; set; } = "";
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    public ICollection<Item> Items { get; set; } = new List<Item>();
}
