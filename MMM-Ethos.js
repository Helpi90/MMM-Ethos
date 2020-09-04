/* global Module */

/* Magic Mirror
 * Module: MMM-Ethos
 *
 * By Marc Helpenstein <helpi9007@gmail.com>
 * MIT Licensed.
 */




Module.register("MMM-Ethos", {
	defaults: {
		ethosApiLink: "",
		updateInterval: 60000,
		retryDelay: 5000,
		allTemps: false
	},

	requiresVersion: "2.1.0", // Required version of MagicMirror

	start: function() {
		var self = this;
		var dataRequest = null;
		var dataNotification = null;

		moment.locale(config.language);

		//Flag for check if module is loaded
		this.loaded = false;

		// Schedule update timer.
		this.getData();
		setInterval(function() {
			self.updateDom();
		}, this.config.updateInterval);
	},

	/*
	 * getData
	 * function example return data and show it in the module wrapper
	 * get a URL request
	 *
	 */
	getData: function () {
        var self = this;

        var urlApi = self.config.ethosApiLink;
        var retry = true;

        var dataRequest = new XMLHttpRequest();
        dataRequest.open("GET", urlApi, true);
        dataRequest.onreadystatechange = function () {
            //console.log(this.readyState);
            if (this.readyState === 4) {
                //console.log(this.status);
                if (this.status === 200) {
                    self.processData(JSON.parse(this.response));
                } else if (this.status === 401) {
                    self.updateDom(self.config.animationSpeed);
                    Log.error(self.name, this.status);
                    retry = false;
                } else {
                    Log.error(self.name, "Could not load data.");
                }
                if (retry) {
                    self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
                }
            }
		};
		dataRequest.send();
    },

	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update.
	 *  If empty, this.config.updateInterval is used.
	 */
	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}
		nextLoad = nextLoad ;
		var self = this;
		setTimeout(function() {
			self.getData();
		}, nextLoad);
	},

	

	getDom: function() {
		var self = this;
       	var tableWrapper = document.createElement("table");
       	tableWrapper.className = "small mmm-ethos-table";
		// If this.dataRequest is not empty
		if(self.dataRequest){
            var tableHeadRow = self.createTableHead();
            tableWrapper.appendChild(tableHeadRow);
            var rigs = self.getRigData();
            var trWrapper = self.createTableData(rigs,tableWrapper);
            tableWrapper.appendChild(trWrapper);
       	}
        

		// Data from helper
		if (this.dataNotification) {
			var wrapperDataNotification = document.createElement("div");
			// translations  + datanotification
			wrapperDataNotification.innerHTML =  this.translate("UPDATE") + ": " + this.dataNotification.date;

		}
		return tableWrapper;
	},

	getRigData: function() {
		let rigsData = [];
		let rigsIds = this.getRigIds();
		for(let i=0; i<rigsIds.length; i++){
			let rigData = this.dataRequest['rigs'][rigsIds[i]]
			rigsData.push(rigData);
		}
		return rigsData;
	},

	getRigIds: function () {
		let rigs = Object.keys(this.dataRequest['rigs']);
		return rigs;
	},

	createTableHead: function () {
        var self = this;
        var tableHeadRow = document.createElement("tr");
        tableHeadRow.className = 'border-bottom';

        var tableHeadValues = [
			"Gpus",
            "Hashes"
		];
		
		if (self.config.allTemps) {
			tableHeadValues.push(this.translate("TEMP")+" °C");
		}else {
			tableHeadValues.push("Temp");
		}

        for (var thCounter = 0; thCounter < tableHeadValues.length; thCounter++) {
            var tableHeadSetup = document.createElement("th");
            tableHeadSetup.innerHTML = tableHeadValues[thCounter];

            tableHeadRow.appendChild(tableHeadSetup);
        }
        return tableHeadRow;

	},
	
    createTableData: function (rigs,tableWrapper) {
        var self = this;
        if (rigs.length > 0) {
            for (let index = 0; index < rigs.length; index++) {
                var trWrapper = document.createElement("tr");
                trWrapper.className = 'tr';
                var tdValues = [
					rigs[index]['gpus'],
                    rigs[index]['hash']
				];
				if (self.config.allTemps) {
					tdValues.push(rigs[index]['temp']);
				}
				else {
					self.getAverageTemp(rigs[index]['temp']);
					tdValues.push(self.getAverageTemp(rigs[index]['temp'])+"°C");
				}
                for (var c = 0; c < tdValues.length; c++) {
                    var tdWrapper = document.createElement("td");
    
                    tdWrapper.innerHTML = tdValues[c];
    
                    trWrapper.appendChild(tdWrapper);
                }
    
                tableWrapper.appendChild(trWrapper);
                
            }
        }
        return trWrapper;
	},
	
	getAverageTemp: function(temp) {
		let temps = temp.split(" ");
		let averageTemp = 0.0;
		for (let i = 0; i < temps.length; i++) {
			averageTemp += parseFloat(temps[i]);
		}
		return (averageTemp/temps.length).toFixed(2);
	},

	getScripts: function() {
		return [];
	},

	getStyles: function () {
		return [
			"MMM-Ethos.css",
			"font-awesome.css"
		];
	},

	// Load translations files
	getTranslations: function() {
		//FIXME: This can be load a one file javascript definition
		return {
			en: "translations/en.json",
			es: "translations/es.json",
			de: "translations/de.json"
		};
	},

	processData: function(data) {
		var self = this;
		this.dataRequest = data;
		if (this.loaded === false) { self.updateDom(self.config.animationSpeed) ; }
		this.loaded = true;

		// the data if load
		// send notification to helper
		this.sendSocketNotification("MMM-Ethos-NOTIFICATION_TEST", data);
	},

	// socketNotificationReceived from helper
	socketNotificationReceived: function (notification, payload) {
		if(notification === "MMM-Ethos-NOTIFICATION_TEST") {
			// set dataNotification
			this.rigs = payload;
			this.updateDom();
		}
	},
});
