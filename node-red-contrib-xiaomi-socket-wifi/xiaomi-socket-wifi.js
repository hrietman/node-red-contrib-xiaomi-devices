module.exports = function(RED) {
    "use strict";
    var mustache = require("mustache");
    var crypto = require("crypto");
    var miio = require("miio");
    var connectionState = "timeout";
    var retryTimer;
    var delayedStatusMsgTimer;


    function XiaomiPlugWifiNode(config) {
        RED.nodes.createNode(this, config);
        this.ip = config.ip;
        this.output = config.output;
        this.onmsg = config.onmsg;
        this.offmsg = config.offmsg;
        this.plug = null;

        var node = this;

        node.status({fill: "yellow", shape: "dot", text: "connecting"});

        miio.device({address: node.ip})
            .then(function (plug) {
                node.plug = plug;
                node.status({fill:"green", shape:"dot", text:"connected"});
                connectionState = "connected";
                delayedStatusMsgUpdate(node);

                node.plug.on('propertyChanged', function(e) {
                    if (e.property === "power") {
                        if (e.value['0']) {
                            setState("on");
                        } else {
                            setState("off");
                        }
                    }
                });
                watchdog();
            })
            .catch(function (error) {
                connectionState = "reconnecting";
                watchdog();
            })

        node.on('input', function (msg) {
            var payload = msg.payload;
            if (connectionState === "connected") {
                if (payload == 'on') {
                    node.plug.setPower(true);
                }

                if (payload == 'off') {
                    node.plug.setPower(false);
                }
            }
        });

        node.on('close', function (done) {
            if (retryTimer) {
                clearInterval(retryTimer);
            }
            if (delayedStatusMsgTimer) {
                clearTimeout(delayedStatusMsgTimer);
            }
            if (node.plug) {
                node.plug.destroy();
            }
            done();
        });

        var setState = function(state) {
            if (node.plug) {
                var status = null;
                var info = {"payload": {
                    "id": node.plug.id,
                    "type": node.plug.type,
                    "model": node.plug.model,
                    "capabilities": node.plug.capabilities,
                    "address": node.plug.address,
                    "port": node.plug.port,
                    "power": node.plug.power()
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
            }
        };

        var delayedStatusMsgUpdate = function() {
            delayedStatusMsgTimer = setTimeout(function() {
                if (node.plug.power()['0']) {
                    setState("on");
                } else {
                    setState("off");
                }
            }, 1500);
        };

        var discoverDevice = function() {
            miio.device({address: node.ip})
                .then(function (plug) {
                    if (node.plug == null) {
                        node.plug = plug;
                        node.plug.on('propertyChanged', function(e) {
                            if (e.property === "power") {
                                if (e.value['0']) {
                                    setState("on");
                                } else {
                                    setState("off");
                                }
                            }
                        });
                    }
                    if (connectionState === "reconnecting") {
                        node.status({fill:"green", shape:"dot", text:"connected"});
                        connectionState = "connected";
                        delayedStatusMsgUpdate();
                    }
                    watchdog();
                })
                .catch(function (error) {
                    connectionState = "reconnecting";
                    if (node.plug) {
                        node.plug.destroy();
                        node.plug = null;
                    }
                    watchdog();
                })
        };

        var watchdog = function() {
            console.log("retrytimer started");
            var interval = 10;
            retryTimer = setInterval(function() {
                if (interval == 0) {
                    interval = 10;
                    clearInterval(retryTimer);
                    discoverDevice();
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

    process.on('unhandledRejection', function(reason, p) {
        // console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
        var message = reason + "";
        if (message.indexOf("Call to device timed out") >= 0) {
            if (this.plug) {
                console.log("Issue with miio package; discard plug and reconnect.");
                this.plug.destroy();
                this.plug = null;
            }
        }
    });
}
