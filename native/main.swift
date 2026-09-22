import Foundation
import IOKit.pwr_mgt

// Native messaging only: no sockets, launch agents, or persistent preferences.
let queue = DispatchQueue(label: "ug-zombie.power")
var assertion: IOPMAssertionID = 0
var lastHeartbeat = Date.distantPast
var active = false

func release() {
    if assertion != 0 { IOPMAssertionRelease(assertion); assertion = 0 }
    active = false
}
func reply(_ ok: Bool) {
    let data = try! JSONSerialization.data(withJSONObject: ["ok": ok])
    var length = UInt32(data.count).littleEndian
    FileHandle.standardOutput.write(Data(bytes: &length, count: 4))
    FileHandle.standardOutput.write(data)
}
func renew() -> Bool {
    // Re-declare real user activity to suppress the macOS idle screensaver.
    // Reusing the assertion updates its activity time; release on blur/pause/EOF.
    return IOPMAssertionDeclareUserActivity("Ultimate Guitar autoscroll" as CFString,
        kIOPMUserActiveLocal, &assertion) == kIOReturnSuccess
}
let timer = DispatchSource.makeTimerSource(queue: queue)
timer.schedule(deadline: .now() + 2, repeating: 2)
timer.setEventHandler {
    if active && Date().timeIntervalSince(lastHeartbeat) > 10 { release() }
    if active && !renew() { release() }
}
timer.resume()
func readExactly(_ count: Int) -> Data? {
    var result = Data()
    while result.count < count {
        let chunk = FileHandle.standardInput.readData(ofLength: count - result.count)
        if chunk.isEmpty { return nil }
        result.append(chunk)
    }
    return result
}
while let header = readExactly(4) {
    let length = header.enumerated().reduce(UInt32(0)) { $0 | UInt32($1.element) << (8 * $1.offset) }
    guard length > 0 && length <= 4096, let data = readExactly(Int(length)),
          let message = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let requested = message["active"] as? Bool else { break }
    queue.sync {
        if requested {
            lastHeartbeat = Date()
            active = renew()
            reply(active)
        } else { release(); reply(true) }
    }
}
queue.sync { release() }
timer.cancel()
