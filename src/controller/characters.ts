import { IRequest } from "itty-router";
import { Env } from "../dto/context";
import { Err, ErrCode, Ok, Result } from "../error/error";
import { CharacterModel, CharacterRow } from "../model/characters";

/** GET:/characters */
export async function List(
	_request: Request,
	env: Env,
): Promise<Result<CharacterRow[]>> {
	return await CharacterModel.listAll(env);
}

/** GET:/characters/:unicode */
export async function Info(
	request: IRequest,
	env: Env,
): Promise<Result<CharacterRow>> {
	const unicode = parseInt(request.params["unicode"]);
	if (!Number.isInteger(unicode))
		return new Err(ErrCode.ParamInvalid, "Unicode不正确");
	return await CharacterModel.byUnicode(env, unicode);
}

/** POST:/characters */
export async function Create(
	request: IRequest,
	env: Env,
): Promise<Result<number>> {
	let body: any;
	try {
		body = await request.json();
	} catch (err) {
		return new Err(ErrCode.UnknownInnerError, (err as Error).message);
	}
	const row: CharacterRow = {
		unicode: body.unicode,
		tygf: body.tygf,
		gb2312: body.gb2312,
		glyphs: JSON.stringify(body.glyphs),
		name: body.name,
		ambiguous: body.ambiguous,
	};
	return await CharacterModel.create(env, row);
}

/** POST:/characters/batch */
export async function CreateBatch(
	request: IRequest,
	env: Env,
): Promise<Result<boolean>> {
	let body: any[];
	try {
		body = await request.json();
	} catch (err) {
		return new Err(ErrCode.UnknownInnerError, (err as Error).message);
	}
	const rows: CharacterRow[] = body.map((item: any) => ({
		unicode: item.unicode,
		tygf: item.tygf,
		gb2312: item.gb2312,
		glyphs: JSON.stringify(item.glyphs),
		name: item.name,
		ambiguous: item.ambiguous,
	}));
	return await CharacterModel.createBatch(env, rows);
}

/** PUT:/characters/:unicode */
export async function Update(
	request: IRequest,
	env: Env,
): Promise<Result<boolean>> {
	const unicode = parseInt(request.params["unicode"]);
	if (!Number.isInteger(unicode))
		return new Err(ErrCode.ParamInvalid, "Unicode不正确");

	let body: any;
	try {
		body = await request.json();
	} catch (err) {
		return new Err(ErrCode.UnknownInnerError, (err as Error).message);
	}
	const row: CharacterRow = {
		unicode,
		tygf: body.tygf,
		gb2312: body.gb2312,
		glyphs: JSON.stringify(body.glyphs),
		name: body.name,
		ambiguous: body.ambiguous,
	};
	return await CharacterModel.update(env, row);
}

/** DELETE:/characters/:unicode */
export async function Delete(
	request: IRequest,
	env: Env,
): Promise<Result<boolean>> {
	const unicode = parseInt(request.params["unicode"]);
	if (!Number.isInteger(unicode))
		return new Err(ErrCode.ParamInvalid, "Unicode不正确");
	return await CharacterModel.delete(env, unicode);
}
