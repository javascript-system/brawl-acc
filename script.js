const BACKEND = "https://brawl-backend-bvun.onrender.com/";
let currentPlayer = null;
let currentAbortController = null;
const checkInternet = () => window.navigator.onLine;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function monitorConnection() {
    while (!checkInternet()) {
        await message(
            "Connection issues",
            "Please check your internet connection to continue.\nWhen you connect, click OK to continue."
        );
        await delay(500);
    }
}

const formatedModes = {
    basketBrawl: "Basket Brawl",
    bounty: "Bounty",
    brawlBall: "Brawl Ball",
    brawlBall5v5: "Brawl Ball 5v5",
    brawlHockey: "Brawl Hockey",
    duels: "Duels",
    duoShowdown: "Duo Showdown",
    gemGrab: "Gem Grab",
    gemGrab5v5: "Gem Grab 5v5",
    heist: "Heist",
    hotZone: "Hot Zone",
    knockout: "Knockout",
    knockout5v5: "Knockout 5v5",
    paintBrawl: "Paint Brawl",
    soloShowdown: "Solo Showdown",
    trioShowdown: "Trio Showdown",
    volleyBrawl: "Volley Brawl",
    wipeout5v5: "Wipeout 5v5"
};

window.addEventListener('offline', monitorConnection);
monitorConnection();
loadRecentAccounts();

async function searchPlayer(customTag = null) {
    document.querySelector("html").classList.add("loading");
    const input = document.getElementById("tag-input");
    const progressBar = document.getElementById("progress-bar");

    function resetBar() {
        if (progressBar) progressBar.style.width = "100%";
        setTimeout(() => {
            progressBar.style.opacity = "0";
            setTimeout(() => {
                progressBar.style.width = "0%";
            }, 400);
        }, 300);
        document.querySelector("html").classList.remove("loading");
    }

    if (progressBar) {
        progressBar.style.opacity = "1";
        progressBar.style.width = "20%";
    }

    let tag = "";
    if (customTag) tag = customTag;
    else if (input) tag = input.value;
    if (!tag) { message("Invalid search", "Please write a tag first."); resetBar(); return }
    tag = String(tag).toUpperCase();
    if (currentAbortController) {
        currentAbortController.abort()
    }
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;
    let link = `${BACKEND}player/${tag.replace("#", "")}`.trim();

    if (progressBar) progressBar.style.width = "30%";

    try {
        const response = await fetch(link, { signal });
        console.log(`Assessed account: ${link}`);
        if (!response.ok) {
            console.log("An error occured: " + response.status);
            resetBar();
            return;
        }
        const data = await response.json();
        if (data.reason && data.reason === "notFound") {
            message("Invalid search", "Your tag doesn't seem to work...");
            resetBar();
            return;
        }

        if (progressBar) progressBar.style.width = "50%";

        await renderStatus(data, signal);
        saveRecentAccount(data);
        document.getElementById("sidebar").classList.remove("hidden");
        document.getElementById("menus").classList.remove("hidden");
        if (progressBar) progressBar.style.width = "70%";
        document.getElementById("search-message").style.display = "none";
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log("Current search cancelled to give place to the new one.");
        } else {
            console.error("An error occured while searching tag:", error);
        }
    }

    resetBar();

}

async function renderStatus(data) {
    document.title = `Account - ${data.name}`;

    const color =
        "#" +
        String(data.nameColor)
            .replace("0xff", "")
            .replace("0x", "");


    const playerName =
        document.getElementById(
            "player-name"
        );

    playerName.textContent =
        data.name;

    playerName.style.color =
        color;



    document.getElementById("player-tag").textContent = data.tag;
    const iconUrl = `https://cdn.brawlify.com/profile-icons/regular/${data.icon.id}.png`;
    document.getElementById("profile-icon").innerHTML = `<img src="${iconUrl}" alt="Icon">`;
    const clubFFTxt = document.getElementById("club-ff");
    const clubFFImg = document.getElementById("club-ff-img");
    const clubTImg = document.getElementById("club-t-img");
    const clubTTxt = document.getElementById("club-t");
    const clubTagTxt = document.getElementById("club-tag");
    const membersContainer = document.getElementById("club-members");
    let clubInformation = "None";
    if (!data.club || !data.club.tag) {
        document.getElementById("club-icon").src = "assets/club.png";
        membersContainer.innerHTML = "<p style=\"color: #7f8486ff\">No members</p>"
        document.getElementById("club-trophies").textContent = "---";
        clubFFTxt.textContent = "---";
        clubFFImg.src = "assets/unknown.png";
        clubTImg.src = "assets/unknown.png";
        clubTTxt.textContent = "---";
        clubTagTxt.textContent = "---";
    }
    else {
        const clubResponse = await fetch(`${BACKEND}club/${data.club.tag.replace("#", "")}`);
        const clubData = await clubResponse.json();
        document.getElementById("club-icon").src = `https://cdn.brawlify.com/club-badges/regular/${clubData.badgeId}.png`;
        membersContainer.innerHTML = "";
        clubData.members.forEach(member => {
            const card = document.createElement("div");
            card.className = "club-member";
            const color = "#" + String(member.nameColor).replace("0xff", "");
            const icon = `https://cdn.brawlify.com/profile-icons/regular/${member.icon.id}.png`;
            card.innerHTML = `<img src="${icon}"><h3 style="color:${color}">${member.name}</h3><p style="color: ${member.role === 'president' ? 'red' : member.role === 'vicePresident' ? 'orange' : member.role === 'senior' ? 'green' : 'blue'}">${member.role}</p><p style="color: #7f8486ff">${member.tag}</p><span><img src="assets/trophy.png"> ${member.trophies}</span>`;
            membersContainer.appendChild(card);
        });
        document.getElementById("club-trophies").textContent = clubData.trophies;
        if (clubData.isFamilyFriendly == true) { clubFFTxt.textContent = "Family friendly"; clubFFImg.src = "assets/family-friendly.png" }
        else { clubFFTxt.textContent = "Not Family Friendly"; clubFFImg.src = "assets/not-family-friendly.png" }
        if (clubData.type === "open") { clubTImg.src = "assets/unlocked.png"; clubTTxt.textContent = "Open for anyone" }
        else if (clubData.type === "closed") { clubTImg.src = "assets/locked.png"; clubTTxt.textContent = "Closed and private" }
        else if (clubData.type === "inviteOnly") { clubTImg.src = "assets/invite-only.png"; clubTTxt.textContent = "Invite only" }
        if (clubData.members.length == 30) { clubTTxt.textContent += " (the club is full)"; clubTImg.src = "assets/locked.png" }
        clubTagTxt.textContent = clubData.tag
        clubInformation = clubData;
    }

    document.getElementById("trophies").textContent = data.trophies;
    document.getElementById("prestige").textContent = data.totalPrestigeLevel;
    document.getElementById("level").textContent = data.expLevel;
    document.getElementById("ranked").textContent = `${typeof data.rankedRankName === "string" ? data.rankedRankName : "UNRANKED"}`;
    document.getElementById("elo").textContent = data.rankedElo;
    document.getElementById("wins3v3").textContent = data["3vs3Victories"];
    document.getElementById("solo-wins").textContent = data.soloVictories;
    document.getElementById("duo-wins").textContent = data.duoVictories;
    document.getElementById("club-name").textContent = data.club?.name || "No Club";

    menusRender.forEach((menu) => { menu.func(data, clubInformation) });
}

function openMenu(menu) {
    document.querySelectorAll(".menu").forEach(element => { element.classList.remove("active-menu"); });
    document.getElementById(`${menu}-menu`).classList.add("active-menu");
}

function saveRecentAccount(data) {
    let accounts = JSON.parse(localStorage.getItem("recentAccounts")) || [];
    accounts = accounts.filter(account => account.tag !== data.tag);
    accounts.unshift({
        tag: data.tag,
        name: data.name,
        color: data.nameColor,
        icon: data.icon.id
    });
    accounts = accounts.slice(0, 5);
    localStorage.setItem("recentAccounts", JSON.stringify(accounts));
    loadRecentAccounts();
}

function loadRecentAccounts() {
    const recent = JSON.parse(localStorage.getItem("recentAccounts")) || [];
    const list = document.getElementById("recent-list");
    list.innerHTML = "";
    recent.forEach(account => {
        const swt = document.getElementById("search-warn-txt")
        if (swt) swt.remove();
        const div = document.createElement("div");
        div.className = "recent-item";
        const color = "#" + String(account.color).replace("0xff", "").replace("0x", "")
        const icon = `https://cdn.brawlify.com/profile-icons/regular/${account.icon}.png`;
        div.innerHTML = `<img src="${icon}"><div><h3 style="color:${color}">${account.name}</h3><p>${account.tag}</p></div>`;
        div.addEventListener("click", () => { searchPlayer(account.tag) });
        list.appendChild(div);
    });
}

document.getElementById("search-button").addEventListener("click", () => { searchPlayer() });
document.getElementById("tag-input").addEventListener("keydown", event => { if (event.key === "Enter") searchPlayer() });

function message(title, text) {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "custom-modal-overlay";
        const box = document.createElement("div");
        box.className = "custom-modal-box";
        if (title && String(title).trim().toLowerCase() !== "none") {
            const h1 = document.createElement("h1");
            h1.textContent = title;
            box.appendChild(h1);
        }
        const p = document.createElement("p");
        p.textContent = text;
        box.appendChild(p);
        const btn = document.createElement("button");
        btn.className = "custom-modal-btn";
        btn.textContent = "OK";
        box.appendChild(btn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add("active"), 10);
        btn.addEventListener("click", () => {
            overlay.classList.remove("active");
            setTimeout(() => {
                overlay.remove();
                resolve();
            }, 200);
        });
    });
}

document.querySelectorAll("#sidebar nav button").forEach(button => {
    button.addEventListener("click", () => {
        const menu = button.dataset.menu;
        openMenu(menu);
    });
});

document.getElementById("toggle-sidebar").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("collapsed");
});

document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.altKey && (event.key === '1' || event.code === 'Digit1')) {
        event.preventDefault();
        const confirmar = confirm('IMPORTANT WARN: THIS IS A DEVELOPER TOOL, USE THE CANCEL BUTTON IF YOU DON\'T KNOW WHAT YOU\'RE DOING!\n\nAre you sure that you want to reload the page and remove your saved recent tags list?');
        if (confirmar) {
            localStorage.clear();
            window.location.reload();
        }
    }
});


const menusRender = [
    {
        name: "brawlers-menu",
        func: async (player, _club) => {
            const grid = document.getElementById("brawlers-grid"), search = document.getElementById("brawler-search");
            async function render(list) {
                let totalMaxed = 0;
                let totalHyper = 0;
                const delay = ms => new Promise(res => setTimeout(res, ms));
                grid.innerHTML = "";
                list.sort((a, b) => b.trophies - a.trophies);
                let mainBrawler = list[0];
                document.getElementById("main-brawler").textContent = mainBrawler.name.toLowerCase();
                document.getElementById("brawlers-count").textContent = list.length;
                for (const brawler of list) {
                    const card = document.createElement("div"), icon = `https://cdn.brawlify.com/brawlers/borderless/${brawler.id}.png`, hyper = brawler.hyperCharges?.length > 0, maxed = brawler.power >= 11;
                    if (hyper) totalHyper += 1;
                    if (maxed) totalMaxed += 1;
                    card.className = `brawler-card ${hyper ? "hyper" : ""} ${maxed ? "maxed" : ""} ${brawler.buffies.hyperCharge == true ? "buffie-charged" : ""}`;
                    card.innerHTML = `${hyper ? `<div class="brawler-hyper"><img id="brawler-card-hyepercharge" src="assets/hypercharge${brawler.buffies.hyperCharge == true ? "-buffie" : ""}.png"></div>` : ""}
                    <img class="brawler-icon" src="${icon}">
                    <h2 ${brawler.buffies.hyperCharge == true ? "style=\"color: #f700ffff\"" : ""}>${brawler.name}</h2>
                    <p class="brawler-power">Power ${brawler.power}</p>
                    <div class="brawler-stats">
                        <span ${brawler.trophies < 1000 ? '' : brawler.trophies < 2000 ? 'style="color: #6A2CCF"' : brawler.trophies < 3000 ? 'style="color: #FF1919"' : 'style="color: #FFCC00"'}>
                            <img src="assets/trophy.png">
                            ${brawler.trophies}
                        </span>
                        <span>
                            <img src="assets/rank.png">
                            Rank ${brawler.rank}
                        </span>
                        <span>
                            <img src="assets/fire.png">
                            Max ${brawler.maxWinStreak}
                        </span>
                    </div>
                    <div class="brawler-bottom">
                        <div class="brawler-info">
                            <img src="assets/skin.png">
                            <span class="brawler-skin">${brawler.skin?.name || "Default Skin"}</span>
                        </div>
                        <div class="brawler-info" ${brawler.buffies.gadget == true ? "style=\"color: #48ff00ff\"" : ""}>
                            <img src="assets/gadget${brawler.buffies.gadget == true ? "-buffie" : ""}.png">
                            ${brawler.gadgets?.length || 0} Gadgets
                        </div>
                        <div class="brawler-info" ${brawler.buffies.starPower == true ? "style=\"color: #fffb00ff\"" : ""}>
                            <img src="assets/starpower${brawler.buffies.starPower == true ? "-buffie" : ""}.png">
                            ${brawler.starPowers?.length || 0} Star Powers
                        </div>
                        <div class="brawler-info">
                            <img src="assets/gear.png">
                            ${brawler.gears?.length || 0} Gears
                        </div>
                    </div>`;
                    grid.appendChild(card);
                    await delay(30);
                }
                document.getElementById("max-brawlers-count").textContent = totalMaxed;
                document.getElementById("hyper-brawlers-count").textContent = totalHyper;
                const brawlerSkinTxts = document.querySelectorAll(".brawler-skin");
                brawlerSkinTxts.forEach(txt => {
                    txt.addEventListener("click", () => {
                        const urlGoogle = "https://google.com/search?q=" + encodeURIComponent(`Brawl stars skin ${txt.textContent.trim().toLowerCase()}`) + "&tbm=isch";
                        window.open(urlGoogle, '_blank');
                    });
                });
            }
            render(player.brawlers);
            search.oninput = () => {
                const value = search.value.toLowerCase().trim();
                render(player.brawlers.filter(b => b.name.toLowerCase().includes(value)));
            }
        }
    },
    {
        name: "battlelogs-menu",
        func: async (player, _club) => {
            const response = await fetch(`${BACKEND}battlelog/${player.tag.replace("#", "")}`);
            const data = await response.json();
            const list = document.getElementById("battlelogs-list");
            list.innerHTML = "";
            let wins = 0;
            let losses = 0;
            let enemyWins = {};
            let brawlerStats = {};
            data.items.forEach(log => {
                const battle = log.battle || {};
                const event = log.event || {};
                const players = battle.players || battle.teams?.flat() || [];
                const myself = players.find(p => p.tag === player.tag);
                if (!myself) return;
                const mode = event.mode || battle.mode || "unknown";
                const result = battle.result === "victory" ? "win" : battle.result === "defeat" ? "lose" : (battle.rank && battle.rank <= 4) ? "win" : "lose";
                const myBrawler = myself.brawler?.name || "Unknown";
                if (!brawlerStats[myBrawler]) {
                    brawlerStats[myBrawler] = {
                        wins: 0,
                        losses: 0
                    };
                }
                if (result === "win") {
                    wins++;
                    brawlerStats[myBrawler].wins++;
                } else {
                    losses++;
                    brawlerStats[myBrawler].losses++;
                }
                players.forEach(p => {
                    if (p.tag !== player.tag) {
                        const enemy = p.brawler?.name;
                        if (!enemy) return;
                        enemyWins[enemy] = (enemyWins[enemy] || 0) + (result === "lose" ? 1 : 0);
                    }
                });
                const card = document.createElement("div");
                const modeIcon = `assets/battle-modes/${mode}.png`;
                const fixedDate = log.battleTime?.replace(
                    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
                    "$1-$2-$3T$4:$5:$6"
                );

                const date = fixedDate && !isNaN(Date.parse(fixedDate))
                    ? new Date(fixedDate).toLocaleString()
                    : "Unknown date";
                card.className = `battle-card ${result}`;
                card.innerHTML = `
                <div class="battle-top">
                    <div class="battle-mode">
                        <img src="${modeIcon}" onerror="this.src='assets/unknown.png'">
                        <div>
                            <h2>${formatedModes[mode] || mode}</h2>
                            <p>${event.map || "Unknown map"}</p>
                        </div>
                    </div>
                    <div class="battle-result ${result}">${battle.trophyChange > 0 ? `+${battle.trophyChange}` : battle.trophyChange || 0} 🏆</div>

                </div>
                <div class="battle-extra">
                    <div>
                        <img src="assets/rank.png">
                        ${battle.rank ? `Rank ${battle.rank}` : "Unranked"}
                    </div>
                    <div>
                        <img src="assets/time.png">
                        ${date}
                    </div>
                    <div>
                        <img src="assets/trophy.png">
                        ${players.length} Players
                    </div>
                </div>
                <div class="battle-players">
                ${players.map(p => {
                    const color = `#${(p.nameColor || "0xffffffff").replace("0xff", "")}`;
                    const brawler = `https://cdn.brawlify.com/brawlers/borderless/${p.brawler.id}.png`;
                    return `<div class="battle-player">
                                <img src="${brawler}">
                                <div class="battle-player-info">
                                    <h3 style="color:${color}">${p.name}</h3>
                                    <p>${p.brawler.name} • Power ${p.brawler.power}</p>
                                    <span><img src="assets/trophy.png">${p.brawler.trophies}</span>
                                </div>
                            </div>`;
                }).join("")}
                </div>`;
                list.appendChild(card);
            });

            const best = Object.entries(brawlerStats).sort((a, b) => b[1].wins - a[1].wins)[0]?.[0] || "None";
            const worst = Object.entries(brawlerStats).sort((a, b) => a[1].wins - b[1].wins)[0]?.[0] || "None";
            const nemesis = Object.entries(enemyWins).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
            document.getElementById("total-battles").textContent = data.items.length;
            document.getElementById("winrate").textContent = `${Math.round((wins / (wins + losses || 1)) * 100)}%`;
            document.getElementById("best-brawler").textContent = best;
            document.getElementById("worst-brawler").textContent = worst;
            document.getElementById("nemesis").textContent = nemesis;
            list.innerHTML += `<p>${data.items.length > 0 ? "No more battlelogs found." : "No battlelogs found."}</p>`;
        }
    }];