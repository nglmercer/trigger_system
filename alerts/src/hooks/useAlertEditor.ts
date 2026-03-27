import { useState, useCallback, useRef, useEffect } from 'react';
import type { CanvasElement, AlertConfig, MediaType } from '../types';
import { DEFAULT_ALERT_CONFIG, MEDIA_LABELS } from '../constants';
import { generateId } from '../utils';

interface UseAlertEditorReturn {
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  alertConfig: AlertConfig;
  setAlertConfig: React.Dispatch<React.SetStateAction<AlertConfig>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  playbackTime: number;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  addElement: (type: MediaType) => void;
  deleteElement: (id: string) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  audioRefs: React.MutableRefObject<Map<string, HTMLAudioElement>>;
  videoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  playbackRef: React.MutableRefObject<number | null>;
  canvasRef: React.MutableRefObject<HTMLDivElement | null>;
  sortedElements: CanvasElement[];
  maxZIndex: number;
}

export function useAlertEditor(): UseAlertEditorReturn {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(DEFAULT_ALERT_CONFIG);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const playbackRef = useRef<number | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const selectedElement = elements.find(e => e.id === selectedId);
  const maxZIndex = Math.max(0, ...elements.map(e => e.zIndex));
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const addElement = useCallback((type: MediaType) => {
    const id = generateId();
    const newZ = type === 'audio' ? 0 : maxZIndex + 1;
    const newElement: CanvasElement = {
      id,
      type,
      name: `New ${MEDIA_LABELS[type]}`,
      mediaUrl: '',
      text: type === 'text' ? 'Enter text here' : '',
      volume: 1,
      loop: false,
      x: type === 'audio' ? 0 : 100 + Math.random() * 100,
      y: type === 'audio' ? 0 : 100 + Math.random() * 100,
      width: type === 'text' ? 200 : 150,
      height: type === 'text' ? 80 : 150,
      opacity: 1,
      scale: 1,
      zIndex: newZ,
      animation: 'fade',
      animationDuration: 500,
      animationDelay: 0,
    };
    setElements(prev => [...prev, newElement]);
    setSelectedId(id);
  }, [maxZIndex]);

  const deleteElement = useCallback((id: string) => {
    setElements(prev => prev.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const moveLayer = useCallback((id: string, direction: 'up' | 'down') => {
    setElements(prev => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex(e => e.id === id);
      if (idx === -1) return prev;
      
      const newSorted = [...sorted];
      const swapIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (swapIdx < 0 || swapIdx >= newSorted.length) return prev;
      if (!newSorted[idx] || !newSorted[swapIdx]) return prev;
      const temp = newSorted[idx].zIndex;
      newSorted[idx].zIndex = newSorted[swapIdx].zIndex;
      newSorted[swapIdx].zIndex = temp;
      
      return newSorted;
    });
  }, []);

  useEffect(() => {
    elements.forEach(el => {
      if (el.type === 'audio' && el.mediaUrl) {
        let audio = audioRefs.current.get(el.id);
        if (!audio) {
          audio = new Audio(el.mediaUrl);
          audioRefs.current.set(el.id, audio);
        }
        audio.volume = el.volume;
        audio.loop = el.loop;
      }
    });
  }, [elements]);

  useEffect(() => {
    if (isPlaying) {
      playbackRef.current = window.setInterval(() => {
        setPlaybackTime(prev => {
          if (prev >= alertConfig.duration) {
            setIsPlaying(false);
            audioRefs.current.forEach(audio => {
              audio.pause();
              audio.currentTime = 0;
            });
            videoRefs.current.forEach(video => {
              video.pause();
              video.currentTime = 0;
            });
            return 0;
          }
          return prev + 100;
        });
      }, 100);
    }
    return () => {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
      }
    };
  }, [isPlaying, alertConfig.duration]);

  return {
    elements,
    setElements,
    selectedId,
    setSelectedId,
    alertConfig,
    setAlertConfig,
    isPlaying,
    setIsPlaying,
    playbackTime,
    updateElement,
    addElement,
    deleteElement,
    moveLayer,
    audioRefs,
    videoRefs,
    playbackRef,
    canvasRef,
    sortedElements,
    maxZIndex,
  };
}