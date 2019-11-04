import Genotype from './Genotype';

export default class GenotypeImporter {
  constructor() {
    this.rawToGenoMap = new Map();
    this.rawToGenoMap.set('', Genotype.fromString(''));
    this.stateTable = new Map();
    this.stateTable.set(this.rawToGenoMap.get(''), 0);
    this.lineNames = [];
    this.lineData = [];
  }

  getState(genoString) {
    let index = 0;
    try {
      let genotype = this.rawToGenoMap.get(genoString);
      if (genotype === undefined) {
        genotype = Genotype.fromString(genoString);
        this.rawToGenoMap.set(genoString, genotype);
      }

      index = this.stateTable.get(genotype);

      // If the genotype is not found in the map, we have a new genotype, so set
      // its index in the map to the size of the map
      if (index === undefined) {
        index = this.stateTable.size;
        this.stateTable.set(genotype, index);
      }
    } catch (error) {
      console.log(error);
    }
    return index;
  }

  processFileLine(line) {
    if (line.startsWith('#') || (!line || line.length === 0) || line.startsWith('Accession') || line.startsWith('\t')) {
      return;
    }
    const tokens = line.split('\t');
    const lineName = tokens[0];
    const data = tokens.slice(1).map(this.getState.bind(this));
    this.lineNames.push(lineName);
    this.lineData.push(data);
  }

  parseFile(fileContents) {
    const lines = fileContents.split(/\r?\n/);
    for (let line = 0; line < lines.length; line += 1) {
      this.processFileLine(lines[line]);
    }
  }
}
