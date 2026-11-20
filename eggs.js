// Easter eggs: four hidden routes to the same "we're hiring" note, which
// takes over the mission panel.
//
//   ask    type "jobs", "hire", "careers"… or visit /jobs, /careers… (404.html)
//   catch  after a while (or when called by name) a butterfly appears and
//          flies a Lorenz orbit around the attractor, shying away from the mouse
//   read   digits drift out of the field and spell 1963; type it back (each
//          right digit lights up as it is typed)
//   solve  the console asks for initial conditions: attractor(σ, ρ, β)
//
// Loaded after script.js; uses its showMission(), applyRandomFilter(),
// switchVideo() and videoIndex.
(() => {
    // Assembled at runtime so the address never appears verbatim in the
    // source, where scrapers and crawlers would pick it up
    const EMAIL = ['adb', 'strange-attractor.com'].join('@');

    // `found` heads the note, `subject` prefills the email so each
    // application says which route its sender took
    const EGGS = {
        ask: { found: 'Since you ask.', subject: 'I asked' },
        catch: { found: 'You caught the butterfly.', subject: 'I caught the butterfly' },
        read: { found: 'You read the digits.', subject: 'I read the digits' },
        solve: { found: 'You found the initial conditions.', subject: 'I found the initial conditions' },
    };

    const ASK_WORDS = ['job', 'hire', 'hiring', 'career', 'join', 'apply', 'work'];

    // 1963: Lorenz publishes "Deterministic Nonperiodic Flow"
    const WHISPER_CODE = '1963';
    // [column, row] of a clear 1, 9, 6 and 3 in the 36×36 digit sheet
    // (other.webp), all in its bottom rows so that, in the tile above the
    // attractor, they sit just over it
    const WHISPER_CELLS = [[32, 32], [8, 29], [6, 34], [30, 32]];
    const SHEET_SIZE = 36;
    const WHISPER_FIRST_MS = 120000;
    const WHISPER_EVERY_MS = 45000;
    const WHISPER_DURATION_MS = 7000;

    // Typing this summons the butterfly without the wait
    const BUTTERFLY_CALL = 'butterfly';
    const BUTTERFLY_FIRST_MS = 20000;
    const BUTTERFLY_EVERY_MS = 70000; // retry, if its turn was skipped
    const BUTTERFLY_FADE_MS = 2400;
    const BUTTERFLY_PACE = 1 / 7500; // Lorenz time per ms: about 7 seconds a loop
    // Once it has appeared the butterfly stays until caught. It shies away
    // from a mouse within BUTTERFLY_SHY_PX: it flees faster the closer the
    // mouse gets, up to BUTTERFLY_FLEE_SPEED, and takes a moment
    // (BUTTERFLY_REACTION_MS) to get going, so a quick hand can still catch
    // it and a slow one never will.
    const BUTTERFLY_SHY_PX = 220;
    const BUTTERFLY_FLEE_SPEED = 850; // px per second
    const BUTTERFLY_REACTION_MS = 130;
    // A mouse that has kept still this long no longer scares it, until it
    // moves again
    const BUTTERFLY_CALM_MS = 3000;
    // Pinned against the window's edge for BUTTERFLY_PINNED_MS, it bolts out
    // along a wall
    const BUTTERFLY_PINNED_MS = 150;
    const BUTTERFLY_BOLT_SPEED = 1500; // px per second
    const BUTTERFLY_BOLT_MS = 450;

    // Classic Lorenz parameters, the ones that draw the butterfly
    const LORENZ = { sigma: 10, rho: 28, beta: 8 / 3 };

    // Fade between attractors when an egg is found: brisker than the 1s of
    // the "strange" switch
    const HEART_FADE_MS = 500;

    const found = new Set();

    // === The note ===
    // Shown in the mission panel, in place of its usual text
    const missionPanel = document.getElementById('mission-text');
    let note = null;

    function reveal(egg) {
        if (!note) {
            note = document.createElement('div');
            note.className = 'egg-note';
            note.innerHTML =
                '<h2></h2>' +
                '<p>Strange attractors are hard to find. So are the people who go looking for them.</p>' +
                '<p>We\'re hiring. Write to <a class="highlight"></a> and tell us how you got here.</p>';
            note.querySelector('a').textContent = EMAIL;
            missionPanel.prepend(note);
        }

        note.querySelector('h2').textContent = EGGS[egg].found;
        note.querySelector('a').href =
            `mailto:${EMAIL}?subject=${encodeURIComponent(EGGS[egg].subject)}`;

        applyRandomFilter();
        // The attractor turns into its second form, the heart (the one typing
        // "strange" switches to), and stays that way
        if (videoIndex === 0) switchVideo(HEART_FADE_MS);
        missionPanel.classList.add('egg-found');
        showMission();

        if (!found.has(egg) && typeof gtag === 'function') {
            gtag('event', 'easter_egg', { egg });
        }
        found.add(egg);
    }

    // Opening the panel the usual ways (Mission button, clicking the
    // attractor) brings back its usual text. These run after script.js's own
    // click handlers: a click that just closed the panel leaves the note in
    // place while it slides away.
    [document.getElementById('mission-button'), document.querySelector('.center-video')].forEach(opener => {
        opener.addEventListener('click', () => {
            if (missionPanel.classList.contains('visible')) missionPanel.classList.remove('egg-found');
        });
    });

    // === Ask / read: typed words ===
    let typed = '';

    document.addEventListener('keydown', (event) => {
        if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;

        typed = (typed + event.key.toLowerCase()).slice(-12);

        // Each digit of the code typed in order lifts out of the field, so
        // the visitor can tell they are on the right track
        let progress = WHISPER_CODE.length;
        while (!typed.endsWith(WHISPER_CODE.slice(0, progress))) progress--;
        lightDigits(progress);

        if (progress === WHISPER_CODE.length) {
            typed = '';
            reveal('read');
        } else if (ASK_WORDS.some(word => typed.endsWith(word))) {
            typed = '';
            reveal('ask');
        } else if (typed.endsWith(BUTTERFLY_CALL)) {
            typed = '';
            flyButterfly();
        }
    });

    // /jobs, /careers… land here as /#jobs (see 404.html)
    const door = location.hash.slice(1).toLowerCase();
    if (ASK_WORDS.some(word => door.startsWith(word))) {
        history.replaceState(null, '', location.pathname);
        // Let the page entrance play out first
        window.addEventListener('load', () => setTimeout(() => reveal('ask'), 2500));
    }

    // === Read: the digit field spells a year ===
    // A copy of digit i of the code, placed over the original in the tile
    // above the attractor, with --gathered set to the move that carries it
    // into the row the digits form just above the attractor. Null when the
    // window leaves no room for that row.
    function liftDigit(i) {
        const video = document.querySelector('.center-video');
        if (!video || video.getBoundingClientRect().top < 70) return null;

        const cell = video.offsetWidth;
        const digit = cell / SHEET_SIZE;
        const gatheredSize = cell * 0.09;
        const [col, row] = WHISPER_CELLS[i];
        const left = video.offsetLeft + col * digit;
        const top = video.offsetTop - cell + row * digit;
        const toX = video.offsetLeft + cell / 2 + (i - (WHISPER_CELLS.length - 1) / 2) * gatheredSize * 1.15;
        const toY = video.offsetTop - gatheredSize * 0.9;

        const el = document.createElement('div');
        el.className = 'whisper-digit';
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.width = el.style.height = `${digit}px`;
        el.style.backgroundSize = `${cell}px ${cell}px`;
        el.style.backgroundPosition = `${-col * digit}px ${-row * digit}px`;
        el.style.setProperty('--gathered',
            `translate(${toX - left - digit / 2}px, ${toY - top - digit / 2}px) scale(${gatheredSize / digit})`);
        // Inside the grid, so it follows when the mission panel shifts it
        document.getElementById('grid-container').appendChild(el);
        return el;
    }

    // Unprompted: the digits gather, hold, and sink back
    function whisper() {
        WHISPER_CELLS.forEach((_, i) => {
            const el = liftDigit(i);
            if (!el) return;
            el.classList.add('drifting');
            el.style.animationDuration = `${WHISPER_DURATION_MS}ms`;
            el.style.animationDelay = `${i * 300}ms`;
            el.addEventListener('animationend', () => el.remove());
        });
    }

    // As the code is typed: the first `count` digits stay gathered until the
    // visitor goes wrong, stops typing, or finishes
    const lit = [];
    let litTimer = null;

    function lightDigits(count) {
        WHISPER_CELLS.forEach((_, i) => {
            if (i < count && !lit[i]) {
                const el = liftDigit(i);
                if (!el) return;
                el.offsetWidth; // flush styles so the move is animated
                el.classList.add('lit');
                lit[i] = el;
            } else if (i >= count && lit[i]) {
                const el = lit[i];
                lit[i] = null;
                el.classList.remove('lit');
                setTimeout(() => el.remove(), 600);
            }
        });

        clearTimeout(litTimer);
        if (count) {
            const hold = count === WHISPER_CELLS.length ? 2500 : 6000;
            litTimer = setTimeout(() => lightDigits(0), hold);
        }
    }

    // Their places are computed for the current layout
    window.addEventListener('resize', () => lightDigits(0));

    // === Catch: the butterfly ===
    // Last known mouse position, for the butterfly to shy away from (touch
    // has no hovering pointer to flee, so a tap just catches it)
    let mouse = null;
    let mouseMovedAt = 0;
    window.addEventListener('pointermove', (event) => {
        if (event.pointerType !== 'mouse') return;
        mouse = [event.clientX, event.clientY];
        mouseMovedAt = performance.now();
    });
    document.documentElement.addEventListener('mouseleave', () => { mouse = null; });

    function flyButterfly() {
        if (document.querySelector('.butterfly')) return; // it is already out

        const el = document.createElement('div');
        el.className = 'butterfly';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML =
            '<svg viewBox="-16 -14 32 28">' +
            '<g class="butterfly-wings">' +
            '<path id="butterfly-wing" d="M0-1C3-10 13-14 14-7C14.5-2 8 1 0 1ZM0 1C7 1 12 5 9 10C6 13 2 8 0 3Z"/>' +
            '<use href="#butterfly-wing" transform="scale(-1 1)"/>' +
            '</g>' +
            '<path class="butterfly-body" d="M0-6V7M0-6L-3-11M0-6L3-11"/>' +
            '</svg>';
        el.style.opacity = 0;
        document.body.appendChild(el);

        // The flight follows a Lorenz trajectory (x across, z up) looping
        // around the attractor; a random start makes each one unique
        let p = [Math.random() * 20 - 10, Math.random() * 20 - 10, 15 + Math.random() * 20];
        for (let i = 0; i < 500; i++) p = lorenzStep(p, LORENZ, 0.01);

        const edge = 30;                     // it keeps this far inside the window
        let age = 0;                         // ms flown so far
        let dodge = [0, 0];                  // how far fleeing has pushed it off its orbit
        let flee = [0, 0];                   // fleeing velocity, px per second
        let alarmedUntil = 0;                // it keeps its alarm colors briefly after a scare
        let pinned = 0;                      // ms spent stuck against the window's edges
        let bolt = [0, 0];                   // velocity of the dash out of a corner…
        let boltUntil = 0;                   // …and when it ends
        let position = null;
        let heading = 0;
        let last = performance.now();
        let frame = requestAnimationFrame(fly);

        function fly(now) {
            // Clamped, so the flight simply pauses while the tab is in the background
            const dt = Math.min(now - last, 50);
            last = now;
            age += dt;

            const width = window.innerWidth;
            const height = window.innerHeight;
            // Wide enough that the two lobes circle either side of the attractor
            const scaleX = Math.min(width * 0.42, 640) / 20;
            const scaleY = Math.min(height * 0.38, 330) / 25;
            const inside = ([x, y]) => [
                Math.min(Math.max(x, edge), width - edge),
                Math.min(Math.max(y, edge), height - edge),
            ];

            p = lorenzStep(p, LORENZ, dt * BUTTERFLY_PACE);
            const orbit = [width / 2 + p[0] * scaleX, height / 2 - (p[2] - 25) * scaleY];
            let next = [orbit[0] + dodge[0], orbit[1] + dodge[1]];

            // 0 with the mouse out of range or keeping still, up to 1 with
            // it right on top
            const threat = mouse && now - mouseMovedAt < BUTTERFLY_CALM_MS;
            const away = threat ? [next[0] - mouse[0], next[1] - mouse[1]] : [Infinity, 0];
            const gap = Math.hypot(...away);
            const fright = gap > 0 && gap < BUTTERFLY_SHY_PX ? 1 - gap / BUTTERFLY_SHY_PX : 0;
            const wanted = fright ? BUTTERFLY_FLEE_SPEED * fright / gap : 0;
            if (fright) alarmedUntil = age + 400;
            el.classList.toggle('fleeing', age < alarmedUntil);
            const react = 1 - Math.exp(-dt / BUTTERFLY_REACTION_MS);
            flee = age < boltUntil
                ? bolt // mid-dash it pays the mouse no attention
                : flee.map((v, k) => v + ((fright ? away[k] * wanted : 0) - v) * react);

            // Left alone, it drifts back onto its orbit
            const drift = fright ? 1 : Math.exp(-dt / 1500);
            const free = next.map((v, k) => orbit[k] + dodge[k] * drift + flee[k] * dt / 1000);
            next = inside(free);
            if (fright) {
                // Chased into an edge of the window, it slips away along it
                // rather than getting pinned there
                const blockedX = Math.abs(free[0] - next[0]);
                const blockedY = Math.abs(free[1] - next[1]);
                next = inside([
                    next[0] + blockedY * (away[0] < 0 ? -1 : 1),
                    next[1] + blockedX * (away[1] < 0 ? -1 : 1),
                ]);
            }
            dodge = [next[0] - orbit[0], next[1] - orbit[1]];

            // Pinned against the window's edge with nowhere left to slide, it
            // bolts along whichever wall leads most directly away from the
            // mouse. Only at an edge: hovering in the open is not being stuck.
            const atEdge = next[0] <= edge || next[0] >= width - edge ||
                next[1] <= edge || next[1] >= height - edge;
            const stuck = fright && atEdge && position &&
                Math.hypot(next[0] - position[0], next[1] - position[1]) < 0.5;
            pinned = stuck ? pinned + dt : 0;
            if (pinned > BUTTERFLY_PINNED_MS) {
                const room = { '1,0': width - next[0], '-1,0': next[0], '0,1': height - next[1], '0,-1': next[1] };
                const [escape] = Object.keys(room)
                    .filter(way => room[way] > BUTTERFLY_SHY_PX)
                    .map(way => way.split(',').map(Number))
                    .sort((a, b) => (b[0] * away[0] + b[1] * away[1]) - (a[0] * away[0] + a[1] * away[1]));
                if (escape) {
                    bolt = escape.map(v => v * BUTTERFLY_BOLT_SPEED);
                    boltUntil = age + BUTTERFLY_BOLT_MS;
                    alarmedUntil = boltUntil + 400;
                }
                pinned = 0;
            }

            // Turn toward the direction of travel (the drawing points up),
            // always the short way round
            if (position && Math.hypot(next[0] - position[0], next[1] - position[1]) > 0.05) {
                const angle = Math.atan2(next[1] - position[1], next[0] - position[0]) + Math.PI / 2;
                heading += Math.atan2(Math.sin(angle - heading), Math.cos(angle - heading)) * Math.min(1, dt / 120);
            }
            position = next;

            el.style.opacity = Math.min(1, age / BUTTERFLY_FADE_MS);
            el.style.transform =
                `translate(${next[0]}px, ${next[1]}px) rotate(${heading}rad) scale(${isMobileView() ? 2.2 : 1})`;
            frame = requestAnimationFrame(fly);
        }

        // pointerdown rather than click: a click needs press and release to
        // both land on a moving target
        el.addEventListener('pointerdown', () => {
            cancelAnimationFrame(frame);
            el.classList.add('caught');
            setTimeout(() => el.remove(), 600);
            reveal('catch');
        }, { once: true });
    }

    // Ambient eggs repeat until found, skipping turns while the tab is hidden
    function repeat(egg, show, firstMs, everyMs) {
        const tick = () => {
            if (found.has(egg)) return;
            if (!document.hidden) show();
            setTimeout(tick, everyMs);
        };
        setTimeout(tick, firstMs);
    }

    repeat('read', whisper, WHISPER_FIRST_MS, WHISPER_EVERY_MS);
    repeat('catch', flyButterfly, BUTTERFLY_FIRST_MS, BUTTERFLY_EVERY_MS);

    // === Solve: initial conditions, in the console ===
    const MONO = 'font-family: "Courier New", monospace;';
    const ACCENT = `${MONO} color: #ffcc00;`;

    console.log(
        '%cStrange Attractor\n%cOn rare occasions, specific initial conditions give rise to a strange attractor.\n' +
        'Most do not. Try some:  %cattractor(σ, ρ, β)',
        `${ACCENT} font-size: 16px; font-weight: bold;`, MONO, ACCENT);

    window.attractor = (sigma, rho, beta) => {
        if (![sigma, rho, beta].every(Number.isFinite)) {
            console.log('%cattractor(σ, ρ, β) takes three numbers.', MONO);
            return;
        }

        const { kind, points } = explore({ sigma, rho, beta });
        const where = `σ = ${+sigma.toFixed(3)}, ρ = ${+rho.toFixed(3)}, β = ${+beta.toFixed(3)}`;

        if (kind === 'escape') {
            console.log(`%c${where}\nThe trajectory escapes to infinity. Nothing attracts it.`, MONO);
        } else if (kind === 'fixed') {
            console.log(`%c${where}\nEverything spirals into a fixed point. An attractor, but not a strange one.`, MONO);
        } else if (kind === 'cycle') {
            console.log(`%c${plot(points)}\n%c${where}\nA loop that repeats forever. Strange attractors never repeat.`, ACCENT, MONO);
        } else {
            console.log(
                `%c${plot(points)}\n%c${where}\nA strange attractor: it never repeats, and you found it.\n\n` +
                `We're hiring people who go looking for these.\n%c${EMAIL}%c\nTell us how you got here.`,
                ACCENT, MONO, ACCENT, MONO);
            reveal('solve');
        }
    };

    // === Lorenz system ===
    // One 4th-order Runge-Kutta step
    function lorenzStep(p, { sigma, rho, beta }, dt) {
        const f = ([x, y, z]) => [sigma * (y - x), x * (rho - z) - y, x * y - beta * z];
        const nudge = (k, h) => p.map((v, i) => v + k[i] * h);
        const k1 = f(p);
        const k2 = f(nudge(k1, dt / 2));
        const k3 = f(nudge(k2, dt / 2));
        const k4 = f(nudge(k3, dt));
        return p.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    }

    // Integrates the system and says where it ends up: 'escape', 'fixed'
    // point, limit 'cycle' or 'strange' attractor. Chaos is told apart by the
    // largest Lyapunov exponent: the average rate at which two trajectories
    // started a hair apart diverge (positive only for a strange attractor).
    function explore(params) {
        const dt = 0.005;
        const settle = 20000;
        const observe = 40000;
        const hair = 1e-8;

        let p = [1, 1, 1];
        let twin = [1 + hair, 1, 1];
        let stretch = 0;
        const points = [];

        for (let i = 0; i < settle + observe; i++) {
            p = lorenzStep(p, params, dt);
            twin = lorenzStep(twin, params, dt);
            if (!p.every(Number.isFinite) || Math.hypot(...p) > 1e6) return { kind: 'escape' };

            // Measure how far the twin drifted, then pull it back to a hair away
            const gap = twin.map((v, k) => v - p[k]);
            const distance = Math.hypot(...gap) || hair;
            twin = p.map((v, k) => v + gap[k] * hair / distance);

            if (i >= settle) {
                stretch += Math.log(distance / hair);
                if (i % 4 === 0) points.push(p);
            }
        }

        const lyapunov = stretch / (observe * dt);
        const late = points.slice(-1000);
        const spread = Math.max(...[0, 1, 2].map(k =>
            Math.max(...late.map(q => q[k])) - Math.min(...late.map(q => q[k]))));

        if (lyapunov > 0.1) return { kind: 'strange', points };
        if (spread < 1e-2 || lyapunov < -0.02) return { kind: 'fixed' };
        return { kind: 'cycle', points };
    }

    // ASCII density plot of the trajectory, x across and z up
    function plot(points, cols = 64, rows = 24) {
        const shades = ' .:+*#';
        const xs = points.map(p => p[0]);
        const zs = points.map(p => p[2]);
        const minX = Math.min(...xs), spanX = Math.max(...xs) - minX || 1;
        const minZ = Math.min(...zs), spanZ = Math.max(...zs) - minZ || 1;

        const hits = Array.from({ length: rows }, () => new Array(cols).fill(0));
        points.forEach(([x, , z]) => {
            const col = Math.min(cols - 1, Math.floor((x - minX) / spanX * cols));
            const row = Math.min(rows - 1, Math.floor((1 - (z - minZ) / spanZ) * rows));
            hits[row][col]++;
        });

        const peak = Math.max(...hits.flat());
        return hits.map(line => line.map(n =>
            shades[Math.ceil(Math.sqrt(n / peak) * (shades.length - 1))]).join('')).join('\n');
    }
})();
