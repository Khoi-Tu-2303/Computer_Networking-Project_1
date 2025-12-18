using server_os.Hubs;
using server_os.Services;
using Microsoft.AspNetCore.ResponseCompression; // Nếu cần nén, nhưng Base64 thì ko tác dụng mấy

var builder = WebApplication.CreateBuilder(args);

// Cấu hình đường dẫn wwwroot (Để hiện giao diện Server Monitor)
builder.Environment.WebRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

// --- PHẦN 1: ĐĂNG KÝ DỊCH VỤ ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --- QUAN TRỌNG: Cấu hình SignalR tăng giới hạn gói tin ---
builder.Services.AddSignalR(hubOptions =>
{
    // Tăng giới hạn nhận tin lên 10MB (đủ cho ảnh 4K Base64)
    hubOptions.MaximumReceiveMessageSize = 10 * 1024 * 1024;
    hubOptions.EnableDetailedErrors = true; // Bật để dễ debug lỗi
});

// --- REGISTER SERVICES ---
// 1. Service chạy ngầm (System Monitor - CPU/RAM)
builder.Services.AddHostedService<SystemMonitorService>();

// 2. Các Service Logic (Singleton - Sống suốt đời ứng dụng)
builder.Services.AddSingleton<KeyloggerService>();
builder.Services.AddSingleton<SystemActionService>();
builder.Services.AddSingleton<WebcamService>();         // Webcam
builder.Services.AddSingleton<ScreenStreamService>();   // UltraView: Chụp màn hình
builder.Services.AddSingleton<InputControlService>();   // UltraView: Điều khiển chuột/phím

// C. Cấu hình CORS (Cho phép Client React kết nối)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.SetIsOriginAllowed(origin => true) // Chấp nhận mọi IP (LAN, Wifi...)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// --- PHẦN 2: CHẠY ỨNG DỤNG ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReact");

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

// E. Map SignalR Hub
app.MapHub<SystemHub>("/systemHub");

// F. API Discovery
app.MapGet("/api/discovery", () =>
{
    return Results.Ok(new { message = "REMOTE_SERVER_HERE", machine = Environment.MachineName });
});

app.Run();