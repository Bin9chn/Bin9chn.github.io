/**
 * Admin views — projects (content/projects/*.md with TOML front matter).
 * Projects keep their TOML header, so the editor works on the raw file instead of
 * round-tripping through YAML and risking a format change on every save.
 */
(function () {
  'use strict';

  var A = window.A;
  var esc = A.esc;
  var state = A.state;

  function meta(raw, key) {
    var match = String(raw).match(new RegExp('^\\s*' + key + '\\s*=\\s*"(.*)"\\s*$', 'm'));
    return match ? match[1] : '';
  }

  A.views.projects = async function (container, rest) {
    if (rest[0] === 'new') return editor(container, null);
    if (rest[0] === 'edit' && rest[1]) return editor(container, 'content/projects/' + rest[1]);

    A.setHeader('项目', 'content/projects/*.md · 项目页与首页精选是两套数据');

    var paths = A.listTree('content/projects/', '.md').filter(function (path) {
      return path.indexOf('_index.md') === -1;
    });
    var files = await A.pool(paths, 6, async function (path) {
      var raw = await A.readFile(path);
      return {
        path: path,
        name: path.split('/').pop().replace(/\.md$/, ''),
        title: meta(raw, 'title') || path,
        status: meta(raw, 'status') || '-',
        code: meta(raw, 'code') || '-',
        summary: meta(raw, 'summary') || '',
      };
    });

    container.innerHTML =
      '<div class="row row--between" style="margin-bottom:14px">' +
        '<span class="mono small muted">共 ' + files.length + ' 个项目</span>' +
        '<button class="btn btn--primary" id="new-project" type="button">+ 新建项目</button>' +
      '</div>' +
      '<div class="table-wrap"><table><thead><tr><th>项目</th><th>编号</th><th>状态</th><th>摘要</th><th></th></tr></thead><tbody>' +
      (files.length ? files.map(function (file) {
        return '<tr>' +
          '<td><a href="#/projects/edit/' + esc(file.name) + '"><strong>' + esc(file.title) + '</strong></a>' +
            '<div class="small muted mono">' + esc(file.path) + '</div></td>' +
          '<td class="num">' + esc(file.code) + '</td>' +
          '<td><span class="chip">' + esc(file.status) + '</span></td>' +
          '<td class="small muted">' + esc(file.summary.slice(0, 40)) + '</td>' +
          '<td><a class="btn btn--sm btn--ghost" href="#/projects/edit/' + esc(file.name) + '">编辑</a></td>' +
        '</tr>';
      }).join('') : '<tr><td colspan="5"><div class="empty">还没有项目页</div></td></tr>') +
      '</tbody></table></div>' +
      '<p class="field__hint" style="margin-top:10px">首页「精选项目」是另一份数据，在「首页区块」里改。</p>';

    container.querySelector('#new-project').addEventListener('click', function () {
      location.hash = '#/projects/new';
    });
  };

  async function editor(container, path) {
    var isNew = !path;
    A.setHeader(isNew ? '新建项目' : '编辑项目', path || 'content/projects/<name>.md');

    var raw = isNew ? '' : await A.readFile(path);
    if (!isNew && raw === null) throw new Error('读不到 ' + path);

    if (isNew) {
      raw = [
        '+++',
        'title = "新项目"',
        'date = ' + A.localStamp(),
        'draft = false',
        'weight = 10',
        'code = "P-010"',
        'status = "ACTIVE"',
        'since = "' + new Date().getFullYear() + '"',
        'summary = "一句话说明这个项目做什么。"',
        'repo = "https://github.com/Bin9chn/"',
        'stack = ["Go"]',
        'tags = ["Tooling"]',
        '+++',
        '',
        '正文…',
        '',
      ].join('\n');
    }

    var name = isNew ? '' : path.split('/').pop().replace(/\.md$/, '');

    container.innerHTML =
      '<div class="editor-head">' +
        '<div class="editor-head__meta"><span class="chip">' + (isNew ? '新建' : esc(name)) + '</span></div>' +
        '<div class="row">' +
          '<a class="btn btn--ghost" href="#/projects">返回列表</a>' +
          (isNew ? '' : '<button class="btn btn--danger" id="del-project" type="button">删除</button>') +
          '<button class="btn btn--primary" id="save-project" type="button">保存项目</button>' +
        '</div>' +
      '</div>' +
      (isNew
        ? '<label class="field"><span class="field__label">文件名（英文，不带 .md）</span><input class="input input--mono" id="project-name" placeholder="my-tool"></label>'
        : '') +
      '<div class="editor-grid">' +
        '<div class="card">' +
          '<div class="card__title">文件内容</div>' +
          '<div class="card__desc">front matter 是 TOML（+++），保存时原样写回，注意引号和数组格式。</div>' +
          '<textarea class="editor-body" id="project-body" spellcheck="false">' + esc(raw) + '</textarea>' +
        '</div>' +
        '<div class="editor-pane">' +
          '<span class="editor-pane__label">正文预览</span>' +
          '<div class="preview" id="project-preview"></div>' +
        '</div>' +
      '</div>';

    var bodyEl = container.querySelector('#project-body');
    var previewEl = container.querySelector('#project-preview');

    function bodyOnly(text) {
      var match = String(text).match(/^\+\+\+[\s\S]*?\+\+\+\r?\n?/);
      return match ? text.slice(match[0].length) : text;
    }
    function update() { previewEl.innerHTML = window.marked.parse(bodyOnly(bodyEl.value)); }
    bodyEl.addEventListener('input', update);
    update();

    container.querySelector('#save-project').addEventListener('click', async function () {
      var button = this;
      var target = path;
      if (isNew) {
        var slug = A.slugify(container.querySelector('#project-name').value || meta(bodyEl.value, 'title'));
        if (!slug) { A.toast('文件名只能是英文、数字和连字符', 'err'); return; }
        target = 'content/projects/' + slug + '.md';
        if (A.findBlob(target)) { A.toast('这个文件名已经存在', 'err'); return; }
      }
      button.disabled = true;
      button.textContent = '提交中…';
      try {
        await A.commit([{ path: target, content: bodyEl.value.replace(/\s+$/, '') + '\n' }], (isNew ? 'project: 新增 ' : 'project: 更新 ') + target);
        A.toast('项目已保存', 'ok');
        location.hash = '#/projects';
      } catch (err) {
        A.toast(err.message, 'err');
      } finally {
        button.disabled = false;
        button.textContent = '保存项目';
      }
    });

    var del = container.querySelector('#del-project');
    if (del) {
      del.addEventListener('click', async function () {
        var ok = await A.confirm({ title: '删除这个项目页？', desc: path + ' 会被删除，提交后不可撤销。', ok: '删除', danger: true });
        if (!ok) return;
        try {
          await A.commit([{ path: path, content: null }], 'project: 删除 ' + path);
          A.toast('已删除', 'ok');
          location.hash = '#/projects';
        } catch (err) {
          A.toast(err.message, 'err');
        }
      });
    }
  }
})();
