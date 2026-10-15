// <rende-faixa-custo> — faixa animada do custo do cookie. Sem dependências.
// Uso na página:  <rende-faixa-custo></rende-faixa-custo>
// Abertura (opcional): <rende-faixa-custo mode="intro"></rende-faixa-custo>
// Atributos: mode="intro" | loop="false"
const ITEMS = [
  { k: 'Materiais', v: 3.12, c: '#ECE8E0' },
  { k: 'Embalagem', v: 0.45, c: '#A7AED0' },
  { k: 'Seu trabalho', v: 0.56, c: '#7C93FF' },
  { k: 'Energia e gás', v: 0.18, c: '#C9CDE0' },
  { k: 'Fatia das despesas fixas', v: 0.10, c: '#8D94B8' },
  { k: 'Maquininha 5%', v: 0.43, c: '#4B5590' },
  { k: 'Sobra pra você', v: 3.66, c: '#F59BB0' }
];
const PRECO = 8.5, CUSTO = 4.41, LAST = 8;
const DUR = [1100, 1000, 800, 900, 700, 700, 1400, 1500, 4200];
const INTRO_SCALE = 0.6, INTRO_HOLD = 1800, KEY = 'rende-intro-visto';
const fmt = n => n.toFixed(2).replace('.', ',');
const target = s => s === 0 ? 0 : s <= 5 ? ITEMS.slice(0, s).reduce((a, b) => a + b.v, 0) : s === 6 ? CUSTO : PRECO;
const visible = (i, s) => i < 5 ? s > i : s >= 7;
const CAPS = s => {
  if (s >= 1 && s <= 5) return [ITEMS[s - 1].k, '+ R$ ' + fmt(ITEMS[s - 1].v)];
  return [
    ['Quanto custa um cookie?', 'O que entra em cada unidade'], null, null, null, null, null,
    ['Custo de verdade', 'R$ 4,41 por unidade, com tudo dentro'],
    ['Preço sugerido', 'Margem 40% + maquininha 5%'],
    ['Sobram R$ 3,66 pra você', 'Por cookie, depois da maquininha']
  ][s];
};

const CSS = `
:host{display:block;container-type:inline-size;background:#14215C;color:#F6F3ED;font-family:'Figtree',system-ui,sans-serif}
:host([mode=intro]){position:fixed;inset:0;z-index:1000;display:grid;align-items:center;transition:opacity .4s}
:host(.saindo){opacity:0}
.wrap{max-width:1120px;width:100%;margin:0 auto;padding:clamp(32px,7cqw,88px) clamp(20px,5cqw,56px);display:flex;flex-direction:column;gap:clamp(20px,3.4cqw,36px);box-sizing:border-box}
.top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:16px 32px}
.eb{font-size:13px;font-weight:600;color:#AEB6DC}
.cap{display:block;font-size:clamp(26px,4.6cqw,48px);font-weight:700;letter-spacing:-.02em;line-height:1.05;margin:8px 0;transition:color .4s}
.cap.rosa{color:#F59BB0}
.sub{font-size:clamp(15px,1.7cqw,18px);color:#C9CDE0;min-height:1.4em}
.ct{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.ctl{font-size:13px;font-weight:500;color:#AEB6DC}
.ctv{font-size:clamp(34px,6cqw,64px);font-weight:700;letter-spacing:-.02em;line-height:1;font-variant-numeric:tabular-nums}
.ctv small{font-size:.45em;font-weight:600;margin-right:6px;color:#C9CDE0}
.bar{display:flex;height:clamp(28px,5cqw,56px);border-radius:6px;overflow:hidden;background:rgba(255,255,255,.06)}
.seg{flex:none;height:100%;width:0;box-shadow:inset -2px 0 0 #14215C;transition:width .7s cubic-bezier(.2,.8,.2,1)}
.br{display:flex;margin-top:10px;font-size:clamp(12px,1.4cqw,14px);font-weight:600;font-variant-numeric:tabular-nums}
.br div{padding-top:8px;opacity:0;transition:opacity .5s}
.br .on{opacity:1}
.bc{width:51.88%;border-top:2px solid #ECE8E0}
.bs{width:43.06%;margin-left:5.06%;border-top:2px solid #F59BB0;text-align:right;color:#F59BB0;transition-delay:.3s!important}
.leg{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px 24px;font-size:14px;list-style:none;margin:0;padding:0}
.leg li{display:flex;align-items:center;gap:10px;opacity:.3;transition:opacity .4s}
.leg li.on{opacity:1}
.sw{width:10px;height:10px;border-radius:2px;flex:none}
.lk{flex:1;min-width:0;color:#E4E6F0}
.lv{font-variant-numeric:tabular-nums;font-weight:600}
.skip{display:none;position:absolute;top:16px;right:16px;min-height:44px;padding:0 18px;border:1px solid rgba(246,243,237,.4);border-radius:8px;background:transparent;color:#F6F3ED;font:600 14px 'Figtree',system-ui,sans-serif;cursor:pointer}
.skip:hover{background:rgba(246,243,237,.1)}
:host([mode=intro]) .skip{display:block}
@media (prefers-reduced-motion:reduce){.seg,.br div,.leg li,.cap{transition:none}}
`;

class RendeFaixaCusto extends HTMLElement {
  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this.intro = this.getAttribute('mode') === 'intro';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.intro && (reduce || sessionStorage.getItem(KEY))) { this.remove(); return; }

    const r = this.attachShadow({ mode: 'open' });
    r.innerHTML = `<style>${CSS}</style>
      <button class="skip" type="button">Pular</button>
      <div class="wrap" role="img" aria-label="O custo de um cookie recheado soma R$ 4,41. Vendido a R$ 8,50, sobram R$ 3,66 por unidade.">
        <div class="top">
          <div><span class="eb">Cookie recheado · rende 24 unidades</span><span class="cap"></span><span class="sub"></span></div>
          <div class="ct"><span class="ctl"></span><span class="ctv"><small>R$</small><b></b></span></div>
        </div>
        <div>
          <div class="bar">${ITEMS.map(it => `<i class="seg" style="background:${it.c}"></i>`).join('')}</div>
          <div class="br"><div class="bc">Custo R$ 4,41</div><div class="bs">Sobra R$ 3,66</div></div>
        </div>
        <ul class="leg">${ITEMS.map(it => `<li><span class="sw" style="background:${it.c}"></span><span class="lk">${it.k}</span><span class="lv">R$ ${fmt(it.v)}</span></li>`).join('')}</ul>
      </div>`;
    const q = s => r.querySelector(s);
    this.el = { cap: q('.cap'), sub: q('.sub'), ctl: q('.ctl'), ctv: q('.ctv b'), segs: r.querySelectorAll('.seg'), leg: r.querySelectorAll('.leg li'), bc: q('.bc'), bs: q('.bs') };
    this.cur = 0; this.val = 0;

    if (reduce) { this.go(LAST, true); return; }
    this.go(0, true);
    if (this.intro) {
      document.documentElement.style.overflow = 'hidden';
      q('.skip').addEventListener('click', () => this.close());
      this._esc = e => e.key === 'Escape' && this.close();
      addEventListener('keydown', this._esc);
      this.schedule();
    } else {
      this.io = new IntersectionObserver(([e]) => e.isIntersecting ? this.play() : this.pause(), { threshold: 0.35 });
      this.io.observe(this);
    }
  }
  disconnectedCallback() { this.pause(); this.io && this.io.disconnect(); cancelAnimationFrame(this.raf); this._esc && removeEventListener('keydown', this._esc); }
  play() { if (!this.t && !this.done) this.schedule(); }
  pause() { clearTimeout(this.t); this.t = null; }
  schedule() {
    const d = this.intro ? (this.cur === LAST ? INTRO_HOLD : DUR[this.cur] * INTRO_SCALE) : DUR[this.cur];
    this.t = setTimeout(() => {
      this.t = null;
      let n = this.cur + 1;
      if (n > LAST) {
        if (this.intro) return this.close();
        if (this.getAttribute('loop') === 'false') { this.done = true; return; }
        n = 0;
      }
      this.go(n); this.schedule();
    }, d);
  }
  go(s, instant) {
    this.cur = s;
    const e = this.el, [cap, sub] = CAPS(s);
    e.cap.textContent = cap; e.sub.textContent = sub;
    e.cap.classList.toggle('rosa', s === LAST);
    e.ctl.textContent = s >= 7 ? 'Preço por unidade' : 'Custo por unidade';
    ITEMS.forEach((it, i) => {
      const on = visible(i, s);
      e.segs[i].style.width = on ? (it.v / PRECO * 100).toFixed(2) + '%' : '0';
      e.leg[i].classList.toggle('on', on);
    });
    e.bc.classList.toggle('on', s >= 6);
    e.bs.classList.toggle('on', s >= 7);
    cancelAnimationFrame(this.raf);
    const from = this.val, to = target(s);
    if (instant) { this.val = to; e.ctv.textContent = fmt(to); return; }
    const t0 = performance.now();
    const f = now => {
      const p = Math.min(1, (now - t0) / 600);
      this.val = from + (to - from) * (1 - Math.pow(1 - p, 3));
      e.ctv.textContent = fmt(this.val);
      if (p < 1) this.raf = requestAnimationFrame(f);
    };
    this.raf = requestAnimationFrame(f);
  }
  close() {
    if (this._closing) return;
    this._closing = true;
    this.pause();
    sessionStorage.setItem(KEY, '1');
    document.documentElement.style.overflow = '';
    this.classList.add('saindo');
    setTimeout(() => { this.dispatchEvent(new CustomEvent('faixa:fim', { bubbles: true })); this.remove(); }, 400);
  }
}
if (!customElements.get('rende-faixa-custo')) customElements.define('rende-faixa-custo', RendeFaixaCusto);
