export interface ScanResult {
  clean: boolean;
  threatName?: string | undefined;
  scannedAt: Date;
}

export interface ScanPort {
  scanBuffer(buffer: Buffer, fileName: string): Promise<ScanResult>;
}

/**
 * Stub implementation of ScanPort.
 * Marks all uploads as clean for now, ready for ClamAV socket adapter integration.
 */
export class StubMalwareScanner implements ScanPort {
  async scanBuffer(_buffer: Buffer, _fileName: string): Promise<ScanResult> {
    return {
      clean: true,
      scannedAt: new Date(),
    };
  }
}

export const malwareScanner: ScanPort = new StubMalwareScanner();
