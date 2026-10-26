import AppKit

/// Finger count on the trackpad, read through the private MultitouchSupport framework (the same
/// technique MiddleClick uses). Only used to recognise a four-finger click inside the app.
private var mtFingers: Int32 = 0
private var mtLastFour: Double = 0

private let contactCallback: @convention(c) (Int32, UnsafeMutableRawPointer?, Int32, Double, Int32) -> Int32 = { _, _, fingers, _, _ in
    mtFingers = fingers
    if fingers >= 4 { mtLastFour = ProcessInfo.processInfo.systemUptime }
    return 0
}

enum Trackpad {
    private typealias CreateList = @convention(c) () -> Unmanaged<CFMutableArray>?
    private typealias Register = @convention(c) (UnsafeMutableRawPointer?, @convention(c) (Int32, UnsafeMutableRawPointer?, Int32, Double, Int32) -> Int32) -> Void
    private typealias Start = @convention(c) (UnsafeMutableRawPointer?, Int32) -> Void

    private static var devices: CFMutableArray?

    /// Starts listening on every multitouch device; false when the framework is unavailable.
    @discardableResult
    static func start() -> Bool {
        guard let lib = dlopen("/System/Library/PrivateFrameworks/MultitouchSupport.framework/MultitouchSupport", RTLD_NOW),
              let c = dlsym(lib, "MTDeviceCreateList"), let r = dlsym(lib, "MTRegisterContactFrameCallback"),
              let s = dlsym(lib, "MTDeviceStart") else { return false }
        let createList = unsafeBitCast(c, to: CreateList.self)
        let register = unsafeBitCast(r, to: Register.self)
        let startDevice = unsafeBitCast(s, to: Start.self)
        guard let list = createList()?.takeRetainedValue() else { return false }
        devices = list
        for i in 0..<CFArrayGetCount(list) {
            guard let dev = CFArrayGetValueAtIndex(list, i) else { continue }
            let ptr = UnsafeMutableRawPointer(mutating: dev)
            register(ptr, contactCallback)
            startDevice(ptr, 0)
        }
        return CFArrayGetCount(list) > 0
    }

    /// True when four or more fingers are (or were a moment ago) on the trackpad.
    static var fourFingersDown: Bool {
        mtFingers >= 4 || ProcessInfo.processInfo.systemUptime - mtLastFour < 0.25
    }
}
