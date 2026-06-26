using WarehouseAPI.Models;

namespace WarehouseAPI.Data;

public static class SeedData
{
    public static void Initialize(WarehouseDbContext ctx)
    {
        if (ctx.Shelves.Any()) return;

        var rng = new Random(42);
        var shelves = new List<Shelf>();
        var items = new List<Item>();

        string[] zones = ["A", "B", "C"];
        string[][] zoneCategories =
        [
            ["Electronics", "Computers", "Cables"],
            ["Food & Beverage", "Packaging", "Chemicals"],
            ["Clothing", "Tools", "Automotive"]
        ];
        string[] itemTypes = ["Box", "Package", "Container", "Pallet", "Crate", "Unit"];

        int shelfId = 1, itemId = 1;

        for (int zi = 0; zi < zones.Length; zi++)
        {
            var zone = zones[zi];
            var cats = zoneCategories[zi];

            for (int row = 1; row <= 5; row++)
            {
                for (int col = 1; col <= 4; col++)
                {
                    var cat = cats[rng.Next(cats.Length)];
                    var maxCap = 20 + rng.Next(0, 50);

                    var shelf = new Shelf
                    {
                        Id = shelfId++,
                        Code = $"{zone}-{row:D2}{col:D2}",
                        Zone = zone,
                        Row = row,
                        Column = col,
                        MaxCapacity = maxCap,
                        Category = cat,
                        LastUpdated = DateTime.UtcNow.AddMinutes(-rng.Next(0, 1440))
                    };
                    shelves.Add(shelf);

                    // 30% chance empty, otherwise 1-3 item types
                    if (rng.NextDouble() <= 0.70)
                    {
                        int itemCount = rng.Next(1, 4);
                        for (int k = 0; k < itemCount; k++)
                        {
                            int qty = rng.Next(1, Math.Max(2, maxCap / itemCount));
                            items.Add(new Item
                            {
                                Id = itemId++,
                                SKU = $"SKU-{zone}{row:D2}{col:D2}-{rng.Next(1000, 9999)}",
                                Name = $"{cat} {itemTypes[rng.Next(itemTypes.Length)]} #{rng.Next(100, 999)}",
                                Category = cat,
                                Quantity = qty,
                                Weight = Math.Round(0.5 + rng.NextDouble() * 49.5, 1),
                                ShelfId = shelf.Id,
                                LastMoved = DateTime.UtcNow.AddHours(-rng.Next(1, 720))
                            });
                        }
                    }
                }
            }
        }

        ctx.Shelves.AddRange(shelves);
        ctx.Items.AddRange(items);
        ctx.SaveChanges();
    }
}
