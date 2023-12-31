import { Env } from '../dto/context';
import { Err, ErrCode, Result } from '../error/error';
import { loadNumber, loadString } from '../dto/load';

const tableForm = 'form';

export class FormModel {
	unicode: number = 0;
	name: string = '';
	default_type: number = 0;
	gf0014_id: number = 0;
	component: string = '';
	compound: string = '';

	public static modelFromRecord(record: Record<string, any>): FormModel {
		var formModel = new FormModel();
		formModel.unicode = loadNumber(record.unicode);
		formModel.name = loadString(record.name);
		formModel.default_type = loadNumber(record.default_type);
		formModel.gf0014_id = loadNumber(record.gf0014_id);
		formModel.component = loadString(record.component);
		formModel.compound = loadString(record.compound);
		return formModel;
	}

	public static async byUnicode(env: Env, unicode: number): Promise<Result<GlyphModel>> {
		let res: GlyphModel | null;
		try {
			res = await env.CHAI.prepare(`SELECT * FROM ${tableForm} WHERE unicode=? LIMIT 1`).bind(unicode).first();
		} catch (err) {
			console.warn({ message: (err as Error).message });
			return new Err(ErrCode.DataQueryFailed, '数据查询失败');
		}

		if (res === null) {
			return new Err(ErrCode.RecordNotFound, '字形数据不存在');
		}

		return res;
	}

	public static async generateUnicode(env: Env, type: "component" | "compound"): Promise<Result<number>> {
		var res: any[];
		const index = type === "component" ? 0 : 1;
		const breakpoint = [0xe000, 0xe800, 0xf000] as const;
		const from = breakpoint[index];
		const to = breakpoint[index + 1];
		try {
			const { results } = await env.CHAI.prepare(`SELECT unicode FROM ${tableForm} WHERE unicode >= ? AND unicode < ?`)
				.bind(from, to)
				.all();
			res = results;
		} catch (err) {
			console.warn({ message: (err as Error).message });
			return new Err(ErrCode.DataQueryFailed, '数据查询失败');
		}

		if (res === null) {
			return new Err(ErrCode.RecordNotFound, '字形数据不存在');
		}

		let code = from;
		for (const { unicode } of res) {
			if (unicode !== code) {
				return code;
			}
			code += 1;
		}

		if (code === to) {
			return new Err(ErrCode.UnknownInnerError, '已达上限，无法继续创建');
		}
		return code;
	}

	public static async exist(env: Env, unicode: number): Promise<Result<boolean>> {
		var res;
		try {
			res = await env.CHAI.prepare(`SELECT COUNT(0) total FROM ${tableForm} WHERE unicode=?`).bind(unicode).first('total');
		} catch (err) {
			console.warn({ message: (err as Error).message });
			return new Err(ErrCode.DataQueryFailed, '数据查询失败');
		}
		return loadNumber(res) !== 0;
	}

	public static async count(env: Env): Promise<Result<number>> {
		var res;
		try {
			res = await env.CHAI.prepare(`SELECT COUNT(0) total FROM ${tableForm}`).first('total');
		} catch (err) {
			console.warn({ message: (err as Error).message });
			return new Err(ErrCode.DataQueryFailed, '数据查询失败');
		}
		return loadNumber(res);
	}

	public static async list(env: Env, offset: number, limit: number): Promise<Result<GlyphModel[]>> {
		var res;
		try {
			res = await env.CHAI.prepare(`SELECT * FROM ${tableForm} LIMIT ? OFFSET ?`).bind(limit, offset).all();
		} catch (err) {
			console.warn({ message: (err as Error).message });
			return new Err(ErrCode.DataQueryFailed, '数据查询失败');
		}

		const { results } = res;
		return results as unknown as GlyphModel[];
	}

	public static async create(env: Env, form: GlyphModel): Promise<Result<number>> {
		try {
			await env.CHAI.prepare(
				`INSERT INTO ${tableForm} (unicode, name, default_type, gf0014_id, component, compound, ambiguous) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
				.bind(form.unicode, form.name, form.default_type, form.gf0014_id, form.component, form.compound, form.ambiguous)
				.run();
		} catch (err) {
			console.warn({ message: (err as Error).message });
			return new Err(ErrCode.DataCreateFailed, '数据创建失败');
		}
		return form.unicode;
	}

	public static async delete(env: Env, unicode: number): Promise<Result<boolean>> {
		try {
			await env.CHAI.prepare(`DELETE FROM ${tableForm} WHERE unicode=?`).bind(unicode).run();
		} catch (err) {
			console.warn({ message: (err as Error).message });
			return new Err(ErrCode.DataDeleteFailed, '数据删除失败');
		}
		return true;
	}

	public static async update(env: Env, form: GlyphModel): Promise<Result<boolean>> {
		try {
			await env.CHAI.prepare(
				`UPDATE ${tableForm} SET name=?, default_type=?, gf0014_id=?, component=?, compound=?, ambiguous=? WHERE unicode=?`,
			)
				.bind(form.name, form.default_type, form.gf0014_id, form.component, form.compound, form.ambiguous, form.unicode)
				.run();
		} catch (err) {
			console.warn({ message: (err as Error).message });
			return new Err(ErrCode.DataUpdateFailed, '数据更新失败');
		}
		return true;
	}

	public static async mutate(env: Env, unicode: number, unicode_new: number): Promise<Result<boolean>> {
		try {
			await env.CHAI.prepare(`UPDATE ${tableForm} SET unicode = ? where unicode = ?`).bind(unicode_new, unicode).run();
			await env.CHAI.prepare(`UPDATE ${tableForm} SET component = json_replace(component, '$.source', ?) where json_extract(component, '$.source') = ?`)
				.bind(unicode_new, unicode)
				.run();
			await env.CHAI.prepare(`UPDATE ${tableForm} SET compound = REPLACE(compound, ?, ?)`)
				.bind(unicode.toString(), unicode_new.toString())
				.run();
		} catch (err) {
			console.warn({ message: (err as Error).message });
			return new Err(ErrCode.DataUpdateFailed, '数据更新失败');
		}
		return true;
	}
}
