import { IRequest, Router } from 'itty-router';
import { authorizedUser } from '../middleware/jwt';
import { Env } from '../dto/context';

const tableEquivalence = 'equivalence';

async function List(request: IRequest, env: Env) {
	const { results } = await env.CHAI.prepare(`SELECT * FROM ${tableEquivalence}`).all();
	const data = results.map((row) => {
		return {
			user: row.user,
			model: row.model,
			data: JSON.parse(row.data as string),
		};
	});
	return new Response(JSON.stringify(data));
}

async function Create(request: IRequest, env: Env) {
	let user, model, data;
	const body = await request.json();
	if (typeof body === 'object' && body !== null && 'user' in body && 'model' in body && 'data' in body) {
		user = body.user;
		model = body.model;
		data = body.data;
	}
	const res = await env.CHAI.prepare(`INSERT INTO ${tableEquivalence} (user, model, data) VALUES (?, ?, ?)`)
		.bind(user, model, JSON.stringify(data))
		.run();
	const success = res.error === undefined;
	return new Response(JSON.stringify(success));
}

export const routerEquivalence = Router({ base: '/equivalence' }).get('/', List).post('/', authorizedUser, Create);
