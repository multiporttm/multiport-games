/* Shared in-game translation helper. Each game page includes this before its own
   script. It infers the game's id from the URL, fetches that language's per-game
   string table (languages/games-<lang>.json), and exposes I18N.t(key, fallback)
   for both DOM text (auto-applied to [data-i18n] elements) and canvas-drawn text
   (games call I18N.t() directly wherever they'd otherwise use a literal string). */
(function(){
  const LANGS = ['en-us','es','fr','de','pt'];
  function currentLang(){
    const saved = localStorage.getItem('mp_lang');
    return LANGS.includes(saved) ? saved : 'en-us';
  }
  function gameId(){
    const m = location.pathname.match(/\/games\/([a-z0-9]+)\.html?$/i);
    return m ? m[1] : null;
  }

  const lang = currentLang();
  const id = gameId();
  let dict = {};

  function applyDom(){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      const val = dict[key];
      if(val != null) el.innerHTML = val; // our own translated JSON, not user input — safe
    });
  }

  const ready = (lang === 'en-us' || !id)
    ? Promise.resolve()
    : fetch(`../languages/games-${lang}.json`)
        .then(r => r.ok ? r.json() : {})
        .then(all => { dict = all[id] || {}; applyDom(); })
        .catch(() => {});

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => ready.then(applyDom));
  } else {
    ready.then(applyDom);
  }

  window.I18N = {
    lang, gameId: id, ready,
    t(key, fallback){ return dict[key] != null ? dict[key] : fallback; },
  };
})();
