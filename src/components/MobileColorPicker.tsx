import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface MobileColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const MobileColorPicker = ({ color, onColorChange, isOpen, onClose }: MobileColorPickerProps) => {
  const [selectedColor, setSelectedColor] = useState(color);

  const colors = [
    '#ff0080', '#00ff80', '#8000ff', '#ff8000', '#0080ff',
    '#ff0040', '#40ff00', '#0040ff', '#ff4080', '#80ff40',
    '#4080ff', '#ff8040', '#80ff80', '#8080ff', '#ff4040',
    '#40ff40', '#4040ff', '#ffff00', '#ff00ff', '#00ffff',
    '#ff6666', '#66ff66', '#6666ff', '#ffff66', '#ff66ff',
    '#66ffff', '#ff3333', '#33ff33', '#3333ff', '#000000'
  ];

  const handleColorSelect = useCallback((newColor: string) => {
    setSelectedColor(newColor);
    onColorChange(newColor);
  }, [onColorChange]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-6 m-4 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Choose Color</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Current color preview */}
        <div
          className="w-full h-12 rounded border border-border mb-4"
          style={{ backgroundColor: selectedColor }}
        />

        {/* Color palette */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          {colors.map((colorOption) => (
            <button
              key={colorOption}
              className={`w-12 h-12 rounded-lg border-2 hover:scale-110 transition-transform ${
                selectedColor === colorOption ? 'border-primary' : 'border-border'
              }`}
              style={{ backgroundColor: colorOption }}
              onClick={() => handleColorSelect(colorOption)}
            />
          ))}
        </div>

        <Button onClick={onClose} className="w-full">
          Done
        </Button>
      </div>
    </div>
  );
};

export default MobileColorPicker;