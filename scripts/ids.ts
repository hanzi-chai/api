const ranges: Record<string, [number, number]> = {
	基本: [0x4e00, 0x9fff], // CJK Unified Ideographs
	扩展A: [0x3400, 0x4dbf], // CJK Extension A
	扩展B: [0x20000, 0x2a6df], // CJK Extension B
	扩展C: [0x2a700, 0x2b73f], // CJK Extension C
	扩展D: [0x2b740, 0x2b81f], // CJK Extension D
	扩展E: [0x2b820, 0x2ceaf], // CJK Extension E
	扩展F: [0x2ceb0, 0x2ebef], // CJK Extension F
	扩展G: [0x30000, 0x3134f], // CJK Extension G
	扩展H: [0x31350, 0x323af], // CJK Extension H
	扩展I: [0x2ebf0, 0x2ee5f], // CJK Extension I
	扩展J: [0x323b0, 0x3347f], // CJK Extension J
	部首补充: [0x2e80, 0x2eff], // CJK Radicals Supplement
	康熙部首: [0x2f00, 0x2fdf], // Kangxi Radicals
	符号标点: [0x3000, 0x303f], // CJK Symbols and Punctuation
	笔画: [0x31c0, 0x31ef], // CJK Strokes
	兼容文字: [0xf900, 0xfaff], // CJK Compatibility Ideographs
	西夏文: [0x17000, 0x187ff], // Tangut
	西夏文部首: [0x18800, 0x18aff], // Tangut Components
	契丹小字: [0x18b00, 0x18cff], // Khitan Small Script
	西夏文补充: [0x18d00, 0x18d7f], // Tangut Supplement
	西夏文部件补充: [0x18d80, 0x18dff], // Tangut Components Supplement
	PUA: [0xe000, 0xffff], // PUA
	SPUA_A: [0xf0000, 0xffffd], // Supplementary PUA-A
	SPUA_B: [0x100000, 0x10fffd], // Supplementary PUA-B
};

export function getTag(unicode: number): string | null {
	for (const [tag, [start, end]] of Object.entries(ranges)) {
		if (unicode >= start && unicode <= end) {
			return tag;
		}
	}
	return null;
}

export function getValidCharacters() {
	const characters = new Set<string>();
	for (const [start, end] of Object.values(ranges)) {
		for (let i = start; i <= end; i++) {
			characters.add(String.fromCodePoint(i));
		}
	}
	return characters;
}

export const operators = [
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
  "⿼",
  "⿽",
  "⿾",
  "⿿",
] as const;

/** -------------- 抽象语法树类型 ---------------- */
// content 一字表示该字符为字根，多字表示该字符等同于某 PUA 部件
export interface IDSComponent {
	content: string; // 组件内容
	tags: string[]; // 标签列表
}

// operand 为 string 时，一字表示常规字符，多字表示 PUA 部件
type IDSOperand = string | IDSCompound;

export interface IDSCompound {
	operator: Operator;
	operandList: IDSOperand[];
	tags: string[];
}

export type IDS = IDSComponent | IDSCompound;

/** -------------- 词法分析 ---------------------- */
enum TokenType {
	Operator = "Operator", // 表意文字描述符
	Brace = "Brace", // {...}
	Tags = "Tags", // [...]
	Char = "Char", // 单个汉字或其他字符
	EOF = "EOF",
}

interface Token {
	type: TokenType;
	value: string;
}

class Lexer {
	private pos = 0;
	private readonly len: number;
	private readonly input: string[];

	constructor(input: string) {
		this.input = Array.from(input); // 转换为字符数组，便于索引
		this.len = this.input.length;
	}

	/** 取得下一个 Token */
	nextToken(): Token {
		if (this.pos >= this.len) return { type: TokenType.EOF, value: "" };

		const ch = this.input[this.pos];

		// 1. IDS 描述符
		if (operators.includes(ch as Operator)) {
			this.pos++;
			return { type: TokenType.Operator, value: ch };
		}

		// 2. {...} 组件
		if (ch === "{") {
			const start = ++this.pos;
			while (this.pos < this.len && this.input[this.pos] !== "}") this.pos++;
			if (this.pos >= this.len) throw new SyntaxError("Unterminated '{'");
			let content = this.input.slice(start, this.pos).join("");
			this.pos++; // 跳过 '}'
			if ([...content].length === 1) {
				content += "变"; // 单个字符的部件默认加上“变”字
			}
			return { type: TokenType.Brace, value: content };
		}

		// 3. [...] 标签
		if (ch === "[") {
			const start = ++this.pos;
			while (this.pos < this.len && this.input[this.pos] !== "]") this.pos++;
			if (this.pos >= this.len) throw new SyntaxError("Unterminated '['");
			const content = this.input.slice(start, this.pos);
			this.pos++; // 跳过 ']'
			return { type: TokenType.Tags, value: content.join("") };
		}

		// 4. 单字符（默认作为汉字/部件）
		this.pos++;
		return { type: TokenType.Char, value: ch };
	}
}

/** -------------- 语法分析 ---------------------- */
class Parser {
	private lookahead: Token;

	constructor(private readonly lexer: Lexer) {
		this.lookahead = lexer.nextToken();
	}

	parseTags(): string[] {
		// 3. 读取可选的标签
		const tags: string[] = [];
		if (this.lookahead.type === TokenType.Tags) {
			const tagToken = this.eat(TokenType.Tags);
			tags.push(...Array.from(tagToken.value)); // 拆成单字母数组
		}
		return tags;
	}

	/** 入口：解析整个表达式 */
	parseExpression(): IDS {
		if (
			this.lookahead.type === TokenType.Char ||
			this.lookahead.type === TokenType.Brace
		) {
			// 直接返回单个汉字或部件
			const content = this.eat(this.lookahead.type).value;
			const tags = this.parseTags();
			return { content, tags };
		}
		// 1. 读取前缀运算符
		const opToken = this.eat(TokenType.Operator);

		// 2. 读取操作数（数量由表达式决定，这里不做硬编码限制）
		const operandList: (string | IDSCompound)[] = [];
		const count = ["⿲", "⿳"].includes(opToken.value) ? 3 : 2; // 二元或三元运算符
		while (operandList.length < count) {
			operandList.push(this.parseOperand());
		}
		// 3. 读取可选的标签
		const tags = this.parseTags();

		return { operator: opToken.value as Operator, operandList, tags };
	}

	/** 解析单个操作数 */
	private parseOperand(): IDSOperand {
		switch (this.lookahead.type) {
			case TokenType.Operator:
				return this.parseExpression() as IDSCompound; // 嵌套 IDS
			case TokenType.Brace:
				return this.eat(TokenType.Brace).value; // 非成字部件
			case TokenType.Char:
				return this.eat(TokenType.Char).value; // 单汉字
			default:
				throw new SyntaxError(`Unexpected token: ${this.lookahead.type}`);
		}
	}

	/** 匹配并消费预期的 Token */
	private eat(expected: TokenType): Token {
		if (this.lookahead.type !== expected) {
			throw new SyntaxError(`Expect ${expected}, got ${this.lookahead.type}`);
		}
		const current = this.lookahead;
		this.lookahead = this.lexer.nextToken();
		return current;
	}
}

/** -------------- 对外导出函数 ------------------ */
export function parseIDS(input: string): IDS {
	const parser = new Parser(new Lexer(input));
	const ast = parser.parseExpression();

	// 若仍有残余输入，则报错
	if (parser["lookahead"].type !== TokenType.EOF) {
		throw new SyntaxError(
			`Unexpected trailing input ${parser["lookahead"].type} ${parser["lookahead"].value}`
		);
	}
	return ast;
}
