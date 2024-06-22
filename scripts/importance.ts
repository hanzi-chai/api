import { readFileSync, writeFileSync } from 'fs';
import { listToObject, update } from './utils';

function getImportance(repertoire: Character[]) {
	const result: [string, string, number][] = [];
	for (const item of repertoire) {
		if (!item.tygf) continue;
		if (item.readings.length < 2) continue;
		const character = String.fromCodePoint(item.unicode);
		for (const { importance, pinyin } of item.readings) {
			result.push([character, pinyin, importance]);
		}
	}

	return result;
}

function setImportance(repertoire: Character[], importance: [string, string, number][]) {
	const repertoireObject = listToObject(repertoire);
	for (const [character, pinyin, value] of importance) {
		const item = repertoireObject[character];
		if (!item) continue;
		const reading = item.readings.find((x) => x.pinyin === pinyin);
		if (!reading) continue;
		reading.importance = value;
	}
	return Object.values(repertoireObject);
}

const repertoire: Character[] = JSON.parse(readFileSync('data/repertoire.json', 'utf-8'));
const importance: [string, string, number][] = readFileSync('scripts/importance.txt', 'utf-8')
	.split('\n')
	.map((x) => x.split('\t'))
	.map(([character, pinyin, value]) => [character, pinyin, Number(value)]);
const result = setImportance(repertoire, importance);
update(result);

// writeFileSync('data/repertoire.json', JSON.stringify(result, null, '\t'));
// const result = getImportance(repertoire);
// writeFileSync('data/importance.txt', result.map((x) => x.join('\t')).join('\n'));
