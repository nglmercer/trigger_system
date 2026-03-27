import { motion } from 'framer-motion';
import { Icon } from '../components';
import type { CanvasElement } from '../types';

interface PlaybackControlsProps {
  isPlaying: boolean;
  playbackTime: number;
  duration: number;
  elements: CanvasElement[];
  onTogglePlay: () => void;
}

export function PlaybackControls({
  isPlaying,
  playbackTime,
  duration,
  elements,
  onTogglePlay,
}: PlaybackControlsProps) {
  const visibleCount = elements.filter(e => e.type !== 'audio').length;
  const audioCount = elements.filter(e => e.type === 'audio').length;

  return (
    <>
      {isPlaying && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-500/80 px-4 py-2 rounded-full text-white text-sm z-50 flex items-center gap-2">
          <Icon name="play" className="w-4 h-4" />
          Playing... {Math.round(playbackTime / 1000)}s / {Math.round(duration / 1000)}s
        </div>
      )}

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onTogglePlay}
          className={`${isPlaying ? 'bg-red-500 hover:bg-red-400' : 'bg-cyan-500 hover:bg-cyan-400'} text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2`}
        >
          <Icon name={isPlaying ? 'stop' : 'play'} className="w-4 h-4" />
          {isPlaying ? 'Stop' : 'Play'}
        </motion.button>
        
        <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg text-slate-400 text-sm">
          {visibleCount} visible | {audioCount} audio
        </div>
      </div>
    </>
  );
}