import { Env } from "../dto/context";
import { Err, ErrCode, Result } from "../error/error";

const table = "glyphs";

export interface GlyphRow {
	id: number;
	type: string; // "component" | "compound"
	operator?: string; // single IDC character, e.g. ⿰
	references?: string; // JSON: {id, xbegin?, ybegin?, xend?, yend?}[]
	strokes?: string; // JSON: (矢量笔画数据 | 引用笔画块数据)[]
	gf0014_id?: number;
	gf3001_id?: number;
}

export class GlyphModel {
	static async byId(env: Env, id: number): Promise<Result<GlyphRow>> {
		const res = await env.CHAI.prepare(
			`SELECT * FROM ${table} WHERE id=? LIMIT 1`,
		)
			.bind(id)
			.first<GlyphRow>();
		if (!res) return new Err(ErrCode.RecordNotFound, "字形不存在");
		return res;
	}

	static async list(env: Env): Promise<Result<GlyphRow[]>> {
		const { results } = await env.CHAI.prepare(
			`SELECT * FROM ${table}`,
		).all<GlyphRow>();
		return results;
	}

	static async create(env: Env, row: GlyphRow): Promise<Result<number>> {
		const { id, type, operator, references, strokes, gf0014_id, gf3001_id } =
			row;
		try {
			await env.CHAI.prepare(
				`INSERT INTO ${table} (id, type, operator, references, strokes, gf0014_id, gf3001_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					id,
					type,
					operator ?? null,
					references ?? null,
					strokes ?? null,
					gf0014_id ?? null,
					gf3001_id ?? null,
				)
				.run();
		} catch (err) {
			return new Err(
				ErrCode.DataCreateFailed,
				`创建失败（${(err as Error).message}）`,
			);
		}
		return id;
	}

	static async createBatch(
		env: Env,
		rows: GlyphRow[],
	): Promise<Result<boolean>> {
		try {
			const statement = env.CHAI.prepare(
				`INSERT INTO ${table} (id, type, operator, references, strokes, gf0014_id, gf3001_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			);
			await env.CHAI.batch(
				rows.map((r) =>
					statement.bind(
						r.id,
						r.type,
						r.operator ?? null,
						r.references ?? null,
						r.strokes ?? null,
						r.gf0014_id ?? null,
						r.gf3001_id ?? null,
					),
				),
			);
		} catch (err) {
			return new Err(
				ErrCode.DataCreateFailed,
				`批量创建失败（${(err as Error).message}）`,
			);
		}
		return true;
	}

	static async update(env: Env, row: GlyphRow): Promise<Result<boolean>> {
		const { id, type, operator, references, strokes, gf0014_id, gf3001_id } =
			row;
		try {
			await env.CHAI.prepare(
				`UPDATE ${table} SET type=?, operator=?, references=?, strokes=?, gf0014_id=?, gf3001_id=? WHERE id=?`,
			)
				.bind(
					type,
					operator ?? null,
					references ?? null,
					strokes ?? null,
					gf0014_id ?? null,
					gf3001_id ?? null,
					id,
				)
				.run();
		} catch (err) {
			return new Err(
				ErrCode.DataUpdateFailed,
				`更新失败（${(err as Error).message}）`,
			);
		}
		return true;
	}

	static async delete(env: Env, id: number): Promise<Result<boolean>> {
		try {
			await env.CHAI.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id).run();
		} catch (err) {
			return new Err(
				ErrCode.DataDeleteFailed,
				`删除失败（${(err as Error).message}）`,
			);
		}
		return true;
	}
}
