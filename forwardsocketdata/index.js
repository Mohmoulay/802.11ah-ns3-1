var path = require("path");
var net = require("net");
var express = require("express");
var socket = require("socket.io");
var ss = require('socket.io-stream');
var HTTP_PORT = 8080;
var LISTENER_PORT = 7707;
var PATH = "testfile.txt";
var Program = (function () {
    function Program() {
        // a list of active connections from the website
        this.activeSockets = [];
        this.buffer = "";
        this.simulationInitializationLines = [];
        this.initialize();
    }
    /**
     * Initializes the server
     */
    Program.prototype.initialize = function () {
        var httpServer = this.setupExpress();
        this.setupWebsocket(httpServer);
        this.setupSimulatorListener();
    };
    Program.prototype.setupSimulatorListener = function () {
        var self = this;
        net.createServer(function (sock) {
            sock.on("data", function (data) { return self.onDataReceived(data); });
        }).listen(LISTENER_PORT);
    };
    /**
     * Sets up the express stack, returns the http server that it creates
     */
    Program.prototype.setupExpress = function () {
        console.log("Initializing express");
        var app = express();
        app.use("/", express.static(path.join(__dirname, 'public')));
        var server = app.listen(HTTP_PORT);
        return server;
    };
    /**
     * Listen for connections from websockets and update
     * the active sockets list
     */
    Program.prototype.setupWebsocket = function (server) {
        var _this = this;
        console.log("Listening for websocket requests...");
        var io = socket.listen(server);
        io.on("connection", function (sock) {
            _this.onWebClientConnected(sock);
            _this.activeSockets.push(sock);
            sock.on("close", function () {
                var idx = _this.activeSockets.indexOf(sock);
                if (idx >= 0)
                    _this.activeSockets.splice(idx, 1);
            });
        });
    };
    /**
   * Fired when the client has received data. Append the received data to the buffer
   * and split on newlines (\n delimiter). As soon as a full line is received, process it
   */
    Program.prototype.onDataReceived = function (data) {
        this.buffer += data;
        var stop = false;
        while (!stop) {
            var parts = this.buffer.split('\n');
            if (parts.length > 1) {
                var line = parts[0].trim();
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
    };
    Program.prototype.onWebClientConnected = function (sock) {
        for (var _i = 0, _a = this.simulationInitializationLines; _i < _a.length; _i++) {
            var initLine = _a[_i];
            sock.emit("entry", initLine);
        }
    };
    Program.prototype.processMessage = function (line) {
        // retain config & base data to allow users to jump in simulation when it's already busy
        var parts = line.split(';');
        if (parts[1] == "start") {
            this.simulationInitializationLines = [];
            this.simulationInitializationLines.push(line);
        }
        else if (parts[1] == "stanodeadd" || parts[1] == "apnodeadd" || parts[1] == "stanodeassoc")
            this.simulationInitializationLines.push(line);
        for (var _i = 0, _a = this.activeSockets; _i < _a.length; _i++) {
            var s = _a[_i];
            s.emit("entry", line);
        }
    };
    return Program;
})();
exports.Program = Program;
// export the main program
exports.main = new Program();
//# sourceMappingURL=index.js.map