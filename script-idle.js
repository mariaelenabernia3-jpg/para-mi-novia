// script-idle.js
document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const loveCounterEl = document.getElementById('love-counter');
    const lpsDisplayEl = document.getElementById('love-per-second');
    const clickBtn = document.getElementById('click-love-btn');
    const clickerZone = document.getElementById('clicker-zone');
    const upgradesContainer = document.getElementById('upgrades-container');
    const milestonesContainer = document.getElementById('milestones-container');
    const prestigeBtn = document.getElementById('prestige-btn');
    const prestigeGainEl = document.getElementById('prestige-gain');
    const prestigeCurrencyEl = document.getElementById('prestige-currency');
    const prestigeBonusEl = document.getElementById('prestige-bonus');

    // --- CONSTANTES DE JUEGO ---
    const IDLE_SAVE_KEY = 'nuestroAmorIdleSave';
    const PRESTIGE_REQUIREMENT = 1e9; // 1 Billón
    const PRESTIGE_CURRENCY_BONUS = 0.02; // +2% por cada Recuerdo

    // --- ESTADO DEL JUEGO ---
    let gameState = {
        love: 0,
        lovePerSecond: 0,
        prestige: {
            currency: 0,
            bonus: 1
        },
        upgrades: [
            { id: 'hugs', name: 'Abrazos', cost: 15, baseCost: 15, count: 0, production: 0.1 },
            { id: 'kisses', name: 'Besos', cost: 120, baseCost: 120, count: 0, production: 1 },
            { id: 'letters', name: 'Cartas de Amor', cost: 1300, baseCost: 1300, count: 0, production: 8 },
            { id: 'dates', name: 'Citas Especiales', cost: 15000, baseCost: 15000, count: 0, production: 47 },
            { id: 'trips', name: 'Viajes Juntos', cost: 180000, baseCost: 180000, count: 0, production: 260 },
            { id: 'dreams', name: 'Sueños Compartidos', cost: 2.5e6, baseCost: 2.5e6, count: 0, production: 1400 }
        ],
        milestones: [
            { id: 'first_trip', name: 'Primer Viaje', cost: 500000, unlocked: false, bonus: 2, description: 'Todo el Amor generado x2' },
            { id: 'anniversary', name: 'Aniversario', cost: 1e8, unlocked: false, bonus: 3, description: 'Todo el Amor generado x3' }
        ]
    };

    // --- FUNCIONES DE JUEGO ---
    function clickLove() {
        gameState.love++;
        showFloatingText('+1', event.clientX, event.clientY);
        updateDisplays();
    }

    function buyUpgrade(index) {
        const upgrade = gameState.upgrades[index];
        if (gameState.love >= upgrade.cost) {
            gameState.love -= upgrade.cost;
            upgrade.count++;
            upgrade.cost = Math.ceil(upgrade.baseCost * Math.pow(1.18, upgrade.count)); // Costo escala más rápido
            calculateLPS();
            renderUpgrades();
            updateDisplays();
        }
    }

    function buyMilestone(index) {
        const milestone = gameState.milestones[index];
        if (gameState.love >= milestone.cost && !milestone.unlocked) {
            gameState.love -= milestone.cost;
            milestone.unlocked = true;
            calculateLPS();
            renderMilestones();
            updateDisplays();
        }
    }

    function calculateLPS() {
        let baseLPS = gameState.upgrades.reduce((total, upg) => total + (upg.count * upg.production), 0);
        let milestoneMultiplier = gameState.milestones.reduce((total, ms) => ms.unlocked ? total * ms.bonus : total, 1);
        gameState.lovePerSecond = baseLPS * milestoneMultiplier * gameState.prestige.bonus;
    }

    function calculatePrestigeGain() {
        if (gameState.love < PRESTIGE_REQUIREMENT) return 0;
        // Fórmula de prestigio: raíz cúbica del amor en billones
        return Math.floor(3 * Math.pow(gameState.love / PRESTIGE_REQUIREMENT, 0.5));
    }

    function performPrestige() {
        const gain = calculatePrestigeGain();
        if (gain <= 0) return;
        if (!confirm(`¿Estás seguro de que quieres renacer? Tu progreso se reiniciará, pero obtendrás ${gain} Recuerdos Inolvidables, que aumentarán tu producción de amor permanentemente.`)) return;

        const prestigeCurrency = gameState.prestige.currency + gain;
        
        // Reiniciar estado
        gameState.love = 0;
        gameState.lovePerSecond = 0;
        gameState.upgrades.forEach(upg => {
            upg.count = 0;
            upg.cost = upg.baseCost;
        });
        gameState.milestones.forEach(ms => ms.unlocked = false);
        
        // Conservar y aplicar prestigio
        gameState.prestige.currency = prestigeCurrency;
        gameState.prestige.bonus = 1 + (prestigeCurrency * PRESTIGE_CURRENCY_BONUS);
        
        // Actualizar todo
        calculateLPS();
        renderAll();
        updateDisplays();
        saveGame();
    }

    // --- FUNCIONES DE RENDERIZADO Y UI ---
    function formatNumber(num) {
        if (num < 1e3) return Math.floor(num).toString();
        if (num < 1e6) return (num / 1e3).toFixed(2) + ' Mil';
        if (num < 1e9) return (num / 1e6).toFixed(2) + ' Millones';
        if (num < 1e12) return (num / 1e9).toFixed(2) + ' Billones';
        return num.toExponential(2);
    }

    function renderUpgrades() {
        upgradesContainer.innerHTML = '';
        gameState.upgrades.forEach((upg, i) => {
            const upgradeEl = document.createElement('div');
            upgradeEl.className = 'upgrade';
            upgradeEl.innerHTML = `
                <div class="upgrade-header">
                    <span class="upgrade-name">${upg.name}</span>
                    <span class="upgrade-level">Nivel ${upg.count}</span>
                </div>
                <p class="upgrade-details">Produce ${upg.production.toFixed(1)} amor/s cada uno.</p>
                <button id="buy-${upg.id}" class="buy-upgrade-btn">
                    <div class="progress-bar"></div>
                    <span class="btn-content">Costo: ${formatNumber(upg.cost)}</span>
                </button>
            `;
            upgradesContainer.appendChild(upgradeEl);
            upgradeEl.querySelector('button').addEventListener('click', () => buyUpgrade(i));
        });
    }

    function renderMilestones() {
        milestonesContainer.innerHTML = '';
        gameState.milestones.forEach((ms, i) => {
            const milestoneEl = document.createElement('div');
            milestoneEl.className = `milestone ${ms.unlocked ? 'milestone-bought' : ''}`;
            milestoneEl.innerHTML = `
                <strong>${ms.name}</strong>
                <p class="milestone-bonus">${ms.description}</p>
                <button class="buy-milestone-btn" ${ms.unlocked ? 'disabled' : ''}>Costo: ${formatNumber(ms.cost)}</button>
            `;
            milestonesContainer.appendChild(milestoneEl);
            if (!ms.unlocked) {
                milestoneEl.querySelector('button').addEventListener('click', () => buyMilestone(i));
            }
        });
    }

    function updateDisplays() {
        loveCounterEl.textContent = formatNumber(gameState.love);
        lpsDisplayEl.textContent = formatNumber(gameState.lovePerSecond);

        // Actualizar botones de mejora y barras de progreso
        gameState.upgrades.forEach(upg => {
            const btn = document.getElementById(`buy-${upg.id}`);
            if (btn) {
                btn.disabled = gameState.love < upg.cost;
                const progressBar = btn.querySelector('.progress-bar');
                const progress = Math.min(1, gameState.love / upg.cost) * 100;
                progressBar.style.width = `${progress}%`;
            }
        });
        
        // Actualizar botones de momentos especiales
        gameState.milestones.forEach(ms => {
            const btn = milestonesContainer.querySelector(`#milestones-container .milestone:nth-child(${gameState.milestones.indexOf(ms) + 1}) button`);
            if (btn) btn.disabled = gameState.love < ms.cost;
        });

        // Actualizar sección de prestigio
        const prestigeGain = calculatePrestigeGain();
        prestigeGainEl.textContent = prestigeGain;
        prestigeBtn.disabled = prestigeGain <= 0;
        prestigeCurrencyEl.textContent = gameState.prestige.currency;
        prestigeBonusEl.textContent = `+${((gameState.prestige.bonus - 1) * 100).toFixed(0)}%`;
    }

    function showFloatingText(text, x, y) {
        const floatingText = document.createElement('div');
        floatingText.className = 'floating-plus-one';
        floatingText.textContent = text;
        clickerZone.appendChild(floatingText);
        
        // Posicionar relativo a la zona del clicker para consistencia
        const rect = clickerZone.getBoundingClientRect();
        floatingText.style.left = `${x - rect.left}px`;
        floatingText.style.top = `${y - rect.top}px`;

        setTimeout(() => floatingText.remove(), 1000);
    }

    function renderAll() {
        renderUpgrades();
        renderMilestones();
    }

    // --- LÓGICA DE GUARDADO/CARGADO ---
    function saveGame() {
        localStorage.setItem(IDLE_SAVE_KEY, JSON.stringify(gameState));
    }

    function loadGame() {
        const savedGame = localStorage.getItem(IDLE_SAVE_KEY);
        if (savedGame) {
            const savedState = JSON.parse(savedGame);
            // Fusionar el estado guardado con el estado por defecto para añadir nuevas mejoras en futuras actualizaciones
            gameState = { ...gameState, ...savedState, prestige: { ...gameState.prestige, ...savedState.prestige } };
            // Asegurarse de que las estructuras de array internas también se fusionen
            gameState.upgrades.forEach((upg, i) => {
                if (savedState.upgrades[i]) { Object.assign(upg, savedState.upgrades[i]); }
            });
            gameState.milestones.forEach((ms, i) => {
                if (savedState.milestones[i]) { Object.assign(ms, savedState.milestones[i]); }
            });
        }
        calculateLPS();
        renderAll();
        updateDisplays();
    }

    // --- INICIALIZACIÓN Y BUCLES DE JUEGO ---
    clickBtn.addEventListener('click', clickLove);
    prestigeBtn.addEventListener('click', performPrestige);
    loadGame();

    // Game Loop principal
    setInterval(() => {
        gameState.love += gameState.lovePerSecond / 10; // Actualizar 10 veces por segundo
        updateDisplays();
    }, 100);

    setInterval(saveGame, 5000); // Guardar cada 5 segundos
});