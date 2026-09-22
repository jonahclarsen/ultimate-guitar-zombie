import Foundation
struct Manifest: Encodable {
    let name = "com.ultimate_guitar_zombie.awake"
    let description = "Ultimate Guitar Zombie screensaver helper"
    let path: String
    let type = "stdio"
    let allowed_origins: [String]
}
let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
let manifest = Manifest(path: CommandLine.arguments[1], allowed_origins: ["chrome-extension://\(CommandLine.arguments[2])/"])
FileHandle.standardOutput.write(try encoder.encode(manifest))
