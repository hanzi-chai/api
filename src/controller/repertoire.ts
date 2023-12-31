import { Env } from '../dto/context';

function charFromCharModel(model: CharModel): Char {
	return {
		...model,
		pinyin: JSON.parse(model.pinyin),
		gb2312: model.gb2312 === 1
	};
}

export async function List(request: Request, env: Env) {
	const { results } = await env.CHAI.prepare('SELECT * FROM repertoire').all();
	return (results as unknown as CharModel[]).map(charFromCharModel);
}

export async function Create(request: Request, env: Env) {
	const data: any[] = await request.json();
	const stmt = env.CHAI.prepare('INSERT INTO repertoire (unicode, tygf, gb2312, pinyin) VALUES (?, ?, ?, ?)');
	const result = await env.CHAI.batch(
		data.map(({ unicode, tygf, gb2312, pinyin }) => {
			return stmt.bind(unicode, tygf, gb2312, pinyin);
		}),
	);
	return result;
}
