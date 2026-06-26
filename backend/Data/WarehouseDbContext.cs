using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Models;

namespace WarehouseAPI.Data;

public class WarehouseDbContext : DbContext
{
    public WarehouseDbContext(DbContextOptions<WarehouseDbContext> options) : base(options) { }

    public DbSet<Shelf> Shelves => Set<Shelf>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<Movement> Movements => Set<Movement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Shelf>()
            .HasMany(s => s.Items)
            .WithOne(i => i.Shelf)
            .HasForeignKey(i => i.ShelfId);

        modelBuilder.Entity<Movement>()
            .HasOne(m => m.FromShelf)
            .WithMany()
            .HasForeignKey(m => m.FromShelfId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Movement>()
            .HasOne(m => m.ToShelf)
            .WithMany()
            .HasForeignKey(m => m.ToShelfId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
