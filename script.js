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
  const shade = pin.querySelector('.about-frame-shade');
  const head  = pin.querySelector('.about-head');

  const START  = { padX:13, padTop:42, padBot:6,  r:28, scale:1.12 };
  const END    = { padX:0,  padTop:0,  padBot:0,  r:0,  scale:1.0  };
  const MOBILE = { padX:6,  padTop:46, padBot:5,  r:24 };

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

    // Shade fades in as photo opens
    if(shade) shade.style.setProperty('--shade-op', e.toFixed(3));

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

      if(i === items.length - 1){
        item.style.clipPath = 'inset(0 0 0% 0)';
      } else if(prog <= 0){
        item.style.clipPath = 'inset(0 0 0% 0)';
      } else if(prog < 1){
        const clip = prog * 100;
        item.style.clipPath = `inset(0 0 ${clip}% 0)`;
      } else {
        item.style.clipPath = 'inset(0 0 100% 0)';
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
    item.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.setAttribute('aria-hidden', open ? 'false' : 'true');
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
  }

  // Events
  openBtn.addEventListener('click', open);
  modal.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', close);
  });
  modal.querySelector('[data-restart]')?.addEventListener('click', reset);

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
