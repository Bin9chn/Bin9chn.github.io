/**
 * Client-side search for /search/.
 *
 * Every post is rendered server-side with a lowercased haystack in data-text,
 * so filtering needs no request and the page still lists everything without JS.
 * Tokens are ANDed; matching is plain substring, which is what works for CJK.
 */
(function () {
  'use strict';

  var page = document.getElementById('search-page');
  if (!page) return;

  var input = document.getElementById('search-input');
  var clear = document.getElementById('search-clear');
  var countEl = document.getElementById('search-count');
  var emptyEl = document.getElementById('search-empty');
  var filters = Array.prototype.slice.call(document.querySelectorAll('.nerdy-search-filter'));
  var items = Array.prototype.slice.call(page.querySelectorAll('.nerdy-search-item')).map(function (el) {
    return {
      el: el,
      cat: el.dataset.cat || '',
      text: el.dataset.text || '',
      titleEl: el.querySelector('.nerdy-search-title'),
      summaryEl: el.querySelector('.nerdy-search-summary'),
      snippet: el.dataset.snippet || '',
      title: (el.querySelector('.nerdy-search-title') || {}).textContent || '',
      summary: (el.querySelector('.nerdy-search-summary') || {}).textContent || '',
    };
  });

  var total = items.length;
  var activeCat = '';
  var composing = false;
  var timer = null;

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlight(text, tokens) {
    if (!tokens.length) return esc(text);
    var re = new RegExp('(' + tokens.map(escapeRegExp).join('|') + ')', 'gi');
    return text
      .split(re)
      .map(function (part, index) {
        return index % 2 === 1 ? '<mark>' + esc(part) + '</mark>' : esc(part);
      })
      .join('');
  }

  // Body-only matches would otherwise show a summary that never mentions the query,
  // so cut a window around the first hit instead.
  function snippetAround(text, terms) {
    var lower = text.toLowerCase();
    var at = -1;
    terms.forEach(function (term) {
      var index = lower.indexOf(term);
      if (index !== -1 && (at === -1 || index < at)) at = index;
    });
    if (at === -1) return text;
    var start = Math.max(0, at - 40);
    var end = Math.min(text.length, at + 150);
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  }

  function tokens() {
    return (input.value || '')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  function apply() {
    var terms = tokens();
    var shown = 0;

    items.forEach(function (item) {
      var okCat = !activeCat || item.cat === activeCat;
      var okText =
        !terms.length ||
        terms.every(function (term) {
          return item.text.indexOf(term) !== -1;
        });

      var visible = okCat && okText;
      item.el.hidden = !visible;

      if (visible) {
        shown += 1;
        if (terms.length) {
          item.titleEl.innerHTML = highlight(item.title, terms);
          var head = (item.title + ' ' + item.summary).toLowerCase();
          var inHead = terms.some(function (term) { return head.indexOf(term) !== -1; });
          var summary = inHead || !item.snippet ? item.summary : snippetAround(item.snippet, terms);
          item.summaryEl.innerHTML = highlight(summary, terms);
        } else {
          item.titleEl.textContent = item.title;
          item.summaryEl.textContent = item.summary;
        }
      }
    });

    var active = terms.length > 0 || activeCat !== '';
    countEl.textContent = active ? '找到 ' + shown + ' 篇' : '共 ' + total + ' 篇';
    emptyEl.hidden = shown !== 0;
    clear.hidden = !active;

    var params = new URLSearchParams();
    if (input.value.trim()) params.set('q', input.value.trim());
    if (activeCat) {
      var chip = filters.filter(function (el) { return el.dataset.cat === activeCat; })[0];
      if (chip && chip.dataset.slug) params.set('cat', chip.dataset.slug);
    }
    var query = params.toString();
    history.replaceState(null, '', query ? location.pathname + '?' + query : location.pathname);
  }

  function schedule() {
    if (composing) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(apply, 120);
  }

  function setCat(cat) {
    activeCat = cat;
    filters.forEach(function (el) {
      el.setAttribute('aria-pressed', el.dataset.cat === cat ? 'true' : 'false');
    });
    apply();
  }

  function reset() {
    input.value = '';
    setCat('');
    input.focus();
  }

  // Restore state from ?q=, ?cat= and ?tag= so results can be linked to.
  // Topic chips on the home page link here with ?tag=Protocol; the tag is folded
  // into the query because every post carries its tags in the search haystack.
  var params = new URLSearchParams(location.search);
  var initialQuery = params.get('q') || '';
  var initialTag = params.get('tag') || '';
  var initialCat = params.get('cat') || '';
  if (initialQuery) input.value = initialQuery;
  else if (initialTag) input.value = initialTag;
  if (initialCat) {
    var chip = filters.filter(function (el) { return el.dataset.slug === initialCat; })[0];
    if (chip) {
      activeCat = chip.dataset.cat;
      filters.forEach(function (el) {
        el.setAttribute('aria-pressed', el.dataset.cat === activeCat ? 'true' : 'false');
      });
    }
  }

  input.addEventListener('input', schedule);
  input.addEventListener('compositionstart', function () { composing = true; });
  input.addEventListener('compositionend', function () { composing = false; schedule(); });
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') reset();
    if (event.key === 'Enter') {
      window.clearTimeout(timer);
      apply();
    }
  });

  clear.addEventListener('click', reset);

  filters.forEach(function (el) {
    el.addEventListener('click', function () { setCat(el.dataset.cat || ''); });
  });

  document.addEventListener('keydown', function (event) {
    var tag = (event.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || event.target.isContentEditable;
    if (event.key === '/' && !typing) {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });

  apply();
})();
