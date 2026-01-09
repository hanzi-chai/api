import { assert } from "console";
import { readFileSync, writeFileSync } from "fs";
import { getTag, IDS, IDSComponent, IDSCompound, parseIDS } from "./ids";
import { post, put, toModel } from "./utils";

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

const COMPONENT_START = 0xe200;
const COMPONENT_END = 0xe3ff;
const COMPOUND_START = 0xf0000;
const COMPOUND_END = 0xffffd;

class PUAFactory {
	// PUA 字符映射表，
	// 对于 IDS 部件，使用别名查找
	// 对于 IDS 复合体，使用描述的序列化字符串查找
	puaMap: Map<string, Character>;
	// 全部已使用的别名
	names: Set<string>;
	// 已知的 IDS 字符 Unicode 集合
	idsUnicodes: Set<number>;
	componentId: number;
	compoundId: number;
	initialComponentId: number;
	initialCompoundId: number;

	constructor(idsUnicodes: Set<number>, repertoire: Character[]) {
		this.idsUnicodes = idsUnicodes;
		this.componentId = COMPONENT_START;
		this.compoundId = COMPOUND_START;
		this.puaMap = new Map();
		this.names = new Set(
			repertoire.map((c) => c.name).filter((n) => n !== null)
		);
		for (const character of repertoire) {
			const { unicode, name, glyphs } = character;
			if (unicode >= COMPONENT_START && unicode <= COMPONENT_END) {
				this.componentId = Math.max(this.componentId, unicode + 1);
			}
			if (unicode >= COMPOUND_START && unicode <= COMPOUND_END) {
				this.compoundId = Math.max(this.compoundId, unicode + 1);
			}
			if (getTag(unicode)?.includes("PUA")) {
				const glyph = glyphs[0]!;
				if (glyph.type !== "compound") {
					this.puaMap.set(name ?? "", character);
				} else {
					const hash = JSON.stringify({ operator: glyph.operator, operandList: glyph.operandList });
					this.puaMap.set(hash, character);
				}
			}
		}
		this.initialComponentId = this.componentId;
		this.initialCompoundId = this.compoundId;
		console.log(`Starting Component PUA: ${this.componentId.toString(16)}`);
		console.log(`Starting Compound PUA: ${this.compoundId.toString(16)}`);
	}

	uniquify(rawName: string): string {
		let name = rawName;
		if (this.names.has(rawName)) {
			for (const char of [..."一二三四五六七八九十"]) {
				name = `${rawName}之${char}`;
				if (!this.names.has(name)) {
					break;
				}
			}
		}
		this.names.add(name);
		return name;
	}

	// 给定部件的别名，获取或创建 PUA 字符
	getComponent(rawName: string): string {
		const c = this.puaMap.get(rawName);
		if (c) return String.fromCodePoint(c.unicode);
		const unicode = this.componentId++;
		const component: BasicComponent = {
			type: "basic_component",
			tags: [],
			strokes: [],
		};
		this.names.add(rawName);
		this.puaMap.set(rawName, { ...base, unicode, name: rawName, glyphs: [component] });
		return String.fromCodePoint(unicode);
	}

	getCompound(hash: string, rawName: string, compound: Compound): string {
		const unicode = this.compoundId++;
		const name = this.uniquify(rawName);
		this.puaMap.set(hash, { ...base, unicode, name, glyphs: [compound] });
		return String.fromCodePoint(unicode);
	}

	handleComponent(
		ids: IDSComponent,
		character: string,
	): Component | Identity {
		if (ids.content === character) {
			return {
				type: "basic_component",
				tags: ids.tags,
				strokes: [],
			};
		} else {
			return {
				type: "identity",
				tags: ids.tags,
				source: this.getComponent(ids.content),
			};
		}
	}

	handleCompound(
		ids: IDSCompound,
		character: string,
	): Compound {
		const operandList: string[] = [];
		for (const [index, idsOperand] of ids.operandList.entries()) {
			// 常规操作数，无嵌套
			if (typeof idsOperand === "string") {
				if ([...idsOperand].length === 1 && this.idsUnicodes.has(idsOperand.codePointAt(0)!)) {
					// 单字且在 IDS 字符集中，直接加入
					operandList.push(idsOperand);
				} else {
					// 别名，获取或创建部件 PUA 字符
					operandList.push(this.getComponent(idsOperand));
				}
				continue;
			}
			const hash = JSON.stringify({ operator: idsOperand.operator, operandList: idsOperand.operandList });
			let operand: string;
			if (!this.puaMap.has(hash)) {
				const suffix = getSuffix(ids.operator, index);
				let operandName = `${character}字${suffix}`;
				const compound = this.handleCompound(idsOperand, operandName);
				operand = this.getCompound(hash, operandName, compound);
			} else {
				operand = String.fromCodePoint(this.puaMap.get(hash)!.unicode);
			}
			operandList.push(operand);
		}
		return { type: "compound", operator: ids.operator, operandList }; // 返回处理后的复合描述
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

function transformIDSCharacters(parsed: IDSCharacter[]): Character[] {
	const characters: Character[] = [];
	const repertoire = JSON.parse(
		readFileSync("data/repertoire.json", "utf-8")
	) as Character[];
	const existingUnicodes = new Set(repertoire.map((c) => c.unicode));
	const idsUnicodes = new Set(parsed.map((c) => c.unicode));
	const pua = new PUAFactory(idsUnicodes, repertoire);
	for (const { unicode, descriptions } of parsed) {
		if (existingUnicodes.has(unicode)) {
			continue;
		}
		const character = String.fromCodePoint(unicode);
		const glyphs: Glyph[] = [];
		for (const ids of descriptions) {
			if ("content" in ids) {
				const component = pua.handleComponent(ids, character);
				glyphs.push(component);
			} else {
				const compound = pua.handleCompound(ids, character);
				glyphs.push(compound);
			}
		}
		characters.push({ ...base, unicode, glyphs });
	}
	characters.push(...[...pua.puaMap.values()].filter(c => !existingUnicodes.has(c.unicode)));
	console.log(`Component PUA: ${pua.componentId - pua.initialComponentId}`);
	console.log(`Compound PUA: ${pua.compoundId - pua.initialCompoundId}`);
	console.log(`Total New Characters: ${characters.length}`);
	// check name uniqueness
	const nameSet = new Set<string>();
	for (const character of characters) {
		if (character.name !== null) {
			if (nameSet.has(character.name)) {
				throw new Error(`Duplicate name: ${character.name}`);
			}
			nameSet.add(character.name);
		}
	}
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
post("/repertoire/batch", repertoire.map(toModel));
