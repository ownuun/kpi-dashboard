const DEFAULT_SERVER_URL = 'http://localhost:3000';

const loadingEl = document.getElementById('loading');
const authRequiredEl = document.getElementById('auth-required');
const mainContentEl = document.getElementById('main-content');
const loginLinkEl = document.getElementById('login-link');
const retryAuthEl = document.getElementById('retry-auth');
const pageFaviconEl = document.getElementById('page-favicon');
const pageTitleEl = document.getElementById('page-title');
const pageUrlEl = document.getElementById('page-url');
const savePersonalEl = document.getElementById('save-personal');
const saveTeamEl = document.getElementById('save-team');
const saveBtnEl = document.getElementById('save-btn');
const saveBtnTextEl = document.getElementById('save-btn-text');
const saveBtnLoadingEl = document.getElementById('save-btn-loading');
const statusMessageEl = document.getElementById('status-message');
const openOptionsEl = document.getElementById('open-options');

let currentTab = null;
let serverUrl = DEFAULT_SERVER_URL;

async function init() {
  try {
    const settings = await chrome.storage.sync.get(['serverUrl', 'savePersonal', 'saveTeam']);
    
    serverUrl = settings.serverUrl || DEFAULT_SERVER_URL;
    loginLinkEl.href = serverUrl;
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    
    await checkAuth();
    setupEventListeners();
    
    savePersonalEl.checked = settings.savePersonal !== false;
    saveTeamEl.checked = settings.saveTeam === true;
  } catch (error) {
    console.error('Init error:', error);
    showError('초기화 중 오류가 발생했습니다.');
  }
}

async function checkAuth() {
  showLoading();
  
  try {
    const response = await fetch(`${serverUrl}/api/extension/auth/check`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      showAuthRequired();
      return;
    }
    
    const data = await response.json();
    
    if (!data.authenticated) {
      showAuthRequired();
      return;
    }
    
    if (data.settings) {
      const localSettings = await chrome.storage.sync.get(['savePersonal', 'saveTeam']);
      
      if (localSettings.savePersonal === undefined) {
        savePersonalEl.checked = data.settings.savePersonal !== false;
      }
      if (localSettings.saveTeam === undefined) {
        saveTeamEl.checked = data.settings.saveTeam === true;
      }
    }
    
    showMainContent();
  } catch (error) {
    console.error('Auth check error:', error);
    showAuthRequired();
  }
}

function showLoading() {
  loadingEl.classList.remove('hidden');
  authRequiredEl.classList.add('hidden');
  mainContentEl.classList.add('hidden');
}

function showAuthRequired() {
  loadingEl.classList.add('hidden');
  authRequiredEl.classList.remove('hidden');
  mainContentEl.classList.add('hidden');
}

function showMainContent() {
  loadingEl.classList.add('hidden');
  authRequiredEl.classList.add('hidden');
  mainContentEl.classList.remove('hidden');
  
  if (currentTab) {
    pageTitleEl.textContent = currentTab.title || '제목 없음';
    pageUrlEl.textContent = currentTab.url || '';
    pageUrlEl.title = currentTab.url || '';
    
    if (currentTab.favIconUrl) {
      pageFaviconEl.src = currentTab.favIconUrl;
      pageFaviconEl.style.display = 'block';
    } else {
      pageFaviconEl.style.display = 'none';
    }
  }
}

function setupEventListeners() {
  retryAuthEl.addEventListener('click', checkAuth);
  saveBtnEl.addEventListener('click', saveLink);
  savePersonalEl.addEventListener('change', saveOptions);
  saveTeamEl.addEventListener('change', saveOptions);
  
  openOptionsEl.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

async function saveLink() {
  if (!currentTab) return;
  
  const personal = savePersonalEl.checked;
  const team = saveTeamEl.checked;
  
  if (!personal && !team) {
    showStatus('저장할 위치를 선택해주세요.', 'error');
    return;
  }
  
  saveBtnEl.disabled = true;
  saveBtnTextEl.classList.add('hidden');
  saveBtnLoadingEl.classList.remove('hidden');
  hideStatus();
  
  try {
    const ownerTypes = [];
    if (personal) ownerTypes.push('PERSONAL');
    if (team) ownerTypes.push('TEAM');
    
    const response = await fetch(`${serverUrl}/api/extension/links/quick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        url: currentTab.url,
        title: currentTab.title,
        favicon: currentTab.favIconUrl,
        ownerTypes
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '저장에 실패했습니다.');
    }
    
    const result = await response.json();
    
    if (result.success) {
      const successResults = result.results.filter(r => r.success);
      const failedResults = result.results.filter(r => !r.success);
      
      if (successResults.length > 0) {
        const savedTo = successResults
          .map(r => r.ownerType === 'PERSONAL' ? '개인' : '팀')
          .join(', ');
        
        if (failedResults.length > 0) {
          showStatus(`${savedTo}에 저장 완료. 일부 실패.`, 'success');
        } else {
          showStatus(`${savedTo}에 저장되었습니다.`, 'success');
        }
      } else {
        showStatus('저장에 실패했습니다.', 'error');
      }
    } else {
      showStatus('저장에 실패했습니다.', 'error');
    }
  } catch (error) {
    console.error('Save link error:', error);
    showStatus(error.message || '저장 중 오류가 발생했습니다.', 'error');
  } finally {
    saveBtnEl.disabled = false;
    saveBtnTextEl.classList.remove('hidden');
    saveBtnLoadingEl.classList.add('hidden');
  }
}

async function saveOptions() {
  await chrome.storage.sync.set({
    savePersonal: savePersonalEl.checked,
    saveTeam: saveTeamEl.checked
  });
}

function showStatus(message, type) {
  statusMessageEl.textContent = message;
  statusMessageEl.className = `status-message ${type}`;
  statusMessageEl.classList.remove('hidden');
  
  if (type === 'success') {
    setTimeout(hideStatus, 5000);
  }
}

function hideStatus() {
  statusMessageEl.classList.add('hidden');
}

function showError(message) {
  loadingEl.classList.add('hidden');
  authRequiredEl.classList.add('hidden');
  mainContentEl.classList.add('hidden');
  
  const errorEl = document.createElement('div');
  errorEl.className = 'auth-required';
  errorEl.innerHTML = `
    <p style="color: #991b1b;">${message}</p>
    <button class="btn btn-secondary" onclick="location.reload()">다시 시도</button>
  `;
  document.querySelector('.container').insertBefore(errorEl, document.querySelector('.footer'));
}

document.addEventListener('DOMContentLoaded', init);
