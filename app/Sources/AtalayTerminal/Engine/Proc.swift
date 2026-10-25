import Darwin
import Foundation

/// Process facts straight from the kernel (libproc / sysctl) instead of spawning `ps`, which cost a
/// fork+exec every few seconds and a pipe read on the engine queue.
enum Proc {
    struct Info {
        let ppid: Int32
        let tty: String?
        /// User + system CPU time in nanoseconds.
        let cpuTime: UInt64
        let rss: UInt64
    }

    private static let timebase: (numer: UInt64, denom: UInt64) = {
        var tb = mach_timebase_info_data_t()
        mach_timebase_info(&tb)
        return (UInt64(max(tb.numer, 1)), UInt64(max(tb.denom, 1)))
    }()

    static func info(_ pid: Int32) -> Info? {
        var all = proc_taskallinfo()
        let size = Int32(MemoryLayout<proc_taskallinfo>.size)
        guard proc_pidinfo(pid, PROC_PIDTASKALLINFO, 0, &all, size) == size else { return nil }
        let dev = all.pbsd.e_tdev
        let tty = dev == UInt32.max ? nil : ttyName(dev)
        // Task times are in Mach absolute time units (not nanoseconds) on Apple silicon.
        let ticks = all.ptinfo.pti_total_user &+ all.ptinfo.pti_total_system
        return Info(ppid: Int32(bitPattern: all.pbsd.pbi_ppid), tty: tty,
                    cpuTime: ticks &* timebase.numer / timebase.denom, rss: all.ptinfo.pti_resident_size)
    }

    /// devname() stats /dev entries on every call; terminals keep their device number, so remember them.
    private static let ttyLock = NSLock()
    nonisolated(unsafe) private static var ttyNames: [UInt32: String] = [:]
    private static func ttyName(_ dev: UInt32) -> String? {
        ttyLock.lock()
        defer { ttyLock.unlock() }
        if let known = ttyNames[dev] { return known }
        guard let name = devname(dev_t(bitPattern: dev), S_IFCHR) else { return nil }
        let path = "/dev/" + String(cString: name)
        ttyNames[dev] = path
        return path
    }

    static func parent(_ pid: Int32) -> Int32? {
        var bsd = proc_bsdshortinfo()
        let size = Int32(MemoryLayout<proc_bsdshortinfo>.size)
        guard proc_pidinfo(pid, PROC_PIDT_SHORTBSDINFO, 0, &bsd, size) == size else { return nil }
        return Int32(bitPattern: bsd.pbsi_ppid)
    }

    static func children(of pid: Int32) -> [Int32] { list(UInt32(PROC_PPID_ONLY), UInt32(bitPattern: pid)) }

    static func all() -> [Int32] { list(UInt32(PROC_ALL_PIDS), 0) }

    private static func list(_ type: UInt32, _ info: UInt32) -> [Int32] {
        let bytes = proc_listpids(type, info, nil, 0)
        guard bytes > 0 else { return [] }
        var pids = [Int32](repeating: 0, count: Int(bytes) / MemoryLayout<Int32>.size + 32)
        let got = pids.withUnsafeMutableBytes { proc_listpids(type, info, $0.baseAddress, Int32($0.count)) }
        guard got > 0 else { return [] }
        return pids.prefix(Int(got) / MemoryLayout<Int32>.size).filter { $0 > 0 }
    }

    /// Current working directory of one of our processes.
    static func cwd(_ pid: Int32) -> String? {
        var info = proc_vnodepathinfo()
        let size = Int32(MemoryLayout<proc_vnodepathinfo>.size)
        guard proc_pidinfo(pid, PROC_PIDVNODEPATHINFO, 0, &info, size) == size else { return nil }
        let path = withUnsafeBytes(of: info.pvi_cdir.vip_path) { String(decoding: $0.prefix { $0 != 0 }, as: UTF8.self) }
        return path.isEmpty ? nil : path
    }

    /// Short executable name (p_comm), e.g. "screen".
    static func name(_ pid: Int32) -> String? {
        var buf = [CChar](repeating: 0, count: 64)
        guard proc_name(pid, &buf, UInt32(buf.count)) > 0 else { return nil }
        return String(cString: buf)
    }

    /// The process's current argument vector (what `ps -o command` shows; screen rewrites its own).
    static func arguments(_ pid: Int32) -> [String]? {
        var mib: [Int32] = [CTL_KERN, KERN_PROCARGS2, pid]
        var size = 0
        guard sysctl(&mib, 3, nil, &size, nil, 0) == 0, size > MemoryLayout<Int32>.size else { return nil }
        var buf = [UInt8](repeating: 0, count: size)
        guard sysctl(&mib, 3, &buf, &size, nil, 0) == 0 else { return nil }
        let argc = Int(buf.withUnsafeBytes { $0.load(as: Int32.self) })
        var i = MemoryLayout<Int32>.size
        while i < size, buf[i] != 0 { i += 1 } // executable path
        while i < size, buf[i] == 0 { i += 1 } // padding
        var args: [String] = []
        var start = i
        while i < size, args.count < argc {
            if buf[i] == 0 {
                args.append(String(decoding: buf[start..<i], as: UTF8.self))
                start = i + 1
            }
            i += 1
        }
        return args
    }
}
