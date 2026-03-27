import { AlertBuilder, AlertBehaviorRegistry, AlertExporter } from './src';
import { TriggerAlert, registerOrReplace } from './src/components/TriggerAlert';
registerOrReplace('trigger-alert', TriggerAlert);

// 1. Register behaviors that can be "re-hydrated" from JSON
AlertBehaviorRegistry.register('split-bounce', (el) => {
  const textChild = el.querySelector('.text') as HTMLElement;
  if (!textChild) return;
  const { chars } = AlertBuilder.splitText(textChild, { chars: true });
  AlertBuilder.animate(chars, {
    y: [-50, 0],
    rotate: [180, 0],
    opacity: [0, 1],
    delay: AlertBuilder.stagger(40, { from: 'center' }),
    easing: 'easeOutElastic(1, .6)'
  });
});

AlertBehaviorRegistry.register('score-updater', (el, data) => {
  const scoreObj = { val: 0 };
  const target = data?.target || 1000;
  AlertBuilder.animate(scoreObj, {
    val: target,
    round: 1,
    duration: 2000,
    update: () => {
      el.textContent = `+${scoreObj.val} XP`;
    }
  });
});
interface DemoConfig {
  id: string;
  title: string;
  description: string;
  category: string;
  handler: () => void;
}

const demos: DemoConfig[] = [
  {
    id: 'basic-text',
    title: 'Modern Text Alert',
    description: 'Slide-down dark themed alert with text animation.',
    category: 'Basic',
    handler: async () => {
      const alert = new AlertBuilder()
        .id('text-' + Date.now())
        .text('🚀 Welcome to the new Anime.js powered Alerts!', {
          onRender: (textEl) => {
            const { chars } = AlertBuilder.splitText(textEl, { words: false, chars: true });
            
            AlertBuilder.animate(chars, {
              y: [
                { to: '-1.5rem', ease: 'outExpo', duration: 600 },
                { to: 0, ease: 'outBounce', duration: 800, delay: 100 }
              ],
              rotate: {
                from: '-0.5turn',
                delay: 0
              },
              opacity: {
                from: 0,
                to: 1,
                duration: 600
              },
              delay: AlertBuilder.stagger(40),
              ease: 'inOutCirc'
            });
          }
        })
        .style({
          position: 'top',
          background: 'rgba(15, 23, 42, 0.9)',
          color: '#e2e8f0',
          borderRadius: '16px',
          padding: '24px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          animation: { type: 'slide', direction: 'down', duration: 0.6 }
        })
        .duration(8000)
        .dismissible(true)
        .build();

      const el = document.createElement('trigger-alert') as TriggerAlert;
      el.config = alert;
      document.body.appendChild(el);
    }
  },
  {
    id: 'glass-video',
    title: 'Glass Video Portal',
    description: 'Video alert with backdrop blur and scale-in animation.',
    category: 'Media',
    handler: () => {
      const alert = new AlertBuilder()
        .id('video-' + Date.now())
        .video('https://www.w3schools.com/html/mov_bbb.mp4', { autoplay: true, loop: true, muted: true })
        .style({
          position: 'center',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: 24,
          padding: 8,
          width: 500,
          boxShadow: '0 0 100px rgba(99, 102, 241, 0.4)',
          animation: { type: 'scale', duration: 0.8, easing: 'easeOutElastic(1, .5)' }
        })
        .duration(10000)
        .build();

      const el = document.createElement('trigger-alert') as TriggerAlert;
      el.config = alert;
      document.body.appendChild(el);
    }
  },
  {
    id: 'task-checklist',
    title: 'Milestone Roadmap',
    description: 'Advanced task completion with progressive strikethrough lines.',
    category: 'Advanced',
    handler: () => {
      const alert = new AlertBuilder()
        .id('tasks-' + Date.now())
        .container([
          { type: 'text' as const, id: 'title', content: '🏗️ Build Pipeline', style: { fontWeight: 900, fontSize: '24px', marginBottom: '28px' } },
          ...['Initialize Environment', 'Security Scanning', 'Deploy to Production'].map((task, i) => ({
            type: 'container' as const,
            id: `task-row-${i}`,
            children: [
              { 
                type: 'checkbox' as const, 
                id: `check-${i}`, 
                checked: false,
                style: { width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '6px', marginRight: '16px' }
              },
              { 
                type: 'container' as const,
                id: `text-container-${i}`,
                children: [
                   { type: 'text' as const, id: `task-text-${i}`, content: task, style: { fontSize: '16px', opacity: 0.8 } },
                   { type: 'spacer' as const, id: `line-${i}`, size: 2, style: { 
                     position: 'absolute' as const, top: '51%', left: 0, 
                     width: '0%', background: '#6366f1', opacity: 0.6 
                   }}
                ],
                layout: { position: 'relative' as const }
              }
            ],
            layout: { display: 'flex' as const, alignItems: 'center' as const, margin: '16px 0' },
            onRender: (el: HTMLElement) => {
              // Now we use the specific IDs since we added them to the DOM
              const checkWrapper = el.querySelector(`#check-${i} .checkbox-wrapper`) as HTMLElement;
              const line = el.querySelector(`#line-${i}`) as HTMLElement;
              const text = el.querySelector(`#task-text-${i}`) as HTMLElement;
              
              const startDelay = 1200 + (i * 1500);

              setTimeout(() => {
                if (!checkWrapper || !line || !text) return;

                // 1. Mark Checkbox
                checkWrapper.classList.add('checked');

                // 2. Draw Strikethrough Line
                AlertBuilder.animate(line, {
                  width: '100%',
                  duration: 800,
                  delay: 200,
                  ease: 'easeInOutQuad'
                });

                // 3. Fade Text
                AlertBuilder.animate(text, {
                  opacity: 0.4,
                  duration: 800,
                  delay: 200
                });
              }, startDelay);
            }
          }))
        ])
        .style({
          position: 'center',
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#fff',
          borderRadius: 28,
          padding: '40px',
          width: 420,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255,255,255,0.05)',
          animation: { type: 'slide', direction: 'up', duration: 0.6 }
        })
        .duration(10000)
        .build();

      const el = document.createElement('trigger-alert') as TriggerAlert;
      el.config = alert;
      document.body.appendChild(el);
    }
  },
  {
    id: 'combo-points',
    title: 'Achievement Combo',
    description: 'Dynamic score tracker with gift milestones and number animations.',
    category: 'Advanced',
    handler: () => {
      const alert = new AlertBuilder()
        .id('combo-' + Date.now())
        .container([
          { 
            type: 'image', 
            id: 'pfp', 
            src: 'https://i.pravatar.cc/150?u=combo',
            style: { width: '80px', height: '80px', borderRadius: '50%', border: '4px solid #6366f1', overflow: 'hidden' }
          },
          { 
            type: 'container', 
            id: 'score-container',
            children: [
              { 
                type: 'text', 
                id: 'score-val', 
                content: '0', 
                style: { fontSize: '48px', fontWeight: 900, color: '#f59e0b', margin: '0 0 0 20px' },
                onRender: (el) => {
                  const score = { val: 0 };
                  AlertBuilder.animate(score, {
                    val: 1250,
                    duration: 3000,
                    ease: 'outExpo',
                    onUpdate: () => {
                      el.textContent = Math.floor(score.val).toString();
                    }
                  });
                }
              },
              {
                type: 'text',
                id: 'score-label',
                content: 'COMBO XP',
                style: { fontSize: '12px', fontWeight: 700, opacity: 0.6, margin: '8px 0 0 24px' }
              }
            ],
            layout: { display: 'flex', flexDirection: 'column', justifyContent: 'center' }
          },
          {
            type: 'image',
            id: 'gift',
            src: 'https://cdn-icons-png.flaticon.com/512/4213/4213554.png',
            style: { width: '60px', height: '60px', opacity: 0, marginLeft: '20px' },
            onRender: (el) => {
              AlertBuilder.animate(el, {
                opacity: [0, 1],
                scale: [0, 1.5, 1],
                delay: 1500,
                duration: 1000,
                ease: 'outElastic(1, .5)'
              });
            }
          }
        ], {
           layout: { display: 'flex', alignItems: 'center' }
        })
        .style({
          position: 'center',
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#fff',
          borderRadius: 32,
          padding: '24px 40px',
          boxShadow: '0 0 60px rgba(245, 158, 11, 0.3)',
          border: '2px solid rgba(245, 158, 11, 0.2)',
          animation: { type: 'slide', direction: 'up', duration: 0.8 }
        })
        .duration(7000)
        .build();

      const el = document.createElement('trigger-alert') as TriggerAlert;
      el.config = alert;
      document.body.appendChild(el);
    }
  },
  {
    id: 'sequential-avatar',
    title: 'Evolutionary Profile',
    description: 'Avatar with a secondary badge appearing in sequence.',
    category: 'Advanced',
    handler: () => {
      const alert = new AlertBuilder()
        .id('avatar-' + Date.now())
        .container([
          { 
            type: 'image', 
            id: 'avatar', 
            src: 'https://i.pravatar.cc/150?u=antigravity',
            style: { width: '100px', height: '100px', borderRadius: '50%', border: '4px solid #fff', opacity: 0, overflow: 'hidden' },
            onRender: (el) => {
              AlertBuilder.animate(el, {
                scale: [0, 1.2, 1],
                opacity: [0, 1],
                duration: 1200,
                ease: 'outBack(1.7)'
              });
            }
          },
          { 
            type: 'image', 
            id: 'badge', 
            src: 'https://cdn-icons-png.flaticon.com/512/10629/10629607.png',
            style: { 
              width: '40px', height: '40px', position: 'absolute', 
              bottom: '0', right: '0', background: '#3b82f6', 
              borderRadius: '50%', padding: '5px', opacity: 0 
            },
            onRender: (el) => {
              AlertBuilder.animate(el, {
                scale: [0, 1.5, 1],
                opacity: [0, 1],
                rotate: '1turn',
                delay: 1000,
                duration: 800,
                ease: 'outElastic(1, .5)'
              });
            }
          }
        ], {
           layout: { position: 'relative', display: 'flex' },
           style: { overflow: 'visible' }
        })
        .style({
          position: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          animation: { type: 'fade', duration: 0.5 }
        })
        .duration(6000)
        .build();

      const el = document.createElement('trigger-alert') as TriggerAlert;
      el.config = alert;
      document.body.appendChild(el);
    }
  },
  {
     id: 'premium-md',
     title: 'Glass Markdown',
     description: 'Formatted markdown content in a premium glass container.',
     category: 'Basic',
     handler: () => {
       const alert = new AlertBuilder()
         .id('md-' + Date.now())
         .text('# Premium Core\n\n*   **Performance**: 100ms response\n*   **Architecture**: Modular Atoms\n*   **Graphics**: Anime.js v4\n\n> "The future of UI is motion."', { markdown: true })
         .style({
           position: 'top-right',
           background: 'rgba(30, 41, 59, 0.7)',
           backdropFilter: 'blur(10px)',
           color: '#f1f5f9',
           borderRadius: 24,
           padding: '28px',
           width: 360,
           border: '1px solid rgba(255,255,255,0.1)',
           animation: { type: 'slide', direction: 'right', duration: 0.6 }
         })
         .duration(8000)
         .dismissible(true)
         .build();

       const el = document.createElement('trigger-alert') as TriggerAlert;
       el.config = alert;
       document.body.appendChild(el);
     }
  },
  {
    id: 'json-export',
    title: 'JSON Serialization',
    description: 'Export an alert with behaviors to JSON and re-import it.',
    category: 'Advanced',
    handler: () => {
      // 1. Build an alert using behaviors (NOT functions)
      const alert = new AlertBuilder()
        .id('json-demo')
        .text('Serialized Logic!', { behavior: 'split-bounce', style: { fontSize: 32, fontWeight: 800 } })
        .text('0 XP', { behavior: 'score-updater', behaviorData: { target: 2500 }, style: { color: '#fbbf24', fontSize: 24 } })
        .style({
          position: 'center',
          background: 'rgba(15, 23, 42, 0.95)',
          padding: 40,
          borderRadius: 24,
          animation: { type: 'scale', duration: 0.5 }
        })
        .build();

      // 2. Export to JSON (callbacks are lost, behaviors are kept!)
      const json = AlertExporter.toJson(alert);
      console.log('Exported JSON:', json);

      // 3. Re-import and trigger
      const importedConfig = JSON.parse(json);
      const el = document.createElement('trigger-alert') as TriggerAlert;
      el.config = importedConfig;
      document.body.appendChild(el);
    }
  }
];

let activeDemoId = demos[0].id;

function init() {
  const listEl = document.getElementById('demoList');
  const titleEl = document.getElementById('activeTitle');
  const descEl = document.getElementById('activeDesc');
  const triggerBtn = document.getElementById('triggerBtn');

  //if (!listEl || !titleEl || !descEl || !triggerBtn) return;

  // Clear list first to prevent duplicates
  if (listEl) listEl.innerHTML = '';

  function selectDemo(demo: DemoConfig) {
    activeDemoId = demo.id;
    if (titleEl) titleEl.textContent = demo.title;
    if (descEl) descEl.textContent = demo.description;
    
    // Update active class
    document.querySelectorAll('.demo-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-id') === demo.id);
    });
  }

  demos.forEach(demo => {
    const item = document.createElement('div');
    item.className = `demo-item ${demo.id === activeDemoId ? 'active' : ''}`;
    item.setAttribute('data-id', demo.id);
    item.innerHTML = `
      <h3>${demo.title}</h3>
      <p>${demo.description}</p>
    `;
    item.addEventListener('click', () => selectDemo(demo));
    if (listEl) listEl.appendChild(item);
  });
  if (triggerBtn) {
    triggerBtn.addEventListener('click', () => {
      const demo = demos.find(d => d.id === activeDemoId);
      if (demo) demo.handler();
    });
  }

  // Initial selection
  selectDemo(demos[3]);
  /*
   */
  const demo = demos.find(d => d.id === activeDemoId);
  if (demo) demo.handler();
}

document.addEventListener('DOMContentLoaded', init);