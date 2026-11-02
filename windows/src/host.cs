// The Windows app's session host: it keeps the chats and terminals running in pseudo consoles (ConPTY) while the app is
// closed, restarting or updating, as screen does for the Mac app (Detached.swift). The app compiles this file with the
// C# compiler every Windows has (.NET Framework's csc.exe) into %LOCALAPPDATA%\atalay-terminal-host, outside the app's
// folder: an update's installer ends everything that runs from that folder, and the sessions would go with it.
//
// The app talks to it over a named pipe only this user can open, one JSON object per line (sessionhost.js). Each session
// keeps the end of its output, so a window that attaches after a restart starts from what was on screen. The host ends
// by itself a little after its last session, once no app is connected; every session's processes are in a job object
// that ends them with the host.
//
// C# 5 only: that's what .NET Framework's compiler takes.

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;
using Microsoft.Win32.SafeHandles;

static class Native
{
    [StructLayout(LayoutKind.Sequential)]
    public struct COORD { public short X; public short Y; }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct STARTUPINFO
    {
        public int cb; public string lpReserved; public string lpDesktop; public string lpTitle;
        public int dwX; public int dwY; public int dwXSize; public int dwYSize; public int dwXCountChars; public int dwYCountChars;
        public int dwFillAttribute; public int dwFlags; public short wShowWindow; public short cbReserved2;
        public IntPtr lpReserved2; public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct STARTUPINFOEX { public STARTUPINFO StartupInfo; public IntPtr lpAttributeList; }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public int dwProcessId; public int dwThreadId; }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit; public long PerJobUserTimeLimit; public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize; public UIntPtr MaximumWorkingSetSize; public uint ActiveProcessLimit;
        public UIntPtr Affinity; public uint PriorityClass; public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct IO_COUNTERS { public ulong Reads, Writes, Others, ReadBytes, WriteBytes, OtherBytes; }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation; public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit; public UIntPtr JobMemoryLimit; public UIntPtr PeakProcessMemoryUsed; public UIntPtr PeakJobMemoryUsed;
    }

    public const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000, CREATE_UNICODE_ENVIRONMENT = 0x00000400, CREATE_SUSPENDED = 0x00000004;
    public const int STARTF_USESTDHANDLES = 0x00000100;
    public static readonly IntPtr PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE = (IntPtr)0x00020016;
    public const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;
    public const int JobObjectExtendedLimitInformation = 9;
    public const uint INFINITE = 0xFFFFFFFF;

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CreatePipe(out SafeFileHandle read, out SafeFileHandle write, IntPtr attributes, int size);
    [DllImport("kernel32.dll")]
    public static extern int CreatePseudoConsole(COORD size, SafeFileHandle input, SafeFileHandle output, uint flags, out IntPtr pc);
    [DllImport("kernel32.dll")]
    public static extern int ResizePseudoConsole(IntPtr pc, COORD size);
    [DllImport("kernel32.dll")]
    public static extern void ClosePseudoConsole(IntPtr pc);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags, ref IntPtr size);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attribute, IntPtr value, IntPtr size, IntPtr previous, IntPtr returnSize);
    [DllImport("kernel32.dll")]
    public static extern void DeleteProcThreadAttributeList(IntPtr list);
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CreateProcessW(string app, StringBuilder cmdline, IntPtr pa, IntPtr ta, bool inherit, uint flags,
        IntPtr env, string cwd, ref STARTUPINFOEX si, out PROCESS_INFORMATION pi);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint ResumeThread(IntPtr thread);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr h);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint WaitForSingleObject(IntPtr h, uint ms);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GetExitCodeProcess(IntPtr h, out uint code);
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern IntPtr CreateJobObjectW(IntPtr attributes, string name);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetInformationJobObject(IntPtr job, int infoClass, ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION info, int size);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool TerminateJobObject(IntPtr job, uint code);
}

static class Json
{
    public static string Str(string s)
    {
        var b = new StringBuilder(s.Length + 16);
        b.Append('"');
        foreach (char ch in s)
        {
            switch (ch)
            {
                case '"': b.Append("\\\""); break;
                case '\\': b.Append("\\\\"); break;
                case '\n': b.Append("\\n"); break;
                case '\r': b.Append("\\r"); break;
                case '\t': b.Append("\\t"); break;
                default:
                    if (ch < 0x20 || ch == (char)0x2028 || ch == (char)0x2029) b.Append("\\u").Append(((int)ch).ToString("x4"));
                    else b.Append(ch);
                    break;
            }
        }
        return b.Append('"').ToString();
    }

    public static readonly JavaScriptSerializer Reader = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };

    public static string Text(Dictionary<string, object> m, string key)
    {
        object v;
        return m.TryGetValue(key, out v) && v != null ? Convert.ToString(v) : null;
    }

    public static int Int(Dictionary<string, object> m, string key, int fallback)
    {
        object v;
        if (!m.TryGetValue(key, out v) || v == null) return fallback;
        try { return Convert.ToInt32(v); } catch { return fallback; }
    }
}

// One app connected over the pipe. What goes to it waits in a queue of its own, so a slow reader never holds up a
// session's output (nor the other sessions); one that stops reading altogether is let go.
sealed class Client
{
    readonly NamedPipeServerStream pipe;
    readonly BlockingCollection<string> outbox = new BlockingCollection<string>();
    long queued;
    const long MaxQueued = 64L << 20;

    public Client(NamedPipeServerStream pipe) { this.pipe = pipe; }

    public void Start()
    {
        new Thread(Write) { IsBackground = true }.Start();
        new Thread(Read) { IsBackground = true }.Start();
    }

    public void Send(string line)
    {
        if (Interlocked.Add(ref queued, line.Length) > MaxQueued) { Close(); return; }
        try { outbox.Add(line); } catch (InvalidOperationException) { }
    }

    void Write()
    {
        var utf8 = new UTF8Encoding(false);
        try
        {
            foreach (var line in outbox.GetConsumingEnumerable())
            {
                Interlocked.Add(ref queued, -line.Length);
                var bytes = utf8.GetBytes(line + "\n");
                pipe.Write(bytes, 0, bytes.Length);
                if (outbox.Count == 0) pipe.Flush();
            }
        }
        catch { }
        Close();
    }

    void Read()
    {
        try
        {
            var reader = new StreamReader(pipe, new UTF8Encoding(false));
            string line;
            while ((line = reader.ReadLine()) != null)
            {
                Dictionary<string, object> m;
                try { m = Json.Reader.DeserializeObject(line) as Dictionary<string, object>; } catch { continue; }
                if (m != null) Host.Handle(this, m);
            }
        }
        catch { }
        Close();
    }

    int closed;
    public void Close()
    {
        if (Interlocked.Exchange(ref closed, 1) == 1) return;
        outbox.CompleteAdding();
        try { pipe.Dispose(); } catch { }
        Host.Gone(this);
    }
}

sealed class Session
{
    public string Id, Meta;
    public int Pid, Cols, Rows;
    public long StartedAt;
    public readonly object Gate = new object();
    public readonly List<Client> Attached = new List<Client>();
    IntPtr pc, process, job;
    FileStream input, output;
    Thread reader;

    // The end of the output, for a window that attaches later; the terminal modes the program set (the cursor keys,
    // bracketed paste, the mouse, the alternate screen) go after it, as their sequences may be long cut off.
    readonly StringBuilder tail = new StringBuilder();
    readonly Dictionary<int, bool> modes = new Dictionary<int, bool>();
    string carry = "";
    const int MaxTail = 2000000, KeptTail = 1500000;
    static readonly Regex Mode = new Regex("\u001b\\[\\?([0-9;]+)([hl])");
    static readonly int[] Restored = { 1, 25, 1000, 1002, 1003, 1004, 1005, 1006, 1015, 2004, 9001 };

    public static Session Start(string id, string cmd, string cwd, Dictionary<string, object> env, int cols, int rows, string meta)
    {
        SafeFileHandle inRead, inWrite, outRead, outWrite;
        if (!Native.CreatePipe(out inRead, out inWrite, IntPtr.Zero, 0)) throw new Win32Exception();
        if (!Native.CreatePipe(out outRead, out outWrite, IntPtr.Zero, 0)) throw new Win32Exception();
        IntPtr pc;
        int hr = Native.CreatePseudoConsole(Size(cols, rows), inRead, outWrite, 0, out pc);
        // The pseudo console has its own copies of these ends now.
        inRead.Dispose();
        outWrite.Dispose();
        if (hr != 0) throw new Exception("CreatePseudoConsole failed: 0x" + hr.ToString("x8"));

        var size = IntPtr.Zero;
        Native.InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref size);
        var list = Marshal.AllocHGlobal(size);
        var block = EnvironmentBlock(env);
        try
        {
            if (!Native.InitializeProcThreadAttributeList(list, 1, 0, ref size)) throw new Win32Exception();
            if (!Native.UpdateProcThreadAttribute(list, 0, Native.PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE, pc, (IntPtr)IntPtr.Size, IntPtr.Zero, IntPtr.Zero))
                throw new Win32Exception();
            var si = new Native.STARTUPINFOEX();
            si.StartupInfo.cb = Marshal.SizeOf(typeof(Native.STARTUPINFOEX));
            // Standard handles left empty: the program takes the pseudo console's, never this process's.
            si.StartupInfo.dwFlags = Native.STARTF_USESTDHANDLES;
            si.lpAttributeList = list;
            Native.PROCESS_INFORMATION pi;
            // Suspended until it's in the session's job, so nothing it starts escapes the job.
            if (!Native.CreateProcessW(null, new StringBuilder(cmd), IntPtr.Zero, IntPtr.Zero, false,
                    Native.EXTENDED_STARTUPINFO_PRESENT | Native.CREATE_UNICODE_ENVIRONMENT | Native.CREATE_SUSPENDED, block, cwd, ref si, out pi))
            {
                var e = new Win32Exception();
                Native.ClosePseudoConsole(pc);
                inWrite.Dispose();
                outRead.Dispose();
                throw e;
            }
            var job = Native.CreateJobObjectW(IntPtr.Zero, null);
            var info = new Native.JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            info.BasicLimitInformation.LimitFlags = Native.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            Native.SetInformationJobObject(job, Native.JobObjectExtendedLimitInformation, ref info, Marshal.SizeOf(typeof(Native.JOBOBJECT_EXTENDED_LIMIT_INFORMATION)));
            Native.AssignProcessToJobObject(job, pi.hProcess);
            Native.ResumeThread(pi.hThread);
            Native.CloseHandle(pi.hThread);
            var s = new Session
            {
                Id = id, Meta = meta, Pid = pi.dwProcessId, Cols = cols, Rows = rows, StartedAt = Now(),
                pc = pc, process = pi.hProcess, job = job,
                input = new FileStream(inWrite, FileAccess.Write, 1),
                output = new FileStream(outRead, FileAccess.Read, 1),
            };
            s.reader = new Thread(s.ReadOutput) { IsBackground = true };
            s.reader.Start();
            new Thread(s.WaitForExit) { IsBackground = true }.Start();
            return s;
        }
        finally
        {
            Native.DeleteProcThreadAttributeList(list);
            Marshal.FreeHGlobal(list);
            Marshal.FreeHGlobal(block);
        }
    }

    static Native.COORD Size(int cols, int rows)
    {
        return new Native.COORD { X = (short)Math.Max(2, Math.Min(cols, 1000)), Y = (short)Math.Max(1, Math.Min(rows, 1000)) };
    }

    // "NAME=value\0…\0\0", sorted the way Windows keeps an environment.
    static IntPtr EnvironmentBlock(Dictionary<string, object> env)
    {
        var keys = new List<string>(env.Keys);
        keys.Sort(StringComparer.OrdinalIgnoreCase);
        var b = new StringBuilder();
        foreach (var k in keys) b.Append(k).Append('=').Append(Convert.ToString(env[k])).Append('\0');
        b.Append('\0');
        return Marshal.StringToHGlobalUni(b.ToString());
    }

    public static long Now() { return (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalMilliseconds; }

    void ReadOutput()
    {
        var bytes = new byte[65536];
        var chars = new char[65536 + 8];
        var decoder = new UTF8Encoding(false).GetDecoder();
        while (true)
        {
            int n;
            try { n = output.Read(bytes, 0, bytes.Length); } catch { break; }
            if (n <= 0) break;
            int c = decoder.GetChars(bytes, 0, n, chars, 0);
            try
            {
                if (c > 0) Output(new string(chars, 0, c));
            }
            catch { }
        }
    }

    void Output(string text)
    {
        lock (Gate)
        {
            tail.Append(text);
            if (tail.Length > MaxTail)
            {
                // Cut at a line's start, so it never begins inside an escape sequence.
                int cut = tail.Length - KeptTail;
                string rest = tail.ToString(cut, Math.Min(4096, tail.Length - cut));
                int nl = rest.IndexOf('\n');
                tail.Remove(0, nl >= 0 ? cut + nl + 1 : cut);
            }
            // A mode's sequence can be split between two reads: the end of the last one is looked at again (setting a
            // mode twice is the same as once).
            string seen = carry + text;
            foreach (Match m in Mode.Matches(seen))
                foreach (var n in m.Groups[1].Value.Split(';'))
                {
                    int mode;
                    if (int.TryParse(n, out mode)) modes[mode] = m.Groups[2].Value == "h";
                }
            carry = seen.Length > 24 ? seen.Substring(seen.Length - 24) : seen;
            var line = "{\"t\":\"data\",\"id\":" + Json.Str(Id) + ",\"d\":" + Json.Str(text) + "}";
            // A copy: a client let go while sending leaves the list.
            foreach (var c in Attached.ToArray()) c.Send(line);
        }
    }

    // What a window attaching now needs to show the session as it is: under the session's lock, so no output falls
    // between this and the next "data".
    public string Replay()
    {
        string text = tail.ToString();
        bool alt;
        if (modes.TryGetValue(1049, out alt) && alt)
        {
            // On the alternate screen (Claude's full-screen view): only what was drawn there.
            int i = text.LastIndexOf("\u001b[?1049h", StringComparison.Ordinal);
            text = i >= 0 ? text.Substring(i) : "\u001b[?1049h" + text;
        }
        var b = new StringBuilder(text);
        foreach (int mode in Restored)
        {
            bool on;
            if (modes.TryGetValue(mode, out on)) b.Append("\u001b[?").Append(mode).Append(on ? 'h' : 'l');
        }
        return b.ToString();
    }

    void WaitForExit()
    {
        Native.WaitForSingleObject(process, Native.INFINITE);
        uint code;
        if (!Native.GetExitCodeProcess(process, out code)) code = 1;
        // Closing the pseudo console lets the rest of the output through and ends the reader.
        Native.ClosePseudoConsole(pc);
        reader.Join(5000);
        try { input.Dispose(); } catch { }
        try { output.Dispose(); } catch { }
        Native.CloseHandle(process);
        // Whatever the shell left running (a Claude it started) ends with the job.
        Native.CloseHandle(job);
        Host.Ended(this, (int)code);
    }

    public void Write(string data)
    {
        try
        {
            var bytes = new UTF8Encoding(false).GetBytes(data);
            lock (input) { input.Write(bytes, 0, bytes.Length); input.Flush(); }
        }
        catch { }
    }

    public void Resize(int cols, int rows)
    {
        lock (Gate)
        {
            if (cols == Cols && rows == Rows) return;
            Cols = cols;
            Rows = rows;
            Native.ResizePseudoConsole(pc, Size(cols, rows));
        }
    }

    public void Kill() { Native.TerminateJobObject(job, 1); }
}

static class Host
{
    static readonly Dictionary<string, Session> sessions = new Dictionary<string, Session>();
    static readonly List<Client> clients = new List<Client>();
    static long lastSeen = Session.Now();
    // How long the host stays with nothing to do: no session, no app connected.
    const long Linger = 20000;

    public static void Run(string name)
    {
        new Thread(Watch) { IsBackground = true }.Start();
        var security = new PipeSecurity();
        security.AddAccessRule(new PipeAccessRule(WindowsIdentity.GetCurrent().User, PipeAccessRights.FullControl, AccessControlType.Allow));
        while (true)
        {
            var pipe = new NamedPipeServerStream(name, PipeDirection.InOut, NamedPipeServerStream.MaxAllowedServerInstances,
                PipeTransmissionMode.Byte, PipeOptions.Asynchronous, 1 << 16, 1 << 16, security);
            pipe.WaitForConnection();
            var c = new Client(pipe);
            lock (clients) clients.Add(c);
            c.Start();
        }
    }

    static void Watch()
    {
        while (true)
        {
            Thread.Sleep(2000);
            bool idle;
            lock (sessions) lock (clients) idle = sessions.Count == 0 && clients.Count == 0;
            if (idle && Session.Now() - Interlocked.Read(ref lastSeen) > Linger) Environment.Exit(0);
        }
    }

    public static void Gone(Client c)
    {
        lock (clients) clients.Remove(c);
        List<Session> all;
        lock (sessions) all = new List<Session>(sessions.Values);
        foreach (var s in all) lock (s.Gate) s.Attached.Remove(c);
        Interlocked.Exchange(ref lastSeen, Session.Now());
    }

    public static void Ended(Session s, int code)
    {
        lock (sessions) sessions.Remove(s.Id);
        var line = "{\"t\":\"exit\",\"id\":" + Json.Str(s.Id) + ",\"code\":" + code + "}";
        lock (s.Gate) foreach (var c in s.Attached.ToArray()) c.Send(line);
        Interlocked.Exchange(ref lastSeen, Session.Now());
    }

    static Session Find(string id)
    {
        Session s;
        lock (sessions) return id != null && sessions.TryGetValue(id, out s) ? s : null;
    }

    public static void Handle(Client c, Dictionary<string, object> m)
    {
        string t = Json.Text(m, "t"), id = Json.Text(m, "id"), rid = Json.Text(m, "rid");
        string reply = rid == null ? "" : ",\"rid\":" + Json.Str(rid);
        Session s;
        switch (t)
        {
            case "hello":
                c.Send("{\"t\":\"hello\"" + reply + ",\"v\":1,\"pid\":" + System.Diagnostics.Process.GetCurrentProcess().Id + "}");
                break;
            case "list":
            {
                var b = new StringBuilder("{\"t\":\"list\"" + reply + ",\"sessions\":[");
                lock (sessions)
                {
                    bool first = true;
                    foreach (var x in sessions.Values)
                    {
                        if (!first) b.Append(',');
                        first = false;
                        b.Append("{\"id\":").Append(Json.Str(x.Id)).Append(",\"pid\":").Append(x.Pid)
                            .Append(",\"meta\":").Append(Json.Str(x.Meta ?? "")).Append(",\"startedAt\":").Append(x.StartedAt).Append('}');
                    }
                }
                c.Send(b.Append("]}").ToString());
                break;
            }
            case "spawn":
                try
                {
                    if (id == null || Find(id) != null) throw new Exception("there's a session " + id + " already");
                    var env = m.ContainsKey("env") ? m["env"] as Dictionary<string, object> : null;
                    s = Session.Start(id, Json.Text(m, "cmd"), Json.Text(m, "cwd"), env ?? new Dictionary<string, object>(),
                        Json.Int(m, "cols", 100), Json.Int(m, "rows", 30), Json.Text(m, "meta"));
                    // The app that started it sees it from its first byte.
                    lock (s.Gate) s.Attached.Add(c);
                    lock (sessions) sessions[id] = s;
                    c.Send("{\"t\":\"spawned\"" + reply + ",\"id\":" + Json.Str(id) + ",\"pid\":" + s.Pid + "}");
                }
                catch (Exception e)
                {
                    c.Send("{\"t\":\"error\"" + reply + ",\"id\":" + Json.Str(id ?? "") + ",\"message\":" + Json.Str(e.Message) + "}");
                }
                break;
            case "attach":
                s = Find(id);
                if (s == null)
                {
                    c.Send("{\"t\":\"error\"" + reply + ",\"id\":" + Json.Str(id ?? "") + ",\"message\":\"no such session\"}");
                    break;
                }
                lock (s.Gate)
                {
                    c.Send("{\"t\":\"replay\"" + reply + ",\"id\":" + Json.Str(id) + ",\"pid\":" + s.Pid + ",\"d\":" + Json.Str(s.Replay()) + "}");
                    if (!s.Attached.Contains(c)) s.Attached.Add(c);
                }
                break;
            case "detach":
                s = Find(id);
                if (s != null) lock (s.Gate) s.Attached.Remove(c);
                break;
            case "input":
                s = Find(id);
                if (s != null) s.Write(Json.Text(m, "d") ?? "");
                break;
            case "resize":
                s = Find(id);
                if (s != null) s.Resize(Json.Int(m, "cols", s.Cols), Json.Int(m, "rows", s.Rows));
                break;
            case "kill":
                s = Find(id);
                if (s != null) s.Kill();
                break;
        }
    }
}

static class Program
{
    const uint CREATE_BREAKAWAY_FROM_JOB = 0x01000000, CREATE_NO_WINDOW = 0x08000000;

    static int Main(string[] args)
    {
        if (args.Length < 1 || args[0].Length == 0) return 2;
        if (args.Length < 2 || args[1] != "--host") return Relaunch(args[0]);
        // One host per pipe: a second one started at the same moment leaves.
        bool first;
        var mutex = new Mutex(true, "Local\\" + args[0], out first);
        if (!first) return 0;
        Host.Run(args[0]);
        GC.KeepAlive(mutex);
        return 0;
    }

    // Started by the app, this process holds copies of every handle the app lets its children inherit (its sockets, its
    // files), which would stay open as long as the chats: the host is a copy of itself started without them, in its own
    // folder (not the app's, which an update replaces), and this one leaves at once.
    static int Relaunch(string name)
    {
        var exe = System.Reflection.Assembly.GetExecutingAssembly().Location;
        var si = new Native.STARTUPINFOEX();
        si.StartupInfo.cb = Marshal.SizeOf(typeof(Native.STARTUPINFO));
        Native.PROCESS_INFORMATION pi;
        var cmd = "\"" + exe + "\" \"" + name + "\" --host";
        var dir = Path.GetDirectoryName(exe);
        // Out of the app's job too when that's allowed: a job that ends with whatever started the app (a terminal's)
        // would take the chats with it.
        if (!Native.CreateProcessW(exe, new StringBuilder(cmd), IntPtr.Zero, IntPtr.Zero, false, CREATE_BREAKAWAY_FROM_JOB | CREATE_NO_WINDOW,
                IntPtr.Zero, dir, ref si, out pi)
            && !Native.CreateProcessW(exe, new StringBuilder(cmd), IntPtr.Zero, IntPtr.Zero, false, CREATE_NO_WINDOW, IntPtr.Zero, dir, ref si, out pi))
            return 1;
        Native.CloseHandle(pi.hThread);
        Native.CloseHandle(pi.hProcess);
        return 0;
    }
}
