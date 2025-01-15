from flask import Blueprint, request, jsonify, render_template, Response
import time
import json
import io
import threading
from app.utils import extract_zip_in_memory, extract_text_from_pdf, process_text_streams_and_store_in_pinecone, generate_answer

routes = Blueprint('routes', __name__)

@routes.route("/")
def home():
    """
    Home route to display the main page.
    """
    return render_template("index.html")


progress_data = {"progress": 0, "status": "Initializing..."}

@routes.route("/upload", methods=["POST"])
def upload_and_process_zip():
    """
    Endpoint to upload a ZIP file, extract PDF files, convert to TXT, and index in Pinecone.
    """
    global progress_data
    progress_data["progress"] = 0
    progress_data["status"] = "Initializing..."

    if "file" not in request.files:
        progress_data = {"progress": 0, "status": "Initializing..."}
        return jsonify({"error": "No file uploaded."}), 400

    uploaded_file = request.files["file"]

    if uploaded_file.filename == "":
        progress_data = {"progress": 0, "status": "Initializing..."}
        return jsonify({"error": "Empty filename."}), 400

    if not uploaded_file.filename.endswith(".zip"):
        progress_data = {"progress": 0, "status": "Initializing..."}
        return jsonify({"error": "File must be a ZIP."}), 400

    try:
        # Step 1: Uploading file
        progress_data["progress"] = 20
        progress_data["status"] = "Uploading..."

        file_stream = io.BytesIO(uploaded_file.read())

        # Step 2: Processing files
        progress_data["progress"] = 40
        progress_data["status"] = "Processing files..."

        extracted_files = extract_zip_in_memory(file_stream)
        pdf_files = {name: content for name, content in extracted_files.items() if name.endswith(".pdf")}

        if not pdf_files:
            progress_data["status"] = "Processing completed: No PDFs found."
            progress_data["progress"] = 100
            return jsonify({"message": "No PDF files found in the uploaded ZIP."}), 200

        # Step 3: Converting PDFs to text
        txt_streams = []
        for file_name, pdf_content in pdf_files.items():
            text = extract_text_from_pdf(pdf_content)
            if text.strip():
                txt_streams.append((file_name.replace(".pdf", ".txt"), io.BytesIO(text.encode("utf-8"))))

        # Step 4: Indexing files into Pinecone
        if txt_streams:
            progress_data["progress"] = 70
            progress_data["status"] = "Indexing files..."

            process_text_streams_and_store_in_pinecone(txt_streams)

        # Final status
        progress_data["status"] = "You're all set to generate the key points!"
        progress_data["progress"] = 100
        return jsonify({"message": "All files processed and indexed successfully!"}), 200

    except ValueError as ve:
        progress_data["status"] = "Error during processing."
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        progress_data["status"] = "Unexpected error."
        return jsonify({"error": str(e)}), 500


@routes.route("/progress")
def progress():
    """
    Sends progress updates for the upload and processing steps.
    """
    def generate():
        while progress_data["progress"] < 100:
            yield f"data: {json.dumps(progress_data)}\n\n"
            time.sleep(0.5)  # Simulate real-time updates
        yield f"data: {json.dumps(progress_data)}\n\n"

    return Response(generate(), mimetype="text/event-stream")
    

@routes.route("/generate", methods=["POST"])
def generate_summaries():
    """
    Endpoint to generate responses for key points.
    """
    data = request.get_json()

    key_points = data.get("key_points")
    word_limits = data.get("word_limits", [])  # Optional word limits for each key point

    if not key_points or not isinstance(key_points, list):
        return jsonify({"error": "Invalid key points data."}), 400

    if word_limits and not all(isinstance(limit, (int, type(None))) for limit in word_limits):
        return jsonify({"error": "Invalid word limits data. Must be a list of integers or None."}), 400

    # Ensure word_limits aligns with key_points length
    if len(word_limits) != len(key_points):
        word_limits = [None] * len(key_points)  # Default to no word limits if lengths don't match

    try:
        answers = generate_answer(key_points, word_limits)
        return jsonify({"answers": answers})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
