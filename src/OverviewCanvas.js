

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
      this.renderImage(this.drawingContext, this.width, this.height);
    }
  }

  renderImage (context, width, height){
    const imageData = this.createImage(context.createImageData(width, height), width, height);
    context.putImageData(imageData, 0, 0);
  }

  createImage (imageData, width, height){
    const germplasmsPerPixel = this.dataSet.germplasmList.length / height;
    const markersPerPixel = this.dataSet.markerCountOn(this.selectedChromosome) / width;
    for (let x = 0; x < width; x += 1){
      for (let y = 0; y < height; y += 1){
        const marker = Math.floor(x * markersPerPixel);
        const germplasm = Math.floor(y * germplasmsPerPixel);
        const color = this.colorScheme.getColor(germplasm, this.selectedChromosome, marker);

        const pixelIndex = (y * width + x) * 4;
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

  exportName (){
    return `overview-${this.dataSet.genomeMap.chromosomes[this.selectedChromosome].name}`;
  }

  toDataURL (type, encoderOptions){
    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = this.dataSet.markerCountOn(this.selectedChromosome);
    tmpCanvas.height = this.dataSet.germplasmList.length;
    
    const tmpContext = tmpCanvas.getContext('2d');
    tmpContext.fillStyle = 'white';
    tmpContext.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);

    this.renderImage(tmpContext, tmpCanvas.width, tmpCanvas.height);
    return tmpCanvas.toDataURL(type, encoderOptions);
  }
}