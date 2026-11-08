import Foundation
import IOKit.ps

/// Power save: the dashboard's map draws fewer and smaller frames, in front too, and its cinematic camera doesn't
/// start on its own (QUALITY in orbit/index.js). Off unless asked for, on battery too: the switch on the map turns it
/// on or off, and it comes on by itself below 20% battery or in Low Power Mode, as Windows' battery saver does
/// (Settings can turn that off). Turned off by hand while it was on by itself, it stays off until the Mac charges.
@MainActor
final class PowerSaver {
    static let shared = PowerSaver()
    /// Below this charge (%), on battery, power save comes on by itself.
    static let threshold = 20

    /// Called on a change of anything the page shows (the battery's charge too).
    var onChange: (() -> Void)?
    /// Whether the map saves power now.
    var on: Bool { chosen || automatic }
    /// The map's switch, kept.
    private(set) var chosen = UserDefaults.standard.bool(forKey: "powerSave")
    /// Settings' "on by itself at low battery".
    private(set) var auto = UserDefaults.standard.object(forKey: "powerSaveAuto") as? Bool ?? true
    /// On by itself now.
    private(set) var automatic = false
    /// Turned off by hand while it was on by itself: off until the battery is no longer low.
    private var dismissed = false
    /// The battery's charge (%) while the Mac runs on it.
    private(set) var battery: Int?
    private(set) var lowPower = false
    private var source: CFRunLoopSource?
    private var sent = ""

    private init() {}

    func start() {
        guard source == nil else { return }
        // The power source (adapter or battery) or the battery's charge changed; IOKit calls back on the main run loop.
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

    /// The map's switch.
    func choose(_ value: Bool) {
        chosen = value
        UserDefaults.standard.set(value, forKey: "powerSave")
        if !value, automatic {
            automatic = false
            dismissed = true
        }
        changed()
    }

    /// Settings: on by itself at low battery, or never.
    func setAuto(_ value: Bool) {
        auto = value
        UserDefaults.standard.set(value, forKey: "powerSaveAuto")
        update()
    }

    private func update() {
        battery = Self.charge()
        lowPower = ProcessInfo.processInfo.isLowPowerModeEnabled
        let low = lowPower || (battery.map { $0 < Self.threshold } ?? false)
        if !low { dismissed = false }
        automatic = auto && low && !dismissed
        changed()
    }

    private func changed() {
        let now = json
        guard now != sent else { return }
        sent = now
        onChange?()
    }

    /// For the page: the map's switch and Settings' row.
    var json: String {
        let state: [String: Any] = ["on": on, "chosen": chosen, "auto": auto, "automatic": automatic, "lowPower": lowPower,
                                    "battery": battery.map { $0 as Any } ?? NSNull(), "threshold": Self.threshold]
        guard let data = try? JSONSerialization.data(withJSONObject: state, options: [.sortedKeys]) else { return "null" }
        return String(decoding: data, as: UTF8.self)
    }

    /// The internal battery's charge (%), while the Mac runs on it; nil on the adapter or without a battery.
    private static func charge() -> Int? {
        guard let info = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let type = IOPSGetProvidingPowerSourceType(info)?.takeUnretainedValue(), (type as String) == kIOPMBatteryPowerKey,
              let list = IOPSCopyPowerSourcesList(info)?.takeRetainedValue() as? [CFTypeRef] else { return nil }
        for ps in list {
            guard let d = IOPSGetPowerSourceDescription(info, ps)?.takeUnretainedValue() as? [String: Any],
                  d[kIOPSTypeKey] as? String == kIOPSInternalBatteryType,
                  let now = d[kIOPSCurrentCapacityKey] as? Int, let max = d[kIOPSMaxCapacityKey] as? Int, max > 0 else { continue }
            return now * 100 / max
        }
        return nil
    }
}
