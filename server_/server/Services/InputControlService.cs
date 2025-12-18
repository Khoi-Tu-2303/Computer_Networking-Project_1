using System.Runtime.InteropServices;
using System.Runtime.Versioning;

namespace server_os.Services
{
    [SupportedOSPlatform("windows")]
    public class InputControlService
    {
        // Import thư viện Windows user32.dll
        [DllImport("user32.dll")]
        private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

        [DllImport("user32.dll")]
        private static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, int dwExtraInfo);

        [DllImport("user32.dll")]
        private static extern bool SetCursorPos(int X, int Y);

        private const int KEYEVENTF_EXTENDEDKEY = 0x0001;
        private const int KEYEVENTF_KEYUP = 0x0002;

        // --- MOUSE CONTROL ---
        private const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        private const uint MOUSEEVENTF_LEFTUP = 0x0004;
        private const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        private const uint MOUSEEVENTF_RIGHTUP = 0x0010;
        private const int MOUSEEVENTF_WHEEL = 0x0800;

        // Thêm các hàm tách biệt
        public void MouseDown(string button)
        {
            if (button == "left") mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
            else if (button == "right") mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
        }

        public void MouseUp(string button)
        {
            if (button == "left") mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
            else if (button == "right") mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
        }
        public void ScrollMouse(int scrollAmount)
        {
            // dwData (tham số thứ 4) nhận giá trị cuộn. 
            // 120 là 1 nấc lên, -120 là 1 nấc xuống.
            mouse_event(MOUSEEVENTF_WHEEL, 0, 0, (uint)scrollAmount, 0);
        }
        public void MoveMouse(int x, int y) => SetCursorPos(x, y);

        public void ClickLeft()
        {
            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        }

        public void ClickRight()
        {
            mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
            mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
        }

        // --- KEYBOARD CONTROL (NÂNG CẤP) ---

        // Hàm cũ (giữ lại nếu muốn)
        public void PressKey(byte keyCode)
        {
            keybd_event(keyCode, 0, 0, 0);               // Nhấn xuống
            keybd_event(keyCode, 0, KEYEVENTF_KEYUP, 0); // Nhả ra ngay
        }

        // 1. Hàm mới: Chỉ nhấn xuống (Dùng để giữ phím Shift, Ctrl, Alt...)
        public void KeyDown(byte keyCode)
        {
            keybd_event(keyCode, 0, 0, 0);
        }

        // 2. Hàm mới: Chỉ nhả ra
        public void KeyUp(byte keyCode)
        {
            keybd_event(keyCode, 0, KEYEVENTF_KEYUP, 0);
        }
        public void ReleaseModifiers()
        {
            // Danh sách các phím hay bị kẹt: Shift, Ctrl, Alt, Win
            byte[] modifiers = { 0x10, 0x11, 0x12, 0x5B };

            foreach (var key in modifiers)
            {
                keybd_event(key, 0, KEYEVENTF_KEYUP, 0);
            }
        }
    }
}