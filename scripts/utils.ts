import axios from "axios";
import "dotenv/config";

export function listToObject<T extends { unicode: number }>(list: T[]) {
	return Object.fromEntries(
		list.map((x) => [String.fromCodePoint(x.unicode), x])
	);
}

const charToCode = (char: string) => char.codePointAt(0)!;

const glyphReverse = (c: Component | Compound | Identity) => {
  if (c.type === "basic_component") {
    return c;
  } else if (c.type === "derived_component" || c.type === "identity") {
    return { ...c, source: charToCode(c.source) };
  } else {
    return { ...c, operandList: c.operandList.map(charToCode) };
  }
};

export function toModel(character: Character) {
  return {
    ...character,
    readings: JSON.stringify(character.readings),
    glyphs: JSON.stringify(character.glyphs.map(glyphReverse)),
    ambiguous: +character.ambiguous as 0 | 1,
  };
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

export async function del<T>(route: string, data: T) {
	const result = await axios.delete(endpoint + route, { headers, data });
	console.log(result.data);
}
