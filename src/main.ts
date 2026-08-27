import './styles.css';
import { db, makeStarterDeck } from './db';
import { cachedUnlock, captureLicense, checkoutUrl, storeLicense, verifyLicense } from './license';
import type { Deck, Settings, Take } from './types';
import { DAY_MS, isDue, nextReplayAt, promptLines } from './rehearsal';

const app = document.querySelector<HTMLDivElement>('#app')!;

interface SessionState {
  deck: Deck;
  index: number;
  phase: 'prompt' | 'gap' | 'review' | 'complete';
  record: boolean;
  stream?: MediaStream;
  recorder?: MediaRecorder;
  chunks: Blob[];
  timer?: number;
  endAt?: number;
  remainingMs: number;
  paused: boolean;
  lastTakeId?: string;
}

let decks: Deck[] = [];
let takes: Take[] = [];
let settings: Settings;
let session: SessionState | null = null;
let unlocked = cachedUnlock();
let licenseNotice = '';
let toast = '';
let online = navigator.onLine;

const esc = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

function announce(message: string): void {
  toast = message;
  render();
  window.setTimeout(() => {
    if (toast === message) {
      toast = '';
      document.querySelector('.toast')?.remove();
    }
  }, 4200);
}

function icon(name: 'walk' | 'plus' | 'play' | 'mic' | 'replay' | 'settings' | 'download'): string {
  const paths = {
    walk: '<path d="M12 3h2v3h-2zM10 7h5v5h-2v-2h-1l-1 4 3 5h-3l-3-5 2-7Zm0 7-1 5H6l2-6 2 1Z"/>',
    plus: '<path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z"/>',
    play: '<path d="M7 4v16l13-8L7 4Z"/>',
    mic: '<path d="M9 4a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V4Zm-3 7h2a4 4 0 0 0 8 0h2a6 6 0 0 1-5 5.91V20h3v2H8v-2h3v-3.09A6 6 0 0 1 6 11Z"/>',
    replay: '<path d="m7 7 4-4v3a7 7 0 1 1-6.2 10.25l1.77-.93A5 5 0 1 0 11 8v3L7 7Z"/>',
    settings: '<path d="M10.7 2h2.6l.5 2a8 8 0 0 1 1.4.8l2-.6 1.3 2.2-1.5 1.5c.2.5.4 1 .4 1.6l2 .6v2.6l-2 .6a7 7 0 0 1-.4 1.5l1.5 1.5-1.3 2.2-2-.6a8 8 0 0 1-1.4.8l-.5 2h-2.6l-.5-2a8 8 0 0 1-1.4-.8l-2 .6-1.3-2.2L7 14.3a7 7 0 0 1-.4-1.5l-2-.6V9.6l2-.6c.1-.6.2-1.1.4-1.6L5.5 5.9l1.3-2.2 2 .6a8 8 0 0 1 1.4-.8l.5-2ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/>',
    download: '<path d="M11 3h2v10l3-3 1.4 1.4-5.4 5.4-5.4-5.4L8 10l3 3V3ZM4 19h16v2H4z"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function shell(content: string): string {
  return `<header class="site-header">
    <a class="brand" href="/" aria-label="Walk & Talk home"><span class="brand-mark" aria-hidden="true">W/T</span><span>Walk &amp; Talk</span></a>
    <nav aria-label="Primary"><a href="/#decks">Decks</a><a href="/#replays">Replays</a><button class="nav-button" data-action="settings" aria-label="Settings">${icon('settings')}<span>Settings</span></button></nav>
  </header>
  ${content}
  <footer><p><span class="pixel-dot" aria-hidden="true"></span> Local by design. Your voice stays here.</p><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><span>Original AI-generated art</span></div></footer>
  <div class="connection ${online ? '' : 'offline'}" role="status">${online ? 'READY / local' : 'OFFLINE / all local'}</div>
  ${toast ? `<div class="toast" role="status">${esc(toast)}</div>` : ''}`;
}

function renderHome(): void {
  const promptCount = decks.reduce((sum, deck) => sum + deck.prompts.length, 0);
  const duePrompts = decks.reduce((sum, deck) => sum + deck.prompts.filter((prompt) => isDue(prompt.nextDueAt)).length, 0);
  const dueTakes = takes.filter((take) => isDue(take.nextReplayAt)).sort((a, b) => a.nextReplayAt - b.nextReplayAt);
  const deckMarkup = decks.length ? decks.map((deck) => {
    const deckDue = deck.prompts.filter((prompt) => isDue(prompt.nextDueAt)).length;
    return `<article class="deck-card">
      <div><p class="eyebrow">${esc(deck.language)} · ${plural(deckDue, 'due')}</p><h3>${esc(deck.name)}</h3><p>${esc(deck.context || 'Your own speaking situation')}</p></div>
      <div class="deck-stats"><span>${plural(deck.prompts.length, 'prompt')}</span><span>${deck.prompts.reduce((n, p) => n + p.repetitions, 0)} runs</span></div>
      <div class="deck-actions"><button class="button primary" data-action="start" data-id="${deck.id}">${icon('play')}Start</button><button class="button quiet" data-action="start-record" data-id="${deck.id}">${icon('mic')}Record</button><button class="icon-button" data-action="edit-deck" data-id="${deck.id}" aria-label="Edit ${esc(deck.name)}">•••</button></div>
    </article>`;
  }).join('') : `<div class="empty-state"><div class="empty-signal" aria-hidden="true"><i></i><i></i><i></i></div><h3>Your situations go here</h3><p>Add moments you want to handle out loud, such as checking into a hotel or explaining an idea at work.</p><div class="button-row"><button class="button primary" data-action="new-deck">${icon('plus')}Create a deck</button><button class="button quiet" data-action="starter">Load starter prompts</button></div></div>`;

  const takeMarkup = dueTakes.length ? dueTakes.map((take) => {
    const url = URL.createObjectURL(take.audio);
    return `<article class="take-row"><div><p class="eyebrow">DUE TO REPLAY · ${new Date(take.createdAt).toLocaleDateString()}</p><h3>${esc(take.promptText)}</h3></div><audio controls preload="metadata" src="${url}">Your browser cannot play this recording.</audio><div class="take-actions"><button class="button quiet" data-action="reviewed" data-id="${take.id}">Heard it · +7 days</button><button class="text-button danger" data-action="delete-take" data-id="${take.id}">Delete</button></div></article>`;
  }).join('') : `<div class="compact-empty"><span class="signal-check" aria-hidden="true">✓</span><div><h3>No replay due</h3><p>Record during a rehearsal and its next listen will appear here.</p></div></div>`;

  const hero = `<main id="main">
    ${!settings.outdoorReminderSeen ? `<aside class="safety" aria-label="Safety reminder"><div><strong>LOOK UP / STAY AWARE</strong><p>Pause before crossings. Use one ear free, or choose text-only mode in busy places.</p></div><button class="icon-button" data-action="dismiss-safety" aria-label="Dismiss safety reminder">×</button></aside>` : ''}
    <section class="hero" aria-labelledby="page-title">
      <div class="hero-copy"><p class="kicker"><span>01</span> PROMPT → SPEAK → REPLAY</p><h1 id="page-title">Speak before<br><em>the moment.</em></h1><p class="lede">Turn the situations in your head into a hands-free rehearsal. Your prompts, your pace, your voice—kept on this device.</p><div class="button-row"><button class="button primary large" data-action="${decks.length ? 'start' : 'new-deck'}" ${decks.length ? `data-id="${decks[0].id}"` : ''}>${icon(decks.length ? 'play' : 'plus')}${decks.length ? 'Start next rehearsal' : 'Build your first deck'}</button><a class="text-link" href="#how">See the cadence ↓</a></div><div class="hero-metrics"><div><strong>${String(duePrompts).padStart(2, '0')}</strong><span>prompts ready</span></div><div><strong>${String(takes.length).padStart(2, '0')}</strong><span>takes on device</span></div><div><strong>${settings.gapSeconds}s</strong><span>speaking gap</span></div></div></div>
      <div class="hero-art"><picture><source srcset="/assets/signal-walk.webp" type="image/webp"><img src="/assets/signal-walk.png" width="768" height="512" alt="Pixel-art walker safely rehearsing on a footpath as prompt blocks become voice waveforms" fetchpriority="high" decoding="async"></picture><div class="art-caption"><span>FIELD MODE</span><span>NO CLOUD LINK</span></div></div>
    </section>
    <section class="cadence" id="how" aria-labelledby="cadence-title"><div class="section-number">02 / HOW IT FLOWS</div><h2 id="cadence-title">A little structure.<br>A lot more nerve.</h2><ol class="signal-track"><li><span class="step-no">01</span><div class="step-icon cyan" aria-hidden="true">▶</div><h3>Hear a cue</h3><p>Your own scenario is spoken aloud—or shown as text.</p></li><li><span class="step-no">02</span><div class="step-icon apricot" aria-hidden="true">▥</div><h3>Fill the silence</h3><p>A clear speaking window keeps you from overthinking.</p></li><li><span class="step-no">03</span><div class="step-icon lime" aria-hidden="true">↻</div><h3>Replay later</h3><p>Save a take locally and meet it again on another walk.</p></li></ol></section>
    <section class="workspace" id="decks" aria-labelledby="decks-title"><div class="section-heading"><div><p class="section-number">03 / YOUR SCENARIOS</p><h2 id="decks-title">Rehearsal decks</h2><p>${plural(promptCount, 'prompt')} across ${plural(decks.length, 'deck')}</p></div><button class="button primary" data-action="new-deck">${icon('plus')}New deck</button></div><div class="deck-grid">${deckMarkup}</div></section>
    <section class="workspace replay-zone" id="replays" aria-labelledby="replays-title"><div class="section-heading"><div><p class="section-number">04 / LISTEN BACK</p><h2 id="replays-title">Replay queue</h2><p>${plural(dueTakes.length, 'take')} due now</p></div></div><div class="take-list">${takeMarkup}</div></section>
    ${renderPro()}
  </main>`;
  app.innerHTML = shell(hero + renderDialogs());
}

function renderPro(): string {
  return `<section class="pro-zone" id="unlock" aria-labelledby="unlock-title"><div><p class="section-number">05 / OPTIONAL UNLOCK</p><h2 id="unlock-title">${unlocked ? 'Field recorder unlocked' : 'Keep every take'}</h2><p>${unlocked ? 'Unlimited local recordings are active on this browser.' : 'Free includes every rehearsal feature and up to five saved takes. A one-time $12 unlock removes the recording limit—no subscription, no cloud account.'}</p>${licenseNotice ? `<p class="notice">${esc(licenseNotice)}</p>` : ''}</div><div class="pro-actions">${unlocked ? '<span class="license-active">✓ LICENSE ACTIVE</span>' : `<a class="button apricot-button" href="${checkoutUrl}">Buy once · $12</a><form id="license-form"><label for="license-token">Have a license?</label><div class="inline-form"><input id="license-token" name="license" autocomplete="off" required placeholder="Paste license token"><button class="button quiet" type="submit">Restore</button></div></form>`}</div></section>`;
}

function renderDialogs(): string {
  return `<dialog id="deck-dialog" aria-labelledby="deck-dialog-title"><form id="deck-form"><div class="dialog-head"><div><p class="eyebrow">SCENARIO DECK</p><h2 id="deck-dialog-title">Build a rehearsal</h2></div><button class="icon-button" value="cancel" formmethod="dialog" aria-label="Close">×</button></div><input type="hidden" name="deckId"><label>Deck name<input name="name" required maxlength="60" placeholder="Checking into a hotel"></label><div class="form-grid"><label>Context<input name="context" maxlength="100" placeholder="What I need before the next trip"></label><label>Language<input name="language" maxlength="40" placeholder="Italian"></label></div><label>Prompts <span>one per line</span><textarea name="prompts" required rows="7" placeholder="Ask whether breakfast is included.&#10;Explain that the room key does not work."></textarea></label><p class="form-hint">Write cues in your everyday language. Your answer is what you practise in the target language.</p><div class="dialog-actions"><button class="text-button danger hidden" type="button" data-action="delete-deck">Delete deck</button><span></span><button class="button quiet" value="cancel" formmethod="dialog">Cancel</button><button class="button primary" type="submit">Save deck</button></div></form></dialog>
  <dialog id="settings-dialog" aria-labelledby="settings-title"><form id="settings-form"><div class="dialog-head"><div><p class="eyebrow">FIELD CONTROLS</p><h2 id="settings-title">Rehearsal settings</h2></div><button class="icon-button" value="cancel" formmethod="dialog" aria-label="Close">×</button></div><label for="gap">Speaking gap <output id="gap-output">${settings.gapSeconds} seconds</output><input id="gap" type="range" name="gapSeconds" min="5" max="90" step="5" value="${settings.gapSeconds}"></label><label class="switch-row"><span><strong>Text-only mode</strong><small>Never speak prompts aloud</small></span><input type="checkbox" name="textOnly" ${settings.textOnly ? 'checked' : ''}></label><label class="switch-row"><span><strong>Auto-advance</strong><small>Move on after scheduling a response</small></span><input type="checkbox" name="autoAdvance" ${settings.autoAdvance ? 'checked' : ''}></label><div class="data-tools"><h3>Your local data</h3><p>Export decks, settings, and recordings as one JSON file.</p><div class="button-row"><button class="button quiet" type="button" data-action="export">${icon('download')}Export</button><button class="button quiet" type="button" data-action="import">Import</button><button class="text-button danger" type="button" data-action="clear-data">Erase all</button></div><input class="visually-hidden" id="import-file" type="file" accept="application/json"></div><div class="dialog-actions"><span></span><button class="button quiet" value="cancel" formmethod="dialog">Cancel</button><button class="button primary" type="submit">Save settings</button></div></form></dialog>`;
}

function legalPage(kind: 'privacy' | 'terms'): void {
  const privacy = `<main id="main" class="legal"><p class="section-number">LOCAL-FIRST POLICY</p><h1>Privacy, in plain language</h1><p class="lede">Your rehearsal belongs to you. Walk &amp; Talk has no account system, analytics, advertising tracker, or recording server.</p><h2>What stays on your device</h2><p>Your decks, settings, rehearsal history, and audio takes are stored in your browser’s IndexedDB. Audio is created only when you explicitly start a recorded session and grant microphone access. Nothing is uploaded by this app.</p><h2>License checks</h2><p>If you buy or restore the one-time unlock, the license token is stored in localStorage and sent to Sociobot’s verification endpoint no more than once per day. Payment is handled by Sociobot/Dodo as merchant of record under their applicable policies.</p><h2>Your controls</h2><p>You can export all local data, delete individual recordings, or erase everything from Settings. Removing site data in your browser also removes it. Uninstalling without an export may permanently delete your recordings.</p><h2>Permissions and network</h2><p>Microphone access is optional. The app’s core deck and timer features work without it. After first load, the app shell works offline. License verification requires a network connection, but never blocks the free experience.</p><p><a class="button quiet" href="/">← Back to rehearsal</a></p></main>`;
  const terms = `<main id="main" class="legal"><p class="section-number">TERMS OF USE</p><h1>Walk, talk, stay aware</h1><p class="lede">Walk &amp; Talk is a self-guided rehearsal utility, not instruction, translation, emergency guidance, or speech assessment.</p><h2>Use safely</h2><p>Stay aware of traffic, people, and your environment. Pause the app before crossings or anywhere attention is required. You are responsible for choosing a safe time and place to use audio or recording features.</p><h2>Your content</h2><p>You retain responsibility for and ownership of the prompts and recordings you create. The app stores them locally and does not provide backup unless you export your data.</p><h2>One-time unlock</h2><p>The $12 purchase unlocks unlimited locally stored takes for this product. Sociobot/Dodo is merchant of record. Refunds are handled there and revoke the associated license. A valid license may be restored on another device with the provided token.</p><h2>Availability</h2><p>The software is provided “as is” under its MIT license, without guarantees that browser speech synthesis, microphone access, or persistent storage will be available on every device.</p><p><a class="button quiet" href="/">← Back to rehearsal</a></p></main>`;
  app.innerHTML = shell(kind === 'privacy' ? privacy : terms);
  bindCommon();
}

function renderSession(): void {
  if (!session) return;
  const total = session.deck.prompts.length;
  if (session.phase === 'complete') {
    app.innerHTML = `<main id="main" class="session-screen complete-screen"><div class="complete-pixels" aria-hidden="true">✓</div><p class="eyebrow">SESSION SAVED</p><h1>That one is in your voice now.</h1><p>You rehearsed ${plural(total, 'situation')}. The prompts and any recorded takes are waiting locally for another walk.</p><div class="button-row"><button class="button primary large" data-action="end-session">Back to dashboard</button><button class="button quiet" data-action="restart-session">Run it again</button></div></main>`;
    bindCommon(); return;
  }
  const prompt = session.deck.prompts[session.index];
  const phaseLabel = session.phase === 'prompt' ? 'LISTEN' : session.phase === 'gap' ? 'YOUR TURN' : 'SCHEDULE IT';
  const progress = session.phase === 'gap' ? Math.max(0, Math.min(100, (session.remainingMs / (settings.gapSeconds * 1000)) * 100)) : 100;
  app.innerHTML = `<main id="main" class="session-screen"><header class="session-head"><button class="text-button" data-action="end-session">← End</button><div><span>${esc(session.deck.name)}</span><strong>${session.index + 1} / ${total}</strong></div></header><div class="session-status"><span>${phaseLabel}</span><div class="mini-track" aria-hidden="true"><i class="${session.phase === 'prompt' ? 'active' : 'done'}"></i><i class="${session.phase === 'gap' ? 'active' : session.phase === 'review' ? 'done' : ''}"></i><i class="${session.phase === 'review' ? 'active' : ''}"></i></div></div><section class="prompt-stage" aria-live="polite"><p class="prompt-context">${esc(session.deck.context)}</p><h1>${esc(prompt.text)}</h1>${session.phase === 'prompt' ? `<div class="wave-bars ${settings.textOnly ? 'still' : ''}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><p>${settings.textOnly ? 'Read the cue, then start when you are ready.' : 'Listen for the cue, then answer in your target language.'}</p><div class="button-row"><button class="button primary large" data-action="begin-gap">Start speaking</button>${!settings.textOnly ? '<button class="button quiet" data-action="replay-prompt">Hear again</button>' : ''}</div>` : session.phase === 'gap' ? `<div class="timer" aria-label="${Math.ceil(session.remainingMs / 1000)} seconds remaining"><strong id="timer-value">${Math.ceil(session.remainingMs / 1000)}</strong><span>seconds</span></div><div class="progress" aria-hidden="true"><i id="progress-bar" style="width:${progress}%"></i></div><p>${session.record ? '<span class="record-dot" aria-hidden="true"></span> Recording locally' : 'No recording · speak freely'}</p><div class="button-row"><button class="button primary large" data-action="pause-session">${session.paused ? 'Resume' : 'Pause'}</button><button class="button quiet" data-action="finish-gap">Finish answer</button></div><p class="key-hint">Space to pause · Esc to end</p>` : `<div class="review-mark" aria-hidden="true">✓</div><h2>When should this return?</h2><p>${session.record && session.lastTakeId ? 'Take saved on this device.' : 'Practice logged without a recording.'}</p><div class="schedule-grid"><button class="schedule-button" data-action="schedule" data-days="1"><strong>Tomorrow</strong><span>Build the phrase</span></button><button class="schedule-button" data-action="schedule" data-days="3"><strong>In 3 days</strong><span>Keep it warm</span></button><button class="schedule-button" data-action="schedule" data-days="7"><strong>Next week</strong><span>Test recall</span></button></div>`}</section></main>`;
  bindCommon();
}

function render(): void {
  if (location.pathname === '/privacy' || location.pathname === '/privacy/') return legalPage('privacy');
  if (location.pathname === '/terms' || location.pathname === '/terms/') return legalPage('terms');
  if (session) renderSession(); else { renderHome(); bindHome(); }
}

function bindCommon(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-action="settings"]').forEach((button) => button.addEventListener('click', () => (document.querySelector<HTMLDialogElement>('#settings-dialog'))?.showModal()));
}

function openDeck(deck?: Deck): void {
  const dialog = document.querySelector<HTMLDialogElement>('#deck-dialog');
  const form = document.querySelector<HTMLFormElement>('#deck-form');
  if (!dialog || !form) return;
  const elements = form.elements as typeof form.elements & { deckId: HTMLInputElement; name: HTMLInputElement; context: HTMLInputElement; language: HTMLInputElement; prompts: HTMLTextAreaElement };
  elements.deckId.value = deck?.id ?? '';
  elements.name.value = deck?.name ?? '';
  elements.context.value = deck?.context ?? '';
  elements.language.value = deck?.language ?? '';
  elements.prompts.value = deck?.prompts.map((prompt) => prompt.text).join('\n') ?? '';
  form.querySelector('[data-action="delete-deck"]')?.classList.toggle('hidden', !deck);
  dialog.showModal();
  elements.name.focus();
}

function bindHome(): void {
  bindCommon();
  document.querySelectorAll<HTMLElement>('[data-action]').forEach((element) => element.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLElement;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'new-deck') openDeck();
    if (action === 'edit-deck') openDeck(decks.find((deck) => deck.id === id));
    if (action === 'starter') { const deck = makeStarterDeck(); await db.saveDeck(deck); decks.push(deck); announce('Starter deck added. Make it yours.'); }
    if (action === 'dismiss-safety') { settings.outdoorReminderSeen = true; await db.saveSettings(settings); render(); }
    if (action === 'start' || action === 'start-record') await startSession(id ?? '', action === 'start-record');
    if (action === 'reviewed') await rescheduleTake(id ?? '', 7);
    if (action === 'delete-take') await deleteTake(id ?? '');
    if (action === 'export') await exportData();
    if (action === 'import') document.querySelector<HTMLInputElement>('#import-file')?.click();
    if (action === 'clear-data') await clearData();
  }));

  document.querySelector<HTMLFormElement>('#deck-form')?.addEventListener('submit', saveDeck);
  document.querySelector<HTMLButtonElement>('[data-action="delete-deck"]')?.addEventListener('click', deleteCurrentDeck);
  document.querySelector<HTMLFormElement>('#settings-form')?.addEventListener('submit', saveSettings);
  document.querySelector<HTMLInputElement>('#gap')?.addEventListener('input', (event) => {
    const output = document.querySelector<HTMLOutputElement>('#gap-output');
    if (output) output.value = `${(event.target as HTMLInputElement).value} seconds`;
  });
  document.querySelector<HTMLInputElement>('#import-file')?.addEventListener('change', importData);
  document.querySelector<HTMLFormElement>('#license-form')?.addEventListener('submit', restoreLicense);
}

async function saveDeck(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  const lines = promptLines(String(data.get('prompts') ?? ''));
  if (!lines.length) return announce('Add at least one prompt.');
  const existing = decks.find((deck) => deck.id === data.get('deckId'));
  const now = Date.now();
  const oldByText = new Map(existing?.prompts.map((prompt) => [prompt.text, prompt]));
  const deck: Deck = { id: existing?.id ?? crypto.randomUUID(), name: String(data.get('name')).trim(), context: String(data.get('context')).trim(), language: String(data.get('language')).trim() || 'Target language', createdAt: existing?.createdAt ?? now, updatedAt: now, prompts: lines.map((text) => oldByText.get(text) ?? { id: crypto.randomUUID(), text, createdAt: now, repetitions: 0 }) };
  await db.saveDeck(deck);
  decks = existing ? decks.map((item) => item.id === deck.id ? deck : item) : [...decks, deck];
  document.querySelector<HTMLDialogElement>('#deck-dialog')?.close();
  announce(existing ? 'Deck updated.' : 'Deck ready for rehearsal.');
}

async function deleteCurrentDeck(): Promise<void> {
  const id = (document.querySelector<HTMLInputElement>('[name="deckId"]'))?.value;
  const deck = decks.find((item) => item.id === id);
  if (!id || !deck || !confirm(`Delete “${deck.name}”? Its saved recordings will remain in the replay queue.`)) return;
  await db.deleteDeck(id); decks = decks.filter((item) => item.id !== id);
  document.querySelector<HTMLDialogElement>('#deck-dialog')?.close(); announce('Deck deleted.');
}

async function saveSettings(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  settings = { ...settings, gapSeconds: Number(data.get('gapSeconds')), textOnly: data.get('textOnly') === 'on', autoAdvance: data.get('autoAdvance') === 'on' };
  await db.saveSettings(settings); document.querySelector<HTMLDialogElement>('#settings-dialog')?.close(); announce('Rehearsal settings saved.');
}

async function startSession(deckId: string, record: boolean): Promise<void> {
  const deck = decks.find((item) => item.id === deckId);
  if (!deck) return;
  let stream: MediaStream | undefined;
  if (record) {
    if (!unlocked && takes.length >= 5) { announce('Your five free takes are full. Replay or delete one, or unlock unlimited recording.'); document.querySelector('#unlock')?.scrollIntoView(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { announce('Recording is not available in this browser. Starting without it.'); record = false; }
    else {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } }); }
      catch { announce('Microphone access was not granted. Starting without recording.'); record = false; }
    }
  }
  session = { deck: structuredClone(deck), index: 0, phase: 'prompt', record, stream, chunks: [], remainingMs: settings.gapSeconds * 1000, paused: false };
  render();
  if (!settings.textOnly) window.setTimeout(speakPrompt, 250);
}

function speakPrompt(): void {
  if (!session || session.phase !== 'prompt') return;
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(session.deck.prompts[session.index].text);
  utterance.rate = 0.92;
  utterance.onend = () => { if (session?.phase === 'prompt') beginGap(); };
  speechSynthesis.speak(utterance);
}

function beginGap(): void {
  if (!session || session.phase !== 'prompt') return;
  speechSynthesis.cancel();
  if (session.record && !unlocked && takes.length >= 5) session.record = false;
  session.phase = 'gap'; session.remainingMs = settings.gapSeconds * 1000; session.endAt = performance.now() + session.remainingMs; session.paused = false;
  if (session.record && session.stream) {
    session.chunks = [];
    const recorder = new MediaRecorder(session.stream);
    recorder.ondataavailable = (event) => { if (event.data.size) session?.chunks.push(event.data); };
    recorder.start(); session.recorder = recorder;
  }
  render();
  session.timer = window.setInterval(tick, 100);
}

function tick(): void {
  if (!session || session.phase !== 'gap' || session.paused || !session.endAt) return;
  session.remainingMs = Math.max(0, session.endAt - performance.now());
  const timer = document.querySelector('#timer-value');
  const bar = document.querySelector<HTMLElement>('#progress-bar');
  if (timer) timer.textContent = String(Math.ceil(session.remainingMs / 1000));
  if (bar) bar.style.width = `${(session.remainingMs / (settings.gapSeconds * 1000)) * 100}%`;
  if (session.remainingMs <= 0) void finishGap();
}

async function stopRecorder(): Promise<Blob | null> {
  if (!session?.recorder || session.recorder.state === 'inactive') return null;
  const recorder = session.recorder;
  return new Promise((resolve) => {
    recorder.onstop = () => resolve(session ? new Blob(session.chunks, { type: recorder.mimeType }) : null);
    recorder.stop();
  });
}

async function finishGap(): Promise<void> {
  if (!session || session.phase !== 'gap') return;
  if (session.timer) clearInterval(session.timer);
  const elapsed = settings.gapSeconds * 1000 - session.remainingMs;
  const audio = await stopRecorder();
  const prompt = session.deck.prompts[session.index];
  prompt.lastPracticedAt = Date.now(); prompt.repetitions += 1;
  if (audio?.size) {
    const take: Take = { id: crypto.randomUUID(), promptId: prompt.id, deckId: session.deck.id, promptText: prompt.text, createdAt: Date.now(), durationMs: Math.max(1000, elapsed), nextReplayAt: Date.now() + DAY_MS, mimeType: audio.type, audio };
    await db.saveTake(take); takes.push(take); session.lastTakeId = take.id;
  }
  await db.saveDeck(session.deck); decks = decks.map((deck) => deck.id === session?.deck.id ? structuredClone(session.deck) : deck);
  session.phase = 'review'; render();
}

function togglePause(): void {
  if (!session || session.phase !== 'gap') return;
  if (session.paused) {
    session.paused = false; session.endAt = performance.now() + session.remainingMs;
    if (session.recorder?.state === 'paused') session.recorder.resume();
  } else {
    session.paused = true;
    if (session.recorder?.state === 'recording') session.recorder.pause();
  }
  render();
  if (session.timer) clearInterval(session.timer);
  session.timer = window.setInterval(tick, 100);
}

async function schedule(days: number): Promise<void> {
  if (!session) return;
  const next = nextReplayAt(days);
  const prompt = session.deck.prompts[session.index]; prompt.nextDueAt = next;
  await db.saveDeck(session.deck);
  if (session.lastTakeId) {
    const take = takes.find((item) => item.id === session?.lastTakeId);
    if (take) { take.nextReplayAt = next; await db.saveTake(take); }
  }
  session.index += 1; session.lastTakeId = undefined;
  if (session.index >= session.deck.prompts.length) session.phase = 'complete';
  else { session.phase = 'prompt'; session.remainingMs = settings.gapSeconds * 1000; }
  render();
  if (session.phase === 'prompt' && !settings.textOnly) window.setTimeout(speakPrompt, settings.autoAdvance ? 250 : 600);
}

function endSession(): void {
  if (!session) return;
  if (session.phase !== 'complete' && !confirm('End this rehearsal? Completed prompts are already saved.')) return;
  if (session.timer) clearInterval(session.timer);
  speechSynthesis.cancel(); session.recorder?.state !== 'inactive' && session.recorder?.stop(); session.stream?.getTracks().forEach((track) => track.stop());
  session = null; render();
}

async function rescheduleTake(id: string, days: number): Promise<void> {
  const take = takes.find((item) => item.id === id); if (!take) return;
  take.nextReplayAt = Date.now() + days * DAY_MS; await db.saveTake(take); render(); announce('Replay scheduled for next week.');
}

async function deleteTake(id: string): Promise<void> {
  const take = takes.find((item) => item.id === id); if (!take || !confirm(`Delete the recording for “${take.promptText}”? This cannot be undone.`)) return;
  await db.deleteTake(id); takes = takes.filter((item) => item.id !== id); announce('Recording deleted.');
}

function blobToData(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
}

async function exportData(): Promise<void> {
  const exportTakes = await Promise.all(takes.map(async ({ audio, ...take }) => ({ ...take, audio: await blobToData(audio) })));
  const payload = { format: 'walk-talk-rehearsal', version: 1, exportedAt: new Date().toISOString(), decks, takes: exportTakes, settings };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `walk-talk-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); announce('Backup exported.');
}

async function importData(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text()) as { format: string; decks: Deck[]; takes: Array<Omit<Take, 'audio'> & { audio: string }>; settings: Settings };
    if (data.format !== 'walk-talk-rehearsal' || !Array.isArray(data.decks) || !Array.isArray(data.takes)) throw new Error('not a Walk & Talk backup');
    for (const deck of data.decks) await db.saveDeck(deck);
    for (const item of data.takes) { const response = await fetch(item.audio); await db.saveTake({ ...item, audio: await response.blob() }); }
    await db.saveSettings(data.settings); decks = await db.decks(); takes = await db.takes(); settings = await db.settings();
    document.querySelector<HTMLDialogElement>('#settings-dialog')?.close(); announce('Backup imported. Existing items with the same ID were updated.');
  } catch { announce('That file is not a valid Walk & Talk backup.'); }
}

async function clearData(): Promise<void> {
  if (!confirm('Erase every deck, recording, and setting from this browser? Export first if you may want them later.')) return;
  await db.clearAll(); decks = []; takes = []; settings = await db.settings(); document.querySelector<HTMLDialogElement>('#settings-dialog')?.close(); announce('All local rehearsal data erased.');
}

async function restoreLicense(event: SubmitEvent): Promise<void> {
  event.preventDefault(); const input = document.querySelector<HTMLInputElement>('#license-token'); if (!input?.value.trim()) return;
  storeLicense(input.value);
  try { const result = await verifyLicense(true); unlocked = result?.valid === true; licenseNotice = unlocked ? 'License restored. Unlimited local takes are active.' : 'That license is not active. Check the token and try again.'; }
  catch { licenseNotice = 'Could not check the license. Your free features still work; try again when online.'; }
  render();
}

document.addEventListener('click', (event) => {
  const button = (event.target as Element).closest<HTMLElement>('[data-action]');
  if (!button || !session) return;
  const action = button.dataset.action;
  if (action === 'begin-gap') beginGap();
  if (action === 'replay-prompt') speakPrompt();
  if (action === 'pause-session') togglePause();
  if (action === 'finish-gap') void finishGap();
  if (action === 'schedule') void schedule(Number(button.dataset.days));
  if (action === 'end-session') endSession();
  if (action === 'restart-session') { const id = session.deck.id; const record = session.record; session.stream?.getTracks().forEach((track) => track.stop()); session = null; void startSession(id, record); }
});

document.addEventListener('keydown', (event) => {
  if (!session) return;
  if (event.key === 'Escape') { event.preventDefault(); endSession(); }
  if (event.code === 'Space' && session.phase === 'gap' && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); togglePause(); }
});

window.addEventListener('online', () => { online = true; render(); });
window.addEventListener('offline', () => { online = false; render(); });

async function init(): Promise<void> {
  captureLicense();
  [decks, takes, settings] = await Promise.all([db.decks(), db.takes(), db.settings()]);
  render();
  try {
    const result = await verifyLicense();
    if (result) { unlocked = result.valid; if (!result.valid) licenseNotice = 'License no longer active. Free rehearsal remains available.'; render(); }
  } catch { /* Cached state remains; core experience stays available offline. */ }
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register('/sw.js');
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) announce('Update ready. Reload when you finish this rehearsal.'); });
    });
  }
}

init().catch(() => { app.innerHTML = `<main id="main" class="fatal"><h1>Your local workspace could not open.</h1><p>Private browsing or storage restrictions may be blocking IndexedDB. Allow site storage, then reload.</p><button class="button primary" onclick="location.reload()">Try again</button></main>`; });
