import { assert } from 'console';
import { readFileSync, writeFileSync } from 'fs';

/** -------------- 抽象语法树类型 ---------------- */
export interface Component {
	content: string; // 组件内容
	tags: string[]; // 标签列表
}

export interface Compound {
	operator: string;
	operandList: (Component | Compound)[];
	tags: string[];
}

type IDS = Component | Compound;

/** -------------- 词法分析 ---------------------- */
enum TokenType {
	Operator = 'Operator', // 表意文字描述符
	Brace = 'Brace', // {...}
	Tags = 'Tags', // [...]
	Char = 'Char', // 单个汉字或其他字符
	EOF = 'EOF',
}

interface Token {
	type: TokenType;
	value: string;
}

const IDS_OPERATORS = ['⿰', '⿱', '⿲', '⿳', '⿴', '⿵', '⿶', '⿷', '⿸', '⿹', '⿺', '⿻'] as const;
type Operator = (typeof IDS_OPERATORS)[number];

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
		if (this.pos >= this.len) return { type: TokenType.EOF, value: '' };

		const ch = this.input[this.pos];

		// 1. IDS 描述符
		if (IDS_OPERATORS.includes(ch as Operator)) {
			this.pos++;
			return { type: TokenType.Operator, value: ch };
		}

		// 2. {...} 组件
		if (ch === '{') {
			const start = ++this.pos;
			while (this.pos < this.len && this.input[this.pos] !== '}') this.pos++;
			if (this.pos >= this.len) throw new SyntaxError("Unterminated '{'");
			const content = this.input.slice(start, this.pos).join('');
			this.pos++; // 跳过 '}'
			return { type: TokenType.Brace, value: content };
		}

		// 3. [...] 标签
		if (ch === '[') {
			const start = ++this.pos;
			while (this.pos < this.len && this.input[this.pos] !== ']') this.pos++;
			if (this.pos >= this.len) throw new SyntaxError("Unterminated '['");
			const content = this.input.slice(start, this.pos);
			this.pos++; // 跳过 ']'
			return { type: TokenType.Tags, value: content.join('') };
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
		if (this.lookahead.type === TokenType.Char || this.lookahead.type === TokenType.Brace) {
			// 直接返回单个汉字或部件
			const content = this.eat(this.lookahead.type).value;
			const tags = this.parseTags();
			return { content, tags };
		}
		// 1. 读取前缀运算符
		const opToken = this.eat(TokenType.Operator);

		// 2. 读取操作数（数量由表达式决定，这里不做硬编码限制）
		const operandList: IDS[] = [];
		const count = ['⿲', '⿳'].includes(opToken.value) ? 3 : 2; // 二元或三元运算符
		while (operandList.length < count) {
			operandList.push(this.parseOperand());
		}
		// 3. 读取可选的标签
		const tags = this.parseTags();

		return { operator: opToken.value, operandList, tags };
	}

	/** 解析单个操作数 */
	private parseOperand(): IDS {
		switch (this.lookahead.type) {
			case TokenType.Operator:
				return this.parseExpression(); // 嵌套 IDS
			case TokenType.Brace:
				return { content: this.eat(TokenType.Brace).value, tags: [] }; // 非成字部件
			case TokenType.Char:
				return { content: this.eat(TokenType.Char).value, tags: [] }; // 单汉字
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
	if (parser['lookahead'].type !== TokenType.EOF) {
		throw new SyntaxError(`Unexpected trailing input ${parser['lookahead'].type} ${parser['lookahead'].value}`);
	}
	return ast;
}

interface Character {
	unicode: number;
	descriptions: IDS[];
}
const content = readFileSync('data/ids.txt', 'utf-8').trim().split('\n');
const parsed: Character[] = [];
for (const line of content) {
	const [codepoint_str, character, ...ids_list] = line.split(' ');
	assert(codepoint_str.startsWith('U+'), `Invalid codepoint: ${codepoint_str}`);
	const unicode = parseInt(codepoint_str.slice(2), 16);
	assert(String.fromCodePoint(unicode) === character, `Character mismatch: ${character} != ${String.fromCodePoint(unicode)}`);
	const descriptions: IDS[] = [];
	for (const ids of ids_list) {
		try {
			descriptions.push(parseIDS(ids));
		} catch (error) {
			console.error(`Error parsing IDS for character ${character}:`, error);
		}
	}
	parsed.push({ unicode, descriptions });
}

const intermediates = new Map<string, string>();
const structures: { name: string; compound: Compound }[] = [];
const getSuffix = (operator: string, position: number) => {
	switch (operator) {
		case '⿰':
			return '旁边'[position];
		case '⿱':
			return '头底'[position];
		case '⿲':
			return '旁中边'[position];
		case '⿳':
			return '头腰底'[position];
		default:
			return '框心'[position];
	}
};

function extractIntermediate(desc: Compound, intermediates: Map<string, string>, character: string) {
	const processed: Component[] = [];
	for (const [index, operand] of desc.operandList.entries()) {
		if ('content' in operand) {
			processed.push(operand);
			continue; // 直接跳过单个汉字或部件
		}
		const key = JSON.stringify(operand);
		let name: string;
		if (!intermediates.has(key)) {
			const suffix = getSuffix(desc.operator, index);
			name = `${character}字${suffix}`;
			intermediates.set(key, name);
			const intermediateDesc = extractIntermediate(operand, intermediates, name);
			structures.push({ name, compound: intermediateDesc });
		} else {
			name = intermediates.get(key)!; // 获取已存在的中间描述
		}
		processed.push({
			content: name,
			tags: operand.tags,
		});
	}
	assert(
		processed.length >= 2,
		`Processed operands count mismatch for ${character}: expected ${desc.operandList.length}, got ${processed.length}`,
	);
	return { ...desc, operandList: processed }; // 返回处理后的复合描述
}

const regularized: Character[] = [];

for (const char of parsed) {
	const character = String.fromCodePoint(char.unicode);
	const processedDescriptions: IDS[] = [];
	for (const desc of char.descriptions) {
		if ('content' in desc) {
			processedDescriptions.push(desc); // 直接添加单个汉字或部件
			continue; // 跳过单个汉字或部件
		}
		const result = extractIntermediate(desc, intermediates, character);
		processedDescriptions.push(result);
	}
	regularized.push({
		unicode: char.unicode,
		descriptions: processedDescriptions,
	});
}

const addBraces = (content: string): string => {
	if (Array.from(content).length === 1) return content; // 单字符不需要加括号
	return `{${content}}`; // 多字符加括号
};

writeFileSync(
	'data/regularized.txt',
	regularized
		.map((char) => {
			const unicode = `U+${char.unicode.toString(16).toUpperCase()}`;
			const character = String.fromCodePoint(char.unicode);
			const idsList: string[] = [];
			for (const desc of char.descriptions) {
				if ('content' in desc) {
					idsList.push(addBraces(desc.content));
				} else {
					idsList.push(`${desc.operator}${desc.operandList.map((op) => addBraces((op as Component).content)).join('')}`);
				}
			}
			return `${unicode} ${character} ${idsList.join(' ')}`;
		})
		.join('\n'),
);

writeFileSync(
	'data/structures.txt',
	structures
		.map(({ name, compound: desc }) => {
			const operator = desc.operator;
			const operands = desc.operandList
				.map((op) => {
					if ('content' in op) return addBraces(op.content);
					return `${op.operator}${op.operandList.map((o) => addBraces((o as Component).content)).join('')}`;
				})
				.join('');
			return `${name} ${operator}${operands}`;
		})
		.join('\n'),
);
