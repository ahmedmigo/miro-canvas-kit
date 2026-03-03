import React, { useState, useRef, useCallback, useEffect } from "react";
import { NodeProps, NodeToolbar, Position, useReactFlow, Handle, useStore } from "reactflow";
import { useFlowExecution } from "../../contexts/FlowExecutionContext";
import { BaseWidgetData } from "./BaseWidget";
import { SelectionHandles } from "./SelectionHandles";
import { GeneratingOverlay } from "./GeneratingOverlay";
import { WidgetToolbar, ToolbarSection, ToolbarIconButton, ToolbarButtonSlot } from "./WidgetToolbar";
import { styled } from "../../lib/stitches.config";
import { PromptBox } from "../flows/PromptBox";
import {
  IconImage,
  IconArrowsSquareCounterClockwiseY,
  IconDownload,
  IconAltText,
  IconChatLinesTwo,
  IconLockOpen,
  IconDotsThreeVertical
} from "@mirohq/design-system-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const ImageContainer = styled("div", {
  width: "100%",
  height: "100%",
  position: "relative",
  overflow: "hidden",
  backgroundColor: "#FFF",

  variants: {
    hasImage: {
      true: {
        borderRadius: "0",
        border: "none",
      },
      false: {
        borderRadius: "8px",
        border: "1px solid var(--border)",
      },
    },
  },

  defaultVariants: {
    hasImage: false,
  },
});

const ZeroState = styled("div", {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "32px",
  position: "relative",
});

const DashedBorder = styled("div", {
  position: "absolute",
  inset: "16px",
  border: "1px dashed var(--border)",
  borderRadius: "var(--radius-lg)",
  pointerEvents: "none",
});

const UploadButton = styled("button", {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "16px",
  width: "198px",
  padding: "32px 16px",
  backgroundColor: "var(--background)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--border)",
  cursor: "pointer",
  transition: "all 0.2s ease",
  zIndex: 10,

  "&:hover": {
    transform: "scale(1.05)",
  },

  "& svg": {
    width: "24px",
    height: "24px",
    color: "var(--foreground)",
  },
});

const ButtonText = styled("span", {
  fontFamily: "var(--font-noto)",
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--foreground)",
  textAlign: "center",
  lineHeight: 1,
});

const ImageElement = styled("img", {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
});

const HiddenInput = styled("input", {
  display: "none",
});


export interface ImageData extends BaseWidgetData {
  imageUrl?: string;
  originalWidth?: number;
  originalHeight?: number;
  scale?: number;
  flowEnabled?: boolean;
}

// Default base size for scale calculation
const BASE_IMAGE_SIZE = 500;

export function ImageWidget({ data, selected, id }: NodeProps<ImageData>) {
  const [imageUrl, setImageUrl] = useState(data.imageUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setNodes, getZoom } = useReactFlow();
  const zoom = getZoom();

  // Scale state based on container width vs base size
  const [scale, setScale] = useState(1);

  // Get connection state to show/hide handles during connection
  const connectionNodeId = useStore((state) => state.connectionNodeId);
  const connectionHandleId = useStore((state) => state.connectionHandleId);
  const isConnecting = !!connectionNodeId;
  const isTarget = isConnecting && connectionNodeId !== id;

  // Check if connecting from left diamond (input-source) - for reverse connections
  const isReverseConnection = connectionHandleId === 'input-source';

  // Sync imageUrl with external data updates (e.g., from AI generation)
  useEffect(() => {
    if (data.imageUrl && data.imageUrl !== imageUrl) {
      setImageUrl(data.imageUrl);
    }
  }, [data.imageUrl]);

  // Observe container size and calculate scale
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 10) {
          const newScale = width / BASE_IMAGE_SIZE;
          setScale(newScale);

          // Save scale to node data for edge components to access
          if (id) {
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
          }
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [id, setNodes]);

  // Prompt state management
  const [promptMode, setPromptMode] = useState<"view" | "edit">("view");
  const [promptValue, setPromptValue] = useState(data.prompt || "");
  const [promptTitleValue, setPromptTitleValue] = useState(data.promptTitle || "Generate image");
  const [viewModePromptBoxHeight, setViewModePromptBoxHeight] = useState(0);
  const promptBoxRef = useRef<HTMLDivElement>(null);

  // Update prompt value when data changes
  useEffect(() => {
    if (data.prompt !== undefined) {
      setPromptValue(data.prompt);
    }
  }, [data.prompt]);

  // Measure PromptBox height in view mode
  useEffect(() => {
    if (promptBoxRef.current && data.flowEnabled) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          // Only update view mode height when in view mode
          if (promptMode === 'view') {
            setViewModePromptBoxHeight(entry.contentRect.height);
          }
        }
      });
      observer.observe(promptBoxRef.current);
      return () => observer.disconnect();
    } else {
      setViewModePromptBoxHeight(0);
    }
  }, [data.flowEnabled, promptMode]);

  // Save prompt to node data
  const handlePromptChange = (value: string) => {
    console.log('ImageWidget handlePromptChange called with:', value, 'for node:', id);
    setPromptValue(value);
    if (id) {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            console.log('Saving prompt to image node:', id, 'prompt:', value);
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
  const { executeFlow } = useFlowExecution();

  const handleRunFlow = (promptValueArg?: string) => {
    console.log("Run flow for image widget:", id, "prompt:", promptValueArg);
    if (id) {
      executeFlow(id, promptValueArg);
    }
  };

  const handleStartFlow = () => {
    console.log("Start flow clicked for image widget:", id);
    if (id) {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            console.log("Enabling flow for image widget:", node.id);
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

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;

        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
          setImageUrl(url);

          // Get current widget dimensions (default 500x500)
          const currentWidth = 500;
          const currentHeight = 500;

          // Calculate scale to fit image within widget
          const scaleX = currentWidth / img.width;
          const scaleY = currentHeight / img.height;
          const scale = Math.min(scaleX, scaleY);

          // Calculate new dimensions maintaining aspect ratio
          const newWidth = img.width * scale;
          const newHeight = img.height * scale;

          // Update node with image data and fitted size
          setNodes((nodes) =>
            nodes.map((node) => {
              if (node.id === id) {
                return {
                  ...node,
                  style: {
                    ...node.style,
                    width: newWidth,
                    height: newHeight,
                  },
                  data: {
                    ...node.data,
                    imageUrl: url,
                    originalWidth: img.width,
                    originalHeight: img.height,
                  },
                };
              }
              return node;
            })
          );
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
  }, [id, setNodes]);

  const handleUploadClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Connection Handles - Edge anchors with extended hit areas, scaled with widget */}

      {/* RIGHT SIDE handle - OUTPUT (source only) */}
      {/* When reverse connecting (from left diamond), expand to cover entire widget for easy connection */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          position: 'absolute',
          right: (isConnecting && isReverseConnection && isTarget) ? 0 : `${-30 * scale}px`,
          top: (isConnecting && isReverseConnection && isTarget) ? 0 : `${70 * scale}px`,
          width: (isConnecting && isReverseConnection && isTarget) ? '100%' : `${30 / zoom}px`,
          height: (isConnecting && isReverseConnection && isTarget) ? '100%' : `${30 / zoom}px`,
          background: 'transparent',
          border: 'none',
          borderRadius: '0',
          cursor: (isConnecting && isReverseConnection && isTarget) ? 'crosshair' : 'crosshair',
          transform: (isConnecting && isReverseConnection && isTarget) ? 'none' : 'translate(50%, -50%)',
        }}
      />

      {/* LEFT SIDE handle - INPUT (target only) */}
      {/* When normal connecting (from right diamond), expand to cover entire widget for easy connection */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          position: 'absolute',
          left: (isConnecting && !isReverseConnection) ? 0 : `${-15 / zoom}px`,
          top: (isConnecting && !isReverseConnection) ? 0 : `${70 * scale}px`,
          width: (isConnecting && !isReverseConnection) ? '100%' : `${30 / zoom}px`,
          height: (isConnecting && !isReverseConnection) ? '100%' : `${30 / zoom}px`,
          background: 'transparent',
          border: 'none',
          borderRadius: '0',
          cursor: (isConnecting && !isReverseConnection) ? 'crosshair' : 'default',
          transform: (isConnecting && !isReverseConnection) ? 'none' : 'translate(0, -50%)',
        }}
      />

      {/* LEFT SIDE handle - INPUT SOURCE (for dragging from left diamond) */}
      {/* Positioned at diamond location for consistent dragging */}
      {/* Note: Position.Left makes React Flow connect to right-side outputs of source widgets */}
      <Handle
        type="source"
        position={Position.Left}
        id="input-source"
        style={{
          position: 'absolute',
          left: `${-30 * scale}px`,
          top: `${70 * scale}px`,
          width: `${30 / zoom}px`,
          height: `${30 / zoom}px`,
          background: 'transparent',
          border: 'none',
          borderRadius: '0',
          cursor: 'crosshair',
          transform: 'translate(-50%, -50%)',
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
      {((selected && data.flowEnabled) || (isTarget && !isReverseConnection)) && (
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

      <NodeToolbar
        isVisible={selected && !data.invisiblySelected}
        position={Position.Top}
        offset={data.flowEnabled ? 10 + viewModePromptBoxHeight : 10}
      >
        <WidgetToolbar>
          <ToolbarSection>
            <ToolbarButtonSlot>
              <ToolbarIconButton
                onClick={handleUploadClick}
                title={imageUrl ? "Replace image" : "Upload image"}
              >
                <IconArrowsSquareCounterClockwiseY size={20} />
              </ToolbarIconButton>
            </ToolbarButtonSlot>
            <ToolbarButtonSlot>
              <ToolbarIconButton
                onClick={() => {
                  // Download image functionality
                  if (imageUrl) {
                    const link = document.createElement('a');
                    link.href = imageUrl;
                    link.download = 'image.png';
                    link.click();
                  }
                }}
                title="Download image"
              >
                <IconDownload size={20} />
              </ToolbarIconButton>
            </ToolbarButtonSlot>
            <ToolbarButtonSlot>
              <ToolbarIconButton
                onClick={() => {
                  // Alt text functionality - placeholder
                  console.log('Add alt text');
                }}
                title="Add alt text"
              >
                <IconAltText size={20} />
              </ToolbarIconButton>
            </ToolbarButtonSlot>
            <ToolbarButtonSlot>
              <ToolbarIconButton
                onClick={() => {
                  // Comment functionality - placeholder
                  console.log('Add comment');
                }}
                title="Add comment"
              >
                <IconChatLinesTwo size={20} />
              </ToolbarIconButton>
            </ToolbarButtonSlot>
            <ToolbarButtonSlot>
              <ToolbarIconButton
                onClick={() => {
                  // Lock/unlock functionality - placeholder
                  console.log('Toggle lock');
                }}
                title="Lock/Unlock"
              >
                <IconLockOpen size={20} />
              </ToolbarIconButton>
            </ToolbarButtonSlot>
            <ToolbarButtonSlot>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center justify-center overflow-clip relative rounded-[4px] transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                    title="More options"
                    style={{ width: '32px', height: '32px', flexShrink: 0 }}
                  >
                    <IconDotsThreeVertical size={20} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="start"
                  sideOffset={4}
                >
                  <DropdownMenuItem
                    onClick={() => {
                      if (!data.flowEnabled) {
                        handleStartFlow();
                      }
                    }}
                    className={data.flowEnabled ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    {data.flowEnabled ? "Flow enabled" : "Start flow"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ToolbarButtonSlot>
          </ToolbarSection>
        </WidgetToolbar>
      </NodeToolbar>

      {/* PromptBox - Positioned above container in view mode, starts at same position in edit mode and grows down */}
      {data.flowEnabled && (
        <div
          ref={promptBoxRef}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            ...(promptMode === 'edit' ? {
              top: `-${viewModePromptBoxHeight}px`, // Start at same position as view mode
              // Let it grow down naturally to cover content
            } : {
              bottom: '100%', // Above container in view mode
              marginBottom: '-8px', // Position properly
            }),
            zIndex: promptMode === 'edit' ? 100 : 0, // Behind content in view mode, in front in edit mode
            pointerEvents: 'auto',
            borderTopLeftRadius: promptMode === 'view' ? 'var(--radius-lg)' : 'var(--radius-lg)',
            borderTopRightRadius: promptMode === 'view' ? 'var(--radius-lg)' : 'var(--radius-lg)',
            borderBottomLeftRadius: promptMode === 'view' ? 0 : 'var(--radius-lg)',
            borderBottomRightRadius: promptMode === 'view' ? 0 : 'var(--radius-lg)',
            overflow: promptMode === 'view' ? 'hidden' : 'visible',
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
            flowState={data.flowState}
          />
        </div>
      )}

      {/* Image Content Container (stays at original position) */}
      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 10, // Above PromptBox in view mode
      }}>
        <ImageContainer hasImage={!!imageUrl}>
          {!imageUrl ? (
            <>
              <ZeroState>
                <DashedBorder />
                <UploadButton onClick={handleUploadClick}>
                  <IconImage size={24} />
                  <ButtonText>Upload an image</ButtonText>
                </UploadButton>
              </ZeroState>
              <HiddenInput
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </>
          ) : (
            <>
              <ImageElement src={imageUrl} alt="Uploaded image" draggable={false} />
              <HiddenInput
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </>
          )}
          {/* Generating overlay - shows animated gradient during AI generation */}
          <GeneratingOverlay isGenerating={data.flowState?.status === 'running'} />
        </ImageContainer>
      </div>

      {selected && !data.invisiblySelected && (
        <SelectionHandles
          minWidth={100}
          minHeight={100}
          keepAspectRatio={imageUrl ? true : false}
        />
      )}
    </div>
  );
}
