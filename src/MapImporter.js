import Marker from './Marker';

export default class MapImporter {
  constructor() {
    this.markerNames = [];
    this.markerData = [];
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

      this.markerNames.push(markerName);
      const marker = new Marker(markerName, tokens[1], parseInt(tokens[2].replace(/,/g, ''), 10));
      this.markerData.push(marker);
    }
  }

  parseFile(fileContents) {
    const markers = fileContents.split(/\r?\n/);
    for (let marker = 0; marker < markers.length; marker += 1) {
      this.processMapFileLine(markers[marker]);
    }
  }
}
