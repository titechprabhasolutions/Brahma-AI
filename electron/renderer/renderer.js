import {
  createFirebaseUser,
  deleteCurrentFirebaseUser,
  signInFirebaseUser,
  signInWithGoogleFirebase,
  signOutFirebaseUser,
  sendFirebasePasswordReset,
} from './firebase-auth.js';

const brahmaBridge = window.brahma || {
  backendUrl: 'http://127.0.0.1:8770',
  getAppState: async () => ({
    onboardingComplete: false,
    tutorialCompleted: false,
    userEmail: '',
    firebaseUserId: '',
    geminiApiKey: '',
    userName: '',
    userPhotoUrl: '',
    projectWorkspacePath: '',
    projectWorkspaceName: '',
    minimalMode: false,
    cacaMemory: null,
  }),
  saveAppState: async (state = {}) => ({
    onboardingComplete: false,
    tutorialCompleted: false,
    userEmail: '',
    firebaseUserId: '',
    geminiApiKey: '',
    userName: '',
    userPhotoUrl: '',
    projectWorkspacePath: '',
    projectWorkspaceName: '',
    minimalMode: false,
    cacaMemory: null,
    ...state,
  }),
  getActiveWindow: async () => null,
  generateQrDataUrl: async () => '',
};

const backendUrl = brahmaBridge.backendUrl;

const statusValue = document.getElementById('statusValue');
const cpuValue = document.getElementById('cpuValue');
const memValue = document.getElementById('memValue');
const camValue = document.getElementById('camValue');
const netValue = document.getElementById('netValue');
const logList = document.getElementById('logList');
const systemLogList = document.getElementById('systemLogList');
const commandForm = document.getElementById('commandForm');
const commandInput = document.getElementById('commandInput');
const apiForm = document.getElementById('apiForm');
const apiInput = document.getElementById('apiInput');
const apiHint = document.getElementById('apiHint');
const setupPanel = document.getElementById('setupPanel');
const shell = document.querySelector('.shell');
const sidebarToggle = document.getElementById('sidebarToggle');
const settingsTabBtn = document.getElementById('settingsTabBtn');
const cameraTabBtn = document.getElementById('cameraTabBtn');
const settingsPage = document.getElementById('settingsPage');
const micToggle = document.getElementById('micToggle');
const modeButtons = document.querySelectorAll('.mode-btn');
const modeStatus = document.getElementById('modeStatus');
const chatToggle = document.getElementById('chatToggle');
const projectWorkspaceRailBtn = document.getElementById('projectWorkspaceRailBtn');
const mobileLinkBtn = document.getElementById('mobileLinkBtn');
const mobileLinkOverlay = document.getElementById('mobileLinkOverlay');
const mobileLinkCloseBtn = document.getElementById('mobileLinkCloseBtn');
const mobileLinkQrImage = document.getElementById('mobileLinkQrImage');
const mobileLinkHost = document.getElementById('mobileLinkHost');
const mobileLinkAddresses = document.getElementById('mobileLinkAddresses');
const mobileLinkStatus = document.getElementById('mobileLinkStatus');
const mobileLinkRefreshBtn = document.getElementById('mobileLinkRefreshBtn');
const mobileLinkCopyBtn = document.getElementById('mobileLinkCopyBtn');
const voiceToggle = document.getElementById('voiceToggle');
const developerToggle = document.getElementById('developerToggle');
const kasaToggle = document.getElementById('kasaToggle');
const cadToggle = document.getElementById('cadToggle');
const voiceProfile = document.getElementById('voiceProfile');
const elevenLabsApiKey = document.getElementById('elevenLabsApiKey');
const elevenLabsVoiceId = document.getElementById('elevenLabsVoiceId');
const edgeVoice = document.getElementById('edgeVoice');
const piperExecutable = document.getElementById('piperExecutable');
const piperModel = document.getElementById('piperModel');
const saveVoiceSettingsBtn = document.getElementById('saveVoiceSettingsBtn');
const testVoiceBtn = document.getElementById('testVoiceBtn');
const voiceStatus = document.getElementById('voiceStatus');
const discordBotToken = document.getElementById('discordBotToken');
const discordChannelIds = document.getElementById('discordChannelIds');
const discordRemoteToggle = document.getElementById('discordRemoteToggle');
const discordMirrorToggle = document.getElementById('discordMirrorToggle');
const discordSaveBtn = document.getElementById('discordSaveBtn');
const discordTestBtn = document.getElementById('discordTestBtn');
const discordStatus = document.getElementById('discordStatus');
const discordStatusDot = document.getElementById('discordStatusDot');
const discordStatusText = document.getElementById('discordStatusText');
const discordStatusMeta = document.getElementById('discordStatusMeta');
const discordChannelPreview = document.getElementById('discordChannelPreview');
const discordLog = document.getElementById('discordLog');
const reactorDiscordBadge = document.getElementById('reactorDiscordBadge');
const minimalModeToggle = document.getElementById('minimalModeToggle');
const minimalModeHint = document.getElementById('minimalModeHint');
const settingsApiKeyInput = document.getElementById('settingsApiKeyInput');
const settingsApiSaveBtn = document.getElementById('settingsApiSaveBtn');
const settingsApiStatus = document.getElementById('settingsApiStatus');
const pluginList = document.getElementById('pluginList');
const pluginReloadBtn = document.getElementById('pluginReloadBtn');
const pluginOpenFolderBtn = document.getElementById('pluginOpenFolderBtn');
const pluginStatus = document.getElementById('pluginStatus');
const cameraPanel = document.getElementById('cameraPanel');
const cameraVideo = document.getElementById('cameraVideo');
const cameraImage = document.getElementById('cameraImage');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const cameraBadge = document.getElementById('cameraBadge');
const userProfileImage = document.getElementById('userProfileImage');
const userProfileFallback = document.getElementById('userProfileFallback');
const userProfileName = document.getElementById('userProfileName');
const userProfileEmail = document.getElementById('userProfileEmail');
const profileNameInput = document.getElementById('profileNameInput');
const profilePhotoFile = document.getElementById('profilePhotoFile');
const profilePhotoName = document.getElementById('profilePhotoName');
const profileEmailInput = document.getElementById('profileEmailInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const settingsResetPasswordBtn = document.getElementById('settingsResetPasswordBtn');
const logoutBtn = document.getElementById('logoutBtn');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const sequenceName = document.getElementById('sequenceName');
const sequenceSteps = document.getElementById('sequenceSteps');
const saveSequenceBtn = document.getElementById('saveSequenceBtn');
const startSequenceBtn = document.getElementById('startSequenceBtn');
const deleteSequenceBtn = document.getElementById('deleteSequenceBtn');
const sequenceList = document.getElementById('sequenceList');
const rightColumn = document.getElementById('rightColumn');
const sequencePanel = document.getElementById('sequencePanel');
let sequenceOpenBtn = document.getElementById('sequenceOpenBtn');
let sequenceCloseBtn = document.getElementById('sequenceCloseBtn');
const streamPanel = document.getElementById('streamPanel');
const commandTabBtn = document.getElementById('commandTabBtn');
const sequencesTabBtn = document.getElementById('sequencesTabBtn');
const logsTabBtn = document.getElementById('logsTabBtn');
const commandTabPane = document.getElementById('commandTabPane');
const logsTabPane = document.getElementById('logsTabPane');
let streamOpenBtn = document.getElementById('streamOpenBtn');
let streamCloseBtn = document.getElementById('streamCloseBtn');
const routineList = document.getElementById('routineList');
const createRoutineBtn = document.getElementById('createRoutineBtn');
const routineModal = document.getElementById('routineModal');
const routineModalCloseBtn = document.getElementById('routineModalCloseBtn');
const routineNameInput = document.getElementById('routineNameInput');
const routineStepsInput = document.getElementById('routineStepsInput');
const routineAutoRunInput = document.getElementById('routineAutoRunInput');
const routineTimeInput = document.getElementById('routineTimeInput');
const routineSaveBtn = document.getElementById('routineSaveBtn');
const routineRunBtn = document.getElementById('routineRunBtn');
const flowCommandText = document.getElementById('flowCommandText');
const flowResultText = document.getElementById('flowResultText');
const commandFlowCard = document.querySelector('.command-flow-card');
const resultFlowCard = document.querySelector('.result-flow-card');
const activeTaskCard = document.querySelector('.active-task-card');
const metricRibbon = document.querySelector('.metric-ribbon');
const controlsBelowReactor = document.querySelector('.controls-below-reactor');
const activeTaskTitle = document.getElementById('activeTaskTitle');
const activeTaskStatus = document.getElementById('activeTaskStatus');
const activeTaskMode = document.getElementById('activeTaskMode');
const activeTaskLast = document.getElementById('activeTaskLast');
const activeTaskProgress = document.getElementById('activeTaskProgress');
const activeTaskProgressValue = document.getElementById('activeTaskProgressValue');
const contextAssistantPanel = document.getElementById('contextAssistantPanel');
const contextAppBadge = document.getElementById('contextAppBadge');
const contextAssistantSubtitle = document.getElementById('contextAssistantSubtitle');
const contextActionOne = document.getElementById('contextActionOne');
const contextActionTwo = document.getElementById('contextActionTwo');
const contextActionThree = document.getElementById('contextActionThree');
const onboardingOverlay = document.getElementById('onboardingOverlay');
const bootOverlay = document.getElementById('bootOverlay');
const bootLog = document.getElementById('bootLog');
const bootWelcome = document.getElementById('bootWelcome');
const tutorialOverlay = document.getElementById('tutorialOverlay');
const tutorialHighlight = document.getElementById('tutorialHighlight');
const tutorialTitle = document.getElementById('tutorialTitle');
const tutorialDescription = document.getElementById('tutorialDescription');
const tutorialFeatureCards = document.getElementById('tutorialFeatureCards');
const tutorialSkipBtn = document.getElementById('tutorialSkipBtn');
const tutorialNextBtn = document.getElementById('tutorialNextBtn');
const tutorialDemoBtn = document.getElementById('tutorialDemoBtn');
const tutorialFinishBtn = document.getElementById('tutorialFinishBtn');
const authModeSignIn = document.getElementById('authModeSignIn');
const authModeCreate = document.getElementById('authModeCreate');
const authForm = document.getElementById('authForm');
const authStepAccount = document.getElementById('authStepAccount');
const authStepApi = document.getElementById('authStepApi');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const onboardingApiKey = document.getElementById('onboardingApiKey');
const authMessage = document.getElementById('authMessage');
const authSubmit = document.getElementById('authSubmit');
const authContinueBtn = document.getElementById('authContinueBtn');
const authBackBtn = document.getElementById('authBackBtn');
const testApiKeyBtn = document.getElementById('testApiKeyBtn');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const emailFeedback = document.getElementById('emailFeedback');
const passwordFeedback = document.getElementById('passwordFeedback');
const apiKeyFeedback = document.getElementById('apiKeyFeedback');
const onboardingStepLabel = document.getElementById('onboardingStepLabel');
const onboardingStepTitle = document.getElementById('onboardingStepTitle');
const progressDotOne = document.getElementById('progressDotOne');
const progressDotTwo = document.getElementById('progressDotTwo');
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmActions = document.getElementById('confirmActions');
const confirmAllowBtn = document.getElementById('confirmAllowBtn');
const confirmDenyBtn = document.getElementById('confirmDenyBtn');
const confirmSubtitle = document.getElementById('confirmSubtitle');
const cursorAssistant = document.getElementById('cursorAssistant');
const cursorAssistantClose = document.getElementById('cursorAssistantClose');
const cursorAssistantActions = document.getElementById('cursorAssistantActions');
const cursorAssistantSpinner = document.getElementById('cursorAssistantSpinner');

let lastLogTs = 0;
let cameraEnabled = false;
let gestureEnabled = false;
let micEnabled = false;
let cameraStream = null;
let authMode = 'signin';
let sidebarHidden = false; // keep sidebar visible by default
let appState = {
  onboardingComplete: false,
  tutorialCompleted: false,
  userEmail: '',
  firebaseUserId: '',
  geminiApiKey: '',
  projectWorkspacePath: '',
  projectWorkspaceName: '',
  minimalMode: false,
  cacaMemory: null,
};
let liveUserEntry = null;
let liveAiEntry = null;
let voiceSettingsHydrated = false;
let discordSettingsHydrated = false;
let lastDiscordEditTs = 0;
const discordLogLines = [];
let discordLastLatencyMs = null;
let discordLastChannelName = '';
let discordLastChannelId = '';
let discordLastStatus = 'DISCONNECTED';
let activeSidebarTab = 'camera';
let onboardingStep = 'account';
let tutorialStepIndex = 0;
let greetingSpoken = false;
let apiKeyHydrated = false;
// Show splash by default; other overlays stay hidden until flow triggers them.
onboardingOverlay?.classList.add('hidden');
bootOverlay?.classList.add('hidden');
let automationMode = 'assist';
let pendingPlan = null;
let mobileLinkInfo = null;
let sequenceBuilderOpen = false;
let commandStreamOpen = false;
let streamTab = 'commands';
let minimalMode = false;
let taskUiHideTimer = null;
let forcingMicEnable = false;
const SEQUENCE_PANEL_STORAGE_KEY = 'brahma-sequence-panel-open';
const COMMAND_STREAM_STORAGE_KEY = 'brahma-command-stream-open';
const ROUTINES_STORAGE_KEY = 'brahma-routines-v1';
const HIDDEN_DEFAULT_ROUTINES_KEY = 'brahma-hidden-default-routines-v1';
const DEFAULT_ROUTINES = [
  { name: 'Morning Setup', steps: ['open chrome', 'open gmail', 'open calendar'] },
  { name: 'Work Mode', steps: ['open chrome', 'open microsoft teams', 'open notepad'] },
  { name: 'Gaming Mode', steps: ['open steam', 'set system volume to 70'] },
];
let customRoutines = [];
let hiddenDefaultRoutineKeys = new Set();
let routineSchedules = {};
let contextMemoryPersistTimer = null;
let lastContextFingerprint = '';
const contextState = {
  active: {
    appKey: 'idle',
    appName: 'Idle',
    title: '',
    owner: '',
    suggestions: [],
  },
  session: {
    appKey: '',
    lastCommand: '',
    lastIntent: '',
    contact: '',
    ts: 0,
  },
  memory: {
    frequent_contacts: [],
    email_style: '',
    apps_used: {},
  },
};
if (routineAutoRunInput) routineAutoRunInput.checked = false;
if (routineTimeInput) routineTimeInput.disabled = true;

function shouldStickLogToBottom() {
  if (!logList) return false;
  const distanceFromBottom = logList.scrollHeight - logList.clientHeight - logList.scrollTop;
  return distanceFromBottom <= 48;
}

function keepLogPinnedIfNeeded(shouldPin) {
  if (!logList || !shouldPin) return;
  logList.scrollTop = logList.scrollHeight;
}

function appendEntry(targetList, text, type = 'sys') {
  if (!targetList) return null;
  const div = document.createElement('div');
  div.className = `log-entry ${type}`;
  div.textContent = text;
  targetList.appendChild(div);
  return div;
}

function shouldIncludeInSystemLogs(text = '') {
  const lower = String(text).toLowerCase();
  return (
    lower.startsWith('[sys]') ||
    lower.startsWith('[error]') ||
    lower.startsWith('[adv]') ||
    lower.startsWith('[file]') ||
    lower.startsWith('[browser]') ||
    lower.startsWith('[cad]') ||
    lower.startsWith('[auto]')
  );
}

function shouldShowInChat(text = '') {
  const lower = String(text).toLowerCase();
  if (lower.startsWith('you:')) return true;
  if (lower.startsWith('brahma ai:') || lower.startsWith('[ai]')) return true;
  return false;
}

function appendLocalLog(text, type = 'sys') {
  const shouldPin = shouldStickLogToBottom();
  if (shouldShowInChat(text)) {
    appendEntry(logList, text, type);
  }
  if (shouldIncludeInSystemLogs(text)) {
    appendEntry(systemLogList, text, type);
  }
  keepLogPinnedIfNeeded(shouldPin);
}

function appendDiscordLog(text = '') {
  if (!discordLog) return;
  const entry = String(text || '').trim();
  if (!entry) return;
  discordLogLines.push({ text: entry, ts: Date.now() });
  if (discordLogLines.length > 6) {
    discordLogLines.shift();
  }
  discordLog.innerHTML = '';
  discordLogLines.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'discord-log-entry';
    row.textContent = item.text;
    discordLog.appendChild(row);
  });
}

function setDiscordStatus({ connected = false, statusText = '', metaText = '', latencyMs = null } = {}) {
  const text = statusText || (connected ? 'CONNECTED TO DISCORD' : 'DISCONNECTED');
  discordLastStatus = text;
  if (discordStatusText) {
    discordStatusText.textContent = text;
  }
  if (discordStatusMeta) {
    const latencyLabel = latencyMs ? `Latency: ${latencyMs}ms` : 'Latency: --';
    discordStatusMeta.textContent = metaText ? `${latencyLabel} · ${metaText}` : latencyLabel;
  }
  if (discordStatusDot) {
    discordStatusDot.classList.toggle('connected', connected);
  }
  if (discordHomeText) {
    discordHomeText.textContent = text;
  }
  if (discordHomeDot) {
    discordHomeDot.classList.toggle('connected', connected);
  }
}

function updateDiscordChannelPreview(channelIds = []) {
  if (!discordChannelPreview) return;
  const ids = Array.isArray(channelIds) ? channelIds.filter(Boolean) : [];
  if (!ids.length) {
    discordChannelPreview.textContent = 'No channels linked yet.';
    return;
  }
  if (discordLastChannelName && discordLastChannelId) {
    discordChannelPreview.textContent = `Connected to: #${discordLastChannelName} (${discordLastChannelId})`;
    return;
  }
  const display = ids.slice(0, 4).map((id) => `#${id}`).join(', ');
  discordChannelPreview.textContent = `Connected to: ${display}`;
}

function updateDiscordUiFromState(state = {}) {
  const settings = state.discordSettings || {};
  const configured = !!state.discordConfigured;
  const remoteEnabled = !!settings.remoteEnabled;
  const channelIds = Array.isArray(settings.remoteChannelIds) ? settings.remoteChannelIds : [];
  updateDiscordChannelPreview(channelIds);

  let meta = remoteEnabled ? 'Listening for commands...' : 'Remote control off';
  if (!configured) {
    meta = 'Add a bot token to connect.';
  }
  setDiscordStatus({
    connected: configured,
    statusText: configured ? 'CONNECTED TO DISCORD' : 'DISCONNECTED',
    metaText: meta,
    latencyMs: discordLastLatencyMs,
  });

  if (reactorDiscordBadge) {
    reactorDiscordBadge.classList.toggle('hidden', !configured);
  }

  if (!discordLogLines.length) {
    appendDiscordLog(configured ? 'Bot authenticated. Listening for commands...' : 'Awaiting Discord credentials...');
  }

  // No home widget; keep status in settings only.
}

function scheduleContextMemoryPersist() {
  if (contextMemoryPersistTimer) return;
  contextMemoryPersistTimer = setTimeout(async () => {
    contextMemoryPersistTimer = null;
    try {
      await saveAppState({
        cacaMemory: {
          ...contextState.memory,
          session: { ...contextState.session },
          active: {
            appKey: contextState.active.appKey,
            appName: contextState.active.appName,
            title: contextState.active.title,
          },
          updatedAt: Date.now(),
        },
      });
    } catch (_error) {
      // ignore transient save errors
    }
  }, 1500);
}

function normalizeActiveApp(activeWindow) {
  if (!activeWindow) {
    return { appKey: 'idle', appName: 'Idle', title: '', owner: '', suggestions: [] };
  }
  const owner = String(activeWindow.owner || '').trim();
  const title = String(activeWindow.title || '').trim();
  const url = String(activeWindow.url || '').trim().toLowerCase();
  const ownerLower = owner.toLowerCase();
  const titleLower = title.toLowerCase();

  let appKey = 'desktop';
  let appName = owner || 'Desktop';

  if (titleLower.includes('gmail') || url.includes('mail.google.com')) {
    appKey = 'gmail';
    appName = 'Gmail';
  } else if (titleLower.includes('whatsapp') || ownerLower.includes('whatsapp')) {
    appKey = 'whatsapp';
    appName = 'WhatsApp';
  } else if (ownerLower.includes('chrome') || ownerLower.includes('msedge') || ownerLower.includes('firefox')) {
    appKey = 'browser';
    appName = owner || 'Browser';
  } else if (ownerLower.includes('discord') || titleLower.includes('discord')) {
    appKey = 'discord';
    appName = 'Discord';
  } else if (ownerLower.includes('outlook') || titleLower.includes('outlook')) {
    appKey = 'email';
    appName = 'Outlook';
  } else if (ownerLower.includes('code') || titleLower.includes('visual studio code')) {
    appKey = 'coding';
    appName = 'VS Code';
  }

  const suggestionMap = {
    gmail: ['Write email', 'Reply to latest', 'Clean inbox'],
    whatsapp: ['Send message', 'Reply in current chat', 'Check unread chats'],
    discord: ['Send server message', 'Reply in channel', 'List mentions'],
    browser: ['Search topic', 'Open Gmail', 'Summarize this page'],
    coding: ['Create project files', 'Explain code', 'Run build command'],
    email: ['Draft reply', 'Summarize inbox', 'Schedule follow-up'],
    desktop: ['Open app', 'Organize files', 'Run routine'],
  };

  return {
    appKey,
    appName,
    title,
    owner,
    suggestions: suggestionMap[appKey] || suggestionMap.desktop,
  };
}

function renderContextAssistant() {
  if (!contextAssistantPanel || !contextAppBadge || !contextAssistantSubtitle) return;
  const active = contextState.active || {};
  const suggestions = Array.isArray(active.suggestions) ? active.suggestions : [];
  const hasContext = active.appKey && active.appKey !== 'idle';
  contextAssistantPanel.classList.toggle('hidden', !hasContext);
  if (!hasContext) return;
  contextAppBadge.textContent = active.appName || 'Desktop';
  const title = String(active.title || '').trim();
  contextAssistantSubtitle.textContent = title
    ? `You opened ${active.appName}. Need help with this: ${title.slice(0, 90)}`
    : `You opened ${active.appName}. Need help?`;
  const buttons = [contextActionOne, contextActionTwo, contextActionThree];
  buttons.forEach((btn, idx) => {
    if (!btn) return;
    const label = suggestions[idx] || `Action ${idx + 1}`;
    btn.textContent = label;
    btn.disabled = !label;
  });
}

function bindContextSuggestionActions() {
  const buttons = [contextActionOne, contextActionTwo, contextActionThree];
  buttons.forEach((btn) => {
    btn?.addEventListener('click', async () => {
      const label = String(btn.textContent || '').trim();
      if (!label) return;
      const command = buildContextSuggestionCommand(label);
      if (!command) return;
      if (commandInput) {
        commandInput.value = command;
      }
      await sendCommand(command, { skipModeSuggest: true, forceContinue: true });
      if (commandInput) {
        commandInput.value = '';
        commandInput.focus();
      }
    });
  });
}

function trackContextMemory(commandText = '') {
  const active = contextState.active || {};
  const appKey = String(active.appKey || '');
  if (appKey) {
    contextState.memory.apps_used[appKey] = Number(contextState.memory.apps_used[appKey] || 0) + 1;
  }
  const raw = String(commandText || '').trim();
  if (!raw) return;
  const lower = raw.toLowerCase();
  const contactMatch = lower.match(/\b(?:to|contact|chat|message)\s+([a-z][a-z0-9 _-]{1,40})/i);
  if (contactMatch) {
    const contact = contactMatch[1].trim();
    contextState.session.contact = contact;
    if (!contextState.memory.frequent_contacts.includes(contact)) {
      contextState.memory.frequent_contacts.unshift(contact);
      contextState.memory.frequent_contacts = contextState.memory.frequent_contacts.slice(0, 8);
    }
  }
  if (appKey === 'gmail' || lower.includes('email')) {
    if (/(formal|profession|official)/i.test(lower)) contextState.memory.email_style = 'formal';
    if (/(casual|friendly|simple)/i.test(lower)) contextState.memory.email_style = 'casual';
  }
  contextState.session = {
    ...contextState.session,
    appKey: appKey || contextState.session.appKey,
    lastCommand: raw,
    lastIntent: lower.includes('send message') ? 'send_message' : (lower.includes('email') ? 'email' : 'general'),
    ts: Date.now(),
  };
  scheduleContextMemoryPersist();
}

function buildContextSuggestionCommand(label = '') {
  const action = String(label || '').trim().toLowerCase();
  const active = contextState.active || {};
  const appKey = String(active.appKey || '');
  const appName = active.appName || 'current app';
  const rememberedContact = String(contextState.session?.contact || '').trim();

  if (!action) return '';

  const commandMap = {
    gmail: {
      'write email': 'In Gmail, compose a new email draft in the currently open browser window and ask me for recipient/subject if missing.',
      'reply to latest': 'In Gmail, open the latest relevant email and prepare a smart reply draft in the same browser window.',
      'clean inbox': 'In Gmail, list emails that can be archived or deleted and ask for confirmation before deleting anything.',
    },
    whatsapp: {
      'send message': rememberedContact
        ? `In WhatsApp, continue in the same app and send a message to ${rememberedContact}.`
        : 'In WhatsApp, continue in the same app and send a message. Ask me contact name first if needed.',
      'reply in current chat': 'In WhatsApp, continue in the currently open chat and draft/send the reply.',
      'check unread chats': 'In WhatsApp, check unread chats and summarize who messaged me.',
    },
    discord: {
      'send server message': 'In Discord, continue in the same app and send a message to the active server/channel.',
      'reply in channel': 'In Discord, continue in the same channel and draft/send a reply.',
      'list mentions': 'In Discord, list recent mentions and unread important messages.',
    },
    browser: {
      'search topic': 'In this browser window, search the current topic and summarize top results.',
      'open gmail': 'Open Gmail in the same browser window (reuse existing tab/window).',
      'summarize this page': 'Summarize the currently open web page in this browser window.',
    },
    coding: {
      'create project files': 'In the current coding workspace, create project files for the current request.',
      'explain code': 'Explain the currently visible code context and suggest improvements.',
      'run build command': 'Run the project build command in the active workspace and report errors.',
    },
    email: {
      'draft reply': 'In the current email app, draft a professional reply to the selected email.',
      'summarize inbox': 'Summarize important unread emails in the current inbox.',
      'schedule follow-up': 'Create a follow-up reminder for the current email thread.',
    },
    desktop: {
      'open app': 'Open the app I need and keep context continuity with this current flow.',
      'organize files': 'Organize recent files on Desktop/Downloads into sensible folders.',
      'run routine': 'Run morning setup routine.',
    },
  };

  const mapped = commandMap[appKey]?.[action];
  if (mapped) return mapped;
  return `${label} in ${appName} without restarting context.`;
}

function buildContextAwareCommand(text, options = {}) {
  const raw = String(text || '').trim();
  if (!raw) return raw;
  const activeAppKey = String(contextState.active?.appKey || '').trim();
  if (!options.forceContinue && (!activeAppKey || activeAppKey === 'idle')) {
    return raw;
  }
  if (options.forceContinue) {
    const appName = contextState.active.appName || contextState.session.appKey || 'current app';
    const previous = contextState.session.lastCommand || 'previous command';
    return `[Context-aware continuous mode]
Active app: ${appName}
Continue the same ongoing task without restarting context.
Previous command: ${previous}
Follow-up command: ${raw}`;
  }
  const now = Date.now();
  const age = now - Number(contextState.session.ts || 0);
  const followUp = raw.split(/\s+/).length <= 8 || /^(say|also|then|and|reply|send this|send it)/i.test(raw);
  if (!followUp || age > 6 * 60 * 1000) return raw;
  const appName = contextState.active.appName || contextState.session.appKey || 'current app';
  const previous = contextState.session.lastCommand || 'previous command';
  return `[Context-aware continuous mode]
Active app: ${appName}
Continue the same ongoing task without restarting context.
Previous command: ${previous}
Follow-up command: ${raw}`;
}

async function pollActiveContext() {
  if (typeof brahmaBridge.getActiveWindow !== 'function') return;
  try {
    const win = await brahmaBridge.getActiveWindow();
    const normalized = normalizeActiveApp(win);
    const fingerprint = `${normalized.appKey}|${normalized.title}|${normalized.owner}`;
    contextState.active = normalized;
    renderContextAssistant();
    if (fingerprint && fingerprint !== lastContextFingerprint) {
      lastContextFingerprint = fingerprint;
      if (normalized.appKey && normalized.appKey !== 'idle') {
        appendLocalLog(`[sys] Context: ${normalized.appName}${normalized.title ? ` • ${normalized.title}` : ''}`);
      }
      trackContextMemory('');
    }
  } catch (_error) {
    // ignore active window poll errors
  }
}

function classify(text) {
  const lower = text.toLowerCase();
  if (lower.startsWith('you:')) return 'you';
  if (lower.startsWith('brahma ai:') || lower.startsWith('[ai]')) return 'ai';
  return 'sys';
}

function renderLogs(logs) {
  const nextLogs = logs.filter((entry) => entry.ts >= lastLogTs);
  if (!nextLogs.length) return;
  const shouldPin = shouldStickLogToBottom();
  lastLogTs = nextLogs[nextLogs.length - 1].ts + 0.0001;
  nextLogs.forEach((entry) => {
    const kind = classify(entry.text);
    if (shouldShowInChat(entry.text)) {
      appendEntry(logList, entry.text, kind);
    }
    if (shouldIncludeInSystemLogs(entry.text)) {
      appendEntry(systemLogList, entry.text, kind);
    }
  });
  keepLogPinnedIfNeeded(shouldPin);
}

function renderPlugins(plugins = []) {
  if (!pluginList) return;
  const list = Array.isArray(plugins) ? plugins : [];
  if (!list.length) {
    pluginList.innerHTML = '';
    if (pluginStatus) pluginStatus.textContent = 'No plugins loaded.';
    return;
  }
  pluginList.innerHTML = list.map((plugin) => {
    const name = plugin?.name || 'Unnamed plugin';
    const desc = plugin?.description || '';
    const version = plugin?.version || '0.0.0';
    const error = plugin?.error || '';
    const statusText = error ? 'Error' : 'Loaded';
    return `
      <div class="plugin-card">
        <div class="plugin-meta">
          <div class="plugin-name">${name} <span class="plugin-status ${error ? 'error' : ''}">${statusText}</span></div>
          <div class="plugin-desc">${desc || 'No description provided.'}</div>
        </div>
        <div class="plugin-status ${error ? 'error' : ''}">v${version}</div>
      </div>
    `;
  }).join('');
  if (pluginStatus) {
    const errors = list.filter((plugin) => plugin?.error);
    pluginStatus.textContent = errors.length
      ? `${errors.length} plugin(s) failed to load.`
      : `${list.length} plugin(s) loaded.`;
  }
}

function ensureLiveEntry(kind) {
  const className = kind === 'ai' ? 'ai' : 'you';
  let entry = kind === 'ai' ? liveAiEntry : liveUserEntry;
  if (entry && entry.isConnected) {
    return entry;
  }
  entry = document.createElement('div');
  entry.className = `log-entry ${className} live-entry hidden`;
  if (kind === 'ai') {
    liveAiEntry = entry;
  } else {
    liveUserEntry = entry;
  }
  logList.appendChild(entry);
  return entry;
}

function updateLiveTranscript(kind, text) {
  const entry = ensureLiveEntry(kind);
  const shouldPin = shouldStickLogToBottom();
  const prefix = kind === 'ai' ? 'Brahma AI: ' : 'You: ';
  const value = String(text || '').trim();
  if (!value) {
    entry.textContent = '';
    entry.classList.add('hidden');
    return;
  }
  entry.textContent = `${prefix}${value}`;
  entry.classList.remove('hidden');
  keepLogPinnedIfNeeded(shouldPin);
}

function getVoiceSettingsPayload() {
  return {
    profile: voiceProfile?.value || 'jarvis',
    elevenLabsApiKey: elevenLabsApiKey?.value?.trim() || '',
    elevenLabsVoiceId: elevenLabsVoiceId?.value?.trim() || '',
    edgeVoice: edgeVoice?.value?.trim() || 'en-US-GuyNeural',
    piperExecutable: piperExecutable?.value?.trim() || '',
    piperModel: piperModel?.value?.trim() || '',
  };
}

function getDiscordSettingsPayload() {
  return {
    botToken: String(discordBotToken?.value || '').trim(),
    remoteEnabled: Boolean(discordRemoteToggle?.checked),
    mirrorEnabled: Boolean(discordMirrorToggle?.checked),
    remoteChannelIds: String(discordChannelIds?.value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

function hydrateVoiceSettings(settings = {}, capabilities = {}) {
  if (!voiceProfile) return;
  if (!voiceSettingsHydrated) {
    voiceProfile.value = settings.profile || 'jarvis';
    elevenLabsApiKey.value = settings.elevenLabsApiKey || '';
    elevenLabsVoiceId.value = settings.elevenLabsVoiceId || '';
    edgeVoice.value = settings.edgeVoice || 'en-US-GuyNeural';
    piperExecutable.value = settings.piperExecutable || '';
    piperModel.value = settings.piperModel || '';
    voiceSettingsHydrated = true;
  }
  const availability = [
    `ElevenLabs ${capabilities.elevenlabs ? 'ready' : 'not ready'}`,
    `Edge ${capabilities.edge_tts ? 'ready' : 'not ready'}`,
    `Piper ${capabilities.piper ? 'ready' : 'not ready'}`,
  ];
  if (voiceStatus) {
    voiceStatus.textContent = availability.join(' â€¢ ');
  }
}

function hydrateDiscordSettings(settings = {}) {
  const now = Date.now();
  if (now - lastDiscordEditTs < 1500) {
    return;
  }
  if (discordRemoteToggle) {
    discordRemoteToggle.checked = Boolean(settings.remoteEnabled);
  }
  if (discordMirrorToggle) {
    discordMirrorToggle.checked = Boolean(settings.mirrorEnabled);
  }
  if (discordChannelIds) {
    const incoming = Array.isArray(settings.remoteChannelIds) ? settings.remoteChannelIds : [];
    if (incoming.length || !discordChannelIds.value.trim() || !discordSettingsHydrated) {
      discordChannelIds.value = incoming.join(', ');
    }
  }
  if (discordBotToken && !discordSettingsHydrated) {
    if (!discordBotToken.value) {
      discordBotToken.value = '';
    }
  }
  discordSettingsHydrated = true;
}

function setStatusText(status) {
  statusValue.textContent = String(status || 'ONLINE').toUpperCase();
}

function syncSidebarToggle() {
  if (!shell || !sidebarToggle) return;
  shell.classList.toggle('sidebar-hidden', sidebarHidden);
  sidebarToggle.textContent = sidebarHidden ? '>' : '<';
}

function setSidebarVisibility(hidden) {
  sidebarHidden = !!hidden;
  syncSidebarToggle();
}

async function loadMobileLinkInfo() {
  try {
    mobileLinkStatus.textContent = 'Checking local network...';
    const res = await fetch(`${backendUrl}/api/connection-info`);
    const data = await res.json();
    if (!res.ok || !data?.primaryHost) {
      throw new Error(data?.error || 'Connection info unavailable.');
    }
    mobileLinkInfo = data;
    mobileLinkHost.textContent = data.primaryHost;
    mobileLinkAddresses.textContent = data.addresses?.length ? data.addresses.join('\n') : data.primaryHost;
    const qrPayload = data.qrUrl || data.primaryHost;
    const localQr = await brahmaBridge.generateQrDataUrl(qrPayload);
    mobileLinkQrImage.src =
      localQr ||
      `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrPayload)}`;
    mobileLinkStatus.textContent = 'Scan from Brahma Mobile on the same Wi-Fi network.';
  } catch (error) {
    mobileLinkHost.textContent = 'Unavailable';
    mobileLinkAddresses.textContent = 'No LAN host detected yet.';
    mobileLinkQrImage.removeAttribute('src');
    mobileLinkStatus.textContent = error.message || 'Could not prepare mobile link QR.';
  }
}

function compactWorkspaceLabel(pathValue, nameValue) {
  const path = String(pathValue || '').trim();
  const name = String(nameValue || '').trim();
  if (!path) return 'No project selected';
  return name ? `${name} - ${path}` : path;
}

function getProjectWorkspaceState(hybrid = {}) {
  const workspacePath = String(hybrid.projectWorkspacePath || appState.projectWorkspacePath || '').trim();
  const workspaceName = String(hybrid.projectWorkspaceName || appState.projectWorkspaceName || '').trim();
  return { workspacePath, workspaceName };
}

function renderProjectWorkspace(hybrid = {}) {
  const { workspacePath, workspaceName } = getProjectWorkspaceState(hybrid);
  if (projectWorkspaceRailBtn) {
    projectWorkspaceRailBtn.title = workspacePath
      ? `Project workspace: ${workspacePath}`
      : 'Choose a project workspace';
    projectWorkspaceRailBtn.classList.toggle('active', !!workspacePath);
  }
  const popup = toolRegistry.get('project-workspace');
  if (!popup) return;
  const title = popup.querySelector('.project-workspace-popup-current');
  const hint = popup.querySelector('.project-workspace-popup-hint');
  const status = popup.querySelector('.project-workspace-popup-status');
  const clearBtn = popup.querySelector('.project-workspace-popup-clear');
  const openBtn = popup.querySelector('.project-workspace-popup-open');
  if (title) {
    title.textContent = compactWorkspaceLabel(workspacePath, workspaceName);
    title.title = workspacePath || 'No project selected';
  }
  if (hint) {
    hint.textContent = workspacePath
      ? 'All modes can use this folder for apps, websites, files, and generated outputs.'
      : 'Choose or create a project folder to give Brahma one shared workspace in every mode.';
  }
  if (status) {
    status.textContent = workspacePath ? `Active workspace ready: ${workspaceName || workspacePath}` : 'Waiting for a project selection.';
  }
  if (clearBtn) {
    clearBtn.disabled = !workspacePath;
  }
  if (openBtn) {
    openBtn.disabled = !workspacePath;
  }
}

function setProjectWorkspacePopupStatus(message, isError = false) {
  const popup = toolRegistry.get('project-workspace');
  const status = popup?.querySelector('.project-workspace-popup-status');
  if (!status) return;
  status.textContent = String(message || '').trim();
  status.classList.toggle('error', !!isError);
}

async function saveProjectWorkspace(pathValue, nameValue) {
  const payload = {
    projectWorkspacePath: String(pathValue || '').trim(),
    projectWorkspaceName: String(nameValue || '').trim(),
  };
  const res = await fetch(`${backendUrl}/api/hybrid-settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || 'Could not save project workspace.');
  }
  await saveAppState(payload);
  renderProjectWorkspace(data?.hybrid || {});
  return data;
}

async function callProjectWorkspaceApi(payload) {
  const res = await fetch(`${backendUrl}/api/project-workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || data?.result?.error || 'Project workspace request failed.');
  }
  if (data?.hybrid) {
    await saveAppState({
      projectWorkspacePath: data.hybrid.projectWorkspacePath || '',
      projectWorkspaceName: data.hybrid.projectWorkspaceName || '',
    });
    renderProjectWorkspace(data.hybrid);
  }
  return data;
}

async function chooseProjectWorkspace() {
  try {
    const picker = toolRegistry.get('project-workspace')?.querySelector('.project-workspace-popup-picker');
    if (!picker) {
      throw new Error('Folder picker is not ready.');
    }
    setProjectWorkspacePopupStatus('Choose a folder from the picker...');
    picker.value = '';
    picker.click();
  } catch (error) {
    setProjectWorkspacePopupStatus(error?.message || 'Project workspace selection failed.', true);
    appendLocalLog(`[error] ${error?.message || 'Project workspace selection failed.'}`);
  }
}

async function createProjectWorkspace() {
  try {
    const popup = toolRegistry.get('project-workspace');
    const input = popup?.querySelector('.project-workspace-popup-input');
    const fallbackName = appState.projectWorkspaceName || `My Brahma Project ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(/[: ]/g, '-')}`;
    const name = String(input?.value || '').trim() || fallbackName;
    setProjectWorkspacePopupStatus(`Creating ${name}...`);
    const data = await callProjectWorkspaceApi({ action: 'create', name });
    const result = data?.result || {};
    if (input) input.value = result.name || name;
    setProjectWorkspacePopupStatus(`Created ${result.path}`);
    appendLocalLog(`[sys] Created project workspace at ${result.path}`);
  } catch (error) {
    setProjectWorkspacePopupStatus(error?.message || 'Project workspace creation failed.', true);
    appendLocalLog(`[error] ${error?.message || 'Project workspace creation failed.'}`);
  }
}

async function clearProjectWorkspace() {
  try {
    await callProjectWorkspaceApi({ action: 'clear' });
    setProjectWorkspacePopupStatus('Project workspace cleared.');
    appendLocalLog('[sys] Project workspace cleared. New project files will use normal defaults again.');
  } catch (error) {
    setProjectWorkspacePopupStatus(error?.message || 'Could not clear the project workspace.', true);
    appendLocalLog(`[error] ${error?.message || 'Could not clear the project workspace.'}`);
  }
}

function createProjectWorkspacePopup() {
  if (!toolLayer) return null;
  const existing = toolRegistry.get('project-workspace');
  if (existing) {
    bringToFront(existing);
    renderProjectWorkspace({});
    return existing;
  }

  if (toolRegistry.size >= MAX_POPUPS) {
    const first = [...toolRegistry.values()][0];
    closeTool(first);
  }

  const wrap = document.createElement('div');
  wrap.className = 'project-workspace-popup';
  wrap.style.zIndex = String(++toolZ);
  wrap.innerHTML = `
    <div class="project-workspace-popup-header">
      <div class="project-workspace-popup-title">Brahma Project Workspace</div>
      <div class="project-workspace-popup-actions-top">
        <button class="project-workspace-popup-icon project-workspace-popup-min">–</button>
        <button class="project-workspace-popup-icon project-workspace-popup-close">×</button>
      </div>
    </div>
    <div class="project-workspace-popup-body">
      <div class="project-workspace-popup-kicker">Shared across all modes</div>
      <div class="project-workspace-popup-current">No project selected</div>
      <div class="project-workspace-popup-hint">Choose or create a project folder to give Brahma one shared workspace in every mode.</div>
      <input class="project-workspace-popup-input" type="text" placeholder="New project folder name" />
      <div class="project-workspace-popup-actions">
        <button class="project-workspace-popup-btn project-workspace-popup-choose">Choose Folder</button>
        <button class="project-workspace-popup-btn project-workspace-popup-create">Create New</button>
      </div>
      <div class="project-workspace-popup-actions">
        <button class="project-workspace-popup-btn project-workspace-popup-open">Open Folder</button>
        <button class="project-workspace-popup-btn danger project-workspace-popup-clear">Clear Project</button>
      </div>
      <div class="project-workspace-popup-status">Waiting for a project selection.</div>
      <input class="project-workspace-popup-picker hidden" type="file" webkitdirectory directory />
    </div>
  `;
  toolLayer.appendChild(wrap);
  toolRegistry.set('project-workspace', wrap);
  makeDraggable(wrap, wrap.querySelector('.project-workspace-popup-header'));

  wrap.querySelector('.project-workspace-popup-close')?.addEventListener('click', () => closeTool(wrap));
  wrap.querySelector('.project-workspace-popup-min')?.addEventListener('click', () => wrap.classList.toggle('minimized'));
  wrap.querySelector('.project-workspace-popup-choose')?.addEventListener('click', chooseProjectWorkspace);
  wrap.querySelector('.project-workspace-popup-create')?.addEventListener('click', createProjectWorkspace);
  wrap.querySelector('.project-workspace-popup-clear')?.addEventListener('click', clearProjectWorkspace);
  wrap.querySelector('.project-workspace-popup-open')?.addEventListener('click', async () => {
    try {
      const data = await callProjectWorkspaceApi({ action: 'open' });
      const path = data?.result?.path || '';
      setProjectWorkspacePopupStatus(path ? `Opened ${path}` : 'Opened project workspace.');
    } catch (error) {
      setProjectWorkspacePopupStatus(error?.message || 'Could not open the project workspace.', true);
      appendLocalLog(`[error] ${error?.message || 'Could not open the project workspace.'}`);
    }
  });
  wrap.querySelector('.project-workspace-popup-picker')?.addEventListener('change', async (event) => {
    try {
      const files = Array.from(event.target?.files || []);
      const first = files[0];
      const rawPath = String(first?.path || '').trim();
      if (!rawPath) {
        throw new Error('This folder picker only works after selecting a folder that contains at least one file.');
      }
      const normalized = rawPath.replace(/\\/g, '/');
      const fileName = normalized.split('/').pop() || '';
      const folderPath = rawPath.slice(0, rawPath.length - fileName.length).replace(/[\\\/]+$/, '');
      const data = await callProjectWorkspaceApi({ action: 'select', path: folderPath });
      setProjectWorkspacePopupStatus(`Selected ${data?.result?.path || folderPath}`);
      appendLocalLog(`[sys] Project workspace set to ${data?.result?.path || folderPath}`);
    } catch (error) {
      setProjectWorkspacePopupStatus(error?.message || 'Could not set the selected project workspace.', true);
      appendLocalLog(`[error] ${error?.message || 'Could not set the selected project workspace.'}`);
    }
  });

  requestAnimationFrame(() => wrap.classList.add('visible'));
  renderProjectWorkspace({});
  return wrap;
}

async function openMobileLinkOverlay() {
  mobileLinkOverlay?.classList.remove('hidden');
  await loadMobileLinkInfo();
}

function closeMobileLinkOverlay() {
  mobileLinkOverlay?.classList.add('hidden');
}

function syncSidebarPanels() {
  settingsPage?.classList.toggle('hidden', activeSidebarTab !== 'settings');
  document.querySelector('.core-panel')?.classList.toggle('hidden', activeSidebarTab === 'settings');
  document.querySelector('.right-column')?.classList.toggle('hidden', activeSidebarTab === 'settings');
  shell?.classList.toggle('settings-mode', activeSidebarTab === 'settings');
  const cameraVisible = cameraEnabled || gestureEnabled;
  cameraPanel?.classList.toggle('hidden', !cameraVisible || activeSidebarTab === 'settings');
  document.querySelector('.reactor-stage')?.classList.toggle('camera-active', cameraVisible && activeSidebarTab !== 'settings');
  settingsTabBtn?.classList.toggle('active', activeSidebarTab === 'settings');
  cameraTabBtn?.classList.toggle('active', activeSidebarTab === 'camera');
}

function renderUserProfile() {
  const email = appState.userEmail || '';
  const photo = appState.userPhotoUrl || '';
  const fallbackName = email ? email.split('@')[0] : 'Guest User';
  const displayName = appState.userName || fallbackName;

  if (userProfileName) {
    userProfileName.textContent = displayName || 'Guest User';
  }
  if (userProfileEmail) {
    userProfileEmail.textContent = email || 'Not signed in';
  }
  if (profileNameInput) {
    profileNameInput.value = displayName || '';
  }
  if (profilePhotoName) {
    profilePhotoName.textContent = photo ? photo.split(/[/\\]/).pop() : 'No file selected';
  }
  if (profileEmailInput) {
    profileEmailInput.value = email || '';
  }
  if (userProfileFallback) {
    userProfileFallback.textContent = (displayName || 'G').slice(0, 1).toUpperCase();
  }

  if (photo) {
    userProfileImage?.classList.remove('hidden');
    userProfileFallback?.classList.add('hidden');
    userProfileImage.src = photo;
  } else {
    userProfileImage?.classList.add('hidden');
    userProfileImage?.removeAttribute('src');
    userProfileFallback?.classList.remove('hidden');
  }
}

function setModeButton(button, active) {
  if (!button) return;
  button.classList.toggle('active', !!active);
}

function clearTaskUiHideTimer() {
  if (taskUiHideTimer) {
    clearTimeout(taskUiHideTimer);
    taskUiHideTimer = null;
  }
}

function setTaskUiVisible(visible) {
  const shouldShow = !!visible && !minimalMode;
  shell?.classList.toggle('task-ui-visible', shouldShow);
  shell?.classList.toggle('task-ui-hidden', !shouldShow);
}

function hideTaskUiNow() {
  clearTaskUiHideTimer();
  setTaskUiVisible(false);
}

function showTransientTaskUi(durationMs = 5000) {
  if (minimalMode) return;
  clearTaskUiHideTimer();
  setTaskUiVisible(true);
  taskUiHideTimer = setTimeout(() => {
    setTaskUiVisible(false);
  }, Math.max(1200, Number(durationMs) || 5000));
}

function syncSettingsApiUi() {
  if (settingsApiKeyInput && document.activeElement !== settingsApiKeyInput) {
    settingsApiKeyInput.value = String(appState.geminiApiKey || '').trim();
  }
  if (settingsApiStatus) {
    settingsApiStatus.textContent = appState.geminiApiKey
      ? 'API key saved locally. You can replace it anytime.'
      : 'No API key saved yet. Paste a key and click Save API Key.';
  }
}

async function ensureMicEnabled(source = 'minimal mode') {
  if (micEnabled || forcingMicEnable) return;
  forcingMicEnable = true;
  try {
    const res = await fetch(`${backendUrl}/api/toggle-mic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    micEnabled = !!data.micEnabled;
    setModeButton(micToggle, micEnabled);
    if (!micEnabled) {
      appendLocalLog(`[error] Could not force-enable microphone for ${source}.`);
    }
  } catch (_error) {
    appendLocalLog(`[error] Could not force-enable microphone for ${source}.`);
  } finally {
    forcingMicEnable = false;
  }
}

async function setMinimalMode(nextEnabled, { persist = true, forceMic = true } = {}) {
  minimalMode = !!nextEnabled;
  shell?.classList.toggle('minimal-mode', minimalMode);
  if (minimalMode) {
    activeSidebarTab = 'camera';
    syncSidebarPanels();
    hideTaskUiNow();
  } else if (!shell?.classList.contains('task-ui-visible')) {
    shell?.classList.add('task-ui-hidden');
    syncSidebarPanels();
  }
  if (minimalModeToggle) {
    minimalModeToggle.checked = minimalMode;
  }
  if (minimalModeHint) {
    minimalModeHint.textContent = minimalMode
      ? 'Minimal Mode ON: mic is pinned ON. Showing only reactor, controls, and command input.'
      : 'Minimal Mode OFF: full dashboard widgets are visible.';
  }
  if (forceMic && minimalMode) {
    await ensureMicEnabled('Minimal Mode');
  }
  if (persist) {
    await saveAppState({ minimalMode });
  }
}

function renderSequences(items = []) {
  if (!sequenceList) return;
  sequenceList.innerHTML = '';
  items.forEach((item) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'sequence-chip';
    chip.textContent = item;
    chip.addEventListener('click', () => {
      sequenceName.value = item.replaceAll('_', ' ');
    });
    sequenceList.appendChild(chip);
  });
}

function persistRoutines() {
  try {
    localStorage.setItem(
      ROUTINES_STORAGE_KEY,
      JSON.stringify({
        customRoutines,
        hiddenDefaultRoutineKeys: Array.from(hiddenDefaultRoutineKeys),
      })
    );
  } catch (_error) {}
}

function normalizeRoutineKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function syncRoutineSchedulesFromState(schedules = {}) {
  const mapped = {};
  if (schedules && typeof schedules === 'object') {
    Object.entries(schedules).forEach(([key, item]) => {
      if (!item || typeof item !== 'object') return;
      const name = String(item.name || '').trim();
      const scheduleTime = String(item.time || '').trim();
      const enabled = Boolean(item.enabled);
      const normalized = normalizeRoutineKey(name || key);
      if (!normalized) return;
      mapped[normalized] = { name: name || key, time: scheduleTime, enabled };
    });
  }
  routineSchedules = mapped;
}

function loadRoutines() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ROUTINES_STORAGE_KEY) || '[]');
    const customList = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.customRoutines) ? parsed.customRoutines : [];
    customRoutines = customList
        .filter((item) => item && typeof item.name === 'string' && Array.isArray(item.steps))
        .map((item) => ({
          name: item.name.trim(),
          steps: item.steps.map((step) => String(step || '').trim()).filter(Boolean),
          autoRun: Boolean(item.autoRun),
          scheduleTime: String(item.scheduleTime || '').trim(),
        }))
        .filter((item) => item.name && item.steps.length);
    const hiddenList = Array.isArray(parsed?.hiddenDefaultRoutineKeys) ? parsed.hiddenDefaultRoutineKeys : [];
    hiddenDefaultRoutineKeys = new Set(
      hiddenList
        .map((item) => normalizeRoutineKey(item))
        .filter(Boolean)
    );
  } catch (_error) {
    customRoutines = [];
    hiddenDefaultRoutineKeys = new Set();
  }
}

function getAllRoutines() {
  const defaults = DEFAULT_ROUTINES
    .filter((item) => !hiddenDefaultRoutineKeys.has(normalizeRoutineKey(item.name)))
    .map((item) => ({ ...item, isDefault: true }));
  const customs = customRoutines.map((item) => ({ ...item, isDefault: false }));
  return [...defaults, ...customs];
}

async function deleteRoutine(routine) {
  const name = String(routine?.name || '').trim();
  if (!name) return;
  const ok = window.confirm(`Delete routine "${name}"?`);
  if (!ok) return;
  const key = normalizeRoutineKey(name);
  if (routine?.isDefault) {
    hiddenDefaultRoutineKeys.add(key);
  } else {
    customRoutines = customRoutines.filter((item) => normalizeRoutineKey(item?.name) !== key);
  }
  persistRoutines();
  renderRoutines();
  try {
    const res = await fetch(`${backendUrl}/api/sequence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', name }),
    });
    const data = await res.json().catch(() => ({}));
    syncRoutineSchedulesFromState(data.routineSchedules || {});
    renderRoutines();
  } catch (_error) {}
  appendLocalLog(`[sys] Deleted routine: ${name}`);
}

function renderRoutines() {
  if (!routineList) return;
  routineList.innerHTML = '';
  getAllRoutines().forEach((routine) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'routine-item';
    const routineName = document.createElement('span');
    routineName.className = 'routine-item-name';
    routineName.textContent = routine.name;
    row.appendChild(routineName);
    const key = normalizeRoutineKey(routine.name);
    const schedule = routineSchedules[key];
    const fallbackTime = routine.autoRun && routine.scheduleTime ? routine.scheduleTime : '';
    const scheduleText = schedule?.enabled && schedule?.time ? schedule.time : fallbackTime;
    if (scheduleText) {
      const meta = document.createElement('span');
      meta.className = 'routine-item-meta';
      meta.textContent = `AUTO ${scheduleText}`;
      row.appendChild(meta);
    }
    row.addEventListener('click', () => {
      sequenceName.value = routine.name;
      sequenceSteps.value = routine.steps.join('\n');
      setSequenceBuilderOpen(true);
      setStreamTab('sequences');
    });
    const runBtn = document.createElement('button');
    runBtn.type = 'button';
    runBtn.className = 'routine-run-btn';
    runBtn.textContent = 'Run';
    runBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      await runRoutine(routine);
    });
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'routine-delete-btn';
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      await deleteRoutine(routine);
    });
    const wrap = document.createElement('div');
    wrap.className = 'routine-card';
    wrap.appendChild(row);
    wrap.appendChild(runBtn);
    wrap.appendChild(deleteBtn);
    routineList.appendChild(wrap);
  });
}

async function runRoutine(routine) {
  const name = String(routine?.name || '').trim();
  const steps = Array.isArray(routine?.steps) ? routine.steps : [];
  if (!name || !steps.length) return;
  try {
    const res = await fetch(`${backendUrl}/api/sequence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', name, steps }),
    });
    const data = await res.json().catch(() => ({}));
    syncRoutineSchedulesFromState(data.routineSchedules || {});
    renderRoutines();
    appendLocalLog(`[sys] ${data.message || `Started routine: ${name}`}`);
  } catch (_error) {
    appendLocalLog(`[error] Could not run routine: ${name}`);
  }
}

function setStreamTab(nextTab = 'commands') {
  streamTab = nextTab;
  const tabMap = {
    commands: [commandTabBtn, commandTabPane],
    sequences: [sequencesTabBtn, sequencePanel],
    logs: [logsTabBtn, logsTabPane],
  };
  Object.entries(tabMap).forEach(([name, [btn, pane]]) => {
    const active = name === nextTab;
    btn?.classList.toggle('active', active);
    pane?.classList.toggle('active', active);
  });
}

function updateActiveTask(state = {}) {
  const status = String(state.status || 'ONLINE');
  const lastLog = Array.isArray(state.logs) && state.logs.length ? String(state.logs[state.logs.length - 1].text || '') : '';
  const lastAction = lastLog.replace(/^(\[sys\]|\[error\]|Brahma AI:|You:)\s*/i, '') || 'Waiting for command';
  const normalizedMode =
    automationMode === 'do' ? 'Do This' :
    automationMode === 'observe' ? 'Observe' :
    'Assist';
  const pct = status === 'PROCESSING' || status === 'ANALYZING' || status === 'RESPONDING' || status === 'SPEAKING'
    ? 68
    : status === 'LISTENING'
      ? 45
      : 100;
  if (activeTaskMode) activeTaskMode.textContent = normalizedMode;
  if (activeTaskTitle) activeTaskTitle.textContent = `Running: ${flowCommandText?.textContent || 'Awaiting task'}`;
  if (activeTaskStatus) activeTaskStatus.textContent = `Status: ${status}`;
  if (activeTaskLast) activeTaskLast.textContent = `Last action: ${lastAction}`;
  if (activeTaskProgress) activeTaskProgress.style.width = `${pct}%`;
  if (activeTaskProgressValue) activeTaskProgressValue.textContent = `${pct}%`;
}

function setSequenceBuilderOpen(nextOpen, { persist = true } = {}) {
  sequenceBuilderOpen = Boolean(nextOpen);
  sequenceOpenBtn?.classList.toggle('hidden', sequenceBuilderOpen);
  sequenceCloseBtn?.classList.toggle('hidden', !sequenceBuilderOpen);
  if (sequenceBuilderOpen) {
    setStreamTab('sequences');
  } else if (streamTab === 'sequences') {
    setStreamTab('commands');
  }
  if (persist) {
    try {
      localStorage.setItem(SEQUENCE_PANEL_STORAGE_KEY, sequenceBuilderOpen ? '1' : '0');
    } catch (_error) {}
  }
}

function setCommandStreamOpen(nextOpen, { persist = true } = {}) {
  commandStreamOpen = Boolean(nextOpen);
  shell?.classList.toggle('right-panel-hidden', !commandStreamOpen);
  rightColumn?.classList.toggle('stream-collapsed', !commandStreamOpen);
  streamPanel?.classList.toggle('hidden', !commandStreamOpen);
  streamOpenBtn?.classList.toggle('hidden', commandStreamOpen);
  streamCloseBtn?.classList.toggle('hidden', !commandStreamOpen);
  if (persist) {
    try {
      localStorage.setItem(COMMAND_STREAM_STORAGE_KEY, commandStreamOpen ? '1' : '0');
    } catch (_error) {}
  }
}

function ensureRightPanelToggles() {
  const dock = document.querySelector('.sequence-toggle-dock');
  if (!dock) return;
  if (!streamOpenBtn) {
    streamOpenBtn = document.createElement('button');
    streamOpenBtn.id = 'streamOpenBtn';
    streamOpenBtn.className = 'stream-edge-toggle';
    streamOpenBtn.type = 'button';
    streamOpenBtn.setAttribute('aria-label', 'Open command stream');
    streamOpenBtn.title = 'Open command stream';
    shell?.appendChild(streamOpenBtn);
  }
  if (!streamCloseBtn) {
    streamCloseBtn = document.createElement('button');
    streamCloseBtn.id = 'streamCloseBtn';
    streamCloseBtn.className = 'stream-edge-toggle hidden';
    streamCloseBtn.type = 'button';
    streamCloseBtn.setAttribute('aria-label', 'Close command stream');
    streamCloseBtn.title = 'Close command stream';
    shell?.appendChild(streamCloseBtn);
  }
}

function initializeSequenceBuilderState() {
  let savedOpen = false;
  try {
    savedOpen = localStorage.getItem(SEQUENCE_PANEL_STORAGE_KEY) === '1';
  } catch (_error) {}
  let savedStreamOpen = true;
  try {
    const raw = localStorage.getItem(COMMAND_STREAM_STORAGE_KEY);
    savedStreamOpen = raw === null ? true : raw === '1';
  } catch (_error) {}
  ensureRightPanelToggles();
  if (streamOpenBtn) streamOpenBtn.innerHTML = '&#9664;';
  if (streamCloseBtn) streamCloseBtn.innerHTML = '&#9654;';
  if (sequenceOpenBtn) sequenceOpenBtn.innerHTML = '&#9664;';
  if (sequenceCloseBtn) sequenceCloseBtn.innerHTML = '&#9654;';
  setCommandStreamOpen(savedStreamOpen, { persist: false });
  setSequenceBuilderOpen(savedOpen, { persist: false });
  setStreamTab(savedOpen ? 'sequences' : 'commands');
}

function showBrowserCamera() {
  cameraVideo.classList.remove('hidden');
  cameraImage.classList.add('hidden');
  cameraPlaceholder.classList.add('hidden');
}

function showBackendPreview(imageB64) {
  cameraVideo.classList.add('hidden');
  if (imageB64) {
    cameraPlaceholder.classList.add('hidden');
    cameraImage.classList.remove('hidden');
    cameraImage.src = `data:image/jpeg;base64,${imageB64}`;
  } else {
    cameraImage.classList.add('hidden');
    cameraImage.removeAttribute('src');
    cameraPlaceholder.classList.remove('hidden');
  }
}

function fakeMetric(seed, base, range) {
  return base + ((Math.sin(Date.now() / 900 + seed) + 1) * range) / 2;
}

// Popup tool system
const toolLayer = document.getElementById('toolPopupLayer');
let toolZ = 40;
const toolRegistry = new Map(); // name -> element
const MAX_POPUPS = 6;

const toolUrlMap = {
  spotify: (q) => q ? `https://open.spotify.com/search/${encodeURIComponent(q)}` : 'https://open.spotify.com',
  youtube: (q) => q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : 'https://www.youtube.com',
  maps:    (q) => q ? `https://www.google.com/maps/search/${encodeURIComponent(q)}` : 'https://www.google.com/maps',
  calculator: () => 'https://www.google.com/search?q=calculator',
  notes: () => 'https://keep.google.com',
  clipboard: () => 'about:blank',
};

// CAD tool state
const cadViewers = new Map(); // popup -> {renderer, scene, camera, controls}
let lastCadPrompt = '';
let threeReady = false;
let threeLoading = null;

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function ensureThreeReady() {
  if (threeReady) return Promise.resolve();
  if (threeLoading) return threeLoading;
  threeLoading = (async () => {
    if (!window.THREE) {
      await loadScript('https://unpkg.com/three@0.160.0/build/three.min.js');
    }
    if (!THREE.OrbitControls) {
      await loadScript('https://unpkg.com/three@0.160.0/examples/js/controls/OrbitControls.js');
    }
    if (!THREE.STLLoader) {
      await loadScript('https://unpkg.com/three@0.160.0/examples/js/loaders/STLLoader.js');
    }
    threeReady = true;
  })();
  return threeLoading;
}

function createToolPopup(name, url) {
  if (!toolLayer) return;
  // focus existing
  if (toolRegistry.has(name)) {
    const el = toolRegistry.get(name);
    bringToFront(el);
    const frame = el.querySelector('iframe');
    if (frame && frame.dataset.src !== url) frame.src = url;
    return el;
  }
  // limit
  if (toolRegistry.size >= MAX_POPUPS) {
    const first = [...toolRegistry.values()][0];
    closeTool(first);
  }
  const wrap = document.createElement('div');
  wrap.className = 'tool-popup';
  wrap.style.zIndex = String(++toolZ);
  wrap.style.left = `${18 + toolRegistry.size * 18}%`;
  wrap.style.top = `${14 + toolRegistry.size * 12}%`;

  const header = document.createElement('div');
  header.className = 'tool-header';
  header.innerHTML = `<div class="tool-title">${name}</div>`;

  const actions = document.createElement('div');
  actions.className = 'tool-actions';
  const minBtn = document.createElement('button');
  minBtn.className = 'tool-btn';
  minBtn.textContent = 'â€“';
  minBtn.onclick = () => wrap.classList.toggle('minimized');
  const closeBtn = document.createElement('button');
  closeBtn.className = 'tool-btn';
  closeBtn.textContent = 'Ã—';
  closeBtn.onclick = () => closeTool(wrap);
  actions.append(minBtn, closeBtn);
  header.appendChild(actions);

  makeDraggable(wrap, header);

  const body = document.createElement('div');
  body.className = 'tool-body';
  const frame = document.createElement('webview');
  frame.dataset.src = url;
  frame.src = url;
  frame.addEventListener('dom-ready', () => {
    const contents = frame.getWebContents?.();
    if (contents?.setWindowOpenHandler) {
      contents.setWindowOpenHandler(({ url: nextUrl }) => {
        frame.loadURL?.(nextUrl) ?? (frame.src = nextUrl);
        return { action: 'deny' };
      });
    }
  });
  frame.addEventListener('new-window', (e) => {
    e.preventDefault();
    frame.loadURL?.(e.url) ?? (frame.src = e.url);
  });
  frame.addEventListener('will-navigate', (e) => {
    frame.loadURL?.(e.url) ?? (frame.src = e.url);
  });
  body.appendChild(frame);

  wrap.append(header, body);
  toolLayer.appendChild(wrap);
  toolRegistry.set(name, wrap);
  requestAnimationFrame(() => wrap.classList.add('visible'));
  return wrap;
}

function closeTool(el) {
  const name = [...toolRegistry.entries()].find(([, v]) => v === el)?.[0];
  if (name) toolRegistry.delete(name);
  el.remove();
}

function bringToFront(el) {
  el.style.zIndex = String(++toolZ);
}

function makeDraggable(el, handle) {
  let startX = 0, startY = 0, origX = 0, origY = 0, dragging = false;
  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.tool-actions, .cad-actions, .project-workspace-popup-actions-top')) return; // allow header buttons to work
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origX = el.offsetLeft;
    origY = el.offsetTop;
    bringToFront(el);
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    el.style.left = `${origX + dx}px`;
    el.style.top = `${origY + dy}px`;
  });
  handle.addEventListener('pointerup', () => { dragging = false; });
}

// ---------------- CAD Popup ----------------
function setupCadViewer(container) {
  const width = container.clientWidth || 400;
  const height = container.clientHeight || 320;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setClearColor(0x050c16, 1);
  renderer.domElement.className = 'cad-canvas';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(60, 40, 60);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  const light = new THREE.DirectionalLight(0xffffff, 1.0);
  light.position.set(50, 60, 50);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x335577, 0.6));

  const grid = new THREE.GridHelper(120, 24, 0x1ea0ff, 0x0c253d);
  scene.add(grid);

  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth || width;
    const h = container.clientHeight || height;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(container);

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
  return { renderer, scene, camera, controls, resizeObserver };
}

function renderCadStl(popup, stlB64) {
  const viewerWrap = popup.querySelector('.cad-viewer');
  if (!viewerWrap) return;
  if (!window.THREE || !THREE.STLLoader) return;
  const existing = cadViewers.get(popup);
  if (!existing) {
    const viewer = setupCadViewer(viewerWrap);
    cadViewers.set(popup, viewer);
  }
  const viewer = cadViewers.get(popup);
  // remove old meshes
  [...viewer.scene.children].forEach((obj) => {
    if (obj.isMesh) viewer.scene.remove(obj);
  });
  viewer.controls.update();
  try {
    const loader = new THREE.STLLoader();
    const arrayBuffer = Uint8Array.from(atob(stlB64), (c) => c.charCodeAt(0)).buffer;
    const geometry = loader.parse(arrayBuffer);
    const material = new THREE.MeshStandardMaterial({ color: 0x42e8ff, metalness: 0.15, roughness: 0.25, emissive: 0x0f2236, emissiveIntensity: 0.6 });
    const mesh = new THREE.Mesh(geometry, material);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    mesh.position.sub(center);
    // Upscale tiny models so they are visible
    const maxDimRaw = Math.max(size.x, size.y, size.z, 0.001);
    if (maxDimRaw < 5) {
      const scale = 40 / maxDimRaw;
      mesh.scale.set(scale, scale, scale);
      mesh.updateMatrix();
    }
    viewer.scene.add(mesh);
    const helper = new THREE.BoxHelper(mesh, 0xffaa33);
    viewer.scene.add(helper);
    viewer.controls.target.set(0, 0, 0);
    const maxDim = Math.max(
      (size.x * mesh.scale.x),
      (size.y * mesh.scale.y),
      (size.z * mesh.scale.z),
      1
    );
    if (maxDim < 0.001) {
      renderFallbackCube(viewer);
      return;
    }
    const dist = maxDim * 2.5;
    viewer.camera.position.set(dist, dist, dist);
    viewer.camera.lookAt(0, 0, 0);
    viewer.controls.update();
    viewer.renderer.render(viewer.scene, viewer.camera);
  } catch (err) {
    renderFallbackCube(viewer);
  }
}

function renderFallbackCube(viewer) {
  [...viewer.scene.children].forEach((obj) => {
    if (obj.isMesh) viewer.scene.remove(obj);
  });
  const geometry = new THREE.BoxGeometry(20, 20, 20);
  const material = new THREE.MeshStandardMaterial({ color: 0xffaa33, metalness: 0.1, roughness: 0.45 });
  const mesh = new THREE.Mesh(geometry, material);
  viewer.scene.add(mesh);
  const helper = new THREE.BoxHelper(mesh, 0xffffff);
  viewer.scene.add(helper);
  viewer.controls.target.set(0, 0, 0);
  viewer.camera.position.set(50, 40, 50);
  viewer.camera.lookAt(0, 0, 0);
  viewer.controls.update();
  viewer.renderer.render(viewer.scene, viewer.camera);
}

function setCadStatus(popup, text) {
  const status = popup.querySelector('.cad-status');
  if (status) status.textContent = text;
}

function createCadPopup(initialPrompt = '', autoGenerate = false) {
  ensureThreeReady();
  if (!toolLayer) return null;
  const existing = toolRegistry.get('cad');
  if (existing) {
    bringToFront(existing);
    wireCadPopup(existing); // ensure listeners bound
    if (initialPrompt) {
      const inp = existing.querySelector('.cad-input');
      if (inp) inp.value = initialPrompt;
      if (autoGenerate) existing.querySelector('.cad-generate')?.click();
    }
    return existing;
  }

  if (toolRegistry.size >= MAX_POPUPS) {
    const first = [...toolRegistry.values()][0];
    closeTool(first);
  }

  const wrap = document.createElement('div');
  wrap.className = 'cad-popup';
  wrap.style.zIndex = String(++toolZ);
  wrap.innerHTML = `
    <div class="cad-header">
      <div class="cad-title">Brahma CAD Studio</div>
      <div class="cad-actions">
        <button class="cad-btn cad-min cad-icon-btn">–</button>
        <button class="cad-btn cad-close cad-icon-btn">×</button>
      </div>
    </div>
    <div class="cad-body">
      <div class="cad-input-row">
        <input class="cad-input" type="text" placeholder="Describe your model (e.g., gear with 20 teeth)" />
        <button class="cad-generate">Generate</button>
      </div>
      <div class="cad-viewer"></div>
      <div class="cad-footer">
        <div class="cad-downloads">
          <button class="cad-download-stl" disabled>Download STL</button>
          <button class="cad-download-step" disabled>Download STEP</button>
        </div>
        <div class="cad-status">Waiting for promptâ€¦</div>
      </div>
    </div>
  `;
  toolLayer.appendChild(wrap);
  toolRegistry.set('cad', wrap);
  makeDraggable(wrap, wrap.querySelector('.cad-header'));
  requestAnimationFrame(() => wrap.classList.add('visible'));
  wireCadPopup(wrap);

  if (initialPrompt) {
    const input = wrap.querySelector('.cad-input');
    if (input) input.value = initialPrompt;
    if (autoGenerate) wrap.querySelector('.cad-generate')?.click();
  }
  return wrap;
}

function wireCadPopup(wrap) {
  if (wrap.dataset.wired === '1') return;
  wrap.dataset.wired = '1';
  ensureThreeReady().catch(() => {});
  const input = wrap.querySelector('.cad-input');
  const generateBtn = wrap.querySelector('.cad-generate');
  const closeBtn = wrap.querySelector('.cad-close');
  const minBtn = wrap.querySelector('.cad-min');
  const dlStl = wrap.querySelector('.cad-download-stl');
  const dlStep = wrap.querySelector('.cad-download-step');
  let stlUrl = '';
  let stepUrl = '';
  let overlay = wrap.querySelector('.cad-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'cad-overlay';
    overlay.textContent = 'Rendering...';
    wrap.querySelector('.cad-viewer')?.appendChild(overlay);
  }

  closeBtn.onclick = () => closeTool(wrap);
  minBtn.onclick = () => wrap.classList.toggle('minimized');

  async function doGenerate() {
    await ensureThreeReady().catch(() => {});
    const prompt = (input?.value || '').trim();
    if (!prompt) return;
    setCadStatus(wrap, 'Generating…');
    lastCadPrompt = prompt;
    if (dlStl) dlStl.disabled = true;
    if (dlStep) dlStep.disabled = true;
    overlay?.classList.add('visible');
    try {
      const res = await fetch(`${backendUrl}/api/cad/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'generate_failed');
      if (data.stlB64 && dlStl) {
        appendLocalLog(`[cad] STL bytes: ${data.stlB64.length}`);
        renderCadStl(wrap, data.stlB64);
        stlUrl = `data:model/stl;base64,${data.stlB64}`;
        dlStl.disabled = false;
      }
      if (data.stepB64 && dlStep) {
        stepUrl = `data:application/octet-stream;base64,${data.stepB64}`;
        dlStep.disabled = false;
      }
      setCadStatus(wrap, data.stlB64 ? 'Rendered model' : 'No STL returned');
      if (!data.stlB64) {
        appendLocalLog('[cad] No STL returned from backend.');
      }
    } catch (err) {
      // Fallback: simple cube STL so UI stays responsive
      appendLocalLog(`[cad] Error generating model: ${err?.message || err}`);
      const stlText = "solid cube\nfacet normal 0 0 0\nouter loop\nvertex 0 0 0\nvertex 10 0 0\nvertex 0 10 0\nendloop\nendfacet\nendsolid cube\n";
      const b64 = btoa(stlText);
      renderCadStl(wrap, b64);
      stlUrl = `data:model/stl;base64,${b64}`;
      if (dlStl) dlStl.disabled = false;
      setCadStatus(wrap, 'Ready (fallback)');
    } finally {
      overlay?.classList.remove('visible');
    }
  }

  generateBtn?.addEventListener('click', doGenerate);
  dlStl?.addEventListener('click', () => {
    if (!stlUrl) return;
    const a = document.createElement('a');
    a.href = stlUrl;
    a.download = 'brahma_model.stl';
    a.click();
  });
  dlStep?.addEventListener('click', () => {
    if (!stepUrl) return;
    const a = document.createElement('a');
    a.href = stepUrl;
    a.download = 'brahma_model.step';
    a.click();
  });
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doGenerate();
    }
  });
}

function suggestModeForText(text) {
  const t = text.toLowerCase();
  const doKeywords = /(open|click|type|run|start|launch|create|play|automate|do this|execute|perform)/;
  const observeKeywords = /(watch|monitor|keep an eye|observe|look at my screen|what's on my screen|what am i doing)/;
  if (doKeywords.test(t)) return 'do';
  if (observeKeywords.test(t)) return 'observe';
  return null;
}

async function handleToolCommand(text) {
  const t = text.toLowerCase();
  const wantsMinimal = /(minimal mode|minimal ui|minimal)/.test(t);
  const disableMinimal = /(turn off|disable|exit|leave|switch off|toggle off|normal mode|full mode|back to normal|standard mode)/.test(t);
  const enableMinimal = /(turn on|enable|enter|switch on|toggle on|start)/.test(t);

  if (wantsMinimal && (disableMinimal || /off/.test(t))) {
    await setMinimalMode(false, { persist: true, forceMic: false });
    appendLocalLog('[sys] Minimal Mode disabled. Back to normal dashboard.');
    return true;
  }

  if (wantsMinimal && (enableMinimal || /on/.test(t))) {
    await setMinimalMode(true, { persist: true, forceMic: true });
    appendLocalLog('[sys] Minimal Mode enabled.');
    return true;
  }

  if (/(normal mode|full dashboard|exit minimal)/.test(t)) {
    await setMinimalMode(false, { persist: true, forceMic: false });
    appendLocalLog('[sys] Switched to normal dashboard mode.');
    return true;
  }

  const isSystem = /(open )?(chrome|notepad|vscode|file explorer)/.test(t);
  if (isSystem) return false; // let backend open natively

  if (/(cad|model|design|3d|stl|gear|box)/.test(t)) {
    createCadPopup(text, true);
    return true;
  }

  if (/spotify|youtube|map|calculator|calc|note|keep/.test(t)) {
    appendLocalLog('[sys] Routing request to backend (external launch, no popup).');
    return false;
  }

  return false;
}

function setAutomationMode(mode, syncBackend = true) {
  if (mode === 'advanced') {
    mode = 'assist';
  }
  const modeChanged = automationMode !== mode;
  automationMode = mode;
  modeButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.mode === mode));
  if (modeStatus) {
    const label =
      mode === 'do'
        ? 'Do This mode'
        : mode === 'observe'
          ? 'Observe mode'
          : 'Assist mode';
    modeStatus.textContent = label;
    modeStatus.classList.remove('mode-pill-advanced');
  }
  if (syncBackend && modeChanged) {
    fetch(`${backendUrl}/api/automation/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    }).catch(() => {});
    fetch(`${backendUrl}/api/hybrid-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        advancedMode: false,
      }),
    }).catch(() => {});
  }
}

function renderConfirmActions(plan) {
  if (!confirmActions) return;
  confirmActions.innerHTML = '';
  const actions = plan?.actions || [];
  if (!actions.length) {
    const div = document.createElement('div');
    div.className = 'confirm-action';
    div.textContent = plan?.note || 'No actions to run.';
    confirmActions.appendChild(div);
    return;
  }
  actions.forEach((act, idx) => {
    const div = document.createElement('div');
    div.className = 'confirm-action';
    const label = act.note || act.label || act.kind || 'Action';
    div.textContent = `${idx + 1}. ${label}`;
    confirmActions.appendChild(div);
  });
}

function showAutomationConfirm(plan) {
  pendingPlan = plan;
  if (confirmSubtitle) {
    confirmSubtitle.textContent = plan?.note || 'Brahma will act on your screen after you confirm.';
  }
  renderConfirmActions(plan);
  confirmOverlay?.classList.remove('hidden');
}

function hideAutomationConfirm() {
  confirmOverlay?.classList.add('hidden');
}

async function sendCommand(text, options = {}) {
  const suggested = suggestModeForText(text);
  if (!options.skipModeSuggest && suggested && suggested !== automationMode) {
    const label = suggested === 'do' ? 'Do This' : suggested === 'observe' ? 'Observe' : 'Assist';
    const ok = window.confirm(`Switch to ${label} mode for this command?`);
    if (ok) {
      setAutomationMode(suggested);
    }
  }
  const payload = text.trim();
  if (!payload) return;
  trackContextMemory(payload);
  const contextualPayload = buildContextAwareCommand(payload, options);
  showTransientTaskUi(5000);
  if (flowCommandText) {
    flowCommandText.textContent = payload.length > 64 ? `${payload.slice(0, 61)}...` : payload;
  }
  if (flowResultText) {
    flowResultText.textContent = 'Processing...';
  }
  if (await handleToolCommand(payload)) {
    commandInput.value = '';
    return;
  }
  // For now, route Do mode through normal backend send to ensure actions run reliably.
  // (Automation planner remains available for future use.)
  try {
    const res = await fetch(`${backendUrl}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: contextualPayload,
        projectWorkspacePath: appState.projectWorkspacePath || '',
        projectWorkspaceName: appState.projectWorkspaceName || '',
      }),
    });
    const data = await res.json().catch(() => ({}));
    const message = String(data?.message || '').trim();

    if (!res.ok || data?.ok === false) {
      appendLocalLog(`[error] ${message || 'Command failed.'}`);
      if (flowResultText) {
        flowResultText.textContent = message || 'Command failed';
      }
      await pollState();
      return;
    }
    if (flowResultText) {
      flowResultText.textContent = message || 'Action completed';
    }

    // The backend already writes the authoritative log lines.
    // Poll immediately so the command stream updates without duplicating messages locally.
    await pollState();
  } catch (error) {
    appendLocalLog(`[error] ${error?.message || 'Command request failed.'}`);
  }
}

// Cursor Assistant -----------------------------------------------------------
const MAX_CURSOR_SELECTION = 1000;
let cursorAssistantPos = { x: 0, y: 0 };
function hideCursorAssistant() {
  cursorAssistant?.classList.add('hidden');
  cursorAssistantSpinner?.classList.add('hidden');
}
function showCursorAssistant(x, y) {
  if (!cursorAssistant) return;
  cursorAssistantPos = { x, y };
  cursorAssistant.style.left = `${x + 12}px`;
  cursorAssistant.style.top = `${y + 12}px`;
  cursorAssistant.classList.remove('hidden');
}
function triggerCursorAction(kind, selection) {
  if (!selection) return;
  const prompt =
    kind === 'summarize'
      ? `Summarize this: "${selection}"`
      : kind === 'rewrite'
        ? `Rewrite this more clearly: "${selection}"`
        : `Explain this simply: "${selection}"`;
  cursorAssistantSpinner?.classList.remove('hidden');
  sendCommand(prompt).finally(() => cursorAssistantSpinner?.classList.add('hidden'));
}
function handleSelectionEvent(ev) {
  const sel = window.getSelection();
  const text = (sel && sel.toString().trim()) || '';
  if (!text) {
    hideCursorAssistant();
    return;
  }
  const clean = text.slice(0, MAX_CURSOR_SELECTION);
  const { clientX = cursorAssistantPos.x, clientY = cursorAssistantPos.y } = ev || {};
  showCursorAssistant(clientX, clientY);
  cursorAssistantActions?.querySelectorAll('button').forEach((btn) => {
    btn.onclick = () => triggerCursorAction(btn.dataset.action, clean);
  });
}
document.addEventListener('mouseup', (e) => setTimeout(() => handleSelectionEvent(e), 120));
document.addEventListener('keyup', (e) => {
  if (e.key === 'Escape') {
    hideCursorAssistant();
    return;
  }
  setTimeout(() => handleSelectionEvent(e), 100);
});
document.addEventListener('scroll', () => hideCursorAssistant(), true);
cursorAssistantClose?.addEventListener('click', hideCursorAssistant);
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showCursorAssistant(pos.x, pos.y);
    }
  }
});

async function triggerAutomation(text) {
  appendLocalLog(`[sys] Planning screen actions for "${text}"...`);
  try {
    const res = await fetch(`${backendUrl}/api/automation/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mode: automationMode }),
    });
    const data = await res.json();
    if (!data.ok) {
      appendLocalLog(`[sys] Automation error: ${data.error || 'unknown error'}`);
      return;
    }
    const plan = data.plan || {};
    pendingPlan = plan;
    if (data.requireConfirm && (plan.actions || []).length) {
      showAutomationConfirm(plan);
    } else {
      appendLocalLog('[sys] No actions to run (vision returned empty).');
    }
  } catch (error) {
    appendLocalLog('[sys] Automation request failed.');
  }
}

function setAuthMode(mode) {
  authMode = mode;
  authModeSignIn?.classList.toggle('active', mode === 'signin');
  authModeCreate?.classList.toggle('active', mode === 'create');
  if (authSubmit) {
    authSubmit.textContent = mode === 'create' ? 'Initialize Brahma AI' : 'Initialize Brahma AI';
  }
}

function setFieldFeedback(element, text, type = '') {
  if (!element) return;
  element.textContent = text || '';
  element.className = 'field-feedback';
  if (type) {
    element.classList.add(type);
  }
}

function syncOnboardingStep() {
  const isApi = onboardingStep === 'api';
  authStepAccount?.classList.toggle('hidden', isApi);
  authStepApi?.classList.toggle('hidden', !isApi);
  if (onboardingStepLabel) {
    onboardingStepLabel.textContent = isApi ? 'Step 2 / 2' : 'Step 1 / 2';
  }
  if (onboardingStepTitle) {
    onboardingStepTitle.textContent = isApi ? 'AI Setup' : 'Account Setup';
  }
  progressDotOne?.classList.toggle('active', true);
  progressDotTwo?.classList.toggle('active', isApi);
}

function validateAccountInputs() {
  const email = authEmail?.value?.trim() || '';
  const password = authPassword?.value || '';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  setFieldFeedback(emailFeedback, email ? (emailValid ? 'Valid email' : 'Enter a valid email address') : '', email ? (emailValid ? 'success' : 'error') : '');
  setFieldFeedback(passwordFeedback, password ? (passwordValid ? 'Password looks good' : 'Password too short') : '', password ? (passwordValid ? 'success' : 'error') : '');
  return emailValid && passwordValid;
}

function validateApiKey(showEmpty = false) {
  const key = onboardingApiKey?.value?.trim() || '';
  const looksValid = /^AIza[0-9A-Za-z\-_]{20,}$/.test(key);
  if (!key && !showEmpty) {
    setFieldFeedback(apiKeyFeedback, '');
    return false;
  }
  setFieldFeedback(apiKeyFeedback, looksValid ? 'Gemini API key format looks valid' : 'Enter a valid Gemini API key', looksValid ? 'success' : 'error');
  return looksValid;
}

const tutorialSteps = [
  {
    selector: '#commandForm',
    title: 'Command Console',
    description: 'Type or speak commands here to run apps, search the web, control your system, and trigger sequences.',
  },
  {
    selector: '.reactor-shell',
    title: 'AI Core',
    description: 'This reactor stays at the center of the dashboard and gives the assistant a live operational feel while you work.',
  },
  {
    selector: '.left-column',
    title: 'Sidebar Tools',
    description: 'Open Dashboard or Settings from the slim left nav, and use the camera area when gesture or preview mode is active.',
  },
  {
    selector: '.right-column',
    title: 'Live Workspace',
    description: 'The command stream and sequence builder let you monitor responses and save custom routines for one-click execution.',
    showCards: true,
  },
  {
    selector: '#commandForm',
    title: 'Try Your First Command',
    description: 'Run a quick demo to see Brahma AI in action, or finish and start exploring on your own.',
    demo: true,
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function positionTutorialHighlight(selector) {
  const element = document.querySelector(selector);
  if (!element || !tutorialHighlight) return;
  const rect = element.getBoundingClientRect();
  tutorialHighlight.style.left = `${Math.max(rect.left - 10, 12)}px`;
  tutorialHighlight.style.top = `${Math.max(rect.top - 10, 12)}px`;
  tutorialHighlight.style.width = `${rect.width + 20}px`;
  tutorialHighlight.style.height = `${rect.height + 20}px`;
}

function renderTutorialStep() {
  const step = tutorialSteps[tutorialStepIndex];
  if (!step) return;
  tutorialTitle.textContent = step.title;
  tutorialDescription.textContent = step.description;
  tutorialFeatureCards?.classList.toggle('hidden', !step.showCards);
  tutorialNextBtn?.classList.toggle('hidden', !!step.demo);
  tutorialDemoBtn?.classList.toggle('hidden', !step.demo);
  tutorialFinishBtn?.classList.add('hidden');
  positionTutorialHighlight(step.selector);
}

async function completeTutorial(showGreeting = true) {
  tutorialOverlay?.classList.add('hidden');
  tutorialHighlight?.setAttribute('style', '');
  if (showGreeting) {
    appendLocalLog(`Brahma AI: Hello ${appState.userName || 'there'}. Your assistant is ready.`);
  }
  await saveAppState({ tutorialCompleted: true });
}

function startTutorial() {
  tutorialStepIndex = 0;
  sidebarHidden = false;
  syncSidebarToggle();
  activeSidebarTab = 'camera';
  syncSidebarPanels();
  tutorialOverlay?.classList.remove('hidden');
  renderTutorialStep();
}

async function playBootSequence() {
  const name = appState.userName || 'Operator';
  const bootMessages = [
    'Loading AI core...',
    'Initializing neural engine...',
    'Loading automation modules...',
    'Connecting Gemini API...',
    'Voice system ready...',
  ];
  bootLog.innerHTML = '';
  bootWelcome.textContent = `System ready. Welcome ${name}.`;
  bootWelcome.classList.add('hidden');
  bootOverlay?.classList.remove('hidden');
  for (const message of bootMessages) {
    const line = document.createElement('div');
    line.className = 'boot-log-line';
    line.textContent = message;
    bootLog.appendChild(line);
    await sleep(520);
  }
  bootWelcome.classList.remove('hidden');
  await sleep(900);
  bootOverlay?.classList.add('hidden');
}

async function speakStartupGreeting() {
  if (greetingSpoken) return;
  greetingSpoken = true;
  try {
    // ensure current voice settings are applied before speaking
    await fetch(`${backendUrl}/api/voice-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getVoiceSettingsPayload()),
    });
  } catch {
    // non-fatal
  }
  try {
    await fetch(`${backendUrl}/api/test-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello, Brahma AI here. How can I help you?' }),
    });
  } catch {
    // swallow voice errors to avoid blocking UI
  }
}

async function finishInitializationFlow() {
  await playBootSequence();
  if (!appState.tutorialCompleted) {
    startTutorial();
    return;
  }
  appendLocalLog(`Brahma AI: Hello ${appState.userName || 'there'}. How can I help today?`);
  await speakStartupGreeting();
}

function setAuthMessage(text, type = '') {
  if (!authMessage) return;
  authMessage.textContent = text;
  authMessage.className = 'auth-message';
  if (type) {
    authMessage.classList.add(type);
  }
}

function normalizeAuthError(message) {
  const text = String(message || '').toUpperCase();
  if (text.includes('CONFIGURATION NOT FOUND')) {
    return 'Firebase Auth is not configured for this project yet. Enable Email/Password or Google sign-in in Firebase Console.';
  }
  if (text.includes('POPUP') || text.includes('OPERATION-NOT-SUPPORTED')) {
    return 'Google sign-in is not available yet in this environment. Check that Google auth is enabled in Firebase.';
  }
  return message;
}

async function loadAppState() {
  try {
    appState = await brahmaBridge.getAppState();
  } catch (error) {
    appState = {
      onboardingComplete: false,
      tutorialCompleted: false,
      userEmail: '',
      firebaseUserId: '',
      geminiApiKey: '',
      userName: '',
      userPhotoUrl: '',
      projectWorkspacePath: '',
      projectWorkspaceName: '',
      minimalMode: false,
      cacaMemory: null,
    };
  }
  const persistedContext = appState?.cacaMemory && typeof appState.cacaMemory === 'object'
    ? appState.cacaMemory
    : null;
  if (persistedContext) {
    contextState.memory = {
      frequent_contacts: Array.isArray(persistedContext.frequent_contacts)
        ? persistedContext.frequent_contacts.slice(0, 8)
        : [],
      email_style: String(persistedContext.email_style || ''),
      apps_used: persistedContext.apps_used && typeof persistedContext.apps_used === 'object'
        ? { ...persistedContext.apps_used }
        : {},
    };
    contextState.session = {
      ...contextState.session,
      ...(persistedContext.session && typeof persistedContext.session === 'object'
        ? persistedContext.session
        : {}),
    };
    contextState.active = {
      ...contextState.active,
      ...(persistedContext.active && typeof persistedContext.active === 'object'
        ? persistedContext.active
        : {}),
    };
  }
  minimalMode = !!appState.minimalMode;
  if (minimalModeToggle) {
    minimalModeToggle.checked = minimalMode;
  }
  syncSettingsApiUi();
  renderUserProfile();
  renderProjectWorkspace({});
  if (appState.projectWorkspacePath) {
    fetch(`${backendUrl}/api/hybrid-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectWorkspacePath: appState.projectWorkspacePath || '',
        projectWorkspaceName: appState.projectWorkspaceName || '',
      }),
    }).catch(() => {});
  }
}

async function saveAppState(nextState) {
  appState = await brahmaBridge.saveAppState(nextState);
}

async function initializeOnboarding() {
  await loadAppState();
  const needsOnboarding =
    !appState.onboardingComplete ||
    !String(appState.userEmail || '').trim() ||
    !String(appState.geminiApiKey || '').trim();

  if (needsOnboarding) {
    onboardingStep = 'account';
    syncOnboardingStep();
    onboardingOverlay?.classList.remove('hidden');
  } else {
    onboardingOverlay?.classList.add('hidden');
  }
  await setMinimalMode(!!appState.minimalMode, { persist: false, forceMic: true });
}

async function pollState() {
  let state = null;
  try {
    const res = await fetch(`${backendUrl}/api/state`);
    state = await res.json();
  } catch (error) {
    setStatusText('OFFLINE');
    camValue.textContent = 'OFF';
    netValue.textContent = 'OFFLINE';
    return;
  }
  try {
    if (!state.apiKeyReady && appState.geminiApiKey && !apiKeyHydrated) {
      try {
        await fetch(`${backendUrl}/api/api-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: appState.geminiApiKey }),
        });
        apiKeyHydrated = true;
      } catch (_) {
        // ignore; UI will still prompt
      }
    }
    setStatusText(state.status);
    gestureEnabled = !!state.gestureEnabled;
    micEnabled = !!state.micEnabled;
    setModeButton(micToggle, micEnabled);
    if (minimalMode && !micEnabled) {
      ensureMicEnabled('Minimal Mode').catch(() => {});
    }
    camValue.textContent = state.screenAnalysisActive ? 'SCAN' : (cameraEnabled ? 'ON' : 'OFF');
    if (gestureEnabled) {
      setSidebarVisibility(true);
      activeSidebarTab = 'camera';
      showBackendPreview(state.cameraPreview);
      cameraBadge.textContent = 'GESTURE CAMERA ACTIVE';
    } else if (cameraEnabled) {
      setSidebarVisibility(true);
      showBrowserCamera();
      cameraBadge.textContent = 'CAMERA ON';
    }
    syncSidebarPanels();

    const cpu = Math.round(fakeMetric(0, 16, 14));
    const mem = Math.round(fakeMetric(1.2, 38, 18));
    cpuValue.textContent = `${cpu}%`;
    memValue.textContent = `${mem}%`;
    netValue.textContent = 'ONLINE';

    setupPanel.classList.toggle('hidden', state.apiKeyReady);
    apiHint.textContent = state.apiKeyReady ? '' : 'Backend will connect as soon as the Gemini key is saved.';
    renderSequences(state.savedSequences || []);
    syncRoutineSchedulesFromState(state.routineSchedules || {});
    renderRoutines();
    renderLogs(state.logs || []);
    updateLiveTranscript('user', state.liveUserText);
    updateLiveTranscript('ai', state.liveAiText);
    updateActiveTask(state);
    if (state.liveAiText && flowResultText) {
      const aiText = String(state.liveAiText).trim();
      flowResultText.textContent = aiText.length > 64 ? `${aiText.slice(0, 61)}...` : aiText;
    }
    hydrateVoiceSettings(state.voiceSettings || {}, state.voiceCapabilities || {});
    hydrateDiscordSettings(state.discordSettings || {});
    updateDiscordUiFromState(state);
    renderPlugins(state.plugins || []);
    syncSettingsApiUi();
    const automation = state.automation || {};
    const hybrid = state.hybrid || {};
    renderProjectWorkspace(hybrid);
    setAutomationMode(automation.mode || automationMode, false);
    if (automation.pendingConfirmation && automation.plan && !pendingPlan) {
      showAutomationConfirm(automation.plan);
    }
    if (!greetingSpoken) {
      await speakStartupGreeting();
    }
  } catch (error) {
    appendLocalLog('[error] UI sync failed. Some panels may be stale.');
  }
}

commandForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = commandInput.value.trim();
  if (!text) return;
  commandInput.value = '';
  await sendCommand(text);
});

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => setAutomationMode(btn.dataset.mode));
});

commandTabBtn?.addEventListener('click', () => setStreamTab('commands'));
sequencesTabBtn?.addEventListener('click', () => {
  setSequenceBuilderOpen(true);
  setStreamTab('sequences');
});
logsTabBtn?.addEventListener('click', () => setStreamTab('logs'));

document.querySelector('.discord-home-widget')?.addEventListener('click', () => {
  activeSidebarTab = 'settings';
  syncSidebarPanels();
  settingsPage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

createRoutineBtn?.addEventListener('click', () => {
  routineModal?.classList.remove('hidden');
  if (routineAutoRunInput) routineAutoRunInput.checked = false;
  if (routineTimeInput) {
    routineTimeInput.disabled = true;
    if (!routineTimeInput.value) routineTimeInput.value = '09:00';
  }
  routineNameInput?.focus();
});

routineModalCloseBtn?.addEventListener('click', () => {
  routineModal?.classList.add('hidden');
});

routineModal?.addEventListener('click', (event) => {
  if (event.target === routineModal) {
    routineModal.classList.add('hidden');
  }
});

routineAutoRunInput?.addEventListener('change', () => {
  if (!routineTimeInput) return;
  routineTimeInput.disabled = !routineAutoRunInput.checked;
  if (routineAutoRunInput.checked && !routineTimeInput.value) {
    routineTimeInput.value = '09:00';
  }
});

routineSaveBtn?.addEventListener('click', async () => {
  const name = String(routineNameInput?.value || '').trim();
  const steps = String(routineStepsInput?.value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const autoRun = Boolean(routineAutoRunInput?.checked);
  const scheduleTime = String(routineTimeInput?.value || '').trim();
  if (!name || !steps.length) {
    appendLocalLog('[error] Routine name and steps are required.');
    return;
  }
  if (autoRun && !/^\d{2}:\d{2}$/.test(scheduleTime)) {
    appendLocalLog('[error] Select a valid daily time for auto-run.');
    return;
  }
  const nextRoutine = { name, steps, autoRun, scheduleTime: autoRun ? scheduleTime : '' };
  const existingIndex = customRoutines.findIndex((item) => normalizeRoutineKey(item?.name) === normalizeRoutineKey(name));
  if (existingIndex >= 0) {
    customRoutines[existingIndex] = nextRoutine;
  } else {
    customRoutines.push(nextRoutine);
  }
  persistRoutines();
  renderRoutines();
  try {
    const res = await fetch(`${backendUrl}/api/sequence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', name, steps, autoRun, scheduleTime }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || data?.message || 'Could not save routine.');
    }
    renderSequences(data.savedSequences || []);
    syncRoutineSchedulesFromState(data.routineSchedules || {});
    renderRoutines();
    routineModal?.classList.add('hidden');
    routineNameInput.value = '';
    routineStepsInput.value = '';
    if (routineAutoRunInput) routineAutoRunInput.checked = false;
    if (routineTimeInput) {
      routineTimeInput.disabled = true;
      routineTimeInput.value = '09:00';
    }
    appendLocalLog(`[sys] ${data.message || `Routine saved: ${name}`}`);
  } catch (error) {
    appendLocalLog(`[error] ${error.message || 'Could not save routine.'}`);
  }
});

routineRunBtn?.addEventListener('click', async () => {
  const name = String(routineNameInput?.value || '').trim();
  const steps = String(routineStepsInput?.value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!name || !steps.length) {
    appendLocalLog('[error] Routine name and steps are required.');
    return;
  }
  await runRoutine({ name, steps });
});

projectWorkspaceRailBtn?.addEventListener('click', createProjectWorkspacePopup);

confirmAllowBtn?.addEventListener('click', async () => {
  if (!pendingPlan) return hideAutomationConfirm();
  try {
    await fetch(`${backendUrl}/api/automation/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: pendingPlan.id, allow: pendingPlan.actions?.map((a) => a.id) }),
    });
    appendLocalLog('[sys] Actions approved.');
    pendingPlan = null;
    hideAutomationConfirm();
    await pollState();
  } catch (error) {
    appendLocalLog('[sys] Failed to confirm actions.');
  }
});

confirmDenyBtn?.addEventListener('click', async () => {
  if (!pendingPlan) return hideAutomationConfirm();
  await fetch(`${backendUrl}/api/automation/cancel`, { method: 'POST' }).catch(() => {});
  appendLocalLog('[sys] Actions denied.');
  pendingPlan = null;
  hideAutomationConfirm();
});

apiForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const key = apiInput.value.trim();
  if (!key) return;
  await fetch(`${backendUrl}/api/api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  apiInput.value = '';
   await saveAppState({ geminiApiKey: key });
  apiKeyHydrated = true;
  syncSettingsApiUi();
  await pollState();
});

minimalModeToggle?.addEventListener('change', async () => {
  await setMinimalMode(!!minimalModeToggle.checked, { persist: true, forceMic: true });
});

settingsApiSaveBtn?.addEventListener('click', async () => {
  const key = String(settingsApiKeyInput?.value || '').trim();
  if (!key) {
    if (settingsApiStatus) settingsApiStatus.textContent = 'Please enter a valid Gemini API key.';
    return;
  }
  try {
    if (settingsApiStatus) settingsApiStatus.textContent = 'Saving API key...';
    const res = await fetch(`${backendUrl}/api/api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) {
      throw new Error('Could not save API key.');
    }
    await saveAppState({ geminiApiKey: key });
    appState.geminiApiKey = key;
    apiKeyHydrated = true;
    if (onboardingApiKey) onboardingApiKey.value = key;
    syncSettingsApiUi();
    if (settingsApiStatus) settingsApiStatus.textContent = 'API key saved successfully.';
    appendLocalLog('[sys] Gemini API key updated from Settings.');
    await pollState();
  } catch (error) {
    if (settingsApiStatus) settingsApiStatus.textContent = error?.message || 'Failed to save API key.';
    appendLocalLog('[error] Failed to save API key from Settings.');
  }
});

async function handleOnboardingSubmit() {
  if (onboardingStep !== 'api') {
    return;
  }
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  const apiKey = onboardingApiKey.value.trim();

  if (!validateAccountInputs() || !validateApiKey(true)) {
    setAuthMessage('Complete both setup steps before continuing.', 'error');
    return;
  }

  setAuthMessage('Initializing secure access...');

  try {
    const authData = authMode === 'create'
      ? await createFirebaseUser(email, password)
      : await signInFirebaseUser(email, password);

    const apiResponse = await fetch(`${backendUrl}/api/api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: apiKey }),
    });

    if (!apiResponse.ok) {
      throw new Error('Failed to save Gemini API key.');
    }

    await saveAppState({
      onboardingComplete: true,
      tutorialCompleted: true,
      userEmail: authData.email || email,
      firebaseUserId: authData.localId || '',
      userName: email.split('@')[0],
      userPhotoUrl: '',
      geminiApiKey: apiKey,
    });
    apiKeyHydrated = true;

    setAuthMessage('Brahma AI initialized successfully.', 'success');
    onboardingOverlay?.classList.add('hidden');
    renderUserProfile();
    await pollState();
    await finishInitializationFlow();
  } catch (error) {
    setAuthMessage(normalizeAuthError(error.message || 'Initialization failed.'), 'error');
  }
}

authForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  await handleOnboardingSubmit();
});

authSubmit?.addEventListener('click', async (event) => {
  event.preventDefault();
  await handleOnboardingSubmit();
});

authContinueBtn?.addEventListener('click', () => {
  if (!validateAccountInputs()) {
    setAuthMessage('Please fix your login details first.', 'error');
    return;
  }
  onboardingStep = 'api';
  setAuthMessage('');
  syncOnboardingStep();
});

authBackBtn?.addEventListener('click', () => {
  onboardingStep = 'account';
  setAuthMessage('');
  syncOnboardingStep();
});

authModeSignIn?.addEventListener('click', () => setAuthMode('signin'));
authModeCreate?.addEventListener('click', () => setAuthMode('create'));
togglePasswordBtn?.addEventListener('click', () => {
  const nextType = authPassword.type === 'password' ? 'text' : 'password';
  authPassword.type = nextType;
  togglePasswordBtn.textContent = nextType === 'password' ? 'Show' : 'Hide';
});

authEmail?.addEventListener('input', () => validateAccountInputs());
authPassword?.addEventListener('input', () => validateAccountInputs());
onboardingApiKey?.addEventListener('input', () => validateApiKey());

testApiKeyBtn?.addEventListener('click', async () => {
  const key = onboardingApiKey.value.trim();
  if (!validateApiKey(true)) {
    setAuthMessage('Enter a valid Gemini API key first.', 'error');
    return;
  }
  setAuthMessage('Saving Gemini API key for this session...');
  try {
    const apiResponse = await fetch(`${backendUrl}/api/api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (!apiResponse.ok) {
      throw new Error('Save failed.');
    }
    await saveAppState({ geminiApiKey: key, onboardingComplete: true });
    apiKeyHydrated = true;
    setFieldFeedback(apiKeyFeedback, 'Gemini API key saved for this session', 'success');
    setAuthMessage('Key saved. You can initialize now.', 'success');
  } catch (error) {
    setFieldFeedback(apiKeyFeedback, 'Could not save API key', 'error');
    setAuthMessage(error.message || 'Save failed.', 'error');
  }
});

tutorialSkipBtn?.addEventListener('click', async () => {
  await completeTutorial(true);
});

tutorialNextBtn?.addEventListener('click', () => {
  tutorialStepIndex = Math.min(tutorialStepIndex + 1, tutorialSteps.length - 1);
  renderTutorialStep();
});

tutorialDemoBtn?.addEventListener('click', async () => {
  await sendCommand('open chrome');
  tutorialDemoBtn.classList.add('hidden');
  tutorialNextBtn.classList.add('hidden');
  tutorialFinishBtn.classList.remove('hidden');
  tutorialTitle.textContent = 'You are ready';
  tutorialDescription.textContent = 'Brahma AI just ran a demo command. Explore the dashboard, create sequences, or open Settings whenever you want.';
  tutorialFeatureCards?.classList.add('hidden');
  positionTutorialHighlight('#commandForm');
});

tutorialFinishBtn?.addEventListener('click', async () => {
  await completeTutorial(true);
});

googleSignInBtn?.addEventListener('click', async () => {
  const apiKey = onboardingApiKey.value.trim();
  if (!apiKey) {
    setAuthMessage('Enter your Gemini API key before using Google sign-in.', 'error');
    return;
  }
  setAuthMessage('Opening Google sign-in...');
  try {
    const authData = await signInWithGoogleFirebase();
    const apiResponse = await fetch(`${backendUrl}/api/api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: apiKey }),
    });
    if (!apiResponse.ok) {
      throw new Error('Failed to save Gemini API key.');
    }
    await saveAppState({
      onboardingComplete: true,
      tutorialCompleted: true,
      userEmail: authData.email || '',
      firebaseUserId: authData.localId || '',
      userName: authData.displayName || authData.email?.split('@')[0] || 'User',
      userPhotoUrl: authData.photoURL || '',
    });
    setAuthMessage('Google sign-in successful.', 'success');
    onboardingOverlay?.classList.add('hidden');
    renderUserProfile();
    await pollState();
    await finishInitializationFlow();
  } catch (error) {
    setAuthMessage(normalizeAuthError(error.message || 'Google sign-in failed.'), 'error');
  }
});

resetPasswordBtn?.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  if (!email) {
    setAuthMessage('Enter your email first to receive a password reset link.', 'error');
    return;
  }
  setAuthMessage('Sending password reset link...');
  try {
    await sendFirebasePasswordReset(email);
    setAuthMessage('Password reset link sent successfully.', 'success');
  } catch (error) {
    setAuthMessage(normalizeAuthError(error.message || 'Could not send reset email.'), 'error');
  }
});

sidebarToggle?.addEventListener('click', () => {
  sidebarHidden = !sidebarHidden;
  syncSidebarToggle();
});

settingsTabBtn?.addEventListener('click', () => {
  activeSidebarTab = 'settings';
  syncSidebarPanels();
});

cameraTabBtn?.addEventListener('click', () => {
  activeSidebarTab = 'camera';
  syncSidebarPanels();
});

micToggle?.addEventListener('click', async () => {
  if (minimalMode && micEnabled) {
    appendLocalLog('[sys] Minimal Mode keeps microphone enabled.');
    setModeButton(micToggle, true);
    return;
  }
  try {
    const res = await fetch(`${backendUrl}/api/toggle-mic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    micEnabled = !!data.micEnabled;
    if (minimalMode && !micEnabled) {
      await ensureMicEnabled('Minimal Mode');
    }
    setModeButton(micToggle, micEnabled);
    appendLocalLog(`[sys] ${data.message || (micEnabled ? 'Microphone enabled.' : 'Microphone disabled.')}`);
  } catch (error) {
    appendLocalLog('[error] Microphone toggle failed.');
  }
});

chatToggle.addEventListener('click', () => {
  appendLocalLog('[sys] Code mode panel selected.');
  setModeButton(chatToggle, !chatToggle.classList.contains('active'));
});

voiceToggle.addEventListener('click', () => {
  const enableCamera = !cameraEnabled;
  if (enableCamera) {
    startCamera().catch(() => appendLocalLog('[error] Camera access blocked or unavailable.'));
  } else {
    stopCamera();
  }
  setModeButton(voiceToggle, enableCamera);
});

developerToggle.addEventListener('click', async () => {
  try {
    const res = await fetch(`${backendUrl}/api/toggle-gesture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    gestureEnabled = !!data.gestureEnabled;
    developerToggle.classList.toggle('active', gestureEnabled);
    appendLocalLog(`[sys] ${data.message || (gestureEnabled ? 'Gesture control enabled.' : 'Gesture control disabled.')}`);
    if (gestureEnabled) {
      setSidebarVisibility(true);
      if (cameraEnabled) {
        stopCamera();
      }
      activeSidebarTab = 'camera';
      showBackendPreview(null);
      cameraBadge.textContent = 'GESTURE CAMERA ACTIVE';
    } else if (!cameraEnabled) {
      cameraBadge.textContent = 'CAMERA OFF';
    }
    syncSidebarPanels();
  } catch (error) {
    appendLocalLog('[error] Gesture control request failed.');
  }
});

kasaToggle.addEventListener('click', async () => {
  try {
    const res = await fetch(`${backendUrl}/api/kasa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'discover' }),
    });
    const data = await res.json();
    appendLocalLog(`[sys] ${data.message || 'Kasa discovery completed.'}`);
  } catch (error) {
    appendLocalLog('[error] Kasa request failed.');
  }
});

mobileLinkBtn?.addEventListener('click', () => {
  void openMobileLinkOverlay();
});

mobileLinkCloseBtn?.addEventListener('click', closeMobileLinkOverlay);
mobileLinkOverlay?.addEventListener('click', (event) => {
  if (event.target === mobileLinkOverlay) {
    closeMobileLinkOverlay();
  }
});

mobileLinkRefreshBtn?.addEventListener('click', () => {
  void loadMobileLinkInfo();
});

mobileLinkCopyBtn?.addEventListener('click', async () => {
  const host = mobileLinkInfo?.primaryHost || mobileLinkHost?.textContent || '';
  if (!host || host === 'Unavailable') {
    appendLocalLog('[error] No desktop host available to copy.');
    return;
  }
  try {
    await navigator.clipboard.writeText(host);
    mobileLinkStatus.textContent = 'Desktop host copied. You can also paste it into Brahma Mobile manually.';
  } catch (error) {
    appendLocalLog('[error] Failed to copy desktop host.');
  }
});

saveProfileBtn?.addEventListener('click', async () => {
  const nextName = profileNameInput?.value?.trim() || '';
  let nextPhoto = appState.userPhotoUrl || '';
  const file = profilePhotoFile?.files?.[0];
  if (file && file.path) {
    nextPhoto = file.path;
  }
  await saveAppState({
    userName: nextName || appState.userName || 'Guest User',
    userPhotoUrl: nextPhoto,
  });
  renderUserProfile();
  appendLocalLog('[sys] Profile updated.');
});

settingsResetPasswordBtn?.addEventListener('click', async () => {
  const email = (profileEmailInput?.value || appState.userEmail || '').trim();
  if (!email) {
    appendLocalLog('[error] Sign in with an email account first.');
    return;
  }
  try {
    await sendFirebasePasswordReset(email);
    appendLocalLog('[sys] Password reset link sent.');
  } catch (error) {
    appendLocalLog(`[error] ${normalizeAuthError(error.message || 'Password reset failed.')}`);
  }
});

logoutBtn?.addEventListener('click', async () => {
  try {
    await signOutFirebaseUser();
  } catch (error) {
    appendLocalLog(`[error] ${error.message || 'Logout failed.'}`);
    return;
  }

  await saveAppState({
    onboardingComplete: false,
    tutorialCompleted: false,
    userEmail: '',
    firebaseUserId: '',
    geminiApiKey: '',
    userName: '',
    userPhotoUrl: '',
  });
  onboardingStep = 'account';
  syncOnboardingStep();
  renderUserProfile();
  onboardingOverlay?.classList.remove('hidden');
  appendLocalLog('[sys] Logged out successfully.');
});

deleteAccountBtn?.addEventListener('click', async () => {
  const confirmed = window.confirm('Delete your Brahma AI account? This will remove your Firebase user if possible and clear local profile state.');
  if (!confirmed) return;
  try {
    await deleteCurrentFirebaseUser();
  } catch (error) {
    appendLocalLog(`[error] ${error.message || 'Could not delete Firebase account.'}`);
    return;
  }

  try {
    await signOutFirebaseUser();
  } catch (error) {
    // ignore sign-out cleanup errors after delete
  }

  await saveAppState({
    onboardingComplete: false,
    tutorialCompleted: false,
    userEmail: '',
    firebaseUserId: '',
    geminiApiKey: '',
    userName: '',
    userPhotoUrl: '',
  });
  onboardingStep = 'account';
  syncOnboardingStep();
  renderUserProfile();
  onboardingOverlay?.classList.remove('hidden');
  appendLocalLog('[sys] Account deleted and local profile cleared.');
});

saveVoiceSettingsBtn?.addEventListener('click', async () => {
  try {
    const res = await fetch(`${backendUrl}/api/voice-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getVoiceSettingsPayload()),
    });
    const data = await res.json();
    voiceSettingsHydrated = false;
    hydrateVoiceSettings(data.voiceSettings || {}, data.voiceCapabilities || {});
    voiceSettingsHydrated = true;
    appendLocalLog('[sys] Voice settings saved.');
  } catch (error) {
    appendLocalLog('[error] Failed to save voice settings.');
  }
});

discordSaveBtn?.addEventListener('click', async () => {
  try {
    appendDiscordLog('Saving Discord settings...');
    const res = await fetch(`${backendUrl}/api/discord-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getDiscordSettingsPayload()),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to save Discord settings.');
    }
    discordSettingsHydrated = false;
    hydrateDiscordSettings(data.discordSettings || {});
    discordSettingsHydrated = true;
    updateDiscordUiFromState({
      discordSettings: data.discordSettings || {},
      discordConfigured: data.discordConfigured,
      discordRemote: {},
    });
    appendDiscordLog(data.discordConfigured ? 'Bot authenticated. Listening for commands...' : 'Token saved. Connect to enable remote.');
    appendLocalLog('[sys] Discord settings saved.');
  } catch (error) {
    setDiscordStatus({ connected: false, statusText: 'DISCONNECTED', metaText: 'Failed to save settings.' });
    appendDiscordLog('Save failed. Check token and channel IDs.');
    appendLocalLog('[error] Failed to save Discord settings.');
  }
});

function markDiscordEdited() {
  lastDiscordEditTs = Date.now();
}

discordBotToken?.addEventListener('input', markDiscordEdited);
discordChannelIds?.addEventListener('input', markDiscordEdited);
discordRemoteToggle?.addEventListener('change', markDiscordEdited);
discordMirrorToggle?.addEventListener('change', markDiscordEdited);

discordTestBtn?.addEventListener('click', async () => {
  if (!discordTestBtn) return;
  appendDiscordLog('Sending test ping...');
  try {
    const res = await fetch(`${backendUrl}/api/discord-test`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Test failed.');
    }
    discordLastLatencyMs = data.latencyMs ? Math.round(data.latencyMs) : null;
    discordLastChannelName = data.channelName || '';
    discordLastChannelId = data.channelId || '';
    updateDiscordChannelPreview(data.channelId ? [data.channelId] : []);
    setDiscordStatus({
      connected: true,
      statusText: 'CONNECTED TO DISCORD',
      metaText: 'Listening for commands...',
      latencyMs: discordLastLatencyMs,
    });
    appendDiscordLog('Response received. Connection healthy.');
  } catch (error) {
    setDiscordStatus({ connected: false, statusText: 'DISCONNECTED', metaText: 'Test failed.' });
    appendDiscordLog(error?.message || 'Test failed.');
  }
});

pluginReloadBtn?.addEventListener('click', async () => {
  if (pluginStatus) pluginStatus.textContent = 'Reloading plugins...';
  try {
    const res = await fetch(`${backendUrl}/api/plugins/reload`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to reload plugins.');
    }
    renderPlugins(data.plugins || []);
  } catch (error) {
    if (pluginStatus) pluginStatus.textContent = error?.message || 'Failed to reload plugins.';
  }
});

pluginOpenFolderBtn?.addEventListener('click', async () => {
  try {
    await fetch(`${backendUrl}/api/plugins/open-folder`, { method: 'POST' });
  } catch (_) {
    // ignore
  }
});

testVoiceBtn?.addEventListener('click', async () => {
  try {
    await fetch(`${backendUrl}/api/voice-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getVoiceSettingsPayload()),
    });
    const res = await fetch(`${backendUrl}/api/test-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Brahma AI voice systems online. How can I help?' }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error((data.errors || []).join(' | ') || data.message || 'Voice test failed.');
    }
    appendLocalLog(`[sys] ${data.message}`);
  } catch (error) {
    appendLocalLog(`[error] ${error.message || 'Voice test failed.'}`);
  }
});

saveSequenceBtn?.addEventListener('click', async () => {
  const name = sequenceName.value.trim();
  const steps = sequenceSteps.value.split('\n').map((step) => step.trim()).filter(Boolean);
  if (!name || !steps.length) {
    appendLocalLog('[error] Sequence name and steps are required.');
    return;
  }
  const res = await fetch(`${backendUrl}/api/sequence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', name, steps }),
  });
  const data = await res.json();
  appendLocalLog(`[sys] ${data.message || 'Sequence saved.'}`);
  renderSequences(data.savedSequences || []);
  syncRoutineSchedulesFromState(data.routineSchedules || {});
  renderRoutines();
});

startSequenceBtn?.addEventListener('click', async () => {
  const name = sequenceName.value.trim();
  const steps = sequenceSteps.value.split('\n').map((step) => step.trim()).filter(Boolean);
  if (!name) {
    appendLocalLog('[error] Enter a sequence name first.');
    return;
  }
  const res = await fetch(`${backendUrl}/api/sequence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start', name, steps }),
  });
  const data = await res.json();
  appendLocalLog(`[sys] ${data.message || 'Sequence started.'}`);
});

deleteSequenceBtn?.addEventListener('click', async () => {
  const name = sequenceName.value.trim();
  if (!name) {
    appendLocalLog('[error] Enter a sequence name first.');
    return;
  }
  const res = await fetch(`${backendUrl}/api/sequence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', name }),
  });
  const data = await res.json();
  appendLocalLog(`[sys] ${data.message || 'Sequence deleted.'}`);
  renderSequences(data.savedSequences || []);
  syncRoutineSchedulesFromState(data.routineSchedules || {});
  renderRoutines();
});

sequenceOpenBtn?.addEventListener('click', () => {
  setSequenceBuilderOpen(true);
});

sequenceCloseBtn?.addEventListener('click', () => {
  setSequenceBuilderOpen(false);
});

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.id === 'streamOpenBtn') {
    setCommandStreamOpen(true);
  } else if (target.id === 'streamCloseBtn') {
    setCommandStreamOpen(false);
  }
});

async function startCamera() {
  if (gestureEnabled) {
    appendLocalLog('[sys] Camera preview is disabled while gesture control is active.');
    return;
  }
  if (cameraStream) return;
  cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  cameraVideo.srcObject = cameraStream;
  cameraEnabled = true;
  setSidebarVisibility(true);
  activeSidebarTab = 'camera';
  showBrowserCamera();
  cameraBadge.textContent = 'CAMERA ON';
  syncSidebarPanels();
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  cameraVideo.srcObject = null;
  cameraEnabled = false;
  cameraImage.classList.add('hidden');
  cameraImage.removeAttribute('src');
  cameraPlaceholder.classList.add('hidden');
  cameraBadge.textContent = 'CAMERA OFF';
  syncSidebarPanels();
}

setAuthMode('signin');
syncOnboardingStep();
syncSidebarToggle();
activeSidebarTab = 'camera';
syncSidebarPanels();
hideTaskUiNow();
initializeSequenceBuilderState();
loadRoutines();
renderRoutines();
bindContextSuggestionActions();
cadToggle?.addEventListener('click', () => createCadPopup('', false));
setAutomationMode(automationMode, false);

async function bootstrapApp() {
  try {
    await initializeOnboarding();
    await pollState();
  } catch (_error) {}
}

bootstrapApp();
pollActiveContext();

setInterval(pollState, 1100);
setInterval(pollActiveContext, 1000);


