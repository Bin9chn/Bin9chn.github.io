/* Friend-link application form.
 *
 * The site is static, so there is no endpoint to post to. The form validates the
 * input, mirrors it into a live preview card, and turns it into a pre-filled
 * GitHub issue. Everything stays on the client; nothing is sent anywhere until
 * the visitor presses the submit link and confirms on GitHub. */
(() => {
  const form = document.querySelector("[data-friend-form]");
  if (!form) return;

  const REPO = "Bin9chn/Bin9chn.github.io";

  const fields = {
    name: form.querySelector('[name="name"]'),
    url: form.querySelector('[name="url"]'),
    description: form.querySelector('[name="description"]'),
    avatar: form.querySelector('[name="avatar"]'),
    tags: form.querySelector('[name="tags"]'),
    email: form.querySelector('[name="email"]'),
    rss: form.querySelector('[name="rss"]'),
    confirm: form.querySelector('[name="confirm"]'),
  };

  const preview = {
    name: document.querySelector("[data-preview-name]"),
    description: document.querySelector("[data-preview-description]"),
    avatar: document.querySelector("[data-preview-avatar]"),
    avatarFallback: document.querySelector("[data-preview-avatar-fallback]"),
    tags: document.querySelector("[data-preview-tags]"),
    url: document.querySelector("[data-preview-url]"),
  };

  const submitLink = form.querySelector("[data-apply-submit]");
  const copyButton = form.querySelector("[data-copy-json]");
  const copySiteButton = document.querySelector("[data-copy-site]");
  const counter = form.querySelector("[data-counter]");
  const summary = form.querySelector("[data-form-summary]");

  const normalizeUrl = (raw) => {
    const value = (raw || "").trim();
    if (!value) return "";
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  };

  const isHttpUrl = (value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const parseTags = (raw) =>
    (raw || "")
      .split(/[,，、;；\n]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 4);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const readState = () => {
    const url = normalizeUrl(fields.url.value);
    return {
      name: fields.name.value.trim(),
      url,
      description: fields.description.value.trim(),
      avatar: normalizeUrl(fields.avatar.value),
      tags: parseTags(fields.tags.value),
      email: fields.email.value.trim(),
      rss: normalizeUrl(fields.rss.value),
      confirm: fields.confirm.checked,
    };
  };

  const errorsFor = (state) => {
    const errors = {};
    if (state.name.length < 2) errors.name = "站点名称至少 2 个字符。";
    else if (state.name.length > 40) errors.name = "站点名称不要超过 40 个字符。";

    if (!state.url) errors.url = "请填写站点地址。";
    else if (!isHttpUrl(state.url)) errors.url = "地址需要是 http:// 或 https:// 开头的链接。";

    if (state.description.length < 4) errors.description = "简介至少 4 个字符。";
    else if (state.description.length > 120) errors.description = "简介不要超过 120 个字符。";

    if (state.avatar && !isHttpUrl(state.avatar)) errors.avatar = "头像需要是完整的图片链接。";
    if (state.rss && !isHttpUrl(state.rss)) errors.rss = "RSS 需要是完整的订阅链接。";
    if (state.email && !EMAIL_RE.test(state.email)) errors.email = "邮箱格式看起来不对。";
    if (state.tags.some((tag) => tag.length > 12)) errors.tags = "单个标签不要超过 12 个字符。";
    if (!state.confirm) errors.confirm = "请先确认已满足友链要求。";
    return errors;
  };

  const setError = (field, message) => {
    const holder = form.querySelector(`[data-error-for="${field}"]`);
    const input = fields[field];
    if (holder) {
      holder.textContent = message || "";
      holder.classList.toggle("hidden", !message);
    }
    if (input) {
      input.classList.toggle("border-rose-400", Boolean(message));
      input.classList.toggle("dark:border-rose-500/70", Boolean(message));
      input.setAttribute("aria-invalid", message ? "true" : "false");
    }
  };

  const escapeCell = (value) => (value || "").replace(/\|/g, "\\|").replace(/\n+/g, " ");

  const buildIssueUrl = (state) => {
    const title = `[友链申请] ${state.name || "站点名称"}`;
    const rows = [
      ["站点名称", state.name],
      ["站点地址", state.url],
      ["站点简介", state.description],
      ["头像地址", state.avatar || "未提供"],
      ["标签", state.tags.join(" / ") || "未提供"],
      ["RSS", state.rss || "未提供"],
      ["联系邮箱", state.email || "未提供"],
    ];
    const table = [
      "| 字段 | 内容 |",
      "| --- | --- |",
      ...rows.map(([key, value]) => `| ${key} | ${escapeCell(value)} |`),
    ];
    const json = JSON.stringify(
      {
        name: state.name,
        url: state.url,
        description: state.description,
        avatar: state.avatar,
        tags: state.tags,
      },
      null,
      2,
    );
    const body = [
      "### 友链申请",
      "",
      table.join("\n"),
      "",
      "### 可直接写入 data/friends.json",
      "",
      "```json",
      json,
      "```",
      "",
      "---",
      `由 ${window.location.origin}/friends/apply/ 表单生成`,
    ].join("\n");
    return `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  };

  const render = () => {
    const state = readState();
    const errors = errorsFor(state);
    const valid = Object.keys(errors).length === 0;

    if (counter && fields.description) {
      counter.textContent = `${state.description.length}/120`;
      counter.classList.toggle("text-rose-500", state.description.length > 120);
    }

    if (preview.name) preview.name.textContent = state.name || "站点名称";
    if (preview.description) {
      preview.description.textContent =
        state.description || "这里会显示你填写的一句话简介，最终效果与友链页一致。";
    }
    if (preview.url) preview.url.textContent = state.url ? state.url.replace(/^https?:\/\//, "") : "example.com";
    if (preview.tags) {
      preview.tags.replaceChildren(
        ...(state.tags.length ? state.tags : ["标签"]).map((tag, index) => {
          const chip = document.createElement("span");
          chip.className = "nerdy-chip nerdy-chip-emerald";
          if (!state.tags.length) chip.classList.add("opacity-50");
          chip.textContent = tag;
          void index;
          return chip;
        }),
      );
    }

    if (preview.avatar && preview.avatarFallback) {
      const showImage = Boolean(state.avatar) && isHttpUrl(state.avatar);
      preview.avatar.classList.toggle("hidden", !showImage);
      preview.avatarFallback.classList.toggle("hidden", showImage);
      preview.avatarFallback.textContent = (state.name || "?").slice(0, 1);
      if (showImage) {
        // A dead image URL should degrade to the initial instead of an empty box.
        preview.avatar.onerror = () => {
          preview.avatar.classList.add("hidden");
          preview.avatarFallback.classList.remove("hidden");
        };
        preview.avatar.src = state.avatar;
        preview.avatar.alt = `${state.name || "站点"} 头像`;
      }
    }

    // The link stays clickable even while invalid: clicking it is how the visitor
    // discovers what is missing, so it must not swallow the click.
    if (submitLink) {
      submitLink.href = buildIssueUrl(state);
      submitLink.dataset.valid = valid ? "true" : "false";
    }

    if (summary) {
      summary.textContent = valid
        ? "信息看起来没问题，点击下方按钮会在 GitHub 打开预填好的申请。"
        : "还有必填项没填好，补齐后再提交。";
      summary.dataset.valid = valid ? "true" : "false";
    }

    return { state, errors, valid };
  };

  Object.entries(fields).forEach(([key, input]) => {
    if (!input) return;
    const handler = () => {
      const { errors } = render();
      if (input.dataset.touched === "true") setError(key, errors[key]);
    };
    input.addEventListener("input", handler);
    input.addEventListener("change", handler);
    input.addEventListener("blur", () => {
      input.dataset.touched = "true";
      const { errors } = render();
      setError(key, errors[key]);
    });
  });

  if (submitLink) {
    submitLink.addEventListener("click", (event) => {
      const { errors, valid } = render();
      if (valid) return;
      event.preventDefault();
      Object.entries(errors).forEach(([key, message]) => {
        setError(key, message);
        if (fields[key]) fields[key].dataset.touched = "true";
      });
      const firstInvalid = form.querySelector("[aria-invalid='true']");
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        firstInvalid.focus({ preventScroll: true });
      }
    });
  }

  const copyText = async (text, button, label) => {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
      } catch {
        /* clipboard is unavailable, the label below still tells the user */
      }
      area.remove();
    }
    button.textContent = label || "已复制";
    window.setTimeout(() => {
      button.textContent = original;
    }, 1600);
  };

  if (copyButton) {
    copyButton.addEventListener("click", () => {
      const { state } = render();
      const json = JSON.stringify(
        {
          name: state.name,
          url: state.url,
          description: state.description,
          avatar: state.avatar,
          tags: state.tags,
        },
        null,
        2,
      );
      copyText(json, copyButton, "已复制 JSON");
    });
  }

  if (copySiteButton) {
    copySiteButton.addEventListener("click", () => {
      const { siteName, siteUrl, siteDesc, siteAvatar } = copySiteButton.dataset;
      const text = [
        `名称：${siteName || ""}`,
        `地址：${siteUrl || ""}`,
        `简介：${siteDesc || ""}`,
        `头像：${siteAvatar || ""}`,
      ].join("\n");
      copyText(text, copySiteButton, "已复制本站信息");
    });
  }

  render();
})();
