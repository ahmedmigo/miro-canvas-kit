import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  ReactFlowInstance,
  ViewportHelperFunctionOptions,
  Viewport,
  Node,
  NodeTypes,
  EdgeTypes,
  useViewport,
  ConnectionLineComponentProps,
  getBezierPath,
  EdgeProps,
  BaseEdge,
  Position,
  useReactFlow,
  useStore,
} from "reactflow";
import "reactflow/dist/style.css";
import { styled } from "../lib/stitches.config";
import { useCallback, useEffect, useMemo, useRef, DragEvent, useState } from "react";
import {
  StickyNoteWidget,
  ShapeWidget,
  TextWidget,
  FrameWidget,
  ImageWidget,
  DocumentNode,
  TableNode,
  DiagramNode,
  PrototypeNode,
  SlidesNode
} from "./widgets";
import svgPaths from "../imports/svg-wi134zte8t";
import { AnimatedEdge } from "./edges/AnimatedEdge";
import { executeFlow, FlowExecutionState } from "../services/FlowExecutionEngine";
import { FlowExecutionProvider } from "../contexts/FlowExecutionContext";
import { ExecutionProgress } from "./ExecutionProgress";

const CanvasWrapper = styled("div", {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  fontFamily: "var(--font-noto)",
  backgroundColor: "#F3F4F6",
  
  // Use default cursor instead of hand
  "& .react-flow__pane": {
    cursor: "var(--canvas-cursor, default)",
  },
  
  // Hide React Flow's default controls since we're using custom Miro ones
  "& .react-flow__controls": {
    display: "none !important",
  },
  "& .react-flow__minimap": {
    display: "none !important",
  },
  "& .react-flow__attribution": {
    display: "none !important",
  },
  
  // Style the canvas background
  "& .react-flow__background": {
    backgroundColor: "#F3F4F6",
  },
  
  // Style nodes to use design system variables
  "& .react-flow__node": {
    fontFamily: "var(--font-noto)",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "var(--radius-medium)",
    padding: "0",
    color: "var(--foreground)",
  },
  
  // Remove default styling for custom format widgets so they control their own look
  "& .react-flow__node-document, & .react-flow__node-table, & .react-flow__node-diagram, & .react-flow__node-prototype, & .react-flow__node-slides": {
    backgroundColor: "transparent !important",
    border: "none !important",
    padding: "0 !important",
    boxShadow: "none !important",
    width: "auto", 
    height: "auto",
    overflow: "visible !important",
  },
  
  // Frame widgets should have lower z-index to appear behind their children
  "& .react-flow__node[data-type='frame']": {
    zIndex: "1 !important",
  },
  
  // Non-frame widgets should have higher z-index to appear above frames
  "& .react-flow__node:not([data-type='frame'])": {
    zIndex: "10 !important",
  },
  
  "& .react-flow__node.selected": {
    outline: "none",
    border: "none",
    boxShadow: "none",
  },

  // For document/table, we might want a different selection style or let the component handle it.
  // But React Flow applies .selected to the wrapper.
  "& .react-flow__node-document.selected, & .react-flow__node-table.selected, & .react-flow__node-diagram.selected, & .react-flow__node-prototype.selected, & .react-flow__node-slides.selected": {
     // We can hide the default selection border if the component handles it, 
     // or style it to match the component shape.
     // For now, let's remove the wrapper selection style and rely on internal if needed, 
     // OR keep it but transparent if the component has its own "Pill" selection indicator.
     borderColor: "transparent",
     boxShadow: "none",
  },
  
  "& .react-flow__edge-path": {
    stroke: "var(--border)",
    strokeWidth: "calc(2px / var(--zoom))",
  },
  
  "& .react-flow__edge.selected .react-flow__edge-path": {
    stroke: "var(--primary)",
  },

  // Style the connection line that appears while dragging
  "& .react-flow__connection-line": {
    stroke: "#8B5CF6",
    strokeWidth: 2,
  },
  "& .react-flow__connection-path": {
    stroke: "#8B5CF6",
    strokeWidth: 2,
  },
});

// Format Icons - matching FormatsMenu icons
const DocumentIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path clipRule="evenodd" d={svgPaths.pf474100} fill="#0E9DCD" fillRule="evenodd" />
  </svg>
);

const DiagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path clipRule="evenodd" d={svgPaths.p23391d80} fill="#DA792B" fillRule="evenodd" />
  </svg>
);

const TableIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path clipRule="evenodd" d={svgPaths.p8fe9080} fill="#0FA83C" fillRule="evenodd" />
  </svg>
);

const PrototypeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d={svgPaths.p9f0c900} fill="#8167E5" />
  </svg>
);

const SlidesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d={svgPaths.p4adad70} fill="#DB4F4F" />
    <path d={svgPaths.p2421c780} fill="#DB4F4F" />
    <path d={svgPaths.p4467700} fill="#DB4F4F" />
    <path d={svgPaths.p2242f400} fill="#DB4F4F" />
  </svg>
);

const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="1" stroke="#666" strokeWidth="1.5" fill="none" />
    <circle cx="5.5" cy="6" r="1.5" fill="#666" />
    <path d="M2 11.5L5.5 8L8 10.5L11.5 7L14 9.5V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V11.5Z" fill="#666" />
  </svg>
);

// Custom connection line component for visible feedback while dragging
function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionLineStyle,
  fromHandle,
  fromNode,
}: ConnectionLineComponentProps) {
  const [edgePath] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });

  return (
    <g>
      <path
        fill="none"
        stroke="#8B5CF6"
        strokeWidth={2}
        d={edgePath}
        style={connectionLineStyle}
      />
    </g>
  );
}

// Custom edge component for actual connections
// Handles are at diamond for drag, but edges connect at widget edge
function DebugEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  sourceHandleId,
  targetHandleId,
  source,
  target,
}: EdgeProps) {
  // Get nodes to calculate the offset from diamond to widget edge
  const sourceNode = useStore((state) => state.nodeInternals.get(source));
  const targetNode = useStore((state) => state.nodeInternals.get(target));
  
  // Calculate offset: diamond is at 30*scale from widget edge
  // We need to move edge endpoint from diamond back to widget edge
  const sourceScale = sourceNode?.data?.scale || 1;
  const targetScale = targetNode?.data?.scale || 1;
  const sourceOffset = 30 * sourceScale;
  const targetOffset = 30 * targetScale;
  
  // Adjust positions: move from diamond position to widget edge
  const adjustedSourceX = sourcePosition === Position.Right
    ? sourceX - sourceOffset  // Move left from diamond to widget edge
    : sourcePosition === Position.Left
      ? sourceX + sourceOffset  // Move right from diamond to widget edge
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

  return (
    <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: '#8B5CF6', strokeWidth: 2 }} />
  );
}

interface ReactFlowCanvasProps {
  onFlowMount?: (instance: ReactFlowInstance) => void;
  onViewportChange?: (viewport: Viewport) => void;
  showGrid?: boolean;
  activeTool?: string | null;
  onToolReset?: () => void;
}

// Helper to generate cursor styles
const getCursorForTool = (tool: string | null) => {
  if (!tool || tool === 'select') return 'default';
  
  let svg = '';
  // Simple SVG icons for tools
  switch(tool) {
    case 'stickyNote':
      svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" fill="#FFF9B1" stroke="#000" stroke-width="1"/></svg>`;
      break;
    case 'text':
      svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="4" y="18" font-family="serif" font-size="20" fill="#000">T</text></svg>`;
      break;
    case 'shape':
      svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="16" height="16" stroke="#000" stroke-width="1" fill="none"/></svg>`;
      break;
    case 'frame':
      svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" stroke="#000" stroke-width="1" stroke-dasharray="4 2" fill="none"/></svg>`;
      break;
    case 'document':
      svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#000" stroke-width="1" fill="#fff"/></svg>`;
      break;
    case 'table':
      svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3H21V21H3V3Z" stroke="#000" stroke-width="1" fill="#fff"/><path d="M3 9H21" stroke="#000"/><path d="M3 15H21" stroke="#000"/><path d="M9 3V21" stroke="#000"/><path d="M15 3V21" stroke="#000"/></svg>`;
      break;
    case 'diagram':
      svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="16" height="16" stroke="#000" stroke-width="1" fill="none"/><circle cx="12" cy="12" r="4" stroke="#000" stroke-width="1" fill="none"/></svg>`;
      break;
    case 'prototype':
      svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="12" height="16" rx="2" stroke="#000" stroke-width="1" fill="none"/><path d="M12 18v1" stroke="#000"/></svg>`;
      break;
    case 'slides':
      svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="14" rx="1" stroke="#000" stroke-width="1" fill="none"/><path d="M12 12v3" stroke="#000"/><path d="M9 12h6" stroke="#000"/></svg>`;
      break;
    case 'image':
      svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#000" stroke-width="1" fill="none"/><circle cx="8.5" cy="8.5" r="1.5" fill="#000"/><path d="M3 16l5-5 3 3 6-6 4 4v5H3z" fill="#ddd"/></svg>`;
      break;
    default:
      return 'crosshair';
  }
  
  const encoded = encodeURIComponent(svg);
  return `url('data:image/svg+xml,${encoded}') 12 12, auto`;
};

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

const DEFAULT_WIDGET_SIZES: Record<string, { width: number; height: number }> = {
  stickyNote: { width: 200, height: 200 },
  shape: { width: 150, height: 150 },
  text: { width: 300, height: 100 },
  frame: { width: 400, height: 300 },
  image: { width: 500, height: 500 },
  document: { width: 500, height: 600 },
  table: { width: 800, height: 400 },
  diagram: { width: 802, height: 451 },
  prototype: { width: 802, height: 451 },
  slides: { width: 802, height: 451 },
};

function ReactFlowCanvasInner({ onFlowMount, onViewportChange, showGrid = true, activeTool, onToolReset }: ReactFlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const previousNodesRef = useRef<Node[]>([]);

  // Quick actions menu state
  const [quickActionsMenu, setQuickActionsMenu] = useState<{
    show: boolean;
    position: { x: number; y: number };
    sourceNode: string | null;
    sourceHandle: string | null;
  }>({
    show: false,
    position: { x: 0, y: 0 },
    sourceNode: null,
    sourceHandle: null,
  });

  // Memoize source node lookup for QuickActionsMenu to prevent re-renders
  const quickActionsSourceNode = useMemo(() => {
    if (!quickActionsMenu.show || !quickActionsMenu.sourceNode) return null;
    return nodes.find((n) => n.id === quickActionsMenu.sourceNode) || null;
  }, [quickActionsMenu.show, quickActionsMenu.sourceNode, nodes]);

  // Track connection start for quick actions - unified connection state
  const connectingFrom = useRef<{
    nodeId: string | null;
    handleId: string | null;
    // Cached source position for consistent line endpoints
    sourcePosition: { x: number; y: number } | null;
  }>({
    nodeId: null,
    handleId: null,
    sourcePosition: null,
  });

  // Helper to calculate handle position on a node (used by both temp line and edges)
  // Positions are purely widget-relative (scale only, no zoom)
  const getHandlePosition = useCallback((node: Node, handleType: 'input' | 'output') => {
    const nodeScale = node.data?.scale || 1;
    const handleYOffset = 70 * nodeScale;
    
    // Position at exact widget edge (left for input, right for output)
    if (handleType === 'input') {
      return {
        x: node.position.x,
        y: node.position.y + handleYOffset,
      };
    } else {
      return {
        x: node.position.x + (node.width || 0),
        y: node.position.y + handleYOffset,
      };
    }
  }, []);

  // Track animating edges for flow execution
  const [animatingEdges, setAnimatingEdges] = useState<Set<string>>(new Set());
  
  // Track highlighted edges (for selected node execution path)
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(new Set());

  // Track if flow is currently executing
  const [isFlowExecuting, setIsFlowExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [executionMessage, setExecutionMessage] = useState<string>('');
  const [showProgress, setShowProgress] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(1);
  const [currentNodeType, setCurrentNodeType] = useState<string>('content');
  const [currentExecutingNodeId, setCurrentExecutingNodeId] = useState<string | null>(null);

  const { zoom } = useViewport();

  // Define custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      stickyNote: StickyNoteWidget,
      shape: ShapeWidget,
      text: TextWidget,
      frame: FrameWidget,
      image: ImageWidget,
      document: DocumentNode,
      table: TableNode,
      diagram: DiagramNode,
      prototype: PrototypeNode,
      slides: SlidesNode,
    }),
    []
  );

  // Define custom edge types with animated edges
  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      default: AnimatedEdge,
    }),
    []
  );

  // Calculate highlighted edges based on selected node's execution path
  useEffect(() => {
    const selectedNode = nodes.find(n => n.selected);
    
    if (!selectedNode || isFlowExecuting) {
      // During flow execution, highlighting is managed by animatingEdges
      // When no selection, clear highlights
      if (!isFlowExecuting) {
        setHighlightedEdges(new Set());
      }
      return;
    }
    
    // Calculate execution path: downstream nodes + their input edges
    const highlightedSet = new Set<string>();
    const visitedNodes = new Set<string>();
    
    // Helper to get all downstream nodes recursively
    const getDownstreamNodes = (nodeId: string) => {
      if (visitedNodes.has(nodeId)) return;
      visitedNodes.add(nodeId);
      
      // Find edges where this node is the source
      edges.forEach(edge => {
        if (edge.source === nodeId) {
          if (edge.id) highlightedSet.add(edge.id);
          getDownstreamNodes(edge.target);
        }
      });
    };
    
    // Helper to get input edges to selected node
    const getInputEdges = (nodeId: string) => {
      edges.forEach(edge => {
        if (edge.target === nodeId && edge.id) {
          highlightedSet.add(edge.id);
        }
      });
    };
    
    // Get input edges to selected node
    getInputEdges(selectedNode.id);
    
    // Get all downstream edges
    getDownstreamNodes(selectedNode.id);
    
    setHighlightedEdges(highlightedSet);
  }, [nodes, edges, isFlowExecuting]);

  // Update edges with animation and highlight data
  useEffect(() => {
    const hasHighlights = highlightedEdges.size > 0 || animatingEdges.size > 0;
    
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        // Use zIndex to bring highlighted edges to front
        zIndex: (highlightedEdges.has(edge.id!) || animatingEdges.has(edge.id!)) ? 1000 : 0,
        data: {
          ...edge.data,
          isAnimating: animatingEdges.has(edge.id!),
          isHighlighted: highlightedEdges.has(edge.id!) || animatingEdges.has(edge.id!),
        },
      }))
    );
  }, [animatingEdges, highlightedEdges, setEdges]);

  // Flow execution handler
  const { getNodes, getEdges: getEdgesFromFlow, setViewport } = useReactFlow();
  
  const handleRunFlow = useCallback(
    async (nodeId: string, promptOverride?: string) => {
      if (isFlowExecuting) {
        console.log('Flow execution already in progress');
        return;
      }

      console.log('=== FLOW EXECUTION STARTING ===');
      console.log('Node ID:', nodeId);
      console.log('Prompt override:', promptOverride);
      setIsFlowExecuting(true);
      setExecutionStatus('running');
      setExecutionMessage('');
      setShowProgress(true);
      setCurrentStep(0);
      setTotalSteps(1);

      // Get the latest nodes and edges from React Flow
      let currentNodes = getNodes();
      const currentEdges = getEdgesFromFlow();

      console.log('Current nodes before override:', currentNodes.map(n => ({ id: n.id, prompt: n.data?.prompt })));

      // If we have a prompt override, inject it into the node data
      if (promptOverride) {
        currentNodes = currentNodes.map(node => {
          if (node.id === nodeId) {
            console.log('Injecting prompt into node:', nodeId);
            return {
              ...node,
              data: {
                ...node.data,
                prompt: promptOverride,
              },
            };
          }
          return node;
        });
      }

      const targetNode = currentNodes.find(n => n.id === nodeId);
      console.log('Target node data:', targetNode?.data);

      // Calculate all edges in the execution path and highlight them
      const executionPathEdges = new Set<string>();
      const visitedNodes = new Set<string>();
      
      const getDownstreamEdges = (nId: string) => {
        if (visitedNodes.has(nId)) return;
        visitedNodes.add(nId);
        currentEdges.forEach(edge => {
          if (edge.source === nId) {
            if (edge.id) executionPathEdges.add(edge.id);
            getDownstreamEdges(edge.target);
          }
        });
      };
      
      // Get input edges to starting node
      currentEdges.forEach(edge => {
        if (edge.target === nodeId && edge.id) {
          executionPathEdges.add(edge.id);
        }
      });
      
      // Get all downstream edges from starting node
      getDownstreamEdges(nodeId);
      
      // Set highlighted edges for the entire execution path
      setHighlightedEdges(executionPathEdges);

      try {
        await executeFlow(nodeId, currentNodes, currentEdges, {
          onNodeStateChange: (id, state) => {
            console.log('Node state change:', id, state);
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === id) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      flowState: state,
                    },
                  };
                }
                return node;
              })
            );
          },
          onEdgeAnimationStart: (edgeId) => {
            console.log('Edge animation start:', edgeId);
            setAnimatingEdges((prev) => new Set(prev).add(edgeId));
          },
          onEdgeAnimationEnd: (edgeId) => {
            console.log('Edge animation end:', edgeId);
            setAnimatingEdges((prev) => {
              const next = new Set(prev);
              next.delete(edgeId);
              return next;
            });
          },
          onNodeContentUpdate: (id, content) => {
            console.log('=== NODE CONTENT UPDATE ===');
            console.log('Node ID:', id);
            console.log('Content received:', JSON.stringify(content, null, 2));
            
            // Define allowed content fields per node type
            // Only these fields from AI output will be applied - everything else is filtered out
            const contentFieldsWhitelist: Record<string, string[]> = {
              document: ['content'],
              table: ['columns', 'rows'],
              slides: ['slides'],
              diagram: ['nodes', 'edges', 'title', 'diagramType'],
              prototype: ['screens', 'title'],
              image: ['imageUrl', 'alt'],
            };
            
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === id) {
                  console.log('Updating node with new content');
                  
                  // Get the node type and filter content to only allowed fields
                  const nodeType = node.type || 'document';
                  const allowedFields = contentFieldsWhitelist[nodeType] || ['content'];
                  
                  // Filter the content to only include allowed fields
                  const filteredContent: Record<string, any> = {};
                  for (const field of allowedFields) {
                    if (content[field] !== undefined) {
                      filteredContent[field] = content[field];
                    }
                  }
                  
                  console.log('Filtered content (only allowed fields):', JSON.stringify(filteredContent, null, 2));
                  
                  const updatedNode = {
                    ...node,
                    data: {
                      ...node.data,
                      ...filteredContent,
                    },
                  };
                  console.log('Updated node data:', JSON.stringify(updatedNode.data, null, 2));
                  return updatedNode;
                }
                return node;
              })
            );
          },
          onProgressUpdate: (step, total, nodeId, nodeType) => {
            console.log(`Progress: Step ${step}/${total}, Node: ${nodeId}, Type: ${nodeType}`);
            setCurrentStep(step);
            setTotalSteps(total);
            setCurrentNodeType(nodeType);
            setCurrentExecutingNodeId(nodeId);
          },
        });
        setExecutionStatus('success');
        setExecutionMessage('Content generated successfully!');
        
        // Reset all node states to idle when flow completes successfully
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            data: {
              ...node.data,
              flowState: { status: 'idle' },
            },
          }))
        );
        
        setTimeout(() => setShowProgress(false), 3000);
      } catch (error: any) {
        console.error('Flow execution error:', error);
        setExecutionStatus('error');
        setExecutionMessage(error?.message || 'An error occurred');
        
        // Keep error states, reset others to idle
        setNodes((nds) =>
          nds.map((node) => {
            const currentStatus = node.data?.flowState?.status;
            // Keep error state, reset all others to idle
            if (currentStatus === 'error') {
              return node;
            }
            return {
              ...node,
              data: {
                ...node.data,
                flowState: { status: 'idle' },
              },
            };
          })
        );
      } finally {
        setIsFlowExecuting(false);
        setAnimatingEdges(new Set());
        setHighlightedEdges(new Set());
      }
    },
    [isFlowExecuting, setNodes, getNodes, getEdgesFromFlow]
  );

  // Calculate cursor style
  const cursorStyle = useMemo(() => {
    return getCursorForTool(activeTool || null);
  }, [activeTool]);

  // Helper function to check if a node is inside a frame
  const isNodeInsideFrame = useCallback((node: Node, frame: Node) => {
    if (!node.position || !frame.position || !node.width || !node.height || !frame.width || !frame.height) {
      return false;
    }

    const nodeLeft = node.position.x;
    const nodeRight = node.position.x + (node.width || 0);
    const nodeTop = node.position.y;
    const nodeBottom = node.position.y + (node.height || 0);

    const frameLeft = frame.position.x;
    const frameRight = frame.position.x + (frame.width || 0);
    const frameTop = frame.position.y;
    const frameBottom = frame.position.y + (frame.height || 0);

    // Check if the center of the node is inside the frame
    const nodeCenterX = nodeLeft + (node.width || 0) / 2;
    const nodeCenterY = nodeTop + (node.height || 0) / 2;

    return (
      nodeCenterX >= frameLeft &&
      nodeCenterX <= frameRight &&
      nodeCenterY >= frameTop &&
      nodeCenterY <= frameBottom
    );
  }, []);

  // Update parent-child relationships when nodes move
  const updateParentChildRelationships = useCallback((updatedNodes: Node[]) => {
    const frames = updatedNodes.filter((n) => n.type === "frame");
    const nonFrames = updatedNodes.filter((n) => n.type !== "frame");

    const nodesWithUpdatedRelationships = updatedNodes.map((node) => {
      if (node.type === "frame") {
        // Update frame's childIds
        const childIds = nonFrames
          .filter((n) => isNodeInsideFrame(n, node))
          .map((n) => n.id);

        return {
          ...node,
          data: {
            ...node.data,
            childIds,
          },
        };
      } else {
        // Update widget's parentId
        const parentFrame = frames.find((frame) => isNodeInsideFrame(node, frame));

        return {
          ...node,
          data: {
            ...node.data,
            parentId: parentFrame?.id || null,
          },
        };
      }
    });

    // Reorder nodes to ensure children appear after their parent frames
    // This ensures proper z-index stacking
    const frameNodes = nodesWithUpdatedRelationships.filter((n) => n.type === "frame");
    const frameIds = new Set(frameNodes.map((f) => f.id));
    const childNodes: Node[] = [];
    const orphanNodes: Node[] = [];

    nodesWithUpdatedRelationships.forEach((node) => {
      if (node.type !== "frame") {
        // Only treat as child if parent frame actually exists
        if (node.data.parentId && frameIds.has(node.data.parentId)) {
          childNodes.push(node);
        } else {
          orphanNodes.push(node);
        }
      }
    });

    // Build final array: frames first, then their children, then orphan widgets
    const reorderedNodes: Node[] = [];
    
    frameNodes.forEach((frame) => {
      reorderedNodes.push(frame);
      // Add children of this frame immediately after it
      const children = childNodes.filter((child) => child.data.parentId === frame.id);
      reorderedNodes.push(...children);
    });
    
    // Add remaining orphan nodes at the end
    reorderedNodes.push(...orphanNodes);

    return reorderedNodes;
  }, [isNodeInsideFrame]);

  // Debounce ref for parent-child relationship updates
  const parentChildDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Custom nodes change handler - optimized to avoid expensive updates during drag
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);

      // Only update parent-child relationships for position changes that are done dragging
      const positionChanges = changes.filter((change: any) => change.type === "position");
      const isDragging = positionChanges.some((change: any) => change.dragging);
      const hasDragEnd = positionChanges.some((change: any) => !change.dragging && change.position);
      
      // Skip expensive parent-child updates while actively dragging
      if (isDragging && !hasDragEnd) {
        // Only handle frame movement during drag (for smooth child following)
        const movedFrameIds = positionChanges
          .filter((change: any) => change.dragging)
          .map((change: any) => change.id);
        
        if (movedFrameIds.length > 0) {
          setNodes((currentNodes) => {
            const frames = currentNodes.filter((n) => n.type === "frame" && movedFrameIds.includes(n.id));
            if (frames.length === 0) return currentNodes;
            
            const frameMovements: Record<string, { deltaX: number; deltaY: number }> = {};
            frames.forEach((frame) => {
              const previousFrame = previousNodesRef.current.find((n) => n.id === frame.id);
              if (previousFrame && frame.position && previousFrame.position) {
                frameMovements[frame.id] = {
                  deltaX: frame.position.x - previousFrame.position.x,
                  deltaY: frame.position.y - previousFrame.position.y,
                };
              }
            });
            
            if (Object.keys(frameMovements).length === 0) {
              previousNodesRef.current = currentNodes;
              return currentNodes;
            }
            
            const result = currentNodes.map((node) => {
              if (node.data.parentId && frameMovements[node.data.parentId]) {
                const { deltaX, deltaY } = frameMovements[node.data.parentId];
                return {
                  ...node,
                  position: {
                    x: node.position.x + deltaX,
                    y: node.position.y + deltaY,
                  },
                };
              }
              return node;
            });
            
            previousNodesRef.current = result;
            return result;
          });
        }
        return;
      }

      // Debounce parent-child relationship updates (only run after drag ends or for non-drag changes)
      if (parentChildDebounceRef.current) {
        clearTimeout(parentChildDebounceRef.current);
      }
      
      parentChildDebounceRef.current = setTimeout(() => {
        setNodes((currentNodes) => {
          const updatedNodes = updateParentChildRelationships(currentNodes);
          previousNodesRef.current = updatedNodes;
          return updatedNodes;
        });
      }, 100);
    },
    [onNodesChange, updateParentChildRelationships]
  );

  // Validate connections: source (output) can only connect to target (input), no duplicates
  const isValidConnection = useCallback(
    (connection: Connection) => {
      // Prevent self-connections
      if (connection.source === connection.target) {
        return false;
      }

      // Allow two types of connections:
      // 1. output -> input (normal: right diamond to left diamond)
      // 2. input-source -> output (reverse: left diamond to right diamond, will be swapped)
      const isNormalConnection =
        connection.sourceHandle === 'output' && connection.targetHandle === 'input';
      const isReverseConnection =
        connection.sourceHandle === 'input-source' && connection.targetHandle === 'output';

      if (!isNormalConnection && !isReverseConnection) {
        return false;
      }

      // For reverse connections, check duplicates with swapped source/target
      if (isReverseConnection) {
        const isDuplicate = edges.some(
          (edge) =>
            edge.source === connection.target &&
            edge.target === connection.source &&
            edge.sourceHandle === 'output' &&
            edge.targetHandle === 'input'
        );
        return !isDuplicate;
      }

      // For normal connections, check duplicates normally
      const isDuplicate = edges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target &&
          edge.sourceHandle === connection.sourceHandle &&
          edge.targetHandle === connection.targetHandle
      );
      if (isDuplicate) {
        return false;
      }

      return true;
    },
    [edges]
  );

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      console.log('onConnect params:', params);

      // Check if this is a reverse connection (from left diamond / input-source)
      const isReverseConnection = params.sourceHandle === 'input-source';

      // If reverse connection, swap source and target
      const edge = isReverseConnection
        ? {
            ...params,
            source: params.target,
            target: params.source,
            sourceHandle: 'output',
            targetHandle: 'input',
            type: 'default',
          }
        : {
            ...params,
            type: 'default',
            sourceHandle: params.sourceHandle,
            targetHandle: params.targetHandle,
          };

      console.log('Creating edge:', edge);

      // Add the edge
      setEdges((eds) => addEdge(edge, eds));

      // Automatically enable flow on target node if it receives an input connection
      const targetNodeId = edge.target;
      if (targetNodeId) {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === targetNodeId) {
              // Enable flow if not already enabled
              if (!node.data.flowEnabled) {
                console.log('Auto-enabling flow for target node:', node.id);
                return {
                  ...node,
                  data: {
                    ...node.data,
                    flowEnabled: true,
                  },
                };
              }
            }
            return node;
          })
        );
      }
    },
    [setEdges, setNodes]
  );

  // Handle connection start - track where connection started and cache source position
  const onConnectStart = useCallback(
    (_: MouseEvent | TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
      // Find the source node and cache its handle position
      let sourcePosition: { x: number; y: number } | null = null;
      
      if (params.nodeId) {
        const sourceNode = nodes.find(n => n.id === params.nodeId);
        if (sourceNode) {
          // Determine handle type based on handleId
          const isOutputHandle = params.handleId === 'output';
          sourcePosition = getHandlePosition(sourceNode, isOutputHandle ? 'output' : 'input');
        }
      }
      
      connectingFrom.current = {
        nodeId: params.nodeId,
        handleId: params.handleId,
        sourcePosition,
      };
    },
    [nodes, getHandlePosition]
  );

  // Handle connection end - show quick actions menu if dropped on empty space
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      // Check if we were connecting from somewhere
      if (!connectingFrom.current.nodeId || !connectingFrom.current.handleId) {
        return;
      }

      // Check if connection was dropped on empty space (not on a node)
      const targetIsPane = (event.target as Element)?.classList.contains('react-flow__pane');

      if (targetIsPane && reactFlowInstance.current) {
        // Get mouse position in screen coordinates
        const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX;
        const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY;

        // Convert to flow coordinates
        const position = reactFlowInstance.current.screenToFlowPosition({
          x: clientX,
          y: clientY,
        });

        // Show quick actions menu - keep sourcePosition for consistent line drawing
        setQuickActionsMenu({
          show: true,
          position,
          sourceNode: connectingFrom.current.nodeId,
          sourceHandle: connectingFrom.current.handleId,
        });
        
        // Don't reset connectingFrom yet - we need sourcePosition for the menu line
        return;
      }

      // Reset connection tracking only if not showing menu
      connectingFrom.current = {
        nodeId: null,
        handleId: null,
        sourcePosition: null,
      };
    },
    []
  );

  // Create node from quick actions menu
  const createNodeFromQuickAction = useCallback(
    (type: string) => {
      if (!quickActionsMenu.sourceNode || !quickActionsMenu.position) return;

      const size = DEFAULT_WIDGET_SIZES[type] || { width: 200, height: 200 };

      // Align the new node from top with the menu position (left aligned, top aligned)
      const position = {
        x: quickActionsMenu.position.x,
        y: quickActionsMenu.position.y,
      };

      const newNodeId = `${type}-${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type,
        position,
        data: { isEditing: false },
        style: {
          width: size.width,
          height: size.height,
        },
      };

      // Add the new node
      setNodes((nds) => nds.concat(newNode));

      // Check if this is a reverse connection (from left diamond)
      const isReverseConnection = quickActionsMenu.sourceHandle === 'input-source';

      // Create the connection
      // If reverse: new node's output connects to original node's input
      // If normal: original node's output connects to new node's input
      const edge = isReverseConnection
        ? {
            id: `${newNodeId}-${quickActionsMenu.sourceNode}`,
            source: newNodeId,
            target: quickActionsMenu.sourceNode,
            sourceHandle: 'output',
            targetHandle: 'input',
            type: 'default',
          }
        : {
            id: `${quickActionsMenu.sourceNode}-${newNodeId}`,
            source: quickActionsMenu.sourceNode,
            target: newNodeId,
            sourceHandle: quickActionsMenu.sourceHandle,
            targetHandle: 'input',
            type: 'default',
          };
      setEdges((eds) => addEdge(edge, eds));

      // Enable flow on the target node since it's receiving input
      const targetNodeId = isReverseConnection ? quickActionsMenu.sourceNode : newNodeId;
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === targetNodeId) {
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
      }, 0);

      // Hide the menu and reset connection tracking
      setQuickActionsMenu({
        show: false,
        position: { x: 0, y: 0 },
        sourceNode: null,
        sourceHandle: null,
      });
      connectingFrom.current = {
        nodeId: null,
        handleId: null,
        sourcePosition: null,
      };
    },
    [quickActionsMenu, setNodes, setEdges]
  );

  const onInit = useCallback(
    (instance: ReactFlowInstance) => {
      console.log("✅ React Flow mounted successfully");
      reactFlowInstance.current = instance;
      if (onFlowMount) {
        onFlowMount(instance);
      }
    },
    [onFlowMount]
  );

  const onViewportChangeHandler = useCallback(
    (viewport: Viewport) => {
      if (onViewportChange) {
        onViewportChange(viewport);
      }
    },
    [onViewportChange]
  );

  // Handle drag over event
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle drop event to create new widgets
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");

      // Check if the dropped element is a valid widget type
      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = reactFlowInstance.current?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (!position) return;

      const size = DEFAULT_WIDGET_SIZES[type] || { width: 200, height: 200 };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { isEditing: false },
        style: {
          width: size.width,
          height: size.height,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  // Handle canvas click to add widgets (fallback method)
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      // Close quick actions menu and reset connection tracking
      if (quickActionsMenu.show) {
        setQuickActionsMenu({
          show: false,
          position: { x: 0, y: 0 },
          sourceNode: null,
          sourceHandle: null,
        });
        connectingFrom.current = {
          nodeId: null,
          handleId: null,
          sourcePosition: null,
        };
        return;
      }

      // Exit edit mode when clicking on pane
      setEditingNodeId(null);
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, isEditing: false },
        }))
      );

      if (!activeTool || activeTool === "select") return;

      const canvas = event.currentTarget.getBoundingClientRect();
      // Adjust position to center the widget on click
      // Using screenToFlowPosition is better if available, but we don't have event easily mapped there in onPaneClick without ref conversion
      // But we can use project() if we had it.
      // Simpler: just use client offsets relative to canvas
      
      // Better way to get position compatible with zoom/pan
      let position = { x: 0, y: 0 };
      if (reactFlowInstance.current) {
        position = reactFlowInstance.current.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY
        });
      } else {
         position = {
            x: event.clientX - canvas.left,
            y: event.clientY - canvas.top,
         };
      }
      
      // Adjust for centering based on type
      let offset = { x: 0, y: 0 };
      const size = DEFAULT_WIDGET_SIZES[activeTool] || { width: 200, height: 200 };
      
      offset = { x: size.width / 2, y: size.height / 2 };
      
      position.x -= offset.x;
      position.y -= offset.y;

      const newNode: Node = {
        id: `${activeTool}-${Date.now()}`,
        type: activeTool,
        position,
        data: { isEditing: false },
        style: {
          width: size.width,
          height: size.height,
        },
      };

      setNodes((nds) => [...nds, newNode]);

      if (onToolReset) {
        onToolReset();
      }
    },
    [activeTool, setNodes, onToolReset, quickActionsMenu.show]
  );

  // Handle node click
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Exit edit mode on other nodes
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isEditing: n.id === node.id ? n.data.isEditing : false },
        }))
      );

      // If clicking on a frame, invisibly select its children
      if (node.type === "frame" && node.selected) {
        const childIds = node.data.childIds || [];
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: {
              ...n.data,
              invisiblySelected: childIds.includes(n.id),
            },
          }))
        );
      }
    },
    [setNodes]
  );

  // Handle node double click to enter edit mode
  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.stopPropagation();
      setEditingNodeId(node.id);
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isEditing: n.id === node.id },
        }))
      );
    },
    [setNodes]
  );

  // Handle selection change
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      // Exit edit mode if no nodes are selected or different node is selected
      if (selectedNodes.length === 0 || (editingNodeId && !selectedNodes.find(n => n.id === editingNodeId))) {
        setEditingNodeId(null);
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            data: { ...node.data, isEditing: false, invisiblySelected: false },
          }))
        );
      } else {
        // Handle frame selection - invisibly select children
        const selectedFrames = selectedNodes.filter((n) => n.type === "frame");
        const childIdsToSelect = new Set<string>();

        selectedFrames.forEach((frame) => {
          const childIds = frame.data.childIds || [];
          childIds.forEach((id: string) => childIdsToSelect.add(id));
        });

        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            data: {
              ...node.data,
              invisiblySelected: childIdsToSelect.has(node.id),
            },
          }))
        );
      }
    },
    [setNodes, editingNodeId]
  );

  // Keyboard shortcuts for copy, paste, delete, and edit mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input, textarea, or contenteditable element
      const activeElement = document.activeElement;
      const isTypingInInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).isContentEditable ||
        activeElement.closest('[contenteditable="true"]') ||
        activeElement.closest('input') ||
        activeElement.closest('textarea')
      );
      
      // Delete selected nodes
      if (event.key === "Delete" || event.key === "Backspace") {
        // Don't delete if we're in edit mode OR typing in an input
        if (editingNodeId || isTypingInInput) return;
        
        setNodes((nds) => nds.filter((node) => !node.selected));
        setEdges((eds) => eds.filter((edge) => !edge.selected));
      }

      // Copy selected nodes (Cmd/Ctrl + C)
      if ((event.metaKey || event.ctrlKey) && event.key === "c") {
        if (editingNodeId || isTypingInInput) return; // Don't copy if in edit mode or typing
        
        const selectedNodes = nodes.filter((node) => node.selected);
        if (selectedNodes.length > 0) {
          localStorage.setItem("copiedNodes", JSON.stringify(selectedNodes));
        }
      }

      // Paste nodes (Cmd/Ctrl + V)
      if ((event.metaKey || event.ctrlKey) && event.key === "v") {
        if (editingNodeId || isTypingInInput) return; // Don't paste if in edit mode or typing
        
        const copiedNodesStr = localStorage.getItem("copiedNodes");
        if (copiedNodesStr) {
          const copiedNodes: Node[] = JSON.parse(copiedNodesStr);
          const newNodes = copiedNodes.map((node) => ({
            ...node,
            id: `${node.type}-${Date.now()}-${Math.random()}`,
            position: {
              x: node.position.x + 20,
              y: node.position.y + 20,
            },
            selected: false,
            data: { ...node.data, isEditing: false },
          }));
          setNodes((nds) => [...nds, ...newNodes]);
        }
      }

      // Duplicate selected nodes (Cmd/Ctrl + D)
      if ((event.metaKey || event.ctrlKey) && event.key === "d") {
        if (editingNodeId || isTypingInInput) return; // Don't duplicate if in edit mode or typing
        
        event.preventDefault();
        const selectedNodes = nodes.filter((node) => node.selected);
        if (selectedNodes.length > 0) {
          const duplicatedNodes = selectedNodes.map((node) => ({
            ...node,
            id: `${node.type}-${Date.now()}-${Math.random()}`,
            position: {
              x: node.position.x + 20,
              y: node.position.y + 20,
            },
            selected: false,
            data: { ...node.data, isEditing: false },
          }));
          setNodes((nds) => [...nds, ...duplicatedNodes]);
        }
      }

      // Enter edit mode on selected node when typing (printable characters)
      if (!editingNodeId && !isTypingInInput && !event.metaKey && !event.ctrlKey && !event.altKey) {
        // Check if it's a printable character
        if (event.key.length === 1 || event.key === "Enter") {
          const selectedNode = nodes.find((node) => node.selected);
          if (selectedNode && (selectedNode.type === "text" || selectedNode.type === "stickyNote" || selectedNode.type === "frame")) {
            setEditingNodeId(selectedNode.id);
            setNodes((nds) =>
              nds.map((n) => ({
                ...n,
                data: { ...n.data, isEditing: n.id === selectedNode.id },
              }))
            );
          }
        }
      }

      // Escape to exit edit mode
      if (event.key === "Escape" && editingNodeId) {
        setEditingNodeId(null);
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            data: { ...node.data, isEditing: false },
          }))
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nodes, setNodes, setEdges, editingNodeId]);

  return (
    <FlowExecutionProvider executeFlow={handleRunFlow} isExecuting={isFlowExecuting}>
      <CanvasWrapper 
        ref={reactFlowWrapper} 
        style={{ 
          "--canvas-cursor": cursorStyle,
          "--zoom": zoom 
        } as React.CSSProperties}
      >
        <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onInit={onInit}
        onMove={(event, viewport) => onViewportChangeHandler(viewport)}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onSelectionChange={onSelectionChange}
        onDrop={onDrop}
        onDragOver={onDragOver}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.05}
        maxZoom={10}
        panOnScroll={true}
        panOnScrollMode="free"
        zoomOnScroll={false}
        zoomOnPinch={true}
        panOnDrag={[1, 2]} // Pan with middle or right mouse button
        multiSelectionKeyCode="Shift"
        deleteKeyCode="Delete"
        selectionOnDrag={true}
        selectionMode="partial"
        nodesDraggable={true}
        nodeDragThreshold={5}
        connectionRadius={50}
        connectionMode="loose"
        connectionLineStyle={{ stroke: '#8B5CF6', strokeWidth: 2 }}
        connectionLineComponent={CustomConnectionLine}
      >
        <Background
          color="#ddd"
          gap={40}
          size={2}
          style={{ display: showGrid ? "block" : "none" }}
        />
      </ReactFlow>

      {/* Quick Actions Menu with temporary connection line */}
      {quickActionsMenu.show && reactFlowInstance.current && quickActionsSourceNode && (() => {
        const screenPos = reactFlowInstance.current!.flowToScreenPosition(quickActionsMenu.position);
        const isReverseConnection = quickActionsMenu.sourceHandle === 'input-source';
        
        // Use shared getHandlePosition for consistent endpoint calculation
        const handlePos = getHandlePosition(
          quickActionsSourceNode,
          isReverseConnection ? 'input' : 'output'
        );
        const sourcePos = reactFlowInstance.current!.flowToScreenPosition(handlePos);
        
        const [connectionPath] = getBezierPath({
          sourceX: sourcePos.x,
          sourceY: sourcePos.y,
          sourcePosition: isReverseConnection ? Position.Left : Position.Right,
          targetX: screenPos.x,
          targetY: screenPos.y,
          targetPosition: isReverseConnection ? Position.Right : Position.Left,
        });

        return (
          <>
            {/* Temporary connection line from source to menu */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 9999,
              }}
            >
              <path
                d={connectionPath}
                fill="none"
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            </svg>

            {/* Menu */}
            <div
              style={{
                position: 'absolute',
                left: `${screenPos.x}px`,
                top: `${screenPos.y}px`,
                transform: 'translate(-50%, -50%)',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '4px',
                zIndex: 10000,
                minWidth: '200px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                padding: '8px 12px 4px 12px',
                fontWeight: 500
              }}>
                Create and connect
              </div>
              <button
                onClick={() => createNodeFromQuickAction('document')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <DocumentIcon /> Document
              </button>
              <button
                onClick={() => createNodeFromQuickAction('table')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <TableIcon /> Table
              </button>
              <button
                onClick={() => createNodeFromQuickAction('diagram')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <DiagramIcon /> Diagram
              </button>
              <button
                onClick={() => createNodeFromQuickAction('prototype')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <PrototypeIcon /> Prototype
              </button>
              <button
                onClick={() => createNodeFromQuickAction('slides')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <SlidesIcon /> Slides
              </button>
              <button
                onClick={() => createNodeFromQuickAction('image')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <ImageIcon /> Image
              </button>
            </div>
          </>
        );
      })()}
      
      {/* Execution Progress Panel */}
      <ExecutionProgress
        isVisible={showProgress}
        status={executionStatus}
        message={executionMessage}
        currentStep={currentStep}
        totalSteps={totalSteps}
        currentNodeType={currentNodeType}
        onClose={() => setShowProgress(false)}
        onNavigateToStep={() => {
          if (currentExecutingNodeId) {
            const node = nodes.find(n => n.id === currentExecutingNodeId);
            if (node) {
              const x = node.position.x + (node.width || 0) / 2;
              const y = node.position.y + (node.height || 0) / 2;
              setViewport({ x: -x + window.innerWidth / 2, y: -y + window.innerHeight / 2, zoom: 1 }, { duration: 300 });
            }
          }
        }}
      />
      </CanvasWrapper>
    </FlowExecutionProvider>
  );
}

export function ReactFlowCanvas(props: ReactFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
