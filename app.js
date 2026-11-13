// ---------------------------------------------------------------- strings
const DEFAULTS = {
  balls: 1, ballWeight: 200, hydration: 65, saltPerLitre: 50, fatPerLitre: 0,
  hours: 24, fridgeHours: 0, roomTemp: 20, carryOver: 0, panPizza: false, vigour: 2,
};

function saveInputs() {
  const state = {};
  for (const id of FIELDS) state[id] = $id(id).value;
  state.panPizza = $id('panPizza').checked;
  state.vigour = document.querySelector('input[name="vigour"]:checked').value;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
}

function restoreInputs() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch {}
  if (!saved || typeof saved !== 'object') return false;
  for (const id of FIELDS) {
    if (saved[id] !== undefined && saved[id] !== null && saved[id] !== '') $id(id).value = String(saved[id]);
  }
  if (typeof saved.panPizza === 'boolean') $id('panPizza').checked = saved.panPizza;
  const vigour = String(saved.vigour || '2');
  document.querySelectorAll('input[name="vigour"]').forEach((radio) => { radio.checked = radio.value === vigour; });
  return true;
}

// A recipe is worth sharing: the whole state lives in the query string too.
const URL_KEYS = { balls: 'n', ballWeight: 'w', hydration: 'h', saltPerLitre: 's',
  fatPerLitre: 'f', hours: 't', fridgeHours: 'c', roomTemp: 'T', carryOver: 'r' };

function currentState() {
  const state = {};
  for (const id of FIELDS) state[id] = $id(id).value;
  state.panPizza = $id('panPizza').checked;
  state.vigour = document.querySelector('input[name="vigour"]:checked').value;
  return state;
}

function applyState(state) {
  for (const id of FIELDS) {
    if (state[id] !== undefined && state[id] !== null && state[id] !== '') $id(id).value = String(state[id]);
  }
  if (typeof state.panPizza === 'boolean') $id('panPizza').checked = state.panPizza;
  const vigour = ['1', '2', '3'].includes(String(state.vigour)) ? String(state.vigour) : '2';
  document.querySelectorAll('input[name="vigour"]').forEach((radio) => { radio.checked = radio.value === vigour; });
}

function stateFromUrl() {
  const params = new URLSearchParams(location.search);
  // Only a link that names a dough quantity is a recipe link; anything else in the
  // query string (a cache buster, a tracking param) must not be read as state.
  if (!params.has('n') && !params.has('w')) return null;
  const state = {};
  for (const [id, key] of Object.entries(URL_KEYS)) if (params.has(key)) state[id] = params.get(key);
  if (params.has('p')) state.panPizza = params.get('p') === '1';
  if (['1', '2', '3'].includes(params.get('v'))) state.vigour = params.get('v');
  return state;
}

function writeUrl() {
  const params = new URLSearchParams();
  const state = currentState();
  for (const [id, key] of Object.entries(URL_KEYS)) params.set(key, state[id]);
  params.set('p', state.panPizza ? '1' : '0');
  params.set('v', state.vigour);
  params.set('l', lang);
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function toast(message) {
  const el = $id('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 1900);
}

function showManualCopy(text) {
  const t = STRINGS[lang];
  $id('copyDialogTitle').textContent = t.copyManually;
  $id('copyDialogClose').textContent = t.close;
  const area = $id('copyDialogText');
  area.value = text;
  const dialog = $id('copyDialog');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  area.focus();
  area.select();
  area.scrollTop = 0;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    area.remove();
    return ok;
  }
}

function recipeText(r, v) {
  const t = STRINGS[lang];
  const parts = [
    t.recipeTitle(v.balls, v.ballWeight),
    `${t.oFlour} ${r.flour} g · ${t.oWater} ${r.water} g · ${t.oSalt} ${r.salt} g` +
      (r.fat > 0 ? ` · ${t.oFat} ${r.fat} g` : '') +
      (r.carry > 0 ? ` · ${t.oCarry} ${r.carry} g` : ''),
    t.yeastLine(dec(r.yeast.toFixed(2)), dec((r.yeast / 3).toFixed(2)), dec((r.yeast / 3.5).toFixed(2))),
    t.recipeSchedule(v.hours, v.fridgeHours, v.roomTemp),
    `${t.strengthLabel} ${r.strength}`,
  ];
  return parts.join('\n');
}

function resetInputs() {
  for (const id of FIELDS) $id(id).value = String(DEFAULTS[id]);
  $id('panPizza').checked = DEFAULTS.panPizza;
  document.querySelectorAll('input[name="vigour"]').forEach((radio) => { radio.checked = radio.value === String(DEFAULTS.vigour); });
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  render();
}
const num = (el) => parseFloat(String(el.value).replace(',', '.'));
const $id = (id) => document.getElementById(id);
let lang = 'en';

function readInputs() {
  return {
    balls: num($id('balls')),
    ballWeight: num($id('ballWeight')),
    hydration: num($id('hydration')),
    saltPerLitre: num($id('saltPerLitre')),
    fatPerLitre: num($id('fatPerLitre')),
    hours: num($id('hours')),
    fridgeHours: num($id('fridgeHours')),
    roomTemp: num($id('roomTemp')),
    carryOver: num($id('carryOver')),
    panPizza: $id('panPizza').checked,
    vigour: parseInt((document.querySelector('input[name="vigour"]:checked') || { value: '2' }).value, 10),
  };
}

function compute(v) {
  const effectiveTemp = v.roomTemp * (1 - 0.25 * (v.panPizza ? 1 : 0));
  const effectiveHours = v.hours - (9 * v.fridgeHours) / 10;
  const rawStrength = 81.4206918743428 + 78.3939060802556 * Math.log(v.hours);
  const strength = 10 * Math.round(rawStrength / 10);
  const yeastPerFlourGram =
    (2250 * (1 + v.saltPerLitre / 200) * (1 + v.fatPerLitre / 300)) /
    ((4.2 * v.hydration - 80 - 0.0305 * v.hydration * v.hydration) *
      Math.pow(effectiveTemp, 2.5) * Math.pow(effectiveHours, 1.2));
  const totalDough = v.balls * v.ballWeight;
  const denominator = v.hydration * (v.saltPerLitre + v.fatPerLitre) + 1000 * (v.hydration + 100);
  const carryFactor = CARRY_OVER_FACTOR[v.vigour];
  const carryLimitRaw = (1e5 * yeastPerFlourGram * 100) / (1e5 * yeastPerFlourGram + denominator * carryFactor);
  const carryLimit = parseFloat(carryLimitRaw.toString().match(/^\d+(?:\.\d{0,2})?/)[0]);
  const remaining = totalDough - (totalDough * v.carryOver) / 100;
  return {
    strength, carryLimit, totalDough,
    flour: Math.round((1e5 * remaining) / denominator),
    water: Math.round((1000 * v.hydration * remaining) / denominator),
    salt: Math.round((v.saltPerLitre * v.hydration * remaining) / denominator),
    fat: Math.round((v.fatPerLitre * v.hydration * remaining) / denominator),
    carry: Math.round((totalDough * v.carryOver) / 100),
    yeast: ((1e5 * remaining) / denominator) * yeastPerFlourGram - carryFactor * ((totalDough * v.carryOver) / 100),
  };
}

// ---------------------------------------------------------------- rendering
// Danish and German both write decimals with a comma; English does not.
const dec = (n) => (lang === 'en' ? String(n) : String(n).replace('.', ','));
const DASH = '—';

function strengthBand(w) {
  if (w < 270) return 0;
  if (w < 340) return 1;
  if (w < 390) return 2;
  return 3;
}

function render() {
  const t = STRINGS[lang];
  const v = readInputs();
  const ids = ['outFlour', 'outWater', 'outSalt', 'outFat', 'outCarry', 'outYeast', 'outTotal', 'outStrength'];

  const bad = [];
  const mark = (el, isBad) => { el.dataset.invalid = isBad ? 'true' : 'false'; };

  const rules = [
    ['balls', v.balls, 1, undefined, true, ''],
    ['ballWeight', v.ballWeight, 1, undefined, false, ' g'],
    ['hydration', v.hydration, 50, 100, false, ' %'],
    ['saltPerLitre', v.saltPerLitre, 0, 70, false, ' g/l'],
    ['fatPerLitre', v.fatPerLitre, 0, 150, false, ' g/l'],
    ['hours', v.hours, 3, 96, false, ' h'],
    ['roomTemp', v.roomTemp, 15, 35, false, ' °C'],
  ];
  for (const [id, value, min, max, integer, unit] of rules) {
    const isBad = Number.isNaN(value) || value < min || (max !== undefined && value > max) || (integer && !Number.isInteger(value));
    mark($id(id), isBad);
    if (isBad) {
      // Say what is wrong, not just which field: "Hydration (50–100 %)".
      // "50–100 %", not "50 %–100 %".
      const suffix = unit.trim();
      const range = max !== undefined
        ? `${min}–${max}${suffix ? ' ' + suffix : ''}`
        : `${t.atLeast} ${min}${suffix ? ' ' + suffix : ''}`;
      bad.push(`${t[id]} (${range})`);
    }
  }
  const fridgeBad = Number.isNaN(v.fridgeHours) || v.fridgeHours < 0 || (v.fridgeHours !== 0 && v.fridgeHours > v.hours - 1);
  mark($id('fridgeHours'), fridgeBad);

  const reset = (message) => {
    ids.forEach((id) => ($id(id).textContent = DASH));
    $id('errorLine').textContent = message;
    $id('strengthNote').textContent = DASH;
    $id('yeastEquiv').textContent = DASH;
    $id('yeastExtraNote').textContent = '';
    render.lastResult = null;
  };

  if (bad.length || fridgeBad) {
    reset(t.check + [bad.join(', '), fridgeBad ? t.fridgeHint : ''].filter(Boolean).join('. ') + '.');
    return;
  }

  const r = compute(v);
  if (v.carryOver < 0 || v.carryOver > r.carryLimit) {
    mark($id('carryOver'), true);
    reset(t.carryLimit(dec(r.carryLimit)));
    return;
  }
  mark($id('carryOver'), false);
  $id('carryOver').max = r.carryLimit;
  const seg = document.querySelector('.seg');
  if (seg) seg.dataset.inert = v.carryOver > 0 ? 'false' : 'true';

  $id('outFlour').textContent = r.flour + ' g';
  $id('outWater').textContent = r.water + ' g';
  $id('outSalt').textContent = r.salt + ' g';
  $id('outFat').textContent = r.fat + ' g';
  $id('outCarry').textContent = r.carry + ' g';
  $id('outYeast').textContent = dec(r.yeast.toFixed(2)) + ' g';
  const tCopy = STRINGS[lang];
  $id('yeastEquiv').textContent = tCopy.yeastEquiv(dec((r.yeast / 3).toFixed(2)), dec((r.yeast / 3.5).toFixed(2)));
  render.lastResult = r;
  $id('outTotal').textContent = Math.round(r.totalDough) + ' g';
  // The label already carries the "(W)"; the value is just the number.
  $id('outStrength').textContent = String(r.strength);
  $id('yeastExtraNote').textContent = STRINGS[lang].yeastExtra(Math.round(r.totalDough));
  $id('strengthNote').textContent = t.notes[strengthBand(r.strength)](r.strength);
  $id('errorLine').textContent = '';
}

function applyLanguage(next) {
  lang = next;
  document.documentElement.lang = next;
  const t = STRINGS[next];
  document.title = STRINGS[next].title;
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const key = el.dataset.i18n;
    if (typeof t[key] === 'string') el.textContent = t[key];
  }
  for (const button of document.querySelectorAll('[data-lang]')) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === next));
  }
  try { localStorage.setItem('calcolapizza.lang', next); } catch {}
  render();
  if (typeof writeUrl === 'function' && location.search !== undefined && document.readyState !== 'loading') writeUrl();
}

const onEdit = () => { render(); saveInputs(); writeUrl(); };
for (const el of document.querySelectorAll('input')) {
  el.addEventListener('input', onEdit);
  el.addEventListener('change', onEdit);
}
$id('resetBtn').addEventListener('click', () => { resetInputs(); writeUrl(); });

$id('copyLinkBtn').addEventListener('click', async () => {
  writeUrl();
  const ok = await copyText(location.href);
  if (ok) toast(STRINGS[lang].copiedLink);
  else showManualCopy(location.href);
});
$id('copyRecipeBtn').addEventListener('click', async () => {
  if (!render.lastResult) return;
  const text = recipeText(render.lastResult, readInputs());
  const ok = await copyText(text);
  if (ok) toast(STRINGS[lang].copiedRecipe);
  else showManualCopy(text);
});
for (const button of document.querySelectorAll('[data-lang]')) {
  button.addEventListener('click', () => applyLanguage(button.dataset.lang));
}

const saved = (() => { try { return localStorage.getItem('calcolapizza.lang'); } catch { return null; } })();
const langFromUrl = new URLSearchParams(location.search).get('l');
const preferred = (navigator.language || 'en').toLowerCase();
const detected = preferred.startsWith('da') ? 'da' : preferred.startsWith('de') ? 'de' : 'en';
const initial =
  langFromUrl && STRINGS[langFromUrl]
    ? langFromUrl
    : saved && STRINGS[saved]
      ? saved
      : detected;

// A shared link wins over whatever this browser remembered last.
const urlState = stateFromUrl();
if (urlState) applyState(urlState);
else restoreInputs();

applyLanguage(initial);
writeUrl();
