module.exports = function(RED) {
    "use strict";
    var mustache = require("mustache");
    var miDevicesUtils = require('../utils');

    function XiaomiMotionNode(config) {
        RED.nodes.createNode(this, config);
        this.gateway = RED.nodes.getNode(config.gateway);
        this.sid = config.sid;
        this.output = config.output;
        this.motionmsg = config.motionmsg;
        this.nomotionmsg = config.nomotionmsg;

        var node = this;
        var state = "";

        // node.status({fill:"yellow", shape:"dot", text:"unknown state"});
        node.status({fill:"grey", shape:"ring", text:"battery - na"});

        if (this.gateway) {
            node.on('input', function(msg) {
                // var payload = JSON.parse(msg);
                var payload = msg.payload;

                if (payload.sid == node.sid && payload.model == "motion") {
                    var data = payload.data;

                    // if (data.status && data.status == "open") {
                    //     node.status({fill:"green", shape:"dot", text:"open"});
                    //     state = "open";
                    // } else if (data.status && data.status == "close") {
                    //     node.status({fill:"red", shape:"dot", text:"closed"});
                    //     state = "closed";
                    // }
                    miDevicesUtils.setStatus(node, data);


                    if (node.output == "0") {
                        miDevicesUtils.prepareFullDataOutput(payload);
                        node.send([msg]);
                    } else if (node.output == "1") {
                        var status = null;
                        var duration = null;

                        if (data.status) {
                            status = {"payload": data.status};
                        }
                        if (data.no_motion) {
                            status = {"payload": "no_motion"};
                            duration = {"payload": {"no_motion": data.no_motion}};
                        }

                        node.send([[status], [duration]]);
                    } else if (node.output == "2") {
                        var status = null;

                        if (data.status === 'motion') {
                            status = {"payload": mustache.render(node.motionmsg, data)}
                        } else {
                            status = {"payload": mustache.render(node.nomotionmsg, data)}
                        }
                        node.send([status]);
                    }
                }
                // Prepare for request
                else {
                    miDevicesUtils.prepareForGatewayRequest(node, msg);
                    node.send(msg);
                }
            });

            node.on("close", function() {
            });

        } else {
            // no gateway configured
        }

    }

    RED.nodes.registerType("xiaomi-motion", XiaomiMotionNode);

}
