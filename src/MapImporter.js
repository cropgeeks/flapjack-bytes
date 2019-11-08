import Marker from './Marker';
import Chromosome from './Chromosome';
import GenomeMap from './GenomeMap';

export default class MapImporter {
  constructor() {
    this.markerNames = [];
    this.markerData = [];
    this.chromosomeNames = new Set();
  }

  processMapFileLine(line) {
    if (line.startsWith('#') || (!line || line.length === 0) || line.startsWith('\t')) {
      return;
    }

    // Only parse our default map file lines (i.e. not the special fixes for
    // exactly specifying the chromosome length)
    // http://flapjack.hutton.ac.uk/en/latest/projects_&_data_formats.html#data-sets-maps-and-genotypes
    const tokens = line.split('\t');
    if (tokens.length === 3) {
      const markerName = tokens[0];
      const chromosome = tokens[1];
      const pos = tokens[2];

      // Keep track of the chromosomes that we've found
      this.chromosomeNames.add(chromosome);

      // Create a marker object and add it to our array of markers
      const marker = new Marker(markerName, chromosome, parseInt(pos.replace(/,/g, ''), 10));
      this.markerData.push(marker);
    }
  }

  createMap() {
    const chromosomes = [];
    this.chromosomeNames.forEach((name) => {
      const chromosomeMarkers = this.markerData.filter(m => m.chromosome === name);
      const markerPositions = chromosomeMarkers.map(marker => marker.position);
      const chromosomeEnd = Math.max(...markerPositions);
      const chromosome = new Chromosome(name, chromosomeEnd, chromosomeMarkers);
      chromosomes.push(chromosome);
    });

    return new GenomeMap(chromosomes);
  }

  parseFile(fileContents) {
    const markers = fileContents.split(/\r?\n/);
    for (let marker = 0; marker < markers.length; marker += 1) {
      this.processMapFileLine(markers[marker]);
    }

    const map = this.createMap();

    return map;
  }
}
