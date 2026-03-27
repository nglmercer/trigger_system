import { AlertBuilder, AlertExporter, TriggerAlert } from './index';

const alert1 = new AlertBuilder()
  .id('welcome-alert')
  .name('Welcome Message')
  .text('Welcome to Trigger System!', false)
  .style({
    position: 'top',
    background: '#1a1a2e',
    color: '#ffffff',
    borderRadius: 12,
    padding: '20px',
    fontSize: '16px',
    animation: { type: 'slide', direction: 'down', duration: 0.4 }
  })
  .duration(5000)
  .dismissible(true)
  .build();

const alert2 = new AlertBuilder()
  .id('promo-video')
  .name('Promo Video')
  .video('https://example.com/promo.mp4', { autoplay: true, loop: true, muted: true })
  .style({
    position: 'center',
    background: '#000000',
    borderRadius: 16,
    width: 600,
    maxWidth: '90vw',
    animation: { type: 'scale', duration: 0.5 }
  })
  .duration(10000)
  .dismissible(true)
  .build();

const alert3 = new AlertBuilder()
  .id('notification-sound')
  .name('Sound Notification')
  .audio('https://example.com/ding.mp3', { autoplay: true, volume: 0.8 })
  .text('You have a new message!')
  .style({
    position: 'bottom',
    background: '#4a5568',
    color: '#fff',
    borderRadius: 8,
    padding: '16px',
    animation: { type: 'fade', duration: 0.3 }
  })
  .duration(3000)
  .build();

console.log('=== JSON Export ===');
console.log(AlertExporter.toJson(alert1));
console.log('\n=== YAML Export ===');
console.log(AlertExporter.toYaml([alert1, alert2, alert3]));

document.body.innerHTML = '<trigger-alert></trigger-alert>';
const el = document.querySelector('trigger-alert') as any;
if (el) el.config = alert1;