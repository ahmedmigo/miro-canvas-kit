import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "../../ui/utils";
import { FormatPill } from "./FormatPill";
import { useViewport, useReactFlow, Handle, Position, useStore, ReactFlowState } from "reactflow";
import { SelectionHandles } from "../SelectionHandles";
import { PromptBox } from "../../flows/PromptBox";
import { DropdownMenu } from "@mirohq/design-system";
import { useFlowExecution } from "../../../contexts/FlowExecutionContext";
import { GeneratingOverlay } from "../GeneratingOverlay";

// Create a factory for connection state selectors that return derived booleans
// This ensures widgets only re-render when their specific connection state changes
const createConnectionStateSelector = (nodeId: string | undefined) => (state: ReactFlowState) => {
  const connectionNodeId = state.connectionNodeId;
  const connectionHandleId = state.connectionHandleId;
  const isConnecting = !!connectionNodeId;
  const isTarget = isConnecting && connectionNodeId !== nodeId;
  const isReverseConnection = connectionHandleId === 'input-source';
  // Return a stable string key that represents the UI state
  // This way the selector only triggers re-render when actual UI changes are needed
  return `${isConnecting}-${isTarget}-${isReverseConnection}`;
};

interface BaseFormatWidgetProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  selected?: boolean;
  id?: string;
  // Flow-related props
  flowEnabled?: boolean;
  prompt?: string;
  promptTitle?: string;
  flowState?: {
    status: "idle" | "running" | "success" | "error";
    error?: string;
  };
  onRunFlow?: () => void;
  // When true, widget doesn't scale - it naturally resizes to fit content (used for tables)
  autoSize?: boolean;
  // Optional key that changes when content is updated externally (e.g., AI generation)
  // Forces re-measurement of baseSize
  contentKey?: string | number;
}

export function BaseFormatWidget({
  icon,
  title,
  children,
  className,
  style,
  selected,
  id,
  flowEnabled = false,
  prompt = "",
  promptTitle,
  flowState,
  onRunFlow,
  autoSize = false,
  contentKey,
}: BaseFormatWidgetProps) {
  const { setNodes, getEdges } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  // We need to capture the initial "base" dimensions of the content
  // so we can calculate the scale factor when the container is resized.
  const [baseSize, setBaseSize] = useState<{ width: number; height: number } | null>(null);
  // For autoSize widgets, track measured content dimensions
  const [autoSizeDimensions, setAutoSizeDimensions] = useState<{ width: number; height: number } | null>(null);
  const { zoom } = useViewport();

  // Get connection state to show/hide handles during connection
  // Using a memoized selector that only triggers re-renders when UI-relevant state changes
  const connectionStateSelector = useMemo(
    () => createConnectionStateSelector(id),
    [id]
  );
  const connectionStateKey = useStore(connectionStateSelector);
  
  // Parse the connection state from the key (avoids recreating objects)
  const [isConnecting, isTarget, isReverseConnection] = useMemo(() => {
    const [connecting, target, reverse] = connectionStateKey.split('-');
    return [connecting === 'true', target === 'true', reverse === 'true'];
  }, [connectionStateKey]);


  // Dropdown menu state
  const [menuOpen, setMenuOpen] = useState(false);

  // Prompt state management
  const [promptMode, setPromptMode] = useState<"view" | "edit">("view");
  const [promptValue, setPromptValue] = useState(prompt);
  const [promptTitleValue, setPromptTitleValue] = useState(promptTitle || title);
  const [promptBoxHeight, setPromptBoxHeight] = useState(0);
  const [viewModePromptBoxHeight, setViewModePromptBoxHeight] = useState(0);
  const promptBoxRef = useRef<HTMLDivElement>(null);

  // Update prompt value when prop changes
  useEffect(() => {
    setPromptValue(prompt);
  }, [prompt]);

  // Reset prompt mode to view when widget is deselected (but not if entering edit mode)
  useEffect(() => {
    if (!selected && promptMode !== 'edit') {
      setPromptMode("view");
    }
  }, [selected, promptMode]);

  // Save prompt to node data
  const handlePromptChange = (value: string) => {
    console.log('handlePromptChange called with:', value);
    setPromptValue(value);
    if (id) {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            console.log('Saving prompt to node:', id, 'prompt:', value);
            return {
              ...node,
              data: {
                ...node.data,
                prompt: value,
              },
            };
          }
          return node;
        })
      );
    }
  };

  const handlePromptTitleChange = (value: string) => {
    setPromptTitleValue(value);
    if (id) {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                promptTitle: value,
              },
            };
          }
          return node;
        })
      );
    }
  };

  // Get flow execution from context
  const { executeFlow, isExecuting } = useFlowExecution();

  const handleRunFlow = (promptValue?: string) => {
    console.log('BaseFormatWidget handleRunFlow called with prompt:', promptValue);
    if (onRunFlow) {
      onRunFlow();
    } else if (id) {
      executeFlow(id, promptValue);
    }
  };

  const handleStartFlow = () => {
    console.log("Start flow clicked for node:", id);
    if (id) {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            console.log("Enabling flow for node:", node.id);
            return {
              ...node,
              data: {
                ...node.data,
                flowEnabled: true,
              },
            };
          }
          return node;
        })
      );
    }
    setMenuOpen(false);
  };

  const handleModeChange = (mode: 'view' | 'edit') => {
    setPromptMode(mode);

    // Deselect node and hide selection handles when entering edit mode
    if (id) {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              selected: mode === 'edit' ? false : node.selected, // Deselect when entering edit mode
              data: {
                ...node.data,
                invisiblySelected: mode === 'edit',
              },
            };
          }
          return node;
        })
      );
    }
  };

  // Measure PromptBox height to adjust FormatPill position
  useEffect(() => {
    if (promptBoxRef.current && flowEnabled) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setPromptBoxHeight(entry.contentRect.height);
          // Only update view mode height when in view mode
          if (promptMode === 'view') {
            setViewModePromptBoxHeight(entry.contentRect.height);
          }
        }
      });
      observer.observe(promptBoxRef.current);
      return () => observer.disconnect();
    } else {
      setPromptBoxHeight(0);
      setViewModePromptBoxHeight(0);
    }
  }, [flowEnabled, promptMode]);

  // Reset baseSize when contentKey changes (AI content update)
  // This forces re-measurement after content is externally updated
  const prevContentKeyRef = useRef(contentKey);
  const prevFlowStatusRef = useRef(flowState?.status);
  
  useEffect(() => {
    if (autoSize) return;
    
    const contentKeyChanged = prevContentKeyRef.current !== contentKey;
    const flowJustCompleted = prevFlowStatusRef.current === 'running' && flowState?.status === 'success';
    
    prevContentKeyRef.current = contentKey;
    prevFlowStatusRef.current = flowState?.status;
    
    if (contentKeyChanged || flowJustCompleted) {
      // Reset baseSize to force re-measurement after DOM updates
      setBaseSize(null);
    }
  }, [autoSize, contentKey, flowState?.status]);

  // Measure base size and update when content changes (for non-autoSize widgets)
  // This ensures scale handles recalculate when AI content updates
  useEffect(() => {
    if (autoSize) return;
    if (!contentRef.current) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    
    const measureContent = () => {
      if (!contentRef.current) return;
      // Use scrollWidth/scrollHeight to get actual content size including overflow
      const { scrollWidth, scrollHeight, offsetWidth, offsetHeight } = contentRef.current;
      const width = Math.max(scrollWidth, offsetWidth);
      const height = Math.max(scrollHeight, offsetHeight);
      if (width > 0 && height > 0) {
        // Only update if size changed significantly (>10px)
        setBaseSize(prev => {
          if (!prev) return { width, height };
          if (Math.abs(prev.width - width) > 10 || Math.abs(prev.height - height) > 10) {
            return { width, height };
          }
          return prev;
        });
      }
    };

    // Delay initial measurement to allow DOM to settle after content update
    const initialTimer = setTimeout(measureContent, 50);

    // Observe for content changes (like AI-generated content)
    const observer = new ResizeObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(measureContent, 100);
    });

    observer.observe(contentRef.current);
    return () => {
      clearTimeout(initialTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [autoSize, baseSize]);

  // For autoSize widgets, observe content dimensions and update node style (debounced)
  useEffect(() => {
    if (!autoSize || !contentRef.current || !id) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastWidth = 0;
    let lastHeight = 0;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && (Math.abs(width - lastWidth) > 5 || Math.abs(height - lastHeight) > 5)) {
          lastWidth = width;
          lastHeight = height;
          
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            setAutoSizeDimensions({ width, height });
            setNodes((nodes) =>
              nodes.map((node) => {
                if (node.id === id) {
                  return {
                    ...node,
                    style: {
                      ...node.style,
                      width,
                      height,
                    },
                  };
                }
                return node;
              })
            );
          }, 100);
        }
      }
    });

    observer.observe(contentRef.current);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [autoSize, id, setNodes]);


  // Observe resize of the container (driven by NodeResizer) - debounced
  useEffect(() => {
    if (autoSize) {
      setScale(1);
      return;
    }
    
    if (!containerRef.current || !baseSize) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastScale = 1;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width < 10) return;

        const newScale = width / baseSize.width;
        if (Math.abs(newScale - lastScale) < 0.01) return;
        lastScale = newScale;

        setScale(newScale);

        if (id) {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            setNodes((nodes) =>
              nodes.map((node) => {
                if (node.id === id) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      scale: newScale,
                    },
                  };
                }
                return node;
              })
            );
          }, 50);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [baseSize, id, setNodes, autoSize]);

  // Sync Node Height to Content Height - only when scale changes significantly
  const lastHeightRef = useRef<number>(0);
  useEffect(() => {
    if (autoSize) return;
    
    if (id && baseSize) {
      const targetHeight = baseSize.height * scale;
      
      // Only update if difference is significant (>5px) to avoid jitter
      if (Math.abs(lastHeightRef.current - targetHeight) > 5) {
        lastHeightRef.current = targetHeight;
        const timer = setTimeout(() => {
          setNodes((nodes) =>
            nodes.map((n) => {
              if (n.id === id) {
                return {
                  ...n,
                  style: {
                    ...n.style,
                    height: targetHeight,
                  },
                };
              }
              return n;
            })
          );
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [baseSize, scale, id, setNodes, autoSize]);

  return (
    <div
      ref={containerRef}
      className={cn("relative", autoSize ? "" : "w-full h-full", className)}
      style={autoSize ? {
        ...style,
        width: autoSizeDimensions?.width || 'auto',
        height: autoSizeDimensions?.height || 'auto',
        overflow: 'visible',
      } : {
        ...style,
        width: '100%',
        height: '100%',
        overflow: 'visible',
      }}
    >
      {/* Connection Handles - Drag triggers at diamond position */}
      {/* Handles are at diamond for drag initiation, but edges connect at widget edge */}
      {/* Diamond is at -30*scale from edge, size is 12/zoom */}

      {/* RIGHT SIDE handle - OUTPUT (source only) - positioned at diamond */}
      {/* When reverse connecting, expand to cover entire widget for easy connection */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          position: 'absolute',
          right: (isConnecting && isReverseConnection && isTarget) ? 0 : `${-30 * scale - (6 / zoom)}px`,
          top: (isConnecting && isReverseConnection && isTarget) ? 0 : `${70 * scale}px`,
          width: (isConnecting && isReverseConnection && isTarget) ? '100%' : `${12 / zoom}px`,
          height: (isConnecting && isReverseConnection && isTarget) ? '100%' : `${12 / zoom}px`,
          background: 'transparent',
          border: 'none',
          borderRadius: '0',
          cursor: (isConnecting && isReverseConnection && isTarget) ? 'crosshair' : 'crosshair',
          transform: (isConnecting && isReverseConnection && isTarget) ? 'none' : 'translate(0, -50%)',
        }}
      />

      {/* LEFT SIDE handle - INPUT (target only) - positioned at diamond */}
      {/* When normal connecting, expand to cover entire widget for easy connection */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          position: 'absolute',
          left: (isConnecting && !isReverseConnection) ? 0 : `${-30 * scale - (6 / zoom)}px`,
          top: (isConnecting && !isReverseConnection) ? 0 : `${70 * scale}px`,
          width: (isConnecting && !isReverseConnection) ? '100%' : `${12 / zoom}px`,
          height: (isConnecting && !isReverseConnection) ? '100%' : `${12 / zoom}px`,
          background: 'transparent',
          border: 'none',
          borderRadius: '0',
          cursor: (isConnecting && !isReverseConnection) ? 'crosshair' : 'default',
          transform: (isConnecting && !isReverseConnection) ? 'none' : 'translate(0, -50%)',
        }}
      />

      {/* LEFT SIDE handle - INPUT SOURCE (for dragging from left diamond) */}
      {/* Positioned at diamond location for drag initiation */}
      <Handle
        type="source"
        position={Position.Left}
        id="input-source"
        style={{
          position: 'absolute',
          left: `${-30 * scale - (6 / zoom)}px`,
          top: `${70 * scale}px`,
          width: `${12 / zoom}px`,
          height: `${12 / zoom}px`,
          background: 'transparent',
          border: 'none',
          borderRadius: '0',
          cursor: 'crosshair',
          transform: 'translate(0, -50%)',
        }}
      />

      {/* Visual diamond indicators - appear on selection or when targeted */}
      {/* Right diamond (OUTPUT) - show when selected or when targeted during reverse connection */}
      {(selected || (isTarget && isReverseConnection)) && (
        <div
          style={{
            position: 'absolute',
            right: `${-30 * scale}px`,
            top: `${70 * scale}px`,
            width: `${12 / zoom}px`,
            height: `${12 / zoom}px`,
            background: '#8B5CF6',
            transform: 'translate(50%, -50%) rotate(45deg)',
            borderRadius: '1px',
            boxShadow: '0 0 0 2px white',
            pointerEvents: 'none',
            zIndex: 1000,
            opacity: 1,
            transition: 'opacity 0.15s ease',
          }}
        />
      )}

      {/* Left diamond (INPUT) - show when selected AND has prompt, or when targeted during normal connection */}
      {((selected && flowEnabled) || (isTarget && !isReverseConnection)) && (
        <div
          style={{
            position: 'absolute',
            left: `${-30 * scale}px`,
            top: `${70 * scale}px`,
            width: `${12 / zoom}px`,
            height: `${12 / zoom}px`,
            background: '#8B5CF6',
            transform: 'translate(-50%, -50%) rotate(45deg)',
            borderRadius: '1px',
            boxShadow: '0 0 0 2px white',
            pointerEvents: 'none',
            zIndex: 1000,
            opacity: 1,
            transition: 'opacity 0.15s ease',
          }}
        />
      )}

      {/* Format Pill - Manually positioned and counter-scaled to mimic toolbar behavior but attached to node for dragging */}
      <div
        className="absolute left-0 z-50 origin-bottom-left"
        style={{
          bottom: '100%',
          marginBottom: `${((flowEnabled ? 4 : 12) / zoom) + (flowEnabled ? (viewModePromptBoxHeight * scale) : 0)}px`,
          transform: `scale(${1 / zoom})`,
          width: 'max-content'
        }}
      >
        <FormatPill
          icon={icon}
          title={title}
          onMore={() => setMenuOpen(!menuOpen)}
        />
        <DropdownMenu open={menuOpen} onOpen={() => setMenuOpen(true)} onClose={() => setMenuOpen(false)}>
          <DropdownMenu.Trigger asChild>
            <button
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: '32px',
                height: '32px',
                opacity: 0,
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content side="right">
            <DropdownMenu.Item onSelect={handleStartFlow} disabled={flowEnabled}>
              {flowEnabled ? "Flow enabled" : "Start flow"}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </div>

      {/* PromptBox - Positioned above container in view mode, starts at same position in edit mode and grows down */}
      {flowEnabled && (
        <div
          ref={promptBoxRef}
          onClick={(e) => {
            e.stopPropagation();
            // When clicking the prompt box in view mode, switch to edit mode
            if (promptMode === 'view') {
              handleModeChange('edit');
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            ...(promptMode === 'edit' ? {
              top: autoSize ? `-${viewModePromptBoxHeight}px` : `-${viewModePromptBoxHeight * scale}px`,
            } : {
              bottom: '100%',
              marginBottom: autoSize ? '-8px' : `${-8 * scale}px`,
            }),
            transform: autoSize ? 'none' : (baseSize ? `scale(${scale})` : 'none'),
            transformOrigin: promptMode === 'edit' ? 'top left' : 'bottom left',
            zIndex: promptMode === 'edit' ? 100 : 0,
            width: autoSize ? 'auto' : (baseSize ? baseSize.width : 'auto'),
            pointerEvents: 'auto',
            borderTopLeftRadius: 'var(--radius-lg)',
            borderTopRightRadius: 'var(--radius-lg)',
            borderBottomLeftRadius: promptMode === 'view' ? 0 : 'var(--radius-lg)',
            borderBottomRightRadius: promptMode === 'view' ? 0 : 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <PromptBox
            value={promptValue}
            title={promptTitleValue}
            onValueChange={handlePromptChange}
            onTitleChange={handlePromptTitleChange}
            mode={promptMode}
            onModeChange={handleModeChange}
            onRun={handleRunFlow}
            flowState={flowState}
          />
        </div>
      )}

      {/* Content Container - Scaled Content ONLY (stays at original position) */}
      <div
        style={autoSize ? {
          // For autoSize widgets, don't scale - let content determine size
          position: 'relative',
          zIndex: 10,
        } : {
          transform: baseSize ? `scale(${scale})` : 'none',
          transformOrigin: 'top left',
          width: baseSize ? baseSize.width : 'auto',
          height: baseSize ? baseSize.height : 'auto',
          visibility: baseSize ? 'visible' : 'hidden',
          position: 'relative',
          zIndex: 10, // Above PromptBox in view mode
        }}
      >
        <div ref={contentRef} className="inline-block origin-top-left" style={{ position: 'relative' }}>
          {/* Format Content ONLY - no PromptBox here */}
          {children}
          {/* Generating overlay - shows animated gradient during AI generation */}
          <GeneratingOverlay isGenerating={flowState?.status === 'running'} />
        </div>
      </div>

      {selected && (
        <SelectionHandles
          minWidth={100}
          minHeight={100}
          keepAspectRatio={true}
        />
      )}
    </div>
  );
}
