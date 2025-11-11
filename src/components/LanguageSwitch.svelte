<script lang="ts">
  import { onMount } from 'svelte';

  const supportedLanguages = [
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
  ];

  let currentLang = 'ja';
  let isOpen = false;

  onMount(() => {
    // Cookieから言語を取得
    const langCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('lang='))
      ?.split('=')[1];
    
    if (langCookie && supportedLanguages.some(l => l.code === langCookie)) {
      currentLang = langCookie;
    } else {
      // Cookieがない場合はブラウザの言語設定を確認
      const browserLang = navigator.language.split('-')[0];
      if (supportedLanguages.some(l => l.code === browserLang)) {
        currentLang = browserLang;
      } else {
        currentLang = 'ja'; // デフォルトは日本語
      }
      // Cookieに保存（初回ロード時はリロードしない）
      document.cookie = `lang=${currentLang}; path=/; max-age=31536000`; // 1年間有効
    }
    
    // HTMLのlang属性を更新（初回ロード時のみ）
    document.documentElement.lang = currentLang;
    
    // クリックアウトサイドで閉じる
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.language-switcher')) {
        isOpen = false;
      }
    }
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  function applyLanguage(lang: string) {
    currentLang = lang;
    document.cookie = `lang=${lang}; path=/; max-age=31536000`;
    
    // HTMLのlang属性を更新
    document.documentElement.lang = lang;
    
    // ページをリロードして言語を反映
    window.location.reload();
  }

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function selectLanguage(lang: string) {
    if (lang !== currentLang) {
      applyLanguage(lang);
    }
    isOpen = false;
  }
</script>

<div class="language-switcher relative">
  <button
    on:click={toggleDropdown}
    class="btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90 flex items-center justify-center"
    aria-label="言語を切り替える"
    aria-expanded={isOpen}
  >
    <span class="text-xl">
      {supportedLanguages.find(l => l.code === currentLang)?.flag || '🌐'}
    </span>
  </button>
  
  {#if isOpen}
    <div class="absolute top-full right-0 mt-2 card-base rounded-lg p-2 shadow-lg z-50 w-[180px]">
      {#each supportedLanguages as lang}
        <button
          on:click={() => selectLanguage(lang.code)}
          class:list={[
            "w-full px-4 py-2.5 rounded-lg text-left transition flex items-center gap-3",
            {
              "bg-[var(--btn-plain-bg-hover)]": currentLang === lang.code,
              "hover:bg-[var(--btn-plain-bg-hover)]": currentLang !== lang.code,
              "active:bg-[var(--btn-plain-bg-active)]": true,
            }
          ]}
        >
          <span class="text-xl flex-shrink-0 w-6 text-center leading-none">{lang.flag}</span>
          <span class="text-sm font-medium text-black/75 dark:text-white/75 flex-1 text-left">{lang.name}</span>
          {#if currentLang === lang.code}
            <span class="text-[var(--primary)] flex-shrink-0 text-base leading-none">✓</span>
          {:else}
            <span class="flex-shrink-0 w-4"></span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style lang="css">
  .language-switcher {
    position: relative;
  }
</style>
