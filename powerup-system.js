(function () {
  function formatBonusDuration(def) {
    if (!def || !def.duration) {
      return 'instantaneo';
    }
    return `${Math.floor(def.duration / 1000)}s`;
  }

  function renderBonusGuide(ctx) {
    const { bonusGuideListEl, defs, descriptions } = ctx;
    if (!bonusGuideListEl) {
      return;
    }

    bonusGuideListEl.innerHTML = defs.map((def) => `
    <article class="bonus-guide-item">
      <img src="${def.src}" alt="${def.display}">
      <div class="meta">
        <div class="name">${def.display}</div>
        <div class="desc">${descriptions[def.type] || ''}</div>
      </div>
      <div class="duration">${formatBonusDuration(def)}</div>
    </article>
  `).join('');
  }

  function pickRandomPowerupType(rand) {
    const weighted = [
      { type: 'kimbaPlus', weight: 20 },
      { type: 'double', weight: 25 },
      { type: 'bigBullets', weight: 25 },
      { type: 'speed', weight: 25 },
      { type: 'navelo', weight: 25 },
      { type: 'pasmor', weight: 25 },
      { type: 'voculos', weight: 25 },
      { type: 'plebarmor', weight: 25 }
    ];

    const total = weighted.reduce((sum, item) => sum + item.weight, 0);
    let roll = rand(0, total);
    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) {
        return item.type;
      }
    }

    return weighted[weighted.length - 1].type;
  }

  function spawnPowerup(ctx) {
    const {
      state,
      rand,
      canvas,
      getObstaclePolygon,
      circleIntersectsPolygon,
      distSq,
      player,
      powerupImageByType,
      POWERUP_DEFS
    } = ctx;

    if (!state.running || state.boss) {
      return;
    }

    const pickType = pickRandomPowerupType(rand);
    const pickDef = POWERUP_DEFS[pickType];
    const pickImg = powerupImageByType.get(pickType);
    const life = 15;
    let x = rand(70, canvas.width - 70);
    let y = rand(70, canvas.height - 70);
    let attempts = 0;

    while (attempts < 220) {
      const blockedByObstacle = state.obstacles.some((obstacle) => {
        const polygon = getObstaclePolygon(obstacle);
        return circleIntersectsPolygon(x, y, 26, polygon);
      });

      const tooCloseToPlayer = distSq({ x, y }, player) < 120 * 120;
      if (!blockedByObstacle && !tooCloseToPlayer) {
        break;
      }

      x = rand(70, canvas.width - 70);
      y = rand(70, canvas.height - 70);
      attempts += 1;
    }

    const p = {
      type: pickType,
      def: pickDef,
      img: pickImg,
      x,
      y,
      radius: 22,
      bornAt: performance.now(),
      expireAt: performance.now() + life * 1000,
      blinkAt: performance.now() + (life - 3) * 1000
    };

    state.powerups.push(p);
  }

  function activatePower(ctx, type, now) {
    const {
      POWERUP_DEFS,
      MAX_LIVES,
      state,
      updatePips,
      showPickupBanner,
      showMegaBonusBanner,
      statusTextEl,
      playKimbaDistortedAudio,
      playKimbaPlusAudio,
      playPlusMutadoAudio,
      documentRef
    } = ctx;

    const def = POWERUP_DEFS[type];
    if (!def) {
      return;
    }

    if (type === 'kimbaPlus') {
      if (playKimbaPlusAudio) {
        playKimbaPlusAudio();
      }
      if (showMegaBonusBanner) {
        showMegaBonusBanner('VIDA EXTRA', now);
      }
      state.kimbaPlusGoldUntil = now + 2000;
      state.kimbaSpectroUntil = now + 3000;
      if (documentRef && documentRef.body) {
        documentRef.body.classList.add('kimba-plus-mode');
      }
      if (state.lives < MAX_LIVES) {
        state.lives += 1;
        updatePips();
        showPickupBanner('KIMBA PLUS: +1 VIDA', now);
      } else {
        state.score += 3;
        showPickupBanner('KIMBA PLUS: +3 PUNTOS', now);
      }
      statusTextEl.textContent = 'Estado: Refuerzo vital aplicado';
      return;
    }

    if (type === 'navelo') {
      if (playPlusMutadoAudio) {
        playPlusMutadoAudio();
      }
      state.naveloCharges += 1;
      showPickupBanner('NAVELO LISTO: PRESIONA R', now);
      statusTextEl.textContent = 'Estado: NAVELO cargado';
      return;
    }

    if (type === 'pasmor') {
      if (playPlusMutadoAudio) {
        playPlusMutadoAudio();
      }
      state.pasmorCharges += 1;
      showPickupBanner('PASMOR LISTO: PRESIONA R', now);
      statusTextEl.textContent = 'Estado: PASMOR cargado';
      return;
    }

    if (type === 'voculos') {
      if (playPlusMutadoAudio) {
        playPlusMutadoAudio();
      }
      state.voculosCharges += 1;
      showPickupBanner('VOCULOS LISTO: PRESIONA R', now);
      statusTextEl.textContent = 'Estado: VOCULOS cargado';
      return;
    }

    if (type === 'plebarmor') {
      if (playPlusMutadoAudio) {
        playPlusMutadoAudio();
      }
      state.shieldCharges = 1;
      showPickupBanner('PLEBARMOR ACTIVO: ESCUDO x1', now);
      statusTextEl.textContent = 'Estado: Escudo activo';
      return;
    }

    playKimbaDistortedAudio();

    state.effectsUntil[type] = now + def.duration;
    showPickupBanner(def.display.toUpperCase(), now);
    statusTextEl.textContent = `Estado: Potenciador activo (${def.display})`;
  }

  function updatePowerups(ctx, dt, now) {
    const {
      state,
      rand,
      spawnPowerup,
      distSq,
      player,
      activatePower,
      pickupBannerEl,
      waveBannerEl,
      hasEffect,
      statusTextEl,
      documentRef,
      isBossActive
    } = ctx;

    state.powerupTimer += dt;
    if (state.powerupTimer >= state.nextPowerupIn) {
      state.powerupTimer = 0;
      state.nextPowerupIn = rand(7, 19);
      spawnPowerup();
    }

    for (let i = state.powerups.length - 1; i >= 0; i -= 1) {
      const p = state.powerups[i];
      if (now > p.expireAt) {
        state.powerups.splice(i, 1);
        continue;
      }

      if (distSq(p, player) < (p.radius + player.radius) ** 2) {
        if (p.type === 'voculos' && (state.pasmorCharges > 0 || hasEffect('pasmor'))) {
          continue;
        }
        activatePower(p.type, now);
        state.powerups.splice(i, 1);
      }
    }

    if (pickupBannerEl && state.bannerUntil > 0 && now > state.bannerUntil) {
      pickupBannerEl.classList.remove('show');
      state.bannerUntil = 0;
    }

    if (waveBannerEl && state.waveBannerUntil > 0 && now > state.waveBannerUntil) {
      waveBannerEl.classList.remove('show', 'pulse');
      state.waveBannerUntil = 0;
      state.waveBannerText = '';
    }

    if (!hasEffect('navelo')) {
      documentRef.body.classList.remove('navelo-mode');
    }
    if (!hasEffect('voculos')) {
      documentRef.body.classList.remove('voculos-mode');
    }
    if (state.kimbaPlusGoldUntil > 0 && now > state.kimbaPlusGoldUntil) {
      state.kimbaPlusGoldUntil = 0;
      documentRef.body.classList.remove('kimba-plus-mode');
    }

    if (!hasEffect('double') && !hasEffect('bigBullets') && !hasEffect('speed') && !hasEffect('navelo') && !hasEffect('pasmor') && !hasEffect('voculos')) {
      if (
        statusTextEl.textContent.includes('Potenciador activo') ||
        statusTextEl.textContent.includes('NAVELO') ||
        statusTextEl.textContent.includes('PASMOR') ||
        statusTextEl.textContent.includes('VOCULOS')
      ) {
        statusTextEl.textContent = isBossActive() ? 'Estado: JEFE FINAL DETECTADO' : 'Estado: En combate';
      }
    }
  }

  window.GamePowerupSystem = {
    formatBonusDuration,
    renderBonusGuide,
    pickRandomPowerupType,
    spawnPowerup,
    activatePower,
    updatePowerups
  };
})();
