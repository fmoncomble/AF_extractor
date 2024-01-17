// contentScript.js
console.log("AF content script injected");

// Locate injection site
const anchor = document.querySelector("h1");

// Create field for extraction GUI
const fieldset = document.createElement("fieldset");
fieldset.classList.add("af_speechify-fieldset");
const legend = document.createElement("legend");
legend.classList.add("af_speechify-legend");
legend.textContent = "Télécharger les documents";
fieldset.appendChild(legend);
anchor.appendChild(fieldset);

// Create extraction button and container
const extractButtonContainer = document.createElement("div");
extractButtonContainer.classList.add("extract-button-container");
fieldset.appendChild(extractButtonContainer);

const extractButton = document.createElement("button");
extractButton.id = "extractButton";
extractButton.textContent = "Extraire cette page";

extractButtonContainer.appendChild(extractButton);

// Create extraction option checkbox
const checkboxDiv = document.createElement("div");
checkboxDiv.classList.add('checkbox');
const checkbox = document.createElement("input");
checkbox.type = "checkbox";
checkbox.name = "extractOption";
checkbox.id = "extractOption";
const label = document.createElement("span");
label.id = "extractOption";
label.htmlFor = "extractOption";
label.appendChild(document.createTextNode("Tout extraire"));
checkboxDiv.appendChild(checkbox);
checkboxDiv.appendChild(label);

let extractAll = false;

checkbox.addEventListener("change", function () {
  if (checkbox.checked) {
    console.log("Full extraction ahead");
    extractButton.textContent = "Tout extraire";
    extractAll = true;
  } else {
    console.log("Single page extraction");
    extractButton.textContent = "Extraire cette page";
    extractAll = false;
  }
});

// Create a container for the extraction message and spinner
const extractionContainer = document.createElement("div");
extractionContainer.id = "extractionContainer";
extractionContainer.style.display = "none"; // Hide initially
fieldset.appendChild(extractionContainer);

// Create the loading spinner element
const spinner = document.createElement("div");
spinner.classList.add("spinner"); // Add a class for styling
extractionContainer.appendChild(spinner);

// Create the extraction message element
const extractionMessage = document.createElement("div");
extractionMessage.id = "extractionMessage";
extractionMessage.textContent = "Extraction en cours…";
extractionContainer.appendChild(extractionMessage);

const lastPageButton = document.querySelector(".pager-last a");
if (lastPageButton) {
  extractButton.before(checkboxDiv);
  lastPageUrl = lastPageButton.getAttribute("href");
  console.log("Last page URL = ", lastPageUrl);
  const lastPageUrlSegments = lastPageUrl.split("?");
  const queryString = "?" + lastPageUrlSegments[1];
  console.log("Query string = ", queryString);
  const urlParams = new URLSearchParams(queryString);
  console.log("URL parameters: ", urlParams);
  let lastPageNo = urlParams.get("page");
  if (lastPageNo !== null) {
    console.log("Number of last page = ", lastPageNo);
  } else {
    console.error(
      "Last page number is null or has unexpected value: ",
      lastPageNo
    );
  }
  const totalPageNo = ++lastPageNo;
  console.log("Total number of pages = ", totalPageNo);
  label.textContent = `Extraire les ${totalPageNo} pages de résultats`;

  updateRange();

  function updateRange() {
    console.log("updateRange function invoked");
    let port;
    browser.runtime.onConnect.addListener(connect);

    function connect(p) {
      port = p;
      console.assert(port.name === "backgroundjs");
      port.onMessage.addListener((msg) => respond(msg));

      function respond(msg) {
        if (msg) {
          extractionMessage.textContent = msg + " sur " + totalPageNo;
        } else {
          console.error("No message from background");
        }
      }
    }
  }
} else {
  console.log("Only one page to extract");
}

// Create the abort button
const abortButton = document.createElement("button");
abortButton.classList.add("abort-button");
abortButton.textContent = "Annuler";
abortButton.addEventListener("click", () => {
  console.log("Abort button clicked");
  abortButton.textContent = "Annulation en cours...";
  browser.runtime.sendMessage(
    {
      action: "abortExtraction",
    },
    (response) => {
      console.log("Extraction aborted");
    }
  );
});
fieldset.appendChild(abortButton);

// Create container for downloaded files list
const downloadedFilesContainer = document.createElement("div");
downloadedFilesContainer.classList.add("fileList");
downloadedFilesContainer.style.display = "none";
fieldset.appendChild(downloadedFilesContainer);

// Message passing to notify the background script when the button is clicked
extractButton.addEventListener("click", () => {
  // Hide extraction buttons and show abort button
  extractButtonContainer.style.display = "none";
  abortButton.style.display = "inline";

  // Show the extraction container
  extractionContainer.style.display = "block";
  fieldset.style.cursor = 'wait';
  downloadedFilesContainer.textContent = "";
  downloadedFilesContainer.style.display = "none";

  browser.runtime.sendMessage(
    {
      action: "performExtraction",
      url: window.location.href,
      extractAll: extractAll,
    },
    (response) => {
      console.log("Response object:", response); // Log the entire response object

      // Hide the extraction container
      extractionContainer.style.display = "none";
      fieldset.style.cursor = '';
      extractionMessage.textContent = "Extraction en cours...";

      //Reset abort button
      abortButton.style.display = "none";
      abortButton.textContent = "Annuler";

      // Restore extraction buttons
      extractButtonContainer.style.display = "inline-block";

      if (response.success) {
        // Display the downloaded files
        downloadedFilesContainer.style.display = "block";
        let firstFiles = response.addedFileNames.slice(0, 20);
        downloadedFilesContainer.textContent = `Fini !\n${
          response.addedFileNames.length
        } fichiers téléchargés :\n${firstFiles.join(", ")}...`;
      } else {
        console.error("Error:", response.error);
        // Handle error
      }
    }
  );
});
