const OCR_URL = 'https://vision.googleapis.com/v1/images:annotate?key=AIzaSyD6-pwL4QNBw5ggr-1ZY9m-zVS0ceSut90';
function buildRequest(base64) {
  return `{
  "requests": [
    {
      "image": {
        "content": "${base64}"
      },
      "features": [
        {
          "type": "DOCUMENT_TEXT_DETECTION"
        },
      ],
    }
  ]
}
`;
}

export async function requestOcr(canvas) {
  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
  const response = await fetch(OCR_URL, {
    method: 'POST',
    body: buildRequest(base64),
    headers: { 'Content-Type': 'application/json' }
  });
  return await response.json();
}

const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2?key=AIzaSyD6-pwL4QNBw5ggr-1ZY9m-zVS0ceSut90';
export async function translate(text) {
  var languageSelection = document.getElementById('languageSelect');

  var selectedLanguage = languageSelection.value;

  const response = await fetch(TRANSLATE_URL, {
    method: 'POST',
    body: buildTranslateRequest(text, selectedLanguage),
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
}

function buildTranslateRequest(text, selectedLanguage) {
  return JSON.stringify({
    "q": text,
    "target": selectedLanguage,
    "format": "text",
  });
}