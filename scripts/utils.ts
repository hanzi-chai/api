import axios from "axios";
import "dotenv/config";

export function listToObject<T extends { unicode: number }>(list: T[]) {
	return Object.fromEntries(
		list.map((x) => [String.fromCodePoint(x.unicode), x])
	);
}

const endpoint = "https://api.chaifen.app";
const headers = {
	Authorization: `Bearer ${process.env.JWT}`,
};

export async function put<T>(route: string, data: T) {
	const result = await axios.put(endpoint + route, data, { headers });
	console.log(result.data);
}

export async function post<T>(route: string, data: T) {
	const result = await axios.post(endpoint + route, data, { headers });
	console.log(result.data);
}

export async function del(route: string) {
	const result = await axios.delete(endpoint + route, { headers });
	console.log(result.data);
}
