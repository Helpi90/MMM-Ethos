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
		allTemps: false,
		allHashes: false,
		showUptime: true,
		showWatts: true,
		showEveryRig: true,
		showSummary: false
	},

	requiresVersion: "2.1.0", // Required version of MagicMirror

	/**
	 * @function start
	 * @description Calls createInterval and sends the config to the node_helper.
	 */
	start: function() {
		let self = this;
		let dataRequest = null;
		let dataNotification = null;

		moment.locale(config.language);

		//Flag for check if module is loaded
		this.loaded = false;

		// Schedule update timer.
		this.getData();
		setInterval(function() {
			self.updateDom();
		}, this.config.updateInterval);
	},

	/**
	 * @function getData
	 * @description function example return data and show it in the module wrapper
	 */
	getData: function () {
        let self = this;

        let urlApi = self.config.ethosApiLink;
        let retry = true;

        let dataRequest = new XMLHttpRequest();
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

	/**
	 * @function scheduleUpdate
	 * @description Schedule next update.
	 * @param {*} delay - Milliseconds before next update. If empty, this.config.updateInterval is used.
	 * 
	 */
	scheduleUpdate: function(delay) {
		let nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}
		nextLoad = nextLoad ;
		let self = this;
		setTimeout(function() {
			self.getData();
		}, nextLoad);
	},

    /**
	 * @function getDom
	 * @description Generate table.
	 * @returns tableWrapper
	 */
	getDom: function() {
		let self = this;
		if (self.config.ethosApiLink === "") {
			var wrapper = document.createElement("div");
			wrapper.innerHTML = "Please set the api lin in the config for module: " + this.name + ".";
			return wrapper;
		}
		let tableWrapper = document.createElement("table");
		tableWrapper.className = "small mmm-ethos-table"; 

		if(self.dataRequest){
			if (!self.config.showSummary && !self.config.showEveryRig) {
				Log.info("Nothing to show!!");
			}
			if (self.config.showSummary) {
				let tableHeadRow = self.createTableRigsHead();
            	tableWrapper.appendChild(tableHeadRow);
				let trWrapper = self.createTableRigsData(tableWrapper);
				tableWrapper.appendChild(trWrapper);
			}
			if (self.config.showEveryRig) {
            	let tableHeadRow = self.createTableHead();
            	tableWrapper.appendChild(tableHeadRow);
				let rigs = self.getRigData();
				let trWrapper = self.createTableData(rigs,tableWrapper);
				tableWrapper.appendChild(trWrapper);
			}			
		}
			
		// Data from helper
		if (this.dataNotification) {
			var wrapperDataNotification = document.createElement("div");
			// translations  + datanotification
			wrapperDataNotification.innerHTML =  this.translate("UPDATE") + ": " + this.dataNotification.date;

		}
		return tableWrapper;
	},

	/**
	 * @description Filter rigData from request
	 * 
	 * @returns List of rigData
	 */
	getRigData: function() {
		let rigsData = [];
		let rigsIds = this.getRigIds();
		for(let i=0; i<rigsIds.length; i++){
			let rigData = this.dataRequest['rigs'][rigsIds[i]]
			rigsData.push(rigData);
		}
		return rigsData;
	},

	/**
	 * @description Filter id's from request
	 * 
	 * @returns List of id's
	 */
	getRigIds: function () {
		let rigs = Object.keys(this.dataRequest['rigs']);
		return rigs;
	},

	/**
	 * @description Create header for table
	 */
	createTableHead: function () {
        let self = this;
        let tableHeadRow = document.createElement("tr");
        tableHeadRow.className = 'border-bottom';
		
        let tableHeadValues = [];
		tableHeadValues.push("Gpus");
		tableHeadValues.push("Hashes");

		if (self.config.allTemps) {
			tableHeadValues.push(this.translate("TEMP")+" °C");
		}else {
			tableHeadValues.push("\u00D8Temp");
		}

		if (self.config.showUptime) {
			tableHeadValues.push("Uptime");
		}

		if (self.config.showWatts) {
			tableHeadValues.push("Watts");
		}
		
        for (let thCounter = 0; thCounter < tableHeadValues.length; thCounter++) {
            let tableHeadSetup = document.createElement("th");
            tableHeadSetup.innerHTML = tableHeadValues[thCounter];
			
            tableHeadRow.appendChild(tableHeadSetup);
        }
        return tableHeadRow;
	},

	/**
	 * @description Create table header for rigs
	 */
	createTableRigsHead: function () {
        let self = this;
        let tableHeadRow = document.createElement("tr");
        tableHeadRow.className = 'border-bottom';

        let tableHeadValues = [];
		tableHeadValues.push("Rigs")
		tableHeadValues.push("Gpus");
		tableHeadValues.push("Hashes");
		tableHeadValues.push("\u00D8Temp");

		if (self.config.showWatts) {
			tableHeadValues.push("Watts");
		}
		
        for (let thCounter = 0; thCounter < tableHeadValues.length; thCounter++) {
            let tableHeadSetup = document.createElement("th");
            tableHeadSetup.innerHTML = tableHeadValues[thCounter];

            tableHeadRow.appendChild(tableHeadSetup);
        }
        return tableHeadRow;
	},
	
	/**
	 * @description Create data for table rigs
	 * @param {*} tableWrapper 
	 */
	createTableRigsData: function (tableWrapper) {
		let self = this;
		let trWrapper = document.createElement("tr");
		trWrapper.className = 'tr';

		let tdValues = [
			self.dataRequest["alive_rigs"],
			self.dataRequest["alive_gpus"],
			self.dataRequest["total_hash"],
			self.dataRequest["avg_temp"].toFixed(2) + "°C",
		];

		if (self.config.showWatts) {
			tdValues.push(self.dataRequest["total_watts"]);
		}

		for (let c = 0; c < tdValues.length; c++) {
			let tdWrapper = document.createElement("td");

			tdWrapper.innerHTML = tdValues[c];

			if (c === 0 && tdValues[c] !== self.dataRequest["total_rigs"]) {
				tdWrapper.className = 'crit';
			}
			switch (c) {
				case 0:
					if (tdValues[c] !== self.dataRequest["total_rigs"]) {
						tdWrapper.className = 'crit';
					}
					break;
				case 1:
					if (tdValues[c] !== self.dataRequest["total_gpus"]) {
						tdWrapper.className = 'crit';
					}
				default:
					break;
			}

			trWrapper.appendChild(tdWrapper);
		}
		tableWrapper.appendChild(trWrapper);

		return trWrapper;
	},

	/**
	 * @description Create data for table
	 * @param {Object[]} rigs - List of rigs
	 * @param {*} tableWrapper 
	 */
    createTableData: function (rigs,tableWrapper) {
        let self = this;
        if (rigs.length > 0) {
            for (let index = 0; index < rigs.length; index++) {
                var trWrapper = document.createElement("tr");
				trWrapper.className = 'tr';
				let critHashes = false;
				let critTemp = false;
				
                let tdValues = [
					rigs[index]['gpus']
				];

				if (self.config.allHashes) {
					tdValues.push(rigs[index]['miner_hashes']);
				} else {
					tdValues.push(rigs[index]['hash']);
					if (self.checkHashes(rigs[index])) {
						critHashes = true;
					}
				}
				
				if (self.config.allTemps) {
					tdValues.push(rigs[index]['temp']);
				}
				else {
					if(self.getAverageTemp(rigs[index]['temp'])>70) {
						critTemp = true;
					}
					tdValues.push(self.getAverageTemp(rigs[index]['temp'])+"°C");
				}
				if (self.config.showUptime) {
					tdValues.push(self.getUptime(rigs[index]['uptime']));
				}
				if (self.config.showWatts) {
					tdValues.push(rigs[index]["rig_watts"]);
				}
				

                for (let c = 0; c < tdValues.length; c++) {
                    var tdWrapper = document.createElement("td");
    
                    tdWrapper.innerHTML = tdValues[c];
					if ((critTemp && c == 2) || (critHashes && c == 1)) {
						tdWrapper.className = 'crit';
					}
                    trWrapper.appendChild(tdWrapper);
                }
                tableWrapper.appendChild(trWrapper);
            }
        }
        return trWrapper;
	},
	
	/**
	 * @description Check hash values and gpus
	 * @param {object} rig 
	 * 
	 * @returns bool
	 */
	checkHashes: function(rig) {
		let gpus 
		let hashes = rig["miner_hashes"].split(" ");
		if (hashes.length !== parseInt(rig["gpus"])) {
			return true;
		}
		for (let index = 0; index < hashes.length; index++) {
			const hash = hashes[index];
			if(parseInt(hash) <= 10) {
				return true;
			}
		}
		return false;
	},

	/**
	 * @function getAverageTemp
	 * @description Calculate the average tempeture
	 * @param {string []} temp - List of tempetures
	 */
	getAverageTemp: function(temp) {
		let temps = temp.split(" ");
		let averageTemp = 0.0;
		for (let i = 0; i < temps.length; i++) {
			averageTemp += parseFloat(temps[i]);
		}
		return (averageTemp/temps.length).toFixed(2);
	},

	/**
	 * @function getUptime
	 * @description Checks time and return day/hour/mins
	 * @param {int} time - Uptime from rig
	 */
	getUptime: function(time){
		if (time === undefined) {
			return "Offline";
		}
		let uptime = parseInt(time);
		if (uptime >= 86400) {
			let strUptime = (Math.floor(uptime/86400)).toString();
			if (parseInt(strUptime) === 1) {
				return strUptime+" "+this.translate("DAY");
			}
			return strUptime+" "+this.translate("DAYS");
		}
		if (uptime >= 3600) {
			let strUptime = (Math.floor(uptime/3600)).toString();
			if (parseInt(strUptime) === 1) {
				return strUptime+" "+this.translate("HOUR");
			}else {
				return strUptime+" "+this.translate("HOURS");
			}
			
		}
		if (uptime >= 60) {
			let strUptime = (Math.floor(uptime/60)).toString();
			return strUptime + " mins";
		}
	},

	/**
     * @function getStyles
     * @description Style dependencies for this module.
     * @override
     *
     * @returns {string[]} List of the style dependency filepaths.
     */
	getStyles: function () {
		return [
			"MMM-Ethos.css",
			"font-awesome.css"
		];
	},

	/**
     * @function getTranslations
     * @description Translations for this module.
     * @override
     *
     * @returns {Object.<string, string>} Available translations for this module (key: language code, value: filepath).
     */
	getTranslations: function() {
		return {
			en: "translations/en.json",
			es: "translations/es.json",
			de: "translations/de.json"
		};
	},

	/**
	 * @function processData
	 * @description Sends data to node_helper
	 * @param {*} data 
	 */
	processData: function(data) {
		var self = this;
		this.dataRequest = data;
		if (this.loaded === false) { self.updateDom(self.config.animationSpeed) ; }
		this.loaded = true;

		// the data if load
		// send notification to helper
		this.sendSocketNotification("MMM-Ethos-NOTIFICATION_TEST", data);
	},

	/**
     * @function socketNotificationReceived
     * @description Handles incoming messages from node_helper.
     * @override
     *
     * @param {string} notification - Notification name
     * @param {*} payload - Detailed payload of the notification.
     */
	socketNotificationReceived: function (notification, payload) {
		if(notification === "MMM-Ethos-NOTIFICATION_TEST") {
			// set dataNotification
			this.rigs = payload;
			this.updateDom();
		}
	},
});
