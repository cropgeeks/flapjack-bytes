import ScrollBar from './scrollbar';

export default class GenotypeCanvas {
  constructor(width, height, boxSize, fontSize) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.drawingContext = this.canvas.getContext('2d');

    this.backBuffer = document.createElement('canvas');
    this.backBuffer.width = width;
    this.backBuffer.height = height;
    this.backContext = this.backBuffer.getContext('2d');
    this.qtlCanvasHeight = 30;
    this.mapCanvasHeight = 30;
    this.lineNamesWidth = 100;
    this.alleleCanvasWidth = width - this.lineNamesWidth;
    this.alleleCanvasHeight = height - this.mapCanvasHeight - this.qtlCanvasHeight;
    this.backContext.lineWidth = 1;

    this.boxSize = boxSize;
    this.fontSize = fontSize;

    this.verticalScrollbar = new ScrollBar(width, this.alleleCanvasHeight - 10,
      10, this.alleleCanvasHeight - 10, true);
    this.horizontalScrollbar = new ScrollBar(width - this.lineNamesWidth - 10 - 1,
      height, width - this.lineNamesWidth - 10 - 1, 10, false);

    this.translatedX = 0;
    this.translatedY = 0;
    this.maxCanvasWidth = 0;
    this.maxCanvasHeight = 0;
    this.totalMarkers = 0;
    this.totalLines = 0;
    this.markerData = [];
    this.lineNames = [];
    this.lineData = [];
    this.qtls = [];
    this.redraw = true;
    this.colorStamps = [];

    this.markerUnderMouse = undefined;
    this.lineUnderMouse = undefined;
  }

  init(markerData, lineNames, lineData, qtls, colorStamps) {
    this.totalMarkers = markerData.length === 0 ? lineData[0].length : markerData.length;

    this.totalLines = lineNames.length;

    this.maxCanvasWidth = this.totalMarkers * this.boxSize;
    this.maxCanvasHeight = this.totalLines * this.boxSize;

    this.markerData = markerData;
    this.lineNames = lineNames;
    this.lineData = lineData;
    this.qtls = qtls;
    this.colorStamps = colorStamps;
  }

  prerender() {
    this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.redraw) {
      const lineStart = Math.floor(this.translatedY / this.boxSize);
      const lineEnd = Math.min(lineStart + Math.floor(this.canvas.height / this.boxSize), this.totalLines);

      const alleleStart = Math.floor(this.translatedX / this.boxSize);
      const alleleEnd = Math.min(alleleStart + Math.floor(this.alleleCanvasWidth / this.boxSize), this.totalMarkers);

      const markers = this.markerData.slice(alleleStart, alleleEnd);

      if (typeof markers[0] === 'undefined') {
        this.mapCanvasHeight = 0;
        this.qtlCanvasHeight = 0;
        this.alleleCanvasHeight = this.canvas.height;
        this.verticalScrollbar = new ScrollBar(this.canvas.width, this.alleleCanvasHeight - 10,
          10, this.alleleCanvasHeight - 10, true);
      }

      const names = this.lineNames.slice(lineStart, lineEnd);
      const alleleData = [];
      for (let i = lineStart; i < lineEnd; i += 1) {
        alleleData.push(this.lineData[i].slice(alleleStart, alleleEnd));
      }

      this.render(markers, names, alleleData, this.qtls);
    }

    this.drawingContext.drawImage(this.backBuffer, 0, 0);

    if (this.lineUnderMouse && this.markerUnderMouse) {
      this.drawingContext.translate(this.lineNamesWidth, this.mapCanvasHeight);
      this.drawingContext.globalAlpha = 0.4;
      this.drawingContext.fillStyle = '#fff';
      this.drawingContext.fillRect(this.markerUnderMouse * this.boxSize, 0, this.boxSize, this.alleleCanvasHeight);
      this.drawingContext.fillRect(0, this.lineUnderMouse * this.boxSize, this.alleleCanvasWidth, this.boxSize);
      this.drawingContext.translate(-this.lineNamesWidth, -this.mapCanvasHeight);
      this.drawingContext.globalAlpha = 1;
    }

    this.redraw = false;
  }

  render(markerData, lineNames, lineData, qtls) {
    this.backContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderQtls(qtls, markerData);
    this.renderMap(markerData);
    this.renderGermplasmNames(lineNames);
    this.renderGermplasm(lineData);
    this.renderScrollbars();
  }

  renderQtls(qtlData, markerData) {
    if (typeof markerData[0] !== 'undefined' && typeof qtlData[0] !== 'undefined') {
      this.backContext.translate(this.lineNamesWidth, 0);

      const firstMarkerPos = markerData[0].position;
      const lastMarkerPos = markerData[markerData.length - 1].position;

      const dist = lastMarkerPos - firstMarkerPos;

      for (let i = 0; i < qtlData.length; i += 1) {
        const qtl = qtlData[i];
        if (qtl.max > firstMarkerPos && qtl.min < lastMarkerPos) {
          let start = Math.max(firstMarkerPos, qtl.min);
          let end = Math.min(lastMarkerPos, qtl.max);
          
          start = ((start - firstMarkerPos) * ((this.alleleCanvasWidth) / dist));
          end = ((end - firstMarkerPos) * ((this.alleleCanvasWidth) / dist));

          this.backContext.lineWidth = 1;
          this.backContext.strokeStyle = 'gray';
          this.backContext.fillStyle = this.rainbowColor(this.qtls.length, i);
          this.backContext.strokeRect(start, 5, end - start + 1, 10);
          this.backContext.fillRect(start, 5, end - start + 1, 10);
        }
      }

      this.backContext.translate(-this.lineNamesWidth, 0);
    }
  }

  renderMap(alleles) {
    if (typeof alleles[0] !== 'undefined') {
      const firstMarkerPos = alleles[0].position;
      const lastMarkerPos = alleles[alleles.length - 1].position;

      const dist = lastMarkerPos - firstMarkerPos;

      this.backContext.lineWidth = 1;
      this.backContext.strokeStyle = 'gray';
      this.backContext.translate(this.lineNamesWidth, this.qtlCanvasHeight);

      for (let i = 0; i < alleles.length; i += 1) {
        let pos = i * this.boxSize;
        pos += (this.boxSize / 2);
        const marker = alleles[i];
        const markerPos = ((marker.position - firstMarkerPos) * ((this.alleleCanvasWidth) / dist));
        this.backContext.beginPath();
        this.backContext.moveTo(markerPos, 0);
        this.backContext.lineTo(pos, 20);
        this.backContext.lineTo(pos, this.mapCanvasHeight);
        this.backContext.stroke();
      }

      this.backContext.translate(-this.lineNamesWidth, -this.qtlCanvasHeight);
    }
  }

  renderGermplasmNames(lineNames) {
    this.backContext.fillStyle = '#333';
    this.backContext.translate(0, this.mapCanvasHeight + this.qtlCanvasHeight);
    for (let i = 0; i < lineNames.length; i += 1) {
      this.backContext.fillText(lineNames[i], 0, ((i * this.boxSize) + (this.boxSize - (this.fontSize / 2))));
    }
    this.backContext.translate(0, -(this.mapCanvasHeight + this.qtlCanvasHeight));
  }

  renderGermplasm(lineData) {
    this.backContext.translate(this.lineNamesWidth, this.mapCanvasHeight + this.qtlCanvasHeight);
    for (let i = 0; i < lineData.length; i += 1) {
      for (let j = 0; j < lineData[i].length; j += 1) {
        this.backContext.drawImage(this.colorStamps[lineData[i][j]].buffer, (j * this.boxSize), (i * this.boxSize));
      }
    }
    this.backContext.translate(-this.lineNamesWidth, -(this.mapCanvasHeight + this.qtlCanvasHeight));
  }

  renderScrollbars() {
    this.backContext.translate(0, this.mapCanvasHeight + this.qtlCanvasHeight);
    this.verticalScrollbar.render(this.backContext);
    this.backContext.translate(0, -(this.mapCanvasHeight + this.qtlCanvasHeight));
    this.backContext.translate(this.lineNamesWidth, 0);
    this.horizontalScrollbar.render(this.backContext);
    this.backContext.translate(-this.lineNamesWidth, 0);

    this.backContext.translate(this.lineNamesWidth, this.mapCanvasHeight + this.qtlCanvasHeight);
    this.backContext.fillStyle = '#aaa';
    this.backContext.strokeRect(this.alleleCanvasWidth - 10, this.alleleCanvasHeight - 10, 10, 10);
    this.backContext.fillRect(this.alleleCanvasWidth - 10, this.alleleCanvasHeight - 10, 10, 10);
    this.backContext.translate(-this.lineNamesWidth, -(this.mapCanvasHeight + this.qtlCanvasHeight));
  }

  move(diffX, diffY) {
    const mapToRange = (num, inMin, inMax, outMin, outMax) => {
      return (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    };

    if (this.maxCanvasWidth > this.canvas.width) {
      this.translatedX -= diffX;
      if (this.translatedX < 0) { this.translatedX = 0; }
      if ((this.translatedX / this.boxSize) >= ((this.maxCanvasWidth / this.boxSize) - (this.alleleCanvasWidth / this.boxSize))) { this.translatedX = this.maxCanvasWidth - this.alleleCanvasWidth; }

      const scrollWidth = this.alleleCanvasWidth - 10 - 20;
      const scrollX = Math.floor(mapToRange(this.translatedX, 0, this.maxCanvasWidth - this.alleleCanvasWidth, 0, scrollWidth));
      this.horizontalScrollbar.move(scrollX, this.horizontalScrollbar.y);
    }

    if (this.maxCanvasHeight > this.canvas.height) {
      this.translatedY -= diffY;
      if (this.translatedY < 0) { this.translatedY = 0; }
      if ((this.translatedY / this.boxSize) >= ((this.maxCanvasHeight / this.boxSize) - (this.alleleCanvasHeight / this.boxSize))) { this.translatedY = this.maxCanvasHeight - this.alleleCanvasHeight; }

      const scrollHeight = this.alleleCanvasHeight - 10 - 20;
      const scrollY = Math.floor(mapToRange(this.translatedY, 0, this.maxCanvasHeight - this.alleleCanvasHeight, 0, scrollHeight));
      this.verticalScrollbar.move(this.verticalScrollbar.x, scrollY);
    }

    this.redraw = true;
    this.prerender();
  }

  mouseOver(x, y) {
    if (x >= this.lineNamesWidth && x < this.backBuffer.width && y >= this.mapCanvasHeight && y < this.backBuffer.height) {
      this.markerUnderMouse = Math.floor((x - this.lineNamesWidth) / this.boxSize);
      this.lineUnderMouse = Math.floor((y - this.mapCanvasHeight) / this.boxSize);
    } else {
      this.lineUnderMouse = undefined;
      this.markerUnderMouse = undefined;
    }

    this.prerender();
  }

  zoom(size, colorStamps) {
    this.boxSize = size;
    this.colorStamps = colorStamps;
    this.maxCanvasWidth = Math.max(this.totalMarkers * this.boxSize, this.canvas.width);
    this.maxCanvasHeight = Math.max(this.totalLines * this.boxSize, this.canvas.height);

    this.redraw = true;
    this.prerender();
  }

  rainbowColor(numOfSteps, step) {
    // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
    // Adam Cole, 2011-Sept-14
    // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
    let r, g, b;
    const h = step / numOfSteps;
    const i = ~~(h * 6);
    const f = h * 6 - i;
    const q = 1 - f;
    switch(i % 6){
        case 0: r = 1; g = f; b = 0; break;
        case 1: r = q; g = 1; b = 0; break;
        case 2: r = 0; g = 1; b = f; break;
        case 3: r = 0; g = q; b = 1; break;
        case 4: r = f; g = 0; b = 1; break;
        case 5: r = 1; g = 0; b = q; break;
    }
    let c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
    return (c);
}
}
