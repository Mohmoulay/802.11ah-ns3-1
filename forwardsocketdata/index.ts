// import the necessary modules 
import * as http from "http";
import * as url from "url";
import * as fs from "fs";
import * as path from "path";
import * as net from "net";

import * as qs from "querystring";
import * as express from "express";
import * as socket from "socket.io"
import events = require('events');


var ss = require('socket.io-stream');


const HTTP_PORT = 8080;
const LISTENER_PORT = 7707;

const PATH = "testfile.txt";


export class Program {

    // a list of active connections from the website
    private activeSockets: SocketIO.Socket[] = [];

    constructor() {
        this.initialize();
    }

    /**
     * Initializes the server
     */
    private initialize() {
        let httpServer = this.setupExpress();
        this.setupWebsocket(httpServer);
        this.setupSimulatorListener();
    }

    setupSimulatorListener() {
        let self = this;
        net.createServer(sock => {
            sock.on("data", (data) => self.onDataReceived(data));
        }).listen(LISTENER_PORT);
    }
    /**
     * Sets up the express stack, returns the http server that it creates
     */
    setupExpress(): http.Server {

        console.log("Initializing express");
        var app = express();
        app.use("/", express.static(path.join(__dirname, 'public')));

        let server = app.listen(HTTP_PORT);
        return server;
    }

    /**
     * Listen for connections from websockets and update
     * the active sockets list
     */
    setupWebsocket(server: http.Server) {

        console.log("Listening for websocket requests...");
        let io = socket.listen(server);
        io.on("connection", sock => {

            this.onWebClientConnected(sock);

            this.activeSockets.push(sock);
            sock.on("close", () => {
                let idx = this.activeSockets.indexOf(sock);
                if (idx >= 0)
                    this.activeSockets.splice(idx, 1);
            });

        });
    }


    private buffer: string = "";

    /**
   * Fired when the client has received data. Append the received data to the buffer
   * and split on newlines (\n delimiter). As soon as a full line is received, process it
   */
    private onDataReceived(data: string) {
        this.buffer += data;

        let stop = false;
        while (!stop) {
            let parts: string[] = this.buffer.split('\n');
            if (parts.length > 1) {
                let line = parts[0].trim();
                this.buffer = this.buffer.substr(parts[0].length + 1);
                try {
                    this.processMessage(line);
                }
                catch (e) {
                    console.log("ERROR: " + e);
                }
            }
            else
                stop = true;
        }
    }

    private onWebClientConnected(sock:SocketIO.Socket) {
        for(let initLine of this.simulationInitializationLines) {
            sock.emit("entry", initLine);
        }
    }

    simulationInitializationLines: string[] = [];
    private processMessage(line: string) {

        // retain config & base data to allow users to jump in simulation when it's already busy
        var parts = line.split(';');
        if (parts[1] == "start") {
            this.simulationInitializationLines = [];
            this.simulationInitializationLines.push(line);
        }
        else if (parts[1] == "stanodeadd" || parts[1] == "apnodeadd" || parts[1] == "stanodeassoc")
            this.simulationInitializationLines.push(line);

        for (let s of this.activeSockets) {
            s.emit("entry", line);
        }
    }
}

// export the main program
export var main: Program = new Program();
