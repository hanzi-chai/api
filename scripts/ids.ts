import { readFileSync, writeFileSync } from 'fs';
import { listToObject, update } from './utils';

function getValidCharacters() {
	const characters = new Set<string>();
	for (let i = 0x4e00; i <= 0x9fff; i++) {
		characters.add(String.fromCodePoint(i));
	}
	for (let i = 0x3400; i <= 0x4dbf; i++) {
		characters.add(String.fromCodePoint(i));
	}
	for (let i = 0xe000; i <= 0xefff; i++) {
		characters.add(String.fromCodePoint(i));
	}
	return characters;
}

function getPUATable() {
	const pua = readFileSync('scripts/pua.txt', 'utf-8').split('\n');
	const puaTable = new Map<string, number>();
	for (const line of pua) {
		const [codepoint_str, character] = line.split('\t');
		const codepoint = parseInt(codepoint_str, 16);
		puaTable.set(character, codepoint);
	}
	return puaTable;
}

function tokenize(expr: string) {
	const chars = [...expr];
	const tokens: string[] = [];
	let token = '';
	let isParens = false;
	for (const char of chars) {
		if (char === '{') {
			token = '{';
			isParens = true;
		} else if (char === '}') {
			token += '}';
			if (token.match(/\{[0-9A-F]{4}\}/)) {
				token = String.fromCodePoint(parseInt(token.slice(1, -1), 16));
			}
			tokens.push(token);
			token = '';
			isParens = false;
		} else {
			if (isParens) {
				token += char;
			} else {
				tokens.push(char);
			}
		}
	}
	return tokens;
}

function getIDSInfo(valid: Set<string>) {
	const data = readFileSync('data/ids.txt', 'utf-8').split('\n');
	const patch = readFileSync('scripts/patch.txt', 'utf-8')
		.trim()
		.split('\n')
		.map((x) => x.split('\t')) as [string, string][];
	const result: [string, string[]][] = [];
	for (const line of data) {
		if (!line || line.startsWith('#')) continue;
		const [codepoint_str, character, ...ids] = line.split('\t');
		if (!ids.length) continue;
		const codepoint = parseInt(codepoint_str.slice(2), 16);
		console.assert(String.fromCodePoint(codepoint) === character, character);
		if (!valid.has(character)) continue;
		let mainland = ids.find((x) => x.includes('G'));
		if (!mainland) mainland = ids[0];
		console.assert(mainland, character);
		let expr = mainland.slice(1).split('$')[0];
		for (const [from, to] of patch) {
			expr = expr.replaceAll(new RegExp(from, 'g'), to);
		}
		result.push([character, tokenize(expr)]);
	}
	return result;
}

const replace = new Map([
	['㇒', '丿'],
	['𠦝', '龺'],
	['𠄠', '二'],
	['𡭔', '小'],
	['𡵆', '屺'],
	['𦔮', '耴'],
	['{20}', '丸'],
	['{80}', '㓁'],
	['{88}', '亼'],
	['{43}', '彐'],
	['𫜹', '彐'],
]);

function process() {
	const repertoire = listToObject(JSON.parse(readFileSync('data/repertoire.json', 'utf-8')));
	const validCharacters = getValidCharacters();
	const idsInfo = getIDSInfo(validCharacters);
	const puaTable = getPUATable();

	const binary = '⿰⿱⿴⿵⿶⿷⿸⿹⿺⿻';
	const ternary = '⿲⿳';
	const badIDS: [string, string[]][] = [];
	let count = 0;
	let success = 0;

	const newRepertoire: Character[] = [];
	for (const [character, tokens] of idsInfo) {
		if (repertoire[character]) continue; // well-known characters
		count++;
		const operator = tokens[0];
		const operands = tokens.slice(1);
		if (binary.includes(operator) && operands.length === 2) {
		} else if (ternary.includes(operator) && operands.length === 3) {
		} else {
			// invalid
			badIDS.push([character, tokens]);
			continue;
		}
		let allKnown = true;
		for (let i = 0; i != operands.length; i++) {
			const part = operands[i];
			if (validCharacters.has(part)) continue;
			if (replace.has(part)) {
				operands[i] = replace.get(part)!;
				continue;
			}
			if (puaTable.has(part)) {
				operands[i] = String.fromCodePoint(puaTable.get(part)!);
				continue;
			}
			badIDS.push([character, tokens]);
			allKnown = false;
			break;
		}
		if (!allKnown) continue;
		const glyph: Compound = {
			type: 'compound',
			operator: operator,
			operandList: operands,
		};
		if (operator === '⿺' && '辶廴夨'.includes(operands[0])) {
			glyph.order = [
				{ index: 1, strokes: 0 },
				{ index: 0, strokes: 0 },
			];
		}
		newRepertoire.push({
			unicode: character.codePointAt(0) as number,
			readings: [],
			tygf: 0,
			name: null,
			gf0014_id: null,
			gb2312: false,
			ambiguous: false,
			glyphs: [glyph],
		});
		success++;
	}

	writeFileSync('data/new-repertoire.json', JSON.stringify(newRepertoire, null, 2));
	writeFileSync('data/bad-ids.txt', badIDS.map(([character, tokens]) => `${character}\t${tokens.join('')}`).join('\n'));
	console.log(`Total: ${count}, Success: ${success}`);

	if (count === success) {
		console.log('All characters are successfully processed.');
		update(newRepertoire);
	}
}

process();
