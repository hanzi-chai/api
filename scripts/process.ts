import { assert } from "console";
import { readFileSync, writeFileSync } from "fs";
import { getTag, IDS, IDSComponent, IDSCompound, parseIDS } from "./ids";
import { put } from "./utils";

interface IDSCharacter {
	unicode: number;
	descriptions: IDS[];
}

function getIDSCharacters(path: string): IDSCharacter[] {
	const content = readFileSync(path, "utf-8").trim().split("\n");
	const parsed: IDSCharacter[] = [];
	for (const line of content) {
		const [unicode_str, character, ...ids_list] = line.split(" ");
		assert(unicode_str.startsWith("U+"), `Unicode 不合法: ${unicode_str}`);
		const unicode = parseInt(unicode_str.slice(2), 16);
		assert(getTag(unicode) !== null, `未知字符：${character} ${unicode_str}`);
		const _character = String.fromCodePoint(unicode);
		assert(_character === character, `${character} 不匹配 ${unicode_str}`);
		const descriptions: IDS[] = [];
		for (const ids of ids_list) {
			descriptions.push(parseIDS(ids));
		}
		parsed.push({ unicode, descriptions });
	}
	return parsed;
}

class PUAFactory extends Map<string, Character> {
	componentId: number = 0xe200;
	compoundId: number = 0xf0000;
	names: Set<string>;
	unicodes: Set<number>;

	constructor(names: Set<string>, unicodes: Set<number>) {
		super();
		this.names = names;
		this.unicodes = unicodes;
		this.componentId = 0xe200; // 基本组件从PUA区间开始
		this.compoundId = 0xf0000; // 复合组件从更高的PUA区间开始
	}

	uniquify(name: string): string {
		let uniquifiedName = name;
		if (this.names.has(name)) {
			let numbers = "一二三四五六七八九十";
			for (let i = 0; i < 10; i++) {
				uniquifiedName = `${name}之${numbers[i]}`;
				if (!this.names.has(uniquifiedName)) break;
			}
		}
		this.names.add(uniquifiedName);
		return uniquifiedName;
	}

	getComponent(raw: string): string {
		if ([...raw].length === 1 && this.unicodes.has(raw.codePointAt(0)!)) {
			return raw;
		}
		const c = this.get(raw);
		if (c) return String.fromCodePoint(c.unicode);
		const unicode = this.componentId++;
		const component: BasicComponent = {
			type: "basic_component",
			tags: [],
			strokes: [],
		};
		let name = this.uniquify(raw);
		this.set(raw, { ...base, unicode, name, glyphs: [component] });
		return String.fromCodePoint(unicode);
	}

	getCompound(hash: string, raw: string, compound: Compound): string {
		const unicode = this.compoundId++;
		const name = this.uniquify(raw);
		this.set(hash, { ...base, unicode, name, glyphs: [compound] });
		return String.fromCodePoint(unicode);
	}
}

const base: Character = {
	unicode: 0,
	tygf: -1 as 0,
	gb2312: 0,
	name: null,
	gf0014_id: null,
	gf3001_id: null,
	ambiguous: false,
	readings: [],
	glyphs: [],
};

function handleComponent(
	ids: IDSComponent,
	name: string,
	pua: PUAFactory
): Component {
	if (ids.content === name) {
		return {
			type: "basic_component",
			tags: ids.tags,
			strokes: [],
		};
	} else {
		return {
			type: "derived_component",
			tags: ids.tags,
			source: pua.getComponent(ids.content),
			strokes: [],
		};
	}
}

function handleCompound(
	ids: IDSCompound,
	name: string,
	pua: PUAFactory
): Compound {
	const operandList: string[] = [];
	for (const [index, idsOperand] of ids.operandList.entries()) {
		if (typeof idsOperand === "string") {
			operandList.push(pua.getComponent(idsOperand));
			continue;
		}
		const hash = JSON.stringify(idsOperand);
		let operand: string;
		if (!pua.has(hash)) {
			const suffix = getSuffix(ids.operator, index);
			let operandName = `${name}字${suffix}`;
			const compound = handleCompound(idsOperand, operandName, pua);
			operand = pua.getCompound(hash, operandName, compound);
		} else {
			operand = String.fromCodePoint(pua.get(hash)!.unicode);
		}
		operandList.push(operand);
	}
	return { type: "compound", operator: ids.operator, operandList }; // 返回处理后的复合描述
}

function transformIDSCharacters(parsed: IDSCharacter[]): Character[] {
	const characters: Character[] = [];
	const pinyin = JSON.parse(readFileSync("data/pinyin.json", "utf-8")) as {
		unicode: number;
		pinyin: string[];
	}[];
	const repertoire = JSON.parse(
		readFileSync("data/repertoire.json", "utf-8")
	) as Character[];
	const existingUnicodes = new Set(repertoire.map((c) => c.unicode));
	const unicodes = new Set(parsed.map((c) => c.unicode));
	const names = new Set(
		repertoire.map((c) => c.name).filter((n) => n !== null)
	);
	const pua = new PUAFactory(names, unicodes);
	const pinyinMap = new Map<number, string[]>(
		pinyin.map((item) => [item.unicode, item.pinyin])
	);
	for (const { unicode, descriptions } of parsed) {
		if (existingUnicodes.has(unicode)) {
			continue;
		}
		const character = String.fromCodePoint(unicode);
		const glyphs: (Component | Compound)[] = [];
		for (const ids of descriptions) {
			if ("content" in ids) {
				const component = handleComponent(ids, character, pua);
				glyphs.push(component);
			} else {
				const compound = handleCompound(ids, character, pua);
				glyphs.push(compound);
			}
		}
		const pinyinList = pinyinMap.get(unicode) || [];
		const avg = Math.floor(100 / pinyinList.length);
		const readings = pinyinList.map((p, index) => ({
			pinyin: p,
			importance: avg + (index === 0 ? 100 % pinyinList.length : 0),
		}));
		characters.push({ ...base, unicode, readings, glyphs });
	}
	characters.push(...pua.values());
	console.log(`Component PUA: ${pua.componentId - 0xe200}`);
	console.log(`Compound PUA: ${pua.compoundId - 0xf0000}`);
	return characters;
}

const getSuffix = (operator: string, position: number) => {
	switch (operator) {
		case "⿰":
			return "旁边"[position];
		case "⿱":
			return "头底"[position];
		case "⿲":
			return "旁中边"[position];
		case "⿳":
			return "头腰底"[position];
		default:
			return "框心"[position];
	}
};

const idsCharacters = getIDSCharacters("data/ids.txt");
const repertoire = transformIDSCharacters(idsCharacters);
writeFileSync("data/repertoire.new.json", JSON.stringify(repertoire));
put("/repertoire/batch", repertoire);
