

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

    this.windowRect = {x: 0, y: 0, width: 0, height: 0};

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
      this.renderImage(this.backContext, this.width, this.height);
    }

    this.drawingContext.drawImage(this.backBuffer, 0, 0);
    this.renderWindow();
  }

  renderWindow (){
    this.drawingContext.save();
    this.drawingContext.fillStyle = 'rgba(0,0,0,0.2)';
    this.drawingContext.strokeStyle = 'rgba(255,0,0,0.8)';
    this.drawingContext.lineWidth = 1;
    this.drawingContext.fillRect(this.windowRect.x, this.windowRect.y, this.windowRect.width, this.windowRect.height);
    this.drawingContext.strokeRect(this.windowRect.x, this.windowRect.y, this.windowRect.width, this.windowRect.height);
    this.drawingContext.restore();
  }


  renderImage (context, width, height){
    const imageData = this.createImage(context.createImageData(width, height), width, height);
    context.putImageData(imageData, 0, 0);
  }

  // Calculate the number of markers and germplasms per pixel in the overview
  renderingScale (width, height){
    return {
      markersPerPixel: this.dataSet.markerCountOn(this.selectedChromosome) / width,
      germplasmsPerPixel: this.dataSet.germplasmList.length / height,
    }
  }

  createImage (imageData, width, height){
    const scale = this.renderingScale(width, height);
    const germplasmsPerPixel = this.dataSet.germplasmList.length / height;
    const markersPerPixel = this.dataSet.markerCountOn(this.selectedChromosome) / width;
    for (let x = 0; x < width; x += 1){
      for (let y = 0; y < height; y += 1){
        const marker = Math.floor(x * scale.markersPerPixel);
        const germplasm = Math.floor(y * scale.germplasmsPerPixel);
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

  windowFromPosition (marker, germplasm, visibilityWindow){
    const scale = this.renderingScale(this.width, this.height);

    const cornerX = marker / scale.markersPerPixel;
    const cornerY = germplasm / scale.germplasmsPerPixel;
    const windowWidth = visibilityWindow.markers / scale.markersPerPixel;
    const windowHeight = visibilityWindow.germplasms / scale.germplasmsPerPixel;

    return {x: cornerX, y: cornerY, width: windowWidth, height: windowHeight};
  }

  mouseDrag (mouseX, mouseY, visibilityWindow){
    const scale = this.renderingScale(this.width, this.height);
    const centerMarker = mouseX * scale.markersPerPixel;
    const centerGermplasm = mouseY * scale.germplasmsPerPixel;

    // Clamp within the canvas (no position < 0 or > number of markers or germplasms)
    let cornerMarker = Math.min(Math.max(0, Math.floor(centerMarker - visibilityWindow.markers / 2)), this.dataSet.markerCountOn(this.selectedChromosome) - visibilityWindow.markers);
    let cornerGermplasm = Math.min(Math.max(Math.floor(centerGermplasm - visibilityWindow.germplasms / 2), 0), this.dataSet.germplasmList.length - visibilityWindow.germplasms);

    this.windowRect = this.windowFromPosition(cornerMarker, cornerGermplasm, visibilityWindow);
    this.prerender(false);

    return {marker: cornerMarker, germplasm: cornerGermplasm};
  }

  moveToPosition (marker, germplasm, visibilityWindow){
    this.windowRect = this.windowFromPosition(marker, germplasm, visibilityWindow);
    this.prerender(false);

    return {marker, germplasm};
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