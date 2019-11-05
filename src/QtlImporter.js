import Qtl from './Qtl';

export default class QtlImporter {
  constructor() {
    this.qtls = [];
    this.qtlMap = new Map();
  }

  processQtlFileLine(line) {
    if (line.startsWith('#') || (!line || line.length === 0) || line.startsWith('\t')) {
      return;
    }
    
    const tokens = line.split('\t');
    // TODO: re-implement check that qtl is on a chromosome that we have once we
    // implement full map loading as opposed to simply marker loading.
    // if (chromosomes.has(tokens[1]) === false) {
    //   return;
    // }

    let name = tokens[0];
    name = name.slice(0, (name.lastIndexOf('.')));

    let qtl;
    if (this.qtlMap.has(name)) {
      qtl = this.qtlMap.get(name);
    } else {
      qtl = new Qtl(name, tokens[1], parseInt(tokens[2].replace(/,/g, ''), 10), parseInt(tokens[3].replace(/,/g, ''), 10), parseInt(tokens[4].replace(/,/g, ''), 10));
    }
    if (qtl.min > tokens[3]) {
      qtl.min = parseInt(tokens[3].replace(/,/g, ''), 10);
    }
    if (qtl.max < tokens[4]) {
      qtl.max = parseInt(tokens[4].replace(/,/g, ''), 10);
    }

    this.qtlMap.set(name, qtl);
  }

  compareQtl(qtlA, qtlB) {
    if (qtlA.min < qtlB.min) {
      return -1;
    }
    if (qtlA.min > qtlB.min) {
      return 1;
    }
    return 0;
  }

  parseFile(fileContents) {
    const qtlData = fileContents.split(/\r?\n/);
    for (let qtl = 0; qtl < qtlData.length; qtl += 1) {
      this.processQtlFileLine(qtlData[qtl]);
    }

    this.qtls = Array.from(this.qtlMap.values());
    this.qtls.sort(this.compareQtl);
  }
}
