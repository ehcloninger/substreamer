import ExpoModulesCore
import Foundation
import zlib

public class ExpoGzipModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ExpoGzip")

        AsyncFunction("compressToFile") { (data: String, destUri: String) -> [String: Any] in
            guard let inputData = data.data(using: .utf8) else {
                throw GzipError.encodingFailed
            }
            guard let destUrl = URL(string: destUri) else {
                throw GzipError.invalidUri
            }

            let compressed = try Self.gzipCompress(inputData)
            try compressed.write(to: destUrl)

            return ["bytes": compressed.count]
        }

        AsyncFunction("decompressFromFile") { (sourceUri: String) -> String in
            guard let sourceUrl = URL(string: sourceUri) else {
                throw GzipError.invalidUri
            }

            let compressedData = try Data(contentsOf: sourceUrl)
            let decompressed = try Self.gzipDecompress(compressedData)

            guard let result = String(data: decompressed, encoding: .utf8) else {
                throw GzipError.encodingFailed
            }
            return result
        }
    }

    private static func gzipCompress(_ data: Data) throws -> Data {
        guard !data.isEmpty else { return Data() }

        var stream = z_stream()

        let status = deflateInit2_(
            &stream,
            Z_DEFAULT_COMPRESSION,
            Z_DEFLATED,
            MAX_WBITS + 16, // +16 for gzip header
            MAX_MEM_LEVEL,
            Z_DEFAULT_STRATEGY,
            ZLIB_VERSION,
            Int32(MemoryLayout<z_stream>.size)
        )
        guard status == Z_OK else {
            throw GzipError.compressionFailed(status)
        }

        let bufferSize = Int(deflateBound(&stream, UInt(data.count)))
        let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
        defer { buffer.deallocate() }

        let result: Int32 = data.withUnsafeBytes { inPtr in
            stream.next_in = UnsafeMutablePointer<Bytef>(mutating: inPtr.bindMemory(to: Bytef.self).baseAddress!)
            stream.avail_in = uInt(data.count)
            stream.next_out = buffer
            stream.avail_out = uInt(bufferSize)
            return deflate(&stream, Z_FINISH)
        }

        guard result == Z_STREAM_END else {
            deflateEnd(&stream)
            throw GzipError.compressionFailed(result)
        }

        let compressed = Data(bytes: buffer, count: Int(stream.total_out))
        deflateEnd(&stream)
        return compressed
    }

    private static func gzipDecompress(_ data: Data) throws -> Data {
        guard !data.isEmpty else { return Data() }

        var stream = z_stream()

        let status = inflateInit2_(
            &stream,
            MAX_WBITS + 16, // +16 for gzip header
            ZLIB_VERSION,
            Int32(MemoryLayout<z_stream>.size)
        )
        guard status == Z_OK else {
            throw GzipError.decompressionFailed(status)
        }

        var decompressed = Data(capacity: data.count * 4)
        let chunkSize = 65_536
        var buffer = Data(count: chunkSize)

        try data.withUnsafeBytes { inPtr in
            stream.next_in = UnsafeMutablePointer<Bytef>(mutating: inPtr.bindMemory(to: Bytef.self).baseAddress!)
            stream.avail_in = uInt(data.count)

            repeat {
                let result: Int32 = buffer.withUnsafeMutableBytes { outPtr in
                    stream.next_out = outPtr.bindMemory(to: Bytef.self).baseAddress!
                    stream.avail_out = uInt(chunkSize)
                    return inflate(&stream, Z_NO_FLUSH)
                }

                guard result == Z_OK || result == Z_STREAM_END else {
                    inflateEnd(&stream)
                    throw GzipError.decompressionFailed(result)
                }

                let produced = chunkSize - Int(stream.avail_out)
                decompressed.append(buffer.prefix(produced))

                if result == Z_STREAM_END { break }
            } while stream.avail_out == 0
        }

        inflateEnd(&stream)
        return decompressed
    }
}

private enum GzipError: Error, LocalizedError {
    case encodingFailed
    case invalidUri
    case compressionFailed(Int32)
    case decompressionFailed(Int32)

    var errorDescription: String? {
        switch self {
        case .encodingFailed: return "UTF-8 encoding/decoding failed"
        case .invalidUri: return "Invalid file URI"
        case .compressionFailed(let code): return "Gzip compression failed (zlib error \(code))"
        case .decompressionFailed(let code): return "Gzip decompression failed (zlib error \(code))"
        }
    }
}
