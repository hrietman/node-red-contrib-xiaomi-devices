module.exports = function(RED) {
    "use strict";

    function XiaomiActionRead(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function(msg) {
            if(msg.sid) {
                msg.payload = {
                    cmd: "read",
                    sid: msg.payload
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
}
