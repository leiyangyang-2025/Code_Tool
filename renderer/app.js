// ===================== AI Browser - 渲染进程主逻辑 =====================
// 异步切换架构：侧边栏点击 → 立即显示 loading → rAF 延迟导航 → 加载完成隐藏

(function () {
  'use strict';

  // ==================== DOM 引用 ====================
  const $sidebarBtns     = document.querySelectorAll('.sidebar-btn');
  const $tabStrip        = document.getElementById('tab-strip');
  const $webviewContainer = document.getElementById('webview-container');
  const $loadingOverlay  = document.getElementById('loading-overlay');
  const $loadingText     = document.querySelector('.loading-text');
  const $addressBar      = document.getElementById('address-bar');
  const $btnBack         = document.getElementById('btn-back');
  const $btnForward      = document.getElementById('btn-forward');
  const $btnRefresh      = document.getElementById('btn-refresh');
  const $btnHome         = document.getElementById('btn-home');
  const $btnNewTab       = document.getElementById('btn-new-tab');
  const $btnMinimize     = document.getElementById('btn-minimize');
  const $btnMaximize     = document.getElementById('btn-maximize');
  const $btnClose        = document.getElementById('btn-close');

  const HOME_URL = 'https://www.baidu.com/';

  // ==================== 状态 ====================
  let tabs         = [];
  let activeTabId  = null;
  let nextId       = 1;
  let loadingTimer = null;       // loading 最小显示时间
  let switchLock   = false;      // 防连点锁
  const MIN_LOADING_MS = 300;    // loading 最少显示 ms，避免闪烁

  // ==================== Loading 遮罩 ====================
  function showLoading(name) {
    // 清除之前的定时器
    if (loadingTimer) { clearTimeout(loadingTimer); loadingTimer = null; }
    // 显示加载遮罩
    if ($loadingText) $loadingText.textContent = '正在加载 ' + (name || '页面') + '...';
    $loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    // 最少显示 MIN_LOADING_MS，避免一闪而过
    if (loadingTimer) { clearTimeout(loadingTimer); }
    loadingTimer = setTimeout(function () {
      $loadingOverlay.classList.add('hidden');
      loadingTimer = null;
    }, MIN_LOADING_MS);
  }

  function hideLoadingImmediate() {
    if (loadingTimer) { clearTimeout(loadingTimer); loadingTimer = null; }
    $loadingOverlay.classList.add('hidden');
  }

  // ==================== WebView ====================
  function createWebview() {
    var wv = document.createElement('webview');
    wv.setAttribute('partition', 'persist:main');
    wv.setAttribute('allowpopups', 'true');
    wv.setAttribute('nodeintegration', 'false');
    wv.setAttribute('webpreferences', 'contextIsolation=yes');
    wv.setAttribute('disablewebsecurity', 'false');
    wv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:none;opacity:0;transition:opacity 0.2s ease;';
    $webviewContainer.appendChild(wv);
    return wv;
  }

  // ==================== 标签管理 ====================
  function createTab(url, title) {
    var id = nextId++;
    var wv = createWebview();
    var tab = {
      id: id,
      title: title || '新标签页',
      url: url || HOME_URL,
      webview: wv,
      tabEl: null,
      isLoading: false
    };

    // ---- 绑定 WebView 事件 ----

    // 开始加载：显示 loading
    wv.addEventListener('did-start-loading', function () {
      tab.isLoading = true;
      if (tab.id === activeTabId) {
        showLoading(tab.title);
      }
      updateTabUI(tab);
    });

    // 加载完成：隐藏 loading
    wv.addEventListener('did-stop-loading', function () {
      tab.isLoading = false;
      if (tab.id === activeTabId) {
        hideLoading();
        // 渐入显示 webview
        wv.style.opacity = '1';
      }
      updateTabUI(tab);
    });

    // 页面标题
    wv.addEventListener('page-title-updated', function (e) {
      tab.title = e.title || tab.title;
      if (tab.id === activeTabId) {
        document.title = 'AI Browser - ' + tab.title;
      }
      updateTabUI(tab);
    });

    // 导航完成
    wv.addEventListener('did-navigate', function (e) {
      tab.url = e.url;
      if (tab.id === activeTabId) {
        $addressBar.value = e.url;
      }
      updateTabUI(tab);
    });

    // 页面内导航
    wv.addEventListener('did-navigate-in-page', function (e) {
      if (e.isMainFrame && tab.id === activeTabId) {
        tab.url = e.url;
        $addressBar.value = e.url;
      }
    });

    // 新窗口 → 当前标签内打开
    wv.addEventListener('new-window', function (e) {
      e.preventDefault();
      tab.url = e.url;
      tab.title = e.url;
      wv.src = e.url;
      if (tab.id === activeTabId) {
        $addressBar.value = e.url;
      }
      updateTabUI(tab);
    });

    // 加载失败
    wv.addEventListener('did-fail-load', function (e) {
      if (e.errorCode !== -3) {  // -3 = 用户取消，忽略
        tab.isLoading = false;
        if (tab.id === activeTabId) {
          hideLoadingImmediate();
        }
        updateTabUI(tab);
      }
    });

    // 加载 URL
    if (url) {
      wv.src = url;
    }

    tabs.push(tab);
    return tab;
  }

  // ==================== Tab UI ====================
  function renderTabItem(tab) {
    var el = document.createElement('div');
    el.className = 'tab-item';
    if (tab.id === activeTabId) el.classList.add('active');

    var titleSpan = document.createElement('span');
    titleSpan.className = 'tab-title';
    titleSpan.textContent = tab.title || '加载中...';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = '关闭标签';

    el.appendChild(titleSpan);
    el.appendChild(closeBtn);

    el.addEventListener('click', function (e) {
      if (e.target === closeBtn) return;
      openTab(tab.id);
    });

    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeTab(tab.id);
    });

    tab.tabEl = el;
    $tabStrip.appendChild(el);
  }

  function updateTabUI(tab) {
    if (!tab.tabEl) return;
    var titleSpan = tab.tabEl.querySelector('.tab-title');
    if (titleSpan) {
      titleSpan.textContent = tab.title || (tab.isLoading ? '加载中...' : '');
    }
    tab.tabEl.classList.toggle('active', tab.id === activeTabId);
  }

  function refreshAllTabUI() {
    tabs.forEach(function (t) {
      if (t.tabEl) {
        t.tabEl.classList.toggle('active', t.id === activeTabId);
      }
    });
  }

  // ==================== 切换 / 关闭标签 ====================
  function openTab(tabId) {
    if (activeTabId === tabId) return;

    // 隐藏旧标签
    if (activeTabId !== null) {
      var old = tabs.find(function (t) { return t.id === activeTabId; });
      if (old) {
        old.webview.classList.remove('active');
        old.webview.style.display = 'none';
        old.webview.style.opacity = '0';
      }
    }

    var tab = tabs.find(function (t) { return t.id === tabId; });
    if (!tab) return;

    activeTabId = tabId;
    tab.webview.classList.add('active');
    tab.webview.style.display = 'flex';

    // 如果 tab 正在加载，显示 loading；否则显示内容
    if (tab.isLoading) {
      showLoading(tab.title);
      tab.webview.style.opacity = '0';
    } else {
      hideLoadingImmediate();
      tab.webview.style.opacity = '1';
    }

    $addressBar.value = tab.url || '';
    document.title = 'AI Browser - ' + (tab.title || '新标签页');

    updateNavButtons(tab.webview);
    refreshAllTabUI();
  }

  function closeTab(tabId) {
    if (tabs.length <= 1) {
      var tab = tabs.find(function (t) { return t.id === tabId; });
      if (tab) {
        tab.url = HOME_URL;
        tab.title = '主页';
        tab.webview.src = HOME_URL;
        openTab(tab.id);
      }
      return;
    }

    var idx = tabs.findIndex(function (t) { return t.id === tabId; });
    if (idx === -1) return;

    var tab = tabs[idx];
    if (tab.webview && tab.webview.parentNode) {
      tab.webview.parentNode.removeChild(tab.webview);
    }
    if (tab.tabEl && tab.tabEl.parentNode) {
      tab.tabEl.parentNode.removeChild(tab.tabEl);
    }
    tabs.splice(idx, 1);

    if (tabId === activeTabId) {
      var newActive = tabs[Math.min(idx, tabs.length - 1)];
      if (newActive) openTab(newActive.id);
    }
  }

  function getActiveTab() {
    return tabs.find(function (t) { return t.id === activeTabId; }) || null;
  }

  // ==================== 导航控制 ====================
  function updateNavButtons(wv) {
    if (!wv) wv = getActiveTab() ? getActiveTab().webview : null;
    if (!wv) return;
    $btnBack.disabled = !(wv.canGoBack && wv.canGoBack());
    $btnForward.disabled = !(wv.canGoForward && wv.canGoForward());
  }

  function navigateTo(url) {
    var finalUrl = url.trim();
    if (!finalUrl) return;

    if (!/^https?:\/\//i.test(finalUrl)) {
      if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      } else {
        finalUrl = 'https://www.google.com/search?q=' + encodeURIComponent(finalUrl);
      }
    }

    var tab = getActiveTab();
    if (tab) {
      tab.url = finalUrl;
      tab.webview.style.opacity = '0';
      showLoading('页面');
      // 异步：下一个渲染帧再切换，确保 loading 遮罩已渲染
      requestAnimationFrame(function () {
        tab.webview.src = finalUrl;
      });
      $addressBar.value = finalUrl;
    }
  }

  // ==================== 侧边栏点击（异步非阻塞） ====================
  // 高亮当前激活的侧边栏按钮
  function highlightSidebarBtn(url) {
    $sidebarBtns.forEach(function (btn) {
      var btnUrl = btn.getAttribute('data-url');
      if (btnUrl === url) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  $sidebarBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      // 防连点：250ms 内忽略重复点击
      if (switchLock) return;
      switchLock = true;
      setTimeout(function () { switchLock = false; }, 250);

      var url = btn.getAttribute('data-url');
      var name = btn.getAttribute('data-name');
      if (!url) return;

      var tab = getActiveTab();
      if (!tab) return;

      // 1. 高亮侧边栏按钮
      highlightSidebarBtn(url);

      // 2. 立刻显示 loading 遮罩（同步，零延迟）
      tab.url = url;
      tab.title = name;
      tab.isLoading = true;
      tab.webview.style.opacity = '0';
      showLoading(name);
      $addressBar.value = url;
      updateTabUI(tab);

      // 3. 异步延迟导航：让浏览器先渲染 loading 遮罩，再触发 webview 导航
      //    requestAnimationFrame 确保 DOM 更新（loading 遮罩显示）完成后再设置 src
      requestAnimationFrame(function () {
        tab.webview.src = url;
      });
    });
  });

  // ==================== 其他事件 ====================
  // 地址栏回车
  $addressBar.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      navigateTo($addressBar.value);
    }
  });

  // 导航按钮
  $btnBack.addEventListener('click', function () {
    var wv = getActiveTab() ? getActiveTab().webview : null;
    if (wv && wv.canGoBack()) wv.goBack();
  });

  $btnForward.addEventListener('click', function () {
    var wv = getActiveTab() ? getActiveTab().webview : null;
    if (wv && wv.canGoForward()) wv.goForward();
  });

  $btnRefresh.addEventListener('click', function () {
    var wv = getActiveTab() ? getActiveTab().webview : null;
    if (wv) wv.reload();
  });

  $btnHome.addEventListener('click', function () {
    navigateTo(HOME_URL);
  });

  // 新建标签
  $btnNewTab.addEventListener('click', function () {
    var tab = createTab(HOME_URL, '新标签页');
    renderTabItem(tab);
    openTab(tab.id);
  });

  // ---- 窗口控制按钮 ----
  if (window.aiBrowser) {
    $btnMinimize.addEventListener('click', function () { window.aiBrowser.windowMinimize(); });
    $btnMaximize.addEventListener('click', function () { window.aiBrowser.windowMaximize(); });
    $btnClose.addEventListener('click', function () { window.aiBrowser.windowClose(); });
    // 监听最大化状态 → 切换按钮图标
    window.aiBrowser.onMaximizeChange(function (isMax) {
      $btnMaximize.innerHTML = isMax ? '&#x29C9;' : '&#x25A1;';
    });
  }

  // ==================== 初始化 ====================
  function init() {
    var tab = createTab(HOME_URL, '主页');
    renderTabItem(tab);
    openTab(tab.id);
    $addressBar.value = HOME_URL;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
