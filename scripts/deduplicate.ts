import { readFileSync, writeFileSync } from "fs";
import { listToObject, post } from "./utils";

const repertoire_list: CharacterModel[] = JSON.parse(readFileSync("data/repertoire.json", "utf-8"));
const reverseMap: Map<string, number> = new Map();
const replaceMap: Map<number, number> = new Map();
for (const character of repertoire_list) {
	if (reverseMap.has(character.glyphs)) {
		if (character.unicode >= 0xF0000) {
			const previousUnicode = reverseMap.get(character.glyphs)!;
			console.warn(`Duplicate glyphs for U+${character.unicode.toString(16).toUpperCase()} and U+${previousUnicode.toString(16).toUpperCase()}: ${character.glyphs}`);
			replaceMap.set(character.unicode, previousUnicode);
		}
	} else {
		reverseMap.set(character.glyphs, character.unicode);
	}
}

const newRepertoireList: CharacterModel[] = [];
for (const character of repertoire_list) {
	if (replaceMap.has(character.unicode)) continue;
	const glyphs: Glyph[] = JSON.parse(character.glyphs);
	const newGlyphs = glyphs.map(glyph => {
		if (glyph.type === "derived_component" || glyph.type === "identity")
			return { ...glyph, source: replaceMap.get(glyph.source) ?? glyph.source };
		else if (glyph.type === "compound" || glyph.type === "spliced_component")
			return { ...glyph, operandList: glyph.operandList.map(x => replaceMap.get(x) ?? x) };
		else
			return glyph;
	});
	newRepertoireList.push({ ...character, glyphs: JSON.stringify(newGlyphs) });
}

writeFileSync("data/repertoire_deduplicated.json", JSON.stringify(newRepertoireList));
post("/repertoire/batch", newRepertoireList);
