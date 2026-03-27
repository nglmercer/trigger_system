import { useState, useCallback, useRef, useEffect } from 'react';
import type { CanvasElement, AlertConfig, MediaType } from '../types';
import { DEFAULT_ALERT_CONFIG, MEDIA_LABELS } from '../constants';

function generateId(prefix: string = 'el'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

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
  setPlaybackTime: React.Dispatch<React.SetStateAction<number>>;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  addElement: (type: MediaType) => void;
  deleteElement: (id: string) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  audioRefs: React.MutableRefObject<Map<string, HTMLAudioElement>>;
  videoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
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

  const stopPlayback = useCallback(() => {
    audioRefs.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    videoRefs.current.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
  }, []);

  const playElement = useCallback((element: CanvasElement) => {
    if (element.type === 'audio' && element.mediaUrl) {
      let audio = audioRefs.current.get(element.id);
      if (!audio) {
        audio = new Audio(element.mediaUrl);
        audio.volume = element.volume;
        audio.loop = element.loop;
        audioRefs.current.set(element.id, audio);
      }
      audio.currentTime = 0;
      audio.play().catch(err => console.error('Audio play error:', err));
    }
    
    if (element.type === 'video' && element.mediaUrl) {
      const videoEl = document.querySelector(`video[data-element-id="${element.id}"]`) as HTMLVideoElement | null;
      if (videoEl) {
        videoRefs.current.set(element.id, videoEl);
        videoEl.currentTime = 0;
        videoEl.muted = false;
        videoEl.play().catch(err => console.error('Video play error:', err));
      }
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      setPlaybackTime(0);
      
      elements.forEach(el => {
        const delay = el.animationDelay;
        if (delay > 0) {
          setTimeout(() => {
            if (isPlaying) playElement(el);
          }, delay);
        } else {
          playElement(el);
        }
      });

      playbackRef.current = window.setInterval(() => {
        setPlaybackTime(prev => {
          if (prev >= alertConfig.duration) {
            stopPlayback();
            setIsPlaying(false);
            return 0;
          }
          return prev + 100;
        });
      }, 100);
    } else {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
        playbackRef.current = null;
      }
      stopPlayback();
    }

    return () => {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
      }
      stopPlayback();
    };
  }, [isPlaying, alertConfig.duration, elements, stopPlayback, playElement]);

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
    setPlaybackTime,
    updateElement,
    addElement,
    deleteElement,
    moveLayer,
    audioRefs,
    videoRefs,
    canvasRef,
    sortedElements,
    maxZIndex,
  };
}
