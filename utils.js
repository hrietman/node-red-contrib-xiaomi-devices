

module.exports = {
    computeBatteryLevel: function(voltage) {
        /*
          When full, CR2032 batteries are between 3 and 3.4V
          http://farnell.com/datasheets/1496885.pdf
        */
        return Math.min(Math.round((voltage - 2200) / 14), 100);
    },
    setStatus: function(node, data) {
        if (data.voltage) {
            var batteryPercent = Math.min(Math.round((data.voltage - 2200) / 14), 100);
            var status = {
                fill: "green", shape: "dot",
                text: "battery - " + batteryPercent + "%"
            };

            if (data.voltage < 2500) {
                status.color = "red";
            } else if (data.voltage < 2900) {
                status.color = "yellow";
            }
            node.status(status);
        }
    },
    prepareFullDataOutput: function(payload) {
        if(payload.data.voltage) {
            payload.data.batteryLevel = this.computeBatteryLevel(payload.data.voltage);
        }
        return payload;
    }
}
