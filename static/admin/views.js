/**
 * Admin views — posts, categories, site settings.
 * Depends on the A.* helpers defined in admin.js.
 */
(function () {
  'use strict';

  var A = window.A;
  var esc = A.esc;
  var state = A.state;

  // ---------------------------------------------------------------- helpers

  function catOptions(selected) {
    return state.cats.map(function (cat) {
      return '<option value="' + esc(cat.label) + '"' + (cat.label === selected ? ' selected' : '') + '>' + esc(cat.label) + '</option>';
    }).join('');
  }

  function chipList(items) {
    return items.map(function (item) { return '<span class="chip">#' + esc(item) + '</span>'; }).join(' ');
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result).split(',')[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /** Downscale photos in the browser so a 6 MB phone shot becomes ~200 KB. */
  async function prepareImage(file) {
    if (file.type === 'image/gif') {
      return { base64: await fileToBase64(file), ext: 'gif', size: file.size };
    }
    var bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (err) {
      return { base64: await fileToBase64(file), ext: (file.name.split('.').pop() || 'png').toLowerCase(), size: file.size };
    }
    var max = 1600;
    var scale = Math.min(1, max / bitmap.width);
    var width = Math.round(bitmap.width * scale);
    var height = Math.round(bitmap.height * scale);
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/webp', 0.86); });
    if (!blob) return { base64: await fileToBase64(file), ext: 'png', size: file.size };
    var base64 = await new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result).split(',')[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { base64: base64, ext: 'webp', size: blob.size, width: width, height: height };
  }

  function dateInputValue(value) {
    if (!value) return '';
    var text = String(value);
    var match = text.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    if (match) return match[1] + 'T' + match[2];
    return text.slice(0, 16);
  }

  function dateForHugo(value) {
    if (!value) return A.localStamp();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
      var now = new Date();
      var offset = -now.getTimezoneOffset();
      var sign = offset >= 0 ? '+' : '-';
      var pad = function (n) { return String(n).padStart(2, '0'); };
      return value + ':00' + sign + pad(Math.floor(Math.abs(offset) / 60)) + ':' + pad(Math.abs(offset) % 60);
    }
    return value;
  }

  function formatBytes(size) {
    if (!size) return '';
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(0) + ' KB';
    return (size / 1024 / 1024).toFixed(1) + ' MB';
  }

  // ------------------------------------------------------------------ posts

  A.views.posts = async function (container, rest) {
    if (rest[0] === 'new') return postEditor(container, null);
    if (rest[0] === 'edit' && rest[1]) {
      var found = state.posts.filter(function (post) { return post.slug === rest[1]; })[0];
      if (!found) throw new Error('找不到这篇文章，可能刚被删掉了。');
      return postEditor(container, found);
    }

    A.setHeader('文章', '共 ' + state.posts.length + ' 篇 · 按发布时间倒序');

    container.innerHTML =
      '<div class="row row--between" style="margin-bottom:14px">' +
        '<input class="input" id="post-filter" placeholder="按标题、分类、标签筛选…" style="max-width:320px">' +
        '<a class="btn btn--primary" href="#/posts/new">+ 新建文章</a>' +
      '</div>' +
      '<div class="table-wrap">' +
        '<table><thead><tr><th>标题</th><th>日期</th><th>分类</th><th>标签</th><th>状态</th><th></th></tr></thead>' +
        '<tbody id="post-rows"></tbody></table>' +
      '</div>';

    function renderRows(keyword) {
      var q = String(keyword || '').toLowerCase();
      var posts = state.posts.filter(function (post) {
        if (!q) return true;
        return (post.title + ' ' + post.categories.join(' ') + ' ' + post.tags.join(' ')).toLowerCase().indexOf(q) !== -1;
      });
      var body = container.querySelector('#post-rows');
      if (!posts.length) {
        body.innerHTML = '<tr><td colspan="6"><div class="empty">没有匹配的文章</div></td></tr>';
        return;
      }
      body.innerHTML = posts.map(function (post) {
        return '<tr>' +
          '<td><a href="#/posts/edit/' + esc(post.slug) + '"><strong>' + esc(post.title) + '</strong></a>' +
            '<div class="small muted mono">' + esc(post.slug) + '</div></td>' +
          '<td class="num">' + esc(A.formatDate(post.date) || '—') + '</td>' +
          '<td>' + (post.categories.length ? '<span class="chip chip--accent">' + esc(post.categories[0]) + '</span>' : '<span class="muted small">未分类</span>') + '</td>' +
          '<td class="small muted">' + (post.tags.length ? esc(post.tags.slice(0, 3).join(' · ')) : '—') + '</td>' +
          '<td>' + (post.draft ? '<span class="chip chip--warn">草稿</span>' : '<span class="chip chip--ok">已发布</span>') + '</td>' +
          '<td class="nowrap">' +
            '<a class="btn btn--sm btn--ghost" href="' + esc(A.postUrl(post)) + '" target="_blank" rel="noopener">查看</a> ' +
            '<button class="btn btn--sm btn--danger" data-del="' + esc(post.slug) + '" type="button">删除</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    renderRows('');
    container.querySelector('#post-filter').addEventListener('input', function (event) {
      renderRows(event.target.value);
    });
    container.querySelector('#post-rows').addEventListener('click', async function (event) {
      var slug = event.target.getAttribute && event.target.getAttribute('data-del');
      if (!slug) return;
      var post = state.posts.filter(function (item) { return item.slug === slug; })[0];
      var ok = await A.confirm({
        title: '删除《' + post.title + '》？',
        desc: '会删除 content/posts/' + slug + '/ 下的正文和图片，提交后不可撤销。',
        ok: '删除',
        danger: true,
      });
      if (!ok) return;
      try {
        await A.deletePost(post);
        A.toast('已删除，Pages 正在重建', 'ok');
        A.route();
      } catch (err) {
        A.toast(err.message, 'err');
      }
    });
  };

  // ------------------------------------------------------------ post editor

  async function postEditor(container, post) {
    var isNew = !post;
    A.setHeader(isNew ? '新建文章' : '编辑文章', isNew ? '保存后自动提交到仓库' : post.path);

    var draft = {
      title: post ? post.title : '',
      slug: post ? post.slug : '',
      date: post ? dateInputValue(post.date) : dateInputValue(A.localStamp()),
      category: post && post.categories.length ? post.categories[0] : (state.cats[0] ? state.cats[0].label : ''),
      tags: post ? post.tags.slice() : [],
      summary: post ? post.summary : '',
      body: post ? post.body.replace(/^\n+/, '') : '',
      draft: post ? post.draft : false,
      coverPath: post ? post.featuredImage : '',
      sourceUrl: post ? post.sourceUrl : '',
    };
    var pending = {};      // repo path -> { base64, size }
    var previewUrls = {};  // repo path -> data URL
    var existingImages = post ? A.listTree('content/posts/' + post.slug + '/images/').map(function (path) {
      return path.split('/').pop();
    }) : [];

    container.innerHTML =
      '<div class="editor-head">' +
        '<div class="editor-head__meta">' +
          '<span class="chip">' + (isNew ? '新建' : esc(post.slug)) + '</span>' +
          '<span class="chip" id="word-count">0 字</span>' +
        '</div>' +
        '<div class="row">' +
          '<a class="btn btn--ghost" href="#/posts">返回列表</a>' +
          (isNew ? '' : '<a class="btn btn--ghost" href="' + esc(A.postUrl(post)) + '" target="_blank" rel="noopener">查看线上</a>') +
          '<button class="btn btn--primary" id="save-post" type="button">保存并发布</button>' +
        '</div>' +
      '</div>' +

      '<div class="editor-grid">' +
        '<div>' +
          '<div class="card">' +
            '<div class="grid-2">' +
              '<label class="field"><span class="field__label">标题</span><input class="input" id="f-title" value="' + esc(draft.title) + '" placeholder="文章标题"></label>' +
              '<label class="field"><span class="field__label">Slug（URL 路径）</span><input class="input input--mono" id="f-slug" value="' + esc(draft.slug) + '" placeholder="my-post-slug"></label>' +
            '</div>' +
            '<div class="grid-3">' +
              '<label class="field"><span class="field__label">发布时间</span><input class="input" id="f-date" type="datetime-local" value="' + esc(draft.date) + '"></label>' +
              '<label class="field"><span class="field__label">分类</span><select class="select" id="f-cat">' + catOptions(draft.category) + '</select></label>' +
              '<label class="field"><span class="field__label">状态</span><select class="select" id="f-draft"><option value="0"' + (!draft.draft ? ' selected' : '') + '>已发布</option><option value="1"' + (draft.draft ? ' selected' : '') + '>草稿</option></select></label>' +
            '</div>' +
            '<label class="field"><span class="field__label">摘要</span><textarea class="textarea" id="f-summary" rows="2" placeholder="一两句话，列表页和搜索结果里会显示">' + esc(draft.summary) + '</textarea></label>' +
            '<div class="field"><span class="field__label">标签</span><div class="tag-input" id="tag-box"><input id="tag-input" placeholder="输入后回车添加"></div></div>' +
            '<label class="field"><span class="field__label">原文链接（可选）</span><input class="input" id="f-source" value="' + esc(draft.sourceUrl) + '" placeholder="https://…"></label>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card__head"><div><div class="card__title">封面图</div><div class="card__desc">显示在文章页标题旁边，建议 16:9，宽度 1200px 以上。</div></div></div>' +
            '<label class="dropzone" id="cover-drop">点击选择封面图，或把图片拖进来<input type="file" id="cover-file" accept="image/*"></label>' +
            '<div id="cover-preview" class="thumb" hidden><img alt="封面预览"><span class="small muted" id="cover-meta"></span><button class="btn btn--sm btn--ghost" id="cover-remove" type="button">移除</button></div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="row row--between" style="margin-bottom:10px">' +
              '<div><div class="card__title">正文</div><div class="card__desc">Markdown，原样提交，不会被改写。</div></div>' +
              '<label class="btn btn--sm" for="body-image">插入图片</label>' +
              '<input type="file" id="body-image" accept="image/*" hidden>' +
            '</div>' +
            '<textarea class="editor-body" id="f-body" spellcheck="false" placeholder="在这里写正文，支持 Markdown…">' + esc(draft.body) + '</textarea>' +
          '</div>' +
        '</div>' +

        '<div class="editor-pane">' +
          '<div class="row row--between"><span class="editor-pane__label">实时预览</span><span class="small muted" id="preview-note"></span></div>' +
          '<div class="preview" id="preview"></div>' +
        '</div>' +
      '</div>';

    var titleEl = container.querySelector('#f-title');
    var slugEl = container.querySelector('#f-slug');
    var dateEl = container.querySelector('#f-date');
    var catEl = container.querySelector('#f-cat');
    var draftEl = container.querySelector('#f-draft');
    var summaryEl = container.querySelector('#f-summary');
    var sourceEl = container.querySelector('#f-source');
    var bodyEl = container.querySelector('#f-body');
    var tagBox = container.querySelector('#tag-box');
    var tagInput = container.querySelector('#tag-input');
    var previewEl = container.querySelector('#preview');
    var wordEl = container.querySelector('#word-count');

    function renderTags() {
      var chips = draft.tags.map(function (tag, index) {
        return '<span class="tag-input__chip">#' + esc(tag) + '<button type="button" data-tag="' + index + '" aria-label="移除 ' + esc(tag) + '">×</button></span>';
      }).join('');
      tagBox.innerHTML = chips + '<input id="tag-input" placeholder="输入后回车添加">';
      tagBox.querySelector('input').addEventListener('keydown', onTagKey);
      tagBox.querySelector('input').addEventListener('blur', commitTag);
    }

    function onTagKey(event) {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        commitTag();
      }
      if (event.key === 'Backspace' && !event.target.value && draft.tags.length) {
        draft.tags.pop();
        renderTags();
      }
    }

    function commitTag() {
      var input = tagBox.querySelector('input');
      var value = (input.value || '').trim().replace(/^#/, '');
      if (value && draft.tags.indexOf(value) === -1) {
        draft.tags.push(value);
        renderTags();
        tagBox.querySelector('input').focus();
      } else if (input.value) {
        input.value = '';
      }
      updatePreview();
    }

    tagBox.addEventListener('click', function (event) {
      var index = event.target.getAttribute && event.target.getAttribute('data-tag');
      if (index === null) return;
      draft.tags.splice(Number(index), 1);
      renderTags();
      updatePreview();
    });

    function imageMarkdown(path) {
      return '![图片](images/' + path + ')\n';
    }

    async function addImage(file, asCover) {
      if (!file) return;
      var prepared = await prepareImage(file);
      var base = A.slugify((file.name || 'image').replace(/\.[^.]+$/, '')) || 'image';
      var name;
      if (asCover) {
        name = 'cover.' + prepared.ext;
      } else {
        var index = existingImages.length + Object.keys(pending).filter(function (key) { return key.indexOf('/images/') !== -1; }).length + 1;
        name = String(index).padStart(2, '0') + '-' + base + '.' + prepared.ext;
      }
      var path = 'content/posts/' + (draft.slug || '<slug>') + '/images/' + name;
      pending[path] = prepared;
      previewUrls[path] = 'data:image/' + (prepared.ext === 'jpg' ? 'jpeg' : prepared.ext) + ';base64,' + prepared.base64;

      if (asCover) {
        draft.coverPath = 'images/' + name;
        renderCover();
      } else {
        var insertion = imageMarkdown(name);
        var start = bodyEl.selectionStart || bodyEl.value.length;
        bodyEl.value = bodyEl.value.slice(0, start) + insertion + bodyEl.value.slice(start);
        bodyEl.focus();
      }
      updatePreview();
    }

    function renderCover() {
      var box = container.querySelector('#cover-preview');
      if (!draft.coverPath) { box.hidden = true; return; }
      var name = draft.coverPath.split('/').pop();
      var repoPath = 'content/posts/' + (post ? post.slug : draft.slug) + '/images/' + name;
      var src = previewUrls[repoPath] || (A.SITE_URL + 'posts/' + (post ? post.slug : draft.slug) + '/images/' + name);
      box.hidden = false;
      box.querySelector('img').src = src;
      var meta = pending[repoPath] ? formatBytes(pending[repoPath].size) + ' · 待上传' : '已发布';
      container.querySelector('#cover-meta').textContent = meta;
    }

    function updatePreview() {
      var body = bodyEl.value;
      var slug = post ? post.slug : draft.slug;
      var html = window.marked.parse(body, { gfm: true, breaks: false });
      // Point relative image paths at either the pending data URL or the live site.
      html = html.replace(/(<img[^>]+src=")images\/([^"]+)(")/g, function (all, before, name, after) {
        var repoPath = 'content/posts/' + slug + '/images/' + name;
        var src = previewUrls[repoPath] || (A.SITE_URL + 'posts/' + slug + '/images/' + name);
        return before + src + after;
      });
      previewEl.innerHTML = html;
      var chars = body.replace(/\s/g, '').length;
      wordEl.textContent = chars + ' 字 · 约 ' + Math.max(1, Math.round(chars / 400)) + ' 分钟';
      var note = [];
      if (draft.coverPath) note.push('有封面');
      var pendingCount = Object.keys(pending).length;
      if (pendingCount) note.push(pendingCount + ' 张图待上传');
      container.querySelector('#preview-note').textContent = note.join(' · ');
    }

    // events
    titleEl.addEventListener('input', function () {
      if (!slugEl.dataset.touched) {
        var auto = A.slugify(titleEl.value);
        if (auto) slugEl.value = auto;
      }
      updatePreview();
    });
    slugEl.addEventListener('input', function () {
      slugEl.dataset.touched = '1';
      slugEl.value = A.slugify(slugEl.value);
    });
    bodyEl.addEventListener('input', updatePreview);
    summaryEl.addEventListener('input', updatePreview);
    catEl.addEventListener('change', updatePreview);

    container.querySelector('#cover-file').addEventListener('change', function (event) {
      addImage(event.target.files[0], true);
      event.target.value = '';
    });
    container.querySelector('#body-image').addEventListener('change', function (event) {
      addImage(event.target.files[0], false);
      event.target.value = '';
    });
    container.querySelector('#cover-remove').addEventListener('click', function () {
      draft.coverPath = '';
      renderCover();
      updatePreview();
    });

    ['#cover-drop'].forEach(function (selector) {
      var zone = container.querySelector(selector);
      zone.addEventListener('dragover', function (event) { event.preventDefault(); zone.classList.add('is-over'); });
      zone.addEventListener('dragleave', function () { zone.classList.remove('is-over'); });
      zone.addEventListener('drop', function (event) {
        event.preventDefault();
        zone.classList.remove('is-over');
        if (event.dataTransfer.files[0]) addImage(event.dataTransfer.files[0], true);
      });
    });

    renderTags();
    renderCover();
    updatePreview();

    container.querySelector('#save-post').addEventListener('click', async function () {
      var button = this;
      var slug = A.slugify(slugEl.value || titleEl.value);
      if (!titleEl.value.trim()) { A.toast('标题不能为空', 'err'); titleEl.focus(); return; }
      if (!slug) { A.toast('Slug 只能是英文、数字和连字符', 'err'); slugEl.focus(); return; }
      if (!catEl.value) { A.toast('先去分类页建一个分类', 'err'); return; }

      var clash = state.posts.filter(function (item) { return item.slug === slug && (!post || item.slug !== post.slug); });
      if (clash.length) { A.toast('Slug 已被《' + clash[0].title + '》占用', 'err'); return; }

      var fm = {
        title: titleEl.value.trim(),
        date: dateForHugo(dateEl.value),
        draft: draftEl.value === '1',
        categories: [catEl.value],
        tags: draft.tags,
        summary: summaryEl.value.trim(),
        slug: slug,
      };
      if (draft.coverPath) fm.featuredImage = draft.coverPath;
      if (sourceEl.value.trim()) fm.sourceUrl = sourceEl.value.trim();

      var markdown = A.dumpFrontMatter(fm) + bodyEl.value.replace(/^\n+/, '') + '\n';
      var changes = [{ path: 'content/posts/' + slug + '/index.md', content: markdown }];

      // Renaming the slug moves the whole bundle: drop the old files in the same commit.
      if (post && post.slug !== slug) {
        A.listTree('content/posts/' + post.slug + '/').forEach(function (path) {
          changes.push({ path: path, content: null });
        });
      }

      Object.keys(pending).forEach(function (path) {
        var finalPath = path.replace('/<slug>/', '/' + slug + '/');
        changes.push({ path: finalPath, content: pending[path].base64, encoding: 'base64' });
      });

      button.disabled = true;
      button.textContent = '提交中…';
      try {
        await A.commit(changes, (post ? 'post: 更新《' : 'post: 新增《') + fm.title + '》');
        A.toast('已提交，站点正在重新构建', 'ok');
        location.hash = '#/posts';
      } catch (err) {
        A.toast(err.message, 'err');
      } finally {
        button.disabled = false;
        button.textContent = '保存并发布';
      }
    });
  }

  // -------------------------------------------------------------- categories

  A.views.categories = async function (container) {
    A.setHeader('分类', '改完保存会同步 data/categories.yaml 与 content/categories/*.md');
    var list = state.cats.map(function (cat) { return Object.assign({}, cat); });

    function countFor(label) {
      return state.posts.filter(function (post) { return post.categories.indexOf(label) !== -1; }).length;
    }

    function render() {
      var rows = list.map(function (cat, index) {
        return '<tr data-row="' + index + '">' +
          '<td><input class="input input--mono" data-key="slug" value="' + esc(cat.slug) + '" style="min-width:110px"></td>' +
          '<td><input class="input" data-key="label" value="' + esc(cat.label) + '" style="min-width:110px"></td>' +
          '<td><input class="input input--mono" data-key="icon" value="' + esc(cat.icon || 'folder') + '" list="icon-list" style="min-width:110px"></td>' +
          '<td><input class="input input--mono" data-key="accent" value="' + esc(cat.accent || 'cyan') + '" list="accent-list" style="min-width:90px"></td>' +
          '<td><input class="input" data-key="description" value="' + esc(cat.description || '') + '" style="min-width:200px"></td>' +
          '<td class="num">' + countFor(cat.label) + '</td>' +
          '<td class="nowrap">' +
            '<button class="btn btn--sm btn--ghost" data-move="-1" type="button">↑</button>' +
            '<button class="btn btn--sm btn--ghost" data-move="1" type="button">↓</button>' +
            '<button class="btn btn--sm btn--danger" data-drop="' + index + '" type="button">删除</button>' +
          '</td>' +
        '</tr>';
      }).join('');

      container.innerHTML =
        '<div class="card">' +
          '<div class="card__head"><div><div class="card__title">分类列表</div><div class="card__desc">顺序决定导航与筛选里的排列。删除前会检查是否还有文章在用。</div></div>' +
          '<div class="row"><button class="btn" id="add-cat" type="button">+ 添加分类</button><button class="btn btn--primary" id="save-cats" type="button">保存分类</button></div></div>' +
          '<div class="table-wrap"><table><thead><tr><th>Slug</th><th>名称</th><th>图标</th><th>配色</th><th>描述</th><th>文章</th><th></th></tr></thead><tbody id="cat-rows">' + rows + '</tbody></table></div>' +
          '<datalist id="icon-list"><option value="collection"><option value="article"><option value="repository"><option value="star"><option value="folder"><option value="code"><option value="link"><option value="terminal"></datalist>' +
          '<datalist id="accent-list"><option value="cyan"><option value="emerald"><option value="purple"><option value="amber"><option value="rose"></datalist>' +
          '<p class="field__hint" style="margin-top:10px">Slug 会变成 /categories/&lt;slug&gt;/，改名等于换链接，谨慎修改。</p>' +
        '</div>';

      container.querySelector('#cat-rows').addEventListener('input', function (event) {
        var row = event.target.closest('[data-row]');
        if (!row) return;
        var key = event.target.getAttribute('data-key');
        if (!key) return;
        list[Number(row.getAttribute('data-row'))][key] = event.target.value;
      });

      container.querySelector('#cat-rows').addEventListener('click', function (event) {
        var row = event.target.closest('[data-row]');
        if (!row) return;
        var index = Number(row.getAttribute('data-row'));
        if (event.target.hasAttribute('data-move')) {
          var delta = Number(event.target.getAttribute('data-move'));
          var target = index + delta;
          if (target < 0 || target >= list.length) return;
          var moved = list.splice(index, 1)[0];
          list.splice(target, 0, moved);
          render();
        }
        if (event.target.hasAttribute('data-drop')) {
          var cat = list[index];
          var used = countFor(cat.label);
          if (used) { A.toast('「' + cat.label + '」下还有 ' + used + ' 篇文章，先移走再删分类', 'err'); return; }
          A.confirm({ title: '删除分类「' + cat.label + '」？', desc: '会同时删除 content/categories/' + cat.slug + '.md', ok: '删除', danger: true }).then(function (ok) {
            if (!ok) return;
            list.splice(index, 1);
            render();
          });
        }
      });

      container.querySelector('#add-cat').addEventListener('click', function () {
        list.push({ slug: 'new-cat-' + (list.length + 1), label: '新分类', icon: 'folder', accent: 'cyan', description: '' });
        render();
      });

      container.querySelector('#save-cats').addEventListener('click', async function () {
        var slugs = {};
        for (var i = 0; i < list.length; i += 1) {
          var cat = list[i];
          if (!/^[a-z0-9-]+$/.test(cat.slug)) { A.toast('Slug 只能用小写字母、数字和连字符：' + cat.slug, 'err'); return; }
          if (!cat.label) { A.toast('分类名称不能为空', 'err'); return; }
          if (slugs[cat.slug]) { A.toast('Slug 重复：' + cat.slug, 'err'); return; }
          slugs[cat.slug] = true;
        }

        var button = this;
        button.disabled = true;
        button.textContent = '提交中…';
        try {
          var changes = [{
            path: 'data/categories.yaml',
            content: jsyaml.dump(list.map(function (cat) {
              return { slug: cat.slug, label: cat.label, icon: cat.icon || 'folder', accent: cat.accent || 'cyan', description: cat.description || '' };
            }), { lineWidth: 130 }),
          }];

          list.forEach(function (cat) {
            changes.push({
              path: 'content/categories/' + cat.slug + '.md',
              content: '---\ntitle: "' + cat.label.replace(/"/g, '\\"') + '"\nslug: "' + cat.slug + '"\ncategory: "' + cat.label.replace(/"/g, '\\"') + '"\ndescription: "' + String(cat.description || '').replace(/"/g, '\\"') + '"\n---\n',
            });
          });

          // Remove category pages that no longer exist.
          A.listTree('content/categories/', '.md').forEach(function (path) {
            if (path.indexOf('_index') !== -1) return;
            var slug = path.split('/').pop().replace(/\.md$/, '');
            if (!slugs[slug]) changes.push({ path: path, content: null });
          });

          await A.commit(changes, 'admin: 更新分类配置');
          A.toast('分类已保存', 'ok');
          await A.reload();
          A.views.categories(container);
        } catch (err) {
          A.toast(err.message, 'err');
        } finally {
          button.disabled = false;
          button.textContent = '保存分类';
        }
      });
    }

    render();
  };

  // -------------------------------------------------------------------- site

  function readTomlValue(raw, key) {
    var re = new RegExp('^\\s*' + key + '\\s*=\\s*(.+?)\\s*$', 'm');
    var match = raw.match(re);
    if (!match) return null;
    var value = match[1];
    if (/^".*"$/.test(value)) return value.slice(1, -1);
    if (/^'.*'$/.test(value)) return value.slice(1, -1);
    return value;
  }

  function writeTomlValue(raw, key, value) {
    var re = new RegExp('^(\\s*' + key + '\\s*=\\s*)(.+?)(\\s*)$', 'm');
    return raw.replace(re, function (all, prefix) { return prefix + value; });
  }

  A.views.site = async function (container) {
    A.setHeader('站点设置', 'hugo.toml · 只改这几个字段，其余原样保留');
    var raw = await A.readFile('hugo.toml');
    if (!raw) throw new Error('读不到 hugo.toml');

    var pager = (raw.match(/pagerSize\s*=\s*(\d+)/) || [])[1] || '10';
    var terminal = (raw.match(/enableTerminal\s*=\s*(true|false)/) || [])[1] || 'false';

    container.innerHTML =
      '<div class="card">' +
        '<div class="card__title">基本信息</div><div class="card__desc">显示在浏览器标签、搜索结果和分享卡片里。</div>' +
        '<div class="grid-2">' +
          '<label class="field"><span class="field__label">站点标题</span><input class="input" id="s-title" value="' + esc(readTomlValue(raw, 'title') || '') + '"></label>' +
          '<label class="field"><span class="field__label">站点地址</span><input class="input input--mono" id="s-baseurl" value="' + esc(readTomlValue(raw, 'baseURL') || '') + '"></label>' +
        '</div>' +
        '<label class="field"><span class="field__label">描述</span><textarea class="textarea" id="s-desc" rows="2">' + esc(readTomlValue(raw, 'description') || '') + '</textarea></label>' +
        '<label class="field"><span class="field__label">关键词</span><input class="input" id="s-keywords" value="' + esc(readTomlValue(raw, 'keywords') || '') + '"><span class="field__hint">英文逗号分隔</span></label>' +
        '<div class="grid-2">' +
          '<label class="field"><span class="field__label">每页文章数</span><input class="input" id="s-pager" type="number" min="1" max="50" value="' + esc(pager) + '"></label>' +
          '<label class="field"><span class="field__label">首页伪终端</span><select class="select" id="s-terminal"><option value="false"' + (terminal === 'false' ? ' selected' : '') + '>关闭（当前）</option><option value="true"' + (terminal === 'true' ? ' selected' : '') + '>开启</option></select><span class="field__hint">开启后首页会显示可交互的终端演示。</span></label>' +
        '</div>' +
        '<div class="row"><button class="btn btn--primary" id="save-site" type="button">保存设置</button></div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card__title">导航菜单</div><div class="card__desc">菜单写在 hugo.toml 的 [[menu.main]]，改这里等于改全站导航。</div>' +
        '<div class="table-wrap"><table><thead><tr><th>名称</th><th>链接</th><th>排序</th></tr></thead><tbody id="menu-rows"></tbody></table></div>' +
        '<p class="field__hint" style="margin-top:10px">新增/删除菜单项请直接在仓库里改 hugo.toml，后台只支持调顺序和改名。</p>' +
      '</div>';

    var menuRegex = /\[\[menu\.main\]\][\s\S]*?(?=\n\[\[|\n\[[a-z]|\s*$)/g;
    var menus = [];
    var match;
    while ((match = menuRegex.exec(raw)) !== null) {
      var block = match[0];
      menus.push({
        name: (block.match(/name\s*=\s*"([^"]*)"/) || [])[1] || '',
        url: (block.match(/url\s*=\s*"([^"]*)"/) || [])[1] || '',
        weight: (block.match(/weight\s*=\s*(\d+)/) || [])[1] || '0',
      });
    }

    container.querySelector('#menu-rows').innerHTML = menus.map(function (item, index) {
      return '<tr><td><input class="input" data-menu="' + index + '" data-key="name" value="' + esc(item.name) + '"></td>' +
        '<td class="mono small">' + esc(item.url) + '</td>' +
        '<td><input class="input" style="width:80px" type="number" data-menu="' + index + '" data-key="weight" value="' + esc(item.weight) + '"></td></tr>';
    }).join('');

    container.querySelector('#menu-rows').addEventListener('input', function (event) {
      var index = event.target.getAttribute('data-menu');
      var key = event.target.getAttribute('data-key');
      if (index === null || !key) return;
      menus[Number(index)][key] = event.target.value;
    });

    container.querySelector('#save-site').addEventListener('click', async function () {
      var button = this;
      button.disabled = true;
      button.textContent = '提交中…';
      try {
        var next = raw;
        next = writeTomlValue(next, 'title', '"' + container.querySelector('#s-title').value.replace(/"/g, '\\"') + '"');
        next = writeTomlValue(next, 'baseURL', '"' + container.querySelector('#s-baseurl').value.trim() + '"');
        next = writeTomlValue(next, 'description', '"' + container.querySelector('#s-desc').value.replace(/"/g, '\\"') + '"');
        next = writeTomlValue(next, 'keywords', '"' + container.querySelector('#s-keywords').value.replace(/"/g, '\\"') + '"');
        next = next.replace(/pagerSize\s*=\s*\d+/, 'pagerSize = ' + (Number(container.querySelector('#s-pager').value) || 10));
        next = next.replace(/enableTerminal\s*=\s*(true|false)/, 'enableTerminal = ' + container.querySelector('#s-terminal').value);

        // Rewrite menu names/weights in place, block by block.
        var cursor = 0;
        menus.forEach(function (item) {
          var start = next.indexOf('[[menu.main]]', cursor);
          if (start === -1) return;
          var end = next.indexOf('[[menu.main]]', start + 1);
          var block = next.slice(start, end === -1 ? next.length : end);
          var updated = block
            .replace(/name\s*=\s*"[^"]*"/, 'name = "' + String(item.name).replace(/"/g, '\\"') + '"')
            .replace(/weight\s*=\s*\d+/, 'weight = ' + (Number(item.weight) || 0));
          next = next.slice(0, start) + updated + (end === -1 ? '' : next.slice(end));
          cursor = start + updated.length;
        });

        await A.commit([{ path: 'hugo.toml', content: next }], 'admin: 更新站点设置');
        A.toast('站点设置已保存', 'ok');
        A.views.site(container);
      } catch (err) {
        A.toast(err.message, 'err');
      } finally {
        button.disabled = false;
        button.textContent = '保存设置';
      }
    });
  };
})();
