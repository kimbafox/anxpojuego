(function () {
  let initialized = false;

  function setupInputHandlers(ctx) {
    if (initialized) {
      return;
    }

    const {
      state,
      canvas,
      hasEffect,
      startGame,
      restartGame,
      fireBullet,
      showPickupBanner,
      statusTextEl,
      POWERUP_DEFS,
      clamp,
      documentRef,
      body
    } = ctx;

    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        state.keys.add(key);
      }

      if (state.running && state.started && key === 'r' && !hasEffect('navelo') && !hasEffect('pasmor') && !hasEffect('voculos')) {
        const now = performance.now();
        if (state.voculosCharges > 0) {
          state.voculosCharges -= 1;
          state.effectsUntil.voculos = now + POWERUP_DEFS.voculos.duration;
          body.classList.add('voculos-mode');
          showPickupBanner('VOCULOS ACTIVADO', now);
          statusTextEl.textContent = 'Estado: VOCULOS laser activo';
          e.preventDefault();
          return;
        }

        if (state.pasmorCharges > 0) {
          state.pasmorCharges -= 1;
          state.effectsUntil.pasmor = now + POWERUP_DEFS.pasmor.duration;
          showPickupBanner('PASMOR ACTIVADO', now);
          statusTextEl.textContent = 'Estado: PASMOR activo';
          e.preventDefault();
          return;
        }

        if (state.naveloCharges > 0) {
          state.naveloCharges -= 1;
          state.effectsUntil.navelo = now + POWERUP_DEFS.navelo.duration;
          body.classList.add('navelo-mode');
          showPickupBanner('NAVELO ACTIVADO', now);
          statusTextEl.textContent = 'Estado: Modo NAVELO activo';
          e.preventDefault();
          return;
        }
      }

      if (!state.running && state.started && key === 'r') {
        restartGame();
      }

      if (!state.started && key === 'enter') {
        startGame();
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      state.keys.delete(key);
    });

    documentRef.addEventListener('pointerlockchange', () => {
      if (documentRef.pointerLockElement !== canvas) {
        state.mouse.x = clamp(state.mouse.x, 0, canvas.width);
        state.mouse.y = clamp(state.mouse.y, 0, canvas.height);
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (documentRef.pointerLockElement === canvas) {
        state.mouse.x = clamp(state.mouse.x + e.movementX, 0, canvas.width);
        state.mouse.y = clamp(state.mouse.y + e.movementY, 0, canvas.height);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      state.mouse.x = e.clientX - rect.left;
      state.mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', (e) => {
      if (documentRef.pointerLockElement !== canvas && canvas.requestPointerLock) {
        canvas.requestPointerLock();
      }

      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const x = documentRef.pointerLockElement === canvas ? state.mouse.x : e.clientX - rect.left;
      const y = documentRef.pointerLockElement === canvas ? state.mouse.y : e.clientY - rect.top;
      fireBullet(x, y);
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    initialized = true;
  }

  window.GameInputSystem = {
    setupInputHandlers
  };
})();
