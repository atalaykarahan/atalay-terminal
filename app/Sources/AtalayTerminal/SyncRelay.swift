import Darwin

/// Between a detached session's screen and its terminal view. Claude wraps every frame it draws in synchronized-output
/// marks (DEC 2026) so a terminal shows it whole; Apple's screen (4.0) drops those marks, so the view drew frames half
/// done and Claude's output stuttered as it streamed. The app runs itself as this relay (`--sync-relay screen …`): it
/// starts screen on a pty of its own, passes keys and window sizes through, and puts each burst of screen's output back
/// inside the marks, closing them once the output pauses (4 ms) or has run on for 50 ms, and only between escape
/// sequences and characters, never inside one.
enum SyncRelay {
    private static let begin = Array("\u{1b}[?2026h".utf8)
    private static let end = Array("\u{1b}[?2026l".utf8)

    /// Where the output is: between sequences and characters (the only place a mark may go) or inside one.
    private enum Scan {
        case ground, esc, escByte, csi, string, stringEsc
        case utf8(Int)
    }

    private static func step(_ s: Scan, _ b: UInt8) -> Scan {
        switch s {
        case .ground:
            if b == 0x1B { return .esc }
            if b >= 0xF0 { return .utf8(3) }
            if b >= 0xE0 { return .utf8(2) }
            if b >= 0xC0 { return .utf8(1) }
            return .ground
        case .utf8(let n):
            guard b & 0xC0 == 0x80 else { return step(.ground, b) }
            return n > 1 ? .utf8(n - 1) : .ground
        case .esc:
            switch b {
            case UInt8(ascii: "["): return .csi
            case UInt8(ascii: "]"), UInt8(ascii: "P"), UInt8(ascii: "X"), UInt8(ascii: "^"), UInt8(ascii: "_"): return .string
            case UInt8(ascii: "("), UInt8(ascii: ")"), UInt8(ascii: "*"), UInt8(ascii: "+"), UInt8(ascii: "#"), UInt8(ascii: "%"): return .escByte
            default: return .ground
            }
        case .escByte:
            return .ground
        case .csi:
            return (0x40...0x7E).contains(b) ? .ground : .csi
        case .string:
            return b == 0x07 ? .ground : b == 0x1B ? .stringEsc : .string
        case .stringEsc:
            return b == UInt8(ascii: "\\") ? .ground : .string
        }
    }

    private static func writeAll(_ fd: Int32, _ bytes: UnsafeRawBufferPointer) {
        var off = 0
        while off < bytes.count {
            let n = write(fd, bytes.baseAddress! + off, bytes.count - off)
            if n < 0 {
                if errno == EINTR || errno == EAGAIN { continue }
                return
            }
            off += n
        }
    }

    private static func writeAll(_ fd: Int32, _ bytes: [UInt8]) {
        bytes.withUnsafeBytes { writeAll(fd, $0) }
    }

    private static func milliseconds() -> Double {
        var t = timespec()
        clock_gettime(CLOCK_MONOTONIC, &t)
        return Double(t.tv_sec) * 1000 + Double(t.tv_nsec) / 1_000_000
    }

    static func run(_ argv: [String]) -> Never {
        guard !argv.isEmpty else { exit(2) }
        var size = winsize()
        _ = ioctl(0, TIOCGWINSZ, &size)
        var cooked = termios()
        let isTTY = tcgetattr(0, &cooked) == 0
        // The C strings exist before the fork: the child only calls execv.
        let cArgs = argv.map { strdup($0) } + [nil]
        var master: Int32 = -1
        let pid = isTTY ? forkpty(&master, nil, &cooked, &size) : forkpty(&master, nil, nil, &size)
        if pid < 0 { exit(1) }
        if pid == 0 {
            execv(cArgs[0]!, cArgs)
            _exit(127)
        }
        // Keys reach screen byte for byte; screen does its own line handling on its pty.
        if isTTY {
            var raw = cooked
            cfmakeraw(&raw)
            tcsetattr(0, TCSANOW, &raw)
        }
        // The view resized: the kernel tells us (SIGWINCH), we tell screen's pty.
        signal(SIGWINCH) { _ in winched = 1 }

        var fds = [pollfd(fd: 0, events: Int16(POLLIN), revents: 0), pollfd(fd: master, events: Int16(POLLIN), revents: 0)]
        var buffer = [UInt8](repeating: 0, count: 65_536)
        var scan = Scan.ground
        var marked = false
        var burstStart = 0.0, lastOutput = 0.0
        loop: while true {
            let ready = poll(&fds, 2, marked ? 2 : -1)
            if winched != 0 {
                winched = 0
                if ioctl(0, TIOCGWINSZ, &size) == 0 { _ = ioctl(master, TIOCSWINSZ, &size) }
            }
            if ready < 0 {
                if errno == EINTR { continue }
                break
            }
            if fds[0].revents & Int16(POLLIN | POLLHUP) != 0 {
                let n = read(0, &buffer, buffer.count)
                if n <= 0 { break loop }
                buffer.withUnsafeBytes { writeAll(master, UnsafeRawBufferPointer(rebasing: $0[0..<n])) }
            }
            if fds[1].revents & Int16(POLLIN | POLLHUP) != 0 {
                let n = read(master, &buffer, buffer.count)
                if n <= 0 { break loop }
                let now = milliseconds()
                if !marked {
                    writeAll(1, begin)
                    marked = true
                    burstStart = now
                }
                buffer.withUnsafeBytes { writeAll(1, UnsafeRawBufferPointer(rebasing: $0[0..<n])) }
                for i in 0..<n { scan = step(scan, buffer[i]) }
                lastOutput = now
            }
            if marked, case .ground = scan {
                let now = milliseconds()
                if now - lastOutput >= 4 || now - burstStart >= 50 {
                    writeAll(1, end)
                    marked = false
                }
            }
        }
        if marked { writeAll(1, end) }
        if isTTY { tcsetattr(0, TCSANOW, &cooked) }
        close(master)
        var status: Int32 = 0
        waitpid(pid, &status, 0)
        exit(status & 0x7F == 0 ? (status >> 8) & 0xFF : 1)
    }
}

/// Set by the SIGWINCH handler, read by the relay's loop.
nonisolated(unsafe) private var winched: sig_atomic_t = 0
