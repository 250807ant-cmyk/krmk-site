// === Rainbow letters — split text into colored spans (cycles 4 brand colors) ===
(function(){
  const els = document.querySelectorAll('.rainbow');
  els.forEach(el => {
    if(el.dataset.rainbowed === '1') return;
    const text = el.textContent;
    const frag = document.createDocumentFragment();
    let i = 0;
    for(const ch of text){
      if(ch.trim() === ''){
        frag.appendChild(document.createTextNode(ch));
      } else {
        const span = document.createElement('span');
        span.className = 'l l-' + ((i % 4) + 1);
        span.textContent = ch;
        frag.appendChild(span);
        i++;
      }
    }
    el.textContent = '';
    el.appendChild(frag);
    el.dataset.rainbowed = '1';
  });
})();

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const id=a.getAttribute('href');
    if(id.length>1){
      const el=document.querySelector(id);
      if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth',block:'start'})}
    }
  });
});

// Reveal on scroll
const io=new IntersectionObserver(entries=>{
  entries.forEach(en=>{
    if(en.isIntersecting){en.target.classList.add('visible');io.unobserve(en.target)}
  });
},{threshold:.12,rootMargin:'0px 0px -60px 0px'});

document.querySelectorAll('.sec-head, .about-grid, .about-image, .pillar, .acc-item, .why-card, .person-card, .fc-card').forEach(el=>{
  el.classList.add('reveal');
  io.observe(el);
});

// Nav scrolled state
const nav=document.querySelector('.nav');
window.addEventListener('scroll',()=>{
  if(window.scrollY>40) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
});

// About: single header travels from top to center while photo expands
(function(){
  const pin   = document.querySelector('.about-pin');
  if(!pin) return;
  const frame = pin.querySelector('.about-frame');
  const img   = pin.querySelector('.about-img');
  const head  = pin.querySelector('.about-head');

  const START  = { padX:13, padTop:42, padBot:6,  r:28, scale:1.12 };
  const END    = { padX:0,  padTop:0,  padBot:0,  r:0,  scale:1.0  };
  const MOBILE = { padX:6,  padTop:28, padBot:5,  r:24 };

  const easeOut   = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
  const lerp      = (a,b,t) => a + (b - a) * t;

  let ticking = false;

  function compute(){
    const rect = pin.getBoundingClientRect();
    const vh   = window.innerHeight;
    const total = pin.offsetHeight - vh;
    if(total <= 0) return;

    const scrolled = -rect.top;
    const raw = Math.max(0, Math.min(1, scrolled / total));

    // photo expansion happens in the first 60% of pin scroll
    const expand = Math.max(0, Math.min(1, raw / 0.6));
    const e = easeOut(expand);

    const isMobile = window.matchMedia('(max-width:900px)').matches;
    const s = isMobile ? MOBILE : START;

    // Photo
    frame.style.setProperty('--pad-x',   lerp(s.padX,   END.padX,   e) + 'vw');
    frame.style.setProperty('--pad-top', lerp(s.padTop, END.padTop, e) + 'vh');
    frame.style.setProperty('--pad-bot', lerp(s.padBot, END.padBot, e) + 'vh');
    frame.style.setProperty('--r',       lerp(s.r,      END.r,      e) + 'px');
    img.style.setProperty('--scale',     lerp(START.scale, END.scale, e).toFixed(4));

    // Header: moves from top to vertical center as the photo expands
    if(head){
      const headH    = head.offsetHeight;
      const startTop = (isMobile ? 0.08 : 0.10) * vh;
      const endTop   = (vh - headH) / 2;
      const moveProg = easeInOut(expand);
      const headTop  = lerp(startTop, endTop, moveProg);
      head.style.setProperty('--head-y', headTop + 'px');

      // Switch to "on-photo" theme when shade gets dark enough
      if(e > 0.45) head.classList.add('on-photo');
      else         head.classList.remove('on-photo');
    }
  }

  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(() => { compute(); ticking = false; });
  }

  window.addEventListener('scroll', onScroll, { passive:true });
  window.addEventListener('resize', onScroll);
  compute();
})();

// === Stack section scroll-wipe (Dime/Icon-style) ===
(function(){
  const section = document.getElementById('apply');
  if(!section) return;

  const wrappers = Array.from(section.querySelectorAll('.stack-wrapper'));
  const items    = wrappers.map(w => w.querySelector('.stack-item'));
  const bgs      = wrappers.map(w => w.querySelector('.stack-bg'));

  const NUM = wrappers.length; // 3
  // Phases: panel 0 stays 0.5 → wipes 1.0 → panel 1 stays + wipes → ...
  // Each panel: 0.5 stay + 1.0 wipe. Last panel doesn't wipe.
  const panelOffsets = [0.5, 1.5, 2.5]; // when each panel STARTS wiping
  const TOTAL_UNITS  = 3.5; // 350vh total height

  function setHeight(){
    section.style.height = `${TOTAL_UNITS * 100}vh`;
  }
  setHeight();
  window.addEventListener('resize', setHeight);

  function update(){
    const vh   = window.innerHeight;
    const rect = section.getBoundingClientRect();
    const phase = Math.max(0, -rect.top / vh);

    items.forEach((item, i) => {
      if(!item) return;
      const start = panelOffsets[i] ?? (i + 1);
      const prog  = phase - start;

      const wrap = wrappers[i];
      const setPE = (val) => {
        item.style.pointerEvents = val;
        if(wrap) wrap.style.pointerEvents = val;
      };

      if(i === items.length - 1){
        item.style.clipPath = 'inset(0 0 0% 0)';
        setPE('auto');
      } else if(prog <= 0){
        item.style.clipPath = 'inset(0 0 0% 0)';
        setPE('auto');
      } else if(prog < 1){
        const clip = prog * 100;
        item.style.clipPath = `inset(0 0 ${clip}% 0)`;
        setPE(prog > 0.95 ? 'none' : 'auto');
      } else {
        item.style.clipPath = 'inset(0 0 100% 0)';
        setPE('none');
      }

      // subtle parallax on bg
      const bg = bgs[i];
      if(bg){
        const p = Math.max(0, Math.min(1, prog));
        if(i === 0)        bg.style.transform = `scale(${1.05 + p * 0.08})`;
        else if(i === NUM-1) bg.style.transform = `scale(${1.0 + p * 0.05})`;
        else               bg.style.transform = `scale(${1.1 + p * 0.06})`;
      }
    });
  }

  window.addEventListener('scroll', update, { passive:true });
  update();
})();

// === Quiz background video — play once when section enters viewport ===
(function(){
  const section = document.getElementById('quiz');
  if(!section) return;
  const video = section.querySelector('.quiz-bg-video');
  if(!video) return;

  // make sure it starts from the first frame and is not looping
  video.loop = false;
  try { video.currentTime = 0; } catch(_) {}
  try { video.pause(); } catch(_) {}

  let played = false;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting && !played){
        played = true;
        const p = video.play();
        if(p && p.catch) p.catch(() => {});
        io.disconnect();
      }
    });
  }, { threshold: 0.25 });
  io.observe(section);
})();

// === Specs accordion ===
(function(){
  const items = document.querySelectorAll('.acc-item');
  if(!items.length) return;

  function setOpen(item, open){
    const body = item.querySelector('.acc-body');
    const head = item.querySelector('.acc-head');
    const slot = item.querySelector('.acc-video');
    const vid  = item.dataset.video;

    item.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.setAttribute('aria-hidden', open ? 'false' : 'true');

    // inject / remove embedded video
    if(slot){
      if(open && vid && !slot.querySelector('iframe')){
        slot.innerHTML = `<iframe src="https://rutube.ru/play/embed/${vid}/?autoplay=1&mute=1" allow="autoplay; encrypted-media" frameborder="0" allowfullscreen></iframe>`;
      } else if(!open){
        slot.innerHTML = '';
      }
    }

    // also hide the floating hover preview when we open a row
    if(open){
      const hp = document.querySelector('.video-preview');
      if(hp) hp.classList.remove('is-visible');
    }

    if(open){
      body.style.maxHeight = body.scrollHeight + 'px';
    } else {
      body.style.maxHeight = '0px';
    }
  }

  items.forEach(item => {
    const head = item.querySelector('.acc-head');
    head.addEventListener('click', () => {
      const willOpen = !item.classList.contains('is-open');
      // close others (single-open accordion)
      items.forEach(other => { if(other !== item) setOpen(other, false); });
      setOpen(item, willOpen);
    });
  });

  // Re-measure open item on resize (text may rewrap)
  window.addEventListener('resize', () => {
    const open = document.querySelector('.acc-item.is-open');
    if(open){
      const body = open.querySelector('.acc-body');
      body.style.maxHeight = body.scrollHeight + 'px';
    }
  });
})();

// === Pillars v2 — sticky sidebar + IntersectionObserver on cards ===
(function(){
  const section = document.querySelector('.pillars-v2');
  if(!section) return;

  const tabs  = section.querySelectorAll('.pl-tab');
  const cards = section.querySelectorAll('.pl-card');
  if(!tabs.length || !cards.length) return;

  function setActiveTab(id){
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.id === String(id)));
  }

  // Track which card is centered in viewport
  let activeId = '1';
  const io = new IntersectionObserver(entries => {
    // pick the entry with biggest intersection ratio
    let best = null;
    entries.forEach(e => {
      if(!best || e.intersectionRatio > best.intersectionRatio) best = e;
    });
    if(best && best.isIntersecting){
      const id = best.target.dataset.id;
      if(id && id !== activeId){
        activeId = id;
        setActiveTab(id);
      }
    }
  }, {
    rootMargin: '-40% 0px -40% 0px', // 20% center band of viewport
    threshold: [0, 0.25, 0.5, 0.75, 1]
  });
  cards.forEach(c => io.observe(c));

  // Click on tab → smooth scroll to card
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const id = tab.dataset.id;
      const target = section.querySelector(`.pl-card[data-id="${id}"]`);
      if(target){
        const y = target.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top:y, behavior:'smooth' });
      }
    });
    tab.addEventListener('keydown', e => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        tab.click();
      }
    });
  });
})();

// === Quiz modal ===
(function(){
  const modal     = document.getElementById('quizModal');
  const openBtn   = document.getElementById('quizOpen');
  if(!modal || !openBtn) return;

  const stepsAll  = modal.querySelectorAll('.quiz-step');
  const questions = modal.querySelectorAll('.quiz-step:not(.quiz-result)');
  const result    = modal.querySelector('.quiz-result');
  const bar       = modal.querySelector('.quiz-progress-bar span');
  const txt       = modal.querySelector('.quiz-progress-text');
  const titleEl   = result.querySelector('.result-title');
  const descEl    = result.querySelector('.result-desc');

  const TOTAL = questions.length; // 10

  const SPECS = {
    1:  { name:'Мехатроника и робототехника',         desc:'Программирование роботов, мехатронные системы и автоматизация производства.' },
    2:  { name:'Компьютерные системы и комплексы',    desc:'Разработка ПО, IT-инфраструктура и поддержка цифровых систем.' },
    3:  { name:'Технология машиностроения',           desc:'Проектирование технологических процессов обработки металла.' },
    4:  { name:'Дизайн (по отраслям)',                desc:'Графический и промышленный дизайн, визуальные коммуникации.' },
    5:  { name:'Монтаж и ремонт электронных приборов',desc:'Обслуживание, диагностика и ремонт электронной аппаратуры.' },
    6:  { name:'Социально-культурная деятельность',   desc:'Event-менеджмент, организация культурных проектов и мероприятий.' },
    7:  { name:'Оператор-наладчик станков с ЧПУ',     desc:'Программирование и наладка станков с числовым программным управлением.' },
    8:  { name:'Управление качеством продукции',      desc:'Контроль качества продукции, процессов и услуг на производстве.' },
    9:  { name:'Монтажник радиоэлектронной аппаратуры',desc:'Сборка и монтаж радиоэлектронной техники и приборов.' },
    10: { name:'Мастер слесарных работ',              desc:'Слесарная обработка металла и точные ручные операции.' },
  };

  let current = 0;
  let scores  = {};

  function open(){
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    reset();
  }
  function close(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }
  function reset(){
    current = 0;
    scores  = {};
    showStep(0);
  }
  function showStep(i){
    stepsAll.forEach(s => s.classList.remove('active'));
    if(i < TOTAL){
      questions[i].classList.add('active');
      const prog = ((i+1)/TOTAL)*100;
      if(bar) bar.style.width = prog + '%';
      if(txt) txt.textContent = `Вопрос ${i+1} из ${TOTAL}`;
    } else {
      result.classList.add('active');
      if(bar) bar.style.width = '100%';
      if(txt) txt.textContent = 'Готово';
      showResult();
    }
    // scroll modal body to top on step change
    const body = modal.querySelector('.quiz-steps');
    if(body) body.scrollTop = 0;
  }
  function showResult(){
    let maxId = '1', maxScore = -Infinity;
    for(const id in scores){
      if(scores[id] > maxScore){ maxScore = scores[id]; maxId = id; }
    }
    // если никто не набрал — дефолт
    if(maxScore < 0) maxId = '1';
    const spec = SPECS[maxId] || SPECS[1];
    titleEl.textContent = spec.name;
    descEl.textContent  = spec.desc;
    // pass the resulting specialty to the consult modal trigger
    const consultBtn = result.querySelector('[data-result-consult]');
    if(consultBtn) consultBtn.dataset.consult = spec.name;
  }

  // Events
  openBtn.addEventListener('click', open);
  modal.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', close);
  });
  modal.querySelector('[data-restart]')?.addEventListener('click', reset);
  // When user clicks the "Оставить заявку" CTA inside the result step,
  // close the quiz first (consult modal is opened by the global handler).
  modal.querySelector('[data-result-consult]')?.addEventListener('click', close);

  // Esc to close
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && modal.classList.contains('open')) close();
  });

  // Option click
  modal.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      let score = {};
      try { score = JSON.parse(btn.dataset.score || '{}'); } catch(_){ }
      for(const id in score){
        scores[id] = (scores[id] || 0) + score[id];
      }
      current++;
      showStep(current);
    });
  });
})();

// === Consultation modal ===
(function(){
  const modal = document.getElementById('consultModal');
  if(!modal) return;
  const card  = modal.querySelector('.consult-modal-card');
  const form  = modal.querySelector('#consultForm');
  const views = modal.querySelectorAll('[data-consult-view]');

  function setView(name){
    views.forEach(v => {
      v.hidden = (v.dataset.consultView !== name);
    });
  }

  function open(prefSpec){
    setView('form');
    if(form){
      form.reset();
      if(prefSpec){
        const sel = form.elements['specialty'];
        if(sel){
          for(const opt of sel.options){
            if(opt.value === prefSpec || opt.textContent.trim() === prefSpec){
              sel.value = opt.value || opt.textContent;
              break;
            }
          }
        }
      }
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    // focus first input
    setTimeout(() => {
      const firstInput = form?.querySelector('input[name="name"]');
      if(firstInput) firstInput.focus();
    }, 400);
  }
  function close(){
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  // Open via [data-consult] on any element across the page
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-consult]');
    if(trigger){
      e.preventDefault();
      const spec = trigger.dataset.consult || '';
      open(spec);
    }
  });

  // Close via X / backdrop / esc / "Закрыть"
  modal.querySelectorAll('[data-consult-close]').forEach(el => {
    el.addEventListener('click', close);
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });

  // Phone formatting: keep only digits, render as +7 (XXX) XXX-XX-XX
  const phoneInput = form?.querySelector('input[name="phone"]');
  if(phoneInput){
    phoneInput.addEventListener('input', () => {
      let digits = phoneInput.value.replace(/\D/g, '');
      if(digits.startsWith('8')) digits = '7' + digits.slice(1);
      if(!digits.startsWith('7')) digits = '7' + digits;
      digits = digits.slice(0, 11);
      const parts = [];
      if(digits.length > 1) parts.push('+7 (' + digits.slice(1, 4));
      if(digits.length >= 5) parts[0] += ') ' + digits.slice(4, 7);
      if(digits.length >= 8) parts[0] += '-' + digits.slice(7, 9);
      if(digits.length >= 10) parts[0] += '-' + digits.slice(9, 11);
      phoneInput.value = parts.join('') || '+7 ';
    });
  }

  // Submit
  if(form){
    form.addEventListener('submit', e => {
      e.preventDefault();
      // basic validation
      let ok = true;
      ['name','phone'].forEach(n => {
        const el = form.elements[n];
        if(!el.value.trim() || (n === 'phone' && el.value.replace(/\D/g,'').length < 11)){
          el.classList.add('is-error');
          ok = false;
        } else {
          el.classList.remove('is-error');
        }
      });
      if(!form.elements['consent'].checked) ok = false;
      if(!ok) return;
      // mock submission — show success
      setView('success');
    });

    // clear error on input
    form.querySelectorAll('input, textarea').forEach(el => {
      el.addEventListener('input', () => el.classList.remove('is-error'));
    });
  }
})();

// === Mobile nav burger ===
(function(){
  const nav    = document.querySelector('.nav');
  const btn    = document.getElementById('navBurger');
  const menu   = document.getElementById('navMobile');
  if(!nav || !btn || !menu) return;

  function close(){
    nav.classList.remove('menu-open');
    btn.setAttribute('aria-expanded','false');
    menu.setAttribute('aria-hidden','true');
  }
  function toggle(){
    const open = !nav.classList.contains('menu-open');
    nav.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
  }
  btn.addEventListener('click', toggle);
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('click', e => {
    if(nav.classList.contains('menu-open') && !nav.contains(e.target)) close();
  });
})();

// === Custom cursor (desktop / hover-capable devices only) ===
(function(){
  if(!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const dot  = document.createElement('div');
  const ring = document.createElement('div');
  dot.className  = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mx = -100, my = -100;
  let rx = -100, ry = -100;
  let rafId = null;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    if(!rafId) loop();
  }, { passive:true });

  function loop(){
    rx += (mx - rx) * 0.2;
    ry += (my - ry) * 0.2;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    if(Math.abs(mx - rx) < 0.2 && Math.abs(my - ry) < 0.2){
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(loop);
  }

  // Hide cursor when leaving / coming back to the window
  document.addEventListener('mouseleave', () => {
    dot.classList.add('is-out');
    ring.classList.add('is-out');
  });
  document.addEventListener('mouseenter', () => {
    dot.classList.remove('is-out');
    ring.classList.remove('is-out');
  });

  // Pressed state
  document.addEventListener('mousedown', () => {
    dot.classList.add('is-down');
    ring.classList.add('is-down');
  });
  document.addEventListener('mouseup', () => {
    dot.classList.remove('is-down');
    ring.classList.remove('is-down');
  });

  // Hover state for interactive elements
  const INTERACTIVE = 'a, button, summary, label, input[type="checkbox"], select, [role="tab"], [role="button"], .acc-head, .pl-tab, [data-consult], [data-cursor="hover"]';
  document.addEventListener('mouseover', e => {
    if(e.target.closest && e.target.closest(INTERACTIVE)){
      dot.classList.add('is-hover');
      ring.classList.add('is-hover');
    }
  });
  document.addEventListener('mouseout', e => {
    if(e.target.closest && e.target.closest(INTERACTIVE)){
      const toEl = e.relatedTarget;
      if(!toEl || !(toEl.closest && toEl.closest(INTERACTIVE))){
        dot.classList.remove('is-hover');
        ring.classList.remove('is-hover');
      }
    }
  });

  // Tag the body so CSS can apply cursor:none
  document.documentElement.classList.add('has-custom-cursor');
})();

// === Subtle parallax on photos + footer map pin ===
(function(){
  // Skip on touch/reduced-motion devices
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Cache: [{el, speed, axis: 'y' | 'x', baseScale}]
  const items = [];

  // Person card images — vertical parallax inside each card
  document.querySelectorAll('.person-card img').forEach(img => {
    items.push({ el: img, container: img.closest('.person-card'), speed: 30, axis: 'y' });
  });
  // Footer map pin — gentle vertical drift
  const pin = document.querySelector('.footer-map-pin');
  if(pin){
    items.push({ el: pin, container: pin.closest('.footer-map'), speed: 22, axis: 'y' });
  }
  // Hero background video — deeper parallax
  const heroVideo = document.querySelector('.hero-video');
  if(heroVideo){
    items.push({ el: heroVideo, container: heroVideo.closest('.hero'), speed: 100, axis: 'y', isVideo: true });
  }
  // Quiz background video
  const quizVideo = document.querySelector('.quiz-bg-video');
  if(quizVideo){
    items.push({ el: quizVideo, container: quizVideo.closest('.quiz'), speed: 70, axis: 'y', isVideo: true });
  }

  if(!items.length) return;

  let ticking = false;
  function update(){
    const vh = window.innerHeight;
    items.forEach(({ el, container, speed, isVideo }) => {
      const rect = (container || el).getBoundingClientRect();
      if(rect.bottom < -100 || rect.top > vh + 100) return;
      const center = rect.top + rect.height / 2;
      const offset = (center - vh / 2) / vh; // ~ -1..1
      const t = -offset * speed;
      if(isVideo){
        el.style.transform = `translateY(${t}px) scale(1.08)`;
      } else if(el.tagName === 'IMG'){
        el.style.transform = `translateY(${t}px) scale(1.08)`;
      } else {
        el.style.transform = `translateY(${t}px)`;
      }
    });
    ticking = false;
  }

  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive:true });
  window.addEventListener('resize', onScroll);
  update();
})();
