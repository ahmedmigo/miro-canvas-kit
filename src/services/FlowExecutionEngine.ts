import { Node, Edge } from 'reactflow';

export interface FlowExecutionState {
  status: 'idle' | 'waiting' | 'running' | 'success' | 'error';
  error?: string;
  result?: any;
}

export interface ExecutionStep {
  nodeId: string;
  nodeType: string;
  status: 'pending' | 'waiting' | 'running' | 'success' | 'error';
  inputNodeIds: string[];
  outputNodeIds: string[];
  result?: any;
  error?: string;
}

export interface FlowExecutionPlan {
  steps: Map<string, ExecutionStep>;
  executionOrder: string[];
  startNodeId: string;
}

export interface ExecutingEdge {
  edgeId: string;
  progress: number;
}

export interface FlowExecutionContext {
  inputs: Array<{
    nodeId: string;
    nodeType: string;
    content: any;
    promptTitle?: string;
  }>;
  previousResults: Array<{
    nodeId: string;
    result: any;
  }>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export function getInputNodes(nodeId: string, nodes: Node[], edges: Edge[]): Node[] {
  const inputEdges = edges.filter(edge => edge.target === nodeId);
  const inputNodeIds = inputEdges.map(edge => edge.source);
  return nodes.filter(node => inputNodeIds.includes(node.id));
}

export function getOutputNodes(nodeId: string, nodes: Node[], edges: Edge[]): Node[] {
  const outputEdges = edges.filter(edge => edge.source === nodeId);
  const outputNodeIds = outputEdges.map(edge => edge.target);
  return nodes.filter(node => outputNodeIds.includes(node.id));
}

export function getInputEdges(nodeId: string, edges: Edge[]): Edge[] {
  return edges.filter(edge => edge.target === nodeId);
}

export function getOutputEdges(nodeId: string, edges: Edge[]): Edge[] {
  return edges.filter(edge => edge.source === nodeId);
}

export function extractNodeContent(node: Node): any {
  const data = node.data || {};
  
  switch (node.type) {
    case 'document':
      return {
        type: 'document',
        content: data.content || '',
        title: data.promptTitle || data.title || 'Document',
      };
    case 'table':
      return {
        type: 'table',
        columns: data.columns || [],
        rows: data.rows || [],
        title: data.promptTitle || data.title || 'Table',
      };
    case 'stickyNote':
      return {
        type: 'stickyNote',
        text: data.text || '',
        color: data.color || 'yellow',
      };
    case 'text':
      return {
        type: 'text',
        content: data.content || data.text || '',
      };
    case 'image':
      return {
        type: 'image',
        src: data.src || '',
        alt: data.alt || '',
      };
    case 'diagram':
      return {
        type: 'diagram',
        content: data.content || {},
        title: data.promptTitle || data.title || 'Diagram',
      };
    case 'prototype':
      return {
        type: 'prototype',
        content: data.content || {},
        title: data.promptTitle || data.title || 'Prototype',
      };
    case 'slides':
      return {
        type: 'slides',
        slides: data.slides || [],
        title: data.promptTitle || data.title || 'Slides',
      };
    default:
      return {
        type: node.type || 'unknown',
        data: data,
      };
  }
}

export function buildExecutionContext(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  executedResults: Map<string, any> = new Map()
): FlowExecutionContext {
  const inputNodes = getInputNodes(nodeId, nodes, edges);
  
  const inputs = inputNodes.map(node => ({
    nodeId: node.id,
    nodeType: node.type || 'unknown',
    content: extractNodeContent(node),
    promptTitle: node.data?.promptTitle,
  }));

  const previousResults: Array<{ nodeId: string; result: any }> = [];
  executedResults.forEach((result, id) => {
    previousResults.push({ nodeId: id, result });
  });

  return {
    inputs,
    previousResults,
  };
}

function findFlowRoots(
  startNodeId: string,
  nodes: Node[],
  edges: Edge[]
): string[] {
  const visited = new Set<string>();
  const flowNodes = new Set<string>();
  
  function traverseBoth(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodes.find(n => n.id === nodeId);
    if (node && node.data?.flowEnabled && node.data?.prompt) {
      flowNodes.add(nodeId);
    }
    
    const inputNodes = getInputNodes(nodeId, nodes, edges);
    for (const inNode of inputNodes) {
      if (inNode.data?.flowEnabled) {
        traverseBoth(inNode.id);
      }
    }
    
    const outputNodes = getOutputNodes(nodeId, nodes, edges);
    for (const outNode of outputNodes) {
      if (outNode.data?.flowEnabled) {
        traverseBoth(outNode.id);
      }
    }
  }
  
  traverseBoth(startNodeId);
  
  const roots: string[] = [];
  for (const nodeId of flowNodes) {
    const inputNodes = getInputNodes(nodeId, nodes, edges);
    const hasFlowEnabledInput = inputNodes.some(n => flowNodes.has(n.id));
    if (!hasFlowEnabledInput) {
      roots.push(nodeId);
    }
  }
  
  return roots.length > 0 ? roots : [startNodeId];
}

function traverseFlowForward(
  startNodeIds: string[],
  nodes: Node[],
  edges: Edge[]
): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const queue = [...startNodeIds];
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    
    const node = nodes.find(n => n.id === nodeId);
    // Include node ONLY if it has a prompt - flowEnabled without a prompt should be skipped
    const hasPrompt = node?.data?.prompt && node.data.prompt.trim().length > 0;
    const isFlowEnabled = node?.data?.flowEnabled;
    
    if (node && hasPrompt) {
      result.push(nodeId);
      console.log(`📌 Including node in plan: ${nodeId} (flowEnabled: ${isFlowEnabled}, hasPrompt: ${hasPrompt})`);
    } else if (node && isFlowEnabled && !hasPrompt) {
      console.log(`⏭️ Skipping node without prompt: ${nodeId} (flowEnabled: ${isFlowEnabled})`);
    }
    
    // Traverse to ALL connected output nodes to find more flow nodes
    const outputNodes = getOutputNodes(nodeId, nodes, edges);
    for (const outNode of outputNodes) {
      if (!visited.has(outNode.id)) {
        // Always traverse to check if downstream nodes have prompts
        queue.push(outNode.id);
      }
    }
  }
  
  return result;
}

export function createExecutionPlan(
  startNodeId: string,
  nodes: Node[],
  edges: Edge[]
): FlowExecutionPlan {
  // Start from the clicked node and traverse forward only
  const flowNodeIds = traverseFlowForward([startNodeId], nodes, edges);
  console.log('🎯 Starting from node:', startNodeId);
  console.log('📋 Nodes to execute:', flowNodeIds);
  const steps = new Map<string, ExecutionStep>();
  
  for (const nodeId of flowNodeIds) {
    const node = nodes.find(n => n.id === nodeId)!;
    const inputNodes = getInputNodes(nodeId, nodes, edges);
    const outputNodes = getOutputNodes(nodeId, nodes, edges);
    
    const inputNodeIds = inputNodes
      .filter(n => flowNodeIds.includes(n.id))
      .map(n => n.id);
    
    const outputNodeIds = outputNodes
      .filter(n => flowNodeIds.includes(n.id))
      .map(n => n.id);
    
    steps.set(nodeId, {
      nodeId,
      nodeType: node.type || 'unknown',
      status: 'pending',
      inputNodeIds,
      outputNodeIds,
    });
  }
  
  const executionOrder = topologicalSort(flowNodeIds, steps);
  
  console.log('📋 Execution Plan Created:', {
    totalSteps: steps.size,
    executionOrder,
    steps: Array.from(steps.values()).map(s => ({
      nodeId: s.nodeId,
      inputs: s.inputNodeIds,
      outputs: s.outputNodeIds,
    })),
  });
  
  return {
    steps,
    executionOrder,
    startNodeId,
  };
}

function topologicalSort(
  nodeIds: string[],
  steps: Map<string, ExecutionStep>
): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  
  for (const nodeId of nodeIds) {
    inDegree.set(nodeId, 0);
    adjacency.set(nodeId, []);
  }
  
  for (const nodeId of nodeIds) {
    const step = steps.get(nodeId)!;
    for (const inputId of step.inputNodeIds) {
      if (nodeIds.includes(inputId)) {
        adjacency.get(inputId)!.push(nodeId);
        inDegree.set(nodeId, (inDegree.get(nodeId) || 0) + 1);
      }
    }
  }
  
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }
  
  const result: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);
    
    for (const neighbor of adjacency.get(nodeId) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }
  
  return result;
}

function areAllInputsReady(
  step: ExecutionStep,
  steps: Map<string, ExecutionStep>
): boolean {
  for (const inputId of step.inputNodeIds) {
    const inputStep = steps.get(inputId);
    if (inputStep && inputStep.status !== 'success') {
      return false;
    }
  }
  return true;
}

function getReadyNodes(
  steps: Map<string, ExecutionStep>
): ExecutionStep[] {
  const ready: ExecutionStep[] = [];
  
  for (const step of steps.values()) {
    if (step.status === 'pending' || step.status === 'waiting') {
      if (areAllInputsReady(step, steps)) {
        ready.push(step);
      }
    }
  }
  
  return ready;
}

export async function executeNodePrompt(
  node: Node,
  context: FlowExecutionContext,
  onProgress?: (progress: number) => void
): Promise<any> {
  const prompt = node.data?.prompt || '';
  const nodeType = node.type || 'document';
  
  if (!prompt.trim()) {
    throw new Error('No prompt defined for this node');
  }

  onProgress?.(0.1);

  try {
    const response = await fetch(`${API_BASE_URL}/execute-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        context,
        nodeType,
      }),
    });

    onProgress?.(0.5);

    const responseText = await response.text();
    
    if (!responseText) {
      throw new Error('Empty response from server. The API server may be unavailable.');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', responseText);
      throw new Error('Invalid response from server. Please try again.');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to execute prompt');
    }

    onProgress?.(1);
    
    return data.result;
  } catch (error: any) {
    console.error('Error executing prompt:', error);
    throw new Error(error.message || 'Failed to execute prompt');
  }
}

export async function executeFlow(
  startNodeId: string,
  nodes: Node[],
  edges: Edge[],
  callbacks: {
    onNodeStateChange: (nodeId: string, state: FlowExecutionState) => void;
    onEdgeAnimationStart: (edgeId: string) => void;
    onEdgeAnimationEnd: (edgeId: string) => void;
    onNodeContentUpdate: (nodeId: string, content: any) => void;
    onPlanCreated?: (plan: FlowExecutionPlan) => void;
    onProgressUpdate?: (currentStep: number, totalSteps: number, currentNodeId: string, currentNodeType: string) => void;
  }
): Promise<void> {
  const plan = createExecutionPlan(startNodeId, nodes, edges);
  
  if (plan.steps.size === 0) {
    console.warn('No executable nodes found in flow');
    return;
  }
  
  callbacks.onPlanCreated?.(plan);
  
  for (const step of plan.steps.values()) {
    if (!areAllInputsReady(step, plan.steps)) {
      step.status = 'waiting';
      callbacks.onNodeStateChange(step.nodeId, { status: 'waiting' });
    }
  }
  
  const executedResults = new Map<string, any>();
  const totalSteps = plan.steps.size;
  let currentStepNumber = 0;
  
  // Get the first step to report initial progress
  const firstStep = plan.steps.values().next().value;
  if (firstStep) {
    callbacks.onProgressUpdate?.(0, totalSteps, firstStep.nodeId, firstStep.nodeType);
  }
  
  async function executeStep(step: ExecutionStep): Promise<void> {
    const node = nodes.find(n => n.id === step.nodeId);
    if (!node) {
      step.status = 'error';
      step.error = 'Node not found';
      callbacks.onNodeStateChange(step.nodeId, { status: 'error', error: 'Node not found' });
      return;
    }
    
    // Report that we're starting this step (before execution)
    callbacks.onProgressUpdate?.(currentStepNumber, totalSteps, step.nodeId, step.nodeType);
    
    const inputEdges = getInputEdges(step.nodeId, edges);
    inputEdges.forEach(edge => {
      if (edge.id) callbacks.onEdgeAnimationStart(edge.id);
    });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    step.status = 'running';
    callbacks.onNodeStateChange(step.nodeId, { status: 'running' });
    
    try {
      const context = buildExecutionContext(step.nodeId, nodes, edges, executedResults);
      const result = await executeNodePrompt(node, context);
      
      step.status = 'success';
      step.result = result;
      executedResults.set(step.nodeId, result);
      
      callbacks.onNodeContentUpdate(step.nodeId, result);
      callbacks.onNodeStateChange(step.nodeId, { status: 'success', result });
      
      inputEdges.forEach(edge => {
        if (edge.id) callbacks.onEdgeAnimationEnd(edge.id);
      });
      
      // Increment step counter after completion
      currentStepNumber++;
      callbacks.onProgressUpdate?.(currentStepNumber, totalSteps, step.nodeId, step.nodeType);
      
      console.log(`✅ Step completed: ${step.nodeId}`);
      
      await triggerNextSteps(step);
      
    } catch (error: any) {
      step.status = 'error';
      step.error = error.message;
      
      inputEdges.forEach(edge => {
        if (edge.id) callbacks.onEdgeAnimationEnd(edge.id);
      });
      
      callbacks.onNodeStateChange(step.nodeId, { 
        status: 'error', 
        error: error.message || 'Execution failed' 
      });
      
      console.error(`❌ Step failed: ${step.nodeId}`, error);
    }
  }
  
  async function triggerNextSteps(completedStep: ExecutionStep): Promise<void> {
    const nextPromises: Promise<void>[] = [];
    
    for (const outputNodeId of completedStep.outputNodeIds) {
      const outputStep = plan.steps.get(outputNodeId);
      if (outputStep && (outputStep.status === 'pending' || outputStep.status === 'waiting')) {
        if (areAllInputsReady(outputStep, plan.steps)) {
          console.log(`🚀 Triggering next step: ${outputNodeId} (all inputs ready)`);
          nextPromises.push(executeStep(outputStep));
        } else {
          console.log(`⏳ Step ${outputNodeId} still waiting for other inputs`);
        }
      }
    }
    
    await Promise.all(nextPromises);
  }
  
  const initialReadyNodes = getReadyNodes(plan.steps);
  console.log(`🎬 Starting execution with ${initialReadyNodes.length} ready nodes`);
  
  await Promise.all(initialReadyNodes.map(step => executeStep(step)));
  
  console.log('🏁 Flow execution complete');
}

export async function executeSingleNode(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  callbacks: {
    onNodeStateChange: (nodeId: string, state: FlowExecutionState) => void;
    onEdgeAnimationStart: (edgeId: string) => void;
    onEdgeAnimationEnd: (edgeId: string) => void;
    onNodeContentUpdate: (nodeId: string, content: any) => void;
  }
): Promise<void> {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) {
    console.error('Node not found:', nodeId);
    return;
  }

  const inputEdges = getInputEdges(nodeId, edges);
  inputEdges.forEach(edge => {
    if (edge.id) callbacks.onEdgeAnimationStart(edge.id);
  });

  await new Promise(resolve => setTimeout(resolve, 300));

  callbacks.onNodeStateChange(nodeId, { status: 'running' });

  try {
    const context = buildExecutionContext(nodeId, nodes, edges, new Map());
    const result = await executeNodePrompt(node, context);

    callbacks.onNodeContentUpdate(nodeId, result);
    callbacks.onNodeStateChange(nodeId, { status: 'success', result });

    inputEdges.forEach(edge => {
      if (edge.id) callbacks.onEdgeAnimationEnd(edge.id);
    });

  } catch (error: any) {
    inputEdges.forEach(edge => {
      if (edge.id) callbacks.onEdgeAnimationEnd(edge.id);
    });

    callbacks.onNodeStateChange(nodeId, { 
      status: 'error', 
      error: error.message || 'Execution failed' 
    });
    
    throw error;
  }
}
