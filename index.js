#!/usr/bin/env node

const { Socket } = require("net");
const { question } = require("readline-sync");
const fs = require("fs");
const { parseArgs} = require("util");

const args = parseArgs({
	"options": {
		"verbose": {
			"type": "boolean",
			"short": "v"
		},
		"outfile": {
			"type": "string",
			"short": "o"
		},
		"host": {
			"type": "string",
			"short": "h"
		},
		"ports": {
			"type": "string",
			"short": "p"
		},
		"help": {
			"type": "boolean"
		}
	}
});

const PING_ERROR_TIMEOUT = "timeout";

const VERBOSE = args.values.verbose;
const OUTFILE = args.values.outfile;
const HOST = args.values.host;
const PORTS = args.values.ports;
const HELP = args.values.help;

if(HELP) {
	console.log(`
SimplePortPinger - Milk_Cool, 2023

Usage:
checkports --help
checkports [-h HOST] [-p PORTS] [-v] [-o OUTFILE]

Arguments:
--help        Prints help and exits.
-h, --host    Defines the host to ping.
-p, --ports   Defines the ports to ping in format 512to1023 (inclusive)
-v, --verbose If present, prints out information about every port
-o, --outfile Defines the file to write open ports to. Overwrites the contents of the file.
`);
	process.exit(0);
}

// https://stackoverflow.com/a/10723600
const ping = (host, port) => new Promise(resolve => {
	const socket = new Socket();
	socket.setTimeout(2500);
	socket.on("connect", () => resolve([true, null, port]))
		.on("error", e => resolve([false, e, port]))
		.on("timeout", e => resolve([false, PING_ERROR_TIMEOUT, port]))
		.connect(port, host);
});
const pingMultiple = async (host, portStart, portEnd) => {
	let o = [];
	for(let i = portStart; i <= portEnd; i++) {
		const res = await ping(host, i);
		o.push(res);
		if(VERBOSE)
			if(res[0])
				console.info(`Port ${i} is open!`);
			else if(res[1] == PING_ERROR_TIMEOUT)
				console.error(`Port ${i} is closed: timed out.`);
			else
				console.error(`Port ${i} is closed: ${res[1]}.`);
	}
	return o;
};

const host = HOST ?? question("Host: ");
const ports = (PORTS ?? question("Ports (range split by \"to\"): ")).split("to");

(async () => {
	const res = await pingMultiple(host, ...ports);
	console.info("Finished pinging.");
	if(OUTFILE) fs.writeFileSync(OUTFILE, "");
	for(let i of res)
		if(i[0]) {
			console.log(`OPEN ${i[2]}`);
			if(OUTFILE) fs.appendFileSync(OUTFILE, i[2] + "\n");
		}
	process.exit(0);
})();
