/**
 * TITANIC: TAQDIR SINOVI - Advanced Frontend Application
 * Handles cinematic intro animation (sailing, iceberg impact, breaking in two, sinking),
 * real-time vessel cutaway synchronization, multi-model consensus, what-if counterfactuals,
 * historical passenger matching, html2canvas ticket export, and Chart.js visuals.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Cinematic Intro
    const introOverlay = document.getElementById('introOverlay');
    const skipIntroBtn = document.getElementById('skipIntroBtn');
    const introStage = document.getElementById('introStage');
    const introShip = document.getElementById('introShip');
    const introIceberg = document.getElementById('introIceberg');
    const shipBow = document.getElementById('shipBow');
    const shipStern = document.getElementById('shipStern');
    const shipCrack = document.getElementById('shipCrack');
    const collisionSparks = document.getElementById('collisionSparks');
    const waterSplash = document.getElementById('waterSplash');
    const introMainText = document.getElementById('introMainText');
    const introSubText = document.getElementById('introSubText');
    const replayIntroBtn = document.getElementById('replayIntroBtn');

    // DOM Elements - Form Inputs
    const passengerForm = document.getElementById('passengerForm');
    const modelSelect = document.getElementById('modelSelect');
    const passengerNameInput = document.getElementById('passengerName');
    const passengerTitleSelect = document.getElementById('passengerTitle');
    const passengerAgeInput = document.getElementById('passengerAge');
    const ageDisplay = document.getElementById('ageDisplay');
    const sibspInput = document.getElementById('sibspInput');
    const parchInput = document.getElementById('parchInput');
    const embarkedSelect = document.getElementById('embarkedSelect');
    const cabinSelect = document.getElementById('cabinSelect');
    const genderBtns = document.querySelectorAll('.gender-btn');
    const classCards = document.querySelectorAll('.class-card');
    const ageTags = document.querySelectorAll('.age-tag');

    // DOM Elements - Authentic Titanic Ship SVG Visualizer
    const shipTier1Group = document.getElementById('shipTier1Group');
    const shipTier2Group = document.getElementById('shipTier2Group');
    const shipTier3Group = document.getElementById('shipTier3Group');
    const svgPassengerMarker = document.getElementById('svgPassengerMarker');
    const svgMarkerIcon = document.getElementById('svgMarkerIcon');
    const svgTooltipName = document.getElementById('svgTooltipName');
    const svgTooltipDeck = document.getElementById('svgTooltipDeck');
    const vesselRiskTag = document.getElementById('vesselRiskTag');
    const evacDistance = document.getElementById('evacDistance');
    const evacTime = document.getElementById('evacTime');

    // DOM Elements - Ticket Preview
    const ticketName = document.getElementById('ticketName');
    const ticketClassBadge = document.getElementById('ticketClassBadge');
    const ticketPort = document.getElementById('ticketPort');
    const ticketCabin = document.getElementById('ticketCabin');
    const ticketFare = document.getElementById('ticketFare');
    const ticketNo = document.getElementById('ticketNo');
    const ticketDownloadBar = document.getElementById('ticketDownloadBar');
    const downloadTicketPngBtn = document.getElementById('downloadTicketPngBtn');

    // DOM Elements - State Containers
    const ticketPreviewCard = document.getElementById('ticketPreviewCard');
    const loadingState = document.getElementById('loadingState');
    const resultState = document.getElementById('resultState');
    const resultCardContainer = document.getElementById('resultCardContainer');
    const subZeroBanner = document.getElementById('subZeroBanner');
    const rescueBanner = document.getElementById('rescueBanner');

    // DOM Elements - Result Views
    const resultStatusTag = document.getElementById('resultStatusTag');
    const resultTitle = document.getElementById('resultTitle');
    const survivalProbText = document.getElementById('survivalProbText');
    const gaugeCircle = document.getElementById('gaugeCircle');
    const votesGrid = document.getElementById('votesGrid');
    const narrativeStory = document.getElementById('narrativeStory');
    const factorsList = document.getElementById('factorsList');
    const whatIfList = document.getElementById('whatIfList');
    const twinCard = document.getElementById('twinCard');
    const timelineList = document.getElementById('timelineList');
    const marconiBox = document.getElementById('marconiBox');
    const recalculateBtn = document.getElementById('recalculateBtn');
    const printTicketBtn = document.getElementById('printTicketBtn');
    const soundToggle = document.getElementById('soundToggle');

    // Deck Cutaway Elements in Lower Section
    const deckFirst = document.getElementById('deckFirst');
    const deckSecond = document.getElementById('deckSecond');
    const deckThird = document.getElementById('deckThird');

    // State Variables
    let soundEnabled = true;
    let selectedSex = 'male';
    let selectedPclass = 1;
    let currentFare = 85.0;
    let introTimers = [];

    // ========================================================
    // WEB AUDIO API - SOUND SYNTHESIS
    // ========================================================
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playShipBell() {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 1.2);
        } catch (e) {
            console.warn('Audio error:', e);
        }
    }

    function playShipHorn() {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, now); // Low A2
            osc.frequency.linearRampToValueAtTime(105, now + 1.8);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 2.0);
        } catch (e) {
            console.warn('Audio horn error:', e);
        }
    }

    function playCrashSound() {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;
            
            // Noise burst for ice shattering
            const bufferSize = ctx.sampleRate * 0.8;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + 0.8);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
        } catch (e) {
            console.warn('Audio crash error:', e);
        }
    }

    function playShipGroanAndSplash() {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;
            
            // Low metallic groan
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(75, now);
            osc.frequency.linearRampToValueAtTime(45, now + 2.2);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 2.5);
        } catch (e) {
            console.warn('Audio groan error:', e);
        }
    }

    function playFrostFreezeSound() {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;

            // 1. Ice crackling noise burst (sharp, cold, brittle)
            const bufferSize = ctx.sampleRate * 0.7;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                // Sparsely populated sharp spikes for ice crackling
                data[i] = (Math.random() > 0.88 ? (Math.random() * 2 - 1) : 0);
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const highpass = ctx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.setValueAtTime(2600, now);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.4, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

            noise.connect(highpass);
            highpass.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noise.start(now);

            // 2. Cold howling sub-zero Atlantic wind sweep
            const windOsc = ctx.createOscillator();
            const windFilter = ctx.createBiquadFilter();
            const windGain = ctx.createGain();

            windOsc.type = 'sine';
            windOsc.frequency.setValueAtTime(340, now);
            windOsc.frequency.exponentialRampToValueAtTime(120, now + 1.8);

            windFilter.type = 'bandpass';
            windFilter.frequency.setValueAtTime(450, now);
            windFilter.Q.setValueAtTime(3.2, now);

            windGain.gain.setValueAtTime(0.18, now);
            windGain.gain.linearRampToValueAtTime(0.36, now + 0.4);
            windGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

            windOsc.connect(windFilter);
            windFilter.connect(windGain);
            windGain.connect(ctx.destination);

            windOsc.start(now);
            windOsc.stop(now + 1.8);
        } catch (e) {
            console.warn('Audio freeze sound error:', e);
        }
    }

    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.innerHTML = soundEnabled 
            ? '<i class="fa-solid fa-volume-high"></i>' 
            : '<i class="fa-solid fa-volume-xmark"></i>';
        soundToggle.style.opacity = soundEnabled ? '1' : '0.5';
        if (soundEnabled) playShipBell();
    });

    // ========================================================
    // CINEMATIC INTRO ANIMATION TIMELINE
    // ========================================================
    function clearIntroTimers() {
        introTimers.forEach(t => clearTimeout(t));
        introTimers = [];
    }

    function runCinematicIntro() {
        clearIntroTimers();
        introOverlay.classList.remove('fade-out');

        // Reset elements
        introStage.classList.remove('screen-shake');
        introIceberg.classList.remove('visible');
        shipCrack.classList.remove('cracking');
        collisionSparks.classList.remove('active');
        waterSplash.classList.remove('splash-active');
        shipBow.classList.remove('bow-sinking');
        shipStern.classList.remove('stern-sinking');
        introShip.style.transition = 'none';
        introShip.style.left = '-380px';
        introShip.style.bottom = '55px';

        introMainText.textContent = "1912-yil 14-aprel... Shimoliy Atlantika";
        introSubText.textContent = '"Cho\'kmas kema" Nyu-York tomon to\'liq tezlikda suzib bormoqda...';

        // Phase 1: Sailing in (0.1s - 2.8s)
        introTimers.push(setTimeout(() => {
            playShipHorn();
            introShip.style.transition = 'left 4.2s cubic-bezier(0.2, 0.8, 0.4, 1)';
            introShip.style.left = '32%'; // Sails to center-left
        }, 100));

        // Phase 2: Iceberg looms ahead (2.5s)
        introTimers.push(setTimeout(() => {
            introIceberg.classList.add('visible');
            introMainText.textContent = "Muztog' oldinda!";
            introSubText.textContent = 'Rul zudlik bilan o\'ng tomonga burildi, ammo juda kech edi...';
        }, 2500));

        // Phase 3: Collision Impact! (4.4s)
        introTimers.push(setTimeout(() => {
            playCrashSound();
            introStage.classList.add('screen-shake');
            collisionSparks.classList.add('active');
            shipCrack.classList.add('cracking');
            introMainText.textContent = "Zarba! Kema o'ng bortidan suv olmoqda!";
            introSubText.textContent = 'Soat 23:40 da temir qoplamalar yorilib, muzdek suv kirib keldi...';
        }, 4400));

        // Phase 4: Hull breaking in two and sinking (5.6s)
        introTimers.push(setTimeout(() => {
            playShipGroanAndSplash();
            shipBow.classList.add('bow-sinking');
            shipStern.classList.add('stern-sinking');
            waterSplash.classList.add('splash-active');
            introMainText.textContent = "Kema ikkiga bo'linmoqda!";
            introSubText.textContent = 'Og\'irlik ostida Titanic ikkiga sinib, okean tubiga sho\'ng\'idi...';
        }, 5600));

        // Phase 5: Ocean abyss & Philosophy (8.2s)
        introTimers.push(setTimeout(() => {
            introMainText.textContent = "1,500 dan ortiq odam muzdek okean tubiga ketdi...";
            introSubText.textContent = 'Agar siz o\'sha mash\'um kechada Titanicda bo\'lganingizda nima bo\'lardi?';
        }, 8200));

        // Phase 6: Fade out and open website (10.2s)
        introTimers.push(setTimeout(() => {
            closeIntro();
        }, 10200));
    }

    function closeIntro() {
        clearIntroTimers();
        introOverlay.classList.add('fade-out');
    }

    // Skip Intro Button
    skipIntroBtn.addEventListener('click', closeIntro);

    // Replay Intro Button
    if (replayIntroBtn) {
        replayIntroBtn.addEventListener('click', () => {
            runCinematicIntro();
        });
    }

    // Run automatically on initial page visit
    runCinematicIntro();

    // ========================================================
    // AUTHENTIC TITANIC SHIP SILHOUETTE BLUEPRINT UPDATER
    // ========================================================
    function updateVesselVisualizer() {
        const rawName = passengerNameInput.value.trim() || 'Hurmatli Yo\'lovchi';
        const title = passengerTitleSelect.value;
        const age = parseInt(passengerAgeInput.value, 10) || 24;
        const cabin = cabinSelect.value;

        // 1. Update Tooltip Name
        if (svgTooltipName) {
            svgTooltipName.textContent = `${title}. ${rawName}`;
        }

        // 2. Update Avatar Icon based on Age & Sex (Unicode FontAwesome)
        if (svgMarkerIcon) {
            if (age < 14) {
                svgMarkerIcon.textContent = '\uf1ae'; // child
            } else if (selectedSex === 'female') {
                svgMarkerIcon.textContent = '\uf182'; // woman dress
            } else {
                svgMarkerIcon.textContent = '\uf183'; // man
            }
        }

        // 3. Reset Active Tiers on Ship Silhouette
        [shipTier1Group, shipTier2Group, shipTier3Group].forEach(g => {
            if (g) g.classList.remove('active-tier-group');
        });

        // 4. Update Position & Risk based on Selected Class
        if (selectedPclass === 1) {
            if (shipTier1Group) shipTier1Group.classList.add('active-tier-group');
            if (svgPassengerMarker) svgPassengerMarker.setAttribute('transform', 'translate(370, 97)');
            if (svgTooltipDeck) svgTooltipDeck.textContent = `1-Klass • ${cabin ? cabin + ' Paluba' : 'Deck C'}`;
            if (vesselRiskTag) {
                vesselRiskTag.textContent = '🟢 Yuqori Qayiq Palubasi';
                vesselRiskTag.className = 'vessel-risk-tag';
            }
            if (evacDistance) evacDistance.textContent = '~15 metr';
            if (evacTime) evacTime.textContent = '~2 daqiqa';
        } else if (selectedPclass === 2) {
            if (shipTier2Group) shipTier2Group.classList.add('active-tier-group');
            if (svgPassengerMarker) svgPassengerMarker.setAttribute('transform', 'translate(265, 134)');
            if (svgTooltipDeck) svgTooltipDeck.textContent = `2-Klass • ${cabin ? cabin + ' Paluba' : 'Deck D/E'}`;
            if (vesselRiskTag) {
                vesselRiskTag.textContent = '🟡 O\'rta Paluba (Oshxona usti)';
                vesselRiskTag.className = 'vessel-risk-tag';
            }
            if (evacDistance) evacDistance.textContent = '~45 metr';
            if (evacTime) evacTime.textContent = '~7 daqiqa';
        } else {
            if (shipTier3Group) shipTier3Group.classList.add('active-tier-group');
            if (svgPassengerMarker) svgPassengerMarker.setAttribute('transform', 'translate(150, 175)');
            if (svgTooltipDeck) svgTooltipDeck.textContent = `3-Klass Steerage • Quyi Bo'lim`;
            if (vesselRiskTag) {
                vesselRiskTag.textContent = '🔴 XAVFLI: Suv sathidan pastda!';
                vesselRiskTag.className = 'vessel-risk-tag danger';
            }
            if (evacDistance) evacDistance.textContent = '~110 metr (Panjaralar to\'sig\'i)';
            if (evacTime) evacTime.textContent = '~25 daqiqa';
        }
    }

    // Direct Clicking on the Titanic Ship Silhouette Compartments
    function selectClassFromShip(pclassVal) {
        classCards.forEach(c => {
            const isTarget = parseInt(c.dataset.class, 10) === pclassVal;
            c.classList.toggle('active', isTarget);
            const radio = c.querySelector('input[type="radio"]');
            if (isTarget) {
                radio.checked = true;
                selectedPclass = pclassVal;
                currentFare = parseFloat(c.dataset.fare);
            }
        });
        updateTicketPreview();
    }

    if (shipTier1Group) shipTier1Group.addEventListener('click', () => selectClassFromShip(1));
    if (shipTier2Group) shipTier2Group.addEventListener('click', () => selectClassFromShip(2));
    if (shipTier3Group) shipTier3Group.addEventListener('click', () => selectClassFromShip(3));

    // Synchronize Deck Cutaway in Lower Section
    function updateDeckCutaway(pclass) {
        if (deckFirst && deckSecond && deckThird) {
            [deckFirst, deckSecond, deckThird].forEach(d => d.classList.remove('active'));
            if (pclass === 1) deckFirst.classList.add('active');
            else if (pclass === 2) deckSecond.classList.add('active');
            else if (pclass === 3) deckThird.classList.add('active');
        }
    }

    // Real-time Ticket Preview Updater
    function updateTicketPreview() {
        const rawName = passengerNameInput.value.trim() || 'Hurmatli Yo\'lovchi';
        const title = passengerTitleSelect.value;
        ticketName.textContent = `${title}. ${rawName}`;

        const classMap = {
            1: 'FIRST CLASS',
            2: 'SECOND CLASS',
            3: 'THIRD CLASS'
        };
        ticketClassBadge.textContent = classMap[selectedPclass] || 'FIRST CLASS';

        const portMap = {
            'S': 'Southampton',
            'C': 'Cherbourg',
            'Q': 'Queenstown'
        };
        ticketPort.textContent = portMap[embarkedSelect.value] || 'Southampton';

        const cabin = cabinSelect.value;
        ticketCabin.textContent = cabin ? `${cabin} Deck` : 'Lower Deck';
        ticketFare.textContent = `£${currentFare.toFixed(2)}`;

        updateDeckCutaway(selectedPclass);
        updateVesselVisualizer();
    }

    // Input Event Listeners
    passengerNameInput.addEventListener('input', updateTicketPreview);
    passengerTitleSelect.addEventListener('change', updateTicketPreview);
    embarkedSelect.addEventListener('change', updateTicketPreview);
    cabinSelect.addEventListener('change', updateTicketPreview);

    // Gender Selection
    genderBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            genderBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const radio = btn.querySelector('input[type="radio"]');
            radio.checked = true;
            selectedSex = radio.value;

            if (selectedSex === 'female' && passengerTitleSelect.value === 'Mr') {
                passengerTitleSelect.value = 'Mrs';
            } else if (selectedSex === 'male' && ['Mrs', 'Miss'].includes(passengerTitleSelect.value)) {
                passengerTitleSelect.value = 'Mr';
            }
            updateTicketPreview();
        });
    });

    // Class Selection
    classCards.forEach(card => {
        card.addEventListener('click', () => {
            classCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            radio.checked = true;
            selectedPclass = parseInt(card.dataset.class, 10);
            currentFare = parseFloat(card.dataset.fare);

            if (selectedPclass === 1 && !cabinSelect.value) {
                cabinSelect.value = 'C';
            } else if (selectedPclass === 3) {
                cabinSelect.value = '';
            }

            updateTicketPreview();
        });
    });

    // Age Slider & Quick Tags
    passengerAgeInput.addEventListener('input', (e) => {
        const val = e.target.value;
        ageDisplay.textContent = val;
        ageTags.forEach(tag => {
            tag.classList.toggle('active', parseInt(tag.dataset.age, 10) === parseInt(val, 10));
        });
        updateVesselVisualizer();
    });

    ageTags.forEach(tag => {
        tag.addEventListener('click', () => {
            ageTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            const age = tag.dataset.age;
            passengerAgeInput.value = age;
            ageDisplay.textContent = age;

            if (parseInt(age, 10) < 14 && selectedSex === 'male') {
                passengerTitleSelect.value = 'Master';
            }
            updateTicketPreview();
        });
    });

    // Result Tabs Switching
    const tabBtns = document.querySelectorAll('.res-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.res-tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetPane = document.getElementById(btn.dataset.tab);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // Download Ticket as PNG using html2canvas
    downloadTicketPngBtn.addEventListener('click', () => {
        if (typeof html2canvas === 'undefined') {
            alert('html2canvas kutubxonasi yuklanmoqda, iltimos qayta urinib ko\'ring.');
            return;
        }
        downloadTicketPngBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rasm tayyorlanmoqda...';

        html2canvas(ticketPreviewCard, {
            scale: 2,
            backgroundColor: null,
            useCORS: true
        }).then(canvas => {
            const link = document.createElement('a');
            const safeName = (passengerNameInput.value.trim() || 'Passenger').replace(/\s+/g, '_');
            link.download = `Titanic_Boarding_Pass_${safeName}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            downloadTicketPngBtn.innerHTML = '<i class="fa-solid fa-check"></i> Chipta Yuklab Olindi!';
            setTimeout(() => {
                downloadTicketPngBtn.innerHTML = '<i class="fa-solid fa-camera"></i> Chiptani Rasm Qilib Saqlash (PNG)';
            }, 2500);
        }).catch(err => {
            console.error('html2canvas error:', err);
            downloadTicketPngBtn.innerHTML = '<i class="fa-solid fa-camera"></i> Chiptani Rasm Qilib Saqlash (PNG)';
            alert('Chiptani rasm qilib saqlashda xatolik yuz berdi.');
        });
    });

    // Form Submission & Prediction Handler
    passengerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            name: passengerNameInput.value.trim() || 'Hurmatli Yo\'lovchi',
            title: passengerTitleSelect.value,
            sex: selectedSex,
            pclass: selectedPclass,
            age: parseFloat(passengerAgeInput.value),
            sibsp: parseInt(sibspInput.value, 10) || 0,
            parch: parseInt(parchInput.value, 10) || 0,
            embarked: embarkedSelect.value,
            cabin: cabinSelect.value,
            fare: currentFare,
            model: modelSelect.value
        };

        ticketPreviewCard.classList.add('hidden');
        ticketDownloadBar.classList.add('hidden');
        resultState.classList.add('hidden');
        loadingState.classList.remove('hidden');

        playShipBell();

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            setTimeout(() => {
                loadingState.classList.add('hidden');
                if (result.status === 'success') {
                    renderFullResult(result);
                } else {
                    alert('Xatolik: ' + (result.message || 'Xatolik yuz berdi.'));
                    ticketPreviewCard.classList.remove('hidden');
                    ticketDownloadBar.classList.remove('hidden');
                }
            }, 1200);

        } catch (err) {
            console.error('Prediction request error:', err);
            loadingState.classList.add('hidden');
            ticketPreviewCard.classList.remove('hidden');
            ticketDownloadBar.classList.remove('hidden');
            alert('Server bilan bog\'lanishda xatolik yuz berdi.');
        }
    });

    // Render Full Advanced Prediction Result
    function renderFullResult(data) {
        const prob = data.survival_probability;
        const verdict = data.verdict;

        // Apply Sub-Zero Frozen vs Warm Rescued UI state
        if (prob < 50) {
            if (resultCardContainer) {
                resultCardContainer.classList.add('frozen-ui-state');
                resultCardContainer.classList.remove('rescued-ui-state');
            }
            if (subZeroBanner) subZeroBanner.classList.remove('hidden');
            if (rescueBanner) rescueBanner.classList.add('hidden');
            resultStatusTag.textContent = '❄️ SUB-ZERO: GIPOTERMIYA VA MUZLASH XAVFI';
            playFrostFreezeSound();
        } else {
            if (resultCardContainer) {
                resultCardContainer.classList.remove('frozen-ui-state');
                resultCardContainer.classList.add('rescued-ui-state');
            }
            if (subZeroBanner) subZeroBanner.classList.add('hidden');
            if (rescueBanner) rescueBanner.classList.remove('hidden');
            resultStatusTag.textContent = '🛟 NAJOT: CARPATHIA TOMONIDAN QUTQARILISH';
            playShipBell();
        }

        resultTitle.textContent = verdict.title;
        resultTitle.className = 'verdict-heading ' + (prob >= 50 ? 'survived' : 'peril');

        survivalProbText.textContent = `${prob}%`;
        if (prob >= 50) {
            gaugeCircle.style.background = `conic-gradient(#10b981 0% ${prob}%, rgba(255, 255, 255, 0.08) ${prob}% 100%)`;
        } else {
            gaugeCircle.style.background = `conic-gradient(#ef4444 0% ${prob}%, rgba(56, 189, 248, 0.25) ${prob}% 100%)`;
        }

        narrativeStory.textContent = verdict.story;

        // Update GridSearchCV Callout Banner
        const gsWinnerName = document.getElementById('gsWinnerName');
        const gsParamsNote = document.getElementById('gsParamsNote');
        if (data.gridsearch_info) {
            if (gsWinnerName) {
                gsWinnerName.textContent = `G'olib: ${data.gridsearch_info.best_model} (${data.gridsearch_info.accuracy}%)`;
            }
            if (gsParamsNote) {
                const paramsStr = Object.entries(data.gridsearch_info.best_params).map(([k, v]) => `${k}=${v}`).join(', ');
                gsParamsNote.textContent = `Optimal giperparametrlar: ${paramsStr} (${data.gridsearch_info.cv_strategy})`;
            }
        }

        // 1. Render Multi-Model Votes Grid (Responsive & Interactive)
        votesGrid.innerHTML = '';
        if (data.model_votes) {
            const shortNames = {
                'Logistic Regression': 'LogReg',
                'Support Vector Machine (SVC)': 'SVC',
                'Random Forest': 'RF',
                'Gradient Boosting': 'GradBoost',
                'K-Nearest Neighbors (KNN)': 'KNN'
            };
            Object.entries(data.model_votes).forEach(([mName, mVote]) => {
                const isSelected = mName === data.model_used || 
                    (data.model_used && data.model_used.includes(mName)) ||
                    (data.model_used && data.model_used.includes('GridSearchCV') && mName === 'Logistic Regression');
                const chip = document.createElement('div');
                chip.className = `vote-chip ${isSelected ? 'active-model' : ''}`;
                chip.title = `${mName}: ${mVote.survival_probability}% (Tanlash uchun bosing)`;
                const surv = mVote.survival_probability >= 50;
                const shortLabel = shortNames[mName] || mName;
                chip.innerHTML = `
                    <span class="vote-name">${shortLabel}</span>
                    <span class="vote-pct ${surv ? 'surv' : 'dead'}">${mVote.survival_probability}%</span>
                `;
                // Interactive bonus: Clicking on chip re-evaluates with that model immediately
                chip.addEventListener('click', () => {
                    if (modelSelect) {
                        modelSelect.value = mName;
                        passengerForm.dispatchEvent(new Event('submit'));
                    }
                });
                votesGrid.appendChild(chip);
            });
        }

        // Render Feature 5: XAI Dynamic Brass Balance Scale
        renderXaiScale(data);

        // Render Feature 6: 1912 White Star Line Daguerreotype Dossier
        renderDaguerreotypeDossier(data);

        // 2. Render Factors Tab
        factorsList.innerHTML = '';
        if (data.factors) {
            data.factors.forEach(factor => {
                const item = document.createElement('div');
                item.className = 'factor-item';
                item.innerHTML = `
                    <div class="factor-info">
                        <span class="factor-title">${factor.name}</span>
                        <span class="factor-desc">${factor.desc}</span>
                    </div>
                    <span class="factor-badge ${factor.impact}">${factor.score}</span>
                `;
                factorsList.appendChild(item);
            });
        }

        // 3. Render What-If Scenarios Tab
        whatIfList.innerHTML = '';
        if (data.what_if_scenarios) {
            data.what_if_scenarios.forEach(sc => {
                const item = document.createElement('div');
                item.className = 'what-if-card';
                item.innerHTML = `
                    <div class="what-if-title-box">
                        <i class="fa-solid ${sc.icon}"></i>
                        <span class="what-if-title">${sc.title}</span>
                    </div>
                    <div class="what-if-metrics">
                        <span class="new-pct">${sc.new_probability}%</span>
                        <span class="diff-pill ${sc.status}">${sc.diff_text}</span>
                    </div>
                `;
                whatIfList.appendChild(item);
            });
        }

        // 4. Render Historical Twin Tab
        twinCard.innerHTML = '';
        if (data.historical_twin && data.historical_twin.name) {
            const twin = data.historical_twin;
            twinCard.innerHTML = `
                <div class="twin-header">
                    <div class="twin-avatar">
                        <i class="fa-solid fa-user-tie"></i>
                    </div>
                    <div class="twin-name-box">
                        <h4>${twin.name}</h4>
                        <span class="twin-sub">Tarixiy Titanic yo'lovchisi (Sizga eng yaqin profil)</span>
                    </div>
                </div>
                <div class="twin-meta-grid">
                    <div><strong>Klass:</strong> ${twin.pclass}-klass</div>
                    <div><strong>Yoshi:</strong> ${twin.age} yoshda</div>
                    <div><strong>Chipta:</strong> ${twin.ticket}</div>
                    <div><strong>Port:</strong> ${twin.embarked}</div>
                    <div><strong>Kayuta:</strong> ${twin.cabin}</div>
                    <div><strong>Narx:</strong> £${twin.fare}</div>
                </div>
                <div class="twin-fate-banner ${twin.actual_survived ? 'survived' : 'perished'}">
                    <i class="fa-solid ${twin.actual_survived ? 'fa-circle-check' : 'fa-skull-crossbones'}"></i>
                    <span>${twin.fate_description}</span>
                </div>
            `;
        }

        // 5. Render Timeline Stepper Tab
        timelineList.innerHTML = '';
        if (data.timeline) {
            data.timeline.forEach(step => {
                const el = document.createElement('div');
                el.className = 'timeline-step';
                el.innerHTML = `
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <div class="timeline-time-box">
                            <span class="t-clock"><i class="fa-regular fa-clock"></i> ${step.time}</span>
                            <span class="t-event-title">${step.title}</span>
                        </div>
                        <p class="t-event-desc">${step.desc}</p>
                    </div>
                `;
                timelineList.appendChild(el);
            });
        }

        // 6. Render Marconi Telegram Tab
        marconiBox.innerHTML = '';
        if (data.telegram) {
            const tel = data.telegram;
            marconiBox.innerHTML = `
                <div class="telegram-head">
                    <span class="marconi-logo"><i class="fa-solid fa-tower-broadcast"></i> THE MARCONI TELEGRAPH CO.</span>
                    <span class="telegram-code">${tel.status_code}</span>
                </div>
                <div class="telegram-meta">
                    <div><strong>CALL SIGN:</strong> ${tel.call_sign}</div>
                    <div><strong>DATE & TIME:</strong> ${tel.date}</div>
                    <div><strong>POS:</strong> ${tel.coordinates}</div>
                </div>
                <div class="telegram-body-text">
                    ${tel.message}
                </div>
                <div class="telegram-footer">
                    <span>OFFICIAL DISPATCH</span>
                    <span>${tel.status_label}</span>
                </div>
            `;
        }

        resultState.classList.remove('hidden');
    }

    // ========================================================
    // FEATURE 5: XAI DYNAMIC BRASS BALANCE SCALE (TAQDIR TAROZISI)
    // ========================================================
    function renderXaiScale(data) {
        const balance = data.xai_balance;
        const scaleBeam = document.getElementById('scaleBeamAssembly');
        const scaleTag = document.getElementById('scaleBalanceTag');
        const leftPanScore = document.getElementById('leftPanScoreText');
        const rightPanScore = document.getElementById('rightPanScoreText');

        if (!balance) return;

        const angle = balance.tilt_angle || 0;
        // In physics: positive force tilts left pan down (rotate counter-clockwise, -angle)
        const rotationDeg = -angle;
        if (scaleBeam) {
            scaleBeam.setAttribute('transform', `rotate(${rotationDeg}, 250, 55)`);
        }

        if (leftPanScore) leftPanScore.textContent = `+${balance.positive_score}%`;
        if (rightPanScore) rightPanScore.textContent = `-${balance.negative_score}%`;

        if (scaleTag) {
            scaleTag.textContent = balance.tag_text || (balance.dominant_side === 'positive' ? '⚖️ Najot kuchi og\'irroq' : '⚖️ Xavf kuchi og\'irroq');
            scaleTag.className = 'scale-tag ' + (balance.dominant_side === 'positive' ? 'positive-win' : 'negative-win');
        }
    }

    // ========================================================
    // FEATURE 6: 1912 WHITE STAR LINE DAGUERREOTYPE DOSSIER
    // ========================================================
    function renderDaguerreotypeDossier(data) {
        const p = data.passenger_summary;
        if (!p) return;

        const dossierName = document.getElementById('dossierName');
        const dossierBirth = document.getElementById('dossierBirth');
        const dossierCalling = document.getElementById('dossierCalling');
        const dossierClass = document.getElementById('dossierClass');
        const dossierBerth = document.getElementById('dossierBerth');
        const dossierPort = document.getElementById('dossierPort');
        const dossierSerial = document.getElementById('dossierSerial');
        const dossierFateStamp = document.getElementById('dossierFateStamp');
        const dossierStampText = document.getElementById('dossierStampText');
        const vintageAvatarSvg = document.getElementById('vintageAvatarSvg');

        if (dossierName) dossierName.textContent = `${p.title}. ${p.name}`;
        if (dossierBirth) dossierBirth.textContent = `${p.birth_year || (1912 - p.age)} (${p.age} yoshda)`;
        if (dossierCalling) dossierCalling.textContent = p.occupation || 'Yo\'lovchi';
        
        const classNames = {
            1: 'First Class (1-Toifa Lyuks)',
            2: 'Second Class (2-Toifa O\'rta)',
            3: 'Third Class (3-Toifa Steerage)'
        };
        if (dossierClass) dossierClass.textContent = classNames[p.pclass] || `${p.pclass}-Klass`;
        if (dossierBerth) dossierBerth.textContent = p.cabin && p.cabin !== 'Belgilanmagan (Deck E/F)' ? `Cabin ${p.cabin}` : 'Deck E/F (Steerage Berth)';
        if (dossierPort) dossierPort.textContent = p.embarked_port;
        if (dossierSerial) dossierSerial.textContent = `DOC. No. ${p.ticket_no || 'WSL-1912-7489'}`;

        const survived = data.survival_probability >= 50;
        if (dossierFateStamp) {
            dossierFateStamp.className = 'verdict-rubber-stamp ' + (survived ? '' : 'perished');
        }
        if (dossierStampText) {
            dossierStampText.textContent = survived ? 'SURVIVOR // QUTQARILDI' : 'PERISHED // G\'ARQ BO\'LDI';
        }

        // Render Dynamic Period-Accurate SVG Daguerreotype Avatar
        if (vintageAvatarSvg) {
            vintageAvatarSvg.innerHTML = generateVintageSvgAvatar(selectedSex, p.age, p.pclass);
        }
    }

    function generateVintageSvgAvatar(sex, age, pclass) {
        let hatMarkup = '';
        let hairMarkup = '';
        let clothesMarkup = '';
        let faceDetails = '';

        const isChild = age < 14;

        if (isChild) {
            if (sex === 'male') {
                hatMarkup = `
                    <ellipse cx="70" cy="50" rx="28" ry="8" fill="#1b1713" />
                    <rect x="46" y="38" width="48" height="14" fill="#faf5ee" />
                    <path d="M 46,50 L 94,50" stroke="#1b1713" stroke-width="2" />
                    <path d="M 88,48 Q 105,55 100,72" stroke="#1b1713" stroke-width="3" fill="none" />
                `;
                clothesMarkup = `
                    <path d="M 40,118 Q 70,105 100,118 L 115,160 L 25,160 Z" fill="#2d251e" />
                    <polygon points="56,114 84,114 70,138" fill="#faf5ee" />
                    <polygon points="67,136 73,136 70,146" fill="#1b1713" />
                `;
            } else {
                hatMarkup = `
                    <polygon points="52,42 66,50 52,58" fill="#582a20" />
                    <polygon points="88,42 74,50 88,58" fill="#582a20" />
                    <circle cx="70" cy="50" r="5" fill="#3a1913" />
                `;
                hairMarkup = `
                    <path d="M 44,65 Q 40,88 48,110 Q 56,80 50,65" fill="#3a2818" />
                    <path d="M 96,65 Q 100,88 92,110 Q 84,80 90,65" fill="#3a2818" />
                `;
                clothesMarkup = `
                    <path d="M 38,120 Q 70,112 102,120 L 115,160 L 25,160 Z" fill="#3c2c20" />
                    <path d="M 52,118 Q 70,132 88,118" stroke="#faf5ee" stroke-width="4" fill="none" />
                `;
            }
        } else if (sex === 'female') {
            if (pclass === 1) {
                hatMarkup = `
                    <ellipse cx="70" cy="42" rx="55" ry="14" fill="#1a140f" stroke="#ca8a04" stroke-width="1.2" />
                    <path d="M 38,42 Q 70,18 102,42 Z" fill="#261c14" />
                    <path d="M 95,38 Q 120,15 110,5 Q 98,18 90,34" fill="#faf5ee" opacity="0.85" />
                `;
                hairMarkup = `
                    <ellipse cx="70" cy="58" rx="25" ry="14" fill="#322217" />
                `;
                clothesMarkup = `
                    <path d="M 30,122 Q 70,112 110,122 L 125,160 L 15,160 Z" fill="#211710" />
                    <ellipse cx="70" cy="116" rx="14" ry="4" stroke="#faf5ee" stroke-width="2.5" stroke-dasharray="3,3" fill="none" />
                    <polygon points="60,124 80,124 70,140" fill="#faf5ee" opacity="0.3" />
                `;
            } else {
                hatMarkup = `
                    <path d="M 44,70 Q 42,40 70,40 Q 98,40 96,70 Z" fill="#2d2218" />
                    <path d="M 44,70 Q 70,78 96,70" stroke="#854d0e" stroke-width="2" fill="none" />
                `;
                hairMarkup = `
                    <ellipse cx="70" cy="55" rx="20" ry="8" fill="#281a11" />
                `;
                clothesMarkup = `
                    <path d="M 35,122 Q 70,115 105,122 L 120,160 L 20,160 Z" fill="#281e16" />
                    <path d="M 45,122 L 70,150 L 95,122 Z" fill="#443224" />
                    <circle cx="70" cy="122" r="2.5" fill="#ca8a04" />
                `;
            }
        } else {
            // Male
            if (pclass === 1) {
                hatMarkup = `
                    <rect x="44" y="14" width="52" height="42" rx="2" fill="#0f0c09" />
                    <ellipse cx="70" cy="14" rx="26" ry="5" fill="#221b14" />
                    <rect x="44" y="48" width="52" height="8" fill="#ca8a04" opacity="0.6" />
                    <ellipse cx="70" cy="56" rx="42" ry="7" fill="#0f0c09" />
                `;
                faceDetails = `
                    <path d="M 60,94 Q 70,98 80,94 Q 78,102 70,98 Q 62,102 60,94 Z" fill="#281a11" />
                `;
                clothesMarkup = `
                    <path d="M 30,122 Q 70,110 110,122 L 125,160 L 15,160 Z" fill="#0f0c09" />
                    <polygon points="60,110 80,110 70,128" fill="#faf5ee" />
                    <polygon points="62,122 78,122 70,126" fill="#1b140e" />
                    <polygon points="62,130 78,130 70,126" fill="#1b140e" />
                    <circle cx="70" cy="126" r="2" fill="#ca8a04" />
                    <path d="M 38,122 L 62,160 L 50,160 Z" fill="#261d15" />
                    <path d="M 102,122 L 78,160 L 90,160 Z" fill="#261d15" />
                `;
            } else if (pclass === 2) {
                hatMarkup = `
                    <path d="M 44,48 Q 44,24 70,24 Q 96,24 96,48 Z" fill="#1c1610" />
                    <ellipse cx="70" cy="48" rx="38" ry="7" fill="#15100b" />
                    <rect x="46" y="43" width="48" height="5" fill="#583f2a" />
                `;
                faceDetails = `
                    <path d="M 62,94 Q 70,97 78,94 Q 76,99 70,96 Q 64,99 62,94 Z" fill="#322216" />
                `;
                clothesMarkup = `
                    <path d="M 32,122 Q 70,112 108,122 L 122,160 L 18,160 Z" fill="#241c14" />
                    <polygon points="62,112 78,112 70,126" fill="#faf5ee" />
                    <polygon points="67,124 73,124 70,154" fill="#78350f" />
                `;
            } else {
                hatMarkup = `
                    <path d="M 38,46 Q 70,30 102,46 Q 95,58 45,58 Z" fill="#2b2118" />
                    <ellipse cx="70" cy="35" r="3" fill="#1c150e" />
                    <path d="M 45,56 Q 70,62 95,56" stroke="#1c150e" stroke-width="3" fill="none" />
                `;
                clothesMarkup = `
                    <path d="M 30,122 Q 70,115 110,122 L 125,160 L 15,160 Z" fill="#2f251c" />
                    <path d="M 58,116 Q 70,135 82,116" stroke="#92400e" stroke-width="6" fill="none" />
                `;
            }
        }

        return `
            <rect x="0" y="0" width="140" height="160" fill="transparent" />
            <rect x="63" y="96" width="14" height="20" fill="#ccbda8" rx="2" />
            <ellipse cx="70" cy="80" rx="20" ry="24" fill="#decbb5" />
            <circle cx="63" cy="76" r="2" fill="#583f2a" />
            <circle cx="77" cy="76" r="2" fill="#583f2a" />
            <path d="M 70,76 L 68,85 L 72,85" stroke="#7a5b3e" stroke-width="1.2" fill="none" />
            ${faceDetails}
            ${hairMarkup}
            ${hatMarkup}
            ${clothesMarkup}
        `;
    }

    // Download 1912 Dossier Button
    const downloadDossierPngBtn = document.getElementById('downloadDossierPngBtn');
    if (downloadDossierPngBtn) {
        downloadDossierPngBtn.addEventListener('click', () => {
            const dossierEl = document.getElementById('vintageDossierCard');
            if (!dossierEl) return;
            downloadDossierPngBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guvohnoma rasmga olinmoqda...';
            html2canvas(dossierEl, {
                scale: 2,
                backgroundColor: '#fbf7ee',
                useCORS: true
            }).then(canvas => {
                const link = document.createElement('a');
                const safeName = (passengerNameInput.value.trim() || 'Passenger').replace(/\s+/g, '_');
                link.download = `Titanic_Dossier_1912_${safeName}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                downloadDossierPngBtn.innerHTML = '<i class="fa-solid fa-check"></i> Guvohnoma Yuklandi!';
                setTimeout(() => {
                    downloadDossierPngBtn.innerHTML = '<i class="fa-solid fa-camera"></i> 1912 Guvohnomasini Rasm Qilib Saqlash (PNG)';
                }, 2500);
            }).catch(err => {
                console.error('Dossier export error:', err);
                downloadDossierPngBtn.innerHTML = '<i class="fa-solid fa-camera"></i> 1912 Guvohnomasini Rasm Qilib Saqlash (PNG)';
                alert('Guvohnomani yuklashda xatolik yuz berdi.');
            });
        });
    }

    // Recalculate Button
    recalculateBtn.addEventListener('click', () => {
        resultState.classList.add('hidden');
        if (resultCardContainer) {
            resultCardContainer.classList.remove('frozen-ui-state', 'rescued-ui-state');
        }
        if (subZeroBanner) subZeroBanner.classList.add('hidden');
        if (rescueBanner) rescueBanner.classList.add('hidden');
        ticketPreviewCard.classList.remove('hidden');
        ticketDownloadBar.classList.remove('hidden');
    });

    // Print Button
    printTicketBtn.addEventListener('click', () => {
        window.print();
    });

    // Initialize Random Ticket Number & State
    ticketNo.textContent = `No. WSL-${Math.floor(10000 + Math.random() * 90000)}`;
    updateTicketPreview();

    // 4K Photo Gallery & Lightbox Modal Handler
    const galleryItems = document.querySelectorAll('.gallery-item');
    const photoLightboxModal = document.getElementById('photoLightboxModal');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');
    const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
    const lightboxBackdrop = document.getElementById('lightboxBackdrop');

    if (galleryItems.length && photoLightboxModal) {
        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                const fullSrc = item.dataset.full;
                const title = item.dataset.title;
                if (lightboxImg) lightboxImg.src = fullSrc;
                if (lightboxTitle) lightboxTitle.textContent = title;
                if (lightboxDownloadBtn) {
                    lightboxDownloadBtn.href = fullSrc;
                    lightboxDownloadBtn.setAttribute('download', fullSrc.split('/').pop());
                }
                photoLightboxModal.classList.remove('hidden');
            });
        });

        const closeLightbox = () => photoLightboxModal.classList.add('hidden');
        if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
        if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !photoLightboxModal.classList.contains('hidden')) {
                closeLightbox();
            }
        });
    }

    // Fetch and Load GridSearchCV Benchmarks
    loadModelsComparison();
});

/**
 * Fetches GridSearchCV benchmark data and initializes Chart.js visualizations
 */
async function loadModelsComparison() {
    try {
        const response = await fetch('/api/models-info');
        const json = await response.json();
        if (json.status !== 'success' || !json.data) return;

        const data = json.data;
        const models = data.models || [];
        const bestAlgorithm = data.best_algorithm || 'Logistic Regression';

        const kpiBestModel = document.getElementById('kpiBestModel');
        if (kpiBestModel) kpiBestModel.textContent = bestAlgorithm;

        const bestEntry = models.find(m => m.algorithm === bestAlgorithm) || models[0];
        if (bestEntry) {
            const kpiAccuracy = document.getElementById('kpiAccuracy');
            if (kpiAccuracy) kpiAccuracy.textContent = `${bestEntry.test_accuracy}%`;
        }

        const tbody = document.getElementById('benchmarkTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            models.forEach(m => {
                const tr = document.createElement('tr');
                const isWinner = m.algorithm === bestAlgorithm;
                if (isWinner) tr.className = 'winner-row';

                const paramsString = Object.entries(m.best_params || {})
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ');

                tr.innerHTML = `
                    <td>
                        <strong>${m.algorithm}</strong>
                        ${isWinner ? '<span class="winner-badge">G\'OLIB</span>' : ''}
                    </td>
                    <td>${m.best_cv_accuracy}%</td>
                    <td><strong>${m.test_accuracy}%</strong></td>
                    <td>${m.test_precision}%</td>
                    <td>${m.test_recall}%</td>
                    <td>${m.test_f1}%</td>
                    <td>${m.test_roc_auc}%</td>
                    <td><span class="code-pill">${paramsString || 'Default'}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }

        renderCharts(models);

    } catch (err) {
        console.error('Failed to load models comparison:', err);
    }
}

/**
 * Renders Accuracy and ROC-AUC / F1 comparison charts using Chart.js
 */
function renderCharts(models) {
    const labels = models.map(m => m.algorithm.replace('Support Vector Machine', 'SVM'));
    const cvAccuracies = models.map(m => m.best_cv_accuracy);
    const testAccuracies = models.map(m => m.test_accuracy);
    const rocAucs = models.map(m => m.test_roc_auc);
    const f1Scores = models.map(m => m.test_f1);

    const ctxAcc = document.getElementById('accuracyChart');
    if (ctxAcc) {
        new Chart(ctxAcc, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Test Aniqligi (%)',
                        data: testAccuracies,
                        backgroundColor: labels.map(l => l.includes('Logistic') ? '#d4af37' : 'rgba(56, 189, 248, 0.75)'),
                        borderColor: labels.map(l => l.includes('Logistic') ? '#f3e5ab' : '#38bdf8'),
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'CV Aniqligi (%)',
                        data: cvAccuracies,
                        backgroundColor: 'rgba(148, 163, 184, 0.3)',
                        borderColor: 'rgba(148, 163, 184, 0.6)',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#e2e8f0', font: { family: 'Plus Jakarta Sans', size: 11 } }
                    }
                },
                scales: {
                    y: {
                        min: 70,
                        max: 90,
                        grid: { color: 'rgba(255, 255, 255, 0.06)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#cbd5e1', font: { size: 10 } }
                    }
                }
            }
        });
    }

    const ctxRoc = document.getElementById('rocChart');
    if (ctxRoc) {
        new Chart(ctxRoc, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'ROC-AUC (%)',
                        data: rocAucs,
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'F1-Score (%)',
                        data: f1Scores,
                        backgroundColor: 'rgba(234, 179, 8, 0.7)',
                        borderColor: '#eab308',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#e2e8f0', font: { family: 'Plus Jakarta Sans', size: 11 } }
                    }
                },
                scales: {
                    y: {
                        min: 50,
                        max: 95,
                        grid: { color: 'rgba(255, 255, 255, 0.06)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#cbd5e1', font: { size: 10 } }
                    }
                }
            }
        });
    }
}
