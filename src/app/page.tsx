// Simplified page.tsx without window detection
"use client";

import { DSAChatbotTrigger } from "@/components/Chatbot";
import CodeEditor from "@/components/CodeEditor";
import Header from "@/components/Header";
import SidePanel from "@/components/SidePanel";
import MobileNotSupported from "@/components/MobileNotSupported";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

export default function Home() {
  return (
    <>
      {/* Show mobile message on small screens */}
      {/* <div className="lg:hidden">
        <MobileNotSupported />
      </div> */}

      {/* Show desktop layout on large screens */}
      {/* <div className="hidden lg:flex flex-col h-screen bg-muted/20"> */}
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
    </>
  );
}
