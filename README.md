# Pocket Pirate

A small pixel-art pirate life sim inspired by One Piece. Raise your pirate like a pocket pet, train, fight, raid bosses with your crew, and sail the Grand Line to become Pirate King.

No build step and no dependencies: open `index.html` in a browser (or serve the folder with any static server). Progress saves automatically in your browser.

## How to play

- **Train**: a timing mini-game. Stop the marker in the gold zone (dead center is PERFECT) to raise ATK, DEF/HP, SPD or Haki. Each stat has a limit that rises with your level.
- **Fight**: turn-based battles against the island's monsters for XP, berries and bounty. Fights at night are tougher but pay more.
- **Raid**: big multi-phase bosses. They charge a huge attack every few turns (Guard!), enrage at half HP, and your whole crew fights alongside you.
- **Work**: go fishing (tap REEL when the bobber dips) or take an odd job for berries.
- **Eat / Sleep**: food, energy and mood drain as the day passes. Starving hurts; a good mood boosts training.
- **Shop**: food, medicine, Energy Cola, Water Barrels (soak Logia bosses), training weights, and ship upgrades.
- **Sail**: beat an island's raid boss to unlock the next island. Watch out for Sea Kings.

## Progression

| Island | Raid boss | Recruit |
| --- | --- | --- |
| Dawn Village | Bandit King Grizzle | Kenji, swordsman |
| Shell Port | Captain Ironjaw | Coral, navigator |
| Coral Reef Park | Sawtooth Sharko | Basil, cook |
| Sandora Kingdom | Warlord Sandor (Logia) | Moss, doctor |
| Cloud Isle | Sky God Voltz (Logia) | Pip, sniper |
| Last Isle | Emperor Drakko | Pirate King |

Beating Grizzle lets you eat one of five Devil Fruits (Rubber, Blaze, Frost, Quake, Smoke), each with its own skills. Train Haki to unlock Armament (hits Logias), Observation (dodge) and Conqueror's Will.

## Controls

Tap or click the buttons. Tap your pirate to chat. Space bar strikes in training and reels in fishing. Tap the message box to skip ahead.

## Code

- `js/gfx.js`: ASCII pixel sprites with auto-outlines, a 3x5 bitmap font, pixel drawing helpers
- `js/scene.js`: island backdrops, day/night skies, animated sea, ship, particles and tweens
- `js/data.js`: islands, enemies, bosses, crew, devil fruits, items
- `js/audio.js`: chiptune sound effects with Web Audio
- `js/game.js`: game state, menus, the day loop, battles, raids and mini-games
