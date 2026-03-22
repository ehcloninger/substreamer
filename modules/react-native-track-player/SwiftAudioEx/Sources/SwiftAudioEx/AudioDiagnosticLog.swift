//
//  AudioDiagnosticLog.swift
//  SwiftAudio
//
//  Thread-safe, auto-rotating file logger for audio playback diagnostics.
//  Writes to Documents/audio-diagnostics.log, inspectable from the app's
//  file explorer (Settings > File Explorer).
//
//  Logging is disabled by default.  To enable, create the flag file
//  Documents/audio-diagnostics-enabled (the JS layer manages this via
//  the Audio Diagnostics toggle in developer settings).
//

import Foundation

final class AudioDiagnosticLog {
    static let shared = AudioDiagnosticLog()

    private let queue = DispatchQueue(label: "com.substreamer.audiolog", qos: .utility)
    private let maxSize: UInt64 = 512 * 1024  // 512KB cap
    private let logUrl: URL
    private let enabledFlagUrl: URL
    private let formatter: ISO8601DateFormatter

    private init() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        logUrl = docs.appendingPathComponent("audio-diagnostics.log")
        enabledFlagUrl = docs.appendingPathComponent("audio-diagnostics-enabled")
        formatter = ISO8601DateFormatter()
    }

    func log(_ message: String) {
        let timestamp = formatter.string(from: Date())
        let line = "[\(timestamp)] \(message)\n"
        queue.async { [self] in
            // Skip if logging is not enabled (flag file absent)
            guard FileManager.default.fileExists(atPath: enabledFlagUrl.path) else { return }
            // Rotate if over size limit
            if let attrs = try? FileManager.default.attributesOfItem(atPath: logUrl.path),
               let size = attrs[.size] as? UInt64, size > maxSize {
                let oldUrl = logUrl.deletingPathExtension().appendingPathExtension("old.log")
                try? FileManager.default.removeItem(at: oldUrl)
                try? FileManager.default.moveItem(at: logUrl, to: oldUrl)
            }
            // Append
            if let data = line.data(using: .utf8) {
                if FileManager.default.fileExists(atPath: logUrl.path) {
                    if let handle = try? FileHandle(forWritingTo: logUrl) {
                        handle.seekToEndOfFile()
                        handle.write(data)
                        handle.closeFile()
                    }
                } else {
                    try? data.write(to: logUrl, options: .atomic)
                }
            }
        }
    }
}
