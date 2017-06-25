module.exports = function(RED) {

    function RemoteServerNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.group = n.group;
        this.port = n.port;
        this.udpv = n.udpv;

        var node = this;

    }

    RED.nodes.registerType("xiaomi-gateway", RemoteServerNode);

}
