module.exports = function(RED) {
    "use strict";
    var mustache = require("mustache");
    var udpInputPortsInUse = {};
    var dgram = require('dgram');

    function XiaomiHtNode(config) {
        RED.nodes.createNode(this, config);
        this.gateway = RED.nodes.getNode(config.gateway);
        this.sid = config.sid;
        this.output = config.output;
        this.temperature = config.temperature;
        this.humidity = config.humidity;

        var node = this;

        node.status({fill:"grey",shape:"ring",text:"battery"});

        if (this.gateway) {

            var opts = {type: node.gateway.udpv, reuseAddr:true};
            var server;

            if (!udpInputPortsInUse.hasOwnProperty(node.gateway.port)) {
                node.log("New UDP socket");
                server = dgram.createSocket(opts);  // default to udp4
                udpInputPortsInUse[node.gateway.port] = server;
            }
            else {
                node.warn(RED._("udp.errors.alreadyused", node.gateway.port));
                server = udpInputPortsInUse[node.gateway.port];  // re-use existing
            }

            server.on('listening', function () {
                server.setBroadcast(true);
                try {
                    server.setMulticastTTL(128);
                    server.addMembership(node.gateway.group, null);
                    node.log(RED._("udp.status.mc-group",{group:node.gateway.group}));

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

            server.on('message', function(msg, rinfo) {
                var payload = JSON.parse(msg);

                node.log("Received message from: " + payload.model + " sid: " + payload.sid + " payload: " + payload.data);

                if (payload.sid == node.sid) {
                    var data = JSON.parse(payload.data)

                    if (data.voltage) {
                        if (data.voltage < 2500) {
                            node.status({fill:"red",shape:"dot",text:"battery"});
                        } else if (data.voltage < 2900) {
                            node.status({fill:"yellow",shape:"dot",text:"battery"});
                        } else {
                            node.status({fill:"green",shape:"dot",text:"battery"});
                        }
                    } else {
                        node.status({fill:"grey",shape:"ring",text:"battery"});
                    }

                    if (node.output == "0") {
                        msg.payload = payload;
                        node.send([msg]);
                    } else if (node.output == "1") {
                        var temp = null;
                        var humidity = null;

                        if (data.temperature) {
                            temp = {"payload": data.temperature};
                        }

                        if (data.humidity) {
                            humidity = {"payload": data.humidity};
                        }
                        node.send([temp, humidity]);
                    } else if (node.output == "2") {
                        var temp = null;
                        var humidity = null;

                        if (data.temperature) {
                            temp = {"payload": mustache.render(node.temperature, data)}
                        }

                        if (data.humidity) {
                            humidity = {"payload": mustache.render(node.humidity, data)}
                        }
                        node.send([temp, humidity]);
                    }
                }
            });

            node.on("input", function(msg) {
                // console.log("got input");
            });

            node.on("close", function() {
                if (udpInputPortsInUse.hasOwnProperty(node.gateway.port)) {
                    delete udpInputPortsInUse[node.gateway.port];
                }
                server.close();
            });

            try { server.bind(node.gateway.port, null); }
            catch(e) { } // Don't worry if already bound

        } else {
            // no gateway configured
        }

    }

    RED.httpAdmin.get('/udp-ports/:id', RED.auth.needsPermission('udp-ports.read'), function(req,res) {
        res.json(Object.keys(udpInputPortsInUse));
    });

    RED.nodes.registerType("xiaomi-ht", XiaomiHtNode);

}
