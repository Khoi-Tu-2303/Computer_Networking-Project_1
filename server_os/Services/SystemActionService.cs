using Microsoft.Win32;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;

namespace server_os.Services
{
    public class SystemActionService
    {
        // --- 1. SHUTDOWN ---
        public void Shutdown()
        {
            Process.Start("shutdown", "/s /t 0"); // Lệnh tắt máy ngay lập tức
        }
        public void Restart()
        {
            // /r = restart, /t 0 = thời gian chờ 0 giây
            Process.Start("shutdown", "/r /t 0");
        }
        // --- 2. CHỤP MÀN HÌNH ---
        public string CaptureScreenToBase64()
        {
            try
            {
                Rectangle bounds = Screen.PrimaryScreen.Bounds;
                using (Bitmap bitmap = new Bitmap(bounds.Width, bounds.Height))
                {
                    using (Graphics g = Graphics.FromImage(bitmap))
                    {
                        g.CopyFromScreen(Point.Empty, Point.Empty, bounds.Size);
                    }
                    using (MemoryStream ms = new MemoryStream())
                    {
                        bitmap.Save(ms, ImageFormat.Png);
                        return Convert.ToBase64String(ms.ToArray());
                    }
                }
            }
            catch (Exception ex) { return "Error: " + ex.Message; }
        }

        // --- 3. PROCESS / APPLICATION ---
        public List<string> GetProcessList()
        {
            List<string> list = new List<string>();
            Process[] processes = Process.GetProcesses();
            foreach (Process p in processes)
            {
                // Logic thầy: Chỉ lấy cái có WindowTitle là "Application", còn lại là Process thường
                // Ở đây mình lấy hết nhưng format đẹp để Client dễ nhìn
                if (!string.IsNullOrEmpty(p.MainWindowTitle))
                {
                    list.Add($"[APP] ID:{p.Id} | Name: {p.ProcessName} | Title: {p.MainWindowTitle}");
                }
                else
                {
                    list.Add($"[PROC] ID:{p.Id} | Name: {p.ProcessName}");
                }
            }
            return list;
        }

        public string KillProcess(int pid)
        {
            try
            {
                Process p = Process.GetProcessById(pid);
                p.Kill();
                return $"Đã diệt Process ID: {pid}";
            }
            catch (Exception ex) { return "Lỗi: " + ex.Message; }
        }

        // --- 4. REGISTRY (Logic thầy chuyển sang) ---

        // Hàm hỗ trợ lấy Key gốc (HKEY_LOCAL_MACHINE...)
        private RegistryKey? GetBaseRegistryKey(string link)
        {
            if (link.Contains('\\'))
            {
                string baseKey = link.Substring(0, link.IndexOf('\\')).ToUpper();
                switch (baseKey)
                {
                    case "HKEY_CLASSES_ROOT": return Registry.ClassesRoot;
                    case "HKEY_CURRENT_USER": return Registry.CurrentUser;
                    case "HKEY_LOCAL_MACHINE": return Registry.LocalMachine;
                    case "HKEY_USERS": return Registry.Users;
                    case "HKEY_CURRENT_CONFIG": return Registry.CurrentConfig;
                }
            }
            return null;
        }
        public string StartProcess(string appName)
        {
            try
            {
                Process.Start(appName);
                return $"Đã mở ứng dụng: {appName}";
            }
            catch (Exception ex)
            {
                return "Lỗi mở app: " + ex.Message;
            }
        }
        // Xử lý chung cho các lệnh Registry
        public string RegistryAction(string action, string link, string valueName, string value, string typeValue)
        {
            try
            {
                RegistryKey? baseKey = GetBaseRegistryKey(link);
                if (baseKey == null) return "Lỗi: Không tìm thấy Root Key";

                string subKeyPath = link.Substring(link.IndexOf('\\') + 1);
                RegistryKey? key = baseKey.OpenSubKey(subKeyPath, true); // True để cho phép ghi

                // Nếu mở không được (do key chưa có hoặc lỗi quyền), thử tạo mới nếu là lệnh Create
                if (key == null && action != "Create key") return "Lỗi: Không tìm thấy đường dẫn Key";

                switch (action)
                {
                    case "Create key":
                        baseKey.CreateSubKey(subKeyPath);
                        return "Tạo key thành công";

                    case "Delete key":
                        baseKey.DeleteSubKey(subKeyPath);
                        return "Xóa key thành công";

                    case "Get value":
                        object? val = key?.GetValue(valueName);
                        return val != null ? val.ToString()! : "Value rỗng hoặc không tồn tại";

                    case "Set value":
                        RegistryValueKind kind = RegistryValueKind.String;
                        if (typeValue == "Binary") kind = RegistryValueKind.Binary;
                        else if (typeValue == "DWORD") kind = RegistryValueKind.DWord;
                        else if (typeValue == "QWORD") kind = RegistryValueKind.QWord;
                        else if (typeValue == "Multi-String") kind = RegistryValueKind.MultiString;
                        else if (typeValue == "Expandable String") kind = RegistryValueKind.ExpandString;

                        key?.SetValue(valueName, value, kind);
                        return "Set value thành công";

                    case "Delete value":
                        key?.DeleteValue(valueName);
                        return "Xóa value thành công";

                    default:
                        return "Lệnh Registry không hợp lệ";
                }
            }
            catch (Exception ex)
            {
                return "Lỗi Registry: " + ex.Message;
            }
        }
    }
}