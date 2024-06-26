import axios from 'axios';
import 'dotenv/config';

export function listToObject<T extends { unicode: number }>(list: T[]) {
	return Object.fromEntries(list.map((x) => [String.fromCodePoint(x.unicode), x]));
}

export async function update(data: Character[]) {
	const token = process.env.JWT;
	console.log(token);
	const result = await axios.put('https://api.chaifen.app/repertoire/batch', data, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
	console.log(result.data);
}
