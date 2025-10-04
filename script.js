(function(){
    'use strict';
    /* ==========================================================
       PERSISTENCIA
    ========================================================== */
    const LS_PROFILE = 'pc_profile';
    const LS_HISTORY = 'pc_history';
    const saveProfile = (p)=> localStorage.setItem(LS_PROFILE, JSON.stringify(p));
    const loadProfile = ()=> { try{ return JSON.parse(localStorage.getItem(LS_PROFILE)||'{}'); }catch(e){ return {}; } };
    const saveHistory = (h)=> localStorage.setItem(LS_HISTORY, JSON.stringify(h));
    const loadHistory = ()=> { try{ return JSON.parse(localStorage.getItem(LS_HISTORY)||'[]'); }catch(e){ return []; } };

    /* ==========================================================
       UTILIDADES / DOM HELPERS
    ========================================================== */
    const $ = (id)=> document.getElementById(id);
    const px = (v)=> `${v}px`;
    const pastelize = (hex)=>{ const toInt=(p)=> parseInt(p,16); let r=toInt(hex.slice(1,3)), g=toInt(hex.slice(3,5)), b=toInt(hex.slice(5,7)); r=Math.floor((r+255)/2); g=Math.floor((g+255)/2); b=Math.floor((b+255)/2); return `rgb(${r},${g},${b})`; };

    /* ==========================================================
       NAVEGACIÓN ENTRE PANTALLAS
    ========================================================== */
    const screens = { title: $('screen-title'), avatar:$('screen-avatar'), story:$('screen-story'), game:$('screen-game') };
    function hideOverlay(){ const ov=$('overlay'); if(ov) ov.classList.remove('show'); }
    function showScreen(el){
      Object.values(screens).forEach(s=> s.classList.remove('active'));
      el.classList.add('active');
      hideOverlay();
      if(el===screens.title) renderHistory();
      if(el===screens.game){ requestAnimationFrame(()=> updateTileMetrics(true)); }
      renderChips();
    }
    // Exponer helpers globales
    window.pcTo = function(name){ if(screens[name]) showScreen(screens[name]); };
    function beginLevel(index){ try{ updateTileMetrics(true); initLevel(index); }catch(e){ console.warn('pcStart init error', e); } }
    window.pcStart = function(level){
      level = (typeof level==='number')? level : 0;
      showScreen(screens.game);
      requestAnimationFrame(()=> beginLevel(level));
    };

    // Botones navegación
    const btnPlay = $('btnPlay'), btnCustomize=$('btnCustomize');
    const btnAvatarToTitle=$('btnAvatarToTitle'), btnAvatarNext=$('btnAvatarNext');
    const btnStoryBack=$('btnStoryBack'), btnStart=$('btnStart');
    const btnGameToTitle=$('btnGameToTitle');
    const btnSaveAvatar=$('btnSaveAvatar');

    if(btnPlay) btnPlay.addEventListener('click', ()=>{ pcStart(0); });
    if(btnCustomize) btnCustomize.addEventListener('click', ()=>{ pcTo('avatar'); });
    if(btnAvatarToTitle) btnAvatarToTitle.addEventListener('click', ()=>{ autoSaveAvatar(); pcTo('title'); });
    if(btnAvatarNext) btnAvatarNext.addEventListener('click', ()=>{ autoSaveAvatar(); pcTo('story'); });
    if(btnStoryBack) btnStoryBack.addEventListener('click', ()=> pcTo('avatar'));
    if(btnStart) btnStart.addEventListener('click', ()=> pcStart(0));
    if(btnGameToTitle) btnGameToTitle.addEventListener('click', ()=>{ stopTimer(); pcTo('title'); });
    if(btnSaveAvatar) btnSaveAvatar.addEventListener('click', ()=>{ autoSaveAvatar(); alert('Avatar guardado'); });

    /* ==========================================================
       CHIPS DE AVATAR (MINI) Y HISTORIAL
    ========================================================== */
    function avatarSvgMarkup(p, w=36,h=36){
      const skin=p.skin||'#F8D4B8', hair=p.hairColor||'#6B4E3D', eyes=p.eyeColor||'#2B2B2B';
      const style=p.hairStyle||'short', eyesT=p.eyes||'round', mouth=p.mouth||'smile', acc=p.acc||'none';
      return `
        <svg width="${w}" height="${h}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="96" fill="#fff3f8"/>
          <circle cx="100" cy="100" r="60" fill="${skin}"/>
          ${style==='short' ? `<path d="M40,85 Q100,30 160,85 L160,70 Q100,20 40,70 Z" fill="${hair}"/>` : `<path d="M35,85 Q100,30 165,85 L165,145 Q100,175 35,145 Z" fill="${hair}"/>`}
          ${eyesT==='round' ? `<circle cx="78" cy="105" r="6" fill="${eyes}"/><circle cx="122" cy="105" r="6" fill="${eyes}"/>` : `<path d="M65 105 Q78 100 91 105" stroke="#333" stroke-width="3" fill="none"/><path d="M109 105 Q122 100 135 105" stroke="#333" stroke-width="3" fill="none"/>`}
          ${mouth==='smile' ? `<path d="M75 125 Q100 140 125 125" stroke="#c44c6a" stroke-width="5" fill="none" stroke-linecap="round"/>` : `<path d="M70 125 Q100 150 130 125" stroke="#c44c6a" stroke-width="5" fill="#ffc9de" stroke-linecap="round"/>`}
          ${acc==='hat'? `<path d="M60 72 L140 72 L135 62 L65 62 Z" fill="#3a7bd5"/><rect x="80" y="48" width="40" height="18" rx="6" fill="#4facfe"/>` : ''}
        </svg>`;
    }
    function renderChips(){
      const p=loadProfile(); const nick=p.nickname||'Jugador';
      const targets=[{chip:'chipTitle',mini:'miniTitle',label:'nickTitle'},{chip:'chipAvatar',mini:'miniAvatar',label:'nickAvatar'},{chip:'chipStory',mini:'miniStory',label:'nickStory'},{chip:'chipGame',mini:'miniGame',label:'nickGame'}];
      targets.forEach(t=>{ const chip=$(t.chip), mini=$(t.mini), label=$(t.label); if(!chip||!mini||!label) return; label.textContent = nick; chip.style.visibility='visible'; mini.innerHTML = avatarSvgMarkup(p, 36,36); });
    }
    function renderHistory(){
      const container=$('historyContainer'); const history=loadHistory();
      if(!container) return;
      if(!history.length){ container.innerHTML = '<div class="history-empty">Aún no hay partidas. ¡Juega tu primer nivel!</div>'; return; }
      const grid=document.createElement('div'); grid.className='history-list';
      const header=['Fecha','Nivel','Puntaje','Resultado']; header.forEach(h=>{ const d=document.createElement('div'); d.textContent=h; d.style.fontWeight='900'; d.style.background='#fff0f6'; grid.appendChild(d); });
      history.slice(0,12).forEach(it=>{ grid.appendChild(cell(new Date(it.ts).toLocaleString())); grid.appendChild(cell(it.level)); grid.appendChild(cell(Math.round(it.score))); grid.appendChild(cell(it.win?'✅ Ganado':'❌ Perdido')); function cell(txt){ const d=document.createElement('div'); d.textContent=txt; return d; } });
      container.innerHTML=''; container.appendChild(grid);
    }

    /* ==========================================================
       AVATAR BUILDER
    ========================================================== */
    const nickInput=$('nickInput'), selHair=$('selHair'), hairColor=$('hairColor'), selEyes=$('selEyes'), eyeColor=$('eyeColor'), selMouth=$('selMouth'), selAcc=$('selAcc'), skinColor=$('skinColor');
    const avatarSvg=$('avatarSvg');
    function applyAvatarToSvg(p){
      if(!avatarSvg) return;
      avatarSvg.querySelector('#skin').setAttribute('fill', p.skin||'#F8D4B8');
      const hairGroups={short:'#hair_short', long:'#hair_long'}; Object.keys(hairGroups).forEach(k=> avatarSvg.querySelector(hairGroups[k]).style.display = (p.hairStyle||'short')===k? 'block':'none');
      const hairFill = avatarSvg.querySelector((p.hairStyle||'short')==='short' ? '#hairFill' : '#hairFillLong'); hairFill.setAttribute('fill', p.hairColor||'#6B4E3D');
      const eyesGroups={round:'#eyes_round', sleepy:'#eyes_sleepy'}; Object.keys(eyesGroups).forEach(k=> avatarSvg.querySelector(eyesGroups[k]).style.display = (p.eyes||'round')===k? 'block':'none');
      const eyeL=avatarSvg.querySelector('#eyeL'), eyeR=avatarSvg.querySelector('#eyeR'); if(eyeL&&eyeR){ eyeL.setAttribute('fill', p.eyeColor||'#2B2B2B'); eyeR.setAttribute('fill', p.eyeColor||'#2B2B2B'); }
      const mouthGroups={smile:'#mouth_smile', grin:'#mouth_grin'}; Object.keys(mouthGroups).forEach(k=> avatarSvg.querySelector(mouthGroups[k]).style.display = (p.mouth||'smile')===k? 'block':'none');
      avatarSvg.querySelector('#acc_hat').style.display = (p.acc==='hat')? 'block':'none';
    }
    function currentProfileFromControls(){ return { nickname: (nickInput?.value||'').trim()||'Jugador', hairStyle: selHair?.value||'short', hairColor: hairColor?.value||'#6B4E3D', eyes: selEyes?.value||'round', eyeColor: eyeColor?.value||'#2B2B2B', mouth: selMouth?.value||'smile', acc: selAcc?.value||'none', skin: skinColor?.value||'#F8D4B8' }; }
    function loadControlsFromProfile(){ const p=loadProfile(); if(nickInput) nickInput.value=p.nickname||''; if(selHair) selHair.value=p.hairStyle||'short'; if(hairColor) hairColor.value=p.hairColor||'#6B4E3D'; if(selEyes) selEyes.value=p.eyes||'round'; if(eyeColor) eyeColor.value=p.eyeColor||'#2B2B2B'; if(selMouth) selMouth.value=p.mouth||'smile'; if(selAcc) selAcc.value=p.acc||'none'; if(skinColor) skinColor.value=p.skin||'#F8D4B8'; applyAvatarToSvg(p); }
    function autoSaveAvatar(){ const p=currentProfileFromControls(); saveProfile(p); renderChips(); }
    [nickInput, selHair, hairColor, selEyes, eyeColor, selMouth, selAcc, skinColor].forEach(el=> el && el.addEventListener('input', ()=> applyAvatarToSvg( currentProfileFromControls() )));

    // Inicializa chips/controles en arranque
    loadControlsFromProfile(); renderChips(); renderHistory();

    /* ==========================================================
       JUEGO (match-3)
    ========================================================== */
    const LEVELS = [
      { id:1,  target:180,  time:70 },
      { id:2,  target:240,  time:65 },
      { id:3,  target:320,  time:60 },
      { id:4,  target:400,  time:58 },
      { id:5,  target:490,  time:55 },
      { id:6,  target:580,  time:50 },
      { id:7,  target:680,  time:45 },
      { id:8,  target:800,  time:40 },
      { id:9,  target:940,  time:35 },
      { id:10, target:1120, time:30 }
    ];

    const FRUITS = [
      {emoji:'🍎', name:'manzana', color:'#ff6b6b'},
      {emoji:'🍌', name:'banana',  color:'#ffe66d'},
      {emoji:'🍇', name:'uvas',    color:'#9d4edd'},
      {emoji:'🍊', name:'naranja', color:'#ffa94d'},
      {emoji:'🥝', name:'kiwi',    color:'#b5651d'},
      {emoji:'🍐', name:'pera',    color:'#a3de83'}
    ];
    const SPECIALS = { RAINBOW:{ type:'rainbow', emoji:'🌈' }, BOMB:{ type:'bomb', emoji:'💣', penalty:5 } };
    const DIFFICULTY = { bombMax:2, bombProbBase:0.05, rainbowMax:1, rainbowProbBase:0.035 };

    // DOM del juego
    const rootEl = document.documentElement;
    const size = 8;
    const boardEl = $('board');
    const gridBgEl = $('grid-bg');
    const scoreEl = $('score');
    const timeEl = $('time');
    const levelEl = $('level');
    const targetEl = $('target');
    const livesEl = $('lives');
    const restartBtn = $('restart');
    const meterFill = $('meterFill');
    const pHammer = $('pHammer');
    const pShuffle= $('pShuffle');
    const pColor  = $('pColor');
    const comboFx = $('comboFx');
    const overlay = $('overlay');
    const modalTitle = $('modalTitle');
    const modalText = $('modalText');
    const modalIcon = $('modalIcon');
    const modalActions = $('modalActions');
    const testLog = $('test-log');

    const readCssNumber = (prop)=> {
      const raw = getComputedStyle(rootEl).getPropertyValue(prop).trim();
      const num = parseFloat(raw);
      return Number.isNaN(num) ? NaN : num;
    };

    let tilePx = readCssNumber('--tile');
    if(!Number.isFinite(tilePx)) tilePx = 54;
    let gap = readCssNumber('--gap');
    if(!Number.isFinite(gap)) gap = 6;

    function refreshTilePositions(){
      if(!boardEl) return;
      boardEl.querySelectorAll('.tile').forEach(el=>{
        const r = Number(el.dataset.row);
        const c = Number(el.dataset.col);
        el.style.left = px(c * tilePx + gap / 2);
        el.style.top = px(r * tilePx + gap / 2);
      });
    }
    function updateTileMetrics(force){
      const cssTile = readCssNumber('--tile');
      const cssGap = readCssNumber('--gap');
      const boardRect = boardEl ? boardEl.getBoundingClientRect() : null;
      const fallbackTile = boardRect && boardRect.width ? boardRect.width / size : NaN;
      const boardStyles = boardEl ? getComputedStyle(boardEl) : null;
      const fallbackGap = boardStyles ? parseFloat(boardStyles.paddingLeft) : NaN;
      const newTile = Number.isFinite(cssTile) ? cssTile : (Number.isFinite(fallbackTile) ? fallbackTile : tilePx);
      const newGap = Number.isFinite(cssGap) ? cssGap : (Number.isFinite(fallbackGap) ? fallbackGap : gap);
      const changed = force || Math.abs(newTile - tilePx) > 0.5 || Math.abs(newGap - gap) > 0.5;
      tilePx = newTile;
      gap = newGap;
      if(changed) refreshTilePositions();
    }
    window.addEventListener('resize', updateTileMetrics);
    updateTileMetrics(true);

    // Fondo de grilla visual (una vez)
    if(gridBgEl){ gridBgEl.innerHTML=''; for(let i=0;i<size*size;i++) gridBgEl.appendChild(document.createElement('div')); }

    // Estado
    let levelIndex=0, score=0, timer=null, timeLeft=LEVELS[0].time, gameStarted=false, lives=3, infiniteMode=false;
    let board=[], selected=null, inputLocked=false, startDragRef=null;
    let comboChain=0, powerCharge=0, selectedPower=null;

    function initLevel(index){
      levelIndex = Math.max(0, Math.min(index, LEVELS.length-1));
      const {id,target,time}=LEVELS[levelIndex];
      if(levelEl) levelEl.textContent=id; if(targetEl) targetEl.textContent=target;
      timeLeft=time; if(timeEl) timeEl.textContent=timeLeft;
      score=0; if(scoreEl) scoreEl.textContent=score;
      const bgColors=['#f7dce9','#dcf7e9','#e9f0f7','#f7f3dc','#eae9f7','#f7e9f0','#e9f7f3','#f0f7e9','#f7e9dc','#e9ecf7'];
      document.body.style.background=bgColors[levelIndex%bgColors.length];
      clearBoard(); createBoard(); ensureNoInitialMatches();
      gameStarted=false; infiniteMode=false; renderLives(); comboChain=0; powerCharge=0; updateMeter(); clearPowerSelection();
    }

    function clearBoard(){ if(!boardEl) return; boardEl.querySelectorAll('.tile').forEach(e=>e.remove()); board=Array.from({length:size},()=> Array.from({length:size},()=>null)); }
    function createBoard(){ for(let r=0;r<size;r++) for(let c=0;c<size;c++) spawnAt(r,c,true,false); }

    function countType(t){ return board.flat().filter(x=>x && x.type===t).length; }
    function canPlaceRainbow(){ return levelIndex>=2 && countType('rainbow') < DIFFICULTY.rainbowMax; }
    function canPlaceBomb(){ return countType('bomb') < DIFFICULTY.bombMax; }
    function chooseTileSpec(){ const progress=Math.min(1, levelIndex/(LEVELS.length-1)); const bombProb=DIFFICULTY.bombProbBase + progress*0.02; const rainbowProb=DIFFICULTY.rainbowProbBase + progress*0.015; const r=Math.random(); if(canPlaceRainbow() && r<rainbowProb) return {type:'rainbow', emoji:SPECIALS.RAINBOW.emoji}; if(canPlaceBomb() && r<bombProb) return {type:'bomb', emoji:SPECIALS.BOMB.emoji, color:'#d8d8d8'}; const f=FRUITS[Math.floor(Math.random()*FRUITS.length)]; return {type:'fruit', emoji:f.emoji, color:f.color}; }

    function spawnAt(r,c, initial=false, fromTop=false){ if(!boardEl) return; const spec=chooseTileSpec(); const el=document.createElement('div'); el.className='tile'+(initial?' spawn':''); if(spec.type==='rainbow'){ el.classList.add('rainbow'); el.textContent=spec.emoji; } else if(spec.type==='bomb'){ el.classList.add('bomb'); el.textContent=spec.emoji; } else { el.style.background=pastelize(spec.color); el.textContent=FRUITS.find(f=>f.color===spec.color)?.emoji||'🍬'; } const finalLeft=c*tilePx+gap/2, finalTop=r*tilePx+gap/2; if(fromTop){ el.style.left=px(finalLeft); el.style.top=px(-tilePx); requestAnimationFrame(()=>{ el.classList.add('falling'); el.style.top=px(finalTop); }); } else { el.style.left=px(finalLeft); el.style.top=px(finalTop); } el.dataset.row=r; el.dataset.col=c; el.dataset.type=spec.type; if(spec.color) el.dataset.color=spec.color; el.addEventListener('pointerdown', onPointerDown); el.addEventListener('click', onTileClick); boardEl.appendChild(el); const blocker=(levelIndex>=1 && Math.random()<0.07)?2:0; if(blocker>0) el.classList.add('frozen'); board[r][c]={ type:spec.type, color:spec.color, el, row:r, col:c, blocker };
    }

    function ensureStart(){ if(!gameStarted){ gameStarted=true; if(!infiniteMode) startTimer(); } }
    function onPointerDown(e){ ensureStart(); if(inputLocked) return; const el=e.currentTarget; const r=+el.dataset.row, c=+el.dataset.col; const t=board[r][c]; if(t.blocker>0){ return; } if(selected==null){ selected={r,c, el}; el.style.outline='3px solid rgba(0,0,0,.15)'; window.addEventListener('pointerup', onPointerUp,{once:true}); window.addEventListener('pointermove', onPointerMove); startDragRef={x:e.clientX, y:e.clientY}; } }
    function onPointerMove(e){ if(!selected||!startDragRef) return; const dx=e.clientX-startDragRef.x, dy=e.clientY-startDragRef.y; const absX=Math.abs(dx), absY=Math.abs(dy); if(absX<18&&absY<18) return; let dr=0,dc=0; if(absX>absY){ dc = dx>0?1:-1; } else { dr = dy>0?1:-1; } window.removeEventListener('pointermove', onPointerMove); performSwap(selected.r,selected.c, selected.r+dr, selected.c+dc); cleanupSelection(); }
    function onPointerUp(){ cleanupSelection(); }
    function cleanupSelection(){ if(selected){ selected.el.style.outline='none'; } selected=null; startDragRef=null; window.removeEventListener('pointermove', onPointerMove); }
    function isAdjacent(r1,c1,r2,c2){ return (Math.abs(r1-r2)+Math.abs(c1-c2))===1; }
    function onTileClick(e){ ensureStart(); if(inputLocked) return; if(selectedPower){ applySelectedPower(e.currentTarget); return; } const el=e.currentTarget; const r=+el.dataset.row, c=+el.dataset.col; const t=board[r][c]; if(t.blocker>0){ return; } if(!selected){ selected={r,c, el}; el.style.outline='3px solid rgba(0,0,0,.15)'; return; } if(selected.el===el){ cleanupSelection(); return; } if(isAdjacent(selected.r,selected.c,r,c)){ performSwap(selected.r,selected.c,r,c); cleanupSelection(); } else { selected.el.style.outline='none'; selected={r,c, el}; el.style.outline='3px solid rgba(0,0,0,.15)'; }
    }

    function performSwap(r1,c1,r2,c2){ if(inputLocked) return; if(!inBounds(r2,c2)) return; const a=board[r1][c1], b=board[r2][c2]; if(!a||!b) return; if(a.blocker>0||b.blocker>0) return; inputLocked=true; a.el.classList.add('swap'); b.el.classList.add('swap'); moveTileEl(a.el,r2,c2); moveTileEl(b.el,r1,c1); board[r1][c1]=b; b.row=r1; b.col=c1; b.el.dataset.row=r1; b.el.dataset.col=c1; board[r2][c2]=a; a.row=r2; a.col=c2; a.el.dataset.row=r2; a.el.dataset.col=c2; setTimeout(()=>{ a.el.classList.remove('swap'); b.el.classList.remove('swap'); const matches=findAllMatches(); if(matches.length){ comboResolve(matches); } else { a.el.classList.add('swap'); b.el.classList.add('swap'); moveTileEl(a.el,r1,c1); moveTileEl(b.el,r2,c2); board[r1][c1]=a; a.row=r1; a.col=c1; a.el.dataset.row=r1; a.el.dataset.col=c1; board[r2][c2]=b; b.row=r2; b.col=c2; b.el.dataset.row=r2; b.el.dataset.col=c2; setTimeout(()=>{ a.el.classList.remove('swap'); b.el.classList.remove('swap'); inputLocked=false; }, 220); } },190); }

    function inBounds(r,c){ return r>=0&&c>=0&&r<size&&c<size; }
    function moveTileEl(el,r,c){ el.style.left=px(c*tilePx+gap/2); el.style.top=px(r*tilePx+gap/2); el.dataset.row=r; el.dataset.col=c; }

    function tileForMatch(t){ if(!t) return null; if(t.type==='bomb') return null; if(t.type==='rainbow') return 'RAINBOW'; return t.color; }
    function eqWithRainbow(base, val){ if(val==='RAINBOW') return true; if(base==='RAINBOW') return true; return base===val && base!=null; }

    function findAllMatches(){ const groups=[]; for(let r=0;r<size;r++){ let c=0; while(c<size){ let start=c; let base=tileForMatch(board[r][c]); if(base==null){ c++; continue; } if(base==='RAINBOW'){ let k=c; base=null; while(k<size && tileForMatch(board[r][k])==='RAINBOW') k++; if(k<size) base=tileForMatch(board[r][k]); if(base==null){ c=k+1; continue; } } c++; while(c<size && eqWithRainbow(base, tileForMatch(board[r][c]))) c++; const len=c-start; if(len>=3){ const cells=Array.from({length:len},(_,i)=>({r, c:start+i})); groups.push({cells}); } } } for(let c=0;c<size;c++){ let r=0; while(r<size){ let start=r; let base=tileForMatch(board[r][c]); if(base==null){ r++; continue; } if(base==='RAINBOW'){ let k=r; base=null; while(k<size && tileForMatch(board[k][c])==='RAINBOW') k++; if(k<size) base=tileForMatch(board[k][c]); if(base==null){ r=k+1; continue; } } r++; while(r<size && eqWithRainbow(base, tileForMatch(board[r][c]))) r++; const len=r-start; if(len>=3){ const cells=Array.from({length:len},(_,i)=>({r:start+i, c})); groups.push({cells}); } } } const map=new Map(); groups.forEach(g=>g.cells.forEach(({r,c})=> map.set(r+","+c,{r,c}))); const cells=Array.from(map.values()); return cells.length ? [{cells}] : []; }

    function ensureNoInitialMatches(){ let safety=0; while(true){ const matches=findAllMatches(); if(matches.length===0) break; matches[0].cells.forEach(({r,c})=>{ const t=board[r][c]; if(!t) return; if(t.type==='fruit'||t.type==='rainbow') replaceWithRandomFruit(r,c); }); if(++safety>20) break; } }
    function replaceWithRandomFruit(r,c){ const f=FRUITS[Math.floor(Math.random()*FRUITS.length)]; const t=board[r][c]; t.type='fruit'; t.color=f.color; t.el.classList.remove('rainbow','bomb'); t.el.classList.add('tile'); t.el.style.background=pastelize(f.color); t.el.textContent=f.emoji; t.el.dataset.type='fruit'; t.el.dataset.color=f.color; }

    function getMultiplier(){ return 1 + Math.min(comboChain, 5)*0.5; }
    function comboResolve(matches){ comboChain=0; resolveMatches(matches, ()=>{ inputLocked=false; }); }
    function resolveMatches(matchGroups, finalCallback){ const cells=matchGroups[0].cells; if(!cells.length){ if(finalCallback) finalCallback(); return; } const mult=getMultiplier(); showCombo(mult); const base=cells.length*10; addScore(base*mult); applyBombPenalty(cells); const toRemove=[]; for(const {r,c} of cells){ const t=board[r][c]; if(!t) continue; if(t.blocker>0){ t.blocker--; if(t.blocker===0){ t.el.classList.remove('frozen'); } continue; } toRemove.push({r,c}); } toRemove.forEach(({r,c})=>{ const t=board[r][c]; if(t&&t.el){ t.el.classList.add('matching'); emitParticles(t.el,(t.type==='fruit')?t.color:'#cccccc'); }}); setTimeout(()=>{ toRemove.forEach(({r,c})=>{ const t=board[r][c]; if(t){ t.el.remove(); board[r][c]=null; } }); applyGravity(()=>{ const next=findAllMatches(); if(next.length){ comboChain++; resolveMatches(next, finalCallback); } else { comboChain=0; if(finalCallback) finalCallback(); } }); },220); }

    function showCombo(mult){ if(mult<=1) return; if(comboFx){ comboFx.textContent = `Combo x${mult.toFixed(1)}!`; comboFx.classList.add('show'); setTimeout(()=> comboFx.classList.remove('show'), 850); } }

    function applyBombPenalty(cells){ const seen=new Set(); let bombsAdj=0; for(const {r,c} of cells){ const adj=[[r-1,c],[r+1,c],[r,c-1],[r,c+1]]; for(const [rr,cc] of adj){ if(!inBounds(rr,cc)) continue; const t=board[rr][cc]; if(t && t.type==='bomb'){ const k=rr+","+cc; if(!seen.has(k)){ seen.add(k); bombsAdj++; } } } } if(bombsAdj>0) addScore(-SPECIALS.BOMB.penalty*bombsAdj); }

    function addScore(v){ const prev=score; score=Math.max(0, Math.round(score+v)); if(scoreEl) scoreEl.textContent=score; if(score>prev){ powerCharge=Math.min(200, powerCharge+Math.floor((score-prev)/1)); updateMeter(); }
      if(!infiniteMode){ const target=LEVELS[levelIndex].target; if(score>=target){ recordRun(true); stopTimer(); showWinModal(); } }
    }

    function applyGravity(done){ for(let c=0;c<size;c++){ let write=size-1; for(let r=size-1;r>=0;r--){ if(board[r][c]){ if(r!==write){ const t=board[r][c]; board[write][c]=t; board[r][c]=null; t.row=write; t.col=c; t.el.dataset.row=write; t.el.dataset.col=c; t.el.classList.add('falling'); moveTileEl(t.el,write,c); setTimeout(()=> t.el.classList.remove('falling'), 460); } write--; } }
        for(let r=write;r>=0;r--) spawnAt(r,c,false,true); }
      setTimeout(()=>{ if(done) done(); }, 520);
    }

    function startTimer(){ if(infiniteMode) return; stopTimer(); timer=setInterval(()=>{ timeLeft--; if(timeEl) timeEl.textContent=timeLeft; if(timeLeft<=0){ stopTimer(); if(score>=LEVELS[levelIndex].target){ recordRun(true); showWinModal(); } else { lives=Math.max(0,lives-1); renderLives(); recordRun(false); if(lives>0) showLoseModal(); else showGameOverModal(); } } }, 1000); }
    function stopTimer(){ if(timer){ clearInterval(timer); timer=null; } }

    function updateMeter(){ if(meterFill) meterFill.style.width=(powerCharge/200*100)+'%'; const enabled=powerCharge>=200; [pHammer,pShuffle,pColor].forEach(b=> b && b.classList.toggle('enabled', enabled)); }
    function clearPowerSelection(){ selectedPower=null; [pHammer,pShuffle,pColor].forEach(b=> b && b.classList.remove('selected')); }
    function selectPower(which){ if(powerCharge<200) return; selectedPower=which; [pHammer,pShuffle,pColor].forEach(b=> b && b.classList.remove('selected')); ({hammer:pHammer, shuffle:pShuffle, color:pColor})[which].classList.add('selected'); }
    if(pHammer) pHammer.addEventListener('click', ()=> selectPower('hammer'));
    if(pShuffle) pShuffle.addEventListener('click',()=> selectPower('shuffle'));
    if(pColor)   pColor.addEventListener('click',  ()=> selectPower('color'));

    function applySelectedPower(targetEl){ const r=+targetEl.dataset.row, c=+targetEl.dataset.col; const t=board[r][c]; if(selectedPower==='hammer'){ if(!t) return; if(t.el){ t.el.remove(); } board[r][c]=null; powerCharge=0; updateMeter(); clearPowerSelection(); applyGravity(()=>{ const next=findAllMatches(); if(next.length){ comboChain=0; resolveMatches(next); } }); return; } if(selectedPower==='shuffle'){ powerCharge=0; updateMeter(); clearPowerSelection(); shuffleBoard(); return; } if(selectedPower==='color'){ if(!t || t.type!=='fruit'){ clearPowerSelection(); return; } const color=t.color; const cells=[]; for(let rr=0;rr<size;rr++) for(let cc=0;cc<size;cc++){ const x=board[rr][cc]; if(x && x.type==='fruit' && x.color===color) cells.push({r:rr,c:cc}); } if(cells.length){ powerCharge=0; updateMeter(); clearPowerSelection(); resolveMatches([{cells}], ()=>{}); } }
    }

    function shuffleBoard(){ const items=[]; for(let r=0;r<size;r++) for(let c=0;c<size;c++){ const t=board[r][c]; if(t){ items.push(t); } } const positions=[]; for(let r=0;r<size;r++) for(let c=0;c<size;c++) positions.push({r,c}); for(let i=positions.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [positions[i],positions[j]]=[positions[j],positions[i]]; } items.forEach((t,i)=>{ const {r,c}=positions[i]; board[t.row][t.col]=null; board[r][c]=t; t.row=r; t.col=c; moveTileEl(t.el,r,c); t.el.dataset.row=r; t.el.dataset.col=c; }); setTimeout(()=>{ const m=findAllMatches(); if(m.length){ comboChain=0; resolveMatches(m); } }, 350); }

    function showWinModal(){ modalActions.innerHTML=''; const isLast=levelIndex>=LEVELS.length-1; modalIcon.textContent=isLast ? '♾️' : '🎉'; modalTitle.textContent=isLast ? '¡Modo infinito desbloqueado!' : '¡Ganaste!'; modalText.textContent=isLast ? 'Has completado los 10 niveles. Continúa jugando sin límite de tiempo.' : 'Has alcanzado la meta del nivel.'; const primary=document.createElement('button'); primary.className='btn primary'; primary.innerHTML=isLast?('➡️ Modo infinito'):('➡️ Siguiente nivel'); primary.onclick=()=>{ overlay.classList.remove('show'); if(isLast){ startInfiniteMode(); } else { beginLevel(levelIndex+1); } }; modalActions.appendChild(primary); overlay.classList.add('show'); }
    function showLoseModal(){ modalIcon.textContent='💔'; modalTitle.textContent='¡Casi!'; modalText.textContent=`Te quedan ${lives} vida${lives===1?'':'s'}.`; modalActions.innerHTML=''; const retry=document.createElement('button'); retry.className='btn primary'; retry.innerHTML='🔄 Volver a intentar'; retry.onclick=()=>{ overlay.classList.remove('show'); beginLevel(levelIndex); }; modalActions.appendChild(retry); overlay.classList.add('show'); }
    function showGameOverModal(){ modalIcon.textContent='🛑'; modalTitle.textContent='Juego terminado'; modalText.textContent='Te has quedado sin vidas. ¿Reiniciamos?'; modalActions.innerHTML=''; const restart=document.createElement('button'); restart.className='btn primary'; restart.innerHTML='🔄 Reiniciar'; restart.onclick=()=>{ overlay.classList.remove('show'); lives=3; renderLives(); beginLevel(0); }; modalActions.appendChild(restart); overlay.classList.add('show'); }
    function renderLives(){ const full='❤️'.repeat(lives); const empty='🤍'.repeat(Math.max(0,3-lives)); if(livesEl) livesEl.textContent=full+empty; }
    function startInfiniteMode(){ infiniteMode=true; stopTimer(); if(levelEl) levelEl.textContent='∞'; if(targetEl) targetEl.textContent='∞'; if(timeEl) timeEl.textContent='∞'; }

    if(restartBtn) restartBtn.addEventListener('click', ()=>{ lives=3; infiniteMode=false; renderLives(); beginLevel(0); });

    function emitParticles(tileEl, color){ const rect=tileEl.getBoundingClientRect(); const parentRect=boardEl.getBoundingClientRect(); const x=rect.left-parentRect.left+rect.width/2; const y=rect.top-parentRect.top+rect.height/2; const count=10; for(let i=0;i<count;i++){ const p=document.createElement('div'); p.className='particle'; p.style.background=color||'#ddd'; const angle=Math.random()*Math.PI*2; const dist=14+Math.random()*18; const tx=Math.cos(angle)*dist; const ty=Math.sin(angle)*dist; p.style.left=px(x); p.style.top=px(y); p.style.setProperty('--tx', tx+'px'); p.style.setProperty('--ty', ty+'px'); boardEl.appendChild(p); setTimeout(()=> p.remove(), 650); } }

    function recordRun(win){ try{ const h=loadHistory(); const p=loadProfile(); h.unshift({ ts: Date.now(), level: infiniteMode?'∞':LEVELS[levelIndex].id, score, win, nick:(p.nickname||'Jugador') }); saveHistory(h.slice(0,50)); }catch(e){} }

    /* ==========================================================
       TESTS
    ========================================================== */
    function log(msg){ if(testLog) testLog.textContent += msg + '\n'; }
    function findMatchesWithWildcards(mat){ const rows=mat.length, cols=mat[0].length; const out=[]; const val=(r,c)=> mat[r][c]; const tileVal=(v)=> v==='B'? null : (v==='W'?'RAINBOW': v); function scanRow(r){ let c=0; while(c<cols){ let start=c; let base = tileVal(val(r,c)); if(base==null){ c++; continue; } if(base==='RAINBOW'){ let k=c; base=null; while(k<cols && tileVal(val(r,k))==='RAINBOW') k++; if(k<cols) base=tileVal(val(r,k)); if(base==null){ c=k+1; continue; } } c++; while(c<cols && (tileVal(val(r,c))==='RAINBOW' || tileVal(val(r,c))===base)) c++; let len=c-start; if(len>=3) out.push({cells:Array.from({length:len},(_,i)=>({r,c:start+i}))}); } } function scanCol(c){ let r=0; while(r<rows){ let start=r; let base=tileVal(val(r,c)); if(base==null){ r++; continue; } if(base==='RAINBOW'){ let k=r; base=null; while(k<rows && tileVal(val(k,c))==='RAINBOW') k++; if(k<rows) base=tileVal(val(k,c)); if(base==null){ r=k+1; continue; } } r++; while(r<rows && (tileVal(val(r,c))==='RAINBOW' || tileVal(val(r,c))===base)) r++; let len=r-start; if(len>=3) out.push({cells:Array.from({length:len},(_,i)=>({r:start+i,c}))}); } } for(let r=0;r<rows;r++) scanRow(r); for(let c=0;c<cols;c++) scanCol(c); const map=new Map(); out.forEach(g=>g.cells.forEach(({r,c})=> map.set(r+","+c,1))); return Array.from(map.keys()); }
    function runTests(){ log('Iniciando pruebas...'); const m1=[["A","A","A","B","C"],["B","C","D","E","F"],["A","B","C","D","E"]]; const t1=findMatchesWithWildcards(m1); log('Test 1 (fila de 3): '+(t1.length===3?'OK':'FAIL -> '+t1.length)); const m2=[["X","Y","Z"],["X","Q","Z"],["X","Y","Z"],["X","Y","Z"]]; const t2=findMatchesWithWildcards(m2); log('Test 2 (columna de 4): '+(t2.length===4?'OK':'FAIL -> '+t2.length)); const m3=[["A","B","C"],["B","C","A"],["C","A","B"]]; const t3=findMatchesWithWildcards(m3); log('Test 3 (sin matches): '+(t3.length===0?'OK':'FAIL -> '+t3.length)); const w1=[["A","W","A","B","C"]]; const tw1=findMatchesWithWildcards(w1); log('Test 4 (A W A => 3): '+(tw1.length===3?'OK':'FAIL -> '+tw1.length)); const w3=[["A","W","W","A","B"]]; const tw3=findMatchesWithWildcards(w3); log('Test 5 (A W W A => 4): '+(tw3.length===4?'OK':'FAIL -> '+tw3.length)); const w4=[["A","R","R","R","A"]]; const tw4=findMatchesWithWildcards(w4); log('Test 6 (RRR => 3): '+(tw4.length===3?'OK':'FAIL -> '+tw4.length)); const bombBreak=[["A","A","B","A","A"]]; const tb= findMatchesWithWildcards(bombBreak); log('Test 7 (bomba corta match => 0): '+(tb.length===0?'OK':'FAIL -> '+tb.length)); const colWild=[["A"],["W"],["A"]]; const tcw=findMatchesWithWildcards(colWild); log('Test 8 (col A-W-A => 3): '+(tcw.length===3?'OK':'FAIL -> '+tcw.length)); let nonNeg=true; let s=0; try{ const s0=score; addScore(-9999); nonNeg = score>=0; score=s0; if(scoreEl) scoreEl.textContent=s0; }catch(e){ nonNeg=false; } log('Test 9 (score no negativo): '+(nonNeg?'OK':'FAIL'));
      let okMul=true; const expected=[1.0,1.5,2.0,2.5,3.0,3.5]; for(let i=0;i<expected.length;i++){ comboChain=i; const m=getMultiplier().toFixed(1); if(m!=expected[i].toFixed(1)) okMul=false; } comboChain=0; log('Test 10 (multiplicador 0..5): '+(okMul?'OK':'FAIL'));
      log('Pruebas finalizadas.'); }
    runTests();

  })();
