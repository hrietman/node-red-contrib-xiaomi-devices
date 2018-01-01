module.exports = function(RED) {
    "use strict";
    var miDevicesUtils = require('../utils');

    function XiaomiActionRead(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function(msg) {
            if(msg.sid) {
                msg.payload = {
                    cmd: "read",
                    sid: msg.sid
                };
                node.send(msg);
            }
        });
    }
    RED.nodes.registerType("xiaomi-actions read", XiaomiActionRead);


    function XiaomiActionGetIdList(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function(msg) {
            msg.payload = {
                cmd: "get_id_list"
            };
            node.send(msg);
        });
    }
    RED.nodes.registerType("xiaomi-actions get_id_list", XiaomiActionGetIdList);


    function XiaomiActionSingleClick(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function(msg) {
            if(msg.gateway && msg.sid && msg.gateway.key && msg.gateway.lastToken) {
                msg.payload = {
                    cmd: "write",
                    data: {
                        status: "click",
                        sid: msg.sid,
                        key: miDevicesUtils.getGatewayKey(msg.gateway.key, msg.gateway.lastToken)
                    }
                };
                node.send(msg);
            }
        });
    }
    RED.nodes.registerType("xiaomi-actions click", XiaomiActionSingleClick);


    function XiaomiActionDoubleClick(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function(msg) {
            if(msg.gateway && msg.sid && msg.gateway.key && msg.gateway.lastToken) {
                msg.payload = {
                    cmd: "write",
                    data: {
                        status: "double_click",
                        sid: msg.sid,
                        key: miDevicesUtils.getGatewayKey(msg.gateway.key, msg.gateway.lastToken)
                    }
                };
                node.send(msg);
            }
        });
    }
    RED.nodes.registerType("xiaomi-actions double_click", XiaomiActionDoubleClick);
}
