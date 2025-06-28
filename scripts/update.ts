import { readFileSync, writeFileSync } from "fs";
import { put } from "./utils";

const repertoire: CharacterModel[] = JSON.parse(
	readFileSync("data/repertoire.json", "utf-8")
);

for (const character of repertoire) {
	const glyphs: Compound[] = JSON.parse(character.glyphs);
	glyphs.forEach((glyph) => {
		if (glyph.type === "compound") {
			if (
				glyph.operandList.length === 2 &&
				["辶".codePointAt(0), "廴".codePointAt(0)].includes(
					glyph.operandList[1]
				)
			) {
				glyph.operandList.reverse();
				glyph.order = [
					{ index: 1, strokes: 0 },
					{ index: 0, strokes: 0 },
				];
				console.log(glyph);
			}
		}
	});
	character.glyphs = JSON.stringify(glyphs);
}

console.assert(repertoire.length <= 32768 * 4);
for (let page = 0; page < Math.ceil(repertoire.length / 32768); page++) {
	const start = page * 32768;
	const end = Math.min(start + 32768, repertoire.length);
	const pageData = repertoire.slice(start, end);
	put("/repertoire/batch", pageData);
}
