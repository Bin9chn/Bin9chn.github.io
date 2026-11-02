/**
 * Admin view — site health check.
 *
 * Read-only scan over everything the admin already loaded from the repo. It exists
 * because most "the site is broken" reports in this project traced back to a file
 * that looked fine in the editor: a future date (Hugo silently skips the post, so
 * the URL 404s), a category label that no longer exists, a cover path pointing at
 * a renamed file. Catching those here is cheaper than debugging a live page.
 */
(function () {
  'use strict';

  var A = window.A;
  var esc = A.esc;
  var state = A.state;

  var LEVELS = {
    error: { label: '错误', cls: 'chip--danger' },
    warn: { label: '注意', cls: 'chip--warn' },
    tip: { label: '建议', cls: 'chip' },
  };

  function parseDate(value) {
    if (!value) return null;
    var date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  function imageTargets(body) {
    var found = [];
    var re = /!\[[^\]]*\]\(([^)\s]+)/g;
    var match;
    while ((match = re.exec(body || '')) !== null) {
      var target = match[1];
      if (/^(https?:)?\/\//.test(target) || target.charAt(0) === '/') continue;
      found.push(target);
    }
    return found;
  }

  A.views.health = async function (container) {
    A.setHeader('站点检查', '只读扫描，不会改动任何文件');

    var now = Date.now();
    var labels = {};
    (state.cats || []).forEach(function (cat) { labels[cat.label] = cat; });

    var issues = [];
    function add(level, post, text, anchor) {
      issues.push({ level: level, post: post, text: text, anchor: anchor || '' });
    }

    state.posts.forEach(function (post) {
      var cats = post.categories || [];

      if (!cats.length) {
        add('error', post, '没有分类，文章页的「返回分类」会缺失');
      } else if (cats.length > 1) {
        add('warn', post, '有 ' + cats.length + ' 个分类，前台只显示第一个');
      }
      cats.forEach(function (label) {
        if (!labels[label]) add('error', post, '分类「' + label + '」不在分类配置里，点进去会 404');
      });

      var date = parseDate(post.date);
      if (!date) {
        add('error', post, '发布日期无法解析：' + (post.date || '空'));
      } else if (date.getTime() > now + 60 * 1000) {
        // Hugo does not build future-dated posts, so this is a silent 404 on the
        // live site — it bit this blog once already.
        add('error', post, '发布日期在未来（' + post.date.replace('T', ' ') + '），Hugo 不会构建它，线上是 404');
      }

      if (!String(post.body || '').trim()) add('error', post, '正文是空的');

      if (post.featuredImage) {
        var cover = 'content/posts/' + post.slug + '/' + String(post.featuredImage).replace(/^\.?\//, '');
        if (!A.findBlob(cover)) add('warn', post, '封面文件不存在：' + post.featuredImage);
      }

      imageTargets(post.body).forEach(function (target) {
        var path = 'content/posts/' + post.slug + '/' + target.replace(/^\.?\//, '');
        if (!A.findBlob(path)) add('warn', post, '正文图片不存在：' + target);
      });

      if (!post.summary) add('tip', post, '没写摘要，列表页会截取正文开头');
      if (!post.tags.length) add('tip', post, '没有标签，相关文章推荐会变少');
    });

    (state.cats || []).forEach(function (cat) {
      var used = state.posts.some(function (post) { return (post.categories || []).indexOf(cat.label) !== -1; });
      if (!used) add('tip', null, '分类「' + cat.label + '」下还没有文章');
    });

    var counts = { error: 0, warn: 0, tip: 0 };
    issues.forEach(function (issue) { counts[issue.level] += 1; });

    var postsWithIssues = {};
    issues.forEach(function (issue) { if (issue.post) postsWithIssues[issue.post.slug] = true; });

    function chip(level) {
      var meta = LEVELS[level];
      return '<span class="chip ' + meta.cls + '">' + meta.label + '</span>';
    }

    var bySlug = {};
    state.posts.forEach(function (post) { bySlug[post.slug] = post; });

    var groups = Object.keys(postsWithIssues).map(function (slug) {
      var post = bySlug[slug];
      var own = issues.filter(function (issue) { return issue.post && issue.post.slug === slug; });
      own.sort(function (a, b) { return ['error', 'warn', 'tip'].indexOf(a.level) - ['error', 'warn', 'tip'].indexOf(b.level); });
      return (
        '<div class="card" style="margin-bottom:10px">' +
          '<div class="row row--between" style="gap:12px">' +
            '<div style="min-width:0">' +
              '<a href="#/posts/edit/' + esc(post.slug) + '"><strong>' + esc(post.title) + '</strong></a>' +
              '<div class="small muted mono">' + esc(post.slug) + '</div>' +
            '</div>' +
            '<a class="btn btn--sm btn--ghost" href="#/posts/edit/' + esc(post.slug) + '">打开</a>' +
          '</div>' +
          '<ul class="check-list">' +
            own.map(function (issue) {
              return '<li>' + chip(issue.level) + '<span>' + esc(issue.text) + '</span></li>';
            }).join('') +
          '</ul>' +
        '</div>'
      );
    }).join('');

    var siteIssues = issues.filter(function (issue) { return !issue.post; });

    container.innerHTML =
      '<div class="row" style="gap:10px;margin-bottom:16px;flex-wrap:wrap">' +
        '<span class="chip ' + (counts.error ? 'chip--danger' : 'chip--ok') + '">' + counts.error + ' 个错误</span>' +
        '<span class="chip ' + (counts.warn ? 'chip--warn' : 'chip--ok') + '">' + counts.warn + ' 个注意</span>' +
        '<span class="chip">' + counts.tip + ' 条建议</span>' +
        '<button class="btn btn--sm" id="health-refresh" type="button">重新扫描</button>' +
      '</div>' +
      (counts.error || counts.warn
        ? ''
        : '<div class="card" style="margin-bottom:14px"><div class="row" style="gap:10px;align-items:center"><span class="chip chip--ok">一切正常</span><span class="small muted">没有会导致页面出错的问题。</span></div></div>') +
      '<div class="small muted" style="margin-bottom:10px">' +
        '扫描了 ' + state.posts.length + ' 篇文章、' + (state.cats || []).length + ' 个分类。' +
        '规则：未来日期会让文章不构建；分类不在配置里会让文章页分类链接 404；封面和正文图片按文件名核对。' +
      '</div>' +
      groups +
      (siteIssues.length
        ? '<div class="card"><div class="card__title" style="margin-bottom:8px">站点级</div><ul class="check-list">' +
          siteIssues.map(function (issue) { return '<li>' + chip(issue.level) + '<span>' + esc(issue.text) + '</span></li>'; }).join('') +
          '</ul></div>'
        : '');

    container.querySelector('#health-refresh').addEventListener('click', async function () {
      var button = this;
      button.disabled = true;
      button.textContent = '扫描中…';
      try {
        await A.reload();
        A.views.health(container);
      } catch (err) {
        A.toast(err.message, 'err');
        button.disabled = false;
        button.textContent = '重新扫描';
      }
    });
  };
})();
