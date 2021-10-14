import {similarityCases} from '../Similarity'
import {buildCSSColors} from './Colors'

export default class SimilarityColorScheme {
  constructor(dataSet, compIndex) {
    this.dataSet = dataSet;
    this.stateTable = this.dataSet.stateTable;
    this.lookupTable = this.dataSet.similarityLookupTable;
    // Line index of the line to be compared against
    this.compIndex = compIndex;

    this.colors = {
      compGreenLight: [90, 180, 90],
      compGreenDark: [50, 100, 50],
      greenLight: [171, 255, 171],
      greenDark: [86, 179, 86],
      redLight: [255, 171, 171],
      redDark: [179, 86, 86],
      white: [255, 255, 255],
      greyLight: [210, 210, 210],
      greyDark: [192, 192, 192],
      heterozygotePrimary: [100, 100, 100],
    };

    this.cssColors = buildCSSColors(this.colors);

    const { size } = this.stateTable;

    // An array of color stamps for each class of comparison
    this.compStamps = [size];
    this.matchStamps = [size];
    this.misMatchStamps = [size];
    this.het1MatchStamps = [size];
    this.het2MatchStamps = [size];
    this.greyStamps = [size];
  }

  getColor(germplasm, chromosome, marker, highlightReference){
    const compState = this.dataSet.genotypeFor(this.compIndex, chromosome, marker);
    const genoState = this.dataSet.genotypeFor(germplasm, chromosome, marker);
    const lookupValue = this.lookupTable[genoState][compState];

    if (genoState === 0){
      return this.colors.white;
    } else if (this.compIndex === germplasm && highlightReference) {
      return this.colors.compGreenLight;
    } else {
      switch (lookupValue){
        case similarityCases.misMatch:
          return this.colors.redLight;
        case similarityCases.comparisonLine:
          return this.colors.compGreenLight;
        case similarityCases.fullMatch:
          return this.colors.greenLight;
        case similarityCases.heterozygote1Match:
        case similarityCases.heterozygote2Match:
          return this.colors.heterozygotePrimary;
        case similarityCases.missing:
          return this.colors.greyDark;
      }
    }
  }

  getState(germplasm, chromosome, marker) {
    let stamp;
    const compState = this.dataSet.genotypeFor(this.compIndex, chromosome, marker);
    const genoState = this.dataSet.genotypeFor(germplasm, chromosome, marker);
    const lookupValue = this.lookupTable[genoState][compState];

    if (this.compIndex === germplasm) {
      stamp = this.compStamps[genoState];
    } else {
      switch (lookupValue){
        case similarityCases.misMatch:
          stamp = this.misMatchStamps[genoState]; break;
        case similarityCases.comparisonLine:
          stamp = this.compStamps[genoState]; break;
        case similarityCases.fullMatch:
          stamp = this.matchStamps[genoState]; break;
        case similarityCases.heterozygote1Match:
          stamp = this.het1MatchStamps[genoState]; break;
        case similarityCases.heterozygote2Match:
          stamp = this.het2MatchStamps[genoState]; break;
        case similarityCases.missing:
          stamp = this.greyStamps[genoState]; break;
      }
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
        this.compStamps[index] = this.drawGradientSquare(size, genotype, font, fontSize, this.cssColors.compGreenLight, this.cssColors.compGreenDark);
        this.matchStamps[index] = this.drawGradientSquare(size, genotype, font, fontSize, this.cssColors.greenLight, this.cssColors.greenDark);
        // Homozygotes compared to heterozygotes show as a match, but retain a half-point for similarity score
        this.het1MatchStamps[index] = this.drawGradientSquare(size, genotype, font, fontSize, this.cssColors.greenLight, this.cssColors.greenDark);
        this.het2MatchStamps[index] = this.drawGradientSquare(size, genotype, font, fontSize, this.cssColors.greenLight, this.cssColors.greenDark);
        this.misMatchStamps[index] = this.drawGradientSquare(size, genotype, font, fontSize, this.cssColors.redLight, this.cssColors.redDark);
        this.greyStamps[index] = this.drawGradientSquare(size, genotype, font, fontSize, this.cssColors.greyLight, this.cssColors.greyDark);
      } else {
        this.compStamps[index] = this.drawHetSquare(size, genotype, font, fontSize, this.cssColors.compGreenLight, this.cssColors.compGreenDark, this.cssColors.compGreenLight, this.cssColors.compGreenDark);
        this.matchStamps[index] = this.drawHetSquare(size, genotype, font, fontSize, this.cssColors.greenLight, this.cssColors.greenDark, this.cssColors.greenLight, this.cssColors.greenDark);
        this.misMatchStamps[index] = this.drawHetSquare(size, genotype, font, fontSize, this.cssColors.redLight, this.cssColors.redDark, this.cssColors.redLight, this.cssColors.redDark);
        this.het1MatchStamps[index] = this.drawHetSquare(size, genotype, font, fontSize, this.cssColors.greenLight, this.cssColors.greenDark, this.cssColors.redLight, this.cssColors.redDark);
        this.het2MatchStamps[index] = this.drawHetSquare(size, genotype, font, fontSize, this.cssColors.redLight, this.cssColors.redDark, this.cssColors.greenLight, this.cssColors.greenDark);
        this.greyStamps[index] = this.drawHetSquare(size, genotype, font, fontSize, this.cssColors.greyLight, this.cssColors.greyDark, this.cssColors.greyLight, this.cssColors.greyDark);
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
      colorLight = colorDark = this.cssColors.white;
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
      color1Light = color1Dark = color2Light = color2Dark = this.cssColors.white;
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

  setComparisonLineIndex(newIndex) {
    this.compIndex = newIndex;
  }
}
