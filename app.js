var monitor = require('node-usb-detection');
var serialport = require('serialport');

var vid = 0x16c0;
var pid = 0x0483;
var baud = 230400;
var OPEN_TIMEOUT = 100; // milliseconds
var ourPort = undefined;

devices = monitor.list();
devices.forEach(function(device) {
    findOurPort(device);
});

monitor.add(function(device) {
    console.log("adding", device);
    findOurPort(device);
});

monitor.remove(function(device) {
    console.log("removing", device);
    findOurPort(device);
});

function ourDevice(device) {
    if (
	Number(device.deviceDescriptor.idVendor) === vid
	&& 
	Number(device.deviceDescriptor.idProduct) === pid
    ) {
	return true;
    }
    return false;
}

function findOurPort(device) {
    if(ourDevice(device)){
	serialport.list(function (err, ports) {
	    console.log("ports!", ports);
	    /*
	    ports.forEach(function(port) {
		if (
		    Number(device.deviceDescriptor.idVendor) === Number(port.vendorId)
		    &&
		    Number(device.deviceDescriptor.idProduct) === Number(port.productId)
		) {
		    if (ourPort === undefined) {
			console.log("opening port");
			open(port);
		    } else {
			console.log("port removed");
			ourPort.close();
			ourPort = undefined;
		    }
		}
	    });
	    */
	});
    }
}

function open(port) {
    ourPort = new serialport.SerialPort(port.comName, {
	baudrate: baud
    }, false); // this is the openImmediately flag [default is true]

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

process.on('exit', function() {
    if(ourPort) {
	ourPort.close();
    }
});