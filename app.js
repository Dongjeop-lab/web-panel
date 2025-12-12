(async function() {
  // DOM Elements
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const autoBtn = document.getElementById('autoBtn');

  const appealTitle = document.getElementById('appealTitle');
  const appealSub = document.getElementById('appealSub');

  const detailHead = document.getElementById('detailHead');
  const detailDesc = document.getElementById('detailDesc');
  const detailList = document.getElementById('detailList');

  const overlaySvg = document.getElementById('overlaySvg');
  const canvasInner = document.getElementById('canvasInner');

  const miniNodes = Array.from(document.querySelectorAll('.miniNode'));
  const allNodes = Array.from(document.querySelectorAll('.node, .mergeNode, .miniNode'));

  const dotEls = [
    document.getElementById('dot1'),
    document.getElementById('dot2'),
    document.getElementById('dot3'),
    document.getElementById('dot4'),
    document.getElementById('dot5'),
  ];

  // Load data from JSON
  let DATA = {};
  let ORDER = [];

  try {
    const response = await fetch('data.json');
    const config = await response.json();
    DATA = config.nodes;
    ORDER = config.order;
  } catch (error) {
    console.error('Failed to load data:', error);
    return;
  }

  // State
  let idx = 0;
  let auto = true;
  let timer = null;
  let flowTimer = null;
  let flowPhase = 0;

  // Helper functions
  function iconCheck() {
    return `
      <svg class="check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 7 10 17l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  }

  function setActive(id) {
    allNodes.forEach(n => n.classList.remove('active'));
    const el = allNodes.find(n => n.dataset.id === id);
    if (el) el.classList.add('active');

    if (id === "collect_campaign" || id === "collect_crawl") {
      miniNodes.forEach(m => m.classList.remove('active'));
      const m = miniNodes.find(x => x.dataset.id === id);
      if (m) m.classList.add('active');
    }

    const d = DATA[id] || DATA["collect_campaign"];
    detailHead.textContent = d.head;
    detailDesc.textContent = d.desc;

    appealTitle.innerHTML = d.appealTitle;
    appealSub.textContent = d.appealSub;

    detailList.innerHTML = (d.bullets || []).map(x => `<li>${iconCheck()}${x}</li>`).join("");
    drawMergeConnectors();
  }

  function setByIndex(i) {
    idx = (i + ORDER.length) % ORDER.length;
    setActive(ORDER[idx]);
  }

  function next() {
    setByIndex(idx + 1);
  }

  function prev() {
    setByIndex(idx - 1);
  }

  function startAuto() {
    stopAuto();
    if (!auto) return;
    timer = setInterval(next, 6500);
  }

  function stopAuto() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function toggleAuto() {
    auto = !auto;
    autoBtn.textContent = '자동: ' + (auto ? 'ON' : 'OFF');
    if (auto) {
      startAuto();
      startFlow();
    } else {
      stopAuto();
      stopFlow();
      hideDots();
    }
  }

  function drawMergeConnectors() {
    while (overlaySvg.firstChild) overlaySvg.removeChild(overlaySvg.firstChild);

    const cRect = canvasInner.getBoundingClientRect();
    const a = document.querySelector('.miniNode[data-id="collect_campaign"]');
    const b = document.querySelector('.miniNode[data-id="collect_crawl"]');
    const m = document.querySelector('.mergeNode[data-id="image_pool"]');
    if (!a || !b || !m) return;

    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const rm = m.getBoundingClientRect();

    const p1 = { x: ra.right - cRect.left, y: ra.top + ra.height / 2 - cRect.top };
    const p2 = { x: rb.right - cRect.left, y: rb.top + rb.height / 2 - cRect.top };
    const pe = { x: rm.left - cRect.left, y: rm.top + rm.height / 2 - cRect.top };
    const join = { x: pe.x - 26, y: pe.y };

    overlaySvg.setAttribute('viewBox', `0 0 ${cRect.width} ${cRect.height}`);

    function mkPath(d, color, width, dash) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', width);
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('opacity', '0.75');
      if (dash) path.setAttribute('stroke-dasharray', dash);
      overlaySvg.appendChild(path);
    }

    const d1 = `M ${p1.x} ${p1.y} C ${p1.x + 40} ${p1.y}, ${join.x - 40} ${join.y - 20}, ${join.x} ${join.y}`;
    const d2 = `M ${p2.x} ${p2.y} C ${p2.x + 40} ${p2.y}, ${join.x - 40} ${join.y + 20}, ${join.x} ${join.y}`;
    const d3 = `M ${join.x} ${join.y} L ${pe.x} ${pe.y}`;

    mkPath(d1, 'rgba(255,107,0,.70)', 2.2);
    mkPath(d2, 'rgba(255,107,0,.70)', 2.2);
    mkPath(d3, 'rgba(255,107,0,.70)', 2.4);

    const ah = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const ax = pe.x, ay = pe.y;
    ah.setAttribute('d', `M ${ax - 10} ${ay - 7} L ${ax} ${ay} L ${ax - 10} ${ay + 7}`);
    ah.setAttribute('fill', 'none');
    ah.setAttribute('stroke', 'rgba(255,107,0,.75)');
    ah.setAttribute('stroke-width', '2.4');
    ah.setAttribute('stroke-linecap', 'round');
    ah.setAttribute('stroke-linejoin', 'round');
    overlaySvg.appendChild(ah);

    const em = document.querySelector('.node[data-id="expert_models"]');
    const aa = document.querySelector('.node[data-id="auto_analyze"]');
    if (em && aa) {
      const re = em.getBoundingClientRect();
      const raa = aa.getBoundingClientRect();
      const from = { x: re.left + re.width * 0.75 - cRect.left, y: re.bottom - cRect.top };
      const to = { x: raa.left + raa.width * 0.35 - cRect.left, y: raa.top - cRect.top };
      const midY = (from.y + to.y) / 2;

      const dDep = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
      mkPath(dDep, 'rgba(255,107,0,.65)', 2.6, '6 8');

      const ah2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      ah2.setAttribute('d', `M ${to.x - 7} ${to.y + 10} L ${to.x} ${to.y} L ${to.x + 7} ${to.y + 10}`);
      ah2.setAttribute('fill', 'none');
      ah2.setAttribute('stroke', 'rgba(255,107,0,.70)');
      ah2.setAttribute('stroke-width', '2.6');
      ah2.setAttribute('stroke-linecap', 'round');
      ah2.setAttribute('stroke-linejoin', 'round');
      overlaySvg.appendChild(ah2);
    }
  }

  function hideDots() {
    dotEls.forEach(d => d.classList.remove('on'));
  }

  function startFlow() {
    stopFlow();
    dotEls.forEach(d => d.classList.add('on'));

    flowTimer = setInterval(() => {
      const activeId = ORDER[idx];
      const isTop = ["collect_campaign", "collect_crawl", "image_pool", "auto_filter", "labeling", "expert_models"].includes(activeId);

      const cRect = canvasInner.getBoundingClientRect();
      if (cRect.width < 10) return;

      const pts = [];
      function center(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2 - cRect.left, y: r.top + r.height / 2 - cRect.top };
      }

      if (isTop) {
        const m = document.querySelector('.mergeNode[data-id="image_pool"]');
        const f = document.querySelector('.node[data-id="auto_filter"]');
        const l = document.querySelector('.node[data-id="labeling"]');
        const e = document.querySelector('.node[data-id="expert_models"]');
        if (!m || !f || !l || !e) return;
        pts.push(center(m), center(f), center(l), center(e));
      } else {
        const a = document.querySelector('.node[data-id="mass_images"]');
        const b = document.querySelector('.node[data-id="auto_analyze"]');
        const c = document.querySelector('.node[data-id="restaurant_qc"]');
        if (!a || !b || !c) return;
        pts.push(center(a), center(b), center(c), center(c));
      }

      const segs = [
        { a: pts[0], b: pts[1] },
        { a: pts[1], b: pts[2] },
        { a: pts[2], b: pts[3] },
      ];

      const base = flowPhase;
      const offsets = [0, 0.45, 0.9, 1.35, 1.8];

      function dotAt(dot, u) {
        u = (u % 3 + 3) % 3;
        const si = Math.min(2, Math.floor(u));
        const t = u - si;
        const A = segs[si].a, B = segs[si].b;
        dot.style.left = (A.x + (B.x - A.x) * t - 5) + "px";
        dot.style.top = (A.y + (B.y - A.y) * t - 5) + "px";
      }

      dotEls.forEach((dot, i) => dotAt(dot, base + offsets[i]));
      flowPhase += 0.075;
    }, 60);
  }

  function stopFlow() {
    if (flowTimer) {
      clearInterval(flowTimer);
      flowTimer = null;
    }
  }

  // Event listeners
  allNodes.forEach(n => {
    n.addEventListener('click', () => {
      const id = n.dataset.id;
      const j = ORDER.indexOf(id);
      if (j >= 0) idx = j;
      setActive(id);
      if (auto) {
        startAuto();
        startFlow();
      }
    });
    n.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const id = n.dataset.id;
        const j = ORDER.indexOf(id);
        if (j >= 0) idx = j;
        setActive(id);
        if (auto) {
          startAuto();
          startFlow();
        }
      }
    });
  });

  prevBtn.addEventListener('click', () => {
    prev();
    if (auto) {
      startAuto();
      startFlow();
    }
  });

  nextBtn.addEventListener('click', () => {
    next();
    if (auto) {
      startAuto();
      startFlow();
    }
  });

  autoBtn.addEventListener('click', toggleAuto);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      next();
      if (auto) {
        startAuto();
        startFlow();
      }
    }
    if (e.key === 'ArrowLeft') {
      prev();
      if (auto) {
        startAuto();
        startFlow();
      }
    }
    if (e.key === ' ') {
      e.preventDefault();
      toggleAuto();
    }
  });

  window.addEventListener('resize', () => {
    drawMergeConnectors();
    if (auto) startFlow();
  });

  // Initialize
  setByIndex(0);
  startAuto();
  startFlow();
  drawMergeConnectors();
})();
