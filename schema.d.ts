// 实际存放在数据库的类型是这个

interface CharacterModel {
	unicode: number;
	tygf: 0 | 1 | 2 | 3;
	gb2312: 0 | 1;
	readings: string;
	glyphs: string;
	name: string | null;
	gf0014_id: number | null;
	ambiguous: 0 | 1;
}

// 要返回给客户端的类型是这个
// 1. 存储了 JSON 的字段被 parse 了
// 2. 用数字表示的改成了更易懂的 boolean 或枚举类型
// 未定义的字形表示方法用 undefined 来表示

type Character = Omit<CharacterModel, 'gb2312' | 'readings' | 'glyphs' | 'ambiguous'> & {
	gb2312: boolean;
	readings: string[];
	glyphs: any[];
	ambiguous: boolean;
};

interface NamedCharacter extends Omit<Character, 'unicode'> {
	name: string;
}
