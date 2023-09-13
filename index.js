import {next as Automerge} from '@automerge/automerge';
import fetch from "node-fetch";
import WebSocket from 'ws';
import crypto from 'crypto';

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

let server = process.argv[2];
let webstrate = process.argv[3];

let ws; // Our websocket
let amDoc; // The automerge document
let serverSyncState = Automerge.initSyncState();

fetch(`https://${server}/${webstrate}/?data`).then(response => {
	return response.arrayBuffer();
}).then(buffer => {
	let data = new Uint8Array(buffer);
	amDoc = Automerge.load(data);

	ws = new WebSocket(`wss://${server}`);

	ws.on('open', (connection) => {
		console.log("Connection established");
		// Tell the server that we want updates on the document
		ws.send(JSON.stringify({'wa': 'open', 'body': {strateId: webstrate, peerId: crypto.randomUUID()}}));
	});

	ws.on('message', (message) => {
		try {
			let msg = JSON.parse(message); //Throw away JSON messages;
		} catch(e) {
			// The first byte indicates the type of the message
			const byteArray = new Uint8Array(message);
			const syncMessage = byteArray.slice(1);
			const [newDoc, newSyncState, patch] = Automerge.receiveSyncMessage(amDoc, serverSyncState, syncMessage, {
				patchCallback: processPatches
			});
			amDoc = newDoc;
			serverSyncState = newSyncState;
			let [nextSyncState, newSyncMessage] = Automerge.generateSyncMessage(amDoc, serverSyncState);
			serverSyncState = nextSyncState;
			if (newSyncMessage) send(newSyncMessage);
		}
	});
});

function send(syncMessage) {
	// Add the type, 0 for sync message
	let message = new Uint8Array(syncMessage.length+1);
	message.set(new Uint8Array([0]));
	message.set(syncMessage, 1);
	ws.send(message);
}

function updateDoc() {
	console.log("Updating something in the doc");
	let newDoc = Automerge.change(amDoc, doc => {
		doc.data.lastSetByTestCode = String(Date.now());
	});
	amDoc = newDoc;
	let [nextSyncState, msg] = Automerge.generateSyncMessage(
		amDoc,
		serverSyncState
	);
	serverSyncState = nextSyncState;
	if(msg) send(msg);
}

function processPatches(patches) {
	console.log(patches);
}

setInterval(updateDoc, 5000);
