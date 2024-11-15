import { runIntro } from './intro.js';
import { Bubble, configText, cloneBubble } from './bubble-vue.js';
import { cloudLoad, cloudSave, loadProject, saveProject, projectUrl, promptLogIn } from './firebase-network.js';
import { loadRaw, colorWords, toRect, replaceImage, exportPng, exportJpg } from './image-background.js';
import { translate, requestOcr } from './translate-network.js';

// Disable shortcuts in different HTML forms.
Vue.use(VueShortkey, { prevent: ['input', 'textarea', 'select'] })

const initialPageId = shortid();
const vueApp = new Vue({
  el: '#editor',
  data: {
    customFonts: [],
    bubbles: [],
    blocks: '',
    configKonva: {
      width: 200,
      height: 200
    },
    snippetRect: {
      x: 0, y: 0, width: 0, height: 0, fill: 'blue', opacity: 0.2
    },
    mousedownX: 0,
    mousedownY: 0,
    mode: '',
    selectedId: -1,
    bubbleFocused: false,
    bubbleAdvanced: false,
    showTextLayer: true,
    showEditLayer: true,
    clearBackground: false,
    brush: {
      size: 20,
      color: "rgba(255,255,255,1)"
    },
    cursor: {
      x: 0,
      y: 0,
      // TODO: move mousedown into here.
    },
    shortcuts: {
      brush: ['b'],
      erase: ['e'],
      snippet: ['s'],
      picker: ['i'],
      escape: ['esc'],
      toggleText: ['1'],
      toggleEdit: ['2'],
    },
    currentPageId: initialPageId,
    project: {
      name: 'scanlate.io',
      id: shortid(),
      pages: [{ id: initialPageId }]
    },
    user: {
      id: '',
      projects: []
    },
    // Map of locally loaded images
    localfiles: {}
  },
  computed: {
    selectedBubble() {
      for (const bubble of this.bubbles) {
        if (bubble.id == this.selectedId) {
          return bubble;
        }
      }
      return { japanese: "JP", english: "EN" };
    },
    configTexts() {
      return this.bubbles
        // Hide the Konva text if bubble is currently selected, or deleted.
        .filter(bubble => !(bubble.deleted
          || this.bubbleFocused && (this.selectedId == bubble.id)))
        .map(configText);
    },
    brushCursor() {
      return {
        visible: /PAINT_TOOL/.test(this.mode),
        x: this.cursor.x,
        y: this.cursor.y,
        radius: this.brush.size / 2,
        stroke: 'black',
        strokeWidth: 0.5,
      }
    },
    currentTool() {
      if (/PAINT_TOOL/.test(this.mode)) {
        return 'PAINT';
      } else if (/SNIPPET/.test(this.mode)) {
        return 'SNIPPET';
      } else {
        return 'TEXT';
      }
    },
    cursorStyle() {
      if (this.currentTool == 'SNIPPET') {
        return { cursor: 'crosshair' };
      }
    },
  },
  methods: {
    uploadFont(event) {
      const file = event.target.files[0];
      if (file) {
        const fontName = file.name.split('.')[0];
        const reader = new FileReader();

        reader.onload = (e) => {
          const font = new FontFace(fontName, e.target.result);
          font.load().then((loadedFont) => {
            document.fonts.add(loadedFont);
            this.customFonts.push(fontName);
            this.selectedBubble.fontFamily = fontName;
          }).catch(error => console.error("Failed to load font:", error));
        };

        reader.readAsArrayBuffer(file);
      }
    },
    handleMouseDown(event) {
      console.log(this.mode);
      if (this.mode == 'SNIPPET_START') {
        this.mousedownX = event.offsetX;
        this.mousedownY = event.offsetY;
        // console.log(event);
        this.snippetRect.x = this.mousedownX;
        this.snippetRect.y = this.mousedownY;
        this.mode = 'SNIPPET_SECOND_CLICK';
      }
      else if (this.mode == 'SNIPPET_SECOND_CLICK') {
        this.mode = '';
        // A little magical, but snippetRect already has all the right attributes.
        snippetToBubble(this.$refs.canvas, absoluteRect(this.snippetRect), this.brush.color, Boolean(this.clearBackground));
        // Then hide the konva rectangle
        this.snippetRect.width = 0;
        this.snippetRect.height = 0;
      }
      else if (this.mode == 'PAINT_TOOL') {
        this.mode = 'PAINT_TOOL_DOWN';
        this.lastLine = new Konva.Line({
          lineJoin: 'round',
          lineCap: 'round',
          stroke: this.brush.color,
          strokeWidth: this.brush.size,
          globalCompositeOperation:
            this.brush.color == 'Erase' ? 'destination-out' : 'source-over',
          points: [event.offsetX, event.offsetY, event.offsetX, event.offsetY]
        });
        this.$refs.editLayer.getNode().getLayer().add(this.lastLine);
        this.$refs.editLayer.getNode().getLayer().batchDraw();
      }
      else if (this.mode == 'COLOR_PICKER') {
        let col = this.$refs.canvas.getContext('2d').getImageData(event.offsetX,event.offsetY,1,1)
        this.mode = 'PAINT_TOOL';
        this.brush.color = 'rgba('+col.data[0]+','+col.data[1]+','+col.data[2]+',1)' // this is awful but i cannot use THE key
      }
    },
    handleMouseMove(event) {
      if (this.mode == 'SNIPPET_SECOND_CLICK') {
        // Draw konva box from mousedownX & Y to this location;
        // console.log(`Drawing ${event.offsetX}, ${event.offsetY} to ${this.mousedownX}, ${this.mousedownY}`);
        this.snippetRect.width = event.offsetX - this.mousedownX;
        this.snippetRect.height = event.offsetY - this.mousedownY;
      }
      else if (this.mode == 'PAINT_TOOL') {
        // Move the cursor;
        this.cursor.x = event.offsetX;
        this.cursor.y = event.offsetY;
      }
      else if (this.mode == 'PAINT_TOOL_DOWN') {
        // Move the cursor;
        this.cursor.x = event.offsetX;
        this.cursor.y = event.offsetY;

        const newPoints = this.lastLine.points().concat([event.offsetX, event.offsetY]);
        this.lastLine.points(newPoints);
        this.$refs.editLayer.getNode().getLayer().batchDraw();
      }
    },
    handleMouseUp(event) {
      if (this.mode == 'PAINT_TOOL_DOWN') {
        this.mode = 'PAINT_TOOL';
      }
    },
    handleShortcuts(event) {
      switch (event.srcKey) {
        case 'brush':
          this.mode = 'PAINT_TOOL';
          this.brush.color = "rgba(255,255,255,1)";
          break;
        case 'erase':
          this.mode = 'PAINT_TOOL';
          this.brush.color = "rgba(0,0,0,0)";
          break;
        case 'snippet':
          this.snippetTool();
          break;
        case 'picker':
          this.mode = "COLOR_PICKER"
          break;
        case 'escape':
          this.mode = '';
          // TODO: Want to unfocus selected bubble, but swallowed by form...
          break;
        case 'toggleText': 
          this.showTextLayer = !this.showTextLayer;
          break;
        case 'toggleEdit': 
          this.showEditLayer = !this.showEditLayer;
          break;
      }
    },
    handleDrop(event) {
      const files = event.dataTransfer.files;
      let firstId;
      if (files) {
        for (const file of files) {
          const id = shortid();
          this.project.pages.push({ id });
          this.localfiles[id] = file;
          firstId = firstId ? firstId : id;
        }
        this.handlePageChange(firstId);
      }
    },
    async handlePageChange(pageId) {
      if (this.currentPageId) {
        // TODO: Prompt instead of autosaving?
        // TODO: Don't need to reupload base image
        // TODO: Unvisited localfiles have a page entry but aren't uploaded.
        await cloudSave(this, this.currentPageId);
        // Remove the local reference, so future loads use the cloud data.
        delete this.localfiles[this.currentPageId];
      }
      this.currentPageId = pageId;
      // Switch to the local loaded file, if available.
      for (const page of this.project.pages) {
        if (page.id == pageId && page.id in this.localfiles) {
          replaceImage(this.localfiles[page.id], this);
          return;
        }
      }
      // Otherwise, download the page
      await cloudLoad(this, pageId);
    },
    updateSelectedId(selectedId) {
      this.bubbleFocused = true;
      this.selectedId = selectedId;
    },
    unfocusSelectedId() {
      this.bubbleFocused = false;
    },
    rasterizeSelected() {
      const bubbleRaster = new Konva.Text(configText(this.selectedBubble));
      vueApp.$refs.editLayer.getNode().getLayer().add(bubbleRaster);
      vueApp.$refs.editLayer.getNode().getLayer().batchDraw();
    },
    duplicateSelected() {
      this.bubbles.push(cloneBubble(this.selectedBubble));
    },

    autoDetectAndTranslate() {
      firebase.analytics().logEvent('detect_jp_clicked');
      analyze(this)
        .then(() => {
          firebase.analytics().logEvent('auto_translate_clicked');
          makeAllBubbles(this.blocks);
        })
        .catch(error => {
          console.error('Error occurred:', error);
        });
    },
    
    snippetTool() {
      if (this.currentTool == 'SNIPPET') {
        this.mode = '';
        this.snippetRect.width = 0;
      } else {
        // TODO set cursor to be cross
        firebase.analytics().logEvent('select_bubble_clicked');
        this.mode = 'SNIPPET_START';
      }
    },
    paintTool() {
      if (this.currentTool == 'PAINT') {
        this.mode = ''
      } else {
        firebase.analytics().logEvent('paint_tool_clicked');
        this.mode = 'PAINT_TOOL';
      }
    },
    colorPicker() {
      if (this.currentTool == "COLOR_PICKER") {
        this.mode = ''
      } else {
        firebase.analytics().logEvent('color_picker_clicked');
        this.mode = 'COLOR_PICKER';
      }
    },
    async exportImageAsPNG() {

      firebase.analytics().logEvent('save_image_clicked');

      await exportPng(this);
    },
    async exportImageAsJPG(){
      firebase.analytics().logEvent('save_image_clicked');

      await exportJpg(this);
    },
    async saveProject() {
      firebase.analytics().logEvent('share_page_clicked');

      if (!this.user.id && !await promptLogIn()) {
        return;
      }
      // Generate a random id if the page does not already have one. TODO: Still needed?
      this.currentPageId = this.currentPageId ? this.currentPageId : shortid();
      await cloudSave(this, this.currentPageId);
      await saveProject(this.project, this.user);

      const link = document.createElement("input");
      link.value = projectUrl(this.project.id);
      link.setAttribute('readonly', 'true');
      link.setAttribute('onclick', 'this.select()');
      link.setAttribute('size', '35');
      swal({
        title: "Your work is saved here:",
        icon: "success",
        content: link
      });
    },
    showHelp() {
      firebase.analytics().logEvent('help_clicked');
      runIntro(/*firstRunOnly = */false);
    },
  },
  async mounted() {
    const parsedUrl = new URL(window.location.href);
    this.projectId = parsedUrl.searchParams.get('project');
    if (this.projectId) {
      this.project = await loadProject(this.projectId);
      await this.handlePageChange(this.project.pages[0].id);
    } else {
      loadRaw('assets/22.jpg', this);
    }
    runIntro(/*firstRunOnly = */true);
  }
});
window.vueApp = vueApp;

function analyze(mainVue) {
  return new Promise((resolve, reject) => {
    requestOcr(mainVue.$refs.canvas)
      .then(json => {
        colorWords(json, mainVue);
        resolve();
      })
      .catch(error => {
        reject(error);
      });
  });
}


// Normalize a rect to have positive width and height.
function absoluteRect(rect) {
  return {
    x: rect.x + Math.min(0, rect.width),
    y: rect.y + Math.min(0, rect.height),
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  }
}

const snippet = document.createElement('canvas');
const snippetCtx = snippet.getContext('2d');

function snippetToBubble(bgCanvas, rect, textColor, skipClear) {
  // Resize the snippet canvas, then copy to it
  snippet.width = rect.width;
  snippet.height = rect.height;
  snippetCtx.drawImage(bgCanvas,
    // Source: x, y, width, hight
    rect.x, rect.y, rect.width, rect.height,
    // Destination: x, y, width, height
    0, 0, rect.width, rect.height);
  requestOcr(snippet)
    .then(json => {
      if (json.responses.length > 0) {
        let text = json.responses[0].textAnnotations[0].description;
        text = text.replace(/\s/g, ''); // Strip out all whitespace
        makeBubble(text, rect, textColor, skipClear);
      }
    });
}

async function makeBubble(text, rect, textColor, skipClear) {
  const json = await translate(text);
  const english = json.data.translations[0].translatedText;
  console.log(`Original: ${text}, Translated: ${english}`);
  const bubble = new Bubble(shortid(), enlargeRect(rect), text, english, textColor);
  vueApp.bubbles.push(bubble);

  // Draw a white box, to hide the Japanese text.
  if (true) { 
    const whiteRect = new Konva.Rect({ ...rect, fill: "White" });
    vueApp.$refs.editLayer.getNode().getLayer().add(whiteRect);
    vueApp.$refs.editLayer.getNode().getLayer().batchDraw();
  }
}

export function makeAllBubbles(blocks) {
  for (const block of blocks) {
    const rect = toRect(block.boundingBox);
    const japanese = extractText(block);
    makeBubble(japanese, rect)
  }
}

// Widen the text bubbles to better fit english text
function enlargeRect(rect) {
    return {
      x: rect.x - 20,
      y: rect.y,
      width: rect.width + 40,
      height: rect.height,
    }
}

function extractText(block) {
  let result = "";
  for (const paragraph of block.paragraphs) {
    for (const word of paragraph.words) {
      for (const symbol of word.symbols) {
        result += symbol.text;
      }
    }
  }
  return result;
}

var uploadInput = document.getElementById('uploadInput');

uploadInput.addEventListener('change', function() {
  handleFileUpload(this.files);
});

function handleFileUpload(files) {
  if (files.length > 0) {
    var file = files[0];
    replaceImage(file, vueApp);
  }
}