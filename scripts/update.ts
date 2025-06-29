import { readFileSync, writeFileSync } from "fs";
import { del, put } from "./utils";

const repertoire: CharacterModel[] = JSON.parse(
	readFileSync("data/repertoire.json", "utf-8")
);

const puaHash = new Map<string, number>();
const replacer = new Map<RegExp, string>();
const toDelete: number[] = [];

for (const character of repertoire) {
	if (character.unicode < 0xf0000) continue;
	if (puaHash.has(character.glyphs)) {
		console.log(`Duplicate PUA: ${character.unicode.toString(16)}`);
		const regex = new RegExp(`(?<!\\d)${character.unicode}(?!\\d)`, "g");
		replacer.set(regex, puaHash.get(character.glyphs)!.toString());
		toDelete.push(character.unicode);
	} else {
		puaHash.set(character.glyphs, character.unicode);
	}
}

// const changed: CharacterModel[] = [];
// for (const character of repertoire) {
// 	let glyphs = character.glyphs;
// 	for (const [from, to] of replacer) {
// 		glyphs = glyphs.replace(from, to);
// 	}
// 	if (glyphs !== character.glyphs) {
// 		character.glyphs = glyphs;
// 		changed.push(character);
// 	}
// }

del("/repertoire/batch",  toDelete);
// put("/repertoire/batch", changed)
