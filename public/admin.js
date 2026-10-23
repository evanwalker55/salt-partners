const $ = id => document.getElementById(id);
let state, invitationLink;
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((value || 0) / 100);
const date = value => value ? new Date(value.length === 10 ? value + 'T12:00:00Z' : value).toLocaleString('en-US', { timeZone: 'America/Indiana/Indianapolis', dateStyle: 'medium', ...(value.length !== 10 ? { timeStyle: 'short' } : {}) }) : '';
const el = (tag, value, cls) => { const n = document.createElement(tag); if (value !== undefined) n.textContent = value; if (cls) n.className = cls; return n; };
function message(value = '', error = false) { $('owner-status').textContent = value; $('owner-status').classList.toggle('error', error); }
async function api(path, body) {
  const response = await fetch('/api/partners/owner/' + path, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || 'Could not complete this action.'); error.status = response.status; throw error; }
  return data;
}
async function action(button, fn) {
  if (button.disabled) return;
  const old = button.textContent; button.disabled = true; button.textContent = 'Please wait…'; message();
  try { await fn(); } catch (error) { message(error.message, true); if (error.status === 401) { $('owner-login').hidden = false; $('owner-dashboard').hidden = true; } }
  finally { button.disabled = false; button.textContent = old; }
}
function button(label, fn) { const b = el('button', label, 'secondary'); b.type = 'button'; b.onclick = () => action(b, fn); return b; }
function companyName(id) { return state.companies.find(c => c.id === id)?.name || id; }
function companyEditor(company) {
  const details = el('details'), summary = el('summary', company.name), form = el('form');
  const name = el('input'); name.value = company.name; name.required = true; name.maxLength = 100; name.setAttribute('aria-label', 'Company name for ' + company.name);
  const kind = el('input'); kind.value = company.kind; kind.required = true; kind.maxLength = 60; kind.setAttribute('aria-label', 'Business type for ' + company.name);
  const save = el('button', 'Save company details', 'secondary'); save.type = 'submit';
  form.append(name, kind, save); form.onsubmit = event => { event.preventDefault(); action(save, async () => { await api('company', { id: company.id, name: name.value, kind: kind.value }); await refresh(); message('Company details saved.'); }); };
  details.append(summary, form); return details;
}
function table(headers, rows) {
  const t = el('table'), head = el('thead'), row = el('tr');
  headers.forEach(h => row.append(el('th', h))); head.append(row); t.append(head);
  const body = el('tbody');
  rows.forEach(values => { const r = el('tr'); values.forEach(v => { const cell = el('td'); if (v instanceof Node) cell.append(v); else cell.textContent = v; r.append(cell); }); body.append(r); });
  t.append(body); return t;
}
async function refresh() {
  state = await api('overview');
  $('owner-login').hidden = true; $('owner-dashboard').hidden = false;
  $('launch-warning').textContent = state.launch.bookingEnabled ? 'Bookings are enabled. Check referral and payout status before making changes.' : 'Review version: new bookings are paused. Legacy referral reconciliation and verification setup are still required.';
  $('total-owed').textContent = money(state.referrals.filter(r => r.status === 'earned').reduce((v, r) => v + r.bountyCents, 0));
  for (const selectId of ['invite-company', 'design-company', 'image-company']) {
    const selected = $(selectId).value; $(selectId).replaceChildren();
    for (const c of state.companies.filter(c => c.active)) $(selectId).add(new Option(c.name, c.id));
    if (state.companies.some(c => c.id === selected && c.active)) $(selectId).value = selected;
  }
  $('businesses').replaceChildren(table(['Company · select name to edit', 'Type', 'Reward', 'Approved design', 'Status'], state.companies.map(c => [companyEditor(c), c.kind, money(c.bountyCents), c.design ? `${c.design.name} · v${c.design.version}` : 'Awaiting artwork', button(c.active ? 'Pause company' : 'Reactivate', async () => { await api('company', { id: c.id, name: c.name, kind: c.kind, active: !c.active }); await refresh(); })])));
  const invites = $('invitations'); invites.replaceChildren();
  for (const invite of state.invites.filter(i => !i.revokedAt && i.expiresAt > Date.now()).slice(-5)) {
    const item = el('div', undefined, 'order'); item.append(el('p', `${companyName(invite.companyId)} · ${invite.uses}/${invite.maxUses} used · expires ${date(new Date(invite.expiresAt).toISOString())}`), button('Revoke invitation', async () => { await api('revoke-invite', { id: invite.id }); await refresh(); })); invites.append(item);
  }
  $('technicians').replaceChildren(table(['Technician', 'Company', 'Verified phone', 'Membership', 'Payout', 'Action'], state.techs.map(t => [t.name, companyName(t.companyId), t.phone, t.membership, t.payout ? t.payout.method + ' · ' + t.payout.handle : 'Not set up', button(t.membership === 'active' ? 'Suspend' : 'Approve', async () => { await api('membership', { techId: t.id, status: t.membership === 'active' ? 'suspended' : 'active' }); await refresh(); })])));
  const referrals = $('owner-referrals'); referrals.replaceChildren();
  if (!state.referrals.length) referrals.append(el('p', 'No referrals recorded in this version yet.', 'empty'));
  for (const r of state.referrals.slice().reverse()) {
    const item = el('article', undefined, 'order');
    const head = el('header'); head.append(el('strong', r.customerName + ' · ' + money(r.bountyCents)), el('span', r.status, 'pill ' + r.status)); item.append(head);
    item.append(el('p', `${r.techName} · ${r.companyName} · ${r.source} · delivery ${r.scheduledDate}`), el('p', `Referral ${r.id}${r.jobId ? ' · HCP job ' + r.jobId : ' · Job confirmation needs review'}`));
    const retention = state.deletionRequests.find(v => v.techId === r.techId && v.status === 'settle_and_erase');
    const tech = state.techs.find(t => t.id === r.techId) || (retention ? { name: retention.name, payout: retention.payout } : null);
    if (r.status === 'earned' && tech?.payout) {
      item.append(el('p', `Pay ${tech.name}: ${tech.payout.method} · ${tech.payout.handle} · ${money(r.bountyCents)}`));
      const input = document.createElement('input'); input.placeholder = 'Payment transaction reference'; input.maxLength = 160; input.setAttribute('aria-label', 'Payment reference for ' + r.customerName);
      item.append(input, button('Record payment already sent', async () => { if (!input.value.trim()) throw new Error('Enter the transaction reference after sending payment.'); await api('paid', { id: r.id, reference: input.value, payoutVersion: tech.payout.version }); await refresh(); message('Payment recorded. No money was sent by the app.'); }));
    } else if (r.status === 'earned') item.append(el('p', 'Payout details are missing or the account was deleted. Reconcile this reward before recording payment.'));
    if (r.paymentReference) item.append(el('p', `Paid ${date(r.paidAt)} · reference ${r.paymentReference}`));
    referrals.append(item);
  }
  const orders = $('owner-orders'); orders.replaceChildren();
  if (!state.orders.length) orders.append(el('p', 'No sticker requests yet.', 'empty'));
  for (const o of state.orders.slice().reverse()) {
    const item = el('article', undefined, 'order');
    item.append(el('h3', `${o.companyName} · ${o.quantity} stickers · $0 due`), el('p', `${o.techName} · ${date(o.createdAt)} · ${o.status}`), el('p', `${o.design.name} · approved version ${o.design.version}`));
    const link = el('a', 'Open this request’s approved artwork'); link.href = '/api/partners/owner/design/' + o.design.id; link.target = '_blank'; link.rel = 'noopener'; item.append(link);
    if (o.shipping) item.append(el('p', [o.shipping.name, o.shipping.street, o.shipping.unit, `${o.shipping.city}, ${o.shipping.state} ${o.shipping.zip}`].filter(Boolean).join(' · ')));
    const transitions = { requested: ['processing', 'cancelled'], processing: ['shipped', 'fulfilled', 'cancelled'], shipped: ['fulfilled'], fulfilled: [], cancelled: [] };
    const options = transitions[o.status] || [];
    if (options.length) {
      const select = el('select'); select.setAttribute('aria-label', 'Next status for request ' + o.id); options.forEach(v => select.add(new Option(v, v)));
      const tracking = el('input'); tracking.placeholder = 'Tracking number or delivery note (optional)'; tracking.value = o.tracking || ''; tracking.maxLength = 200; tracking.setAttribute('aria-label', 'Tracking for request ' + o.id);
      item.append(select, tracking, button('Update request', async () => { await api('order', { id: o.id, status: select.value, previousStatus: o.status, tracking: tracking.value }); await refresh(); }));
    }
    orders.append(item);
  }
  $('owner-audit').replaceChildren(table(['When', 'Action', 'Who', 'Reference'], state.audit.slice(-30).reverse().map(a => [date(a.at), a.action.replaceAll('_', ' '), a.actor, a.subject || '—'])));
  $('legacy-reconciled').checked = state.launch.legacyReconciled; $('live-booking').checked = state.launch.bookingEnabled;
}
$('login-form').onsubmit = event => { event.preventDefault(); action(event.currentTarget.querySelector('button'), async () => { await api('login', { password: $('owner-password').value }); $('owner-password').value = ''; await refresh(); }); };
$('add-company').onsubmit = event => { event.preventDefault(); action(event.currentTarget.querySelector('button'), async () => { const result = await api('company', { name: $('business-name').value, kind: $('business-kind').value }); $('business-name').value = ''; await refresh(); $('invite-company').value = result.company.id; message('Company added. Create its invitation link and upload its artwork when ready.'); }); };
$('create-invite').onclick = () => action($('create-invite'), async () => { const result = await api('invite', { companyId: $('invite-company').value }); invitationLink = result.url; $('invite-link').textContent = result.url; $('copy-invite').hidden = false; await refresh(); });
$('copy-invite').onclick = () => action($('copy-invite'), async () => { await navigator.clipboard.writeText(invitationLink); message('Invitation link copied.'); });
async function fileData(input) {
  const file = input.files[0];
  if (!file || file.size > 2000000 || !['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choose a PNG or JPEG under 2 MB.');
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ base64: reader.result.split(',')[1], name: file.name }); reader.onerror = reject; reader.readAsDataURL(file); });
}
for (const id of ['design-file', 'image-file']) {
  const input = $(id), preview = el('img', undefined, 'sticker-preview'); preview.alt = 'Selected file preview'; preview.hidden = true; input.after(preview);
  let objectUrl;
  input.onchange = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const file = input.files[0];
    if (!file || file.size > 2000000 || !['image/png', 'image/jpeg'].includes(file.type)) { preview.hidden = true; if (file) message('Choose a PNG or JPEG under 2 MB.', true); return; }
    objectUrl = URL.createObjectURL(file); preview.src = objectUrl; preview.hidden = false;
  };
}
$('upload-design').onsubmit = event => { event.preventDefault(); action(event.currentTarget.querySelector('button'), async () => { const file = await fileData($('design-file')); await api('design', { companyId: $('design-company').value, name: $('design-name').value, base64: file.base64, approved: $('design-approved').checked }); await refresh(); message('Approved print design saved. Previous requests keep their original artwork.'); }); };
$('upload-image').onsubmit = event => { event.preventDefault(); action(event.currentTarget.querySelector('button'), async () => { const file = await fileData($('image-file')); await api($('image-type').value, { companyId: $('image-company').value, ...file, illustrative: $('image-illustrative').checked }); await refresh(); message('Company image saved.'); }); };
$('owner-refresh').onclick = () => action($('owner-refresh'), refresh);
$('owner-sync').onclick = () => action($('owner-sync'), async () => { const result = await api('sync', {}); await refresh(); message(`Checked ${result.checked} jobs. ${result.failures} could not be read; their status was preserved.${result.partial ? ' More jobs will be checked on the next pass.' : ''}`); });
$('owner-signout').onclick = () => action($('owner-signout'), async () => { await api('logout', {}); $('owner-dashboard').hidden = true; $('owner-login').hidden = false; state = null; });
$('save-launch').onclick = () => action($('save-launch'), async () => { await api('launch', { legacyReconciled: $('legacy-reconciled').checked, bookingEnabled: $('live-booking').checked }); await refresh(); message('Launch settings saved.'); });
$('owner-export').onclick = () => {
  if (!state) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'salt-partners-v2', exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'salt-partners-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
refresh().catch(error => { if (error.status !== 401) message(error.message, true); });
