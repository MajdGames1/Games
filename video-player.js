(function () {
    'use strict';

    function fmtTime(sec) {
        if (isNaN(sec) || !isFinite(sec)) return '0:00';
        var h = Math.floor(sec / 3600);
        var m = Math.floor((sec % 3600) / 60);
        var s = Math.floor(sec % 60);
        if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        return m + ':' + String(s).padStart(2, '0');
    }

    window.initVideoPlayer = function (o) {
        var player = o.player, wrap = o.videoWrap;
        var centerPlay = o.centerPlay, buf = o.buffering;
        var ctrl = o.controls, playBtn = o.playBtn, playIco = o.playIcon;
        var curT = o.curTime, durT = o.dur;
        var prog = o.prog, fill = o.fillBar, bufBar = o.bufBar;
        var muteBtn = o.muteBtn, volIco = o.volIcon;
        var volBar = o.volBar, volFill = o.volFill;
        var fsBtn = o.fsBtn, fsIco = o.fsIcon;

        var seeking = false, volDrag = false, timer = null;

        function toggle() {
            if (player.paused || player.ended) player.play().catch(function(){});
            else player.pause();
        }
        function stop() { if (!player.paused) player.pause(); }

        function uiPlay() {
            var p = player.paused || player.ended;
            playIco.innerHTML = p
                ? '<polygon points="8,5 20,12 8,19"/>'
                : '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
            centerPlay.classList.toggle('visible', p);
            if (p) { ctrl.classList.add('visible'); clearTimeout(timer); }
            else rstTimer();
        }
        function uiProg() {
            if (seeking || !player.duration) return;
            fill.style.width = (player.currentTime / player.duration * 100) + '%';
            curT.textContent = fmtTime(player.currentTime);
        }
        function uiBuf() {
            if (!player.duration) return;
            var mx = 0;
            for (var i = 0; i < player.buffered.length; i++) {
                if (player.buffered.end(i) > mx) mx = player.buffered.end(i);
            }
            bufBar.style.width = (mx / player.duration * 100) + '%';
        }
        function uiVol() {
            var v = player.muted ? 0 : player.volume;
            volFill.style.width = (v * 100) + '%';
            var s;
            if (v === 0) s = '<polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
            else if (v < 0.5) s = '<polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
            else s = '<polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';
            volIco.innerHTML = s;
        }
        function mute() { player.muted = !player.muted; uiVol(); }

        function fs() {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                if (wrap.requestFullscreen) wrap.requestFullscreen();
                else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            }
        }

        function seek(e) {
            var r = prog.getBoundingClientRect();
            var x = e.touches ? e.touches[0].clientX : e.clientX;
            var p = Math.max(0, Math.min(1, (x - r.left) / r.width));
            if (player.duration) player.currentTime = p * player.duration;
            fill.style.width = (p * 100) + '%';
        }
        function setV(e) {
            var r = volBar.getBoundingClientRect();
            var x = e.touches ? e.touches[0].clientX : e.clientX;
            var p = Math.max(0, Math.min(1, (x - r.left) / r.width));
            player.volume = p;
            player.muted = false;
            uiVol();
        }
        function showC() { ctrl.classList.add('visible'); }
        function hideC() {
            if (!player.paused && !seeking && !volDrag) ctrl.classList.remove('visible');
            centerPlay.classList.remove('visible');
        }
        function rstTimer() {
            showC();
            clearTimeout(timer);
            if (!player.paused) timer = setTimeout(hideC, 3000);
        }

        player.addEventListener('play', uiPlay);
        player.addEventListener('pause', uiPlay);
        player.addEventListener('ended', function () {
            uiPlay();
            fill.style.width = '100%';
        });
        player.addEventListener('timeupdate', uiProg);
        player.addEventListener('progress', uiBuf);
        player.addEventListener('loadedmetadata', function () {
            durT.textContent = fmtTime(player.duration);
            uiVol();
        });
        player.addEventListener('waiting', function () { buf.classList.add('visible'); });
        player.addEventListener('canplay', function () { buf.classList.remove('visible'); });
        player.addEventListener('volumechange', uiVol);

        centerPlay.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
        playBtn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
        wrap.addEventListener('click', function (e) {
            if (e.target === player || e.target === wrap) toggle();
        });

        prog.addEventListener('mousedown', function (e) { seeking = true; seek(e); });
        document.addEventListener('mousemove', function (e) {
            if (seeking) seek(e);
            if (volDrag) setV(e);
        });
        document.addEventListener('mouseup', function () { seeking = false; volDrag = false; });

        prog.addEventListener('touchstart', function (e) { seeking = true; seek(e); e.preventDefault(); }, { passive: false });
        document.addEventListener('touchmove', function (e) {
            if (seeking) { seek(e); e.preventDefault(); }
            if (volDrag) { setV(e); e.preventDefault(); }
        }, { passive: false });
        document.addEventListener('touchend', function () { seeking = false; volDrag = false; });

        volBar.addEventListener('mousedown', function (e) { volDrag = true; setV(e); e.stopPropagation(); });
        volBar.addEventListener('touchstart', function (e) { volDrag = true; setV(e); e.preventDefault(); }, { passive: false });
        muteBtn.addEventListener('click', mute);
        fsBtn.addEventListener('click', fs);

        wrap.addEventListener('mousemove', rstTimer);
        wrap.addEventListener('mouseleave', function () {
            clearTimeout(timer);
            timer = setTimeout(function () { if (!player.paused) hideC(); }, 1000);
        });

        function handleFsChange() {
            var f = !!(document.fullscreenElement || document.webkitFullscreenElement);
            fsIco.innerHTML = f
                ? '<polyline points="4,14 10,14 10,20"/><polyline points="20,10 14,10 14,4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>'
                : '<polyline points="15,3 21,3 21,9"/><polyline points="9,21 3,21 3,15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>';
        }
        document.addEventListener('fullscreenchange', handleFsChange);
        document.addEventListener('webkitfullscreenchange', handleFsChange);

        var _key = function (e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    toggle();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (player.duration) player.currentTime = Math.min(player.duration, player.currentTime + 5);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    player.currentTime = Math.max(0, player.currentTime - 5);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    player.volume = Math.min(1, player.volume + 0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    player.volume = Math.max(0, player.volume - 0.1);
                    break;
                case 'f': case 'F':
                    fs();
                    break;
                case 'm': case 'M':
                    mute();
                    break;
            }
        };

        return {
            load: function (src) {
                player.src = src;
                player.load();
                fill.style.width = '0%';
                bufBar.style.width = '0%';
                curT.textContent = '0:00';
                durT.textContent = '0:00';
                centerPlay.classList.add('visible');
                ctrl.classList.remove('visible');
            },
            play: function () { player.play().catch(function () {}); },
            pause: stop,
            bindKeys: function () { document.addEventListener('keydown', _key); },
            unbindKeys: function () { document.removeEventListener('keydown', _key); },
            reset: function () {
                stop();
                clearTimeout(timer);
                player.removeAttribute('src');
                player.load();
                fill.style.width = '0%';
                bufBar.style.width = '0%';
                curT.textContent = '0:00';
                durT.textContent = '0:00';
                ctrl.classList.remove('visible');
                centerPlay.classList.remove('visible');
                buf.classList.remove('visible');
            }
        };
    };
})();
