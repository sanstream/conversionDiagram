

var ConversionDiagram = new Class({

	dataObject: null,
	conversionData: null,

	shownItemsScale: null,
	seenItemsScale: null,
	boughtItemsScale: null,
	linearScales: null,
	logScale: null,
	totals: null, // holds an array with all the totals

	diagramContainer: null,
	diagramAreaHeight: null,

	initialize: function(dataObject, containerIdentifier){

		var self = this;
		// testing data:
		self.dataObject = dataObject;

		if(self.suppliedDataIsOk()){

			// set up the visual prerequisites:
			self.diagramContainer = d3.select(containerIdentifier).append('svg');
			var diagramWidth = 700;
			self.diagramContainer.attr('width', diagramWidth);
			self.diagramAreaHeight = diagramWidth * 0.70;
			self.diagramContainer.attr('height', self.diagramAreaHeight);

			// set up the scaling methods:
			self.logScale = function(x){
				
				if (x == 0)return x;
				else return self.diagramAreaHeight * ((Math.log(x)/Math.log(10)) / (Math.log( d3.sum(self.dataObject[0]) )/Math.log(10)) );
			};

			// Do the neccesary calculations:
			self.setTotals();
			self.createConversionData();
			self.linearScales = [];

			for (var i = 0; i < self.dataObject.length; i++) {

				self.linearScales.push( d3.scale.linear().domain([0, self.totals[i] ]).range([0, self.sizes[i] ]) );
			};
			 
			
			self.renderDiagram();
		}
	},

	suppliedDataIsOk: function () {
	
		return true;		
	},


	setTotals: function () {

		var self = this;

		self.totals = [];
		self.sizes = [];
		self.offsets = [];

		self.dataObject.each(function(set){

			self.totals.push( d3.sum(set) );
		});

		self.totals.each(function(total){

		 	self.sizes.push( self.logScale(total) );
		});

		self.sizes.each(function(size){

			self.offsets.push( (self.diagramAreaHeight - size) * 0.50 );
		});
	},


	createConversionData: function() {

		// basically create a pivot table version of the original.
		var self = this;

		self.conversionData = [];
		self.conversionData.length = self.dataObject[0].length;

		for (var i = 0; i < self.dataObject[0].length; i++) {

			self.conversionData[i] = [];
			self.conversionData[i].length = self.dataObject.length;

			for (var range = 0; range < self.dataObject.length; range++){

				self.conversionData[i][range] = self.dataObject[range][i];
			}
		};
	},

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

	renderDiagram: function(){

		var self = this;

		var attachedData = self.diagramContainer.selectAll('.DatumGroup').data(self.conversionData);
		self.enterData(attachedData);
	},


	enterData: function(attachedData){

		var self = this;

		var enteredDataSelection = attachedData.enter();
		var dataGroups = enteredDataSelection.append('g').attr('class','DatumGroup');

		console.log(dataGroups);
		dataGroups.each(function(datum,index){
			
			var dataGroup = d3.select(this);

			datum.each(function(subDatum, subIndex){

				self.attachBlockAttrs(
					dataGroup.append('rect'),
					'Count',
					(70 + 90) * (subIndex + 1),
					70,
					subDatum,
					self.offsets[subIndex],
					self.linearScales[subIndex]
				);

				self.offsets[subIndex] += self.linearScales[subIndex](subDatum);
			});
			
		}); 
	},


	dfgdgdg: function() {


		var impression = 	self.attachBlockAttrs(dataGroup.append('rect'),
																	'Count',
																	102,
																	80,
																	datum.impression,
																	self.recordedEventsTotals.impressions.offset,
																	self.impressionsScale);


						var ImpToViews = dataGroup.append('path');
						ImpToViews.attr('class','ConversionPath');
						ImpToViews.attr('d', self.createConversionPath(impression,view));

						if(impression.attr('height').toInt() >13){

							dataGroup.append('text')
							.attr('class','Label ImpToViews')
							.attr('x', 200)
							.attr('y', self.recordedEventsTotals.impressions.offset + impression.attr('height').toInt() * 0.5 + 3)
							.text(self.formatAsOnePointDecimal(datum.ImpToViews) + '%');	
						}
						else{
							ImpToViews.append('title')
							.text(self.formatAsOnePointDecimal(datum.ImpToViews) + '%');
						}
						
						var ViewsToInterest = dataGroup.append('path');
						ViewsToInterest.attr('class','ConversionPath');
						ViewsToInterest.attr('d', self.createConversionPath(view,interest));
						
						if(view.attr('height').toInt() >13){
						dataGroup.append('text')
							.attr('class','Label ViewsToInterest')
							.attr('x', 400)
							.attr('y', self.recordedEventsTotals.views.offset + view.attr('height').toInt() * 0.5 + 3)
							.text(self.formatAsOnePointDecimal(datum.ViewsToInterest) + '%'); 
						}
						else{
							ViewsToInterest.append('title')
							.text(self.formatAsOnePointDecimal(datum.ViewsToInterest) + '%');
						}

						dataGroup.append('text')
							.attr('class','Label Month')
							.attr('x', 2)
							.attr('y', self.recordedEventsTotals.impressions.offset + view.attr('height').toInt() * 0.5 + 3)
							.text(function(datum){

								var arrayOfResults = self.months.filter(function(item){

									return datum.reportId == item.reportId.toInt();
								});
								if(arrayOfResults.length){
									return arrayOfResults[0].month;
								}
								else return "";
							}); 


						self.recordedEventsTotals.impressions.offset += self.impressionsScale(datum.impression);

	},

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

	}
});
		


var ConversionData = [
	[202, 300, 300, 234, 456, 356, 1003, 45],
	[30, 29, 28, 56, 43, 12, 123, 3],
	[34, 67, 44, 33, 9, 4, 3, 0]
];


$(document).addEvent('domready', function(){

	exampleConversionDiagram = new ConversionDiagram(ConversionData, '#conversionDiagramWrapper');
});