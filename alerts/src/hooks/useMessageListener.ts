import { useEffect, useCallback } from 'react';
import type { AlertConfig, CanvasElement } from '../types';

interface UseMessageListenerProps {
  setIsPlaying: (playing: boolean) => void;
  setPlaybackTime: (time: number) => void;
  setAlertConfig: React.Dispatch<React.SetStateAction<AlertConfig>>;
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  audioRefs: React.MutableRefObject<Map<string, HTMLAudioElement>>;
  videoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  alertConfig: AlertConfig;
  elements: CanvasElement[];
}

export function useMessageListener({
  setIsPlaying,
  setPlaybackTime,
  setAlertConfig,
  setElements,
  audioRefs,
  videoRefs,
  alertConfig,
  elements,
}: UseMessageListenerProps) {
  const handleMessage = useCallback((event: MessageEvent) => {
    const { type, payload } = event.data;
    
    if (type === 'PLAY_ALERT') {
      setIsPlaying(true);
      setPlaybackTime(0);
      setAlertConfig(prev => payload.config || prev);
      setElements(prev => payload.elements || prev);
      
      const els = payload.elements || elements;
      els.forEach((el: CanvasElement) => {
        if (el.type === 'audio' && el.mediaUrl) {
          const audio = audioRefs.current.get(el.id);
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(console.error);
          }
        }
        if (el.type === 'video' && el.mediaUrl) {
          const video = videoRefs.current.get(el.id);
          if (video) {
            video.currentTime = 0;
            video.play().catch(console.error);
          }
        }
      });
    }
    
    if (type === 'STOP_ALERT') {
      setIsPlaying(false);
      setPlaybackTime(0);
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      videoRefs.current.forEach(video => {
        video.pause();
        video.currentTime = 0;
      });
    }
  }, [setIsPlaying, setPlaybackTime, setAlertConfig, setElements, audioRefs, videoRefs, elements]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);
}