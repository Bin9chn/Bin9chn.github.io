/**
 * Blog admin — core.
 *
 * A static, server-less CMS for the Hugo repo. Everything talks to the GitHub
 * REST API with the owner's token; the token stays in this browser only.
 * Rendering for each screen lives in views.js, which uses the A.* helpers here.
 */
(function () {
  'use strict';

  var OWNER = 'Bin9chn';
  var REPO = 'Bin9chn.github.io';
  var API_ROOT = 'https://api.github.com';
  var TOKEN_KEY = 'blogadmin.token';
  var API_BASE_KEY = 'blogadmin.apiBase';
  var SITE_URL = 'https://bin9chn.github.io/';

  var state = {
    token: '',
    user: null,
    repo: null,
    branch: 'main',
    tree: [],
    posts: [],
    cats: [],
    apiBase: localStorage.getItem(API_BASE_KEY) || '',
    loadedAt: 0,
  };

  // ---------------------------------------------------------------- utilities

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function toast(message, kind) {
    var el = $('#toast');
    el.textContent = message;
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    el.hidden = false;
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(function () { el.hidden = true; }, kind === 'err' ? 7000 : 3200);
  }

  function setStatus(text, kind) {
    var el = $('#sync-status');
    if (!text) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = text;
    el.className = 'status' + (kind ? ' status--' + kind : '');
  }

  function b64encodeUtf8(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = '';
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function b64decodeUtf8(b64) {
    var binary = atob(String(b64 || '').replace(/\s/g, ''));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function localStamp(date) {
    var d = date || new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var offset = -d.getTimezoneOffset();
    var sign = offset >= 0 ? '+' : '-';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) +
      sign + pad(Math.floor(Math.abs(offset) / 60)) + ':' + pad(Math.abs(offset) % 60);
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
  }

  function formatDate(value) {
    if (!value) return '';
    if (value instanceof Date) return localStamp(value).slice(0, 10);
    return String(value).slice(0, 10);
  }

  function sortPosts(list) {
    return list.slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  }

  // --------------------------------------------------------------------- http

  function HttpError(status, message, detail) {
    this.name = 'HttpError';
    this.status = status;
    this.message = message;
    this.detail = detail || '';
  }
  HttpError.prototype = Object.create(Error.prototype);

  function friendly(status, body, path) {
    if (status === 401) return 'Token 无效或已过期，请重新生成后再登录。';
    if (status === 403) {
      if (body && /rate limit/i.test(body.message || '')) return 'GitHub API 限流了，等一分钟再试。';
      return '这个 Token 没有该仓库的写权限，请确认 Contents 是 Read and write。';
    }
    if (status === 404) return '找不到仓库或文件（' + path + '），请确认仓库名与分支。';
    if (status === 409) return '仓库刚有新的提交，刷新后重试。';
    if (status === 422) return 'GitHub 拒绝了这次提交（422）：' + ((body && body.message) || '内容可能过大或路径非法');
    return 'GitHub 返回 ' + status + '：' + ((body && body.message) || '未知错误');
  }

  async function api(path, options) {
    options = options || {};
    var url = (state.apiBase || '') + API_ROOT + path;
    var headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: 'Bearer ' + state.token,
    };
    if (options.body) headers['Content-Type'] = 'application/json';

    var res;
    try {
      res = await fetch(url, {
        method: options.method || 'GET',
        headers: headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (err) {
      throw new HttpError(0, '连不上 api.github.com。这个网络可能访问不了 GitHub API，换个网络或代理后再试。');
    }

    var text = await res.text();
    var data = null;
    try { data = text ? JSON.parse(text) : null; } catch (err) { data = null; }

    if (!res.ok) throw new HttpError(res.status, friendly(res.status, data, path), text.slice(0, 300));
    return data;
  }

  // ------------------------------------------------------------------ session

  async function login(token, remember) {
    state.token = String(token || '').trim();
    if (!state.token) throw new Error('请先填入 GitHub Token。');

    var user = await api('/user');
    if (!user || !user.login) throw new Error('Token 校验失败，请重新生成。');
    if (String(user.login).toLowerCase() !== OWNER.toLowerCase()) {
      throw new Error('这个 Token 属于 @' + user.login + '，只有 @' + OWNER + ' 的 GitHub 账号可以进入后台。');
    }

    var repo = await api('/repos/' + OWNER + '/' + REPO);
    if (!repo || !repo.permissions || !repo.permissions.push) {
      throw new Error('这个 Token 没有 ' + OWNER + '/' + REPO + ' 的写入权限。');
    }

    state.user = user;
    state.repo = repo;
    state.branch = repo.default_branch || 'main';
    if (remember) {
      localStorage.setItem(TOKEN_KEY, state.token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, state.token);
      localStorage.removeItem(TOKEN_KEY);
    }

    $('#login-view').hidden = true;
    $('#admin-view').hidden = false;
    $('#account-label').textContent = '@' + user.login;
    $('#build-label').textContent = state.branch + ' · ' + (repo.private ? 'private' : 'public');

    await reload();
    A.route();
  }

  function logout(message) {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    state.token = '';
    state.user = null;
    location.hash = '';
    $('#admin-view').hidden = true;
    $('#login-view').hidden = false;
    $('#view').innerHTML = '';
    if (message) {
      $('#login-error').textContent = message;
      $('#login-error').hidden = false;
    }
  }

  function bootSession() {
    var token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
    if (!token) return;
    state.token = token;
    login(token, true).catch(function (err) {
      logout(err.message);
    });
  }

  // --------------------------------------------------------------- repository

  async function refreshTree(sha) {
    // Accepting an explicit tree sha avoids the cached branch lookup right after a
    // commit: the new sha is content-addressed and can never be stale.
    var data = await api('/repos/' + OWNER + '/' + REPO + '/git/trees/' + (sha || state.branch) + '?recursive=1');
    state.tree = (data && data.tree) || [];
    return state.tree;
  }

  function findBlob(path) {
    for (var i = 0; i < state.tree.length; i += 1) {
      if (state.tree[i].path === path) return state.tree[i];
    }
    return null;
  }

  function listTree(prefix, suffix) {
    return state.tree
      .filter(function (node) {
        return node.type === 'blob' && node.path.indexOf(prefix) === 0 && (!suffix || node.path.slice(-suffix.length) === suffix);
      })
      .map(function (node) { return node.path; });
  }

  // Content-addressed cache: after a commit only the blobs whose sha changed are
  // fetched again. Without it every save re-read all ~39 posts (2-5s of latency
  // before the list refreshes).
  var fileCache = Object.create(null);

  async function readFile(path) {
    var node = findBlob(path);
    if (!node) return null;
    if (fileCache[node.sha] !== undefined) return fileCache[node.sha];
    var blob = await api('/repos/' + OWNER + '/' + REPO + '/git/blobs/' + node.sha);
    var text = b64decodeUtf8(blob.content);
    fileCache[node.sha] = text;
    return text;
  }

  async function pool(items, limit, worker) {
    var results = new Array(items.length);
    var cursor = 0;
    async function run() {
      while (cursor < items.length) {
        var index = cursor;
        cursor += 1;
        results[index] = await worker(items[index], index);
      }
    }
    var runners = [];
    for (var i = 0; i < Math.min(limit, items.length); i += 1) runners.push(run());
    await Promise.all(runners);
    return results;
  }

  // ------------------------------------------------------------------- models

  // ---------------------------------------------------------------- front matter

  function parseTomlScalar(raw) {
    var value = String(raw).trim();
    if (value.charAt(0) === '[') {
      var end = value.lastIndexOf(']');
      var inner = end > 0 ? value.slice(1, end) : value.slice(1);
      return inner.split(',').map(stripTomlString).filter(function (item) { return item !== ''; });
    }
    if (value === 'true') return true;
    if (value === 'false') return false;
    return stripTomlString(value);
  }

  function stripTomlString(raw) {
    var value = String(raw).trim();
    if (value.length > 1 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    if (value.length > 1 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
      return value.slice(1, -1);
    }
    return value;
  }

  /** Enough TOML for a Hugo header: scalars, booleans and one-line arrays. */
  function parseTomlBlock(block) {
    var fm = {};
    block.split(/\r?\n/).forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed || trimmed.charAt(0) === '#') return;
      var match = trimmed.match(/^([A-Za-z_][\w-]*)\s*=\s*(.+)$/);
      if (!match) return;
      fm[match[1]] = parseTomlScalar(match[2]);
    });
    return fm;
  }

  function tomlValue(value) {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) {
      return '[' + value.map(function (item) { return '"' + String(item).replace(/"/g, '\\"') + '"'; }).join(', ') + ']';
    }
    var text = String(value);
    // Unquoted dates are the Hugo convention; quoting them still parses but reads oddly.
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)?)?$/.test(text)) return text;
    return '"' + text.replace(/"/g, '\\"') + '"';
  }

  function dumpTomlFrontMatter(fm) {
    var order = ['title', 'date', 'draft', 'categories', 'tags', 'summary', 'slug', 'featuredImage', 'sourceUrl'];
    var lines = ['+++'];
    order.forEach(function (key) {
      if (fm[key] !== undefined && fm[key] !== null && fm[key] !== '') lines.push(key + ' = ' + tomlValue(fm[key]));
    });
    Object.keys(fm).forEach(function (key) {
      if (order.indexOf(key) === -1 && fm[key] !== undefined && fm[key] !== null) lines.push(key + ' = ' + tomlValue(fm[key]));
    });
    lines.push('+++', '');
    return lines.join('\n');
  }

  function splitFrontMatter(raw) {
    var text = String(raw || '').replace(/^\uFEFF/, '');
    var yaml = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (yaml) {
      var fm = {};
      try { fm = jsyaml.load(yaml[1]) || {}; } catch (err) { fm = { __parseError: err.message }; }
      return { fm: fm, body: text.slice(yaml[0].length), format: 'yaml' };
    }
    // Posts written earlier use TOML (+++). Without this branch the editor saw an
    // empty header and would wipe title/categories/tags on the first save.
    var toml = text.match(/^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n?/);
    if (toml) {
      return { fm: parseTomlBlock(toml[1]), body: text.slice(toml[0].length), format: 'toml' };
    }
    return { fm: {}, body: text, format: 'yaml' };
  }

  function dumpFrontMatter(fm, format) {
    if (format === 'toml') return dumpTomlFrontMatter(fm);
    var ordered = {};
    ['title', 'date', 'draft', 'categories', 'tags', 'summary', 'slug', 'featuredImage', 'sourceUrl'].forEach(function (key) {
      if (fm[key] !== undefined && fm[key] !== null && fm[key] !== '') ordered[key] = fm[key];
    });
    Object.keys(fm).forEach(function (key) {
      if (!(key in ordered) && fm[key] !== undefined && fm[key] !== null) ordered[key] = fm[key];
    });
    return '---\n' + jsyaml.dump(ordered, { lineWidth: 120, noRefs: true }) + '---\n\n';
  }

  function normalizePost(path, raw) {
    var parts = splitFrontMatter(raw);
    var fm = parts.fm || {};
    var slug = path.split('/')[2] || '';
    var categories = fm.categories;
    if (typeof categories === 'string') categories = [categories];
    var tags = fm.tags;
    if (typeof tags === 'string') tags = [tags];
    return {
      path: path,
      slug: slug,
      title: fm.title || slug,
      date: fm.date ? (fm.date instanceof Date ? localStamp(fm.date) : String(fm.date)) : '',
      draft: !!fm.draft,
      summary: fm.summary || '',
      categories: categories || [],
      tags: tags || [],
      featuredImage: fm.featuredImage || '',
      sourceUrl: fm.sourceUrl || '',
      body: parts.body,
      raw: raw,
      fm: fm,
      format: parts.format,
    };
  }

  async function loadPosts() {
    var paths = listTree('content/posts/', '/index.md');
    var posts = await pool(paths, 6, async function (path) {
      var raw = await readFile(path);
      return normalizePost(path, raw);
    });
    state.posts = sortPosts(posts);
    return state.posts;
  }

  async function loadCategories() {
    var raw = await readFile('data/categories.yaml');
    state.cats = (raw && jsyaml.load(raw)) || [];
    return state.cats;
  }

  async function reload() {
    setStatus('正在读取仓库…');
    await refreshTree();
    await Promise.all([loadPosts(), loadCategories()]);
    state.loadedAt = Date.now();
    setStatus('已同步 · ' + state.posts.length + ' 篇', 'ok');
    window.setTimeout(function () { setStatus(''); }, 2500);
  }

  // ------------------------------------------------------------------- commit

  /**
   * changes: [{ path, content, encoding }] — content null deletes the path.
   * Uploads every blob first, then creates one tree/commit so the site never
   * sees a half-applied edit.
   */
  async function commit(changes, message) {
    if (!changes.length) return null;
    setStatus('正在提交…');
    var ref = await api('/repos/' + OWNER + '/' + REPO + '/git/ref/heads/' + state.branch + '?t=' + Date.now());
    var parentSha = ref.object.sha;
    var parent = await api('/repos/' + OWNER + '/' + REPO + '/git/commits/' + parentSha + '?t=' + Date.now());

    var treeItems = await pool(changes, 4, async function (change) {
      if (change.content === null) {
        return { path: change.path, mode: '100644', type: 'blob', sha: null };
      }
      var isBase64 = change.encoding === 'base64';
      var blob = await api('/repos/' + OWNER + '/' + REPO + '/git/blobs', {
        method: 'POST',
        body: {
          content: isBase64 ? change.content : b64encodeUtf8(change.content),
          encoding: 'base64',
        },
      });
      return { path: change.path, mode: '100644', type: 'blob', sha: blob.sha };
    });

    var tree = await api('/repos/' + OWNER + '/' + REPO + '/git/trees', {
      method: 'POST',
      body: { base_tree: parent.tree.sha, tree: treeItems },
    });
    var newCommit = await api('/repos/' + OWNER + '/' + REPO + '/git/commits', {
      method: 'POST',
      body: { message: message, tree: tree.sha, parents: [parentSha] },
    });
    await api('/repos/' + OWNER + '/' + REPO + '/git/refs/heads/' + state.branch, {
      method: 'PATCH',
      body: { sha: newCommit.sha },
    });

    setStatus('已提交 ' + newCommit.sha.slice(0, 7) + '，等待 Pages 构建…');
    watchBuild(newCommit.sha);
    // GitHub's ref endpoint can serve a cached value for a few seconds right after
    // the PATCH. Without this wait the next tree read returns the previous commit,
    // so a freshly saved post is missing from the list until a manual refresh.
    await waitForRef(newCommit.sha);
    await refreshTree(newCommit.tree.sha);
    await Promise.all([loadPosts(), loadCategories()]);
    return newCommit;
  }

  async function waitForRef(sha, timeout) {
    var limit = timeout || 8000;
    var started = Date.now();
    while (Date.now() - started < limit) {
      try {
        var ref = await api('/repos/' + OWNER + '/' + REPO + '/git/ref/heads/' + state.branch + '?t=' + Date.now());
        if (ref && ref.object && ref.object.sha === sha) return true;
      } catch (err) {
        /* transient; keep polling */
      }
      await new Promise(function (resolve) { window.setTimeout(resolve, 700); });
    }
    return false;
  }

  /** Poll the Pages build so the editor can say "live" instead of guessing. */
  async function watchBuild(sha) {
    var tries = 0;
    async function tick() {
      tries += 1;
      try {
        var build = await api('/repos/' + OWNER + '/' + REPO + '/pages/builds/latest');
        if (build && build.status === 'built') {
          setStatus('已上线 · ' + new Date().toLocaleTimeString(), 'ok');
          window.setTimeout(function () { setStatus(''); }, 6000);
          return;
        }
        if (build && build.status === 'errored') {
          setStatus('Pages 构建失败，去 Actions 看看日志', 'err');
          return;
        }
      } catch (err) {
        /* Pages API may be unavailable; the commit itself is what matters. */
      }
      if (tries < 20) window.setTimeout(tick, 6000);
      else setStatus('已提交，构建状态请到 Actions 查看');
    }
    window.setTimeout(tick, 4000);
  }

  // --------------------------------------------------------------------- misc

  async function deletePost(post) {
    var prefix = 'content/posts/' + post.slug + '/';
    var changes = listTree(prefix).map(function (path) { return { path: path, content: null }; });
    await commit(changes, 'post: 删除《' + post.title + '》');
  }

  function findCategory(label) {
    for (var i = 0; i < state.cats.length; i += 1) {
      if (state.cats[i].label === label) return state.cats[i];
    }
    return null;
  }

  function categoryUrl(cat) {
    return SITE_URL + 'categories/' + cat.slug + '/';
  }

  function postUrl(post) {
    return SITE_URL + 'posts/' + post.slug + '/';
  }

  function setHeader(title, sub) {
    $('#page-title').textContent = title;
    $('#page-sub').textContent = sub || '';
    document.title = title + ' · 管理后台';
  }

  function confirmDialog(options) {
    return new Promise(function (resolve) {
      var modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML =
        '<div class="modal__card" role="dialog" aria-modal="true">' +
          '<h3 class="modal__title">' + esc(options.title) + '</h3>' +
          '<p class="modal__desc">' + esc(options.desc || '') + '</p>' +
          '<div class="modal__actions">' +
            '<button class="btn btn--ghost" data-act="cancel" type="button">取消</button>' +
            '<button class="btn ' + (options.danger ? 'btn--danger' : 'btn--primary') + '" data-act="ok" type="button">' + esc(options.ok || '确定') + '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      function close(result) { modal.remove(); resolve(result); }
      modal.addEventListener('click', function (event) {
        var act = event.target.getAttribute && event.target.getAttribute('data-act');
        if (act === 'ok') close(true);
        else if (act === 'cancel' || event.target === modal) close(false);
      });
      $('[data-act="ok"]', modal).focus();
    });
  }

  // -------------------------------------------------------------------- views

  var A = {
    OWNER: OWNER,
    REPO: REPO,
    SITE_URL: SITE_URL,
    state: state,
    api: api,
    readFile: readFile,
    commit: commit,
    reload: reload,
    refreshTree: refreshTree,
    listTree: listTree,
    findBlob: findBlob,
    pool: pool,
    splitFrontMatter: splitFrontMatter,
    dumpFrontMatter: dumpFrontMatter,
    normalizePost: normalizePost,
    deletePost: deletePost,
    findCategory: findCategory,
    categoryUrl: categoryUrl,
    postUrl: postUrl,
    setHeader: setHeader,
    confirm: confirmDialog,
    toast: toast,
    esc: esc,
    slugify: slugify,
    localStamp: localStamp,
    formatDate: formatDate,
    sortPosts: sortPosts,
    route: function () { route(); },
    views: {},
  };
  window.A = A;

  // -------------------------------------------------------------------- route

  function parseHash() {
    var hash = location.hash.replace(/^#\/?/, '') || 'posts';
    var segments = hash.split('/').filter(Boolean);
    return { name: segments[0] || 'posts', rest: segments.slice(1) };
  }

  async function route() {
    if (!state.user) return;
    var parsed = parseHash();
    var view = A.views[parsed.name] || A.views.posts;
    $$('.nav__item').forEach(function (item) {
      item.classList.toggle('is-active', item.getAttribute('data-nav') === parsed.name);
    });
    var sidebar = $('.sidebar');
    if (sidebar) sidebar.classList.remove('is-open');

    var container = $('#view');
    container.innerHTML = '<div class="loading"><span class="spinner"></span> 加载中…</div>';
    try {
      await view(container, parsed.rest);
    } catch (err) {
      container.innerHTML = '<div class="card"><h3 class="card__title">加载失败</h3><p class="card__desc">' +
        esc(err.message || String(err)) + '</p><button class="btn" onclick="A.route()" type="button">重试</button></div>';
      if (err.status === 401) logout(err.message);
    }
    container.scrollTop = 0;
    window.scrollTo({ top: 0 });
  }

  // -------------------------------------------------------------------- start

  document.addEventListener('DOMContentLoaded', function () {
    $('#login-form').addEventListener('submit', async function (event) {
      event.preventDefault();
      var button = $('#login-submit');
      var error = $('#login-error');
      error.hidden = true;
      button.disabled = true;
      button.textContent = '正在验证…';
      try {
        await login($('#token-input').value, $('#remember-input').checked);
      } catch (err) {
        error.textContent = err.message || String(err);
        error.hidden = false;
      } finally {
        button.disabled = false;
        button.textContent = '验证并进入';
      }
    });

    $('#logout-btn').addEventListener('click', function () {
      confirmDialog({
        title: '退出登录？',
        desc: '会清除保存在这台设备上的 Token，下次需要重新粘贴。',
        ok: '退出',
        danger: true,
      }).then(function (ok) {
        if (ok) logout();
      });
    });

    $('#reload-btn').addEventListener('click', async function () {
      try {
        await reload();
        toast('已重新同步仓库', 'ok');
        route();
      } catch (err) {
        toast(err.message, 'err');
      }
    });

    $('#menu-btn').addEventListener('click', function () {
      var sidebar = $('.sidebar');
      if (sidebar) sidebar.classList.toggle('is-open');
    });

    window.addEventListener('hashchange', route);
    bootSession();
  });
})();
