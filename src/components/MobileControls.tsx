import { useCallback } from 'react';

interface MobileControlsProps {
  onMove: (deltaX: number, deltaY: number) => void;
}

const MobileControls = ({ onMove }: MobileControlsProps) => {
  // Mobile controls removed - now uses edge panning when painting near borders
  return null;
};

export default MobileControls;