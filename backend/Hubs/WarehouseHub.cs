using Microsoft.AspNetCore.SignalR;

namespace WarehouseAPI.Hubs;

public class WarehouseHub : Hub
{
    public async Task JoinWarehouse()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "warehouse");
        await Clients.Caller.SendAsync("Connected", new { message = "Connected to Warehouse Digital Twin" });
    }
}
