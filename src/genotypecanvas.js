import ScrollBar from './ScrollBar';

export default class GenotypeCanvas {
  constructor(width, height, boxSize, lineSort) {
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
    this.mapCanvasHeight = 60;
    this.nameCanvasWidth = 100;

    this.scrollbarWidth = 10;
    this.scrollbarHeight = 10;

    this.backContext.lineWidth = 1;

    this.boxSize = boxSize;
    this.fontSize = 100;
    this.font = undefined;

    this.verticalScrollbar = new ScrollBar(width, this.alleleCanvasHeight() + this.scrollbarHeight,
      this.scrollbarWidth, this.alleleCanvasHeight(), true);
    this.horizontalScrollbar = new ScrollBar(this.alleleCanvasWidth(),
      height, this.alleleCanvasWidth(), this.scrollbarHeight, false);

    this.translatedX = 0;
    this.translatedY = 0;
    this.colorScheme = undefined;

    this.markerUnderMouse = undefined;
    this.markerIndexUnderMouse = undefined;
    this.chromosomeUnderMouse = -1;
    this.lineUnderMouse = undefined;
    this.markerNameFont = '10px sans-serif';

    this.dataSet = undefined;
    this.lineSort = lineSort;

    this.selectedChromosome = 0;

    this.colorComparisonLineIndex = 0;
    this.sortComparisonLineIndex = 0;

    this.scorePadding = 2;
  }

  /*totalChromosomeGap() {
    return (this.dataSet.genomeMap.chromosomes.length - 1) * this.chromosomeGapSize;
  }*/

  maxCanvasWidth() {
    return Math.max((this.dataSet.markerCountOn(this.selectedChromosome) * this.boxSize), this.alleleCanvasWidth());
  }

  maxCanvasHeight() {
    return Math.max(this.dataSet.lineCount() * this.boxSize, this.alleleCanvasHeight());
  }

  alleleCanvasWidth() {
    return this.canvas.width - this.alleleCanvasXOffset - this.scrollbarWidth;
  }

  alleleCanvasHeight() {
    return this.canvas.height - this.mapCanvasHeight - this.scrollbarHeight;
  }

  maxDataHeight() {
    return this.dataSet.lineCount() * this.boxSize;
  }

  maxDataWidth() {
    return this.dataSet.markerCountOn(this.selectedChromosome) * this.boxSize  // + ((this.dataSet.chromosomeCount() - 1) * this.chromosomeGapSize);
  }

  init(dataSet, colorScheme) {
    this.dataSet = dataSet;
    this.lineSort.sort(this.dataSet);
    this.colorScheme = colorScheme;
    this.font = this.updateFontSize();
    // this.updateVisualPositions();
    this.colorScheme.setupColorStamps(this.boxSize, this.font, this.fontSize);
    this.zoom(this.boxSize);
    this.moveToPosition(0, 0);
  }

  prerender(redraw) {
    this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (redraw) {
      const dataWidth = Math.ceil((this.alleleCanvasWidth()) / this.boxSize);
      const markerStart = Math.floor(this.translatedX / this.boxSize);
      const markerEnd = Math.min(markerStart + dataWidth, this.dataSet.markerCountOn(this.selectedChromosome));

      const germplasmStart = Math.floor(this.translatedY / this.boxSize);
      const germplasmEnd = Math.min(germplasmStart
        + Math.floor(this.canvas.height / this.boxSize), this.dataSet.lineCount());

      const yWiggle = this.translatedY - (germplasmStart * this.boxSize);

      this.render(germplasmStart, germplasmEnd, markerStart, markerEnd, yWiggle);
    }

    this.drawingContext.drawImage(this.backBuffer, 0, 0);

    this.renderCrosshair();
    this.highlightMarker();
    this.highlightLineName();
  }

  calcMapMarkerPos(marker, firstMarkerPos, mapScaleFactor, drawStart) {
    let mapMarkerPos = ((marker.position - firstMarkerPos) * (mapScaleFactor));
    mapMarkerPos = drawStart > 0 ? mapMarkerPos + drawStart : mapMarkerPos;

    return mapMarkerPos;
  }

  highlightMarker() {
    if (this.markerUnderMouse) {
      const dataWidth = Math.ceil(this.alleleCanvasWidth() / this.boxSize);

      const markerStart = Math.floor(this.translatedX / this.boxSize);
      const markerEnd = Math.min(markerStart + dataWidth, this.dataSet.markerCountOn(this.selectedChromosome));

      const renderData = this.dataSet.markersToRenderOn(this.selectedChromosome, markerStart, markerEnd);

      const chromosome = this.dataSet.genomeMap.chromosomes[this.selectedChromosome];
      const chrStart = 0;  // this.chromosomeStarts[this.chromosomeUnderMouse];
      const chrEnd = chromosome.markerCount() * this.boxSize;
      const drawStart = -this.translatedX;

      const potentialWidth = drawStart > 0 ? this.alleleCanvasWidth() - drawStart : this.alleleCanvasWidth();
      const chromosomeWidth = Math.min(chrEnd - this.translatedX, potentialWidth, chrEnd - chrStart);

      // The data array can have too many markers in it due to the gaps between
      // chromosomes, this is a fudge to ensure we don't try to draw too many markers
      const chromosomeMarkerWidth = Math.max(0, Math.floor(chromosomeWidth / this.boxSize));
      const dW = Math.min(renderData.lastMarker - renderData.firstMarker, chromosomeMarkerWidth);

      const firstMarkerPos = chromosome.markers[renderData.firstMarker].position;
      const lastMarkerPos = chromosome.markers[renderData.firstMarker + dW].position;
      const dist = (lastMarkerPos - firstMarkerPos);
      const scaleFactor = chromosomeWidth / dist;

      this.highlightMarkerName(firstMarkerPos, scaleFactor, drawStart);

      this.drawingContext.save();

      // Translate to the correct position to draw the map
      this.drawingContext.translate(this.alleleCanvasXOffset, 10);

      let xPos = drawStart + (this.markerIndexUnderMouse * this.boxSize);
      xPos += (this.boxSize / 2);
      this.drawingContext.strokeStyle = '#F00';
      this.renderMarker(this.drawingContext, this.markerUnderMouse, xPos, firstMarkerPos, scaleFactor, drawStart);

      this.drawingContext.restore();
    }
  }

  highlightMarkerName(firstMarkerPos, scaleFactor, drawStart) {
    if (this.markerUnderMouse) {
      this.drawingContext.save();
      this.drawingContext.translate(this.alleleCanvasXOffset, 10);

      this.drawingContext.fillStyle = '#F00';
      this.drawingContext.font = this.markerNameFont;

      let xPos = this.calcMapMarkerPos(this.markerUnderMouse, firstMarkerPos, scaleFactor, drawStart);

      const text = `${this.markerUnderMouse.name} (${this.markerUnderMouse.position})`;

      // Measure the text width so we can guarantee it doesn't get drawn off
      // the right hand side of the display
      const textWidth = this.drawingContext.measureText(text).width;
      const halfTextWidth = textWidth / 2;
      xPos -= halfTextWidth;
      if (xPos < 0) {
        xPos = 0;
      } else if (xPos + textWidth > this.alleleCanvasWidth()) {
        xPos = this.alleleCanvasWidth() - textWidth;
      }

      this.drawingContext.fillText(text, xPos, 0);
      this.drawingContext.restore();
    }
  }

  highlightLineName() {
    if (this.lineUnderMouse) {
      this.drawingContext.save();
      this.drawingContext.translate(0, this.mapCanvasHeight);
      // Prevent line name under scrollbar being highlighted
      const region = new Path2D();
      const clipHeight = this.canScrollX() ? this.alleleCanvasHeight() : this.canvas.height;
      region.rect(0, 0, this.alleleCanvasXOffset,
        clipHeight);
      this.drawingContext.clip(region);

      this.drawingContext.fillStyle = '#F00';
      this.drawingContext.font = this.font;

      const germplasmStart = Math.floor(this.translatedY / this.boxSize);
      const yWiggle = this.translatedY - (germplasmStart * this.boxSize);
      const yPos = (this.lineUnderMouse * this.boxSize) - yWiggle;

      const { name } = this.dataSet.germplasmList[this.lineIndexUnderMouse];

      const y = yPos + (this.boxSize - (this.fontSize / 2));
      this.drawingContext.fillText(name, 0, y);
      this.drawingContext.restore();
    }
  }

  renderCrosshair() {
    // Setup crosshair drawing parameters
    this.drawingContext.save();
    this.drawingContext.translate(this.alleleCanvasXOffset, this.mapCanvasHeight);
    this.drawingContext.globalAlpha = 0.4;
    this.drawingContext.fillStyle = '#fff';

    // Clip the canvas to prevent over-drawing of the crosshair
    const region = new Path2D();
    region.rect(0, 0, this.alleleCanvasWidth(), this.alleleCanvasHeight());
    this.drawingContext.clip(region);

    // Render each element of the crosshair
    this.renderVerticalCrosshairLine();
    this.renderHorizontalCrosshairLine();

    // Reset the drawing parameters for the rest of the render code
    this.drawingContext.translate(-this.alleleCanvasXOffset, -this.mapCanvasHeight);
    this.drawingContext.globalAlpha = 1;
    this.drawingContext.restore();
  }

  renderVerticalCrosshairLine() {
    // const chrStart = this.chromosomeStarts[this.chromosomeUnderMouse];
    const drawStart = -this.translatedX;
    const xPos = drawStart + (this.markerIndexUnderMouse * this.boxSize);

    this.drawingContext.fillRect(xPos, 0, this.boxSize, this.alleleCanvasHeight());
  }

  renderHorizontalCrosshairLine() {
    const germplasmStart = Math.floor(this.translatedY / this.boxSize);
    const yWiggle = this.translatedY - (germplasmStart * this.boxSize);
    const yPos = (this.lineUnderMouse * this.boxSize) - yWiggle;

    this.drawingContext.fillRect(0, yPos, this.alleleCanvasWidth(), this.boxSize);
  }

  render(germplasmStart, germplasmEnd, markerStart, markerEnd, yWiggle) {
    this.backContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderMap(markerStart, markerEnd);
    this.renderGermplasmNames(germplasmStart, germplasmEnd, yWiggle);
    if (this.lineSort.hasScore){
      this.renderGermplasmScore(germplasmStart, germplasmEnd, yWiggle);
    }
    this.renderGermplasm(germplasmStart, germplasmEnd, markerStart, markerEnd, yWiggle);
    this.renderScrollbars();
  }

  renderMarker(mapCanvas, marker, genoMarkerPos, firstMarkerPos, mapScaleFactor, drawStart) {
    const mapMarkerPos = this.calcMapMarkerPos(marker, firstMarkerPos, mapScaleFactor, drawStart);

    mapCanvas.beginPath();

    // Draw vertical line on top of map rectangle
    mapCanvas.moveTo(mapMarkerPos, 0);
    mapCanvas.lineTo(mapMarkerPos, 10);

    // Draw diagonal line to marker position on the genotype canvas
    mapCanvas.lineTo(genoMarkerPos, 30);

    // Draw a vertical line down to the genotype canvas
    mapCanvas.lineTo(genoMarkerPos, 40);
    mapCanvas.stroke();
  }

  renderMarkers(renderData) {
    const chrStart = 0;
    const chrEnd = this.dataSet.genomeMap.chromosomes[this.selectedChromosome].markerCount() * this.boxSize;
    const drawStart = -this.translatedX;

    const chromosome = this.dataSet.genomeMap.chromosomes[this.selectedChromosome];

    const potentialWidth = drawStart > 0 ? this.alleleCanvasWidth() - drawStart : this.alleleCanvasWidth();
    const chromosomeWidth = Math.min(chrEnd - this.translatedX, potentialWidth, chrEnd - chrStart);

    // The data array can have too many markers in it due to the gaps between
    // chromosomes, this is a fudge to ensure we don't try to draw too many markers
    const chromosomeMarkerWidth = Math.max(0, Math.floor(chromosomeWidth / this.boxSize));
    const dataWidth = Math.min(renderData.lastMarker - renderData.firstMarker, chromosomeMarkerWidth);

    const firstMarkerPos = chromosome.markers[renderData.firstMarker].position;
    const lastMarkerPos = chromosome.markers[renderData.firstMarker + dataWidth].position;
    const dist = (lastMarkerPos - firstMarkerPos);
    const scaleFactor = chromosomeWidth / dist;

    for (let markerIndex = renderData.firstMarker; markerIndex <= renderData.lastMarker; markerIndex += 1) {
      const marker = this.dataSet.genomeMap.chromosomes[this.selectedChromosome].markers[markerIndex];
      let xPos = drawStart + (markerIndex * this.boxSize);
      xPos += (this.boxSize / 2);
      this.renderMarker(this.backContext, marker, xPos, firstMarkerPos, scaleFactor, drawStart);
    }
  }

  renderChromosome(chromosomeData) {
    const width = this.dataSet.genomeMap.chromosomes[this.selectedChromosome].markerCount() * this.boxSize;
    this.backContext.strokeRect(-this.translatedX, 1, width, 10);
  }

  renderMap(markerStart, markerEnd) {
    this.backContext.save();
    // Set the line style for drawing the map and markers
    this.backContext.lineWidth = 1;
    this.backContext.strokeStyle = 'gray';

    // Create a clipping region so that lineNames can't creep up above the line
    // name canvas
    const region = new Path2D();
    region.rect(this.alleleCanvasXOffset, 0, this.alleleCanvasWidth(), this.mapCanvasHeight);
    this.backContext.clip(region);

    // Translate to the correct position to draw the map
    this.backContext.translate(this.alleleCanvasXOffset, 10);

    const renderData = this.dataSet.markersToRenderOn(this.selectedChromosome, markerStart, markerEnd);

    this.renderChromosome(renderData);
    this.renderMarkers(renderData);

    this.backContext.restore();
  }

  renderGermplasmNames(germplasmStart, germplasmEnd, yWiggle) {
    this.backContext.save();

    // Create a clipping region so that lineNames can't creep up above the line
    // name canvas
    const region = new Path2D();
    // We need to take account of the scrollbar potentially disappearing when
    // zoomed out
    const clipHeight = this.canScrollX() ? this.alleleCanvasHeight() : this.canvas.height;
    region.rect(0, this.mapCanvasHeight, this.nameCanvasWidth, clipHeight);
    this.backContext.clip(region);

    const lineNames = this.dataSet.germplasmFor(germplasmStart, germplasmEnd)
      .map(germplasm => germplasm.name);

    this.backContext.fillStyle = '#333';
    this.backContext.font = this.font;
    this.backContext.translate(0, this.mapCanvasHeight);

    lineNames.forEach((name, idx) => {
      const y = (idx * this.boxSize) - yWiggle + (this.boxSize - (this.fontSize / 2));
      this.backContext.fillText(name, 0, y);
    });
    this.backContext.restore();
  }

  // Render the sorting scores column
  renderGermplasmScore(germplasmStart, germplasmEnd, yWiggle){
    this.backContext.save();

    // Create a clipping region so that lineNames can't creep up above the line
    // name canvas
    const region = new Path2D();
    // We need to take account of the scrollbar potentially disappearing when
    //zoomed out
    const clipHeight = this.canScrollX() ? this.alleleCanvasHeight() : this.canvas.height;
    region.rect(this.nameCanvasWidth, this.mapCanvasHeight, this.scoreCanvasWidth, clipHeight);
    this.backContext.clip(region);

    const lineNames = this.dataSet.germplasmFor(germplasmStart, germplasmEnd)
      .map(germplasm => germplasm.name);

    this.backContext.fillStyle = '#333';
    this.backContext.font = this.font;
    this.backContext.translate(this.nameCanvasWidth, this.mapCanvasHeight);

    lineNames.forEach((name, idx) => {
      const y = (idx * this.boxSize) - yWiggle + (this.boxSize - (this.fontSize / 2));
      const score = this.lineSort.getScore(name);
      this.backContext.fillText(score.toFixed(2), 2, y);
    });
    this.backContext.restore();
  }

  renderGermplasm(germplasmStart, germplasmEnd, markerStart, markerEnd, yWiggle) {
    this.backContext.save();

    const renderData = this.dataSet.markersToRenderOn(this.selectedChromosome, markerStart, markerEnd);

    // Clip so that we can only draw into the region that is intended to be the
    // genotype canvas
    const region = new Path2D();
    region.rect(this.alleleCanvasXOffset, this.mapCanvasHeight, this.canvas.width, this.canvas.height);
    this.backContext.clip(region);

    this.backContext.translate(this.alleleCanvasXOffset, this.mapCanvasHeight);

    for (let germplasm = germplasmStart, line = 0; germplasm < germplasmEnd; germplasm += 1, line += 1) {
      const yPos = (line * this.boxSize) - yWiggle;

      const chrStart = -this.translatedX;
      for (let marker = renderData.firstMarker; marker <= renderData.lastMarker; marker += 1) {
        const xPos = chrStart + (marker * this.boxSize);

        const stamp = this.colorScheme.getState(germplasm, this.selectedChromosome, marker);

        this.backContext.drawImage(stamp, xPos, yPos);
      }      
    }
    this.backContext.restore();
  }

  renderScrollbars() {
    this.backContext.save();
    if (this.canScrollY()) {
      this.backContext.translate(0, this.mapCanvasHeight);
      this.verticalScrollbar.render(this.backContext);
    }
    this.backContext.restore();
    this.backContext.save();
    if (this.canScrollX()) {
      this.backContext.translate(this.alleleCanvasXOffset, 0);
      this.horizontalScrollbar.render(this.backContext);
    }
    this.backContext.restore();

    this.backContext.save();
    if (this.canScrollX() || this.canScrollY()) {
      this.backContext.translate(this.alleleCanvasXOffset, this.mapCanvasHeight);
      this.backContext.fillStyle = '#aaa';
      this.backContext.strokeRect(this.alleleCanvasWidth(), this.alleleCanvasHeight(), this.scrollbarWidth, this.scrollbarHeight);
      this.backContext.fillRect(this.alleleCanvasWidth(), this.alleleCanvasHeight(), this.scrollbarWidth, this.scrollbarHeight);
    }
    this.backContext.restore();
  }

  mapToRange(num, inMin, inMax, outMin, outMax) {
    return (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  };

  // We can only scroll horizontally if the render size of our data horizontally
  // is wider than the canvas itself
  canScrollX() {
    return this.maxCanvasWidth() > this.alleleCanvasWidth();
  }

  canScrollY() {
    return this.maxCanvasHeight() > this.alleleCanvasHeight();
  }

  moveX(diffX) {
    const xScrollMax = this.maxCanvasWidth() - this.alleleCanvasWidth();

    if (this.canScrollX()) {
      this.translatedX -= diffX;

      // Prevent scrolling beyond start or end of data
      if (this.translatedX < 0) {
        this.translatedX = 0;
      } else if (this.translatedX >= xScrollMax) {
        this.translatedX = xScrollMax;
      }

      const scrollWidth = this.alleleCanvasWidth() - this.horizontalScrollbar.widget.width;
      const scrollX = Math.floor(this.mapToRange(this.translatedX, 0, xScrollMax, 0, scrollWidth));
      this.horizontalScrollbar.move(scrollX, this.horizontalScrollbar.y);
    }
    return this.currentPosition();
  }

  moveY(diffY) {
    const yScrollMax = this.maxCanvasHeight() - this.alleleCanvasHeight();

    if (this.canScrollY()) {
      this.translatedY -= diffY;

      // Prevent scrolling beyond start or end of data
      if (this.translatedY < 0) {
        this.translatedY = 0;
      } else if (this.translatedY >= yScrollMax) {
        this.translatedY = yScrollMax;
      }

      const scrollHeight = this.alleleCanvasHeight() - this.verticalScrollbar.widget.height;
      const scrollY = Math.floor(this.mapToRange(this.translatedY, 0, yScrollMax, 0, scrollHeight));
      this.verticalScrollbar.move(this.verticalScrollbar.x, scrollY);
    }
    return this.currentPosition();
  }

  dragVerticalScrollbar(y) {
    if (this.canScrollY()) {
      const yScrollMax = this.maxCanvasHeight() - this.alleleCanvasHeight();

      this.translatedY = (y / this.verticalScrollbar.height) * yScrollMax;

      // Prevent scrolling beyond start or end of data
      if (this.translatedY < 0) {
        this.translatedY = 0;
      } else if (this.translatedY >= yScrollMax) {
        this.translatedY = yScrollMax;
      }

      const scrollHeight = this.alleleCanvasHeight() - this.verticalScrollbar.widget.height;
      const scrollY = Math.floor(this.mapToRange(this.translatedY, 0, yScrollMax, 0, scrollHeight));
      this.verticalScrollbar.move(this.verticalScrollbar.x, scrollY);
    }

    this.prerender(true);
    return this.currentPosition();
  }

  dragHorizontalScrollbar(x) {
    if (this.canScrollX()) {
      const xScrollMax = this.maxCanvasWidth() - this.alleleCanvasWidth();

      this.translatedX = (x / this.horizontalScrollbar.width) * xScrollMax;

      // Prevent scrolling beyond start or end of data
      if (this.translatedX < 0) {
        this.translatedX = 0;
      } else if (this.translatedX >= xScrollMax) {
        this.translatedX = xScrollMax;
      }

      const scrollWidth = this.alleleCanvasWidth() - this.horizontalScrollbar.widget.width;
      const scrollX = Math.floor(this.mapToRange(this.translatedX, 0, xScrollMax, 0, scrollWidth));
      this.horizontalScrollbar.move(scrollX, this.horizontalScrollbar.y);
    }

    this.prerender(true);
    return this.currentPosition();
  }

  moveToPosition(marker, germplasm) {
    const diffX = this.translatedX - marker * this.boxSize;
    const diffY = this.translatedY - germplasm * this.boxSize;
    return this.move(diffX, diffY);
  }

  move(diffX, diffY) {
    this.moveX(diffX);
    this.moveY(diffY);

    this.prerender(true);
    return this.currentPosition();
  }

  mouseOver(x, y) {
    // We need to calculate an offset because the gaps between chromosomes
    // aren't part of the data model
    const mouseXPos = x - this.alleleCanvasXOffset;
    const mouseXPosCanvas = this.translatedX + mouseXPos;
    const mouseYPos = y - this.mapCanvasHeight;

    if (mouseXPos > 0 && mouseXPos < this.alleleCanvasWidth() && mouseXPos < this.maxDataWidth()) {
      // Calculate the marker's index in the dataset and get the marker data
      const markerIndex = Math.floor((this.translatedX + mouseXPos) / this.boxSize);
      const marker = this.dataSet.markerOn(this.selectedChromosome, markerIndex);
      this.markerUnderMouse = marker.marker;
      this.markerIndexUnderMouse = marker.markerIndex;
    } else {
      this.markerUnderMouse = undefined;
      this.markerIndexUnderMouse = undefined;
      this.lineUnderMouse = undefined;
    }

    if (mouseYPos > 0 && mouseYPos < this.alleleCanvasHeight() && mouseYPos < this.maxDataHeight()) {
      this.lineUnderMouse = Math.max(0, Math.floor(mouseYPos / this.boxSize));
      this.lineIndexUnderMouse = this.lineUnderMouse + Math.floor(this.translatedY / this.boxSize);
    } else {
      this.markerUnderMouse = undefined;
      this.markerIndexUnderMouse = undefined;
      this.lineUnderMouse = undefined;
    }

    this.prerender(false);
  }

  updateFontSize() {
    // TODO: need some code to iteratively find the "widest" text, currently
    // testing indicated C/G was the widest for standard diploid genotypes.
    const text = 'C/G';
    const fontface = 'sans-serif';
    const fontCanvas = document.createElement('canvas');
    fontCanvas.width = this.boxSize;
    fontCanvas.height = this.boxSize;
    const fontContext = fontCanvas.getContext('2d');

    this.fontSize = 100;
    fontContext.font = `${this.fontSize}px ${fontface}`;

    // Iteratrively reduce the font size until the sample text fits in the
    // canvas width
    while (fontContext.measureText(text).width > fontCanvas.width) {
      this.fontSize -= 1;
      fontContext.font = `${this.fontSize}px ${fontface}`;
    }

    this.font = fontContext.font;
    this.backContext.font = this.font;
  }

  updateCanvasWidths() {
    // Find the longest germplasm name and adjust the width of the germplasm name
    // rendering area accordingly
    const germplasm = this.dataSet.germplasmList;
    const longestName = Math.max(...germplasm.map(g => this.backContext.measureText(g.name).width));
    this.nameCanvasWidth = longestName;

    if (this.lineSort.hasScore){
      this.scoreCanvasWidth = this.backContext.measureText("0.00").width + 2*this.scorePadding;  // 2px of padding on each side
    } else {
      this.scoreCanvasWidth = 0;
    }
    this.alleleCanvasXOffset = this.nameCanvasWidth + this.scoreCanvasWidth;

    this.horizontalScrollbar.updateWidth(this.alleleCanvasWidth());
  }

  updateScrollBarSizes() {
    const screenWidthPerc = this.alleleCanvasWidth() / this.maxCanvasWidth();
    const hScrollWidgetWidth = Math.ceil(this.alleleCanvasWidth() * screenWidthPerc);
    this.horizontalScrollbar.resizeWidgetWidth(hScrollWidgetWidth);

    const screenHeightPerc = this.alleleCanvasHeight() / this.maxCanvasHeight();
    const vScrollWidgetHeight = Math.ceil(this.alleleCanvasHeight() * screenHeightPerc);
    this.verticalScrollbar.resizeWidgetHeight(vScrollWidgetHeight);
  }

  updateScrollBars() {
    this.updateScrollBarSizes();
    
    const scrollWidth = this.alleleCanvasWidth() - this.horizontalScrollbar.widget.width;
    const scrollX = Math.floor(this.mapToRange(this.translatedX, 0, this.maxCanvasWidth() - this.alleleCanvasWidth(), 0, scrollWidth));
    this.horizontalScrollbar.move(scrollX, this.horizontalScrollbar.y);

    const scrollHeight = this.alleleCanvasHeight() - this.verticalScrollbar.widget.height;
    const scrollY = Math.floor(this.mapToRange(this.translatedY, 0, this.maxCanvasHeight() - this.alleleCanvasHeight(), 0, scrollHeight));
    this.verticalScrollbar.move(this.verticalScrollbar.x, scrollY);
  }

  zoom(size) {
    const newBoxSize = parseInt(size);
    
    // oldPosition * zoomFactor = newPosition => zoomFactor = newBoxSize / oldBoxSize
    const zoomFactor = newBoxSize / this.boxSize;
    this.boxSize = newBoxSize;

    this.updateFontSize();
    this.colorScheme.setupColorStamps(this.boxSize, this.font, this.fontSize);
    this.updateCanvasWidths();

    // If zooming out means the genotypes don't take up the full canvas, return
    // the display to its horizontal origin
    if (!this.canScrollX()) {
      this.translatedX = 0;
      this.horizontalScrollbar.move(0, this.horizontalScrollbar.y);
    } else {
      this.translatedX = Math.min(this.translatedX * zoomFactor, this.maxDataWidth() - this.alleleCanvasWidth());
    }

    // If zooming out means the genotypes don't take up the full canvas, return
    // the display to its vertical origin
    if (!this.canScrollY()) {
      this.translatedY = 0;
      this.verticalScrollbar.move(this.verticalScrollbar.x, 0);
    } else {
      this.translatedY = Math.min(this.translatedY * zoomFactor, this.maxDataHeight() - this.alleleCanvasHeight());
    }

    this.updateScrollBars();

    this.prerender(true);
    return this.currentPosition();
  }

  // Get the current data position of the top-right corner (marker and germplasm indices)
  currentPosition() {
    const marker = Math.floor(this.translatedX / this.boxSize);
    const germplasm = Math.floor(this.translatedY / this.boxSize);
    return {marker, germplasm};
  }

  // Get the size of the visible data in the canvas (in markers and germplasms)
  visibilityWindow() {
    const markers = Math.min(this.alleleCanvasWidth() / this.boxSize, this.dataSet.markerCountOn(this.selectedChromosome));
    const germplasms = Math.min(this.alleleCanvasHeight() / this.boxSize, this.dataSet.germplasmList.length);
    return {markers, germplasms};
  }

  setAutoWidth (newWidth){
    this.width = newWidth;
    this.canvas.width = newWidth;
    this.backBuffer.width = newWidth;

    this.verticalScrollbar.setPosition(newWidth - this.verticalScrollbar.width, 0);
    this.horizontalScrollbar.updateWidth(this.alleleCanvasWidth());

    this.updateScrollBars();

    // If zooming out means the genotypes don't take up the full canvas, return
    // the display to its horizontal origin
    if (!this.canScrollX()) {
      this.translatedX = 0;
      this.horizontalScrollbar.move(0, this.horizontalScrollbar.y);
    } else {
      this.translatedX = Math.min(this.translatedX, this.maxDataWidth() - this.alleleCanvasWidth());
    }

    // If zooming out means the genotypes don't take up the full canvas, return
    // the display to its vertical origin
    if (!this.canScrollY()) {
      this.translatedY = 0;
      this.verticalScrollbar.move(this.verticalScrollbar.x, 0);
    } else {
      this.translatedY = Math.min(this.translatedY, this.maxDataHeight() - this.alleleCanvasHeight());
    }
    
    this.prerender(true);
  }

  setColorScheme(scheme) {
    this.colorScheme = scheme;
    this.prerender(true);
  }

  setColorComparisonLine(comparedName) {
    this.colorComparisonLineIndex = this.dataSet.germplasmList.findIndex(germplasm => germplasm.name == comparedName);
    this.colorScheme.setComparisonLineIndex(this.colorComparisonLineIndex);
    this.prerender(true);
  }

  setLineSort(newLineSort){
    this.lineSort = newLineSort;
    this.updateCanvasWidths();  // To account for the presence or absence of scores
    this.sortLines();
  }

  setSortComparisonLine(comparedName) {
    this.lineSort.setComparisonLine(comparedName);
    this.sortLines();
  }

  setChromosome(chromosomeIndex) {
    this.selectedChromosome = chromosomeIndex;

    // Reset the position
    this.moveToPosition(0, 0);

    this.lineSort.setChromosomes([chromosomeIndex]);
    this.sortLines();  // This redraws too
  }

  sortLines(){
    // Save the color comparison line to restore it later
    let colorComparisonName = this.dataSet.germplasmList[this.colorComparisonLineIndex].name;
    this.lineSort.sort(this.dataSet)
    this.setColorComparisonLine(colorComparisonName);
    this.prerender(true);
  }

  exportName (){
    return `view_${this.dataSet.genomeMap.chromosomes[this.selectedChromosome].name}_${this.translatedX}`;
  }

  toDataURL (type, encoderOptions){
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = this.canvas.width;
    tmpCanvas.height = this.canvas.height;

    const tmpContext = tmpCanvas.getContext('2d');
    tmpContext.fillStyle = 'white';
    tmpContext.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);
    tmpContext.drawImage(this.canvas, 0, 0);

    return tmpCanvas.toDataURL(type, encoderOptions);
  }

//   rainbowColor(numOfSteps, step) {
//     // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
//     // Adam Cole, 2011-Sept-14
//     // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
//     let r, g, b;
//     const h = step / numOfSteps;
//     const i = ~~(h * 6);
//     const f = h * 6 - i;
//     const q = 1 - f;
//     switch(i % 6){
//         case 0: r = 1; g = f; b = 0; break;
//         case 1: r = q; g = 1; b = 0; break;
//         case 2: r = 0; g = 1; b = f; break;
//         case 3: r = 0; g = q; b = 1; break;
//         case 4: r = f; g = 0; b = 1; break;
//         case 5: r = 1; g = 0; b = q; break;
//     }
//     let c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
//     return (c);
// }
}
