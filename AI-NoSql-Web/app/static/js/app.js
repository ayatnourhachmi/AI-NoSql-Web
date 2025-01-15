document.addEventListener("DOMContentLoaded", function () {

    // File upload handling
    const uploadButton = document.getElementById("uploadButton");
    const progressContainer = document.getElementById("progressContainer");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const progressStatus = document.getElementById("progressStatus");

    uploadButton.addEventListener("click", async function () {
        const fileInput = document.getElementById("fileUpload");
        const file = fileInput.files[0];

        if (!file) {
            alert("Please select a file to upload.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            // Show progress bar and reset it
            progressContainer.classList.remove("hidden");
            progressBar.style.width = "0%";
            progressText.textContent = "0%";
            progressStatus.textContent = "Initializing...";

            // Start uploading the file
            const response = await fetch("/upload", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                progressStatus.textContent = "Completed successfully!";
                progressBar.style.width = "100%";
                progressText.textContent = "100%";
                setTimeout(() => progressContainer.classList.add("hidden"), 2000);
                alert(data.message);
            } else {
                const errorData = await response.json();
                alert(errorData.error || "Failed to process the file.");
                progressContainer.classList.add("hidden");
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("An error occurred while uploading the file.");
            progressContainer.classList.add("hidden");
        }
    });

    // EventSource for progress updates
    const eventSource = new EventSource("/progress");
    eventSource.onmessage = function (event) {
        const data = JSON.parse(event.data);
        const progress = data.progress;
        const status = data.status;

        // Update progress bar and status
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}%`;
        progressStatus.textContent = status;

        // Hide progress bar when complete
        if (progress === 100) {
            setTimeout(() => progressContainer.classList.add("hidden"), 2000);
        }
    };

   // Function to monitor the progress bar and scroll
function monitorProgress() {
    const specifySection = document.getElementById("keyPointInputs");
  
    // Scroll to the "Specify Your Prompts" section
    specifySection.scrollIntoView({ behavior: "smooth" });
  }
  
  // Simulate progress completion
  document.getElementById("uploadButton").addEventListener("click", () => {
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const progressStatus = document.getElementById("progressStatus");
  
    // Simulate progress increase
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${progress}%`;
      progressStatus.textContent = progress === 100 ? "Completed" : "Initializing...";
  
      if (progress === 100) {
        clearInterval(interval);
  
        // Trigger scroll only after progress reaches 100%
        setTimeout(() => {
          monitorProgress();
        }, 500); // Optional delay for a smoother effect
      }
    }, 300); // Adjust the time interval as needed
  });
  
    const keyPointInputsDiv = document.getElementById("keyPointInputs");
    const addKeyPointButton = document.getElementById("addKeyPoint");

    // Function to update key point numbers and placeholders
    function updateKeyPointNumbers() {
        const keyPointDivs = keyPointInputsDiv.querySelectorAll(".key-point");
        keyPointDivs.forEach((keyPointDiv, index) => {
            const promptInput = keyPointDiv.querySelector("input[type='text']");
            const wordLimitInput = keyPointDiv.querySelector("input[type='number']");
            const removeButton = keyPointDiv.querySelector(".remove-key-point");

            const newIndex = index + 1;
            promptInput.id = `keyPoint_${newIndex}`;
            promptInput.placeholder = `Enter a prompt for Key Point ${newIndex}`;
            wordLimitInput.id = `keyPointWordLimit_${newIndex}`;
            wordLimitInput.title = `Optional word limit for Key Point ${newIndex}`;
            removeButton.title = `Remove Key Point ${newIndex}`;
        });
    }

    // Add a new key point
    addKeyPointButton.addEventListener("click", function () {
        const totalKeyPoints = keyPointInputsDiv.children.length + 1;

        const keyPointDiv = document.createElement("div");
        keyPointDiv.classList.add("flex", "items-center", "space-x-2", "mb-4", "key-point");

        // Input for the key point prompt
        const input = document.createElement("input");
        input.type = "text";
        input.id = `keyPoint_${totalKeyPoints}`;
        input.placeholder = `Enter a prompt for Key Point ${totalKeyPoints}`;
        input.classList.add("border", "border-gray-300", "p-2", "w-full", "rounded-md", "focus:outline-none", "focus:ring-2", "focus:ring-pink-500");

        // Input for the optional word limit
        const wordLimitInput = document.createElement("input");
        wordLimitInput.type = "number";
        wordLimitInput.id = `keyPointWordLimit_${totalKeyPoints}`;
        wordLimitInput.placeholder = "Words";
        wordLimitInput.min = "1";
        wordLimitInput.classList.add("border", "border-gray-300", "p-2", "w-24", "rounded-md",  "focus:outline-none", "focus:ring-2", "focus:ring-pink-500");

        wordLimitInput.title = `Optional word limit for Key Point ${totalKeyPoints}`;

        // Remove button
        const removeButton = document.createElement("button");
        removeButton.classList.add(
            "bg-gray-800",
            "text-white",
            "px-3",
            "py-2",
            "rounded-md",
            "hover:bg-gray-600",
            "flex-shrink-0",
            "remove-key-point"
        );
        removeButton.textContent = "-";
        removeButton.title = `Remove Key Point ${totalKeyPoints}`;

        // Remove key point and reorder numbers
        removeButton.addEventListener("click", function () {
            keyPointDiv.remove();
            updateKeyPointNumbers(); // Reorder numbers after removing
        });

        keyPointDiv.appendChild(input);
        keyPointDiv.appendChild(wordLimitInput);
        keyPointDiv.appendChild(removeButton);

        keyPointInputsDiv.appendChild(keyPointDiv);
        updateKeyPointNumbers(); // Reorder numbers after adding
    });

    // Add remove functionality to the initial key point
    const initialRemoveButton = document.querySelector(".remove-key-point");
    if (initialRemoveButton) {
        initialRemoveButton.addEventListener("click", function () {
            const initialKeyPointDiv = initialRemoveButton.parentElement;
            initialKeyPointDiv.remove();
            updateKeyPointNumbers(); // Reorder numbers after removing
        });
    }

    document.getElementById("generateResponses").addEventListener("click", async () => {
        const generateButton = document.getElementById("generateResponses");
        const loadingButton = document.getElementById("loadingButton");
        const responseSection = document.getElementById("responseSection");
        const responsesDiv = document.getElementById("responses");
        const keyPointInputsDiv = document.getElementById("keyPointInputs");
    
        // Collect key points and word limits
        const keyPoints = [];
        const wordLimits = [];
        const numKeyPoints = keyPointInputsDiv.children.length;
    
        for (let i = 1; i <= numKeyPoints; i++) {
            const promptInput = document.getElementById(`keyPoint_${i}`);
            const wordLimitInput = document.getElementById(`keyPointWordLimit_${i}`);
            if (promptInput) {
                keyPoints.push(promptInput.value.trim());
                wordLimits.push(wordLimitInput?.value ? parseInt(wordLimitInput.value) : null); // Optional word limit
            }
        }
    
        if (keyPoints.length === 0) {
            alert("Please specify at least one prompt.");
            return;
        }
    
        // Hide "Generate Responses" button and show "Loading" button
        generateButton.classList.add("hidden");
        loadingButton.classList.remove("hidden");
    
        try {
            const response = await fetch("/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ key_points: keyPoints, word_limits: wordLimits }),
            });
    
            const data = await response.json();
    
            if (response.ok) {
                // Clear previous responses
                responsesDiv.innerHTML = "";
    
                // Add each response dynamically
                data.answers.forEach((answer, index) => {
                    const responseDiv = document.createElement("div");
                    responseDiv.classList.add("mb-4", "border", "p-4", "rounded-md", "bg-gray-100");
    
                    responseDiv.innerHTML = `
                        <strong class="text-transparent bg-clip-text bg-gradient-to-br from-blue-900 to-indigo-900">
                            Prompt ${index + 1}: ${answer.key_point}
                        </strong>
                        <p class="mt-2">${answer.answer}</p>
                    `;
                    responsesDiv.appendChild(responseDiv);
                });
    
                // Show the response section
                responseSection.classList.remove("hidden");
  
                // Scroll to the "responses" section
                responseSection.scrollIntoView({ behavior: "smooth" });

            } else {
                responsesDiv.innerHTML = `
                    <div class="mb-4 border p-4 rounded-md bg-red-100 text-red-800">
                        <strong>Error:</strong> ${data.error || "Failed to fetch answers."}
                    </div>
                `;
                responseSection.classList.remove("hidden");
            }
        } catch (error) {
            console.error("Error fetching answers:", error);
            responsesDiv.innerHTML = `
                <div class="mb-4 border p-4 rounded-md bg-red-100 text-red-800">
                    <strong>Error:</strong> An error occurred while fetching answers.
                </div>
            `;
            responseSection.classList.remove("hidden");
        } finally {
            // Restore button visibility
            loadingButton.classList.add("hidden");
            generateButton.classList.remove("hidden");
        }
    });
    
});

function showDonateAlert() {
    Swal.fire({
      title: "Oh OMG! You're so sweet! 🥰",
      text: "Thank you so much for considering a donation. No need, your support means the world to us!",
      imageUrl: 'https://media.giphy.com/media/3o7abldj0b3rxrZUxW/giphy.gif', // Cute sticker
      imageWidth: 200,
      imageHeight: 200,
      imageAlt: 'Thank you sticker',
      confirmButtonText: "You're welcome! 💖",
      confirmButtonColor: "#f50057",
      background: "#fffaf3", // Soft cute background
      color: "#333",
    });
  }
  