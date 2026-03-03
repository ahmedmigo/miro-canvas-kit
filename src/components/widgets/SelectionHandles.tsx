import React from "react";
import { NodeResizeControl, ControlPosition, useViewport } from "reactflow";

interface SelectionHandlesProps {
  minWidth?: number;
  minHeight?: number;
  keepAspectRatio?: boolean;
  borderRadius?: string;
}

export function SelectionHandles({
  minWidth = 100,
  minHeight = 100,
  keepAspectRatio = true,
  borderRadius = "0",
}: SelectionHandlesProps) {
  const { zoom } = useViewport();

  return (
    <>
      {(["top-left", "top-right", "bottom-left", "bottom-right"] as ControlPosition[]).map((pos) => (
        <NodeResizeControl
          key={pos}
          variant="resize"
          position={pos}
          minWidth={minWidth}
          minHeight={minHeight}
          keepAspectRatio={keepAspectRatio}
          style={{
            position: "absolute",
            top: pos.includes("top") ? 0 : undefined,
            bottom: pos.includes("bottom") ? 0 : undefined,
            left: pos.includes("left") ? 0 : undefined,
            right: pos.includes("right") ? 0 : undefined,
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: "var(--primary)",
            border: "2px solid var(--background)",
            transform: `translate(${
              pos.includes("left") ? "-50%" : "50%"
            }, ${pos.includes("top") ? "-50%" : "50%"}) scale(${1 / zoom})`,
            zIndex: 1000,
          }}
        />
      ))}
      {/* Custom Selection Ring */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          border: `${1 / zoom}px solid var(--primary)`,
          borderRadius,
          zIndex: 999,
        }}
      />
    </>
  );
}
