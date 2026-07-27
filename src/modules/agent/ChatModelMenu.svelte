<script lang="ts">
  import { floatingPanel, portal } from "$lib/actions/floatingPanel";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Settings from "@lucide/svelte/icons/settings";
  import type { ModelConfig, SettingsState } from "$lib/stores/settings";
  import "./modelPopup.css";

  type MenuRow = { id: string; name: string };

  interface Props {
    /** Anchor element the floating popup positions against (the trigger wrap). */
    getAnchor: () => HTMLElement | undefined;
    chatBackend: SettingsState["chatBackend"];
    selectedModel: string;
    ollamaRows: MenuRow[];
    llamacppRows: ModelConfig[];
    anthropicRows: MenuRow[];
    deepseekRows: MenuRow[];
    glmRows: MenuRow[];
    kimiRows: MenuRow[];
    showOllama: boolean;
    showAnthropic: boolean;
    showDeepseek: boolean;
    showGlm: boolean;
    showKimi: boolean;
    lastTokPerSec: number | null;
    onClose: () => void;
    onRefreshOllama: () => void;
    onOpenSettings?: () => void;
    onPickOllama: (id: string) => void;
    onPickLlamacpp: (id: string) => void;
    onPickAnthropic: (id: string) => void;
    onPickDeepseek: (id: string) => void;
    onPickGlm: (id: string) => void;
    onPickKimi: (id: string) => void;
  }

  let {
    getAnchor,
    chatBackend,
    selectedModel,
    ollamaRows,
    llamacppRows,
    anthropicRows,
    deepseekRows,
    glmRows,
    kimiRows,
    showOllama,
    showAnthropic,
    showDeepseek,
    showGlm,
    showKimi,
    lastTokPerSec,
    onClose,
    onRefreshOllama,
    onOpenSettings,
    onPickOllama,
    onPickLlamacpp,
    onPickAnthropic,
    onPickDeepseek,
    onPickGlm,
    onPickKimi,
  }: Props = $props();

  let popupEl: HTMLDivElement | undefined = $state();

  // Owns its own outside-click while mounted (the popup is only mounted while
  // open). Clicks on the trigger anchor are ignored so its toggle handles close.
  $effect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      const anchor = getAnchor();
      if (anchor && anchor.contains(t)) return;
      if (popupEl && popupEl.contains(t)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  });
</script>

<div
  class="model-popup"
  role="listbox"
  aria-label="Choose model"
  bind:this={popupEl}
  use:portal
  use:floatingPanel={{ getAnchor }}
>
  <div class="model-popup-section">
    <div class="model-popup-section-head">
      <span>Ollama</span>
      <div class="model-popup-actions">
        <button
          type="button"
          class="model-popup-action-btn"
          onclick={() => onRefreshOllama()}
          title="Refresh Ollama models"
          aria-label="Refresh Ollama models"
        >
          <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button
          type="button"
          class="model-popup-action-btn"
          onclick={() => {
            onClose();
            onOpenSettings?.();
          }}
          title="Provider settings"
          aria-label="Provider settings"
        >
          <Settings size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </div>
    {#if showOllama && ollamaRows.length > 0}
      {#each ollamaRows as row (row.id)}
        <button
          type="button"
          role="option"
          class="model-popup-option"
          class:model-popup-option--current={chatBackend === "ollama" &&
            selectedModel === row.id}
          aria-selected={chatBackend === "ollama" && selectedModel === row.id}
          onclick={() => onPickOllama(row.id)}
        >
          {row.name}
        </button>
      {/each}
    {:else}
      <span class="model-popup-unavailable">No models available</span>
    {/if}
  </div>
  <div class="model-popup-section">
    <div class="model-popup-section-head">
      <span>llama.cpp</span>
    </div>
    {#if llamacppRows.length > 0}
      {#each llamacppRows as row (row.id)}
        <button
          type="button"
          role="option"
          class="model-popup-option"
          class:model-popup-option--current={chatBackend === "llamacpp" &&
            selectedModel === row.id}
          aria-selected={chatBackend === "llamacpp" && selectedModel === row.id}
          onclick={() => onPickLlamacpp(row.id)}
        >
          {row.name}
        </button>
      {/each}
    {:else}
      <span class="model-popup-unavailable">No models available</span>
    {/if}
  </div>
  <div class="model-popup-section">
    <div class="model-popup-section-head">
      <span>Anthropic</span>
    </div>
    {#if showAnthropic && anthropicRows.length > 0}
      {#each anthropicRows as row (row.id)}
        <button
          type="button"
          role="option"
          class="model-popup-option"
          class:model-popup-option--current={chatBackend === "anthropic" &&
            selectedModel === row.id}
          aria-selected={chatBackend === "anthropic" && selectedModel === row.id}
          onclick={() => onPickAnthropic(row.id)}
        >
          {row.name}
        </button>
      {/each}
    {:else}
      <span class="model-popup-unavailable">No models available</span>
    {/if}
  </div>
  <div class="model-popup-section">
    <div class="model-popup-section-head">
      <span>DeepSeek</span>
    </div>
    {#if showDeepseek && deepseekRows.length > 0}
      {#each deepseekRows as row (row.id)}
        <button
          type="button"
          role="option"
          class="model-popup-option"
          class:model-popup-option--current={chatBackend === "deepseek" &&
            selectedModel === row.id}
          aria-selected={chatBackend === "deepseek" && selectedModel === row.id}
          onclick={() => onPickDeepseek(row.id)}
        >
          {row.name}
        </button>
      {/each}
    {:else}
      <span class="model-popup-unavailable">No models available</span>
    {/if}
  </div>
  <div class="model-popup-section">
    <div class="model-popup-section-head">
      <span>GLM</span>
    </div>
    {#if showGlm && glmRows.length > 0}
      {#each glmRows as row (row.id)}
        <button
          type="button"
          role="option"
          class="model-popup-option"
          class:model-popup-option--current={chatBackend === "glm" &&
            selectedModel === row.id}
          aria-selected={chatBackend === "glm" && selectedModel === row.id}
          onclick={() => onPickGlm(row.id)}
        >
          {row.name}
        </button>
      {/each}
    {:else}
      <span class="model-popup-unavailable">No models available</span>
    {/if}
  </div>
  <div class="model-popup-section">
    <div class="model-popup-section-head">
      <span>Kimi</span>
    </div>
    {#if showKimi && kimiRows.length > 0}
      {#each kimiRows as row (row.id)}
        <button
          type="button"
          role="option"
          class="model-popup-option"
          class:model-popup-option--current={chatBackend === "kimi" &&
            selectedModel === row.id}
          aria-selected={chatBackend === "kimi" && selectedModel === row.id}
          onclick={() => onPickKimi(row.id)}
        >
          {row.name}
        </button>
      {/each}
    {:else}
      <span class="model-popup-unavailable">No models available</span>
    {/if}
  </div>
  {#if lastTokPerSec != null && lastTokPerSec > 0}
    <p class="model-popup-foot">
      Last reply · {lastTokPerSec >= 100
        ? Math.round(lastTokPerSec)
        : lastTokPerSec >= 10
          ? lastTokPerSec.toFixed(1)
          : lastTokPerSec.toFixed(2)} tok/s
    </p>
  {/if}
</div>
