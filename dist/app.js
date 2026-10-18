(() => {
  'use strict';
  const root = document.documentElement;
  const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const saveData = !!connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType);
  const story = document.querySelector('.story');
  const scenes = [...document.querySelectorAll('.scene')];
  const hero = document.querySelector('.hero');
  const heroVideo = document.querySelector('.hero-video');
  const ids = scenes.map(scene => scene.id);
  let current = -1, rafPending = false, beatTimeout, audioContext, voices = [];
  const clamp = value => Math.max(0, Math.min(1, value));

  function loadVideo(video) {
    if (!video || reduceQuery.matches || saveData) return Promise.resolve();
    if (video.dataset.loaded) return Promise.resolve();
    video.dataset.loaded = 'true';
    video.src = video.dataset.src;
    video.load();
    return new Promise(resolve => {
      const done = () => { video.classList.add('is-ready'); resolve(); };
      if (video.readyState >= 3) done();
      else { video.addEventListener('canplay', done, {once: true}); video.addEventListener('error', resolve, {once: true}); }
    });
  }

  function playVideo(video) {
    if (!video || reduceQuery.matches || saveData || document.hidden) return;
    loadVideo(video).then(() => { if (isVideoVisible(video)) video.play().catch(() => {}); });
  }

  function isVideoVisible(video) {
    if (document.hidden) return false;
    const rect = (video.closest('.scene') || video.closest('.footer-scene') || hero).getBoundingClientRect();
    return rect.bottom > 0 && rect.top < innerHeight && (!video.closest('.scene') || video.closest('.scene').classList.contains('active'));
  }

  function silenceBeat() {
    voices.forEach(voice => { try { voice.stop(); } catch {} });
    voices = [];
    clearTimeout(beatTimeout);
    document.querySelector('.scene-train').classList.remove('beat-on');
  }

  function activateScene(index) {
    if (index === current) return;
    const previous = current;
    current = index;
    scenes.forEach((scene, i) => {
      scene.classList.toggle('active', i === index);
      scene.classList.toggle('previous', i === previous);
      const visible = reduceQuery.matches || i === index;
      scene.inert = !visible;
      if (visible) scene.removeAttribute('aria-hidden'); else scene.setAttribute('aria-hidden', 'true');
      const video = scene.querySelector('video');
      if (i !== index) video.pause();
    });
    if (index !== 1) silenceBeat();
    const storyRect = story.getBoundingClientRect();
    if (storyRect.top < innerHeight * 1.8 && storyRect.bottom > -innerHeight) {
      playVideo(scenes[index].querySelector('video'));
      if (scenes[index + 1]) loadVideo(scenes[index + 1].querySelector('video'));
    }
  }

  function update() {
    rafPending = false;
    const rect = story.getBoundingClientRect();
    if (!reduceQuery.matches) {
      const travel = story.offsetHeight - innerHeight;
      const progress = clamp(-rect.top / travel);
      activateScene(Math.min(3, Math.floor(progress * 4)));
      document.querySelector('.story-progress>span').style.transform = `scaleX(${progress})`;
      const heroProgress = clamp(scrollY / innerHeight);
      document.querySelector('.hero-art').style.transform = `scale(${1 + heroProgress * .025}) translateY(${heroProgress * 35}px)`;
    }
    if (rect.top < innerHeight * 1.7 && rect.bottom > 0 && !reduceQuery.matches) {
      playVideo(scenes[Math.max(current, 0)].querySelector('video'));
      if (scenes[current + 1]) loadVideo(scenes[current + 1].querySelector('video'));
    }
    if (hero.getBoundingClientRect().bottom > 0) playVideo(heroVideo); else heroVideo.pause();
    const footerVideo = document.querySelector('.footer-video');
    const footerRect = document.querySelector('.footer-scene').getBoundingClientRect();
    if (footerRect.top < innerHeight * 1.5 && footerRect.bottom > 0) playVideo(footerVideo); else footerVideo.pause();
    if (rect.bottom < 0 || rect.top > innerHeight) scenes.forEach(scene => scene.querySelector('video').pause());
  }

  addEventListener('scroll', () => { if (!rafPending) { rafPending = true; requestAnimationFrame(update); } }, {passive: true});
  addEventListener('resize', () => requestAnimationFrame(update), {passive: true});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { document.querySelectorAll('video').forEach(video => video.pause()); silenceBeat(); }
    else update();
  });

  function navigate(hash, smooth = true) {
    const id = hash.replace('#', '');
    const index = ids.indexOf(id);
    let target;
    if (index >= 0 && !reduceQuery.matches) {
      target = story.offsetTop + ((index + .12) / 4) * (story.offsetHeight - innerHeight);
    } else {
      const element = document.getElementById(id);
      if (!element) return;
      target = element.getBoundingClientRect().top + scrollY;
    }
    window.scrollTo({top: target, behavior: smooth && !reduceQuery.matches ? 'smooth' : 'instant'});
  }

  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    const hash = link.getAttribute('href');
    if (!document.querySelector(hash)) return;
    event.preventDefault();
    history.pushState(null, '', hash);
    navigate(hash);
    if (link.classList.contains('skip')) {
      const destination = document.getElementById('day');
      destination.setAttribute('tabindex', '-1');
      destination.focus({preventScroll: true});
    }
  }));
  addEventListener('popstate', () => navigate(location.hash || '#home'));

  const heroImage = document.querySelector('.hero-poster');
  const posterReady = heroImage.decode ? heroImage.decode().catch(() => {}) : Promise.resolve();
  const openingReady = Promise.all([posterReady, document.fonts.ready, loadVideo(heroVideo)]);
  const boundedReady = new Promise(resolve => setTimeout(resolve, 4500));
  Promise.race([openingReady, boundedReady]).finally(() => {
    root.classList.remove('is-loading');
    const initialHash = window.__zoomerInitialHash || location.hash;
    if (initialHash) { history.replaceState(null, '', initialHash); navigate(initialHash, false); }
    else window.scrollTo({top: 0, behavior: 'instant'});
    update();
  });
  // A failed optional video always leaves the already decoded illustration visible.
  document.querySelectorAll('video').forEach(video => video.addEventListener('error', () => video.classList.remove('is-ready')));

  reduceQuery.addEventListener('change', () => {
    current = -1;
    document.querySelectorAll('video').forEach(video => video.pause());
    document.querySelector('.hero-art').style.transform = '';
    activateScene(0);
    update();
  });

  document.getElementById('matcha-button').addEventListener('click', event => {
    document.querySelector('.scene-cafe').classList.add('matcha-secured');
    document.getElementById('matcha-note').textContent = 'Matcha secured. The day can officially begin.';
    event.currentTarget.innerHTML = 'Matcha secured <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
    event.currentTarget.disabled = true;
  });

  const tracks = [
    {name: 'Window-seat daydreams', notes: [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23]},
    {name: 'Missed my stop again', notes: [220, 261.63, 329.63, 392, 329.63, 261.63, 293.66, 220]},
    {name: 'One more song', notes: [293.66, 369.99, 440, 369.99, 329.63, 392, 493.88, 392]}
  ];
  let trackIndex = -1;
  document.getElementById('track-button').addEventListener('click', async () => {
    silenceBeat();
    trackIndex = (trackIndex + 1) % tracks.length;
    const track = tracks[trackIndex];
    const label = document.getElementById('track-label');
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) { label.textContent = `${track.name} — audio unavailable in this browser`; return; }
    try {
      audioContext ||= new AudioEngine();
      await audioContext.resume();
      const start = audioContext.currentTime;
      for (let i = 0; i < 16; i++) {
        const osc = audioContext.createOscillator(), gain = audioContext.createGain();
        osc.type = 'sine'; osc.frequency.value = track.notes[i % 8];
        const t = start + i * .28;
        gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.045, t + .015); gain.gain.exponentialRampToValueAtTime(.001, t + .48);
        osc.connect(gain); gain.connect(audioContext.destination); osc.start(t); osc.stop(t + .5); voices.push(osc);
        if (i % 2 === 0) {
          const kick = audioContext.createOscillator(), kg = audioContext.createGain();
          kick.frequency.setValueAtTime(100, t); kick.frequency.exponentialRampToValueAtTime(42, t + .12);
          kg.gain.setValueAtTime(.045, t); kg.gain.exponentialRampToValueAtTime(.001, t + .16);
          kick.connect(kg); kg.connect(audioContext.destination); kick.start(t); kick.stop(t + .17); voices.push(kick);
        }
      }
      label.textContent = `Playing: ${track.name}`;
      document.querySelector('.scene-train').classList.add('beat-on');
      beatTimeout = setTimeout(() => { silenceBeat(); label.textContent = `${track.name} — try another beat`; }, 5000);
    } catch { label.textContent = 'Sound is unavailable. Still a good view.'; }
  });

  document.getElementById('close-chart').addEventListener('click', () => {
    document.querySelector('.scene-laptop').classList.add('logging-off');
    setTimeout(() => { history.pushState(null, '', '#golden-hour'); navigate('#golden-hour'); }, reduceQuery.matches ? 0 : 750);
  });

  let snacks = 0;
  document.getElementById('snack-button').addEventListener('click', () => {
    snacks++;
    document.getElementById('snack-note').textContent = snacks === 1 ? 'Snack secured. You get him.' : `${snacks} snacks shared. You're officially in the group chat.`;
    if (reduceQuery.matches) return;
    const tray = document.querySelector('.snack-particles');
    for (let i = 0; i < 14; i++) {
      const chip = document.createElement('i'); chip.className = 'chip';
      chip.style.setProperty('--x', `${Math.cos(i * 2.4) * (80 + i * 12)}px`);
      chip.style.setProperty('--y', `${-60 - Math.sin(i * 1.1) * 170}px`);
      chip.style.setProperty('--rotate', `${i * 77}deg`);
      tray.append(chip); chip.addEventListener('animationend', () => chip.remove(), {once: true});
    }
  });

  const moods = {
    'caffeinated': {title: 'Small cup.<br>Big plans.', copy: 'Start with something green. See where the day takes you.', image: 'mood-caffeinated-2k', alt: 'Zoomer brewing a tiny cup of matcha beside an elaborate green-tea apparatus in his kitchen', name: 'Caffeinated'},
    'tuned-out': {title: 'Do not<br>disturb.', copy: 'Headphones on. Notifications off. This next song is for you.', image: 'mood-tuned-out-2k', alt: 'Zoomer reclining on a crescent moon above the city with his headphones on', name: 'Tuned out'},
    'down-bad': {title: 'Close the tab.<br>Take a lap.', copy: 'Even your rain cloud needs a break. Take a breath. The day can still turn around.', image: 'mood-down-bad-2k', alt: 'Zoomer checking an empty wallet under his own little rain cloud outside an arcade', name: 'Down bad'},
    'unbothered': {title: 'Good chips.<br>Better company.', copy: "Nothing to refresh. Nowhere to rush. You're exactly where you need to be.", image: 'mood-unbothered-2k', alt: 'Zoomer relaxing with chips in a rooftop hammock while a pigeon rests on his skateboard', name: 'Unbothered'}
  };
  function setMood(key) {
    if (!moods[key]) return;
    const mood = moods[key];
    document.getElementById('mood-response-title').innerHTML = mood.title;
    document.getElementById('mood-response-copy').textContent = mood.copy;
    const image = document.getElementById('mood-image'); image.src = `assets/${mood.image}.webp`; image.alt = mood.alt;
    document.querySelectorAll('[data-mood]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mood === key)));
    try { localStorage.setItem('zoomer-mood', key); } catch {}
  }
  document.querySelectorAll('[data-mood]').forEach(button => button.addEventListener('click', () => setMood(button.dataset.mood)));
  try { const stored = localStorage.getItem('zoomer-mood'); if (stored) setMood(stored); } catch {}
  activateScene(0);

  const caChip = document.getElementById('ca-chip');
  if (caChip) {
    const caLabel = caChip.querySelector('.ca-chip-label');
    caChip.addEventListener('click', async () => {
      const ca = caChip.dataset.ca;
      try {
        await navigator.clipboard.writeText(ca);
        caLabel.textContent = 'Copied!';
      } catch {
        caLabel.textContent = 'Copy failed';
      }
      setTimeout(() => { caLabel.textContent = 'CA'; }, 1800);
    });
  }
})();
