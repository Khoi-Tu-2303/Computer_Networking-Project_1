using Microsoft.AspNetCore.SignalR;
using server_os.Hubs;
using System.Diagnostics;

namespace server_os.Services
{
    public class SystemMonitorService : BackgroundService
    {
        private readonly IHubContext<SystemHub> _hubContext;

        // Biến lưu trạng thái cũ để tính % CPU
        private DateTime _lastCheck;
        private TimeSpan _lastTotalProcessorTime;

        public SystemMonitorService(IHubContext<SystemHub> hubContext)
        {
            _hubContext = hubContext;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Lấy mốc thời gian ban đầu
            _lastCheck = DateTime.Now;
            // Lấy tổng thời gian CPU đã hoạt động của toàn bộ process hiện tại
            _lastTotalProcessorTime = GetTotalCpuTime();

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Chờ 2 giây
                    await Task.Delay(2000, stoppingToken);

                    // --- 1. TÍNH RAM (Cộng dồn WorkingSet) ---
                    var processes = Process.GetProcesses();
                    long totalRamBytes = 0;

                    foreach (var p in processes)
                    {
                        try { totalRamBytes += p.WorkingSet64; } catch { }
                    }

                    // Đổi ra MB
                    double ramUsedMB = totalRamBytes / 1024.0 / 1024.0;

                    // --- 2. TÍNH CPU (So sánh Delta) ---
                    var now = DateTime.Now;
                    TimeSpan currentTotalCpuTime = GetTotalCpuTime();

                    double timePassedMs = (now - _lastCheck).TotalMilliseconds;
                    double cpuTimePassedMs = (currentTotalCpuTime - _lastTotalProcessorTime).TotalMilliseconds;
                    int cpuCount = Environment.ProcessorCount;

                    // Công thức: (CPU Time trôi qua / (Thời gian thực trôi qua * Số nhân)) * 100
                    double cpuPercent = 0;
                    if (timePassedMs > 0)
                    {
                        cpuPercent = (cpuTimePassedMs / (timePassedMs * cpuCount)) * 100;
                    }

                    // Validate số liệu cho đẹp (ko để quá 100 hoặc âm)
                    if (cpuPercent > 100) cpuPercent = 100;
                    if (cpuPercent < 0) cpuPercent = 0;

                    // Lưu lại mốc mới
                    _lastCheck = now;
                    _lastTotalProcessorTime = currentTotalCpuTime;

                    // --- 3. GỬI VỀ CLIENT ---
                    // Fix cứng Total RAM máy ông là 16GB (16384 MB) hoặc 8GB (8192 MB)
                    // Vì lấy Total RAM thật trong C# hơi rắc rối nếu không dùng thư viện ngoài
                    double totalRamMB = 16384;

                    await _hubContext.Clients.All.SendAsync("ReceiveSystemStats", new
                    {
                        cpu = Math.Round(cpuPercent, 1),
                        ramUsed = Math.Round(ramUsedMB, 0),
                        ramTotal = totalRamMB
                    }, stoppingToken);
                }
                catch
                {
                    // Lỗi thì bỏ qua, chờ lượt sau
                    await Task.Delay(1000, stoppingToken);
                }
            }
        }

        // Hàm phụ trợ tính tổng CPU Time của tất cả process
        private TimeSpan GetTotalCpuTime()
        {
            TimeSpan total = TimeSpan.Zero;
            var processes = Process.GetProcesses();
            foreach (var p in processes)
            {
                try { total += p.TotalProcessorTime; } catch { }
            }
            return total;
        }
    }
}