module.exports = function(RED) {
    "use strict";
    var mustache = require("mustache");
    var miDevicesUtils = require('../utils');

    function XiaomiSwitchNode(config) {
        RED.nodes.createNode(this, config);
        this.gateway = RED.nodes.getNode(config.gateway);
        this.sid = config.sid;
        this.output = config.output;
        this.outmsg = config.outmsg;
        this.outmsgdbcl = config.outmsgdbcl;

        var node = this;

        node.status({fill:"grey", shape:"ring", text:"battery - na"});

        if (this.gateway) {
            node.on('input', function(msg) {
                // var payload = JSON.parse(msg);
                var payload = msg.payload;
                if (payload.sid == node.sid && ["switch", "sensor_switch.aq2"].indexOf(payload.model) >= 0) {
                    var data = payload.data;
                    miDevicesUtils.setStatus(node, data);

                    if (node.output == "0") {
                        miDevicesUtils.prepareFullDataOutput(payload);
                        node.send([msg]);
                    } else if (node.output == "1") {
                        var status = null;

                        if (data.status) {
                            status = {"payload": data.status};
                        }
                        node.send([status]);
                    } else if (node.output == "2") {
                        var status = null;

                        if (data.status && data.status == "click") {
                            status = {"payload": mustache.render(node.outmsg, data)}
                            node.send([[status],[]]);
                        }

                        if (data.status && data.status == "double_click") {
                            status = {"payload": mustache.render(node.outmsgdbcl, data)}
                            node.send([[],[status]]);
                        }
                    }
                }
            });

            node.on("close", function() {
            });

        } else {
            // no gateway configured
        }

    }

    RED.nodes.registerType("xiaomi-switch", XiaomiSwitchNode);

}
