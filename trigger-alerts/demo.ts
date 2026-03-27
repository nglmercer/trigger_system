import { AlertBuilder } from './src/builder/AlertBuilder';
import { TriggerAlert } from './src/components/TriggerAlert';
declare global {
  interface Window {
    showTextAlert: () => void;
    showVideoAlert: () => void;
    showAudioAlert: () => void;
  }
}
const textBtn = document.getElementById('textBtn');
const videoBtn = document.getElementById('videoBtn');
const audioBtn = document.getElementById('audioBtn');
function Eventlistener() {
    textBtn?.addEventListener('click', showTextAlert);
    videoBtn?.addEventListener('click', showVideoAlert);
    audioBtn?.addEventListener('click', showAudioAlert);
}
Eventlistener();
/*
    <button id="textBtn">Show Text Alert</button>
    <button id="videoBtn">Show Video Alert</button>
    <button id="audioBtn">Show Audio Alert</button>
*/
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
    if (el instanceof TriggerAlert) {
        console.log('Instance of TriggerAlert');
    }
    console.log(el);
    el.config = alert;  
    document.body.appendChild(el);
};

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
};

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
};
window.showTextAlert = showTextAlert;
window.showVideoAlert = showVideoAlert;
window.showAudioAlert = showAudioAlert;
