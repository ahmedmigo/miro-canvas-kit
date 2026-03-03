import { styled } from "./lib/stitches.config";
import { useState, useCallback, useRef } from "react";
import { MiroHeader } from "./components/MiroHeader";
import { MiroToolbar } from "./components/MiroToolbar";
import { ZoomControls } from "./components/ZoomControls";
import { ReactFlowCanvas } from "./components/ReactFlowCanvas";
import { ToolsPanel } from "./components/ToolsPanel";
import type { ReactFlowInstance, Viewport } from "reactflow";

const AppContainer = styled("div", {
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
  position: "relative",
  fontFamily: "var(--font-noto)",
  backgroundColor: "var(--background)",
});

export default function App() {
  const [selectedTool, setSelectedTool] = useState("select");
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false);
  const flowRef = useRef<ReactFlowInstance | null>(null);

  const handleFlowMount = useCallback((instance: ReactFlowInstance) => {
    flowRef.current = instance;
    console.log("📊 React Flow instance ready");
    // Set initial zoom
    const currentZoom = instance.getZoom();
    setZoom(Math.round(currentZoom * 100));
  }, []);

  const handleViewportChange = useCallback((viewport: Viewport) => {
    setZoom(Math.round(viewport.zoom * 100));
  }, []);

  // Map tool IDs to widget types
  const toolToWidgetTypeMap: Record<string, string> = {
    // Formats
    diagram: "diagram",
    doc: "document",
    prototype: "prototype",
    slides: "slides",
    table: "table",
    // Timeline, Kanban, Dashboard don't have widgets yet - use frame as placeholder
    timeline: "frame",
    kanban: "frame",
    dashboard: "frame",
    // Essentials
    pen: "draw",
    stickyNote: "stickyNote",
    card: "stickyNote", // Use sticky note as placeholder
    codeBlock: "text",
    comment: "comment",
    flipCard: "stickyNote", // Use sticky note as placeholder
    frame: "frame",
    grid: "frame", // Use frame as placeholder
    mindMap: "diagram", // Use diagram as placeholder
    // Existing tools
    select: "select",
    shape: "shape",
    text: "text",
    draw: "draw",
  };

  const handleToolChange = useCallback((tool: string) => {
    // Map the tool to the actual widget type
    const widgetType = toolToWidgetTypeMap[tool] || tool;
    setSelectedTool(widgetType);
    console.log("🔧 Tool changed to:", tool, "→ Widget type:", widgetType);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (flowRef.current) {
      flowRef.current.zoomIn({ duration: 200 });
      const currentZoom = flowRef.current.getZoom();
      setZoom(Math.round(currentZoom * 100));
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (flowRef.current) {
      flowRef.current.zoomOut({ duration: 200 });
      const currentZoom = flowRef.current.getZoom();
      setZoom(Math.round(currentZoom * 100));
    }
  }, []);

  const handleResetZoom = useCallback(() => {
    if (flowRef.current) {
      flowRef.current.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 });
      setZoom(100);
    }
  }, []);

  const handleToggleGrid = useCallback(() => {
    setShowGrid((prev) => !prev);
  }, []);

  const handleToolReset = useCallback(() => {
    setSelectedTool("select");
    console.log("🔧 Tool reset to select");
  }, []);

  return (
    <AppContainer>
      <MiroHeader />
      <ReactFlowCanvas
        onFlowMount={handleFlowMount}
        onViewportChange={handleViewportChange}
        showGrid={showGrid}
        activeTool={selectedTool === "select" ? null : selectedTool}
        onToolReset={handleToolReset}
      />
      <MiroToolbar
        onToolChange={handleToolChange}
        activeTool={selectedTool}
        onToolsPanelToggle={() => setToolsPanelOpen(!toolsPanelOpen)}
        toolsPanelOpen={toolsPanelOpen}
      />
      <ToolsPanel
        isOpen={toolsPanelOpen}
        onOpenChange={setToolsPanelOpen}
        onSelect={handleToolChange}
      />
      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onToggleGrid={handleToggleGrid}
        showGrid={showGrid}
      />
    </AppContainer>
  );
}
