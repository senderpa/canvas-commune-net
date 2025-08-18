import { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
}

const ColorPicker = ({ color, onColorChange }: ColorPickerProps) => {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [value, setValue] = useState(50);
  const [hexInput, setHexInput] = useState(color);
  
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const valueRef = useRef<HTMLCanvasElement>(null);

  // Convert hex to HSV
  const hexToHsv = useCallback((hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    if (diff !== 0) {
      if (max === r) h = ((g - b) / diff) % 6;
      else if (max === g) h = (b - r) / diff + 2;
      else h = (r - g) / diff + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    
    const s = max === 0 ? 0 : Math.round((diff / max) * 100);
    const v = Math.round(max * 100);
    
    return { h, s, v };
  }, []);

  // Convert HSV to hex
  const hsvToHex = useCallback((h: number, s: number, v: number) => {
    const hh = h / 60;
    const ss = s / 100;
    const vv = v / 100;
    
    const c = vv * ss;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    const m = vv - c;
    
    let r = 0, g = 0, b = 0;
    
    if (hh >= 0 && hh < 1) { r = c; g = x; b = 0; }
    else if (hh >= 1 && hh < 2) { r = x; g = c; b = 0; }
    else if (hh >= 2 && hh < 3) { r = 0; g = c; b = x; }
    else if (hh >= 3 && hh < 4) { r = 0; g = x; b = c; }
    else if (hh >= 4 && hh < 5) { r = x; g = 0; b = c; }
    else if (hh >= 5 && hh < 6) { r = c; g = 0; b = x; }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }, []);

  // Draw color wheel
  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const size = 120;
    const center = size / 2;
    const radius = center - 2;
    
    canvas.width = size;
    canvas.height = size;
    
    // Draw hue wheel
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = angle * Math.PI / 180;
      
      ctx.beginPath();
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.lineWidth = 20;
      ctx.stroke();
    }
    
    // Draw saturation gradient
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius - 10);
    gradient.addColorStop(0, `hsl(${hue}, 0%, ${value}%)`);
    gradient.addColorStop(1, `hsl(${hue}, 100%, ${value}%)`);
    
    ctx.beginPath();
    ctx.arc(center, center, radius - 10, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [hue, value]);

  // Draw value slider
  useEffect(() => {
    const canvas = valueRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 20;
    canvas.height = 120;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 120);
    gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, 100%)`);
    gradient.addColorStop(1, `hsl(${hue}, ${saturation}%, 0%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 20, 120);
  }, [hue, saturation]);

  // Update color when HSV changes
  useEffect(() => {
    const newColor = hsvToHex(hue, saturation, value);
    setHexInput(newColor);
    onColorChange(newColor);
  }, [hue, saturation, value, hsvToHex, onColorChange]);

  // Update HSV when hex input changes
  const handleHexChange = useCallback((newHex: string) => {
    setHexInput(newHex);
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      const { h, s, v } = hexToHsv(newHex);
      setHue(h);
      setSaturation(s);
      setValue(v);
      onColorChange(newHex);
    }
  }, [hexToHsv, onColorChange]);

  const handleWheelClick = useCallback((e: React.MouseEvent) => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - 60; // center offset
    const y = e.clientY - rect.top - 60;
    
    const distance = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x) * 180 / Math.PI;
    const normalizedAngle = angle < 0 ? angle + 360 : angle;
    
    if (distance > 40 && distance < 58) {
      // Clicked on hue ring
      setHue(normalizedAngle);
    } else if (distance < 40) {
      // Clicked inside for saturation
      const sat = Math.min(100, (distance / 40) * 100);
      setSaturation(sat);
    }
  }, []);

  const handleValueClick = useCallback((e: React.MouseEvent) => {
    const canvas = valueRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const val = Math.max(0, Math.min(100, 100 - (y / 120) * 100));
    setValue(val);
  }, []);

  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 space-y-4 shadow-xl">
      <div className="flex items-start gap-3">
        {/* Color wheel */}
        <canvas
          ref={wheelRef}
          className="cursor-pointer rounded-lg"
          onClick={handleWheelClick}
        />
        
        {/* Value slider */}
        <canvas
          ref={valueRef}
          className="cursor-pointer rounded-sm border border-border"
          onClick={handleValueClick}
        />
      </div>
      
      {/* Color preview */}
      <div
        className="w-full h-8 rounded border border-border"
        style={{ backgroundColor: color }}
      />
      
      {/* Hex input */}
      <Input
        value={hexInput}
        onChange={(e) => handleHexChange(e.target.value)}
        className="text-xs font-mono"
        placeholder="#ff0080"
      />
      
      {/* Quick colors */}
      <div className="grid grid-cols-5 gap-1">
        {['#ff0080', '#00ff80', '#8000ff', '#ff8000', '#0080ff'].map((quickColor) => (
          <button
            key={quickColor}
            className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
            style={{ backgroundColor: quickColor }}
            onClick={() => handleHexChange(quickColor)}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPicker;