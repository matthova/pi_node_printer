var monitor = require('node-usb-detection');
var serialport = require('serialport');
var child_process = require('child_process');

var Hydraprint = function (deviceData) {
    var that = this;
    this.VID = 0x16c0;
    this.PID = 0x0483;
    this.BAUDRATE = 230400;
    this.PORT_NAME = '/dev/ttyACM';
    this.OPEN_TIMEOUT = 1000; // milliseconds
    this.ourPort = undefined;

    devices = monitor.list();
    devices.forEach(function(device) {
	that.findOurPort(device);
    });

    monitor.add(function(device) {
	that.findOurPort(device);
    });

    monitor.remove(function(device) {
	that.findOurPort(device);
    });
}

Hydraprint.prototype.findOurPort = function(device) {
    var that = this;
    if (
	Number(device.deviceDescriptor.idVendor) === that.VID
	&& 
	Number(device.deviceDescriptor.idProduct) === that.PID
    ) {
	setTimeout(function() {
	    that.open();
	}, that.OPEN_TIMEOUT);
    }
};

Hydraprint.prototype.getPort = function (portNumber) {
    code = child_process.execSync('ls ' + this.PORT_NAME + portNumber).toString().split("\n")[0];
    return code;
};

Hydraprint.prototype.open = function() {
    var portNumber = 0;
    var that = this;
    if(that.ourPort === undefined) {
	that.tryPort(portNumber);
    } else {
	that.ourPort.close(function() {
	    console.log("port closed");
	    that.ourPort = undefined;
	});
    }
};

Hydraprint.prototype.tryPort = function(portNumber) {
    var that = this;
    try {
	if(that.getPort(portNumber) === that.PORT_NAME + portNumber) {
	    that.ourPort = new serialport.SerialPort(
		that.PORT_NAME + portNumber,
		{ baudrate: that.BAUDRATE },
		false
	    );
	    that.ourPort.open(function (error) {
		if ( error ) {
		    console.log('failed to open: ' + error);
		} else {
		    that.ourPort.on('data', function(data) {
			console.log('data received: ' + data);
		    });
		    setTimeout(function() {
			that.ourPort.write("M501\n", function(err, results) {
			    
			});
		    }, that.OPEN_TIMEOUT);
		}
	    });
	}
    } catch(ex) {
	that.ourPort = undefined;
	if(portNumber < 255) {
	    that.tryPort(portNumber + 1);
	}
	console.log("No port available at", that.PORT_NAME + portNumber);
    }
}

Hydraprint.prototype.cleanup = function() {
    var that = this;
    process.on('exit', function() {
	if(that.ourPort) {
	    that.ourPort.close();
	}
    });
};

var printer = new Hydraprint();