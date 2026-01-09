// 实际存放在数据库的类型是这个

interface CharacterModel {
	unicode: number;
	tygf: 0 | 1 | 2 | 3;
	gb2312: 0 | 1 | 2;
	readings: string;
	glyphs: string;
	name: string | null;
	gf0014_id: number | null;
	gf3001_id: number | null;
	ambiguous: 0 | 1;
}

// 要返回给客户端的类型是这个
// 1. 存储了 JSON 的字段被 parse 了
// 2. 用数字表示的改成了更易懂的 boolean 或枚举类型
// 未定义的字形表示方法用 undefined 来表示

interface Reading {
  pinyin: string;
  importance: number;
}

interface BasicComponent {
  type: "basic_component";
  tags?: string[];
  strokes: SVGStroke[];
}

interface DerivedComponent {
  type: "derived_component";
  tags?: string[];
  source: string;
  strokes: Stroke[];
}

interface SplicedComponent extends Omit<Compound, "type"> {
  type: "spliced_component";
}

interface Identity {
  type: "identity";
  tags?: string[];
  source: string;
}

type Component = BasicComponent | DerivedComponent | SplicedComponent;

type Glyph = Component | Compound | Identity;

const operators = [
  "⿰",
  "⿱",
  "⿲",
  "⿳",
  "⿴",
  "⿵",
  "⿶",
  "⿷",
  "⿸",
  "⿹",
  "⿺",
  "⿻",
] as const;

/**
 * 结构表示符
 * 例如 ⿰、⿱ 等
 * 符合 Unicode 中的 Ideography Description Characters
 * 参见 https://en.wikipedia.org/wiki/Ideographic_Description_Characters_(Unicode_block)
 */
type Operator = (typeof operators)[number];

interface Block {
  index: number;
  strokes: number;
}

interface CompoundParameters {
  gap2?: number;
  scale2?: number;
  gap3?: number;
  scale3?: number;
}

interface Compound {
  type: "compound";
  operator: Operator;
  operandList: string[];
  tags?: string[];
  order?: Block[];
  parameters?: CompoundParameters;
}

interface Character {
	unicode: number;
	tygf: 0 | 1 | 2 | 3;
	gb2312: 0 | 1 | 2;
	name: string | null;
	gf0014_id: number | null;
	gf3001_id: number | null;
	readings: Reading[];
	glyphs: Glyph[];
	ambiguous: boolean;
};

interface NamedCharacter extends Omit<Character, 'unicode'> {
	name: string;
}
