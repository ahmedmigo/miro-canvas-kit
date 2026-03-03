import React, { useEffect, useState, useRef } from 'react';
import { EdgeProps, getBezierPath, BaseEdge, useViewport, Position, useStore } from 'reactflow';

interface AnimatedEdgeProps extends EdgeProps {
  data?: {
    isAnimating?: boolean;
    animationSpeed?: number;
    isHighlighted?: boolean;
  };
  selected?: boolean;
}

export function AnimatedEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: AnimatedEdgeProps) {
  const { zoom } = useViewport();
  const [dotPosition, setDotPosition] = useState(0);
  const animationRef = useRef<number | null>(null);
  const pathRef = useRef<SVGPathElement>(null);
  
  const isAnimating = data?.isAnimating ?? false;
  const isHighlighted = data?.isHighlighted ?? false;
  const animationSpeed = data?.animationSpeed ?? 1500; // Duration in ms
  
  // Determine edge visual state
  const isActive = isAnimating || isHighlighted || selected;

  // Get nodes to calculate the offset from diamond to widget edge
  // This matches the logic in DebugEdge for consistent edge rendering
  const sourceNode = useStore((state) => state.nodeInternals.get(source));
  const targetNode = useStore((state) => state.nodeInternals.get(target));
  
  // Calculate offset: diamond is at 30*scale from widget edge
  const sourceScale = sourceNode?.data?.scale || 1;
  const targetScale = targetNode?.data?.scale || 1;
  const sourceOffset = 30 * sourceScale;
  const targetOffset = 30 * targetScale;

  // Adjust positions: move from diamond position to widget edge
  const adjustedSourceX = sourcePosition === Position.Right
    ? sourceX - sourceOffset
    : sourcePosition === Position.Left
      ? sourceX + sourceOffset
      : sourceX;

  const adjustedTargetX = targetPosition === Position.Right
    ? targetX - targetOffset
    : targetPosition === Position.Left
      ? targetX + targetOffset
      : targetX;

  const [edgePath] = getBezierPath({
    sourceX: adjustedSourceX,
    sourceY,
    sourcePosition,
    targetX: adjustedTargetX,
    targetY,
    targetPosition,
  });

  // Animation loop
  useEffect(() => {
    if (!isAnimating) {
      setDotPosition(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let startTime: number | null = null;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % animationSpeed) / animationSpeed;
      
      setDotPosition(progress);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, animationSpeed]);

  // Calculate dot position along path
  const getDotCoordinates = () => {
    if (!pathRef.current) return { x: adjustedSourceX, y: sourceY };
    
    const pathLength = pathRef.current.getTotalLength();
    const point = pathRef.current.getPointAtLength(pathLength * dotPosition);
    
    return { x: point.x, y: point.y };
  };

  const dotCoords = getDotCoordinates();

  // Determine stroke color and width based on state
  const getStrokeColor = () => {
    if (isAnimating) return '#8B5CF6'; // Purple when animating
    if (selected) return '#8B5CF6'; // Purple when edge is selected
    if (isHighlighted) return '#8B5CF6'; // Purple when in execution path
    return '#D1D5DB'; // Subtle grey when inactive
  };
  
  const getStrokeWidth = () => {
    if (selected) return 4; // Thicker when edge is selected
    if (isAnimating) return 3;
    if (isHighlighted) return 2.5;
    return 1.5; // Thinner when inactive
  };

  return (
    <g>
      {/* Base edge path */}
      <path
        ref={pathRef}
        d={edgePath}
        fill="none"
        stroke={getStrokeColor()}
        strokeWidth={getStrokeWidth()}
        style={{
          ...style,
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
        }}
      />
      
      {/* Glow effect when active (animating, highlighted, or selected) */}
      {isActive && (
        <path
          d={edgePath}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth={selected ? 10 : 6}
          style={{
            opacity: selected ? 0.25 : 0.2,
            filter: 'blur(3px)',
          }}
        />
      )}

      {/* Animated dot */}
      {isAnimating && pathRef.current && (
        <>
          {/* Dot glow */}
          <circle
            cx={dotCoords.x}
            cy={dotCoords.y}
            r={12}
            fill="#8B5CF6"
            style={{
              opacity: 0.3,
              filter: 'blur(4px)',
            }}
          />
          {/* Main dot */}
          <circle
            cx={dotCoords.x}
            cy={dotCoords.y}
            r={6}
            fill="#8B5CF6"
            stroke="white"
            strokeWidth={2}
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(139, 92, 246, 0.5))',
            }}
          />
          {/* Inner highlight */}
          <circle
            cx={dotCoords.x}
            cy={dotCoords.y}
            r={3}
            fill="white"
            style={{
              opacity: 0.8,
            }}
          />
        </>
      )}

      {/* Trail effect - multiple dots following */}
      {isAnimating && pathRef.current && (
        <>
          {[0.15, 0.3].map((offset, index) => {
            const trailProgress = (dotPosition - offset + 1) % 1;
            const pathLength = pathRef.current!.getTotalLength();
            const trailPoint = pathRef.current!.getPointAtLength(pathLength * trailProgress);
            const opacity = 0.4 - index * 0.15;
            const size = 4 - index;
            
            return (
              <circle
                key={`trail-${index}`}
                cx={trailPoint.x}
                cy={trailPoint.y}
                r={size}
                fill="#8B5CF6"
                style={{
                  opacity,
                }}
              />
            );
          })}
        </>
      )}
    </g>
  );
}
