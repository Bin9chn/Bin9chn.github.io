/**
 * Admin view — 荣誉与成果 (data/honors.yaml).
 *
 * Every group carries a `kind` that decides which fields make sense: a paper needs
 * authors and a venue, a certificate needs an expiry date, an award needs a ranking.
 * The form keeps one shared field set and just relabels/hides the irrelevant ones,
 * so switching a group's kind never throws away what has already been typed.
 */
(function () {
  'use strict';

  var A = window.A;
  var esc = A.esc;

  var KINDS = {
    award: {
      name: '竞赛获奖',
      labels: { title: '奖项名称', tag: '等次', meta: '颁发方', authors: '作者', date: '时间', extra: '补充', note: '说明', link: '相关链接' },
      hints: { title: '2026 安网杯 外泄流量取证', tag: '一等奖', meta: '安网杯组委会', date: '2026-10', note: '队伍规模、赛道、备注' },
      hidden: ['authors', 'extra'],
    },
    paper: {
      name: '论文发表',
      labels: { title: '论文标题', tag: '状态', meta: '期刊 / 会议', authors: '作者', date: '时间', extra: '补充', note: '摘要或说明', link: 'DOI / 链接' },
      hints: { title: '基于 XXX 的 YYY 方法', meta: '计算机学报 2026, 49(8)', authors: 'Bin9chn, 张三, 李四', tag: '已发表 / 已录用 / 预印本', date: '2026-08' },
      hidden: ['extra'],
    },
    cert: {
      name: '行业认证',
      labels: { title: '证书名称', tag: '缩写', meta: '发证机构', authors: '作者', date: '获得时间', extra: '有效期至', note: '说明', link: '查询链接' },
      hints: { title: 'CISP 注册信息安全专业人员', tag: 'CISP', meta: '中国信息安全测评中心', date: '2025-06', extra: '2028-06' },
      hidden: ['authors'],
    },
    other: {
      name: '其他',
      labels: { title: '名称', tag: '标签', meta: '颁发方', authors: '作者', date: '时间', extra: '补充', note: '说明', link: '链接' },
      hints: {},
      hidden: ['authors', 'extra'],
    },
  };

  var FIELD_ORDER = ['title', 'tag', 'meta', 'authors', 'date', 'extra', 'link', 'note'];
  var WIDE = { title: true, link: true, note: true };

  var ACCENTS = ['amber', 'emerald', 'purple', 'cyan'];
  var ICONS = ['star', 'document', 'collection', 'library', 'repository', 'code', 'file'];

  A.views.honors = async function (container) {
    A.setHeader('荣誉与成果', 'data/honors.yaml · 导航「荣誉」页的内容');
    var raw = await A.readFile('data/honors.yaml');
    if (!raw) throw new Error('读不到 data/honors.yaml');

    var data = jsyaml.load(raw) || {};
    data.groups = data.groups || [];
    var seq = 0;

    function kindOf(group) {
      return KINDS[group.kind] ? group.kind : 'award';
    }

    function fieldsFor(group) {
      var kind = KINDS[kindOf(group)];
      return FIELD_ORDER.map(function (key) {
        return {
          key: key,
          label: kind.labels[key] || key,
          hint: (kind.hints || {})[key] || '',
          hidden: kind.hidden.indexOf(key) !== -1,
          wide: !!WIDE[key],
        };
      });
    }

    function itemForm(item, group) {
      return fieldsFor(group).map(function (field) {
        var value = item[field.key] || '';
        var style = field.hidden ? ' style="display:none"' : '';
        var input = field.key === 'note'
          ? '<textarea class="textarea" data-if="note" rows="2" placeholder="' + esc(field.hint) + '">' + esc(value) + '</textarea>'
          : '<input class="input' + (field.key === 'link' ? ' input--mono' : '') + '" data-if="' + field.key + '" value="' + esc(value) + '" placeholder="' + esc(field.hint) + '">';
        return '<label class="field' + (field.wide ? ' field--wide' : '') + '"' + style + '>' +
          '<span class="field__label">' + field.label + '</span>' + input +
        '</label>';
      }).join('');
    }

    function render() {
      seq = 0;
      container.innerHTML =
        '<div class="card">' +
          '<div class="card__title">页面文案</div>' +
          '<div class="card__desc">显示在「荣誉」页顶部的标题和一句介绍。</div>' +
          '<div class="grid-2">' +
            '<label class="field"><span class="field__label">标题</span><input class="input" id="h-title" value="' + esc(data.title || '荣誉与成果') + '"></label>' +
            '<label class="field"><span class="field__label">介绍</span><input class="input" id="h-desc" value="' + esc(data.description || '') + '"></label>' +
          '</div>' +
        '</div>' +

        data.groups.map(function (group, gi) {
          var items = group.items || [];
          var kindKey = kindOf(group);
          var kindOptions = Object.keys(KINDS).map(function (key) {
            return '<option value="' + key + '"' + (key === kindKey ? ' selected' : '') + '>' + KINDS[key].name + '</option>';
          }).join('');

          return '<div class="card" data-group="' + gi + '" data-gid="' + esc(group.id || '') + '">' +
            '<div class="card__head"><div>' +
              '<div class="card__title">' + (group.title ? esc(group.title) : '分组 ' + (gi + 1)) + '</div>' +
              '<div class="card__desc">类型决定条目里显示哪些字段，切换类型不会丢已填的内容。</div>' +
            '</div>' +
            '<button class="btn btn--sm btn--danger" data-drop-group="' + gi + '" type="button">删除分组</button></div>' +
            '<div class="grid-2">' +
              '<label class="field"><span class="field__label">分组名称</span><input class="input" data-gf="title" value="' + esc(group.title || '') + '" placeholder="竞赛获奖"></label>' +
              '<label class="field"><span class="field__label">类型</span><select class="input" data-gf="kind">' + kindOptions + '</select></label>' +
              '<label class="field"><span class="field__label">配色</span><input class="input input--mono" data-gf="accent" value="' + esc(group.accent || 'amber') + '" list="honor-accent"></label>' +
              '<label class="field"><span class="field__label">图标</span><input class="input input--mono" data-gf="icon" value="' + esc(group.icon || 'star') + '" list="honor-icon"></label>' +
            '</div>' +
            '<div class="honor-items">' +
              (items.length ? items.map(function (item) {
                seq += 1;
                var n = seq;
                return '<div class="honor-item" data-item="' + n + '">' +
                  '<div class="row row--between honor-item__head">' +
                    '<span class="mono small muted">条目 ' + n + '</span>' +
                    '<button class="btn btn--sm btn--danger" data-drop-item="' + n + '" type="button">删除</button>' +
                  '</div>' +
                  '<div class="grid-3">' + itemForm(item, group) + '</div>' +
                '</div>';
              }).join('') : '<p class="field__hint">这一组还没有条目。</p>') +
            '</div>' +
            '<button class="btn" data-add-item="' + gi + '" type="button">+ 添加条目</button>' +
          '</div>';
        }).join('') +

        '<div class="row" style="margin-bottom:16px">' +
          '<button class="btn" id="add-group" type="button">+ 添加分组</button>' +
        '</div>' +

        '<div class="row row--between" style="border-top:1px solid var(--border);padding-top:14px">' +
          '<span class="small muted">保存后直接提交到仓库，Pages 约 1 分钟构建完成。</span>' +
          '<button class="btn btn--primary" id="save-honors" type="button">保存并发布</button>' +
        '</div>' +

        '<datalist id="honor-accent">' + ACCENTS.map(function (a) { return '<option value="' + a + '">'; }).join('') + '</datalist>' +
        '<datalist id="honor-icon">' + ICONS.map(function (i) { return '<option value="' + i + '">'; }).join('') + '</datalist>';

      bind();
    }

    // Read the DOM back into `data` so re-rendering after an add/remove keeps edits.
    function harvest() {
      var groups = [];
      container.querySelectorAll('[data-group]').forEach(function (groupEl) {
        var group = {
          id: groupEl.getAttribute('data-gid') || '',
          kind: groupEl.querySelector('[data-gf="kind"]').value,
          title: groupEl.querySelector('[data-gf="title"]').value.trim(),
          accent: groupEl.querySelector('[data-gf="accent"]').value.trim() || 'amber',
          icon: groupEl.querySelector('[data-gf="icon"]').value.trim() || 'star',
          items: [],
        };
        if (!group.id) group.id = 'group-' + (groups.length + 1);
        groupEl.querySelectorAll('[data-item]').forEach(function (itemEl) {
          var item = {};
          FIELD_ORDER.forEach(function (key) {
            var el = itemEl.querySelector('[data-if="' + key + '"]');
            var value = el ? el.value.trim() : '';
            if (value) item[key] = value;
          });
          // Blank rows stay in memory so a freshly added row survives a re-render;
          // they are dropped again when saving.
          group.items.push(item);
        });
        groups.push(group);
      });
      data.groups = groups;
      data.title = container.querySelector('#h-title').value.trim() || '荣誉与成果';
      data.description = container.querySelector('#h-desc').value.trim();
    }

    function bind() {
      container.querySelectorAll('[data-gf="kind"]').forEach(function (select) {
        select.addEventListener('change', function () {
          harvest();
          render();
        });
      });

      container.querySelectorAll('[data-add-item]').forEach(function (button) {
        button.addEventListener('click', function () {
          harvest();
          var gi = Number(button.getAttribute('data-add-item'));
          data.groups[gi].items = data.groups[gi].items || [];
          data.groups[gi].items.push({});
          render();
          var target = container.querySelectorAll('[data-group]')[gi];
          if (target) {
            target.scrollIntoView({ block: 'center' });
            var first = target.querySelector('[data-if="title"]');
            if (first) first.focus();
          }
        });
      });

      container.querySelectorAll('[data-drop-item]').forEach(function (button) {
        button.addEventListener('click', function () {
          harvest();
          var itemEl = button.closest('[data-item]');
          var groupEl = button.closest('[data-group]');
          var gi = Number(groupEl.getAttribute('data-group'));
          var index = Array.prototype.indexOf.call(groupEl.querySelectorAll('[data-item]'), itemEl);
          data.groups[gi].items.splice(index, 1);
          render();
        });
      });

      container.querySelectorAll('[data-drop-group]').forEach(function (button) {
        button.addEventListener('click', function () {
          harvest();
          var gi = Number(button.getAttribute('data-drop-group'));
          if (!window.confirm('删除分组「' + (data.groups[gi].title || '未命名') + '」和它下面的所有条目？')) return;
          data.groups.splice(gi, 1);
          render();
        });
      });

      container.querySelector('#add-group').addEventListener('click', function () {
        harvest();
        data.groups.push({ id: 'group-' + (data.groups.length + 1), kind: 'other', title: '新分组', accent: 'cyan', icon: 'star', items: [] });
        render();
      });

      container.querySelector('#save-honors').addEventListener('click', async function () {
        var button = this;
        harvest();
        data.groups = data.groups.filter(function (group) {
          return (group.title || '').trim();
        });
        data.groups.forEach(function (group) {
          group.items = (group.items || []).filter(function (item) {
            return (item.title || '').trim();
          });
        });
        button.disabled = true;
        button.textContent = '提交中…';
        try {
          // jsyaml.dump drops comments, so keep the field guide at the top of the file.
          var headerMatch = String(raw).match(/^(#[^\n]*\n)+\n?/);
          var yaml = (headerMatch ? headerMatch[0].replace(/\n?$/, '\n\n') : '') +
            jsyaml.dump(data, { lineWidth: 130, noRefs: true });
          await A.commit([{ path: 'data/honors.yaml', content: yaml }], 'admin: 更新荣誉与成果');
          A.toast('已保存，Pages 构建中', 'ok');
        } catch (err) {
          A.toast(err.message, 'err');
        } finally {
          button.disabled = false;
          button.textContent = '保存并发布';
        }
      });
    }

    render();
  };
})();
