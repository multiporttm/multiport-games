/* Site's own human-verification widget (slide-to-verify puzzle), used on
   login/signup in place of a third-party CAPTCHA service. Mirrors the
   data-callback / data-expired-callback pattern the rest of the site
   already used for Turnstile, so host pages just implement those two
   global callbacks. */
(function () {
  const instances = {};

  function init(mountId) {
    if (instances[mountId]) { instances[mountId].loadChallenge(); return; }

    const mount = document.getElementById(mountId);
    if (!mount) return;
    const onVerified = mount.dataset.callback ? window[mount.dataset.callback] : null;
    const onCleared = mount.dataset.expiredCallback ? window[mount.dataset.expiredCallback] : null;

    mount.innerHTML = `
      <div id="hv-track">
        <div id="hv-notch"></div>
        <div id="hv-handle">🧩</div>
      </div>
      <div id="hv-label">Slide to verify you're human</div>`;

    const track = document.getElementById('hv-track');
    const notch = document.getElementById('hv-notch');
    const handle = document.getElementById('hv-handle');
    const label = document.getElementById('hv-label');

    let challenge = null;
    let dragging = false, dragBase = 0, moveCount = 0, startTime = 0, lastPct = 0;
    let deltas = [], prevPct = 0;

    async function loadChallenge() {
      if (onCleared) onCleared();
      handle.classList.remove('verified');
      handle.textContent = '🧩';
      label.textContent = "Slide to verify you're human";
      setHandlePx(0);
      try {
        const res = await fetch('/api/verify-challenge');
        const data = await res.json();
        if (!res.ok) { label.textContent = data.error || 'Verification unavailable.'; return; }
        challenge = data;
        const trackW = track.clientWidth - handle.offsetWidth;
        notch.style.left = (data.target / 100 * trackW) + 'px';
      } catch {
        label.textContent = 'Could not load verification. Refresh to try again.';
      }
    }

    function setHandlePx(px) {
      const maxX = track.clientWidth - handle.offsetWidth;
      px = Math.max(0, Math.min(maxX, px));
      handle.style.left = px + 'px';
      return maxX > 0 ? (px / maxX * 100) : 0;
    }

    function pointerX(e) {
      return e.touches ? e.touches[0].clientX : e.clientX;
    }

    function startDrag(e) {
      if (handle.classList.contains('verified')) return;
      dragging = true; moveCount = 0; startTime = Date.now();
      deltas = []; prevPct = 0;
      dragBase = pointerX(e) - handle.offsetLeft;
    }
    function moveDrag(e) {
      if (!dragging) return;
      e.preventDefault();
      moveCount++;
      lastPct = setHandlePx(pointerX(e) - dragBase);
      deltas.push(lastPct - prevPct);
      prevPct = lastPct;
    }
    async function endDrag() {
      if (!dragging) return;
      dragging = false;
      const elapsedMs = Date.now() - startTime;
      if (!challenge) return;
      // A scripted drag that jumps straight to the target tends to move in
      // suspiciously uniform steps; real drags have some jitter. This is a
      // heuristic, not real bot detection — easy for a determined script to
      // fake, but it filters naive automation that just sets the position.
      const meanDelta = deltas.reduce((a, b) => a + b, 0) / (deltas.length || 1);
      const moveVariance = deltas.reduce((a, d) => a + (d - meanDelta) ** 2, 0) / (deltas.length || 1);
      const webdriver = !!navigator.webdriver;
      try {
        const res = await fetch('/api/verify-human', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challengeToken: challenge.token, finalPos: lastPct, moveCount, elapsedMs, moveVariance, webdriver }),
        });
        const data = await res.json();
        if (res.ok && data.verifiedToken) {
          handle.classList.add('verified');
          handle.textContent = '✓';
          label.textContent = 'Verified!';
          if (onVerified) onVerified(data.verifiedToken);
        } else {
          label.textContent = (data.error || 'Try again') + ' — slide to the marked zone.';
          loadChallenge();
        }
      } catch {
        label.textContent = 'Could not verify. Try again.';
        loadChallenge();
      }
    }

    handle.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', endDrag);
    handle.addEventListener('touchstart', startDrag, { passive: true });
    document.addEventListener('touchmove', moveDrag, { passive: false });
    document.addEventListener('touchend', endDrag);

    instances[mountId] = { loadChallenge };
    loadChallenge();
  }

  function refresh(mountId) {
    if (instances[mountId]) instances[mountId].loadChallenge();
    else init(mountId);
  }

  window.HumanVerify = { init, refresh };
})();
