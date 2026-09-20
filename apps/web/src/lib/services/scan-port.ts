import net from "net";

export interface ScanResult {
  clean: boolean;
  threatName?: string | undefined;
  scannedAt: Date;
}

export interface ScanPort {
  scanBuffer(buffer: Buffer, fileName: string): Promise<ScanResult>;
}

export class ClamAvMalwareScanner implements ScanPort {
  private host: string;
  private port: number;
  private timeoutMs: number;

  constructor(options?: { host?: string; port?: number; timeoutMs?: number }) {
    this.host = options?.host ?? process.env["CLAMAV_HOST"] ?? "127.0.0.1";
    this.port = options?.port ?? Number(process.env["CLAMAV_PORT"] ?? 3310);
    this.timeoutMs = options?.timeoutMs ?? 10000;
  }

  async scanBuffer(buffer: Buffer, _fileName: string): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port }, () => {
        // INSTREAM command protocol for ClamAV
        socket.write("zINSTREAM\0");

        const chunkSize = 8192;
        for (let i = 0; i < buffer.length; i += chunkSize) {
          const chunk = buffer.subarray(i, i + chunkSize);
          const header = Buffer.alloc(4);
          header.writeUInt32BE(chunk.length, 0);
          socket.write(header);
          socket.write(chunk);
        }

        const endHeader = Buffer.alloc(4);
        endHeader.writeUInt32BE(0, 0);
        socket.write(endHeader);
      });

      let response = "";
      socket.setEncoding("utf8");
      socket.setTimeout(this.timeoutMs);

      socket.on("data", (data) => {
        response += data;
      });

      socket.on("end", () => {
        if (response.includes("OK")) {
          resolve({ clean: true, scannedAt: new Date() });
        } else if (response.includes("FOUND")) {
          const match = response.match(/stream:\s*(.+)\s+FOUND/);
          resolve({
            clean: false,
            threatName: match ? match[1] : "Virus detected",
            scannedAt: new Date(),
          });
        } else {
          reject(new Error(`Unexpected ClamAV response: ${response}`));
        }
      });

      socket.on("error", (err) => {
        socket.destroy();
        reject(err);
      });

      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("ClamAV socket timeout"));
      });
    });
  }
}

export class FallbackMalwareScanner implements ScanPort {
  async scanBuffer(_buffer: Buffer, _fileName: string): Promise<ScanResult> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Malware scanner is not configured in production. Failing closed.");
    }
    return {
      clean: true,
      scannedAt: new Date(),
    };
  }
}

export function getMalwareScanner(): ScanPort {
  if (process.env["CLAMAV_HOST"] || process.env["CLAMAV_PORT"]) {
    return new ClamAvMalwareScanner();
  }
  return new FallbackMalwareScanner();
}

export const malwareScanner: ScanPort = {
  scanBuffer(buffer: Buffer, fileName: string) {
    return getMalwareScanner().scanBuffer(buffer, fileName);
  },
};
