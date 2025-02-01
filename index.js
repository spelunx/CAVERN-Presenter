import * as pdfjs from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
import { jsPDF } from "jspdf";

// 5,760 x 2,160 is size of cavern, with height doubled so the image appears twice
const cavern_width = 5760;
const cavern_height = 2160;

let pdf = undefined;
let filename = "";
let pageNum = 1;
try {
  if (typeof window === "undefined" || !("Worker" in window)) {
    throw new Error("Web Workers not supported in this environment.");
  }

  window.pdfjsWorker = pdfjsWorker;
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
} catch (error) {
  console.log(error);
}

function loadFile(f) {
  filename = f.name;
  let reader = new FileReader();
  reader.onload = async function () {
    let typedarray = new Uint8Array(this.result);
    const loadingTask = pdfjs.getDocument(typedarray);
    pdf = await loadingTask.promise;
  };
  reader.readAsArrayBuffer(f);
}

async function presentFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    if (pdf) {
      pageNum = 1;
      await renderSlide(pageNum);
    }
  }
}

function fullscreenCheck() {
  if (document.fullscreenElement) {
    // hide non-fullscreen things
    // show fullscreen things
    document.getElementById("hideOnFullscreen").hidden = true;
    document.getElementById("showOnFullscreen").hidden = false;
  } else {
    // hide fullscreen things
    // show non-screen things
    document.getElementById("hideOnFullscreen").hidden = false;
    document.getElementById("showOnFullscreen").hidden = true;
  }
}

async function nextPage() {
  if (pageNum >= pdf._pdfInfo.numPages) return;
  pageNum++;
  await renderSlide(pageNum);
}

async function prevPage() {
  if (pageNum <= 1) return;
  pageNum--;
  await renderSlide(pageNum);
}

async function renderSlide(pageNum) {
  let page = await pdf.getPage(pageNum);
  let viewport = page.getViewport({ scale: 1 });
  let scale = cavern_height / 2 / viewport.height;
  let scaledViewport = page.getViewport({ scale: scale });
  let canvas = document.getElementById("showOnFullscreen");
  let context = canvas.getContext("2d");

  // match canvas dimensions to cavern dimensions
  canvas.width = cavern_width;
  canvas.height = cavern_height;
  canvas.style.width = cavern_width + "px";
  canvas.style.height = cavern_height + "px";

  // position the image at the top, centered
  var transform_top = [
    1,
    0,
    0,
    1,
    Math.floor(cavern_width / 2 - scaledViewport.width / 2),
    0,
  ];
  var renderContext = {
    canvasContext: context,
    transform: transform_top,
    viewport: scaledViewport,
    background: "black",
  };
  // render the page to the top half of the canvas
  await page.render(renderContext).promise;
  // copy the top half to the bottom half
  context.drawImage(
    canvas,
    0,
    0,
    cavern_width,
    cavern_height / 2,
    0,
    cavern_height / 2,
    cavern_width,
    cavern_height / 2
  );
}

// saving is broken for now
async function convert() {
  // return;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [cavern_width, cavern_height],
  });

  for (let i = 1; i <= pdf._pdfInfo.numPages; i++) {
    await renderSlide(i);
    // let image = document.getElementById("canvas").toDataURL("image/png");
    let image = document.getElementById("showOnFullscreen");
    doc.addImage(image, "PNG", 0, 0, cavern_width, cavern_height);
    if (i != pdf._pdfInfo.numPages) {
      doc.addPage();
    }
  }

  const lastIndex = filename?.lastIndexOf(".") ?? -1;
  let new_filename = "cavern_presentation.pdf";
  if (filename && lastIndex !== -1) {
    new_filename = filename.substring(0, lastIndex) + "_cavernDoubled.pdf";
  }
  // doc.save(new_filename);
  // can't just use doc.save because the file is too big
  // and overflows the javascript string limit
  let chunks = doc.output("arrayBuffer", new_filename);
  console.log(chunks[0]);
  return;
  const data = chunks.map((chunk) =>
    Uint8Array.from(chunk, (x) => x.charCodeAt(0))
  );
  const blob = new Blob(data);
  // const chunk = pdfOutput.shift();
  //   if (chunk) {
  //     // convert string to bytes to keep PDF ascii encoding
  //     // if we don't do this the PDF will break and show blank
  //     this.push(Uint8Array.from(chunk, (x) => x.charCodeAt(0)));
  //   } else {
  //     this.push(null);
  //   }
  // const blob = new Blob(const chunk = pdfOutput.shift();
  //   if (chunk) {
  //     // convert string to bytes to keep PDF ascii encoding
  //     // if we don't do this the PDF will break and show blank
  //     this.push(Uint8Array.from(chunk, (x) => x.charCodeAt(0)));
  //   } else {
  //     this.push(null);
  //   })

  // doc.__private__.resetCustomOutputDestination();
  // const content = doc.__private__.out("");
  // content.pop();
  // // const blob = doc.output("blob", new_filename);
  // // blob.type = "application/pdf";
  // const blob = new Blob(
  //   content.map((line, idx) => {
  //     const str = idx === content.length - 1 ? line : line + "\n";
  //     const arrayBuffer = new ArrayBuffer(str.length);
  //     const uint8Array = new Uint8Array(arrayBuffer);
  //     for (let i = 0; i < str.length; ++i) {
  //       uint8Array[i] = str.charCodeAt(i);
  //     }
  //     return arrayBuffer;
  //   }),
  //   { type: "application/pdf" }
  // );
  const a = document.createElement("a");
  a.download = new_filename;
  a.rel = "noopener";
  a.href = URL.createObjectURL(blob);
  a.click();
}

document.addEventListener("fullscreenchange", fullscreenCheck);
document.getElementById("file-selector").onchange = function (e) {
  const fileList = e.target.files;
  loadFile(fileList[0]);
};
document.getElementById("present").onclick = presentFullScreen;
document.getElementById("convert").onclick = convert;
// document.body.onload = fullscreenCheck;

document.addEventListener("keydown", function (event) {
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    event.preventDefault();
    event.stopPropagation();
    prevPage();
  } else if (
    event.key === "ArrowDown" ||
    event.key === "ArrowRight" ||
    event.key === " " ||
    event.key === "Enter"
  ) {
    event.preventDefault();
    event.stopPropagation();
    nextPage();
  }
});

document.addEventListener("drop", function (e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById("file-selector").files = e.dataTransfer.files;
  loadFile(e.dataTransfer.files[0]);
  // if (e.dataTransfer.items && e.dataTransfer.items.length != 0) {
  //   if (e.dataTransfer.items[0].kind !== "file") {
  //     return;
  //   }
  //   const file = e.dataTransfer.items[0].getAsFile();
  //   loadFile(file);
  // } else {
  //   const file = e.dataTransfer.files[0];
  //   loadFile(file);
  // }
});
document.addEventListener("dragover", function (e) {
  e.preventDefault();
  e.stopPropagation();
});
