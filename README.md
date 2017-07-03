# node-red-contrib-xiaomi-devices

This module contains the following nodes to provide easy integration of the Xiaomi devices into node-red.

The following devices are currently supported:

* Temperature/humidity sensor
* Magnet switch
* Button switch
* Motion sensor
* Power plug (zigbee)

## Preperation
To receive the gateway json messages on your network you need to enable the developer mode, aka LAN mode in the gateway.

A UDP input node is needed to receive the json messages. An UDP output node to send command's to the gateway.


## Install

```
cd ~\.node-red
npm install node-red-contrib-xiaomi-devices
```

## Usage

Below a screenshot of an example use of all nodes.

![Xiaomi devices example in node-red](https://github.com/hrietman/node-red-contrib-xiaomi-devices/blob/master/xiaomi-devices-overview.png)
