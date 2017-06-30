module.exports = function(RED) {

    function RemoteServerNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.deviceList = n.deviceList || [];

        var node = this;
    }

    RED.nodes.registerType("xiaomi-gateway", RemoteServerNode);

}
