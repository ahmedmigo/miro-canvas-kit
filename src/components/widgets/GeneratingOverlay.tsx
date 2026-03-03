import React from 'react';
import { styled, keyframes } from '../../lib/stitches.config';

const breathe = keyframes({
  '0%': {
    opacity: 0.2,
    backgroundPosition: '0% 0%',
  },
  '50%': {
    opacity: 0.5,
    backgroundPosition: '100% 100%',
  },
  '100%': {
    opacity: 0.2,
    backgroundPosition: '0% 0%',
  },
});

const OverlayContainer = styled('div', {
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  overflow: 'hidden',
  pointerEvents: 'none',
  zIndex: 50,
});

const GradientLayer = styled('div', {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(45deg, rgba(237, 233, 254, 0.3) 0%, rgba(167, 139, 250, 0.4) 25%, rgba(196, 181, 253, 0.5) 50%, rgba(167, 139, 250, 0.4) 75%, rgba(237, 233, 254, 0.3) 100%)',
  backgroundSize: '200% 200%',
  animation: `${breathe} 4s ease-in-out infinite`,
});

interface GeneratingOverlayProps {
  isGenerating: boolean;
}

export function GeneratingOverlay({ isGenerating }: GeneratingOverlayProps) {
  if (!isGenerating) return null;

  return (
    <OverlayContainer>
      <GradientLayer />
    </OverlayContainer>
  );
}
