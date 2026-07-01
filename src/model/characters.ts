import { Env } from "../dto/context";
import { Err, ErrCode, Result } from "../error/error";
import { loadNumber } from "../dto/load";

const table = "characters";

export interface CharacterRow {
	unicode: number;
	tygf?: number;
	gb2312?: number;
	glyphs: string; // JSON: {id: number, source: string[]}[]
	name?: string;
	ambiguous?: number;
}

export class CharacterModel {
	static async byUnicode(
		env: Env,
		unicode: number,
	): Promise<Result<CharacterRow>> {
		const res = await env.CHAI.prepare(
			`SELECT * FROM ${table} WHERE unicode=? LIMIT 1`,
		)
			.bind(unicode)
			.first<CharacterRow>();
		if (!res) return new Err(ErrCode.RecordNotFound, "字符不存在");
		return res;
	}

	static async exist(env: Env, unicode: number): Promise<Result<boolean>> {
		const res = await env.CHAI.prepare(
			`SELECT COUNT(0) total FROM ${table} WHERE unicode=?`,
		)
			.bind(unicode)
			.first("total");
		return loadNumber(res) !== 0;
	}

	static async count(env: Env): Promise<Result<number>> {
		const res = await env.CHAI.prepare(
			`SELECT COUNT(0) total FROM ${table}`,
		).first("total");
		return loadNumber(res);
	}

	static async listAll(env: Env): Promise<Result<CharacterRow[]>> {
		const { results } = await env.CHAI.prepare(
			`SELECT * FROM ${table}`,
		).all<CharacterRow>();
		return results;
	}

	static async create(env: Env, row: CharacterRow): Promise<Result<number>> {
		const { unicode, tygf, gb2312, glyphs, name, ambiguous } = row;
		try {
			await env.CHAI.prepare(
				`INSERT INTO ${table} (unicode, tygf, gb2312, glyphs, name, ambiguous) VALUES (?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					unicode,
					tygf ?? null,
					gb2312 ?? null,
					glyphs,
					name ?? null,
					ambiguous ?? null,
				)
				.run();
		} catch (err) {
			return new Err(
				ErrCode.DataCreateFailed,
				`创建失败（${(err as Error).message}）`,
			);
		}
		return unicode;
	}

	static async createBatch(
		env: Env,
		rows: CharacterRow[],
	): Promise<Result<boolean>> {
		try {
			const statement = env.CHAI.prepare(
				`INSERT INTO ${table} (unicode, tygf, gb2312, glyphs, name, ambiguous) VALUES (?, ?, ?, ?, ?, ?)`,
			);
			await env.CHAI.batch(
				rows.map((r) =>
					statement.bind(
						r.unicode,
						r.tygf ?? null,
						r.gb2312 ?? null,
						r.glyphs,
						r.name ?? null,
						r.ambiguous ?? null,
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

	static async update(env: Env, row: CharacterRow): Promise<Result<boolean>> {
		const { unicode, tygf, gb2312, glyphs, name, ambiguous } = row;
		try {
			await env.CHAI.prepare(
				`UPDATE ${table} SET tygf=?, gb2312=?, glyphs=?, name=?, ambiguous=? WHERE unicode=?`,
			)
				.bind(
					tygf ?? null,
					gb2312 ?? null,
					glyphs,
					name ?? null,
					ambiguous ?? null,
					unicode,
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

	static async delete(env: Env, unicode: number): Promise<Result<boolean>> {
		try {
			await env.CHAI.prepare(`DELETE FROM ${table} WHERE unicode=?`)
				.bind(unicode)
				.run();
		} catch (err) {
			return new Err(
				ErrCode.DataDeleteFailed,
				`删除失败（${(err as Error).message}）`,
			);
		}
		return true;
	}
}
