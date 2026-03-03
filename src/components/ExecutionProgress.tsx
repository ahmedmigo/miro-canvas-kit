import React, { useState, useEffect, useRef } from 'react';
import { IconButton } from '@mirohq/design-system';
import { IconArrowCurvesSparks, IconMap, IconCross } from '@mirohq/design-system-icons';
import { styled } from '../lib/stitches.config';
import avatarImg from '../assets/avatar.jpg';

const IconButtonWrapper = styled('div', {
  '& svg': {
    display: 'inline-flex !important',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 'auto',
  },
});

interface ExecutionProgressProps {
  isVisible: boolean;
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  currentStep?: number;
  totalSteps?: number;
  currentNodeType?: string;
  onClose?: () => void;
  onNavigateToStep?: () => void;
}

export function ExecutionProgress({ 
  isVisible, 
  status, 
  message, 
  currentStep = 0,
  totalSteps = 1,
  currentNodeType = 'content',
  onClose,
  onNavigateToStep
}: ExecutionProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // Base progress from completed steps
  const baseProgress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  
  // Progress per step
  const progressPerStep = 100 / totalSteps;
  
  // Maximum animated progress for the current step (80% of the way to the next step)
  const maxAnimatedProgress = baseProgress + (progressPerStep * 0.8);
  
  // Display step shows which step is currently being worked on (1-indexed for user display)
  const displayStep = Math.min(currentStep + 1, totalSteps);
  
  useEffect(() => {
    if (status === 'running') {
      // Reset animation when a step completes and we start the next
      if (animatedProgress < baseProgress) {
        setAnimatedProgress(baseProgress);
      }
      
      startTimeRef.current = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - (startTimeRef.current || Date.now());
        // Animate over 8 seconds to reach 80% of current step
        // Use easing to slow down as it approaches 80%
        const duration = 8000;
        const rawProgress = Math.min(elapsed / duration, 1);
        // Ease out - slows down as it approaches the end
        const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
        
        const targetProgress = baseProgress + (progressPerStep * 0.8 * easedProgress);
        setAnimatedProgress(Math.min(targetProgress, maxAnimatedProgress));
        
        if (rawProgress < 1 && status === 'running') {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } else if (status === 'success') {
      // Jump to 100% on success
      setAnimatedProgress(100);
    } else if (status === 'error') {
      // Keep current progress on error
    } else if (status === 'idle') {
      // Reset on idle
      setAnimatedProgress(0);
    }
  }, [status, currentStep, baseProgress, progressPerStep, maxAnimatedProgress]);
  
  // Reset animated progress when currentStep changes (step completed)
  useEffect(() => {
    if (currentStep > 0) {
      setAnimatedProgress(baseProgress);
      startTimeRef.current = Date.now();
    }
  }, [currentStep, baseProgress]);
  
  const getGeneratingText = () => {
    if (status === 'success') return 'Flow completed';
    if (status === 'error') return message || 'An error occurred';
    
    const nodeTypeMap: Record<string, string> = {
      document: 'Generating a document',
      table: 'Generating a table',
      slides: 'Generating slides',
      diagram: 'Generating a diagram',
      prototype: 'Generating a prototype',
      image: 'Generating an image',
    };
    return nodeTypeMap[currentNodeType] || 'Generating content';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '60px',
        right: isVisible ? '16px' : '-400px',
        width: '340px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0px 0px 12px 0px rgba(34, 36, 40, 0.04), 0px 2px 8px 0px rgba(34, 36, 40, 0.12)',
        padding: '8px',
        transition: 'right 0.3s ease-in-out',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0px',
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {/* Avatar with Flows Badge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {/* Avatar Circle */}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1px solid #314cd9',
              backgroundColor: '#e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img 
              src={avatarImg} 
              alt="" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }} 
            />
          </div>
          {/* Flows Icon Badge - positioned at bottom right */}
          <div
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              backgroundColor: '#8f7fee',
              borderRadius: '999px',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
              boxSizing: 'border-box',
            }}
          >
            <IconArrowCurvesSparks size={12} color="white" />
          </div>
        </div>

        {/* Title and Subtitle */}
        <div style={{ flex: 1, minWidth: 0, padding: '8px 0' }}>
          <div
            style={{
              fontFamily: "'Noto Sans', sans-serif",
              fontSize: '14px',
              fontWeight: 600,
              color: '#222428',
              lineHeight: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Running Flow
          </div>
          <div
            style={{
              fontFamily: "'Noto Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 400,
              color: '#656b81',
              lineHeight: 1,
              marginTop: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Step {displayStep} of {totalSteps}
          </div>
        </div>

        {/* Right Icons */}
        <IconButtonWrapper style={{ display: 'flex', alignItems: 'center' }}>
          <IconButton aria-label="Navigate to current step" size="medium" variant="ghost" onClick={onNavigateToStep}>
            <IconMap />
          </IconButton>

          <IconButton aria-label="Close" size="medium" variant="ghost" onClick={onClose}>
            <IconCross />
          </IconButton>
        </IconButtonWrapper>
      </div>

      {/* Progress Bar Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 8px',
        }}
      >
        {/* Progress Bar */}
        <div
          style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: '#e9eaef',
          }}
        >
          {/* Progress Fill */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: `${animatedProgress}%`,
              backgroundColor: status === 'error' 
                ? '#ef4444' 
                : status === 'success'
                  ? '#22c55e'
                  : '#3859ff',
              transition: status === 'success' ? 'width 0.3s ease-out' : 'none',
              borderRadius: '2px',
            }}
          />
        </div>
        
        {/* Step Counter */}
        <div
          style={{
            fontFamily: "'Noto Sans', sans-serif",
            fontSize: '12px',
            fontWeight: 400,
            color: '#656b81',
            whiteSpace: 'nowrap',
          }}
        >
          {currentStep}/{totalSteps}
        </div>
      </div>

      {/* Generating Text with Shimmer Animation */}
      <div
        style={{
          padding: '0 8px',
          height: '18px',
          overflow: 'hidden',
        }}
      >
        <p
          className={status === 'running' ? 'shimmer-text' : ''}
          style={{
            fontFamily: "'Noto Sans', sans-serif",
            fontSize: '12px',
            fontWeight: 400,
            lineHeight: 1.5,
            whiteSpace: 'nowrap',
            margin: 0,
            color: status === 'error' 
              ? '#ef4444' 
              : status === 'success'
                ? '#22c55e'
                : '#656b81',
          }}
        >
          {getGeneratingText()}
        </p>
      </div>

      <style>{`
        .shimmer-text {
          background: linear-gradient(90deg, #b0b5c3 0%, #b0b5c3 40%, #222428 50%, #b0b5c3 60%, #b0b5c3 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 2s linear infinite;
        }
        @keyframes shimmer {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }
      `}</style>
    </div>
  );
}
