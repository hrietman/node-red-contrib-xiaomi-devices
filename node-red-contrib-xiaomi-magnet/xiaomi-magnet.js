module.exports = function(RED) {
    "use strict";
    var mustache = require("mustache");

    function XiaomiMagnetNode(config) {
        RED.nodes.createNode(this, config);
        this.gateway = RED.nodes.getNode(config.gateway);
        this.sid = config.sid;
        this.output = config.output;
        this.openmsg = config.openmsg;
        this.closemsg = config.closemsg;

        var node = this;
        var state = "";

        // node.status({fill:"yellow", shape:"dot", text:"unknown state"});
        node.status({fill:"grey",shape:"ring",text:"battery"});

        if (this.gateway) {
            node.on('input', function(msg) {
                // var payload = JSON.parse(msg);
                var payload = msg.payload;

                if (payload.sid == node.sid && payload.model == "magnet") {
                    var data = JSON.parse(payload.data)

                    // if (data.status && data.status == "open") {
                    //     node.status({fill:"green", shape:"dot", text:"open"});
                    //     state = "open";
                    // } else if (data.status && data.status == "close") {
                    //     node.status({fill:"red", shape:"dot", text:"closed"});
                    //     state = "closed";
                    // }

                    if (data.voltage) {
                        if (data.voltage < 2500) {
                            node.status({fill:"red",shape:"dot",text:"battery"});
                        } else if (data.voltage < 2900) {
                            node.status({fill:"yellow",shape:"dot",text:"battery"});
                        } else {
                            node.status({fill:"green",shape:"dot",text:"battery"});
                        }
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

                        if (data.status === 'open' || data.no_close) {
                            status = {"payload": mustache.render(node.openmsg, data)}
                        } else {
                            status = {"payload": mustache.render(node.closemsg, data)}
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

    RED.nodes.registerType("xiaomi-magnet", XiaomiMagnetNode);

}
