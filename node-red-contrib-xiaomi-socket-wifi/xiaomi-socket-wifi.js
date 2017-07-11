module.exports = function(RED) {
    "use strict";
    var mustache = require("mustache");
    var crypto = require("crypto");
    var miio = require("miio");

    function XiaomiPlugWifiNode(config) {
        RED.nodes.createNode(this, config);
        this.ip = config.ip;
        this.output = config.output;
        this.onmsg = config.onmsg;
        this.offmsg = config.offmsg;

        var node = this;
        var connectionState = "timeout";
        var plug = {};
        var retryTimer;

        node.status({fill:"yellow", shape:"dot", text:"connecting"});

        miio.device({ address: node.ip })
            .then(function(result) {
                if (result.type === "power-plug") {
                    plug = result;
                    node.status({fill:"green", shape:"dot", text:"connected"});
                    connectionState = "connected";

                    setTimeout(function() {
                        if (result.power()['0']) {
                            setState("on");
                        } else {
                            setState("off");
                        }
                    }, 1500);

                    watchdog();

                    plug.on('propertyChanged', function(e) {
                        if (e.property === "power") {
                            if (e.value['0']) {
                                setState("on");
                            } else {
                                setState("off");
                            }
                        }
                    });

                }
            })
            .catch(function(error) {
                node.status({fill:"red", shape:"dot", text:"time out"});
                connectionState = "reconnecting";
                watchdog();
            });

        node.on('input', function(msg) {
            var payload = msg.payload;

            if (payload == 'on') {
                if (connectionState === "connected") {
                    plug.setPower(true);
                }
            }

            if (payload == 'off') {
                if (connectionState === "connected") {
                    plug.setPower(false);
                }
            }

        });

        this.on('close', function(done) {
            if (retryTimer) {
                clearTimeout(retryTimer);
            }
            if (plug) {
                plug.destroy();
            }
            done();
        });

        var setState = function(state) {
            var status = null;
            var info = {"payload": {
                    "id": plug.id,
                    "type": plug.type,
                    "model": plug.model,
                    "capabilities": plug.capabilities,
                    "address": plug.address,
                    "port": plug.port,
                    "power": plug.power()
                }};

            if (state === "on") {
                node.status({fill:"green", shape:"dot", text:"on"});
                status = {"payload": mustache.render(node.onmsg, info.payload)}
            }
            if (state === "off") {
                node.status({fill:"red", shape:"dot", text:"off"});
                status = {"payload": mustache.render(node.offmsg, info.payload)}
            }

            if (node.output == 0) {
                status = info;
            } else if (node.output == "1") {
                status = {"payload": state}
            } else if (node.output == "2") {
                // do nothing, just send status parsed with mustache
            }
            node.send([status]);
        };

        var watchdog = function() {
            var interval = 10;
            retryTimer = setInterval(function() {
                if (interval == 0) {
                    miio.device({address: node.ip})
                        .then(function (result) {
                            if (connectionState === "reconnecting") {
                                node.status({fill:"green", shape:"dot", text:"connected"});
                                connectionState = "connected";

                                setTimeout(function() {
                                    if (result.power()['0']) {
                                        setState("on");
                                    } else {
                                        setState("off");
                                    }
                                }, 1500);
                            }
                        })
                        .catch(function (error) {
                            connectionState = "reconnecting";
                        })
                    interval = 10;
                } else {
                    interval--;
                    if (connectionState === "reconnecting") {
                        node.status({fill: "red", shape: "dot", text: "retrying in " + interval + " sec."});
                    }
                }
            }, 1000);
        }
    }

    RED.nodes.registerType("xiaomi-plug-wifi", XiaomiPlugWifiNode);

}
