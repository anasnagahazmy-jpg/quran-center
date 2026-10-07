'use strict';
/* =====================================================
   دار أهل القرآن — موقع كامل (واجهة + لوحة تحكم)
   التخزين: localStorage داخل المتصفح (بدون خادم)
   ===================================================== */

/* ---------- أدوات عامة ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const thisMonth = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);
const safeImg = s => (typeof s === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(s)) ? s : '';

const DB = {
  get(k, d) { try { const v = localStorage.getItem('dq_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) {
    try { localStorage.setItem('dq_' + k, JSON.stringify(v)); return true; }
    catch { toast('تعذّر الحفظ: مساحة التخزين ممتلئة (قلّل حجم الصور)', 'err'); return false; }
  }
};
const S = () => DB.get('settings', {});

function toast(m, t) {
  const e = $('#toast');
  e.textContent = m; e.className = 'toast show ' + (t || '');
  clearTimeout(toast.t); toast.t = setTimeout(() => e.className = 'toast', 2800);
}

/* ---------- تشفير كلمة المرور (SHA-256 مع بديل بسيط) ---------- */
async function hash(pw) {
  const str = 'dq:' + pw;
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; for (const c of str) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'x' + h;
}

/* ---------- بيانات مبدئية (أمثلة قابلة للحذف من لوحة التحكم) ---------- */
function seed() {
  if (DB.get('seeded')) return;
  DB.set('settings', {
    name: 'دار أهل القرآن',
    welcome: 'أهلاً بكم في دار أهل القرآن، حيث نصحب أبناءنا في رحلة حفظ كتاب الله وتعلّم أخلاقه.',
    about: 'دار أهل القرآن مؤسسة لتحفيظ القرآن الكريم وتعليم أحكام التجويد للأطفال والشباب، بإشراف معلمين مجازين، وبرامج متابعة وتقييم شهري ومسابقات تحفيزية.',
    phone: '01000000000', whatsapp: '201000000000', email: 'info@example.com',
    address: 'المنصورة، الدقهلية، مصر', map: 'المنصورة، الدقهلية، مصر', adminHash: null
  });
  DB.set('teachers', [
    { id: uid(), name: 'الشيخ محمد أحمد (مثال)', bio: 'معلم تجويد وتحفيظ، يهتم بتأسيس الطلاب على التلاوة الصحيحة.', qual: 'إجازة في رواية حفص عن عاصم', exp: 10 },
    { id: uid(), name: 'الأستاذة فاطمة علي (مثال)', bio: 'مشرفة على حلقات البنات والأطفال.', qual: 'بكالوريوس دراسات إسلامية', exp: 6 }
  ]);
  DB.set('courses', [
    { id: uid(), title: 'تحفيظ القرآن — حلقات جماعية', type: 'مجموعة', schedule: 'السبت إلى الأربعاء بعد العصر', levels: 'تمهيدي – متوسط – متقدم', fee: '' },
    { id: uid(), title: 'تحفيظ القرآن — دروس خاصة', type: 'خاص', schedule: 'حسب الاتفاق', levels: 'جميع المستويات', fee: '200 ج شهرياً' }
  ]);
  DB.set('contests', [
    { id: uid(), title: 'مسابقة شهر رمضان', status: 'قادمة', cond: 'أن يكون الطالب مسجلاً في الدار.\nحفظ المقرر المحدد قبل موعد الاختبار.', prizes: 'جوائز نقدية وهدايا قيّمة للأوائل.', results: '' },
    { id: uid(), title: 'مسابقة الإجازة الصيفية', status: 'قادمة', cond: 'الالتزام بالحضور طوال فترة المسابقة.', prizes: 'شهادات تقدير وهدايا.', results: '' }
  ]);
  DB.set('news', [
    { id: uid(), title: 'بدء التسجيل للفصل الجديد', date: today(), body: 'يسعدنا استقبال طلبات الالتحاق بحلقات التحفيظ. سارعوا بالتسجيل من صفحة التسجيل.' }
  ]);
  DB.set('seeded', 1);
}

/* ---------- المسار (Router) ---------- */
const pages = ['home', 'goals', 'courses', 'contests', 'register', 'teachers', 'evaluations', 'contact', 'admin'];
function route() {
  const h = (location.hash || '#home').slice(1);
  const p = pages.includes(h) ? h : 'home';
  $$('.page').forEach(e => e.hidden = e.id !== 'page-' + p);
  $$('.nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + p));
  $('#nav').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false');
  ({ home: rHome, courses: rCourses, contests: rContests, teachers: rTeachers, evaluations: rEval, contact: rContact, admin: rAdmin }[p] || (() => {}))();
  window.scrollTo(0, 0);
}

/* =====================================================
   الصفحات العامة
   ===================================================== */
function rHome() {
  const s = S();
  $('#heroName').textContent = s.name; $('#welcome').textContent = s.welcome; $('#about').textContent = s.about;
  const g = DB.get('gallery', []).filter(x => safeImg(x.src));
  $('#gallery').innerHTML = g.length
    ? g.map((x, i) => `<figure data-i="${i}"><img loading="lazy" src="${x.src}" alt="${esc(x.cap)}">${x.cap ? `<figcaption>${esc(x.cap)}</figcaption>` : ''}</figure>`).join('')
    : Array(6).fill('<div class="ph">﷽</div>').join('');
  const news = DB.get('news', []).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  $('#newsList').innerHTML = news.map(n => `<article class="card"><span class="date">📅 ${esc(n.date)}</span><h3>${esc(n.title)}</h3><p class="pre">${esc(n.body)}</p></article>`).join('') || '<p class="center">لا توجد أخبار حالياً.</p>';
}

function rCourses() {
  const c = DB.get('courses', []);
  $('#coursesList').innerHTML = c.map(x => `<article class="card"><span class="badge ${x.type === 'خاص' ? 'gold' : ''}">${esc(x.type)}</span><h3>${esc(x.title)}</h3><p>🕒 ${esc(x.schedule)}</p><p>📊 ${esc(x.levels)}</p><p>💰 ${esc(x.fee) || 'مجاني'}</p></article>`).join('') || '<p class="center">لا توجد دورات حالياً.</p>';
  $('#coursesTable').innerHTML = `<thead><tr><th>الدورة</th><th>النوع</th><th>المواعيد</th><th>المستويات</th><th>الرسوم</th></tr></thead><tbody>${c.map(x => `<tr><td>${esc(x.title)}</td><td>${esc(x.type)}</td><td>${esc(x.schedule)}</td><td>${esc(x.levels)}</td><td>${esc(x.fee) || 'مجاني'}</td></tr>`).join('')}</tbody>`;
}

function rContests() {
  const c = DB.get('contests', []);
  const cls = { 'قادمة': 'gold', 'جارية': '', 'منتهية': 'red' };
  $('#contestsList').innerHTML = c.map(x => `<article class="card"><span class="badge ${cls[x.status] || ''}">${esc(x.status)}</span><h3>🏆 ${esc(x.title)}</h3>
    <p><b>شروط الاشتراك:</b></p><p class="pre">${esc(x.cond)}</p>
    <p><b>الجوائز:</b></p><p class="pre">${esc(x.prizes)}</p>
    <p><b>النتائج:</b></p><p class="pre">${esc(x.results) || 'ستُعلن لاحقاً'}</p></article>`).join('') || '<p class="center">لا توجد مسابقات حالياً.</p>';
}

function rTeachers() {
  const t = DB.get('teachers', []);
  $('#teachersList').innerHTML = t.map(x => `<article class="card center"><div class="avatar" style="margin-inline:auto">${esc((x.name || '؟').trim().charAt(0))}</div><h3>${esc(x.name)}</h3><p class="pre">${esc(x.bio)}</p><p>🎓 ${esc(x.qual)}</p><p>⏳ خبرة ${esc(x.exp)} سنوات</p></article>`).join('') || '<p class="center">لا يوجد معلمون مسجلون.</p>';
}

const gradeOf = v => v >= 9 ? 'ممتاز' : v >= 8 ? 'جيد جداً' : v >= 6.5 ? 'جيد' : v >= 5 ? 'مقبول' : 'يحتاج متابعة';
const bar = v => `<div class="num"><b>${esc(v)}</b><div class="bar-s" style="flex:1"><i style="width:${Math.min(100, Math.max(0, v * 10))}%"></i></div></div>`;

function rEval() {
  const m = $('#evMonth');
  if (!m.value) m.value = thisMonth();
  m.onchange = rEval;
  const month = m.value;
  const list = DB.get('evals', []).filter(e => e.month === month).sort((a, b) => b.overall - a.overall);
  $('#evTable').innerHTML = `<thead><tr><th>#</th><th>اسم الطالب</th><th>الالتزام بالحضور</th><th>الالتزام بالأخلاق</th><th>الالتزام بالدراسة</th><th>التقييم العام</th></tr></thead><tbody>${
    list.map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.student)}</td><td>${bar(e.attend)}</td><td>${bar(e.ethics)}</td><td>${bar(e.study)}</td><td>${bar(e.overall)}<span class="badge">${gradeOf(e.overall)}</span></td></tr>`).join('') || '<tr><td colspan="6" class="center">لا توجد تقييمات لهذا الشهر.</td></tr>'}</tbody>`;
  const a = (DB.get('awards', {}))[month];
  const box = $('#awardsBox');
  if (!a || !(a.boy || a.girl || a.mem || a.com || a.ideal)) { box.innerHTML = ''; return; }
  const item = (t, v, cls = '') => v ? `<div class="award ${cls}"><small>${t}</small><b>${esc(v)}</b></div>` : '';
  box.innerHTML = `<div class="awards">${item('🌟 أفضل طالب للشهر', a.boy)}${item('🌟 أفضل طالبة للشهر', a.girl)}${item('📖 الطالب الأكثر حفظًا', a.mem)}${item('🤝 الطالب الأكثر التزامًا', a.com)}${item('👑 الطالب المثالي', a.ideal, 'ideal')}</div>
    ${a.congrats ? `<p class="congrats">${esc(a.congrats)}</p>` : ''}${safeImg(a.photo) ? `<img class="award-photo" src="${a.photo}" alt="صورة التكريم">` : ''}`;
}

function rContact() {
  const s = S();
  $('#contactInfo').innerHTML = `
    <div class="ci">📞 <a href="tel:${esc(s.phone)}" dir="ltr">${esc(s.phone)}</a></div>
    <div class="ci">💬 <a href="https://wa.me/${esc(s.whatsapp)}" target="_blank" rel="noopener">تواصل عبر واتساب</a></div>
    <div class="ci">✉️ <a href="mailto:${esc(s.email)}">${esc(s.email)}</a></div>
    <div class="ci">📍 ${esc(s.address)}</div>`;
  const f = $('#mapFrame'); const src = 'https://www.google.com/maps?q=' + encodeURIComponent(s.map || s.address || '') + '&output=embed';
  if (f.getAttribute('src') !== src) f.setAttribute('src', src);
}

/* ---------- النماذج العامة ---------- */
const phoneOk = v => /^\+?[0-9\s-]{8,16}$/.test(v.trim());
function setMsg(id, text, ok) { const e = $(id); e.textContent = text; e.className = 'msg ' + (ok ? 'ok' : 'err'); }

function bindPublicForms() {
  $('#regForm').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    if (f.website.value) return;                      // فخ للروبوتات
    const d = Object.fromEntries(new FormData(f));
    if (d.name.trim().length < 6) return setMsg('#regMsg', 'من فضلك اكتب الاسم بالكامل', 0);
    if (!(+d.age >= 3 && +d.age <= 70)) return setMsg('#regMsg', 'العمر غير صحيح', 0);
    if (!d.gender || !d.study || !d.stage) return setMsg('#regMsg', 'من فضلك أكمل جميع الحقول', 0);
    if (!phoneOk(d.phone)) return setMsg('#regMsg', 'رقم الهاتف غير صحيح', 0);
    const regs = DB.get('regs', []);
    regs.unshift({ id: uid(), date: today(), name: d.name.trim(), age: +d.age, gender: d.gender, study: d.study, stage: d.stage, phone: d.phone.trim(), email: (d.email || '').trim(), status: 'جديد' });
    if (DB.set('regs', regs)) { f.reset(); setMsg('#regMsg', 'تم إرسال طلبك بنجاح، سنتواصل مع ولي الأمر قريباً بإذن الله 🌙', 1); }
  });
  $('#contactForm').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    if (f.website.value) return;
    const d = Object.fromEntries(new FormData(f));
    if (!d.name.trim() || !d.text.trim()) return setMsg('#contactMsg', 'من فضلك أكمل الحقول', 0);
    if (!phoneOk(d.phone)) return setMsg('#contactMsg', 'رقم الهاتف غير صحيح', 0);
    const m = DB.get('msgs', []); m.unshift({ id: uid(), date: today(), name: d.name.trim(), phone: d.phone.trim(), text: d.text.trim() });
    if (DB.set('msgs', m)) { f.reset(); setMsg('#contactMsg', 'تم إرسال رسالتك، شكراً لتواصلك معنا', 1); }
  });
  $('#gallery').addEventListener('click', e => {
    const fig = e.target.closest('figure'); if (!fig) return;
    const g = DB.get('gallery', []).filter(x => safeImg(x.src))[+fig.dataset.i];
    if (g) { $('#lightbox img').src = g.src; $('#lightbox').showModal(); }
  });
  $('#lbClose').onclick = () => $('#lightbox').close();
  $('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') e.target.close(); });
}

/* =====================================================
   لوحة التحكم
   ===================================================== */
const STAGES = ['ابتدائي', 'إعدادي', 'ثانوي', 'جامعة'];
const courseTitles = () => DB.get('courses', []).map(c => c.title);
const studentNames = () => DB.get('students', []).map(s => s.name);

const ENT = {
  students: { t: 'الطلاب', cols: ['name', 'gender', 'age', 'stage', 'phone', 'course'], f: [
    { k: 'name', l: 'الاسم بالكامل', req: 1 },
    { k: 'gender', l: 'النوع', t: 'select', o: ['ذكر', 'أنثى'] },
    { k: 'age', l: 'العمر', t: 'number' },
    { k: 'study', l: 'نوع الدراسة', t: 'select', o: ['أزهر', 'عام'] },
    { k: 'stage', l: 'المرحلة الدراسية', t: 'select', o: STAGES },
    { k: 'phone', l: 'هاتف ولي الأمر', t: 'tel' },
    { k: 'email', l: 'البريد الإلكتروني', t: 'email' },
    { k: 'course', l: 'الدورة', t: 'select', o: courseTitles }] },
  teachers: { t: 'المعلمون', cols: ['name', 'qual', 'exp'], f: [
    { k: 'name', l: 'الاسم', req: 1 }, { k: 'bio', l: 'نبذة تعريفية', t: 'textarea' },
    { k: 'qual', l: 'المؤهل العلمي' }, { k: 'exp', l: 'سنوات الخبرة', t: 'number' }] },
  courses: { t: 'الدورات', cols: ['title', 'type', 'schedule', 'levels', 'fee'], f: [
    { k: 'title', l: 'اسم الدورة', req: 1 }, { k: 'type', l: 'النوع', t: 'select', o: ['مجموعة', 'خاص'] },
    { k: 'schedule', l: 'المواعيد' }, { k: 'levels', l: 'المستويات' }, { k: 'fee', l: 'رسوم الاشتراك (اتركه فارغاً إن لم توجد)' }] },
  contests: { t: 'المسابقات', cols: ['title', 'status'], f: [
    { k: 'title', l: 'اسم المسابقة', req: 1 }, { k: 'status', l: 'الحالة', t: 'select', o: ['قادمة', 'جارية', 'منتهية'] },
    { k: 'cond', l: 'شروط الاشتراك', t: 'textarea' }, { k: 'prizes', l: 'الجوائز', t: 'textarea' }, { k: 'results', l: 'النتائج', t: 'textarea' }] },
  news: { t: 'الأخبار والإعلانات', cols: ['title', 'date'], f: [
    { k: 'title', l: 'العنوان', req: 1 }, { k: 'date', l: 'التاريخ', t: 'date', def: today }, { k: 'body', l: 'النص', t: 'textarea' }] },
  evals: { t: 'التقييمات الشهرية', cols: ['month', 'student', 'attend', 'ethics', 'study', 'overall', 'pages'],
    pre: o => { o.overall = +(((+o.attend) + (+o.ethics) + (+o.study)) / 3).toFixed(1); return o; },
    f: [
    { k: 'month', l: 'الشهر', t: 'month', req: 1, def: thisMonth },
    { k: 'student', l: 'اسم الطالب', req: 1, list: studentNames },
    { k: 'attend', l: 'الالتزام بالحضور (0–10)', t: 'number', min: 0, max: 10, step: .5, req: 1 },
    { k: 'ethics', l: 'الالتزام بالأخلاق (0–10)', t: 'number', min: 0, max: 10, step: .5, req: 1 },
    { k: 'study', l: 'الالتزام بالدراسة (0–10)', t: 'number', min: 0, max: 10, step: .5, req: 1 },
    { k: 'pages', l: 'عدد الصفحات المحفوظة هذا الشهر', t: 'number', min: 0 }] }
};
const LBL = { month: 'الشهر', student: 'الطالب', attend: 'الحضور', ethics: 'الأخلاق', study: 'الدراسة', overall: 'التقييم العام', pages: 'الصفحات' };
const fl = (E, k) => (E.f.find(x => x.k === k) || {}).l?.replace(/\s*\(.*\)/, '') || LBL[k] || k;

/* --- الدخول --- */
const authOk = () => { const t = +sessionStorage.getItem('dq_auth'); return t && Date.now() - t < 2 * 3600e3; };
let tries = 0, lockUntil = 0;

let tab = 'students';
const TABS = [['students', 'الطلاب'], ['regs', 'التسجيلات'], ['teachers', 'المعلمون'], ['courses', 'الدورات'], ['contests', 'المسابقات'], ['news', 'الأخبار والإعلانات'], ['gallery', 'الصور'], ['evals', 'التقييمات الشهرية'], ['awards', 'المكرَّمون'], ['notify', 'الإشعارات'], ['reports', 'التقارير'], ['msgs', 'الرسائل'], ['settings', 'الإعدادات']];

function rAdmin() {
  const root = $('#adminRoot');
  if (!authOk()) {
    root.innerHTML = `<form class="form card login" id="loginForm"><h2 class="center" style="margin:0;color:var(--g)">🔐 تسجيل الدخول</h2>
      <label>اسم المستخدم<input name="u" required autocomplete="username" dir="ltr"></label>
      <label>كلمة المرور<input name="p" type="password" required autocomplete="current-password" dir="ltr"></label>
      <button class="btn" type="submit">دخول</button><p class="msg err" id="loginMsg"></p></form>`;
    $('#loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      if (Date.now() < lockUntil) return $('#loginMsg').textContent = 'محاولات كثيرة، انتظر دقيقة ثم أعد المحاولة';
      const f = e.target, st = S();
      const h = await hash(f.p.value);
      if (f.u.value.trim() === 'admin' && h === st.adminHash) { sessionStorage.setItem('dq_auth', Date.now()); tries = 0; rAdmin(); }
      else { if (++tries >= 5) { lockUntil = Date.now() + 60000; tries = 0; } $('#loginMsg').textContent = 'بيانات الدخول غير صحيحة'; }
    });
    return;
  }
  root.innerHTML = `<div class="dash"><aside class="side">${TABS.map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}<button class="out" id="logout">تسجيل الخروج</button></aside><section id="dashMain"></section></div>`;
  $$('.side [data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; rAdmin(); });
  $('#logout').onclick = () => { sessionStorage.removeItem('dq_auth'); rAdmin(); };
  ({ regs: vRegs, gallery: vGallery, awards: vAwards, notify: vNotify, reports: vReports, msgs: vMsgs, settings: vSettings }[tab] || (() => crudView(tab)))();
}

/* --- نافذة النموذج العامة --- */
function openForm(title, fields, vals, onSave) {
  const f = $('#mform');
  f.innerHTML = `<h3>${esc(title)}</h3>` + fields.map(x => {
    const v = vals[x.k] ?? (x.def ? x.def() : '');
    const o = typeof x.o === 'function' ? x.o() : x.o;
    let inp;
    if (x.t === 'textarea') inp = `<textarea name="${x.k}" rows="3">${esc(v)}</textarea>`;
    else if (x.t === 'select') inp = `<select name="${x.k}" ${x.req ? 'required' : ''}><option value="">—</option>${o.map(i => `<option ${i === v ? 'selected' : ''}>${esc(i)}</option>`).join('')}</select>`;
    else inp = `<input name="${x.k}" type="${x.t || 'text'}" value="${esc(v)}" ${x.req ? 'required' : ''} ${x.min !== undefined ? `min="${x.min}"` : ''} ${x.max !== undefined ? `max="${x.max}"` : ''} ${x.step ? `step="${x.step}"` : ''} ${x.list ? `list="dl_${x.k}"` : ''}>${x.list ? `<datalist id="dl_${x.k}">${x.list().map(i => `<option value="${esc(i)}">`).join('')}</datalist>` : ''}`;
    return `<label>${esc(x.l)}${inp}</label>`;
  }).join('') + `<div class="btns"><button type="button" class="btn ghost" id="mc">إلغاء</button><button class="btn" type="submit">حفظ</button></div>`;
  $('#mc').onclick = () => $('#modal').close();
  f.onsubmit = e => { e.preventDefault(); if (!f.reportValidity()) return; onSave(Object.fromEntries(new FormData(f))); $('#modal').close(); };
  $('#modal').showModal();
}

/* --- CRUD عام --- */
const Q = {};
function crudView(key) {
  const E = ENT[key], box = $('#dashMain'), q = (Q[key] || '').trim();
  const list = DB.get(key, []);
  const shown = q ? list.filter(r => JSON.stringify(r).includes(q)) : list;
  box.innerHTML = `<div class="bar"><h2>${E.t} <small>(${list.length})</small></h2><input id="q" type="search" placeholder="بحث ثم Enter" value="${esc(q)}"><button class="btn" id="add">+ إضافة</button></div>
    <div class="tw"><table><thead><tr>${E.cols.map(c => `<th>${esc(fl(E, c))}</th>`).join('')}<th></th></tr></thead><tbody>${
    shown.map(r => `<tr>${E.cols.map(c => `<td>${esc(r[c] ?? '')}</td>`).join('')}<td class="act"><button data-e="${r.id}">تعديل</button><button data-d="${r.id}" class="danger">حذف</button></td></tr>`).join('') || '<tr><td colspan="99" class="center">لا توجد بيانات</td></tr>'}</tbody></table></div>`;
  $('#q').onchange = e => { Q[key] = e.target.value; crudView(key); };
  const save = (old, d) => {
    let o = { ...(old || { id: uid() }), ...d }; if (E.pre) o = E.pre(o);
    const all = DB.get(key, []); const i = all.findIndex(x => x.id === o.id);
    i >= 0 ? all[i] = o : all.unshift(o);
    if (DB.set(key, all)) { toast('تم الحفظ'); crudView(key); }
  };
  $('#add').onclick = () => openForm('إضافة — ' + E.t, E.f, {}, d => save(null, d));
  $$('[data-e]', box).forEach(b => b.onclick = () => { const r = list.find(x => x.id === b.dataset.e); openForm('تعديل — ' + E.t, E.f, r, d => save(r, d)); });
  $$('[data-d]', box).forEach(b => b.onclick = () => { if (confirm('هل تريد الحذف نهائياً؟')) { DB.set(key, list.filter(x => x.id !== b.dataset.d)); toast('تم الحذف'); crudView(key); } });
}

/* --- التسجيلات --- */
function vRegs() {
  const list = DB.get('regs', []), box = $('#dashMain'), st = ['جديد', 'تم التواصل', 'مقبول', 'مرفوض'];
  box.innerHTML = `<div class="bar"><h2>طلبات التسجيل <small>(${list.length})</small></h2></div><div class="tw"><table><thead><tr><th>التاريخ</th><th>الاسم</th><th>العمر</th><th>الدراسة</th><th>المرحلة</th><th>الهاتف</th><th>الحالة</th><th></th></tr></thead><tbody>${
    list.map(r => `<tr><td>${esc(r.date)}</td><td>${esc(r.name)}</td><td>${esc(r.age)}</td><td>${esc(r.study)}</td><td>${esc(r.stage)}</td><td dir="ltr">${esc(r.phone)}</td>
    <td><select data-s="${r.id}">${st.map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    <td class="act"><button data-c="${r.id}">تحويل لطالب</button><a class="btn sm ghost" target="_blank" rel="noopener" href="https://wa.me/${waNum(r.phone)}">واتساب</a><button data-d="${r.id}" class="danger">حذف</button></td></tr>`).join('') || '<tr><td colspan="8" class="center">لا توجد طلبات</td></tr>'}</tbody></table></div>`;
  $$('[data-s]', box).forEach(s => s.onchange = () => { const a = DB.get('regs', []); a.find(x => x.id === s.dataset.s).status = s.value; DB.set('regs', a); toast('تم تحديث الحالة'); });
  $$('[data-d]', box).forEach(b => b.onclick = () => { if (confirm('حذف الطلب؟')) { DB.set('regs', list.filter(x => x.id !== b.dataset.d)); vRegs(); } });
  $$('[data-c]', box).forEach(b => b.onclick = () => {
    const r = list.find(x => x.id === b.dataset.c), stu = DB.get('students', []);
    stu.unshift({ id: uid(), name: r.name, gender: r.gender, age: r.age, study: r.study, stage: r.stage, phone: r.phone, email: r.email, course: '' });
    DB.set('students', stu); r.status = 'مقبول'; DB.set('regs', list); toast('تمت إضافته إلى الطلاب'); vRegs();
  });
}

/* --- الصور --- */
function resizeImg(file, max = 900) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .72));
    };
    img.onerror = () => rej(); img.src = url;
  });
}
function vGallery() {
  const g = DB.get('gallery', []), box = $('#dashMain');
  box.innerHTML = `<div class="panel"><h3>رفع الصور</h3><p class="hint">تُضغط الصور تلقائياً لتوفير المساحة.</p><label>التعليق (اختياري)<input id="gcap"></label><br><input type="file" id="gfile" accept="image/*" multiple></div>
    <div class="thumbs">${g.map(x => `<div><img src="${safeImg(x.src)}" alt="${esc(x.cap)}"><button class="btn sm danger" data-d="${x.id}">حذف</button></div>`).join('')}</div>`;
  $('#gfile').onchange = async e => {
    const arr = DB.get('gallery', []);
    for (const f of e.target.files) { try { arr.push({ id: uid(), cap: $('#gcap').value.trim(), src: await resizeImg(f) }); } catch { toast('ملف غير صالح', 'err'); } }
    if (DB.set('gallery', arr)) { toast('تم رفع الصور'); vGallery(); }
  };
  $$('[data-d]', box).forEach(b => b.onclick = () => { DB.set('gallery', g.filter(x => x.id !== b.dataset.d)); vGallery(); });
}

/* --- المكرَّمون (الطالب والطالبة المثاليان) --- */
let awMonth = thisMonth();
function vAwards() {
  const box = $('#dashMain'), all = DB.get('awards', {}), a = all[awMonth] || {};
  const fields = [['boy', 'أفضل طالب للشهر'], ['girl', 'أفضل طالبة للشهر'], ['mem', 'الطالب الأكثر حفظًا'], ['com', 'الطالب الأكثر التزامًا'], ['ideal', 'الطالب المثالي']];
  box.innerHTML = `<div class="panel"><h3>اختيار المكرَّمين</h3><form class="form" id="awForm">
    <label>الشهر<input type="month" id="awM" value="${awMonth}"></label>
    <datalist id="dlS">${studentNames().map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    ${fields.map(([k, l]) => `<label>${l}<input name="${k}" list="dlS" value="${esc(a[k] || '')}"></label>`).join('')}
    <label>عبارة التهنئة<textarea name="congrats" rows="2">${esc(a.congrats || 'بارك الله فيكم ونفع بكم، وجعل القرآن ربيع قلوبكم 🌙')}</textarea></label>
    <label>صورة التكريم (اختياري)<input type="file" id="awPhoto" accept="image/*"></label>
    ${safeImg(a.photo) ? `<img src="${a.photo}" style="max-width:220px;border-radius:10px" alt="">` : ''}
    <div class="chips"><button class="btn gold" type="button" id="auto">اقتراح تلقائي من التقييمات</button><button class="btn" type="submit">حفظ</button></div></form></div>`;
  $('#awM').onchange = e => { awMonth = e.target.value; vAwards(); };
  $('#auto').onclick = () => {
    const ev = DB.get('evals', []).filter(e => e.month === awMonth), stu = DB.get('students', []);
    if (!ev.length) return toast('لا توجد تقييمات لهذا الشهر', 'err');
    const top = (arr, k) => arr.length ? arr.reduce((m, x) => (+x[k] > +m[k] ? x : m)).student : '';
    const g = t => ev.filter(e => (stu.find(s => s.name === e.student) || {}).gender === t);
    const set = (k, v) => { const i = $(`[name=${k}]`); if (i && v) i.value = v; };
    set('boy', top(g('ذكر'), 'overall')); set('girl', top(g('أنثى'), 'overall'));
    set('mem', top(ev, 'pages')); set('com', top(ev, 'attend')); set('ideal', top(ev, 'overall'));
    toast('تم الاقتراح — راجع الأسماء ثم احفظ');
  };
  $('#awForm').onsubmit = async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target)); delete d.undefined;
    const o = { ...a }; [...fields.map(f => f[0]), 'congrats'].forEach(k => o[k] = (d[k] || '').trim());
    const file = $('#awPhoto').files[0]; if (file) { try { o.photo = await resizeImg(file, 800); } catch { } }
    all[awMonth] = o; if (DB.set('awards', all)) { toast('تم حفظ التكريم'); vAwards(); }
  };
}

/* --- الإشعارات (واتساب / بريد) --- */
const waNum = p => { let n = String(p).replace(/\D/g, ''); if (n.startsWith('00')) n = n.slice(2); else if (n.startsWith('0')) n = '20' + n.slice(1); return n; };
function vNotify() {
  const box = $('#dashMain');
  box.innerHTML = `<div class="panel"><h3>إرسال إشعار</h3><p class="hint">يمكنك استخدام {name} في الرسالة ليُستبدل باسم الطالب. يُفتح واتساب برسالة جاهزة لكل ولي أمر، والبريد عبر تطبيق البريد لديك.</p>
    <label>المستلمون<select id="nAud"><option value="students">جميع الطلاب</option><option value="regs">طلبات التسجيل الجديدة</option></select></label>
    <label>نص الرسالة<textarea id="nMsg" rows="4">السلام عليكم ورحمة الله، ولي أمر الطالب {name}: </textarea></label>
    <div class="chips"><button class="btn" id="nGo">تجهيز الرسائل</button><button class="btn gold" id="nMail">إرسال بريد للجميع</button></div></div><div id="nOut"></div>`;
  const rec = () => $('#nAud').value === 'students' ? DB.get('students', []) : DB.get('regs', []).filter(r => r.status === 'جديد');
  $('#nGo').onclick = () => {
    const msg = $('#nMsg').value, r = rec().filter(x => x.phone);
    $('#nOut').innerHTML = `<div class="tw"><table><thead><tr><th>الاسم</th><th>الهاتف</th><th></th></tr></thead><tbody>${r.map(x => `<tr><td>${esc(x.name)}</td><td dir="ltr">${esc(x.phone)}</td><td><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${waNum(x.phone)}?text=${encodeURIComponent(msg.replace(/\{name\}/g, x.name))}">فتح واتساب</a></td></tr>`).join('') || '<tr><td colspan="3" class="center">لا يوجد مستلمون</td></tr>'}</tbody></table></div>`;
  };
  $('#nMail').onclick = () => {
    const mails = [...new Set(rec().map(x => x.email).filter(Boolean))];
    if (!mails.length) return toast('لا توجد عناوين بريد', 'err');
    location.href = `mailto:?bcc=${encodeURIComponent(mails.join(','))}&subject=${encodeURIComponent(S().name)}&body=${encodeURIComponent($('#nMsg').value.replace(/\{name\}/g, ''))}`;
  };
}

/* --- التقارير (Excel / PDF) --- */
const REP = {
  students: { t: 'الطلاب', h: ['الاسم', 'النوع', 'العمر', 'نوع الدراسة', 'المرحلة', 'هاتف ولي الأمر', 'الدورة'], k: ['name', 'gender', 'age', 'study', 'stage', 'phone', 'course'] },
  regs: { t: 'طلبات التسجيل', h: ['التاريخ', 'الاسم', 'العمر', 'نوع الدراسة', 'المرحلة', 'الهاتف', 'الحالة'], k: ['date', 'name', 'age', 'study', 'stage', 'phone', 'status'] },
  teachers: { t: 'المعلمون', h: ['الاسم', 'المؤهل', 'سنوات الخبرة'], k: ['name', 'qual', 'exp'] },
  evals: { t: 'التقييمات الشهرية', h: ['الشهر', 'الطالب', 'الحضور', 'الأخلاق', 'الدراسة', 'التقييم العام', 'الصفحات'], k: ['month', 'student', 'attend', 'ethics', 'study', 'overall', 'pages'] },
  courses: { t: 'الدورات', h: ['الدورة', 'النوع', 'المواعيد', 'المستويات', 'الرسوم'], k: ['title', 'type', 'schedule', 'levels', 'fee'] }
};
function vReports() {
  $('#dashMain').innerHTML = `<div class="panel"><h3>استخراج التقارير</h3><p class="hint">ملفات Excel تُحمَّل مباشرة. لتقرير PDF اختر «حفظ كـ PDF» من نافذة الطباعة.</p>
    <div class="tw"><table><tbody>${Object.entries(REP).map(([k, r]) => `<tr><td><b>${r.t}</b> (${DB.get(k, []).length})</td><td class="act"><button data-x="${k}">Excel</button><button data-p="${k}">PDF</button></td></tr>`).join('')}</tbody></table></div></div>`;
  $$('[data-x]').forEach(b => b.onclick = () => exportXlsx(b.dataset.x));
  $$('[data-p]').forEach(b => b.onclick = () => exportPdf(b.dataset.p));
}
const repRows = k => DB.get(k, []).map(r => REP[k].k.map(c => r[c] ?? ''));
function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
async function exportXlsx(k) {
  const R = REP[k], data = [R.h, ...repRows(k)], name = `${R.t}-${today()}`;
  try {
    if (!window.XLSX) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), R.t.slice(0, 30));
    wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, name + '.xlsx');
  } catch {                                   // بديل: CSV يفتح في Excel
    const csv = '\ufeff' + data.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name + '.csv'; a.click();
  }
}
function exportPdf(k) {
  const R = REP[k], w = window.open('', '_blank'); if (!w) return toast('اسمح بالنوافذ المنبثقة', 'err');
  w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(R.t)}</title><style>body{font-family:Cairo,Tahoma,sans-serif;padding:20px}h1{color:#0f5c3a;text-align:center}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:6px;text-align:right}th{background:#0f5c3a;color:#fff}</style></head><body><h1>${esc(S().name)} — ${esc(R.t)}</h1><p>التاريخ: ${today()}</p><table><thead><tr>${R.h.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${repRows(k).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table><script>onload=()=>setTimeout(print,300)<\/script></body></html>`);
  w.document.close();
}

/* --- الرسائل --- */
function vMsgs() {
  const m = DB.get('msgs', []), box = $('#dashMain');
  box.innerHTML = `<div class="bar"><h2>رسائل التواصل <small>(${m.length})</small></h2></div><div class="grid">${m.map(x => `<article class="card"><span class="date">${esc(x.date)}</span><h3>${esc(x.name)}</h3><p dir="ltr" style="text-align:right">${esc(x.phone)}</p><p class="pre" style="color:var(--tx)">${esc(x.text)}</p><div class="chips"><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${waNum(x.phone)}">رد عبر واتساب</a><button class="btn sm danger" data-d="${x.id}">حذف</button></div></article>`).join('') || '<p>لا توجد رسائل.</p>'}</div>`;
  $$('[data-d]', box).forEach(b => b.onclick = () => { DB.set('msgs', m.filter(x => x.id !== b.dataset.d)); vMsgs(); });
}

/* --- الإعدادات --- */
function vSettings() {
  const s = S(), box = $('#dashMain');
  const F = [['name', 'اسم الدار'], ['welcome', 'الرسالة الترحيبية'], ['about', 'نبذة عن الدار'], ['phone', 'رقم الهاتف'], ['whatsapp', 'رقم واتساب بصيغة دولية (مثال 201000000000)'], ['email', 'البريد الإلكتروني'], ['address', 'العنوان'], ['map', 'موقع الدار للخريطة (عنوان أو إحداثيات)']];
  box.innerHTML = `<div class="panel"><h3>بيانات الدار</h3><form class="form" id="sForm">${F.map(([k, l]) => `<label>${l}${['welcome', 'about'].includes(k) ? `<textarea name="${k}" rows="3">${esc(s[k])}</textarea>` : `<input name="${k}" value="${esc(s[k])}">`}</label>`).join('')}<button class="btn" type="submit">حفظ</button></form></div>
    <div class="panel"><h3>تغيير كلمة المرور</h3><form class="form" id="pForm"><label>كلمة المرور الجديدة (8 أحرف على الأقل)<input name="p" type="password" minlength="8" required dir="ltr" autocomplete="new-password"></label><button class="btn" type="submit">تغيير</button></form></div>
    <div class="panel"><h3>نسخة احتياطية</h3><div class="chips"><button class="btn" id="bk">تحميل نسخة (JSON)</button><label class="btn ghost" style="display:inline-block">استعادة نسخة<input type="file" id="rs" accept=".json" hidden></label><button class="btn danger" id="rst">مسح كل البيانات</button></div></div>`;
  $('#sForm').onsubmit = e => { e.preventDefault(); const n = { ...S(), ...Object.fromEntries(new FormData(e.target)) }; DB.set('settings', n); brand(); toast('تم الحفظ'); };
  $('#pForm').onsubmit = async e => { e.preventDefault(); const n = S(); n.adminHash = await hash(e.target.p.value); DB.set('settings', n); e.target.reset(); toast('تم تغيير كلمة المرور'); };
  $('#bk').onclick = () => {
    const o = {}; Object.keys(localStorage).filter(k => k.startsWith('dq_')).forEach(k => o[k] = localStorage.getItem(k));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(o)], { type: 'application/json' })); a.download = `backup-${today()}.json`; a.click();
  };
  $('#rs').onchange = async e => {
    try { const o = JSON.parse(await e.target.files[0].text()); if (!confirm('سيتم استبدال البيانات الحالية. متابعة؟')) return;
      Object.entries(o).forEach(([k, v]) => k.startsWith('dq_') && k !== 'dq_auth' && localStorage.setItem(k, v)); toast('تمت الاستعادة'); brand(); vSettings(); }
    catch { toast('ملف غير صالح', 'err'); }
  };
  $('#rst').onclick = () => { if (confirm('سيتم مسح كل البيانات نهائياً. هل أنت متأكد؟')) { Object.keys(localStorage).filter(k => k.startsWith('dq_')).forEach(k => localStorage.removeItem(k)); sessionStorage.clear(); location.hash = '#home'; location.reload(); } };
}

/* =====================================================
   التشغيل
   ===================================================== */
function brand() { const n = S().name || 'دار أهل القرآن'; $('#brandName').textContent = n; $('#footName').textContent = n; document.title = n; }

async function init() {
  seed();
  const st = S();
  if (!st.adminHash) { st.adminHash = await hash('admin123'); DB.set('settings', st); }   // كلمة المرور المبدئية: admin123 — غيّرها فوراً
  $('#year').textContent = new Date().getFullYear();
  $('#burger').onclick = () => { const o = $('#nav').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o); };
  brand(); bindPublicForms();
  addEventListener('hashchange', route); route();
}
init();