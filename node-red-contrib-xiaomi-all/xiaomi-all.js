module.exports = function(RED) {
    "use strict";
    var mustache = require("mustache");
    var miDevicesUtils = require('../utils');

    function XiaomiAllNode(config) {
        RED.nodes.createNode(this, config);
        this.gateway = RED.nodes.getNode(config.gateway);

        var node = this;

        if (this.gateway) {
            node.on('input', function(msg) {
                msg.payload = node.gateway.deviceList;
                node.send(msg);
            });
        }
    }

    RED.nodes.registerType("xiaomi-all", XiaomiAllNode);

}
