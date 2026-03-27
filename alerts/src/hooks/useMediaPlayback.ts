import { useCallback, useEffect } from 'react';
import type { CanvasElement } from '../types';

interface UseMediaPlaybackProps {
  isPlaying: boolean;
  elements: CanvasElement[];
  audioRefs: React.MutableRefObject<Map<string, HTMLAudioElement>>;
  videoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
}

export function useMediaPlayback({ isPlaying, elements, audioRefs, videoRefs }: UseMediaPlaybackProps) {
  const stopAll = useCallback(() => {
    audioRefs.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    videoRefs.current.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
  }, [audioRefs, videoRefs]);

  useEffect(() => {
    if (!isPlaying) {
      stopAll();
      return;
    }

    elements.forEach(el => {
      if (el.type === 'audio' && el.mediaUrl) {
        let audio = audioRefs.current.get(el.id);
        if (!audio) {
          audio = new Audio(el.mediaUrl);
          audio.volume = el.volume;
          audio.loop = el.loop;
          audioRefs.current.set(el.id, audio);
        }
        audio.currentTime = 0;
        audio.play().catch(err => console.error('Audio play error:', err));
      }
      if (el.type === 'video' && el.mediaUrl) {
        const video = videoRefs.current.get(el.id);
        if (video) {
          video.currentTime = 0;
          video.play().catch(err => console.error('Video play error:', err));
        }
      }
    });
  }, [isPlaying, elements, audioRefs, videoRefs, stopAll]);

  return { stopAll };
}