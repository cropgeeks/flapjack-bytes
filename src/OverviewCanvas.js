

export default class OverviewCanvas {
  constructor (width, height){
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.drawingContext = this.canvas.getContext('2d');

    this.backBuffer = document.createElement('canvas');
    this.backBuffer.width = width;
    this.backBuffer.height = height;
    this.backContext = this.backBuffer.getContext('2d');

    this.dataSet = undefined;
    this.colorScheme = undefined;
  }

  init (dataSet, colorScheme){
    this.dataSet = dataSet;
    this.colorScheme = undefined;
  }

  prerender (redraw){

  }

  setChromosome (chromosomeIndex){
    
  }
}