using Fleck;
using System.Net;
using System.Net.Sockets;
using System.Net.NetworkInformation; // Thư viện mới để lọc Card mạng

class Program
{
    static void Main()
    {
        // 1. Lấy IP thật (Đã lọc bỏ VMware)
        string ip = GetLocalIP();

        // 2. Tạo prefix
        string prefix = "";
        if (!string.IsNullOrEmpty(ip))
        {
            var parts = ip.Split('.');
            if (parts.Length == 4) prefix = string.Join(".", parts.Take(3));
        }

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("=============================================");
        Console.WriteLine($"[AGENT] IP LAN CHINH XAC: {ip}");
        Console.WriteLine($"[AGENT] Prefix mang:      {prefix}");
        Console.WriteLine("=============================================");
        Console.ResetColor();
        Console.WriteLine($"[AGENT] WebSocket Server started at ws://0.0.0.0:9999");

        var server = new WebSocketServer("ws://0.0.0.0:9999");

        server.Start(socket => {
            socket.OnOpen = () => {
                Console.WriteLine("-> Web Client da ket noi! Dang gui IP...");
                socket.Send($"{{\"ip\":\"{ip}\", \"prefix\":\"{prefix}\"}}");
            };
        });

        Console.ReadLine();
    }

    // HÀM LẤY IP THÔNG MINH (LOC VMWARE)
    static string GetLocalIP()
    {
        string bestIp = "127.0.0.1";

        foreach (NetworkInterface ni in NetworkInterface.GetAllNetworkInterfaces())
        {
            // 1. Bỏ qua card mạng đã bị tắt hoặc là Loopback
            if (ni.OperationalStatus != OperationalStatus.Up || ni.NetworkInterfaceType == NetworkInterfaceType.Loopback)
                continue;

            // 2. Bỏ qua các card ảo của VMware, VirtualBox
            string name = ni.Description.ToLower();
            if (name.Contains("vmware") || name.Contains("virtual") || name.Contains("pseudo"))
                continue;

            // 3. Tìm IP trong card này
            foreach (UnicastIPAddressInformation ip in ni.GetIPProperties().UnicastAddresses)
            {
                if (ip.Address.AddressFamily == AddressFamily.InterNetwork)
                {
                    // Ưu tiên lấy luôn nếu tìm thấy
                    return ip.Address.ToString();
                }
            }
        }
        return bestIp;
    }
}