import IntervalTree from 'node-interval-tree';

export default class GenomeMap {
  constructor(chromosomes) {
    this.chromosomes = chromosomes;
    // TODO: initialise this value
    this.intervalTree = this.createIntervalTree();
    this.chromosomeStarts = this.calculateChromosomeStarts();
  }

  // Creates an interval tree where the key is the range of the start and end of
  // a chromosome in the total marker data set and the value is that chromosome
  createIntervalTree() {
    const tree = new IntervalTree();
    let sum = 0;
    this.chromosomes.forEach((c) => {
      const markerCount = c.markerCount();
      tree.insert(sum, sum + markerCount - 1, c);
      sum += markerCount;
    });

    return tree;
  }

  calculateChromosomeStarts() {
    const starts = new Map();
    let sum = 0;
    this.chromosomes.forEach((c) => {
      starts.set(c, sum);
      sum += c.markerCount();
    });

    return starts;
  }

  markersFor(dataStart, dataEnd) {
    const found = this.intervalTree.search(dataStart, dataEnd);
    const foundMarkers = [];
    found.forEach((chromosome) => {
      const chromStart = this.chromosomeStarts.get(chromosome);
      const firstMarker = Math.max(dataStart - chromStart, 0);
      const lastMarker = Math.min(chromosome.markerCount(), dataEnd - chromStart);
      foundMarkers.push({ markers: chromosome.markers.slice(firstMarker, lastMarker) });
    });

    return foundMarkers;
  }

  markerByName(markerName) {
    let found = -1;
    this.chromosomes.forEach((chromosome, idx) => {
      const markerIndex = chromosome.markers.map(m => m.name).indexOf(markerName);
      if (markerIndex !== -1) {
        found = { chromosome: idx, markerIndex };
      }
    });

    return found;
  }

  totalMarkerCount() {
    return this.chromosomes.map(c => c.markerCount()).reduce((a, b) => a + b, 0);
  }
}
