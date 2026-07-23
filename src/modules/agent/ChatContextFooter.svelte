<script lang="ts">
  import AppIcon from "$lib/components/AppIcon.svelte";
  import { formatTok } from "$lib/chat/chatFormat";
  import {
    getContextSectionColor,
    type ContextAppearanceMap,
  } from "$lib/chat/contextAppearance";
  import {
    cloudContextBudgetTitle,
    contextBudgetTitle,
    type ChatFooterProfile,
    type FooterUsageView,
  } from "$lib/chatFooterProfile";
  import type { AssemblySection } from "$lib/agent/systemPrompt/assemble";
  import type { SettingsState } from "$lib/stores/settings";

  /** Shape of the context breakdown computed by the ChatPane shell. */
  interface ContextBreakdown {
    sections: AssemblySection[];
    systemTokens: number;
    toolSchemaTokens: number;
    historyTokens: number;
    reserveTokens: number;
    contextWindow: number;
    total: number;
  }

  interface Props {
    footerProfile: ChatFooterProfile;
    footerAriaLabel: string;
    footerUsageView: FooterUsageView;
    footerUsageTitle: string;
    monthlyUsageLabel: string;
    lastReplyFooterLabel: string;
    /** Full context breakdown used by the segmented bar, hover popover, and panel. */
    bd: ContextBreakdown;
    usageLevel: "healthy" | "warning" | "critical";
    contextPct: number;
    contextUsed: number;
    maxContextTokens: number;
    contextBarColors: ContextAppearanceMap;
    contextBudgetOptions: number[];
    compactButtonInactive: boolean;
    compactButtonTitle: string;
    chatBackend: SettingsState["chatBackend"];
    /** Bindable: kept in the shell so the model/mode menus can close it (mutual exclusion). */
    budgetMenuOpen?: boolean;
    onToggleUsageView: () => void;
    getSectionFilePath: (section: { id: string; label: string }) => string | null;
    getActivePromptFiles: () => Array<{ filename: string; label: string; path: string }>;
    onOpenSection: (filePath: string) => void;
    onOpenBuiltinSection: (sectionId: string, label: string, text: string) => void;
    onOpenChatHistory: () => void;
    onToggleBudgetMenu: () => void;
    onPickBudget: (opt: number) => void;
    onRequestCompaction: () => void;
  }

  let {
    footerProfile,
    footerAriaLabel,
    footerUsageView,
    footerUsageTitle,
    monthlyUsageLabel,
    lastReplyFooterLabel,
    bd,
    usageLevel,
    contextPct,
    contextUsed,
    maxContextTokens,
    contextBarColors,
    contextBudgetOptions,
    compactButtonInactive,
    compactButtonTitle,
    chatBackend,
    budgetMenuOpen = $bindable(false),
    onToggleUsageView,
    getSectionFilePath,
    getActivePromptFiles,
    onOpenSection,
    onOpenBuiltinSection,
    onOpenChatHistory,
    onToggleBudgetMenu,
    onPickBudget,
    onRequestCompaction,
  }: Props = $props();

  /** UI-local state (previously lived in the ChatPane shell). */
  let showBreakdown = $state(false);
  let contextPanelOpen = $state(false);
  let expandedSectionId = $state<string | null>(null);
  let budgetWrapEl: HTMLDivElement | undefined = $state();

  function getSectionColor(sectionId: string): string {
    return getContextSectionColor(sectionId, contextBarColors);
  }

  // Own the context-budget menu's outside-click while it is open (the shell no
  // longer coordinates this menu). Setting the bindable prop propagates upward.
  $effect(() => {
    if (!budgetMenuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (budgetWrapEl && !budgetWrapEl.contains(e.target as Node)) {
        budgetMenuOpen = false;
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  });
</script>

<div class="context-footer" aria-label={footerAriaLabel}>
  {#if footerProfile.showMonthlyUsage || footerProfile.showStreamMetrics}
    <div class="context-meta-start">
      {#if footerProfile.showMonthlyUsage}
        <button
          type="button"
          class="context-monthly-usage"
          class:context-monthly-usage--balance={footerUsageView === "balance"}
          title={footerUsageTitle}
          aria-pressed={footerUsageView === "balance"}
          onclick={() => onToggleUsageView()}
        >
          {monthlyUsageLabel}
        </button>
      {/if}
      {#if footerProfile.showMonthlyUsage && footerProfile.showStreamMetrics}
        <span class="context-meta-sep" aria-hidden="true">·</span>
      {/if}
      {#if footerProfile.showStreamMetrics}
        <span
          class="context-chat-tok"
          title="Output speed, token count, and duration for the last completed reply"
          aria-label="Last reply: tokens per second, output tokens, and completion time"
        >
          {lastReplyFooterLabel}
        </span>
      {/if}
    </div>
  {/if}
  {#if footerProfile.showContextBar}
    {@const cw = bd.contextWindow}
    {@const seg = (n: number) => cw > 0 ? Math.min(100, (n / cw) * 100) : 0}
    {@const level = usageLevel}
    <div
      class="context-bar"
      class:context-bar--warning={level === "warning"}
      class:context-bar--critical={level === "critical"}
      class:context-bar--active={contextPanelOpen}
      role="button"
      tabindex="0"
      aria-label="Context usage breakdown"
      aria-expanded={contextPanelOpen}
      onmouseenter={() => (showBreakdown = true)}
      onmouseleave={() => (showBreakdown = false)}
      onfocus={() => (showBreakdown = true)}
      onblur={() => (showBreakdown = false)}
      onclick={() => (contextPanelOpen = !contextPanelOpen)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); contextPanelOpen = !contextPanelOpen; } }}
    >
      <div class="context-bar-track">
        {#if level === "healthy"}
          {#each bd.sections.filter(s => s.tokenEstimate > 0) as section (section.id)}
            <div class="context-seg" style="width: {seg(section.tokenEstimate)}%; background: {getSectionColor(section.id)};"></div>
          {/each}
          {#if bd.toolSchemaTokens > 0}
            <div class="context-seg context-seg--tools" style="width: {seg(bd.toolSchemaTokens)}%"></div>
          {/if}
          <div class="context-seg context-seg--history" style="width: {seg(bd.historyTokens)}%"></div>
        {:else}
          <div class="context-bar-fill" style="width: {Math.min(100, contextPct)}%"></div>
        {/if}
      </div>
    </div>
    {#if showBreakdown && !contextPanelOpen}
      <div class="context-breakdown-popover" role="tooltip">
        <div class="breakdown-title">Context breakdown</div>
        <div class="breakdown-group">
          <div class="breakdown-row breakdown-row--header">
            <span class="breakdown-dot breakdown-dot--system"></span>
            <span class="breakdown-label">System prompt</span>
            <span class="breakdown-tok">{formatTok(bd.systemTokens)} tok</span>
          </div>
          {#each bd.sections.filter(s => s.tokenEstimate > 0) as section (section.id)}
            <div class="breakdown-row breakdown-row--sub">
              <span class="breakdown-label">{section.label}</span>
              <span class="breakdown-tok">{formatTok(section.tokenEstimate)}</span>
            </div>
          {/each}
        </div>
        {#if bd.toolSchemaTokens > 0}
          <div class="breakdown-group">
            <div class="breakdown-row breakdown-row--header">
              <span class="breakdown-dot breakdown-dot--tools"></span>
              <span class="breakdown-label">Tool schemas</span>
              <span class="breakdown-tok">{formatTok(bd.toolSchemaTokens)} tok</span>
            </div>
          </div>
        {/if}
        <div class="breakdown-group">
          <div class="breakdown-row breakdown-row--header">
            <span class="breakdown-dot breakdown-dot--history"></span>
            <span class="breakdown-label">Chat history</span>
            <span class="breakdown-tok">{formatTok(bd.historyTokens)} tok</span>
          </div>
        </div>
        <div class="breakdown-divider"></div>
        <div class="breakdown-row breakdown-row--total">
          <span class="breakdown-label">Used</span>
          <span class="breakdown-tok">~{formatTok(bd.total)} / {formatTok(cw)} tok</span>
        </div>
        <div class="breakdown-row breakdown-row--reserve">
          <span class="breakdown-label">Reply reserve</span>
          <span class="breakdown-tok">{formatTok(bd.reserveTokens)} tok</span>
        </div>
      </div>
    {/if}
    {#if contextPanelOpen}
      <div class="context-panel" role="dialog" aria-label="Context breakdown">
        <div class="context-panel-header">
          <button
            class="context-panel-close"
            onclick={() => (contextPanelOpen = false)}
            aria-label="Close context panel"
          >×</button>
          <span class="context-panel-title">Context</span>
          <span class="context-panel-usage">~{formatTok(bd.total)} / {formatTok(cw)} tok</span>
        </div>
        <div class="context-panel-body">
          <div class="cpanel-group">
            <div class="cpanel-row cpanel-row--header">
              <span class="cpanel-label">System prompt</span>
              <span class="cpanel-tok">{formatTok(bd.systemTokens)} tok</span>
            </div>
            {#each bd.sections.filter(s => s.tokenEstimate > 0) as section (section.id)}
              {@const filePath = getSectionFilePath(section)}
              {@const promptFiles = section.id === 'system-prompts' ? getActivePromptFiles() : null}
              {@const isDropdown = promptFiles !== null && promptFiles.length > 1}
              {@const isExpanded = expandedSectionId === section.id}
              <button
                type="button"
                class="cpanel-row cpanel-row--sub cpanel-row--clickable"
                onclick={() => {
                  if (isDropdown) {
                    expandedSectionId = isExpanded ? null : section.id;
                  } else if (filePath) {
                    onOpenSection(filePath);
                  } else {
                    onOpenBuiltinSection(section.id, section.label, section.text);
                  }
                }}
              >
                <span class="cpanel-dot" style="background: {getSectionColor(section.id)}" aria-hidden="true"></span>
                <span class="cpanel-label">{section.label}</span>
                <span class="cpanel-tok">{formatTok(section.tokenEstimate)} tok</span>
                {#if isDropdown}
                  <span class="cpanel-chevron" aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
                {:else}
                  <span class="cpanel-open-icon" aria-hidden="true">→</span>
                {/if}
              </button>
              {#if isExpanded && isDropdown && promptFiles}
                {#each promptFiles as pf (pf.filename)}
                  <button
                    type="button"
                    class="cpanel-row cpanel-row--file"
                    onclick={() => onOpenSection(pf.path)}
                  >
                    <span class="cpanel-label">{pf.label}</span>
                    <span class="cpanel-open-icon cpanel-open-icon--show" aria-hidden="true">→</span>
                  </button>
                {/each}
              {/if}
            {/each}
          </div>
          {#if bd.toolSchemaTokens > 0}
            <div class="cpanel-group">
              <div class="cpanel-row cpanel-row--header">
                <span class="cpanel-dot" style="background: {contextBarColors.toolSchemas}" aria-hidden="true"></span>
                <span class="cpanel-label">Tool schemas</span>
                <span class="cpanel-tok">{formatTok(bd.toolSchemaTokens)} tok</span>
              </div>
            </div>
          {/if}
          <div class="cpanel-group">
            <button
              type="button"
              class="cpanel-row cpanel-row--header cpanel-row--clickable"
              onclick={onOpenChatHistory}
            >
              <span class="cpanel-dot" style="background: {contextBarColors.chatHistory}" aria-hidden="true"></span>
              <span class="cpanel-label">Chat history</span>
              <span class="cpanel-tok">{formatTok(bd.historyTokens)} tok</span>
              <span class="cpanel-open-icon" aria-hidden="true">→</span>
            </button>
          </div>
          <div class="cpanel-divider"></div>
          <div class="cpanel-row cpanel-row--total">
            <span class="cpanel-label">Used</span>
            <span class="cpanel-tok">~{formatTok(bd.total)} / {formatTok(cw)} tok</span>
          </div>
          <div class="cpanel-row cpanel-row--reserve">
            <span class="cpanel-label">Reply reserve</span>
            <span class="cpanel-tok">{formatTok(bd.reserveTokens)} tok</span>
          </div>
        </div>
      </div>
    {/if}
  {/if}
  <div class="context-meta">
    <div class="context-budget-row">
      <div class="context-budget-wrap" bind:this={budgetWrapEl}>
        {#if footerProfile.contextBudgetEditable}
          <button
            type="button"
            class="context-numbers"
            class:context-numbers--warning={usageLevel === "warning"}
            class:context-numbers--critical={usageLevel === "critical"}
            onclick={onToggleBudgetMenu}
            aria-expanded={budgetMenuOpen}
            aria-haspopup="listbox"
          title={footerProfile.showMonthlyUsage
            ? cloudContextBudgetTitle(maxContextTokens, chatBackend)
            : contextBudgetTitle(footerProfile, chatBackend)}
        >
          <span class="context-numbers-text"
            >~{formatTok(contextUsed)} / {formatTok(maxContextTokens)} tok</span
          >
          </button>
          {#if budgetMenuOpen}
            <div class="context-budget-menu" role="listbox" aria-label="Context budget">
              {#each contextBudgetOptions as opt (opt)}
                <button
                  type="button"
                  role="option"
                  class="context-budget-option"
                  class:current={opt === maxContextTokens}
                  aria-selected={opt === maxContextTokens}
                  onclick={() => onPickBudget(opt)}
                >
                  {formatTok(opt)} tok
                </button>
              {/each}
            </div>
          {/if}
        {:else}
          <span
            class="context-numbers context-numbers--static"
            class:context-numbers--warning={usageLevel === "warning"}
            class:context-numbers--critical={usageLevel === "critical"}
          title={footerProfile.showMonthlyUsage
            ? cloudContextBudgetTitle(maxContextTokens, chatBackend)
            : contextBudgetTitle(footerProfile, chatBackend)}
        >
          <span class="context-numbers-text">
            ~{formatTok(contextUsed)} / {formatTok(maxContextTokens)} tok{#if footerProfile.contextHint}
                <span class="context-hint"> · {footerProfile.contextHint}</span>{/if}
            </span>
          </span>
        {/if}
      </div>
      <button
        type="button"
        class="context-compact-btn"
        class:context-compact-btn--inactive={compactButtonInactive}
        aria-disabled={compactButtonInactive}
        title={compactButtonTitle}
        aria-label={compactButtonTitle}
        onclick={() => onRequestCompaction()}
      >
        <AppIcon name="circle-spark" size={14} />
      </button>
    </div>
  </div>
</div>

<style>
  .context-footer {
    flex-shrink: 0;
    padding: 8px 10px 10px;
    border-top: 1px solid transparent;
    background: var(--workbench-panel-bg, var(--chat-panel-bg, var(--sidebar)));
    overflow: visible;
    position: relative;
    z-index: 1;
  }

  .context-bar {
    padding: 10px 0;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .context-bar-track {
    width: 100%;
    height: 3px;
    background: #3c3c3c;
    border-radius: 2px;
    overflow: hidden;
    display: flex;
    gap: 1px;
  }

  .context-bar--warning .context-bar-track { background: #3c3c3c; }
  .context-bar--critical .context-bar-track { background: #3c3c3c; }

  .context-bar-fill {
    height: 100%;
    flex-shrink: 0;
    transition: width 0.2s ease;
  }

  .context-bar--warning .context-bar-fill { background: #d4a017; }
  .context-bar--critical .context-bar-fill { background: #f44747; }

  .context-seg {
    height: 100%;
    transition: width 0.2s ease;
    flex-shrink: 0;
  }

  .context-seg--system { background: var(--context-system-prompts); }
  .context-seg--tools  { background: var(--context-tool-schemas); }
  .context-seg--history { background: var(--context-chat-history); }

  .context-bar--active .context-bar-track {
    opacity: 0.6;
  }

  .context-panel {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    min-width: 240px;
    max-height: 60vh;
    overflow-y: auto;
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--foreground, #d4d4d4);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    z-index: 100;
  }

  .context-panel-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }

  .context-panel-close {
    font-size: 13px;
    line-height: 1;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: #606060;
    cursor: pointer;
    border-radius: 3px;
    padding: 0;
    flex-shrink: 0;
  }

  .context-panel-close:hover { color: #d4d4d4; }

  .context-panel-title {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #808080;
  }

  .context-panel-body { }

  .cpanel-group {
    margin-bottom: 4px;
  }

  .cpanel-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 18px;
    border-radius: 3px;
  }

  .cpanel-row--header {
    font-weight: 500;
    color: var(--foreground, #d4d4d4);
    border: none;
    background: transparent;
    width: 100%;
    text-align: left;
    font-family: inherit;
    font-size: inherit;
  }

  .cpanel-row--sub {
    padding-left: 16px;
    color: #808080;
    font-size: 10.5px;
    border: none;
    background: transparent;
    width: 100%;
    text-align: left;
    font-family: inherit;
  }

  .cpanel-row--clickable { cursor: pointer; }

  .cpanel-row--clickable:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--foreground, #d4d4d4);
  }

  .cpanel-row--clickable:focus-visible {
    outline: 1px solid var(--ring, #569cd6);
    outline-offset: -1px;
  }

  .cpanel-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .cpanel-label { flex: 1; }

  .cpanel-tok {
    font-variant-numeric: tabular-nums;
    color: var(--muted-foreground, #808080);
    flex-shrink: 0;
  }

  .cpanel-row--header .cpanel-tok { color: var(--foreground, #d4d4d4); }

  .cpanel-open-icon {
    font-size: 10px;
    color: #569cd6;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.1s;
  }

  .cpanel-open-icon--show { opacity: 1; }

  .cpanel-row--clickable:hover .cpanel-open-icon { opacity: 1; }

  .cpanel-chevron {
    font-size: 9px;
    color: #808080;
    flex-shrink: 0;
  }

  .cpanel-row--file {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-left: 24px;
    min-height: 18px;
    width: 100%;
    border: none;
    background: transparent;
    color: #808080;
    font-size: 10.5px;
    text-align: left;
    cursor: pointer;
    border-radius: 3px;
    font-family: inherit;
  }

  .cpanel-row--file:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--foreground, #d4d4d4);
  }

  .cpanel-row--file:hover .cpanel-open-icon { opacity: 1; }

  .cpanel-row--file:focus-visible {
    outline: 1px solid var(--ring, #569cd6);
    outline-offset: -1px;
  }

  .cpanel-divider {
    height: 1px;
    background: #3c3c3c;
    margin: 6px 0;
  }

  .cpanel-row--total {
    font-weight: 500;
    color: var(--foreground, #d4d4d4);
  }

  .cpanel-row--reserve { color: #606060; }

  .context-breakdown-popover {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    min-width: 240px;
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--foreground, #d4d4d4);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    z-index: 100;
    pointer-events: none;
  }

  .breakdown-title {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #808080;
    margin-bottom: 8px;
  }

  .breakdown-group {
    margin-bottom: 4px;
  }

  .breakdown-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 18px;
  }

  .breakdown-row--header { font-weight: 500; }

  .breakdown-row--sub {
    padding-left: 16px;
    color: #808080;
    font-size: 10.5px;
  }

  .breakdown-row--total { font-weight: 500; margin-top: 2px; }
  .breakdown-row--reserve { color: #606060; }

  .breakdown-label { flex: 1; }

  .breakdown-tok {
    font-variant-numeric: tabular-nums;
    color: var(--muted-foreground, #808080);
    flex-shrink: 0;
  }

  .breakdown-row--header .breakdown-tok,
  .breakdown-row--total .breakdown-tok { color: var(--foreground, #d4d4d4); }

  .breakdown-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .breakdown-dot--system  { background: var(--context-system-prompts); }
  .breakdown-dot--tools   { background: var(--context-tool-schemas); }
  .breakdown-dot--history { background: var(--context-chat-history); }

  .breakdown-divider {
    height: 1px;
    background: #3c3c3c;
    margin: 6px 0;
  }

  .context-meta {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    min-height: 22px;
    font-size: 10px;
    line-height: 14px;
    color: var(--muted-foreground);
  }

  .context-meta-start {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: 6px;
    min-width: 0;
    margin-bottom: 2px;
    font-size: 10px;
    line-height: 14px;
    color: var(--muted-foreground);
  }

  .context-meta-sep {
    flex-shrink: 0;
    opacity: 0.5;
  }

  .context-monthly-usage,
  .context-chat-tok {
    display: inline-flex;
    align-items: center;
    min-height: 14px;
    min-width: 0;
    text-align: left;
    font-variant-numeric: tabular-nums;
    line-height: 14px;
    user-select: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .context-monthly-usage {
    color: #9cdcfe;
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
    font: inherit;
    cursor: pointer;
    transition:
      color var(--motion-fast, 140ms),
      background-color var(--motion-fast, 140ms);
  }

  .context-monthly-usage:hover {
    color: #b8e6ff;
    background: color-mix(in srgb, var(--foreground) 6%, transparent);
    border-radius: 4px;
  }

  .context-monthly-usage--balance {
    color: #c5e478;
  }

  .context-monthly-usage--balance:hover {
    color: #d4f088;
  }

  .context-budget-row {
    display: inline-flex;
    align-items: center;
    align-self: center;
    gap: 2px;
    flex-shrink: 0;
    min-height: 22px;
  }

  .context-budget-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .context-compact-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #a3a3a3;
    cursor: pointer;
    flex-shrink: 0;
  }

  .context-compact-btn:hover {
    color: #e8e8e8;
    background: rgba(255, 255, 255, 0.08);
  }

  .context-compact-btn:focus-visible {
    outline: 1px solid var(--ring);
    outline-offset: 2px;
  }

  .context-compact-btn--inactive {
    opacity: 0.4;
    cursor: default;
  }

  .context-compact-btn--inactive:hover {
    color: #a3a3a3;
    background: transparent;
  }

  .context-numbers {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    min-height: 14px;
    line-height: 14px;
    gap: 0;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    font: inherit;
    font-size: inherit;
    font-variant-numeric: tabular-nums;
    color: inherit;
    cursor: pointer;
    text-align: right;
    text-decoration: none;
    border-radius: 0;
    box-shadow: none;
    appearance: none;
    -webkit-appearance: none;
  }

  .context-numbers-text {
    display: inline-flex;
    align-items: center;
    min-height: 14px;
    line-height: 14px;
    min-width: 0;
  }

  .context-numbers--static {
    display: inline-flex;
    align-items: center;
    min-height: 14px;
    line-height: 14px;
    cursor: default;
    pointer-events: none;
  }

  .context-numbers--warning { color: #d4a017; }
  .context-numbers--critical { color: #f44747; }

  .context-hint {
    color: #858585;
  }

  .context-numbers:hover {
    color: var(--foreground);
  }

  .context-numbers:focus-visible {
    outline: 1px solid var(--ring);
    outline-offset: 2px;
  }

  .context-budget-menu {
    position: absolute;
    right: 0;
    bottom: calc(100% + 6px);
    z-index: 70;
    min-width: 140px;
    max-height: 220px;
    overflow-y: auto;
    padding: 4px 0;
    /* Opaque so translucent themes (e.g. Dark Dracula) don't show through. */
    background: var(--chat-model-popup-bg, #252526);
    border: 1px solid #3c3c3c;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }

  .context-budget-option {
    display: block;
    width: 100%;
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: #d4d4d4;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
  }

  .context-budget-option:hover {
    background: #2a2d2e;
  }

  .context-budget-option.current {
    background: #1a3a52;
    color: #e0e0e0;
  }
</style>
