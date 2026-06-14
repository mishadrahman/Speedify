export type TestPhase = 'idle' | 'pinging' | 'downloading' | 'uploading' | 'completed';

export interface TestMetrics {
  ping: number;
  jitter: number;
  download: number;
  upload: number;
}

export async function getClientInfo() {
  try {
    const res = await fetch('https://1.1.1.1/cdn-cgi/trace');
    const text = await res.text();
    const lines = text.split('\n');
    const info: Record<string, string> = {};
    lines.forEach(line => {
      const [k, v] = line.split('=');
      if (k) info[k] = v;
    });
    return {
      ip: info.ip || '',
      loc: info.loc || '',
    };
  } catch (e) {
    return { ip: 'Offline', loc: 'Local' };
  }
}

export class SpeedTestEngine {
  private phase: TestPhase = 'idle';
  
  // Endpoint Defaults: Leveraging Cloudflare's global edge network.
  private pingUrl = 'https://speed.cloudflare.com/__down?bytes=0';
  private downloadUrl = 'https://speed.cloudflare.com/__down?bytes=25000000'; // 25MB chunks
  private uploadUrl = 'https://speed.cloudflare.com/__up';

  onPhaseChange: (phase: TestPhase) => void = () => {};
  onProgress: (speed: number, progress: number) => void = () => {};
  onResult: (metrics: TestMetrics) => void = () => {};
  onJitterProgress: (jitter: number) => void = () => {};

  private abortController: AbortController | null = null;
  private active = false;

  getCurrentPhase() {
    return this.phase;
  }

  private setPhase(phase: TestPhase) {
    this.phase = phase;
    this.onPhaseChange(phase);
  }

  async start() {
    if (this.active) return;
    this.active = true;
    this.abortController = new AbortController();
    
    try {
      this.setPhase('pinging');
      const { ping, jitter } = await this.measurePingAndJitter();
      if (!this.active) return;

      this.setPhase('downloading');
      const download = await this.measureDownload();
      if (!this.active) return;

      this.setPhase('uploading');
      const upload = await this.measureUpload();
      if (!this.active) return;

      this.setPhase('completed');
      this.onResult({ ping, jitter, download, upload });

    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error("Speed test failed:", e);
      }
    } finally {
      this.active = false;
    }
  }

  stop() {
    this.active = false;
    this.abortController?.abort();
    this.setPhase('idle');
  }

  private async measurePingAndJitter(): Promise<{ping: number, jitter: number}> {
    const attempts = 10;
    const pings: number[] = [];
    
    for (let i = 0; i < attempts; i++) {
      if (!this.active) break;
      const start = performance.now();
      try {
        await fetch(`${this.pingUrl}&cb=${Date.now()}-${Math.random()}`, { 
          method: 'HEAD',
          cache: 'no-store',
          signal: this.abortController?.signal
        });
        const duration = performance.now() - start;
        pings.push(duration);
        
        const currentPing = Math.round(pings.reduce((a,b)=>a+b,0)/pings.length);
        
        let currentJitter = 0;
        if (pings.length > 1) {
          const diffs = [];
          for(let j=1; j<pings.length; j++) {
            diffs.push(Math.abs(pings[j] - pings[j-1]));
          }
          currentJitter = Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length);
          this.onJitterProgress(currentJitter);
        }
        
        this.onProgress(currentPing, ((i + 1) / attempts) * 100);
        
        await new Promise(r => setTimeout(r, 60));
      } catch (e) {
        // Ignore single failures
      }
    }
    
    if (pings.length === 0) return { ping: 0, jitter: 0 };
    const finalPing = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);
    
    let finalJitter = 0;
    if (pings.length > 1) {
       const diffs = [];
       for(let j=1; j<pings.length; j++) diffs.push(Math.abs(pings[j] - pings[j-1]));
       finalJitter = Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length);
    }
    
    return { ping: finalPing, jitter: finalJitter };
  }

  private async measureDownload(): Promise<number> {
    return new Promise(async (resolve) => {
      const threads = 6;
      let totalBytes = 0;
      const testDuration = 10000;
      const startTime = performance.now();
      let activeThreads = threads;
      let finalSpeed = 0;

      const runStream = async (threadIndex: number) => {
        while (this.active && (performance.now() - startTime < testDuration)) {
          try {
            const response = await fetch(`${this.downloadUrl}&cb=${Math.random()}`, {
              cache: 'no-store',
              signal: this.abortController?.signal
            });
            
            const reader = response.body?.getReader();
            if (!reader) break;

            while (this.active && (performance.now() - startTime < testDuration)) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) totalBytes += value.length;

              const duration = (performance.now() - startTime) / 1000;
              if (duration > 0.5) {
                 const mbps = (totalBytes * 8) / (1024 * 1024) / duration;
                 finalSpeed = mbps;
                 if (threadIndex === 0) { 
                    this.onProgress(parseFloat(mbps.toFixed(1)), Math.min(100, (duration / (testDuration/1000)) * 100));
                 }
              }
            }
          } catch (e) {
            break;
          }
        }
        activeThreads--;
        if (activeThreads === 0) {
          resolve(parseFloat(finalSpeed.toFixed(1)));
        }
      };

      for(let i = 0; i < threads; i++) runStream(i);
    });
  }

  private async measureUpload(): Promise<number> {
    return new Promise(async (resolve) => {
      const threads = 4;
      let totalBytes = 0;
      const testDuration = 10000;
      const startTime = performance.now();
      let finalSpeed = 0;
      let activeThreads = threads;

      // Create an empty ArrayBuffer, wrap it in a Blob with text/plain type.
      // This forces the browser to send as a simple request (no CORS preflight)
      // and avoids string encoding overheads.
      const payloadSize = 2 * 1024 * 1024; // 2MB chunk
      const buffer = new Uint8Array(payloadSize);
      const payload = new Blob([buffer], { type: 'text/plain' });

      const runStream = async (threadIndex: number) => {
        while (this.active && (performance.now() - startTime < testDuration)) {
          try {
            await fetch(`${this.uploadUrl}?cb=${Math.random()}`, {
              method: 'POST',
              body: payload,
              cache: 'no-store',
              signal: this.abortController?.signal
            });
            totalBytes += payloadSize;

            const duration = (performance.now() - startTime) / 1000;
            if (duration > 0.5) {
               const mbps = (totalBytes * 8) / (1024 * 1024) / duration;
               finalSpeed = mbps;
               if (threadIndex === 0) {
                 this.onProgress(parseFloat(mbps.toFixed(1)), Math.min(100, (duration / (testDuration/1000)) * 100));
               }
            }
          } catch (e) {
             console.error(`Upload error on thread ${threadIndex}:`, e);
             break;
          }
        }
        activeThreads--;
        if (activeThreads === 0) resolve(parseFloat(finalSpeed.toFixed(1)));
      };

      for(let i = 0; i < threads; i++) runStream(i);
    });
  }
}
