/**
 * @file 		conversionDiagram.js
 * @author 		Sanne Peters
 * @copyright 	Sanstream Creations 2013, but if you ask nicely I might let you use it for free.
 * @description This file needs more doc blocks.
 */

var ConversionDiagram = new Class({

	rawDataObject: null,
	parsedDataObject: null,
	currentDataObject: null,
	conversionData: null,
	orderedDates: null,

	shownItemsScale: null,
	seenItemsScale: null,
	boughtItemsScale: null,
	linearScales: null,
	logScale: null,
	totals: null, // holds an array with all the totals

	diagramContainer: null,
	diagramAreaHeight: null,
	firstItemShown: 0,

	/**
	 * [initialize description]
	 * @param  {[type]} dataObject
	 * @param  {[type]} containerIdentifier
	 * @return {[type]}
	 */
	initialize: function(dataObject, containerIdentifier,firstItemShown){

		var self = this;
		// testing data:
		
		if(self.suppliedDataIsOk()){

			// set up the visual prerequisites:
			var svgElement = d3.select(containerIdentifier).append('svg');
			var diagramWidth = 700;
			svgElement.attr('width', diagramWidth);
			self.diagramAreaHeight = diagramWidth * 0.70;
			svgElement.attr('height', self.diagramAreaHeight);

			self.diagramContainer = svgElement.append('g').attr('class','diagramContainer');
			self.linearScales = new Array();
			

			self.rawDataObject = dataObject;
			// Do the neccesary calculations and data-treatment:
			self.convertRawData();
			self.firstItemShown = self.orderedDates[0];
			self.currentDataObject = self.parsedDataObject[self.firstItemShown];

			// set up the scaling methods:
			//visual rendering: 
			self.renderDiagram();
		}
	},

	/**
	 * [suppliedDataIsOk description]
	 * @return {[type]}
	 */
	suppliedDataIsOk: function () {
	
		return true;		
	},

	/**
	 * [setTotals description]
	 */
	setTotals: function () {

		var self = this;

		self.totals = [];
		self.sizes = [];
		self.offsets = [];

		console.log(self.currentDataObject);
		

		for (var sub = 0; sub < self.currentDataObject[0].length; sub++) {
			
			var totalData = [];
			for (var i = 0; i < self.currentDataObject.length; i++) {
				
				totalData.push(self.currentDataObject[i][sub]);
			}
			console.log(totalData);
			self.totals[sub] = d3.sum(totalData);
		}


		self.totals.each(function(total){

		 	self.sizes.push( self.logScale(total) );
		});


		self.sizes.each(function(size){

			self.offsets.push( (self.diagramAreaHeight - size) * 0.50 );
		});
	},

	/**
	 * [convertRawData description]
	 * @return {[type]}
	 */
	convertRawData: function(){

		var self = this;
		self.parsedDataObject = {};
		self.orderedDates = [];

		Object.each(self.rawDataObject, function(data, rawDate){

			var jsDate = new Date(rawDate);
			self.orderedDates.push(jsDate);
			self.parsedDataObject[jsDate] = self.createConversionData(data);
		});

		self.orderedDates.sort(function(a,b){

			return a > b;
		});
	},

	/**
	 * [createConversionData description]
	 * @return {[type]}
	 */
	createConversionData: function(conversionDataSet) {

		// basically create a pivot table version of the original.
		conversionData = [];
		conversionData.length = conversionDataSet[0].length;

		for (var i = 0; i < conversionDataSet[0].length; i++) {

			conversionData[i] = [];
			conversionData[i].length = conversionDataSet.length;

			for (var range = 0; range < conversionDataSet.length; range++){

				conversionData[i][range] = conversionDataSet[range][i];
			}
		};

		return conversionData;
	},

	/**
	 * 
	 * [attachBlockAttrs description]
	 * @param  {[type]} d3Element
	 * @param  {[type]} classes
	 * @param  {[type]} xOffset
	 * @param  {[type]} width
	 * @param  {[type]} value
	 * @param  {[type]} verticalOffset
	 * @param  {[type]} scalingMethod
	 * @return {[type]}
	 */
	attachBlockAttrs:function(d3Element, classes, xOffset, width, value, verticalOffset, scalingMethod){

		var self = this;

		var scaledValue = scalingMethod(value);

		d3Element.attr('class', (scaledValue > 13) ? classes : classes + ' ValueHidden');
		d3Element.attr('height',scaledValue);
		d3Element.attr('y', verticalOffset);
		d3Element.attr('x', xOffset);
		d3Element.attr('width', width);

		if(d3Element.node().nodeName != 'g'){

			 if(scaledValue > 15){
			
				d3.select(d3Element.node().getParent()).append('text')
					.attr('class','Label ' + classes)
					.attr('x', xOffset + 60)
					.attr('y', verticalOffset + scaledValue.toInt() * 0.5 + 3)
					.attr('text-anchor','end')
					.text(value)
			}
			else{

				d3Element.append('title')
					.text(value); 	
			}
			
		}
		
		return d3Element;
	},

	/**
	 * [getLargestAmount description]
	 * @param  {[type]} dataObject
	 * @return {[type]}
	 */
	getLargestAmount: function (dataObject) {
		
		return d3.sum(dataObject.map(function(item){

			return item[0];
		}));
	},

	/**
	 * [renderDiagram description]
	 * @return {[type]}
	 */
	renderDiagram: function(){

		var self = this;

		var largestAmount = self.getLargestAmount(self.currentDataObject);

		self.logScale = function(x){
			
			if (x == 0)return x;
			else return self.diagramAreaHeight * ((Math.log(x)/Math.log(5)) / (Math.log( largestAmount )/Math.log(5)) );
		};


		self.setTotals(self.currentDataObject);
		self.setLinearScales();


		var attachedData = self.diagramContainer.selectAll('.DatumGroup').data(self.currentDataObject);
		self.enterComponents(attachedData);

		//self.updateComponents(attachedData);
		//self.removeComponents(attachedData);
	},

	/**
	 * [enterComponents description]
	 * @param  {[type]} attachedData
	 * @return {[type]}
	 */
	enterComponents: function(attachedData){

		var self = this;

		var enteredDataSelection = attachedData.enter();
		var dataGroups = enteredDataSelection.append('g').attr('class','DatumGroup');

		dataGroups.each(function(datum,index){
			
			var dataGroup = d3.select(this);
			var rectArray = [];
			datum.each(function(subDatum, subIndex){

				rectArray.push(self.attachBlockAttrs(
					dataGroup.append('rect'),
					'Count',
					(70 + 90) * (subIndex + 1),
					70,
					subDatum,
					self.offsets[subIndex],
					self.linearScales[subIndex]
				));

				self.offsets[subIndex] += self.linearScales[subIndex](subDatum);
			});

			rectArray.each(function(rect, index){

				if( (index < rectArray.length - 1) ){

					var conversionPath = dataGroup.append('path');
					conversionPath.attr('class','ConversionPath');
					conversionPath.attr('d', self.createConversionPath(rectArray[index], rectArray[index + 1]));
				}	
			});
		}); 
	},

	updateComponents: function (attachedData){

		attachedData.transition().each(function(datum,index){
			
			var dataGroup = d3.select(this);
			var rectArray = [];
			datum.each(function(subDatum, subIndex){

				rectArray.push(self.attachBlockAttrs(
					dataGroup.append('rect'),
					'Count',
					(70 + 90) * (subIndex + 1),
					70,
					subDatum,
					self.offsets[subIndex],
					self.linearScales[subIndex]
				));

				self.offsets[subIndex] += self.linearScales[subIndex](subDatum);
			});

			rectArray.each(function(rect, index){

				if( (index < rectArray.length - 1) ){

					var conversionPath = dataGroup.selectAll('.ConversionPath');
					conversionPath.attr('d', self.createConversionPath(rectArray[index], rectArray[index + 1]));
				}	
			});
		}); 	

	},

	/**
	 * [createConversionPath description]
	 * @param  {[type]} startBlock
	 * @param  {[type]} endBlock
	 * @return {[type]}
	 */
	createConversionPath: function(startBlock, endBlock){

		var curveInclineTop = 0.5;
		var curveInclineBottom = 0.5;

		var ax = startBlock.attr('width').toFloat() + startBlock.attr('x').toFloat();
		var ay = startBlock.attr('y').toFloat();
		var bx = endBlock.attr('x').toFloat();
		var by = endBlock.attr('y').toFloat();
		var cx = startBlock.attr('width').toFloat() + startBlock.attr('x').toFloat();
		var cy = startBlock.attr('y').toFloat() + startBlock.attr('height').toFloat();
		var dx = endBlock.attr('x').toFloat();
		var dy = endBlock.attr('y').toFloat() + endBlock.attr('height').toFloat();
		

		var topLine = [ [" M" + (ax + 1) + "," + ay], 
						[' C'], [+ (ax + 1) + "," + ay ],
								[((bx - ax) * 0.5 * 0.75 + ax ) + ','+ ay],
								[((bx - ax) * 0.5 + ax ) +','+ ((by - ay) * 0.5 + ay )],
						[' S'], [(bx - 1)+ ',' + by ], [(bx - 1)+ ',' + by ]];

	
		var bottomLine = [ [" L" + (dx - 1) + "," + dy],
							[' C'], [+ (dx - 1) + "," + dy ],
								[((dx - cx) * 0.5 * 1.25 + cx ) + ','+ dy],
								[((dx - cx) * 0.5 + cx ) +','+ ((dy - cy) * 0.5 + cy )],
							[' S'], [(cx + 1) + ',' + cy ], [(cx + 1) + ',' + cy ],
							[' Z'] ];

		return topLine.flatten().join(" ") + bottomLine.flatten().join(" ");

	},

	setLinearScales: function () {

		var self = this;

		for (var i = 0; i < self.totals.length; i++) {

			self.linearScales[i] = d3.scale.linear().domain([0, self.totals[i] ]).range([0, self.sizes[i] ]);
		};
	}
});
		
$(document).addEvent('domready', function(){

	var dataLocation = '';
	if (typeof BASE_URI == 'undefined') dataLocation = "http://localhost/~conversionDiagram/";
	else dataLocation = BASE_URI + 'uploads/conversionDiagram/';
	
	d3.json( dataLocation + "conversionData.json", function(error, json) {
	
		if (error) return console.warn(error);
		console.log(json);

		console.log( new ConversionDiagram(json, '#conversionDiagramWrapper') );	
	});
});