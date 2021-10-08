
const similarityCases = {
  misMatch: 0,
  comparisonLine: 1,
  fullMatch: 2,
  heterozygote1Match: 3,
  heterozygote2Match: 4,
  missing: 5,
};

const similarityScores = new Map([
  [similarityCases.misMatch, 0],
  [similarityCases.comparisonLine, 1],
  [similarityCases.fullMatch, 1],
  [similarityCases.heterozygote1Match, 0.5],
  [similarityCases.heterozygote2Match, 0.5],
  [similarityCases.missing, 0],
]);

/**
 * Build a lookup table for genotypes similarity
 * All existing genotypes are identified once in the stateTable, as a genotype -> index mapping, where indices are sequential
 * This builds a matrix that gives the similarity case from two genotype indices
 * */
function buildSimilarityLookupTable(stateTable){
  const length = stateTable.size;
  const table = Array.from(Array(length), () => new Array(length));

  // As a Map is ordered and indices are sequential, this gives the index -> genotype mapping, inverse of stateTable
  const stateTableKeys = Array.from(stateTable.keys());

  for (let i = 0; i < length; i += 1) {
    for (let j = 0; j < length; j += 1) {
      // Default to misMatch
      table[i][j] = similarityCases.misMatch;

      const iStateKey = stateTableKeys[i];
      const iStateValue = stateTable.get(iStateKey);
      const jStateKey = stateTableKeys[j];
      const jStateValue = stateTable.get(jStateKey);

      // Either state is missing
      if (iStateValue === 0 || jStateValue === 0) {
        table[i][j] = similarityCases.missing;
      // Same state
      } else if (i === j) {
        table[i][j] = similarityCases.fullMatch;
      } else {
        // Our state is homozygous and the comparison state is heterozygous 
        if (iStateKey.isHomozygous && !jStateKey.isHomozygous) {
          // if we match either allele in the comparison state give this the match class
          if (iStateKey.allele1 === jStateKey.allele1 || iStateKey.allele1 === jStateKey.allele2) {
            table[i][j] = similarityCases.fullMatch;
            
          }
        // Our state is het and comp state is homozygous
        } else if (!iStateKey.isHomozygous && jStateKey.isHomozygous) {
          // First allele matches
          if (iStateKey.allele1 === jStateKey.allele1 || iStateKey.allele1 === jStateKey.allele2) {
            table[i][j] = similarityCases.heterozygote1Match;
            // Second allele matches
          } else if (iStateKey.allele2 === jStateKey.allele1 || iStateKey.allele2 === jStateKey.allele2) {
            table[i][j] = similarityCases.heterozygote2Match;
          }
        // Neither state is homozygous
        } else if (!iStateKey.isHomozygous && !jStateKey.isHomozygous) {
          // First allele matches
          if (iStateKey.allele1 === jStateKey.allele1 || iStateKey.allele1 === jStateKey.allele2) {
            table[i][j] = similarityCases.heterozygote1Match;
          // Second allele matches
          } else if (iStateKey.allele2 === jStateKey.allele1 || iStateKey.allele2 === jStateKey.allele2) {
            table[i][j] = similarityCases.heterozygote2Match;
          }
        }
      }
    }
  }
  return table;
}

// Calculate the similarity score for two full germplasms
function germplasmSimilarityScore(dataSet, referenceIndex, comparedIndex, chromosomes){
  if (!chromosomes || chromosomes.length == 0) return 0;
  let score = 0;
  let markerCount = 0;
  let referenceGermplasm = dataSet.germplasmList[referenceIndex];
  for (let chromosome of chromosomes){
    for (let marker in referenceGermplasm.genotypeData[chromosome]){
      let reference = dataSet.genotypeFor(referenceIndex, chromosome, marker);
      let compared = dataSet.genotypeFor(comparedIndex, chromosome, marker);
      let similarityCase = dataSet.similarityLookupTable[compared][reference];
      score += similarityScores.get(similarityCase);
    }
    markerCount += referenceGermplasm.genotypeData[chromosome].length;
  }
  return score / markerCount;
}

export {similarityCases, buildSimilarityLookupTable, germplasmSimilarityScore};