const moment = require('moment');
var rp = require("request-promise");
var pollingtoevent = require("polling-to-event");

var Accessory, 
	Service, 
	Characteristic, 
	FakeGatoHistoryService;
	
class WINDOW {

    constructor(log, config, api) {

        FakeGatoHistoryService = require('fakegato-history')(api);

        Accessory = api.platformAccessory;
        Service = api.hap.Service;
        Characteristic = api.hap.Characteristic;

        var platform = this;

        this.api = api;
        this.log = log;
        this.config = config;
        this.name = config.name;
        this.homeID = config.homeID;
        this.zoneID = config.zoneID;
        this.username = config.username;
        this.password = config.password;
        this.timeout = config.timeout;

        this.url = "https://my.tado.com/api/v2/homes/" + this.homeID +
            "/zones/" + this.zoneID + "/state?password=" + this.password +
            "&username=" + this.username;

        this.state = 0;

        this.emitter = pollingtoevent(function(done) {
            rp.get(platform.url, function(err, req, data) {
                done(err, data);
            });
        }, {
            longpolling: false,
            interval: 5000
        });

    }

    getServices() {

        var accessory = this;

        this.informationService = new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Name, this.name)
            .setCharacteristic(Characteristic.Identify, this.name)
            .setCharacteristic(Characteristic.Manufacturer, 'Tado GmbH')
            .setCharacteristic(Characteristic.Model, 'Window')
            .setCharacteristic(Characteristic.SerialNumber, "OWD-" + this.homeID + "-" + this.zoneID)
            .setCharacteristic(Characteristic.FirmwareRevision, require('../package.json').version);

        this.Window = new Service.ContactSensor(this.name);

        this.Window.getCharacteristic(Characteristic.ContactSensorState)
            .updateValue(accessory.state)

        accessory.getCurrentState()

        return [this.informationService, this.Window];

    }

    getCurrentState() {

        var self = this;

        self.emitter
            .on("poll", function(data) {

                var result = JSON.parse(data);
                
                if(result.openWindow != null){
	                self.state = 1;
                } else {
	                self.state = 0;
                }
                
                self.Window.getCharacteristic(Characteristic.ContactSensorState).updateValue(self.state);

            })
            .on("error", function(err) {
                console.log("%s", err);
                self.Window.getCharacteristic(Characteristic.ContactSensorState).updateValue(self.state);
            });

    }

}

module.exports = WINDOW
