import { readFileSync } from 'fs';
import { listToObject, update } from './utils';

const gb2312 = readFileSync('data/gb2312.txt', 'utf-8').trim().split('\n');
const repertoire = listToObject(JSON.parse(readFileSync('data/repertoire.json', 'utf-8')) as Character[]);

const level2 = gb2312.slice(3755);
const updated = level2.map((char) => {
	const character = repertoire[char];
	character.gb2312 = 2;
	return character;
});
await update(updated);
console.log('done');
