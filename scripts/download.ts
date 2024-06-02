import axios from 'axios';
import { mkdirSync, writeFileSync } from 'fs';

async function downloadRepertoire() {
	mkdirSync('data', { recursive: true });
	const res = await axios.get('https://api.chaifen.app/repertoire/all');
	const data = res.data;
	writeFileSync('data/repertoire.json', JSON.stringify(data));
}

async function downloadIDS() {
	mkdirSync('data', { recursive: true });
	const res = await axios.get('https://www.babelstone.co.uk/CJK/IDS.TXT');
	const data = res.data;
	writeFileSync('data/ids.txt', data);
}

downloadIDS();
downloadRepertoire();
