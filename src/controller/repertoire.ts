import { IRequest } from 'itty-router';
import { Ctx, Env } from '../dto/context';
import { Err, ErrCode, Ok, Result } from '../error/error';
import { DataList } from '../dto/list';
import { Model } from '../model/repertoire';
import { loadNumber, loadString } from '../dto/load';
import { Schema, Validator } from '@cfworker/json-schema';
import schema from '../../schema.json';

const validateCharacter = new Validator(schema.definitions.Character as Schema);

const charToCode = (char: string) => char.codePointAt(0)!;
const codeToChar = (code: number) => String.fromCodePoint(code);

const glyphForward = (c: any) => {
	if (c.type === 'basic_component') {
		return c;
	} else if (c.type === 'derived_component') {
		return { ...c, source: codeToChar(c.source) };
	} else {
		return { ...c, operandList: c.operandList.map(codeToChar) };
	}
};

const glyphReverse = (c: any) => {
	if (c.type === 'basic_component') {
		return c;
	} else if (c.type === 'derived_component') {
		return { ...c, source: charToCode(c.source) };
	} else {
		return { ...c, operandList: c.operandList.map(charToCode) };
	}
};

function fromModel(model: CharacterModel): Character {
	return {
		...model,
		readings: JSON.parse(model.readings),
		glyphs: JSON.parse(model.glyphs).map(glyphForward),
		ambiguous: model.ambiguous === 1,
	};
}

function toModel(character: Character): CharacterModel {
	return {
		...character,
		readings: JSON.stringify(character.readings),
		glyphs: JSON.stringify(character.glyphs.map(glyphReverse)),
		ambiguous: +character.ambiguous as 0 | 1,
	};
}

export async function validateUnicode(request: IRequest, env: Env, ctx: Ctx) {
	const unicode = parseInt(request.params['unicode']);
	if (!Number.isInteger(unicode)) {
		// TODO: 增加具体范围
		return new Err(ErrCode.ParamInvalid, 'Unicode不正确');
	}
	ctx.unicode = unicode;
}

export async function checkExist(request: IRequest, env: Env, ctx: Ctx) {
	// 记录是否已存在
	let exist = await Model.exist(env, ctx.unicode);
	if (!Ok(exist)) {
		return exist;
	}
	if (!exist) {
		return new Err(ErrCode.RecordExists, `${ctx.unicode} 记录不存在`);
	}
}

// 记录是否已存在
export async function checkNotExist(request: IRequest, env: Env, ctx: Ctx) {
	let exist = await Model.exist(env, ctx.unicode);
	if (!Ok(exist)) {
		return exist;
	}
	if (exist) {
		return new Err(ErrCode.RecordExists, `${ctx.unicode} 记录已存在`);
	}
}

export async function ListAll(request: Request, env: Env) {
	const { results } = await env.CHAI.prepare('SELECT * FROM repertoire').all();
	return (results as unknown as CharacterModel[]).map(fromModel);
}

/** GET:/repertoire?page=1&size=20 */
export async function List(request: IRequest, env: Env): Promise<Result<DataList<Character>>> {
	// 第 `page` 页, 每页 `size` 条
	const { page, size } = request.query;

	// 查询记录总数
	const result = await Model.count(env);
	if (!Ok(result)) {
		return result as Err;
	}

	var list = new DataList<Character>();
	list.total = result;
	list.page = parseInt(loadString(page)) || 1;
	list.size = parseInt(loadString(size)) || 20;

	if (list.total > (list.page - 1) * list.size) {
		// 本页有数据时, 查询数据
		const result = await Model.list(env, (list.page - 1) * list.size, list.size);
		if (!Ok(result)) {
			return result as Err;
		}

		list.items = result.map(fromModel);
	}

	return list;
}

/** GET:/repertoire/:unicode */
export async function Info(request: IRequest, env: Env, ctx: Ctx): Promise<Result<Character>> {
	const glyphModel = await Model.byUnicode(env, ctx.unicode);
	if (!Ok(glyphModel)) {
		return glyphModel as Err;
	}

	return fromModel(glyphModel);
}

/** POST:/repertoire/:unicode */
export async function Create(request: IRequest, env: Env): Promise<Result<number>> {
	let glyph: unknown;
	try {
		glyph = await request.json();
	} catch (err) {
		return new Err(ErrCode.UnknownInnerError, (err as Error).message);
	}

	if (!validateCharacter.validate(glyph)) {
		return new Err(ErrCode.ParamInvalid, '请求不合法');
	}

	return await Model.create(env, toModel(glyph as Character));
}

/** POST:/repertoire/batch */
export async function CreateBatch(request: IRequest, env: Env): Promise<Result<boolean>> {
	let glyph: Character[] = await request.json();
	return await Model.createBatch(env, glyph.map(toModel));
}

/** POST:/repertoire */
export async function CreatePUA(request: IRequest, env: Env): Promise<Result<number>> {
	let glyph: any;
	try {
		glyph = await request.json();
	} catch (err) {
		return new Err(ErrCode.UnknownInnerError, (err as Error).message);
	}

	const unicode = await Model.generateUnicode(env, glyph.type);

	if (!Ok(unicode)) {
		return unicode;
	}
	const model: CharacterModel = {
		unicode,
		tygf: 0,
		gb2312: 0,
		readings: '[]',
		glyphs: '[]',
		name: glyph.name,
		gf0014_id: null,
		gf3001_id: null,
		ambiguous: 0,
	};

	return await Model.create(env, model);
}

/** DELETE:/repertoire/:unicode */
export async function Delete(request: IRequest, env: Env, ctx: Ctx): Promise<Result<boolean>> {
	const { results } = await env.CHAI.prepare(`SELECT * FROM repertoire WHERE glyphs like ?`).bind(`%${ctx.unicode}%`).all();
	if (results.length > 0) {
		return new Err(ErrCode.PermissionDenied, '无法删除，因为还有别的字形引用它');
	}
	return await Model.delete(env, ctx.unicode);
}

/** PUT:/repertoire/:unicode */
export async function Update(request: IRequest, env: Env): Promise<Result<boolean>> {
	// 请求参数
	let glyph: unknown;
	try {
		glyph = await request.json();
	} catch (err) {
		return new Err(ErrCode.UnknownInnerError, (err as Error).message);
	}

	if (!validateCharacter.validate(glyph)) {
		return new Err(ErrCode.ParamInvalid, '请求不合法');
	}

	return await Model.update(env, toModel(glyph as Character));
}

/** POST:/repertoire/batch */
export async function UpdateBatch(request: IRequest, env: Env): Promise<Result<boolean>> {
	let glyph: Character[] = await request.json();
	return await Model.updateBatch(env, glyph.map(toModel));
}

/** PATCH:/repertoire/:unicode */
export async function Mutate(request: IRequest, env: Env, ctx: Ctx): Promise<Result<boolean>> {
	// 请求参数
	let payload: any;
	try {
		payload = await request.json();
	} catch (err) {
		return new Err(ErrCode.UnknownInnerError, (err as Error).message);
	}

	if (!Number.isInteger(payload.old) || !Number.isInteger(payload.new)) {
		return new Err(ErrCode.ParamInvalid, '不是整数');
	}

	return await Model.mutate(env, payload.old, payload.new);
}
