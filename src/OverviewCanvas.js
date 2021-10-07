

export default class OverviewCanvas {
  constructor (width, height){
    this.width = width;
    this.height = height;

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
    this.selectedChromosome = 0;
  }

  init (dataSet, colorScheme){
    this.dataSet = dataSet;
    this.colorScheme = colorScheme;
    this.prerender(true);
  }

  prerender (redraw){
    if (redraw){
      this.renderImage();
    }
  }

  renderImage (){
    const imageData = this.createImage();
    this.drawingContext.putImageData(imageData, 0, 0);
  }

  createImage (){
    let imageData = this.drawingContext.createImageData(this.width, this.height);
    const germplasmsPerPixel = this.dataSet.germplasmList.length / this.height;
    const markersPerPixel = this.dataSet.markerCountOn(this.selectedChromosome) / this.width;
    for (let x = 0; x < this.width; x += 1){
      for (let y = 0; y < this.height; y += 1){
        const marker = Math.floor(x * markersPerPixel);
        const germplasm = Math.floor(y * germplasmsPerPixel);
        const color = this.colorScheme.getColor(germplasm, this.selectedChromosome, marker);

        const pixelIndex = (y * this.width + x) * 4;
        imageData.data[pixelIndex] = color[0];
        imageData.data[pixelIndex + 1] = color[1];
        imageData.data[pixelIndex + 2] = color[2];
        imageData.data[pixelIndex + 3] = (color.length > 3) ? color[3] : 255;
      }
    }
    return imageData;
  }

  setChromosome (chromosomeIndex){
    this.selectedChromosome = chromosomeIndex;
    this.prerender(true);
  }

  setColorScheme (colorScheme){
    this.colorScheme = colorScheme;
    this.prerender(true);
  }
}