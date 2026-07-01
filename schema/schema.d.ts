// 实际存放在数据库的类型是这个

interface CharacterModel {
	unicode: number;
	tygf: 0 | 1 | 2 | 3;
	gb2312: 0 | 1 | 2;
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

interface BasicComponent {
	type: "basic_component";
	tags?: string[];
	strokes: 矢量笔画数据[];
}

interface DerivedComponent {
	type: "derived_component";
	tags?: string[];
	source: number;
	strokes: 笔画数据[];
}

interface SplicedComponent extends Omit<Compound, "type"> {
	type: "spliced_component";
}

interface Identity {
	type: "identity";
	tags?: string[];
	source: number;
}

type 笔画名称 =
	| "横"
	| "提"
	| "竖"
	| "竖钩"
	| "撇"
	| "平撇"
	| "点"
	| "平点"
	| "捺"
	| "平捺"
	| "挑捺"
	| "横钩"
	| "横撇"
	| "横折"
	| "横折钩"
	| "横斜钩"
	| "横折提"
	| "横折折"
	| "横折弯"
	| "横撇弯钩"
	| "横折弯钩"
	| "横斜弯钩"
	| "横折折撇"
	| "横折折折"
	| "横折折折钩"
	| "竖提"
	| "竖折"
	| "竖弯"
	| "竖弯左"
	| "竖弯钩"
	| "竖折撇"
	| "竖折折钩"
	| "竖折折"
	| "撇点"
	| "撇折"
	| "弯钩"
	| "斜钩"
	| "撇钩"
	| "卧钩"
	| "圈"
	| "特殊笔画";

/**
 * SVG 笔画
 * feature: 笔画的种类
 * start: 笔画的起点
 * curveList: 笔画的命令列表
 */
interface 矢量笔画数据 {
	feature: 笔画名称;
	start: 向量;
	curveList: 绘制[];
}

/**
 * 引用笔画
 * index: 源字中笔画的索引
 */
interface 引用笔画数据 {
	feature: "reference";
	index: number;
}

type 笔画数据 = 矢量笔画数据 | 引用笔画数据;

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
	operandList: number[];
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
	glyphs: Glyph[];
	ambiguous: boolean;
}

interface NamedCharacter extends Omit<Character, "unicode"> {
	name: string;
}
