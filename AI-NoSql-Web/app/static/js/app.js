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
        input.classList.add("border", "border-gray-300", "p-2", "w-full", "rounded-md");

        // Input for the optional word limit
        const wordLimitInput = document.createElement("input");
        wordLimitInput.type = "number";
        wordLimitInput.id = `keyPointWordLimit_${totalKeyPoints}`;
        wordLimitInput.placeholder = "Words";
        wordLimitInput.min = "1";
        wordLimitInput.classList.add("border", "border-gray-300", "p-2", "w-24", "rounded-md");
        wordLimitInput.title = `Optional word limit for Key Point ${totalKeyPoints}`;

        // Remove button
        const removeButton = document.createElement("button");
        removeButton.classList.add(
            "bg-red-500",
            "text-white",
            "px-3",
            "py-2",
            "rounded-md",
            "hover:bg-red-600",
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

    // Handle "Generate Responses" button click
    const generateResponsesButton = document.getElementById("generateResponses");
    const loadingDiv = document.getElementById("loading");
    const responseSection = document.getElementById("responseSection");
    const responsesDiv = document.getElementById("responses");

    generateResponsesButton.addEventListener("click", async function () {
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

        // Show loading indicator
        loadingDiv.classList.remove("hidden");

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
                responsesDiv.innerHTML = ""; // Clear previous responses
                data.answers.forEach((answer, index) => {
                    const responseDiv = document.createElement("div");
                    responseDiv.classList.add("mb-4", "border", "p-4", "rounded-md", "bg-gray-100");

                    responseDiv.innerHTML = `
                        <strong class="text-blue-600">Prompt ${index + 1}: ${answer.key_point}</strong>
                        <p class="mt-2">${answer.answer}</p>
                    `;
                    responsesDiv.appendChild(responseDiv);
                });

                responseSection.classList.remove("hidden"); // Show the response section
            } else {
                alert(data.error || "Failed to fetch answers.");
            }
        } catch (error) {
            console.error("Error fetching answers:", error);
            alert("An error occurred while fetching answers.");
        } finally {
            // Hide loading indicator
            loadingDiv.classList.add("hidden");
        }
    });
});
