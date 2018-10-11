export default class CanvasController {
  constructor(genotypeCanvas) {
    this.genotypeCanvas = genotypeCanvas;
    this.dragStartX = null;
    this.dragStartY = null;
    this.dragging = false;

    this.genotypeCanvas.canvas.addEventListener('mousedown', (e) => {
      this.dragStartX = e.pageX;
      this.dragStartY = e.pageY;
      this.dragging = true;
    });

    this.genotypeCanvas.canvas.addEventListener('mousemove', (e) => {
      const rect = this.genotypeCanvas.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (rect.right - rect.left) * this.genotypeCanvas.backBuffer.width;
      const y = (e.clientY - rect.top) / (rect.bottom - rect.top) * this.genotypeCanvas.backBuffer.height;
      this.genotypeCanvas.mouseOver(x, y);
    });

    this.genotypeCanvas.canvas.addEventListener('mouseleave', () => {
      this.genotypeCanvas.mouseOver(undefined, undefined);
    });

    window.addEventListener('mouseup', () => { this.dragging = false; });

    window.addEventListener('mousemove', (e) => {
      if (this.dragging) {
        const diffX = e.pageX - this.dragStartX;
        const diffY = e.pageY - this.dragStartY;
        this.dragStartX = e.pageX;
        this.dragStartY = e.pageY;
  
        this.genotypeCanvas.move(diffX, diffY);
      }
    });
  }
}