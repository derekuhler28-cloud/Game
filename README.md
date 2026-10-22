# Pocket Pirate

A small pixel-art pirate life sim inspired by One Piece. You start as a nobody: no weapon, no powers, no crew, no hat. Explore islands to find weapons and hidden Devil Fruits, master their moves, raid bosses with your crew, and sail the Grand Line to become Pirate King.

No build step and no dependencies: open `index.html` in a browser (or serve the folder with any static server). Progress saves automatically in your browser.

## How to play

- **Explore**: search the island for hidden weapons and its Devil Fruit, plus berries, food, supplies, ambushes and mentors. The home button shows how many secrets are left.
- **Gear**: equip weapons and see every move you have unlocked or are working toward. Found fruits can be eaten (only one, ever), kept, or sold.
- **Mastery**: each weapon, your fists, and your Devil Fruit have their own mastery. Using them in fights, winning with them, and practicing with Drills raises mastery and unlocks their 2nd and 3rd moves.
- **Train**: a timing mini-game. Stop the marker in the gold zone (dead center is PERFECT) to raise ATK, DEF/HP, SPD or Haki (each stat has a limit that rises with your level), or do Drills and Fruit Power practice for mastery.
- **Fight**: turn-based battles against the island's monsters for XP, berries and bounty. Fights at night are tougher but pay more.
- **Raid**: big multi-phase bosses. They charge a huge attack every few turns (Guard!), enrage at half HP, and your whole crew fights alongside you. Each boss drops its signature weapon.
- **Work**: go fishing (tap REEL when the bobber dips) or take an odd job for berries.
- **Eat / Sleep**: food, energy and mood drain as the day passes. Starving hurts; a good mood boosts training.
- **Shop**: food, medicine, Energy Cola, Water Barrels (soak Logia bosses), training weights, and ship upgrades.
- **Sail**: beat an island's raid boss to unlock the next island. Watch out for Sea Kings.

## Progression

| Island | Hidden weapons | Raid boss (drops) | Recruit |
| --- | --- | --- | --- |
| Dawn Village | Rusty Cutlass, Oak Bo Staff | Bandit King Grizzle (Grizzle's Club, a straw hat) | Kenji, swordsman |
| Shell Port | Flintlock Pistol, Marine Saber | Captain Ironjaw (Ironjaw's Axe) | Coral, navigator |
| Coral Reef Park | Coral Trident, Karate Wraps | Sawtooth Sharko (Shark Saw) | Basil, cook |
| Sandora Kingdom | Sunset Scimitar | Warlord Sandor, Logia (Golden Hook) | Moss, doctor |
| Cloud Isle | Shock Shell | Sky God Voltz, Logia (Thunder Staff) | Pip, sniper |
| Last Isle | Night Edge | Emperor Drakko (Dragon Kanabo) | Pirate King |

One of five Devil Fruits (Rubber, Blaze, Frost, Quake, Smoke) hides on each of the first five islands, shuffled every new game. Train Haki to unlock Armament (hits Logias), Observation (dodge) and Conqueror's Will. The Coral Trident's Riptide and Water Barrels also make Logias hittable, and the Night Edge cuts right through them.

## Controls

Tap or click the buttons. Tap your pirate to chat. Space bar strikes in training and reels in fishing. Tap the message box to skip ahead.

## Code

- `js/gfx.js`: ASCII pixel sprites with auto-outlines, a 3x5 bitmap font, pixel drawing helpers
- `js/scene.js`: island backdrops, day/night skies, animated sea, ship, particles and tweens
- `js/data.js`: islands, enemies, bosses, crew, devil fruits, items
- `js/audio.js`: chiptune sound effects with Web Audio
- `js/gear.js`: weapons, devil fruits, move mastery, exploring and the Gear menu
- `js/game.js`: game state, menus, the day loop, battles, raids and mini-games
