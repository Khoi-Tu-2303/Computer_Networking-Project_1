using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.Versioning;
using System.Windows.Forms; // Cần thiết để lấy Cursor.Position

namespace server_os.Services
{
    [SupportedOSPlatform("windows")]
    public class ScreenStreamService
    {
        private const long QUALITY_LEVEL = 40L;

        public string CaptureScreenBase64()
        {
            try
            {
                // Lấy kích thước màn hình
                Rectangle bounds = Screen.PrimaryScreen.Bounds;

                using (Bitmap bmp = new Bitmap(bounds.Width, bounds.Height))
                {
                    using (Graphics g = Graphics.FromImage(bmp))
                    {
                        // 1. Chụp nền màn hình
                        g.CopyFromScreen(Point.Empty, Point.Empty, bounds.Size);

                        // 2. [FIX] TỰ VẼ CON CHUỘT THỦ CÔNG (ĐẢM BẢO 100% HIỆN)
                        DrawCursorManual(g, bounds.X, bounds.Y);
                    }

                    return ToBase64(bmp);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SCREEN ERROR] {ex.Message}");
                return "";
            }
        }

        // Hàm vẽ chuột bằng Polygon (Không dùng user32.dll nữa vì hay lỗi)
        private void DrawCursorManual(Graphics g, int offsetX, int offsetY)
        {
            try
            {
                // Lấy tọa độ chuột hiện tại
                Point p = Cursor.Position;
                // Trừ đi offset (trong trường hợp màn hình phụ, nhưng thường là 0)
                int x = p.X - offsetX;
                int y = p.Y - offsetY;

                // Vẽ hình mũi tên chuột đơn giản (Mũi tên trắng, viền đen)
                Point[] cursorPoints = {
                    new Point(x, y),            // Đỉnh
                    new Point(x, y + 16),       // Cạnh trái
                    new Point(x + 5, y + 14),   // Rẽ nhánh
                    new Point(x + 5, y + 14),
                    new Point(x + 8, y + 20),   // Đuôi
                    new Point(x + 10, y + 20),
                    new Point(x + 7, y + 12),
                    new Point(x + 12, y + 12)   // Cánh phải
                };

                // Vẽ viền đen cho dễ nhìn trên nền trắng
                g.DrawPolygon(Pens.Black, cursorPoints);
                // Tô màu trắng
                g.FillPolygon(Brushes.White, cursorPoints);

                // (Optional) Nếu muốn chuột đỏ cho nổi thì dùng Brushes.Red
                // g.FillPolygon(Brushes.Red, cursorPoints);
            }
            catch { }
        }

        private string ToBase64(Bitmap bmp)
        {
            using (MemoryStream ms = new MemoryStream())
            {
                ImageCodecInfo jpgEncoder = GetEncoder(ImageFormat.Jpeg);
                System.Drawing.Imaging.Encoder myEncoder = System.Drawing.Imaging.Encoder.Quality;
                EncoderParameters myEncoderParameters = new EncoderParameters(1);
                EncoderParameter myEncoderParameter = new EncoderParameter(myEncoder, QUALITY_LEVEL);
                myEncoderParameters.Param[0] = myEncoderParameter;

                bmp.Save(ms, jpgEncoder, myEncoderParameters);
                byte[] byteImage = ms.ToArray();
                return Convert.ToBase64String(byteImage);
            }
        }

        private ImageCodecInfo GetEncoder(ImageFormat format)
        {
            ImageCodecInfo[] codecs = ImageCodecInfo.GetImageDecoders();
            foreach (ImageCodecInfo codec in codecs)
            {
                if (codec.FormatID == format.Guid) return codec;
            }
            return null;
        }
    }
}