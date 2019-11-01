import { describe, before, it } from 'mocha';
import { expect } from 'chai';

import Genotype, { fromString } from '../src/Genotype';

let homozygousA;
let heterozygousAT;
let hetNoSepProvided;
let hetNoSep;

describe('Genotype', () => {
  before(() => {
    homozygousA = Genotype.fromString('A');
    heterozygousAT = Genotype.fromString('A/T', '/');
    hetNoSepProvided = Genotype.fromString('A/T');
    hetNoSep = Genotype.fromString('AT', '');
  });

  describe('#fromString()', () => {
    it('should have a value of A for allele1 if A is passed in', () => {
      expect(Genotype.fromString('A').allele1).to.equal('A');
    });

    it('should have a value of A for allele2 if A is passed in', () => {
      expect(homozygousA.allele2).to.equal('A');
    });

    it('should be homozygous when A is passed in', () => {
      expect(homozygousA.isHomozygous).to.be.true;
    });

    it('should have a value of A for allele1 if A/T is passed in', () => {
      expect(heterozygousAT.allele1).to.equal('A');
    });

    it('should have a value of T for allele2 if A is passed in', () => {
      expect(heterozygousAT.allele2).to.equal('T');
    });

    it('should be heterozygous when A/T is passed in', () => {
      expect(heterozygousAT.isHomozygous).to.be.false;
    });

    it('should be heterozygous when A/T is passed in with no separator', () => {
      expect(hetNoSepProvided.isHomozygous).to.be.false;
    });

    it('should be heterozygous when AT is passed in with an empty separator', () => {
      expect(hetNoSep.isHomozygous).to.be.false;
    });

    it('should throw an error when AAA is passed in', () => {
      expect(() => Genotype.fromString('AAA')).to.throw();
    });
  });

  describe('#getText()', () => {
    it('should return A when the genotype is A', () => {
      expect(homozygousA.getText()).to.equal('A');
    });

    it('should return A/T when the genotype is A/T', () => {
      expect(heterozygousAT.getText()).to.equal('A/T');
    });

    it('should return A/T when the genotype is A/T (no separator provided)', () => {
      expect(hetNoSepProvided.getText()).to.equal('A/T');
    });

    it('should return A/T when the input string is AT (no separator provided)', () => {
      expect(hetNoSep.getText()).to.equal('A/T');
    });
  });
});
