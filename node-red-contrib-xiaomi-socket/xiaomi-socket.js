module.exports = function(RED) {
    "use strict";
    var mustache = require("mustache");
    var crypto = require("crypto");

    function XiaomiPlugNode(config) {
        RED.nodes.createNode(this, config);
        this.gateway = RED.nodes.getNode(config.gateway);
        this.sid = config.sid;
        this.output = config.output;
        this.onmsg = config.onmsg;
        this.offmsg = config.offmsg;
        this.key = this.gateway.key;

        var node = this;
        var currentToken = "";
        var state = "";

        node.status({fill:"yellow", shape:"ring", text:"no key"});

        if (this.gateway) {
            node.on('input', function(msg) {
                // var payload = JSON.parse(msg);
                var payload = msg.payload;

                if (payload.cmd == "heartbeat" && payload.model == "gateway") {
                    var token = payload.token;

                    if (token) {
                        var cipher = crypto.createCipheriv('aes128', node.key, (new Buffer("17996d093d28ddb3ba695a2e6f58562e", "hex")));
                        var encoded_string = cipher.update(token, 'utf8', 'hex');

                        encoded_string += cipher.final('hex');
                        currentToken = encoded_string.substring(0,32);
                        if (state == "") {
                            node.status({fill:"yellow", shape:"dot", text:"unknown state"});
                        }
                    }
                }
                if (payload == 'on') {
                    var cmd =
                        {   "cmd":"write",
                            "sid": node.sid,
                            "model": "plug",
                            "data": JSON.stringify({"status":"on", "key": currentToken })
                        }
                    msg.payload = JSON.stringify(cmd);
                    node.send([[],[msg]]);

                } else if (payload == "off") {
                    var cmd =
                        {   "cmd":"write",
                            "sid": node.sid,
                            "model": "plug",
                            "data": JSON.stringify({"status":"off", "key": currentToken })
                        }
                    msg.payload = JSON.stringify(cmd);
                    node.send([[],[msg]]);

                } else if (payload.sid == node.sid && payload.model == "plug") {
                    var data = JSON.parse(payload.data)

                    if (currentToken == "") {
                        node.status({fill:"yellow", shape:"dot", text:"no key"});
                    } else if (data.status && data.status == "on") {
                        node.status({fill:"green", shape:"dot", text:"on"});
                        state = "on";
                    } else if (data.status && data.status == "off") {
                        node.status({fill:"red", shape:"dot", text:"off"});
                        state = "off";
                    }

                    if (node.output == "0") {
                        msg.payload = payload;
                        node.send([msg]);
                    } else if (node.output == "1") {
                        var status = null;

                        if (data.status) {
                            status = {"payload": data.status};
                        }
                        node.send([status]);
                    } else if (node.output == "2") {
                        var status = null;

                        if (data.status === 'on') {
                            status = {"payload": mustache.render(node.onmsg, data)}
                        } else {
                            status = {"payload": mustache.render(node.offmsg, data)}
                        }
                        node.send([status]);
                    }
                }
            });

            node.on("close", function() {
            });

        } else {
            // no gateway configured
        }

    }

    RED.nodes.registerType("xiaomi-plug", XiaomiPlugNode);

}
