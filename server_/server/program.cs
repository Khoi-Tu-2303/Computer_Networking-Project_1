using server_os.Hubs;
using server_os.Services;
using Microsoft.AspNetCore.ResponseCompression;

var builder = WebApplication.CreateBuilder(args);

// Cấu hình đường dẫn wwwroot (Để hiện giao diện Server Monitor)
builder.Environment.WebRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

// --- PHẦN 1: ĐĂNG KÝ DỊCH VỤ ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// A. Đăng ký SignalR (WebSocket)
builder.Services.AddSignalR();

// B. Đăng ký các Service xử lý logic
// QUAN TRỌNG: Các service này nên là Singleton để giữ trạng thái
builder.Services.AddSingleton<KeyloggerService>();
builder.Services.AddSingleton<SystemActionService>(); // Đổi sang Singleton cho nhẹ, tạo 1 lần dùng mãi
builder.Services.AddSingleton<WebcamService>();       // <--- QUAN TRỌNG: Phải có cái này Webcam mới chạy

// C. Cấu hình CORS (Cho phép Client React kết nối)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.SetIsOriginAllowed(origin => true) // Cho phép MỌI nguồn (localhost, IP LAN,...)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Bắt buộc cho SignalR
    });
});

var app = builder.Build();

// --- PHẦN 2: CHẠY ỨNG DỤNG ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReact"); // Kích hoạt CORS

// D. Cấu hình hiển thị giao diện Server (Dashboard đen)
app.UseDefaultFiles(); // Tự động tìm index.html
app.UseStaticFiles();  // Cho phép tải css/js

app.MapControllers();

// E. Map SignalR Hub
app.MapHub<SystemHub>("/systemHub");

// F. API Discovery (Để Client quét mạng LAN tìm ra Server)
app.MapGet("/api/discovery", () =>
{
    return Results.Ok(new { message = "REMOTE_SERVER_HERE", machine = Environment.MachineName });
});

// Chạy ứng dụng
app.Run();