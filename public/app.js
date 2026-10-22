import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { Haptics, NotificationType } from '@capacitor/haptics';

const $ = id => document.getElementById(id);
const native = Capacitor.isNativePlatform();
const apiOrigin = window.SALT_CONFIG?.apiOrigin || '';
const apiBase = apiOrigin + '/api/partners/';
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((cents || 0) / 100);
const date = value => value ? new Date(value.length === 10 ? value + 'T12:00:00Z' : value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: value.length === 10 ? 'UTC' : 'America/Indiana/Indianapolis' }) : '';
const labels = { booked: 'Pending delivery', creating: 'Confirming', needs_review: 'Needs review', earned: 'Ready for payout', paid: 'Paid', cancelled: 'Cancelled', requested: 'Requested', processing: 'Processing', shipped: 'Shipped', fulfilled: 'Fulfilled', pending: 'Awaiting approval', active: 'Verified', suspended: 'On hold' };
let config, me, selectedCompany, currentView, bookingStep = 1, quote, chosen;
let bookingId = crypto.randomUUID(), orderId = crypto.randomUUID();
const params = new URLSearchParams(location.search);
const deletionRequested = params.has('delete');
let invite = params.get('invite') || sessionStorage.getItem('salt_invite') || '';
let companyId = params.get('company') || sessionStorage.getItem('salt_company') || '';
if (invite) sessionStorage.setItem('salt_invite', invite);
if (companyId) sessionStorage.setItem('salt_company', companyId);
if (params.has('invite')) history.replaceState(null, '', location.pathname + (companyId ? '?company=' + encodeURIComponent(companyId) : ''));

async function api(path, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(apiBase + path, { method, credentials: 'include', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(native ? { 'X-Salt-Client': 'native' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(55000) });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || 'Please try again.'); error.status = response.status; throw error; }
  return data;
}
function el(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}
function status(target, message = '', error = false) {
  $(target).textContent = message;
  $(target).classList.toggle('error', error);
}
async function run(formOrButton, target, action) {
  const button = formOrButton.tagName === 'FORM' ? formOrButton.querySelector('button:not([type=button])') : formOrButton;
  if (button.disabled) return;
  const original = button.textContent;
  button.disabled = true; button.textContent = 'Please wait…'; status(target);
  try { await action(); }
  catch (error) {
    const message = error.name === 'TimeoutError' || error.name === 'TypeError' ? 'The connection was interrupted. Try again using this same request; do not start a duplicate booking.' : error.message;
    status(target, message, true);
    if (error.status === 401) {
      me = null;
      renderWelcome(selectedCompany);
      show('welcome');
      status('auth-status', 'Your session expired. Sign in again to continue.', true);
    }
  } finally { button.disabled = false; button.textContent = original; }
}
function show(view) {
  currentView = view;
  for (const section of $('main').children) if (section.tagName === 'SECTION') section.hidden = section.id !== view;
  $('loading').hidden = true;
  $('tabs').hidden = !me?.profile || ['welcome', 'gallery', 'onboarding'].includes(view);
  $('history-note').hidden = !me?.profile || me.historyReady || ['welcome', 'gallery', 'onboarding'].includes(view);
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'));
  window.scrollTo(0, 0);
  $('main').focus({ preventScroll: true });
}
function mediaPath(path) { return path.startsWith('/api/') ? apiOrigin + path : path; }
function renderGallery() {
  const grid = $('company-gallery'); grid.replaceChildren();
  for (const company of config.companies) {
    const tile = el('button', undefined, 'company-tile'); tile.type = 'button';
    if (company.logo) {
      const logo = document.createElement('img'); logo.src = mediaPath(company.logo); logo.alt = company.name + ' logo'; tile.append(logo);
    } else tile.append(el('span', company.name.split(/\s+/).map(v => v[0]).slice(0, 2).join(''), 'initial'));
    tile.append(el('strong', company.name), el('small', company.kind));
    tile.onclick = () => { selectedCompany = company; companyId = company.id; sessionStorage.setItem('salt_company', company.id); if (me && !me.profile) renderOnboarding(); else { renderWelcome(company); show('welcome'); } };
    grid.append(tile);
  }
}
function renderWelcome(company) {
  $('welcome-partner-name').textContent = company?.name || 'Simply Salt partners';
  $('bounty').textContent = money(company?.bountyCents || 2500);
  const logo = $('welcome-partner-logo'); logo.hidden = !company?.logo;
  if (company?.logo) { logo.src = mediaPath(company.logo); logo.alt = company.name + ' logo'; }
  $('company-photo').hidden = !company?.photo;
  if (company?.photo) {
    $('company-photo-image').src = company.photo.id ? apiBase + 'media/' + company.photo.id : company.photo.path;
    $('company-photo-caption').textContent = company.photo.caption;
    $('company-photo-image').alt = `${company.name} partnership sticker on a softener brine tank`;
  }
  $('send-code').disabled = !config.verificationReady;
  if (!config.verificationReady) status('auth-status', 'Verified sign-in is being prepared. Please contact Evan before registering.');
}
function renderOnboarding() {
  const select = $('company'); select.replaceChildren(new Option('Choose your company', ''));
  for (const c of config.companies) select.add(new Option(c.name, c.id));
  select.value = selectedCompany?.id || companyId;
  select.disabled = Boolean(selectedCompany);
  $('invite-code').value = invite;
  $('invite-status').textContent = selectedCompany ? `You’re registering with ${selectedCompany.name}.` : 'Choose the business you work for. Returning accounts keep their saved company.';
  show('onboarding');
}
function renderReferrals(target, refs) {
  const list = $(target); list.replaceChildren();
  if (!refs.length) { list.append(el('p', 'No referrals yet. Book a customer’s delivery to get started.', 'empty')); return; }
  for (const r of refs.slice().reverse()) {
    const row = el('article', undefined, 'referral'), left = el('div'), right = el('div', undefined, 'right');
    left.append(el('strong', r.customerName), el('small', 'Delivery ' + date(r.scheduledDate)));
    right.append(el('strong', money(r.bountyCents)), el('span', labels[r.status] || r.status, 'pill ' + r.status));
    row.append(left, right); list.append(row);
  }
}
function renderAccount() {
  const p = me.profile;
  $('company-name').textContent = p.company.name;
  $('greeting').textContent = `Hi, ${p.name.split(' ')[0]}.`;
  $('membership').textContent = labels[p.membership] || p.membership; $('membership').className = 'pill ' + p.membership;
  $('membership-note').hidden = p.membership === 'active';
  $('membership-note').textContent = p.membership === 'pending' ? 'Your phone is verified. Evan needs to approve your company membership before you can book or order stickers.' : 'Your company access is on hold. Contact Evan for help.';
  $('launch-note').hidden = me.bookingEnabled;
  $('start-booking').disabled = !me.bookingEnabled || p.membership !== 'active';
  $('payout-hint').textContent = p.payout ? `${p.payout.method === 'applecash' ? 'Apple Cash' : p.payout.method === 'zelle' ? 'Zelle' : 'Venmo'} · ${p.payout.handle}` : 'Choose Venmo, Zelle, or Apple Cash.';
  $('home-earned').textContent = money(me.totals.earned);
  $('earned').textContent = money(me.totals.earned); $('pending').textContent = money(me.totals.pending); $('paid').textContent = money(me.totals.paid);
  $('money-payout').textContent = p.payout ? 'Payout to ' + p.payout.handle : 'Add your payout details in Account so Evan can pay you.';
  renderReferrals('recent-referrals', me.referrals.slice(-3)); renderReferrals('referrals', me.referrals);
  $('account-company').textContent = p.company.name;
  $('edit-name').value = p.name; $('verified-phone').textContent = p.phone + ' · verified';
  $('payout-method').value = p.payout?.method || ''; $('payout-handle').value = p.payout?.handle || '';
  updatePayoutHint(); renderStickers();
}
function renderStickers() {
  const p = me.profile, design = p.company.design;
  $('no-design').hidden = Boolean(design); $('sticker-form').hidden = !design;
  if (design) {
    $('sticker-preview').src = apiBase + 'design/' + design.id;
    $('sticker-name').textContent = design.name;
    $('design-version').textContent = `Approved design · version ${design.version} · ${p.company.name}`;
    if (!$('ship-name').value) $('ship-name').value = p.name;
  }
  $('request-stickers').disabled = p.membership !== 'active';
  const list = $('orders'); list.replaceChildren();
  if (!me.orders.length) list.append(el('p', 'Your sticker requests will appear here.', 'empty'));
  for (const order of me.orders.slice().reverse()) {
    const node = el('article', undefined, 'order'), head = el('header');
    head.append(el('strong', order.quantity + ' stickers'), el('span', labels[order.status] || order.status, 'pill ' + order.status));
    node.append(head, el('p', order.design.name + ' · version ' + order.design.version + ' · $0'));
    if (order.shipping) node.append(el('p', `${order.shipping.street}, ${order.shipping.city}, ${order.shipping.state} ${order.shipping.zip}`));
    if (order.tracking) node.append(el('p', 'Tracking: ' + order.tracking));
    const history = el('ol');
    for (const h of order.history) history.append(el('li', (labels[h.status] || h.status) + ' · ' + date(h.at)));
    node.append(history); list.append(node);
  }
}
async function refresh() {
  me = await api('me');
  if (!me.profile) { renderOnboarding(); return; }
  selectedCompany = me.profile.company; companyId = selectedCompany.id;
  sessionStorage.removeItem('salt_invite'); invite = '';
  renderAccount();
}
function step(number) {
  bookingStep = number;
  for (const [index, item] of ['customer-form', 'delivery-step', 'confirm-form', 'booking-success'].entries()) $(item).hidden = index + 1 !== number;
  document.querySelectorAll('.steps li').forEach(li => { li.classList.toggle('current', Number(li.dataset.step) === Math.min(number, 3)); });
  status('booking-status'); window.scrollTo(0, 0);
}
function renderSlots(options) {
  const list = $('slots'); list.replaceChildren(); chosen = null; $('confirm-time').disabled = true;
  const sorted = me.profile.companyId === 'abode' ? options : options.slice().sort((a, b) => a.date.localeCompare(b.date));
  for (const day of sorted) {
    const section = el('article', undefined, 'slot-day' + (day.ideal ? ' ideal' : ''));
    section.append(el('h3', day.date_readable || date(day.date)));
    if (day.ideal) section.append(el('span', 'Recommended route day', 'pill active'));
    if (day.route_note) section.append(el('p', day.route_note));
    const buttons = el('div', undefined, 'slot-options');
    for (const [label, value] of day.open_day ? [['Open day', day.best]] : [['Best time', day.best], ['Before route', day.before_route], ['After route', day.after_route]]) {
      if (!value) continue;
      const button = el('button'); button.type = 'button'; button.setAttribute('aria-pressed', 'false');
      button.append(el('small', label), el('strong', value.window));
      if (value.note) button.append(el('small', value.note));
      button.onclick = () => {
        document.querySelectorAll('.slot-options button').forEach(b => b.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true'); chosen = { date: day.date, time: value.scheduled_time, window: value.window };
        $('confirm-time').disabled = false;
      };
      buttons.append(button);
    }
    section.append(buttons); list.append(section);
  }
}

$('phone-form').onsubmit = event => { event.preventDefault(); run(event.currentTarget, 'auth-status', async () => {
  await api('auth/start', { phone: $('phone').value, consent: $('sms-consent').checked });
  $('phone-form').hidden = true; $('code-form').hidden = false; $('code').focus();
  status('auth-status', config.demo ? 'Local preview code: 123456. No text was sent.' : 'Code sent. Check your messages.');
}); };
$('different-phone').onclick = () => { $('code-form').hidden = true; $('phone-form').hidden = false; $('code').value = ''; status('auth-status'); };
$('code-form').onsubmit = event => { event.preventDefault(); run(event.currentTarget, 'auth-status', async () => {
  await api('auth/check', { phone: $('phone').value, code: $('code').value });
  await refresh();
  if (me.profile) show(deletionRequested ? 'account' : 'home');
}); };
$('profile-create').onsubmit = event => { event.preventDefault(); run(event.currentTarget, 'profile-status', async () => {
  await api('profile', { name: $('new-name').value, companyId: $('company').value, invite: $('invite-code').value });
  await refresh(); show('home');
}); };
$('back-gallery').onclick = () => { selectedCompany = null; show('gallery'); };
$('new-company-change').onclick = () => { selectedCompany = null; show('gallery'); };
$('verify-again').onclick = () => { $('phone').value = me.profile.phone; $('phone-form').hidden = false; $('code-form').hidden = true; $('code').value = ''; renderWelcome(me.profile.company); show('welcome'); status('auth-status', 'Request a new code to confirm a sensitive account change.'); };
$('returning-signin').onclick = () => { selectedCompany = null; renderWelcome(null); show('welcome'); };
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { if (b.dataset.view === 'money') refresh().then(() => show('money')).catch(e => status('money-status', e.message, true)); else show(b.dataset.view); });
$('help').onclick = () => { location.href = 'sms:3179690174'; };
$('view-money').onclick = () => show('money');
$('home-payout').onclick = () => show('account');
$('home-stickers').onclick = () => show('stickers');
$('start-booking').onclick = () => { quote = null; chosen = null; bookingId = crypto.randomUUID(); step(1); show('booking'); };
$('booking-back').onclick = () => { if (bookingStep > 1 && bookingStep < 4) step(bookingStep - 1); else show('home'); };
$('customer-form').onsubmit = event => { event.preventDefault(); run(event.currentTarget, 'booking-status', async () => {
  quote = await api('availability', { customerName: $('customer-name').value, address: `${$('street').value.trim()}, ${$('city').value.trim()}`, zip: $('zip').value });
  bookingId = crypto.randomUUID(); renderSlots(quote.options); step(2);
}); };
$('confirm-time').onclick = () => {
  if (!chosen) return;
  $('booking-summary').textContent = `${$('customer-name').value} · ${date(chosen.date)}, ${chosen.window} · ${$('street').value}, ${$('city').value}`;
  $('credit-note').textContent = `${money(me.profile.company.bountyCents)} reward credited to ${me.profile.name} at ${me.profile.company.name} after completion.`;
  step(3);
};
$('confirm-form').onsubmit = event => { event.preventDefault(); run(event.currentTarget, 'booking-status', async () => {
  const result = await api('bookings', { requestId: bookingId, quoteId: quote.quoteId, date: chosen.date, time: chosen.time, customerName: $('customer-name').value, customerPhone: $('customer-phone').value, email: $('customer-email').value, street: $('street').value, city: $('city').value, zip: $('zip').value, waterType: $('water-type').value, notes: $('driver-notes').value, customerConsent: $('customer-consent').checked });
  $('success-summary').textContent = `${$('customer-name').value} · ${date(chosen.date)} · ${chosen.window}`;
  $('booking-reference').textContent = 'Referral reference: ' + result.referralId;
  step(4);
  if (native) Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}); };
$('booking-done').onclick = () => run($('booking-done'), 'booking-status', async () => { $('customer-form').reset(); $('confirm-form').reset(); await refresh(); show('money'); });
$('refresh-money').onclick = () => run($('refresh-money'), 'money-status', async () => { await refresh(); status('money-status', me.lastSync ? 'Account refreshed. Delivery checks last ran ' + date(me.lastSync.at) + (me.lastSync.partial || me.lastSync.failures ? '; some jobs are still waiting to be checked.' : '.') : 'Account refreshed. Delivery completion checks have not run yet.'); });
$('sticker-form').onsubmit = event => { event.preventDefault(); run(event.currentTarget, 'sticker-status', async () => {
  const result = await api('stickers', { requestId: orderId, designId: me.profile.company.design.id, quantity: Number($('quantity').value), shipping: { name: $('ship-name').value, street: $('ship-street').value, unit: $('ship-unit').value, city: $('ship-city').value, state: $('ship-state').value, zip: $('ship-zip').value } });
  await refresh(); orderId = crypto.randomUUID(); status('sticker-status', `Request received. ${result.order.quantity} stickers · $0 due. Evan will review and fulfill your request.`);
  if (native) Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}); };
function updatePayoutHint() {
  const hints = { venmo: ['Your Venmo username', '@your-username'], zelle: ['Your Zelle email or phone', 'you@example.com'], applecash: ['Your Apple Cash phone', '(317) 555-1234'] };
  const hint = hints[$('payout-method').value] || ['Payout username, phone, or email', 'Choose a method first'];
  $('payout-label').textContent = hint[0]; $('payout-handle').placeholder = hint[1];
}
$('payout-method').onchange = updatePayoutHint;
$('settings-form').onsubmit = event => { event.preventDefault(); run(event.currentTarget, 'settings-status', async () => {
  const method = $('payout-method').value, handle = $('payout-handle').value;
  if (Boolean(method) !== Boolean(handle)) throw new Error('Choose a payout method and enter its username, phone, or email.');
  await api('profile', { name: $('edit-name').value, ...(method ? { payout: { method, handle } } : {}) });
  await refresh(); status('settings-status', 'Your profile and payout details are saved.');
}); };
$('signout').onclick = () => run($('signout'), 'settings-status', async () => { await api('auth/logout', {}); me = null; $('phone-form').hidden = false; $('code-form').hidden = true; $('code').value = ''; show('gallery'); });
$('share-app').onclick = () => run($('share-app'), 'settings-status', async () => {
  const url = new URL('/?company=' + encodeURIComponent(me.profile.companyId), apiOrigin || location.origin).href;
  if (native) await Share.share({ title: 'Salt Partners', text: 'Simply Salt partner referrals', url });
  else if (navigator.share) await navigator.share({ title: 'Salt Partners', url });
  else { await navigator.clipboard.writeText(url); status('settings-status', 'App link copied.'); }
});
$('delete-account').onclick = () => run($('delete-account'), 'delete-status', async () => {
  await api('account', { confirm: $('delete-confirm').value }, 'DELETE'); me = null;
  $('phone-form').hidden = false; $('code-form').hidden = true; $('code').value = '';
  renderWelcome(null); show('welcome'); status('auth-status', 'Your account was deleted.');
});
function connectivity() { $('offline').hidden = navigator.onLine; }
window.addEventListener('offline', connectivity); window.addEventListener('online', connectivity); connectivity();
if (native) {
  $('owner-link').hidden = true;
  App.addListener('backButton', () => { if (currentView === 'booking') $('booking-back').click(); else if (me?.profile) show('home'); else show('gallery'); });
  App.addListener('appStateChange', ({ isActive }) => { if (isActive && me?.profile) refresh().catch(e => status('settings-status', e.message, true)); });
} else if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

(async () => {
  try {
    config = await api('config'); $('preview-banner').hidden = !config.demo;
    renderGallery();
    selectedCompany = config.companies.find(c => c.id === companyId) || null;
    try { await refresh(); if (me.profile) show(deletionRequested ? 'account' : 'home'); }
    catch (error) { if (error.status !== 401) throw error; me = null; if (selectedCompany) { renderWelcome(selectedCompany); show('welcome'); } else show('gallery'); }
  } catch (error) { $('loading').textContent = 'Salt Partners could not load. Check your connection and refresh. ' + error.message; }
})();
