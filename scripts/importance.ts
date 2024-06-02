import { readFileSync, writeFileSync } from 'fs';

const repertoire: Character[] = JSON.parse(readFileSync('data/repertoire.json', 'utf-8'));

const result = [];

for (const item of repertoire) {
	if (!item.tygf) continue;
	if (item.readings.length < 2) continue;
	const character = String.fromCodePoint(item.unicode);
	for (const { importance, pinyin } of item.readings) {
		result.push([character, importance, pinyin]);
	}
}

writeFileSync('data/importance.txt', result.map(([character, importance, pinyin]) => `${character}\t${pinyin}\t${importance}`).join('\n'));
