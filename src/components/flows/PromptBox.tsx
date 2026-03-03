import React, { useState, useRef, useEffect } from "react";
import { cn } from "../../ui/utils";
import {
  IconDotsThreeVertical,
  IconArrowCurvesSparks,
  IconOrbitDouble,
  IconGraduationCap,
  IconGlobe,
  IconChevronDown,
  IconClock,
  IconExclamationPointCircle,
  IconCheckMark
} from "@mirohq/design-system-icons";
import { Button } from "@mirohq/design-system";

// Add spinner animation styles
const spinnerStyles = `
@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('prompt-box-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'prompt-box-styles';
  styleSheet.textContent = spinnerStyles;
  document.head.appendChild(styleSheet);
}

interface PromptBoxProps {
  // Data
  value: string;
  title?: string;
  onValueChange: (value: string) => void;
  onTitleChange?: (title: string) => void;

  // Mode control
  mode: "view" | "edit";
  onModeChange: (mode: "view" | "edit") => void;

  // Execution
  onRun: (prompt: string) => void;
  onStop?: () => void;
  flowState?: {
    status: "idle" | "running" | "waiting" | "success" | "error";
    error?: string;
  };

  // Model settings
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export function PromptBox({
  value,
  title = "Generate content",
  onValueChange,
  onTitleChange,
  mode,
  onModeChange,
  onRun,
  onStop,
  flowState = { status: "idle" },
  selectedModel = "gpt-3.5-turbo",
  onModelChange,
}: PromptBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [localValue, setLocalValue] = useState(value);
  const [localTitle, setLocalTitle] = useState(title);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(value);

  // Sync with parent value changes only if it's an external change (not from our own save)
  useEffect(() => {
    if (value !== lastSavedRef.current) {
      setLocalValue(value);
      lastSavedRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  // Auto-save prompt with debouncing (300ms after typing stops)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (localValue === lastSavedRef.current) {
      return;
    }
    
    debounceRef.current = setTimeout(() => {
      lastSavedRef.current = localValue;
      onValueChange(localValue);
    }, 300);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [localValue, onValueChange]);

  // Auto-resize textarea in edit mode
  useEffect(() => {
    if (mode === "edit" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [mode, localValue]);

  // Handle escape key to exit edit mode
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode === "edit") {
        handleSave();
        onModeChange("view");
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mode, onModeChange, localValue, localTitle]);

  // Handle click outside to close edit mode (use capture phase + mousedown)
  useEffect(() => {
    if (mode === "edit") {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (containerRef.current && !containerRef.current.contains(target)) {
          handleSave();
          onModeChange("view");
        }
      };
      // Use mousedown with capture phase to catch before stopPropagation
      document.addEventListener("mousedown", handleClickOutside, true);
      return () => document.removeEventListener("mousedown", handleClickOutside, true);
    }
  }, [mode, onModeChange, localValue, localTitle]);

  const handleSave = () => {
    onValueChange(localValue);
    if (onTitleChange) onTitleChange(localTitle);
  };

  // Get the status icon to display outside the button
  const getStatusIcon = () => {
    switch (flowState.status) {
      case "running":
        return (
          <span 
            style={{ 
              width: '16px', 
              height: '16px', 
              border: '2px solid #E5E7EB',
              borderTopColor: '#6B7280',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              flexShrink: 0,
            }} 
          />
        );
      case "waiting":
        return (
          <span style={{ color: '#6B7280', display: 'flex', alignItems: 'center' }}>
            <IconClock size={16} />
          </span>
        );
      case "error":
        return (
          <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center' }}>
            <IconExclamationPointCircle size={16} />
          </span>
        );
      case "success":
        return (
          <span style={{ color: '#10B981', display: 'flex', alignItems: 'center' }}>
            <IconCheckMark size={16} />
          </span>
        );
      default:
        return null;
    }
  };

  // Get button text and disabled state
  const getButtonText = () => {
    return flowState.status === "running" ? "Stop" : "Run";
  };

  const isButtonDisabled = () => {
    return flowState.status === "waiting" || 
           flowState.status === "success" || 
           flowState.status === "error" || 
           !localValue.trim();
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (flowState.status === "running" && onStop) {
      onStop();
    } else {
      console.log('=== RUN BUTTON CLICKED ===');
      console.log('Prompt text:', localValue);
      handleSave();
      onRun(localValue);
    }
  };

  if (mode === "view") {
    return (
      <div
        ref={containerRef}
        className="nodrag"
        style={{
          backgroundColor: "#FFF",
          border: flowState.status === "error" 
            ? "1px solid #ef4444" 
            : "1px solid var(--border-neutrals, var(--border))",
          borderRadius: "8px",
          minHeight: "auto",
          zIndex: 40,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 12px 16px 12px",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          onClick={() => onModeChange("edit")}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f8f9fa";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#FFF";
          }}
        >
        {/* AI Icon */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", width: "20px", height: "20px", color: "var(--ai-accent-strong-default, #8B5CF6)" }}>
          <IconArrowCurvesSparks size={20} />
        </div>

        {/* Prompt Text (truncated to 2 lines with gradient fade) */}
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted-foreground)",
              lineHeight: "20px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              margin: 0,
            }}
          >
            {value || "Click to add a prompt..."}
          </p>
          {/* Gradient fade overlay */}
          {value && value.length > 60 && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "20px",
                background: "linear-gradient(to bottom, transparent, #FFF)",
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        {/* Status Icon + Run Button Container */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Status Icon (outside button) */}
          {getStatusIcon()}
          
          {/* Run/Stop Button */}
          <button
            onClick={handleButtonClick}
            disabled={isButtonDisabled()}
            title={!localValue.trim() ? "Enter a prompt first" : flowState.status === "running" ? "Stop execution" : "Run this prompt"}
            style={{
              padding: "6px 12px",
              borderRadius: "var(--Radii-radii-50, 4px)",
              border: flowState.status === "error" 
                ? "1px solid #ef4444" 
                : "1px solid var(--border-neutrals, var(--border))",
              background: flowState.status === "running"
                ? "#FEE2E2"
                : flowState.status === "error" 
                  ? "#fef2f2" 
                  : "var(--background-neutrals, var(--background))",
              color: flowState.status === "running" 
                ? "#DC2626"
                : flowState.status === "error" 
                  ? "#dc2626" 
                  : "var(--foreground)",
              fontFamily: "var(--font-noto)",
              fontSize: "14px",
              fontWeight: 600,
              lineHeight: "20px",
              cursor: isButtonDisabled() ? "not-allowed" : "pointer",
              opacity: isButtonDisabled() ? 0.5 : 1,
            }}
          >
            {getButtonText()}
          </button>
        </div>
        </div>
        {flowState.status === "error" && flowState.error && (
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "#fef2f2",
              borderTop: "1px solid #fecaca",
              fontSize: "12px",
              color: "#dc2626",
            }}
          >
            {flowState.error}
          </div>
        )}
      </div>
    );
  }

  // Edit Mode - Same position, expands downward, higher z-index
  return (
    <div
      ref={containerRef}
      className="nodrag"
      style={{
        backgroundColor: "var(--background, #ffffff)",
        border: "2px solid var(--primary)",
        borderRadius: "var(--radius-lg)",
        minHeight: "auto",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          backgroundColor: "#FFF",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
          <div style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", flexShrink: 0, color: "var(--ai-accent-strong-default, #8B5CF6)" }}>
            <IconArrowCurvesSparks size={20} />
          </div>
          <span
            style={{
              flex: 1,
              fontFamily: "var(--font-roobert)",
              fontWeight: 500,
              fontSize: "16px",
              color: "var(--foreground)",
            }}
          >
            {title}
          </span>
        </div>
        {/* Status Icon + Run Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getStatusIcon()}
          <Button
            variant={flowState.status === "running" ? "secondary" : "primary"}
            size="medium"
            onClick={handleButtonClick}
            disabled={isButtonDisabled()}
          >
            {getButtonText()}
          </Button>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: "16px", flex: 1 }}>
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder="Describe what you want to generate..."
          style={{
            width: "100%",
            minHeight: "120px",
            resize: "none",
            border: "none",
            outline: "none",
            fontFamily: "var(--font-noto)",
            fontSize: "14px",
            lineHeight: "1.6",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Bottom Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px 16px 16px",
          backgroundColor: "#FFF",
          borderBottomLeftRadius: "var(--radius-lg)",
          borderBottomRightRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {/* Model Selector Button */}
          <button
            className="nodrag"
            style={{
              padding: "4px 6px",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "background-color 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
            }}
            title="Select model"
            onClick={() => console.log("Model selector clicked")}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--secondary, #f8f9fa)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <div style={{ width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconOrbitDouble size={18} />
            </div>
            <div style={{ width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconChevronDown size={14} />
            </div>
          </button>

          {/* Knowledge Sources Button */}
          <button
            className="nodrag"
            style={{
              padding: "4px 6px",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "4px",
              cursor: "not-allowed",
              opacity: 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
            }}
            title="Connect knowledge sources (Coming soon)"
            disabled
          >
            <div style={{ width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconGraduationCap size={18} />
            </div>
            <div style={{ width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconChevronDown size={14} />
            </div>
          </button>

          {/* Additional Options Button */}
          <button
            className="nodrag"
            style={{
              padding: "6px",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "background-color 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Additional options"
            onClick={() => console.log("Additional options clicked")}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--secondary, #f8f9fa)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <div style={{ width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconGlobe size={18} />
            </div>
          </button>
        </div>

        {/* More Menu */}
        <button
          className="nodrag"
          style={{
            padding: "6px",
            backgroundColor: "transparent",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.2s",
          }}
          title="More options"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--secondary, #f8f9fa)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div style={{ width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconDotsThreeVertical size={18} />
          </div>
        </button>
      </div>
    </div>
  );
}
