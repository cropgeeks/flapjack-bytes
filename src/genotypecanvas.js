import ScrollBar from './ScrollBar';

export default class GenotypeCanvas {
  constructor(width, height, boxSize) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.drawingContext = this.canvas.getContext('2d');

    this.backBuffer = document.createElement('canvas');
    this.backBuffer.width = width;
    this.backBuffer.height = height;
    this.backContext = this.backBuffer.getContext('2d');
    this.mapCanvasHeight = 40;
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
    this.redraw = true;
    this.colorScheme = undefined;

    this.markerUnderMouse = undefined;
    this.lineUnderMouse = undefined;

    this.dataSet = undefined;

    // Visual start and end points for each chromosome
    this.chromosomeStarts = [];
    this.chromosomeEnds = [];

    this.chromosomeGapSize = 50;
  }

  totalChromosomeGap() {
    return (this.dataSet.genomeMap.chromosomes.length - 1) * this.chromosomeGapSize;
  }

  maxCanvasWidth() {
    return Math.max((this.dataSet.markerCount() * this.boxSize)
      + this.totalChromosomeGap(), this.alleleCanvasWidth());
  }

  maxCanvasHeight() {
    return Math.max(this.dataSet.lineCount() * this.boxSize, this.alleleCanvasHeight());
  }

  alleleCanvasWidth() {
    return this.canvas.width - this.nameCanvasWidth - this.scrollbarWidth;
  }

  alleleCanvasHeight() {
    return this.canvas.height - this.mapCanvasHeight - this.scrollbarHeight;
  }

  init(dataSet, colorScheme) {
    this.dataSet = dataSet;
    this.colorScheme = colorScheme;
    this.font = this.updateFontSize();
    this.updateVisualPositions();
    this.colorScheme.setupColorStamps(this.boxSize, this.font, this.fontSize);
    this.colorStamps = this.colorScheme.colorStamps;
    this.zoom(this.boxSize);
  }

  prerender() {
    this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.redraw) {
      const dataWidth = Math.ceil(this.alleleCanvasWidth() / this.boxSize);

      // We need to calculate an offset because the gaps between chromosomes
      // aren't part of the data model
      let offset = 0;
      this.chromosomeStarts.forEach((start, index) => {
        if ((this.translatedX >= start && this.translatedX < this.chromosomeEnds[index])
          || (index > 0 && this.translatedX >= this.chromosomeEnds[index - 1]
          && this.translatedX <= this.chromosomeStarts[index])) {
          offset = index * this.chromosomeGapSize;
        }
      });

      const markerStart = Math.floor((this.translatedX - offset) / this.boxSize);
      const markerEnd = Math.min(markerStart + dataWidth, this.dataSet.markerCount());

      const germplasmStart = Math.floor(this.translatedY / this.boxSize);
      const germplasmEnd = Math.min(germplasmStart
        + Math.floor(this.canvas.height / this.boxSize), this.dataSet.lineCount());

      const yWiggle = this.translatedY - (germplasmStart * this.boxSize);

      this.render(germplasmStart, germplasmEnd, markerStart, markerEnd, yWiggle);
    }

    this.drawingContext.drawImage(this.backBuffer, 0, 0);

    // TODO: bring back in once we have everything else working;
    // if (this.lineUnderMouse && this.markerUnderMouse) {
    //   this.drawingContext.translate(this.lineNamesWidth, this.mapCanvasHeight);
    //   this.drawingContext.globalAlpha = 0.4;
    //   this.drawingContext.fillStyle = '#fff';
    //   this.drawingContext.fillRect(this.markerUnderMouse * this.boxSize, 0, this.boxSize, this.alleleCanvasHeight);
    //   this.drawingContext.fillRect(0, this.lineUnderMouse * this.boxSize, this.alleleCanvasWidth, this.boxSize);
    //   this.drawingContext.translate(-this.lineNamesWidth, -this.mapCanvasHeight);
    //   this.drawingContext.globalAlpha = 1;
    // }

    this.redraw = false;
  }

  render(germplasmStart, germplasmEnd, markerStart, markerEnd, yWiggle) {
    this.backContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderMap(markerStart, markerEnd);
    this.renderGermplasmNames(germplasmStart, germplasmEnd, yWiggle);
    this.renderGermplasm(germplasmStart, germplasmEnd, markerStart, markerEnd, yWiggle);
    this.renderScrollbars();
  }

  renderMarker(marker, genoMarkerPos, firstMarkerPos, mapScaleFactor, drawStart) {
    const mapMarkerPos = drawStart + ((marker.position - firstMarkerPos) * (mapScaleFactor));
    this.backContext.beginPath();
    // Draw vertical line on top of map rectangle
    this.backContext.moveTo(mapMarkerPos, 0);
    this.backContext.lineTo(mapMarkerPos, 10);
    // Draw diagonal line to marker position on the genotype canvas
    this.backContext.lineTo(genoMarkerPos, 20);
    // Draw a vertical line down to the genotype canvas
    this.backContext.lineTo(genoMarkerPos, 30);
    this.backContext.stroke();
  }

  renderMarkers(renderData) {
    renderData.forEach((chr) => {
      const chrStart = this.chromosomeStarts[chr.chromosomeIndex];
      const chrEnd = this.chromosomeEnds[chr.chromosomeIndex];
      const drawStart = chrStart - this.translatedX;

      const chromosome = this.dataSet.genomeMap.chromosomes[chr.chromosomeIndex];

      const chromosomeWidth = Math.min(chrEnd - chrStart, this.alleleCanvasWidth() - drawStart);

      const firstMarkerPos = chromosome.markers[chr.firstMarker].position;
      const lastMarkerPos = chromosome.markers[chr.lastMarker].position;
      const dist = lastMarkerPos - firstMarkerPos;
      const scaleFactor = chromosomeWidth / dist;

      for (let markerIndex = chr.firstMarker; markerIndex <= chr.lastMarker; markerIndex += 1) {
        const marker = this.dataSet.genomeMap.chromosomes[chr.chromosomeIndex].markers[markerIndex];
        let xPos = drawStart + (markerIndex * this.boxSize);
        xPos += (this.boxSize / 2);
        this.renderMarker(marker, xPos, firstMarkerPos, scaleFactor, drawStart);
      }
    });
  }

  renderMap(markerStart, markerEnd) {
    this.backContext.save();
    // Set the line style for drawing the map and markers
    this.backContext.lineWidth = 1;
    this.backContext.strokeStyle = 'gray';

    // Create a clipping region so that lineNames can't creep up above the line
    // name canvas
    const region = new Path2D();
    region.rect(this.nameCanvasWidth, 0, this.alleleCanvasWidth(), this.mapCanvasHeight);
    this.backContext.clip(region);

    // Translate to the correct position to draw the map
    this.backContext.translate(this.nameCanvasWidth, 0);

    const renderData = this.dataSet.markersToRender(markerStart, markerEnd);

    renderData.forEach((chr) => {
      const chrStart = this.chromosomeStarts[chr.chromosomeIndex];
      const chrEnd = this.chromosomeEnds[chr.chromosomeIndex];
      const drawStart = chrStart - this.translatedX;
      this.backContext.strokeRect(drawStart, 1, chrEnd - chrStart, 10);
    });

    this.renderMarkers(renderData);

    this.backContext.restore();
  }

  renderGermplasmNames(germplasmStart, germplasmEnd, yWiggle) {
    this.backContext.save();

    // Create a clipping region so that lineNames can't creep up above the line
    // name canvas
    const region = new Path2D();
    region.rect(0, this.mapCanvasHeight, this.nameCanvasWidth,
      this.canvas.height - this.scrollbarHeight - this.mapCanvasHeight);
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

  renderGermplasm(germplasmStart, germplasmEnd, markerStart, markerEnd, yWiggle) {
    this.backContext.save();

    const renderData = this.dataSet.markersToRender(markerStart, markerEnd);

    // Clip so that we can only draw into the region that is intended to be the
    // genotype canvas
    const region = new Path2D();
    region.rect(this.nameCanvasWidth, this.mapCanvasHeight, this.canvas.width, this.canvas.height);
    this.backContext.clip(region);

    this.backContext.translate(this.nameCanvasWidth, this.mapCanvasHeight);
    const { colorStamps } = this.colorScheme;

    for (let germplasm = germplasmStart, line = 0; germplasm < germplasmEnd; germplasm += 1, line += 1) {
      const yPos = (line * this.boxSize) - yWiggle;

      renderData.forEach((chr) => {
        const chrStart = this.chromosomeStarts[chr.chromosomeIndex] - this.translatedX;
        for (let marker = chr.firstMarker; marker <= chr.lastMarker; marker += 1) {
          const xPos = chrStart + (marker * this.boxSize);
          const geno = this.dataSet.genotypeFor(germplasm, chr.chromosomeIndex, marker);
          this.backContext.drawImage(colorStamps[geno], xPos, yPos);
        }
      });
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
      this.backContext.translate(this.nameCanvasWidth, 0);
      this.horizontalScrollbar.render(this.backContext);
    }
    this.backContext.restore();

    this.backContext.save();
    if (this.canScrollX() || this.canScrollY()) {
      this.backContext.translate(this.nameCanvasWidth, this.mapCanvasHeight);
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
  }

  move(diffX, diffY) {
    this.moveX(diffX);
    this.moveY(diffY);

    this.redraw = true;
    this.prerender();
  }

  mouseOver(x, y) {
    if (x >= this.nameCanvasWidth && x < this.backBuffer.width && y >= this.mapCanvasHeight && y < this.backBuffer.height) {
      this.markerUnderMouse = Math.floor((x - this.nameCanvasWidth) / this.boxSize);
      this.lineUnderMouse = Math.floor((y - this.mapCanvasHeight) / this.boxSize);
    } else {
      this.lineUnderMouse = undefined;
      this.markerUnderMouse = undefined;
    }

    this.prerender();
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

    this.horizontalScrollbar.updateWidth(this.alleleCanvasWidth());
  }

  updateVisualPositions() {
    this.chromosomeStarts = Array.from(this.dataSet.genomeMap.chromosomeStarts.values()).map((v, idx) => v * this.boxSize + (idx * this.chromosomeGapSize));
    this.chromosomeEnds = [];
    this.dataSet.genomeMap.chromosomes.forEach((chr, idx) => {
      this.chromosomeEnds.push(this.chromosomeStarts[idx] + (chr.markerCount() * this.boxSize));
    });
  }

  updateScrollBarSizes() {
    const screenWidthPerc = this.alleleCanvasWidth() / this.maxCanvasWidth();
    const hScrollWidgetWidth = Math.ceil(this.alleleCanvasWidth() * screenWidthPerc);
    this.horizontalScrollbar.resizeWidgetWidth(hScrollWidgetWidth);

    const screenHeightPerc = this.alleleCanvasHeight() / this.maxCanvasHeight();
    const vScrollWidgetHeight = Math.ceil(this.alleleCanvasHeight() * screenHeightPerc);
    this.verticalScrollbar.resizeWidgetHeight(vScrollWidgetHeight);
  }

  zoom(size) {
    this.boxSize = size;
    this.updateFontSize();
    this.colorScheme.setupColorStamps(this.boxSize, this.font, this.fontSize);
    this.updateCanvasWidths();
    this.updateVisualPositions();
    this.updateScrollBarSizes();

    // If zooming out means the genotypes don't take up the full canvas, return
    // the display to its horizontal origin
    if (!this.canScrollX()) {
      this.translatedX = 0;
      this.horizontalScrollbar.move(0, this.horizontalScrollbar.y);
    }

    // If zooming out means the genotypes don't take up the full canvas, return
    // the display to its vertical origin
    if (!this.canScrollY()) {
      this.translatedY = 0;
      this.verticalScrollbar.move(this.verticalScrollbar.x, 0);
    }

    this.redraw = true;
    this.prerender();
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
