import AlphabeticLineSort from './sort/AlphabeticLineSort'
import SimilarityLineSort from './sort/SimilarityLineSort'
import ImportingOrderLineSort from './sort/ImportingOrderLineSort'
import TraitLineSort from './sort/TraitLineSort'
import NucleotideColorScheme from './color/NucleotideColorScheme'
import SimilarityColorScheme from './color/SimilarityColorScheme'


export default class CanvasController {
  constructor(container, genotypeCanvas, overviewCanvas, genotypeAutoWidth, overviewAutoWidth, minGenotypeAutoWidth, minOverviewAutoWidth) {
    this.canvasContainer = container;
    this.genotypeCanvas = genotypeCanvas;
    this.overviewCanvas = overviewCanvas;
    this.genotypeAutoWidth = genotypeAutoWidth === undefined ? false : genotypeAutoWidth;
    this.overviewAutoWidth = overviewAutoWidth === undefined ? false : overviewAutoWidth;
    this.minGenotypeAutoWidth = minGenotypeAutoWidth === undefined ? 0 : minGenotypeAutoWidth;
    this.minOverviewAutoWidth = minOverviewAutoWidth === undefined ? 0 : minOverviewAutoWidth;

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
  }

  init(dataSet, colorScheme) {
    // Initialize the components
    this.genotypeCanvas.init(dataSet, colorScheme);
    this.genotypeCanvas.prerender(true);
    this.overviewCanvas.init(dataSet, colorScheme, this.genotypeCanvas.visibilityWindow());
    this.overviewCanvas.prerender(true);

    this.updateAutoWidth();

    window.addEventListener("resize", event => {
      this.updateAutoWidth();
    });

    // Sort
    const sortLineSelect = document.getElementById('sortLineSelect');
    const sortTraitSelect = document.getElementById('sortTraitSelect');

    const importingOrderRadio = document.getElementById('importingOrderSort');
    importingOrderRadio.addEventListener('change', () => {
      sortLineSelect.disabled = true;
      if (sortTraitSelect !== null) sortTraitSelect.disabled = true;
      this.setLineSort(new ImportingOrderLineSort());
    });

    const alphabetOrderRadio = document.getElementById('alphabeticSort');
    alphabetOrderRadio.addEventListener('change', () => {
      sortLineSelect.disabled = true;
      if (sortTraitSelect !== null) sortTraitSelect.disabled = true;
      this.setLineSort(new AlphabeticLineSort());
    });

    const similarityOrderRadio = document.getElementById('similaritySort');
    similarityOrderRadio.addEventListener('change', () => {
      sortLineSelect.disabled = false;
      if (sortTraitSelect !== null) sortTraitSelect.disabled = true;
      
      const referenceName = sortLineSelect.options[sortLineSelect.selectedIndex].value;
      this.setLineSort(new SimilarityLineSort(referenceName, [this.chromosomeIndex]));
    });

    sortLineSelect.addEventListener('change', (event) => {
      if (!sortLineSelect.disabled){
        const referenceName = sortLineSelect.options[sortLineSelect.selectedIndex].value;
        this.setLineSort(new SimilarityLineSort(referenceName, [this.chromosomeIndex]));
      }
    });

    if (dataSet.hasTraits()){
      const traitOrderRadio = document.getElementById('traitSort');
      traitOrderRadio.addEventListener('change', () => {
        sortLineSelect.disabled = true;
        sortTraitSelect.disabled = false;
        
        
      });

      sortTraitSelect.addEventListener('change', (event) => {
        if (!sortTraitSelect.disabled){
          const traitName = sortTraitSelect.options[sortTraitSelect.selectedIndex].value;
          this.setLineSort(new TraitLineSort(traitName));
        }
      });

      const displayTraitSelect = document.getElementById('displayTraitSelect');
      displayTraitSelect.addEventListener('change', (event) => {
        let displayTraits = [];
        for (let option of displayTraitSelect){
          if (option.selected)
            displayTraits.push(option.value);
        }
        this.genotypeCanvas.setDisplayTraits(displayTraits);
      })
    }

    // Set the canvas controls only once we have a valid data set and color scheme
    // If they are set in the constructor, moving the mouse above the canvas before
    // the loading is complete throws errors

    // Genotype canvas control
    this.genotypeCanvas.canvas.addEventListener('mousedown', (e) => {
      // The following block of code is used to determine if we are scrolling
      // using the scrollbar widget, rather than grabbing the canvas
      const { x, y } = this.getGenotypeMouseLocation(e.clientX, e.clientY);

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

  setLineSort(lineSort){
    this.disableCanvas();

    // Yield control to the browser to make a render (to show the grey overlay)
    setTimeout(() => {
      this.genotypeCanvas.setLineSort(lineSort);
      this.overviewCanvas.prerender(true);
      this.enableCanvas();
    }, 4);
  }

  updateAutoWidth() {
    const computedStyles = window.getComputedStyle(this.canvasContainer);
    const autoWidth = this.canvasContainer.clientWidth - parseInt(computedStyles.paddingLeft) - parseInt(computedStyles.paddingRight);
    
    if (this.genotypeAutoWidth){
      const genotypeWidth = Math.max(autoWidth, this.minGenotypeAutoWidth);
      this.genotypeCanvas.setAutoWidth(genotypeWidth);
    }

    if (this.overviewAutoWidth){
      const overviewWidth = Math.max(autoWidth, this.minOverviewAutoWidth);
      this.overviewCanvas.setAutoWidth(overviewWidth);
    }

    // Update the visibilityWindow
    const position = this.genotypeCanvas.currentPosition();
    this.overviewCanvas.moveToPosition(position.marker, position.germplasm, this.genotypeCanvas.visibilityWindow());
  }

  setChromosome(chromosomeIndex) {
    this.chromosomeIndex = chromosomeIndex;
    this.genotypeCanvas.setChromosome(chromosomeIndex);
    this.overviewCanvas.setChromosome(chromosomeIndex);
    this.overviewCanvas.moveToPosition(0, 0, this.genotypeCanvas.visibilityWindow());
  }

  disableCanvas() {
    this.genotypeCanvas.disable();
    this.overviewCanvas.disable();
  }

  enableCanvas(self) {
    this.genotypeCanvas.enable();
    this.overviewCanvas.enable();
  }

  getGenotypeMouseLocation(clientX, clientY) {
    const rect = this.genotypeCanvas.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / (rect.right - rect.left) * this.genotypeCanvas.canvas.width;
    const y = (clientY - rect.top) / (rect.bottom - rect.top) * this.genotypeCanvas.canvas.height;

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
    // Move the vertical scrollbar to coordinate y
    const newPosition = this.genotypeCanvas.dragVerticalScrollbar(y);

    this.overviewCanvas.moveToPosition(newPosition.marker, newPosition.germplasm, this.genotypeCanvas.visibilityWindow());
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
    const newPosition = this.genotypeCanvas.dragHorizontalScrollbar(x);

    this.overviewCanvas.moveToPosition(newPosition.marker, newPosition.germplasm, this.genotypeCanvas.visibilityWindow())
  }

  dragCanvas(x, y) {
    const diffX = x - this.dragStartX;
    const diffY = y - this.dragStartY;
    this.dragStartX = x;
    this.dragStartY = y;

    const newPosition = this.genotypeCanvas.move(diffX, diffY);

    this.overviewCanvas.moveToPosition(newPosition.marker, newPosition.germplasm, this.genotypeCanvas.visibilityWindow());
  }

  // Set the position of the visibility window on the overview canvas
  // The coordinates of the mouse are the center of the window
  setOverviewPosition(clientX, clientY) {
    const mousePos = this.getOverviewMouseLocation(clientX, clientY);
    const genotypePosition = this.overviewCanvas.mouseDrag(mousePos.x, mousePos.y, this.genotypeCanvas.visibilityWindow());
    this.genotypeCanvas.moveToPosition(genotypePosition.marker, genotypePosition.germplasm);
    this.draggingOverviewCanvas = true;
  }
}
