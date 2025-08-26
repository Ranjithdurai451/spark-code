"use client";

import { DSAChatbotTrigger } from "@/components/root/Chatbot";
import CodeEditor from "@/components/features/editor/CodeEditor";
import Providers from "@/components/root/providers";
import SidePanel from "@/components/features/sidepanel/SidePanel";
import Header from "@/components/root/Header";
import MobileNotSupported from "@/components/root/MobileNotSupported";
import { useState, useEffect, useRef, useCallback, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Code2, Layout, ChevronRight, PanelRightOpen, Maximize2, GripVertical, Move } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence, useMotionValue, useDragControls, MotionValue, DragControls } from "framer-motion";
import { useCredentialsStore } from "@/components/root/credentialsStore";
import BYOKDialog from "@/components/root/BYOKDialog";
import { useSessionSync } from "@/components/root/useSessionSync";

type ViewMode = 'normal' | 'code';

// Helper easing curves
const smoothEase = [0.23, 1, 0.32, 1] as const;
const bounceEase = [0.68, -0.55, 0.265, 1.55] as const;

// ############################################################################
// ## Sub-components moved outside of Home to preserve state on re-renders ##
// ############################################################################

interface DraggableControlsProps {
  controlsX: MotionValue<number>;
  controlsY: MotionValue<number>;
  dragControls: DragControls;
  containerRef: RefObject<HTMLDivElement>;
  isControlsDragging: boolean;
  setIsControlsDragging: (isDragging: boolean) => void;
  viewMode: ViewMode;
  isTransitioning: boolean;
  isPanelVisible: boolean;
  togglePanel: () => void;
  toggleViewMode: () => void;
}

const DraggableControls = ({
  controlsX, controlsY, dragControls, containerRef, isControlsDragging, setIsControlsDragging, viewMode, isTransitioning, isPanelVisible, togglePanel, toggleViewMode
}: DraggableControlsProps) => (
  <motion.div
    className="fixed z-50"
    style={{
      top: "5px", left: "50%", translateX: "-50%",
      x: controlsX,
      y: controlsY
    }}
    drag
    dragListener={false}
    dragControls={dragControls}
    dragConstraints={containerRef}
    dragElastic={0.1}
    dragMomentum={false}
    onDragStart={() => setIsControlsDragging(true)}
    onDragEnd={() => setIsControlsDragging(false)}
    whileHover={{ scale: 1.02 }}
    whileDrag={{ scale: 1.05, rotate: 1 }}
  >
    <TooltipProvider>
      <motion.div
        className={cn(
          "flex items-center gap-1 bg-background/95 backdrop-blur-3xl rounded-2xl border shadow-xl p-1.5",
          "ring-1 ring-white/5 select-none",
          isControlsDragging && "shadow-2xl ring-2 ring-primary/20 border-primary/20"
        )}
        animate={{ boxShadow: isControlsDragging ? "0 25px 80px -10px rgba(0, 0, 0, 0.25)" : "0 15px 40px -5px rgba(0, 0, 0, 0.12)" }}
        transition={{ duration: 0.2, ease: smoothEase }}
      >
        <motion.div
          className="flex items-center justify-center w-7 h-7 rounded-xl bg-muted/20 cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
          whileHover={{ backgroundColor: "rgba(var(--primary) / 0.1)", scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ backgroundColor: isControlsDragging ? "rgba(var(--primary) / 0.15)" : "rgba(var(--muted) / 0.2)" }}
        >
          <Move className="w-3 h-3 text-muted-foreground pointer-events-none" />
        </motion.div>
        <AnimatePresence>
          {viewMode === 'normal' && !isTransitioning && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: smoothEase }}
              style={{ overflow: "hidden" }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={togglePanel} className="h-8 w-8 hover:bg-muted/40 transition-all duration-300 rounded-xl">
                    <motion.div animate={{ rotate: isPanelVisible ? 0 : 180 }} transition={{ duration: 0.4, ease: bounceEase }}>
                      <ChevronRight className="w-4 h-4" />
                    </motion.div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isPanelVisible ? 'Hide Panel' : 'Show Panel'} (Ctrl+B)</p></TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'code' ? "default" : "ghost"} size="sm" onClick={toggleViewMode} disabled={isTransitioning}
              className={cn("h-8 w-8 transition-all duration-400 rounded-xl relative overflow-hidden", viewMode === 'code' ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : "hover:bg-muted/40", isTransitioning && "opacity-50 cursor-not-allowed")}
            >
              <motion.div className="relative z-10" animate={{ scale: isTransitioning ? 0.9 : 1 }} transition={{ duration: 0.2, ease: smoothEase }}>
                <AnimatePresence mode="wait">
                  <motion.div key={viewMode} initial={{ opacity: 0, scale: 0.6, rotate: -45 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.6, rotate: 45 }} transition={{ duration: 0.3, ease: bounceEase }}>
                    {viewMode === 'code' ? <Layout className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
              <AnimatePresence>
                {viewMode === 'code' && (<motion.div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.4, ease: bounceEase }} />)}
              </AnimatePresence>
            </Button>
          </TooltipTrigger>
          {/* ## CHANGE: Renamed "Focus Mode" to "Code Mode" ## */}
          <TooltipContent><div className="text-center"><p>{viewMode === 'code' ? 'Normal View' : 'Code Mode'}</p><p className="text-xs text-muted-foreground">Ctrl+Shift+F</p></div></TooltipContent>
        </Tooltip>
      </motion.div>
    </TooltipProvider>
  </motion.div >
);

const ModeIndicator = ({ viewMode }: { viewMode: ViewMode }) => (
  <AnimatePresence>
    {viewMode === 'code' && (
      <motion.div className="fixed bottom-6 left-6 z-50" initial={{ opacity: 0, y: 30, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.8 }} transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.3 }}>
        <Badge variant="outline" className="bg-background/95 backdrop-blur-2xl border-primary/30 text-primary px-6 py-3 shadow-xl rounded-2xl">
          <Code2 className="w-4 h-4 mr-3" />
          {/* ## CHANGE: Renamed "Focus Mode" to "Code Mode" ## */}
          <span className="font-medium">Code Mode</span>
          <span className="ml-4 text-xs text-muted-foreground opacity-70">Press Esc to exit</span>
        </Badge>
      </motion.div>
    )}
  </AnimatePresence>
);

const PanelExpander = ({ isPanelVisible, viewMode, isTransitioning, showPanel }: { isPanelVisible: boolean; viewMode: ViewMode; isTransitioning: boolean; showPanel: () => void; }) => (
  <AnimatePresence>
    {!isPanelVisible && viewMode === 'normal' && !isTransitioning && (
      <motion.div className="fixed right-4 top-1/2 -translate-y-1/2 z-40" initial={{ opacity: 0, x: 30, scale: 0.8 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 30, scale: 0.8 }} transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.2 }}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div whileHover={{ scale: 1.05, x: -4 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="lg" onClick={showPanel} className="h-24 w-12 rounded-2xl bg-background/95 hover:bg-primary/5 border border-border/40 shadow-xl backdrop-blur-2xl transition-all duration-300 flex flex-col gap-2">
                  <motion.div animate={{ x: [-2, 2, -2] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}><PanelRightOpen className="w-5 h-5 text-primary" /></motion.div>
                  <div className="w-1 h-8 bg-gradient-to-b from-primary/30 via-primary/60 to-primary/30 rounded-full" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="left"><p>Show Side Panel</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    )}
  </AnimatePresence>
);

// Smooth Resize Handle with proper mouse tracking
interface ResizeHandleProps {
  isPanelVisible: boolean;
  viewMode: ViewMode;
  onResize: (width: number) => void;
  panelWidth: number;
  containerRef: RefObject<HTMLDivElement>;
}

const SmoothResizeHandle = ({ isPanelVisible, viewMode, onResize, panelWidth, containerRef }: ResizeHandleProps) => {
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const newWidth = containerRect.width - mouseX;
      const clampedWidth = Math.max(300, Math.min(containerRect.width * 0.6, newWidth));

      onResize(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, onResize, containerRef]);

  return (
    <AnimatePresence>
      {isPanelVisible && viewMode === 'normal' && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-2 z-30 cursor-col-resize group flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onMouseDown={() => setIsResizing(true)}
        >
          <motion.div
            className="w-1 h-full bg-transparent group-hover:bg-primary/20 rounded-full transition-colors duration-200"
            animate={{
              backgroundColor: isResizing ? "rgba(var(--primary) / 0.4)" : "transparent",
              width: isResizing ? "2px" : "1px"
            }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            animate={{
              // opacity: isResizing ? 1 : 0,
              // scale: isResizing ? 1.2 : 1
            }}
          // transition={{ duration: 0.2 }}
          >
            <GripVertical className="w-3 h-3 text-primary/80" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ###############################################
// ## Main Home Component
// ###############################################

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [panelWidth, setPanelWidth] = useState(600);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isControlsDragging, setIsControlsDragging] = useState(false);
  // ## NEW: Track if this is the initial render
  const [hasInitiallyRendered, setHasInitiallyRendered] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsX = useMotionValue(0);
  const controlsY = useMotionValue(0);
  const dragControls = useDragControls();

  const quickEase = [0.4, 0, 0.2, 1] as const;

  // ## NEW: Set the initial render flag after the first render
  useEffect(() => {
    // Small delay to ensure the component has fully mounted
    const timer = setTimeout(() => {
      setHasInitiallyRendered(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTransitioning) return;
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); toggleViewMode(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b' && viewMode === 'normal') { event.preventDefault(); togglePanel(); }
      // ## CHANGE: Renamed function call to exitCodeMode ##
      if (event.key === 'Escape' && viewMode === 'code') { event.preventDefault(); exitCodeMode(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, isTransitioning]);

  const toggleViewMode = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    const isEnteringCodeMode = viewMode === 'normal';
    setViewMode(isEnteringCodeMode ? 'code' : 'normal');
    if (!isEnteringCodeMode) {
      setTimeout(() => setIsPanelVisible(true), 200);
    }
    setTimeout(() => setIsTransitioning(false), 600);
  }, [viewMode, isTransitioning]);

  // ## CHANGE: Renamed function from exitFocusMode to exitCodeMode ##
  const exitCodeMode = useCallback(() => {
    if (isTransitioning || viewMode === 'normal') return;
    setIsTransitioning(true);
    setViewMode('normal');
    setTimeout(() => setIsPanelVisible(true), 200);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [viewMode, isTransitioning]);

  const togglePanel = useCallback(() => {
    if (viewMode !== 'normal' || isTransitioning) return;
    setIsPanelVisible(prev => !prev);
  }, [viewMode, isTransitioning]);

  const showPanel = useCallback(() => {
    if (viewMode === 'normal' && !isTransitioning) { setIsPanelVisible(true); }
  }, [viewMode, isTransitioning]);

  const handlePanelResize = useCallback((width: number) => {
    setPanelWidth(width);
  }, []);

  const containerVariants = {
    normal: { background: "hsl(var(--muted) / 0.15)", transition: { duration: 0.6, ease: smoothEase } },
    code: { background: "hsl(var(--background))", transition: { duration: 0.6, ease: smoothEase } }
  };
  const headerVariants = {
    visible: { opacity: 1, y: 0, height: "auto", transition: { duration: 0.5, ease: smoothEase, opacity: { duration: 0.3, delay: 0.1 }, height: { duration: 0.6 } } },
    hidden: { opacity: 0, y: -30, height: 0, transition: { duration: 0.4, ease: quickEase, opacity: { duration: 0.2 }, height: { duration: 0.5, delay: 0.1 } } }
  };
  const contentVariants = {
    normal: { padding: "0.75rem", transition: { duration: 0.6, ease: smoothEase } },
    code: { padding: "0rem", transition: { duration: 0.6, ease: smoothEase } }
  };
  const editorVariants = {
    normal: { borderRadius: "0.875rem", transition: { duration: 0.6, ease: smoothEase } },
    code: { borderRadius: "0rem", transition: { duration: 0.6, ease: smoothEase } }
  };

  // ## UPDATED: Dynamic panel variants based on initial render state
  const panelVariants = {
    visible: {
      x: 0,
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      visibility: "visible",
      transition: hasInitiallyRendered ? {
        // Full animation for non-initial renders (toggles, mode switches)
        duration: 0.5,
        ease: smoothEase,
        staggerChildren: 0.03,
        delayChildren: 0.1,
        opacity: { duration: 0.5, ease: smoothEase },
        x: { duration: 0.5, ease: smoothEase },
        scale: { duration: 0.5, ease: smoothEase },
        filter: { duration: 0.5, ease: smoothEase }
      } : {
        // Instant transition for initial render
        duration: 0,
        opacity: { duration: 0 },
        x: { duration: 0 },
        scale: { duration: 0 },
        filter: { duration: 0 }
      }
    },
    hidden: {
      x: 40,
      opacity: 0,
      scale: 0.96,
      filter: "blur(4px)",
      visibility: "hidden",
      transition: {
        duration: 0.4,
        ease: smoothEase,
        when: "afterChildren",
        opacity: { duration: 0.4, ease: smoothEase },
        x: { duration: 0.4, ease: smoothEase },
        scale: { duration: 0.4, ease: smoothEase },
        filter: { duration: 0.4, ease: smoothEase }
      }
    }
  };

  useSessionSync();
  const { hasApiKeys } = useCredentialsStore();
  return (
    <Providers>
      <div className="lg:hidden"><MobileNotSupported /></div>
      <div className="hidden lg:block">   <BYOKDialog open={!hasApiKeys()} onOpenChange={() => { }} /></div>

      <motion.div ref={containerRef} className="hidden lg:flex flex-col h-screen relative overflow-hidden" variants={containerVariants} animate={viewMode} initial={false}>
        <AnimatePresence mode="wait">
          {viewMode === 'normal' && (
            <motion.div variants={headerVariants} initial="visible" animate="visible" exit="hidden" style={{ overflow: "hidden" }}><Header /></motion.div>
          )}
        </AnimatePresence>

        <DraggableControls
          controlsX={controlsX}
          controlsY={controlsY}
          dragControls={dragControls}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          isControlsDragging={isControlsDragging}
          setIsControlsDragging={setIsControlsDragging}
          viewMode={viewMode}
          isTransitioning={isTransitioning}
          isPanelVisible={isPanelVisible}
          togglePanel={togglePanel}
          toggleViewMode={toggleViewMode}
        />
        <ModeIndicator viewMode={viewMode} />

        <motion.div className="flex-1 overflow-hidden relative" variants={contentVariants} animate={viewMode} initial={false}>
          <div className="flex h-full gap-3">
            <motion.div
              className="flex-1 h-full bg-background overflow-hidden border shadow-xl"
              variants={editorVariants}
              animate={viewMode}
              initial={false}
              style={{
                marginRight: isPanelVisible && viewMode === 'normal' ? `${panelWidth}px` : 0,
                boxShadow: viewMode === 'code' ? "none" : "0 15px 40px -5px rgba(0, 0, 0, 0.12), 0 8px 25px -5px rgba(0, 0, 0, 0.08)"
              }}
              transition={{
                marginRight: { duration: 0.5, ease: smoothEase },
                boxShadow: { duration: 0.6, ease: smoothEase }
              }}
            >
              <CodeEditor />
            </motion.div>

            {/* ## UPDATED: SidePanel with conditional initial animation ## */}
            <AnimatePresence>
              {viewMode === 'normal' && (
                <motion.div
                  className="absolute right-0 top-0 h-full bg-background overflow-hidden z-20"
                  style={{ width: panelWidth }}
                  variants={panelVariants}
                  // ## UPDATED: Use different initial state based on render status
                  initial={hasInitiallyRendered ? "hidden" : "visible"}
                  animate={isPanelVisible ? "visible" : "hidden"}
                  exit="hidden"
                >
                  <SmoothResizeHandle
                    isPanelVisible={isPanelVisible}
                    viewMode={viewMode}
                    onResize={handlePanelResize}
                    panelWidth={panelWidth}
                    containerRef={containerRef as React.RefObject<HTMLDivElement>}
                  />
                  <div className="h-full w-full py-5">
                    <SidePanel isVisible={isPanelVisible} showPanel={showPanel} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <AnimatePresence>
          {viewMode === 'normal' && (
            <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3, ease: smoothEase }}>
              <DSAChatbotTrigger />
            </motion.div>
          )}
        </AnimatePresence>

        <PanelExpander isPanelVisible={isPanelVisible} viewMode={viewMode} isTransitioning={isTransitioning} showPanel={showPanel} />
      </motion.div>
    </Providers>
  );
}