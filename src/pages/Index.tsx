import { useEffect } from "react";
import SpeedTest from "@/components/SpeedTest";
import { Gauge } from "lucide-react";

const Index = () => {
  useEffect(() => {
    document.title = "SpeedCheck - Internet Speed Test";
  }, []);

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="w-full py-6 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
            <Gauge className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-gradient">SpeedCheck</h1>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Test Your Internet Speed
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Check your connection's download and upload speeds in seconds
            </p>
          </div>

          <SpeedTest />
        </main>

        {/* Footer */}
        <footer className="w-full py-6 px-4 border-t border-border">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-muted-foreground text-sm">
              Results are simulated for demonstration. Actual speed tests require server infrastructure.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;
