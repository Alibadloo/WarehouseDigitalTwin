namespace WarehouseAPI.Models;

public class Item
{
    public int Id { get; set; }
    public string SKU { get; set; } = "";
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public int Quantity { get; set; }
    public double Weight { get; set; }
    public int ShelfId { get; set; }
    public Shelf? Shelf { get; set; }
    public DateTime LastMoved { get; set; } = DateTime.UtcNow;
}
