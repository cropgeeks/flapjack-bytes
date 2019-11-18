import ScrollBar from './scrollbar';

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

    this.alleleCanvasWidth = width - this.nameCanvasWidth - this.scrollbarWidth;
    this.alleleCanvasHeight = height - this.mapCanvasHeight - this.scrollbarHeight;
    this.backContext.lineWidth = 1;

    this.boxSize = boxSize;
    this.fontSize = 100;
    this.font = undefined;

    this.verticalScrollbar = new ScrollBar(width, this.alleleCanvasHeight + this.scrollbarHeight,
      this.scrollbarWidth, this.alleleCanvasHeight, true);
    this.horizontalScrollbar = new ScrollBar(width - this.nameCanvasWidth + this.scrollbarWidth - 1,
      height, width - this.nameCanvasWidth - 1, this.scrollbarHeight, false);

    this.translatedX = 0;
    this.translatedY = 0;
    this.maxCanvasWidth = 0;
    this.maxCanvasHeight = 0;
    this.lineNames = [];
    this.lineData = [];
    this.redraw = true;
    this.colorScheme = undefined;

    this.markerUnderMouse = undefined;
    this.lineUnderMouse = undefined;

    this.dataSet = undefined;
  }

  init(dataSet, colorScheme) {
    this.dataSet = dataSet;
    this.colorScheme = colorScheme;
    this.font = this.updateFontSize();
    this.colorScheme.setupColorStamps(this.boxSize, this.font, this.fontSize);
    this.colorStamps = this.colorScheme.colorStamps;

    this.maxCanvasWidth = this.dataSet.markerCount() * this.boxSize;
    this.maxCanvasHeight = this.dataSet.lineCount() * this.boxSize;
  }

  prerender() {
    this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.redraw) {
      const dataWidth = Math.floor(this.alleleCanvasWidth / this.boxSize);

      const markerStart = Math.floor(this.translatedX / this.boxSize);
      const markerEnd = Math.min(markerStart + dataWidth, this.dataSet.markerCount());
      const markerData = this.dataSet.mapDataFor(markerStart, markerEnd);

      const germplasmStart = Math.floor(this.translatedY / this.boxSize);
      const germplasmEnd = Math.min(germplasmStart + Math.floor(this.canvas.height / this.boxSize), this.dataSet.lineCount());
      const genotypeData = this.dataSet.genotypeDataFor(germplasmStart, germplasmEnd, markerStart, markerEnd);

      this.mapCanvasHeight = typeof markerData[0] === 'undefined' ? 0 : this.mapCanvasHeight;
      this.alleleCanvasHeight = this.canvas.height - this.mapCanvasHeight;
      this.verticalScrollbar = new ScrollBar(this.canvas.width, this.alleleCanvasHeight - 10,
        10, this.alleleCanvasHeight - 10, true);

      this.render(markerData, genotypeData, dataWidth);
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

  render(markerData, genotypeData, dataWidth) {
    this.backContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderMap(markerData, dataWidth);
    this.renderGermplasmNames(genotypeData);
    this.renderGermplasm(genotypeData, dataWidth);
    this.renderScrollbars();
  }

  renderMarker(marker, genoMarkerPos, firstMarkerPos, mapScaleFactor) {
    const mapMarkerPos = ((marker.position - firstMarkerPos) * (mapScaleFactor));
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

  renderMarkers(markers, mapWidth) {
    const firstMarkerPos = markers[0].position;
    const lastMarkerPos = markers[markers.length - 1].position;
    const dist = lastMarkerPos - firstMarkerPos;
    const scaleFactor = mapWidth / dist;

    for (let i = 0; i < markers.length; i += 1) {
      // Calculate the marker position above the genotype canvas
      let pos = i * this.boxSize;
      pos += (this.boxSize / 2);
      // If we've gone past the mapWidth don't render the marker
      if (pos < mapWidth) {
        this.renderMarker(markers[i], pos, firstMarkerPos, scaleFactor);
      }
    }
  }

  renderMap(markerData, dataWidth) {
    this.backContext.save();
    // Set the line style for drawing the map and markers
    this.backContext.lineWidth = 1;
    this.backContext.strokeStyle = 'gray';

    // Translate to the correct position to draw the map
    this.backContext.translate(this.nameCanvasWidth, 0);

    // We need to count the total translation for multiple chromosome rendering
    let cumulativeTranslation = 0;

    markerData.forEach((chromosome) => {
      const { markers } = chromosome;
      // Draw a rectangle outline for the map
      const canvasW = this.alleleCanvasWidth;
      if (cumulativeTranslation < canvasW) {
        let mapWidth = Math.floor(canvasW * (markers.length / dataWidth));
        if (cumulativeTranslation + mapWidth > canvasW) {
          mapWidth = canvasW - cumulativeTranslation;
        }
        this.backContext.strokeRect(0, 1, mapWidth, 10);

        this.renderMarkers(markers, mapWidth);

        cumulativeTranslation += mapWidth + 50;
        this.backContext.translate(mapWidth + 50, 0);
      }
    });

    this.backContext.restore();
  }

  renderGermplasmNames(genotypeData) {
    this.backContext.save();
    const lineNames = genotypeData.map(germplasm => germplasm.name);
    this.backContext.fillStyle = '#333';
    this.backContext.font = this.font;
    this.backContext.translate(0, this.mapCanvasHeight);

    lineNames.forEach((name, idx) => {
      this.backContext.fillText(name, 0, (idx * this.boxSize) + (this.boxSize - (this.fontSize / 2)));
    });
    this.backContext.restore();
  }

  renderGermplasm(genotypeData, dataWidth) {
    this.backContext.save();
    this.backContext.translate(this.nameCanvasWidth, this.mapCanvasHeight);
    const { colorStamps } = this.colorScheme;

    for (let germplasm = 0; germplasm < genotypeData.length; germplasm += 1) {
      const { data } = genotypeData[germplasm];
      this.backContext.save();
      let cumulativeTranslation = 0;
      for (let chromosome = 0; chromosome < data.length; chromosome += 1) {
        const { genotypes } = data[chromosome];
        // Draw a rectangle outline for the map
        const canvasW = this.alleleCanvasWidth;
        if (cumulativeTranslation < canvasW) {
          let mapWidth = Math.floor(canvasW * (genotypes.length / dataWidth));
          if (cumulativeTranslation + mapWidth > canvasW) {
            mapWidth = canvasW - cumulativeTranslation;
          }
          for (let genotype = 0; genotype < genotypes.length; genotype += 1) {
            this.backContext.drawImage(colorStamps[genotypes[genotype]], (genotype * this.boxSize), (germplasm * this.boxSize));
          }
          cumulativeTranslation += mapWidth + 50;
          this.backContext.translate(mapWidth + 50, 0);
        }
      }
      this.backContext.restore();
    }

    this.backContext.restore();
  }

  renderScrollbars() {
    this.backContext.save();
    this.backContext.translate(0, this.mapCanvasHeight);
    this.verticalScrollbar.render(this.backContext);
    this.backContext.restore();
    this.backContext.save();
    this.backContext.translate(this.nameCanvasWidth, 0);
    this.horizontalScrollbar.render(this.backContext);
    this.backContext.restore();

    this.backContext.save();
    this.backContext.translate(this.nameCanvasWidth, this.mapCanvasHeight);
    this.backContext.fillStyle = '#aaa';
    this.backContext.strokeRect(this.alleleCanvasWidth, this.alleleCanvasHeight - this.scrollbarHeight, this.scrollbarWidth, this.scrollbarHeight);
    this.backContext.fillRect(this.alleleCanvasWidth, this.alleleCanvasHeight - this.scrollbarHeight, this.scrollbarWidth, this.scrollbarHeight);
    this.backContext.restore();
  }

  mapToRange(num, inMin, inMax, outMin, outMax) {
    return (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  };

  move(diffX, diffY) {
    if (this.maxCanvasWidth > this.canvas.width) {
      this.translatedX -= diffX;
      if (this.translatedX < 0) { this.translatedX = 0; }
      if ((this.translatedX / this.boxSize) >= ((this.maxCanvasWidth / this.boxSize) - (this.alleleCanvasWidth / this.boxSize))) {
        this.translatedX = this.maxCanvasWidth - this.alleleCanvasWidth;
      }

      // console.log(this.translatedX, Math.floor(this.translatedX / this.boxSize), (this.translatedX + this.alleleCanvasWidth), Math.floor((this.translatedX + this.alleleCanvasWidth) / this.boxSize), this.boxSize);
      
      // let foundChroms = this.genomeMap.markersFor(Math.floor(this.translatedX / this.boxSize), Math.floor((this.translatedX + this.alleleCanvasWidth) / this.boxSize));
      // console.log(foundChroms);

      const scrollWidth = this.alleleCanvasWidth - 10 - 20;
      const scrollX = Math.floor(this.mapToRange(this.translatedX, 0, this.maxCanvasWidth - this.alleleCanvasWidth, 0, scrollWidth));
      this.horizontalScrollbar.move(scrollX, this.horizontalScrollbar.y);
    }

    if (this.maxCanvasHeight > this.canvas.height) {
      this.translatedY -= diffY;
      if (this.translatedY < 0) { this.translatedY = 0; }
      if ((this.translatedY / this.boxSize) >= ((this.maxCanvasHeight / this.boxSize) - (this.alleleCanvasHeight / this.boxSize))) { this.translatedY = this.maxCanvasHeight - this.alleleCanvasHeight; }

      const scrollHeight = this.alleleCanvasHeight - 10 - 20;
      const scrollY = Math.floor(this.mapToRange(this.translatedY, 0, this.maxCanvasHeight - this.alleleCanvasHeight, 0, scrollHeight));
      this.verticalScrollbar.move(this.verticalScrollbar.x, scrollY);
    }

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
    this.maxCanvasWidth = Math.max(this.dataSet.markerCount() * this.boxSize, this.canvas.width);
    this.maxCanvasHeight = Math.max(this.dataSet.lineCount() * this.boxSize, this.canvas.height);

    // Find the longest germplasm name and adjust the width of the germplasm name
    // rendering area accordingly
    const germplasm = this.dataSet.germplasmList;
    const longestName = Math.max(...germplasm.map(g => this.backContext.measureText(g.name).width));
    this.nameCanvasWidth = longestName;
  }

  zoom(size) {
    this.boxSize = size;
    this.updateFontSize();
    this.colorScheme.setupColorStamps(this.boxSize, this.font, this.fontSize);
    this.updateCanvasWidths();
  
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
