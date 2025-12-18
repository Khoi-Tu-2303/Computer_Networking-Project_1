using Fleck;
using System.Net;
using System.Net.Sockets;
using System.Net.NetworkInformation;
using System.Threading; // <-- Thêm thư viện này để dùng Thread.Sleep

class Program
{
    static void Main()
    {
        string ip = GetLocalIP();
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
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Client connected!");

                // CHIẾN THUẬT SPAM: Gửi 5 lần liên tiếp để đảm bảo Client bắt được
                // Dù máy chậm hay nhanh cũng sẽ dính ít nhất 1 phát
                new Thread(() => {
                    for (int i = 1; i <= 5; i++)
                    {
                        if (!socket.IsAvailable) break;
                        socket.Send($"{{\"ip\":\"{ip}\", \"prefix\":\"{prefix}\"}}");
                        Console.WriteLine($"   -> Gửi gói tin #{i}...");
                        Thread.Sleep(100); // Nghỉ 100ms rồi gửi tiếp
                    }
                    Console.WriteLine("   -> Hoan tat gui IP.");
                }).Start();
            };
        });

        Console.ReadLine();
    }

    static string GetLocalIP()
    {
        string bestIp = "127.0.0.1";
        foreach (NetworkInterface ni in NetworkInterface.GetAllNetworkInterfaces())
        {
            if (ni.OperationalStatus != OperationalStatus.Up || ni.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;

            // Lọc kỹ hơn các loại card ảo
            string name = ni.Description.ToLower();
            if (name.Contains("vmware") || name.Contains("virtual") || name.Contains("pseudo") || name.Contains("vbox")) continue;

            foreach (UnicastIPAddressInformation ip in ni.GetIPProperties().UnicastAddresses)
            {
                if (ip.Address.AddressFamily == AddressFamily.InterNetwork) return ip.Address.ToString();
            }
        }
        return bestIp;
    }
}