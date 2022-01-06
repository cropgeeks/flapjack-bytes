export const TraitType = {
  Category: 0,
  Numerical: 1,
};

// Colors are stored as HSV (hue, saturation, value)
const DEFAULT_HUE_MIN = 0;
const DEFAULT_HUE_MAX = 120;
const DEFAULT_SATURATION = 0.53;
const DEFAULT_VALUE = 1;
const DEFAULT_GRADIENT_MIN = [DEFAULT_HUE_MIN, DEFAULT_SATURATION, DEFAULT_VALUE];
const DEFAULT_GRADIENT_MAX = [DEFAULT_HUE_MAX, DEFAULT_SATURATION, DEFAULT_VALUE];


export class Trait {
  constructor (name, type, experiment) {
    this.name = name;
    this.type = type;
    this.experiment = experiment;
    this.values = undefined;
    this.colors = new Map();
    this.customColors = new Set();
    this.longestValue = undefined;
    this.minValue = undefined;
    this.maxValue = undefined;
  }

  setValues (values) {
    this.values = values;
  }

  setScale (min, max) {
    this.minValue = min;
    this.maxValue = max;

    if (this.type == TraitType.Category) {
      this.setCategoryColors();
    } else if (this.type == TraitType.Numerical) {
      this.color.set(this.minValue, DEFAULT_GRADIENT_MIN);
      this.color.set(this.maxValue, DEFAULT_GRADIENT_MAX);
    }
  }

  setCategoryColors() {
    const sortedValues = this.values.slice();
    for (let valueIndex = 0; valueIndex < this.values.length; valueIndex++) {
      const value = this.values[valueIndex];
      const index = sortedValues.indexOf(value);
      const hue = (DEFAULT_HUE_MAX - DEFAULT_HUE_MIN) * index/(sortedValues.length-1) + DEFAULT_HUE_MIN;
      this.colors.set(valueIndex, [hue, DEFAULT_SATURATION, DEFAULT_VALUE]);
    }
  }

  scaleValue (value) {
    return (value - this.minValue) / (this.maxValue - this.minValue);
  }

  getValue (value) {
    if (this.type == TraitType.Category) {
      return this.values[value];
    } else {
      return value;
    }
  }

  getValues() {
    if (this.type == TraitType.Category)
      return this.values.slice();
    else
      return [this.minValue, this.maxValue]
  }

  getMinColor() {
    return this.getColor(this.minValue);
  }

  getMaxColor() {
    return this.getColor(this.maxValue);
  }

  getColor(value) {
    let hsv = null;
    if (this.type == TraitType.Category) {
      hsv = this.colors.get(value);
    } else {
      const minColor = this.colors.get(this.minValue);
      const maxColor = this.colors.get(this.maxValue);
      const normalized = this.scaleValue(value);
      hsv = [
        (maxColor[0] - minColor[0]) * normalized + minColor[0],
        (maxColor[1] - minColor[1]) * normalized + minColor[1],
        (maxColor[2] - minColor[2]) * normalized + minColor[2],
      ];
    }
    const rgb = this.hsv2rgb(hsv[0], hsv[1], hsv[2]);
    const hexa = '#' + ((1 << 24) | (Math.floor(rgb[0] * 255) << 16) | (Math.floor(rgb[1] * 255) << 8) | Math.floor(rgb[2] * 255)).toString(16).slice(1);
    return hexa;
  }

  setMinColor(color) {
    this.setColor(this.minValue, color);
  }

  setMaxColor(color) {
    this.setColor(this.maxValue, color);
  }

  setColor(value, color) {
    const rgb = [parseInt(color.slice(1, 3), 16) / 255, parseInt(color.slice(3, 5), 16) / 255, parseInt(color.slice(5, 7), 16) / 255];
    const hsv = this.rgb2hsv(rgb[0], rgb[1], rgb[2]);
    this.colors.set(value, hsv);
    this.customColors.add(value);
  }

  setHSVColor(value, color) {
    this.colors.set(value, color);
    this.customColors.add(value);
  }

  getCustomColors() {
    const customMap = new Map();
    for (let value of this.customColors) {
      const color = this.colors.get(value);
      customMap.set(value, color);
    }
    return customMap;
  }

  // From https://stackoverflow.com/a/54024653
  hsv2rgb(h, s, v) {
    let f = (n, k = (n + h/60) % 6) => v - v*s*Math.max(Math.min(k, 4-k, 1), 0);
    return [f(5), f(3), f(1)];       
  }

  // From https://stackoverflow.com/a/54070620
  rgb2hsv(r, g, b) {
    let v = Math.max(r, g, b)
    let c = v-Math.min(r, g, b);
    let h = c && ((v == r) ? (g-b)/c : ((v == g) ? 2 + (b-r)/c : 4 + (r-g)/c)); 
    return [60*(h<0 ? h+6 : h), v&&c / v, v];
  }
};