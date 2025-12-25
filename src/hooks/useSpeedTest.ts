import { useState, useCallback, useRef } from "react";

export type TestPhase = "idle" | "ping" | "download" | "upload" | "complete";

export interface TestResults {
  ping: number;
  download: number;
  upload: number;
  jitter: number;
}

// Larger files for more accurate testing
const DOWNLOAD_SIZES = [
  1000000,   // 1MB - warm up
  5000000,   // 5MB
  10000000,  // 10MB
  25000000,  // 25MB
];

const UPLOAD_SIZES = [
  500000,    // 500KB - warm up
  1000000,   // 1MB
  2000000,   // 2MB
  5000000,   // 5MB
];

const PING_COUNT = 10; // More ping samples for accuracy

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

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const measurePing = async (signal: AbortSignal): Promise<{ ping: number; jitter: number }> => {
    const pings: number[] = [];
    const pingUrl = "https://speed.cloudflare.com/__down?bytes=0";
    
    for (let i = 0; i < PING_COUNT; i++) {
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
      
      setProgress(((i + 1) / PING_COUNT) * 100);
      
      // Small delay between pings
      await delay(100);
    }
    
    if (pings.length === 0) return { ping: 0, jitter: 0 };
    
    // Remove outliers (highest and lowest)
    const sortedPings = [...pings].sort((a, b) => a - b);
    const trimmedPings = sortedPings.slice(1, -1);
    
    const avgPing = trimmedPings.reduce((a, b) => a + b, 0) / trimmedPings.length;
    const jitter = trimmedPings.length > 1 
      ? Math.sqrt(trimmedPings.reduce((sum, p) => sum + Math.pow(p - avgPing, 2), 0) / trimmedPings.length)
      : 0;
    
    return { ping: avgPing, jitter };
  };

  const measureDownload = async (signal: AbortSignal): Promise<number> => {
    const speeds: number[] = [];
    let totalProgress = 0;
    
    for (let i = 0; i < DOWNLOAD_SIZES.length; i++) {
      if (signal.aborted) throw new Error("Aborted");
      
      const bytes = DOWNLOAD_SIZES[i];
      const url = `https://speed.cloudflare.com/__down?bytes=${bytes}`;
      const startTime = performance.now();
      
      try {
        const response = await fetch(url, { 
          cache: "no-store",
          signal,
        });
        
        const reader = response.body?.getReader();
        if (!reader) continue;
        
        let bytesReceived = 0;
        const expectedBytes = bytes;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          bytesReceived += value.length;
          const elapsed = (performance.now() - startTime) / 1000;
          
          if (elapsed > 0) {
            const speedMbps = (bytesReceived * 8) / (elapsed * 1000000);
            setCurrentSpeed(speedMbps);
          }
          
          // Update progress within this file
          const fileProgress = bytesReceived / expectedBytes;
          const overallProgress = ((i + fileProgress) / DOWNLOAD_SIZES.length) * 100;
          setProgress(overallProgress);
        }
        
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 0 && bytesReceived > 0) {
          const speedMbps = (bytesReceived * 8) / (elapsed * 1000000);
          // Skip first measurement (warm-up)
          if (i > 0) {
            speeds.push(speedMbps);
          }
        }
        
      } catch (e) {
        if (signal.aborted) throw new Error("Aborted");
      }
      
      totalProgress = ((i + 1) / DOWNLOAD_SIZES.length) * 100;
      setProgress(totalProgress);
      
      // Brief pause between downloads
      await delay(200);
    }
    
    if (speeds.length === 0) return 0;
    
    // Use the average of all measurements (excluding warmup)
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    return avgSpeed;
  };

  const measureUpload = async (signal: AbortSignal): Promise<number> => {
    const speeds: number[] = [];
    
    for (let i = 0; i < UPLOAD_SIZES.length; i++) {
      if (signal.aborted) throw new Error("Aborted");
      
      const size = UPLOAD_SIZES[i];
      // Create random data for upload
      const data = new Blob([new Uint8Array(size).fill(0)]);
      const startTime = performance.now();
      
      try {
        await fetch("https://speed.cloudflare.com/__up", {
          method: "POST",
          body: data,
          signal,
        });
        
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 0) {
          const speedMbps = (size * 8) / (elapsed * 1000000);
          setCurrentSpeed(speedMbps);
          
          // Skip first measurement (warm-up)
          if (i > 0) {
            speeds.push(speedMbps);
          }
        }
        
      } catch (e) {
        if (signal.aborted) throw new Error("Aborted");
      }
      
      setProgress(((i + 1) / UPLOAD_SIZES.length) * 100);
      
      // Brief pause between uploads
      await delay(200);
    }
    
    if (speeds.length === 0) return 0;
    
    // Use the average of all measurements (excluding warmup)
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    return avgSpeed;
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

      await delay(500);

      // Download test
      setPhase("download");
      setProgress(0);
      const download = await measureDownload(signal);
      setResults(prev => ({ ...prev, download }));

      await delay(500);

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
