import axios from 'axios';
import 'dotenv/config';

export default async function update(data: Character[]) {
	const token = process.env.JWT;
	console.log(token);
	const result = await axios.post('https://api.chaifen.app/repertoire/batch', data, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
	console.log(result.data);
}
