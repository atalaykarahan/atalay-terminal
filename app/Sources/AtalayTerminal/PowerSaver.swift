import Foundation
import IOKit.ps

/// Whether the Mac runs on battery or in Low Power Mode. The dashboard's map then draws fewer and smaller frames,
/// in front too, and its cinematic camera doesn't start on its own (QUALITY in orbit/index.js).
@MainActor
final class PowerSaver {
    static let shared = PowerSaver()

    /// Called on a change, with the new value.
    var onChange: ((Bool) -> Void)?
    private(set) var on = false
    private var source: CFRunLoopSource?

    private init() {}

    func start() {
        guard source == nil else { return }
        // The power source (adapter or battery) changed; IOKit calls back on the main run loop.
        let me = Unmanaged.passUnretained(self).toOpaque()
        if let s = IOPSNotificationCreateRunLoopSource({ ctx in
            guard let ctx else { return }
            let saver = Unmanaged<PowerSaver>.fromOpaque(ctx).takeUnretainedValue()
            MainActor.assumeIsolated { saver.update() }
        }, me)?.takeRetainedValue() {
            CFRunLoopAddSource(CFRunLoopGetMain(), s, .commonModes)
            source = s
        }
        NotificationCenter.default.addObserver(forName: .NSProcessInfoPowerStateDidChange, object: nil, queue: .main) { _ in
            MainActor.assumeIsolated { PowerSaver.shared.update() }
        }
        update()
    }

    private func update() {
        let now = ProcessInfo.processInfo.isLowPowerModeEnabled || Self.onBattery()
        guard now != on else { return }
        on = now
        onChange?(now)
    }

    private static func onBattery() -> Bool {
        guard let info = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let type = IOPSGetProvidingPowerSourceType(info)?.takeUnretainedValue() else { return false }
        return (type as String) == kIOPMBatteryPowerKey
    }
}
