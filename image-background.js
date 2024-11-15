export async function exportPng(mainVue) {
  // Copy the main canvas into an offscreen one to save.
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = mainVue.$refs.canvas.width;
  offscreenCanvas.height = mainVue.$refs.canvas.height;
  offscreenCanvas.getContext('2d').drawImage(mainVue.$refs.canvas, 0, 0);

  // Then draw on each layer.
  const editLayerImage = await toImagePromise(mainVue.$refs.editLayer);
  offscreenCanvas.getContext('2d').drawImage(editLayerImage, 0, 0);
  const textLayerImage = await toImagePromise(mainVue.$refs.textLayer);
  offscreenCanvas.getContext('2d').drawImage(textLayerImage, 0, 0);

  // Download the offscreen canvas by creating a hidden link.
  offscreenCanvas.toBlob(blob => {
    const finalUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = mainVue.$refs.project.currentPageFilename;
    link.href = finalUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

export async function exportJpg(mainVue) {
  // Copy the main canvas into an offscreen one to save.
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = mainVue.$refs.canvas.width;
  offscreenCanvas.height = mainVue.$refs.canvas.height;
  offscreenCanvas.getContext('2d').drawImage(mainVue.$refs.canvas, 0, 0);

  // Then draw on each layer.
  const editLayerImage = await toImagePromise(mainVue.$refs.editLayer);
  offscreenCanvas.getContext('2d').drawImage(editLayerImage, 0, 0);
  const textLayerImage = await toImagePromise(mainVue.$refs.textLayer);
  offscreenCanvas.getContext('2d').drawImage(textLayerImage, 0, 0);

  // Convert the offscreen canvas to a JPG image
  const finalUrl = offscreenCanvas.toDataURL('image/jpeg');

  // Download the JPG image by creating a hidden link.
  const link = document.createElement('a');
  link.download = mainVue.$refs.project.currentPageFilename.replace('.png', '.jpg');
  link.href = finalUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


/** Converts a Konva layer into a Promise that returns the layer's image. */
export function toImagePromise(layer) {
  return new Promise((resolve, reject) => {
    layer.getNode().toImage({
      callback: (layerImage) => {
        resolve(layerImage);
      }
    });
  });
}

/** Converts an image src into a Promise that returns the loaded image. */
function onloadPromise(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  })
}

export async function loadRaw(src, mainVue) {
  const img = await onloadPromise(src);
  const ctx = mainVue.$refs.canvas.getContext('2d');
  const scrollport = document.getElementById("scrollport"); const dropzone = document.getElementById("dropzone")
  const md7 = document.getElementsByClassName("col-md-7")[0]
  const modx = img.width*(md7.offsetWidth/img.width)
  const mody = img.height*(md7.offsetWidth/img.width)
  console.log(modx,mody)
  console.log(md7.offsetHeight)
  mainVue.configKonva.width = modx;
  mainVue.configKonva.height = mody;
  mainVue.$refs.canvas.width = modx;
  mainVue.$refs.canvas.height = mody;
  scrollport.style.width = modx+"px"
  dropzone.style.width = modx+"px"
  ctx.drawImage(img, 0, 0, modx, mody);

  // TODO needs more work when a new image is dropped.
  mainVue.$refs.textLayer.getNode().getLayer().removeChildren();
  mainVue.$refs.textLayer.getNode().getLayer().batchDraw();

  mainVue.$refs.editLayer.getNode().getLayer().removeChildren();
  mainVue.$refs.editLayer.getNode().getLayer().batchDraw();

  mainVue.bubbles = [];
}

/** Draws boxes around each annotation. */
export function colorWords(json, mainVue) {
  const annotations = json.responses[0].textAnnotations;
  // Remove the first (overarching) annotation.
  annotations.splice(0, 1);
  for (const annotation of annotations) {
    const rect = toRect(annotation.boundingPoly);
    const clearBlue = 'rgba(240, 240, 40, 0.2)';
    const blueRect = new Konva.Rect({ ...rect, fill: clearBlue });
    mainVue.$refs.editLayer.getNode().getLayer().add(blueRect);
    mainVue.$refs.editLayer.getNode().getLayer().batchDraw();
  }

  // Hierarchy of fullTextAnnotation is page > block > paragraph > word > symbol
  // TODO: Maybe split by paragraph insteaad of block?
  const blocks = json.responses[0].fullTextAnnotation.pages[0].blocks;
  for (const block of blocks) {
    const rect = toRect(block.boundingBox);
    const clearYellow = 'rgba(40, 240, 240, 0.2)';
    const yellowRect = new Konva.Rect({ ...rect, fill: clearYellow });
    mainVue.$refs.editLayer.getNode().getLayer().add(yellowRect);
    mainVue.$refs.editLayer.getNode().getLayer().batchDraw();
  }
  mainVue.blocks = blocks;
}

/** Convert a OCR rectangle (4 points) into a rect (x, y, width, height). */
export function toRect(boundingPoly) {
  function helper(axis, func) {
    let result = boundingPoly.vertices[0][axis];
    for (let i = 1; i < 4; i++) {
      const current = boundingPoly.vertices[i][axis];
      result = func(result, current);
    }
    return result;
  }

  const minX = helper('x', Math.min);
  const minY = helper('y', Math.min);
  const maxX = helper('x', Math.max);
  const maxY = helper('y', Math.max);

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function replaceImage(file, mainVue) {
  let reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = () => {
    const dataUrl = reader.result;
    loadRaw(dataUrl, mainVue);
  }
}
