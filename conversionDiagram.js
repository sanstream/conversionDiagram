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

	svgElement: null,
	svgMargin: 14,
	monthsListWidth: 100,

	diagramWidth: 700,
	diagramContainer: null,
	diagramAreaHeight: null,
	firstItemShown: 0,

	/**
	 * Constructor
	 * @param  {object} dataObject 				parsed raw json.
	 * @param  {string} containerIdentifier		css selector for a specific element.
	 * @return {void}
	 */
	initialize: function(dataObject, containerIdentifier,firstItemShown){

		var self = this;
		// testing data:
		
		if(self.suppliedDataIsOk()){

			// set up the visual prerequisites:
			self.svgElement = d3.select(containerIdentifier).append('svg');

			self.svgElement.attr('width', self.monthsListWidth + self.diagramWidth + self.svgMargin*2);
			self.diagramAreaHeight = self.diagramWidth * 0.70;
			self.svgElement.attr('height', self.diagramAreaHeight + self.svgMargin*2);

			self.monthListContainer = self.svgElement.append('g').attr('class','monthListContainer');
			self.diagramContainer = self.svgElement.append('g').attr('class','diagramContainer');
			self.scopeLine = self.svgElement.append('path')
				.classed('ScopeLine',true)
				.attr('d',self.setScopeLineDims.bind(this));

			self.addColumnLabels();

			self.linearScales = new Array();
			

			self.rawDataObject = dataObject;
			// Do the neccesary calculations and data-treatment:
			self.convertRawData();
			self.setTimeFrameShown(0);
			self.renderMonthsList();
			//visual rendering: 
			self.renderDiagram();
		}
	},

	/**
	 * Check to figure out if the data is workable, still a stub.
	 * @return {boolean}
	 */
	suppliedDataIsOk: function () {
	
		return true;		
	},

	/**
	 * Draws the line values for the 'd' attribute of  a svg path.
	 * @param {object} datum 	The d3 datum object of the path.
	 */
	setScopeLineDims: function(datum) {

		var xOffset = 200;
		// Preseting the coordinates of the scope-line:
		var points = {
			'a':{
				'x': xOffset + 30,
				'y': 2
			},
			'b':{
				'x': xOffset + 20,
				'y': 2
			},
			'c':{
				'x': xOffset,
				'y': 2 + 20
			},
			'd':{
				'x': xOffset,
				'y': this.diagramAreaHeight - 15
			},
			'e':{
				'x': xOffset + 20,
				'y': this.diagramAreaHeight
			},
			'f':{
				'x': xOffset + 30,
				'y': this.diagramAreaHeight
			}
		}

		// applying them:
		var line = [ 
			[" M" + points.a.x + "," + points.a.y ], 
			[' L' + points.b.x + "," + points.b.y ], 
			[' C' + points.c.x +',' + points.b.y ],
			 	  
				  [ points.c.x + "," + points.c.y ], 
				  [ points.c.x + "," + points.c.y ], 
				  

			[' L' + points.d.x + "," + points.d.y ], 
			[' C' + points.d.x +',' + points.d.y ],
			 	  
				  [ points.d.x + "," + points.e.y ], 
				  [ points.e.x + "," + points.e.y ], 
				  
 
			[' L' + points.f.x + "," + points.f.y ],
		];


		return line.flatten().join(" ");
	},

	/**
	 * Adds the Column labels, yup it totally does.
	 */
	addColumnLabels:function () {
		
		var self = this;
		var columnLabelGroup = self.svgElement.append('g').classed('ColumnLabelGroup',true);

		['Shown...', 'seen...', 'and bought.'].each(function(labelName, index){

			columnLabelGroup.append('text')
				.classed('ColumnLabel',true)
				.attr('x', 260 + index * 160)
				.attr('y',10)
				.attr('width', 100)
				.text(labelName);
		});
	},

	/**
	 * sets the total of the ammounts, sizes, and y-offsets of all the data-types. Aw yiss..
	 */
	setTotals: function () {

		var self = this;

		self.totals = [];
		self.sizes = [];
		self.offsets = [];

		for (var sub = 0; sub < self.currentDataObject[0].length; sub++) {
			
			var totalData = [];
			for (var i = 0; i < self.currentDataObject.length; i++) {
				
				totalData.push(self.currentDataObject[i][sub]);
			}
			self.totals[sub] = d3.sum(totalData);
		}


		self.totals.each(function(total){

		 	self.sizes.push( self.logScale(total) );
		});


		self.sizes.each(function(size){

			self.offsets.push( (self.diagramAreaHeight - self.svgMargin - size) * 0.50 );
		});
	},

	/**
	 * Converts the raw data to a format the we can work with.
	 * @return {void}
	 */
	convertRawData: function(){

		var self = this;
		self.parsedDataObject = {};
		self.orderedDates = [];

		Object.each(self.rawDataObject, function(data, rawDate){

			var jsDate = new Date(rawDate);
			self.orderedDates.push({
				'date':jsDate,
				'selected': false
			});
			self.parsedDataObject[jsDate] = self.createConversionData(data);
		});

		self.orderedDates.sort(function(a,b){

			return a.date > b.date;
		});
	},

	/**
	 * Basically create a pivot table version of the original.
	 * @return {array}
	 */
	createConversionData: function(conversionDataSet) {

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
	 * attaches the attribute values.
	 * @param  {object} d3Element
	 * @param  {string} classes
	 * @param  {integer} xOffset
	 * @param  {integer} width
	 * @param  {integer} value
	 * @param  {integer} verticalOffset
	 * @param  {function} scalingMethod
	 * @return {void}
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
	 * attaches the attribute values.
	 * @param  {object} d3Element
	 * @param  {string} classes
	 * @param  {integer} xOffset
	 * @param  {integer} width
	 * @param  {integer} value
	 * @param  {integer} verticalOffset
	 * @param  {function} scalingMethod
	 * @return {void}
	 */
	updateBlockAttrs:function(d3Element, classes, xOffset, width, value, verticalOffset, scalingMethod){

		var self = this;

		var scaledValue = scalingMethod(value);

		d3Element.attr('class', function() {
			if (scaledValue > 13) 
				return  classes + ' ValueHidden'
		});
		d3Element.attr('height',scaledValue);
		d3Element.attr('y', verticalOffset);
		d3Element.attr('x', xOffset);
		d3Element.attr('width', width);

		if(d3Element.node().nodeName != 'g'){

			 if(scaledValue > 15){
			
				d3.select(d3Element.node().getParent()).select('text')
					.attr('x', xOffset + 60)
					.attr('y', verticalOffset + scaledValue.toInt() * 0.5 + 3)
					.attr('text-anchor','end')
					.text(value);
			}
			else{
				d3Element.select('title')
					.text(value); 	
			}
			
		}
		
		return d3Element;
	},
	/**
	 * Returns the sum of the subset with the highest sum.
	 * @param  {array} dataObject
	 * @return {integer}
	 */
	getLargestAmount: function (dataObject) {
		
		return d3.sum(dataObject.map(function(item){

			return item[0];
		}));
	},

	/**
	 * Hub method for all the rendering of the diagram.
	 * @return {void}
	 */
	renderDiagram: function(){

		var self = this;

		var largestAmount = self.getLargestAmount(self.currentDataObject);

		self.logScale = function(x){
			
			if (x == 0)return x;
			else return (self.diagramAreaHeight -(self.svgMargin * 2)) * ((Math.log(x)/Math.log(5)) / (Math.log( largestAmount )/Math.log(5)) );
		};


		self.setTotals(self.currentDataObject);
		self.setLinearScales();


		var attachedData = self.diagramContainer.selectAll('.DatumGroup').data(self.currentDataObject);

		self.enterComponents(attachedData);

		//self.updateComponents(attachedData);
		//self.removeComponents(attachedData);
	},

	/**
	 * Method for entering the new elements based on the data.
	 * @param  {array} attachedData
	 * @return {void}
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
					160 * (subIndex + 1) + self.monthsListWidth,
					70,
					subDatum,
					self.offsets[subIndex] + self.svgMargin,
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

	/**
	 * Method for updating existing elements based on the data.
	 * @param  {array} attachedData
	 * @return {void}
	 */
	updateComponents: function (attachedData){

		console.log(attachedData, attachedData.transition());

		var self = this;
		attachedData.transition().each(function(datum,index){
			console.log(datum);

			if(datum){

				var dataGroup = d3.select(this);
				var rectArray = [];
				datum.each(function(subDatum, subIndex){

					rectArray.push(self.updateBlockAttrs(
						dataGroup.select('rect.Count:nth-of-type('+ (subIndex + 1) +')'),
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
			}
		}); 	

	},

	/**
	 * Builds the bezier path for the conversionspath.
	 * @param  {d3 element} startBlock
	 * @param  {d3 element} endBlock
	 * @return {string}
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

	/**
	 * Sets the linear scales of each dataset.
	 */
	setLinearScales: function () {

		var self = this;

		for (var i = 0; i < self.totals.length; i++) {

			self.linearScales[i] = d3.scale.linear().domain([0, self.totals[i] ]).range([0, self.sizes[i] ]);
		};
	},

	/**
	 * Sets the date in orderedDates to selected and set the appriopiate currentDataObject.
	 * @param {integer} index Index of the date selected.
	 */
	setTimeFrameShown: function (index) {

		var self = this;
		// resetting the selected states of each date:
		self.orderedDates.each(function(object){
			object.selected = false;
		});
		// setting the current selected date to true
		self.orderedDates[index].selected = true;

		var date = self.orderedDates[index].date;
		self.currentDataObject = self.parsedDataObject[date];
	},

	/**
	 * Builds the monthlist.
	 * @return {void}
	 */
	renderMonthsList: function() {

		var self = this;

		var formatDate = d3.time.format('%B %Y');

		var attachedDates = self.monthListContainer.selectAll('.DateGroup').data(self.orderedDates);

		var dateGroups = attachedDates.enter().append('g').classed('DateGroup', true);

		boxWidth = 120;
		boxXOffset = 21;

		dateGroups.append('rect')
			.classed('DateBox',true)
			.attr('width',boxWidth)
			.attr('height',30)
			.classed('Selected', function(datum){
				return datum.selected;
			})
			.attr('x', 21)
			.attr('y', function(datum, index){

				return 50 * index + 30;
			});

		dateGroups.append('path')
			.classed('DateAnchorLine',true)
			.classed('Selected', function(datum){
				return datum.selected;
			})

			.attr('d', function(datum, index){
				return 	'M '+ (boxWidth + boxXOffset) + ',' + (50 * index + 30 + 15 ) +
						' L' + (boxWidth + boxXOffset + ((datum.selected)? 59 : 15) ) +',' + (50 * index + 30 + 15);
			})
			.attr('stroke','#000');

		dateGroups.append('circle')
			.classed('DateAnchorDot',true)
			.attr('cx', function(datum){
				return boxWidth + boxXOffset + ((datum.selected)? 59 : 15);
			})
			.attr('cy', function(datum, index){
				return 50 * index + 30 + 15;
			})
			.attr('r',function(datum){
				return (datum.selected)? 5 : 2; 
			});	

		dateGroups.append('text')
			.attr('x', 21 + 10)
			.attr('y', function(datum, index){

				return 50 * index + 30 + 20;
			})			
			.text(function(datum){
			return formatDate(datum.date);
		});
	}
});

// Adding the visualisation to the dom, when the dom is ready.
$(document).addEvent('domready', function(){

	var dataLocation = '';
	if (typeof BASE_URI == 'undefined') dataLocation = "http://localhost/~conversionDiagram/";
	else dataLocation = BASE_URI + 'uploads/conversionDiagram/';

	// Load the data from the json file:
	d3.json( dataLocation + "conversionData.json", function(json, error) {
	
		if (error) return console.warn(error);
		
		conversion = new ConversionDiagram(json, '#conversionDiagramWrapper');	
	});
});