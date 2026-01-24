const DEFAULT_SERVER_URL = 'http://localhost:3000';

const serverUrlEl = document.getElementById('server-url');
const testConnectionEl = document.getElementById('test-connection');
const connectionStatusEl = document.getElementById('connection-status');
const defaultPersonalEl = document.getElementById('default-personal');
const defaultTeamEl = document.getElementById('default-team');
const saveSettingsEl = document.getElementById('save-settings');
const saveStatusEl = document.getElementById('save-status');
const shortcutsLinkEl = document.getElementById('shortcuts-link');

async function init() {
  const settings = await chrome.storage.sync.get(['serverUrl', 'savePersonal', 'saveTeam']);
  
  serverUrlEl.value = settings.serverUrl || DEFAULT_SERVER_URL;
  defaultPersonalEl.checked = settings.savePersonal !== false;
  defaultTeamEl.checked = settings.saveTeam === true;
  
  setupEventListeners();
}

function setupEventListeners() {
  testConnectionEl.addEventListener('click', testConnection);
  saveSettingsEl.addEventListener('click', saveSettings);
  
  shortcutsLinkEl.addEventListener('click', (e) => {
    e.preventDefault();
    navigator.clipboard.writeText('chrome://extensions/shortcuts').then(() => {
      alert('chrome://extensions/shortcuts 주소가 클립보드에 복사되었습니다.\n새 탭에서 붙여넣기하여 이동하세요.');
    }).catch(() => {
      alert('chrome://extensions/shortcuts\n위 주소를 새 탭에서 직접 입력하세요.');
    });
  });
  
  let saveTimeout;
  const autoSave = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveSettings(true), 1000);
  };
  
  serverUrlEl.addEventListener('input', autoSave);
  defaultPersonalEl.addEventListener('change', autoSave);
  defaultTeamEl.addEventListener('change', autoSave);
}

async function testConnection() {
  const serverUrl = serverUrlEl.value.trim() || DEFAULT_SERVER_URL;
  
  testConnectionEl.disabled = true;
  testConnectionEl.textContent = '테스트 중...';
  showConnectionStatus('서버에 연결 중...', 'loading');
  
  try {
    const response = await fetch(`${serverUrl}/api/extension/auth/check`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.authenticated) {
        showConnectionStatus(`연결 성공! (사용자: ${data.userId || '인증됨'})`, 'success');
      } else {
        showConnectionStatus('서버 연결 성공, 하지만 로그인이 필요합니다.', 'error');
      }
    } else if (response.status === 401 || response.status === 403) {
      showConnectionStatus('서버 연결 성공, 하지만 로그인이 필요합니다.', 'error');
    } else {
      showConnectionStatus(`서버 응답 오류: ${response.status}`, 'error');
    }
  } catch (error) {
    console.error('Connection test error:', error);
    showConnectionStatus('서버에 연결할 수 없습니다. URL을 확인해주세요.', 'error');
  } finally {
    testConnectionEl.disabled = false;
    testConnectionEl.textContent = '연결 테스트';
  }
}

function showConnectionStatus(message, type) {
  connectionStatusEl.textContent = message;
  connectionStatusEl.className = `connection-status ${type}`;
  connectionStatusEl.classList.remove('hidden');
  
  if (type === 'success') {
    setTimeout(() => connectionStatusEl.classList.add('hidden'), 5000);
  }
}

async function saveSettings(silent = false) {
  const serverUrl = serverUrlEl.value.trim() || DEFAULT_SERVER_URL;
  
  try {
    new URL(serverUrl);
  } catch {
    if (!silent) {
      showSaveStatus('유효하지 않은 URL입니다.', false);
    }
    return;
  }
  
  try {
    await chrome.storage.sync.set({
      serverUrl: serverUrl,
      savePersonal: defaultPersonalEl.checked,
      saveTeam: defaultTeamEl.checked
    });
    
    if (!silent) {
      showSaveStatus('설정이 저장되었습니다.', true);
    }
  } catch (error) {
    console.error('Save settings error:', error);
    if (!silent) {
      showSaveStatus('설정 저장에 실패했습니다.', false);
    }
  }
}

function showSaveStatus(message, success) {
  saveStatusEl.textContent = message;
  saveStatusEl.style.color = success ? '#16a34a' : '#dc2626';
  saveStatusEl.classList.remove('hidden');
  
  setTimeout(() => saveStatusEl.classList.add('hidden'), 3000);
}

document.addEventListener('DOMContentLoaded', init);
