thanks a lot! I went through your ADDONS.md and ported everything to your Addon Manager 🙌

it's **RL Career Extras**: 25 addons + a hidden library they all require (`rlce-lib`), so you can pick only what you want per career:
Hall of Fame · Academy & B team · Match prep & press · Dressing room & board · Player talks · Circuit (S–D tiers, 1v1/2v2, Duels & Doubles Championships) · Freestyle division · World tour · Travel · Season awards & All-Star · Sponsors with goals · Streaming & burnout · Livelier Y · World prospects · Drama & orgs · World rankings · Caster (replays) · Live caster (recorded voices + crowd) · Broadcast screens · Player editor · Backroom staff · Regional recruitment · Match simulation · Quality of life · My career

how it's built, following the guide:
• everything wraps `hub.engine` and calls the original; data only in `hub.data(state)` (`state.hubPlusData["rlce-lib"]`)
• UI replaces `topbarHtml` / `tabInnerHtml` / `render` (adds its own tabs) and talks to main with `hubPlus.call("rlce-lib", …)`
• each feature is gated with `hub.has(state, id)`, so a save only runs what it picked
• saves imported from the normal game that used my standalone version keep their data (`legacyKeys: ["xtra"]`)
• all MIT, no code from other mods

zip: `RLCE-Addons-v0.2.0-all.zip` → copy the folders of its `addons` folder into `Documents\RL Career Hub+\addons`
logs go to `addons\_hubplus.log`. I'd love it if you could playtest it, any bug or "this breaks the rules" feedback is welcome 🙏
