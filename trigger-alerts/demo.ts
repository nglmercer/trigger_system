import { AlertBuilder } from './src/builder/AlertBuilder';
import { TriggerAlert } from './src/components/TriggerAlert';
declare global {
  interface Window {
  showTextAlert: () => void;
  showVideoAlert: () => void;
  showAudioAlert: () => void;
  showComplexText: () => void;
  showMultiPosition: () => void;
  showStaggerAnimation: () => void;
  showSpringBounce: () => void;
  showComplexStyle: () => void;
  showCallbackDemo: () => void;
  showMarkdown: () => void;
}
}
const textBtn = document.getElementById('textBtn');
const videoBtn = document.getElementById('videoBtn');
const audioBtn = document.getElementById('audioBtn');
const complexTextBtn = document.getElementById('complexTextBtn');
const multiPosBtn = document.getElementById('multiPosBtn');
const staggerBtn = document.getElementById('staggerBtn');
const springBtn = document.getElementById('springBtn');
const styleBtn = document.getElementById('styleBtn');
const callbackBtn = document.getElementById('callbackBtn');
const mdBtn = document.getElementById('mdBtn');

function addListeners() {
  textBtn?.addEventListener('click', showTextAlert);
  videoBtn?.addEventListener('click', showVideoAlert);
  audioBtn?.addEventListener('click', showAudioAlert);
  complexTextBtn?.addEventListener('click', showComplexText);
  multiPosBtn?.addEventListener('click', showMultiPosition);
  staggerBtn?.addEventListener('click', showStaggerAnimation);
  springBtn?.addEventListener('click', showSpringBounce);
  styleBtn?.addEventListener('click', showComplexStyle);
  callbackBtn?.addEventListener('click', showCallbackDemo);
  mdBtn?.addEventListener('click', showMarkdown);
  console.log('Listeners added',{
    textBtn,
    videoBtn,
    audioBtn,
    complexTextBtn,
    multiPosBtn,
    staggerBtn,
    springBtn,
    styleBtn,
    callbackBtn,
    mdBtn
  },TriggerAlert);
}
addListeners();

function showTextAlert() {
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

  const el = document.createElement('trigger-alert') as TriggerAlert;
  el.config = alert;
  document.body.appendChild(el);
}

function showVideoAlert() {
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

  const el = document.createElement('trigger-alert') as TriggerAlert;
  el.config = alert;
  document.body.appendChild(el);
}

function showAudioAlert() {
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

  const el = document.createElement('trigger-alert') as TriggerAlert;
  el.config = alert;
  document.body.appendChild(el);
}

function showComplexText() {
  const alert = new AlertBuilder()
    .id('complex-text-' + Date.now())
    .text('🎉 Welcome to Trigger System! This alert showcases advanced text animations with custom styling.', false)
    .style({
      position: 'top-right',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#ffffff',
      borderRadius: 16,
      padding: '24px',
      width: 380,
      boxShadow: '0 10px 40px rgba(102, 126, 234, 0.5)',
      border: '1px solid rgba(255,255,255,0.2)',
      fontSize: '15px',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      textAlign: 'left',
      animation: { type: 'slide', direction: 'right', duration: 0.5, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' }
    })
    .duration(6000)
    .dismissible(true)
    .build();

  const el = document.createElement('trigger-alert') as TriggerAlert;
  el.config = alert;
  document.body.appendChild(el);
}

function showMultiPosition() {
  const positions = [
    { pos: 'top-left', bg: '#ef4444', x: 20, y: 20 },
    { pos: 'top-right', bg: '#f59e0b', x: -20, y: 20 },
    { pos: 'bottom-left', bg: '#10b981', x: 20, y: -20 },
    { pos: 'bottom-right', bg: '#3b82f6', x: -20, y: -20 }
  ] as const;

  positions.forEach((p, i) => {
    const alert = new AlertBuilder()
      .id(`pos-${i}-${Date.now()}`)
      .text(`Position: ${p.pos.toUpperCase()}`, false)
      .style({
        position: p.pos as any,
        background: p.bg,
        color: '#ffffff',
        borderRadius: 12,
        padding: '16px 24px',
        animation: { type: 'slide', direction: p.pos.includes('top') ? 'down' : 'up', duration: 0.4 }
      })
      .duration(4000)
      .dismissible(true)
      .build();

    const el = document.createElement('trigger-alert') as TriggerAlert;
    el.config = alert;
    document.body.appendChild(el);
  });
}

function showStaggerAnimation() {
  const alert = new AlertBuilder()
    .id('stagger-' + Date.now())
    .text('Step 1: Initialize...', false)
    .style({
      position: 'center',
      background: '#1e293b',
      color: '#e2e8f0',
      borderRadius: 20,
      padding: '32px 48px',
      width: 450,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      fontSize: '18px',
      fontWeight: 600,
      textAlign: 'center',
      animation: { type: 'scale', duration: 0.6, easing: 'spring(1, 80, 10, 0)' }
    })
    .duration(3000)
    .dismissible(true)
    .onComplete(() => {
      setTimeout(() => {
        const alert2 = new AlertBuilder()
          .id('stagger-2-' + Date.now())
          .text('Step 2: Processing data...', false)
          .style({
            position: 'center',
            background: '#0f172a',
            color: '#60a5fa',
            borderRadius: 20,
            padding: '32px 48px',
            width: 450,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            fontSize: '18px',
            fontWeight: 600,
            textAlign: 'center',
            animation: { type: 'scale', duration: 0.5, easing: 'spring(1, 80, 10, 0)' }
          })
          .duration(3000)
          .dismissible(true)
          .build();

        const el2 = document.createElement('trigger-alert') as TriggerAlert;
        el2.config = alert2;
        document.body.appendChild(el2);
      }, 500);
    })
    .build();

  const el = document.createElement('trigger-alert') as TriggerAlert;
  el.config = alert;
  document.body.appendChild(el);
}

function showSpringBounce() {
  const alert = new AlertBuilder()
    .id('spring-' + Date.now())
    .text('🎯 BOUNCE!', false)
    .style({
      position: 'center',
      background: 'linear-gradient(180deg, #f472b6 0%, #db2777 100%)',
      color: '#ffffff',
      borderRadius: '50%',
      padding: '40px 60px',
      width: 200,
      boxShadow: '0 20px 60px rgba(219, 39, 119, 0.6)',
      fontSize: '24px',
      fontWeight: 800,
      textAlign: 'center',
      animation: { type: 'bounce', duration: 0.8 }
    })
    .duration(4000)
    .dismissible(true)
    .build();

  const el = document.createElement('trigger-alert') as TriggerAlert;
  el.config = alert;
  document.body.appendChild(el);
}

function showComplexStyle() {
  const alert = new AlertBuilder()
    .id('complex-style-' + Date.now())
    .text('✨ Premium Alert\n\nThis is a fully styled alert with:\n• Custom fonts\n• Gradient background\n• Glow effects\n• Custom border', false)
    .style({
      position: 'bottom',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 50%, #1b263b 100%)',
      color: '#e0e7ff',
      borderRadius: 24,
      padding: '28px 36px',
      width: 420,
      maxWidth: '90vw',
      boxShadow: '0 0 60px rgba(99, 102, 241, 0.4), 0 20px 40px rgba(0, 0, 0, 0.3)',
      border: '2px solid rgba(99, 102, 241, 0.5)',
      fontSize: '14px',
      fontFamily: '"Inter", "Segoe UI", sans-serif',
      fontWeight: 500,
      lineHeight: 1.6,
      textAlign: 'left',
      zIndex: 9999,
      animation: { type: 'slide', direction: 'up', duration: 0.5, easing: 'ease-out' }
    })
    .duration(8000)
    .dismissible(true)
    .build();

  const el = document.createElement('trigger-alert') as TriggerAlert;
  el.config = alert;
  document.body.appendChild(el);
}

function showCallbackDemo() {
  let dismissCount = 0;
  let completeCount = 0;

  const alert = new AlertBuilder()
    .id('callback-' + Date.now())
    .text('👋 Check console for callbacks!\n\nClick dismiss to see onDismiss.\nAuto-dismiss triggers onComplete.', false)
    .style({
      position: 'center',
      background: '#1e1e2e',
      color: '#cdd6f4',
      borderRadius: 16,
      padding: '24px 32px',
      width: 400,
      boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
      fontSize: '14px',
      textAlign: 'left',
      animation: { type: 'scale', duration: 0.4 }
    })
    .duration(10000)
    .dismissible(true)
    .onDismiss(() => {
      dismissCount++;
      console.log(`[Alert] onDismiss called! Count: ${dismissCount}`);
    })
    .onComplete(() => {
      completeCount++;
      console.log(`[Alert] onComplete called! Count: ${completeCount}`);
    })
    .build();

  const el = document.createElement('trigger-alert') as TriggerAlert;
  el.config = alert;
  document.body.appendChild(el);
}

function showMarkdown() {
  const alert = new AlertBuilder()
    .id('markdown-' + Date.now())
    .text('**Bold Text** and *italic* and `code`\n\n- Item 1\n- Item 2\n\n> Blockquote\n\n[Link](https://example.com)', true)
    .style({
      position: 'top',
      background: '#fef3c7',
      color: '#92400e',
      borderRadius: 12,
      padding: '20px 28px',
      width: 380,
      boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)',
      fontSize: '14px',
      fontFamily: 'monospace',
      textAlign: 'left',
      animation: { type: 'slide', direction: 'down', duration: 0.4 }
    })
    .duration(7000)
    .dismissible(true)
    .build();

  const el = document.createElement('trigger-alert') as TriggerAlert;
  el.config = alert;
  document.body.appendChild(el);
}

window.showTextAlert = showTextAlert;
window.showVideoAlert = showVideoAlert;
window.showAudioAlert = showAudioAlert;
window.showComplexText = showComplexText;
window.showMultiPosition = showMultiPosition;
window.showStaggerAnimation = showStaggerAnimation;
window.showSpringBounce = showSpringBounce;
window.showComplexStyle = showComplexStyle;
window.showCallbackDemo = showCallbackDemo;
window.showMarkdown = showMarkdown;