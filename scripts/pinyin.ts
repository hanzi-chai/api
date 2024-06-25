import { readFileSync, writeFileSync } from 'fs';
import { update } from './utils';

const repertoire: Character[] = JSON.parse(readFileSync('data/repertoire.json', 'utf-8'));
const pinyin: Map<string, string[]> = new Map();

const pinyinData = readFileSync('data/pinyin.txt', 'utf-8').trim().split('\n');

for (const line of pinyinData) {
	const [character, pinyin_str] = line.split('\t');
	if (!pinyin_str) continue;
	pinyin.set(character, (pinyin.get(character) || []).concat(pinyin_str));
}

for (const character of repertoire) {
	if (character.tygf || character.unicode >= 0xe000) continue;
	const pinyinList = pinyin.get(String.fromCodePoint(character.unicode))!;
	console.assert(pinyinList, `No pinyin for ${String.fromCodePoint(character.unicode)}`);
	if (!pinyinList) continue;
	console.assert(character.readings.length === 0, `Character ${String.fromCodePoint(character.unicode)} already has readings`);
	const base = Math.floor(100 / pinyinList.length);
	character.readings = pinyinList.map((pinyin, index) => {
		const importance = base + (index === 0 ? 100 % pinyinList.length : 0);
		return { pinyin, importance };
	});
}

update(repertoire);
