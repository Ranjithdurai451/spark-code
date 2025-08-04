"use client"
import { DSAChatbotTrigger } from "@/components/Chatbot";
import CodeEditor from "@/components/CodeEditor";
import Header from "@/components/Header";
import SidePanel from "@/components/SidePanel";
import MobileNotSupported from "@/components/MobileNotSupported";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useEffect, useState } from "react";

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return <MobileNotSupported />;
  }

  return (
    <div className="flex flex-col h-screen bg-muted/20">
      <Header />
      <div className="flex-1 p-2 gap-2 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full gap-2">
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full bg-background rounded-xl border shadow-sm overflow-hidden">
              <CodeEditor />
            </div>
          </ResizablePanel>
          <ResizableHandle
            withHandle
            className="w-2 bg-transparent hover:bg-primary/10 transition-colors focus:outline-none focus:ring-0 border-0 rounded-full"
          />
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full bg-background rounded-xl border shadow-sm overflow-hidden">
              <SidePanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <DSAChatbotTrigger />
    </div>
  );
}
// className = "h-full w-full"
// style = {{ height: "100%", minHeight: 0 }}
// // FIX: Remove invalid viewportProps, use ref directly on ScrollArea
// ref = { scrollAreaRef }