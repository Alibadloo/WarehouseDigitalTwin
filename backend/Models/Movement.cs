namespace WarehouseAPI.Models;

public class Movement
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public Item? Item { get; set; }
    public int? FromShelfId { get; set; }
    public int? ToShelfId { get; set; }
    public Shelf? FromShelf { get; set; }
    public Shelf? ToShelf { get; set; }
    public int Quantity { get; set; }
    public string Reason { get; set; } = "";
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
