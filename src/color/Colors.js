

export function buildCSSColors (colors){
  let cssColors = {}
  for (let name of Object.keys(colors)){
    let color = colors[name];
    if (color.length > 3){
      cssColors[name] = 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + color[3] + ')';
    } else {
      cssColors[name] = 'rgb(' + color[0] + "," + color[1] + "," + color[2] + ')';
    }
  }
  return cssColors;
}