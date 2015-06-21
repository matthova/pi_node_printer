var monitor = require('node-usb-detection');
var serialport = require('serialport');
var child_process = require('child_process');

var Hydraprint = function (deviceData) {
    var VID = 0x16c0;
    var PID = 0x0483;
    var BAUDRATE = 230400;
    var PORT_NAME = '/dev/ttyACM';
    var OPEN_TIMEOUT = 1000; // milliseconds
}

var ourPort = undefined;

devices = monitor.list();
devices.forEach(function(device) {
    findOurPort(device);
});

monitor.add(function(device) {
    findOurPort(device);
});

monitor.remove(function(device) {
    findOurPort(device);
});

function findOurPort(device) {
    if (
	Number(device.deviceDescriptor.idVendor) === VID
	&& 
	Number(device.deviceDescriptor.idProduct) === PID
    ) {
	setTimeout(function() {
	    open();
	}, OPEN_TIMEOUT);
    }
}

function getPort(portNumber) {
    code = child_process.execSync('ls ' + PORT_NAME + portNumber).toString().split("\n")[0];
    console.log("code", code);
    return code;
}

function open() {
    var portNumber = 0;
    if(ourPort === undefined) {
	tryPort(portNumber);
    } else {
	ourPort.close(function() {
	    console.log("port closed");
	    ourPort = undefined;
	});
    }
}

function tryPort(portNumber) {
    try {
	if(getPort(portNumber) === PORT_NAME + portNumber) {
	    ourPort = new serialport.SerialPort(
		PORT_NAME + portNumber,
		{ baudrate: BAUDRATE },
		false
	    );
	    ourPort.open(function (error) {
		if ( error ) {
		    console.log('failed to open: ' + error);
		} else {
		    ourPort.on('data', function(data) {
			console.log('data received: ' + data);
		    });
		    setTimeout(function() {
			ourPort.write("M501\n", function(err, results) {
			    console.log('err ' + err);
			    console.log('results ' + results);
			});
		    }, OPEN_TIMEOUT);
		}
	    });
	}
    } catch(ex) {
	ourPort = undefined;
	if(portNumber < 255) {
	    tryPort(portNumber + 1);
	}
	console.log("No port available at", PORT_NAME + portNumber);
    }
}

process.on('exit', function() {
    if(ourPort) {
	ourPort.close();
    }
});