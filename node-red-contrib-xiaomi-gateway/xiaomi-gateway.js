/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    "use strict";
    var dgram = require('dgram');
    var udpInputPortsInUse = {};

    // The Input Node
    function GatewayIn(n) {
        RED.nodes.createNode(this,n);
        this.group = "224.0.0.50";
        this.port = 9898;
        this.iface = null;
        this.addr = n.ip;
        this.ipv = this.ip && this.ip.indexOf(":") >= 0 ? "udp6" : "udp4";
        var node = this;

        var opts = {type:node.ipv, reuseAddr:true};
        if (process.version.indexOf("v0.10") === 0) { opts = node.ipv; }
        var server;

        if (!udpInputPortsInUse.hasOwnProperty(this.port)) {
            server = dgram.createSocket(opts);  // default to udp4
            udpInputPortsInUse[this.port] = server;
        }
        else {
            node.warn(RED._("udp.errors.alreadyused",node.port));
            server = udpInputPortsInUse[this.port];  // re-use existing
        }

        if (process.version.indexOf("v0.10") === 0) { opts = node.ipv; }

        server.on("error", function (err) {
            if ((err.code == "EACCES") && (node.port < 1024)) {
                node.error(RED._("udp.errors.access-error"));
            } else {
                node.error(RED._("udp.errors.error",{error:err.code}));
            }
            server.close();
        });

        server.on('message', function (message, remote) {
            var msg;
            if(remote.address == node.addr) {
                msg = { payload: JSON.parse(message.toString('utf8')) };
                node.send(msg);
            }
        });

        server.on('listening', function () {
            var address = server.address();
            node.log(RED._("udp.status.listener-at",{host:address.address,port:address.port}));
            server.setBroadcast(true);
            try {
                server.setMulticastTTL(128);
                server.addMembership(node.group,node.iface);
                node.log(RED._("udp.status.mc-group",{group:node.group}));
            } catch (e) {
                if (e.errno == "EINVAL") {
                    node.error(RED._("udp.errors.bad-mcaddress"));
                } else if (e.errno == "ENODEV") {
                    node.error(RED._("udp.errors.interface"));
                } else {
                    node.error(RED._("udp.errors.error",{error:e.errno}));
                }
            }
        });

        node.on("close", function() {
            if (udpInputPortsInUse.hasOwnProperty(node.port)) {
                delete udpInputPortsInUse[node.port];
            }
            try {
                server.close();
                node.log(RED._("udp.status.listener-stopped"));
            } catch (err) {
                //node.error(err);
            }
        });

        try { server.bind(node.port,node.iface); }
        catch(e) { } // Don't worry if already bound
    }
    RED.httpAdmin.get('/udp-ports/:id', RED.auth.needsPermission('udp-ports.read'), function(req,res) {
        res.json(Object.keys(udpInputPortsInUse));
    });
    RED.nodes.registerType("xiaomi-gateway in",GatewayIn);


    // The Output Node
    function GatewayOut(n) {
        RED.nodes.createNode(this,n);
        this.port = 9898;
        this.outport = 9898;
        this.iface = null;
        this.addr = n.ip;
        this.ipv = this.ip && this.ip.indexOf(":") >= 0 ? "udp6" : "udp4";
        this.multicast = false;
        var node = this;

        var opts = {type:node.ipv, reuseAddr:true};
        if (process.version.indexOf("v0.10") === 0) { opts = node.ipv; }

        var sock;
        if (udpInputPortsInUse[this.outport]) {
            sock = udpInputPortsInUse[this.outport];
        }
        else {
            sock = dgram.createSocket(opts);  // default to udp4
            sock.on("error", function(err) {
                // Any async error will also get reported in the sock.send call.
                // This handler is needed to ensure the error marked as handled to
                // prevent it going to the global error handler and shutting node-red
                // down.
            });
            udpInputPortsInUse[this.outport] = sock;
        }

        if (!udpInputPortsInUse[this.outport]) {
            sock.bind(node.outport);
            node.log(RED._("udp.status.ready",{outport:node.outport,host:node.addr,port:node.port}));
        } else {
            node.log(RED._("udp.status.ready-nolocal",{host:node.addr,port:node.port}));
        }

        node.on("input", function(msg) {
            if (msg.hasOwnProperty("payload")) {
                var add = node.addr || msg.ip || "";
                var por = node.port || msg.port || 0;
                if (add === "") {
                    node.warn(RED._("udp.errors.ip-notset"));
                } else if (por === 0) {
                    node.warn(RED._("udp.errors.port-notset"));
                } else if (isNaN(por) || (por < 1) || (por > 65535)) {
                    node.warn(RED._("udp.errors.port-invalid"));
                } else {
                    var message = Buffer.from(JSON.stringify(msg.payload));
                    sock.send(message, 0, message.length, por, add, function(err, bytes) {
                        if (err) {
                            node.error("udp : "+err,msg);
                        }
                        message = null;
                    });
                }
            }
        });

        node.on("close", function() {
            if (udpInputPortsInUse.hasOwnProperty(node.outport)) {
                delete udpInputPortsInUse[node.outport];
            }
            try {
                sock.close();
                node.log(RED._("udp.status.output-stopped"));
            } catch (err) {
                //node.error(err);
            }
        });
    }
    RED.nodes.registerType("xiaomi-gateway out", GatewayOut);
}
