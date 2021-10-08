import AlphabeticLineSort from './sort/AlphabeticLineSort'
import SimilarityLineSort from './sort/SimilarityLineSort'
import ImportingOrderLineSort from './sort/ImportingOrderLineSort'
import NucleotideColorScheme from './color/NucleotideColorScheme';
import SimilarityColorScheme from './color/SimilarityColorScheme';


export default class CanvasController {
  constructor(genotypeCanvas, overviewCanvas) {
    this.genotypeCanvas = genotypeCanvas;
    this.overviewCanvas = overviewCanvas;
    this.chromosomeIndex = 0;
    this.dragStartX = null;
    this.dragStartY = null;
    this.draggingGenotypeCanvas = false;
    this.draggingVerticalScrollbar = false;
    this.draggingHorizontalScrollbar = false;
    this.draggingOverviewCanvas = false;
    this.contextMenuY = null;

    // Color schemes
    const nucleotideRadio = document.getElementById('nucleotideScheme');
    nucleotideRadio.addEventListener('change', () => {
      const lineSelect = document.getElementById('colorLineSelect');
      lineSelect.disabled = true;

      let colorScheme = new NucleotideColorScheme(this.genotypeCanvas.dataSet);
      colorScheme.setupColorStamps(this.genotypeCanvas.boxSize, this.genotypeCanvas.font, this.genotypeCanvas.fontSize);
      this.genotypeCanvas.setColorScheme(colorScheme);
      this.overviewCanvas.setColorScheme(colorScheme);
    });

    const similarityRadio = document.getElementById('similarityScheme');
    similarityRadio.addEventListener('change', () => {
      const lineSelect = document.getElementById('colorLineSelect');
      lineSelect.disabled = false;

      const referenceName = lineSelect.options[lineSelect.selectedIndex].value;
      const referenceIndex = this.genotypeCanvas.dataSet.germplasmList.findIndex(germplasm => germplasm.name == referenceName)
      
      let colorScheme = new SimilarityColorScheme(this.genotypeCanvas.dataSet, referenceIndex);
      colorScheme.setupColorStamps(this.genotypeCanvas.boxSize, this.genotypeCanvas.font, this.genotypeCanvas.fontSize);
      this.genotypeCanvas.setColorScheme(colorScheme);
      this.genotypeCanvas.setColorComparisonLine(referenceName);
      this.overviewCanvas.setColorScheme(colorScheme);
    });

    const lineSelect = document.getElementById('colorLineSelect');
    lineSelect.addEventListener('change', (event) => {
      this.genotypeCanvas.setColorComparisonLine(event.target.options[event.target.selectedIndex].value);
      this.overviewCanvas.prerender(true);
    });

    // Sort

    const importingOrderRadio = document.getElementById('importingOrderSort');
    importingOrderRadio.addEventListener('change', () => {
      const sortLineSelect = document.getElementById('sortLineSelect');
      sortLineSelect.disabled = true;
      this.genotypeCanvas.setLineSort(new ImportingOrderLineSort());
      this.overviewCanvas.prerender(true);
    });

    const alphabetOrderRadio = document.getElementById('alphabeticSort');
    alphabetOrderRadio.addEventListener('change', () => {
      const sortLineSelect = document.getElementById('sortLineSelect');
      sortLineSelect.disabled = true;
      this.genotypeCanvas.setLineSort(new AlphabeticLineSort());
      this.overviewCanvas.prerender(true);
    });

    const similarityOrderRadio = document.getElementById('similaritySort');
    similarityOrderRadio.addEventListener('change', () => {
      const sortLineSelect = document.getElementById('sortLineSelect');
      sortLineSelect.disabled = false;

      const referenceName = sortLineSelect.options[sortLineSelect.selectedIndex].value;
      this.genotypeCanvas.setLineSort(new SimilarityLineSort(referenceName, [this.chromosomeIndex]));
      this.overviewCanvas.prerender(true);
    });

    const sortLineSelect = document.getElementById('sortLineSelect');
    sortLineSelect.addEventListener('change', (event) => {
      this.genotypeCanvas.setSortComparisonLine(event.target.options[event.target.selectedIndex].value);
      this.overviewCanvas.prerender(true);
    });
  }

  init(dataSet, colorScheme) {
    // Initialize the components
    this.genotypeCanvas.init(dataSet, colorScheme);
    this.genotypeCanvas.prerender(true);
    this.overviewCanvas.init(dataSet, colorScheme);
    this.overviewCanvas.prerender(true);

    // Genotype canvas control
    this.genotypeCanvas.canvas.addEventListener('mousedown', (e) => {
      // The following block of code is used to determine if we are scrolling
      // using the scrollbar widget, rather than grabbing the canvas
      const { x, y } = this.getGenotypeMouseLocation();

      const { verticalScrollbar, horizontalScrollbar } = this.genotypeCanvas;

      if (this.isOverVerticalScrollbar(x, verticalScrollbar)) {
        // Flag to remember that the scrollbar widget was initially clicked on
        // which prevents mouse drift prematurely stopping scrolling from happening
        this.draggingVerticalScrollbar = true;
        this.dragVerticalScrollbar(e.clientY);
      } else if (this.isOverHorizontalScrollbar(y, horizontalScrollbar)) {
        // Flag to remember that the scrollbar widget was initially clicked on
        // which prevents mouse drift prematurely stopping scrolling from happening
        this.draggingHorizontalScrollbar = true;
        this.dragHorizontalScrollbar(e.clientX);
      } else {
        // We are scrolling by grabbing the canvas directly
        this.dragStartX = e.pageX;
        this.dragStartY = e.pageY;
        this.draggingGenotypeCanvas = true;
      }
    });

    this.genotypeCanvas.canvas.addEventListener('mousemove', (e) => {
      const mousePos = this.getGenotypeMouseLocation(e.clientX, e.clientY);
      this.genotypeCanvas.mouseOver(mousePos.x, mousePos.y);
    });

    this.genotypeCanvas.canvas.addEventListener('mouseleave', () => {
      this.genotypeCanvas.mouseOver(undefined, undefined);
    });

    // Overview canvas control
    this.overviewCanvas.canvas.addEventListener('mousedown', (event) => {
      this.setOverviewPosition(event.clientX, event.clientY);
    });

    // Other events
    window.addEventListener('mouseup', () => {
      this.draggingGenotypeCanvas = false;
      this.draggingVerticalScrollbar = false;
      this.draggingHorizontalScrollbar = false;
      this.draggingOverviewCanvas = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.draggingVerticalScrollbar) {
        this.dragVerticalScrollbar(e.clientY);
      } else if (this.draggingHorizontalScrollbar) {
        this.dragHorizontalScrollbar(e.clientX);
      } else if (this.draggingGenotypeCanvas) {
        this.dragCanvas(e.pageX, e.pageY);
      } else if (this.draggingOverviewCanvas) {
        this.setOverviewPosition(e.clientX, e.clientY);
      }
    });
  }

  setChromosome(chromosomeIndex) {
    this.chromosomeIndex = chromosomeIndex;
    this.genotypeCanvas.setChromosome(chromosomeIndex);
    this.overviewCanvas.setChromosome(chromosomeIndex);
  }

  getGenotypeMouseLocation(clientX, clientY) {
    const rect = this.genotypeCanvas.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / (rect.right - rect.left) * this.genotypeCanvas.backBuffer.width;
    const y = (clientY - rect.top) / (rect.bottom - rect.top) * this.genotypeCanvas.backBuffer.height;

    return { x, y };
  }

  getOverviewMouseLocation(clientX, clientY) {
    const rect = this.overviewCanvas.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / (rect.right - rect.left) * this.overviewCanvas.canvas.width;
    const y = (clientY - rect.top) / (rect.bottom - rect.top) * this.overviewCanvas.canvas.height;

    return { x, y };
  }

  isOverVerticalScrollbar(x, verticalScrollbar) {
    return x >= verticalScrollbar.x && x <= verticalScrollbar.x + verticalScrollbar.widget.width;
  }

  isOverHorizontalScrollbar(y, horizontalScrollbar) {
    return y >= horizontalScrollbar.y && y <= horizontalScrollbar.y + horizontalScrollbar.widget.height;
  }

  dragVerticalScrollbar(clientY) {
    // Grab various variables which allow us to calculate the y coordinate
    // relative to the allele canvas
    const rect = this.genotypeCanvas.canvas.getBoundingClientRect();
    const alleleCanvasHeight = this.genotypeCanvas.alleleCanvasHeight();
    const { mapCanvasHeight } = this.genotypeCanvas;
    const rectTop = (rect.top + mapCanvasHeight);
    // Calculate the y coordinate of the mouse on the allele canvas
    const y = (clientY - rectTop) / (rect.bottom - rectTop) * alleleCanvasHeight;
    // Move the vertical scrollbar to coorodinate y
    this.genotypeCanvas.dragVerticalScrollbar(y);
  }

  dragHorizontalScrollbar(clientX) {
    // Grab various variables which allow us to calculate the x coordinate
    // relative to the allele canvas
    const rect = this.genotypeCanvas.canvas.getBoundingClientRect();
    const alleleCanvasWidth = this.genotypeCanvas.alleleCanvasWidth();
    const { nameCanvasWidth } = this.genotypeCanvas;
    const rectLeft = (rect.left + nameCanvasWidth);
    // Calculate the x coordinate of the mouse on the allele canvas
    const x = (clientX - rectLeft) / (rect.right - rectLeft) * alleleCanvasWidth;
    // Move the vertical scrollbar to coorodinate x
    this.genotypeCanvas.dragHorizontalScrollbar(x);
  }

  dragCanvas(x, y) {
    const diffX = x - this.dragStartX;
    const diffY = y - this.dragStartY;
    this.dragStartX = x;
    this.dragStartY = y;

    this.genotypeCanvas.move(diffX, diffY);
  }

  setOverviewPosition(clientX, clientY) {
    const mousePos = this.getOverviewMouseLocation(clientX, clientY);
    const genotypePosition = this.overviewCanvas.mouseDrag(mousePos.x, mousePos.y, this.genotypeCanvas.visibilityWindow());
    this.genotypeCanvas.moveToPosition(genotypePosition.marker, genotypePosition.germplasm);
    this.draggingOverviewCanvas = true;
  }
}
