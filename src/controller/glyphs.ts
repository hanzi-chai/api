import { IRequest } from "itty-router";
import { Env } from "../dto/context";
import { Err, ErrCode, Ok, Result } from "../error/error";
import { GlyphModel, GlyphRow } from "../model/glyphs";

/** GET:/glyphs */
export async function List(
	_request: Request,
	env: Env,
): Promise<Result<GlyphRow[]>> {
	return await GlyphModel.list(env);
}

/** GET:/glyphs/:id */
export async function Info(
	request: IRequest,
	env: Env,
): Promise<Result<GlyphRow>> {
	const id = parseInt(request.params["id"]);
	if (!Number.isInteger(id)) return new Err(ErrCode.ParamInvalid, "ID不正确");
	return await GlyphModel.byId(env, id);
}

/** POST:/glyphs */
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
	const row: GlyphRow = {
		id: body.id,
		type: body.type,
		operator: body.operator,
		references: JSON.stringify(body.references),
		strokes: JSON.stringify(body.strokes),
		gf0014_id: body.gf0014_id,
		gf3001_id: body.gf3001_id,
	};
	return await GlyphModel.create(env, row);
}

/** POST:/glyphs/batch */
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
	const rows: GlyphRow[] = body.map((item: any) => ({
		id: item.id,
		type: item.type,
		operator: item.operator,
		references: JSON.stringify(item.references),
		strokes: JSON.stringify(item.strokes),
		gf0014_id: item.gf0014_id,
		gf3001_id: item.gf3001_id,
	}));
	return await GlyphModel.createBatch(env, rows);
}

/** PUT:/glyphs/:id */
export async function Update(
	request: IRequest,
	env: Env,
): Promise<Result<boolean>> {
	const id = parseInt(request.params["id"]);
	if (!Number.isInteger(id)) return new Err(ErrCode.ParamInvalid, "ID不正确");

	let body: any;
	try {
		body = await request.json();
	} catch (err) {
		return new Err(ErrCode.UnknownInnerError, (err as Error).message);
	}
	const row: GlyphRow = {
		id,
		type: body.type,
		operator: body.operator,
		references: JSON.stringify(body.references),
		strokes: JSON.stringify(body.strokes),
		gf0014_id: body.gf0014_id,
		gf3001_id: body.gf3001_id,
	};
	return await GlyphModel.update(env, row);
}

/** DELETE:/glyphs/:id */
export async function Delete(
	request: IRequest,
	env: Env,
): Promise<Result<boolean>> {
	const id = parseInt(request.params["id"]);
	if (!Number.isInteger(id)) return new Err(ErrCode.ParamInvalid, "ID不正确");
	return await GlyphModel.delete(env, id);
}
