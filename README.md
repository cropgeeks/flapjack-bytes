# flapjack-bytes

## Overview
A JavaScript and HTML5 Canvas based graphical genotype visualization library. 
The visualization is modelled on our pre-existing Java desktop application 
[Flapjack](https://ics.hutton.ac.uk/flapjack). Flapjack-Bytes allows you to
view graphical gentoype data coloured either by state, or, by similarity to
another line in the dataset. You can optionally import a genome map to see
a multiple-chromosome view of the data. 

![Flapjack Bytes](/docs/images/flapjack-bytes.png)

The Flapjack-Bytes library support loading data from files on your computer,
from URL (has to be CORS compliant, or on the same host), or via 
[BrAPI](https://brapi.org) compliant resources.

An example of Flapjack-Bytes deployed against the
[GOBii](http://cbsugobii05.biohpc.cornell.edu/wordpress/) project's development
API can be found at: http://bioinf.hutton.ac.uk/gobii-flapjack-bytes.

## Features

- Visualization of genotype data, either in the context of a genomic map, or
not.
- Load data from [BrAPI](https://brapi.org) enabled resources, files on your
local computer, or via URL.
- Multiple colour schemes; the default Nucleotide colour scheme, a similarity
colour scheme where each line is coloured on a basis of its match to a user
selectable comparison line.
- Multiple sorting options: importing order, alphabetic, by trait or by similarity rate
- Highlight of the line and marker under the mouse.
- Zoomable and scrollable view of the data.
- Genotype data overview
- Trait values and heatmap display
- Export the view or overview as images

## Examples

Below are examples of how to integrate the three supported methods of loading
data into the library in web pages / web applications.

### BrAPI

The Flapjack-Bytes library is designed to work with version 2.0 of the
[BrAPI](https://brapi.org/) specification and doesn't want to be prescriptive
about the steps required to search for and select a dataset for viewing. As such 
the only expectaion is that the calling code will pass Flapjack-Bytes a 
variantSetDbId and optionally a mapDbId. If a mapDbId is not passed to
Flapjack-Bytes, a "fake" map will be constructed and all markers/variants will
be displayed on the same chromosome. For BrAPi servers which require
authentication, an authentication token can also be passed to the library. 

#### Required BrAPI endpoint
- variantsets/{variantSetDbId}/calls 

[See endpoint documentation](https://brapigenotyping.docs.apiary.io/#reference/variantsets/get-variantsetsvariantsetdbidcalls/get-/variantsets/{variantsetdbid}/calls)

#### Optional BrAPI endpoint
- markerpositions?mapDbId={mapDbId} 

[See endpoint documentation](https://brapigenotyping.docs.apiary.io/#reference/genome-maps/get-markerpositions/get-/markerpositions)

First define a target div in the web page.

```html
<div id="bytes-div" ref="bytes"></div>
```

The following code is run in the mounted lifecycle hook of the sample Vue app
deployed at: http://bioinf.hutton.ac.uk/gobii-flapjack-bytes. 

```javascript
var renderer = GenotypeRenderer();
renderer.renderGenotypesBrapi({
    domParent: "#bytes-div",  // Container to inject the canvas into
    width: 800,  // Genotype view width
    height: 600,   // Genotype view height
    baseURL: this.baseUrl,    // BrAPI base URL
    matrixId: this.callSetId,
    mapId: this.mapId,
    authToken: this.authToken
    overviewWidth: 800,  // Overview width
    overviewWidth: 200,   // Overview height
    saveSettings: false,
});
```

The baseUrl, callSetId, mapId and authToken are collected on previous pages of
the web application and passed to the flapjack-bytes library. mapId can be null
if you don't have map data to provide. authToken can be null if the BrAPI
resource doesn't require authentication.

The parameters are as follows:
- `domParent`: the target div which we inject the library's canvas into
- `width`: the width of the canvas the library will create 
    - can be set to `null` to automatically resize the canvas to fit the available width
- `height`: the height of the canvas the library will create
- `baseURL`: the base url of the BrAPI server we're communicating with
- `matrixId`: the ID of the callSet (genotype dataset) to load from the BrAPI server
- `mapId`: the ID of the map to load from the BrAPI server (or null)
- `authToken`: the authentication token required to talk to the BrAPI server (or null)
- `overviewWidth`: the width of the overview the library will create
    - can be set to `null` to automatically resize the canvas to fit the available width
    - If left undefined, use the same width as the genotype view
- `overviewHeight`: the height of the overview the library will create (if undefined, use a default height)
- `minGenotypeAutoWidth`: the minimum width for the genotype view (auto-width mode only, optional)
- `minOverviewAutoWidth`: the minimum width for the overview (auto-width mode only, optional)
- `saveSettings`: Whether to save the user settings (reference lines, trait colors) (defaults to `true`)
- `dataSetId`: Arbitrary string to identify this dataset's saved settings (if undefined, use `matrixId`)


### Local File

A full example of this can be found in the file
[load-from-file.html](load-from-file.html).

```html
<div>
    <div>
      <label for="mapfile">Map file:</label>
      <input type="file" id="mapfile" name="mapfile">
    </div>
    <div>
      <label for="genofile">Genotype file:</label>
      <input type="file" id="genofile" name="genofile">
    </div>
    <input type="submit" action="#" id="submit" name="submit" value="Submit">
</div>
<div id="canvas-holder">
  <!-- Empty div that we can insert a canvas into from javascript. -->
</div>
```

The HTML includes a couple of file inputs for getting the files to be loaded
into the flapjack-bytes library.

```javascript
<script src="build/flapjack-bytes.js"></script>
<script type="text/javascript">
document.addEventListener("DOMContentLoaded", function(){
    document.getElementById("submit").addEventListener("click", function(){
        var renderer = GenotypeRenderer();
        renderer.renderGenotypesFile({
            domParent: "#canvas-holder",
            width: null,
            height: 600,
            mapFileDom: "#mapfile",
            genotypeFileDom: "#genofile",
            phenotypeFileDom: "#phenofile",
            overviewWidth: null,
            overviewHeight: 200,
            minGenotypeAutoWidth: 600,
            minOverviewAutoWidth: 600,
            dataSetId: "MyDataSet"
        });
        return false;
    });
});
</script>
```

The parameters are as follows:
- `domParent`: the id of the canvas to inject the flapjack-bytes canvas into
- `width`: the width of the canvas
    - can be set to `null` to automatically resize the canvas to fit the available width
- `height`: the height of the canvas
- `mapFileDom`: the id of the file input for the map file (which may or may not have been populated with a file)
- `genotypeFileDom`: the id of the file input for the genotype file
- `phenotypeFileDom`: the id of the file input for the phenotype file (optional)
- `overviewWidth`: the width of the overview
    - can be set to `null` to automatically resize the canvas to fit the available width
    - If left undefined, use the same width as the genotype view
- `overviewHeight`: the height of the overview (if undefined, use a default height)
- `minGenotypeAutoWidth`: the minimum width for the genotype view (auto-width mode only, optional)
- `minOverviewAutoWidth`: the minimum height for the overview (auto-width mode only, optional)
- `saveSettings`: Whether to save the user settings (reference lines, trait colors) (defaults to `true`)
- `dataSetId`: Arbitrary string to identify this dataset's saved settings (if undefined, use the genotype file name)

The map file and genotype file should be in their respective [Flapjack formats](http://flapjack.hutton.ac.uk/en/latest/projects_&_data_formats.html#data-sets-maps-and-genotypes)

### Files via URL

A full example of this can be found in the file
[load-from-url.html](load-from-url.html).

For this to work the your library integration either needs to be running on the
same server that is hosting the files, or the server hosting the files has to be
[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) compliant.

```html
<div>
    <div>
        <label for="mapfile">Map file:</label>
        <input type="text" id="mapfile" name="mapfile" value="http://bioinf.hutton.ac.uk/flapjack/sample-data/tutorials/ped-ver-tutorial.map">
    </div>
    <div>
        <label for="genofile">Genotype file:</label>
        <input type="text" id="genofile" name="genofile" value="http://bioinf.hutton.ac.uk/flapjack/sample-data/tutorials/ped-ver-tutorial.dat">
    </div>
    <input type="submit" action="#" id="submit" name="submit" value="Submit">
</div>
<div id="canvas-holder">
    <!-- Empty div that we can insert a canvas into from javascript. -->
</div>
```

The HTML includes a couple of text inputs for getting the urls of files to be
loaded into the flapjack-bytes library.

```javascript
<script src="build/flapjack-bytes.js"></script>
<script type="text/javascript">
document.addEventListener("DOMContentLoaded", function(){
    document.getElementById("submit").addEventListener("click", function(){
        var renderer = GenotypeRenderer();
        renderer.renderGenotypesUrl({
            domParent: "#canvas-holder",
            width: 800,
            height: 600,
            mapFileURL: $('#mapfile').val(),
            genotypeFileURL: $('#genofile').val(),
            phenotypeFileURL: $('#phenotype').val(),
            overviewWidth: 800,
            overviewHeight: 200
            dataSetId: "MyDataSet",
        });
        return false;
    });
});
</script>
```

Where the parameters are as follows:
- `domParent`: the id of the canvas to inject the flapjack-bytes canvas into
- `width`: the width of the canvas
    - can be set to `null` to automatically resize the canvas to fit the available width
- `height`: the height of the canvas
- `mapFileURL`: the URL to the map file
- `genotypeFileURL`: the URL to the genotype file
- `phenotypeFileURL`: the URL to the phenotype file (optional)
- `overviewWidth`: the width of the overview
    - can be set to `null` to automatically resize the canvas to fit the available width
    - If left undefined, use the same width as the genotype view
- `overviewHeight`: the height of the overview (if undefined, use a default height)
- `minGenotypeOverviewWidth`: the minimum width for the genotype view (auto-width mode only, optional)
- `minGenotypeOverviewHeight`: the minimum height for the genotype view (auto-width mode only, optional)
- `saveSettings`: Whether to save the user settings (reference lines, trait colors) (defaults to `true`)
- `dataSetId`: Arbitrary string to identify this dataset's saved settings (if undefined, use `genotypeFileURL`)