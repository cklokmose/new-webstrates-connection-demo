import {next as Automerge} from '@automerge/automerge';
import fetch from "node-fetch";

let webstrate = process.argv[2];

fetch(`${webstrate}?data`).then(response => {
	return response.arrayBuffer();
}).then(buffer => {
	let data = new Uint8Array(buffer);
	let amDoc = Automerge.load(data);
	console.log(amDoc.data.scene);
})

console.log(webstrate)
