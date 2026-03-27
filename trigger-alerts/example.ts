import { createAlert, TriggerAlert } from './index.ts';

const alert1 = createAlert('welcome-alert')
  .name('Welcome Message')
  .text('Welcome to Trigger System!')
  .text('This is a **bold** message with *italic* text.', { markdown: true })
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

const alert2 = createAlert('complex-alert')
  .image('https://picsum.photos/400/200', 'Random image')
  .text('Check out this amazing image!', { 
    style: { fontSize: '18px', fontWeight: 'bold' },
    animation: { type: 'fade', delay: 0.2 }
  })
  .button('Learn More', () => console.log('Clicked!'), {
    variant: 'outline',
    style: { 
      background: '#007bff', 
      color: 'white', 
      borderRadius: '6px',
      padding: '10px 20px'
    },
    interaction: {
      hover: {
        scale: 1.05,
        filter: { brightness: 1.1 }
      },
      press: {
        scale: 0.95
      }
    }
  })
  .style({
    position: 'center',
    background: '#ffffff',
    borderRadius: 16,
    width: 400,
    maxWidth: '90vw',
    animation: { type: 'scale', duration: 0.5 }
  })
  .duration(10000)
  .dismissible(true)
  .build();

const alert3 = createAlert('layout-alert')
  .container([
    { type: 'text', id: 't1', content: 'Title', style: { fontSize: '24px', fontWeight: 'bold' } },
    { type: 'spacer', id: 's1', size: 16 },
    { type: 'text', id: 't2', content: 'Description text here' },
    { type: 'spacer', id: 's2', size: 24 },
    { type: 'button', id: 'b1', content: 'OK', variant: 'filled', onClick: () => console.log('OK') }
  ], {
    layout: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px'
    },
    style: { padding: '24px', textAlign: 'center' }
  })
  .style({
    position: 'bottom-right',
    background: '#4a5568',
    color: '#fff',
    borderRadius: 8,
    animation: { type: 'fade', duration: 0.3 }
  })
  .duration(5000)
  .build();

console.log('=== Alert 1 ===');
console.log(JSON.stringify(alert1, null, 2));

console.log('\n=== Alert 2 ===');
console.log(JSON.stringify(alert2, null, 2));

console.log('\n=== Alert 3 ===');
console.log(JSON.stringify(alert3, null, 2));

document.body.innerHTML = '<trigger-alert></trigger-alert>';
const el = document.querySelector('trigger-alert') as TriggerAlert;
if (el) el.config = alert1;