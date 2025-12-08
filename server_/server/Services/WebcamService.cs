using AForge.Video;
using AForge.Video.DirectShow;
using System.Drawing;
using System.Drawing.Imaging;
using Microsoft.AspNetCore.SignalR; // <--- Cần thêm cái này
using server_os.Hubs;               // <--- Cần thêm cái này để thấy SystemHub
namespace server_os.Services
{
    public class WebcamService
    {
        private FilterInfoCollection? _videoDevices;
        private VideoCaptureDevice? _videoSource;
        private readonly IHubContext<SystemHub> _hubContext;
        private string? _targetClientId = null; // Lưu ID người đang xem
        // Đây là "hàm callback" để gửi dữ liệu về Hub
        // Action<string> nghĩa là: Một hành động nhận vào chuỗi (Base64) và không trả về gì
        public Action<string>? OnFrameCaptured;
        public WebcamService(IHubContext<SystemHub> hubContext)
        {
            _hubContext = hubContext;
        }
        public List<string> GetCameraList()
        {
            List<string> cameras = new List<string>();
            try
            {
                _videoDevices = new FilterInfoCollection(FilterCategory.VideoInputDevice);
                foreach (FilterInfo device in _videoDevices)
                {
                    cameras.Add(device.Name);
                }
            }
            catch { }
            return cameras;
        }

        // Hàm bắt đầu Stream
        public void StartStream(int cameraIndex, string connectionId)
        {
            StopStream();
            _targetClientId = connectionId; // Lưu lại ID người nhận

            if (_videoDevices == null || _videoDevices.Count == 0)
                _videoDevices = new FilterInfoCollection(FilterCategory.VideoInputDevice);

            if (cameraIndex >= 0 && cameraIndex < _videoDevices.Count)
            {
                _videoSource = new VideoCaptureDevice(_videoDevices[cameraIndex].MonikerString);
                _videoSource.NewFrame += Video_NewFrame;
                _videoSource.Start();
            }
        }

        public void StopStream()
        {
            if (_videoSource != null && _videoSource.IsRunning)
            {
                _videoSource.SignalToStop();
                _videoSource.NewFrame -= Video_NewFrame;
                _videoSource = null;
            }
            _targetClientId = null;
        }

        // Xử lý ảnh và TỰ GỬI LUÔN
        private async void Video_NewFrame(object sender, NewFrameEventArgs eventArgs)
        {
            // Nếu không có người nhận thì thôi, đỡ tốn tài nguyên xử lý
            if (string.IsNullOrEmpty(_targetClientId)) return;

            try
            {
                using (Bitmap original = (Bitmap)eventArgs.Frame.Clone())
                {
                    // Resize nhỏ lại (320-480px) để không sập mạng
                    int width = 480;
                    int height = (original.Height * width) / original.Width;

                    using (Bitmap resized = new Bitmap(original, width, height))
                    {
                        using (MemoryStream ms = new MemoryStream())
                        {
                            resized.Save(ms, ImageFormat.Jpeg);
                            byte[] byteImage = ms.ToArray();
                            string base64 = Convert.ToBase64String(byteImage);

                            // DÙNG HUB CONTEXT ĐỂ GỬI (KHÔNG BAO GIỜ BỊ LỖI DISPOSED)
                            await _hubContext.Clients.Client(_targetClientId)
                                .SendAsync("ReceiveWebcamFrame", base64);
                        }
                    }
                }
            }
            catch { }
        }
    }
}