export default class SimilarityColorScheme {
  constructor(dataSet, compIndex) {
    this.dataSet = dataSet;
    this.stateTable = this.dataSet.stateTable;
    // Line index of the line to be compared against
    this.compIndex = compIndex;

    this.colors = {
      compGreenLight: 'rgb(90,180,90)',
      compGreenDark: 'rgb(50,100,50)',
      greenLight: 'rgb(171,255,171)',
      greenDark: 'rgb(86,179,86)',
      redLight: 'rgb(255,171,171)',
      redDark: 'rgb(179,86,86)',
      white: 'rgb(255,255,255)',
      greyLight: 'rgb(210,210,210)',
      greyDark: 'rgb(192,192,192)',
    };

    // These are the cases for establishing similarity to a given line
    this.misMatch = 0;
    this.compLine = 1;
    this.matchComp = 2;
    this.het1Match = 3;
    this.het2Match = 4;
    this.greyState = 5;

    const { size } = this.stateTable;

    // Create this lookup table once which establishes which class of color stamp
    // we should use for a given comparison between lines
    this.lookupTable = this.createLookupTable(size);

    // An array of color stamps for each class of comparison
    this.compStamps = [size];
    this.matchStamps = [size];
    this.misMatchStamps = [size];
    this.het1MatchStamps = [size];
    this.het2MatchStamps = [size];
    this.greyStamps = [size];
  }

  createLookupTable(length) {
    const table = Array.from(Array(length), () => new Array(length));
    const stateTableKeys = Array.from(this.stateTable.keys());

    for (let i = 0; i < length; i += 1) {
      for (let j = 0; j < length; j += 1) {
        // Default to misMatch
        table[i][j] = this.misMatch;

        // States match
        if (i === j) {
          table[i][j] = this.matchComp;
        } else {
          const iStateKey = stateTableKeys[i];
          const iStateValue = this.stateTable.get(iStateKey);
          const jStateKey = stateTableKeys[j];
          const jStateValue = this.stateTable.get(jStateKey);

          // Either state is missing
          if (iStateValue === 0 || jStateValue === 0) {
            table[i][j] = this.greyState;
            // Our state is homozygous and the comparison state is heterozygous 
          } else if (iStateKey.isHomozygous && !jStateKey.isHomozygous) {
            // if we match either allele in the comparison state give this the match class
            if (iStateKey.allele1 === jStateKey.allele1 || iStateKey.allele1 === jStateKey.allele2) {
              table[i][j] = this.matchComp;
              // Our state is het and comp state is homozygous
            } else if (!iStateKey.isHomozygous && jStateKey.isHomozygous) {
              // First allele matches
              if (iStateKey.allele1 === jStateKey.allele1) {
                table[i][j] = this.het1Match;
                // Second allele matches
              } else if (iStateKey.allele2 === jStateKey.allele1) {
                table[i][j] = this.het2Match;
              }
              // Neither state is honozygous
            } else if (!iStateKey.isHomozygous && !jStateKey.isHomozygous) {
              // First allele matches
              if (iStateKey.allele1 === jStateKey.allele1 || iStateKey.allele1 === jStateKey.allele2) {
                table[i][j] = this.het1Match;
                // Second allele matches
              } else if (iStateKey.allele2 === jStateKey.allele1 || iStateKey.allele2 === jStateKey.allele2) {
                table[i][j] = this.het2Match;
              }
            }
          }
        }
      }
    }
    return table;
  }

  getState(germplasm, chromosome, marker) {
    const compState = this.dataSet.genotypeFor(this.compIndex, chromosome, marker);
    const genoState = this.dataSet.genotypeFor(germplasm, chromosome, marker);

    let stamp;

    // Use the lookup value to determine which class of color stamps we should
    // return
    const lookupValue = this.lookupTable[genoState][compState];

    if (this.compIndex === germplasm) {
      stamp = this.compStamps[genoState];
    } else if (lookupValue === this.misMatch) {
      stamp = this.misMatchStamps[genoState];
    } else if (lookupValue === this.compLine) {
      stamp = this.compStamps[genoState];
    } else if (lookupValue === this.matchComp) {
      stamp = this.matchStamps[genoState];
    } else if (lookupValue === this.het1Match) {
      stamp = this.het1Match[genoState];
    } else if (lookupValue === this.het2Match) {
      stamp = this.het2MatchStamps[genoState];
    } else if (lookupValue === this.greyState) {
      stamp = this.greyStamps[genoState];
    }

    return stamp;
  }

  // Generates a set of homozygous and heterozygous color stamps from the stateTable
  setupColorStamps(size, font, fontSize) {
    const length = this.stateTable.size;
    this.compStamps = [length];
    this.matchStamps = [length];
    this.misMatchStamps = [length];
    this.het1MatchStamps = [length];
    this.het2MatchStamps = [length];
    this.greyStamps = [length];

    let index = 0;
    this.stateTable.forEach((value, genotype) => {
      if (genotype.isHomozygous) {
        this.compStamps[index] = this.drawGradientSquare(size, genotype, font, fontSize, this.colors.compGreenLight, this.colors.compGreenDark);
        this.matchStamps[index] = this.drawGradientSquare(size, genotype, font, fontSize, this.colors.greenLight, this.colors.greenDark);
        this.misMatchStamps[index] = this.drawGradientSquare(size, genotype, font, fontSize, this.colors.redLight, this.colors.redDark);
        this.greyStamps[index] = this.drawGradientSquare(size, genotype, font, fontSize, this.colors.greyLight, this.colors.greyDark);
      } else {
        this.compStamps[index] = this.drawHetSquare(size, genotype, font, fontSize, this.colors.compGreenLight, this.colors.compGreenDark, this.colors.compGreenLight, this.colors.compGreenDark);
        this.matchStamps[index] = this.drawHetSquare(size, genotype, font, fontSize, this.colors.greenLight, this.colors.greenDark, this.colors.greenLight, this.colors.greenDark);
        this.misMatchStamps[index] = this.drawHetSquare(size, genotype, font, fontSize, this.colors.redLight, this.colors.redDark, this.colors.redLight, this.colors.redDark);
        this.het1MatchStamps[index] = this.drawHetSquare(size, genotype, font, fontSize, this.colors.greenLight, this.colors.greenDark, this.colors.redLight, this.colors.redDark);
        this.het2MatchStamps[index] = this.drawHetSquare(size, genotype, font, fontSize, this.colors.redLight, this.colors.redDark, this.colors.greenLight, this.colors.greenDark);
        this.greyStamps[index] = this.drawHetSquare(size, genotype, font, fontSize, this.colors.greyLight, this.colors.greyDark, this.colors.greyLight, this.colors.greyDark);
      }
      index += 1;
    });
  }

  drawGradientSquare(size, genotype, font, fontSize, colorLight, colorDark) {
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = size;
    gradCanvas.height = size;
    const gradientCtx = gradCanvas.getContext('2d');

    if (genotype.allele1 === '') {
      colorLight = colorDark = this.colors.white;
    }

    const lingrad = gradientCtx.createLinearGradient(0, 0, size, size);
    lingrad.addColorStop(0, colorLight);
    lingrad.addColorStop(1, colorDark);
    gradientCtx.fillStyle = lingrad;
    gradientCtx.fillRect(0, 0, size, size);

    gradientCtx.fillStyle = 'rgb(0,0,0)';
    gradientCtx.font = font;
    if (size >= 10) {
      const textWidth = gradientCtx.measureText(genotype.allele1).width;
      gradientCtx.fillText(genotype.getText(), (size - textWidth) / 2, (size - (fontSize / 2)));
    }

    return gradCanvas;
  }

  drawHetSquare(size, genotype, font, fontSize, color1Light, color1Dark, color2Light, color2Dark) {
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = size;
    gradCanvas.height = size;
    const gradientCtx = gradCanvas.getContext('2d');

    if (genotype.allele1 === '') {
      color1Light = color1Dark = color2Light = color2Dark = this.colors.white;
    }

    const lingrad = gradientCtx.createLinearGradient(0, 0, size, size);
    lingrad.addColorStop(0, color1Light);
    lingrad.addColorStop(1, color1Dark);
    gradientCtx.fillStyle = lingrad;
    gradientCtx.beginPath();
    gradientCtx.lineTo(size, 0);
    gradientCtx.lineTo(0, size);
    gradientCtx.lineTo(0, 0);
    gradientCtx.fill();

    const lingrad2 = gradientCtx.createLinearGradient(0, 0, size, size);
    lingrad2.addColorStop(0, color2Light);
    lingrad2.addColorStop(1, color2Dark);
    gradientCtx.fillStyle = lingrad2;
    gradientCtx.beginPath();
    gradientCtx.moveTo(size, 0);
    gradientCtx.lineTo(size, size);
    gradientCtx.lineTo(0, size);
    gradientCtx.lineTo(size, 0);
    gradientCtx.fill();

    gradientCtx.fillStyle = 'rgb(0,0,0)';
    gradientCtx.font = font;
    if (size >= 10) {
      const allele1Width = gradientCtx.measureText(genotype.allele1).width;
      gradientCtx.fillText(genotype.allele1, ((size / 2) - allele1Width) / 2, fontSize);
      const allele2Width = gradientCtx.measureText(genotype.allele2).width;
      gradientCtx.fillText(genotype.allele2, size - ((size / 2) + allele2Width) / 2, size - (fontSize / 4));
    }

    return gradCanvas;
  }
}
