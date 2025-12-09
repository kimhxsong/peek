(function () {
  const PREFIX = "peek__";
  const ui = {};
  const state = {
    active: false,
    locked: false,
    hoverElement: null,
    currentElement: null,
    previewOpen: false,
    lang: "en",
    pinned: true,
    dragging: false,
    dragOffset: { x: 0, y: 0 },
    statusKey: "statusIdle",
    shortcutKey: "idle"
  };

  const i18n = {
    en: {
      start: "Start",
      stop: "Stop",
      copy: "Copy",
      statusIdle: "Ready",
      statusInspecting: "Inspecting",
      statusLocked: "Locked",
      statusUnlocked: "Unlocked",
      shortcutsLabel: "Shortcuts",
      shortcuts: {
        idle: [
          { label: "Pin", text: "Hover → Click to lock" },
          { label: "Traverse", keys: ["⌘", "↑", "↓", "←", "→"] },
          { label: "Exit", keys: ["Esc"] }
        ],
        inspecting: [
          { label: "Pin", text: "Click to lock" },
          { label: "Traverse", keys: ["⌘", "↑", "↓", "←", "→"] },
          { label: "Exit", keys: ["Esc"] }
        ],
        locked: [
          { label: "Traverse", keys: ["⌘", "↑", "↓", "←", "→"], text: "Traverse siblings/children" },
          { label: "Unlock", keys: ["Esc"] }
        ]
      },
      react: "React",
      reactIdle: "React: –",
      reactDetected: "React: ✓",
      reactNotDetected: "React: ✗",
      reactNoFiber: "React: no fiber",
      copied: "Copied!",
      copyFailed: "Copy failed",
      selectFirst: "Select element first"
    },
    ko: {
      start: "시작",
      stop: "중지",
      copy: "복사",
      statusIdle: "대기",
      statusInspecting: "검사 중",
      statusLocked: "고정됨",
      statusUnlocked: "해제됨",
      shortcutsLabel: "단축키",
      shortcuts: {
        idle: [
          { label: "핀", text: "호버 → 클릭 고정" },
          { label: "탐색", keys: ["⌘", "↑", "↓", "←", "→"] },
          { label: "종료", keys: ["Esc"] }
        ],
        inspecting: [
          { label: "핀", text: "클릭 고정" },
          { label: "탐색", keys: ["⌘", "↑", "↓", "←", "→"] },
          { label: "종료", keys: ["Esc"] }
        ],
        locked: [
          { label: "탐색", keys: ["⌘", "↑", "↓", "←", "→"], text: "형제/자식 탐색" },
          { label: "해제", keys: ["Esc"] }
        ]
      },
      react: "React",
      reactIdle: "React: –",
      reactDetected: "React: ✓",
      reactNotDetected: "React: ✗",
      reactNoFiber: "React: fiber 없음",
      copied: "복사됨!",
      copyFailed: "복사 실패",
      selectFirst: "요소를 먼저 선택하세요"
    }
  };

  function t(key) {
    return i18n[state.lang]?.[key] || i18n.en[key] || key;
  }

  function refreshStatusTexts() {
    if (ui.statusText) ui.statusText.textContent = t(state.statusKey);
    if (ui.statusDot) {
      ui.statusDot.classList.toggle(`${PREFIX}dot--active`, state.active);
    }
    renderShortcuts(state.shortcutKey);
  }

  function setStatus(statusKey, shortcutKey) {
    state.statusKey = statusKey;
    if (shortcutKey) {
      state.shortcutKey = shortcutKey;
    }
    refreshStatusTexts();
  }

  const SVG_NS = "http://www.w3.org/2000/svg";

  function createSvgElement(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => {
      el.setAttribute(key, String(value));
    });
    return el;
  }

  function createDragHandleIcon() {
    const svg = createSvgElement("svg", {
      width: "12",
      height: "12",
      viewBox: "0 0 24 24",
      fill: "currentColor"
    });
    [
      [5, 5],
      [12, 5],
      [19, 5],
      [5, 12],
      [12, 12],
      [19, 12]
    ].forEach(([cx, cy]) => {
      svg.appendChild(
        createSvgElement("circle", {
          cx,
          cy,
          r: "2"
        })
      );
    });
    return svg;
  }

  function createPinIcon() {
    const svg = createSvgElement("svg", {
      width: "12",
      height: "12",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2"
    });
    svg.appendChild(
      createSvgElement("path", {
        d: "M12 17v5M9 10.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V16a1 1 0 001 1h12a1 1 0 001-1v-.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6a1 1 0 00-1-1h-4a1 1 0 00-1 1z"
      })
    );
    return svg;
  }

  function createCopyIcon(size = 12) {
    const svg = createSvgElement("svg", {
      width: String(size),
      height: String(size),
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2"
    });
    svg.appendChild(
      createSvgElement("rect", {
        x: "9",
        y: "9",
        width: "13",
        height: "13",
        rx: "2"
      })
    );
    svg.appendChild(
      createSvgElement("path", {
        d: "M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
      })
    );
    return svg;
  }

  function createChevronDownIcon() {
    const svg = createSvgElement("svg", {
      width: "12",
      height: "12",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2"
    });
    svg.appendChild(
      createSvgElement("polyline", {
        points: "6 9 12 15 18 9"
      })
    );
    return svg;
  }

  function clearElement(el) {
    if (!el) return;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  function setCopyButtonContent(btn, label) {
    if (!btn) return;
    clearElement(btn);
    const text = document.createElement("span");
    text.textContent = label;
    btn.append(createCopyIcon(), text);
  }

  function getShortcutGroups(key) {
    const langGroups = i18n[state.lang]?.shortcuts?.[key];
    const fallbackGroups = i18n.en.shortcuts?.[key] || [];
    return langGroups || fallbackGroups || [];
  }

  function createShortcutPill(keyText) {
    const pill = document.createElement("span");
    pill.className = `${PREFIX}shortcut-pill`;
    pill.textContent = keyText;
    return pill;
  }

  function createShortcutGroup(group) {
    const groupEl = document.createElement("div");
    groupEl.className = `${PREFIX}shortcut-group`;

    const label = document.createElement("div");
    label.className = `${PREFIX}shortcut-label`;
    label.textContent = group.label || "";
    groupEl.appendChild(label);

    const right = document.createElement("div");
    right.className = `${PREFIX}shortcut-right`;
    if (group.text) {
      const text = document.createElement("div");
      text.className = `${PREFIX}shortcut-text`;
      text.textContent = group.text;
      right.appendChild(text);
    }
    if (group.keys && Array.isArray(group.keys) && group.keys.length > 0) {
      const pills = document.createElement("div");
      pills.className = `${PREFIX}shortcut-pills`;
      group.keys.forEach((keyText) => {
        pills.appendChild(createShortcutPill(keyText));
      });
      right.appendChild(pills);
    }
    groupEl.appendChild(right);
    return groupEl;
  }

  function renderShortcuts(key) {
    if (!ui.shortcutsText) return;
    clearElement(ui.shortcutsText);
    const groups = getShortcutGroups(key);
    if (!groups || groups.length === 0) return;
    groups.forEach((group) => {
      ui.shortcutsText.appendChild(createShortcutGroup(group));
    });
  }

  if (document.documentElement.dataset.peekMounted) {
    return;
  }
  document.documentElement.dataset.peekMounted = "true";

  function createPanel() {
    const panel = document.createElement("div");
    panel.className = `${PREFIX}panel`;
    panel.dataset.peekUi = "true";

    // Toolbar (drag handle + settings)
    const toolbar = document.createElement("div");
    toolbar.className = `${PREFIX}toolbar`;

    const dragHandle = document.createElement("div");
    dragHandle.className = `${PREFIX}drag-handle`;
    dragHandle.appendChild(createDragHandleIcon());
    dragHandle.title = "Drag to move";

    const langBtn = document.createElement("button");
    langBtn.className = `${PREFIX}toolbar-btn`;
    langBtn.textContent = "EN";
    langBtn.title = "Toggle language";
    langBtn.addEventListener("click", () => toggleLanguage());

    const pinBtn = document.createElement("button");
    pinBtn.className = `${PREFIX}toolbar-btn ${PREFIX}toolbar-btn--active`;
    pinBtn.appendChild(createPinIcon());
    pinBtn.title = "Toggle pin";
    pinBtn.addEventListener("click", () => togglePin());

    toolbar.append(dragHandle, langBtn, pinBtn);

    // Toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.className = `${PREFIX}button`;
    toggleBtn.textContent = t("start");
    toggleBtn.addEventListener("click", () => {
      if (state.active) {
        stopInspect();
      } else {
        startInspect();
      }
    });
    toolbar.append(toggleBtn);

    // Status
    const status = document.createElement("div");
    status.className = `${PREFIX}status`;
    const dot = document.createElement("div");
    dot.className = `${PREFIX}dot`;
    const statusText = document.createElement("div");
    status.append(dot, statusText);

    // Shortcuts (separated from status)
    const shortcuts = document.createElement("div");
    shortcuts.className = `${PREFIX}shortcuts`;
    const shortcutsLabel = document.createElement("div");
    shortcutsLabel.className = `${PREFIX}shortcuts-label`;
    shortcutsLabel.textContent = t("shortcutsLabel");
    const shortcutsText = document.createElement("div");
    shortcutsText.className = `${PREFIX}shortcuts-text`;
    shortcuts.append(shortcutsLabel, shortcutsText);

    // Copy button
    const copyBtn = document.createElement("button");
    copyBtn.className = `${PREFIX}button ${PREFIX}button--copy`;
    setCopyButtonContent(copyBtn, t("copy"));
    copyBtn.disabled = true;
    copyBtn.addEventListener("click", () => {
      copyContext();
    });

    panel.append(toolbar, status, shortcuts, copyBtn);
    document.body.appendChild(panel);

    // Drag functionality
    setupDrag(panel, dragHandle);

    ui.panel = panel;
    ui.toolbar = toolbar;
    ui.langBtn = langBtn;
    ui.pinBtn = pinBtn;
    ui.toggleBtn = toggleBtn;
    ui.statusText = statusText;
    ui.statusDot = dot;
    ui.shortcutsText = shortcutsText;
    ui.shortcutsLabel = shortcutsLabel;
    ui.copyBtn = copyBtn;
    setStatus(state.statusKey, state.shortcutKey);
  }

  function clampToViewport(panel) {
    const rect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;

    let x = rect.left;
    let y = rect.top;

    if (x < margin) x = margin;
    if (y < margin) y = margin;
    if (x + rect.width > vw - margin) x = vw - rect.width - margin;
    if (y + rect.height > vh - margin) y = vh - rect.height - margin;

    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function setupDrag(panel, handle) {
    handle.addEventListener("mousedown", (e) => {
      if (!state.pinned) {
        state.dragging = true;
        const rect = panel.getBoundingClientRect();
        state.dragOffset.x = e.clientX - rect.left;
        state.dragOffset.y = e.clientY - rect.top;
        panel.style.transition = "none";
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (state.dragging) {
        const x = e.clientX - state.dragOffset.x;
        const y = e.clientY - state.dragOffset.y;
        panel.style.left = `${x}px`;
        panel.style.top = `${y}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";
      }
    });

    document.addEventListener("mouseup", () => {
      if (state.dragging) {
        state.dragging = false;
        panel.style.transition = "";
        clampToViewport(panel);
      }
    });

    window.addEventListener("resize", () => {
      if (!state.pinned && panel.style.left) {
        clampToViewport(panel);
      }
    });
  }

  function toggleLanguage() {
    state.lang = state.lang === "en" ? "ko" : "en";
    ui.langBtn.textContent = state.lang.toUpperCase();
    updateUILanguage();
  }

  function togglePin() {
    state.pinned = !state.pinned;
    if (state.pinned) {
      ui.pinBtn.classList.add(`${PREFIX}toolbar-btn--active`);
      // Reset position
      ui.panel.style.left = "";
      ui.panel.style.top = "";
      ui.panel.style.right = "16px";
      ui.panel.style.bottom = "16px";
    } else {
      ui.pinBtn.classList.remove(`${PREFIX}toolbar-btn--active`);
    }
  }

  function updateUILanguage() {
    ui.toggleBtn.textContent = state.active ? t("stop") : t("start");
    setCopyButtonContent(ui.copyBtn, t("copy"));
    if (ui.shortcutsLabel) {
      ui.shortcutsLabel.textContent = t("shortcutsLabel");
    }
    refreshStatusTexts();
    if (!state.active) {
      setReactStatus("idle");
    }
  }

  function createHighlight() {
    const highlight = document.createElement("div");
    highlight.className = `${PREFIX}highlight`;
    highlight.style.display = "none";
    highlight.dataset.peekUi = "true";

    const label = document.createElement("div");
    label.className = `${PREFIX}label`;
    label.dataset.peekUi = "true";

    // Label header (info + buttons)
    const labelHeader = document.createElement("div");
    labelHeader.className = `${PREFIX}label-header`;

    // Label content container
    const labelContent = document.createElement("div");
    labelContent.className = `${PREFIX}label-content`;

    // Toggle preview button
    const labelToggleBtn = document.createElement("button");
    labelToggleBtn.className = `${PREFIX}label-toggle`;
    labelToggleBtn.appendChild(createChevronDownIcon());
    labelToggleBtn.title = "Toggle preview";
    labelToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePreview();
    });

    // Copy button
    const labelCopyBtn = document.createElement("button");
    labelCopyBtn.className = `${PREFIX}label-copy`;
    labelCopyBtn.appendChild(createCopyIcon(14));
    labelCopyBtn.title = "Copy LLM context";
    labelCopyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyContext();
    });

    labelHeader.append(labelContent, labelToggleBtn, labelCopyBtn);

    // Preview panel (collapsible)
    const labelPreview = document.createElement("div");
    labelPreview.className = `${PREFIX}label-preview`;

    label.append(labelHeader, labelPreview);

    document.body.appendChild(highlight);
    document.body.appendChild(label);

    ui.highlight = highlight;
    ui.label = label;
    ui.labelHeader = labelHeader;
    ui.labelContent = labelContent;
    ui.labelToggleBtn = labelToggleBtn;
    ui.labelCopyBtn = labelCopyBtn;
    ui.labelPreview = labelPreview;
  }

  function createToast() {
    const toast = document.createElement("div");
    toast.className = `${PREFIX}toast`;
    toast.dataset.peekUi = "true";
    document.body.appendChild(toast);
    ui.toast = toast;
  }

  function showToast(message) {
    if (!ui.toast) return;
    ui.toast.textContent = message;
    ui.toast.classList.add(`${PREFIX}toast--visible`);
    setTimeout(() => ui.toast.classList.remove(`${PREFIX}toast--visible`), 1500);
  }

  function isInspectorUi(el) {
    if (!el) return false;
    return Boolean(el.closest("[data-peek-ui='true']"));
  }

  function startInspect() {
    state.active = true;
    state.locked = false;
    ui.toggleBtn.textContent = t("stop");
    setStatus("statusInspecting", "inspecting");
    ui.copyBtn.disabled = false;
    updateReactStatusForElement(null);
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown, true);
  }

  function stopInspect() {
    state.active = false;
    state.locked = false;
    state.currentElement = null;
    state.hoverElement = null;
    ui.toggleBtn.textContent = t("start");
    setStatus("statusIdle", "idle");
    ui.copyBtn.disabled = true;
    setReactStatus("idle");
    closePreview();
    clearHighlight();
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);
  }

  function unlock() {
    if (!state.locked) return;
    state.locked = false;
    state.currentElement = null;
    setStatus("statusUnlocked", "inspecting");
    closePreview();
    if (state.hoverElement) {
      updateHighlight(state.hoverElement);
    } else {
      clearHighlight();
      updateReactStatusForElement(null);
    }
  }

  function togglePreview() {
    state.previewOpen = !state.previewOpen;
    if (state.previewOpen) {
      ui.labelPreview.classList.add(`${PREFIX}label-preview--open`);
      ui.labelToggleBtn.classList.add(`${PREFIX}label-toggle--open`);
      updatePreviewContent();
    } else {
      ui.labelPreview.classList.remove(`${PREFIX}label-preview--open`);
      ui.labelToggleBtn.classList.remove(`${PREFIX}label-toggle--open`);
    }
  }

  function closePreview() {
    state.previewOpen = false;
    if (ui.labelPreview) {
      ui.labelPreview.classList.remove(`${PREFIX}label-preview--open`);
    }
    if (ui.labelToggleBtn) {
      ui.labelToggleBtn.classList.remove(`${PREFIX}label-toggle--open`);
    }
  }

  function updatePreviewContent() {
    const target = state.currentElement || state.hoverElement;
    if (!target || !ui.labelPreview) return;
    const payload = buildPayload(target);
    ui.labelPreview.textContent = payload;
  }

  function handleMouseMove(event) {
    if (!state.active || state.locked) return;
    const target = findTarget(event.target);
    if (!target || target === state.hoverElement) return;
    state.hoverElement = target;
    updateHighlight(target);
  }

  function handleClick(event) {
    if (!state.active) return;
    const target = findTarget(event.target);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    state.locked = true;
    state.currentElement = target;
    setStatus("statusLocked", "locked");
    updateHighlight(target);
  }

  function handleKeyDown(event) {
    if (!state.active) return;
    if (event.key === "Escape") {
      if (state.locked) {
        // First ESC: unlock selection
        unlock();
      } else {
        // Second ESC or not locked: stop inspector
        stopInspect();
      }
      return;
    }
    if (!state.locked || !state.currentElement) return;
    if (!(event.metaKey || event.ctrlKey)) return;
    let next = null;
    if (event.key === "ArrowUp") {
      next = state.currentElement.parentElement;
    } else if (event.key === "ArrowDown") {
      next = state.currentElement.firstElementChild;
    } else if (event.key === "ArrowLeft") {
      next = state.currentElement.previousElementSibling;
    } else if (event.key === "ArrowRight") {
      next = state.currentElement.nextElementSibling;
    }
    if (next) {
      event.preventDefault();
      state.currentElement = next;
      updateHighlight(next);
    }
  }

  function findTarget(node) {
    let el = node;
    while (el) {
      if (isInspectorUi(el)) return null;
      if (el.nodeType === Node.ELEMENT_NODE) return el;
      el = el.parentElement;
    }
    return null;
  }

  function updateHighlight(element) {
    if (!ui.highlight || !ui.label) return;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      clearHighlight();
      return;
    }
    const reactInfo = readReactInfo(element);
    ui.highlight.style.display = "block";
    ui.highlight.style.top = `${rect.top}px`;
    ui.highlight.style.left = `${rect.left}px`;
    ui.highlight.style.width = `${rect.width}px`;
    ui.highlight.style.height = `${rect.height}px`;

    const labelItems = buildLabelContent(element, rect, reactInfo);
    clearElement(ui.labelContent);
    ui.labelContent.append(...labelItems);
    ui.label.style.display = "flex";
    const labelOffset = 8;
    let top = rect.top - ui.label.offsetHeight - labelOffset;
    if (top < 8) top = rect.bottom + labelOffset;
    let left = rect.left;
    const maxLeft = window.innerWidth - ui.label.offsetWidth - 8;
    if (left > maxLeft) left = maxLeft;
    ui.label.style.top = `${top}px`;
    ui.label.style.left = `${left}px`;

    // Update preview if open
    if (state.previewOpen) {
      updatePreviewContent();
    }

    updateReactStatusForElement(element, reactInfo);
  }

  function clearHighlight() {
    if (ui.highlight) ui.highlight.style.display = "none";
    if (ui.label) ui.label.style.display = "none";
  }

  function describeElement(el) {
    const tag = el.tagName ? el.tagName.toLowerCase() : "element";
    const id = el.id ? `#${el.id}` : "";
    const classes = (el.className && typeof el.className === "string"
      ? el.className
      : "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 3)
      .map((cls) => `.${cls}`)
      .join("");
    return `${tag}${id}${classes}`;
  }

  async function copyContext() {
    const target = state.currentElement || state.hoverElement;
    if (!target) {
      showToast(t("selectFirst"));
      return;
    }
    const payload = buildPayload(target);
    try {
      await writeClipboard(payload);
      showToast(t("copied"));
    } catch (err) {
      console.error(err);
      showToast(t("copyFailed"));
    }
  }

  function formatPropValue(val) {
    if (val === null) return "null";
    if (val === undefined) return "undefined";
    if (Array.isArray(val)) return `Array(${val.length})`;
    if (typeof val === "function") return "Function";
    if (typeof val === "object") return "Object";
    if (typeof val === "string") return val.length > 40 ? `"${val.slice(0, 40)}..."` : `"${val}"`;
    return String(val);
  }

  function buildPayload(el) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const reactInfo = readReactInfo(el);
    const className = el.getAttribute("class") || "";
    const id = el.getAttribute("id") || "";
    const textContent = (el.innerText || "").trim();

    const sections = [];

    // 1. IDENTITY - What is this element?
    const identity = [];
    if (reactInfo) {
      identity.push(`type: React Component`);
      identity.push(`name: ${reactInfo.componentName}`);
      if (reactInfo.componentStack && reactInfo.componentStack.length > 1) {
        identity.push(`hierarchy: ${reactInfo.componentStack.map(c => c.name).join(" > ")}`);
      }
    } else {
      identity.push(`type: DOM Element`);
      identity.push(`tag: ${el.tagName.toLowerCase()}`);
    }
    if (id) identity.push(`id: ${id}`);
    if (className) identity.push(`class: ${className}`);
    sections.push(`[IDENTITY]\n${identity.join("\n")}`);

    // 2. PROPS - React props (if React component)
    if (reactInfo?.propsWithValues) {
      const props = Object.entries(reactInfo.propsWithValues)
        .filter(([k]) => !["children", "key", "ref", "__self", "__source"].includes(k))
        .slice(0, 12)
        .map(([k, v]) => `${k}: ${formatPropValue(v)}`);
      if (props.length > 0) {
        sections.push(`[PROPS]\n${props.join("\n")}`);
      }
    }

    // 3. LAYOUT - Position and dimensions
    const layout = [
      `position: ${Math.round(rect.left)}, ${Math.round(rect.top)}`,
      `size: ${Math.round(rect.width)} x ${Math.round(rect.height)}`,
      `display: ${style.display}`,
      `position-type: ${style.position}`
    ];
    sections.push(`[LAYOUT]\n${layout.join("\n")}`);

    // 4. BOX MODEL - margin, padding, border
    const boxModel = [];
    const margin = `${style.marginTop} ${style.marginRight} ${style.marginBottom} ${style.marginLeft}`;
    const padding = `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`;
    const border = `${style.borderTopWidth} ${style.borderRightWidth} ${style.borderBottomWidth} ${style.borderLeftWidth}`;
    boxModel.push(`margin: ${margin}`);
    boxModel.push(`padding: ${padding}`);
    if (border !== "0px 0px 0px 0px") {
      boxModel.push(`border: ${border}`);
    }
    if (style.boxSizing) boxModel.push(`box-sizing: ${style.boxSizing}`);
    sections.push(`[BOX MODEL]\n${boxModel.join("\n")}`);

    // 5. STYLES - Key visual styles
    const styles = [];
    const colorVal = style.color;
    const bgVal = style.backgroundColor;
    const fontVal = style.fontSize;
    if (colorVal && colorVal !== "rgba(0, 0, 0, 0)") styles.push(`color: ${colorVal}`);
    if (bgVal && bgVal !== "rgba(0, 0, 0, 0)") styles.push(`background: ${bgVal}`);
    if (fontVal) styles.push(`font-size: ${fontVal}`);
    if (styles.length > 0) {
      sections.push(`[STYLES]\n${styles.join("\n")}`);
    }

    // 6. PATH - DOM location
    sections.push(`[PATH]\n${buildDomPath(el)}`);

    // 7. CONTENT - Text content (if any)
    if (textContent) {
      const preview = textContent.length > 150
        ? textContent.slice(0, 150) + "..."
        : textContent;
      sections.push(`[CONTENT]\n${preview}`);
    }

    return sections.join("\n\n");
  }

  function buildDomPath(el) {
    const segments = [];
    let node = el;
    while (node && node.nodeType === Node.ELEMENT_NODE && segments.length < 8) {
      const part = describeElement(node);
      segments.unshift(part);
      node = node.parentElement;
    }
    return segments.join(" > ");
  }

  function buildLabelContent(el, rect, reactInfo) {
    const elements = [];

    // Component/element name
    const name =
      (reactInfo && reactInfo.componentName) ||
      describeElement(el) ||
      "element";
    const nameSpan = document.createElement("div");
    nameSpan.className = `${PREFIX}label-name`;
    nameSpan.textContent = name;
    elements.push(nameSpan);

    // Source location (file:line)
    if (reactInfo && reactInfo.source) {
      const { fileName, lineNumber, columnNumber } = reactInfo.source;
      const sourceSpan = document.createElement("div");
      sourceSpan.className = `${PREFIX}label-source`;
      sourceSpan.textContent = `${shortenPath(fileName)}:${lineNumber}${columnNumber ? `:${columnNumber}` : ""}`;
      sourceSpan.style.cssText = "font-size: 10px; opacity: 0.8; color: #61dafb;";
      elements.push(sourceSpan);
    }

    // Size
    const size = `${Math.round(rect.width)}px × ${Math.round(rect.height)}px`;
    const sizeSpan = document.createElement("div");
    sizeSpan.className = `${PREFIX}label-size`;
    sizeSpan.textContent = size;
    elements.push(sizeSpan);

    return elements;
  }

  function updateReactStatusForElement(el, reactInfoHint) {
    if (!state.active) {
      setReactStatus("idle");
      return;
    }
    if (!el) {
      const hasReact = hasReactOnPage();
      setReactStatus(
        hasReact ? "available" : "missing",
        hasReact ? t("reactDetected") : t("reactNotDetected")
      );
      return;
    }
    const info = reactInfoHint || readReactInfo(el);
    if (info) {
      let text = info.componentName
        ? `${t("react")}: ${info.componentName}`
        : `${t("react")}: component`;
      // Add source location if available
      if (info.source) {
        text += ` @ ${shortenPath(info.source.fileName)}:${info.source.lineNumber}`;
      }
      setReactStatus("available", text);
      return;
    }
    const hasReact = hasReactOnPage();
    setReactStatus(
      hasReact ? "missing" : "missing",
      hasReact ? t("reactNoFiber") : t("reactNotDetected")
    );
  }

  function setReactStatus(stateName, text) {
    if (!ui.reactDot || !ui.reactText) return;
    ui.reactDot.classList.remove(
      `${PREFIX}react-dot--ok`,
      `${PREFIX}react-dot--warn`
    );
    let label = text || t("reactIdle");
    if (stateName === "available") {
      ui.reactDot.classList.add(`${PREFIX}react-dot--ok`);
      if (!text) label = t("reactDetected");
    } else if (stateName === "missing") {
      ui.reactDot.classList.add(`${PREFIX}react-dot--warn`);
      if (!text) label = t("reactNotDetected");
    } else if (stateName === "idle" && !text) {
      label = t("reactIdle");
    }
    ui.reactText.textContent = label;
  }

  function hasReactOnPage() {
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook && hook.renderers && hook.renderers.size) return true;
    const candidates = [
      document.body,
      document.documentElement,
      document.querySelector("[data-reactroot]"),
      document.querySelector("[data-reactroot], [data-reactid]")
    ].filter(Boolean);
    for (const el of candidates) {
      if (findFiberFromElement(el)) return true;
    }
    // Shallow scan a few elements to avoid heavy traversal.
    const sample = Array.from(document.querySelectorAll("*")).slice(0, 32);
    for (const el of sample) {
      if (findFiberFromElement(el)) return true;
    }
    return false;
  }

  function readReactInfo(el) {
    // 1) Try direct fiber attached to the host node (__reactFiber*/__reactContainer*), walking up a few ancestors.
    let current = el;
    let depth = 0;
    while (current && current.nodeType === Node.ELEMENT_NODE && depth < 5) {
      const directFiber = findFiberFromElement(current);
      if (directFiber) {
        const info = extractReactInfoFromFiber(directFiber);
        if (info) return info;
      }
      current = current.parentElement;
      depth += 1;
    }

    // 2) Fallback: if React DevTools hook is present, ask each renderer to
    // resolve the fiber for this host node.
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook && hook.renderers) {
      for (const renderer of hook.renderers.values()) {
        if (renderer && typeof renderer.findFiberByHostInstance === "function") {
          const fiber = renderer.findFiberByHostInstance(el);
          if (fiber) {
            const info = extractReactInfoFromFiber(fiber);
            if (info) return info;
          }
        }
      }
    }

    return null;
  }

  function findFiberFromElement(el) {
    if (!el) return null;
    const keys = Array.from(
      new Set([
        ...Object.keys(el),
        ...Object.getOwnPropertyNames(el)
      ])
    ).filter(
      (k) =>
        k.startsWith("__reactFiber") ||
        k.startsWith("__reactProps") ||
        k.startsWith("__reactContainer")
    );
    for (const key of keys) {
      const fiberCandidate = el[key];
      if (
        fiberCandidate &&
        typeof fiberCandidate === "object" &&
        (fiberCandidate.return ||
          fiberCandidate.child ||
          fiberCandidate.sibling ||
          fiberCandidate.stateNode)
      ) {
        return fiberCandidate;
      }
    }
    return null;
  }

  function extractReactInfoFromFiber(fiber) {
    let node = fiber;
    let hostElement = null;
    const componentStack = []; // Collect component hierarchy

    while (node) {
      const type = node.type || node.elementType;

      // Host component (div, span, etc.) - save as fallback and continue up
      if (typeof type === "string") {
        if (!hostElement) hostElement = type;
        node = node.return;
        continue;
      }

      // Function/class component found (note: typeof null === "object", so check type exists)
      if (type && (typeof type === "function" || typeof type === "object")) {
        const componentName = type.displayName || type.name || null;
        if (componentName) {
          // Source location (React 18 only - removed in React 19)
          // See: https://github.com/facebook/react/issues/31981
          const debugSource = node._debugSource || node._debugOwner?._debugSource;
          const source = debugSource?.fileName
            ? {
                fileName: debugSource.fileName,
                lineNumber: debugSource.lineNumber,
                columnNumber: debugSource.columnNumber
              }
            : null;

          // Collect component info with actual prop values
          componentStack.push({
            name: componentName,
            source,
            props: node.memoizedProps ? Object.keys(node.memoizedProps) : [],
            propsWithValues: node.memoizedProps || {}
          });

          // Continue collecting parent components (up to 5 levels)
          if (componentStack.length >= 5) break;
        }
      }

      node = node.return;
    }

    if (componentStack.length === 0) {
      return hostElement ? { componentName: hostElement, source: null } : null;
    }

    // First component is the closest one
    const closest = componentStack[0];
    return {
      componentName: closest.name,
      source: closest.source,
      hostElement,
      props: closest.props,
      propsWithValues: closest.propsWithValues,
      componentStack // Full hierarchy
    };
  }

  function shortenPath(path) {
    if (!path || typeof path !== "string") return path || "";
    const parts = path.split(/[\\/]/).filter(Boolean);
    if (parts.length <= 3) return path;
    return parts.slice(-3).join("/");
  }

  async function writeClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return legacyCopy(text);
  }

  function legacyCopy(text) {
    return new Promise((resolve, reject) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.left = "-9999px";
      textarea.dataset.peekUi = "true";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);
        success ? resolve() : reject(new Error("execCommand failed"));
      } catch (err) {
        document.body.removeChild(textarea);
        reject(err);
      }
    });
  }

  createPanel();
  createHighlight();
  createToast();
})();
