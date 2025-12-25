import { useState, useCallback, useRef } from "react";

export type TestPhase = "idle" | "ping" | "download" | "upload" | "complete";

export interface TestResults {
  ping: number;
  download: number;
  upload: number;
  jitter: number;
}

// Use public CDN files for testing
const TEST_FILES = [
  "https://speed.cloudflare.com/__down?bytes=500000", // 500KB
  "https://speed.cloudflare.com/__down?bytes=1000000", // 1MB
  "https://speed.cloudflare.com/__down?bytes=5000000", // 5MB
];

const UPLOAD_URL = "https://speed.cloudflare.com/__up";

export const useSpeedTest = () => {
  const [phase, setPhase] = useState<TestPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [results, setResults] = useState<TestResults>({
    ping: 0,
    download: 0,
    upload: 0,
    jitter: 0,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isRunningRef = useRef(false);

  const measurePing = async (signal: AbortSignal): Promise<{ ping: number; jitter: number }> => {
    const pings: number[] = [];
    const pingUrl = "https://speed.cloudflare.com/__down?bytes=0";
    
    for (let i = 0; i < 5; i++) {
      if (signal.aborted) throw new Error("Aborted");
      
      const start = performance.now();
      try {
        await fetch(pingUrl, { 
          cache: "no-store",
          signal,
        });
        const end = performance.now();
        pings.push(end - start);
      } catch (e) {
        if (signal.aborted) throw new Error("Aborted");
      }
      setProgress((i + 1) * 20);
    }
    
    if (pings.length === 0) return { ping: 0, jitter: 0 };
    
    const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;
    const jitter = pings.length > 1 
      ? Math.sqrt(pings.reduce((sum, p) => sum + Math.pow(p - avgPing, 2), 0) / pings.length)
      : 0;
    
    return { ping: avgPing, jitter };
  };

  const measureDownload = async (signal: AbortSignal): Promise<number> => {
    const speeds: number[] = [];
    
    for (let i = 0; i < TEST_FILES.length; i++) {
      if (signal.aborted) throw new Error("Aborted");
      
      const url = TEST_FILES[i];
      const startTime = performance.now();
      
      try {
        const response = await fetch(url, { 
          cache: "no-store",
          signal,
        });
        
        const reader = response.body?.getReader();
        if (!reader) continue;
        
        let bytesReceived = 0;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          bytesReceived += value.length;
          const elapsed = (performance.now() - startTime) / 1000;
          const speedMbps = (bytesReceived * 8) / (elapsed * 1000000);
          setCurrentSpeed(speedMbps);
        }
        
        const elapsed = (performance.now() - startTime) / 1000;
        const speedMbps = (bytesReceived * 8) / (elapsed * 1000000);
        speeds.push(speedMbps);
        
      } catch (e) {
        if (signal.aborted) throw new Error("Aborted");
      }
      
      setProgress(((i + 1) / TEST_FILES.length) * 100);
    }
    
    if (speeds.length === 0) return 0;
    return speeds.reduce((a, b) => a + b, 0) / speeds.length;
  };

  const measureUpload = async (signal: AbortSignal): Promise<number> => {
    const speeds: number[] = [];
    const testSizes = [250000, 500000, 1000000]; // 250KB, 500KB, 1MB
    
    for (let i = 0; i < testSizes.length; i++) {
      if (signal.aborted) throw new Error("Aborted");
      
      const data = new Blob([new ArrayBuffer(testSizes[i])]);
      const startTime = performance.now();
      
      try {
        await fetch(UPLOAD_URL, {
          method: "POST",
          body: data,
          signal,
        });
        
        const elapsed = (performance.now() - startTime) / 1000;
        const speedMbps = (testSizes[i] * 8) / (elapsed * 1000000);
        speeds.push(speedMbps);
        setCurrentSpeed(speedMbps);
        
      } catch (e) {
        if (signal.aborted) throw new Error("Aborted");
      }
      
      setProgress(((i + 1) / testSizes.length) * 100);
    }
    
    if (speeds.length === 0) return 0;
    return speeds.reduce((a, b) => a + b, 0) / speeds.length;
  };

  const startTest = useCallback(async () => {
    if (isRunningRef.current) return;
    
    isRunningRef.current = true;
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    setProgress(0);
    setCurrentSpeed(0);
    setResults({ ping: 0, download: 0, upload: 0, jitter: 0 });

    try {
      // Ping test
      setPhase("ping");
      setProgress(0);
      const { ping, jitter } = await measurePing(signal);
      setResults(prev => ({ ...prev, ping, jitter }));

      // Download test
      setPhase("download");
      setProgress(0);
      const download = await measureDownload(signal);
      setResults(prev => ({ ...prev, download }));

      // Upload test
      setPhase("upload");
      setProgress(0);
      const upload = await measureUpload(signal);
      setCurrentSpeed(upload);
      setResults(prev => ({ ...prev, upload }));

      // Complete
      setPhase("complete");
      setProgress(100);
      
    } catch (e) {
      // Test was aborted or failed
      if (!signal.aborted) {
        console.error("Speed test error:", e);
      }
    } finally {
      isRunningRef.current = false;
    }
  }, []);

  const stopTest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    isRunningRef.current = false;
    setPhase("idle");
    setProgress(0);
    setCurrentSpeed(0);
  }, []);

  return {
    phase,
    progress,
    currentSpeed,
    results,
    startTest,
    stopTest,
    isRunning: phase !== "idle" && phase !== "complete",
  };
};
