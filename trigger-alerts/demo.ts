    import { AlertBuilder, AlertExporter, TriggerAlert } from './dist/index.js';

    window.showTextAlert = () => {
      const alert = new AlertBuilder()
        .id('text-' + Date.now())
        .text('This is a text alert with animation!', false)
        .style({
          position: 'top',
          background: '#1a1a2e',
          color: '#ffffff',
          borderRadius: 12,
          padding: '20px',
          animation: { type: 'slide', direction: 'down', duration: 0.4 }
        })
        .duration(5000)
        .dismissible(true)
        .build();

      const el = document.createElement('trigger-alert');
      el.config = alert;
      document.body.appendChild(el);
    };

    window.showVideoAlert = () => {
      const alert = new AlertBuilder()
        .id('video-' + Date.now())
        .video('https://www.w3schools.com/html/mov_bbb.mp4', { autoplay: true, loop: true, muted: true })
        .style({
          position: 'center',
          background: '#000000',
          borderRadius: 16,
          width: 500,
          animation: { type: 'scale', duration: 0.5 }
        })
        .duration(10000)
        .build();

      const el = document.createElement('trigger-alert');
      el.config = alert;
      document.body.appendChild(el);
    };

    window.showAudioAlert = () => {
      const alert = new AlertBuilder()
        .id('audio-' + Date.now())
        .text('🔔 Audio alert playing!')
        .audio('https://www.w3schools.com/html/horse.mp3', { autoplay: true, volume: 0.5 })
        .style({
          position: 'bottom',
          background: '#4a5568',
          color: '#fff',
          borderRadius: 8,
          animation: { type: 'fade', duration: 0.3 }
        })
        .duration(3000)
        .build();

      const el = document.createElement('trigger-alert');
      el.config = alert;
      document.body.appendChild(el);
    };
  