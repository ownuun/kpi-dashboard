const DEFAULT_SERVER_URL = 'http://localhost:3000';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-kpi-dashboard',
    title: 'KPI Dashboard에 저장',
    contexts: ['page', 'link']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-to-kpi-dashboard') {
    const url = info.linkUrl || info.pageUrl;
    const title = tab.title || url;
    await saveLink(url, title, tab.favIconUrl);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-link') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await saveLink(tab.url, tab.title, tab.favIconUrl);
    }
  }
});

async function saveLink(url, title, favicon) {
  try {
    const { serverUrl = DEFAULT_SERVER_URL, savePersonal = true, saveTeam = false } = 
      await chrome.storage.sync.get(['serverUrl', 'savePersonal', 'saveTeam']);

    const ownerTypes = [];
    if (savePersonal) ownerTypes.push('PERSONAL');
    if (saveTeam) ownerTypes.push('TEAM');

    if (ownerTypes.length === 0) {
      notifyUser('저장 실패', '저장할 위치를 선택해주세요.');
      return;
    }

    const authResponse = await fetch(`${serverUrl}/api/extension/auth/check`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!authResponse.ok) {
      notifyUser('인증 오류', '로그인이 필요합니다. 대시보드에 먼저 로그인해주세요.');
      return;
    }

    const authData = await authResponse.json();
    if (!authData.authenticated) {
      notifyUser('인증 오류', '로그인이 필요합니다. 대시보드에 먼저 로그인해주세요.');
      return;
    }

    const response = await fetch(`${serverUrl}/api/extension/links/quick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ url, title, favicon, ownerTypes })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      notifyUser('저장 실패', errorData.error || '링크 저장에 실패했습니다.');
      return;
    }

    const result = await response.json();
    
    if (result.success) {
      const savedTo = result.results
        .filter(r => r.success)
        .map(r => r.ownerType === 'PERSONAL' ? '개인' : '팀')
        .join(', ');
      notifyUser('저장 완료', `${savedTo}에 저장되었습니다.`);
    } else {
      notifyUser('저장 실패', '일부 저장에 실패했습니다.');
    }
  } catch (error) {
    console.error('Save link error:', error);
    notifyUser('저장 실패', '서버 연결에 실패했습니다.');
  }
}

function notifyUser(title, message) {
  chrome.storage.local.set({ 
    lastNotification: { title, message, timestamp: Date.now() } 
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveLink') {
    saveLink(request.url, request.title, request.favicon)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'checkAuth') {
    checkAuth(request.serverUrl)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ authenticated: false, error: error.message }));
    return true;
  }
});

async function checkAuth(serverUrl) {
  const url = serverUrl || DEFAULT_SERVER_URL;
  try {
    const response = await fetch(`${url}/api/extension/auth/check`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      return { authenticated: false };
    }
    
    return await response.json();
  } catch (error) {
    return { authenticated: false, error: error.message };
  }
}
