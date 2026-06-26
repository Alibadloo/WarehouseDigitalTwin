using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddDbContext<WarehouseDbContext>(opt =>
    opt.UseSqlite("Data Source=warehouse.db"));
builder.Services.AddSignalR();
builder.Services.AddHttpClient();

builder.Services.AddCors(opts => opts.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:3004")
     .AllowAnyMethod()
     .AllowAnyHeader()
     .AllowCredentials()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var ctx = scope.ServiceProvider.GetRequiredService<WarehouseDbContext>();
    ctx.Database.EnsureCreated();
    SeedData.Initialize(ctx);
}

app.UseCors();
app.MapControllers();
app.MapHub<WarehouseHub>("/hubs/warehouse");

app.Run("http://localhost:5052");
