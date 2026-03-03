import React, { createContext, useContext } from 'react';

interface FlowExecutionContextValue {
  executeFlow: (nodeId: string, promptOverride?: string) => void;
  isExecuting: boolean;
}

const FlowExecutionContext = createContext<FlowExecutionContextValue | null>(null);

export function FlowExecutionProvider({
  children,
  executeFlow,
  isExecuting,
}: {
  children: React.ReactNode;
  executeFlow: (nodeId: string, promptOverride?: string) => void;
  isExecuting: boolean;
}) {
  return (
    <FlowExecutionContext.Provider value={{ executeFlow, isExecuting }}>
      {children}
    </FlowExecutionContext.Provider>
  );
}

export function useFlowExecution() {
  const context = useContext(FlowExecutionContext);
  if (!context) {
    return {
      executeFlow: (_nodeId: string, _promptOverride?: string) => console.warn('FlowExecutionContext not found'),
      isExecuting: false,
    };
  }
  return context;
}
