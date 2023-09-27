

export default class OverviewCanvas {
  constructor (width, height){
    this.width = width;
    this.height = height;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.display = "block";
    this.drawingContext = this.canvas.getContext('2d');

    this.backBuffer = document.createElement('canvas');
    this.backBuffer.width = width;
    this.backBuffer.height = height;
    this.backContext = this.backBuffer.getContext('2d');

    // Coordinates of the visibility window (pixels)
    this.windowRect = {x: 0, y: 0, width: 0, height: 0};

    this.dataSet = undefined;
    this.colorScheme = undefined;
    this.selectedChromosome = 0;

    this.enabled = true;
  }

  init (dataSet, settings, visibilityWindow){
    this.dataSet = dataSet;
    this.colorScheme = settings.colorScheme;
    this.moveToPosition(0, 0, visibilityWindow);
    this.prerender(true);
  }

  prerender (redraw){
    this.drawingContext.save();

    if (redraw){
      this.renderImage(this.backContext, this.width, this.height, false);
    }

    this.drawingContext.drawImage(this.backBuffer, 0, 0);
    this.renderWindow();

    if (!this.enabled){
      this.drawingContext.fillStyle = 'rgba(150, 150, 150, 0.4)';
      this.drawingContext.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.drawingContext.restore();
  }

  // Draw the genotype canvas' visibility window
  renderWindow (){
    this.drawingContext.save();

    this.drawingContext.fillStyle = 'rgba(0,0,0,0.2)';
    this.drawingContext.strokeStyle = 'rgba(255,0,0,0.8)';
    this.drawingContext.lineWidth = 1;
    this.drawingContext.fillRect(this.windowRect.x, this.windowRect.y, this.windowRect.width, this.windowRect.height);
    this.drawingContext.strokeRect(this.windowRect.x, this.windowRect.y, this.windowRect.width, this.windowRect.height);

    this.drawingContext.restore();
  }


  renderImage (context, width, height, highlightReference){
	try {
	    const imageData = this.createImage(context.createImageData(width, height), highlightReference);
	    context.putImageData(imageData, 0, 0);
	}
	catch(thrownError) {
		alert(thrownError.message.indexOf("Cannot read properties of undefined (reading 'genotypeData')") != -1 ? "Error loading genotypes (dataset may be too large for the available RAM)" : thrownError);
		throw thrownError;
	}
  }

  // Calculate the number of markers and germplasms per pixel in the overview
  renderingScale (width, height){
    return {
      markersPerPixel: this.dataSet.markerCountOn(this.selectedChromosome) / width,
      germplasmsPerPixel: this.dataSet.germplasmListFiltered.length / height,
    }
  }

  // Generate the overview image, squished within a given size
  // Modeled on the desktop version
  createImage (imageData, highlightReference){
    const scale = this.renderingScale(imageData.width, imageData.height);
    const germplasmsPerPixel = this.dataSet.germplasmListFiltered.length / imageData.height;
    const markersPerPixel = this.dataSet.markerCountOn(this.selectedChromosome) / imageData.width;

    for (let x = 0; x < imageData.width; x += 1){
      for (let y = 0; y < imageData.height; y += 1){
        const marker = Math.floor(x * scale.markersPerPixel);
        const germplasm = Math.floor(y * scale.germplasmsPerPixel);
        const color = this.colorScheme.getColor(germplasm, this.selectedChromosome, marker, highlightReference);

        const pixelIndex = (y * imageData.width + x) * 4;
        imageData.data[pixelIndex] = color[0];
        imageData.data[pixelIndex + 1] = color[1];
        imageData.data[pixelIndex + 2] = color[2];
        imageData.data[pixelIndex + 3] = (color.length > 3) ? color[3] : 255;
      }
    }
    return imageData;
  }

  // Get the visibility window pixel coordinates from its data coordinates
  windowFromPosition (marker, germplasm, visibilityWindow){
    const scale = this.renderingScale(this.width, this.height);

    const cornerX = marker / scale.markersPerPixel;
    const cornerY = germplasm / scale.germplasmsPerPixel;
    const windowWidth = visibilityWindow.markers / scale.markersPerPixel;
    const windowHeight = visibilityWindow.germplasms / scale.germplasmsPerPixel;

    return {x: cornerX, y: cornerY, width: windowWidth, height: windowHeight};
  }

  // Set the center of the visibility window to (mouseX, mouseY)
  mouseDrag (mouseX, mouseY, visibilityWindow){
    if (!this.enabled) return;

    const scale = this.renderingScale(this.width, this.height);
    const centerMarker = mouseX * scale.markersPerPixel;
    const centerGermplasm = mouseY * scale.germplasmsPerPixel;

    // Clamp within the canvas (no position < 0 or > number of markers or germplasms)
    let cornerMarker = Math.min(Math.max(0, Math.floor(centerMarker - visibilityWindow.markers / 2)), this.dataSet.markerCountOn(this.selectedChromosome) - visibilityWindow.markers);
    let cornerGermplasm = Math.min(Math.max(Math.floor(centerGermplasm - visibilityWindow.germplasms / 2), 0), this.dataSet.germplasmListFiltered.length - visibilityWindow.germplasms);

    this.windowRect = this.windowFromPosition(cornerMarker, cornerGermplasm, visibilityWindow);
    this.prerender(false);

    return {marker: cornerMarker, germplasm: cornerGermplasm};
  }

  // Set the visibility window, given its data coordinates
  moveToPosition (marker, germplasm, visibilityWindow){
    if (!this.enabled) return;

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

  setAutoWidth (newWidth) {
    this.width = newWidth;
    this.canvas.width = newWidth;
    this.backBuffer.width = newWidth;
    this.prerender(true);
  }

  exportName (){
    return `overview-${this.dataSet.genomeMap.chromosomes[this.selectedChromosome].name}`;
  }

  disable (){
    this.enabled = false;
    this.prerender(false);
  }

  enable (){
    this.enabled = true;
    this.prerender(false);
  }

  // Export the overview to an image
  // FIXME : There's a limit on the size and area of canvas.
  //         Beyond these limits, the browser either throws an error or simply makes the canvas unresponsive
  //         These limits and this behaviour are not standard
  //         Possible solution : Using a third-party library to handle the image manipulation
  //         Current implementation : Catch the error and warn the user if we are able to detect this case
  toDataURL (type, encoderOptions){
    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = this.dataSet.markerCountOn(this.selectedChromosome);
    tmpCanvas.height = this.dataSet.germplasmListFiltered.length;
    
    const tmpContext = tmpCanvas.getContext('2d');
    tmpContext.fillStyle = 'white';
    tmpContext.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);

    // Ugly, but only way we have to check whether the export can succeed on browser that fail silently
    // Check if the data part of the data URL (after "data:") is empty
    const checkDataURL = tmpCanvas.toDataURL(type, encoderOptions);
    if (checkDataURL.slice(5).length == 0 || checkDataURL.split(/,$/g).pop().length == 0){
      window.alert("Overview export failed : the image is probably too large");
      return undefined;
    }

    try {
      this.renderImage(tmpContext, tmpCanvas.width, tmpCanvas.height, true);
      return tmpCanvas.toDataURL(type, encoderOptions);
    } catch (error) {
      window.alert("Overview export failed : the image is probably too large");
      console.error(error);
      return undefined;
    }
  }
}