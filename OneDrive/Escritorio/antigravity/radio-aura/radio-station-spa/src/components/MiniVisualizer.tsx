import React, { useState, useEffect } from 'react';
import { audioEngine } from '../lib/AudioEngine';

interface MiniVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  gap?: string;
  barWidth?: string;
  className?: string;
  maxHeight?: string;
  minHeight?: string;
  isZenMode?: boolean;
}

export default function MiniVisualizer({ 
  isPlaying, 
  barCount = 3,
  gap = "gap-0.5",
  barWidth = "w-1",
  className = "",
  maxHeight = "100%",
  minHeight = "20%",
  isZenMode = false
}: MiniVisualizerProps) {
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);

  useEffect(() => {
    if (isZenMode) {
      setFrequencyData(null);
      return;
    }

    let animationId: number;
    const update = () => {
      if (isPlaying && !isZenMode) {
        setFrequencyData(audioEngine.getFrequencyData());
        animationId = requestAnimationFrame(update);
      } else {
        setFrequencyData(null);
      }
    };
    if (isPlaying && !isZenMode) {
      animationId = requestAnimationFrame(update);
    } else {
      setFrequencyData(null);
    }
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, isZenMode]);

  // Pick some indices from frequencyData based on barCount
  const vals = Array.from({ length: barCount }).map((_, i) => {
    if (!frequencyData) return 0;
    const index = 2 + (i * Math.floor(20 / barCount));
    return Number(frequencyData[index]) || 0;
  });

  return (
    <div className={`flex ${gap} items-end ${className}`}>
      {vals.map((val, i) => (
        <div
          key={i}
          style={{ height: isPlaying ? `${Math.max(parseInt(minHeight), (val / 255) * parseInt(maxHeight))}%` : minHeight }}
          className={`${barWidth} bg-accent rounded-full transition-all duration-75`}
        />
      ))}
    </div>
  );
}
