/**
 * Admin views — sidebar, home sections, friends, about.
 * Depends on A.* helpers from admin.js.
 */
(function () {
  'use strict';

  var A = window.A;
  var esc = A.esc;
  var state = A.state;

  function clone(value) {
    return JSON.parse(JSON.stringify(value || null));
  }

  function linesToArray(text) {
    return String(text || '')
      .split(/\r?\n|,/)
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  // ----------------------------------------------------------------- sidebar

  A.views.sidebar = async function (container) {
    A.setHeader('侧边栏', 'data/sidebar.yaml · 首页左上角那块');
    var raw = await A.readFile('data/sidebar.yaml');
    if (!raw) throw new Error('读不到 data/sidebar.yaml');
    var data = jsyaml.load(raw) || {};
    data.profile = data.profile || {};
    data.sections = data.sections || [];

    var profile = data.profile;
    var status = profile.status || {};
    var links = clone(profile.links) || [];
    var statsSection = data.sections.filter(function (section) { return section.type === 'stats'; })[0];
    var tagsSection = data.sections.filter(function (section) { return section.type === 'tags'; })[0];
    var stats = statsSection ? clone(statsSection.items) || [] : [];

    function linkRows() {
      return links.map(function (link, index) {
        return '<tr data-link="' + index + '">' +
          '<td><input class="input input--mono" data-key="icon" value="' + esc(link.icon || 'link') + '" list="icon-list" style="min-width:100px"></td>' +
          '<td><input class="input" data-key="label" value="' + esc(link.label || '') + '" style="min-width:150px"></td>' +
          '<td><input class="input input--mono" data-key="url" value="' + esc(link.url || '') + '" style="min-width:200px"></td>' +
          '<td><button class="btn btn--sm btn--danger" data-drop-link="' + index + '" type="button">删除</button></td>' +
        '</tr>';
      }).join('');
    }

    function statRows() {
      return stats.map(function (item, index) {
        return '<tr data-stat="' + index + '">' +
          '<td><input class="input" data-key="label" value="' + esc(item.label || '') + '"></td>' +
          '<td><input class="input input--mono" data-key="value" value="' + esc(item.value || '') + '"></td>' +
          '<td><input class="input input--mono" data-key="accent" value="' + esc(item.accent || 'cyan') + '" list="accent-list" style="width:100px"></td>' +
          '<td><button class="btn btn--sm btn--danger" data-drop-stat="' + index + '" type="button">删除</button></td>' +
        '</tr>';
      }).join('');
    }

    container.innerHTML =
      '<div class="card">' +
        '<div class="card__title">个人信息</div><div class="card__desc">首页侧边栏顶部的头像与简介。</div>' +
        '<div class="grid-2">' +
          '<label class="field"><span class="field__label">昵称</span><input class="input" id="p-name" value="' + esc(profile.name || '') + '"></label>' +
          '<label class="field"><span class="field__label">一句话头衔</span><input class="input" id="p-title" value="' + esc(profile.title || '') + '"></label>' +
        '</div>' +
        '<label class="field"><span class="field__label">简介</span><textarea class="textarea" id="p-desc" rows="2">' + esc(profile.description || '') + '</textarea></label>' +
        '<label class="field"><span class="field__label">头像路径</span><input class="input input--mono" id="p-avatar" value="' + esc(profile.avatar || '') + '"><span class="field__hint">相对 static/，例如 images/avatar.png</span></label>' +
        '<div class="grid-2">' +
          '<label class="field"><span class="field__label">状态标签</span><input class="input" id="s-label" value="' + esc(status.label || '') + '"></label>' +
          '<label class="field"><span class="field__label">状态值</span><input class="input" id="s-value" value="' + esc(status.value || '') + '"></label>' +
          '<label class="field"><span class="field__label">第二行标签</span><input class="input" id="s-plabel" value="' + esc(status.preference_label || '') + '"></label>' +
          '<label class="field"><span class="field__label">第二行值</span><input class="input" id="s-pvalue" value="' + esc(status.preference || '') + '"></label>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head"><div><div class="card__title">社交链接</div><div class="card__desc">图标名用 icon 组件支持的名称：github / article / rss / website / link。</div></div>' +
        '<button class="btn" id="add-link" type="button">+ 添加</button></div>' +
        '<div class="table-wrap"><table><thead><tr><th>图标</th><th>文字</th><th>地址</th><th></th></tr></thead><tbody id="link-rows">' + linkRows() + '</tbody></table></div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head"><div><div class="card__title">Snapshot 数字</div><div class="card__desc">Posts 会自动统计，不用手改；其他项照填。</div></div>' +
        '<button class="btn" id="add-stat" type="button">+ 添加</button></div>' +
        '<div class="table-wrap"><table><thead><tr><th>标签</th><th>值</th><th>配色</th><th></th></tr></thead><tbody id="stat-rows">' + statRows() + '</tbody></table></div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__title">Topics 标签</div>' +
        '<div class="card__desc">首页的标签云由文章 tags 自动统计，取使用最多的 6 个，点进去会跳到搜索页按标签筛。要改标签请去对应文章的编辑页改 tags，这里不用填。</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__title">Categories 分类卡</div>' +
        '<div class="card__desc">首页侧边栏那张分类列表由分类配置自动生成（名称、顺序、文章数都跟着走），改分类请去「分类」页，这里不用填。</div>' +
      '</div>' +

      '<div class="row"><button class="btn btn--primary" id="save-sidebar" type="button">保存侧边栏</button></div>' +
      '<datalist id="accent-list"><option value="cyan"><option value="emerald"><option value="purple"><option value="amber"><option value="rose"></datalist>';

    var iconList = document.createElement('datalist');
    iconList.id = 'icon-list';
    iconList.innerHTML = '<option value="github"><option value="article"><option value="rss"><option value="website"><option value="link"><option value="library"><option value="external">';
    container.appendChild(iconList);

    container.querySelector('#link-rows').addEventListener('input', function (event) {
      var row = event.target.closest('[data-link]');
      var key = event.target.getAttribute('data-key');
      if (!row || !key) return;
      links[Number(row.getAttribute('data-link'))][key] = event.target.value;
    });

    container.querySelector('#link-rows').addEventListener('click', function (event) {
      var index = event.target.getAttribute && event.target.getAttribute('data-drop-link');
      if (index === null) return;
      links.splice(Number(index), 1);
      container.querySelector('#link-rows').innerHTML = linkRows();
    });

    container.querySelector('#add-link').addEventListener('click', function () {
      links.push({ icon: 'link', label: '', url: 'https://' });
      container.querySelector('#link-rows').innerHTML = linkRows();
    });

    container.querySelector('#stat-rows').addEventListener('input', function (event) {
      var row = event.target.closest('[data-stat]');
      var key = event.target.getAttribute('data-key');
      if (!row || !key) return;
      stats[Number(row.getAttribute('data-stat'))][key] = event.target.value;
    });

    container.querySelector('#stat-rows').addEventListener('click', function (event) {
      var index = event.target.getAttribute && event.target.getAttribute('data-drop-stat');
      if (index === null) return;
      stats.splice(Number(index), 1);
      container.querySelector('#stat-rows').innerHTML = statRows();
    });

    container.querySelector('#add-stat').addEventListener('click', function () {
      stats.push({ label: 'New', value: '0', accent: 'cyan' });
      container.querySelector('#stat-rows').innerHTML = statRows();
    });

    container.querySelector('#save-sidebar').addEventListener('click', async function () {
      var button = this;
      button.disabled = true;
      button.textContent = '提交中…';
      try {
        data.profile = {
          name: container.querySelector('#p-name').value.trim(),
          title: container.querySelector('#p-title').value.trim(),
          avatar: container.querySelector('#p-avatar').value.trim(),
          description: container.querySelector('#p-desc').value.trim(),
          status: {
            label: container.querySelector('#s-label').value.trim(),
            value: container.querySelector('#s-value').value.trim(),
            preference_label: container.querySelector('#s-plabel').value.trim(),
            preference: container.querySelector('#s-pvalue').value.trim(),
          },
          links: links.filter(function (link) { return link.label || link.url; }),
        };

        if (statsSection) {
          statsSection.items = stats.filter(function (item) { return item.label; });
        }
        if (tagsSection) {
          // Topics are counted from post tags at build time; keeping a stale
          // hand-written list here only produced chips that led nowhere.
          delete tagsSection.items;
        }

        var yaml = jsyaml.dump(data, { lineWidth: 130, noRefs: true });
        await A.commit([{ path: 'data/sidebar.yaml', content: yaml }], 'admin: 更新侧边栏');
        A.toast('侧边栏已保存', 'ok');
      } catch (err) {
        A.toast(err.message, 'err');
      } finally {
        button.disabled = false;
        button.textContent = '保存侧边栏';
      }
    });
  };

  // -------------------------------------------------------------------- home

  A.views.home = async function (container) {
    A.setHeader('首页区块', 'data/home/*.yaml · 决定首页显示什么、什么顺序');

    var sectionsRaw = await A.readFile('data/home/sections.yaml');
    var recentRaw = await A.readFile('data/home/recent-posts.yaml');
    var featuredRaw = await A.readFile('data/home/featured-projects.yaml');

    var sections = jsyaml.load(sectionsRaw) || { items: [] };
    var recent = jsyaml.load(recentRaw) || {};
    var featured = jsyaml.load(featuredRaw) || { items: [] };
    var order = (sections.items || []).slice();
    var projects = clone(featured.items) || [];

    function orderRows() {
      return order.map(function (id, index) {
        var known = { 'recent-posts': '最近文章', 'featured-projects': '精选项目' };
        return '<tr><td class="mono">' + esc(id) + '</td><td>' + esc(known[id] || '—') + '</td>' +
          '<td class="nowrap"><button class="btn btn--sm btn--ghost" data-up="' + index + '" type="button">↑</button>' +
          '<button class="btn btn--sm btn--ghost" data-down="' + index + '" type="button">↓</button>' +
          '<button class="btn btn--sm btn--danger" data-drop="' + index + '" type="button">移除</button></td></tr>';
      }).join('');
    }

    function projectRows() {
      return projects.map(function (item, index) {
        return '<tr data-project="' + index + '">' +
          '<td><input class="input" data-key="title" value="' + esc(item.title || '') + '" style="min-width:120px"></td>' +
          '<td><input class="input" data-key="description" value="' + esc(item.description || '') + '" style="min-width:220px"></td>' +
          '<td><input class="input input--mono" data-key="type" value="' + esc(item.type || '') + '" style="width:100px"></td>' +
          '<td><input class="input input--mono" data-key="accent" value="' + esc(item.accent || 'cyan') + '" list="accent-list" style="width:100px"></td>' +
          '<td><input class="input input--mono" data-key="url" value="' + esc(item.links && item.links[0] ? item.links[0].url : '') + '" style="min-width:190px"></td>' +
          '<td><button class="btn btn--sm btn--danger" data-drop-project="' + index + '" type="button">删除</button></td>' +
        '</tr>';
      }).join('');
    }

    container.innerHTML =
      '<div class="card">' +
        '<div class="card__title">区块顺序</div><div class="card__desc">首页主栏从上到下的顺序。</div>' +
        '<div class="table-wrap"><table><thead><tr><th>区块 ID</th><th>说明</th><th></th></tr></thead><tbody id="order-rows">' + orderRows() + '</tbody></table></div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card__title">最近文章</div><div class="card__desc">首页显示几篇，以及区块标题。</div>' +
        '<div class="grid-2">' +
          '<label class="field"><span class="field__label">区块标题</span><input class="input" id="r-title" value="' + esc(recent.title || 'Recent Posts') + '"></label>' +
          '<label class="field"><span class="field__label">显示篇数</span><input class="input" id="r-limit" type="number" min="1" max="24" value="' + esc(recent.limit || 6) + '"></label>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card__head"><div><div class="card__title">精选项目</div><div class="card__desc">首页第二块，链接取每项的第一个 link。</div></div>' +
        '<button class="btn" id="add-project" type="button">+ 添加</button></div>' +
        '<label class="field"><span class="field__label">区块标题</span><input class="input" id="f-title" value="' + esc(featured.title || 'Featured Projects') + '"></label>' +
        '<div class="table-wrap"><table><thead><tr><th>名称</th><th>描述</th><th>类型</th><th>配色</th><th>链接</th><th></th></tr></thead><tbody id="project-rows">' + projectRows() + '</tbody></table></div>' +
      '</div>' +
      '<div class="row"><button class="btn btn--primary" id="save-home" type="button">保存首页配置</button></div>' +
      '<datalist id="accent-list"><option value="cyan"><option value="emerald"><option value="purple"><option value="amber"><option value="rose"></datalist>';

    container.querySelector('#order-rows').addEventListener('click', function (event) {
      var up = event.target.getAttribute('data-up');
      var down = event.target.getAttribute('data-down');
      var drop = event.target.getAttribute('data-drop');
      if (up !== null) {
        var i = Number(up);
        if (i > 0) { var tmp = order[i - 1]; order[i - 1] = order[i]; order[i] = tmp; }
      } else if (down !== null) {
        var j = Number(down);
        if (j < order.length - 1) { var t2 = order[j + 1]; order[j + 1] = order[j]; order[j] = t2; }
      } else if (drop !== null) {
        order.splice(Number(drop), 1);
      } else {
        return;
      }
      container.querySelector('#order-rows').innerHTML = orderRows();
    });

    container.querySelector('#project-rows').addEventListener('input', function (event) {
      var row = event.target.closest('[data-project]');
      var key = event.target.getAttribute('data-key');
      if (!row || !key) return;
      var item = projects[Number(row.getAttribute('data-project'))];
      if (key === 'url') {
        item.links = item.links && item.links.length ? item.links : [{ label: 'Code', icon: 'github', url: '' }];
        item.links[0].url = event.target.value;
      } else {
        item[key] = event.target.value;
      }
    });

    container.querySelector('#project-rows').addEventListener('click', function (event) {
      var index = event.target.getAttribute && event.target.getAttribute('data-drop-project');
      if (index === null) return;
      projects.splice(Number(index), 1);
      container.querySelector('#project-rows').innerHTML = projectRows();
    });

    container.querySelector('#add-project').addEventListener('click', function () {
      projects.push({ title: '新项目', description: '', accent: 'cyan', type: 'Tooling', links: [{ label: 'Code', url: 'https://github.com/Bin9chn/', icon: 'github' }] });
      container.querySelector('#project-rows').innerHTML = projectRows();
    });

    container.querySelector('#save-home').addEventListener('click', async function () {
      var button = this;
      button.disabled = true;
      button.textContent = '提交中…';
      try {
        sections.items = order;
        recent.title = container.querySelector('#r-title').value.trim();
        recent.limit = Number(container.querySelector('#r-limit').value) || 6;
        featured.title = container.querySelector('#f-title').value.trim();
        featured.items = projects.filter(function (item) { return item.title; });

        await A.commit([
          { path: 'data/home/sections.yaml', content: jsyaml.dump(sections, { lineWidth: 130 }) },
          { path: 'data/home/recent-posts.yaml', content: jsyaml.dump(recent, { lineWidth: 130 }) },
          { path: 'data/home/featured-projects.yaml', content: jsyaml.dump(featured, { lineWidth: 130 }) },
        ], 'admin: 更新首页配置');
        A.toast('首页配置已保存', 'ok');
      } catch (err) {
        A.toast(err.message, 'err');
      } finally {
        button.disabled = false;
        button.textContent = '保存首页配置';
      }
    });
  };

  // ----------------------------------------------------------------- friends

  A.views.friends = async function (container) {
    A.setHeader('友链', 'data/friends.json');
    var raw = await A.readFile('data/friends.json');
    var data = JSON.parse(raw || '{"friends":[]}');
    var friends = data.friends || [];

    function rows() {
      return friends.map(function (friend, index) {
        return '<tr data-friend="' + index + '">' +
          '<td><input class="input" data-key="name" value="' + esc(friend.name || '') + '" style="min-width:120px"></td>' +
          '<td><input class="input input--mono" data-key="url" value="' + esc(friend.url || '') + '" style="min-width:180px"></td>' +
          '<td><input class="input" data-key="description" value="' + esc(friend.description || '') + '" style="min-width:200px"></td>' +
          '<td><input class="input input--mono" data-key="avatar" value="' + esc(friend.avatar || '') + '" style="min-width:150px"></td>' +
          '<td><input class="input" data-key="tags" value="' + esc((friend.tags || []).join(', ')) + '" style="min-width:140px"></td>' +
          '<td><button class="btn btn--sm btn--danger" data-drop="' + index + '" type="button">删除</button></td>' +
        '</tr>';
      }).join('');
    }

    container.innerHTML =
      '<div class="card">' +
        '<div class="card__head"><div><div class="card__title">友链列表</div><div class="card__desc">头像是 static/images/friends/ 下的文件，也可以填完整 URL。</div></div>' +
        '<button class="btn" id="add-friend" type="button">+ 添加</button></div>' +
        '<div class="table-wrap"><table><thead><tr><th>名称</th><th>地址</th><th>描述</th><th>头像</th><th>标签</th><th></th></tr></thead><tbody id="friend-rows">' + rows() + '</tbody></table></div>' +
      '</div>' +
      '<div class="row"><button class="btn btn--primary" id="save-friends" type="button">保存友链</button></div>';

    container.querySelector('#friend-rows').addEventListener('input', function (event) {
      var row = event.target.closest('[data-friend]');
      var key = event.target.getAttribute('data-key');
      if (!row || !key) return;
      var friend = friends[Number(row.getAttribute('data-friend'))];
      if (key === 'tags') friend.tags = event.target.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
      else friend[key] = event.target.value;
    });

    container.querySelector('#friend-rows').addEventListener('click', function (event) {
      var index = event.target.getAttribute && event.target.getAttribute('data-drop');
      if (index === null) return;
      friends.splice(Number(index), 1);
      container.querySelector('#friend-rows').innerHTML = rows();
    });

    container.querySelector('#add-friend').addEventListener('click', function () {
      friends.push({ name: '新友链', url: 'https://', description: '', avatar: '', tags: [] });
      container.querySelector('#friend-rows').innerHTML = rows();
    });

    container.querySelector('#save-friends').addEventListener('click', async function () {
      var button = this;
      button.disabled = true;
      button.textContent = '提交中…';
      try {
        data.friends = friends.filter(function (friend) { return friend.name && friend.url; });
        await A.commit([{ path: 'data/friends.json', content: JSON.stringify(data, null, 2) + '\n' }], 'admin: 更新友链');
        A.toast('友链已保存', 'ok');
      } catch (err) {
        A.toast(err.message, 'err');
      } finally {
        button.disabled = false;
        button.textContent = '保存友链';
      }
    });
  };

  // ------------------------------------------------------------------- about

  A.views.about = async function (container) {
    A.setHeader('关于页', 'content/about.md · 只改正文，front matter 原样保留');
    var raw = await A.readFile('content/about.md');
    if (!raw) throw new Error('读不到 content/about.md');

    var match = raw.match(/^(\+\+\+[\s\S]*?\+\+\+\r?\n?)/);
    var head = match ? match[1] : '';
    var body = match ? raw.slice(head.length).replace(/^\n+/, '') : raw;

    container.innerHTML =
      '<div class="editor-grid">' +
        '<div class="card">' +
          '<div class="card__title">正文</div><div class="card__desc">Markdown，保存后直接替换 content/about.md 的正文部分。</div>' +
          '<textarea class="editor-body" id="about-body" spellcheck="false">' + esc(body) + '</textarea>' +
          '<div class="row" style="margin-top:12px"><button class="btn btn--primary" id="save-about" type="button">保存关于页</button></div>' +
        '</div>' +
        '<div class="editor-pane">' +
          '<span class="editor-pane__label">实时预览</span>' +
          '<div class="preview" id="about-preview"></div>' +
        '</div>' +
      '</div>';

    var bodyEl = container.querySelector('#about-body');
    var previewEl = container.querySelector('#about-preview');
    function update() { previewEl.innerHTML = window.marked.parse(bodyEl.value || ''); }
    bodyEl.addEventListener('input', update);
    update();

    container.querySelector('#save-about').addEventListener('click', async function () {
      var button = this;
      button.disabled = true;
      button.textContent = '提交中…';
      try {
        var next = head + '\n' + bodyEl.value.trim() + '\n';
        await A.commit([{ path: 'content/about.md', content: next }], 'admin: 更新关于页');
        A.toast('关于页已保存', 'ok');
      } catch (err) {
        A.toast(err.message, 'err');
      } finally {
        button.disabled = false;
        button.textContent = '保存关于页';
      }
    });
  };
})();
