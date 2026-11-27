# RL Career Extras — playtest build 0.1.0-beta

**RL Career Extras** is a free, unofficial add-on for **RL Career Hub** that adds six new tabs and a live match caster to your career. It is **standalone**: it runs alongside the game without modifying any of its files, does not need or load any other add-on, and supports both the English and Spanish interfaces of the Hub.

> **This is a playtest build.** Everything below works in our own testing, but it has only been played on a few machines. Please report anything that breaks, feels unbalanced or reads oddly; see [Reporting bugs](#reporting-bugs).

---

## Requirements

- Windows 10 or 11
- **RL Career Hub 0.2.0-beta.33**. Other versions are blocked on purpose; see [Known limitations](#known-limitations).
- *Optional, for the live caster:* playing your matches in Rocket League from the Hub, as the Hub normally does through RLBot.

No Node.js, Python or anything else to install: the add-on uses the Electron and Python runtimes that ship with RL Career Hub.

## Installation

1. Close RL Career Hub.
2. Download the latest `RL-Career-Extras-<version>.zip` from the **Releases** page of this repository and extract it anywhere, for example on your desktop.
3. Double-click **`INSTALL.cmd`**.
   - It finds RL Career Hub automatically. If it cannot, it asks you to paste the path of `RL Career Hub.exe`.
   - It copies the add-on to `%LOCALAPPDATA%\RLCareerExtras` and creates a **RL Career Extras** shortcut on your desktop.
4. From now on, start the game with the **RL Career Extras** shortcut. Opening the Hub the usual way starts it without the add-on.

From a command prompt you can also run:

```
INSTALL.cmd "D:\Games\RL Career Hub\RL Career Hub.exe"
```

**Uninstall:** run `UNINSTALL.cmd`, either from the zip or from `%LOCALAPPDATA%\RLCareerExtras`. Your saves are kept.

## What you get

### 🏛️ Hall of Fame
- Club history: series, goals, trophies, best streak, trophy cabinet, all-time leaders, your nemesis and your favourite victim.
- Records, such as biggest win, worst loss and best individual games.
- Induct former players into the Hall of Fame.
- Season archive and 19 achievements.

### 🎓 Academy
- A youth intake every season, aged 14–16, with hidden potential that is revealed slowly.
- Weekly training at three intensities.
- Academy levels 1–3, plus paid open trials.
- A **B team** that plays its own **Development League** against other academies in your region.
- Promote players to the first team, sell them or release them.

### 🎙️ Club Life
- **Match preview:**
  - Every opponent has a hidden play style. A paid **scouting report** reveals it.
  - Picking the right **game plan** boosts your players' form, and in real matches it drops the rival bot one difficulty level.
- **Press room:** post-match questions that affect morale, followers and your press reputation.
- **Dressing room:** conflicts with several ways to resolve them.
- **Board and investors:** an investor with seasonal objectives.
- **Player talks:** 8 topics. Each player has a hidden personality, and the replies also show up in the Hub's own chat.
- **Sponsors:** contracts with objectives and bonuses.
- **Wellbeing:** fatigue, streaming, burnout and vacations.
- **Backroom staff:** hire one person per role at **Bad, Mid or Best**, each with a weekly wage:
  - 🧠 **Mental coach:** gives back part of every morale drop and lifts morale every week.
  - 📣 **Media trainer:** more sponsor money and faster follower growth.
  - 📋 **Assistant coach:** a shorter training cooldown and stronger sessions; the Best one runs training for you.
  - 🛠️ **Engineer:** cheaper facility upgrades.
  - 🌱 **Youth development coach:** faster academy growth, better intakes, and veterans lose less rating as they age.

  You can also hire or release the Hub's own scouts at any tier.
- **Facilities do more:** each facility tier speeds up academy growth and fatigue recovery.
- **Today's series:** simulate the next game and play the rest of the series live. If you leave a live game early, **simulate the rest** from the score and clock you left at.
- **Regional recruitment:** top EU and NA players ask for up to twice the wage, or flatly refuse, to move to a smaller region. Players from smaller regions are keener to move up.

### 🏟️ Circuit
- **Third-party tournaments** in tiers **S, A, B, C and D**, in **3v3, 2v2 and 1v1**. They are scheduled between official events.
- **Freestyle division:** sign freestylers, train them and enter judged battles.
- **Fun modes:** Hoops, Dropshot, Rumble, Snow Day and Heatseeker cups.
- **Season awards and All-Star:**
  - Player of the Season, Top Scorer, Playmaker, The Wall, Rookie, Coach of the Season and the Team of the Season.
  - A fan-voted All-Star game.
- **World tour:**
  - Majors and Worlds move to a new city every season, out of 58 host cities.
  - Travel choices: jet lag, bootcamps, home crowds and visa problems.

### 🌐 RL World
- **World rankings:**
  - All-time, built from real RLCS titles from 2016 to 2026 using the data that ships with the Hub. Retired legends are included.
  - Current form.
  - Team rankings.
- **Prospects:** every season brings new wonderkids aged 15–18 into free agency, plus ranked breakouts.
- **Drama and orgs:**
  - Player controversies where you choose the club's response.
  - Rivalries started on Y that carry into your next series.
  - Clubs selling their spot to new organizations, and mergers.
  - You can **found your own org** or **absorb a smaller club**.
- **Player editor:** in a running career, change any player's **name**, **photo** (upload an image) and **PlayStyle**: Bruiser, Relentless, Tiki Taka, Anticipate, Technical or Trickster, each tied to one of the Hub's bots, which is the bot the player uses in real matches. Rating, contract, titles and stats stay the same, and **Restore original** undoes everything. You can also **create players** or **import** a list of them, for example semi-pros who are missing from the game.
- **Mod manager:** switch any part of the add-on on or off for each career.

### 🐦 Livelier Y (the in-game social network)
- Fresh variants replace the Hub's most repeated posts.
- Fans, press and insiders react to your series.
- Weekly power rankings, transfer rumours, free-agent watch and memes.

### 📺 Caster
- **Replays:** rewatch any of your series, or the big finals, with commentary from two original casters:
  - Max "Turbo" Reyes, play-by-play;
  - Leo "Nova" Vos, analyst.

  It uses the real scorers, saves, demos, overtime and MVP.
- **🔴 Live caster:** while you play a real match in Rocket League, the casters commentate live.
  - What they call: goals with the scorer and the shot speed, aerials, bicycle kicks, long shots, epic saves, demolitions, the last minute, overtime and the final result.
  - **Pro voices:** recorded, original AI voices with about 190 phrases and around 550 player names, plus Windows voices as a fallback.
  - **Arena crowd:** a crowd bed, chants that come and go, and reactions that build up on goals and saves.
  - It goes quiet when you leave the match.

## Known limitations

- **RL Career Hub version.** Only **0.2.0-beta.33** is supported. If the Hub updates, the add-on refuses to load so that it cannot damage your career. To try it anyway, run this from the install folder:

  ```
  "Start RL Career Extras.cmd" --force
  ```

- **Pro voices.** They are **English only** and some testers may still find them synthetic. If you play in Spanish, the Windows voices are used instead. About 550 players have recorded names; the rest are called without their name.
- **Manager careers only.** In player careers the academy, dressing room and investor features switch off.
- **1v1 and 2v2 events are simulated.** The Hub can only launch real 3v3 matches.
- **History starts when you install.** The Hall of Fame records from the current season onwards, because the Hub does not keep detailed history for past seasons.
- **What stays if you uninstall.** The add-on's data lives inside your save and the Hub simply ignores it once the add-on is gone. Some things are already part of the base game by then and stay: players you promoted, prospects, renamed clubs, and money won or spent.

## Reporting bugs

Please include:

1. What you were doing, and what you expected to happen.
2. A screenshot, if it is visual.
3. The log file `%TEMP%\rlcareerextras.log`. Paste that path into the File Explorer address bar to find it.
4. Whether you also use any other add-on for RL Career Hub.

For live-caster issues, also say roughly at which point of the match it happened: the first game, a later game of the series, overtime, or after leaving the match.

## How it works (for the curious)

- `Start RL Career Extras.cmd` starts the Hub with a temporary debugging port, loads the add-on into the Hub's main process, then closes the port.
- The add-on wraps the Hub's game engine calls. After each simulated day it runs its own modules, and it stores everything in your save under `hof` and `xtra`.
- The new tabs are injected into the Hub window.
- The live caster is a small read-only observer that runs on the Hub's bundled Python and RLBot. It listens to the match data without controlling anything.
- All random events are seeded by career and day, so reloading does not re-roll them.

## For developers

```
src/                 the add-on (loaded into the RL Career Hub main process and window)
  launcher.js        starts the Hub with a temporary inspector port and injects inproc.js
  inproc.js          wraps the Hub engine + IPC, injects the UI, starts the live caster
  core.js            module runner and per-career mod manager
  *-engine.js        game systems (academy, circuit, drama, ranking, caster...)
  *-ui.js            the new tabs
  live/observer.py   read-only RLBot observer for the live caster (runs on the Hub's Python)
  voice/             caster clips, crowd sounds, manifest.json (index) and script.json (what each file says)
test/                tests (they read your saves but never write them)
release/             installer, uninstaller, English launcher, Discord post, build script
docs/README.es.md    Spanish documentation
```

- **Run the add-on from the repo:** `Iniciar RL Career Extras.cmd`. It looks for `RL Career Hub.exe` one folder up, in the default install folders, or in `hub-path.txt`.
- **Tests:** `test\run-all.cmd`. `test_season_sim.js` plays full seasons with the real engine, extracted from `app.asar` into a temporary folder, on an in-memory copy of each save in `%APPDATA%\rl-career-hub\saves`. Some older tests expect saves at a particular point of the season.
- **Build the zip:** `powershell -ExecutionPolicy Bypass -File release\build-release.ps1 -Version 0.1.0-beta`, then upload `dist\RL-Career-Extras-<version>.zip` to a GitHub release.

## Credits

- Built for the RL Career Hub community. The launch approach (a temporary inspector port) is adapted from open-source code under the MIT license, see `THIRD_PARTY_NOTICES.md`.
- Released under the MIT License (see `LICENSE`).
- Caster voices and crowd sounds were generated for this project with ElevenLabs. They are original voices, not imitations of real casters.
- RL Career Extras is an unofficial fan project. It is not affiliated with RL Career Hub, Psyonix or Epic Games.
