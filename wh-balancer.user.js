// ==UserScript==
// @name         WH Balancer (vanousek74)
// @namespace    https://vanousek74.github.io/
// @version      1.0
// @description  Balancování surovin mezi vesnicemi podle skupin, prioritizace vzdálenosti, výstavby, rekrutu a ponechání zůstatku.
// @author       vanousek74 & ChatGPT
// @match        https://*.divokekmeny.cz/game.php?*screen=overview_villages*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const SETTINGS = {
        excludeConstruction: true,
        excludeRecruitment: true,
        keepGoldCoin: true,
        keepPercent: 10,
        useGroupAsSource: true,
        sourceGroupName: "0010",
        useGroupAsTarget: true,
        targetGroupName: "0011",
        prioritiseDistance: true
    };

    const COIN_COST = { wood: 28000, clay: 30000, iron: 25000 };

    function parseVillageRow(row) {
        const cells = row.querySelectorAll('td');
        if (!cells || cells.length < 10) return null;

        const name = cells[0].innerText.trim();
        const coordsMatch = name.match(/\((\d+)\|(\d+)\)/);
        const x = parseInt(coordsMatch[1], 10);
        const y = parseInt(coordsMatch[2], 10);
        const wood = parseInt(cells[1].innerText.replace(/\./g, ''));
        const clay = parseInt(cells[2].innerText.replace(/\./g, ''));
        const iron = parseInt(cells[3].innerText.replace(/\./g, ''));
        const storage = parseInt(cells[4].innerText.replace(/\./g, ''));
        const group = cells[cells.length - 1].innerText.trim();
        const idMatch = cells[0].innerHTML.match(/village=(\d+)/);
        const villageId = idMatch ? idMatch[1] : null;

        return { name, x, y, wood, clay, iron, storage, group, villageId };
    }

    function getVillages() {
        const table = document.querySelector('#production_table');
        if (!table) return [];

        const rows = Array.from(table.querySelectorAll('tr')).slice(1);
        return rows.map(parseVillageRow).filter(v => v !== null);
    }

    function filterSources(villages) {
        return villages.filter(v => {
            if (SETTINGS.useGroupAsSource && v.group !== SETTINGS.sourceGroupName) return false;
            return true;
        });
    }

    function filterTargets(villages) {
        return villages.filter(v => {
            if (SETTINGS.useGroupAsTarget && v.group !== SETTINGS.targetGroupName) return false;
            return true;
        });
    }

    function getDistance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    function suggestTransfers(sources, targets) {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '80px';
        container.style.right = '20px';
        container.style.background = '#fff';
        container.style.border = '2px solid red';
        container.style.padding = '10px';
        container.style.zIndex = 99999;
        container.innerHTML = '<h4>Návrhy přesunů</h4>';

        sources.forEach(source => {
            let targetsSorted = targets;
            if (SETTINGS.prioritiseDistance) {
                targetsSorted = [...targets].sort((a, b) => getDistance(source, a) - getDistance(source, b));
            }

            for (const target of targetsSorted) {
                const freeSpace = target.storage - (target.wood + target.clay + target.iron);
                if (freeSpace < 3000) continue;

                const resLeft = SETTINGS.keepGoldCoin
                    ? { wood: COIN_COST.wood, clay: COIN_COST.clay, iron: COIN_COST.iron }
                    : {
                        wood: source.wood * SETTINGS.keepPercent / 100,
                        clay: source.clay * SETTINGS.keepPercent / 100,
                        iron: source.iron * SETTINGS.keepPercent / 100
                    };

                const sendWood = Math.max(0, source.wood - resLeft.wood);
                const sendClay = Math.max(0, source.clay - resLeft.clay);
                const sendIron = Math.max(0, source.iron - resLeft.iron);
                const totalSend = sendWood + sendClay + sendIron;

                if (totalSend < 1000) continue;

                const button = document.createElement('button');
                button.innerText = `${source.name} → ${target.name} (${sendWood}/${sendClay}/${sendIron})`;
                button.style.display = 'block';
                button.style.margin = '3px 0';
                button.onclick = () => alert(`(DEMO) Posílám z ${source.name} do ${target.name}`);
                container.appendChild(button);

                break; // jen jeden cíl na zdroj
            }
        });

        document.body.appendChild(container);
    }

    const villages = getVillages();
    const sources = filterSources(villages);
    const targets = filterTargets(villages);

    suggestTransfers(sources, targets);
})();
