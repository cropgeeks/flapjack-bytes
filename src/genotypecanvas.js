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
    this.mapCanvasHeight = 30;
    this.lineNamesWidth = 100;
    this.alleleCanvasWidth = width - this.lineNamesWidth;
    this.alleleCanvasHeight = height - this.mapCanvasHeight;
    this.backContext.lineWidth = 1;

    this.boxSize = boxSize;
    this.fontSize = fontSize;

    this.verticalScrollbar = new ScrollBar(width, height - this.mapCanvasHeight - 10,
      10, height - this.mapCanvasHeight - 10, true);
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
    this.redraw = true;
    this.colorStamps = [];

    this.markerUnderMouse = undefined;
    this.lineUnderMouse = undefined;
  }

  init(markerData, lineNames, lineData, colorStamps) {
    this.totalMarkers = markerData.length;
    this.totalLines = lineNames.length;

    this.maxCanvasWidth = this.totalMarkers * this.boxSize;
    this.maxCanvasHeight = this.totalLines * this.boxSize;

    this.markerData = markerData;
    this.lineNames = lineNames;
    this.lineData = lineData;
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
      const names = this.lineNames.slice(lineStart, lineEnd);
      const alleleData = [];
      for (let i = lineStart; i < lineEnd; i += 1) {
        alleleData.push(this.lineData[i].slice(alleleStart, alleleEnd));
      }

      this.render(markers, names, alleleData);
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

  render(markerData, lineNames, lineData) {
    this.backContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderMap(markerData);
    this.renderGermplasmNames(lineNames);
    this.renderGermplasm(lineData);
    this.renderScrollbars();
  }

  renderMap(alleles) {
    const firstMarkerPos = alleles[0].position;
    const lastMarkerPos = alleles[alleles.length - 1].position;

    const dist = lastMarkerPos - firstMarkerPos;

    this.backContext.lineWidth = 1;
    this.backContext.strokeStyle = 'gray';
    this.backContext.translate(this.lineNamesWidth, 0);

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

    this.backContext.translate(-this.lineNamesWidth, 0);
  }

  renderGermplasmNames(lineNames) {
    this.backContext.fillStyle = '#333';
    this.backContext.translate(0, this.mapCanvasHeight);
    for (let i = 0; i < lineNames.length; i += 1) {
      this.backContext.fillText(lineNames[i], 0, ((i * this.boxSize) + (this.boxSize - (this.fontSize / 2))));
    }
    this.backContext.translate(0, -this.mapCanvasHeight);
  }

  renderGermplasm(lineData) {
    this.backContext.translate(this.lineNamesWidth, this.mapCanvasHeight);
    for (let i = 0; i < lineData.length; i += 1) {
      for (let j = 0; j < lineData[i].length; j += 1) {
        this.backContext.drawImage(this.colorStamps[lineData[i][j]].buffer, (j * this.boxSize), (i * this.boxSize));
      }
    }
    this.backContext.translate(-this.lineNamesWidth, -this.mapCanvasHeight);
  }

  renderScrollbars() {
    this.backContext.translate(0, this.mapCanvasHeight);
    this.verticalScrollbar.render(this.backContext);
    this.backContext.translate(0, -this.mapCanvasHeight);
    this.backContext.translate(this.lineNamesWidth, 0);
    this.horizontalScrollbar.render(this.backContext);
    this.backContext.translate(-this.lineNamesWidth, 0);

    this.backContext.translate(this.lineNamesWidth, this.mapCanvasHeight);
    this.backContext.fillStyle = '#aaa';
    this.backContext.strokeRect(this.alleleCanvasWidth - 10, this.alleleCanvasHeight - 10, 10, 10);
    this.backContext.fillRect(this.alleleCanvasWidth - 10, this.alleleCanvasHeight - 10, 10, 10);
    this.backContext.translate(-this.lineNamesWidth, -this.mapCanvasHeight);
  }

  move(diffX, diffY) {
    this.translatedX -= diffX;
    if (this.translatedX < 0) { this.translatedX = 0; }

    this.translatedY -= diffY;
    if (this.translatedY < 0) { this.translatedY = 0; }

    if ((this.translatedX / this.boxSize) >= ((this.maxCanvasWidth / this.boxSize) - (this.alleleCanvasWidth / this.boxSize))) { this.translatedX = this.maxCanvasWidth - this.alleleCanvasWidth; }
    if ((this.translatedY / this.boxSize) >= ((this.maxCanvasHeight / this.boxSize) - (this.alleleCanvasHeight / this.boxSize))) { this.translatedY = this.maxCanvasHeight - this.alleleCanvasHeight; }

    const scrollHeight = this.alleleCanvasHeight - 10 - 20;
    const scrollWidth = this.alleleCanvasWidth - 10 - 20;

    const mapToRange = (num, inMin, inMax, outMin, outMax) => {
      return (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    };

    const scrollX = Math.floor(mapToRange(this.translatedX, 0, this.maxCanvasWidth - this.alleleCanvasWidth, 0, scrollWidth));
    const scrollY = Math.floor(mapToRange(this.translatedY, 0, this.maxCanvasHeight - this.alleleCanvasHeight, 0, scrollHeight));

    this.verticalScrollbar.move(this.verticalScrollbar.x, scrollY);
    this.horizontalScrollbar.move(scrollX, this.horizontalScrollbar.y);

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
    this.maxCanvasWidth = this.totalMarkers * this.boxSize;
    this.maxCanvasHeight = this.totalLines * this.boxSize;

    this.redraw = true;
    this.prerender();
  }
}
