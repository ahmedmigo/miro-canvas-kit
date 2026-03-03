import React, { useState, useEffect } from "react";
import { BaseFormatWidget } from "./BaseFormatWidget";
import { DiagramMenuIcon } from "./FormatIcons";
import { diagramSvgPaths } from "./svg-paths-diagrams";

interface DiagramNode {
  id: string;
  label: string;
  type?: 'start' | 'end' | 'process' | 'decision' | 'default';
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

interface DiagramData {
  title?: string;
  diagramType?: 'flowchart' | 'mindmap' | 'orgchart' | 'sequence' | 'process';
  nodes?: DiagramNode[];
  edges?: DiagramEdge[];
  flowEnabled?: boolean;
  prompt?: string;
  promptTitle?: string;
  flowState?: {
    status: "idle" | "running" | "success" | "error";
    error?: string;
  };
}

const IconSparks = () => (
  <svg className="size-6" viewBox="0 0 24 24" fill="none">
    <path d={diagramSvgPaths.p72aff80} fill="#8167E5" />
  </svg>
);

const IconCurveSquareCircleArrow = () => (
   <svg className="size-6" viewBox="0 0 24 24" fill="none">
      <g>
        <path d={diagramSvgPaths.p284ea980} stroke="#DA792B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="M15 10V10.0001" stroke="#DA792B" strokeWidth="2" />
      </g>
   </svg>
);

const IconLayout = () => (
  <svg className="size-6" viewBox="0 0 24 24" fill="none">
     <path d={diagramSvgPaths.p269a700} stroke="#DA792B" strokeWidth="2" />
     <path d="M3 9L21 9" stroke="#DA792B" strokeWidth="2" />
     <path d={diagramSvgPaths.p154fac80} stroke="#DA792B" strokeWidth="2" />
  </svg>
);

function NodeShape({ node, x, y }: { node: DiagramNode; x: number; y: number }) {
  const getNodeStyle = () => {
    switch (node.type) {
      case 'start':
        return { bg: '#22c55e', shape: 'rounded-full', width: 80, height: 40 };
      case 'end':
        return { bg: '#ef4444', shape: 'rounded-full', width: 80, height: 40 };
      case 'decision':
        return { bg: '#f59e0b', shape: 'rotate-45', width: 60, height: 60 };
      case 'process':
      default:
        return { bg: '#3b82f6', shape: 'rounded-lg', width: 120, height: 50 };
    }
  };

  const style = getNodeStyle();

  if (node.type === 'decision') {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <rect 
          x={-style.width/2} 
          y={-style.height/2} 
          width={style.width} 
          height={style.height} 
          fill={style.bg}
          transform="rotate(45)"
          rx="4"
        />
        <text 
          textAnchor="middle" 
          dy="0.35em" 
          fill="white" 
          fontSize="10"
          fontWeight="600"
        >
          {node.label}
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect 
        x={-style.width/2} 
        y={-style.height/2} 
        width={style.width} 
        height={style.height} 
        fill={style.bg}
        rx={node.type === 'start' || node.type === 'end' ? style.height/2 : 8}
      />
      <text 
        textAnchor="middle" 
        dy="0.35em" 
        fill="white" 
        fontSize="11"
        fontWeight="600"
      >
        {node.label.length > 15 ? node.label.slice(0, 15) + '...' : node.label}
      </text>
    </g>
  );
}

export function DiagramFormat({ selected, id, data }: { selected?: boolean; id?: string; data?: DiagramData }) {
  const [diagram, setDiagram] = useState<DiagramData>(data || {});

  useEffect(() => {
    if (data?.nodes && data.nodes.length > 0) {
      setDiagram(data);
    }
  }, [data]);

  const hasContent = diagram.nodes && diagram.nodes.length > 0;

  const calculatePositions = () => {
    if (!diagram.nodes) return [];
    const nodeCount = diagram.nodes.length;
    const cols = Math.ceil(Math.sqrt(nodeCount));
    const spacing = { x: 160, y: 100 };
    const startX = 400 - ((cols - 1) * spacing.x) / 2;
    const startY = 80;

    return diagram.nodes.map((node, i) => ({
      node,
      x: startX + (i % cols) * spacing.x,
      y: startY + Math.floor(i / cols) * spacing.y
    }));
  };

  const positions = calculatePositions();
  const nodePositionMap = new Map(positions.map(p => [p.node.id, { x: p.x, y: p.y }]));

  return (
    <BaseFormatWidget
       icon={<DiagramMenuIcon />}
       title="Diagram"
       selected={selected}
       id={id}
       flowEnabled={data?.flowEnabled}
       prompt={data?.prompt}
       promptTitle={data?.promptTitle}
       flowState={data?.flowState}
       contentKey={diagram.nodes?.length || 0}
       className="w-[802px] h-[451px]"
    >
       <div className="w-[802px] h-[451px] bg-[var(--background)] rounded-[var(--radius-lg)] border border-[var(--border)] flex flex-col items-center justify-center relative overflow-hidden">
          {hasContent ? (
            <div className="w-full h-full flex flex-col">
              {diagram.title && (
                <div className="h-12 border-b border-[var(--border)] flex items-center px-4">
                  <span className="font-semibold text-[var(--foreground)]">{diagram.title}</span>
                  {diagram.diagramType && (
                    <span className="ml-2 text-xs text-[var(--muted-foreground)] bg-[var(--accent)] px-2 py-1 rounded">
                      {diagram.diagramType}
                    </span>
                  )}
                </div>
              )}
              <div className="flex-1 relative">
                <svg width="100%" height="100%" className="absolute inset-0">
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                    </marker>
                  </defs>
                  {diagram.edges?.map((edge, i) => {
                    const from = nodePositionMap.get(edge.from);
                    const to = nodePositionMap.get(edge.to);
                    if (!from || !to) return null;
                    return (
                      <g key={i}>
                        <line 
                          x1={from.x} 
                          y1={from.y + 25} 
                          x2={to.x} 
                          y2={to.y - 25} 
                          stroke="#6b7280" 
                          strokeWidth="2"
                          markerEnd="url(#arrowhead)"
                        />
                        {edge.label && (
                          <text 
                            x={(from.x + to.x) / 2} 
                            y={(from.y + to.y) / 2}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#6b7280"
                            className="bg-white"
                          >
                            {edge.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  {positions.map(({ node, x, y }) => (
                    <NodeShape key={node.id} node={node} x={x} y={y} />
                  ))}
                </svg>
              </div>
            </div>
          ) : (
            <>
              <div className="absolute inset-4 border border-[var(--border)] border-dashed rounded-[var(--radius-lg)] pointer-events-none" />
              <div className="flex flex-col items-center gap-8 z-10 pointer-events-auto">
                 <h3 className="font-[family-name:var(--font-noto)] font-semibold text-[14px] text-[var(--muted-foreground)]">
                   Start your diagram: drag shapes or
                 </h3>
                 <div className="flex gap-2">
                    {[
                      { icon: <IconSparks />, label: "Create with AI" },
                      { icon: <IconCurveSquareCircleArrow />, label: "Add shapes" },
                      { icon: <IconLayout />, label: "Start with a template" }
                    ].map((item, index) => (
                      <div key={index} className="group flex flex-col items-center justify-center gap-4 w-[198px] py-8 px-4 bg-[var(--background)] rounded-[var(--radius-lg)] border border-[var(--border)] cursor-pointer">
                         <div className="group-hover:scale-110 transition-transform duration-200">
                           {item.icon}
                         </div>
                         <span className="font-[family-name:var(--font-noto)] font-semibold text-[14px] text-[var(--foreground)] text-center leading-none">
                           {item.label}
                         </span>
                      </div>
                    ))}
                 </div>
              </div>
            </>
          )}
       </div>
    </BaseFormatWidget>
  );
}
